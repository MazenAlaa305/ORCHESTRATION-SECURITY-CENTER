import asyncio
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.scan import NetworkAsset

async def check_assets():
    async with async_session_maker() as db:
        res = await db.execute(select(NetworkAsset))
        assets = res.scalars().all()
        print(f"Total NetworkAssets: {len(assets)}")
        for a in assets:
            print(f"- {a.ip_address} ({a.hostname}) type={a.device_type}")

if __name__ == "__main__":
    asyncio.run(check_assets())
