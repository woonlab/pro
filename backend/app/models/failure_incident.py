from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class FailureIncident(Base):
    __tablename__ = "failure_incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))  # 발생일
    equipment_id: Mapped[int | None] = mapped_column(ForeignKey("equipment.id"), nullable=True)  # 연번
    content: Mapped[str] = mapped_column(Text)  # 내용

    status: Mapped[str] = mapped_column(String(20), default="registered", server_default="registered")
    # registered -> in_progress -> completed -> approved

    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # 조치시간
    service_down_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # 서비스 중단시간
    severity_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)  # 장애등급
    equipment_scope: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # single(단일업무장비) / common(공통장비)

    cause_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)  # 장애원인 분석
    follow_up_action: Mapped[str | None] = mapped_column(Text, nullable=True)  # 사후 대책

    registered_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    handled_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
