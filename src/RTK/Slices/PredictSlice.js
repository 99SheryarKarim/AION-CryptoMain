import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"
import { API_BASE_URL, ENDPOINTS, RETRY_DELAY, MAX_RETRIES } from "../../config"

// Rate limiting configuration
const MIN_REQUEST_INTERVAL = 1000 // 1 second between requests
let lastRequestTime = 0
const requestQueue = []
let isProcessingQueue = false

// Enhanced retry request with rate limiting
const retryRequest = async (requestFn, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  const processRequest = async () => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
    }

    lastRequestTime = Date.now()
    return await requestFn()
  }

  for (let i = 0; i < retries; i++) {
    try {
      return await processRequest()
    } catch (error) {
      if (error.response?.status === 429) {
        // If rate limited, wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
        continue
      }
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// Update the FetchLastPredictions action to accept both symbol and timeframe
export const FetchLastPredictions = createAsyncThunk(
  "prediction/fetchLastPredictions",
  async ({ symbol, timeframe = "24h" }, { rejectWithValue }) => {
    try {
      const response = await retryRequest(() => 
        axios.post(`${API_BASE_URL}${ENDPOINTS.PREVIOUS_PREDICTIONS}`, { 
          symbol: symbol.toUpperCase(),
          timeframe 
        })
      )
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch predictions")
    }
  }
)

// Update the PredictNextPrice action to accept both symbol and timeframe
export const PredictNextPrice = createAsyncThunk(
  "prediction/predictNextPrice",
  async ({ symbol, timeframe = "24h" }, { rejectWithValue }) => {
    try {
      const response = await retryRequest(() => 
        axios.post(`${API_BASE_URL}${ENDPOINTS.PREDICT}`, { 
          symbol: symbol.toUpperCase(),
          timeframe 
        })
      )
      return response.data
    } catch (error) {
      if (error.response?.status === 429) {
        return rejectWithValue("Rate limit exceeded. Please wait a moment and try again.")
      }
      return rejectWithValue(error.response?.data?.message || "Failed to predict next price")
    }
  }
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
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
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
        state.error = null
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
        if (action.payload.actuals) state.actuals = action.payload.actuals
        if (action.payload.predictions) state.predictions = action.payload.predictions
        state.error = null
      })
      .addCase(PredictNextPrice.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || "Failed to predict next price"
      })
  },
})

export const { clearError } = PredictSlice.actions
export default PredictSlice.reducer
