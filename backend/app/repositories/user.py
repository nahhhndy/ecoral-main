"""UserRepository for user data access."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.user import User
from backend.app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> User | None:
        clean_email = email.strip().lower()
        result = await self.db.execute(
            select(User).where(func.lower(User.email) == clean_email)
        )
        return result.scalar_one_or_none()


    async def email_exists(self, email: str) -> bool:
        user = await self.get_by_email(email)
        return user is not None
