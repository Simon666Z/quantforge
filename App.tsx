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

  /**
   * 核心获取数据函数
   * @param symbolOverride (可选) 传入此参数以确保使用最新的 ticker，而不是等待 state 更新
   */
  const handleFetchData = useCallback(async (symbolOverride?: string) => {
    const activeTicker = symbolOverride || ticker;
    if (!activeTicker) return;

    // 1. 状态重置：在加载前清空旧数据，防止误导
    setLoading(true);
    setError(null);
    setRawData(null);
    setResult(null);

    try {
      console.log(`Fetching real data for: ${activeTicker}`);

      // 2. 计算预热时间 (往前推 150 天，确保均线能计算出来)
      const startObj = new Date(startDate);
      startObj.setDate(startObj.getDate() - 150); 
      const bufferStartDate = formatDate(startObj);
      
      // 3. 请求后端
      const data = await fetchMarketData(activeTicker, bufferStartDate, endDate);

      // 4. 校验
      if (!data || data.length === 0) {
        throw new Error("Received empty data from API.");
      }

      setRawData(data);
      
    } catch (err: any) {
      console.error("App Fetch Error:", err);
      setError(err.message || "Failed to load market data.");
      setRawData(null); // 确保出错时没有残留数据
    } finally {
      setLoading(false);
    }
  }, [ticker, startDate, endDate]);

  // 当 ticker 从搜索组件提交变更时触发
  const handleTickerCommit = (newTicker: string) => {
    setTicker(newTicker);
    // 立即使用新 ticker 请求，不等待下一次 render
    handleFetchData(newTicker);
  };

  // 自动运行回测：当数据(rawData)或策略参数变化时触发
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

  // 初始加载
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
          <h1 className="text-2xl font-bold text-slate-700 tracking-tight">Speculus</h1>
          <p className="text-sm text-slate-400">Beginner Friendly Quantitative Backtesting</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <ConfigPanel 
             ticker={ticker}
             onTickerCommit={handleTickerCommit} // 传递新的回调
             strategy={strategy}
             setStrategy={setStrategy}
             params={params}
             setParams={setParams}
             startDate={startDate}
             setStartDate={setStartDate}
             endDate={endDate}
             setEndDate={setEndDate}
             onRun={() => handleFetchData()} // 用于手动刷新
           />
           <ChatInterface onApplyStrategy={handleAIStrategyApply} />
        </div>

        {/* Visualization Panel */}
        <div className="lg:col-span-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="h-[500px] flex items-center justify-center flex-col gap-4 text-sakura-400 animate-pulse bg-white/50 rounded-3xl border border-sakura-100 shadow-inner">
              <div className="text-5xl animate-bounce">🌸</div>
              <p className="text-slate-400 font-medium font-mono tracking-wider">
                FETCHING MARKET DATA...
              </p>
            </div>
          ) : (
            /* Results View (Key ensures full re-render on ticker change) */
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