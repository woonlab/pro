from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.preventive_lists import WorkStatus
from app.schemas.preventive_lists import WorkStatusInput, WorkStatusRead

router = APIRouter(
    prefix="/work-status", tags=["work-status"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[WorkStatusRead])
def list_work_status(db: Session = Depends(get_db)):
    return list(db.scalars(select(WorkStatus).order_by(WorkStatus.status_date.desc())))


@router.post("", response_model=WorkStatusRead, status_code=201)
def create_work_status(data: WorkStatusInput, db: Session = Depends(get_db)):
    item = WorkStatus(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=WorkStatusRead)
def update_work_status(item_id: int, data: WorkStatusInput, db: Session = Depends(get_db)):
    item = db.get(WorkStatus, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_work_status(item_id: int, db: Session = Depends(get_db)):
    item = db.get(WorkStatus, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
