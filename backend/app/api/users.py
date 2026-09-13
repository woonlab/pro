from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.db import get_db
from app.core.security import hash_password
from app.models.group import Group, group_users
from app.models.permission import Permission, user_permissions
from app.models.user import User
from app.schemas.auth import (
    PasswordUpdate,
    UserCreate,
    UserDetailRead,
    UserRead,
    UserUpdate,
)
from app.schemas.permissions import IdListInput

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


def _to_detail(db: Session, user: User) -> UserDetailRead:
    group_ids = list(
        db.scalars(select(group_users.c.group_id).where(group_users.c.user_id == user.id))
    )
    permission_ids = list(
        db.scalars(
            select(user_permissions.c.permission_id).where(user_permissions.c.user_id == user.id)
        )
    )
    return UserDetailRead(
        **UserRead.model_validate(user).model_dump(),
        group_ids=group_ids,
        permission_ids=permission_ids,
    )


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)):
    return list(db.scalars(select(User).order_by(User.id)))


@router.post("", response_model=UserRead, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == data.username)) is not None:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        is_admin=data.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserDetailRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_detail(db, user)


@router.put("/{user_id}", response_model=UserRead)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.full_name = data.full_name
    user.phone = data.phone
    user.is_admin = data.is_admin
    user.is_active = data.is_active
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/password", response_model=UserRead)
def update_password(user_id: int, data: PasswordUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(data.password)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/groups", response_model=UserDetailRead)
def set_user_groups(user_id: int, data: IdListInput, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    groups = list(db.scalars(select(Group).where(Group.id.in_(data.ids)))) if data.ids else []
    if len(groups) != len(set(data.ids)):
        raise HTTPException(status_code=404, detail="One or more groups not found")

    db.execute(group_users.delete().where(group_users.c.user_id == user_id))
    for group in groups:
        db.execute(group_users.insert().values(group_id=group.id, user_id=user_id))
    db.commit()
    return _to_detail(db, user)


@router.put("/{user_id}/permissions", response_model=UserDetailRead)
def set_user_permissions(user_id: int, data: IdListInput, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    permissions = (
        list(db.scalars(select(Permission).where(Permission.id.in_(data.ids)))) if data.ids else []
    )
    if len(permissions) != len(set(data.ids)):
        raise HTTPException(status_code=404, detail="One or more permissions not found")

    db.execute(user_permissions.delete().where(user_permissions.c.user_id == user_id))
    for permission in permissions:
        db.execute(
            user_permissions.insert().values(user_id=user_id, permission_id=permission.id)
        )
    db.commit()
    return _to_detail(db, user)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        admin_count = db.scalar(
            select(func.count()).select_from(User).where(User.is_admin.is_(True))
        )
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin account")
    db.delete(user)
    db.commit()
