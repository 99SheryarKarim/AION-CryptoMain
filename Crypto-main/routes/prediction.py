from fastapi import APIRouter, Depends, Body, HTTPException
from controllers.auth import authenticate_user, create_access_token
from config import settings
from pydantic import BaseModel
from middlewares.auth_middleware import get_current_user
import joblib
from controllers.prediction import predict_next_price, prepare_data_for_prediction
from pydantic import BaseModel
from typing import Optional

# Define request model
class PredictionRequest(BaseModel):
    symbol: str  # Required symbol parameter
    timeframe: str = '24h'  # Default to 24h if no timeframe is provided

router = APIRouter()

# For Every time step Predictions
@router.post("/predict")
async def predict(
    request: PredictionRequest = Body(...)
):
    try:
        # Validate timeframe
        if request.timeframe not in ["30m", "1h", "4h", "24h"]:
            raise HTTPException(
                status_code=422,
                detail="Invalid timeframe. Must be one of: 30m, 1h, 4h, 24h"
            )
        
        # Pass symbol and timeframe to prediction function
        result = predict_next_price(symbol=request.symbol, timeframe=request.timeframe)
        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to make prediction: {str(e)}"
        )

# Fetches all the predictions for the last 60 days
@router.post("/previous_predictions")
async def get_previous_predictions(
    request: PredictionRequest = Body(...)
):
    try:
        # Validate timeframe
        if request.timeframe not in ["30m", "1h", "4h", "24h"]:
            raise HTTPException(
                status_code=422,
                detail="Invalid timeframe. Must be one of: 30m, 1h, 4h, 24h"
            )
        
        # Pass symbol and timeframe to data preparation function
        actuals, predictions = prepare_data_for_prediction(symbol=request.symbol, timeframe=request.timeframe)
        return {
            "actuals": actuals.tolist(),
            "predictions": predictions.tolist()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to fetch previous predictions: {str(e)}"
        )