import { StockDataPoint } from '../types';
import { fetchMockStockData } from './mockDataService'; // 引入 Mock 服务

const API_BASE_URL = 'http://localhost:8000/v1';

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export const searchTickersReal = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error("Search API Error:", error);
    return [];
  }
};

export const fetchMarketData = async (
  ticker: string, 
  startDate: string, 
  endDate: string
): Promise<StockDataPoint[]> => {
  const url = `${API_BASE_URL}/market-data?ticker=${ticker}&start_date=${startDate}&end_date=${endDate}`;
  
  try {
    const response = await fetch(url);
    
    // 如果后端返回错误（例如 404 或 500），转入 catch 块处理 Fallback
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`No historical data found for ${ticker}.`);
    }

    return data;

  } catch (error) {
    console.warn(`[API] Failed to fetch real data (${error}). Falling back to Simulation Mode.`);
    
    // 核心修复：无缝回退到 Mock 数据，并传入正确的日期范围
    return await fetchMockStockData(ticker, startDate, endDate, true);
  }
};