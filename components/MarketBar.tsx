import React from 'react';
import { TickerSearch } from './TickerSearch';
import { DatePicker } from './DatePicker';
import { Card } from './UI';
import { History } from 'lucide-react';

// 修复：确保接口定义包含了 App.tsx 传递的所有 Props
interface MarketBarProps {
  ticker: string;
  onTickerCommit: (ticker: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  onOpenScreener: () => void;      // Fixed
  onToggleSubscribe: () => void;   // Fixed
  isSubscribed: boolean;           // Fixed
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
  ticker, onTickerCommit, startDate, setStartDate, endDate, setEndDate,
  // 虽然 UI 上移除了按钮，但为了不破坏 App.tsx 的传参逻辑，这里必须解构出来（即使不用）
  onOpenScreener, onToggleSubscribe, isSubscribed
}) => {
  
  const handleQuickDate = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <Card className="p-4 border-0 shadow-lg shadow-sakura-100/40 bg-white/90 backdrop-blur-md relative z-30 shrink-0">
      <div className="flex flex-col md:flex-row items-end md:items-center gap-6">
        <div className="w-full md:w-[280px] relative z-50 shrink-0">
            <TickerSearch value={ticker} onCommit={onTickerCommit} />
        </div>
        <div className="flex-1 w-full flex flex-col md:flex-row gap-4 items-start md:items-end relative z-30 min-w-0">
            <div className="flex gap-3 w-full">
                <div className="flex-1 group transition-transform duration-300 ease-out focus-within:scale-[1.02] origin-left">
                    <DatePicker label="Start" value={startDate} onChange={setStartDate} />
                </div>
                <div className="flex-1 group transition-transform duration-300 ease-out focus-within:scale-[1.02] origin-left">
                    <DatePicker label="End" value={endDate} onChange={setEndDate} />
                </div>
            </div>
            <div className="flex flex-row md:flex-col gap-2 justify-center pb-1 shrink-0">
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
      </div>
    </Card>
  );
};