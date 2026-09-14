from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.daily_check import DailyCheck
from app.models.user import User
from app.schemas.daily_check import DailyCheckCreate, DailyCheckRead, DailyCheckUpdate

router = APIRouter(
    prefix="/daily-checks", tags=["daily-checks"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[DailyCheckRead])
def list_daily_checks(
    year_month: str | None = Query(default=None, description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    stmt = select(DailyCheck).order_by(DailyCheck.check_date.desc())
    if year_month:
        year, month = (int(part) for part in year_month.split("-"))
        start = date(year, month, 1)
        end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        stmt = stmt.where(DailyCheck.check_date >= start, DailyCheck.check_date < end)
    return list(db.scalars(stmt))


@router.post("", response_model=DailyCheckRead, status_code=201)
def create_daily_check(data: DailyCheckCreate, db: Session = Depends(get_db)):
    daily_check = DailyCheck(**data.model_dump())
    db.add(daily_check)
    db.commit()
    db.refresh(daily_check)
    return daily_check


@router.get("/{daily_check_id}", response_model=DailyCheckRead)
def get_daily_check(daily_check_id: int, db: Session = Depends(get_db)):
    daily_check = db.get(DailyCheck, daily_check_id)
    if daily_check is None:
        raise HTTPException(status_code=404, detail="Daily check not found")
    return daily_check


@router.put("/{daily_check_id}", response_model=DailyCheckRead)
def update_daily_check(daily_check_id: int, data: DailyCheckUpdate, db: Session = Depends(get_db)):
    daily_check = db.get(DailyCheck, daily_check_id)
    if daily_check is None:
        raise HTTPException(status_code=404, detail="Daily check not found")
    if daily_check.approved:
        raise HTTPException(status_code=400, detail="Already approved; cannot modify")
    for field, value in data.model_dump().items():
        setattr(daily_check, field, value)
    db.commit()
    db.refresh(daily_check)
    return daily_check


@router.post("/{daily_check_id}/approve", response_model=DailyCheckRead)
def approve_daily_check(
    daily_check_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="결재 권한이 없습니다")
    daily_check = db.get(DailyCheck, daily_check_id)
    if daily_check is None:
        raise HTTPException(status_code=404, detail="Daily check not found")
    daily_check.approved = True
    daily_check.approved_by_user_id = current_user.id
    daily_check.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(daily_check)
    return daily_check


@router.delete("/{daily_check_id}", status_code=204)
def delete_daily_check(daily_check_id: int, db: Session = Depends(get_db)):
    daily_check = db.get(DailyCheck, daily_check_id)
    if daily_check is None:
        raise HTTPException(status_code=404, detail="Daily check not found")
    db.delete(daily_check)
    db.commit()
