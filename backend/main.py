import uvicorn
from fastapi import FastAPI, HTTPException, Query, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import yfinance as yf
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

# 引入引擎
from quant_engine import SakuraEngine
# 引入代码生成器
from code_generator import generate_pseudocode, generate_vectorbt_code, generate_backtrader_code

app = FastAPI(title="QuantForge Market Data Service", version="1.0.0")

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

api_v1 = APIRouter(prefix="/v1")

# --- Models ---
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

# --- Constants: Historical Scenarios ---
STRESS_SCENARIOS = [
    {"name": "Dot-com Bubble", "start": "2000-01-01", "end": "2002-10-01", "desc": "Tech crash"},
    {"name": "2008 Financial Crisis", "start": "2007-10-01", "end": "2009-03-01", "desc": "Global meltdown"},
    {"name": "COVID-19 Crash", "start": "2020-02-01", "end": "2020-04-01", "desc": "V-shape volatility"},
    {"name": "2022 Tech Bear", "start": "2022-01-01", "end": "2022-12-31", "desc": "Rate hike grind"},
]

# --- Endpoints ---

@api_v1.get("/search")
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
    except:
        return []

@api_v1.post("/code-gen", tags=["code"])
def generate_code(req: CodeGenRequest):
    return {
        "pseudocode": generate_pseudocode(req.strategy, req.params),
        "vectorbt": generate_vectorbt_code(req.ticker, req.strategy, req.params, req.fees, req.slippage),
        "backtrader": generate_backtrader_code(req.ticker, req.strategy, req.params, req.fees, req.slippage)
    }

@api_v1.post("/run-backtest", tags=["backtest"])
def run_backtest(req: BacktestRequest):
    print(f"Running backtest for {req.ticker}...")
    try:
        # Date Logic
        today = datetime.now()
        req_start = pd.to_datetime(req.startDate)
        req_end = pd.to_datetime(req.endDate)
        if req_end > today: req_end = today - timedelta(days=1)
        if req_start >= req_end: raise HTTPException(status_code=400, detail="Invalid date range.")

        # Data Fetch
        buffer_start = req_start - pd.Timedelta(days=365)
        dat = yf.Ticker(req.ticker)
        df = dat.history(start=buffer_start.strftime('%Y-%m-%d'), end=req_end.strftime('%Y-%m-%d'), auto_adjust=True)
        
        if df.empty: raise HTTPException(status_code=404, detail="No data found.")
        
        df.reset_index(inplace=True)
        df.columns = [c.lower() for c in df.columns]
        if 'date' in df.columns: df['date'] = pd.to_datetime(df['date']).dt.tz_localize(None)

        # Check effective range
        user_view_mask = (df['date'] >= req_start) & (df['date'] <= req_end)
        if df.loc[user_view_mask].empty: raise HTTPException(status_code=404, detail="Empty range.")

        # Run Engine
        engine = SakuraEngine(df)
        result = engine.run_strategy(req.strategy, req.params, capital=req.params.get('initialCapital', 10000), fees=req.fees, slippage=req.slippage)
        
        # Filter Response
        mask = (df['date'] >= req_start) & (df['date'] <= req_end)
        filtered_df = df.loc[mask].copy()
        
        indicators = result['indicators']
        entries = result['entries'] 
        exits = result['exits']    
        
        resp_data = []
        for i, row in filtered_df.iterrows():
            current_date = row['date']
            item = {
                "date": current_date.strftime('%Y-%m-%d'),
                "open": float(row['open']), "high": float(row['high']), "low": float(row['low']), "close": float(row['close']), "volume": int(row['volume']),
            }
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

# --- NEW: Stress Test Endpoint ---
@api_v1.post("/run-stress-test", tags=["backtest"])
def run_stress_test(req: BacktestRequest):
    """Runs the strategy against historical crash scenarios"""
    print(f"Stress testing {req.ticker}...")
    
    results = []
    
    # 1. 下载全量历史数据 (一次下载，多次切片，效率最高)
    # 下载从 1999 年至今的数据，涵盖所有场景
    try:
        full_dat = yf.Ticker(req.ticker)
        # 获取足够长的数据
        full_df = full_dat.history(start="1999-01-01", end=datetime.now().strftime('%Y-%m-%d'), auto_adjust=True)
        full_df.reset_index(inplace=True)
        full_df.columns = [c.lower() for c in full_df.columns]
        if 'date' in full_df.columns: full_df['date'] = pd.to_datetime(full_df['date']).dt.tz_localize(None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical data: {str(e)}")

    if full_df.empty:
        return []

    # 2. 遍历场景运行
    for scenario in STRESS_SCENARIOS:
        scen_start = pd.to_datetime(scenario["start"])
        scen_end = pd.to_datetime(scenario["end"])
        
        # 增加 buffer 以便计算指标
        buffer_start = scen_start - pd.Timedelta(days=200) 
        
        # 切片数据
        mask = (full_df['date'] >= buffer_start) & (full_df['date'] <= scen_end)
        scen_df = full_df.loc[mask].copy()
        
        # 如果该股票在那个时候还没上市 (数据太少)，跳过
        if len(scen_df) < 50: 
            results.append({
                **scenario,
                "status": "N/A",
                "reason": "IPO later"
            })
            continue

        try:
            engine = SakuraEngine(scen_df)
            # 运行策略
            res = engine.run_strategy(
                req.strategy, req.params, 
                capital=req.params.get('initialCapital', 10000), 
                fees=req.fees, slippage=req.slippage
            )
            
            # 计算该时间段的 buy & hold 收益作为对比 (Benchmark)
            # 注意：我们要计算的是 scenario start 之后的回报，不是 buffer start
            real_mask = (scen_df['date'] >= scen_start)
            real_df = scen_df.loc[real_mask]
            
            if not real_df.empty:
                start_price = real_df.iloc[0]['open']
                end_price = real_df.iloc[-1]['close']
                benchmark_return = ((end_price - start_price) / start_price) * 100
            else:
                benchmark_return = 0.0

            results.append({
                **scenario,
                "status": "OK",
                "return": res['metrics']['totalReturn'],
                "maxDrawdown": res['metrics']['maxDrawdown'],
                "benchmark": benchmark_return,
                "tradeCount": res['metrics']['tradeCount']
            })
            
        except Exception as e:
            print(f"Error in scenario {scenario['name']}: {e}")
            results.append({ **scenario, "status": "Error" })

    return results

app.include_router(api_v1)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)