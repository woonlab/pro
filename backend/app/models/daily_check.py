from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class DailyCheck(Base):
    """일일업무보고: 공통사항 / 유지관리 / 로그미수집 / 진행 중 업무 4개 섹션."""

    __tablename__ = "daily_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    check_date: Mapped[date] = mapped_column(Date)
    inspector_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    common_content: Mapped[str | None] = mapped_column(Text, nullable=True)  # 공통사항
    maintenance_content: Mapped[str | None] = mapped_column(Text, nullable=True)  # 유지관리
    log_missing_content: Mapped[str | None] = mapped_column(Text, nullable=True)  # 로그미수집
    ongoing_work_content: Mapped[str | None] = mapped_column(Text, nullable=True)  # 진행 중 업무

    approved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    approved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
