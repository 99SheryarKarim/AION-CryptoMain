from fastapi import APIRouter, Depends, Body
from controllers.auth import authenticate_user, create_access_token
from config import settings
from pydantic import BaseModel
from middlewares.auth_middleware import get_current_user
import joblib
from controllers.prediction import predict_next_price, prepare_data_for_prediction
from pydantic import BaseModel
from fastapi import HTTPException
from typing import Optional

# Define request model
class PredictionRequest(BaseModel):
    symbol: str = 'BTC-USD'  # Default to 'BTC-USD' if no symbol is provided
    timeframe: str = '24h'  # Default to 24h if no timeframe is provided

router = APIRouter()

# For Every time step Predictions
@router.post("/predict")
async def predict(
    request: PredictionRequest = Body(...)
):
    try:
        # Pass timeframe to prediction function
        result = predict_next_price(timeframe=request.timeframe)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        print(str(e))
        return {"error": str(e)}

# Fetches all the predictions for the last 60 days
@router.post("/previous_predictions")
async def get_previous_predictions(
    request: PredictionRequest = Body(...)
):
    try:
        # Pass timeframe to data preparation function
        actuals, predictions = prepare_data_for_prediction(timeframe=request.timeframe)
        return {
            "actuals": actuals.tolist(),
            "predictions": predictions.tolist()
        }
    except Exception as e:
        print(str(e))
        return {"error": str(e)}