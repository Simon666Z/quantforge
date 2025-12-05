import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StrategyType } from '../types';
import { ChevronRight, X, Sparkles, Activity, TrendingUp, BarChart2, Zap, Layers, Target, Filter, BoxSelect } from 'lucide-react';

interface StrategySelectorProps {
  value: StrategyType;
  onChange: (val: StrategyType) => void;
}

const CATEGORIES = [
  {
    title: "Trend Following",
    color: "text-rose-500",
    strategies: [
      { id: StrategyType.SMA_CROSSOVER, name: "SMA Crossover", desc: "Classic Golden/Death Cross.", icon: TrendingUp },
      { id: StrategyType.EMA_CROSSOVER, name: "EMA Crossover", desc: "Faster reaction trend following.", icon: Activity },
      { id: StrategyType.TURTLE, name: "Turtle Trading", desc: "Donchian breakout. Catch big waves.", icon: Target },
    ]
  },
  {
    title: "Mean Reversion",
    color: "text-emerald-500",
    strategies: [
      { id: StrategyType.RSI_REVERSAL, name: "RSI Reversion", desc: "Buy oversold, sell overbought.", icon: Zap },
      { id: StrategyType.BOLLINGER_BANDS, name: "Bollinger Bands", desc: "Trade volatility extremes.", icon: BarChart2 },
    ]
  },
  {
    title: "Smart Filters & Breakouts",
    color: "text-indigo-500",
    strategies: [
      { id: StrategyType.TREND_RSI, name: "Trend + RSI", desc: "Double confirm: Trend Up + RSI Dip.", icon: Layers },
      { id: StrategyType.VOLATILITY_FILTER, name: "Volatility Filter", desc: "ADX Filtered MA Cross. Avoid chop.", icon: Filter },
      { id: StrategyType.KELTNER, name: "Keltner Channel", desc: "ATR based breakout trading.", icon: BoxSelect },
    ]
  },
  {
    title: "Momentum",
    color: "text-amber-500",
    strategies: [
      { id: StrategyType.MACD, name: "MACD", desc: "Momentum oscillator crossovers.", icon: Sparkles },
      { id: StrategyType.MOMENTUM, name: "Rate of Change", desc: "Pure price acceleration.", icon: Activity },
    ]
  }
];

const getActiveInfo = (id: StrategyType) => {
  for (const cat of CATEGORIES) {
    const found = cat.strategies.find(s => s.id === id);
    if (found) return found;
  }
  return CATEGORIES[0].strategies[0];
};

export const StrategySelector: React.FC<StrategySelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const activeInfo = getActiveInfo(value);

  const handleSelect = (id: StrategyType) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(true)}
        className="relative w-full pl-4 pr-10 py-3 rounded-xl border border-sakura-200 bg-white cursor-pointer 
                   shadow-sm hover:shadow-lg hover:border-sakura-400 hover:scale-[1.02] active:scale-[0.98]
                   transition-all duration-300 ease-out group"
      >
        <div className="flex flex-col items-start gap-1">
          <span className="text-[10px] font-bold text-sakura-400 uppercase tracking-widest">Selected Model</span>
          <span className="font-bold text-slate-700 flex items-center gap-2 truncate w-full">
            {activeInfo.name}
          </span>
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-sakura-400 transition-colors duration-300 group-hover:translate-x-1">
          <ChevronRight size={20} />
        </div>
      </div>

      {/* Side Menu Portal */}
      {mounted && createPortal(
        <div className={`fixed inset-0 z-[9999] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <div 
            className={`absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsOpen(false)}
          />

          <div 
            className={`absolute top-0 left-0 h-full w-full max-w-[340px] bg-white shadow-2xl flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
                isOpen ? 'translate-x-0' : '-translate-x-full' // Changed from right-0/translate-x-full
            }`}
          >
            {/* Header - Gradient adjusted to-right */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-sakura-50/50 to-white">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Sparkles className="text-sakura-400 animate-spin-slow" size={18} />
                Select Strategy
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors active:scale-90">
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {CATEGORIES.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest px-1 ${cat.color}`}>{cat.title}</h4>
                  <div className="space-y-2">
                    {cat.strategies.map((strategy) => {
                      const isActive = strategy.id === value;
                      const Icon = strategy.icon;
                      return (
                        <button
                          key={strategy.id}
                          onClick={() => handleSelect(strategy.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group relative overflow-hidden active:scale-[0.98] flex items-center gap-3 ${
                            isActive 
                              ? 'border-sakura-300 bg-sakura-50/80 shadow-md scale-[1.01]' 
                              : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                        >
                          <div className={`p-2 rounded-lg bg-white shadow-sm ${isActive ? 'text-sakura-500' : 'text-slate-400 group-hover:text-slate-600'}`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${isActive ? 'text-sakura-700' : 'text-slate-700'}`}>{strategy.name}</div>
                            <div className="text-[10px] text-slate-400 leading-tight opacity-80">{strategy.desc}</div>
                          </div>
                          {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sakura-400"></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};