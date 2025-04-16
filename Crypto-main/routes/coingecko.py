# routes/coingecko.py
from fastapi import APIRouter
import requests
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/api/coingecko/{coin_id}")
def proxy_coingecko(coin_id: str):
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false"
    resp = requests.get(url)
    if resp.status_code == 200:
        return resp.json()
    return JSONResponse(content={"error": "Failed to fetch from CoinGecko", "status_code": resp.status_code}, status_code=resp.status_code)