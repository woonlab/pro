import calendar
from collections import Counter
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.failure_incident import FailureIncident
from app.models.sla import (
    SlaBusinessMonthly,
    SlaBusinessService,
    SlaFailureTimeLimit,
    SlaMetric,
    SlaOperationMonthly,
)
from app.schemas.sla import (
    SlaBusinessMonthlyEntryInput,
    SlaBusinessMonthlyRow,
    SlaBusinessServiceInput,
    SlaBusinessServiceRead,
    SlaFailureTimeLimitInput,
    SlaFailureTimeLimitRead,
    SlaMetricRead,
    SlaMetricUpdate,
    SlaMonthlySummary,
    SlaOperationMonthlyInput,
    SlaOperationMonthlyRead,
    SlaScoreRow,
)
from app.services.sla_scoring import ensure_metrics, score_for

router = APIRouter(prefix="/sla", tags=["sla"], dependencies=[Depends(get_current_user)])


def _parse_year_month(year_month: str) -> tuple[int, int]:
    year, month = (int(part) for part in year_month.split("-"))
    return year, month


def _plan_hours(year_month: str) -> float:
    year, month = _parse_year_month(year_month)
    days = calendar.monthrange(year, month)[1]
    return days * 24


# ---- Master Data: metrics ----


@router.get("/metrics", response_model=list[SlaMetricRead])
def list_metrics(db: Session = Depends(get_db)):
    return ensure_metrics(db)


@router.put("/metrics/{metric_id}", response_model=SlaMetricRead)
def update_metric(metric_id: int, data: SlaMetricUpdate, db: Session = Depends(get_db)):
    metric = db.get(SlaMetric, metric_id)
    if metric is None:
        raise HTTPException(status_code=404, detail="Metric not found")
    for field, value in data.model_dump().items():
        setattr(metric, field, value)
    db.commit()
    db.refresh(metric)
    return metric


# ---- Master Data: failure time limits ----


@router.get("/failure-time-limits", response_model=list[SlaFailureTimeLimitRead])
def list_failure_time_limits(db: Session = Depends(get_db)):
    return list(db.scalars(select(SlaFailureTimeLimit)))


@router.post("/failure-time-limits", response_model=SlaFailureTimeLimitRead, status_code=201)
def create_failure_time_limit(data: SlaFailureTimeLimitInput, db: Session = Depends(get_db)):
    item = SlaFailureTimeLimit(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/failure-time-limits/{item_id}", response_model=SlaFailureTimeLimitRead)
def update_failure_time_limit(
    item_id: int, data: SlaFailureTimeLimitInput, db: Session = Depends(get_db)
):
    item = db.get(SlaFailureTimeLimit, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/failure-time-limits/{item_id}", status_code=204)
def delete_failure_time_limit(item_id: int, db: Session = Depends(get_db)):
    item = db.get(SlaFailureTimeLimit, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()


# ---- Availability: business services (master) ----


@router.get("/business-services", response_model=list[SlaBusinessServiceRead])
def list_business_services(db: Session = Depends(get_db)):
    return list(
        db.scalars(select(SlaBusinessService).order_by(SlaBusinessService.grade, SlaBusinessService.id))
    )


@router.post("/business-services", response_model=SlaBusinessServiceRead, status_code=201)
def create_business_service(data: SlaBusinessServiceInput, db: Session = Depends(get_db)):
    item = SlaBusinessService(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/business-services/{item_id}", response_model=SlaBusinessServiceRead)
def update_business_service(
    item_id: int, data: SlaBusinessServiceInput, db: Session = Depends(get_db)
):
    item = db.get(SlaBusinessService, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/business-services/{item_id}", status_code=204)
def delete_business_service(item_id: int, db: Session = Depends(get_db)):
    item = db.get(SlaBusinessService, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()


# ---- Availability: monthly performance ----


def _business_monthly_rows(db: Session, year_month: str) -> list[SlaBusinessMonthlyRow]:
    plan_hours = _plan_hours(year_month)
    services = list(
        db.scalars(
            select(SlaBusinessService)
            .where(SlaBusinessService.is_active.is_(True))
            .order_by(SlaBusinessService.grade, SlaBusinessService.id)
        )
    )
    entries = {
        m.business_service_id: m
        for m in db.scalars(
            select(SlaBusinessMonthly).where(SlaBusinessMonthly.year_month == year_month)
        )
    }
    rows = []
    for svc in services:
        entry = entries.get(svc.id)
        downtime = float(entry.downtime_hours) if entry else 0.0
        failure_count = entry.failure_count if entry else 0
        uptime_hours = max(plan_hours - downtime, 0)
        uptime_rate = (uptime_hours / plan_hours * 100) if plan_hours else 0
        rows.append(
            SlaBusinessMonthlyRow(
                business_service_id=svc.id,
                business_name=svc.name,
                grade=svc.grade,
                plan_hours=plan_hours,
                downtime_hours=downtime,
                failure_count=failure_count,
                uptime_hours=uptime_hours,
                uptime_rate=round(uptime_rate, 3),
            )
        )
    return rows


@router.get("/business-monthly", response_model=list[SlaBusinessMonthlyRow])
def get_business_monthly(year_month: str = Query(...), db: Session = Depends(get_db)):
    return _business_monthly_rows(db, year_month)


@router.put("/business-monthly", response_model=list[SlaBusinessMonthlyRow])
def set_business_monthly(
    data: list[SlaBusinessMonthlyEntryInput],
    year_month: str = Query(...),
    db: Session = Depends(get_db),
):
    for item in data:
        existing = db.scalar(
            select(SlaBusinessMonthly).where(
                SlaBusinessMonthly.business_service_id == item.business_service_id,
                SlaBusinessMonthly.year_month == year_month,
            )
        )
        if existing is None:
            db.add(
                SlaBusinessMonthly(
                    business_service_id=item.business_service_id,
                    year_month=year_month,
                    downtime_hours=item.downtime_hours,
                    failure_count=item.failure_count,
                )
            )
        else:
            existing.downtime_hours = item.downtime_hours
            existing.failure_count = item.failure_count
    db.commit()
    return _business_monthly_rows(db, year_month)


# ---- Operations: monthly values ----


@router.get("/operation-monthly", response_model=SlaOperationMonthlyRead)
def get_operation_monthly(year_month: str = Query(...), db: Session = Depends(get_db)):
    entry = db.scalar(select(SlaOperationMonthly).where(SlaOperationMonthly.year_month == year_month))
    if entry is None:
        entry = SlaOperationMonthly(year_month=year_month)
        db.add(entry)
        db.commit()
        db.refresh(entry)
    return entry


@router.put("/operation-monthly", response_model=SlaOperationMonthlyRead)
def set_operation_monthly(
    data: SlaOperationMonthlyInput,
    year_month: str = Query(...),
    db: Session = Depends(get_db),
):
    entry = db.scalar(select(SlaOperationMonthly).where(SlaOperationMonthly.year_month == year_month))
    if entry is None:
        entry = SlaOperationMonthly(year_month=year_month)
        db.add(entry)
    for field, value in data.model_dump().items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


# ---- Monthly summary (composite score) ----


def _failure_counts(db: Session, year_month: str) -> tuple[int, int, int]:
    year, month = _parse_year_month(year_month)
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = (
        datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        if month == 12
        else datetime(year, month + 1, 1, tzinfo=timezone.utc)
    )
    incidents = list(
        db.scalars(
            select(FailureIncident).where(
                FailureIncident.occurred_at >= start, FailureIncident.occurred_at < end
            )
        )
    )
    total_count = len(incidents)

    equipment_counts = Counter(i.equipment_id for i in incidents if i.equipment_id is not None)
    duplicate_count = sum(c - 1 for c in equipment_counts.values() if c > 1)

    limits = {
        (limit.severity_code_id, limit.equipment_scope): limit.max_minutes
        for limit in db.scalars(select(SlaFailureTimeLimit))
    }
    exceed_count = 0
    for incident in incidents:
        if incident.resolved_at is None or incident.service_down_at is None:
            continue
        if incident.severity_code_id is None or incident.equipment_scope is None:
            continue
        limit_minutes = limits.get((incident.severity_code_id, incident.equipment_scope))
        if limit_minutes is None:
            continue
        elapsed_minutes = (incident.resolved_at - incident.service_down_at).total_seconds() / 60
        if elapsed_minutes > limit_minutes:
            exceed_count += 1

    return exceed_count, duplicate_count, total_count


@router.get("/monthly-summary", response_model=SlaMonthlySummary)
def monthly_summary(year_month: str = Query(...), db: Session = Depends(get_db)):
    metrics = {m.key: m for m in ensure_metrics(db)}
    exceed_count, duplicate_count, total_count = _failure_counts(db, year_month)
    business_rows = _business_monthly_rows(db, year_month)
    operation = db.scalar(
        select(SlaOperationMonthly).where(SlaOperationMonthly.year_month == year_month)
    )

    raw_values: dict[str, float] = {
        "failure_exceed": exceed_count,
        "failure_duplicate": duplicate_count,
        "failure_total": total_count,
        "backup_rate": (
            (operation.backup_success_count / operation.backup_total_count * 100)
            if operation and operation.backup_total_count
            else 100.0
        ),
        "change_failure": operation.change_failure_count if operation else 0,
        "deliverable_level": float(operation.deliverable_score) if operation else 0.0,
        "security_compliance": 1.0 if (operation and operation.security_incident) else 0.0,
    }
    for grade in (1, 2, 3, 4):
        grade_rows = [r for r in business_rows if r.grade == grade]
        plan_sum = sum(r.plan_hours for r in grade_rows)
        uptime_sum = sum(r.uptime_hours for r in grade_rows)
        raw_values[f"availability_{grade}"] = (uptime_sum / plan_sum * 100) if plan_sum else 100.0

    rows: list[SlaScoreRow] = []
    total_score = 0.0
    for key, metric in metrics.items():
        raw_value = raw_values.get(key, 0.0)
        score = score_for(metric, raw_value)
        weight = float(metric.weight)
        weighted = round(score * weight / 100, 2)
        total_score += weighted
        rows.append(
            SlaScoreRow(
                key=key,
                name=metric.name,
                direction=metric.direction,
                weight=weight,
                raw_value=round(raw_value, 3),
                score=score,
                weighted_score=weighted,
            )
        )

    return SlaMonthlySummary(
        year_month=year_month,
        rows=rows,
        total_score=round(total_score, 2),
        failure_exceed_count=exceed_count,
        failure_duplicate_count=duplicate_count,
        failure_total_count=total_count,
    )
