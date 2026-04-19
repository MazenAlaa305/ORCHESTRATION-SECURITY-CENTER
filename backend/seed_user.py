import asyncio
from app.core.database import async_session_maker
from app.models.user import User, UserRole
from app.core.security import hash_password
from sqlalchemy import select as _select
import uuid as _uuid

async def run():
    async with async_session_maker() as seed_db:
        res = await seed_db.execute(_select(User).where(User.email == 'admin@local'))
        if res.scalar_one_or_none() is None:
            admin = User(
                id=str(_uuid.uuid4()),
                email='admin@local',
                password_hash=hash_password('Admin@1234'),
                role=UserRole.ADMIN,
                force_password_change=True,
            )
            seed_db.add(admin)
            await seed_db.commit()
            print("Seeded admin@local / Admin@1234")
        else:
            print("Admin already exists!")

asyncio.run(run())
