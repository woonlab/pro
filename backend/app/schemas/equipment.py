from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, computed_field


class EquipmentBase(BaseModel):
    name: str
    category: str
    model: str | None = None
    location: str | None = None
    ip_address: str | None = None
    purchase_date: date | None = None
    warranty_end: date | None = None
    status: str = "active"

    owner_user_id: int | None = None
    org_code_id: int | None = None
    major_category_code_id: int | None = None
    business_code_id: int | None = None
    product_type_code_id: int | None = None
    manufacturer_code_id: int | None = None
    review_result_code_id: int | None = None
    review_content: str | None = None

    hw_sw: str | None = None
    maintenance_target: str | None = None

    quantity: int = 1
    unit_price: float = 0
    maintenance_rate: float = 0
    maintenance_months: int = 0


class EquipmentCreate(EquipmentBase):
    serial_no: str | None = None


class EquipmentUpdate(EquipmentBase):
    pass


class EquipmentRead(EquipmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    serial_no: str | None
    maintenance_rate: float | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def acquisition_price(self) -> float:
        return round(self.quantity * self.unit_price, 2)

    @computed_field
    @property
    def maintenance_amount(self) -> float:
        if self.maintenance_rate is None:
            return 0
        return round(self.maintenance_months * self.acquisition_price * (self.maintenance_rate / 100), 2)
