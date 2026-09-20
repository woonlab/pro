from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PermissionCreate(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class PermissionUpdate(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class PermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime


class PermissionMenuAssignment(BaseModel):
    menu_id: int
    view_only: bool = False


class PermissionMenuRead(BaseModel):
    menu_id: int
    menu_name: str
    view_only: bool


class PermissionDetailRead(PermissionRead):
    menus: list[PermissionMenuRead] = []
    group_ids: list[int] = []
    user_ids: list[int] = []


class IdListInput(BaseModel):
    ids: list[int]
