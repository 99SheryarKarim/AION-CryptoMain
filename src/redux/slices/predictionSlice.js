import { createSlice } from "@reduxjs/toolkit"
import { FetchLastPredictions, PredictNextPrice } from "../actions/prediction"

const initialState = {
  predictions: [],
  currentPrediction: null,
  loading: false,
  error: null,
}

const predictionSlice = createSlice({
  name: "prediction",
  initialState,
  reducers: {
    clearPrediction: (state) => {
      state.currentPrediction = null
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Last Predictions
      .addCase(FetchLastPredictions.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(FetchLastPredictions.fulfilled, (state, action) => {
        state.loading = false
        state.predictions = action.payload.data || []
        state.error = null
      })
      .addCase(FetchLastPredictions.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
      // Predict Next Price
      .addCase(PredictNextPrice.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(PredictNextPrice.fulfilled, (state, action) => {
        state.loading = false
        state.currentPrediction = action.payload.data
        if (action.payload.data) {
          state.predictions = [action.payload.data, ...state.predictions]
        }
        state.error = null
      })
      .addCase(PredictNextPrice.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
  },
})

export const { clearPrediction, clearError } = predictionSlice.actions
export default predictionSlice.reducer 