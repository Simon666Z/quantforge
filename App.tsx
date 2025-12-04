import React, { useState, useEffect, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { ResultsView } from './components/ResultsView';
import { ChatInterface } from './components/ChatInterface';
import { StrategyType, StrategyParams, DEFAULT_PARAMS, StockDataPoint, BacktestResult } from './types';
import { fetchMarketData } from './services/apiService';
import { runBacktest } from './services/quantEngine';
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const [ticker, setTicker] = useState<string>('NVDA');
  const [startDate, setStartDate] = useState<string>(formatDate(oneYearAgo));
  const [endDate, setEndDate] = useState<string>(formatDate(today));
  
  const [strategy, setStrategy] = useState<StrategyType>(StrategyType.SMA_CROSSOVER);
  const [params, setParams] = useState<StrategyParams>(DEFAULT_PARAMS);
  
  const [rawData, setRawData] = useState<StockDataPoint[] | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchData = useCallback(async (symbolOverride?: string) => {
    const activeTicker = symbolOverride || ticker;
    if (!activeTicker) return;

    setLoading(true);
    setError(null);
    setRawData(null);
    setResult(null);

    try {
      console.log(`Fetching real data for: ${activeTicker}`);
      const startObj = new Date(startDate);
      startObj.setDate(startObj.getDate() - 150); 
      const bufferStartDate = formatDate(startObj);
      
      const data = await fetchMarketData(activeTicker, bufferStartDate, endDate);

      if (!data || data.length === 0) {
        throw new Error("Received empty data from API.");
      }

      setRawData(data);
      
    } catch (err: any) {
      console.error("App Fetch Error:", err);
      setError(err.message || "Failed to load market data.");
      setRawData(null);
    } finally {
      setLoading(false);
    }
  }, [ticker, startDate, endDate]);

  const handleTickerCommit = (newTicker: string) => {
    setTicker(newTicker);
    handleFetchData(newTicker);
  };

  useEffect(() => {
    if (rawData && rawData.length > 0) {
      const backtestResult = runBacktest(
        rawData, 
        strategy, 
        params, 
        { start: startDate, end: endDate }
      );
      setResult(backtestResult);
    } else {
      setResult(null);
    }
  }, [rawData, strategy, params, startDate, endDate]);

  useEffect(() => {
    handleFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAIStrategyApply = (newStrat: StrategyType, newParams: StrategyParams) => {
    setStrategy(newStrat);
    setParams(newParams);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-slate-850 bg-[#fffbf0]">
      <header className="max-w-7xl mx-auto mb-8 flex items-center gap-4">
        <div className="w-10 h-10 bg-sakura-400 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-sakura-200">
          🌸
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-700 tracking-tight">QuantForge</h1>
          <p className="text-sm text-slate-400">Beginner Friendly Quantitative Backtesting</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           {/* 1. 位置互换：ChatInterface 放到最上面 */}
           <ChatInterface onApplyStrategy={handleAIStrategyApply} />

           {/* ConfigPanel 放到下面 */}
           <ConfigPanel 
             ticker={ticker}
             onTickerCommit={handleTickerCommit}
             strategy={strategy}
             setStrategy={setStrategy}
             params={params}
             setParams={setParams}
             startDate={startDate}
             setStartDate={setStartDate}
             endDate={endDate}
             setEndDate={setEndDate}
             onRun={() => handleFetchData()}
           />
        </div>

        {/* Visualization Panel */}
        <div className="lg:col-span-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="h-[500px] flex items-center justify-center flex-col gap-4 text-sakura-400 animate-pulse bg-white/50 rounded-3xl border border-sakura-100 shadow-inner">
              <div className="text-5xl animate-bounce">🌸</div>
              <p className="text-slate-400 font-medium font-mono tracking-wider">
                FETCHING MARKET DATA...
              </p>
            </div>
          ) : (
            <ResultsView 
              key={ticker} 
              result={result} 
              strategyType={strategy}
            />
          )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 py-6 border-t border-sakura-100 text-center text-slate-400 text-xs">
        <p>
          Powered by <span className="font-bold text-sakura-500">Yahoo Finance</span> & <span className="font-bold text-sky-500">FastAPI</span>
        </p>
      </footer>
    </div>
  );
};

export default App;