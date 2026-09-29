"""User ORM model."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.session import Base

if TYPE_CHECKING:
    from backend.app.models.activity_log import ActivityLog
    from backend.app.models.location import Location
    from backend.app.models.prediction import Prediction
    from backend.app.models.report import Report


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )


    predictions: Mapped[list[Prediction]] = relationship(
        "Prediction", back_populates="user", lazy="noload"
    )
    locations: Mapped[list[Location]] = relationship(
        "Location", back_populates="user", lazy="noload"
    )
    reports: Mapped[list[Report]] = relationship(
        "Report", back_populates="user", lazy="noload"
    )
    activity_logs: Mapped[list[ActivityLog]] = relationship(
        "ActivityLog", back_populates="user", lazy="noload"
    )
