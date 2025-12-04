import vectorbt as vbt
import pandas as pd
import numpy as np

class SakuraEngine:
    def __init__(self, data: pd.DataFrame):
        # 核心修复 1: 必须将 date 设为索引，否则 VBT 会使用整数索引，导致交易记录没有日期
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

    def run_strategy(self, strategy_type: str, params: dict, capital: float = 10000.0, fees: float = 0.001, slippage: float = 0.001):
        
        entries = pd.Series(False, index=self.close.index)
        exits = pd.Series(False, index=self.close.index)
        indicators = {}

        try:
            if strategy_type == "SMA_CROSSOVER":
                short_window = int(params.get('shortWindow', 20))
                long_window = int(params.get('longWindow', 50))
                fast_ma = vbt.MA.run(self.close, short_window)
                slow_ma = vbt.MA.run(self.close, long_window)
                entries = fast_ma.ma_crossed_above(slow_ma)
                exits = fast_ma.ma_crossed_below(slow_ma)
                indicators['smaShort'] = fast_ma.ma
                indicators['smaLong'] = slow_ma.ma

            elif strategy_type == "EMA_CROSSOVER":
                short_window = int(params.get('shortWindow', 20))
                long_window = int(params.get('longWindow', 50))
                fast_ma = vbt.MA.run(self.close, short_window, ewm=True)
                slow_ma = vbt.MA.run(self.close, long_window, ewm=True)
                entries = fast_ma.ma_crossed_above(slow_ma)
                exits = fast_ma.ma_crossed_below(slow_ma)
                indicators['emaShort'] = fast_ma.ma
                indicators['emaLong'] = slow_ma.ma

            elif strategy_type == "RSI_REVERSAL":
                period = int(params.get('rsiPeriod', 14))
                lower = int(params.get('rsiOversold', 30))
                upper = int(params.get('rsiOverbought', 70))
                rsi = vbt.RSI.run(self.close, window=period)
                entries = rsi.rsi_crossed_below(lower)
                exits = rsi.rsi_crossed_above(upper)
                indicators['rsi'] = rsi.rsi

            elif strategy_type == "BOLLINGER_BANDS":
                period = int(params.get('bbPeriod', 20))
                std_dev = float(params.get('bbStdDev', 2.0))
                bb = vbt.BBANDS.run(self.close, window=period, alpha=std_dev)
                entries = self.close < bb.lower
                exits = self.close > bb.upper
                indicators['upperBand'] = bb.upper
                indicators['lowerBand'] = bb.lower
                
            elif strategy_type == "MACD":
                fast = int(params.get('macdFast', 12))
                slow = int(params.get('macdSlow', 26))
                signal = int(params.get('macdSignal', 9))
                macd = vbt.MACD.run(self.close, fast_window=fast, slow_window=slow, signal_window=signal)
                entries = macd.macd_crossed_above(macd.signal)
                exits = macd.macd_crossed_below(macd.signal)
                indicators['macd'] = macd.macd
                indicators['macdSignal'] = macd.signal
                indicators['macdHist'] = macd.hist

            elif strategy_type == "MOMENTUM":
                period = int(params.get('rocPeriod', 12))
                # ROC = ((Price - Price_n) / Price_n) * 100
                roc = (self.close.diff(period) / self.close.shift(period)) * 100
                entries = (roc > 0) & (roc.shift(1) <= 0) # Zero cross up
                exits = (roc < 0) & (roc.shift(1) >= 0)   # Zero cross down
                indicators['roc'] = roc

        except Exception as e:
            print(f"Strategy Calc Error: {e}")
            entries = pd.Series(False, index=self.close.index)

        # --- 残酷现实处理 ---
        # 核心修复: 必须处理 shift 后的 NaN，用 fillna(False) 填充，否则 VBT 会报错
        real_entries = entries.vbt.signals.fshift(1).fillna(False)
        real_exits = exits.vbt.signals.fshift(1).fillna(False)
        
        # --- 回测执行 ---
        pf = vbt.Portfolio.from_signals(
            close=self.close, 
            entries=real_entries, 
            exits=real_exits, 
            price=self.open, 
            fees=fees, 
            slippage=slippage,
            init_cash=capital,
            freq='1D' # 显式声明频率，防止警告
        )

        # --- 结果组装 (核心修复 2: NumPy 类型转换) ---
        
        # 1. Metrics 清洗
        sharpe = pf.sharpe_ratio()
        if np.isnan(sharpe): sharpe = 0.0

        # win_rate 有时返回 nan
        win_rate = pf.trades.win_rate()
        if np.isnan(win_rate): win_rate = 0.0

        metrics = {
            "totalReturn": float(pf.total_return() * 100),
            "finalCapital": float(pf.final_value()),
            "initialCapital": float(capital),
            "maxDrawdown": float(pf.max_drawdown() * 100),
            "winRate": float(win_rate * 100),
            "tradeCount": int(pf.trades.count()),
            "sharpeRatio": float(sharpe)
        }

        # 2. 交易记录清洗
        trades_list = []
        try:
            trades_record = pf.trades.records_readable
            if not trades_record.empty:
                for i, row in trades_record.iterrows():
                    # 安全解析日期
                    entry_date = row['Entry Timestamp']
                    if hasattr(entry_date, 'strftime'):
                        date_str = entry_date.strftime('%Y-%m-%d')
                    else:
                        date_str = str(entry_date) # Fallback

                    trades_list.append({
                        "date": date_str,
                        "type": "BUY", 
                        "price": float(row['Entry Price']), # 强转 float
                        "reason": "Signal Triggered"
                    })

                    # Exit
                    if pd.notnull(row['Exit Timestamp']):
                        exit_date = row['Exit Timestamp']
                        if hasattr(exit_date, 'strftime'):
                            exit_date_str = exit_date.strftime('%Y-%m-%d')
                        else:
                            exit_date_str = str(exit_date)

                        trades_list.append({
                            "date": exit_date_str,
                            "type": "SELL",
                            "price": float(row['Exit Price']), # 强转 float
                            "reason": "Signal Triggered"
                        })
            
            trades_list.sort(key=lambda x: x['date'])
        except Exception as e:
            print(f"Trade parsing error: {e}")
            trades_list = []

        return {
            "metrics": metrics,
            "trades": trades_list,
            "indicators": indicators,
            "entries": entries, 
            "exits": exits
        }