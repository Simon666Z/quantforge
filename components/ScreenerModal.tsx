import React, { useState, useEffect } from 'react';
import { X, Search, TrendingUp, ArrowRight, Loader2, Filter, Cpu, Bitcoin, PieChart, Globe, HelpCircle, ChevronDown, ChevronUp, Zap, Target, MousePointer } from 'lucide-react';
import { ScreenerResult, runScreener } from '../services/quantEngine';
import { StrategyType, StrategyParams } from '../types';

interface ScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyType;
  params: StrategyParams;
  onSelectTicker: (ticker: string) => void;
}

// Replace Emojis with Lucide Icons
const SECTORS = [
    { id: "TECH", name: "Big Tech", icon: Cpu },
    { id: "CRYPTO", name: "Crypto", icon: Bitcoin },
    { id: "ETF", name: "Major ETFs", icon: PieChart },
    { id: "CHINA", name: "China ADR", icon: Globe },
];

export const ScreenerModal: React.FC<ScreenerModalProps> = ({ isOpen, onClose, strategy, params, onSelectTicker }) => {
  const [activeSector, setActiveSector] = useState("TECH");
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounting, setIsMounting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setIsMounting(true);
        handleScan(activeSector);
        // Lock body scroll when modal opens
        document.body.style.overflow = 'hidden';
    } else {
        setTimeout(() => setIsMounting(false), 400);
        // Restore body scroll when modal closes
        document.body.style.overflow = '';
    }
    
    // Cleanup on unmount
    return () => {
        document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleScan = async (sector: string) => {
      setActiveSector(sector);
      setLoading(true);
      setResults([]);
      const res = await runScreener(sector, strategy, params);
      setResults(res);
      setLoading(false);
  };

  const handleApply = (ticker: string) => {
      onSelectTicker(ticker);
      onClose();
  };

  if (!isMounting && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      
      <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-400 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      
      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[600px] flex overflow-hidden transform transition-all duration-500 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-12'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        
        {/* Sidebar */}
        <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2 shrink-0">
                <Filter size={20} className="text-sakura-400"/> Screener
            </h3>
            <p className="text-xs text-slate-400 mb-4 shrink-0">Find assets with <strong>active signals</strong> based on your current strategy.</p>
            
            <div className="shrink-0">
            {SECTORS.map(s => {
                const Icon = s.icon;
                return (
                    <button 
                        key={s.id}
                        onClick={() => handleScan(s.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-3 mb-2 ${activeSector === s.id ? 'bg-white shadow-md text-sakura-500 ring-1 ring-sakura-100' : 'text-slate-500 hover:bg-white hover:shadow-sm'}`}
                    >
                        <Icon size={16} /> {s.name}
                    </button>
                );
            })}
            </div>

            {/* Help Section */}
            <div className="pt-4 border-t border-slate-200">
                <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-500 hover:bg-white hover:text-indigo-500 transition-all text-sm font-medium"
                >
                    <span className="flex items-center gap-2">
                        <HelpCircle size={16} />
                        How to use
                    </span>
                    {showHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                <div className={`transition-all duration-300 ${showHelp ? 'opacity-100 mt-3' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="bg-white rounded-xl p-4 space-y-3 text-xs border border-slate-100 shadow-sm">
                        <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-lg bg-sakura-50 text-sakura-500 shrink-0">
                                <Zap size={12} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-700 mb-0.5">What it does</p>
                                <p className="text-slate-500 leading-relaxed">Scans multiple assets to find those with active buy/sell signals based on your current strategy configuration.</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 shrink-0">
                                <Target size={12} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-700 mb-0.5">Sectors</p>
                                <p className="text-slate-500 leading-relaxed">Choose from Big Tech, Crypto, ETFs, or China ADRs. Each sector contains curated popular assets.</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500 shrink-0">
                                <MousePointer size={12} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-700 mb-0.5">Analyze</p>
                                <p className="text-slate-500 leading-relaxed">Click any result card to load that ticker into the main chart and run a full backtest.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h2 className="font-bold text-xl text-slate-800">Scan Results</h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">Strategy: <span className="text-sakura-500 font-bold">{strategy}</span></p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 animate-pulse">
                        <Loader2 size={32} className="animate-spin text-sakura-400"/>
                        <p className="text-sm font-bold tracking-widest">SCANNING MARKET...</p>
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.map((res) => (
                            <div key={res.symbol} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-sakura-200 transition-all group cursor-pointer" onClick={() => handleApply(res.symbol)}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-black text-lg text-slate-700 font-mono">{res.symbol}</h4>
                                        <span className="text-xs font-bold text-slate-400">${res.price.toFixed(2)}</span>
                                    </div>
                                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                                        res.status === "BUY SIGNAL" 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                        : "bg-sky-50 text-sky-600 border-sky-100"
                                    }`}>
                                        <TrendingUp size={10}/> {res.status}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="text-slate-400 mb-0.5">Win Rate</p>
                                        <p className="font-mono font-bold text-slate-600">{res.winRate.toFixed(0)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 mb-0.5">1Y Return</p>
                                        <p className={`font-mono font-bold ${res.yearlyReturn > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {res.yearlyReturn > 0 ? '+' : ''}{res.yearlyReturn.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                                    <span className="text-[10px] font-bold text-sakura-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                        ANALYZE <ArrowRight size={10}/>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Search size={48} className="opacity-20 mb-4"/>
                        <p>No interesting assets found.</p>
                        <p className="text-xs mt-2">Try switching sectors.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};