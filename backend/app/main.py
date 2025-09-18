from __future__ import annotations

import asyncio
import logging
import signal
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response

from app.core.config import get_settings, setup_logging
from app.db.mongo import close_mongo, ensure_indexes, init_mongo
from app.routes import auth, estimates, users, audit
from app.routers import estimates as cli_estimates_router
from app.routes.estimations import router as estimations_router
from app.routes.pricing import router as pricing_router
from app.routes.dashboard import router as dashboard_router
from app.routes.tools import router as tools_router
from app.routes.resources import router as resources_router
from app.services.users import create_default_admin


def setup_signal_handlers():
    """Setup signal handlers for graceful shutdown."""
    def signal_handler(signum, frame):
        logging.info(f"Received signal {signum}, initiating graceful shutdown...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with graceful shutdown handling."""
    logger = logging.getLogger(__name__)
    
    try:
        # Startup
        logger.info("Starting application...")
        setup_logging()
        setup_signal_handlers()
        await init_mongo()
        await ensure_indexes()
        await create_default_admin()
        logger.info("Application startup complete")
        
        yield
        
    except Exception as e:
        logger.error(f"Error during startup: {e}", exc_info=True)
        raise
    finally:
        # Shutdown
        try:
            logger.info("Shutting down application...")
            await close_mongo()
            logger.info("Application shutdown complete")
        except Exception as e:
            logger.error(f"Error during shutdown: {e}", exc_info=True)


def create_app() -> FastAPI:
    """Create FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.VERSION,
        description="Enterprise-ready estimation management API",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc"
    )
    
    # Security middleware
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    
    # CORS middleware - simplified configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    
    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logging.error(f"Global exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    
    # Health check
    @app.get("/health")
    async def health_check():
        """Comprehensive health check including database connectivity."""
        from app.db.mongo import get_db
        
        health_status = {
            "status": "healthy",
            "version": settings.VERSION,
            "timestamp": None,
            "database": "disconnected"
        }
        
        try:
            # Test database connection
            db = get_db()
            await db.command('ping')
            health_status["database"] = "connected"
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["database"] = f"error: {str(e)}"
        
        from datetime import datetime
        health_status["timestamp"] = datetime.utcnow().isoformat()
        
        status_code = 200 if health_status["status"] == "healthy" else 503
        return JSONResponse(content=health_status, status_code=status_code)
    
    # CORS is now handled by middleware only
    
    # Include routers
    app.include_router(auth.router)
    app.include_router(estimates.router)
    app.include_router(users.router)
    app.include_router(audit.router, prefix="/api")
    app.include_router(cli_estimates_router.router)
    
    # Legacy routers (for backwards compatibility)
    app.include_router(estimations_router, prefix="/estimations", tags=["estimations"])
    app.include_router(pricing_router, prefix="/pricing", tags=["pricing"])
    app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
    app.include_router(tools_router, prefix="/tools", tags=["tools"])
    app.include_router(resources_router, tags=["resources"]) 
    
    return app

app = create_app()


