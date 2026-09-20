from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None = None
    phone: str | None = None
    is_admin: bool
    is_active: bool


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str | None = None
    phone: str | None = None
    is_admin: bool = False


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    is_admin: bool = False
    is_active: bool = True


class UserDetailRead(UserRead):
    group_ids: list[int] = []
    permission_ids: list[int] = []


class PasswordUpdate(BaseModel):
    password: str
