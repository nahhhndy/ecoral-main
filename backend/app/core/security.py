"""JWT and bcrypt security utilities."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from backend.app.core.config import get_settings

_settings = get_settings()


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(
        minutes=_settings.access_token_expire_minutes
    )
    payload: dict[str, Any] = {"sub": subject, "exp": expire, "iat": int(now.timestamp()), "type": "access"}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _settings.jwt_secret_key, algorithm=_settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(
        days=_settings.refresh_token_expire_days
    )
    payload: dict[str, Any] = {"sub": subject, "exp": expire, "iat": int(now.timestamp()), "type": "refresh"}
    return jwt.encode(payload, _settings.jwt_secret_key, algorithm=_settings.jwt_algorithm)



def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token, _settings.jwt_secret_key, algorithms=[_settings.jwt_algorithm]
        )
    except JWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc
