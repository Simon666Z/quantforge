import React from 'react';
import { TickerSearch } from './TickerSearch';
import { DatePicker } from './DatePicker';
import { Card } from './UI';
import { History } from 'lucide-react';

interface MarketBarProps {
  ticker: string;
  onTickerCommit: (ticker: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
}

const DateQuickSelect = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-100 text-slate-400 rounded-lg hover:bg-sakura-50 hover:text-sakura-500 hover:border-sakura-200 shadow-sm transition-all active:scale-95"
  >
    {label}
  </button>
);

export const MarketBar: React.FC<MarketBarProps> = ({
  ticker, onTickerCommit, startDate, setStartDate, endDate, setEndDate
}) => {
  
  const handleQuickDate = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <Card className="flex flex-col md:flex-row items-start md:items-center gap-6 p-4 border-0 shadow-lg shadow-sakura-100/40 bg-white/90 backdrop-blur-md relative z-30">
      {/* 1. Ticker Search Section */}
      <div className="flex-1 w-full md:w-auto min-w-[200px] relative z-40">
        <TickerSearch value={ticker} onCommit={onTickerCommit} />
      </div>

      <div className="w-px h-10 bg-slate-100 hidden md:block"></div>

      {/* 2. Date Section - 增加了 group focus-within:scale 效果 */}
      <div className="flex-grow flex flex-col md:flex-row gap-4 w-full md:w-auto items-start md:items-end">
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex-1 group transition-transform duration-300 ease-out focus-within:scale-[1.02] origin-left">
             <DatePicker label="Start" value={startDate} onChange={setStartDate} />
          </div>
          <div className="flex-1 group transition-transform duration-300 ease-out focus-within:scale-[1.02] origin-left">
             <DatePicker label="End" value={endDate} onChange={setEndDate} />
          </div>
        </div>

        {/* Quick Selectors */}
        <div className="flex flex-row md:flex-col gap-2 justify-center pb-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">
             <History size={10} /> Range
          </div>
          <div className="flex gap-1">
            <DateQuickSelect label="6M" onClick={() => handleQuickDate(6)} />
            <DateQuickSelect label="1Y" onClick={() => handleQuickDate(12)} />
            <DateQuickSelect label="YTD" onClick={() => {
                const now = new Date();
                setEndDate(now.toISOString().split('T')[0]);
                setStartDate(`${now.getFullYear()}-01-01`);
            }} />
          </div>
        </div>
      </div>
    </Card>
  );
};