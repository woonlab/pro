from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: str | None = None
    is_admin: bool


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str | None = None
    is_admin: bool = False


class PasswordUpdate(BaseModel):
    password: str
