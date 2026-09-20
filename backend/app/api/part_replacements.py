from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.code import Code
from app.models.tech_support import PartReplacement
from app.schemas.tech_support import PartReplacementInput, PartReplacementRead, YearlyStatCount

router = APIRouter(
    prefix="/part-replacements", tags=["part-replacements"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[PartReplacementRead])
def list_part_replacements(
    org_code_id: int | None = None,
    field_code_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(PartReplacement).order_by(PartReplacement.occurred_date.desc())
    if org_code_id is not None:
        stmt = stmt.where(PartReplacement.org_code_id == org_code_id)
    if field_code_id is not None:
        stmt = stmt.where(PartReplacement.field_code_id == field_code_id)
    return list(db.scalars(stmt))


@router.get("/stats", response_model=list[YearlyStatCount])
def part_replacement_stats(
    group_by: str = Query(default="field", pattern="^(field|org)$"),
    db: Session = Depends(get_db),
):
    group_column = (
        PartReplacement.field_code_id if group_by == "field" else PartReplacement.org_code_id
    )
    year_col = extract("year", PartReplacement.occurred_date)
    rows = db.execute(
        select(group_column, year_col.label("year"), func.count().label("count"))
        .group_by(group_column, year_col)
        .order_by(year_col.desc())
    ).all()

    code_ids = {row[0] for row in rows if row[0] is not None}
    names = {}
    if code_ids:
        for code in db.scalars(select(Code).where(Code.id.in_(code_ids))):
            names[code.id] = code.name

    return [
        YearlyStatCount(
            group_id=group_id,
            group_name=names.get(group_id, "미지정") if group_id is not None else "미지정",
            year=int(year),
            count=count,
        )
        for group_id, year, count in rows
    ]


@router.post("", response_model=PartReplacementRead, status_code=201)
def create_part_replacement(data: PartReplacementInput, db: Session = Depends(get_db)):
    item = PartReplacement(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=PartReplacementRead)
def update_part_replacement(
    item_id: int, data: PartReplacementInput, db: Session = Depends(get_db)
):
    item = db.get(PartReplacement, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_part_replacement(item_id: int, db: Session = Depends(get_db)):
    item = db.get(PartReplacement, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
