
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

const generateMockData = (ticker: string, days: number): StockDataPoint[] => {
  const data: StockDataPoint[] = [];
  // Deterministic seed based on ticker for consistency in demo
  let seed = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  let price = 150 + (random() * 50); 
  const now = new Date();
  
  // Volatility factor
  const volatility = 0.02; 

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split('T')[0];
    
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
    // Try Real Backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout for search
    
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    // Fallback to local mock list
    console.warn("Backend search failed, using local fallback.", error);
    const lowerQ = query.toLowerCase();
    return MOCK_TICKERS.filter(t => 
      t.symbol.toLowerCase().includes(lowerQ) || 
      t.name.toLowerCase().includes(lowerQ)
    );
  }
};

export const fetchMockStockData = async (ticker: string, days: number = 365, forceMock: boolean = false): Promise<StockDataPoint[]> => {
  if (forceMock) {
    console.log(`[Data Service] Generating mock data for ${ticker} (Simulation Mode)`);
    return generateMockData(ticker, days);
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  try {
    // Try Real Backend
    console.log(`[Data Service] Fetching real data for ${ticker}...`);
    const response = await fetch(
      `${API_BASE_URL}/history?ticker=${encodeURIComponent(ticker)}&start=${startStr}&end=${endStr}`
    );

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();

  } catch (error) {
    console.warn("Backend history failed, generating mock data.", error);
    // Seamless Fallback
    return generateMockData(ticker, days);
  }
};
