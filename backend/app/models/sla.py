from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class SlaMetric(Base):
    """SLA Master Data — 지표별 채점 등급표 (100/90/80/70/60점 경계값 + 가중치)."""

    __tablename__ = "sla_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    direction: Mapped[str] = mapped_column(String(20))  # higher_better / lower_better / binary
    weight: Mapped[float] = mapped_column(Numeric(5, 2), default=0, server_default="0")
    threshold_100: Mapped[float] = mapped_column(Numeric(10, 3), default=0, server_default="0")
    threshold_90: Mapped[float] = mapped_column(Numeric(10, 3), default=0, server_default="0")
    threshold_80: Mapped[float] = mapped_column(Numeric(10, 3), default=0, server_default="0")
    threshold_70: Mapped[float] = mapped_column(Numeric(10, 3), default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SlaFailureTimeLimit(Base):
    """장애조치 최대 허용시간 참조표 (장애등급 x 장애장비구분)."""

    __tablename__ = "sla_failure_time_limits"

    id: Mapped[int] = mapped_column(primary_key=True)
    severity_code_id: Mapped[int] = mapped_column(ForeignKey("codes.id"))
    equipment_scope: Mapped[str] = mapped_column(String(20))  # single / common
    max_minutes: Mapped[int] = mapped_column(default=0, server_default="0")


class SlaBusinessService(Base):
    """가용성관리 업무명 마스터."""

    __tablename__ = "sla_business_services"

    id: Mapped[int] = mapped_column(primary_key=True)
    grade: Mapped[int] = mapped_column()  # 1~4 등급
    name: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SlaBusinessMonthly(Base):
    """업무별 월간 가동 실적 입력."""

    __tablename__ = "sla_business_monthly"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_service_id: Mapped[int] = mapped_column(
        ForeignKey("sla_business_services.id", ondelete="CASCADE")
    )
    year_month: Mapped[str] = mapped_column(String(7))  # 'YYYY-MM'
    downtime_hours: Mapped[float] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    failure_count: Mapped[int] = mapped_column(default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SlaOperationMonthly(Base):
    """운영관리 4개 지표의 월별 입력값."""

    __tablename__ = "sla_operation_monthly"

    id: Mapped[int] = mapped_column(primary_key=True)
    year_month: Mapped[str] = mapped_column(String(7), unique=True)
    backup_total_count: Mapped[int] = mapped_column(default=0, server_default="0")
    backup_success_count: Mapped[int] = mapped_column(default=0, server_default="0")
    change_failure_count: Mapped[int] = mapped_column(default=0, server_default="0")
    deliverable_score: Mapped[float] = mapped_column(Numeric(5, 2), default=0, server_default="0")
    security_incident: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
