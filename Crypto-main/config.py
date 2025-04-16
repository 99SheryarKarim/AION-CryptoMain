from pydantic import BaseModel
import os

class Settings(BaseModel):
    # Database settings
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'sqlite://db.sqlite3')
    
    # JWT settings
    JWT_SECRET: str = os.getenv('JWT_SECRET', 'hereisAhmed7hellofromthere')
    JWT_ALGORITHM: str = os.getenv('JWT_ALGORITHM', 'HS256')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
    
    # API settings
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "CryptoAion AI"
    BACKEND_CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]
    
    # Prediction settings
    DEFAULT_TIMEFRAME: str = "24h"
    TIMEFRAME_OPTIONS: list = ["30m", "1h", "4h", "24h"]
    
    # External API settings
    COINCAP_API_KEY: str = os.getenv('COINCAP_API_KEY', '')
    COINCAP_API_URL: str = "https://api.coincap.io/v2"
    COINGECKO_API_URL: str = "https://api.coingecko.com/api/v3"

settings = Settings()