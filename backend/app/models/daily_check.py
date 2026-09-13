from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class DailyCheck(Base):
    __tablename__ = "daily_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    check_date: Mapped[date] = mapped_column(Date)
    inspector_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    approved_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["DailyCheckItem"]] = relationship(
        back_populates="daily_check", cascade="all, delete-orphan", order_by="DailyCheckItem.sort_order"
    )
    failures: Mapped[list["DailyCheckFailure"]] = relationship(
        back_populates="daily_check",
        cascade="all, delete-orphan",
        order_by="DailyCheckFailure.sort_order",
    )


class DailyCheckItem(Base):
    __tablename__ = "daily_check_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    daily_check_id: Mapped[int] = mapped_column(
        ForeignKey("daily_checks.id", ondelete="CASCADE")
    )
    business_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)
    target_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)
    remark_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    daily_check: Mapped["DailyCheck"] = relationship(back_populates="items")


class DailyCheckFailure(Base):
    __tablename__ = "daily_check_failures"

    id: Mapped[int] = mapped_column(primary_key=True)
    daily_check_id: Mapped[int] = mapped_column(
        ForeignKey("daily_checks.id", ondelete="CASCADE")
    )
    system_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    failure_time: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    action: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    daily_check: Mapped["DailyCheck"] = relationship(back_populates="failures")
