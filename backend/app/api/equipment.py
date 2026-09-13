from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.crud import equipment as crud
from app.schemas.equipment import EquipmentCreate, EquipmentRead, EquipmentUpdate

router = APIRouter(
    prefix="/equipments", tags=["equipment"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[EquipmentRead])
def list_equipment(db: Session = Depends(get_db)):
    return crud.list_equipment(db)


@router.post("", response_model=EquipmentRead, status_code=201)
def create_equipment(data: EquipmentCreate, db: Session = Depends(get_db)):
    return crud.create_equipment(db, data)


@router.get("/{equipment_id}", response_model=EquipmentRead)
def get_equipment(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return equipment


@router.put("/{equipment_id}", response_model=EquipmentRead)
def update_equipment(equipment_id: int, data: EquipmentUpdate, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return crud.update_equipment(db, equipment, data)


@router.delete("/{equipment_id}", status_code=204)
def delete_equipment(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    crud.delete_equipment(db, equipment)
