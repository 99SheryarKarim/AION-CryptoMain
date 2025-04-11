import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routes.auth_routes import router as auth_router
from config import settings
from tortoise.contrib.fastapi import register_tortoise
from mangum import Mangum

app = FastAPI()
handler = Mangum(app)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register routes with tags and prefix
app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"],
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
        "message": "CryptoAion API is running!",
        "version": "1.0.0"
    }

@app.options("/{path:path}")
async def options_handler(request: Request, path: str):
    return {"detail": "OK"}
