import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PredictNextPrice, FetchLastPredictions } from '../redux/actions/prediction';
import { clearPrediction } from '../redux/slices/predictionSlice';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './PredictionDashboard.css';

const PredictionDashboard = () => {
  const dispatch = useDispatch();
  const { predictions, currentPrediction, loading, error } = useSelector((state) => state.prediction);
  const [symbol, setSymbol] = useState('BTC');
  const [timeframe, setTimeframe] = useState('24h');

  useEffect(() => {
    // Fetch initial predictions
    dispatch(FetchLastPredictions({ symbol, timeframe }));
  }, [dispatch, symbol, timeframe]);

  const handlePredict = () => {
    dispatch(PredictNextPrice({ symbol, timeframe }));
  };

  const handleClearPrediction = () => {
    dispatch(clearPrediction());
  };

  const formatChartData = () => {
    if (!predictions || !predictions.actuals || !predictions.predictions) return [];
    
    return predictions.actuals.map((actual, index) => ({
      name: `Point ${index + 1}`,
      actual: actual,
      predicted: predictions.predictions[index],
      timestamp: new Date(Date.now() - (predictions.actuals.length - index) * 3600000).toLocaleString()
    }));
  };

  return (
    <div className="prediction-dashboard">
      <div className="dashboard-header">
        <h1>Crypto Price Prediction Dashboard</h1>
        <div className="controls">
          <div className="input-group">
            <label>Symbol:</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., BTC"
            />
          </div>
          <div className="input-group">
            <label>Timeframe:</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="24h">24 Hours</option>
            </select>
          </div>
          <button onClick={handlePredict} disabled={loading}>
            {loading ? 'Predicting...' : 'Predict Next Price'}
          </button>
          <button onClick={handleClearPrediction}>Clear Prediction</button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="prediction-content">
        {currentPrediction && (
          <div className="current-prediction">
            <h2>Current Prediction</h2>
            <div className="prediction-details">
              <p>Symbol: {currentPrediction.symbol}</p>
              <p>Timeframe: {currentPrediction.timeframe}</p>
              <p>Predicted Price: ${currentPrediction.predicted_price.toFixed(2)}</p>
              <p>Last Actual Price: ${currentPrediction.last_actual_price.toFixed(2)}</p>
              <p>Prediction Time: {new Date(currentPrediction.prediction_time).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="prediction-history">
          <h2>Prediction History</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8884d8"
                  name="Predicted Price"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#82ca9d"
                  name="Actual Price"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionDashboard; 