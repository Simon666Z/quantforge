import { StockDataPoint } from '../types';

// Assuming the Python backend runs on localhost:8000
const API_BASE_URL = 'http://localhost:8000/api';

interface TickerResult {
  symbol: string;
  name: string;
  type: string;
}

// --- Fallback Mock Data Generators ---

const MOCK_TICKERS: TickerResult[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'Equity' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Equity' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Equity' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Equity' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'Equity' },
  { symbol: 'BTC-USD', name: 'Bitcoin USD', type: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', type: 'Crypto' },
  { symbol: 'SAKURA', name: 'Sakura Quant Demo', type: 'Index' },
];

// Helper to parse "YYYY-MM-DD" safely
const parseDate = (str: string) => {
  const parts = str.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

// 核心修复：接受 startStr 和 endStr，而不是 days
const generateMockData = (ticker: string, startStr: string, endStr: string): StockDataPoint[] => {
  const data: StockDataPoint[] = [];
  
  // Deterministic seed based on ticker
  let seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const startDate = parseDate(startStr);
  const endDate = parseDate(endStr);
  
  // Base price simulation
  let price = 150 + (random() * 50); 
  const volatility = 0.02; 

  const current = new Date(startDate);

  // 循环直到当前日期超过结束日期
  while (current <= endDate) {
    // Skip weekends
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = current.toISOString().split('T')[0];
      
      const changePercent = (random() - 0.5) * 2 * volatility;
      const change = price * changePercent;
      
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + (price * random() * 0.015);
      const low = Math.min(open, close) - (price * random() * 0.015);
      const volume = Math.floor(random() * 1000000) + 500000;
      
      price = close;

      data.push({
        date: dateStr,
        open,
        high,
        low,
        close,
        volume
      });
    }
    // Increment day
    current.setDate(current.getDate() + 1);
  }
  return data;
};

// --- Main Services ---

export const searchTickers = async (query: string, forceMock: boolean = false): Promise<TickerResult[]> => {
  if (!query) return [];
  
  if (forceMock) {
    const lowerQ = query.toLowerCase();
    return MOCK_TICKERS.filter(t => 
      t.symbol.toLowerCase().includes(lowerQ) || 
      t.name.toLowerCase().includes(lowerQ)
    );
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); 
    
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.warn("Backend search failed, using local fallback.", error);
    const lowerQ = query.toLowerCase();
    return MOCK_TICKERS.filter(t => 
      t.symbol.toLowerCase().includes(lowerQ) || 
      t.name.toLowerCase().includes(lowerQ)
    );
  }
};

// 修复：参数签名改为接受具体的 start/end 日期字符串
export const fetchMockStockData = async (
  ticker: string, 
  startStr: string, 
  endStr: string, 
  forceMock: boolean = false
): Promise<StockDataPoint[]> => {
  
  if (forceMock) {
    console.log(`[Data Service] Generating mock data for ${ticker} from ${startStr} to ${endStr}`);
    return generateMockData(ticker, startStr, endStr);
  }

  try {
    console.log(`[Data Service] Fetching real data for ${ticker}...`);
    const response = await fetch(
      `${API_BASE_URL}/history?ticker=${encodeURIComponent(ticker)}&start=${startStr}&end=${endStr}`
    );

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();

  } catch (error) {
    console.warn("Backend history failed, generating mock data.", error);
    // 关键修复：当后端失败时，使用传入的具体日期生成 Mock 数据
    return generateMockData(ticker, startStr, endStr);
  }
};