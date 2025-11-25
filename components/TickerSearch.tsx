import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Building2, Globe } from 'lucide-react';
import { searchTickersReal, SearchResult } from '../services/apiService';
import { Label } from './UI';

interface TickerSearchProps {
  value: string;
  onCommit: (ticker: string) => void;
}

export const TickerSearch: React.FC<TickerSearchProps> = ({ value, onCommit }) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外部变更同步
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // 防抖搜索 API
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1 && showSuggestions) {
        setLoading(true);
        try {
          const results = await searchTickersReal(query);
          setSuggestions(results);
        } catch (e) {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SearchResult) => {
    setQuery(item.symbol);
    setShowSuggestions(false);
    // 核心：选中即提交
    onCommit(item.symbol); 
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      // 核心：回车即提交
      onCommit(query.toUpperCase()); 
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <Label>Asset Symbol</Label>
      <div className="relative group">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.toUpperCase());
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search (e.g. NVDA, BTC-USD)..."
          className="w-full pl-10 pr-16 py-3 rounded-xl border border-sakura-200 focus:border-sakura-400 focus:ring-4 focus:ring-sakura-50 outline-none transition-all text-slate-700 bg-white/80 backdrop-blur-sm font-mono tracking-wider shadow-sm uppercase font-bold"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sakura-300 transition-colors group-focus-within:text-sakura-500" size={18} />
        
        {/* 优雅的键盘快捷键提示 */}
        {query.length > 0 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md pointer-events-none font-bold border border-slate-200">
                ENTER
            </div>
        )}
      </div>

      {showSuggestions && query.length > 1 && (
        <div className="absolute z-50 left-0 top-full mt-2 w-full max-h-80 overflow-y-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-sakura-100/50 border border-white ring-1 ring-sakura-100 animate-in fade-in slide-in-from-top-2 custom-scrollbar">
          {loading ? (
            <div className="p-4 flex items-center justify-center text-sakura-300">
              <Loader2 className="animate-spin" size={20} />
            </div>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((s) => (
                <li 
                  key={s.symbol}
                  onClick={() => handleSelect(s)}
                  className="px-4 py-3 hover:bg-sakura-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        {s.type === 'EQUITY' ? <Building2 size={14}/> : <Globe size={14}/>}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-700 group-hover:text-sakura-600 font-mono truncate">
                        {s.symbol}
                      </span>
                      <span className="text-xs text-slate-400 truncate max-w-[180px]">{s.name}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {s.exchange || 'US'}
                     </span>
                     <span className="text-[10px] text-slate-300">{s.type}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-xs text-center text-slate-400">No results found.</div>
          )}
        </div>
      )}
    </div>
  );
};