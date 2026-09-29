"""FastAPI Application Entrypoint with async lifespan, CORS, and logging."""
from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.router import api_router
from backend.app.core.config import get_settings
from backend.app.core.logging import configure_logging, get_logger
from backend.app.db.session import create_tables
from src import model_loader

configure_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting EcoRal API server", env=settings.app_env)
    # Pre-load ML model into memory
    model_loader.get_model()
    logger.info("ML Model pre-loaded successfully")
    # Initialize DB tables
    await create_tables()
    logger.info("Database tables initialized")
    yield
    logger.info("Shutting down EcoRal API server")


def create_app() -> FastAPI:
    app = FastAPI(
        title="EcoRal Environmental Intelligence API",
        description="Production API for AI-powered Coral Bleaching Prediction & Environmental Intelligence",
        version="1.0.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    allowed_origins = list(
        {
            "https://ecoral-main.vercel.app",
            "https://ecoral-main-2rqa.vercel.app",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            *settings.cors_origins,
        }
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
