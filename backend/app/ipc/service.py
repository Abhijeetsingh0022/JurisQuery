"""
IPC Section Prediction Service for JurisQuery.
Handles dataset loading, keyword search, and LLM-based section prediction.
"""
import asyncio
import csv
import json
import logging
import re
import time
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ipc.models import IPCPrediction, IPCSection
from app.ipc.schemas import (
    IPCPredictionListResponse,
    IPCPredictionRequest,
    IPCPredictionResponse,
    IPCPredictionSchema,
    IPCSectionBrief,
    IPCSectionListResponse,
    PredictedSection,
)
from app.llm.gemini import GeminiLLM

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_CSV_PATH = Path("dataset/FIR_DATASET.csv")

# Synonym map for expanding crime-related keywords during search
_CRIME_SYNONYMS: dict[str, list[str]] = {
    "stole":      ["theft", "steal", "stealing", "stolen"],
    "steal":      ["theft", "stole", "stealing", "stolen"],
    "stealing":   ["theft", "steal", "stole", "stolen"],
    "stolen":     ["theft", "steal", "stole", "stealing"],
    "killed":     ["murder", "homicide", "killing"],
    "killing":    ["murder", "homicide", "killed"],
    "murder":     ["killed", "killing", "homicide"],
    "attacked":   ["assault", "attacking", "attack"],
    "attack":     ["assault", "attacked", "attacking"],
    "assault":    ["attack", "attacked", "attacking"],
    "raped":      ["rape", "sexual assault"],
    "rape":       ["raped", "sexual assault"],
    "kidnapped":  ["kidnapping", "abduction"],
    "kidnapping": ["kidnapped", "abduction"],
    "abduction":  ["kidnapping", "kidnapped"],
    "cheated":    ["cheating", "fraud"],
    "cheating":   ["cheated", "fraud"],
    "fraud":      ["cheating", "cheated"],
    "bribe":      ["bribery", "corruption"],
    "bribery":    ["bribe", "corruption"],
}

_IPC_PREDICTION_PROMPT = """\
You are an expert in Indian criminal law. Given a crime or incident description, \
identify the most applicable IPC (Indian Penal Code) sections.

CRIME/INCIDENT DESCRIPTION:
{description}

RELEVANT IPC SECTIONS (from database search):
{context}

INSTRUCTIONS:
1. Analyse the description carefully.
2. Match it against the provided IPC sections.
3. For each matching section provide:
   - Section number
   - Confidence score (0.0 – 1.0)
   - Brief reasoning (1-2 sentences)
4. Include only genuinely applicable sections.
5. Order by confidence (highest first).
6. Return at most {max_sections} sections.

OUTPUT FORMAT — JSON array only, no other text:
[
  {{
    "section_number": "302",
    "confidence": 0.95,
    "reasoning": "Description indicates intentional killing which constitutes murder under IPC 302."
  }}
]"""


# ---------------------------------------------------------------------------
# Dataset loading
# ---------------------------------------------------------------------------

def _extract_section_number(url: str) -> str | None:
    """Extract an IPC section number from a lawrato.com section URL."""
    match = re.search(r"/section-(\d+[A-Za-z]*)", url)
    return match.group(1).upper() if match else None


def _parse_bool_field(value: str, true_token: str, false_token: str) -> bool | None:
    """Parse a nullable boolean field by checking for token presence."""
    v = value.strip().lower()
    if true_token in v and "non" not in v:
        return True
    if false_token in v:
        return False
    return None


async def load_ipc_dataset(
    db: AsyncSession,
    csv_path: Path = _CSV_PATH,
) -> int:
    """
    Load IPC sections from a CSV dataset into the database.
    Skips loading if records already exist (idempotent).

    Args:
        db: Database session
        csv_path: Path to the FIR dataset CSV file

    Returns:
        Number of sections present after the operation
    """
    existing = (await db.execute(select(func.count(IPCSection.id)))).scalar() or 0
    if existing > 0:
        logger.info("IPC dataset already loaded (%d sections)", existing)
        return existing

    if not csv_path.exists():
        logger.error("CSV file not found: %s", csv_path)
        return 0

    with open(csv_path, encoding="utf-8") as f:
        rows = await asyncio.to_thread(list, csv.DictReader(f))

    seen: set[str] = set()
    loaded = 0

    for row in rows:
        section_num = _extract_section_number(row.get("URL", ""))
        if not section_num or section_num in seen:
            continue
        seen.add(section_num)

        db.add(IPCSection(
            section_number=section_num,
            description=row.get("Description", "").strip(),
            offense=row.get("Offense", "").strip() or None,
            punishment=row.get("Punishment", "").strip() or None,
            cognizable=_parse_bool_field(row.get("Cognizable", ""), "cognizable", "non-cognizable"),
            bailable=_parse_bool_field(row.get("Bailable", ""), "bailable", "non-bailable"),
            court=row.get("Court", "").strip() or None,
            source_url=row.get("URL") or None,
        ))
        loaded += 1

    await db.commit()
    logger.info("Loaded %d IPC sections from dataset", loaded)
    return loaded


# ---------------------------------------------------------------------------
# Section search
# ---------------------------------------------------------------------------

async def search_relevant_sections(
    db: AsyncSession,
    keywords: list[str],
    limit: int = 20,
) -> list[IPCSection]:
    """
    Search for relevant IPC sections using provided keywords with synonym expansion.

    Args:
        db: Database session
        keywords: Curated list of legal keywords
        limit: Maximum number of sections to return

    Returns:
        Sections scored and sorted by keyword match frequency
    """
    if not keywords:
        result = await db.execute(select(IPCSection).limit(limit))
        return list(result.scalars().all())

    # Flatten keywords to ensure phrases like "culpable homicide" become ["culpable", "homicide"]
    # Because ILIKE is strict and fails if spacing differs slightly in the DB.
    flattened_keywords = []
    for kw in keywords:
        flattened_keywords.extend(str(kw).split())

    # Filter out common stop words
    stop_words = {
        "the", "and", "for", "that", "this", "with", "from", "your", "are", 
        "was", "will", "has", "had", "his", "her", "him", "she"
    }
    raw_keywords = [
        w.lower() for w in flattened_keywords 
        if len(w) >= 3 and w.lower() not in stop_words
    ]
    
    # Remove duplicates but preserve some deterministic order (unlike set)
    unique_keywords = list(dict.fromkeys(raw_keywords))

    if not unique_keywords:
        result = await db.execute(select(IPCSection).limit(limit))
        return list(result.scalars().all())

    expanded: set[str] = set(unique_keywords)
    for kw in unique_keywords:
        expanded.update(_CRIME_SYNONYMS.get(kw, []))

    # Support all keywords without arbitrarily cutting off at 25, which 
    # previously randomized and dropped crucial terms like "murder" if the list grew.
    conditions = [
        clause
        for kw in expanded
        for clause in (
            IPCSection.description.ilike(f"%{kw}%"),
            IPCSection.offense.ilike(f"%{kw}%"),
        )
    ]

    result = await db.execute(
        select(IPCSection).where(or_(*conditions))
    )
    sections = result.scalars().all()

    def _score(section: IPCSection) -> int:
        text = f"{section.description} {section.offense or ''}".lower()
        return sum(3 for kw in unique_keywords if kw in text) + \
               sum(1 for kw in expanded if kw in text)

    return sorted(sections, key=_score, reverse=True)[:limit]


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------

async def predict_ipc_sections(
    db: AsyncSession,
    request: IPCPredictionRequest,
    user_id: str | None = None,
) -> IPCPredictionResponse:
    """
    Predict applicable IPC sections for a crime description using LLM reasoning.

    Args:
        db: Database session
        request: Prediction request containing the description and max sections
        user_id: If provided, the prediction is persisted to history

    Returns:
        IPCPredictionResponse with matched sections, confidence scores, and metadata
    """
    start = time.monotonic()

    # Step 1: Intelligent LLM distillation of massive narratives into crisp legal keywords
    from app.llm.brain import BrainLLM
    
    try:
        brain = BrainLLM()
        analysis = await brain.analyze_query(request.description)
        keywords = analysis.search_keywords
        if not keywords:
            keywords = request.description.split()
    except Exception as e:
        logger.warning("BrainLLM extraction failed, using fallback parsing: %s", e)
        keywords = request.description.split()

    # Step 2: Query DB safely using distilled keywords
    relevant = await search_relevant_sections(db, keywords, limit=20)
    if not relevant:
        return IPCPredictionResponse(
            predicted_sections=[],
            query=request.description,
            total_sections_searched=0,
            processing_time_ms=0.0,
        )

    context = "\n---\n".join(
        f"Section {s.section_number}: {s.offense or 'N/A'}\n"
        f"Punishment: {s.punishment or 'N/A'}\n"
        f"Description: {s.description[:500]}..."
        for s in relevant
    )

    prompt = _IPC_PREDICTION_PROMPT.format(
        description=request.description,
        context=context,
        max_sections=request.max_sections,
    )

    predictions_data, error_message = await _call_llm_for_predictions(prompt)

    section_map = {s.section_number: s for s in relevant}
    predicted_sections = _map_predictions(predictions_data, section_map, request.max_sections)

    if user_id and predicted_sections:
        await _save_prediction(db, user_id, request.description, predicted_sections)

    return IPCPredictionResponse(
        predicted_sections=predicted_sections,
        query=request.description,
        total_sections_searched=len(relevant),
        processing_time_ms=round((time.monotonic() - start) * 1000, 2),
        error=error_message,
    )


async def _call_llm_for_predictions(prompt: str) -> tuple[list[dict], str | None]:
    """
    Call the LLM and parse the JSON prediction array from its response.
    Returns (predictions_data, error_message).
    """
    llm = GeminiLLM()
    error_message: str | None = None
    predictions_data: list[dict] = []

    try:
        response = await llm.generate(prompt, temperature=0.2, max_tokens=8192)
        predictions_data = _extract_json_array(response)
    except Exception as e:
        logger.error("LLM prediction failed: %s", e)
        error_message = (
            "AI service busy (rate limit exceeded). Please try again in a minute."
            if "RESOURCE_EXHAUSTED" in str(e)
            else f"AI analysis failed: {e}"
        )

    return predictions_data, error_message


def _extract_json_array(response: str) -> list[dict]:
    """Extract and parse a JSON array from an LLM response string."""
    # Try to find an inline [...] block first
    match = re.search(r"\[\s*\{.*?\}\s*\]", response, re.DOTALL)
    if match:
        return json.loads(match.group(0))

    # Strip markdown fences and parse remainder
    clean = re.sub(r"^```(?:json)?\n?", "", response.strip())
    clean = re.sub(r"\n?```$", "", clean).strip()
    return json.loads(clean)


def _map_predictions(
    predictions_data: list[dict],
    section_map: dict[str, IPCSection],
    max_sections: int,
) -> list[PredictedSection]:
    """Map raw LLM prediction dicts to PredictedSection objects."""
    results = []
    for pred in predictions_data[:max_sections]:
        section_num = str(pred.get("section_number", "")).upper()
        section = section_map.get(section_num)
        if not section:
            continue
        results.append(PredictedSection(
            section=IPCSectionBrief(
                section_number=section.section_number,
                offense=section.offense,
                punishment=section.punishment,
                cognizable=section.cognizable,
                bailable=section.bailable,
            ),
            confidence=float(pred.get("confidence", 0.5)),
            reasoning=pred.get("reasoning", ""),
            relevant_excerpt=section.description[:200] if section.description else None,
        ))
    return results


async def _save_prediction(
    db: AsyncSession,
    user_id: str,
    description: str,
    predicted_sections: list[PredictedSection],
) -> None:
    """Persist a prediction to the database, rolling back silently on failure."""
    try:
        db.add(IPCPrediction(
            user_id=user_id,
            description=description,
            predicted_sections=[p.model_dump(mode="json") for p in predicted_sections],
        ))
        await db.commit()
    except Exception as e:
        logger.error("Failed to save prediction history for user %s: %s", user_id, e)
        await db.rollback()


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def get_all_sections(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
) -> IPCSectionListResponse:
    """Return a paginated list of all IPC sections ordered by section number."""
    total = (await db.execute(select(func.count(IPCSection.id)))).scalar() or 0
    offset = (page - 1) * page_size

    result = await db.execute(
        select(IPCSection)
        .order_by(IPCSection.section_number)
        .offset(offset)
        .limit(page_size)
    )
    sections = result.scalars().all()

    return IPCSectionListResponse(
        sections=[
            IPCSectionBrief(
                section_number=s.section_number,
                offense=s.offense,
                punishment=s.punishment,
                cognizable=s.cognizable,
                bailable=s.bailable,
            )
            for s in sections
        ],
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + len(sections) < total,
    )


async def get_section_by_number(
    db: AsyncSession,
    section_number: str,
) -> IPCSection | None:
    """Return a single IPC section by its number, or None if not found."""
    result = await db.execute(
        select(IPCSection).where(IPCSection.section_number == section_number.upper())
    )
    return result.scalar_one_or_none()


async def get_user_predictions(
    db: AsyncSession,
    user_id: str,
    limit: int = 10,
) -> IPCPredictionListResponse:
    """Return a user's past IPC predictions in reverse chronological order."""
    result = await db.execute(
        select(IPCPrediction)
        .where(IPCPrediction.user_id == user_id)
        .order_by(IPCPrediction.created_at.desc())
        .limit(limit)
    )
    predictions = result.scalars().all()
    return IPCPredictionListResponse(
        predictions=[IPCPredictionSchema.model_validate(p) for p in predictions]
    )


async def delete_user_prediction(
    db: AsyncSession,
    prediction_id: str,
    user_id: str,
) -> bool:
    """
    Delete a prediction owned by the given user.

    Returns:
        True if deleted, False if not found or not owned by user
    """
    result = await db.execute(
        select(IPCPrediction).where(
            IPCPrediction.id == prediction_id,
            IPCPrediction.user_id == user_id,
        )
    )
    prediction = result.scalar_one_or_none()
    if not prediction:
        return False
    await db.delete(prediction)
    await db.commit()
    return True