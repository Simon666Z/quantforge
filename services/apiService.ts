import { StockDataPoint } from '../types';

const API_BASE_URL = 'http://localhost:8000/api';

// 更新接口定义
export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string; // 新增字段
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
  
  const response = await fetch(url);
  
  // 1. 捕获后端抛出的 404 或 500 错误
  if (!response.ok) {
    const errorData = await response.json();
    // 抛出具体的后端错误信息 (例如 "Ticker not found")
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  // 2. 前端二次校验：确保不是空数组
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No historical data found for ${ticker}.`);
  }

  return data;
};