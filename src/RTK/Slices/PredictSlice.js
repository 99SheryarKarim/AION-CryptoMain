import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

// Update the FetchLastPredictions action to accept timeframe
export const FetchLastPredictions = createAsyncThunk(
  "prediction/fetchLastPredictions",
  async (timeframe = "24h", { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/predictions/history?timeframe=${timeframe}`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response.data)
    }
  },
)

// Update the PredictNextPrice action to accept timeframe
export const PredictNextPrice = createAsyncThunk(
  "prediction/predictNextPrice",
  async (timeframe = "24h", { rejectWithValue }) => {
    try {
      const response = await axios.post("/api/predictions/predict", { timeframe })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response.data)
    }
  },
)

const initialState = {
  predicted_next_price: null,
  actuals: [],
  predictions: [],
  loading: false,
  error: null,
}

const PredictSlice = createSlice({
  name: "Prediction",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // FetchLastPredictions cases
      .addCase(FetchLastPredictions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(FetchLastPredictions.fulfilled, (state, action) => {
        state.loading = false
        state.actuals = action.payload.actuals || []
        state.predictions = action.payload.predictions || []
      })
      .addCase(FetchLastPredictions.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || "Failed to fetch prediction history"
      })

      // PredictNextPrice cases
      .addCase(PredictNextPrice.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(PredictNextPrice.fulfilled, (state, action) => {
        state.loading = false
        state.predicted_next_price = action.payload.predicted_price
        // Optionally update actuals and predictions if the API returns them
        if (action.payload.actuals) state.actuals = action.payload.actuals
        if (action.payload.predictions) state.predictions = action.payload.predictions
      })
      .addCase(PredictNextPrice.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || "Failed to predict next price"
      })
  },
})

export default PredictSlice.reducer
