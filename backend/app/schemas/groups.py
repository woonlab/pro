from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GroupCreate(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class GroupUpdate(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class GroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime


class GroupDetailRead(GroupRead):
    permission_ids: list[int] = []
    user_ids: list[int] = []
