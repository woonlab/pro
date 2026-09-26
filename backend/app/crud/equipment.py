from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.equipment import Equipment
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate


def list_equipment(db: Session) -> list[Equipment]:
    return list(db.scalars(select(Equipment).order_by(Equipment.id)))


def get_equipment(db: Session, equipment_id: int) -> Equipment | None:
    return db.get(Equipment, equipment_id)


def _next_serial_no(db: Session) -> str:
    existing = db.scalars(select(Equipment.serial_no).where(Equipment.serial_no.is_not(None)))
    # 6자리 초과 값은 수기 입력된 별도 체계로 보고 자동 채번에서 제외
    numbers = [int(s) for s in existing if s.isdigit() and len(s) <= 6]
    return str(max(numbers, default=0) + 1)


def create_equipment(db: Session, data: EquipmentCreate) -> Equipment:
    values = data.model_dump()
    values["serial_no"] = _next_serial_no(db)
    equipment = Equipment(**values)
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    return equipment


def update_equipment(db: Session, equipment: Equipment, data: EquipmentUpdate) -> Equipment:
    for field, value in data.model_dump().items():
        setattr(equipment, field, value)
    db.commit()
    db.refresh(equipment)
    return equipment


def delete_equipment(db: Session, equipment: Equipment) -> None:
    db.delete(equipment)
    db.commit()
