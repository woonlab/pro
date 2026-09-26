from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MenuCreate(BaseModel):
    parent_id: int | None = None
    name: str
    path: str | None = None
    description: str | None = None
    is_active: bool = True


class MenuUpdate(BaseModel):
    name: str
    path: str | None = None
    description: str | None = None
    is_active: bool = True


class MenuRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_id: int | None
    name: str
    path: str | None
    description: str | None
    is_active: bool
    sort_order: int
    created_at: datetime
    children: list["MenuRead"] = []
