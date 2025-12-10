import vectorbt as vbt
import pandas as pd
import numpy as np
from typing import Optional

class SakuraEngine:
    def __init__(self, data: pd.DataFrame):
        self.data = data.copy()
        if 'date' in self.data.columns:
            self.data['date'] = pd.to_datetime(self.data['date'])
            self.data.set_index('date', inplace=True)
            
        self.data.sort_index(inplace=True)
        
        self.close = self.data['close']
        self.open = self.data['open']
        self.high = self.data['high']
        self.low = self.data['low']
        self.volume = self.data['volume']

    def _calculate_adx(self, period=14):
        """Helper to calculate ADX using pandas only"""
        plus_dm = self.high.diff()
        minus_dm = self.low.diff()
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm > 0] = 0
        
        tr1 = pd.DataFrame(self.high - self.low)
        tr2 = pd.DataFrame(abs(self.high - self.close.shift(1)))
        tr3 = pd.DataFrame(abs(self.low - self.close.shift(1)))
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        atr = tr.rolling(period).mean()
        
        plus_di = 100 * (plus_dm.ewm(alpha=1/period).mean() / atr)
        minus_di = 100 * (abs(minus_dm).ewm(alpha=1/period).mean() / atr)
        
        dx = (abs(plus_di - minus_di) / abs(plus_di + minus_di)) * 100
        adx = dx.rolling(period).mean()
        return adx

    def run_strategy(self, strategy_type: str, params: dict, capital: float = 10000.0, fees: float = 0.001, slippage: float = 0.001,
                     metrics_start: Optional[pd.Timestamp] = None, metrics_end: Optional[pd.Timestamp] = None):
        
        entries = pd.Series(False, index=self.close.index)
        exits = pd.Series(False, index=self.close.index)
        indicators = {}

        try:
            # --- 1. 基础策略 (Trend & Mean Reversion) ---
            if strategy_type == "SMA_CROSSOVER":
                s_window = int(params.get('shortWindow', 20))
                l_window = int(params.get('longWindow', 50))
                fast_ma = vbt.MA.run(self.close, s_window)
                slow_ma = vbt.MA.run(self.close, l_window)
                entries = fast_ma.ma_crossed_above(slow_ma)
                exits = fast_ma.ma_crossed_below(slow_ma)
                indicators['smaShort'] = fast_ma.ma
                indicators['smaLong'] = slow_ma.ma

            elif strategy_type == "EMA_CROSSOVER":
                s_window = int(params.get('shortWindow', 20))
                l_window = int(params.get('longWindow', 50))
                fast_ma = vbt.MA.run(self.close, s_window, ewm=True)
                slow_ma = vbt.MA.run(self.close, l_window, ewm=True)
                entries = fast_ma.ma_crossed_above(slow_ma)
                exits = fast_ma.ma_crossed_below(slow_ma)
                indicators['emaShort'] = fast_ma.ma
                indicators['emaLong'] = slow_ma.ma

            elif strategy_type == "RSI_REVERSAL":
                period = int(params.get('rsiPeriod', 14))
                rsi = vbt.RSI.run(self.close, window=period)
                entries = rsi.rsi_crossed_below(int(params.get('rsiOversold', 30)))
                exits = rsi.rsi_crossed_above(int(params.get('rsiOverbought', 70)))
                indicators['rsi'] = rsi.rsi

            elif strategy_type == "BOLLINGER_BANDS":
                bb = vbt.BBANDS.run(self.close, window=int(params.get('bbPeriod', 20)), alpha=float(params.get('bbStdDev', 2.0)))
                entries = self.close < bb.lower
                exits = self.close > bb.upper
                indicators['upperBand'] = bb.upper
                indicators['lowerBand'] = bb.lower
                
            elif strategy_type == "MACD":
                macd = vbt.MACD.run(self.close, fast_window=int(params.get('macdFast', 12)), slow_window=int(params.get('macdSlow', 26)), signal_window=int(params.get('macdSignal', 9)))
                entries = macd.macd_crossed_above(macd.signal)
                exits = macd.macd_crossed_below(macd.signal)
                indicators['macd'] = macd.macd
                indicators['macdSignal'] = macd.signal
                indicators['macdHist'] = macd.hist
            
            elif strategy_type == "MOMENTUM":
                roc = (self.close.diff(int(params.get('rocPeriod', 12))) / self.close.shift(int(params.get('rocPeriod', 12)))) * 100
                entries = (roc > 0) & (roc.shift(1) <= 0)
                exits = (roc < 0) & (roc.shift(1) >= 0)
                indicators['roc'] = roc

            # --- 2. 进阶策略 (Advanced Filters & Breakouts) ---
            
            # A. 双重确认 (Trend + RSI)
            elif strategy_type == "TREND_RSI":
                ma = vbt.MA.run(self.close, int(params.get('trendMa', 200)))
                rsi = vbt.RSI.run(self.close, window=int(params.get('rsiPeriod', 14)))
                # 只有在大趋势向上时，才允许抄底
                entries = (self.close > ma.ma) & rsi.rsi_crossed_below(int(params.get('rsiOversold', 30)))
                exits = rsi.rsi_crossed_above(70) | (self.close < ma.ma) # 止盈或趋势破位止损
                indicators['smaLong'] = ma.ma
                indicators['rsi'] = rsi.rsi

            # B. 波动率过滤 (Volatility Filter)
            elif strategy_type == "VOLATILITY_FILTER":
                adx_period = int(params.get('adxPeriod', 14))
                adx_threshold = int(params.get('adxThreshold', 25))
                # 基础均线信号
                fast_ma = vbt.MA.run(self.close, 10)
                slow_ma = vbt.MA.run(self.close, 50)
                base_entries = fast_ma.ma_crossed_above(slow_ma)
                base_exits = fast_ma.ma_crossed_below(slow_ma)
                
                # ADX 计算
                adx = self._calculate_adx(adx_period)
                is_trending = adx > adx_threshold
                
                # 过滤信号：只有在趋势强劲时才开仓
                entries = base_entries & is_trending
                exits = base_exits # 出场通常不需要过滤，或者也可以强制止损
                
                indicators['smaShort'] = fast_ma.ma
                indicators['smaLong'] = slow_ma.ma
                # indicators['adx'] = adx # 前端目前还没画 ADX 的图，暂不传

            # C. 海龟法则 (Turtle / Donchian)
            elif strategy_type == "TURTLE":
                entry_window = int(params.get('turtleEntry', 20))
                exit_window = int(params.get('turtleExit', 10))
                
                # Donchian Channel
                high_n = self.high.rolling(entry_window).max().shift(1)
                low_n = self.low.rolling(exit_window).min().shift(1)
                
                entries = self.close > high_n
                exits = self.close < low_n
                
                indicators['upperBand'] = high_n
                indicators['lowerBand'] = low_n

            # D. 肯特纳通道 (Keltner Channels)
            elif strategy_type == "KELTNER":
                ema_period = int(params.get('keltnerPeriod', 20))
                atr_mult = float(params.get('keltnerMult', 2.0))
                
                # Keltner 计算
                middle = vbt.MA.run(self.close, window=ema_period, ewm=True).ma
                atr = vbt.ATR.run(self.high, self.low, self.close, window=10).atr
                
                upper = middle + (atr * atr_mult)
                lower = middle - (atr * atr_mult)
                
                # 突破上轨买入 (趋势策略)
                entries = self.close > upper
                # 跌破中轨卖出 (或者跌破下轨，看激进程度，这里选跌破中轨保护利润)
                exits = self.close < middle
                
                indicators['upperBand'] = upper
                indicators['lowerBand'] = lower
                indicators['emaShort'] = middle

        except Exception as e:
            print(f"Strategy Calc Error: {e}")
            entries = pd.Series(False, index=self.close.index)

        # --- 残酷现实 & 风控 ---
        real_entries = entries.vbt.signals.fshift(1).fillna(False)
        real_exits = exits.vbt.signals.fshift(1).fillna(False)
        
        sl_stop = params.get('stopLoss', 0) / 100.0
        tp_stop = params.get('takeProfit', 0) / 100.0
        ts_stop = params.get('trailingStop', 0) / 100.0

        sl = sl_stop if sl_stop > 0 else None
        tp = tp_stop if tp_stop > 0 else None
        ts = ts_stop if ts_stop > 0 else None

        # 如果启用追踪止损，覆盖普通止损
        run_params = {
            "close": self.close, "entries": real_entries, "exits": real_exits, "price": self.open,
            "fees": fees, "slippage": slippage, "init_cash": capital, "freq": '1D',
            "size": 1.0, "size_type": 'percent', "accumulate": True,
            "tp_stop": tp
        }
        
        if ts:
            run_params["sl_stop"] = ts
            run_params["sl_trail"] = True
        else:
            run_params["sl_stop"] = sl

        pf = vbt.Portfolio.from_signals(**run_params)

        # If a metrics window is provided, slice the portfolio to this window
        pf_used = pf
        try:
            if metrics_start is not None and metrics_end is not None:
                # Use time-based slicing; vectorbt Portfolio supports .loc over the underlying index
                pf_used = pf.loc[metrics_start:metrics_end]
        except Exception:
            # Fall back to original portfolio if slicing not supported
            pf_used = pf

        # --- 结果解析 ---
        sharpe = pf_used.sharpe_ratio()
        if np.isnan(sharpe): sharpe = 0.0
        win_rate = pf_used.trades.win_rate()
        if np.isnan(win_rate): win_rate = 0.0
        action_count = int(pf_used.orders.count())

        # For consistency within the visible window, set initialCapital to the equity at the window start
        try:
            start_value = float(pf_used.value().iloc[0])
        except Exception:
            start_value = float(capital)

        metrics = {
            "totalReturn": float(pf_used.total_return() * 100),
            "finalCapital": float(pf_used.final_value()),
            "initialCapital": start_value,
            "maxDrawdown": float(pf_used.max_drawdown() * 100),
            "winRate": float(win_rate * 100),
            "tradeCount": action_count,
            "sharpeRatio": float(sharpe)
        }

        trades_list = []
        try:
            orders_record = pf.orders.records_readable
            if not orders_record.empty:
                for i, row in orders_record.iterrows():
                    dt = row['Timestamp']
                    date_str = dt.strftime('%Y-%m-%d') if hasattr(dt, 'strftime') else str(dt)
                    # Filter orders outside the requested metrics window if provided
                    if metrics_start is not None and metrics_end is not None and hasattr(dt, 'to_pydatetime'):
                        try:
                            if dt < metrics_start or dt > metrics_end:
                                continue
                        except Exception:
                            pass
                    side = row['Side']
                    type_str = "BUY" if side == 'Buy' else "SELL"
                    trades_list.append({
                        "date": date_str,
                        "type": type_str,
                        "price": float(row['Price']),
                        "reason": "Signal / Risk Trigger" 
                    })
            trades_list.sort(key=lambda x: x['date'])
        except Exception as e:
            print(f"Orders Parsing Error: {e}")
            trades_list = []

        return {
            "metrics": metrics,
            "trades": trades_list,
            "indicators": indicators,
            "entries": entries, 
            "exits": exits
        }