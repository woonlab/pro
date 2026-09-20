from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.code import Code
from app.models.tech_support import SupportTicket
from app.schemas.tech_support import StatCount, SupportTicketInput, SupportTicketRead

router = APIRouter(
    prefix="/support-tickets", tags=["support-tickets"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[SupportTicketRead])
def list_support_tickets(
    year_month: str | None = Query(default=None, description="YYYY-MM"),
    org_code_id: int | None = None,
    category_code_id: int | None = None,
    detail_type_code_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(SupportTicket).order_by(SupportTicket.occurred_date.desc())
    if year_month:
        year, month = (int(part) for part in year_month.split("-"))
        start = date(year, month, 1)
        end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        stmt = stmt.where(SupportTicket.occurred_date >= start, SupportTicket.occurred_date < end)
    if org_code_id is not None:
        stmt = stmt.where(SupportTicket.org_code_id == org_code_id)
    if category_code_id is not None:
        stmt = stmt.where(SupportTicket.category_code_id == category_code_id)
    if detail_type_code_id is not None:
        stmt = stmt.where(SupportTicket.detail_type_code_id == detail_type_code_id)
    return list(db.scalars(stmt))


@router.get("/stats", response_model=list[StatCount])
def support_ticket_stats(
    year_month: str | None = Query(default=None, description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    stmt = select(
        SupportTicket.detail_type_code_id, func.count().label("count")
    ).group_by(SupportTicket.detail_type_code_id)
    if year_month:
        year, month = (int(part) for part in year_month.split("-"))
        start = date(year, month, 1)
        end = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        stmt = stmt.where(SupportTicket.occurred_date >= start, SupportTicket.occurred_date < end)
    rows = db.execute(stmt).all()

    code_ids = {row[0] for row in rows if row[0] is not None}
    names = {}
    if code_ids:
        for code in db.scalars(select(Code).where(Code.id.in_(code_ids))):
            names[code.id] = code.name

    return [
        StatCount(
            group_id=group_id,
            group_name=names.get(group_id, "미지정") if group_id is not None else "미지정",
            count=count,
        )
        for group_id, count in rows
    ]


@router.post("", response_model=SupportTicketRead, status_code=201)
def create_support_ticket(data: SupportTicketInput, db: Session = Depends(get_db)):
    item = SupportTicket(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=SupportTicketRead)
def update_support_ticket(item_id: int, data: SupportTicketInput, db: Session = Depends(get_db)):
    item = db.get(SupportTicket, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_support_ticket(item_id: int, db: Session = Depends(get_db)):
    item = db.get(SupportTicket, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
