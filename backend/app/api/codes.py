from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.db import get_db
from app.models.code import Code
from app.schemas.codes import CodeCreate, CodeRead, CodeUpdate

router = APIRouter(prefix="/codes", tags=["codes"], dependencies=[Depends(require_admin)])


def _code_exists(db: Session, candidate: int) -> bool:
    return db.scalar(select(Code.id).where(Code.code == candidate)) is not None


def _next_code(db: Session, parent: Code | None) -> int:
    if parent is None:
        count = db.scalar(select(func.count()).select_from(Code).where(Code.parent_id.is_(None)))
        candidate = (count + 1) * 10000
        step = 10000
    else:
        count = db.scalar(select(func.count()).select_from(Code).where(Code.parent_id == parent.id))
        if parent.parent_id is None:
            # depth-1 child of a root: matches the spec's example (10000 -> 10010, 10020, ...)
            candidate = parent.code + (count + 1) * 10
            step = 10
        else:
            # depth-2+ descendant: namespace under the parent's own code so it can never
            # collide with codes generated at a shallower depth elsewhere in the tree.
            candidate = parent.code * 100 + (count + 1)
            step = 1

    # Defensive fallback: skip forward past any pre-existing value (e.g. leftover rows
    # from a manual fix) so code creation never fails with a uniqueness conflict.
    while _code_exists(db, candidate):
        candidate += step
    return candidate


@router.get("", response_model=list[CodeRead])
def list_codes(db: Session = Depends(get_db)):
    return list(db.scalars(select(Code).where(Code.parent_id.is_(None)).order_by(Code.code)))


@router.post("", response_model=CodeRead, status_code=201)
def create_code(data: CodeCreate, db: Session = Depends(get_db)):
    parent = None
    if data.parent_id is not None:
        parent = db.get(Code, data.parent_id)
        if parent is None:
            raise HTTPException(status_code=404, detail="Parent code not found")

    code = Code(
        parent_id=data.parent_id,
        code=_next_code(db, parent),
        name=data.name,
        description=data.description,
        is_active=data.is_active,
    )
    db.add(code)
    db.commit()
    db.refresh(code)
    return code


@router.put("/{code_id}", response_model=CodeRead)
def update_code(code_id: int, data: CodeUpdate, db: Session = Depends(get_db)):
    code = db.get(Code, code_id)
    if code is None:
        raise HTTPException(status_code=404, detail="Code not found")
    code.name = data.name
    code.description = data.description
    code.is_active = data.is_active
    db.commit()
    db.refresh(code)
    return code
