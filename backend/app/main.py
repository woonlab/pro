from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, equipment, maintenance
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


@app.get("/health")
def health():
    return {"status": "ok"}
