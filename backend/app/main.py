from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    auth,
    codes,
    daily_checks,
    dashboard,
    equipment,
    failure_incidents,
    groups,
    maintenance,
    menus,
    part_replacements,
    permissions,
    session_settings,
    sla,
    special_checks,
    support_tickets,
    users,
    weekly_tasks,
    work_status,
)
from app.core.config import settings

app = FastAPI(title="FMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(equipment.router)
app.include_router(maintenance.router)
app.include_router(users.router)
app.include_router(codes.router)
app.include_router(menus.router)
app.include_router(permissions.router)
app.include_router(groups.router)
app.include_router(daily_checks.router)
app.include_router(special_checks.router)
app.include_router(weekly_tasks.router)
app.include_router(work_status.router)
app.include_router(part_replacements.router)
app.include_router(support_tickets.router)
app.include_router(failure_incidents.router)
app.include_router(sla.router)
app.include_router(session_settings.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
