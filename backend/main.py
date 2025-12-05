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
    print(f"Running backtest for {req.ticker} with {req.strategy}. Fees: {req.fees}, Slippage: {req.slippage}")
    
    try:
        # 1. Data Fetching
        dat = yf.Ticker(req.ticker)
        start_dt = pd.to_datetime(req.startDate) - pd.Timedelta(days=365)
        df = dat.history(start=start_dt.strftime('%Y-%m-%d'), end=req.endDate, auto_adjust=True)
        
        if df.empty:
             raise HTTPException(status_code=404, detail="No data found")
        
        df.reset_index(inplace=True)
        df.columns = [c.lower() for c in df.columns]
        if 'date' in df.columns:
            # 确保去掉时区，防止 VBT 和 Pandas 混用时报错
            df['date'] = pd.to_datetime(df['date']).dt.tz_localize(None)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data fetch error: {str(e)}")

    try:
        # 2. Run Engine
        # Engine 内部会自动把 'date' 设为索引，所以这里传入 raw df 没问题
        engine = SakuraEngine(df)
        result = engine.run_strategy(
            req.strategy, 
            req.params, 
            capital=req.params.get('initialCapital', 10000),
            fees=req.fees,
            slippage=req.slippage
        )
        
        # 3. Response Construction
        # 过滤出请求时间段的数据用于前端展示
        mask = (df['date'] >= pd.to_datetime(req.startDate)) & (df['date'] <= pd.to_datetime(req.endDate))
        filtered_df = df.loc[mask].copy()
        
        indicators = result['indicators']
        entries = result['entries'] 
        exits = result['exits']    
        
        resp_data = []
        
        # 核心：在遍历时，必须确保 date 是对齐的
        # 因为 Engine 内部将 df 设为了 DatetimeIndex，而这里的 filtered_df 是 RangeIndex
        # 我们可以通过 date 来查找 indicator 的值
        
        for i, row in filtered_df.iterrows():
            current_date = row['date'] # 这是 Timestamp 对象
            
            item = {
                "date": current_date.strftime('%Y-%m-%d'),
                "open": float(row['open']),
                "high": float(row['high']),
                "low": float(row['low']),
                "close": float(row['close']),
                "volume": int(row['volume']),
            }
            
            # 使用 .loc[current_date] 从 Engine 的结果中取值
            for key, series in indicators.items():
                if current_date in series.index:
                    val = series.loc[current_date]
                    if pd.notnull(val):
                        item[key] = float(val) # 强转 float
            
            # 注入信号 (Entry/Exit 也是 DatetimeIndex)
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