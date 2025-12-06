# QuantForge

An interactive quantitative trading platform designed for strategy backtesting, market analysis, and risk assessment. It combines a vectorized backtesting engine with LLM-driven diagnostics to provide real-time insights into trading performance.

## Features

**Core Backtesting Engine**
*   **Vectorized Execution:** Built on `vectorbt` for high-performance strategy simulation over large datasets.
*   **Strategy Library:** Includes Trend Following (SMA/EMA, Turtle), Mean Reversion (RSI, Bollinger Bands), and Momentum (MACD, ROC) strategies.
*   **Risk Management:** Integrated stop-loss, take-profit, and trailing stop mechanisms.
*   **Friction Simulation:** Adjustable commission fees and slippage modeling.

**Analytics & Visualization**
*   **Interactive Charts:** Price action visualization with buy/sell signal overlays and focus modes.
*   **Performance Metrics:** Calculation of Total Return, Sharpe Ratio, Max Drawdown, and Win Rate.
*   **Regime Analysis:** Out-of-Sample (OOS) visualization to detect overfitting.
*   **Stress Testing:** Automated simulation against historical market crashes (Dot-com, 2008 Crisis, COVID-19).

**AI Integration**
*   **Contextual Assistant:** Chat interface capable of configuring strategies and parameters via natural language.
*   **Deep Diagnosis:** LLM-based audit of trade logs to identify timing errors and risk factors.
*   **Code Generation:** Exports strategy logic to Python (VectorBT and Backtrader) for local execution.

**System**
*   **Market Screener:** Multi-threaded sector scanning for active signals (Tech, Crypto, ETFs).
*   **User Library:** SQLite-backed system for user authentication and strategy persistence (Local/Cloud hybrid storage).

## Tech Stack

**Frontend**
*   **Framework:** React 19 (Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Visualization:** Recharts
*   **State Management:** React Hooks / Context

**Backend**
*   **Runtime:** Python 3.10+
*   **Framework:** FastAPI
*   **Quantitative Library:** VectorBT, Pandas, NumPy
*   **Data Source:** yfinance
*   **Database:** SQLite
*   **AI:** Google Gemini API

## File Structure

```text
quantforge-pro/
├── backend/
│   ├── main.py              # API entry point, auth, and routing
│   ├── quant_engine.py      # VectorBT strategy implementation
│   ├── code_generator.py    # Python code export logic
│   ├── requirements.txt     # Python dependencies
│   └── quantforge.db        # SQLite database (generated)
├── src/
│   ├── components/
│   │   ├── ChatInterface.tsx    # AI assistant and settings
│   │   ├── ConfigPanel.tsx      # Parameter controls
│   │   ├── ResultsView.tsx      # Charts and metrics display
│   │   ├── MarketBar.tsx        # Ticker and date selection
│   │   ├── LibraryPanel.tsx     # Save/Load strategies
│   │   └── ... (Modals)
│   ├── services/
│   │   ├── geminiService.ts     # LLM integration
│   │   └── quantEngine.ts       # Frontend-Backend API bridge
│   ├── types.ts                 # TypeScript interfaces
│   ├── App.tsx                  # Main application layout
│   └── main.tsx                 # Entry point
└── package.json
```

## Installation

### 1. Backend Setup

Navigate to the backend directory and install dependencies.

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

Start the FastAPI server.

```bash
python main.py
```
The server runs on `http://127.0.0.1:8000`.

### 2. Frontend Setup

Install Node.js dependencies and start the development server.

```bash
npm install
npm run dev
```
The application runs on `http://localhost:5173`.

## Configuration

### API Keys
The application requires a Google Gemini API key for AI features.
1.  Launch the application.
2.  Open the **AI Mentor** settings (gear icon).
3.  Enter your Gemini API Key.
4.  Optionally configure the Model Name (default: `gemini-2.5-flash-lite`) and Output Language.

### Data Source
Market data is fetched via `yfinance`. No external API key is required for standard price data, but rate limits may apply based on IP.

## Usage Guide

1.  **Configuration:** Select an asset (e.g., NVDA) and a date range in the top bar.
2.  **Strategy:** Choose a model (e.g., SMA Crossover) in the left panel and adjust parameters using the sliders.
3.  **Backtest:** The engine runs automatically upon parameter changes. View metrics and charts in the main panel.
4.  **Analysis:**
    *   Click **AI Diagnose** for a qualitative report on the strategy.
    *   Click **Stress Test** to simulate performance during historical crises.
    *   Click **Code** to export the strategy to Python.
5.  **Screener:** Use the radar icon in the header to scan sectors for similar signals.
6.  **Persistence:** Log in via the Library (book icon) to save strategies to the database.
