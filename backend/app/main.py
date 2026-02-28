"""
FastAPI application factory – Retinopathy AI Backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base

# Import all models so SQLAlchemy knows about them before create_all
from app.models import user, patient, scan  # noqa: F401

from app.api.routes.auth import router as auth_router
from app.api.routes.patients import router as patients_router
from app.api.routes.scans import router as scans_router, predict_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ── CORS ─────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Create tables ────────────────────────────────────
    Base.metadata.create_all(bind=engine)

    # ── Register routers ─────────────────────────────────
    app.include_router(auth_router)
    app.include_router(patients_router)
    app.include_router(scans_router)
    app.include_router(predict_router)

    # ── Health check ─────────────────────────────────────
    @app.get("/", tags=["Health"])
    def health_check():
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    return app


app = create_app()
