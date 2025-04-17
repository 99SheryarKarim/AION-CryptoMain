import { createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

// Async thunk for fetching previous predictions
export const FetchLastPredictions = createAsyncThunk(
  "prediction/fetchLastPredictions",
  async ({ symbol, timeframe = "24h" }) => {
    try {
      const response = await axios.post("/api/predictions/previous_predictions", {
        symbol: symbol.toUpperCase(),
        timeframe
      })
      return response.data
    } catch (error) {
      throw error.response?.data?.message || "Failed to fetch predictions"
    }
  }
)

// Async thunk for making new predictions
export const PredictNextPrice = createAsyncThunk(
  "prediction/predictNextPrice",
  async ({ symbol, timeframe = "24h" }) => {
    try {
      const response = await axios.post("/api/predictions/predict", {
        symbol: symbol.toUpperCase(),
        timeframe
      })
      return response.data
    } catch (error) {
      throw error.response?.data?.message || "Failed to make prediction"
    }
  }
) 