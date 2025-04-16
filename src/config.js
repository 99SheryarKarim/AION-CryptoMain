// API configuration
export const API_BASE_URL = 'http://localhost:8000' // FastAPI backend runs on port 8000 by default
export const COINCAP_API_BASE_URL = 'https://api.coincap.io/v2'
// For Vite, use import.meta.env and prefix variables with VITE_
export const COINCAP_API_KEY = import.meta.env.VITE_COINCAP_API_KEY || ''

// API endpoints
export const ENDPOINTS = {
  PREDICT: '/api/predictions/predict',
  PREVIOUS_PREDICTIONS: '/api/predictions/previous_predictions',
}

// Time constants
export const RETRY_DELAY = 1000 // 1 second
export const MAX_RETRIES = 3

// CoinCap API rate limit settings
export const RATE_LIMIT_DELAY = 1000 // 1 second delay between requests
export const RATE_LIMIT_RETRIES = 3
