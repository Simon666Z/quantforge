import uvicorn
from fastapi import FastAPI, HTTPException, Query, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import List
import yfinance as yf
import pandas as pd
from yahooquery import search # 使用 yahooquery，但我们会加强它
from pathlib import Path

app = FastAPI(
    title="QuantForge Market Data Service",
    version="1.0.0",
    description=(
        "Ticker search and market retrieval microservice.\n\n"
        "![Teaser](/static/teaser.png)\n\n"
        "Provides Yahoo Finance powered endpoints for symbol discovery and OHLCV history."
    ),
    docs_url = "/docs"
)

STATIC_DIR = (Path(__file__).parent / "static").resolve()
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.openapi_tags = [
    {"name": "search", "description": "Symbol discovery and lookup."},
    {"name": "market-data", "description": "Historical pricing and volume."},
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class StockDataPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

    # OpenAPI example payload for a single item, should return an entire list
    # of data points in normal use
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "date": "2024-11-01",
            "open": 182.3,
            "high": 185.2,
            "low": 181.8,
            "close": 184.7,
            "volume": 51,
        }
    })

class SearchResultItem(BaseModel):
    symbol: str
    name: str
    type: str
    exchange: str

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "type": "EQUITY",
            "exchange": "NASDAQ"
        }
    })


api_v1 = APIRouter(prefix="/v1")

# --- 搜索逻辑 ---
@api_v1.get(
    "/search",
    response_model=List[SearchResultItem],
    tags=["search"],
    summary="Search tickers",
    description="Search Yahoo Finance for matching symbols (tickers)"
)
def search_ticker(q: str = Query(..., min_length=1, example="AAPL")):
    print(f"Searching for: {q}")
    try:
        # yahooquery 的 search 实际上非常强大，但需要网络畅通
        # 如果本地有代理，可能需要检查代理设置
        response = search(q)
        
        quotes = response.get('quotes', [])
        if not quotes:
            print(f"Yahoo returned no results for {q}")
            return []

        results = []
        for item in quotes:
            # 只返回有效的股票/ETF/加密货币
            if 'symbol' not in item:
                continue
            
            results.append({
                "symbol": item['symbol'],
                "name": item.get('shortname') or item.get('longname') or item.get('name', 'Unknown'),
                "type": item.get('quoteType', 'Unknown'),
                "exchange": item.get('exchange', 'Unknown')
            })
        
        print(f"Found {len(results)} results")
        return results

    except Exception as e:
        print(f"Search Critical Error: {e}")
        # 如果 yahooquery 失败，我们做一个极其简单的 fallback
        # 比如如果用户输入的是完整的代码，直接返回该代码
        if q.isalnum():
             return [{
                 "symbol": q.upper(),
                 "name": f"Manual Entry: {q.upper()}",
                 "type": "Manual",
                 "exchange": "Unknown"
             }]
        return []

# --- 获取数据逻辑 ---
@api_v1.get(
    "/market-data",
    response_model=List[StockDataPoint],
    tags=["market-data"],
    summary="Historical OHLCV",
    description="Get historical OHLCV for a ticker"
)
def get_market_data(
    ticker: str = Query(..., example="AAPL"),
    start_date: str = Query(..., example="2024-10-01"),
    end_date: str = Query(..., example="2024-11-01"),
):
    print(f"Fetching real data for {ticker}...")
    
    try:
        # 1. 尝试下载
        # using Ticker object allows for better error handling sometimes
        dat = yf.Ticker(ticker)
        
        # history 方法比 download 更稳定
        df = dat.history(start=start_date, end=end_date, auto_adjust=True)
        
        # 2. 严格检查空数据
        if df.empty:
            print(f"yfinance returned empty dataframe for {ticker}")
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found or no data available.")

        # 3. 格式清理
        df.reset_index(inplace=True)
        
        # 处理时区问题 (去除时区信息，防止报错)
        if pd.api.types.is_datetime64_any_dtype(df['Date']):
            df['Date'] = df['Date'].dt.tz_localize(None)
        
        df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')

        df = df.rename(columns={
            "Date": "date", "Open": "open", "High": "high", 
            "Low": "low", "Close": "close", "Volume": "volume"
        })
        
        # 确保列名是小写的
        required = ['date', 'open', 'high', 'low', 'close', 'volume']
        if not all(col in df.columns for col in required):
             raise HTTPException(status_code=404, detail="Data format error from source.")

        result = df[required].dropna().to_dict(orient='records')
        
        if len(result) == 0:
             raise HTTPException(status_code=404, detail="No trading data in this date range.")
             
        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Backend Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_v1)

if __name__ == "__main__":
    # 这里的 host="127.0.0.1" 有时比 "0.0.0.0" 在 Mac 上反应更快
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)