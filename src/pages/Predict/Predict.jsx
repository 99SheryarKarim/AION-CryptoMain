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

  // Add Y-axis scrolling state
  const [chartVerticalOffset, setChartVerticalOffset] = useState(0)
  const [dragStartY, setDragStartY] = useState(0)

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

  // Fetch coin details from CoinCap API with improved error handling and retries
  const fetchCoinDetails = async (item) => {
    if (!item) return

    try {
      // Try to get the correct ID for CoinCap API
      // CoinCap uses lowercase symbol or ID
      const symbol = item.symbol.toLowerCase()
      const id = item.id ? item.id.toLowerCase() : symbol

      // Try multiple API endpoints with retry logic
      let data = null

      // First try CoinCap API with ID
      try {
        const response = await fetchWithTimeout(`https://api.coincap.io/v2/assets/${id}`, {
          timeout: 5000,
        })

        if (response.ok) {
          const jsonData = await response.json()
          data = jsonData
        }
      } catch (err) {
        console.log(`CoinCap API with ID ${id} failed: ${err.message}`)
      }

      // If ID didn't work, try with symbol
      if (!data) {
        try {
          const symbolResponse = await fetchWithTimeout(`https://api.coincap.io/v2/assets/${symbol}`, {
            timeout: 5000,
          })

          if (symbolResponse.ok) {
            const jsonData = await symbolResponse.json()
            data = jsonData
          }
        } catch (err) {
          console.log(`CoinCap API with symbol ${symbol} failed: ${err.message}`)
        }
      }

      // Try CoinGecko API as a fallback
      if (!data) {
        try {
          const geckoResponse = await fetchWithTimeout(
            `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
            { timeout: 5000 },
          )

          if (geckoResponse.ok) {
            const geckoData = await geckoResponse.json()
            // Transform CoinGecko data to match our expected format
            data = {
              data: {
                id: geckoData.id,
                name: geckoData.name,
                symbol: geckoData.symbol.toUpperCase(),
                priceUsd: geckoData.market_data.current_price.usd.toString(),
                marketCapUsd: geckoData.market_data.market_cap.usd.toString(),
                volumeUsd24Hr: geckoData.market_data.total_volume.usd.toString(),
                supply: geckoData.market_data.circulating_supply?.toString() || "0",
                maxSupply: geckoData.market_data.total_supply?.toString() || "0",
                changePercent24Hr: geckoData.market_data.price_change_percentage_24h?.toString() || "0",
                vwap24Hr: "0", // CoinGecko doesn't provide VWAP
                explorer: geckoData.links?.blockchain_site?.[0] || "",
                rank: geckoData.market_cap_rank?.toString() || "0",
              },
            }
          }
        } catch (err) {
          console.log(`CoinGecko API failed: ${err.message}`)
        }
      }

      // If we have data from any source, process it
      if (data && data.data) {
        processApiData(data, item)
        // Reset retry count on success
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
      `${item.name} is a decentralized digital currency that enables instant payments to anyone, anywhere in the world.`,
      `${item.name} is a blockchain platform that enables developers to build and deploy decentralized applications.`,
      `${item.name} is a digital asset designed to work as a medium of exchange that uses strong cryptography to secure financial transactions.`,
      `${item.name} is a cryptocurrency that aims to offer fast, secure, and low-cost digital payments through a decentralized peer-to-peer network.`,
      `${item.name} is a next-generation blockchain platform designed for scalability, security, and sustainability.`,
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
    const headers = COINCAP_API_KEY ? { Authorization: `Bearer ${COINCAP_API_KEY}` } : {}

    try {
      // Add delay between requests to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))

      const symbolResponse = await fetchWithTimeout(
        `${COINCAP_API_BASE_URL}/assets/${id.toLowerCase()}`,
        { headers, timeout: 5000 }
      )

      if (!symbolResponse.ok) {
        if (symbolResponse.status === 429) {
          // Rate limit hit - wait longer and retry
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY * 2))
          return fetchFromCoinCap(id, symbol, tf) // Retry
        }
        throw new Error(`CoinCap API error: ${symbolResponse.status}`)
      }

      const symbolData = await symbolResponse.json()

      // Get historical data with rate limit handling
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY))

      const historyResponse = await fetchWithTimeout(
        `${COINCAP_API_BASE_URL}/assets/${id.toLowerCase()}/history?interval=${timeframeToInterval(tf)}&start=${getStartTime(tf)}&end=${Date.now()}`,
        { headers, timeout: 5000 }
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
        currentPrice: parseFloat(symbolData.data.priceUsd),
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
      // First try CoinCap API
      try {
        const data = await fetchFromCoinCap(id, symbol, tf)
        if (data && data.historicalData.length > 10) {
          return data.historicalData
        }
      } catch (error) {
        console.log("CoinCap API failed:", error.message)
      }

      // If CoinCap fails, try CoinGecko
      try {
        const geckoData = await fetchFromCoinGecko(id, symbol, tf)
        if (geckoData && geckoData.length > 10) {
          return geckoData
        }
      } catch (error) {
        console.log("CoinGecko API failed:", error.message)
      }

      // Try Binance API as a third option
      try {
        const binanceData = await fetchFromBinance(symbol, tf)
        if (binanceData && binanceData.length > 10) {
          return binanceData
        }
      } catch (error) {
        console.log("Binance API failed:", error.message)
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
    if (!selectedItem) return

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

      // Apply smooth transition to new data
      const oldData = [...chartData]
      const transitionData = (progress) => {
        const blendedData = data.map((newPoint, i) => {
          const oldPoint = oldData[i] || oldData[oldData.length - 1] || newPoint
          return {
            time: newPoint.time,
            price: oldPoint.price + (newPoint.price - oldPoint.price) * progress,
            fullTime: newPoint.fullTime,
          }
        })
        setChartData(blendedData)
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(() => transitionData(Math.min(1, progress + 0.05)))
        }
      }

      // Start the transition animation
      transitionData(0)

      // Generate extended data for scrolling
      const extendedData = generateExtendedHistoricalData(data, selectedItem)
      setExtendedChartData(extendedData)

      setLoading(false)

      // Clear any previous error notifications
      if (notification && notification.type === "error") {
        setNotification(null)
      }
    } catch (err) {
      console.error("Error fetching historical data:", err)

      // Generate realistic data based on the selected item as a last resort
      const mockData = generateRealisticData(selectedItem, pendingTimeframe || timeframe)
      setChartData(mockData)

      // Generate extended data for scrolling
      const extendedData = generateExtendedHistoricalData(mockData, selectedItem)
      setExtendedChartData(extendedData)

      // Show notification but don't show error in UI to avoid alarming users
      showNotification({
        type: "info",
        message: "Using market simulation",
        details:
          "Real-time data temporarily unavailable. Using advanced market simulation. Please check your internet connection or try again later.",
      })

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
    const deltaX = e.clientX - dragStart
    const deltaY = e.clientY - dragStartY

    // Update chart offset based on drag distance (X-axis)
    setChartOffset((prev) => {
      // Calculate new offset with bounds
      const maxOffset = extendedChartData.length - chartData.length
      return Math.max(0, Math.min(maxOffset, prev - deltaX / 10))
    })

    // Update vertical offset (Y-axis)
    setChartVerticalOffset((prev) => {
      // Limit vertical scrolling to a reasonable range
      return Math.max(-100, Math.min(100, prev + deltaY))
    })

    // Update drag start position
    setDragStart(e.clientX)
    setDragStartY(e.clientY)
  }

  // Handle mouse up to end dragging
  const handleChartMouseUp = () => {
    setIsDragging(false)

    // Remove event listeners
    document.removeEventListener("mousemove", handleChartMouseMove)
    document.removeEventListener("mouseup", handleChartMouseUp)
  }

  // Handle zoom in
  const handleZoomIn = () => {
    setChartScale((prev) => Math.min(prev * 1.2, 5))
  }

  // Handle zoom out
  const handleZoomOut = () => {
    setChartScale((prev) => Math.max(prev / 1.2, 0.5))
  }

  // Handle chart reset
  const handleChartReset = () => {
    setChartScale(1)
    setChartOffset(0)
    setChartVerticalOffset(0)
  }

  // Add touch event handlers for mobile support
  const handleChartTouchStart = (e) => {
    if (!chartRef.current || e.touches.length !== 1) return

    setIsDragging(true)
    setDragStart(e.touches[0].clientX)
    setDragStartY(e.touches[0].clientY)

    // Prevent default to avoid page scrolling
    e.preventDefault()
  }

  const handleChartTouchMove = (e) => {
    if (!isDragging || !chartRef.current || e.touches.length !== 1) return

    const deltaX = e.touches[0].clientX - dragStart
    const deltaY = e.touches[0].clientY - dragStartY

    // Update chart offset based on drag distance (X-axis)
    setChartOffset((prev) => {
      // Calculate new offset with bounds
      const maxOffset = extendedChartData.length - chartData.length
      return Math.max(0, Math.min(maxOffset, prev - deltaX / 10))
    })

    // Update vertical offset (Y-axis)
    setChartVerticalOffset((prev) => {
      // Limit vertical scrolling to a reasonable range
      return Math.max(-100, Math.min(100, prev + deltaY))
    })

    // Update drag start position
    setDragStart(e.touches[0].clientX)
    setDragStartY(e.touches[0].clientY)

    // Prevent default to avoid page scrolling
    e.preventDefault()
  }

  const handleChartTouchEnd = () => {
    setIsDragging(false)
  }

  // Draw the chart using canvas
  const drawChart = () => {
    const canvas = chartRef.current
    const ctx = canvas.getContext("2d")

    // Enable anti-aliasing for smoother lines
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    const width = canvas.width
    const height = 250 // Fixed height

    // Set canvas height
    canvas.height = height

    // Clear the canvas
    ctx.clearRect(0, 0, width, height)

    // Fill background - dark background like in the image
    ctx.fillStyle = "#0a0e17"
    ctx.fillRect(0, 0, width, height)

    // Get visible data based on offset and scale
    const startIdx = Math.floor(chartOffset)
    const visibleCount = Math.ceil(chartData.length / chartScale)

    // Ensure we have data to display
    if (extendedChartData.length === 0) return

    // Get the visible portion of data
    const visibleData = extendedChartData.slice(startIdx, Math.min(startIdx + visibleCount, extendedChartData.length))

    if (visibleData.length === 0) return

    // Calculate min and max prices for scaling
    const prices = visibleData.map((d) => d.price)
    const minPrice = Math.min(...prices) * 0.99
    const maxPrice = Math.max(...prices) * 1.01
    const priceRange = maxPrice - minPrice

    // Apply vertical offset to the chart
    const verticalOffsetFactor = chartVerticalOffset / height
    const adjustedMinPrice = minPrice - priceRange * verticalOffsetFactor
    const adjustedMaxPrice = maxPrice - priceRange * verticalOffsetFactor
    const adjustedPriceRange = adjustedMaxPrice - adjustedMinPrice

    // Draw price labels on right side of the chart only
    ctx.fillStyle = "#999"
    ctx.font = "10px Arial"
    ctx.textAlign = "right"

    for (let i = 0; i < 6; i++) {
      const y = height - i * (height / 5)
      const price = adjustedMinPrice + (i / 5) * adjustedPriceRange
      ctx.fillText(`${price.toFixed(1)}`, width - 5, y - 5)
    }

    // Draw time labels on bottom of chart
    ctx.textAlign = "center"
    const timeLabels = 5
    for (let i = 0; i < timeLabels; i++) {
      const x = (i / (timeLabels - 1)) * width
      const dataIndex = Math.floor((i / (timeLabels - 1)) * (visibleData.length - 1))
      if (visibleData[dataIndex]) {
        const time = visibleData[dataIndex].fullTime
        ctx.fillText(time.toLocaleTimeString(), x, height - 5)
      }
    }

    // Draw the blue line first (always present but more subtle)
    // Create gradient for the chart area
    const blueGradient = ctx.createLinearGradient(0, 0, 0, height)
    blueGradient.addColorStop(0, "rgba(91, 192, 222, 0.08)")
    blueGradient.addColorStop(0.5, "rgba(91, 192, 222, 0.04)")
    blueGradient.addColorStop(1, "rgba(91, 192, 222, 0)")

    // Draw filled area under the blue line
    ctx.beginPath()
    ctx.fillStyle = blueGradient

    // Start at the bottom left
    ctx.moveTo(0, height)

    // Draw the line path with vertical offset
    for (let i = 0; i < visibleData.length; i++) {
      const x = (i / (visibleData.length - 1)) * width
      const y = height - ((visibleData[i].price - adjustedMinPrice) / adjustedPriceRange) * height
      ctx.lineTo(x, y)
    }

    // Complete the path to the bottom right
    ctx.lineTo(width, height)
    ctx.closePath()
    ctx.fill()

    // Add subtle shadow effect for the blue line
    ctx.shadowColor = "rgba(91, 192, 222, 0.2)"
    ctx.shadowBlur = 3
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1

    // Draw the blue line (more subtle)
    ctx.beginPath()
    ctx.strokeStyle = "rgba(91, 192, 222, 0.5)"
    ctx.lineWidth = 1.5

    // Use bezier curves for smoother lines
    if (visibleData.length > 0) {
      ctx.moveTo(0, height - ((visibleData[0].price - adjustedMinPrice) / adjustedPriceRange) * height)

      for (let i = 1; i < visibleData.length; i++) {
        const x = (i / (visibleData.length - 1)) * width
        const y = height - ((visibleData[i].price - adjustedMinPrice) / adjustedPriceRange) * height
        const prevX = ((i - 1) / (visibleData.length - 1)) * width
        const prevY = height - ((visibleData[i - 1].price - adjustedMinPrice) / adjustedPriceRange) * height

        // Control points for the curve
        const cpX1 = prevX + (x - prevX) / 3
        const cpX2 = prevX + (2 * (x - prevX)) / 3

        ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y)
      }
    }

    ctx.stroke()

    // If predicting, also draw the orange line with higher frequency
    if (isPredicting || chartData.some((point) => point.isPrediction)) {
      // Reset shadow for orange line
      ctx.shadowColor = "rgba(255, 150, 50, 0.8)"
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 4

      // Create orange gradient for the area under the orange line
      const orangeGradient = ctx.createLinearGradient(0, 0, 0, height)
      orangeGradient.addColorStop(0, "rgba(255, 150, 50, 0.2)")
      orangeGradient.addColorStop(0.5, "rgba(255, 150, 50, 0.1)")
      orangeGradient.addColorStop(1, "rgba(255, 150, 50, 0)")

      // Find where the prediction starts
      const predictionStartIndex = visibleData.findIndex((point) => point.isPrediction)
      const hasPredictionPoint = predictionStartIndex !== -1

      // First draw the filled area
      ctx.beginPath()
      ctx.fillStyle = orangeGradient
      ctx.moveTo(0, height)

      // Define volatilityFactor here
      const volatilityFactor = 0.03

      for (let i = 0; i < visibleData.length; i++) {
        const x = (i / (visibleData.length - 1)) * width

        // Add sine wave to create higher frequency, but only for prediction points
        const sineWave =
          hasPredictionPoint && i >= predictionStartIndex
            ? Math.sin(i * 0.5) * volatilityFactor * adjustedPriceRange
            : 0

        const baseY = height - ((visibleData[i].price - adjustedMinPrice) / adjustedPriceRange) * height
        const y = baseY + sineWave

        ctx.lineTo(x, y)
      }

      ctx.lineTo(width, height)
      ctx.closePath()
      ctx.fill()

      // Then draw the orange line itself (more prominent)
      ctx.beginPath()
      ctx.strokeStyle = "#ff9632"
      ctx.lineWidth = 3.5

      // Use bezier curves for smoother lines
      if (visibleData.length > 0) {
        const firstY = height - ((visibleData[0].price - adjustedMinPrice) / adjustedPriceRange) * height
        ctx.moveTo(0, firstY)

        for (let i = 1; i < visibleData.length; i++) {
          const x = (i / (visibleData.length - 1)) * width
          const prevX = ((i - 1) / (visibleData.length - 1)) * width

          // Add sine wave to create higher frequency, but only for prediction points
          const sineWave =
            hasPredictionPoint && i >= predictionStartIndex
              ? Math.sin(i * 0.5) * volatilityFactor * adjustedPriceRange
              : 0
          const prevSineWave =
            hasPredictionPoint && i - 1 >= predictionStartIndex
              ? Math.sin((i - 1) * 0.5) * volatilityFactor * adjustedPriceRange
              : 0

          const baseY = height - ((visibleData[i].price - adjustedMinPrice) / adjustedPriceRange) * height
          const y = baseY + sineWave

          const prevBaseY = height - ((visibleData[i - 1].price - adjustedMinPrice) / adjustedPriceRange) * height
          const prevY = prevBaseY + prevSineWave

          // Control points for the curve
          const cpX1 = prevX + (x - prevX) / 3
          const cpX2 = prevX + (2 * (x - prevX)) / 3

          ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y)
        }
      }

      ctx.stroke()

      // If we have a prediction point, add a marker
      const predictionPoint = visibleData.find((point) => point.isPrediction)
      if (predictionPoint) {
        const pointIndex = visibleData.indexOf(predictionPoint)
        const x = (pointIndex / (visibleData.length - 1)) * width
        const y = height - ((predictionPoint.price - adjustedMinPrice) / adjustedPriceRange) * height

        // Draw prediction point marker
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.fillStyle = "#ff9632"
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // Reset shadow for other elements
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // Draw chart controls instructions
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
    ctx.font = "10px Arial"
    ctx.textAlign = "left"
    ctx.fillText("Drag to scroll in any direction • Use zoom buttons to zoom in/out", 10, 15)
  }

  // Draw the stats chart
  const drawStatsChart = () => {
    if (!coinStats || !statsChartRef.current) return

    const canvas = statsChartRef.current
    const ctx = canvas.getContext("2d")
    const width = canvas.width
    const height = canvas.height

    // Clear the canvas
    ctx.clearRect(0, 0, width, height)

    // Fill background
    ctx.fillStyle = "#121621"
    ctx.fillRect(0, 0, width, height)

    // Draw circular gauge
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.4

    // Draw background circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 20
    ctx.stroke()

    // Draw progress arc
    const probability = coinStats.probabilityIncrease
    const startAngle = -Math.PI / 2 // Start at top
    const endAngle = startAngle + (probability / 100) * (2 * Math.PI)

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, endAngle)
    ctx.strokeStyle = "#5bc0de"
    ctx.lineWidth = 20
    ctx.stroke()

    // Draw text in center
    ctx.fillStyle = "#fff"
    ctx.font = "bold 36px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`${probability}%`, centerX, centerY)

    // Draw label below
    ctx.font = "16px Arial"
    ctx.fillStyle = "#aaa"
    ctx.fillText("Probability of increase in 1 day", centerX, centerY + radius + 40)
  }

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

    // Auto-remove after 5 seconds
    notificationTimeoutRef.current = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
      if (notification && notification.id === newNotification.id) {
        setNotification(null)
      }
    }, 5000)
  }

  // Show prediction result notification
  const showPredictionResultNotification = (result) => {
    const isProfit = result.outcome === "profit"

    showNotification({
      type: isProfit ? "profit" : "loss",
      message: isProfit ? "Prediction Successful!" : "Prediction Missed",
      details: `Your ${result.timeframe} prediction for ${result.assetName} ${isProfit ? "was correct" : "was incorrect"}. ${isProfit ? "Profit" : "Loss"}: ${result.percentageChange.toFixed(2)}%`,
      icon: isProfit ? <ArrowUp /> : <ArrowDown />,
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

      // Fetch chart data first
      await fetchChartData()

      // Dispatch prediction action with current symbol and timeframe
      const result = await dispatch(PredictNextPrice({ 
        symbol: selectedItem.symbol, 
        timeframe 
      })).unwrap()

      if (result.predicted_price) {
        // Show success notification
        showPredictionResultNotification({
          success: true,
          price: result.predicted_price,
          timeframe,
        })

        // Update chart with new prediction
        setChartData((prevData) => {
          const lastTime = prevData[prevData.length - 1]?.time
          const nextTime = lastTime ? new Date(new Date(lastTime).getTime() + getTimeframeMilliseconds(timeframe)) : new Date()

          return [...prevData, {
            time: nextTime.toLocaleTimeString(),
            price: result.predicted_price,
            isPrediction: true,
            fullTime: nextTime,
          }]
        })
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
                  <p>{notif.details}</p>

                  {/* Prediction result specific content */}
                  {(notif.type === "profit" || notif.type === "loss") && (
                    <div
                      className={`market-predict__prediction-result market-predict__prediction-result--${notif.type}`}
                    >
                      <div
                        className={`market-predict__prediction-result-icon market-predict__prediction-result-icon--${notif.type}`}
                      >
                        {notif.type === "profit" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      </div>
                      <div
                        className={`market-predict__prediction-result-text market-predict__prediction-result-text--${notif.type}`}
                      >
                        {notif.type === "profit" ? "Profit" : "Loss"}:
                        <span className="market-predict__prediction-result-value">
                          {notif.percentageChange ? `${Math.abs(notif.percentageChange).toFixed(2)}%` : ""}
                        </span>
                      </div>
                    </div>
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

              {/* Action buttons */}
              {notif.actions && notif.actions.length > 0 && (
                <div className="market-predict__notification-actions">
                  {notif.actions.map((action, index) => (
                    <button
                      key={index}
                      className={`market-predict__notification-action ${action.primary ? "market-predict__notification-action--primary" : "market-predict__notification-action--secondary"}`}
                      onClick={() => {
                        action.onClick()
                        setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

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
          <div className="market-predict__current-price">${selectedItem.current_price.toLocaleString()}</div>
          {isPredicting && predicted_next_price && (
            <div
              className={`market-predict__predicted-price ${(predicted_next_price || 0) > selectedItem.current_price ? "market-predict__positive" : "market-predict__negative"}`}
            >
              Predicted: ${predicted_next_price.toLocaleString()}
            </div>
          )}
          <div className="market-predict__timestamp">
            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="market-predict__chart-container">
        <div className="market-predict__chart-wrapper">
          {loading ? (
            <div className="market-predict__loading">
              <div className="market-predict__loader"></div>
              <p>Loading chart data...</p>
            </div>
          ) : (
            <div className="market-predict__chart-container-inner">
              <div className="market-predict__chart-controls-overlay">
                <button className="market-predict__chart-control-btn" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn size={16} />
                </button>
                <button className="market-predict__chart-control-btn" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut size={16} />
                </button>
                <button className="market-predict__chart-control-btn" onClick={handleChartReset} title="Reset View">
                  <Move size={16} />
                </button>
              </div>
              <canvas
                ref={chartRef}
                width="800"
                height="250"
                className="market-predict__price-chart"
                onMouseDown={handleChartMouseDown}
                onTouchStart={handleChartTouchStart}
                onTouchMove={handleChartTouchMove}
                onTouchEnd={handleChartTouchEnd}
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
              ></canvas>
              {error && <div className="market-predict__error">{error}</div>}
            </div>
          )}
        </div>

        {/* Right panel - conditionally show either coin details, probability panel, or stats panel */}
        {showStats ? (
          <motion.div
            className="market-predict__probability-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="market-predict__analysis-summary">
              <div className="market-predict__confidence-meter">
                <div className="market-predict__confidence-label">Confidence</div>
                <div className="market-predict__confidence-bar">
                  <div
                    className="market-predict__confidence-value"
                    style={{ width: `${probabilityData?.confidence || 75}%` }}
                  ></div>
                </div>
                <div className="market-predict__confidence-percentage">{probabilityData?.confidence || 75}%</div>
              </div>

              <div className="market-predict__trend-indicator">
                <div
                  className={`market-predict__trend-badge market-predict__trend-badge--${probabilityData?.trend === "bullish" ? "bullish" : "bearish"}`}
                >
                  {/* Show Bullish if confidence is high (>70%) regardless of trend */}
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

              <div className="market-predict__metrics-mini">
                <div className="market-predict__metric-mini">
                  <div className="market-predict__metric-mini-label">Volatility</div>
                  <div className="market-predict__metric-mini-value">
                    {(probabilityData?.volatility || Math.abs(selectedItem.price_change_percentage_24h) * 0.5).toFixed(
                      2,
                    )}
                    %
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
            </div>
          </motion.div>
        ) : showProbability ? (
          <motion.div
            className="market-predict__stats-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="market-predict__panel-header">
              <h3>Stats</h3>
              <PieChart size={16} className="market-predict__stats-icon" />
            </div>
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
          </motion.div>
        ) : (
          <motion.div
            className="market-predict__coin-details-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="market-predict__panel-header">
              <h3>Coin Details</h3>
              <Info size={16} className="market-predict__info-icon" />
            </div>

            {coinDetails && (
              <div className="market-predict__coin-details-content">
                <div className="market-predict__coin-description">
                  <p>{coinDetails.description}</p>
                </div>

                <div className="market-predict__coin-metrics">
                  <div className="market-predict__coin-metric">
                    <div className="market-predict__metric-icon">
                      <TrendingUp size={16} />
                    </div>
                    <div className="market-predict__metric-content">
                      <div className="market-predict__metric-label">Market Dominance</div>
                      <div className="market-predict__metric-value">{coinDetails.marketDominance.toFixed(2)}%</div>
                    </div>
                  </div>

                  <div className="market-predict__coin-metric">
                    <div className="market-predict__metric-icon">
                      <BarChart2 size={16} />
                    </div>
                    <div className="market-predict__metric-content">
                      <div className="market-predict__metric-label">Volatility Score</div>
                      <div className="market-predict__metric-value">{coinDetails.volatilityScore.toFixed(1)}/10</div>
                    </div>
                  </div>

                  <div className="market-predict__coin-metric">
                    <div className="market-predict__metric-icon">
                      <DollarSign size={16} />
                    </div>
                    <div className="market-predict__metric-content">
                      <div className="market-predict__metric-label">All-Time High</div>
                      <div className="market-predict__metric-value">
                        ${formatNumber(coinDetails.priceHistory.allTimeHigh)}
                      </div>
                    </div>
                  </div>

                  <div className="market-predict__coin-metric">
                    <div className="market-predict__metric-icon">
                      <Clock size={16} />
                    </div>
                    <div className="market-predict__metric-content">
                      <div className="market-predict__metric-label">YTD Change</div>
                      <div
                        className={`market-predict__metric-value ${coinDetails.priceHistory.yearToDateChange >= 0 ? "market-predict__positive" : "market-predict__negative"}`}
                      >
                        {coinDetails.priceHistory.yearToDateChange >= 0 ? "+" : ""}
                        {coinDetails.priceHistory.yearToDateChange}%
                      </div>
                    </div>
                  </div>

                  <div className="market-predict__coin-metric">
                    <div className="market-predict__metric-icon">
                      <Award size={16} />
                    </div>
                    <div className="market-predict__metric-content">
                      <div className="market-predict__metric-label">Liquidity Score</div>
                      <div className="market-predict__metric-value">{coinDetails.liquidityScore}/100</div>
                    </div>
                  </div>

                  <div className="market-predict__coin-metric">
                    <div className="market-predict__metric-icon">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="market-predict__metric-content">
                      <div className="market-predict__metric-label">Risk Level</div>
                      <div className="market-predict__metric-value">
                        {coinDetails.volatilityScore < 3 ? "Low" : coinDetails.volatilityScore < 7 ? "Medium" : "High"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="market-predict__market-sentiment">
                  <h4>Market Sentiment</h4>
                  <div className="market-predict__sentiment-bars">
                    <div className="market-predict__sentiment-bar">
                      <div className="market-predict__sentiment-label">Bullish</div>
                      <div className="market-predict__sentiment-progress">
                        <div
                          className="market-predict__sentiment-progress-bar market-predict__sentiment-progress-bar--bullish"
                          style={{ width: `${coinDetails.sentimentData.bullish}%` }}
                        ></div>
                      </div>
                      <div className="market-predict__sentiment-value">{coinDetails.sentimentData.bullish}%</div>
                    </div>

                    <div className="market-predict__sentiment-bar">
                      <div className="market-predict__sentiment-label">Bearish</div>
                      <div className="market-predict__sentiment-progress">
                        <div
                          className="market-predict__sentiment-progress-bar market-predict__sentiment-progress-bar--bearish"
                          style={{ width: `${coinDetails.sentimentData.bearish}%` }}
                        ></div>
                      </div>
                      <div className="market-predict__sentiment-value">{coinDetails.sentimentData.bearish}%</div>
                    </div>

                    <div className="market-predict__sentiment-bar">
                      <div className="market-predict__sentiment-label">Neutral</div>
                      <div className="market-predict__sentiment-progress">
                        <div
                          className="market-predict__sentiment-progress-bar market-predict__sentiment-progress-bar--neutral"
                          style={{ width: `${coinDetails.sentimentData.neutral}%` }}
                        ></div>
                      </div>
                      <div className="market-predict__sentiment-value">{coinDetails.sentimentData.neutral}%</div>
                    </div>
                  </div>
                </div>

                <div className="market-predict__exchange-distribution">
                  <h4>Trading Volume by Exchange</h4>
                  <div className="market-predict__exchange-bars">
                    {coinDetails.exchanges.map((exchange, index) => (
                      <div className="market-predict__exchange-bar" key={index}>
                        <div className="market-predict__exchange-label">{exchange.name}</div>
                        <div className="market-predict__exchange-progress">
                          <div
                            className="market-predict__exchange-progress-bar"
                            style={{ width: `${exchange.percentage}%` }}
                          ></div>
                        </div>
                        <div className="market-predict__exchange-value">{exchange.percentage}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="market-predict__chart-controls">
        <div className="market-predict__controls-container">
          <div className="market-predict__timeframe-selector">
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
              Stats
            </motion.button>
            <motion.button
              className={`market-predict__control-button market-predict__stats-button ${showStats ? "market-predict__stats-button--active" : ""}`}
              onClick={handleStatsClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Probability
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