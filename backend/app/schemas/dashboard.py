from pydantic import BaseModel


class FailureIncidentStageCounts(BaseModel):
    in_progress: int
    completed: int
    approved: int


class DailyCheckStageCounts(BaseModel):
    pending_approval: int
    approved: int


class AssetSummary(BaseModel):
    existing_count: int
    year_target_label: str
    year_target_count: int
    delete_planned_count: int


class PreventiveSummary(BaseModel):
    daily_check_count: int
    special_check_count: int
    weekly_task_count: int
    work_status_count: int


class TechSupportSummary(BaseModel):
    part_replacement_count: int
    pc_printer_count: int
    info_system_count: int
    portal_count: int


class SlaTrendPoint(BaseModel):
    year_month: str
    total: float
    availability: float
    operation: float
    failure: float


class DashboardSummary(BaseModel):
    year: int
    month: int
    failure_incident: FailureIncidentStageCounts
    daily_check: DailyCheckStageCounts
    asset: AssetSummary
    preventive: PreventiveSummary
    tech_support: TechSupportSummary
    sla_trend: list[SlaTrendPoint]
