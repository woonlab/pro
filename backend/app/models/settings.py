from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class SessionSettings(Base):
    """싱글턴 설정 — 활동이 없을 때 자동 로그아웃되기까지의 시간(분)."""

    __tablename__ = "session_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    idle_timeout_minutes: Mapped[int] = mapped_column(default=30, server_default="30")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
