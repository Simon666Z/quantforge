import React, { useState, useEffect } from 'react';
import { StrategyType, StrategyParams } from '../types';
import { Card, Label } from './UI';
import { DatePicker } from './DatePicker';
import { StrategySelector } from './StrategySelector';
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
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => { setLocalValue(value); }, [value]);
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => { setLocalValue(parseFloat(e.target.value)); };
    const handleCommit = () => { if (localValue !== value) onChange(localValue); };
    
    const colorStyles = {
        sakura: { badge: 'bg-sakura-50 text-sakura-600', rangeClass: 'range-accent-sakura' },
        sky:    { badge: 'bg-sky-50 text-sky-600',       rangeClass: 'range-accent-sky' },
        emerald:{ badge: 'bg-emerald-50 text-emerald-600', rangeClass: 'range-accent-emerald' },
        rose:   { badge: 'bg-rose-50 text-rose-600',     rangeClass: 'range-accent-rose' },
        slate:  { badge: 'bg-slate-100 text-slate-600',  rangeClass: 'range-accent-slate' },
    };
    const theme = colorStyles[colorTheme] || colorStyles.sakura;

    return (
        <div className="group">
          <div className="flex justify-between text-xs mb-3 text-slate-500 transition-colors group-hover:text-slate-700">
              <span className="font-bold tracking-wide">{label}</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded-md transition-transform duration-300 group-hover:scale-110 ${theme.badge}`}>
              {localValue}{suffix}
              </span>
          </div>
          <div className="relative h-6 flex items-center">
            <input 
                type="range" min={min} max={max} step={step} value={localValue}
                onChange={handleInput} onMouseUp={handleCommit} onTouchEnd={handleCommit}
                className={`range-slider ${theme.rangeClass}`}
            />
          </div>
        </div>
    );
};

const DateQuickSelect = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="btn-bouncy px-3 py-1 text-[10px] font-bold bg-white border border-slate-100 text-slate-400 rounded-xl hover:bg-sakura-50 hover:text-sakura-500 hover:border-sakura-200 shadow-sm"
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
    // 修改：bg-white/80 改为 bg-white/90，增加一点不透明度，防止背景花纹干扰文字
    <Card className="h-full flex flex-col gap-6 border-0 shadow-xl shadow-sakura-100/50 bg-white/90 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="text-sakura-400 animate-[spin_10s_linear_infinite]" size={20} />
        <h2 className="text-lg font-bold text-slate-700">Configuration</h2>
      </div>
      
      <div className="space-y-6 pr-1 custom-scrollbar pb-8 overflow-visible">
        
        <div className="relative z-30">
          <TickerSearch 
            value={ticker}
            onCommit={onTickerCommit}
          />
        </div>

        <div className="relative z-20">
           <Label>Initial Capital</Label>
           <div className="relative group focus-within:scale-[1.02] transition-transform duration-300 ease-out origin-left">
             <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sakura-400 transition-colors" />
             <input 
               type="number" 
               value={params.initialCapital}
               onChange={(e) => handleParamChange('initialCapital', parseInt(e.target.value) || 0)}
               className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 focus:border-sakura-400 focus:ring-4 focus:ring-sakura-50 outline-none text-slate-600 bg-slate-50/50 font-mono transition-all duration-300 hover:border-sakura-200"
             />
           </div>
        </div>

        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow duration-300 relative z-10">
           <div className="flex justify-between items-center mb-4">
             <Label>Timeline</Label>
             <div className="flex gap-2">
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

        <div className="relative z-10">
            <StrategySelector value={strategy} onChange={setStrategy} />
        </div>

        <div className="space-y-8 bg-white p-6 rounded-2xl border border-sakura-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 hover:shadow-lg transition-shadow duration-500 relative z-0">
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