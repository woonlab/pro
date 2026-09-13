from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class SpecialCheckInput(BaseModel):
    check_date: date
    content: str
    memo: str | None = None
    owner_user_id: int | None = None


class SpecialCheckRead(SpecialCheckInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class WeeklyTaskInput(BaseModel):
    task_date: date
    content: str
    memo: str | None = None
    owner_user_id: int | None = None


class WeeklyTaskRead(WeeklyTaskInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class WorkStatusInput(BaseModel):
    status_date: date
    leave_type: str
    content: str | None = None
    owner_user_id: int | None = None


class WorkStatusRead(WorkStatusInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
