from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(primary_key=True)
    serial_no: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 연번, 직접입력, 수정 불가
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(20))  # server / security / network
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # 도입년월
    warranty_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active / retired
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # 자산관리 고도화 (V2.2 화면설계서 14~15p)
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # 담당자
    org_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)  # 소속기관
    major_category_code_id: Mapped[int | None] = mapped_column(
        ForeignKey("codes.id"), nullable=True
    )  # 대분류
    business_code_id: Mapped[int | None] = mapped_column(ForeignKey("codes.id"), nullable=True)  # 업무
    product_type_code_id: Mapped[int | None] = mapped_column(
        ForeignKey("codes.id"), nullable=True
    )  # 제품구분
    manufacturer_code_id: Mapped[int | None] = mapped_column(
        ForeignKey("codes.id"), nullable=True
    )  # 제조사
    review_result_code_id: Mapped[int | None] = mapped_column(
        ForeignKey("codes.id"), nullable=True
    )  # 검토결과
    review_content: Mapped[str | None] = mapped_column(String(1000), nullable=True)  # 검토내용

    hw_sw: Mapped[str | None] = mapped_column(String(10), nullable=True)  # 구분: HW / SW
    maintenance_target: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )  # 유지보수 대상여부: free(무상) / paid(유상)

    quantity: Mapped[int] = mapped_column(default=1, server_default="1")
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2), default=0, server_default="0")
    maintenance_rate: Mapped[float] = mapped_column(
        Numeric(6, 3), default=0, server_default="0"
    )  # 유지관리요율(%) — 슈퍼유저만 조회 가능
    maintenance_months: Mapped[int] = mapped_column(default=0, server_default="0")  # 유지개월

    maintenance_records: Mapped[list["MaintenanceRecord"]] = relationship(
        back_populates="equipment", cascade="all, delete-orphan"
    )
