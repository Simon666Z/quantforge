import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Area, Line, Bar, Scatter, XAxis, YAxis, Tooltip, Legend, LineChart
} from 'recharts';
import { BacktestResult, StrategyType } from '../types';
import { Card, Badge } from './UI';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3 } from 'lucide-react';

interface ResultsViewProps {
  result: BacktestResult | null;
  strategyType: StrategyType;
}

const CustomChartTooltip = React.memo(({ active, payload, label, dataRef }: any) => {
  if (!active || !payload || !payload.length) return null;

  const originalDataPoint = dataRef[label]; 
  const dateStr = originalDataPoint ? originalDataPoint.date : '';

  return (
    <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-100 shadow-xl rounded-xl min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
      <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-2 text-sm font-mono">
        {dateStr}
      </p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry: any, index: number) => {
          if (entry.name === 'index' || entry.name === 'HoverTrigger' || entry.value === null || entry.value === undefined) {
            return null;
          }
          const displayValue = typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value;
          return (
            <div key={index} className="flex justify-between items-center gap-6 text-xs">
              <span className="flex items-center gap-2 text-slate-500 font-medium">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="font-mono font-bold text-slate-700">{displayValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const MetricCard = ({ label, value, subValue, icon: Icon, color }: any) => {
  const textColor = color.replace('bg-', 'text-');
  return (
    <div className="relative overflow-hidden bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group transition-all hover:shadow-md">
      <div className={`absolute top-3 right-3 opacity-25 group-hover:opacity-50 transition-all duration-300 transform group-hover:scale-110 ${textColor}`}>
        <Icon size={42} strokeWidth={1.5} />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">{label}</p>
      <div className="flex items-baseline gap-2 relative z-10">
         <h3 className={`text-2xl font-mono font-bold ${textColor}`}>{value}</h3>
         {subValue && <span className="text-xs text-slate-400 font-medium">{subValue}</span>}
      </div>
    </div>
  );
};

export const ResultsView: React.FC<ResultsViewProps> = ({ result, strategyType }) => {
  
  const { chartData, buySignals, sellSignals, maxIndex, yDomain } = useMemo(() => {
    if (!result || !result.data || result.data.length === 0) {
      return { chartData: [], buySignals: [], sellSignals: [], maxIndex: 0, yDomain: ['auto', 'auto'] };
    }

    const rawData = result.data;
    let minVal = Infinity;
    let maxVal = -Infinity;

    // 1. 预处理数据 & 计算极值
    const processed = rawData.map((d, i) => {
      const vals = [
        d.low, d.high, d.close, 
        d.upperBand, d.lowerBand, 
        d.smaShort, d.smaLong,
        d.emaShort, d.emaLong
      ].filter(v => v !== undefined && v !== null) as number[];

      const localMin = Math.min(...vals);
      const localMax = Math.max(...vals);

      if (localMin < minVal) minVal = localMin;
      if (localMax > maxVal) maxVal = localMax;

      return {
        ...d,
        index: i,
      };
    });

    const padding = (maxVal - minVal) * 0.05;
    const yMin = Math.max(0, minVal - padding); 
    const yMax = maxVal + padding;

    // 2. 提取信号
    const buys = processed
      .filter(d => d.buySignal !== undefined)
      .map(d => ({ index: d.index, buySignal: d.buySignal }));
      
    const sells = processed
      .filter(d => d.sellSignal !== undefined)
      .map(d => ({ index: d.index, sellSignal: d.sellSignal }));

    return { 
      chartData: processed, 
      buySignals: buys, 
      sellSignals: sells,
      maxIndex: processed.length - 1,
      yDomain: [yMin, yMax]
    };
  }, [result]);

  if (!result) {
    return (
      <div className="h-[500px] flex items-center justify-center flex-col gap-6 bg-white/30 border border-slate-100 rounded-3xl backdrop-blur-sm">
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          label="Total Return" 
          value={`${isProfit ? '+' : ''}${result.metrics.totalReturn.toFixed(2)}%`}
          icon={isProfit ? TrendingUp : TrendingDown}
          color={isProfit ? 'bg-emerald-500' : 'bg-rose-500'}
        />
        <MetricCard 
          label="Final Capital" 
          value={`$${Math.round(result.metrics.finalCapital).toLocaleString()}`}
          subValue={`from $${result.metrics.initialCapital.toLocaleString()}`}
          icon={DollarSign}
          color="bg-slate-700"
        />
        <MetricCard 
          label="Total Actions"
          value={result.trades.length}
          icon={Activity}
          color="bg-sky-500"
        />
        <MetricCard 
          label="Max Drawdown" 
          value={`-${result.metrics.maxDrawdown.toFixed(2)}%`}
          icon={TrendingDown}
          color="bg-rose-400"
        />
      </div>

      <Card className="h-[450px] flex flex-col border-0 shadow-xl shadow-sakura-100/20 bg-white/80 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-6 bg-sakura-400 rounded-full"></div>
            Price Action & Signals
          </h3>
          <div className="flex gap-4 text-xs font-bold bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <span className="flex items-center gap-1 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> BUY</span>
            <span className="flex items-center gap-1 text-rose-600"><div className="w-2 h-2 rounded-full bg-rose-500"></div> SELL</span>
          </div>
        </div>
        
        <div className="flex-1 w-full -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <XAxis 
                dataKey="index" 
                type="number"
                domain={[0, maxIndex]}
                scale="linear" 
                minTickGap={50} 
                tick={{fontSize: 10, fill: '#64748b'}} 
                tickLine={false} 
                axisLine={{stroke: '#f1f5f9'}} 
                tickFormatter={(index) => chartData[index] ? chartData[index].date : ''}
                allowDecimals={false}
              />
              
              {/* 修复：强制格式化为两位小数，并增加 width 防止切断 */}
              <YAxis 
                domain={yDomain as [number, number]} 
                width={60}
                tick={{fontSize: 10, fill: '#64748b'}} 
                tickLine={false} 
                axisLine={{stroke: '#f1f5f9'}} 
                tickFormatter={(val) => `$${Number(val).toFixed(2)}`} 
              />
              
              <Tooltip 
                content={<CustomChartTooltip dataRef={chartData} />} 
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} 
                isAnimationActive={false}
              />
              
              <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '15px'}} />
              
              {/* 隐形触发层 */}
              <Bar dataKey="close" name="HoverTrigger" fill="transparent" barSize={Number.MAX_SAFE_INTEGER} isAnimationActive={false} />

              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#38bdf8" 
                strokeWidth={2} 
                fill="url(#colorPrice)" 
                name="Price" 
                isAnimationActive={enableAnimation}
                activeDot={enableAnimation ? {r: 4} : false} 
              />

              {strategyType === StrategyType.SMA_CROSSOVER && (
                <>
                  <Line type="monotone" dataKey="smaShort" stroke="#ec4899" dot={false} strokeWidth={2} name="Short SMA" isAnimationActive={enableAnimation} activeDot={false} />
                  <Line type="monotone" dataKey="smaLong" stroke="#94a3b8" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Long SMA" isAnimationActive={enableAnimation} activeDot={false} />
                </>
              )}
              {strategyType === StrategyType.EMA_CROSSOVER && (
                <>
                  <Line type="monotone" dataKey="emaShort" stroke="#ec4899" dot={false} strokeWidth={2} name="Short EMA" isAnimationActive={enableAnimation} activeDot={false} />
                  <Line type="monotone" dataKey="emaLong" stroke="#94a3b8" dot={false} strokeWidth={2} strokeDasharray="5 5" name="Long EMA" isAnimationActive={enableAnimation} activeDot={false} />
                </>
              )}
              {strategyType === StrategyType.BOLLINGER_BANDS && (
                <>
                  <Line type="monotone" dataKey="upperBand" stroke="#f472b6" dot={false} strokeDasharray="3 3" strokeWidth={1} name="Upper Band" isAnimationActive={enableAnimation} activeDot={false} />
                  <Line type="monotone" dataKey="lowerBand" stroke="#f472b6" dot={false} strokeDasharray="3 3" strokeWidth={1} name="Lower Band" isAnimationActive={enableAnimation} activeDot={false} />
                </>
              )}

              <Scatter 
                data={buySignals}
                name="Buy Signal" 
                dataKey="buySignal" 
                fill="#10b981" 
                shape="triangle" 
                isAnimationActive={enableAnimation}
              />
              <Scatter 
                data={sellSignals}
                name="Sell Signal" 
                dataKey="sellSignal" 
                fill="#f43f5e" 
                shape="triangle" 
                transform="rotate(180)" 
                isAnimationActive={enableAnimation}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 副图表 */}
      {strategyType === StrategyType.RSI_REVERSAL && (
        <Card className="h-[220px] border-0 shadow-md shadow-slate-100">
          <h3 className="font-bold text-slate-600 mb-2 text-xs uppercase tracking-wide">Relative Strength Index</h3>
          <ResponsiveContainer width="100%" height="100%">
             <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                    dataKey="index" 
                    type="number"
                    domain={[0, maxIndex]} 
                    hide 
                />
                <YAxis domain={[0, 100]} ticks={[30, 70]} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip dataRef={chartData} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="rsi" stroke="#ec4899" dot={false} strokeWidth={2} name="RSI" isAnimationActive={enableAnimation} activeDot={false} />
                <Line type="monotone" dataKey={() => 70} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1} dot={false} name="Overbought" isAnimationActive={enableAnimation} />
                <Line type="monotone" dataKey={() => 30} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} dot={false} name="Oversold" isAnimationActive={enableAnimation} />
             </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {strategyType === StrategyType.MACD && (
        <Card className="h-[220px] border-0 shadow-md shadow-slate-100">
          <h3 className="font-bold text-slate-600 mb-2 text-xs uppercase tracking-wide">MACD Oscillator</h3>
          <ResponsiveContainer width="100%" height="100%">
             <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                    dataKey="index" 
                    type="number"
                    domain={[0, maxIndex]} 
                    hide 
                />
                <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip dataRef={chartData} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} isAnimationActive={false} />
                <Bar dataKey="macdHist" fill="#bae6fd" name="Histogram" isAnimationActive={enableAnimation} />
                <Line type="monotone" dataKey="macd" stroke="#0ea5e9" dot={false} strokeWidth={2} name="MACD" isAnimationActive={enableAnimation} activeDot={false} />
                <Line type="monotone" dataKey="macdSignal" stroke="#ec4899" dot={false} strokeWidth={2} name="Signal" isAnimationActive={enableAnimation} activeDot={false} />
             </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="border-0 shadow-lg shadow-slate-100/50 bg-white/90 backdrop-blur">
        <h3 className="font-bold text-slate-600 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
          <Activity size={16} className="text-slate-400" />
          Execution Log
        </h3>
        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-slate-400 font-bold text-xs uppercase tracking-wider sticky top-0 bg-white z-10">
              <tr>
                <th className="pb-3 pl-4 border-b border-slate-100">Date</th>
                <th className="pb-3 border-b border-slate-100">Action</th>
                <th className="pb-3 border-b border-slate-100">Price</th>
                <th className="pb-3 border-b border-slate-100">Signal Logic</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {result.trades.slice().reverse().map((trade, i) => (
                <tr key={i} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                  <td className="py-3 pl-4 font-mono text-xs">{new Date(trade.date).toLocaleDateString()}</td>
                  <td className="py-3">
                    <Badge color={trade.type === 'BUY' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-rose-100 text-rose-700 border border-rose-200 shadow-sm'}>
                      {trade.type}
                    </Badge>
                  </td>
                  <td className="py-3 font-mono font-bold group-hover:text-slate-900 transition-colors">${trade.price.toFixed(2)}</td>
                  <td className="py-3 text-xs text-slate-400 italic">{trade.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.trades.length === 0 && (
             <div className="py-12 text-center flex flex-col items-center gap-2 text-slate-400">
              <div className="text-2xl opacity-50">🕸️</div>
              <p>No trades triggered in this period.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};