
import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from uuid import UUID
from src.rag.service import process_document_for_rag
from src.database import async_session_maker
from src.chat.models import ChatSession, Message # Required for mapper registry

async def main():
    doc_id = UUID("fe6679bd-65b4-49ab-ad32-cd7325baa08d")
    print(f"Triggering processing for document: {doc_id}")
    
    try:
        await process_document_for_rag(
            document_id=doc_id,
            session_factory=async_session_maker
        )
        print("Processing completed successfully.")
    except Exception as e:
        print(f"Processing failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
