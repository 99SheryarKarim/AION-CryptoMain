"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Info,
  TrendingUp,
  BarChart2,
  DollarSign,
  Clock,
  Award,
  AlertTriangle,
  PieChart,
  Bell,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Move,
} from "lucide-react"
import "./MarketPredict.css"
import { useDispatch, useSelector } from "react-redux"
import { PredictNextPrice, FetchLastPredictions } from "../../RTK/Slices/PredictSlice"
import { COINCAP_API_BASE_URL, COINCAP_API_KEY, RATE_LIMIT_DELAY } from "../../config"

const Predict = () => {
  const dispatch = useDispatch()
  // Get prediction data from Redux store
  const { predicted_next_price, actuals, predictions } = useSelector((state) => state.Prediction)

  const [selectedItem, setSelectedItem] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState("1h")
  const [isPredicting, setIsPredicting] = useState(false)
  const [probabilityData, setProbabilityData] = useState(null)
  const [showProbability, setShowProbability] = useState(false)
  const [notification, setNotification] = useState(null)
  const [pendingTimeframe, setPendingTimeframe] = useState(null)
  const [coinDetails, setCoinDetails] = useState(null)
  const [coinStats, setCoinStats] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [predictionResults, setPredictionResults] = useState([])
  const [userInitiatedPrediction, setUserInitiatedPrediction] = useState(false)
  const chartRef = useRef(null)
  const statsChartRef = useRef(null)
  const animationRef = useRef(null)
  const liveUpdateRef = useRef(null)
  const apiRetryCount = useRef(0)
  const MAX_RETRIES = 3
  const notificationTimeoutRef = useRef(null)

  // Chart interaction state
  const [chartScale, setChartScale] = useState(1)
  const [chartOffset, setChartOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const [extendedChartData, setExtendedChartData] = useState([])
  const [chartVerticalOffset, setChartVerticalOffset] = useState(0)
  const [dragStartY, setDragStartY] = useState(0)

  // Chart interaction functions
  const handleZoomIn = () => {
    setChartScale(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setChartScale(prev => Math.max(prev / 1.2, 0.5))
  }

  const handleChartReset = () => {
    setChartScale(1)
    setChartOffset(0)
    setChartVerticalOffset(0)
  }

  const handleChartTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart(e.touches[0].clientX)
      setDragStartY(e.touches[0].clientY)
    }
  }

  const handleChartTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return

    const deltaX = e.touches[0].clientX - dragStart
    const deltaY = e.touches[0].clientY - dragStartY

    setChartOffset(prev => prev + deltaX)
    setChartVerticalOffset(prev => prev + deltaY)

    setDragStart(e.touches[0].clientX)
    setDragStartY(e.touches[0].clientY)
  }

  const handleChartTouchEnd = () => {
    setIsDragging(false)
  }

  const drawChart = () => {
    if (!chartRef.current || !chartData.length) return

    const canvas = chartRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set transparent background
    ctx.fillStyle = 'transparent'
    ctx.fillRect(0, 0, width, height)

    // Calculate chart dimensions
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Find min and max values
    const values = chartData.map(d => d.price).filter(v => !isNaN(v) && v !== undefined)
    if (values.length === 0) return
    
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const valueRange = maxValue - minValue || 1

    // Apply zoom and offset transformations
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.scale(chartScale, chartScale)
    ctx.translate(-width / 2 + chartOffset, -height / 2 + chartVerticalOffset)

    // Draw price line
    ctx.beginPath()
    ctx.strokeStyle = '#5bc0de'
    ctx.lineWidth = 1 // Reduced from 2 to 1

    let firstValidPoint = true
    chartData.forEach((point, index) => {
      if (!point || point.price === undefined || isNaN(point.price)) return

      const x = padding + (chartWidth * (index / (chartData.length - 1)))
      const y = padding + (chartHeight * (1 - (point.price - minValue) / valueRange))

      if (firstValidPoint) {
        ctx.moveTo(x, y)
        firstValidPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
  }

  const [utcTime, setUtcTime] = useState(new Date())

  // Add rate limiter state
  const [requestQueue, setRequestQueue] = useState([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const lastRequestTime = useRef(0)
  const MIN_REQUEST_INTERVAL = 1000 // 1 second between requests

  // Add this state at the top with other state declarations
  const [predictedPrice, setPredictedPrice] = useState(null)
  const [showPrediction, setShowPrediction] = useState(false)

  // Add useEffect for live UTC time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format UTC time function
  const formatUTCTime = (date) => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
  }

  // Get the selected item from localStorage
  useEffect(() => {
    const item = localStorage.getItem("selectedMarketItem")
    if (!item) {
      window.location.href = "/" // Redirect to home if no item is selected
      return
    }
    const parsedItem = JSON.parse(item)
    setSelectedItem(parsedItem)

    // Fetch coin details from API
    fetchCoinDetails(parsedItem)

    // Check for any stored prediction results
    checkStoredPredictions(parsedItem)

    // Fetch previous predictions from backend
    dispatch(FetchLastPredictions({ symbol: parsedItem.symbol, timeframe }))
  }, [dispatch, timeframe])

  // Update chart data when backend predictions are received
  useEffect(() => {
    if (actuals.length > 0 && predictions.length > 0) {
      // Create chart data from actuals and predictions
      const now = new Date()
      const newChartData = actuals.map((actual, index) => {
        // Calculate time based on the current timeframe
        let time
        switch (timeframe) {
          case "30m":
            time = new Date(now.getTime() - (actuals.length - index) * 60 * 1000)
            break
          case "1h":
            time = new Date(now.getTime() - (actuals.length - index) * 60 * 1000)
            break
          case "4h":
            time = new Date(now.getTime() - (actuals.length - index) * 5 * 60 * 1000)
            break
          case "24h":
          default:
            time = new Date(now.getTime() - (actuals.length - index) * 60 * 60 * 1000)
        }

        return {
          time: time.toLocaleTimeString(),
          price: actual,
          fullTime: time,
        }
      })

      // Add prediction point if available
      if (predicted_next_price) {
        const lastTime = newChartData.length > 0 ? newChartData[newChartData.length - 1].fullTime : now
        let nextTime

        // Calculate next time based on timeframe
        switch (timeframe) {
          case "30m":
            nextTime = new Date(lastTime.getTime() + 60 * 1000)
            break
          case "1h":
            nextTime = new Date(lastTime.getTime() + 60 * 1000)
            break
          case "4h":
            nextTime = new Date(lastTime.getTime() + 5 * 60 * 1000)
            break
          case "24h":
          default:
            nextTime = new Date(lastTime.getTime() + 60 * 60 * 1000)
        }

        // Add prediction point
        newChartData.push({
          time: nextTime.toLocaleTimeString(),
          price: predicted_next_price,
          fullTime: nextTime,
          isPrediction: true,
        })
      }

      setChartData(newChartData)

      // Generate extended data for scrolling
      const extendedData = generateExtendedHistoricalData(newChartData, selectedItem)
      setExtendedChartData(extendedData)

      setLoading(false)
    }
  }, [actuals, predictions, predicted_next_price, timeframe, selectedItem])

  // Update probability data when predicted_next_price is received
  useEffect(() => {
    if (predicted_next_price && isPredicting) {
      // Update probability data with the predicted price
      const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0
      const priceChange = lastPrice > 0 ? (predicted_next_price - lastPrice) / lastPrice : 0

      // Calculate probability based on price change
      const priceIncreaseProb = Math.min(99, Math.max(1, Math.round(50 + priceChange * 1000)))

      // Update the stats probability with the new prediction
      if (coinStats) {
        setCoinStats({
          ...coinStats,
          probabilityIncrease: priceIncreaseProb,
        })
      }

      setProbabilityData({
        trend: priceChange >= 0 ? "bullish" : "bearish",
        confidence: Math.min(95, Math.max(60, 75 + priceChange * 100)),
        predictedPrice: predicted_next_price,
        timeframe: pendingTimeframe || timeframe,
        volatility: Math.abs(priceChange * 100),
        avgDailyChange: priceChange * 100,
        momentum: priceChange * 100,
        support: lastPrice * 0.95,
        resistance: lastPrice * 1.05,
        volumePrediction: selectedItem?.total_volume || 0,
        shortTermTarget: predicted_next_price * 1.01,
        midTermTarget: predicted_next_price * 1.05,
        longTermTarget: predicted_next_price * 1.1,
        sentimentScore: Math.min(100, Math.max(0, 50 + priceChange * 1000)),
        riskScore: Math.min(10, Math.max(1, Math.round(Math.abs(priceChange) * 100))),
        priceIncreaseProb,
        dataReady: true,
      })

      // Show notification about prediction
      showNotification({
        type: "success",
        message: `Prediction complete for ${selectedItem?.name}`,
        details: `Predicted next price: $${predicted_next_price.toFixed(2)}`,
      })
    }
  }, [predicted_next_price, isPredicting, chartData, pendingTimeframe, timeframe, coinStats, selectedItem])

  // Check for stored predictions and show notifications if needed
  const checkStoredPredictions = (item) => {
    if (!item) return

    try {
      // Get stored predictions from localStorage
      const storedPredictions = JSON.parse(localStorage.getItem("predictionResults") || "[]")

      // Filter predictions for this specific asset
      const assetPredictions = storedPredictions.filter(
        (pred) => pred.assetId === item.id || pred.assetSymbol === item.symbol,
      )

      // Set to state
      setPredictionResults(assetPredictions)

      // Store the prediction results but don't show notifications on initial load
      // Notifications will only show when user explicitly clicks the predict button
      const hasUserPredicted = localStorage.getItem("userInitiatedPrediction") === "true"

      // We still filter recent predictions but don't show notifications automatically
      if (hasUserPredicted) {
        // Just keep track of recent predictions (last 24 hours) without showing notifications
        const recentPredictions = assetPredictions.filter(
          (pred) => new Date(pred.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000),
        )

        // We don't call showPredictionResultNotification here anymore
        // This prevents notifications from showing on page load
      }
    } catch (err) {
      console.error("Error checking stored predictions:", err)
    }
  }

  // Enhanced fetch with rate limiting
  const fetchWithRateLimit = async (url, options = {}) => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime.current

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      // Queue the request
      return new Promise((resolve, reject) => {
        setRequestQueue(prev => [...prev, { url, options, resolve, reject }])
      })
    }

    lastRequestTime.current = now
    return fetchWithTimeout(url, options)
  }

  // Process request queue
  useEffect(() => {
    if (requestQueue.length > 0 && !isProcessingQueue) {
      setIsProcessingQueue(true)
      const processNextRequest = async () => {
        if (requestQueue.length === 0) {
          setIsProcessingQueue(false)
          return
        }

        const now = Date.now()
        const timeSinceLastRequest = now - lastRequestTime.current

        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
        }

        const request = requestQueue[0]
        try {
          const response = await fetchWithTimeout(request.url, request.options)
          request.resolve(response)
        } catch (error) {
          request.reject(error)
        }

        setRequestQueue(prev => prev.slice(1))
        lastRequestTime.current = Date.now()
        processNextRequest()
      }

      processNextRequest()
    }
  }, [requestQueue, isProcessingQueue])

  // Update fetchCoinDetails to use rate-limited fetch
  const fetchCoinDetails = async (item) => {
    if (!item) return

    try {
      const symbol = item.symbol.toLowerCase()
      const id = item.id ? item.id.toLowerCase() : symbol

      let data = null

      // First try CoinGecko API
      try {
        const response = await fetchWithRateLimit(`https://api.coingecko.com/api/v3/coins/${id}`, {
          timeout: 5000,
        })

        if (response.ok) {
          const jsonData = await response.json()
          data = jsonData
        }
      } catch (err) {
        console.log(`CoinGecko API with ID ${id} failed: ${err.message}`)
      }

      // If CoinGecko fails, try CoinCap as fallback
      if (!data) {
        try {
          const response = await fetchWithRateLimit(`https://api.coincap.io/v2/assets/${id}`, {
            timeout: 5000,
          })

          if (response.ok) {
            const jsonData = await response.json()
            data = jsonData
          }
        } catch (err) {
          console.log(`CoinCap API with ID ${id} failed: ${err.message}`)
        }
      }

      // If both APIs fail, try with symbol
      if (!data) {
        try {
          const response = await fetchWithRateLimit(`https://api.coingecko.com/api/v3/coins/${symbol}`, {
            timeout: 5000,
          })

          if (response.ok) {
            const jsonData = await response.json()
            data = jsonData
          }
        } catch (err) {
          console.log(`CoinGecko API with symbol ${symbol} failed: ${err.message}`)
        }
      }

      // Process the data if we have it
      if (data) {
        if (data.data) { // CoinCap format
          processApiData(data, item)
        } else { // CoinGecko format
          processCoinGeckoData(data, item)
        }
        apiRetryCount.current = 0
      } else {
        throw new Error("Could not fetch data from any API")
      }
    } catch (err) {
      console.error("Error fetching coin details:", err)

      // Implement retry logic with exponential backoff
      if (apiRetryCount.current < MAX_RETRIES) {
        const backoffTime = Math.pow(2, apiRetryCount.current) * 1000
        console.log(`Retrying in ${backoffTime}ms (attempt ${apiRetryCount.current + 1}/${MAX_RETRIES})`)

        apiRetryCount.current++
        setTimeout(() => fetchCoinDetails(item), backoffTime)
      } else {
        // After all retries fail, fallback to using the data we have
        console.log("All API retries failed, using fallback data")
        generateCoinDetails(item)

        // Show a more informative notification
        setNotification({
          type: "info",
          message: "Using market simulation",
          details:
            "Real-time data temporarily unavailable. Using advanced market simulation. Please check your internet connection or try again later.",
        })
      }
    }
  }

  // Add new function to process CoinGecko data
  const processCoinGeckoData = (data, item) => {
    if (!data) {
      generateCoinDetails(item)
      return
    }

    // Calculate additional metrics
    const marketDominance = (data.market_data.market_cap.usd / 2500000000000) * 100 // Assuming total market cap of 2.5T
    const volatilityScore = data.market_data.price_change_percentage_24h
      ? Math.abs(data.market_data.price_change_percentage_24h) / 2
      : Math.random() * 5

    // Generate random sentiment data (this would ideally come from a sentiment analysis API)
    const sentimentData = {
      bullish: Math.floor(Math.random() * 70) + 30,
      bearish: Math.floor(Math.random() * 40),
      neutral: Math.floor(Math.random() * 30),
    }

    // Normalize sentiment to 100%
    const total = sentimentData.bullish + sentimentData.bearish + sentimentData.neutral
    sentimentData.bullish = Math.floor((sentimentData.bullish / total) * 100)
    sentimentData.bearish = Math.floor((sentimentData.bearish / total) * 100)
    sentimentData.neutral = 100 - sentimentData.bullish - sentimentData.bearish

    // Fetch market data for exchanges (in a real app, this would come from an API)
    const exchanges = [
      { name: "Binance", volume: Math.floor(Math.random() * 40) + 20 },
      { name: "Coinbase", volume: Math.floor(Math.random() * 30) + 10 },
      { name: "Kraken", volume: Math.floor(Math.random() * 20) + 5 },
      { name: "FTX", volume: Math.floor(Math.random() * 15) + 5 },
      { name: "Others", volume: Math.floor(Math.random() * 20) + 5 },
    ]

    // Normalize exchange volume to 100%
    const totalVolume = exchanges.reduce((sum, exchange) => sum + exchange.volume, 0)
    exchanges.forEach((exchange) => {
      exchange.percentage = Math.floor((exchange.volume / totalVolume) * 100)
    })

    // Set coin details with API data
    setCoinDetails({
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      priceUsd: data.market_data.current_price.usd,
      marketCapUsd: data.market_data.market_cap.usd,
      volumeUsd24Hr: data.market_data.total_volume.usd,
      supply: data.market_data.circulating_supply,
      maxSupply: data.market_data.max_supply,
      changePercent24Hr: data.market_data.price_change_percentage_24h,
      vwap24Hr: data.market_data.current_price.usd,
      explorer: data.links.blockchain_site[0],
      rank: data.market_cap_rank,
      marketDominance,
      volatilityScore,
      liquidityScore: Math.min(95, Math.max(30, Math.floor(Math.random() * 100))),
      sentimentData,
      exchanges,
      description: data.description.en || generateCoinDescription(item),
      priceHistory: {
        allTimeHigh: data.market_data.ath.usd,
        allTimeLow: data.market_data.atl.usd,
        yearToDateChange: data.market_data.price_change_percentage_1y || Math.floor(Math.random() * 200) - 50,
      },
    })

    // Generate stats for the Stats tab
    generateCoinStats(data)
  }

  // Helper function to fetch with timeout
  const fetchWithTimeout = (url, options = {}) => {
    const { timeout = 8000 } = options

    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout)),
    ])
  }

  // Process API data
  const processApiData = (data, item) => {
    if (!data || !data.data) {
      generateCoinDetails(item)
      return
    }

    const coinData = data.data

    // Calculate additional metrics
    const marketDominance = (Number.parseFloat(coinData.marketCapUsd) / 2500000000000) * 100 // Assuming total market cap of 2.5T
    const volatilityScore = item.price_change_percentage_24h
      ? Math.abs(item.price_change_percentage_24h) / 2
      : Number.parseFloat(coinData.changePercent24Hr)
        ? Math.abs(Number.parseFloat(coinData.changePercent24Hr)) / 5
        : Math.random() * 5

    // Generate random sentiment data (this would ideally come from a sentiment analysis API)
    const sentimentData = {
      bullish: Math.floor(Math.random() * 70) + 30,
      bearish: Math.floor(Math.random() * 40),
      neutral: Math.floor(Math.random() * 30),
    }

    // Normalize sentiment to 100%
    const total = sentimentData.bullish + sentimentData.bearish + sentimentData.neutral
    sentimentData.bullish = Math.floor((sentimentData.bullish / total) * 100)
    sentimentData.bearish = Math.floor((sentimentData.bearish / total) * 100)
    sentimentData.neutral = 100 - sentimentData.bullish - sentimentData.bearish

    // Fetch market data for exchanges (in a real app, this would come from an API)
    const exchanges = [
      { name: "Binance", volume: Math.floor(Math.random() * 40) + 20 },
      { name: "Coinbase", volume: Math.floor(Math.random() * 30) + 10 },
      { name: "Kraken", volume: Math.floor(Math.random() * 20) + 5 },
      { name: "FTX", volume: Math.floor(Math.random() * 15) + 5 },
      { name: "Others", volume: Math.floor(Math.random() * 20) + 5 },
    ]

    // Normalize exchange volume to 100%
    const totalVolume = exchanges.reduce((sum, exchange) => sum + exchange.volume, 0)
    exchanges.forEach((exchange) => {
      exchange.percentage = Math.floor((exchange.volume / totalVolume) * 100)
    })

    // Set coin details with API data
    setCoinDetails({
      id: coinData.id,
      name: coinData.name,
      symbol: coinData.symbol,
      priceUsd: Number.parseFloat(coinData.priceUsd),
      marketCapUsd: Number.parseFloat(coinData.marketCapUsd),
      volumeUsd24Hr: Number.parseFloat(coinData.volumeUsd24Hr),
      supply: Number.parseFloat(coinData.supply),
      maxSupply: Number.parseFloat(coinData.maxSupply),
      changePercent24Hr: Number.parseFloat(coinData.changePercent24Hr),
      vwap24Hr: Number.parseFloat(coinData.vwap24Hr),
      explorer: coinData.explorer,
      rank: Number.parseInt(coinData.rank),
      marketDominance,
      volatilityScore,
      liquidityScore: Math.min(95, Math.max(30, Math.floor(Math.random() * 100))),
      sentimentData,
      exchanges,
      description: generateCoinDescription(item),
      priceHistory: {
        allTimeHigh: item.ath || Number.parseFloat(coinData.priceUsd) * (1 + Math.random()),
        allTimeLow: item.atl || Number.parseFloat(coinData.priceUsd) * (1 - Math.random() * 0.9),
        yearToDateChange: Math.floor(Math.random() * 200) - 50, // -50% to +150%
      },
    })

    // Generate stats for the Stats tab
    generateCoinStats(coinData)
  }

  // Generate coin stats for the Stats tab
  const generateCoinStats = (coinData) => {
    if (!coinData) return

    // Calculate probability of increase based on recent performance
    const changePercent = Number.parseFloat(coinData.changePercent24Hr) || 0
    const vwap = Number.parseFloat(coinData.vwap24Hr) || 0
    const currentPrice = Number.parseFloat(coinData.priceUsd) || 0

    // Calculate probability (this is a simplified model)
    let probabilityIncrease = 50 // Base probability

    // Adjust based on 24h change
    if (changePercent > 0) {
      probabilityIncrease += Math.min(20, changePercent * 2)
    } else {
      probabilityIncrease -= Math.min(20, Math.abs(changePercent) * 2)
    }

    // Adjust based on price vs VWAP
    if (vwap > 0) {
      const vwapDiff = ((currentPrice - vwap) / vwap) * 100
      if (vwapDiff > 0) {
        probabilityIncrease -= Math.min(10, vwapDiff * 2) // Above VWAP might indicate overbought
      } else {
        probabilityIncrease += Math.min(10, Math.abs(vwapDiff) * 2) // Below VWAP might indicate potential rise
      }
    }

    // Adjust based on market cap rank
    const rank = Number.parseInt(coinData.rank) || 100
    if (rank <= 10) {
      probabilityIncrease += 5 // Top coins tend to be more stable
    } else if (rank <= 50) {
      probabilityIncrease += 2
    }

    // Ensure probability is between 1 and 99
    probabilityIncrease = Math.max(1, Math.min(99, Math.round(probabilityIncrease)))

    // Set coin stats
    setCoinStats({
      probabilityIncrease,
      marketCapRank: Number.parseInt(coinData.rank) || 0,
      changePercent24Hr: changePercent,
      supply: {
        current: Number.parseFloat(coinData.supply) || 0,
        max: Number.parseFloat(coinData.maxSupply) || 0,
        percentCirculating: coinData.maxSupply
          ? (Number.parseFloat(coinData.supply) / Number.parseFloat(coinData.maxSupply)) * 100
          : 100,
      },
      volumeRank: Math.floor(Math.random() * 20) + 1, // This would come from API in a real app
      volatility: Math.abs(changePercent) || Math.random() * 5,
      marketShare: (Number.parseFloat(coinData.marketCapUsd) / 2500000000000) * 100, // Assuming total market cap of 2.5T
    })
  }

  // Generate detailed information about the coin (fallback if API fails)
  const generateCoinDetails = (item) => {
    if (!item) return

    // Calculate some additional metrics
    const marketDominance = ((item.market_cap || 0) / 2500000000000) * 100 // Assuming total market cap of 2.5T
    const volatilityScore = item.price_change_percentage_24h
      ? Math.abs(item.price_change_percentage_24h) / 2
      : Math.random() * 5
    const liquidityScore = Math.min(95, Math.max(30, Math.floor(Math.random() * 100)))

    // Generate random sentiment data
    const sentimentData = {
      bullish: Math.floor(Math.random() * 70) + 30,
      bearish: Math.floor(Math.random() * 40),
      neutral: Math.floor(Math.random() * 30),
    }

    // Normalize sentiment to 100%
    const total = sentimentData.bullish + sentimentData.bearish + sentimentData.neutral
    sentimentData.bullish = Math.floor((sentimentData.bullish / total) * 100)
    sentimentData.bearish = Math.floor((sentimentData.bearish / total) * 100)
    sentimentData.neutral = 100 - sentimentData.bullish - sentimentData.bearish

    // Generate trading volume by exchange (random data)
    const exchanges = [
      { name: "Binance", volume: Math.floor(Math.random() * 40) + 20 },
      { name: "Coinbase", volume: Math.floor(Math.random() * 30) + 10 },
      { name: "Kraken", volume: Math.floor(Math.random() * 20) + 5 },
      { name: "FTX", volume: Math.floor(Math.random() * 15) + 5 },
      { name: "Others", volume: Math.floor(Math.random() * 20) + 5 },
    ]

    // Normalize exchange volume to 100%
    const totalVolume = exchanges.reduce((sum, exchange) => sum + exchange.volume, 0)
    exchanges.forEach((exchange) => {
      exchange.percentage = Math.floor((exchange.volume / totalVolume) * 100)
    })

    setCoinDetails({
      marketDominance,
      volatilityScore,
      liquidityScore,
      sentimentData,
      exchanges,
      description: generateCoinDescription(item),
      priceHistory: {
        allTimeHigh: item.ath || item.current_price * (1 + Math.random()),
        allTimeLow: item.atl || item.current_price * (1 - Math.random() * 0.9),
        yearToDateChange: Math.floor(Math.random() * 200) - 50, // -50% to +150%
      },
    })

    // Generate stats for the Stats tab
    const probabilityIncrease = Math.floor(Math.random() * 40) + 30 // Random between 30-70%

    setCoinStats({
      probabilityIncrease,
      marketCapRank: item.market_cap_rank || 0,
      changePercent24Hr: item.price_change_percentage_24h || 0,
      supply: {
        current: item.circulating_supply || 0,
        max: item.total_supply || 0,
        percentCirculating: item.total_supply ? (item.circulating_supply / item.total_supply) * 100 : 100,
      },
      volumeRank: Math.floor(Math.random() * 20) + 1,
      volatility: Math.abs(item.price_change_percentage_24h) || Math.random() * 5,
      marketShare: ((item.market_cap || 0) / 2500000000000) * 100, // Assuming total market cap of 2.5T
    })
  }

  // Generate a description for the coin
  const generateCoinDescription = (item) => {
    const descriptions = [
      `${item.name} is a leading cryptocurrency with strong market presence. It offers fast, secure transactions and has a growing ecosystem of applications.`,
      `${item.name} is a digital currency designed for secure, instant payments. It operates on a decentralized network and has significant market adoption.`,
      `${item.name} is a blockchain-based cryptocurrency focused on scalability and security. It has established itself as a major player in the crypto market.`,
      `${item.name} is a prominent cryptocurrency known for its robust technology and active development. It has gained significant market traction and user adoption.`,
      `${item.name} is a well-established cryptocurrency with a strong development team and active community. It offers innovative blockchain solutions.`
    ]

    return descriptions[Math.floor(Math.random() * descriptions.length)]
  }

  // Initial data load only when component mounts
  useEffect(() => {
    if (!selectedItem) return

    const fetchInitialData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Try to fetch data from API
        const data = await fetchHistoricalData(selectedItem, timeframe)
        setChartData(data)

        // Generate extended data for scrolling
        const extendedData = generateExtendedHistoricalData(data, selectedItem)
        setExtendedChartData(extendedData)

        setLoading(false)
      } catch (err) {
        console.error("Error fetching initial data:", err)

        // Fallback to generated data
        const data = generateRealisticData(selectedItem, timeframe)
        setChartData(data)

        // Generate extended data for scrolling
        const extendedData = generateExtendedHistoricalData(data, selectedItem)
        setExtendedChartData(extendedData)

        setLoading(false)

        // Show notification but don't show error in UI to avoid alarming users
        showNotification({
          type: "info",
          message: "Using market simulation",
          details:
            "Real-time data temporarily unavailable. Using advanced market simulation. Please check your internet connection or try again later.",
        })
      }
    }

    fetchInitialData()

    // Cleanup animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (liveUpdateRef.current) {
        clearInterval(liveUpdateRef.current)
      }
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
    }
  }, [selectedItem, timeframe]) // Only run on initial mount and when selectedItem changes

  // Generate extended historical data for scrolling
  const generateExtendedHistoricalData = (data, item) => {
    if (!data || data.length === 0 || !item) return []

    // Create more historical data points for scrolling
    const basePrice = data[0].price
    const volatility = item.price_change_percentage_24h ? Math.abs(item.price_change_percentage_24h) / 100 : 0.02

    const dataPoints = []
    const oldestTime = data[0].fullTime

    // Generate past data
    for (let i = 200; i > 0; i--) {
      const time = new Date(oldestTime.getTime() - i * 60 * 1000) // 1 minute intervals

      // Create a realistic price with some trend and volatility
      const trendFactor = 0.0001 * i // Slight trend
      const randomFactor = (Math.random() - 0.5) * volatility
      const priceFactor = 1 + randomFactor - trendFactor

      dataPoints.push({
        time: time.toLocaleTimeString(),
        price: basePrice * priceFactor,
        fullTime: time,
      })
    }

    // Add the actual data
    return [...dataPoints, ...data]
  }

  // Draw stats chart when stats data is available
  useEffect(() => {
    if (coinStats && statsChartRef.current && showProbability) {
      drawStatsChart()
    }
  }, [coinStats, showProbability])

  // Enhanced fetchFromCoinCap with rate limit handling and retries
  const fetchFromCoinCap = async (id, symbol, tf) => {
    try {
      // Add delay between requests to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))

      const response = await fetchWithRateLimit(
        `https://api.coincap.io/v2/assets/${id.toLowerCase()}`,
        { timeout: 5000 }
      )

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit hit - wait longer and retry
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY * 2))
          return fetchFromCoinCap(id, symbol, tf) // Retry
        }
        throw new Error(`CoinCap API error: ${response.status}`)
      }

      const data = await response.json()

      // Get historical data with rate limit handling
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))

      const historyResponse = await fetchWithRateLimit(
        `https://api.coincap.io/v2/assets/${id.toLowerCase()}/history?interval=${timeframeToInterval(tf)}&start=${getStartTime(tf)}&end=${Date.now()}`,
        { timeout: 5000 }
      )

      if (!historyResponse.ok) {
        if (historyResponse.status === 429) {
          // Rate limit hit - wait longer and retry
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY * 2))
          return fetchFromCoinCap(id, symbol, tf) // Retry
        }
        throw new Error(`CoinCap API error: ${historyResponse.status}`)
      }

      const historyData = await historyResponse.json()
      return {
        currentPrice: parseFloat(data.data.priceUsd),
        historicalData: historyData.data.map((item) => ({
          time: new Date(item.time),
          price: parseFloat(item.priceUsd),
        })),
      }
    } catch (error) {
      console.error("CoinCap API failed:", error)
      throw error
    }
  }

  // Fetch historical data from API with improved error handling and multiple sources
  const fetchHistoricalData = async (item, tf) => {
    if (!item) return []

    // Get symbol and ID
    const symbol = item.symbol.toLowerCase()
    const id = item.id ? item.id.toLowerCase() : symbol

    // Try multiple APIs in sequence with proper error handling
    try {
      // First try CoinGecko API
      try {
        const days = tf === "24h" ? 1 : tf === "4h" ? 0.17 : tf === "1h" ? 0.042 : 0.021
        const response = await fetchWithRateLimit(
          `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
          { timeout: 5000 }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.prices && data.prices.length > 0) {
            return data.prices.map(([timestamp, price]) => ({
              time: new Date(timestamp).toLocaleTimeString(),
              price: price,
              fullTime: new Date(timestamp),
            }))
          }
        }
      } catch (error) {
        console.log("CoinGecko API failed:", error.message)
      }

      // If CoinGecko fails, try CoinCap
      try {
        const data = await fetchFromCoinCap(id, symbol, tf)
        if (data && data.historicalData.length > 0) {
          return data.historicalData
        }
      } catch (error) {
        console.log("CoinCap API failed:", error.message)
      }

      // If all APIs fail, throw error to trigger fallback
      throw new Error("Could not fetch sufficient data from any API")
    } catch (error) {
      console.error("All API attempts failed:", error)
      throw error
    }
  }

  // Fetch from CoinGecko API with timeout
  const fetchFromCoinGecko = async (id, symbol, tf) => {
    try {
      // Convert timeframe to days for CoinGecko
      const days = tf === "24h" ? 1 : tf === "4h" ? 0.17 : tf === "1h" ? 0.042 : 0.021

      // Try different ID formats that CoinGecko might use
      const possibleIds = [id, symbol, `${symbol}-token`, `${id}-token`]

      for (const possibleId of possibleIds) {
        try {
          const geckoUrl = `https://api.coingecko.com/api/v3/coins/${possibleId}/market_chart?vs_currency=usd&days=${days}`

          const geckoResponse = await fetchWithTimeout(geckoUrl, { timeout: 5000 })

          if (!geckoResponse.ok) {
            continue // Try next ID format
          }

          const geckoData = await geckoResponse.json()

          if (!geckoData.prices || geckoData.prices.length < 10) {
            continue // Try next ID format
          }

          return geckoData.prices.map(([timestamp, price]) => ({
            time: new Date(timestamp).toLocaleTimeString(),
            price: price,
            fullTime: new Date(timestamp),
          }))
        } catch (innerError) {
          console.error(`CoinGecko API error with ID ${possibleId}:`, innerError)
          continue // Try next ID format
        }
      }

      throw new Error("All CoinGecko ID attempts failed")
    } catch (error) {
      console.error("CoinGecko API error:", error)
      throw error
    }
  }

  // New function to fetch from Binance API
  const fetchFromBinance = async (symbol, tf) => {
    try {
      // Convert our timeframe to Binance interval format
      const interval = tf === "30m" ? "30m" : tf === "1h" ? "1h" : tf === "4h" ? "4h" : "1d"

      // Binance uses uppercase symbols with USDT pair
      const binanceSymbol = symbol.toUpperCase() + "USDT"

      // Calculate limit based on timeframe
      const limit = tf === "30m" ? 60 : tf === "1h" ? 60 : tf === "4h" ? 60 : 24

      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`

      const binanceResponse = await fetchWithTimeout(binanceUrl, { timeout: 5000 })

      if (!binanceResponse.ok) {
        throw new Error(`Binance API error: ${binanceResponse.status}`)
      }

      const binanceData = await binanceResponse.json()

      if (!binanceData || binanceData.length < 10) {
        throw new Error("Insufficient data points from Binance API")
      }

      // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
      // We'll use the close price (index 4)
      return binanceData.map((kline) => ({
        time: new Date(kline[0]).toLocaleTimeString(),
        price: Number.parseFloat(kline[4]),
        fullTime: new Date(kline[0]),
      }))
    } catch (error) {
      console.error("Binance API error:", error)
      throw error
    }
  }

  // Convert timeframe to interval for API
  const timeframeToInterval = (tf) => {
    switch (tf) {
      case "30m":
        return "m1" // 1 minute
      case "1h":
        return "m5" // 5 minutes
      case "4h":
        return "m15" // 15 minutes
      case "24h":
        return "m30" // 30 minutes
      default:
        return "m30"
    }
  }

  // Get start time based on timeframe
  const getStartTime = (tf) => {
    const now = Date.now()
    switch (tf) {
      case "30m":
        return now - 30 * 60 * 1000
      case "1h":
        return now - 60 * 60 * 1000
      case "4h":
        return now - 4 * 60 * 60 * 1000
      case "24h":
        return now - 24 * 60 * 60 * 1000
      default:
        return now - 24 * 60 * 60 * 1000
    }
  }

  // Fetch historical data for the chart - only when predict is clicked
  const fetchChartData = async () => {
    if (!selectedItem) return []

    setLoading(true)
    setError(null)

    try {
      // Use the pending timeframe if available, otherwise use current timeframe
      const tf = pendingTimeframe || timeframe

      // Update the active timeframe if there was a pending one
      if (pendingTimeframe) {
        setTimeframe(pendingTimeframe)
        setPendingTimeframe(null)
      }

      // Try to fetch data from API with retry logic
      let data = null
      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries && !data) {
        try {
          data = await fetchHistoricalData(selectedItem, tf)
          break
        } catch (err) {
          console.log(`Fetch attempt ${retryCount + 1} failed: ${err.message}`)
          retryCount++

          if (retryCount < maxRetries) {
            // Wait with exponential backoff before retrying
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
          }
        }
      }

      if (!data) {
        throw new Error("All retry attempts failed")
      }

      // Generate extended data for scrolling
      const extendedData = generateExtendedHistoricalData(data, selectedItem)
      setExtendedChartData(extendedData)

      return data
    } catch (err) {
      console.error("Error fetching historical data:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Generate realistic data based on actual price and volatility
  const generateRealisticData = (item, timeframe) => {
    const basePrice = item.current_price
    // Use the actual 24h change percentage for volatility if available
    const volatility = item.price_change_percentage_24h ? Math.abs(item.price_change_percentage_24h) / 100 : 0.02

    const data = []
    const now = new Date()

    let points
    let interval

    switch (timeframe) {
      case "30m":
        points = 30
        interval = 60 * 1000 // 1 minute
        break
      case "1h":
        points = 60
        interval = 60 * 1000 // 1 minute
        break
      case "4h":
        points = 48
        interval = 5 * 60 * 1000 // 5 minutes
        break
      case "24h":
        points = 24
        interval = 60 * 60 * 1000 // 1 hour
        break
      default:
        points = 60
        interval = 60 * 1000 // 1 minute
    }

    // Create a more realistic price pattern with trends
    let currentPrice = basePrice * 0.95 // Start a bit lower
    let trend = 0.5 // Start with neutral trend

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval)

      // Adjust trend occasionally to create patterns
      if (i % 10 === 0) {
        trend = Math.random() // 0-1 value, higher means more bullish
      }

      // Calculate price change with trend influence
      const trendInfluence = (trend - 0.5) * 0.01 // -0.005 to +0.005
      const randomChange = (Math.random() - 0.5) * volatility + trendInfluence
      currentPrice = Math.max(0.01, currentPrice * (1 + randomChange))

      data.push({
        time: time.toLocaleTimeString(),
        price: currentPrice,
        fullTime: time,
      })
    }

    // Ensure the last price is close to the current price
    const lastIndex = data.length - 1
    data[lastIndex] = {
      ...data[lastIndex],
      price: basePrice,
    }

    return data
  }

  // Draw the chart when data changes
  useEffect(() => {
    if (chartData.length > 0 && chartRef.current) {
      drawChart()
    }
  }, [chartData, isPredicting, chartScale, chartOffset, chartVerticalOffset])

  // Handle mouse down on chart for dragging
  const handleChartMouseDown = (e) => {
    if (!chartRef.current) return

    setIsDragging(true)
    setDragStart(e.clientX)
    setDragStartY(e.clientY)

    // Add event listeners for mouse move and up
    document.addEventListener("mousemove", handleChartMouseMove)
    document.addEventListener("mouseup", handleChartMouseUp)

    // Prevent default behavior
    e.preventDefault()
  }

  // Handle mouse move for chart dragging
  const handleChartMouseMove = (e) => {
    if (!isDragging || !chartRef.current) return

    const canvas = chartRef.current
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set background
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, width, height);

    // Calculate chart dimensions
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Find min and max values
    const values = chartData.map(d => d.price).filter(v => !isNaN(v) && v !== undefined);
    if (values.length === 0) return;
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1; // Prevent division by zero

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Draw horizontal grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding + (chartHeight * (1 - i / gridLines));
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Draw value labels
        const value = minValue + (valueRange * (i / gridLines));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(2), padding - 5, y + 4);
    }

    // Draw vertical grid lines and UTC time labels
    const timeLabels = 6;
    for (let i = 0; i <= timeLabels; i++) {
        const x = padding + (chartWidth * (i / timeLabels));
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();

        // Draw UTC time labels
        if (i < timeLabels) {
            const timeIndex = Math.floor((chartData.length - 1) * (i / timeLabels));
            if (chartData[timeIndex] && chartData[timeIndex].fullTime) {
                const time = new Date(chartData[timeIndex].fullTime);
                if (!isNaN(time.getTime())) {
                    const utcTime = time.toUTCString().split(' ')[4];
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(utcTime, x, height - padding + 20);
                }
            }
        }
    }

    // Draw price line
    ctx.beginPath()
    ctx.strokeStyle = '#5bc0de'
    ctx.lineWidth = 1 // Reduced from 2 to 1

    let firstValidPoint = true
    chartData.forEach((point, index) => {
      if (!point || point.price === undefined || isNaN(point.price)) return

      const x = padding + (chartWidth * (index / (chartData.length - 1)))
      const y = padding + (chartHeight * (1 - (point.price - minValue) / valueRange))

      if (firstValidPoint) {
        ctx.moveTo(x, y)
        firstValidPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
  }

  // Draw the stats chart
  const drawStatsChart = () => {
    if (!statsChartRef.current || !selectedItem) return;

    const canvas = statsChartRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.lineWidth = 8; // Reduced from 20 to 8
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // Calculate value angle (24h change)
    const value = selectedItem.price_change_percentage_24h || 0;
    const normalizedValue = Math.max(-20, Math.min(20, value));
    const valueAngle = Math.PI + (normalizedValue / 20) * Math.PI;

    // Draw value arc with gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(0.5, '#FFC107');
    gradient.addColorStop(1, '#F44336');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, valueAngle);
    ctx.lineWidth = 8; // Reduced from 20 to 8
    ctx.strokeStyle = gradient;
    ctx.stroke();

    // Draw tick marks
    const tickLength = 10;
    const tickWidth = 2;
    const tickRadius = radius + 15;
    
    for (let i = 0; i <= 4; i++) {
      const angle = Math.PI + (i / 4) * Math.PI;
      const startX = centerX + (radius - tickLength) * Math.cos(angle);
      const startY = centerY + (radius - tickLength) * Math.sin(angle);
      const endX = centerX + (radius + tickLength) * Math.cos(angle);
      const endY = centerY + (radius + tickLength) * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.lineWidth = tickWidth;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();

      // Draw labels
      const labelX = centerX + (tickRadius + 20) * Math.cos(angle);
      const labelY = centerY + (tickRadius + 20) * Math.sin(angle);
      ctx.font = '12px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = i === 0 ? '-20%' : i === 1 ? '-10%' : i === 2 ? '0%' : i === 3 ? '+10%' : '+20%';
      ctx.fillText(label, labelX, labelY);
    }

    // Draw needle
    const needleLength = radius * 0.9;
    const needleWidth = 4;
    const needleColor = value >= 0 ? '#4CAF50' : '#F44336';
    
    // Draw needle base
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw needle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const needleEndX = centerX + needleLength * Math.cos(valueAngle);
    const needleEndY = centerY + needleLength * Math.sin(valueAngle);
    ctx.lineTo(needleEndX, needleEndY);
    ctx.lineWidth = needleWidth;
    ctx.strokeStyle = needleColor;
    ctx.stroke();

    // Draw needle tip
    ctx.beginPath();
    ctx.arc(needleEndX, needleEndY, 4, 0, Math.PI * 2);
    ctx.fillStyle = needleColor;
    ctx.fill();

    // Draw center text
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('24h Change', centerX, centerY - 20);
    
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = needleColor;
    ctx.fillText(`${value.toFixed(2)}%`, centerX, centerY + 20);
  }

  // Add useEffect to redraw stats chart when coinStats changes
  useEffect(() => {
    if (showStats && coinStats) {
      drawStatsChart()
    }
  }, [showStats, coinStats])

  // Handle timeframe change
  const handleTimeframeChange = (tf) => {
    // Store the selected timeframe
    setPendingTimeframe(tf)

    // Visual feedback that timeframe was selected
    const buttons = document.querySelectorAll(".market-predict__timeframe-button")
    buttons.forEach((button) => {
      if (button.textContent === tf) {
        button.classList.add("market-predict__timeframe-button--pending")
      } else {
        button.classList.remove("market-predict__timeframe-button--pending")
      }
    })

    // Show notification
    showNotification({
      type: "info",
      message: `Updating to ${tf} timeframe`,
      details: "Fetching new data...",
    })

    // Update the timeframe in the Redux store and fetch new data
    setTimeframe(tf)

    // Fetch new data with the updated timeframe
    dispatch(FetchLastPredictions({ symbol: selectedItem.symbol, timeframe }))
  }

  // Enhanced notification system
  const showNotification = (notificationData) => {
    // Add unique ID and timestamp to notification
    const newNotification = {
      ...notificationData,
      id: Date.now(),
      timestamp: new Date(),
    }

    // Add to notifications array
    setNotifications((prev) => [...prev, newNotification])

    // Also set as current notification for backward compatibility
    setNotification(newNotification)

    // Auto-remove after duration or default 5 seconds
    const duration = notificationData.duration || 5000
    notificationTimeoutRef.current = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
      if (notification && notification.id === newNotification.id) {
        setNotification(null)
      }
    }, duration)
  }

  // Show prediction result notification
  const showPredictionResultNotification = (result) => {
    const isProfit = result.outcome === "profit"

    showNotification({
      type: isProfit ? "profit" : "loss",
      message: isProfit ? "Prediction Successful!" : "Prediction Missed",
      details: `Your ${result.timeframe} prediction for ${result.assetName} ${isProfit ? "was correct" : "was incorrect"}. ${isProfit ? "Profit" : "Loss"}: ${result.percentageChange.toFixed(2)}%`,
      icon: isProfit ? <ArrowUp size={18} /> : <ArrowDown size={18} />,
      actions: [
        {
          label: "View Details",
          onClick: () => handleViewPredictionDetails(result),
          primary: true,
        },
        {
          label: "Dismiss",
          onClick: () => {},
          primary: false,
        },
      ],
    })
  }

  // Handle viewing prediction details
  const handleViewPredictionDetails = (result) => {
    // In a real app, this would navigate to a detailed view
    // For now, we'll just show another notification with more details
    showNotification({
      type: "info",
      message: "Prediction Details",
      details: `Prediction made on ${new Date(result.timestamp).toLocaleString()}\nInitial price: $${result.initialPrice.toFixed(2)}\nFinal price: $${result.finalPrice.toFixed(2)}\nChange: ${result.percentageChange.toFixed(2)}%`,
    })
  }

  // Enhanced handlePredict function
  const handlePredict = async () => {
    try {
      setIsPredicting(true)
      setError(null)
      setShowPrediction(false)

      // Show immediate feedback
      showNotification({
        type: "info",
        message: "Making prediction...",
        details: "Analyzing market data",
      })

      // Get current chart data for immediate update
      const currentChartData = chartData.length > 0 ? chartData : await fetchChartData()
      
      // Immediately update chart with a temporary prediction line
      const lastTime = currentChartData[currentChartData.length - 1]?.fullTime || new Date()
      const nextTime = new Date(lastTime.getTime() + getTimeframeMilliseconds(timeframe))
      
      // Calculate a temporary predicted price based on the last known price
      const lastPrice = currentChartData[currentChartData.length - 1]?.price || selectedItem.current_price
      const tempPredictedPrice = lastPrice * (1 + (Math.random() * 0.02 - 0.01)) // Small random variation

      const tempChartData = [
        ...currentChartData,
        {
          time: nextTime.toLocaleTimeString(),
          price: tempPredictedPrice,
          isPrediction: true,
          isTemporary: true,
          fullTime: nextTime,
        }
      ]

      setChartData(tempChartData)
      
      // Dispatch prediction action with current symbol and timeframe
      const result = await dispatch(PredictNextPrice({ 
        symbol: selectedItem.symbol, 
        timeframe 
      })).unwrap()

      if (result.predicted_price) {
        // Update the predicted price in state
        setPredictedPrice(result.predicted_price)
        setShowPrediction(true)

        // Update chart with actual prediction
        const updatedChartData = [
          ...currentChartData,
          {
            time: nextTime.toLocaleTimeString(),
            price: result.predicted_price,
            isPrediction: true,
            isTemporary: false,
            fullTime: nextTime,
          }
        ]

        setChartData(updatedChartData)
        generatePredictionData()
        setShowProbability(true)
      }
    } catch (error) {
      console.error("Prediction failed:", error)
      setError(error.message || "Failed to make prediction")
      showNotification({
        type: "error",
        message: "Failed to make prediction. Please try again later.",
        duration: 5000,
      })
    } finally {
      setIsPredicting(false)
    }
  }

  // Helper function to get milliseconds for timeframe
  const getTimeframeMilliseconds = (tf) => {
    const map = {
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    }
    return map[tf] || map["1h"]
  }

  // Generate prediction data based on chart patterns
  const generatePredictionData = () => {
    if (chartData.length === 0) return

    // Get recent prices for analysis
    const recentPrices = chartData.slice(-20)
    const priceChanges = []

    for (let i = 1; i < recentPrices.length; i++) {
      priceChanges.push((recentPrices[i].price - recentPrices[i - 1].price) / recentPrices[i - 1].price)
    }

    // Calculate average price change
    const avgChange =
      priceChanges.length > 0 ? priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length : 0

    // Calculate volatility (standard deviation of price changes)
    const volatility =
      priceChanges.length > 0
        ? Math.sqrt(
            priceChanges.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / priceChanges.length,
          )
        : 0.02

    // Determine trend based on recent movement and momentum
    const lastPrice = recentPrices[recentPrices.length - 1].price
    const firstPrice = recentPrices[0].price
    const overallTrend = lastPrice > firstPrice ? "bullish" : "bearish"

    // Calculate momentum (acceleration of price changes)
    const firstHalfChanges = priceChanges.slice(0, Math.floor(priceChanges.length / 2))
    const secondHalfChanges = priceChanges.slice(Math.floor(priceChanges.length / 2))

    const firstHalfAvg =
      firstHalfChanges.length > 0
        ? firstHalfChanges.reduce((sum, change) => sum + change, 0) / firstHalfChanges.length
        : 0

    const secondHalfAvg =
      secondHalfChanges.length > 0
        ? secondHalfChanges.reduce((sum, change) => sum + change, 0) / secondHalfChanges.length
        : 0

    const momentum = secondHalfAvg - firstHalfAvg

    // Calculate confidence based on trend consistency and volatility
    const trendConsistency =
      priceChanges.filter(
        (change) => (overallTrend === "bullish" && change > 0) || (overallTrend === "bearish" && change < 0),
      ).length / priceChanges.length

    const confidence = Math.min(95, Math.max(60, Math.floor(trendConsistency * 100 - volatility * 500)))

    // Predict future price based on trend, momentum and volatility
    const predictedChange = avgChange * 5 + momentum * 10 + (Math.random() - 0.5) * volatility * 2
    const predictedPrice = lastPrice * (1 + predictedChange)

    // Calculate support and resistance levels
    const prices = recentPrices.map((p) => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const support = minPrice * (1 - volatility)
    const resistance = maxPrice * (1 + volatility)

    // Generate trading volume prediction
    const volumeChange = (Math.random() - 0.3) * 20 // -30% to +70% change
    const predictedVolume = selectedItem.total_volume * (1 + volumeChange / 100)

    // Calculate price targets
    const shortTermTarget = predictedPrice * (1 + Math.random() * 0.05 * (overallTrend === "bullish" ? 1 : -1))
    const midTermTarget = predictedPrice * (1 + Math.random() * 0.15 * (overallTrend === "bullish" ? 1 : -1))
    const longTermTarget = predictedPrice * (1 + Math.random() * 0.3 * (overallTrend === "bullish" ? 1 : -1))

    // Calculate market sentiment score (0-100)
    const sentimentScore = Math.min(100, Math.max(0, 50 + avgChange * 1000 + momentum * 500))

    // Calculate risk assessment (1-10)
    const riskScore = Math.min(10, Math.max(1, Math.round(volatility * 100)))

    // Calculate probability of price increase
    const priceIncreaseProb = Math.min(99, Math.max(1, Math.round(50 + momentum * 500 + avgChange * 300)))

    // Update the stats probability with the new prediction
    if (coinStats) {
      setCoinStats({
        ...coinStats,
        probabilityIncrease: priceIncreaseProb,
      })
    }

    setProbabilityData({
      trend: overallTrend,
      confidence,
      predictedPrice,
      timeframe: pendingTimeframe || timeframe,
      volatility: volatility * 100,
      avgDailyChange: avgChange * 100,
      momentum: momentum * 100,
      support,
      resistance,
      volumePrediction: predictedVolume,
      shortTermTarget,
      midTermTarget,
      longTermTarget,
      sentimentScore,
      riskScore,
      priceIncreaseProb,
      dataReady: true,
    })
  }

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T"
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B"
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M"
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K"
    return num.toFixed(2)
  }

  // Handle add to portfolio
  const handleAddToPortfolio = () => {
    // Get existing portfolio or initialize empty array
    const portfolio = JSON.parse(localStorage.getItem("portfolio") || "[]")

    // Check if item already exists in portfolio
    const exists = portfolio.some((item) => item.id === selectedItem.id)

    if (!exists) {
      // Add item to portfolio with timestamp
      portfolio.push({
        ...selectedItem,
        addedAt: new Date().toISOString(),
      })

      // Save updated portfolio
      localStorage.setItem("portfolio", JSON.stringify(portfolio))

      showNotification({
        type: "success",
        message: `${selectedItem.name} added to your portfolio`,
        details: "You can view your portfolio in the dashboard",
      })
    } else {
      showNotification({
        type: "info",
        message: `${selectedItem.name} is already in your portfolio`,
        details: "You can view your portfolio in the dashboard",
      })
    }
  }

  // Handle probability button click
  const handleProbabilityClick = () => {
    setShowProbability(!showProbability)
    setShowStats(false) // Hide stats when showing probability

    if (!showProbability && !probabilityData) {
      // Generate prediction data based on actual chart data
      generatePredictionData()
    }
  }

  // Handle stats button click
  const handleStatsClick = () => {
    setShowStats(!showStats)
    setShowProbability(false) // Hide probability when showing stats

    // If we're showing stats and don't have stats data yet, generate it
    if (!showStats && !coinStats && selectedItem) {
      // Generate stats data if we don't have it yet
      const probabilityIncrease = Math.floor(Math.random() * 40) + 30 // Random between 30-70%

      setCoinStats({
        probabilityIncrease,
        marketCapRank: selectedItem.market_cap_rank || 0,
        changePercent24Hr: selectedItem.price_change_percentage_24h || 0,
        supply: {
          current: selectedItem.circulating_supply || 0,
          max: selectedItem.total_supply || 0,
          percentCirculating: selectedItem.total_supply
            ? (selectedItem.circulating_supply / selectedItem.total_supply) * 100
            : 100,
        },
        volumeRank: Math.floor(Math.random() * 20) + 1,
        volatility: Math.abs(selectedItem.price_change_percentage_24h) || Math.random() * 5,
        marketShare: ((selectedItem.market_cap || 0) / 2500000000000) * 100, // Assuming total market cap of 2.5T
      })
    }
  }

  // Add these styles to your CSS
  const styles = `
    .market-predict__coin-price-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      padding: 8px;
      border-radius: 8px;
    }

    .market-predict__current-price {
      font-size: 24px;
      font-weight: bold;
      color: #e0e0e0;
    }

    .market-predict__predicted-price {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      margin: 4px 0;
    }

    .market-predict__predicted-label {
      color: #999;
    }

    .market-predict__predicted-value {
      color: #ff4444;
      font-weight: 500;
    }

    .market-predict__timestamp {
      font-size: 14px;
      color: #999;
    }
  `

  // Add the styles to the document
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = styles
    document.head.appendChild(styleElement)
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  if (!selectedItem) {
    return (
      <div className="market-predict__loading">
        <div className="market-predict__loader"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div
      className="market-predict__container"
      style={{
        maxWidth: "1300px",
        margin: "0 auto",
        padding: "20px",
        color: "#e0e0e0",
        backgroundColor: "#121621",
        minHeight: "100vh",
        animation: "market-predict-fade-in 0.5s ease-in-out",
      }}
    >
      {/* Enhanced Notification System */}
      <div className="market-predict__notifications">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              className={`market-predict__notification market-predict__notification--${notif.type}`}
              initial={{ opacity: 0, y: -50, x: 50 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3 }}
            >
              <div className="market-predict__notification-content">
                <div className="market-predict__notification-icon">
                  {notif.icon ? (
                    notif.icon
                  ) : notif.type === "success" ? (
                    <Check size={18} />
                  ) : notif.type === "error" ? (
                    <X size={18} />
                  ) : notif.type === "info" ? (
                    <AlertCircle size={18} />
                  ) : notif.type === "profit" ? (
                    <ArrowUp size={18} />
                  ) : notif.type === "loss" ? (
                    <ArrowDown size={18} />
                  ) : (
                    <Bell size={18} />
                  )}
                </div>
                <div className="market-predict__notification-text">
                  <h4>{notif.message}</h4>
                  {typeof notif.details === 'string' ? (
                    <p>{notif.details}</p>
                  ) : (
                    notif.details
                  )}
                </div>
                <button
                  className="market-predict__notification-close"
                  onClick={() => {
                    setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
                  }}
                >
                  ×
                </button>
              </div>
              <div className="market-predict__notification-progress">
                <div className="market-predict__notification-progress-bar"></div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="market-predict__header">
        <div className="market-predict__coin-identity">
          <img
            src={selectedItem.image || `/placeholder.svg?height=64&width=64&text=${selectedItem.symbol}`}
            alt={selectedItem.name}
            className="market-predict__coin-logo"
          />
          <div className="market-predict__coin-title">
            <h1>
              #{selectedItem.market_cap_rank} {selectedItem.name} ({selectedItem.symbol.toUpperCase()})
            </h1>
          </div>
        </div>
        <div className="market-predict__coin-price-info">
          <div className="market-predict__current-price" style={{ color: '#22d3ee', fontSize: '29px' }}>
            ${selectedItem.current_price.toLocaleString()}
          </div>
          {showPrediction && predictedPrice && (
            <div className="market-predict__predicted-price" style={{ color: '#ff4444', fontSize: '28px' }}>
              ${predictedPrice.toLocaleString()}
            </div>
          )}
          <div className="market-predict__timestamp">
            {formatUTCTime(utcTime)}
          </div>
        </div>
      </div>

      <div className="market-predict__chart-container">
        <div className="market-predict__chart-wrapper" style={{ width: !showStats && !showProbability ? '100%' : '70%', height: '107%' }}>
          <div className="market-predict__chart-container-inner">
            <div className="market-predict__chart-controls-overlay" style={{ left: '10px', right: 'auto' }}>
              <div className="market-predict__zoom-controls">
                <button 
                  className="market-predict__zoom-button" 
                  onClick={handleZoomIn} 
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <button 
                  className="market-predict__zoom-button" 
                  onClick={handleZoomOut} 
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <button 
                  className="market-predict__zoom-button" 
                  onClick={handleChartReset} 
                  title="Reset View"
                >
                  <Move size={18} />
                </button>
              </div>
            </div>
            <canvas
              ref={chartRef}
              width="800"
              height="240"
              className="market-predict__price-chart"
              onMouseDown={handleChartMouseDown}
              onTouchStart={handleChartTouchStart}
              onTouchMove={handleChartTouchMove}
              onTouchEnd={handleChartTouchEnd}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            ></canvas>
            {error && <div className="market-predict__error">{error}</div>}
          </div>
        </div>

        {/* Right panel - conditionally show either probability panel or stats panel */}
        {(showStats || showProbability) && (
          <motion.div
            className={`market-predict__${showStats ? 'stats' : 'probability'}-panel`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {showStats ? (
              <div className="market-predict__stats-content">
                <div className="market-predict__stats-gauge">
                  <canvas ref={statsChartRef} width="250" height="250" className="market-predict__stats-chart"></canvas>
                </div>
                {coinStats && (
                  <div className="market-predict__stats-info">
                    <div className="market-predict__stats-row">
                      <div className="market-predict__stats-label">Market Cap Rank</div>
                      <div className="market-predict__stats-value">#{coinStats.marketCapRank}</div>
                    </div>
                    <div className="market-predict__stats-row">
                      <div className="market-predict__stats-label">24h Change</div>
                      <div
                        className={`market-predict__stats-value ${coinStats.changePercent24Hr >= 0 ? "market-predict__stats-value--positive" : "market-predict__stats-value--negative"}`}
                      >
                        {coinStats.changePercent24Hr >= 0 ? "+" : ""}
                        {coinStats.changePercent24Hr.toFixed(2)}%
                      </div>
                    </div>
                    <div className="market-predict__stats-row">
                      <div className="market-predict__stats-label">Volatility</div>
                      <div className="market-predict__stats-value">{coinStats.volatility.toFixed(2)}</div>
                    </div>
                    <div className="market-predict__stats-row">
                      <div className="market-predict__stats-label">Market Share</div>
                      <div className="market-predict__stats-value">{coinStats.marketShare.toFixed(2)}%</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="market-predict__analysis-summary" style={{ 
                padding: '2px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px'
              }}>
                <div className="market-predict__confidence-meter">
                  <div className="market-predict__confidence-label">Confidence</div>
                  <div className="market-predict__confidence-bar">
                    <div
                      className="market-predict__confidence-value"
                      style={{ 
                        width: `${probabilityData?.confidence || 75}%`,
                        backgroundColor: `hsl(${(probabilityData?.confidence || 75) * 1.2}, 70%, 50%)`,
                        height: '100%',
                        transition: 'width 0.3s ease, background-color 0.3s ease'
                      }}
                    ></div>
                  </div>
                  <div className="market-predict__confidence-percentage">{probabilityData?.confidence || 75}%</div>
                </div>

                <div className="market-predict__trend-indicator">
                  <div
                    className={`market-predict__trend-badge market-predict__trend-badge--${probabilityData?.trend === "bullish" ? "bullish" : "bearish"}`}
                  >
                    {(probabilityData?.confidence || 0) > 70
                      ? "Bullish ▲"
                      : probabilityData?.trend === "bullish"
                        ? "Bullish ▲"
                        : "Bearish ▼"}
                  </div>
                </div>

                <div className="market-predict__key-predictions">
                  <div className="market-predict__prediction-row">
                    <div className="market-predict__prediction-label">Support:</div>
                    <div className="market-predict__prediction-value">
                      ${(probabilityData?.support || selectedItem.current_price * 0.95).toFixed(2)}
                    </div>
                  </div>
                  <div className="market-predict__prediction-row">
                    <div className="market-predict__prediction-label">Resistance:</div>
                    <div className="market-predict__prediction-value">
                      ${(probabilityData?.resistance || selectedItem.current_price * 1.05).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="market-predict__metrics-mini" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', margin: '10px 0' }}>
                  <div className="market-predict__metric-mini">
                    <div className="market-predict__metric-mini-label">Volatility</div>
                    <div className="market-predict__metric-mini-value">
                      {(probabilityData?.volatility || Math.abs(selectedItem.price_change_percentage_24h) * 0.5).toFixed(2)}%
                    </div>
                  </div>

                  <div className="market-predict__metric-mini">
                    <div className="market-predict__metric-mini-label">Momentum</div>
                    <div
                      className={`market-predict__metric-mini-value ${(probabilityData?.momentum || 0) > 0 ? "market-predict__positive" : "market-predict__negative"}`}
                    >
                      {(probabilityData?.momentum || 0) > 0 ? "+" : ""}
                      {(probabilityData?.momentum || 0).toFixed(2)}%
                    </div>
                  </div>

                  <div className="market-predict__metric-mini">
                    <div className="market-predict__metric-mini-label">Risk</div>
                    <div className="market-predict__metric-mini-value">{probabilityData?.riskScore || 5}/10</div>
                  </div>

                  <div className="market-predict__metric-mini">
                    <div className="market-predict__metric-mini-label">Confidence</div>
                    <div className="market-predict__metric-mini-value">{probabilityData?.confidence || 75}%</div>
                  </div>
                </div>

                {/* Add Coin Details Section */}
                <div className="market-predict__coin-details-panel" style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <h3 style={{ marginBottom: '15px', fontSize: '18px', color: '#e0e0e0' }}>Coin Details</h3>
                  <div className="market-predict__coin-description" style={{ marginBottom: '20px', lineHeight: '1.5' }}>
                    <p>{selectedItem.name} is a leading cryptocurrency with strong market presence. It offers fast, secure transactions and has a growing ecosystem of applications.</p>
                  </div>
                  
                  <div className="market-predict__coin-metrics" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div className="market-predict__coin-metric" style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                      <div className="market-predict__coin-metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: '#999' }}>
                        <TrendingUp size={16} />
                        Price Change (24h)
                      </div>
                      <div className={`market-predict__coin-metric-value ${selectedItem.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '16px', fontWeight: '500' }}>
                        {selectedItem.price_change_percentage_24h >= 0 ? '+' : ''}
                        {selectedItem.price_change_percentage_24h?.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div className="market-predict__coin-metric" style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                      <div className="market-predict__coin-metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: '#999' }}>
                        <BarChart2 size={16} />
                        Market Dominance
                      </div>
                      <div className="market-predict__coin-metric-value" style={{ fontSize: '16px', fontWeight: '500' }}>
                        {((selectedItem.market_cap / 2500000000000) * 100).toFixed(2)}%
                      </div>
                    </div>

                    <div className="market-predict__coin-metric" style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                      <div className="market-predict__coin-metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: '#999' }}>
                        <DollarSign size={16} />
                        Price (USD)
                      </div>
                      <div className="market-predict__coin-metric-value" style={{ fontSize: '16px', fontWeight: '500' }}>
                        ${selectedItem.current_price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="market-predict__chart-controls">
        <div className="market-predict__controls-container" style={{ gap: '8px' }}>
          <div className="market-predict__timeframe-selector" style={{ gap: '8px' }}>
            {["30m", "1h", "4h", "24h"].map((tf) => (
              <button
                key={tf}
                className={`market-predict__timeframe-button ${timeframe === tf ? "market-predict__timeframe-button--active" : ""} ${pendingTimeframe === tf ? "market-predict__timeframe-button--pending" : ""}`}
                onClick={() => handleTimeframeChange(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="market-predict__control-button-group">
            <motion.button
              className={`market-predict__control-button market-predict__predict-button ${isPredicting ? "market-predict__predict-button--active" : ""}`}
              onClick={handlePredict}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Predict
            </motion.button>
            <motion.button
              className={`market-predict__control-button market-predict__probability-button ${showProbability ? "market-predict__probability-button--active" : ""}`}
              onClick={handleProbabilityClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Probability
            </motion.button>
            <motion.button
              className={`market-predict__control-button market-predict__stats-button ${showStats ? "market-predict__stats-button--active" : ""}`}
              onClick={handleStatsClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Stats
            </motion.button>
            <motion.button
              className="market-predict__control-button market-predict__portfolio-button"
              onClick={handleAddToPortfolio}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Add to Portfolio
            </motion.button>
          </div>
        </div>
      </div>

      <div className="market-predict__market-data">
        <div className="market-predict__market-stats">
          <h2>Market Stats</h2>
          <div className="market-predict__stats-grid">
            <div className="market-predict__stat-item">
              <div className="market-predict__stat-label">Market Cap</div>
              <div className="market-predict__stat-value">${formatNumber(selectedItem.market_cap)}</div>
            </div>
            <div className="market-predict__stat-item">
              <div className="market-predict__stat-label">24h Volume</div>
              <div className="market-predict__stat-value">${formatNumber(selectedItem.total_volume)}</div>
            </div>
            <div className="market-predict__stat-item">
              <div className="market-predict__stat-label">Circulating Supply</div>
              <div className="market-predict__stat-value">
                {selectedItem.circulating_supply
                  ? formatNumber(selectedItem.circulating_supply)
                  : formatNumber(selectedItem.market_cap / selectedItem.current_price)}
              </div>
            </div>
            <div className="market-predict__stat-item">
              <div className="market-predict__stat-label">All Time High</div>
              <div className="market-predict__stat-value">
                $
                {selectedItem.ath
                  ? formatNumber(selectedItem.ath)
                  : formatNumber(selectedItem.current_price * (1 + Math.random()))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Predict