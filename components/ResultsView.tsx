import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, Bar, Scatter, XAxis, YAxis, Tooltip, Legend, LineChart, ReferenceLine, ReferenceArea, Label
} from 'recharts';
import { BacktestResult, StrategyType } from '../types';
import { Card, Badge } from './UI';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Sparkles, Code2, Zap, Shield, AlertTriangle, Info } from 'lucide-react';

interface ResultsViewProps {
  result: BacktestResult | null;
  strategyType: StrategyType;
  onTradeClick?: (data: any) => void;
  onRequestDiagnosis?: () => void;
  onRequestCode?: () => void;
  onRequestStressTest?: () => void;
}

const ANIMATION_DURATION = 800;
const ANIMATION_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // Q弹效果

const CustomChartTooltip = React.memo(({ active, payload, label, dataRef }: any) => {
  if (!active || !payload || !payload.length) return null;
  const originalDataPoint = dataRef[label]; 
  const dateStr = originalDataPoint ? originalDataPoint.date : '';
  return (
    <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-100 shadow-xl rounded-xl min-w-[180px] animate-in fade-in zoom-in-95 duration-200 z-50">
      <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-2 text-sm font-mono">{dateStr}</p>
      <div className="flex flex-col gap-2">
        {payload.map((entry: any, index: number) => {
          if (['index', 'HoverTrigger'].includes(entry.name) || entry.value == null) return null;
          return (
            <div key={index} className="flex justify-between items-center gap-4 text-xs">
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

const TriangleShape = (props: any) => {
    const { cx, cy, fill, payload } = props;
    if (!cx || !cy) return null;
    const d = payload.buySignal 
        ? `M${cx},${cy - 6} L${cx + 6},${cy + 6} L${cx - 6},${cy + 6} Z`
        : `M${cx},${cy + 6} L${cx + 6},${cy - 6} L${cx - 6},${cy - 6} Z`;
    return <path d={d} fill={fill} stroke="white" strokeWidth={1} className="cursor-pointer hover:scale-125 transition-transform drop-shadow-sm"/>;
};

const MetricCard = ({ label, value, subValue, icon: Icon, color }: any) => {
  const textColor = color.replace('bg-', 'text-');
  return (
    <div className="relative overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group transition-all cursor-default hover:shadow-md hover:border-slate-200">
      <div className={`absolute top-3 right-3 opacity-20 group-hover:opacity-40 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-12 ${textColor}`}><Icon size={42} strokeWidth={1.5} /></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">{label}</p>
      <div className="flex items-baseline gap-2 relative z-10">
         <h3 className={`text-2xl font-mono font-bold ${textColor}`}>{value}</h3>
         {subValue && <span className="text-[10px] text-slate-400 font-medium">{subValue}</span>}
      </div>
    </div>
  );
};

// --- NEW: Risk Analysis Component ---
const RiskAnalysisPanel = ({ metrics }: { metrics: any }) => {
    const getSharpeStatus = (s: number) => {
        if (s > 2) return { color: 'text-emerald-500', bg: 'bg-emerald-50', text: 'Excellent' };
        if (s > 1) return { color: 'text-sky-500', bg: 'bg-sky-50', text: 'Good' };
        if (s > 0) return { color: 'text-amber-500', bg: 'bg-amber-50', text: 'Ok' };
        return { color: 'text-rose-500', bg: 'bg-rose-50', text: 'Poor' };
    };
    
    const sharpeStatus = getSharpeStatus(metrics.sharpeRatio);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {/* Sharpe Ratio */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider">
                        <Shield size={14} /> Sharpe Ratio
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${sharpeStatus.bg} ${sharpeStatus.color}`}>
                        {sharpeStatus.text}
                    </span>
                </div>
                <div className="text-2xl font-mono font-bold text-slate-700">{metrics.sharpeRatio.toFixed(2)}</div>
                <p className="text-[10px] text-slate-400 leading-tight">
                    Measures return per unit of risk. {metrics.sharpeRatio > 1 ? "Strategy is efficiently generating returns." : "Returns may not justify the volatility."}
                </p>
            </div>

            {/* Max Drawdown */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider">
                        <TrendingDown size={14} /> Max Drawdown
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${metrics.maxDrawdown > 20 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {metrics.maxDrawdown > 20 ? 'High Risk' : 'Safe'}
                    </span>
                </div>
                <div className="text-2xl font-mono font-bold text-rose-500">-{metrics.maxDrawdown.toFixed(2)}%</div>
                <p className="text-[10px] text-slate-400 leading-tight">
                    The biggest drop from peak to trough. {metrics.maxDrawdown > 20 ? "Strategy has endured deep losses." : "Capital preservation is strong."}
                </p>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider">
                        <Zap size={14} /> Win Rate
                    </div>
                </div>
                <div className="text-2xl font-mono font-bold text-slate-700">{metrics.winRate.toFixed(1)}%</div>
                <p className="text-[10px] text-slate-400 leading-tight">
                    Percentage of profitable trades. <span className="italic">Note: Trend strategies often have low win rates (30-40%) but high payouts.</span>
                </p>
            </div>
        </div>
    );
};

export const ResultsView: React.FC<ResultsViewProps> = ({ 
  result, strategyType, onTradeClick, onRequestDiagnosis, onRequestCode, onRequestStressTest
}) => {
  
  const { chartData, buySignals, sellSignals, maxIndex, yDomain, splitIndex } = useMemo(() => {
    if (!result || !result.data || result.data.length === 0) {
      return { chartData: [], buySignals: [], sellSignals: [], maxIndex: 0, yDomain: ['auto', 'auto'], splitIndex: 0 };
    }

    const rawData = result.data;
    let minVal = Infinity, maxVal = -Infinity;

    const processed = rawData.map((d, i) => {
      const vals = [d.low, d.high, d.close, d.upperBand, d.lowerBand, d.smaShort, d.smaLong].filter(v => v != null) as number[];
      if (vals.length) {
        minVal = Math.min(minVal, ...vals);
        maxVal = Math.max(maxVal, ...vals);
      }
      return { ...d, index: i };
    });

    const padding = (maxVal - minVal) * 0.05;
    const buys = processed.filter(d => d.buySignal).map(d => ({ index: d.index, buySignal: d.buySignal, ...d, type: 'BUY' }));
    const sells = processed.filter(d => d.sellSignal).map(d => ({ index: d.index, sellSignal: d.sellSignal, ...d, type: 'SELL' }));

    // --- Out-of-Sample Logic ---
    // We define the last 30% of data as "Out of Sample" (Test set)
    const splitIndex = Math.floor(processed.length * 0.7);

    return { 
      chartData: processed, buySignals: buys, sellSignals: sells, 
      maxIndex: processed.length - 1, yDomain: [Math.max(0, minVal - padding), maxVal + padding],
      splitIndex
    };
  }, [result]);

  if (!result) {
    return (
      <div className="h-[500px] flex items-center justify-center flex-col gap-6 bg-white/30 border border-slate-100 rounded-3xl backdrop-blur-sm animate-pulse">
        <div className="w-2 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 shadow-inner border border-slate-100">
          <BarChart3 size={48} />
        </div>
        <div className="text-center">
            <h3 className="text-lg font-bold text-slate-600">Ready to Analyze</h3>
            <p className="text-slate-400 text-sm mt-1">Select a ticker to visualize real-time backtesting results.</p>
        </div>
      </div>
    );
  }

  const isProfit = result.metrics.totalReturn >= 0;
  const enableAnimation = chartData.length < 300; 
  const commonAnimProps = { isAnimationActive: enableAnimation, animationDuration: ANIMATION_DURATION, animationEasing: ANIMATION_EASING };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <style>{`
        .recharts-wrapper { outline: none !important; }
        .recharts-surface { outline: none !important; }
        .recharts-layer path { outline: none !important; }
      `}</style>

      {/* 1. Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Return" value={`${isProfit ? '+' : ''}${result.metrics.totalReturn.toFixed(2)}%`} icon={isProfit ? TrendingUp : TrendingDown} color={isProfit ? 'bg-emerald-500' : 'bg-rose-500'} />
        <MetricCard label="Final Capital" value={`$${Math.round(result.metrics.finalCapital).toLocaleString()}`} subValue={`from $${result.metrics.initialCapital.toLocaleString()}`} icon={DollarSign} color="bg-amber-500" />
        <MetricCard label="Total Actions" value={result.metrics.tradeCount} icon={Activity} color="bg-sky-500" />
        <MetricCard label="Max Drawdown" value={`-${result.metrics.maxDrawdown.toFixed(2)}%`} icon={TrendingDown} color="bg-rose-500" />
      </div>

      {/* 2. Main Chart Card */}
      <Card className="flex flex-col border-0 shadow-xl shadow-sakura-100/20 bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-6 pt-6">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-6 bg-sakura-400 rounded-full"></div>
                Price Action & Signals
            </h3>
            
            <div className="flex gap-2">
                <button onClick={onRequestCode} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full hover:bg-slate-200 transition-colors shadow-sm"><Code2 size={14} /> Code</button>
                <button onClick={onRequestStressTest} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-full hover:bg-rose-100 transition-colors shadow-sm border border-rose-100"><Zap size={14} /> Stress Test</button>
                <button onClick={onRequestDiagnosis} className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"><Sparkles size={14} /> AI Diagnose</button>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-bold bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <span className="flex items-center gap-1 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> BUY</span>
            <span className="flex items-center gap-1 text-rose-600"><div className="w-2 h-2 rounded-full bg-rose-500"></div> SELL</span>
          </div>
        </div>
        
        <div className="h-[450px] w-full -ml-2">
          <ResponsiveContainer width="100%" height="100%" className="outline-none">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="index" type="number" domain={[0, maxIndex]} scale="linear" minTickGap={50} tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#f1f5f9'}} tickFormatter={(index) => chartData[index] ? chartData[index].date : ''} allowDecimals={false} />
              <YAxis domain={yDomain as [number, number]} width={60} tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#f1f5f9'}} tickFormatter={(val) => `$${Number(val).toFixed(2)}`} />
              <Tooltip content={<CustomChartTooltip dataRef={chartData} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} isAnimationActive={false} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
              
              {/* --- OOS Visuals --- */}
              {/* 1. Shaded Area for Out-of-Sample */}
              <ReferenceArea x1={splitIndex} x2={maxIndex} fill="#f1f5f9" fillOpacity={0.5} />
              {/* 2. Divider Line */}
              <ReferenceLine x={splitIndex} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1}>
                <Label value="OUT OF SAMPLE (TEST)" position="insideTopRight" fill="#94a3b8" fontSize={10} fontWeight="bold" offset={10} />
              </ReferenceLine>
              {/* 3. In-Sample Label */}
              <ReferenceLine x={0} stroke="transparent">
                 <Label value="IN SAMPLE (TRAIN)" position="insideTopLeft" fill="#cbd5e1" fontSize={10} fontWeight="bold" offset={10} />
              </ReferenceLine>

              <Bar dataKey="close" name="HoverTrigger" fill="transparent" barSize={Number.MAX_SAFE_INTEGER} isAnimationActive={false} legendType="none" />
              <Area type="monotone" dataKey="close" stroke="#38bdf8" strokeWidth={2} fill="url(#colorPrice)" name="Price" legendType="circle" activeDot={enableAnimation ? {r: 4} : false} {...commonAnimProps} />

              {/* Strategy Specific Lines */}
              {strategyType === StrategyType.SMA_CROSSOVER && (
                <>
                  <Line type="monotone" dataKey="smaShort" stroke="#ec4899" dot={false} strokeWidth={2} name="Short SMA" {...commonAnimProps} />
                  <Line type="monotone" dataKey="smaLong" stroke="#94a3b8" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Long SMA" {...commonAnimProps} />
                </>
              )}
              {/* ... Add other strategies (EMA, BOLLINGER, etc.) here if needed, keeping code short ... */}
              {strategyType === StrategyType.TURTLE && (
                <>
                  <Line type="step" dataKey="upperBand" stroke="#10b981" dot={false} strokeWidth={1} name="High (Entry)" {...commonAnimProps} />
                  <Line type="step" dataKey="lowerBand" stroke="#f43f5e" dot={false} strokeWidth={1} name="Low (Exit)" {...commonAnimProps} />
                </>
              )}

              <Scatter data={buySignals} name="Buy Signal" dataKey="buySignal" fill="#10b981" shape={<TriangleShape />} legendType="triangle" onClick={(data) => onTradeClick && onTradeClick(data)} style={{ cursor: 'pointer' }} {...commonAnimProps} />
              <Scatter data={sellSignals} name="Sell Signal" dataKey="sellSignal" fill="#f43f5e" shape={<TriangleShape />} legendType="triangle" onClick={(data) => onTradeClick && onTradeClick(data)} style={{ cursor: 'pointer' }} {...commonAnimProps} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 3. Advanced Risk Analysis Panel (NEW) */}
      <RiskAnalysisPanel metrics={result.metrics} />

      {/* 4. Trade Log */}
      <Card className="border-0 shadow-lg shadow-slate-100/50 bg-white backdrop-blur">
        <h3 className="font-bold text-slate-600 mb-4 text-sm uppercase tracking-wide flex items-center gap-2"><Activity size={16} className="text-slate-400" /> Execution Log</h3>
        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-slate-400 font-bold text-xs uppercase tracking-wider sticky top-0 bg-white z-10">
              <tr><th className="pb-3 pl-4 border-b border-slate-100">Date</th><th className="pb-3 border-b border-slate-100">Action</th><th className="pb-3 border-b border-slate-100">Price</th><th className="pb-3 border-b border-slate-100">Signal Logic</th></tr>
            </thead>
            <tbody className="text-slate-600">
              {result.trades.slice().reverse().map((trade, i) => (
                <tr key={i} className="group transition-colors border-b border-slate-50 last:border-0 odd:bg-white even:bg-slate-50/60 hover:!bg-sakura-50/30">
                  <td className="py-3 pl-4 font-mono text-xs">{new Date(trade.date).toLocaleDateString()}</td>
                  <td className="py-3"><Badge color={trade.type === 'BUY' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}>{trade.type}</Badge></td>
                  <td className="py-3 font-mono font-bold">${trade.price.toFixed(2)}</td>
                  <td className="py-3 text-xs text-slate-400 italic">{trade.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.trades.length === 0 && <div className="py-12 text-center flex flex-col items-center gap-2 text-slate-400"><div className="text-2xl opacity-50">🕸️</div><p>No trades triggered.</p></div>}
        </div>
      </Card>
    </div>
  );
};