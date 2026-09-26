from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.preventive_lists import WeeklyTask
from app.schemas.preventive_lists import WeeklyTaskInput, WeeklyTaskRead

router = APIRouter(
    prefix="/weekly-tasks", tags=["weekly-tasks"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[WeeklyTaskRead])
def list_weekly_tasks(db: Session = Depends(get_db)):
    return list(db.scalars(select(WeeklyTask).order_by(WeeklyTask.task_date.desc())))


@router.post("", response_model=WeeklyTaskRead, status_code=201)
def create_weekly_task(data: WeeklyTaskInput, db: Session = Depends(get_db)):
    item = WeeklyTask(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=WeeklyTaskRead)
def update_weekly_task(item_id: int, data: WeeklyTaskInput, db: Session = Depends(get_db)):
    item = db.get(WeeklyTask, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_weekly_task(item_id: int, db: Session = Depends(get_db)):
    item = db.get(WeeklyTask, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
