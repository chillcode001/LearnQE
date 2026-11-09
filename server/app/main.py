"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import verify_database_is_ready
from app.routes.inventory import router as inventory_router
from app.routes.movements import router as movements_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    verify_database_is_ready()
    yield


app = FastAPI(
    title="Northstar Inventory API",
    description="Inventory endpoints backed by the project's Flyway-managed SQLite database.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
    expose_headers=["X-Total-Count"],
)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(inventory_router)
app.include_router(movements_router)
