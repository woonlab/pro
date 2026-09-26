from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SessionSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idle_timeout_minutes: int
    updated_at: datetime


class SessionSettingsUpdate(BaseModel):
    idle_timeout_minutes: int = Field(ge=1, le=1440)
