from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.code import Code
from app.models.equipment import Equipment
from app.models.failure_incident import FailureIncident
from app.models.user import User
from app.schemas.failure_incident import (
    FailureIncidentCreate,
    FailureIncidentRead,
    FailureIncidentUpdate,
)

router = APIRouter(
    prefix="/failure-incidents", tags=["failure-incidents"], dependencies=[Depends(get_current_user)]
)

_NEXT_STATUS = {
    "registered": "in_progress",
    "in_progress": "completed",
    "completed": "approved",
}


@router.get("", response_model=list[FailureIncidentRead])
def list_failure_incidents(
    year_month: str | None = Query(default=None, description="YYYY-MM"),
    status: str | None = None,
    org_code_id: int | None = None,
    major_category_code_id: int | None = None,
    has_follow_up: bool | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(FailureIncident).order_by(FailureIncident.occurred_at.desc())
    if year_month:
        year, month = (int(part) for part in year_month.split("-"))
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        end = (
            datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            if month == 12
            else datetime(year, month + 1, 1, tzinfo=timezone.utc)
        )
        stmt = stmt.where(FailureIncident.occurred_at >= start, FailureIncident.occurred_at < end)
    if status:
        stmt = stmt.where(FailureIncident.status == status)
    if has_follow_up is not None:
        if has_follow_up:
            stmt = stmt.where(FailureIncident.follow_up_action.is_not(None))
        else:
            stmt = stmt.where(FailureIncident.follow_up_action.is_(None))
    if org_code_id is not None or major_category_code_id is not None:
        stmt = stmt.join(Equipment, FailureIncident.equipment_id == Equipment.id)
        if org_code_id is not None:
            stmt = stmt.where(Equipment.org_code_id == org_code_id)
        if major_category_code_id is not None:
            stmt = stmt.where(Equipment.major_category_code_id == major_category_code_id)
    return list(db.scalars(stmt))


@router.get("/stats")
def failure_incident_stats(
    group_by: str = Query(default="type", pattern="^(type|org)$"),
    db: Session = Depends(get_db),
):
    group_column = (
        Equipment.major_category_code_id if group_by == "type" else Equipment.org_code_id
    )
    year_col = extract("year", FailureIncident.occurred_at)
    rows = db.execute(
        select(group_column, year_col.label("year"), func.count().label("count"))
        .select_from(FailureIncident)
        .join(Equipment, FailureIncident.equipment_id == Equipment.id, isouter=True)
        .group_by(group_column, year_col)
        .order_by(year_col.desc())
    ).all()

    code_ids = {row[0] for row in rows if row[0] is not None}
    names = {}
    if code_ids:
        for code in db.scalars(select(Code).where(Code.id.in_(code_ids))):
            names[code.id] = code.name

    return [
        {
            "group_id": group_id,
            "group_name": names.get(group_id, "미지정") if group_id is not None else "미지정",
            "year": int(year),
            "count": count,
        }
        for group_id, year, count in rows
    ]


@router.post("", response_model=FailureIncidentRead, status_code=201)
def create_failure_incident(
    data: FailureIncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = FailureIncident(
        **data.model_dump(), status="registered", registered_by_user_id=current_user.id
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/{incident_id}", response_model=FailureIncidentRead)
def get_failure_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(FailureIncident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Failure incident not found")
    return incident


@router.put("/{incident_id}", response_model=FailureIncidentRead)
def update_failure_incident(
    incident_id: int, data: FailureIncidentUpdate, db: Session = Depends(get_db)
):
    incident = db.get(FailureIncident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Failure incident not found")
    if incident.status == "approved":
        raise HTTPException(status_code=400, detail="이미 결재 완료된 건은 수정할 수 없습니다")
    for field, value in data.model_dump().items():
        setattr(incident, field, value)
    db.commit()
    db.refresh(incident)
    return incident


@router.post("/{incident_id}/advance", response_model=FailureIncidentRead)
def advance_failure_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.get(FailureIncident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Failure incident not found")
    next_status = _NEXT_STATUS.get(incident.status)
    if next_status is None:
        raise HTTPException(status_code=400, detail="더 이상 진행할 수 없는 상태입니다")

    if incident.status == "registered":
        incident.handled_by_user_id = current_user.id
    if next_status == "approved":
        incident.approved_at = datetime.now(timezone.utc)

    incident.status = next_status
    db.commit()
    db.refresh(incident)
    return incident


@router.delete("/{incident_id}", status_code=204)
def delete_failure_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(FailureIncident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Failure incident not found")
    db.delete(incident)
    db.commit()
