from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.crud import equipment as crud
from app.models.code import Code
from app.models.equipment import Equipment
from app.models.user import User
from app.schemas.equipment import EquipmentCreate, EquipmentRead, EquipmentUpdate

router = APIRouter(
    prefix="/equipments", tags=["equipment"], dependencies=[Depends(get_current_user)]
)

_CODE_FIELDS = [
    "org_code_id",
    "major_category_code_id",
    "business_code_id",
    "product_type_code_id",
    "manufacturer_code_id",
    "review_result_code_id",
]


def _validate_references(db: Session, data: EquipmentCreate | EquipmentUpdate) -> None:
    for field in _CODE_FIELDS:
        code_id = getattr(data, field)
        if code_id is not None and db.get(Code, code_id) is None:
            raise HTTPException(status_code=404, detail=f"{field}: code not found")
    if data.owner_user_id is not None and db.get(User, data.owner_user_id) is None:
        raise HTTPException(status_code=404, detail="owner_user_id: user not found")


def _to_read(equipment: Equipment, current_user: User) -> EquipmentRead:
    read = EquipmentRead.model_validate(equipment)
    if not current_user.is_admin:
        read.maintenance_rate = None
    return read


@router.get("", response_model=list[EquipmentRead])
def list_equipment(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [_to_read(e, current_user) for e in crud.list_equipment(db)]


@router.post("", response_model=EquipmentRead, status_code=201)
def create_equipment(
    data: EquipmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    _validate_references(db, data)
    equipment = crud.create_equipment(db, data)
    return _to_read(equipment, current_user)


@router.get("/{equipment_id}", response_model=EquipmentRead)
def get_equipment(
    equipment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return _to_read(equipment, current_user)


@router.put("/{equipment_id}", response_model=EquipmentRead)
def update_equipment(
    equipment_id: int,
    data: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    _validate_references(db, data)
    equipment = crud.update_equipment(db, equipment, data)
    return _to_read(equipment, current_user)


@router.delete("/{equipment_id}", status_code=204)
def delete_equipment(equipment_id: int, db: Session = Depends(get_db)):
    equipment = crud.get_equipment(db, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    crud.delete_equipment(db, equipment)
