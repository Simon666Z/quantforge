import uvicorn
from fastapi import FastAPI, HTTPException, Query, APIRouter, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import yfinance as yf
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
import concurrent.futures
import sqlite3
import json
import hashlib

from quant_engine import SakuraEngine
from code_generator import generate_pseudocode, generate_vectorbt_code, generate_backtrader_code

app = FastAPI(title="QuantForge Pro", version="2.0.0")

STATIC_DIR = (Path(__file__).parent / "static").resolve()
STATIC_DIR.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Setup (SQLite) ---
DB_FILE = "quantforge.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password_hash TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS strategies 
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  username TEXT, name TEXT, ticker TEXT, 
                  strategy_type TEXT, params TEXT, chat_history TEXT, 
                  created_at TEXT)''')
    conn.commit()
    conn.close()

init_db()

# --- Models ---
class AuthRequest(BaseModel):
    username: str
    password: str

class SaveStrategyRequest(BaseModel):
    username: str
    name: str
    ticker: str
    strategy_type: str
    params: Dict[str, Any]
    chat_history: List[Any]

class BacktestRequest(BaseModel):
    ticker: str
    startDate: str
    endDate: str
    strategy: str
    params: Dict[str, Any]
    fees: float = 0.001
    slippage: float = 0.001

class CodeGenRequest(BaseModel):
    ticker: str
    strategy: str
    params: Dict[str, Any]
    fees: float = 0.001
    slippage: float = 0.001

class ScreenerRequest(BaseModel):
    sector: str 
    strategy: str
    params: Dict[str, Any]

class SignalCheckRequest(BaseModel):
    ticker: str
    strategy: str
    params: Dict[str, Any]

# --- Constants ---
SECTOR_POOLS = {
    "TECH": ["NVDA", "AMD", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NFLX", "INTC", "CRM", "ADBE"],
    "CRYPTO": ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD", "ADA-USD", "AVAX-USD", "LINK-USD"],
    "ETF": ["SPY", "QQQ", "IWM", "TLT", "GLD", "SLV", "ARKK", "SMH", "XLE", "VXX", "EEM", "XLF"],
    "CHINA": ["BABA", "PDD", "JD", "BIDU", "NIO", "LI", "XPEV", "TCEHY", "BILI", "YUMC", "HTHT"],
}

STRESS_SCENARIOS = [
    {"name": "Dot-com Bubble", "start": "2000-01-01", "end": "2002-10-01", "desc": "Tech crash"},
    {"name": "2008 Financial Crisis", "start": "2007-10-01", "end": "2009-03-01", "desc": "Global meltdown"},
    {"name": "COVID-19 Crash", "start": "2020-02-01", "end": "2020-04-01", "desc": "V-shape volatility"},
    {"name": "2022 Tech Bear", "start": "2022-01-01", "end": "2022-12-31", "desc": "Rate hike grind"},
]

# --- Helper Logic ---
def scan_single_ticker(ticker: str, strategy: str, params: dict):
    try:
        dat = yf.Ticker(ticker)
        df = dat.history(period="18mo", auto_adjust=True)
        if df.empty or len(df) < 100: return None
        df.reset_index(inplace=True)
        df.columns = [c.lower() for c in df.columns]
        if 'date' in df.columns: df['date'] = pd.to_datetime(df['date']).dt.tz_localize(None)
        
        engine = SakuraEngine(df)
        res = engine.run_strategy(strategy, params, capital=10000)
        
        entries = res['entries']
        exits = res['exits']
        
        recent_entries = entries.iloc[-5:]
        has_new_signal = recent_entries.any()
        
        last_entry_idx = entries[entries].last_valid_index()
        last_exit_idx = exits[exits].last_valid_index()
        is_uptrend = False
        if last_entry_idx:
            if not last_exit_idx or last_entry_idx > last_exit_idx:
                is_uptrend = True
        
        yearly_return = res['metrics']['totalReturn']
        if not (has_new_signal or is_uptrend or yearly_return > 10): return None

        status_label = "NEUTRAL"
        if has_new_signal: status_label = "BUY SIGNAL"
        elif is_uptrend: status_label = "UPTREND"
        
        return {
            "symbol": ticker, "price": df.iloc[-1]['close'], "status": status_label,
            "yearlyReturn": yearly_return, "winRate": res['metrics']['winRate']
        }
    except: return None

# --- API Endpoints ---

@app.post("/api/auth/register")
def register(req: AuthRequest):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    try:
        pw_hash = hashlib.sha256(req.password.encode()).hexdigest()
        c.execute("INSERT INTO users VALUES (?, ?)", (req.username, pw_hash))
        conn.commit()
        return {"status": "ok", "username": req.username}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally: conn.close()

@app.post("/api/auth/login")
def login(req: AuthRequest):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    pw_hash = hashlib.sha256(req.password.encode()).hexdigest()
    c.execute("SELECT username FROM users WHERE username=? AND password_hash=?", (req.username, pw_hash))
    user = c.fetchone()
    conn.close()
    if user: return {"status": "ok", "username": user[0]}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/library/save")
def save_strategy(req: SaveStrategyRequest):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    # Ensure params/history are strings
    p_str = json.dumps(req.params)
    c_str = json.dumps(req.chat_history)
    c.execute("INSERT INTO strategies (username, name, ticker, strategy_type, params, chat_history, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
              (req.username, req.name, req.ticker, req.strategy_type, p_str, c_str, datetime.now().strftime("%Y-%m-%d %H:%M")))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/api/library/list")
def list_strategies(username: str):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM strategies WHERE username=? ORDER BY id DESC", (username,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.delete("/api/library/delete/{id}")
def delete_strategy(id: int):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM strategies WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}

# --- V1 Analysis Endpoints ---

@app.post("/v1/check-signal", tags=["alerts"])
def check_signal(req: SignalCheckRequest):
    try:
        dat = yf.Ticker(req.ticker)
        df = dat.history(period="6mo", auto_adjust=True)
        if df.empty: return {"status": "ERROR", "message": "No data"}
        df.reset_index(inplace=True)
        df.columns = [c.lower() for c in df.columns]
        if 'date' in df.columns: df['date'] = pd.to_datetime(df['date']).dt.tz_localize(None)
        
        engine = SakuraEngine(df)
        res = engine.run_strategy(req.strategy, req.params, capital=10000)
        
        last_date = df.iloc[-1]['date'].strftime('%Y-%m-%d')
        last_price = df.iloc[-1]['close']
        entries = res['entries']
        exits = res['exits']
        
        signal = "NEUTRAL"
        if entries.iloc[-2:].any(): signal = "BUY"
        elif exits.iloc[-2:].any(): signal = "SELL"
            
        return { "ticker": req.ticker, "date": last_date, "price": last_price, "signal": signal }
    except Exception as e: return {"status": "ERROR", "message": str(e)}

@app.post("/v1/screener", tags=["screener"])
def run_screener(req: ScreenerRequest):
    tickers = SECTOR_POOLS.get(req.sector, [])
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(scan_single_ticker, t, req.strategy, req.params) for t in tickers]
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res: results.append(res)
    results.sort(key=lambda x: x['yearlyReturn'], reverse=True)
    state_rank = {"BUY SIGNAL": 2, "UPTREND": 1, "NEUTRAL": 0}
    results.sort(key=lambda x: state_rank.get(x['status'], 0), reverse=True)
    return results

@app.get("/v1/search")
def search_ticker(q: str = Query(..., min_length=1)):
    from yahooquery import search
    try:
        response = search(q)
        quotes = response.get('quotes', [])
        if not quotes: return []
        results = []
        for item in quotes:
            if 'symbol' not in item: continue
            results.append({
                "symbol": item['symbol'],
                "name": item.get('shortname') or item.get('longname') or item.get('name', 'Unknown'),
                "type": item.get('quoteType', 'Unknown'),
                "exchange": item.get('exchange', 'Unknown')
            })
        return results
    except: return []

@app.post("/v1/code-gen", tags=["code"])
def generate_code(req: CodeGenRequest):
    return {
        "pseudocode": generate_pseudocode(req.strategy, req.params),
        "vectorbt": generate_vectorbt_code(req.ticker, req.strategy, req.params, req.fees, req.slippage),
        "backtrader": generate_backtrader_code(req.ticker, req.strategy, req.params, req.fees, req.slippage)
    }

@app.post("/v1/run-backtest", tags=["backtest"])
def run_backtest(req: BacktestRequest):
    try:
        today = datetime.now()
        req_start = pd.to_datetime(req.startDate)
        req_end = pd.to_datetime(req.endDate)
        if req_end > today: req_end = today - timedelta(days=1)
        if req_start >= req_end: raise HTTPException(status_code=400, detail="Invalid date range.")
        buffer_start = req_start - pd.Timedelta(days=365)
        
        dat = yf.Ticker(req.ticker)
        df = dat.history(start=buffer_start.strftime('%Y-%m-%d'), end=req_end.strftime('%Y-%m-%d'), auto_adjust=True)
        if df.empty: raise HTTPException(status_code=404, detail="No data found.")
        df.reset_index(inplace=True)
        df.columns = [c.lower() for c in df.columns]
        if 'date' in df.columns: df['date'] = pd.to_datetime(df['date']).dt.tz_localize(None)
        
        user_view_mask = (df['date'] >= req_start) & (df['date'] <= req_end)
        if df.loc[user_view_mask].empty: raise HTTPException(status_code=404, detail="Empty data range.")

        engine = SakuraEngine(df)
        result = engine.run_strategy(req.strategy, req.params, capital=req.params.get('initialCapital', 10000), fees=req.fees, slippage=req.slippage)
        
        mask = (df['date'] >= req_start) & (df['date'] <= req_end)
        filtered_df = df.loc[mask].copy()
        
        indicators = result['indicators']
        entries = result['entries'] 
        exits = result['exits']    
        
        resp_data = []
        for i, row in filtered_df.iterrows():
            current_date = row['date']
            item = { "date": current_date.strftime('%Y-%m-%d'), "open": float(row['open']), "high": float(row['high']), "low": float(row['low']), "close": float(row['close']), "volume": int(row['volume']) }
            for key, series in indicators.items():
                if current_date in series.index:
                    val = series.loc[current_date]
                    if pd.notnull(val): item[key] = float(val)
            if current_date in entries.index and entries.loc[current_date]: item['buySignal'] = float(row['low'] * 0.98)
            if current_date in exits.index and exits.loc[current_date]: item['sellSignal'] = float(row['high'] * 1.02)
            resp_data.append(item)

        return { "data": resp_data, "trades": result['trades'], "metrics": result['metrics'] }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/run-stress-test", tags=["backtest"])
def run_stress_test(req: BacktestRequest):
    results = []
    try:
        full_dat = yf.Ticker(req.ticker)
        full_df = full_dat.history(start="1999-01-01", end=datetime.now().strftime('%Y-%m-%d'), auto_adjust=True)
        if full_df.empty: return []
        full_df.reset_index(inplace=True)
        full_df.columns = [c.lower() for c in full_df.columns]
        if 'date' in full_df.columns: full_df['date'] = pd.to_datetime(full_df['date']).dt.tz_localize(None)
    except: return []

    for scenario in STRESS_SCENARIOS:
        scen_start = pd.to_datetime(scenario["start"])
        scen_end = pd.to_datetime(scenario["end"])
        buffer_start = scen_start - pd.Timedelta(days=200)
        
        mask = (full_df['date'] >= buffer_start) & (full_df['date'] <= scen_end)
        scen_df = full_df.loc[mask].copy()
        
        if len(scen_df) < 50: 
            results.append({ **scenario, "status": "N/A", "reason": "IPO later" })
            continue

        try:
            engine = SakuraEngine(scen_df)
            res = engine.run_strategy(req.strategy, req.params, capital=10000, fees=req.fees, slippage=req.slippage)
            real_mask = (scen_df['date'] >= scen_start)
            real_df = scen_df.loc[real_mask]
            benchmark = 0.0
            if not real_df.empty:
                start_p = real_df.iloc[0]['open']
                end_p = real_df.iloc[-1]['close']
                benchmark = ((end_p - start_p) / start_p) * 100
            results.append({
                **scenario, "status": "OK", "return": res['metrics']['totalReturn'], "maxDrawdown": res['metrics']['maxDrawdown'], "benchmark": benchmark
            })
        except:
            results.append({ **scenario, "status": "Error" })
    return results

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)