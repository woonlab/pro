from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FailureIncidentCreate(BaseModel):
    occurred_at: datetime
    equipment_id: int | None = None
    content: str
    severity_code_id: int | None = None
    equipment_scope: str | None = None


class FailureIncidentUpdate(BaseModel):
    content: str
    severity_code_id: int | None = None
    equipment_scope: str | None = None
    resolved_at: datetime | None = None
    service_down_at: datetime | None = None
    cause_analysis: str | None = None
    follow_up_action: str | None = None


class FailureIncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    occurred_at: datetime
    equipment_id: int | None
    content: str
    status: str
    resolved_at: datetime | None
    service_down_at: datetime | None
    severity_code_id: int | None
    equipment_scope: str | None
    cause_analysis: str | None
    follow_up_action: str | None
    registered_by_user_id: int | None
    handled_by_user_id: int | None
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime
