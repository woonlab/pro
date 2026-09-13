from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class MaintenanceRecordBase(BaseModel):
    record_type: str
    performed_at: date
    next_due_at: date | None = None
    performed_by: str | None = None
    description: str | None = None


class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass


class MaintenanceRecordRead(MaintenanceRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    equipment_id: int
    created_at: datetime
