from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.maintenance import MaintenanceRecord
from app.schemas.maintenance import MaintenanceRecordCreate


def list_maintenance_records(db: Session, equipment_id: int) -> list[MaintenanceRecord]:
    return list(
        db.scalars(
            select(MaintenanceRecord)
            .where(MaintenanceRecord.equipment_id == equipment_id)
            .order_by(MaintenanceRecord.performed_at.desc())
        )
    )


def get_maintenance_record(db: Session, record_id: int) -> MaintenanceRecord | None:
    return db.get(MaintenanceRecord, record_id)


def create_maintenance_record(
    db: Session, equipment_id: int, data: MaintenanceRecordCreate
) -> MaintenanceRecord:
    record = MaintenanceRecord(equipment_id=equipment_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def delete_maintenance_record(db: Session, record: MaintenanceRecord) -> None:
    db.delete(record)
    db.commit()
