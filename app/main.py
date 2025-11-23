from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import status
from app.database import async_engine, Base
from app.routers import auth, dashboard, notifications, projects, billing
from app.routers import llm_providers, wrapped_apis, wrap_x
from app.config import settings
import app.models  # Import all models
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wrap-X API", version="1.0.0")


@app.on_event("startup")
async def startup_event():
    """Validate critical configuration on startup"""
    # Check ENCRYPTION_KEY in production
    is_production = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod") or os.getenv("PRODUCTION", "").lower() == "true"
    
    if is_production and not settings.encryption_key:
        logger.error("CRITICAL: ENCRYPTION_KEY is not set in production environment!")
        logger.error("This will cause data loss. Set ENCRYPTION_KEY in your .env file.")
        raise ValueError("ENCRYPTION_KEY must be set in production")
    
    if not settings.encryption_key:
        logger.warning("ENCRYPTION_KEY not set - using generated key (NOT SECURE for production!)")
        logger.warning("Set ENCRYPTION_KEY in .env file for production use")
    
    logger.info("Wrap-X API started successfully")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed messages"""
    errors = exc.errors()
    error_details = []
    for error in errors:
        error_details.append({
            "field": ".".join(str(loc) for loc in error.get("loc", [])),
            "message": error.get("msg"),
            "type": error.get("type")
        })
    logger.error(f"Validation error: {error_details}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": error_details, "message": "Validation failed"}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    import traceback
    error_trace = traceback.format_exc()
    logger.error(f"Unhandled exception: {exc}\n{error_trace}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc), "message": "Internal server error"}
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wrap-x.com",
        "https://www.wrap-x.com",
        "https://wrap-x-frontend-t7ya.onrender.com",  # Render frontend
        "http://localhost:3000",  # Keep for local dev
        "http://localhost:5173",  # Keep for local dev
        "http://127.0.0.1:3000",  # Keep for local dev
        "http://127.0.0.1:5173",  # Keep for local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(projects.router)
app.include_router(llm_providers.router)
app.include_router(wrapped_apis.router)
app.include_router(wrap_x.router)  # Simplified /api/wrap-x/chat endpoint
app.include_router(billing.router)


@app.get("/")
async def root():
    return {"message": "Wrap-X API", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

