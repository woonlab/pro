from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CodeCreate(BaseModel):
    parent_id: int | None = None
    name: str
    description: str | None = None
    is_active: bool = True


class CodeUpdate(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class CodeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    parent_id: int | None
    code: int
    name: str
    description: str | None
    is_active: bool
    sort_order: int
    created_at: datetime
    children: list["CodeRead"] = []
