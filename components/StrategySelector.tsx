import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StrategyType } from '../types';
import { ChevronRight, X, Sparkles, Activity, TrendingUp, BarChart2, Zap } from 'lucide-react';

interface StrategySelectorProps {
  value: StrategyType;
  onChange: (val: StrategyType) => void;
}

const STRATEGIES = [
  {
    id: StrategyType.SMA_CROSSOVER,
    name: "SMA Crossover",
    desc: "Simple Moving Average. Classic trend following. Buys when short-term line crosses above long-term.",
    icon: TrendingUp,
    color: "text-rose-500 bg-rose-50"
  },
  {
    id: StrategyType.EMA_CROSSOVER,
    name: "EMA Crossover",
    desc: "Exponential MA. Reacts faster to recent price changes than SMA. Good for volatile markets.",
    icon: Activity,
    color: "text-sky-500 bg-sky-50"
  },
  {
    id: StrategyType.RSI_REVERSAL,
    name: "RSI Mean Reversion",
    desc: "Relative Strength Index. Buys when oversold (<30) and sells when overbought (>70).",
    icon: Zap,
    color: "text-amber-500 bg-amber-50"
  },
  {
    id: StrategyType.BOLLINGER_BANDS,
    name: "Bollinger Bands",
    desc: "Volatility based. Buys at lower band support, sells at upper band resistance.",
    icon: BarChart2,
    color: "text-emerald-500 bg-emerald-50"
  },
  {
    id: StrategyType.MACD,
    name: "MACD Momentum",
    desc: "Moving Average Convergence Divergence. Triggers on signal line crossovers.",
    icon: Sparkles,
    color: "text-purple-500 bg-purple-50"
  },
  {
    id: StrategyType.MOMENTUM,
    name: "Rate of Change (ROC)",
    desc: "Pure momentum. Buys when price accelerates upwards, sells when momentum fades.",
    icon: Activity,
    color: "text-indigo-500 bg-indigo-50"
  },
];

export const StrategySelector: React.FC<StrategySelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeStrategy = STRATEGIES.find(s => s.id === value) || STRATEGIES[0];

  const handleSelect = (id: StrategyType) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* 1. 触发按钮 - Q弹效果 */}
      <div 
        onClick={() => setIsOpen(true)}
        className="btn-bouncy group relative w-full pl-4 pr-10 py-3 rounded-xl border border-sakura-200 bg-white cursor-pointer hover:border-sakura-400 hover:shadow-lg hover:shadow-sakura-100/50"
      >
        <div className="flex flex-col items-start gap-1">
          <span className="text-[10px] font-bold text-sakura-400 uppercase tracking-widest">Selected Model</span>
          <span className="font-bold text-slate-700 flex items-center gap-2 truncate w-full">
            {activeStrategy.name}
          </span>
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-sakura-400 transition-colors duration-300 group-hover:translate-x-1">
          <ChevronRight size={20} />
        </div>
      </div>

      {/* 2. Portal 渲染侧滑菜单 */}
      {mounted && createPortal(
        <div className={`fixed inset-0 z-[9999] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          
          <div 
            className={`absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
              isOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setIsOpen(false)}
          />

          <div 
            className={`absolute top-0 left-0 h-full w-full max-w-[340px] bg-white shadow-2xl flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-sakura-50/50 to-white">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Sparkles className="text-sakura-400 animate-spin-slow" size={18} />
                Select Strategy
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="btn-bouncy p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {STRATEGIES.map((strategy) => {
                const isActive = strategy.id === value;
                const Icon = strategy.icon;
                
                return (
                  <button
                    key={strategy.id}
                    onClick={() => handleSelect(strategy.id)}
                    className={`btn-bouncy w-full text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                      isActive 
                        ? 'border-sakura-300 bg-sakura-50/80 shadow-md scale-[1.02]' 
                        : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3 relative z-10">
                      <div className={`p-2 rounded-lg transition-transform duration-300 group-hover:scale-110 ${strategy.color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm ${isActive ? 'text-sakura-700' : 'text-slate-700'}`}>
                          {strategy.name}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed opacity-80">
                          {strategy.desc}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                       <div className="absolute right-0 top-0 bottom-0 w-1 bg-sakura-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                 <span className="text-[10px] uppercase font-bold text-slate-300 tracking-widest">QuantForge v1.0</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};