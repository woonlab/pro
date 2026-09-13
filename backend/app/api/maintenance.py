from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.crud import equipment as equipment_crud
from app.crud import maintenance as crud
from app.schemas.maintenance import MaintenanceRecordCreate, MaintenanceRecordRead

router = APIRouter(tags=["maintenance"], dependencies=[Depends(get_current_user)])


@router.get("/equipments/{equipment_id}/maintenance-records", response_model=list[MaintenanceRecordRead])
def list_maintenance_records(equipment_id: int, db: Session = Depends(get_db)):
    if equipment_crud.get_equipment(db, equipment_id) is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return crud.list_maintenance_records(db, equipment_id)


@router.post(
    "/equipments/{equipment_id}/maintenance-records",
    response_model=MaintenanceRecordRead,
    status_code=201,
)
def create_maintenance_record(
    equipment_id: int, data: MaintenanceRecordCreate, db: Session = Depends(get_db)
):
    if equipment_crud.get_equipment(db, equipment_id) is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return crud.create_maintenance_record(db, equipment_id, data)


@router.delete("/maintenance-records/{record_id}", status_code=204)
def delete_maintenance_record(record_id: int, db: Session = Depends(get_db)):
    record = crud.get_maintenance_record(db, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    crud.delete_maintenance_record(db, record)
