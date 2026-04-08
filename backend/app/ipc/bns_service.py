"""
BNS (Bharatiya Nyaya Sanhita 2023) Statute Bridge Service for JurisQuery.

Handles:
- Seeding BNS sections from dataset/bns_sections.csv
- Keyword search across BNS sections
- LLM-powered IPC → BNS mapping with persistent caching
"""
import asyncio
import csv
import json
import logging
import re
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ipc.models import BNSSection, IPCBNSLink, IPCSection
from app.ipc.schemas import (
    BNSSectionBrief,
    BNSSectionListResponse,
    BridgeResult,
    IPCSectionBrief,
)
from app.llm.gemini import GeminiLLM

logger = logging.getLogger(__name__)

# Resolve path relative to this file: backend/app/ipc/bns_service.py → dataset/bns_sections.csv
_MODULE_DIR = Path(__file__).resolve().parent          # .../backend/app/ipc/
_BNS_CSV_PATH = _MODULE_DIR.parent.parent.parent / "dataset" / "bns_sections.csv"

# ---------------------------------------------------------------------------
# Bridge generation prompt
# ---------------------------------------------------------------------------

_BRIDGE_PROMPT = """\
You are an expert in Indian criminal law with deep knowledge of both the Indian Penal Code (IPC)
and the Bharatiya Nyaya Sanhita (BNS) 2023.

TASK: Determine how IPC Section {ipc_section_number} maps to BNS 2023.

IPC SECTION {ipc_section_number} - {ipc_offense}:
{ipc_description}

CANDIDATE BNS SECTIONS (from keyword search):
{bns_candidates}

Analyse the IPC section and the BNS candidates above. Determine:
1. The most accurate BNS equivalent section (if any)
2. The type of change
3. A clear 2-3 sentence summary of what changed

OUTPUT FORMAT - JSON only, no markdown:
{{
  "bns_section_number": "101",   // or null if abolished with no equivalent
  "change_type": "equivalent",   // one of: equivalent | modified | split | merged | abolished | new_in_bns
  "change_summary": "IPC Section 302 (Murder) is directly equivalent to BNS Section 101. The definition and punishment remain identical — death or life imprisonment with a fine. The section has been renumbered without any substantive change in legal content."
}}

CHANGE TYPE DEFINITIONS:
- equivalent: Virtually identical text, just renumbered
- modified: Same offence, but definition or punishment changed meaningfully
- split: One IPC section became multiple BNS sections
- merged: Multiple IPC sections were merged into one BNS section
- abolished: IPC section was removed with no BNS equivalent
- new_in_bns: No IPC equivalent (BNS-only provision)

IMPORTANT: If no candidate BNS section matches, set bns_section_number to null and change_type to "abolished".\
"""


# ---------------------------------------------------------------------------
# Dataset seeding
# ---------------------------------------------------------------------------

async def load_bns_dataset(
    db: AsyncSession,
    csv_path: Path = _BNS_CSV_PATH,
) -> int:
    """
    Load BNS 2023 sections from dataset/bns_sections.csv into the database.
    Idempotent — skips if records already exist.

    CSV columns: Chapter, Chapter_name, Chapter_subtype, Section, Section _name, Description

    Returns:
        Number of sections present after the operation.
    """
    existing = (await db.execute(select(func.count(BNSSection.id)))).scalar() or 0
    if existing > 0:
        logger.info("BNS dataset already loaded (%d sections)", existing)
        return existing

    if not csv_path.exists():
        logger.error("BNS CSV file not found: %s", csv_path)
        return 0

    with open(csv_path, encoding="utf-8") as f:
        rows = await asyncio.to_thread(list, csv.DictReader(f))

    seen: set[str] = set()
    loaded = 0

    for row in rows:
        # Column name has a trailing space: "Section _name"
        raw_section = row.get("Section", "").strip()
        if not raw_section or raw_section in seen:
            continue
        seen.add(raw_section)

        raw_chapter = row.get("Chapter", "0").strip()
        try:
            chapter_num = int(raw_chapter)
        except ValueError:
            chapter_num = 0

        chapter_subtype = row.get("Chapter_subtype", "").strip() or None
        # Strip leading/trailing whitespace from the spaced column name
        section_name = (row.get("Section _name") or row.get("Section_name") or "").strip()
        description = row.get("Description", "").strip()

        db.add(BNSSection(
            chapter_number=chapter_num,
            chapter_name=row.get("Chapter_name", "").strip(),
            chapter_subtype=chapter_subtype,
            section_number=raw_section,
            section_name=section_name,
            description=description,
        ))
        loaded += 1

    await db.commit()
    logger.info("Loaded %d BNS sections from dataset", loaded)
    return loaded


# ---------------------------------------------------------------------------
# BNS section lookup & search
# ---------------------------------------------------------------------------

async def get_bns_section(
    db: AsyncSession,
    section_number: str,
) -> BNSSection | None:
    """Lookup a BNS section by number (e.g. '101', '4(1)')."""
    result = await db.execute(
        select(BNSSection).where(BNSSection.section_number == section_number.strip())
    )
    return result.scalar_one_or_none()


async def search_bns_by_keywords(
    db: AsyncSession,
    query: str,
    limit: int = 10,
) -> list[BNSSection]:
    """
    Full-text keyword search over BNS section names and descriptions.
    Returns up to `limit` matching sections, ordered by relevance.
    """
    keywords = [kw.strip() for kw in re.split(r"\s+", query.strip()) if len(kw.strip()) > 2]
    if not keywords:
        return []

    # Build OR conditions across section_name and description
    conditions = []
    for kw in keywords[:5]:  # Cap at 5 keywords
        pattern = f"%{kw}%"
        conditions.append(BNSSection.section_name.ilike(pattern))
        conditions.append(BNSSection.description.ilike(pattern))

    result = await db.execute(
        select(BNSSection)
        .where(or_(*conditions))
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_all_bns_sections(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
) -> BNSSectionListResponse:
    """Paginated list of all BNS sections."""
    offset = (page - 1) * page_size
    total = (await db.execute(select(func.count(BNSSection.id)))).scalar() or 0
    rows = (await db.execute(
        select(BNSSection).order_by(BNSSection.chapter_number, BNSSection.section_number)
        .offset(offset).limit(page_size)
    )).scalars().all()

    return BNSSectionListResponse(
        sections=[_to_brief(s) for s in rows],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


# ---------------------------------------------------------------------------
# Statute Bridge: IPC → BNS
# ---------------------------------------------------------------------------

async def get_or_create_bridge(
    db: AsyncSession,
    ipc_section_number: str,
) -> BridgeResult:
    """
    Return the BNS equivalent for an IPC section, using a multi-step strategy:

    1. Check the ipc_bns_links cache table for an existing mapping.
    2. On cache miss: fetch the IPCSection + search BNS by keywords.
    3. Call Gemini LLM to determine the mapping and write a change summary.
    4. Persist the result to the cache table.
    5. Return a BridgeResult.
    """
    ipc_num = ipc_section_number.strip()

    # ── Step 1: Cache check ──────────────────────────────────────────────────
    cached = (await db.execute(
        select(IPCBNSLink).where(IPCBNSLink.ipc_section_number == ipc_num)
    )).scalar_one_or_none()

    if cached:
        logger.debug("BNS bridge cache hit for IPC %s", ipc_num)
        bns_section = None
        if cached.bns_section_number:
            bns_section = await get_bns_section(db, cached.bns_section_number)
        ipc_section = (await db.execute(
            select(IPCSection).where(IPCSection.section_number == ipc_num)
        )).scalar_one_or_none()

        return BridgeResult(
            ipc_section=_ipc_to_brief(ipc_section) if ipc_section else None,
            bns_section=_to_brief(bns_section) if bns_section else None,
            change_type=cached.change_type,
            change_summary=cached.change_summary,
            is_verified=cached.is_verified,
        )

    # ── Step 2: Fetch IPC section ────────────────────────────────────────────
    ipc_section = (await db.execute(
        select(IPCSection).where(IPCSection.section_number == ipc_num)
    )).scalar_one_or_none()

    if not ipc_section:
        return BridgeResult(
            ipc_section=None,
            bns_section=None,
            change_type="unknown",
            change_summary=f"IPC Section {ipc_num} was not found in the database. "
                           "Please ensure the IPC dataset is loaded.",
            is_verified=False,
        )

    # ── Step 3: Keyword search for BNS candidates ───────────────────────────
    search_query = f"{ipc_section.offense or ''} {ipc_section.description[:100]}"
    bns_candidates = await search_bns_by_keywords(db, search_query, limit=8)

    # Format candidates for the prompt
    candidates_text = "\n\n".join(
        f"Section {s.section_number} — {s.section_name} [{s.chapter_name}]:\n{s.description[:300]}..."
        for s in bns_candidates
    ) if bns_candidates else "No candidate BNS sections found via keyword search."

    # ── Step 4: LLM-powered mapping ──────────────────────────────────────────
    try:
        from app.llm.gemini import GeminiLLM
        llm = GeminiLLM(model_name="gemini-flash-lite-latest")
        
        prompt = _BRIDGE_PROMPT.format(
            ipc_section_number=ipc_num,
            ipc_offense=ipc_section.offense or "N/A",
            ipc_description=ipc_section.description[:500],
            bns_candidates=candidates_text,
        )
        
        raw = await llm.generate(prompt=prompt, temperature=0.1, max_tokens=512, json_mode=True)
        data = _parse_json(raw)
        bns_section_number = data.get("bns_section_number")  # may be None
        change_type = data.get("change_type", "unknown")
        change_summary = data.get("change_summary", "Change summary unavailable.")
    except Exception as exc:
        logger.error("LLM bridge generation failed for IPC %s: %s", ipc_num, exc)
        bns_section_number = None
        change_type = "unknown"
        change_summary = "Bridge mapping could not be generated at this time."

    # ── Step 5: Persist to cache ─────────────────────────────────────────────
    link = IPCBNSLink(
        ipc_section_number=ipc_num,
        bns_section_number=bns_section_number,
        change_type=change_type,
        change_summary=change_summary,
        is_verified=False,
    )
    db.add(link)
    await db.commit()

    # ── Step 6: Resolve BNS section object for response ──────────────────────
    bns_section = None
    if bns_section_number:
        bns_section = await get_bns_section(db, bns_section_number)

    return BridgeResult(
        ipc_section=_ipc_to_brief(ipc_section),
        bns_section=_to_brief(bns_section) if bns_section else None,
        change_type=change_type,
        change_summary=change_summary,
        is_verified=False,
    )


# ---------------------------------------------------------------------------
# RAG answer augmentation
# ---------------------------------------------------------------------------

# Regex to detect IPC section references in LLM answers
_IPC_SECTION_RE = re.compile(
    r"""
    (?:
        [Ss]ection\s+(\d+[A-Za-z]*)       # "Section 302"
        |
        IPC\s+[Ss]ection\s+(\d+[A-Za-z]*) # "IPC Section 302"
        |
        [Ss]\.?\s*(\d+[A-Za-z]*)\s+IPC    # "S. 302 IPC" or "302 IPC"
    )
    \s*                                    # optional whitespace
    (?:IPC|of\s+the\s+(?:Indian\s+Penal\s+)?Code)?  # optional IPC suffix
    """,
    re.VERBOSE,
)


async def detect_and_embed_bns_updates(answer: str, db: AsyncSession) -> str:
    """
    Scan an LLM-generated answer for IPC section references and append
    BNS 2023 update callout blocks to the answer.

    This is a pure AUGMENTATION — it never modifies the original answer text,
    only appends formatted blocks below it.

    Example appended block:
    ---
    ⚖️ **BNS 2023 Update** — Section 302 IPC → Section 101 BNS
    🟢 **Equivalent** | Section 302 IPC maps directly to BNS Section 101 (Murder)...
    ---
    """
    matches = _IPC_SECTION_RE.finditer(answer)
    detected_sections: list[str] = []
    seen: set[str] = set()

    for m in matches:
        # One of the three groups will have the captured section number
        section_num = m.group(1) or m.group(2) or m.group(3)
        if section_num and section_num not in seen:
            seen.add(section_num)
            detected_sections.append(section_num)

    if not detected_sections:
        return answer

    # Generate bridges in parallel (max 3 to not spike latency)
    bridge_tasks = [
        get_or_create_bridge(db, num)
        for num in detected_sections[:3]
    ]
    results = await asyncio.gather(*bridge_tasks, return_exceptions=True)

    callouts: list[str] = []
    for bridge in results:
        if isinstance(bridge, Exception):
            logger.warning("BNS bridge fetch failed: %s", bridge)
            continue
        callouts.append(_format_callout(bridge))

    if not callouts:
        return answer

    separator = "\n\n---\n\n"
    return answer + separator + separator.join(callouts)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

_CHANGE_TYPE_EMOJI = {
    "equivalent": "🟢",
    "modified":   "🟡",
    "abolished":  "🔴",
    "split":      "🔵",
    "merged":     "🔵",
    "new_in_bns": "🆕",
    "unknown":    "⚪",
}


def _format_callout(bridge: BridgeResult) -> str:
    """Render a statute bridge as a formatted markdown callout."""
    ipc_label = f"Section {bridge.ipc_section.section_number} IPC" if bridge.ipc_section else "IPC Section"
    bns_label = (
        f"Section {bridge.bns_section.section_number} BNS — {bridge.bns_section.section_name}"
        if bridge.bns_section
        else "No BNS equivalent"
    )
    emoji = _CHANGE_TYPE_EMOJI.get(bridge.change_type, "⚪")
    change_label = bridge.change_type.replace("_", " ").title()

    return (
        f"⚖️ **BNS 2023 Update** — {ipc_label} → {bns_label}\n"
        f"{emoji} **{change_label}** | {bridge.change_summary}"
    )


def _to_brief(section: BNSSection | None) -> BNSSectionBrief | None:
    """Convert a BNSSection ORM object to BNSSectionBrief schema."""
    if not section:
        return None
    return BNSSectionBrief(
        section_number=section.section_number,
        section_name=section.section_name,
        chapter_name=section.chapter_name,
        chapter_subtype=section.chapter_subtype,
        description=section.description,
    )


def _ipc_to_brief(section: IPCSection | None) -> IPCSectionBrief | None:
    """Convert an IPCSection ORM object to IPCSectionBrief schema."""
    if not section:
        return None
    return IPCSectionBrief(
        section_number=section.section_number,
        offense=section.offense,
        punishment=section.punishment,
        cognizable=section.cognizable,
        bailable=section.bailable,
        court=section.court,
    )


def _parse_json(raw: str | None) -> dict:
    """Extract and parse JSON from an LLM response, tolerating markdown fences."""
    if not raw:
        return {}
    text = raw.strip()
    if "```" in text:
        m = re.search(r"```(?:json)?\n?(.*?)```", text, re.DOTALL)
        if m:
            text = m.group(1).strip()
    m = re.search(r"(\{.*\})", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}
