from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.db import get_db
from app.models.group import Group, group_permissions, group_users
from app.models.permission import Permission
from app.models.user import User
from app.schemas.groups import GroupCreate, GroupDetailRead, GroupRead, GroupUpdate
from app.schemas.permissions import IdListInput

router = APIRouter(prefix="/groups", tags=["groups"], dependencies=[Depends(require_admin)])


def _to_detail(db: Session, group: Group) -> GroupDetailRead:
    permission_ids = list(
        db.scalars(
            select(group_permissions.c.permission_id).where(
                group_permissions.c.group_id == group.id
            )
        )
    )
    user_ids = list(
        db.scalars(select(group_users.c.user_id).where(group_users.c.group_id == group.id))
    )
    return GroupDetailRead(
        **GroupRead.model_validate(group).model_dump(),
        permission_ids=permission_ids,
        user_ids=user_ids,
    )


@router.get("", response_model=list[GroupRead])
def list_groups(db: Session = Depends(get_db)):
    return list(db.scalars(select(Group).order_by(Group.id)))


@router.post("", response_model=GroupRead, status_code=201)
def create_group(data: GroupCreate, db: Session = Depends(get_db)):
    group = Group(**data.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.get("/{group_id}", response_model=GroupDetailRead)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return _to_detail(db, group)


@router.put("/{group_id}", response_model=GroupRead)
def update_group(group_id: int, data: GroupUpdate, db: Session = Depends(get_db)):
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    group.name = data.name
    group.description = data.description
    group.is_active = data.is_active
    db.commit()
    db.refresh(group)
    return group


@router.put("/{group_id}/permissions", response_model=GroupDetailRead)
def set_group_permissions(group_id: int, data: IdListInput, db: Session = Depends(get_db)):
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    permissions = (
        list(db.scalars(select(Permission).where(Permission.id.in_(data.ids)))) if data.ids else []
    )
    if len(permissions) != len(set(data.ids)):
        raise HTTPException(status_code=404, detail="One or more permissions not found")

    db.execute(group_permissions.delete().where(group_permissions.c.group_id == group_id))
    for permission in permissions:
        db.execute(
            group_permissions.insert().values(group_id=group_id, permission_id=permission.id)
        )
    db.commit()
    return _to_detail(db, group)


@router.put("/{group_id}/users", response_model=GroupDetailRead)
def set_group_users(group_id: int, data: IdListInput, db: Session = Depends(get_db)):
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    users = list(db.scalars(select(User).where(User.id.in_(data.ids)))) if data.ids else []
    if len(users) != len(set(data.ids)):
        raise HTTPException(status_code=404, detail="One or more users not found")

    db.execute(group_users.delete().where(group_users.c.group_id == group_id))
    for user in users:
        db.execute(group_users.insert().values(group_id=group_id, user_id=user.id))
    db.commit()
    return _to_detail(db, group)
