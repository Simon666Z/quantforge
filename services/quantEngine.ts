
import { StockDataPoint, StrategyParams, StrategyType, BacktestResult, TradeSignal } from '../types';

/**
 * Standard Indicator Functions
 */

const calculateSMA = (data: number[], window: number): (number | null)[] => {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      sma.push(null);
    } else {
      const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / window);
    }
  }
  return sma;
};

const calculateEMA = (data: number[], window: number): (number | null)[] => {
  const ema = [];
  const k = 2 / (window + 1);
  let initialSum = 0;
  for(let i=0; i<window; i++) initialSum += data[i];
  const initialSMA = initialSum / window;

  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      ema.push(null);
    } else if (i === window - 1) {
      ema.push(initialSMA);
    } else {
      const prevEMA = ema[i - 1]!;
      const currentEMA = (data[i] * k) + (prevEMA * (1 - k));
      ema.push(currentEMA);
    }
  }
  return ema;
};

const calculateRSI = (data: number[], period: number): (number | null)[] => {
  const rsiArray = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rsiArray.push(null);
      continue;
    }
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    if (i < period) {
      gains += gain;
      losses += loss;
      rsiArray.push(null);
    } else if (i === period) {
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgGain / (avgLoss || 1);
      rsiArray.push(100 - (100 / (1 + rs)));
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      let sGains = 0;
      let sLosses = 0;
      for(let j=1; j<slice.length; j++) {
        const chg = slice[j] - slice[j-1];
        if(chg>0) sGains+=chg; else sLosses+=Math.abs(chg);
      }
      const rs = (sGains/period) / ((sLosses/period) || 1);
      rsiArray.push(100 - (100 / (1 + rs)));
    }
  }
  return rsiArray;
};

const calculateBollinger = (data: number[], period: number, stdDevMult: number) => {
  const uppers = [];
  const lowers = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      uppers.push(null);
      lowers.push(null);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    uppers.push(mean + (stdDev * stdDevMult));
    lowers.push(mean - (stdDev * stdDevMult));
  }
  return { uppers, lowers };
};

const calculateMACD = (data: number[], fast: number, slow: number, signal: number) => {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const macdLine: (number | null)[] = [];
  
  for(let i=0; i<data.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine.push(emaFast[i]! - emaSlow[i]!);
    } else {
      macdLine.push(null);
    }
  }

  const validMacdValues: number[] = [];
  const validIndices: number[] = [];
  macdLine.forEach((val, idx) => {
    if(val !== null) {
      validMacdValues.push(val);
      validIndices.push(idx);
    }
  });

  const signalLineRaw = calculateEMA(validMacdValues, signal);
  const signalLineFull: (number | null)[] = new Array(data.length).fill(null);
  signalLineRaw.forEach((val, idx) => {
    if (val !== null) signalLineFull[validIndices[idx]] = val;
  });

  const histogram = macdLine.map((m, i) => {
    const s = signalLineFull[i];
    if (m !== null && s !== null) return m - s;
    return null;
  });

  return { macdLine, signalLineFull, histogram };
};

const calculateROC = (data: number[], period: number): (number | null)[] => {
  const roc = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      roc.push(null);
    } else {
      const prev = data[i - period];
      const curr = data[i];
      roc.push(((curr - prev) / prev) * 100);
    }
  }
  return roc;
};

export const runBacktest = (
  rawData: StockDataPoint[], 
  strategyType: StrategyType, 
  params: StrategyParams,
  dateRange?: { start: string, end: string }
): BacktestResult => {
  const closes = rawData.map(d => d.close);
  let processedData = rawData.map(d => ({ ...d, buySignal: undefined, sellSignal: undefined }));

  // 1. Calculate Indicators
  if (strategyType === StrategyType.SMA_CROSSOVER) {
    const smaShort = calculateSMA(closes, params.shortWindow);
    const smaLong = calculateSMA(closes, params.longWindow);
    processedData.forEach((d, i) => {
      d.smaShort = smaShort[i] || undefined;
      d.smaLong = smaLong[i] || undefined;
    });
  } else if (strategyType === StrategyType.EMA_CROSSOVER) {
    const emaShort = calculateEMA(closes, params.shortWindow);
    const emaLong = calculateEMA(closes, params.longWindow);
    processedData.forEach((d, i) => {
      d.emaShort = emaShort[i] || undefined;
      d.emaLong = emaLong[i] || undefined;
    });
  } else if (strategyType === StrategyType.RSI_REVERSAL) {
    const rsi = calculateRSI(closes, params.rsiPeriod);
    processedData.forEach((d, i) => {
      d.rsi = rsi[i] || undefined;
    });
  } else if (strategyType === StrategyType.BOLLINGER_BANDS) {
    const { uppers, lowers } = calculateBollinger(closes, params.bbPeriod, params.bbStdDev);
    processedData.forEach((d, i) => {
      d.upperBand = uppers[i] || undefined;
      d.lowerBand = lowers[i] || undefined;
    });
  } else if (strategyType === StrategyType.MACD) {
    const { macdLine, signalLineFull, histogram } = calculateMACD(closes, params.macdFast, params.macdSlow, params.macdSignal);
    processedData.forEach((d, i) => {
      d.macd = macdLine[i] || undefined;
      d.macdSignal = signalLineFull[i] || undefined;
      d.macdHist = histogram[i] || undefined;
    });
  } else if (strategyType === StrategyType.MOMENTUM) {
    const roc = calculateROC(closes, params.rocPeriod);
    processedData.forEach((d, i) => {
      d.roc = roc[i] || undefined;
    });
  }

  // 2. Filter Data by Date Range
  if (dateRange) {
    processedData = processedData.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);
  }

  // 3. Run Trading Loop
  let capital = params.initialCapital; 
  let shares = 0;
  const trades: TradeSignal[] = [];
  let tradeCount = 0;
  let maxCapital = capital;
  let maxDrawdown = 0;

  for (let i = 1; i < processedData.length; i++) {
    const today = processedData[i];
    const yesterday = processedData[i-1];
    const price = today.close;
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let reason = '';

    switch (strategyType) {
      case StrategyType.SMA_CROSSOVER:
        if (today.smaShort && today.smaLong && yesterday.smaShort && yesterday.smaLong) {
          if (yesterday.smaShort <= yesterday.smaLong && today.smaShort > today.smaLong) {
            action = 'BUY';
            reason = `Golden Cross (Short > Long)`;
          } else if (yesterday.smaShort >= yesterday.smaLong && today.smaShort < today.smaLong) {
            action = 'SELL';
            reason = `Death Cross (Short < Long)`;
          }
        }
        break;
      case StrategyType.EMA_CROSSOVER:
        if (today.emaShort && today.emaLong && yesterday.emaShort && yesterday.emaLong) {
          if (yesterday.emaShort <= yesterday.emaLong && today.emaShort > today.emaLong) {
            action = 'BUY'; reason = 'EMA Bullish Cross';
          } else if (yesterday.emaShort >= yesterday.emaLong && today.emaShort < today.emaLong) {
            action = 'SELL'; reason = 'EMA Bearish Cross';
          }
        }
        break;
      case StrategyType.RSI_REVERSAL:
        if (today.rsi) {
          if (today.rsi < params.rsiOversold) {
            action = 'BUY'; reason = `RSI Oversold (${today.rsi.toFixed(1)})`;
          } else if (today.rsi > params.rsiOverbought) {
            action = 'SELL'; reason = `RSI Overbought (${today.rsi.toFixed(1)})`;
          }
        }
        break;
      case StrategyType.BOLLINGER_BANDS:
        if (today.lowerBand && today.upperBand) {
          if (today.close < today.lowerBand) {
            action = 'BUY'; reason = `Price < Lower Band`;
          } else if (today.close > today.upperBand) {
            action = 'SELL'; reason = `Price > Upper Band`;
          }
        }
        break;
      case StrategyType.MACD:
        if (today.macd !== undefined && today.macdSignal !== undefined && yesterday.macd !== undefined && yesterday.macdSignal !== undefined) {
          if (yesterday.macd <= yesterday.macdSignal && today.macd > today.macdSignal) {
            action = 'BUY'; reason = 'MACD Crossover Bullish';
          } else if (yesterday.macd >= yesterday.macdSignal && today.macd < today.macdSignal) {
            action = 'SELL'; reason = 'MACD Crossover Bearish';
          }
        }
        break;
      case StrategyType.MOMENTUM:
        if (today.roc !== undefined && yesterday.roc !== undefined) {
           if (yesterday.roc <= 0 && today.roc > 0) {
             action = 'BUY'; reason = 'Momentum Positive';
           } else if (yesterday.roc >= 0 && today.roc < 0) {
             action = 'SELL'; reason = 'Momentum Negative';
           }
        }
        break;
    }

    if (action === 'BUY' && capital > price) {
      const amountToBuy = Math.floor(capital / price);
      shares += amountToBuy;
      capital -= amountToBuy * price;
      trades.push({ date: today.date, type: 'BUY', price, reason });
      // Inject Signal for Charting
      processedData[i].buySignal = price; 
    } else if (action === 'SELL' && shares > 0) {
      capital += shares * price;
      shares = 0;
      trades.push({ date: today.date, type: 'SELL', price, reason });
      tradeCount++;
      // Inject Signal for Charting
      processedData[i].sellSignal = price;
    }

    const currentTotalValue = capital + (shares * price);
    if (currentTotalValue > maxCapital) maxCapital = currentTotalValue;
    const drawdown = (maxCapital - currentTotalValue) / (maxCapital || 1);
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  const finalValue = capital + (shares * (processedData.length > 0 ? processedData[processedData.length - 1].close : 0));
  const totalReturn = ((finalValue - params.initialCapital) / params.initialCapital) * 100;

  return {
    data: processedData,
    trades,
    metrics: {
      totalReturn,
      winRate: 0, 
      maxDrawdown: maxDrawdown * 100,
      tradeCount,
      finalCapital: finalValue,
      initialCapital: params.initialCapital
    }
  };
};
