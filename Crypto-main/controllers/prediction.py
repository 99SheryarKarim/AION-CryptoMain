import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pandas as pd
import yfinance as yf
import joblib
from sklearn.preprocessing import MinMaxScaler
from config import settings
from fastapi import HTTPException

# Constants
LOOKBACK = 60
EPOCHS = 50
MODEL_PATH = "models"  # Directory to store models for different coins

# Timeframe mapping for yfinance
TIMEFRAME_MAP = {
    "30m": {"period": "7d", "interval": "30m"},
    "1h": {"period": "60d", "interval": "1h"},
    "4h": {"period": "60d", "interval": "1h"},  # We'll resample this
    "24h": {"period": "730d", "interval": "1d"}
}

def get_latest_data(symbol, timeframe="1h"):
    """Get latest data with proper timeframe handling"""
    if timeframe not in TIMEFRAME_MAP:
        raise ValueError(f"Invalid timeframe. Must be one of {list(TIMEFRAME_MAP.keys())}")
    
    # Add -USD suffix if not present
    if not symbol.endswith('-USD'):
        symbol = f"{symbol}-USD"
    
    tf_config = TIMEFRAME_MAP[timeframe]
    data = yf.download(
        tickers=symbol,
        period=tf_config["period"],
        interval=tf_config["interval"]
    )
    
    if data.empty:
        raise ValueError(f"No data retrieved for {symbol}. Adjust period or interval.")
    
    # Resample if needed (for 4h)
    if timeframe == "4h" and tf_config["interval"] == "1h":
        data = data.resample('4H').agg({
            'Open': 'first',
            'High': 'max',
            'Low': 'min',
            'Close': 'last',
            'Volume': 'sum'
        })
    
    # Add technical indicators
    data['SMA_10'] = data['Close'].rolling(window=10).mean()
    data['RSI'] = 100 - (100 / (1 + (data['Close'].diff().rolling(14).mean() / data['Close'].diff().rolling(14).std())))
    data['MACD'] = data['Close'].ewm(span=12, adjust=False).mean() - data['Close'].ewm(span=26, adjust=False).mean()
    data['Bollinger_Upper'] = data['Close'].rolling(window=20).mean() + 2 * data['Close'].rolling(window=20).std()
    data['Bollinger_Lower'] = data['Close'].rolling(window=20).mean() - 2 * data['Close'].rolling(window=20).std()
    data.dropna(inplace=True)
    
    return data

def predict_next_price(symbol, timeframe="24h"):
    """Predict next price with timeframe support"""
    try:
        if timeframe not in TIMEFRAME_MAP:
            timeframe = settings.DEFAULT_TIMEFRAME
        
        # Load the model and scaler
        model, X_train, scaler, scaled_data = get_model(symbol, timeframe)
        
        # Fetch latest data
        latest_data = get_latest_data(symbol, timeframe)
        
        # Normalize features
        scaled_features = scaler.transform(latest_data[['Close', 'SMA_10', 'RSI', 'MACD', 'Bollinger_Upper', 'Bollinger_Lower']])
        
        # Extract the last `LOOKBACK` data points as input
        X_input = scaled_features[-LOOKBACK:].reshape(1, LOOKBACK, 6)
        
        # Make prediction
        with torch.no_grad():
            model.eval()
            input_tensor = torch.FloatTensor(X_input)
            prediction_scaled = model(input_tensor).numpy()
        
        # Denormalize the prediction
        prediction = scaler.inverse_transform(
            np.concatenate([prediction_scaled, np.zeros((1, 5))], axis=1)
        )[0, 0]
        
        # Get the last actual price for comparison
        last_actual_price = latest_data['Close'].iloc[-1]
        
        # Calculate time until next prediction
        last_timestamp = latest_data.index[-1]
        next_timestamp = get_next_timestamp(last_timestamp, timeframe)
        
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "predicted_price": float(prediction),
            "last_actual_price": float(last_actual_price),
            "prediction_time": next_timestamp.isoformat(),
            "current_time": pd.Timestamp.now().isoformat()
        }
    
    except Exception as e:
        return {"error": str(e)}

def get_next_timestamp(last_timestamp, timeframe):
    """Calculate next timestamp based on timeframe"""
    timeframe_deltas = {
        "30m": pd.Timedelta(minutes=30),
        "1h": pd.Timedelta(hours=1),
        "4h": pd.Timedelta(hours=4),
        "24h": pd.Timedelta(days=1)
    }
    return last_timestamp + timeframe_deltas[timeframe]

class BiLSTMWithAttention(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers):
        super(BiLSTMWithAttention, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, bidirectional=True)
        self.attn = nn.Linear(hidden_size * 2, 1)
        self.fc = nn.Linear(hidden_size * 2, 1)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        attention_weights = torch.softmax(self.attn(lstm_out), dim=1)
        attended_output = torch.sum(attention_weights * lstm_out, dim=1)
        return self.fc(attended_output)

def add_technical_indicators(symbol, timeframe="24h"):
    """Add technical indicators with timeframe support"""
    data = get_latest_data(symbol, timeframe)
    
    # Normalize Data
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data[['Close', 'SMA_10', 'RSI', 'MACD', 'Bollinger_Upper', 'Bollinger_Lower']])

    # Prepare Input for LSTM
    X, y = [], []
    for i in range(len(scaled_data) - LOOKBACK - 1):
        X.append(scaled_data[i:i+LOOKBACK])
        y.append(scaled_data[i+LOOKBACK, 0])
    X, y = np.array(X), np.array(y)

    # Convert to Tensors
    X_train, y_train = torch.FloatTensor(X), torch.FloatTensor(y)

    model = BiLSTMWithAttention(input_size=6, hidden_size=128, num_layers=3)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.0005)

    return X_train, y_train, model, criterion, optimizer, scaler, scaled_data

def get_model(symbol, timeframe="24h"):
    """Get or train model with timeframe support"""
    # Create models directory if it doesn't exist
    os.makedirs(MODEL_PATH, exist_ok=True)
    
    # Create model path with symbol and timeframe
    model_path = os.path.join(MODEL_PATH, f"{symbol}_{timeframe}_model.pth")
    scaler_path = os.path.join(MODEL_PATH, f"{symbol}_{timeframe}_scaler.pkl")
    
    X_train, y_train, model, criterion, optimizer, scaler, scaled_data = add_technical_indicators(symbol, timeframe)
    
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        print(f"Loading pre-trained model for {symbol} {timeframe} timeframe...")
        model = BiLSTMWithAttention(input_size=6, hidden_size=128, num_layers=3)
        model.load_state_dict(torch.load(model_path))
        scaler = joblib.load(scaler_path)
    else:
        print(f"Training model for {symbol} {timeframe} timeframe...")
        for epoch in range(EPOCHS):
            model.train()
            optimizer.zero_grad()
            output = model(X_train)
            loss = criterion(output.squeeze(), y_train)
            loss.backward()
            optimizer.step()
            if epoch % 10 == 0:
                print(f"Epoch {epoch}, Loss: {loss.item()}")

        # Save model and scaler
        torch.save(model.state_dict(), model_path)
        joblib.dump(scaler, scaler_path)
        print(f"Model saved for {symbol} {timeframe} timeframe.")

    return model, X_train, scaler, scaled_data

def prepare_data_for_prediction(symbol, timeframe="24h"):
    """Prepare prediction data with timeframe support"""
    try:
        # Get latest data first to validate the symbol and timeframe
        latest_data = get_latest_data(symbol, timeframe)
        
        # Get model and data
        model, X_train, scaler, scaled_data = get_model(symbol, timeframe)
        model.eval()
        
        with torch.no_grad():
            predictions = model(X_train).numpy()
        
        # Denormalize predictions
        predictions_denorm = scaler.inverse_transform(
            np.concatenate([predictions, np.zeros((len(predictions), 5))], axis=1)
        )[:, 0]
        
        # Get actual prices
        actuals = latest_data['Close'].values[-len(predictions_denorm):]
        
        return actuals, predictions_denorm
    except Exception as e:
        print(f"Error in prepare_data_for_prediction: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Failed to prepare prediction data: {str(e)}"
        )