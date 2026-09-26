from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PartReplacementInput(BaseModel):
    occurred_date: date
    org_code_id: int | None = None
    field_code_id: int | None = None
    replace_type: str
    owner_user_id: int | None = None


class PartReplacementRead(PartReplacementInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class SupportTicketInput(BaseModel):
    occurred_date: date
    org_code_id: int | None = None
    category_code_id: int | None = None
    detail_type_code_id: int | None = None
    content: str
    resolved: bool = False
    requester_name: str | None = None
    owner_user_id: int | None = None


class SupportTicketRead(SupportTicketInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class StatCount(BaseModel):
    group_id: int | None
    group_name: str
    count: int


class YearlyStatCount(StatCount):
    year: int
