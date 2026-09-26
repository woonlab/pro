from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class SpecialCheck(Base):
    __tablename__ = "special_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    check_date: Mapped[date] = mapped_column(Date)
    content: Mapped[str] = mapped_column(Text)
    memo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class WeeklyTask(Base):
    __tablename__ = "weekly_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_date: Mapped[date] = mapped_column(Date)
    content: Mapped[str] = mapped_column(Text)
    memo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class WorkStatus(Base):
    __tablename__ = "work_statuses"

    id: Mapped[int] = mapped_column(primary_key=True)
    status_date: Mapped[date] = mapped_column(Date)
    leave_type: Mapped[str] = mapped_column(String(20))  # vacation(휴가) / remote(재택)
    content: Mapped[str | None] = mapped_column(String(500), nullable=True)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
