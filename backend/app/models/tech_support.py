from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class PartReplacement(Base):
    __tablename__ = "part_replacements"

    id: Mapped[int] = mapped_column(primary_key=True)
    occurred_date: Mapped[date] = mapped_column(Date)
    org_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)  # 소속기관
    field_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)  # 분야
    replace_type: Mapped[str] = mapped_column(String(300))  # 교체유형 (자유 기술)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # 담당자
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SupportTicket(Base):
    """기술지원 현황 — PC/프린터 및 정보시스템/대표누리집 등 시스템 티켓 통합."""

    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    occurred_date: Mapped[date] = mapped_column(Date)
    org_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)  # 소속기관
    category_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)  # 구분
    detail_type_code_id: Mapped[int | None] = mapped_column(
        ForeignKey("codes.id"), nullable=True
    )  # 세부유형
    content: Mapped[str] = mapped_column(Text)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")  # 조치결과 O/X
    requester_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 사용자(요청자)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # 담당자
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
