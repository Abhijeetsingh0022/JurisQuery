import sys
import asyncio
from sqlalchemy import select, func
from app.database import async_session_maker
from app.ipc.service import load_ipc_dataset
from app.ipc.models import IPCSection

async def main():
    try:
        async with async_session_maker() as session:
            print("Loading IPC dataset...")
            # Use correct path
            count = await load_ipc_dataset(session, csv_path="../dataset/FIR_DATASET.csv")
            print(f"Loaded {count} sections.")
            
            # Verify count
            count_query = select(func.count(IPCSection.id))
            result = await session.execute(count_query)
            final_count = result.scalar()
            print(f"Final DB count: {final_count}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
