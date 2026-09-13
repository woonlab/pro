from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DailyCheckItemInput(BaseModel):
    business_code_id: int | None = None
    target_code_id: int | None = None
    remark_code_id: int | None = None
    note: str | None = None


class DailyCheckItemRead(DailyCheckItemInput):
    model_config = ConfigDict(from_attributes=True)
    id: int


class DailyCheckFailureInput(BaseModel):
    system_name: str | None = None
    failure_time: str | None = None
    cause: str | None = None
    action: str | None = None


class DailyCheckFailureRead(DailyCheckFailureInput):
    model_config = ConfigDict(from_attributes=True)
    id: int


class DailyCheckCreate(BaseModel):
    check_date: date
    inspector_user_id: int | None = None
    items: list[DailyCheckItemInput] = []
    failures: list[DailyCheckFailureInput] = []


class DailyCheckUpdate(BaseModel):
    check_date: date
    inspector_user_id: int | None = None
    items: list[DailyCheckItemInput] = []
    failures: list[DailyCheckFailureInput] = []


class DailyCheckRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    check_date: date
    inspector_user_id: int | None
    approved: bool
    approved_by_user_id: int | None
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[DailyCheckItemRead] = []
    failures: list[DailyCheckFailureRead] = []
