import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Activity, Shield, Zap, BarChart3, Check, Loader2, Book, Cloud, HardDrive } from 'lucide-react';
import { StrategyType, StrategyParams, BacktestResult, DEFAULT_PARAMS, SavedStrategy } from '../types';
import { runBacktest } from '../services/quantEngine';

interface ComparisonItem {
  id: string;
  name: string;
  strategy: StrategyType;
  params: StrategyParams;
  ticker: string;
  result: BacktestResult | null;
  loading: boolean;
  color: string;
  source?: 'current' | 'local' | 'cloud';
  savedStrategy: SavedStrategy | null;
}

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  startDate: string;
  endDate: string;
  fees: number;
  slippage: number;
  currentStrategy: StrategyType;
  currentParams: StrategyParams;
  currentResult: BacktestResult | null;
  currentUser: string | null;
}

const COLORS = ['bg-sakura-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];
const API_BASE = 'http://127.0.0.1:8000/api';

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  ticker,
  startDate,
  endDate,
  fees,
  slippage,
  currentStrategy,
  currentParams,
  currentResult,
  currentUser
}) => {
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [libraryStrategies, setLibraryStrategies] = useState<SavedStrategy[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Load library strategies when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLibraryStrategies();
    }
  }, [isOpen, currentUser]);

  const loadLibraryStrategies = async () => {
    setLoadingLibrary(true);
    const strategies: SavedStrategy[] = [];
    
    // Load local strategies
    const locals = JSON.parse(localStorage.getItem('local_strategies') || '[]');
    strategies.push(...locals.map((s: any) => {
      const rawParams = typeof s.params === 'string' ? JSON.parse(s.params) : s.params;
      return { 
        ...s, 
        source: 'local' as const,
        params: { ...DEFAULT_PARAMS, ...rawParams }
      };
    }));
    
    // Load cloud strategies if user is logged in
    if (currentUser) {
      try {
        const res = await fetch(`${API_BASE}/library/list?username=${currentUser}`);
        const cloudData = await res.json();
        strategies.push(...cloudData.map((s: any) => {
          const rawParams = typeof s.params === 'string' ? JSON.parse(s.params) : s.params;
          return { 
            ...s, 
            source: 'cloud' as const,
            params: { ...DEFAULT_PARAMS, ...rawParams }
          };
        }));
      } catch (e) {
        console.error('Failed to load cloud strategies:', e);
      }
    }
    
    setLibraryStrategies(strategies);
    setLoadingLibrary(false);
  };

  // Initialize with current strategy when modal opens
  useEffect(() => {
    if (isOpen && items.length === 0 && currentResult) {
      setItems([{
        id: 'current',
        name: 'Current Strategy',
        strategy: currentStrategy,
        params: currentParams,
        ticker: ticker,
        result: currentResult,
        loading: false,
        color: COLORS[0],
        source: 'current',
        savedStrategy: null
      }]);
    }
  }, [isOpen, currentStrategy, currentParams, currentResult, ticker]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setShowAddMenu(false);
    }
  }, [isOpen]);

  const addLibraryStrategy = async (savedStrategy: SavedStrategy) => {
    setShowAddMenu(false);
    const newId = `lib-${savedStrategy.id}`;
    const colorIndex = items.length % COLORS.length;
    
    // Ensure params is properly parsed and merged with defaults
    const rawParams = typeof savedStrategy.params === 'string' 
      ? JSON.parse(savedStrategy.params) 
      : savedStrategy.params;
    const parsedParams = { ...DEFAULT_PARAMS, ...rawParams };
    
    const newItem: ComparisonItem = {
      id: newId,
      name: savedStrategy.name,
      strategy: savedStrategy.strategy_type,
      params: parsedParams,
      ticker: savedStrategy.ticker,
      result: null,
      loading: true,
      color: COLORS[colorIndex],
      source: savedStrategy.source,
      savedStrategy: savedStrategy
    };
    
    setItems(prev => [...prev, newItem]);

    try {
      // Run backtest with the saved strategy's parameters but current date range
      console.log('Running backtest for:', savedStrategy.name, savedStrategy.ticker, parsedParams);
      const result = await runBacktest(
        [], 
        savedStrategy.strategy_type, 
        parsedParams, 
        { start: startDate, end: endDate }, 
        savedStrategy.ticker, 
        fees / 100, 
        slippage / 100
      );
      console.log('Backtest result:', result);
      setItems(prev => prev.map(item => 
        item.id === newId ? { ...item, result, loading: false } : item
      ));
    } catch (error) {
      console.error('Backtest error for', savedStrategy.name, ':', error);
      setItems(prev => prev.map(item => 
        item.id === newId ? { ...item, loading: false } : item
      ));
    }
  };

  const retryBacktest = async (item: ComparisonItem) => {
    if (!item.savedStrategy) return;
    
    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, loading: true } : i
    ));
    
    try {
      const result = await runBacktest(
        [], 
        item.strategy, 
        item.params, 
        { start: startDate, end: endDate }, 
        item.ticker, 
        fees / 100, 
        slippage / 100
      );
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, result, loading: false } : i
      ));
    } catch (error) {
      console.error('Retry backtest error:', error);
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, loading: false } : i
      ));
    }
  };

  const removeStrategy = (id: string) => {
    if (id === 'current') return; // Don't remove current strategy
    setItems(prev => prev.filter(item => item.id !== id));
  };

  if (!isOpen) return null;

  const sortedByReturn = [...items]
    .filter(i => i.result)
    .sort((a, b) => (b.result?.metrics.totalReturn || 0) - (a.result?.metrics.totalReturn || 0));

  const bestReturn = sortedByReturn[0]?.id;
  const bestSharpe = [...items]
    .filter(i => i.result)
    .sort((a, b) => (b.result?.metrics.sharpeRatio || 0) - (a.result?.metrics.sharpeRatio || 0))[0]?.id;
  const lowestDrawdown = [...items]
    .filter(i => i.result)
    .sort((a, b) => (a.result?.metrics.maxDrawdown || 100) - (b.result?.metrics.maxDrawdown || 100))[0]?.id;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <BarChart3 size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Strategy Comparison</h2>
              <p className="text-sm text-slate-500">{ticker} • {startDate} to {endDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-colors" title="Close">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Strategy Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {items.map((item, index) => {
              const isProfit = (item.result?.metrics.totalReturn || 0) >= 0;
              const colorIndex = index % COLORS.length;
              
              return (
                <div 
                  key={item.id}
                  className={`relative p-5 rounded-2xl border-2 transition-all ${
                    item.id === 'current' 
                      ? 'border-indigo-300 bg-indigo-50/50' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Remove Button */}
                  {item.id !== 'current' && (
                    <button 
                      onClick={() => removeStrategy(item.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-rose-100 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Remove strategy"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-3 h-10 rounded-full ${COLORS[colorIndex]}`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{item.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{item.ticker}</span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-400">{item.strategy.replace(/_/g, ' ')}</span>
                        {item.source === 'current' && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-bold rounded uppercase">Active</span>
                        )}
                        {item.source === 'local' && (
                          <HardDrive size={10} className="text-slate-400" />
                        )}
                        {item.source === 'cloud' && (
                          <Cloud size={10} className="text-sky-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {item.loading ? (
                    <div className="h-32 flex items-center justify-center">
                      <Loader2 size={32} className="animate-spin text-slate-300" />
                    </div>
                  ) : item.result ? (
                    <div className="space-y-3">
                      {/* Total Return */}
                      <div className={`p-3 rounded-xl ${isProfit ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500 uppercase">Return</span>
                          {bestReturn === item.id && (
                            <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded uppercase">Best</span>
                          )}
                        </div>
                        <div className={`text-2xl font-mono font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isProfit ? '+' : ''}{item.result.metrics.totalReturn.toFixed(2)}%
                        </div>
                      </div>

                      {/* Metrics Row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Sharpe</span>
                            {bestSharpe === item.id && (
                              <span className="px-1 py-0.5 bg-sky-500 text-white text-[8px] font-black rounded">★</span>
                            )}
                          </div>
                          <div className="text-lg font-mono font-bold text-slate-700">
                            {item.result.metrics.sharpeRatio.toFixed(2)}
                          </div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Drawdown</span>
                            {lowestDrawdown === item.id && (
                              <span className="px-1 py-0.5 bg-violet-500 text-white text-[8px] font-black rounded">★</span>
                            )}
                          </div>
                          <div className="text-lg font-mono font-bold text-rose-500">
                            -{item.result.metrics.maxDrawdown.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Additional Metrics */}
                      <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Final</span>
                          <span className="font-mono font-bold text-slate-700">
                            ${Math.round(item.result.metrics.finalCapital).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Trades</span>
                          <span className="font-mono font-bold text-slate-700">
                            {item.result.metrics.tradeCount}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Pos. Time</span>
                          <span className="font-mono font-bold text-emerald-600">
                            {item.result.metrics.winRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <span>No data</span>
                      {item.savedStrategy && (
                        <button 
                          onClick={() => retryBacktest(item)}
                          className="px-3 py-1 text-xs bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Strategy Card */}
            {items.length < 6 && (
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="w-full h-full min-h-[200px] p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-indigo-500"
                >
                  <Plus size={32} />
                  <span className="font-bold">Add Strategy</span>
                </button>

                {/* Dropdown Menu */}
                {showAddMenu && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-10 overflow-hidden">
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {loadingLibrary ? (
                        <div className="px-4 py-3 text-sm text-slate-400 text-center">
                          Loading strategies...
                        </div>
                      ) : libraryStrategies.filter(s => !items.some(i => i.savedStrategy?.id === s.id)).length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400 text-center">
                          No strategies available. Save some strategies to your library first.
                        </div>
                      ) : (
                        libraryStrategies.filter(s => !items.some(i => i.savedStrategy?.id === s.id)).map(saved => (
                          <button
                            key={saved.id}
                            onClick={() => addLibraryStrategy(saved)}
                            className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-sm text-slate-700 hover:text-indigo-600">{saved.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                              <span className="font-mono">{saved.ticker}</span>
                              <span>•</span>
                              <span>{saved.strategy_type.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span className={saved.source === 'cloud' ? 'text-sky-500' : 'text-emerald-500'}>
                                {saved.source === 'cloud' ? '☁️' : '💾'}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparison Table */}
          {items.filter(i => i.result).length >= 2 && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" />
                Performance Ranking
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Rank</th>
                      <th className="pb-3 pr-4">Strategy</th>
                      <th className="pb-3 pr-4 text-right">Return</th>
                      <th className="pb-3 pr-4 text-right">Sharpe</th>
                      <th className="pb-3 pr-4 text-right">Max DD</th>
                      <th className="pb-3 pr-4 text-right">Pos. Time</th>
                      <th className="pb-3 pr-4 text-right">Trades</th>
                      <th className="pb-3 text-right">Final Capital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByReturn.map((item, index) => {
                      const isProfit = (item.result?.metrics.totalReturn || 0) >= 0;
                      return (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className="py-3 pr-4">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-amber-100 text-amber-600' :
                              index === 1 ? 'bg-slate-200 text-slate-600' :
                              index === 2 ? 'bg-orange-100 text-orange-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-6 rounded-full ${item.color}`} />
                              <div>
                                <span className="font-bold text-slate-700">{item.name}</span>
                                <span className="text-xs text-slate-400 ml-2 font-mono">{item.ticker}</span>
                              </div>
                              {item.id === 'current' && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[9px] font-bold rounded">Current</span>
                              )}
                            </div>
                          </td>
                          <td className={`py-3 pr-4 text-right font-mono font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isProfit ? '+' : ''}{item.result?.metrics.totalReturn.toFixed(2)}%
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-slate-700">
                            {item.result?.metrics.sharpeRatio.toFixed(2)}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-rose-500">
                            -{item.result?.metrics.maxDrawdown.toFixed(1)}%
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-emerald-600">
                            {item.result?.metrics.winRate.toFixed(1)}%
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-slate-700">
                            {item.result?.metrics.tradeCount}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-800">
                            ${Math.round(item.result?.metrics.finalCapital || 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <p className="text-sm text-slate-500">
            Compare up to 6 strategies • Click "Add Strategy" to add more
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
