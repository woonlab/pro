from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SlaMetricRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    name: str
    direction: str
    weight: float
    threshold_100: float
    threshold_90: float
    threshold_80: float
    threshold_70: float
    updated_at: datetime


class SlaMetricUpdate(BaseModel):
    weight: float
    threshold_100: float
    threshold_90: float
    threshold_80: float
    threshold_70: float


class SlaFailureTimeLimitInput(BaseModel):
    severity_code_id: int
    equipment_scope: str
    max_minutes: int


class SlaFailureTimeLimitRead(SlaFailureTimeLimitInput):
    model_config = ConfigDict(from_attributes=True)
    id: int


class SlaBusinessServiceInput(BaseModel):
    grade: int
    name: str
    is_active: bool = True


class SlaBusinessServiceRead(SlaBusinessServiceInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class SlaBusinessMonthlyEntryInput(BaseModel):
    business_service_id: int
    downtime_hours: float = 0
    failure_count: int = 0


class SlaBusinessMonthlyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    business_service_id: int
    year_month: str
    downtime_hours: float
    failure_count: int
    updated_at: datetime


class SlaBusinessMonthlyRow(BaseModel):
    business_service_id: int
    business_name: str
    grade: int
    plan_hours: float
    downtime_hours: float
    failure_count: int
    uptime_hours: float
    uptime_rate: float


class SlaOperationMonthlyInput(BaseModel):
    backup_total_count: int = 0
    backup_success_count: int = 0
    change_failure_count: int = 0
    deliverable_score: float = 0
    security_incident: bool = False


class SlaOperationMonthlyRead(SlaOperationMonthlyInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    year_month: str
    updated_at: datetime


class SlaScoreRow(BaseModel):
    key: str
    name: str
    direction: str
    weight: float
    raw_value: float
    score: int
    weighted_score: float


class SlaMonthlySummary(BaseModel):
    year_month: str
    rows: list[SlaScoreRow]
    total_score: float
    failure_exceed_count: int
    failure_duplicate_count: int
    failure_total_count: int
