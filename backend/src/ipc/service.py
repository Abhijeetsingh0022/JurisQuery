"""
IPC Section Prediction Service.
Handles dataset loading, embedding, and LLM-based prediction.
"""

import csv
import logging
import re
import time
from pathlib import Path
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.ipc.models import IPCSection
from src.ipc.schemas import (
    IPCPredictionRequest,
    IPCPredictionResponse,
    IPCSectionBrief,
    IPCSectionListResponse,
    PredictedSection,
)
from src.llm.gemini import GeminiLLM
from src.rag.embeddings import GeminiEmbeddings
from src.rag.vectorstore import QdrantVectorStore


logger = logging.getLogger(__name__)


# IPC Prediction prompt
IPC_PREDICTION_PROMPT = """You are an expert in Indian criminal law. Given a crime/incident description, identify the most applicable IPC (Indian Penal Code) sections.

CRIME/INCIDENT DESCRIPTION:
{description}

RELEVANT IPC SECTIONS (from database search):
{context}

INSTRUCTIONS:
1. Analyze the crime description carefully
2. Match it with the provided IPC sections
3. For each matching section, provide:
   - Section number
   - Confidence score (0.0-1.0)
   - Brief reasoning (1-2 sentences)
4. Only include sections that are genuinely applicable
5. Order by confidence (highest first)
6. Return at most {max_sections} sections

OUTPUT FORMAT (JSON array):
```json
[
  {{
    "section_number": "302",
    "confidence": 0.95,
    "reasoning": "Description indicates intentional killing which constitutes murder under IPC 302."
  }}
]
```

Return ONLY the JSON array, no other text:"""


def extract_section_number(url: str) -> str | None:
    """Extract IPC section number from lawrato URL."""
    # URL format: https://lawrato.com/indian-kanoon/ipc/section-302
    match = re.search(r"/section-(\d+[A-Za-z]*)", url)
    if match:
        return match.group(1).upper()
    return None


async def load_ipc_dataset(
    db: AsyncSession,
    csv_path: str = "dataset/FIR_DATASET.csv",
) -> int:
    """
    Load IPC sections from CSV dataset into database.
    
    Args:
        db: Database session
        csv_path: Path to CSV file
        
    Returns:
        Number of sections loaded
    """
    # Check if data already loaded
    count_query = select(func.count(IPCSection.id))
    result = await db.execute(count_query)
    existing_count = result.scalar()
    
    if existing_count and existing_count > 0:
        logger.info(f"IPC dataset already loaded ({existing_count} sections)")
        return existing_count
    
    csv_file = Path(csv_path)
    if not csv_file.exists():
        logger.error(f"CSV file not found: {csv_path}")
        return 0
    
    sections_loaded = 0
    seen_sections = set()
    
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            url = row.get("URL", "")
            section_num = extract_section_number(url)
            
            if not section_num or section_num in seen_sections:
                continue
            
            seen_sections.add(section_num)
            
            # Parse cognizable/bailable
            cognizable_str = row.get("Cognizable", "").strip().lower()
            bailable_str = row.get("Bailable", "").strip().lower()
            
            cognizable = True if "cognizable" in cognizable_str and "non" not in cognizable_str else (
                False if "non-cognizable" in cognizable_str else None
            )
            bailable = True if bailable_str == "bailable" else (
                False if "non-bailable" in bailable_str else None
            )
            
            section = IPCSection(
                section_number=section_num,
                description=row.get("Description", "").strip(),
                offense=row.get("Offense", "").strip() or None,
                punishment=row.get("Punishment", "").strip() or None,
                cognizable=cognizable,
                bailable=bailable,
                court=row.get("Court", "").strip() or None,
                source_url=url or None,
            )
            
            db.add(section)
            sections_loaded += 1
    
    await db.commit()
    logger.info(f"Loaded {sections_loaded} IPC sections from dataset")
    
    return sections_loaded


async def search_relevant_sections(
    db: AsyncSession,
    query: str,
    limit: int = 20,
) -> list[IPCSection]:
    """
    Search for relevant IPC sections using keyword matching.
    TODO: Add vector search when embeddings are populated.
    """
    # Simple keyword-based search
    keywords = [w.lower() for w in query.split() if len(w) > 3]
    
    if not keywords:
        # Return some common sections if no keywords
        stmt = select(IPCSection).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    # Search in description and offense
    from sqlalchemy import or_
    
    conditions = []
    for kw in keywords[:5]:  # Limit keywords to avoid huge queries
        pattern = f"%{kw}%"
        conditions.append(IPCSection.description.ilike(pattern))
        conditions.append(IPCSection.offense.ilike(pattern))
    
    stmt = select(IPCSection).where(or_(*conditions)).limit(limit)
    result = await db.execute(stmt)
    sections = list(result.scalars().all())
    
    # Score by keyword matches
    scored = []
    for section in sections:
        score = 0
        text = f"{section.description} {section.offense or ''}".lower()
        for kw in keywords:
            if kw in text:
                score += 1
        scored.append((section, score))
    
    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)
    return [s[0] for s in scored[:limit]]


async def predict_ipc_sections(
    db: AsyncSession,
    request: IPCPredictionRequest,
) -> IPCPredictionResponse:
    """
    Predict applicable IPC sections for a crime description.
    
    Args:
        db: Database session
        request: Prediction request with crime description
        
    Returns:
        IPCPredictionResponse with predicted sections
    """
    import json
    
    start_time = time.time()
    
    # 1. Search for relevant sections
    relevant_sections = await search_relevant_sections(
        db, 
        request.description, 
        limit=20
    )
    
    if not relevant_sections:
        return IPCPredictionResponse(
            predicted_sections=[],
            query=request.description,
            total_sections_searched=0,
            processing_time_ms=0,
        )
    
    # 2. Build context from relevant sections
    context_parts = []
    for section in relevant_sections:
        context_parts.append(
            f"Section {section.section_number}: {section.offense or 'N/A'}\n"
            f"Punishment: {section.punishment or 'N/A'}\n"
            f"Description: {section.description[:500]}...\n"
        )
    
    context = "\n---\n".join(context_parts)
    
    # 3. Call LLM for prediction
    llm = GeminiLLM()
    prompt = IPC_PREDICTION_PROMPT.format(
        description=request.description,
        context=context,
        max_sections=request.max_sections,
    )
    
    error_message = None
    try:
        response = await llm.generate(prompt, temperature=0.2, max_tokens=1024)
        
        # Robust JSON extraction
        # Try to find a JSON array pattern [...]
        match = re.search(r"\[.*\]", response, re.DOTALL)
        if match:
            clean_response = match.group(0)
            predictions_data = json.loads(clean_response)
        else:
            # Fallback: try cleaning markdown if no array found
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = re.sub(r"```(?:json)?\n?", "", clean_response)
                clean_response = clean_response.rstrip("`").strip()
            predictions_data = json.loads(clean_response)
            
    except (json.JSONDecodeError, Exception) as e:
        safe_response = response[:200] if response else "No response"
        logger.error(f"LLM prediction failed: {e}. Raw response: {safe_response}...")
        error_message = f"AI Analysis failed: {str(e)}"
        if "RESOURCE_EXHAUSTED" in str(e):
             error_message = "AI Service Busy (Rate Limit Exceeded). Please try again in a minute."
        predictions_data = []
    
    # 4. Map predictions to sections
    predicted_sections = []
    section_map = {s.section_number: s for s in relevant_sections}
    
    for pred in predictions_data[:request.max_sections]:
        section_num = str(pred.get("section_number", "")).upper()
        if section_num in section_map:
            section = section_map[section_num]
            predicted_sections.append(
                PredictedSection(
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
                )
            )
    
    processing_time = (time.time() - start_time) * 1000
    
    return IPCPredictionResponse(
        predicted_sections=predicted_sections,
        query=request.description,
        total_sections_searched=len(relevant_sections),
        processing_time_ms=round(processing_time, 2),
        error=error_message,
    )


async def get_all_sections(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
) -> IPCSectionListResponse:
    """Get paginated list of all IPC sections."""
    # Count total
    count_query = select(func.count(IPCSection.id))
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Get page
    offset = (page - 1) * page_size
    stmt = (
        select(IPCSection)
        .order_by(IPCSection.section_number)
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
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
    """Get a specific IPC section by number."""
    stmt = select(IPCSection).where(
        IPCSection.section_number == section_number.upper()
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
