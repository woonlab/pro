from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.db import get_db
from app.models.menu import Menu
from app.schemas.menus import MenuCreate, MenuRead, MenuUpdate

router = APIRouter(prefix="/menus", tags=["menus"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[MenuRead])
def list_menus(db: Session = Depends(get_db)):
    return list(db.scalars(select(Menu).where(Menu.parent_id.is_(None)).order_by(Menu.sort_order, Menu.id)))


@router.post("", response_model=MenuRead, status_code=201)
def create_menu(data: MenuCreate, db: Session = Depends(get_db)):
    if data.parent_id is not None and db.get(Menu, data.parent_id) is None:
        raise HTTPException(status_code=404, detail="Parent menu not found")
    menu = Menu(**data.model_dump())
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu


@router.put("/{menu_id}", response_model=MenuRead)
def update_menu(menu_id: int, data: MenuUpdate, db: Session = Depends(get_db)):
    menu = db.get(Menu, menu_id)
    if menu is None:
        raise HTTPException(status_code=404, detail="Menu not found")
    menu.name = data.name
    menu.path = data.path
    menu.description = data.description
    menu.is_active = data.is_active
    db.commit()
    db.refresh(menu)
    return menu


@router.delete("/{menu_id}", status_code=204)
def delete_menu(menu_id: int, db: Session = Depends(get_db)):
    menu = db.get(Menu, menu_id)
    if menu is None:
        raise HTTPException(status_code=404, detail="Menu not found")
    if menu.children:
        raise HTTPException(status_code=400, detail="Cannot delete a menu that has sub-menus")
    db.delete(menu)
    db.commit()
