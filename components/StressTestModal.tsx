import React, { useState, useEffect } from 'react';
import { X, Zap, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import { StressTestResult } from '../services/quantEngine';

interface StressTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: StressTestResult[] | null;
  loading: boolean;
  ticker: string;
}

const ScenarioCard = ({ data }: { data: StressTestResult }) => {
  if (data.status !== "OK") {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 opacity-60 flex flex-col justify-between h-full min-h-[140px]">
        <div>
            <h4 className="font-bold text-slate-500 text-sm mb-1">{data.name}</h4>
            <p className="text-xs text-slate-400">{data.start.split('-')[0]} - {data.end.split('-')[0]}</p>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono bg-slate-100 px-2 py-1 rounded self-start">
            <AlertTriangle size={12}/> {data.reason || "Data Unavailable"}
        </div>
      </div>
    );
  }

  const isPositive = (data.return || 0) > 0;
  const beatBenchmark = (data.return || 0) > (data.benchmark || 0);
  
  return (
    <div className={`relative rounded-xl p-5 border flex flex-col justify-between h-full min-h-[160px] transition-all hover:scale-[1.02] shadow-sm ${
        beatBenchmark 
        ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-emerald-100' 
        : 'bg-white border-slate-200'
    }`}>
        {beatBenchmark && (
            <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                <Zap size={10} fill="currentColor"/> BEAT MARKET
            </div>
        )}

        <div>
            <h4 className="font-bold text-slate-700 text-sm mb-0.5">{data.name}</h4>
            <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                <Calendar size={10}/> {data.start} ~ {data.end}
            </p>
            <p className="text-xs text-slate-500 mt-2 leading-tight">{data.desc}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Return</p>
                <p className={`text-lg font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {data.return?.toFixed(1)}%
                </p>
            </div>
            <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Drawdown</p>
                <p className="text-lg font-mono font-bold text-rose-500">
                    {data.maxDrawdown?.toFixed(1)}%
                </p>
            </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px]">
            <span className="text-slate-400">Buy & Hold: <span className={(data.benchmark || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}>{(data.benchmark || 0).toFixed(1)}%</span></span>
        </div>
    </div>
  );
};

export const StressTestModal: React.FC<StressTestModalProps> = ({ isOpen, onClose, results, loading, ticker }) => {
  const [isMounting, setIsMounting] = useState(false);

  useEffect(() => {
    if (isOpen) setIsMounting(true);
    else setTimeout(() => setIsMounting(false), 400); 
  }, [isOpen]);

  if (!isMounting && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-400 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col relative border border-white/50 ring-1 ring-black/5 overflow-hidden transform transition-all duration-500 ${
            isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-12'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-rose-50 via-white to-white shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm">
                <AlertTriangle size={20} />
             </div>
             <div>
                <h3 className="font-bold text-xl text-slate-800">Stress Test Analysis</h3>
                <p className="text-xs text-slate-500">Historical crisis simulation for <span className="font-mono font-bold text-rose-500">{ticker}</span></p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400 animate-pulse">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-rose-400 animate-spin"></div>
                    <p className="text-sm font-bold tracking-widest">CRUNCHING HISTORY...</p>
                </div>
            ) : results ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((res, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                            <ScenarioCard data={res} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-slate-400 py-10">No results available.</div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white text-xs text-slate-400 text-center shrink-0">
           Past performance in crises does not guarantee future survival. Always set a Stop Loss.
        </div>
      </div>
    </div>
  );
};