from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class EquipmentBase(BaseModel):
    name: str
    category: str
    model: str | None = None
    location: str | None = None
    ip_address: str | None = None
    owner: str | None = None
    purchase_date: date | None = None
    warranty_end: date | None = None
    status: str = "active"


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(EquipmentBase):
    pass


class EquipmentRead(EquipmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
