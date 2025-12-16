import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, Bar, Scatter, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ReferenceArea, Label } from 'recharts';
import { BacktestResult, StrategyType } from '../types';
import { Card, Badge } from './UI';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Code2, Zap, Shield, Save, Sparkles, BookOpen } from 'lucide-react';

interface ResultsViewProps {
  result: BacktestResult | null;
  strategyType: StrategyType;
  onTradeClick?: (data: any) => void;
  onRequestCode?: () => void;
  onRequestStressTest?: () => void;
  onRequestDiagnosis?: () => void;
  onSaveStrategy?: () => void;
  highlightedDates?: string[];
  isFocusMode?: boolean;
  chartOnly?: boolean;
  metricsOnly?: boolean;
}

const ANIMATION_DURATION = 800;
const ANIMATION_EASING = 'ease-in-out'; 

const CustomChartTooltip = React.memo(({ active, payload, label, dataRef }: any) => {
  if (!active || !payload || !payload.length || !dataRef) return null;
  const originalDataPoint = dataRef[label]; 
  const dateStr = originalDataPoint ? originalDataPoint.date : '';
  return (
    <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-100 shadow-xl rounded-xl min-w-[180px] animate-in fade-in zoom-in-95 duration-200 z-50">
      <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-2 text-base font-mono">{dateStr}</p>
      <div className="flex flex-col gap-2">
        {payload.map((entry: any, index: number) => {
          if (['index', 'HoverTrigger', 'Buy', 'Sell', 'Focus'].includes(entry.name) || entry.value == null) return null;
          return (
            <div key={index} className="flex justify-between items-center gap-4 text-sm">
              <span className="flex items-center gap-2 text-slate-500 font-medium">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="font-mono font-bold text-slate-700">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const HighlightedTriangle = (props: any) => {
    const { cx, cy, payload } = props;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    const isBuy = payload?.type === 'BUY';
    const color = isBuy ? '#10b981' : '#f43f5e';
    const size = 10; 
    const d = isBuy 
        ? `M${cx},${cy - size} L${cx + size},${cy + size} L${cx - size},${cy + size} Z` 
        : `M${cx},${cy + size} L${cx + size},${cy - size} L${cx - size},${cy - size} Z`;
    return (
        <g>
            <path d={d} fill={color} stroke="white" strokeWidth={3} className="drop-shadow-xl" />
        </g>
    );
};

const NormalTriangle = (props: any) => {
    const { cx, cy, payload, isFocusMode } = props;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    const isBuy = payload?.type === 'BUY';
    const color = isBuy ? '#10b981' : '#f43f5e';
    const size = 9;
    const d = isBuy 
        ? `M${cx},${cy - size} L${cx + size},${cy + size} L${cx - size},${cy + size} Z` 
        : `M${cx},${cy + size} L${cx + size},${cy - size} L${cx - size},${cy - size} Z`;
    return <path d={d} fill={color} stroke="none" style={{ opacity: isFocusMode ? 0.5 : 1, transition: 'opacity 0.3s' }} className="cursor-pointer hover:scale-125 transition-transform" />;
};

const MetricCard = ({ label, value, subValue, icon: Icon, color }: any) => {
  const textColor = color.replace('bg-', 'text-');
  return (
    <div className="relative overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group transition-all cursor-default hover:shadow-md hover:border-slate-200">
      <div className={`absolute top-3 right-3 opacity-20 group-hover:opacity-40 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-12 ${textColor}`}><Icon size={42} strokeWidth={1.5} /></div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">{label}</p>
      <div className="flex items-baseline gap-2 relative z-10"><h3 className={`text-3xl font-mono font-bold ${textColor}`}>{value}</h3>{subValue && <span className="text-xs text-slate-400 font-medium">{subValue}</span>}</div>
    </div>
  );
};

const RiskAnalysisPanel = ({ metrics }: { metrics: any }) => {
    if (!metrics) return null;
    const getStatus = (val: number, type: 'sharpe' | 'drawdown') => {
        const v = Number(val) || 0;
        if (type === 'sharpe') return v > 2 ? { t:'Excellent', c:'text-emerald-500 bg-emerald-50' } : v > 1 ? { t:'Good', c:'text-sky-500 bg-sky-50' } : { t:'Poor', c:'text-rose-500 bg-rose-50' };
        return v > 20 ? { t:'High Risk', c:'text-rose-500 bg-rose-50' } : { t:'Safe', c:'text-emerald-500 bg-emerald-50' };
    };
    const sStat = getStatus(metrics.sharpeRatio, 'sharpe');
    const dStat = getStatus(metrics.maxDrawdown, 'drawdown');

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-0 shrink-0">
            <div className="bg-white rounded-xl p-4 border border-slate-100 flex flex-col gap-2 relative group cursor-help shadow-sm">
                <div className="flex justify-between"><div className="flex items-center gap-2 text-slate-600 font-bold text-sm uppercase tracking-wider"><Shield size={15} /> Sharpe Ratio</div><span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${sStat.c}`}>{sStat.t}</span></div>
                <div className="text-3xl font-mono font-bold text-amber-700">{metrics.sharpeRatio.toFixed(2)}</div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-sm rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <p className="font-bold mb-1">Sharpe Ratio</p>
                    <p className="text-slate-300 leading-relaxed">Measures risk-adjusted return. Higher values mean better returns per unit of risk.</p>
                    <p className="text-slate-400 mt-2 text-xs font-mono">&lt;1 Suboptimal • 1-2 Good • &gt;2 Excellent</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 flex flex-col gap-2 relative group cursor-help shadow-sm">
                <div className="flex justify-between"><div className="flex items-center gap-2 text-slate-600 font-bold text-sm uppercase tracking-wider"><TrendingDown size={15} /> Max Drawdown</div><span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${dStat.c}`}>{dStat.t}</span></div>
                <div className="text-3xl font-mono font-bold text-rose-500">-{metrics.maxDrawdown.toFixed(2)}%</div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-sm rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <p className="font-bold mb-1">Maximum Drawdown</p>
                    <p className="text-slate-300 leading-relaxed">Largest peak-to-trough decline. Shows the worst loss you would have experienced.</p>
                    <p className="text-slate-400 mt-2 text-xs font-mono">&lt;10% Low Risk • 10-20% Moderate • &gt;20% High</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 flex flex-col gap-2 relative group cursor-help shadow-sm">
                <div className="flex justify-between"><div className="flex items-center gap-2 text-slate-600 font-bold text-sm uppercase tracking-wider"><Zap size={15} /> Positive Time</div></div>
                <div className="text-3xl font-mono font-bold text-teal-700">{metrics.winRate.toFixed(1)}%</div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-sm rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <p className="font-bold mb-1">Positive Time</p>
                    <p className="text-slate-300 leading-relaxed">Percentage of time the portfolio value stays at or above initial capital.</p>
                    <p className="text-slate-400 mt-2 text-xs font-mono">&lt;50% Unstable • 50-70% Moderate • &gt;70% Stable</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                </div>
            </div>
        </div>
    );
};

const StrategySummary = ({ strategyType }: { strategyType: string }) => (
    <Card className="p-0 border-0 shadow-lg shadow-slate-100/50 bg-white shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-2">
        <BookOpen size={20} className="text-indigo-500" /> 
        <h3 className="font-bold text-slate-700 text-base uppercase tracking-wide">Strategy Guide</h3>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Left Column: Logic & Capital */}
        <div className="space-y-8">
            {/* Logic Section */}
            <div>
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                    <Zap size={20} className="text-amber-500"/> 
                    Strategy Logic: <span className="text-indigo-600">{strategyType.replace(/_/g, ' ')}</span>
                </h4>
                <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-700 text-base leading-relaxed shadow-sm">
                    {strategyType === 'SMA_CROSSOVER' && "Buys when short-term trend crosses above long-term trend (Golden Cross). Sells on Death Cross."}
                    {strategyType === 'RSI_REVERSAL' && "Contrarian strategy. Buys when oversold (RSI < 30) and sells when overbought (RSI > 70)."}
                    {strategyType === 'MACD' && "Momentum strategy. Buys when MACD line crosses above Signal line. Sells on bearish cross."}
                    {strategyType === 'TURTLE' && "Trend following. Buys breakouts above N-day highs. Sells breakdowns below N-day lows."}
                    {!['SMA_CROSSOVER', 'RSI_REVERSAL', 'MACD', 'TURTLE'].includes(strategyType) && "Uses technical indicators to identify high-probability entry and exit points automatically."}
                </div>
            </div>

            {/* Capital Section */}
            <div>
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                    <DollarSign size={20} className="text-emerald-500"/> Capital Allocation
                </h4>
                <p className="text-slate-600 text-base leading-relaxed pl-4 border-l-4 border-emerald-200 py-1">
                    Each trade utilizes <strong>100% of available equity</strong> (compounding). 
                    Profits are reinvested into the next trade, maximizing potential growth but also increasing risk exposure.
                </p>
            </div>
        </div>
        
        {/* Right Column: Legend & Metrics */}
        <div className="space-y-8">
            {/* Legend */}
            <div>
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                    <Activity size={20} className="text-blue-500"/> Chart Legend
                </h4>
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-1 bg-sky-400 rounded-full shrink-0" />
                        <span className="text-base text-slate-600"><strong>Blue Line:</strong> Asset closing price.</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-emerald-500 shrink-0" />
                        <span className="text-base text-slate-600"><strong>Green Triangle:</strong> BUY signal executed.</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-rose-500 shrink-0" />
                        <span className="text-base text-slate-600"><strong>Red Triangle:</strong> SELL signal executed.</span>
                    </div>
                </div>
            </div>

            {/* Metrics Definitions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <span className="block text-sm font-bold text-slate-700 uppercase mb-1">Total Return</span>
                        <span className="text-sm text-slate-500 leading-relaxed block">Net profit or loss percentage over the selected period.</span>
                    </div>
                    <div>
                        <span className="block text-sm font-bold text-slate-700 uppercase mb-1">Max Drawdown</span>
                        <span className="text-sm text-slate-500 leading-relaxed block">The largest percentage drop from a peak to a trough.</span>
                    </div>
                </div>
             </div>
        </div>
      </div>
    </Card>
);

export const ResultsView: React.FC<ResultsViewProps> = ({ 
    result, strategyType, onTradeClick, onRequestCode, onRequestStressTest, onRequestDiagnosis, onSaveStrategy, highlightedDates = [], isFocusMode = false, chartOnly = false, metricsOnly = false 
}) => {
  const { chartData, buySignals, sellSignals, highlightedSignals, maxIndex, yDomain, splitIndex } = useMemo(() => {
    if (!result?.data?.length) return { chartData: [], buySignals: [], sellSignals: [], highlightedSignals: [], maxIndex: 0, yDomain: [0, 100], splitIndex: 0 };
    
    const processed = result.data.map((d, i) => ({ ...d, index: i }));
    
    // Create a map of date -> index for quick lookup
    const dateToIndex = new Map(processed.map(d => [d.date, d.index]));
    
    let min=Infinity, max=-Infinity;
    processed.forEach(d => { 
        const vals = [d.low, d.high, d.close].filter(v => v!=null && Number.isFinite(v)); 
        if (vals.length) { min=Math.min(min,...vals); max=Math.max(max,...vals); } 
    });
    if (!Number.isFinite(min)) { min=0; max=100; }
    const pad = (max-min)*0.05;

    // Use result.trades (actual executions) instead of result.data signals
    const buys: any[] = [];
    const sells: any[] = [];

    if (result.trades) {
        result.trades.forEach((t: any) => {
            const idx = dateToIndex.get(t.date);
            if (idx !== undefined) {
                const tradePoint = { 
                    index: idx, 
                    price: t.price, 
                    type: t.type, 
                    date: t.date, 
                    reason: t.reason,
                    // For plotting, we need a value. Use the trade price.
                    buySignal: t.type === 'BUY' ? t.price : undefined,
                    sellSignal: t.type === 'SELL' ? t.price : undefined
                };
                if (t.type === 'BUY') buys.push(tradePoint);
                else sells.push(tradePoint);
            }
        });
    } else {
        // Fallback to signals if trades are missing (shouldn't happen with new backend)
        processed.filter(d => d.buySignal).forEach(d => buys.push({ index: d.index, buySignal: d.buySignal, ...d, type: 'BUY', date: d.date }));
        processed.filter(d => d.sellSignal).forEach(d => sells.push({ index: d.index, sellSignal: d.sellSignal, ...d, type: 'SELL', date: d.date }));
    }

    const highlights = [...buys, ...sells].filter(d => highlightedDates.includes(d.date));

    return { chartData: processed, buySignals: buys, sellSignals: sells, highlightedSignals: highlights, maxIndex: processed.length-1, yDomain: [Math.max(0, min-pad), max+pad], splitIndex: Math.floor(processed.length*0.7) };
  }, [result, highlightedDates]);

  if (!result || !result.metrics) return <div className="h-[500px] flex flex-col gap-4 items-center justify-center bg-white/30 border border-slate-100 rounded-3xl backdrop-blur-sm"><BarChart3 size={48} className="text-slate-300"/><p className="text-slate-400 font-bold text-base">NO DATA</p></div>;
  
  const isProfit = result.metrics.totalReturn >= 0;
  const commonAnimProps = { isAnimationActive: !isFocusMode && chartData.length < 300, animationDuration: ANIMATION_DURATION, animationEasing: ANIMATION_EASING as 'ease-in-out' };

  // Chart Only Mode - Just the price chart
  if (chartOnly) {
    return (
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col border-0 shadow-xl shadow-sakura-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="flex justify-between items-center mb-6 px-6 pt-6">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700 text-base uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-6 bg-sakura-400 rounded-full"></div> Price Action</h3>
              <div className="flex gap-2 items-center">
                  <button onClick={onRequestCode} className="h-8 px-4 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-sm flex items-center justify-center"><Code2 size={13} className="mr-1.5"/> Code</button>
                  <button onClick={onRequestStressTest} className="h-8 px-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors shadow-sm border border-rose-100 flex items-center justify-center"><Zap size={13} className="mr-1.5"/> Stress Test</button>
              </div>
            </div>
          </div>
          <style>{`
              .recharts-wrapper, 
              .recharts-wrapper:focus, 
              .recharts-wrapper:active { 
                outline: none !important; 
                border: none !important; 
                box-shadow: none !important; 
              }
              .recharts-wrapper *:focus { 
                outline: none !important; 
                border: none !important; 
                box-shadow: none !important; 
              }
              .recharts-surface { 
                outline: none !important; 
              }
              .recharts-layer path { 
                outline: none !important; 
              }
            `}
          </style>
          <div className="h-[420px] w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.1}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="index" type="number" domain={[0, maxIndex]} scale="linear" minTickGap={50} tick={{fontSize: 11, fill:'#64748b'}} tickLine={false} axisLine={{stroke:'#f1f5f9'}} tickFormatter={(index)=>chartData[index]?chartData[index].date:''} allowDecimals={false} />
                <YAxis domain={yDomain as [number,number]} width={60} tick={{fontSize: 11, fill:'#64748b'}} tickLine={false} axisLine={{stroke:'#f1f5f9'}} tickFormatter={(val)=>`$${Number(val).toFixed(0)}`} />
                <Tooltip content={<CustomChartTooltip dataRef={chartData} />} cursor={{ stroke:'#94a3b8', strokeWidth:1, strokeDasharray:'4 4' }} isAnimationActive={false} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop:'10px', fontSize:'14px', fontWeight:600, color:'#64748b' }} />
                <ReferenceArea x1={splitIndex} x2={maxIndex} fill="#f1f5f9" fillOpacity={0.5} />
                <ReferenceLine x={splitIndex} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1}><Label value="OUT OF SAMPLE" position="insideTopRight" fill="#94a3b8" fontSize={10} fontWeight="bold" offset={10} /></ReferenceLine>
                <Bar dataKey="close" name="HoverTrigger" fill="transparent" barSize={Number.MAX_SAFE_INTEGER} isAnimationActive={false} legendType="none" />
                <Area type="monotone" dataKey="close" stroke="#38bdf8" strokeWidth={2} fill="url(#colorPrice)" name="Price" legendType="circle" activeDot={false} {...commonAnimProps} />
              {strategyType === StrategyType.SMA_CROSSOVER && <><Line type="monotone" dataKey="smaShort" stroke="#ec4899" dot={false} strokeWidth={2} name="Short SMA" {...commonAnimProps} /><Line type="monotone" dataKey="smaLong" stroke="#94a3b8" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Long SMA" {...commonAnimProps} /></>}
              {strategyType === StrategyType.TURTLE && <><Line type="step" dataKey="upperBand" stroke="#10b981" dot={false} strokeWidth={1} name="High" {...commonAnimProps} /><Line type="step" dataKey="lowerBand" stroke="#f43f5e" dot={false} strokeWidth={1} name="Low" {...commonAnimProps} /></>}
              <Scatter data={buySignals} name="Buy" dataKey="buySignal" fill="#10b981" shape={<NormalTriangle isFocusMode={isFocusMode} />} legendType="triangle" onClick={(data) => onTradeClick && onTradeClick(data)} {...commonAnimProps} />
              <Scatter data={sellSignals} name="Sell" dataKey="sellSignal" fill="#f43f5e" shape={<NormalTriangle isFocusMode={isFocusMode} />} legendType="triangle" onClick={(data) => onTradeClick && onTradeClick(data)} {...commonAnimProps} />
              {isFocusMode && highlightedSignals.length > 0 && <Scatter data={highlightedSignals} name="Focus" dataKey={highlightedSignals[0]?.buySignal ? "buySignal" : "sellSignal"} fill={highlightedSignals[0]?.buySignal ? "#10b981" : "#f43f5e"} shape={<HighlightedTriangle />} legendType="none" isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        </Card>
        
        {/* Save Button - Full Width Below Chart */}
        <button 
          onClick={onSaveStrategy} 
          className="w-full py-3 bg-white text-rose-600 font-bold rounded-2xl hover:bg-rose-50 hover:border-rose-300 hover:shadow-lg transition-all duration-200 ease-out shadow-md border border-rose-200 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Save size={18} /> Save Strategy to Library
        </button>
      </div>
    );
  }

  // Metrics Only Mode - Metrics, Risk Analysis, Strategy Summary, Execution Log
  if (metricsOnly) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="Total Return" value={`${isProfit?'+':''}${Number(result.metrics.totalReturn).toFixed(2)}%`} icon={isProfit?TrendingUp:TrendingDown} color={isProfit?'bg-emerald-500':'bg-rose-500'} />
          <MetricCard label="Final Capital" value={`$${Math.round(Number(result.metrics.finalCapital)).toLocaleString()}`} subValue={`from $${Math.round(Number(result.metrics.initialCapital)).toLocaleString()}`} icon={DollarSign} color="bg-amber-500" />
          <MetricCard label="Total Actions" value={result.metrics.tradeCount} icon={Activity} color="bg-sky-500" />
        </div>

        <RiskAnalysisPanel metrics={result.metrics} />

        <StrategySummary strategyType={strategyType} />

        {/* Log Card */}
        <Card className="border-0 shadow-lg shadow-slate-100/50 bg-white backdrop-blur flex flex-col min-h-[200px] max-h-[400px] overflow-hidden">
          <h3 className="font-bold text-slate-600 mb-4 text-base uppercase tracking-wide flex items-center gap-2 shrink-0"><Activity size={18} className="text-slate-400" /> Execution Log</h3>
          <p className="text-xs text-slate-400 mb-3 -mt-2 italic">Note: Short selling is disabled. Some sell signals may be skipped if no position is held.</p>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <table className="w-full text-base text-left border-collapse table-fixed">
              <thead className="text-slate-400 font-bold text-sm uppercase tracking-wider sticky top-0 bg-white z-10"><tr><th className="w-1/4 pb-3 pl-4 border-b border-slate-100">Date</th><th className="w-1/4 pb-3 border-b border-slate-100">Action</th><th className="w-1/4 pb-3 border-b border-slate-100">Price</th><th className="w-1/4 pb-3 border-b border-slate-100">Signal Logic</th></tr></thead>
              <tbody className="text-slate-600">{result.trades.slice().reverse().map((trade, i) => (<tr key={i} className="group transition-colors border-b border-slate-50 last:border-0 odd:bg-white even:bg-slate-50/60 hover:!bg-sakura-50/30"><td className="w-1/4 py-3 pl-4 font-mono text-sm">{new Date(trade.date).toLocaleDateString()}</td><td className="w-1/4 py-3"><Badge color={trade.type==='BUY'?'bg-emerald-100 text-emerald-700 border border-emerald-200':'bg-rose-100 text-rose-700 border border-rose-200'}>{trade.type}</Badge></td><td className="w-1/4 py-3 font-mono font-bold">${trade.price.toFixed(2)}</td><td className="w-1/4 py-3 text-sm text-slate-400 italic">{trade.reason}</td></tr>))}</tbody>
            </table>
            {result.trades.length === 0 && <div className="py-12 text-center flex flex-col items-center gap-2 text-slate-400"><div className="text-2xl opacity-50">🕸️</div><p>No trades triggered.</p></div>}
          </div>
        </Card>
      </div>
    );
  }

  // Full View (default) - Everything together
  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <style>{`
          .recharts-wrapper, 
          .recharts-wrapper:focus, 
          .recharts-wrapper:active { 
            outline: none !important; 
            border: none !important; 
            box-shadow: none !important; 
          }
          .recharts-wrapper *:focus { 
            outline: none !important; 
            border: none !important; 
            box-shadow: none !important; 
          }
          .recharts-surface { 
            outline: none !important; 
          }
          .recharts-layer path { 
            outline: none !important; 
          }
        `}
        </style>
      
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <MetricCard label="Total Return" value={`${isProfit?'+':''}${Number(result.metrics.totalReturn).toFixed(2)}%`} icon={isProfit?TrendingUp:TrendingDown} color={isProfit?'bg-emerald-500':'bg-rose-500'} />
        <MetricCard label="Final Capital" value={`$${Math.round(Number(result.metrics.finalCapital)).toLocaleString()}`} subValue={`from $${Math.round(Number(result.metrics.initialCapital)).toLocaleString()}`} icon={DollarSign} color="bg-amber-500" />
        <MetricCard label="Total Actions" value={result.metrics.tradeCount} icon={Activity} color="bg-sky-500" />
      </div>

      {/* Chart Card */}
      <Card className="flex flex-col border-0 shadow-xl shadow-sakura-100/20 bg-white/80 backdrop-blur-sm overflow-hidden shrink-0">
        <div className="flex justify-between items-center mb-6 px-6 pt-6">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-700 text-base uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-6 bg-sakura-400 rounded-full"></div> Price Action</h3>
            <div className="flex gap-2 items-center">
                <button onClick={onRequestCode} className="h-8 px-4 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-sm flex items-center justify-center"><Code2 size={13} className="mr-1.5"/> Code</button>
                <button onClick={onRequestStressTest} className="h-8 px-4 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors shadow-sm border border-rose-100 flex items-center justify-center"><Zap size={13} className="mr-1.5"/> Stress Test</button>
                <button onClick={onSaveStrategy} className="h-8 px-4 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100 flex items-center justify-center" title="Save to Library"><Save size={13} className="mr-1.5"/> Save</button>
            </div>
          </div>
        </div>
        <div className="h-[420px] w-full -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.1}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="index" type="number" domain={[0, maxIndex]} scale="linear" minTickGap={50} tick={{fontSize: 11, fill:'#64748b'}} tickLine={false} axisLine={{stroke:'#f1f5f9'}} tickFormatter={(index)=>chartData[index]?chartData[index].date:''} allowDecimals={false} />
              <YAxis domain={yDomain as [number,number]} width={60} tick={{fontSize: 11, fill:'#64748b'}} tickLine={false} axisLine={{stroke:'#f1f5f9'}} tickFormatter={(val)=>`$${Number(val).toFixed(0)}`} />
              <Tooltip content={<CustomChartTooltip dataRef={chartData} />} cursor={{ stroke:'#94a3b8', strokeWidth:1, strokeDasharray:'4 4' }} isAnimationActive={false} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop:'10px', fontSize:'14px', fontWeight:600, color:'#64748b' }} />
              <ReferenceArea x1={splitIndex} x2={maxIndex} fill="#f1f5f9" fillOpacity={0.5} />
              <ReferenceLine x={splitIndex} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1}><Label value="OUT OF SAMPLE" position="insideTopRight" fill="#94a3b8" fontSize={10} fontWeight="bold" offset={10} /></ReferenceLine>
              <Bar dataKey="close" name="HoverTrigger" fill="transparent" barSize={Number.MAX_SAFE_INTEGER} isAnimationActive={false} legendType="none" />
              <Area type="monotone" dataKey="close" stroke="#38bdf8" strokeWidth={2} fill="url(#colorPrice)" name="Price" legendType="circle" activeDot={false} {...commonAnimProps} />
              {strategyType === StrategyType.SMA_CROSSOVER && <><Line type="monotone" dataKey="smaShort" stroke="#ec4899" dot={false} strokeWidth={2} name="Short SMA" {...commonAnimProps} /><Line type="monotone" dataKey="smaLong" stroke="#94a3b8" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Long SMA" {...commonAnimProps} /></>}
              {strategyType === StrategyType.TURTLE && <><Line type="step" dataKey="upperBand" stroke="#10b981" dot={false} strokeWidth={1} name="High" {...commonAnimProps} /><Line type="step" dataKey="lowerBand" stroke="#f43f5e" dot={false} strokeWidth={1} name="Low" {...commonAnimProps} /></>}
              
              <Scatter data={buySignals} name="Buy" dataKey="buySignal" fill="#10b981" shape={<NormalTriangle isFocusMode={isFocusMode} />} legendType="triangle" onClick={(data) => onTradeClick && onTradeClick(data)} {...commonAnimProps} />
              <Scatter data={sellSignals} name="Sell" dataKey="sellSignal" fill="#f43f5e" shape={<NormalTriangle isFocusMode={isFocusMode} />} legendType="triangle" onClick={(data) => onTradeClick && onTradeClick(data)} {...commonAnimProps} />
              
              {isFocusMode && highlightedSignals.length > 0 && <Scatter data={highlightedSignals} name="Focus" dataKey={highlightedSignals[0]?.buySignal ? "buySignal" : "sellSignal"} fill={highlightedSignals[0]?.buySignal ? "#10b981" : "#f43f5e"} shape={<HighlightedTriangle />} legendType="none" isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <RiskAnalysisPanel metrics={result.metrics} />

      <StrategySummary strategyType={strategyType} />

      {/* 4. Log Card - FIXED: max-h-[400px] prevents infinite scrolling */}
      <Card className="border-0 shadow-lg shadow-slate-100/50 bg-white backdrop-blur flex-1 flex flex-col min-h-[200px] max-h-[400px] overflow-hidden">
        <h3 className="font-bold text-slate-600 mb-4 text-base uppercase tracking-wide flex items-center gap-2 shrink-0"><Activity size={18} className="text-slate-400" /> Execution Log</h3>
        <p className="text-xs text-slate-400 mb-3 -mt-2 italic">Note: Short selling is disabled. Some sell signals may be skipped if no position is held.</p>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <table className="w-full text-base text-left border-collapse table-fixed">
            <thead className="text-slate-400 font-bold text-sm uppercase tracking-wider sticky top-0 bg-white z-10"><tr><th className="w-1/4 pb-3 pl-4 border-b border-slate-100">Date</th><th className="w-1/4 pb-3 border-b border-slate-100">Action</th><th className="w-1/4 pb-3 border-b border-slate-100">Price</th><th className="w-1/4 pb-3 border-b border-slate-100">Signal Logic</th></tr></thead>
            <tbody className="text-slate-600">{result.trades.slice().reverse().map((trade, i) => (<tr key={i} className="group transition-colors border-b border-slate-50 last:border-0 odd:bg-white even:bg-slate-50/60 hover:!bg-sakura-50/30"><td className="w-1/4 py-3 pl-4 font-mono text-sm">{new Date(trade.date).toLocaleDateString()}</td><td className="w-1/4 py-3"><Badge color={trade.type==='BUY'?'bg-emerald-100 text-emerald-700 border border-emerald-200':'bg-rose-100 text-rose-700 border border-rose-200'}>{trade.type}</Badge></td><td className="w-1/4 py-3 font-mono font-bold">${trade.price.toFixed(2)}</td><td className="w-1/4 py-3 text-sm text-slate-400 italic">{trade.reason}</td></tr>))}</tbody>
          </table>
          {result.trades.length === 0 && <div className="py-12 text-center flex flex-col items-center gap-2 text-slate-400"><div className="text-2xl opacity-50">🕸️</div><p>No trades triggered.</p></div>}
        </div>
      </Card>
    </div>
  );
};