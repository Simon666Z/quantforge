import { BacktestResult, StrategyType, StrategyParams } from '../types';

const API_BASE = 'http://127.0.0.1:8000/v1';

export interface ScreenerResult {
    symbol: string;
    price: number;
    status: "BUY SIGNAL" | "UPTREND" | "NEUTRAL";
    yearlyReturn: number;
    winRate: number;
}

export interface StressTestResult {
    name: string; start: string; end: string; desc: string;
    status: "OK" | "N/A" | "Error";
    return?: number; maxDrawdown?: number; benchmark?: number; reason?: string;
}

// --- NEW: Signal Check Response ---
export interface SignalCheckResult {
    ticker: string;
    date: string;
    price: number;
    signal: "BUY" | "SELL" | "NEUTRAL" | "ERROR";
}

export const runScreener = async (sector: string, strategy: StrategyType, params: StrategyParams): Promise<ScreenerResult[]> => {
    try {
        const response = await fetch(`${API_BASE}/screener`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sector, strategy, params })
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (e) { console.error("Screener Error:", e); return []; }
};

export const runBacktest = async (_ignoredData: any[], strategy: StrategyType, params: StrategyParams, dateRange: { start: string; end: string }, ticker: string, fees: number, slippage: number): Promise<BacktestResult | null> => {
  try {
    const response = await fetch(`${API_BASE}/run-backtest`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, startDate: dateRange.start, endDate: dateRange.end, strategy, params, fees, slippage })
    });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } catch (e: any) { console.error("Backtest Service Error:", e); throw new Error(e.message || "Network Error"); }
};

export const generateStrategyCode = async (ticker: string, strategy: string, params: any, fees: number, slippage: number) => {
    try {
        const response = await fetch(`${API_BASE}/code-gen`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, strategy, params, fees, slippage })
        });
        return await response.json();
    } catch (e) { return null; }
};

export const runStressTest = async (ticker: string, strategy: string, params: any, fees: number, slippage: number): Promise<StressTestResult[]> => {
    try {
        const response = await fetch(`${API_BASE}/run-stress-test`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, startDate: "2020-01-01", endDate: "2020-01-02", strategy, params, fees, slippage })
        });
        return await response.json();
    } catch (e) { return []; }
};

// --- NEW: Real-time Signal Check ---
export const checkRealtimeSignal = async (ticker: string, strategy: StrategyType, params: StrategyParams): Promise<SignalCheckResult> => {
    try {
        const response = await fetch(`${API_BASE}/check-signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, strategy: strategy, params }) // No date needed
        });
        if (!response.ok) return { ticker, date: "", price: 0, signal: "ERROR" };
        return await response.json();
    } catch (e) {
        console.error("Signal Check Error:", e);
        return { ticker, date: "", price: 0, signal: "ERROR" };
    }
};