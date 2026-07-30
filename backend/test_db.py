import sys
import asyncio
from sqlalchemy import select, func
from app.database import async_session_maker
from app.ipc.models import IPCSection

async def main():
    try:
        async with async_session_maker() as session:
            count_query = select(func.count(IPCSection.id))
            result = await session.execute(count_query)
            count = result.scalar()
            print(f"IPC Sections count: {count}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
