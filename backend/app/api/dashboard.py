from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.sla import monthly_summary
from app.core.db import get_db
from app.models.code import Code
from app.models.daily_check import DailyCheck
from app.models.equipment import Equipment
from app.models.failure_incident import FailureIncident
from app.models.preventive_lists import SpecialCheck, WeeklyTask, WorkStatus
from app.models.tech_support import PartReplacement, SupportTicket
from app.schemas.dashboard import (
    AssetCategoryCount,
    AssetSummary,
    SlaGroupScore,
    TodoItem,
    DailyCheckStageCounts,
    DashboardSummary,
    FailureIncidentStageCounts,
    PreventiveSummary,
    SlaTrendPoint,
    TechSupportSummary,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


def _month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = (
        datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        if month == 12
        else datetime(year, month + 1, 1, tzinfo=timezone.utc)
    )
    return start, end


def _date_bounds(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
    return start, end


def _code_ids_by_group_name(db: Session, group_name: str) -> dict[int, str]:
    root = db.scalar(select(Code).where(Code.name == group_name, Code.parent_id.is_(None)))
    if root is None:
        return {}
    return {c.id: c.name for c in db.scalars(select(Code).where(Code.parent_id == root.id))}


def _prior_months(year: int, month: int, count: int) -> list[tuple[int, int]]:
    months: list[tuple[int, int]] = []
    y, m = year, month
    for _ in range(count):
        months.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    months.reverse()
    return months


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    dt_start, dt_end = _month_bounds(year, month)
    d_start, d_end = _date_bounds(year, month)

    incidents = list(
        db.scalars(
            select(FailureIncident).where(
                FailureIncident.occurred_at >= dt_start, FailureIncident.occurred_at < dt_end
            )
        )
    )
    failure_incident = FailureIncidentStageCounts(
        in_progress=sum(1 for i in incidents if i.status == "in_progress"),
        completed=sum(1 for i in incidents if i.status == "completed"),
        approved=sum(1 for i in incidents if i.status == "approved"),
    )

    daily_checks = list(
        db.scalars(
            select(DailyCheck).where(DailyCheck.check_date >= d_start, DailyCheck.check_date < d_end)
        )
    )
    daily_check = DailyCheckStageCounts(
        pending_approval=sum(1 for c in daily_checks if not c.approved),
        approved=sum(1 for c in daily_checks if c.approved),
    )

    all_equipment = list(db.scalars(select(Equipment)))

    def _asset_year(eq: Equipment) -> int | None:
        if eq.purchase_date:
            return eq.purchase_date.year
        return eq.created_at.year if eq.created_at else None

    review_codes = _code_ids_by_group_name(db, "검토결과")
    delete_planned_ids = {cid for cid, name in review_codes.items() if "삭제" in name}

    asset = AssetSummary(
        existing_count=len(all_equipment),
        year_target_label=f"{year % 100}년대상",
        year_target_count=sum(1 for eq in all_equipment if _asset_year(eq) == year),
        delete_planned_count=sum(
            1 for eq in all_equipment if eq.review_result_code_id in delete_planned_ids
        ),
    )

    preventive = PreventiveSummary(
        daily_check_count=len(daily_checks),
        special_check_count=(
            db.scalar(
                select(func.count()).select_from(SpecialCheck).where(
                    SpecialCheck.check_date >= d_start, SpecialCheck.check_date < d_end
                )
            )
            or 0
        ),
        weekly_task_count=(
            db.scalar(
                select(func.count()).select_from(WeeklyTask).where(
                    WeeklyTask.task_date >= d_start, WeeklyTask.task_date < d_end
                )
            )
            or 0
        ),
        work_status_count=(
            db.scalar(
                select(func.count()).select_from(WorkStatus).where(
                    WorkStatus.status_date >= d_start, WorkStatus.status_date < d_end
                )
            )
            or 0
        ),
    )

    support_codes = _code_ids_by_group_name(db, "기술지원구분")
    pc_printer_ids = {
        cid for cid, name in support_codes.items() if "프린터" in name or "PC" in name.upper()
    }
    info_system_ids = {cid for cid, name in support_codes.items() if "정보시스템" in name}
    portal_ids = {cid for cid, name in support_codes.items() if "누리집" in name}

    tickets = list(
        db.scalars(
            select(SupportTicket).where(
                SupportTicket.occurred_date >= d_start, SupportTicket.occurred_date < d_end
            )
        )
    )
    tech_support = TechSupportSummary(
        part_replacement_count=(
            db.scalar(
                select(func.count()).select_from(PartReplacement).where(
                    PartReplacement.occurred_date >= d_start, PartReplacement.occurred_date < d_end
                )
            )
            or 0
        ),
        pc_printer_count=sum(1 for t in tickets if t.category_code_id in pc_printer_ids),
        info_system_count=sum(1 for t in tickets if t.category_code_id in info_system_ids),
        portal_count=sum(1 for t in tickets if t.category_code_id in portal_ids),
    )

    sla_trend: list[SlaTrendPoint] = []
    sla_groups: list[SlaGroupScore] = []
    group_labels = {"availability": "가용성", "operation": "운영", "failure": "장애"}
    for yy, mm in _prior_months(year, month, 6):
        ym = f"{yy:04d}-{mm:02d}"
        summary = monthly_summary(year_month=ym, db=db)
        grouped = {"availability": 0.0, "operation": 0.0, "failure": 0.0}
        weights = {"availability": 0.0, "operation": 0.0, "failure": 0.0}
        for row in summary.rows:
            if row.key.startswith("availability_"):
                group = "availability"
            elif row.key.startswith("failure_"):
                group = "failure"
            else:
                group = "operation"
            grouped[group] += row.weighted_score
            weights[group] += row.weight
        sla_groups = [
            SlaGroupScore(
                key=g,
                label=group_labels[g],
                score=round(grouped[g] / weights[g] * 100, 1) if weights[g] else 0.0,
            )
            for g in ("availability", "operation", "failure")
        ]
        sla_trend.append(
            SlaTrendPoint(
                year_month=ym,
                total=summary.total_score,
                availability=sla_groups[0].score,
                operation=sla_groups[1].score,
                failure=sla_groups[2].score,
            )
        )

    # 내가 처리할 일: 월과 무관하게 현재 미처리 건
    status_badge = {
        "registered": ("등록", "warn"),
        "in_progress": ("진행중", "danger"),
        "completed": ("결재대기", "warn"),
    }
    open_incidents = list(
        db.scalars(
            select(FailureIncident)
            .where(FailureIncident.status != "approved")
            .order_by(FailureIncident.occurred_at.desc())
        )
    )
    pending_checks = list(
        db.scalars(
            select(DailyCheck).where(DailyCheck.approved.is_(False)).order_by(DailyCheck.check_date.desc())
        )
    )
    open_tickets = list(
        db.scalars(
            select(SupportTicket)
            .where(SupportTicket.resolved.is_(False))
            .order_by(SupportTicket.occurred_date.desc())
        )
    )
    todos: list[TodoItem] = []
    for inc in open_incidents:
        badge, badge_type = status_badge.get(inc.status, (inc.status, "warn"))
        todos.append(
            TodoItem(
                kind="failure",
                title=f"장애 #{inc.id} {inc.content[:30]}",
                badge=badge,
                badge_type=badge_type,
                path="/failure-incidents",
            )
        )
    for chk in pending_checks:
        todos.append(
            TodoItem(
                kind="daily_check",
                title=f"일일업무보고 {chk.check_date} 결재",
                badge="결재대기",
                badge_type="warn",
                path=f"/daily-checks/{chk.id}",
            )
        )
    for tk in open_tickets:
        todos.append(
            TodoItem(
                kind="support",
                title=f"기술지원 {tk.content[:30]}",
                badge="미조치",
                badge_type="warn",
                path="/support-tickets",
            )
        )

    category_labels = {"server": "서버", "network": "네트워크", "security": "보안장비"}
    asset_categories = [
        AssetCategoryCount(
            category=cat,
            label=label,
            count=sum(1 for eq in all_equipment if eq.category == cat),
        )
        for cat, label in category_labels.items()
    ]

    return DashboardSummary(
        year=year,
        month=month,
        failure_incident=failure_incident,
        daily_check=daily_check,
        asset=asset,
        preventive=preventive,
        tech_support=tech_support,
        sla_trend=sla_trend,
        todos=todos[:8],
        todo_total=len(todos),
        asset_categories=asset_categories,
        sla_groups=sla_groups,
        ticket_total=len(tickets),
        ticket_unresolved=sum(1 for t in tickets if not t.resolved),
    )
