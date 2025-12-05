import { BacktestResult, StrategyType, StrategyParams } from '../types';

const API_BASE = 'http://127.0.0.1:8000/v1';

export const runBacktest = async (
  _ignoredData: any[], 
  strategy: StrategyType,
  params: StrategyParams,
  dateRange: { start: string; end: string },
  ticker: string,
  fees: number = 0.001,
  slippage: number = 0.001
): Promise<BacktestResult | null> => {
  
  try {
    const response = await fetch(`${API_BASE}/run-backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        startDate: dateRange.start,
        endDate: dateRange.end,
        strategy,
        params,
        fees,
        slippage
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Backtest API Error:", errText);
      throw new Error(`Backtest failed: ${response.statusText}`);
    }

    const json = await response.json();
    return json as BacktestResult;
  } catch (e) {
    console.error("Backtest Service Error:", e);
    return null;
  }
};

export const generateStrategyCode = async (
    ticker: string,
    strategy: string,
    params: any,
    fees: number,
    slippage: number
) => {
    try {
        const response = await fetch(`${API_BASE}/code-gen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, strategy, params, fees, slippage })
        });
        return await response.json();
    } catch (e) {
        console.error(e);
        return null;
    }
};

// --- NEW: Stress Test Service ---
export interface StressTestResult {
    name: string;
    start: string;
    end: string;
    desc: string;
    status: "OK" | "N/A" | "Error";
    return?: number;
    maxDrawdown?: number;
    benchmark?: number;
    reason?: string;
}

export const runStressTest = async (
    ticker: string,
    strategy: string,
    params: any,
    fees: number,
    slippage: number
): Promise<StressTestResult[]> => {
    try {
        const response = await fetch(`${API_BASE}/run-stress-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticker,
                startDate: "2020-01-01", // Dummy date, backend ignores this for stress test
                endDate: "2020-01-02",
                strategy,
                params,
                fees,
                slippage
            })
        });
        return await response.json();
    } catch (e) {
        console.error("Stress Test Error:", e);
        return [];
    }
};