import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import predictionReducer from './redux/slices/predictionSlice';
import PredictionDashboard from './components/PredictionDashboard';
import './App.css';

const store = configureStore({
  reducer: {
    prediction: predictionReducer,
  },
});

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <PredictionDashboard />
      </div>
    </Provider>
  );
}

export default App; 