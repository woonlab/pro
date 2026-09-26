from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_admin
from app.core.db import get_db
from app.models.group import Group, group_permissions
from app.models.menu import Menu
from app.models.permission import Permission, PermissionMenu, user_permissions
from app.models.user import User
from app.schemas.permissions import (
    IdListInput,
    PermissionCreate,
    PermissionDetailRead,
    PermissionMenuAssignment,
    PermissionRead,
    PermissionMenuRead,
    PermissionUpdate,
)

router = APIRouter(
    prefix="/permissions", tags=["permissions"], dependencies=[Depends(require_admin)]
)


def _to_detail(db: Session, permission: Permission) -> PermissionDetailRead:
    menu_links = list(
        db.scalars(
            select(PermissionMenu)
            .where(PermissionMenu.permission_id == permission.id)
            .options(selectinload(PermissionMenu.menu))
        )
    )
    group_ids = list(
        db.scalars(
            select(group_permissions.c.group_id).where(
                group_permissions.c.permission_id == permission.id
            )
        )
    )
    user_ids = list(
        db.scalars(
            select(user_permissions.c.user_id).where(
                user_permissions.c.permission_id == permission.id
            )
        )
    )
    return PermissionDetailRead(
        **PermissionRead.model_validate(permission).model_dump(),
        menus=[
            PermissionMenuRead(menu_id=link.menu_id, menu_name=link.menu.name, view_only=link.view_only)
            for link in menu_links
        ],
        group_ids=group_ids,
        user_ids=user_ids,
    )


@router.get("", response_model=list[PermissionRead])
def list_permissions(db: Session = Depends(get_db)):
    return list(db.scalars(select(Permission).order_by(Permission.id)))


@router.post("", response_model=PermissionRead, status_code=201)
def create_permission(data: PermissionCreate, db: Session = Depends(get_db)):
    permission = Permission(**data.model_dump())
    db.add(permission)
    db.commit()
    db.refresh(permission)
    return permission


@router.get("/{permission_id}", response_model=PermissionDetailRead)
def get_permission(permission_id: int, db: Session = Depends(get_db)):
    permission = db.get(Permission, permission_id)
    if permission is None:
        raise HTTPException(status_code=404, detail="Permission not found")
    return _to_detail(db, permission)


@router.put("/{permission_id}", response_model=PermissionRead)
def update_permission(permission_id: int, data: PermissionUpdate, db: Session = Depends(get_db)):
    permission = db.get(Permission, permission_id)
    if permission is None:
        raise HTTPException(status_code=404, detail="Permission not found")
    permission.name = data.name
    permission.description = data.description
    permission.is_active = data.is_active
    db.commit()
    db.refresh(permission)
    return permission


@router.put("/{permission_id}/menus", response_model=PermissionDetailRead)
def set_permission_menus(
    permission_id: int, data: list[PermissionMenuAssignment], db: Session = Depends(get_db)
):
    permission = db.get(Permission, permission_id)
    if permission is None:
        raise HTTPException(status_code=404, detail="Permission not found")

    menu_ids = [item.menu_id for item in data]
    if menu_ids:
        found = set(db.scalars(select(Menu.id).where(Menu.id.in_(menu_ids))))
        missing = set(menu_ids) - found
        if missing:
            raise HTTPException(status_code=404, detail=f"Unknown menu ids: {sorted(missing)}")

    db.execute(delete(PermissionMenu).where(PermissionMenu.permission_id == permission_id))
    for item in data:
        db.add(
            PermissionMenu(permission_id=permission_id, menu_id=item.menu_id, view_only=item.view_only)
        )
    db.commit()
    return _to_detail(db, permission)


@router.put("/{permission_id}/groups", response_model=PermissionDetailRead)
def set_permission_groups(permission_id: int, data: IdListInput, db: Session = Depends(get_db)):
    permission = db.get(Permission, permission_id)
    if permission is None:
        raise HTTPException(status_code=404, detail="Permission not found")
    groups = list(db.scalars(select(Group).where(Group.id.in_(data.ids)))) if data.ids else []
    if len(groups) != len(set(data.ids)):
        raise HTTPException(status_code=404, detail="One or more groups not found")

    db.execute(group_permissions.delete().where(group_permissions.c.permission_id == permission_id))
    for group in groups:
        db.execute(
            group_permissions.insert().values(group_id=group.id, permission_id=permission_id)
        )
    db.commit()
    return _to_detail(db, permission)


@router.put("/{permission_id}/users", response_model=PermissionDetailRead)
def set_permission_users(permission_id: int, data: IdListInput, db: Session = Depends(get_db)):
    permission = db.get(Permission, permission_id)
    if permission is None:
        raise HTTPException(status_code=404, detail="Permission not found")
    users = list(db.scalars(select(User).where(User.id.in_(data.ids)))) if data.ids else []
    if len(users) != len(set(data.ids)):
        raise HTTPException(status_code=404, detail="One or more users not found")

    db.execute(user_permissions.delete().where(user_permissions.c.permission_id == permission_id))
    for user in users:
        db.execute(user_permissions.insert().values(user_id=user.id, permission_id=permission_id))
    db.commit()
    return _to_detail(db, permission)
