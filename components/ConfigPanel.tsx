import React, { useState, useEffect, useRef } from 'react';
import { StrategyType, StrategyParams } from '../types';
import { Card, Label } from './UI';
import { DatePicker } from './DatePicker'; // 使用新的 DatePicker
import { StrategySelector } from './StrategySelector'; // 使用新的 StrategySelector
import { TickerSearch } from './TickerSearch';
import { Settings2, DollarSign } from 'lucide-react';

interface ConfigPanelProps {
  ticker: string;
  onTickerCommit: (ticker: string) => void;
  strategy: StrategyType;
  setStrategy: (val: StrategyType) => void;
  params: StrategyParams;
  setParams: (val: StrategyParams) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  onRun: () => void;
}

// ... (保留 ParamSlider 组件代码不变) ... 
// 为了节省篇幅，这里假设 ParamSlider 代码还在，请不要删除它

interface ParamSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  colorTheme?: 'sakura' | 'sky' | 'emerald' | 'rose' | 'slate';
  suffix?: string;
}

const ParamSlider: React.FC<ParamSliderProps> = ({ 
  label, value, onChange, min, max, step = 1, colorTheme = 'sakura', suffix = '' 
}) => {
    // ... (保持 ParamSlider 实现不变)
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => { setLocalValue(value); }, [value]);
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => { setLocalValue(parseFloat(e.target.value)); };
    const handleCommit = () => { if (localValue !== value) onChange(localValue); };
    
    const colorStyles = {
        sakura: { badge: 'bg-sakura-50 text-sakura-600', accent: 'accent-sakura-400' },
        sky:    { badge: 'bg-sky-50 text-sky-600',       accent: 'accent-sky-400' },
        emerald:{ badge: 'bg-emerald-50 text-emerald-600', accent: 'accent-emerald-400' },
        rose:   { badge: 'bg-rose-50 text-rose-600',     accent: 'accent-rose-400' },
        slate:  { badge: 'bg-slate-100 text-slate-600',  accent: 'accent-slate-400' },
    };
    const theme = colorStyles[colorTheme] || colorStyles.sakura;

    return (
        <div>
        <div className="flex justify-between text-xs mb-2 text-slate-500">
            <span>{label}</span>
            <span className={`font-mono font-bold px-2 rounded ${theme.badge}`}>
            {localValue}{suffix}
            </span>
        </div>
        <input 
            type="range" min={min} max={max} step={step} value={localValue}
            onChange={handleInput} onMouseUp={handleCommit} onTouchEnd={handleCommit}
            className={`w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-colors ${theme.accent}`}
        />
        </div>
    );
};


const DateQuickSelect = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="px-3 py-1 text-[10px] font-bold bg-white border border-slate-100 text-slate-400 rounded-lg hover:bg-sakura-50 hover:text-sakura-500 hover:border-sakura-200 transition-all shadow-sm"
  >
    {label}
  </button>
);

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  ticker, onTickerCommit, strategy, setStrategy, params, setParams,
  startDate, setStartDate, endDate, setEndDate
}) => {
  
  const handleParamChange = (key: keyof StrategyParams, value: number) => {
    setParams({ ...params, [key]: value });
  };

  const handleQuickDate = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <Card className="h-full flex flex-col gap-6 border-0 shadow-xl shadow-sakura-100/50 bg-white/80 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="text-sakura-400" size={20} />
        <h2 className="text-lg font-bold text-slate-700">Configuration</h2>
      </div>
      
      <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Ticker Search */}
        <TickerSearch 
          value={ticker}
          onCommit={onTickerCommit}
        />

        {/* Capital Config */}
        <div>
           <Label>Initial Capital</Label>
           <div className="relative">
             <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="number" 
               value={params.initialCapital}
               onChange={(e) => handleParamChange('initialCapital', parseInt(e.target.value) || 0)}
               className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 focus:border-sakura-400 focus:ring-2 focus:ring-sakura-50 outline-none text-slate-600 bg-slate-50/50 font-mono"
             />
           </div>
        </div>

        {/* Date Selection - Updated with new DatePicker */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
           <div className="flex justify-between items-center mb-4">
             <Label>Timeline</Label>
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
           <div className="grid grid-cols-2 gap-3">
             <DatePicker label="Start Date" value={startDate} onChange={setStartDate} />
             <DatePicker label="End Date" value={endDate} onChange={setEndDate} />
           </div>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-sakura-100 to-transparent"></div>

        {/* Strategy Selection - Replaced with new StrategySelector */}
        <div>
            {/* 不需要额外的 Label，因为 Selector 内部已经包含视觉引导 */}
            <StrategySelector value={strategy} onChange={setStrategy} />
        </div>

        {/* Dynamic Parameters - ParamSlider */}
        <div className="space-y-6 bg-white p-4 rounded-xl border border-sakura-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Label>Parameters</Label>
          
          {(strategy === StrategyType.SMA_CROSSOVER || strategy === StrategyType.EMA_CROSSOVER) && (
            <>
              <ParamSlider 
                label="Short Window" 
                value={params.shortWindow} 
                onChange={(v) => handleParamChange('shortWindow', v)} 
                min={5} max={50} suffix="D" colorTheme="sakura"
              />
              <ParamSlider 
                label="Long Window" 
                value={params.longWindow} 
                onChange={(v) => handleParamChange('longWindow', v)} 
                min={20} max={200} suffix="D" colorTheme="sky"
              />
            </>
          )}
          
          {strategy === StrategyType.RSI_REVERSAL && (
            <>
              <ParamSlider 
                label="RSI Period" 
                value={params.rsiPeriod} 
                onChange={(v) => handleParamChange('rsiPeriod', v)} 
                min={2} max={30} colorTheme="sakura"
              />
              <ParamSlider 
                label="Oversold (Buy)" 
                value={params.rsiOversold} 
                onChange={(v) => handleParamChange('rsiOversold', v)} 
                min={10} max={40} colorTheme="emerald"
              />
              <ParamSlider 
                label="Overbought (Sell)" 
                value={params.rsiOverbought} 
                onChange={(v) => handleParamChange('rsiOverbought', v)} 
                min={60} max={90} colorTheme="rose"
              />
            </>
          )}
        
          {strategy === StrategyType.BOLLINGER_BANDS && (
            <>
              <ParamSlider 
                label="Period" 
                value={params.bbPeriod} 
                onChange={(v) => handleParamChange('bbPeriod', v)} 
                min={5} max={50} colorTheme="sakura"
              />
              <ParamSlider 
                label="Std Dev" 
                value={params.bbStdDev} 
                onChange={(v) => handleParamChange('bbStdDev', v)} 
                min={1} max={4} step={0.1} colorTheme="sakura"
              />
            </>
          )}

          {strategy === StrategyType.MACD && (
            <>
              <ParamSlider 
                label="Fast EMA" 
                value={params.macdFast} 
                onChange={(v) => handleParamChange('macdFast', v)} 
                min={5} max={50} colorTheme="sakura"
              />
              <ParamSlider 
                label="Slow EMA" 
                value={params.macdSlow} 
                onChange={(v) => handleParamChange('macdSlow', v)} 
                min={20} max={100} colorTheme="sakura"
              />
              <ParamSlider 
                label="Signal" 
                value={params.macdSignal} 
                onChange={(v) => handleParamChange('macdSignal', v)} 
                min={5} max={20} colorTheme="sakura"
              />
            </>
          )}

          {strategy === StrategyType.MOMENTUM && (
             <ParamSlider 
               label="Lookback Period" 
               value={params.rocPeriod} 
               onChange={(v) => handleParamChange('rocPeriod', v)} 
               min={5} max={50} colorTheme="sakura"
             />
          )}

        </div>
      </div>
    </Card>
  );
};