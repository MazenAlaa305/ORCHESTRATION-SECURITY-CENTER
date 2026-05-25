"""
Seeds three demo accounts (viewer / analyst / admin) for testing.
Run after `alembic upgrade head`:
    docker compose exec backend python seed_demo_users.py
"""
import asyncio
import uuid

from sqlalchemy import select as _select

from app.core.database import async_session_maker
from app.core.security import hash_password
from app.models.user import User, UserRole

DEMO_USERS = [
    {
        "email": "viewercat@local",
        "full_name": "viewercat",
        "password": "cat123#",
        "role": UserRole.VIEWER,
    },
    {
        "email": "analystcat@local",
        "full_name": "Analyst cat",
        "password": "cat123#",
        "role": UserRole.ANALYST,
    },
    {
        "email": "admincat@local",
        "full_name": "Admin cat",
        "password": "cat123#",
        "role": UserRole.ADMIN,
    },
]


async def seed_demo_users(db):
    for u in DEMO_USERS:
        res = await db.execute(_select(User).where(User.email == u["email"]))
        if res.scalar_one_or_none() is not None:
            print(f"  already exists — skipped: {u['email']}")
            continue

        user = User(
            id=str(uuid.uuid4()),
            email=u["email"],
            full_name=u["full_name"],
            password_hash=hash_password(u["password"]),
            role=u["role"],
            force_password_change=False,
        )
        db.add(user)
        print(f"  created {u['role'].value:<8} {u['email']}")

    await db.commit()


async def run():
    print("Seeding demo users…")
    async with async_session_maker() as db:
        await seed_demo_users(db)
    print("Done.")


asyncio.run(run())