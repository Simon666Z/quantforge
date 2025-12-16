export interface StockDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
  buySignal?: number;
  sellSignal?: number;
  [key: string]: any;
}

export enum StrategyType {
  SMA_CROSSOVER = 'SMA_CROSSOVER',
  EMA_CROSSOVER = 'EMA_CROSSOVER',
  RSI_REVERSAL = 'RSI_REVERSAL',
  BOLLINGER_BANDS = 'BOLLINGER_BANDS',
  MACD = 'MACD',
  MOMENTUM = 'MOMENTUM',
  TREND_RSI = 'TREND_RSI',
  TURTLE = 'TURTLE',
  VOLATILITY_FILTER = 'VOLATILITY_FILTER',
  KELTNER = 'KELTNER',
}

export interface StrategyParams {
  initialCapital: number;
  shortWindow: number;
  longWindow: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  bbPeriod: number;
  bbStdDev: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  rocPeriod: number;
  trendMa: number;
  turtleEntry: number;
  turtleExit: number;
  adxPeriod: number;
  adxThreshold: number;
  keltnerPeriod: number;
  keltnerMult: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;
  [key: string]: number;
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
    totalReturn: number;
    winRate: number;
    maxDrawdown: number;
    tradeCount: number;
    finalCapital: number;
    initialCapital: number;
    sharpeRatio: number;
  };
}

export interface DiagnosisContent {
  score: number;
  verdict: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  risk_assessment: string;
  market_conditions: string;
  optimization_tips: string[];
  analysis: string;
  suggestion: string;
  key_dates: string[];
  // Additional comprehensive report fields
  strategyExplanation?: string;
  performanceBreakdown?: string;
  riskAssessment?: string;
  marketConditions?: string;
  recommendations?: string[];
}

export interface SavedStrategy {
    id: string | number;
    name: string;
    ticker: string;
    strategy_type: StrategyType;
    params: StrategyParams;
    created_at: string;
    source: 'local' | 'cloud';
}

export interface AIConfig {
    apiKey: string;
    modelName: string;
    language: string;
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
  trendMa: 200,
  turtleEntry: 20,
  turtleExit: 10,
  adxPeriod: 14,
  adxThreshold: 25,
  keltnerPeriod: 20,
  keltnerMult: 2.0,
  stopLoss: 0,
  takeProfit: 0,
  trailingStop: 0,
};