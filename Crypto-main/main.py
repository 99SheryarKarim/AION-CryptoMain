import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes.auth_routes import router as auth_router
from routes.prediction import router as prediction_router
from routes.coingecko import router as coingecko_router
from config import settings
from tortoise.contrib.fastapi import register_tortoise
from mangum import Mangum

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
)
handler = Mangum(app)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register routes with tags and prefix
app.include_router(coingecko_router)
app.include_router(
    auth_router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Authentication"],
    responses={404: {"description": "Not found"}}
)

app.include_router(
    prediction_router,
    prefix=f"{settings.API_V1_PREFIX}/predictions",
    tags=["Predictions"],
    responses={404: {"description": "Not found"}}
)

# Get the DATABASE_URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)

# If using PostgreSQL, convert the URL format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Register Tortoise ORM
register_tortoise(
    app,
    db_url=DATABASE_URL,
    modules={"models": ["models.user"]},
    generate_schemas=True,
    add_exception_handlers=True,
)

@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "CryptoAion AI is running!",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_PREFIX}/docs"
    }

@app.options("/{path:path}")
async def options_handler(request: Request, path: str):
    return {"detail": "OK"}
