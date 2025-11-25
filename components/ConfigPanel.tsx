import React from 'react';
import { StrategyType, StrategyParams } from '../types';
import { Card, Label } from './UI';
import { DatePicker } from './DatePicker';
import { TickerSearch } from './TickerSearch';
import { Settings2, DollarSign } from 'lucide-react';

interface ConfigPanelProps {
  ticker: string;
  onTickerCommit: (ticker: string) => void; // 变更：提交回调
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

const StrategyDescription = ({ type }: { type: StrategyType }) => {
  const content = {
    [StrategyType.SMA_CROSSOVER]: "SMA. Classic trend following. Buys when short-term average rises above long-term.",
    [StrategyType.EMA_CROSSOVER]: "EMA. Weighted moving averages that react faster to price action than SMA.",
    [StrategyType.RSI_REVERSAL]: "RSI. Mean reversion strategy. Buys oversold dips and sells overbought peaks.",
    [StrategyType.BOLLINGER_BANDS]: "Bollinger. Volatility based. Buys at lower band support, sells at upper band resistance.",
    [StrategyType.MACD]: "MACD. Momentum oscillator. Triggers on signal line crossovers and histogram shifts.",
    [StrategyType.MOMENTUM]: "ROC. Pure momentum. Buys when rate-of-change turns positive, sells when negative.",
  };

  return (
    <div className="mt-3 text-xs text-sky-600 bg-sky-50/50 p-4 rounded-xl border border-sky-100 leading-relaxed backdrop-blur-sm">
      <span className="font-bold mr-1">💡 Logic:</span> {content[type]}
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

  const SLIDER_CLASS = "w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer hover:bg-slate-200 transition-colors";

  return (
    <Card className="h-full flex flex-col gap-6 border-0 shadow-xl shadow-sakura-100/50 bg-white/80 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="text-sakura-400" size={20} />
        <h2 className="text-lg font-bold text-slate-700">Configuration</h2>
      </div>
      
      <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Ticker Search - No Buttons, Auto Commit */}
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

        {/* Date Selection */}
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

        {/* Strategy Selection */}
        <div>
          <Label>Strategy Model</Label>
          <div className="relative">
            <select 
              value={strategy} 
              onChange={(e) => setStrategy(e.target.value as StrategyType)}
              className="w-full pl-4 pr-10 py-3 rounded-xl border border-sakura-200 bg-white focus:border-sakura-400 outline-none text-slate-600 appearance-none cursor-pointer hover:border-sakura-300 transition-colors font-medium shadow-sm"
            >
              <option value={StrategyType.SMA_CROSSOVER}>SMA Crossover</option>
              <option value={StrategyType.EMA_CROSSOVER}>EMA Crossover</option>
              <option value={StrategyType.RSI_REVERSAL}>RSI Mean Reversion</option>
              <option value={StrategyType.BOLLINGER_BANDS}>Bollinger Bands</option>
              <option value={StrategyType.MACD}>MACD Momentum</option>
              <option value={StrategyType.MOMENTUM}>Rate of Change (ROC)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-sakura-400">▼</div>
          </div>
          <StrategyDescription type={strategy} />
        </div>

        {/* Dynamic Parameters */}
        <div className="space-y-6 bg-white p-4 rounded-xl border border-sakura-100 shadow-sm">
          <Label>Parameters</Label>
          
          {(strategy === StrategyType.SMA_CROSSOVER || strategy === StrategyType.EMA_CROSSOVER) && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                  <span>Short Window</span>
                  <span className="font-mono font-bold bg-sakura-50 text-sakura-600 px-2 rounded">{params.shortWindow}D</span>
                </div>
                <input 
                  type="range" min="5" max="50" value={params.shortWindow}
                  onChange={(e) => handleParamChange('shortWindow', parseInt(e.target.value))}
                  className={`${SLIDER_CLASS} accent-sakura-400`}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                  <span>Long Window</span>
                  <span className="font-mono font-bold bg-sky-50 text-sky-600 px-2 rounded">{params.longWindow}D</span>
                </div>
                <input 
                  type="range" min="20" max="200" value={params.longWindow}
                  onChange={(e) => handleParamChange('longWindow', parseInt(e.target.value))}
                  className={`${SLIDER_CLASS} accent-sky-400`}
                />
              </div>
            </>
          )}
          
          {strategy === StrategyType.RSI_REVERSAL && (
            <>
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>RSI Period</span>
                <span className="font-mono font-bold bg-slate-100 px-2 rounded">{params.rsiPeriod}</span>
                </div>
                <input type="range" min="2" max="30" value={params.rsiPeriod} onChange={(e) => handleParamChange('rsiPeriod', parseInt(e.target.value))} className={`${SLIDER_CLASS} accent-sakura-400`} />
            </div>
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Oversold (Buy)</span>
                <span className="font-mono font-bold bg-emerald-50 text-emerald-600 px-2 rounded">{params.rsiOversold}</span>
                </div>
                <input type="range" min="10" max="40" value={params.rsiOversold} onChange={(e) => handleParamChange('rsiOversold', parseInt(e.target.value))} className={`${SLIDER_CLASS} accent-emerald-400`} />
            </div>
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Overbought (Sell)</span>
                <span className="font-mono font-bold bg-rose-50 text-rose-600 px-2 rounded">{params.rsiOverbought}</span>
                </div>
                <input type="range" min="60" max="90" value={params.rsiOverbought} onChange={(e) => handleParamChange('rsiOverbought', parseInt(e.target.value))} className={`${SLIDER_CLASS} accent-rose-400`} />
            </div>
            </>
        )}
        
            {strategy === StrategyType.BOLLINGER_BANDS && (
            <>
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Period</span>
                <span className="font-mono font-bold bg-slate-100 px-2 rounded">{params.bbPeriod}</span>
                </div>
                <input type="range" min="5" max="50" value={params.bbPeriod} onChange={(e) => handleParamChange('bbPeriod', parseInt(e.target.value))} className={`${SLIDER_CLASS} accent-sakura-400`} />
            </div>
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Std Dev</span>
                <span className="font-mono font-bold bg-slate-100 px-2 rounded">{params.bbStdDev}</span>
                </div>
                <input type="range" min="1" max="4" step="0.1" value={params.bbStdDev} onChange={(e) => handleParamChange('bbStdDev', parseFloat(e.target.value))} className={`${SLIDER_CLASS} accent-sakura-400`} />
            </div>
            </>
        )}

        {strategy === StrategyType.MACD && (
            <>
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Fast EMA</span>
                <span className="font-mono font-bold bg-slate-100 px-2 rounded">{params.macdFast}</span>
                </div>
                <input type="range" min="5" max="50" value={params.macdFast} onChange={(e) => handleParamChange('macdFast', parseInt(e.target.value))} className={`${SLIDER_CLASS} accent-sakura-400`} />
            </div>
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Slow EMA</span>
                <span className="font-mono font-bold bg-slate-100 px-2 rounded">{params.macdSlow}</span>
                </div>
                <input type="range" min="20" max="100" value={params.macdSlow} onChange={(e) => handleParamChange('macdSlow', parseInt(e.target.value))} className={`${SLIDER_CLASS} accent-sakura-400`} />
            </div>
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Signal</span>
                <span className="font-mono font-bold bg-slate-100 px-2 rounded">{params.macdSignal}</span>
                </div>
                <input type="range" min="5" max="20" value={params.macdSignal} onChange={(e) => handleParamChange('macdSignal', parseInt(e.target.value))} className={`${SLIDER_CLASS} accent-sakura-400`} />
            </div>
            </>
        )}

        {strategy === StrategyType.MOMENTUM && (
            <div>
                <div className="flex justify-between text-xs mb-2 text-slate-500">
                <span>Lookback Period</span>
                <span className="font-mono font-bold bg-slate-100 px-2 rounded">{params.rocPeriod}</span>
                </div>
                <input type="range" min="5" max="50" value={params.rocPeriod} onChange={(e) => handleParamChange('rocPeriod', parseInt(e.target.value))} className={`${SLIDER_CLASS} accent-sakura-400`} />
            </div>
        )}

        </div>
      </div>
    </Card>
  );
};