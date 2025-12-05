import uvicorn
from fastapi import FastAPI, HTTPException, Query, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import yfinance as yf
import pandas as pd
import numpy as np
from pathlib import Path
from code_generator import generate_pseudocode, generate_vectorbt_code, generate_backtrader_code
from datetime import datetime, timedelta

# 引入修复后的引擎
from quant_engine import SakuraEngine

app = FastAPI(
    title="QuantForge Market Data Service",
    version="1.0.0"
)

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

@api_v1.post("/run-backtest", tags=["backtest"])
def run_backtest(req: BacktestRequest):
    print(f"Running backtest for {req.ticker} with {req.strategy}")
    
    try:
        # --- 1. 日期清洗 (Fix Future Date Bug) ---
        today = datetime.now()
        req_start = pd.to_datetime(req.startDate)
        req_end = pd.to_datetime(req.endDate)

        # 如果结束日期在未来，强制设为昨天
        if req_end > today:
            print(f"Adjusting future end date {req_end} to today")
            req_end = today - timedelta(days=1)
        
        # 如果开始日期也在未来，或者开始比结束还晚，报错
        if req_start >= req_end:
             raise HTTPException(status_code=400, detail="Start date cannot be after End date (or in the future).")

        # 增加 365 天 buffer 用于指标计算
        buffer_start = req_start - pd.Timedelta(days=365)
        
        # --- 2. 获取数据 ---
        dat = yf.Ticker(req.ticker)
        df = dat.history(
            start=buffer_start.strftime('%Y-%m-%d'), 
            end=req_end.strftime('%Y-%m-%d'), 
            auto_adjust=True
        )
        
        if df.empty:
             raise HTTPException(status_code=404, detail=f"No data found for {req.ticker}. Check the symbol or date range.")
        
        # 标准化列名
        df.reset_index(inplace=True)
        df.columns = [c.lower() for c in df.columns]
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date']).dt.tz_localize(None)

        # --- 3. 再次检查有效数据长度 ---
        # 截取用户请求的时间段，看看是不是空的
        user_view_mask = (df['date'] >= req_start) & (df['date'] <= req_end)
        if df.loc[user_view_mask].empty:
             raise HTTPException(status_code=404, detail="Data downloaded, but selected range is empty (maybe holidays?).")

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data fetch error: {str(e)}")

    try:
        # --- 4. 运行引擎 ---
        engine = SakuraEngine(df)
        result = engine.run_strategy(
            req.strategy, 
            req.params, 
            capital=req.params.get('initialCapital', 10000),
            fees=req.fees,
            slippage=req.slippage
        )
        
        # --- 5. 组装响应 (Filtering) ---
        # 只返回用户请求时间段的数据
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
                "open": float(row['open']),
                "high": float(row['high']),
                "low": float(row['low']),
                "close": float(row['close']),
                "volume": int(row['volume']),
            }
            
            for key, series in indicators.items():
                if current_date in series.index:
                    val = series.loc[current_date]
                    if pd.notnull(val):
                        item[key] = float(val)
            
            if current_date in entries.index and entries.loc[current_date]:
                item['buySignal'] = float(row['low'] * 0.98)
            if current_date in exits.index and exits.loc[current_date]:
                item['sellSignal'] = float(row['high'] * 1.02)
            
            resp_data.append(item)

        return {
            "data": resp_data,
            "trades": result['trades'],
            "metrics": result['metrics']
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Engine error: {str(e)}")

@api_v1.post("/code-gen", tags=["code"])
def generate_code(req: CodeGenRequest):
    return {
        "pseudocode": generate_pseudocode(req.strategy, req.params),
        "vectorbt": generate_vectorbt_code(req.ticker, req.strategy, req.params, req.fees, req.slippage),
        "backtrader": generate_backtrader_code(req.ticker, req.strategy, req.params, req.fees, req.slippage)
    }

app.include_router(api_v1)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)