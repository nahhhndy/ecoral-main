"""AuthService handling registration, login, and token management."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from backend.app.models.user import User
from backend.app.repositories.user import UserRepository
from backend.app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)


settings = get_settings()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.user_repo = UserRepository(db)

    async def register(self, request: RegisterRequest) -> tuple[User, TokenResponse]:
        import asyncio
        if await self.user_repo.email_exists(request.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        hashed_pwd = await asyncio.to_thread(hash_password, request.password)
        user = await self.user_repo.create(
            email=request.email,
            full_name=request.full_name,
            hashed_password=hashed_pwd,
        )
        tokens = self._create_tokens(user)
        return user, tokens

    async def login(self, request: LoginRequest) -> tuple[User, TokenResponse]:
        import asyncio
        user = await self.user_repo.get_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        is_valid = await asyncio.to_thread(verify_password, request.password, user.hashed_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        tokens = self._create_tokens(user)
        return user, tokens

    async def verify_account(self, email: str) -> dict[str, Any]:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        return {"exists": True, "email": user.email, "full_name": user.full_name}

    async def reset_password(self, request: ResetPasswordRequest) -> MessageResponse:
        import asyncio
        user = await self.user_repo.get_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )
        hashed_pwd = await asyncio.to_thread(hash_password, request.new_password)
        user.hashed_password = hashed_pwd
        user.password_changed_at = datetime.now(UTC)
        await self.user_repo.save(user)
        return MessageResponse(
            message="Password changed successfully. Please sign in with your new password.",
            status="success",
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:

        try:
            payload = decode_token(refresh_token)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is not a refresh token",
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid payload",
            )
        user = await self.user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        return self._create_tokens(user)

    def _create_tokens(self, user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )

    @staticmethod
    def user_to_response(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at.replace(tzinfo=UTC).isoformat(),
        )
