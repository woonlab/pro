from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.preventive_lists import SpecialCheck
from app.schemas.preventive_lists import SpecialCheckInput, SpecialCheckRead

router = APIRouter(
    prefix="/special-checks", tags=["special-checks"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[SpecialCheckRead])
def list_special_checks(db: Session = Depends(get_db)):
    return list(db.scalars(select(SpecialCheck).order_by(SpecialCheck.check_date.desc())))


@router.post("", response_model=SpecialCheckRead, status_code=201)
def create_special_check(data: SpecialCheckInput, db: Session = Depends(get_db)):
    item = SpecialCheck(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=SpecialCheckRead)
def update_special_check(item_id: int, data: SpecialCheckInput, db: Session = Depends(get_db)):
    item = db.get(SpecialCheck, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_special_check(item_id: int, db: Session = Depends(get_db)):
    item = db.get(SpecialCheck, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
