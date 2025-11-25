
export interface StockDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Indicators
  smaShort?: number;
  smaLong?: number;
  emaShort?: number;
  emaLong?: number;
  rsi?: number;
  upperBand?: number;
  lowerBand?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  roc?: number;
  // Visualization
  buySignal?: number;
  sellSignal?: number;
}

export enum StrategyType {
  SMA_CROSSOVER = 'SMA_CROSSOVER',
  EMA_CROSSOVER = 'EMA_CROSSOVER',
  RSI_REVERSAL = 'RSI_REVERSAL',
  BOLLINGER_BANDS = 'BOLLINGER_BANDS',
  MACD = 'MACD',
  MOMENTUM = 'MOMENTUM',
}

export interface StrategyParams {
  // Core
  initialCapital: number;
  // SMA / EMA
  shortWindow: number;
  longWindow: number;
  // RSI
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  // Bollinger
  bbPeriod: number;
  bbStdDev: number;
  // MACD
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  // Momentum
  rocPeriod: number;
}

export interface TradeSignal {
  date: string;
  type: 'BUY' | 'SELL';
  price: number;
  reason: string;
}

export interface BacktestResult {
  data: StockDataPoint[];
  trades: TradeSignal[];
  metrics: {
    totalReturn: number; // Percentage
    winRate: number; // Percentage
    maxDrawdown: number; // Percentage
    tradeCount: number;
    finalCapital: number;
    initialCapital: number;
  };
}

export const DEFAULT_PARAMS: StrategyParams = {
  initialCapital: 10000,
  shortWindow: 20,
  longWindow: 50,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  bbPeriod: 20,
  bbStdDev: 2,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  rocPeriod: 12,
};
