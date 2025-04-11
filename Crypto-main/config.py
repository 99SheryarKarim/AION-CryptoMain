from pydantic import BaseModel
import os

class Settings(BaseModel):
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'sqlite://db.sqlite3')
    JWT_SECRET: str = os.getenv('JWT_SECRET', 'hereisAhmed7hellofromthere')
    JWT_ALGORITHM: str = os.getenv('JWT_ALGORITHM', 'HS256')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))

settings = Settings()