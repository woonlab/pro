from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.db import get_db
from app.models.settings import SessionSettings
from app.schemas.settings import SessionSettingsRead, SessionSettingsUpdate

router = APIRouter(prefix="/session-settings", tags=["session-settings"])


def _get_or_create(db: Session) -> SessionSettings:
    settings_row = db.scalar(select(SessionSettings).order_by(SessionSettings.id))
    if settings_row is None:
        settings_row = SessionSettings()
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return settings_row


@router.get("", response_model=SessionSettingsRead, dependencies=[Depends(get_current_user)])
def get_session_settings(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("", response_model=SessionSettingsRead, dependencies=[Depends(require_admin)])
def update_session_settings(data: SessionSettingsUpdate, db: Session = Depends(get_db)):
    settings_row = _get_or_create(db)
    settings_row.idle_timeout_minutes = data.idle_timeout_minutes
    db.commit()
    db.refresh(settings_row)
    return settings_row
