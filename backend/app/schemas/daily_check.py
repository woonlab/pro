from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DailyCheckCreate(BaseModel):
    check_date: date
    inspector_user_id: int | None = None
    common_content: str | None = None
    maintenance_content: str | None = None
    log_missing_content: str | None = None
    ongoing_work_content: str | None = None


class DailyCheckUpdate(DailyCheckCreate):
    pass


class DailyCheckRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    check_date: date
    inspector_user_id: int | None
    common_content: str | None
    maintenance_content: str | None
    log_missing_content: str | None
    ongoing_work_content: str | None
    approved: bool
    approved_by_user_id: int | None
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime
