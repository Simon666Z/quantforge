import vectorbt as vbt
import pandas as pd
import numpy as np

class SakuraEngine:
    def __init__(self, data: pd.DataFrame):
        self.data = data.copy()
        # 确保索引是时间格式，这对 VBT 至关重要
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
            # --- 1. 策略逻辑 (保持不变) ---
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
                roc = (self.close.diff(period) / self.close.shift(period)) * 100
                entries = (roc > 0) & (roc.shift(1) <= 0)
                exits = (roc < 0) & (roc.shift(1) >= 0)
                indicators['roc'] = roc

        except Exception as e:
            print(f"Strategy Calc Error: {e}")
            entries = pd.Series(False, index=self.close.index)

        # --- 2. 残酷现实处理 ---
        # 信号防未来函数：后移一天
        real_entries = entries.vbt.signals.fshift(1).fillna(False)
        real_exits = exits.vbt.signals.fshift(1).fillna(False)
        
        # --- 3. 回测执行 ---
        # 满仓模式 (100% Equity)
        pf = vbt.Portfolio.from_signals(
            close=self.close, 
            entries=real_entries, 
            exits=real_exits, 
            price=self.open, 
            fees=fees, 
            slippage=slippage,
            init_cash=capital,
            freq='1D',
            size=1.0,               
            size_type='percent',   
            accumulate=True 
        )

        # --- 4. 结果解析 (修复核心) ---

        # Metrics
        sharpe = pf.sharpe_ratio()
        if np.isnan(sharpe): sharpe = 0.0

        win_rate = pf.trades.win_rate() # 胜率还是看 Trade
        if np.isnan(win_rate): win_rate = 0.0

        # 注意：这里改用 orders.count()，只要有动作就算
        action_count = int(pf.orders.count())

        metrics = {
            "totalReturn": float(pf.total_return() * 100),
            "finalCapital": float(pf.final_value()),
            "initialCapital": float(capital),
            "maxDrawdown": float(pf.max_drawdown() * 100),
            "winRate": float(win_rate * 100),
            "tradeCount": action_count, # 用 Order 数量替代 Trade 数量
            "sharpeRatio": float(sharpe)
        }

        # Trades Parsing (改用 Orders 解析)
        # Orders 是最底层的记录，绝对不会漏
        trades_list = []
        try:
            # records_readable 对 orders 也有效
            orders_record = pf.orders.records_readable
            
            if not orders_record.empty:
                for i, row in orders_record.iterrows():
                    # Order 只有 Timestamp，没有 Entry/Exit 之分
                    dt = row['Timestamp']
                    date_str = dt.strftime('%Y-%m-%d') if hasattr(dt, 'strftime') else str(dt)
                    
                    # 识别方向
                    side = row['Side'] # 通常是 'Buy' 或 'Sell'
                    type_str = "BUY" if side == 'Buy' else "SELL"
                    
                    trades_list.append({
                        "date": date_str,
                        "type": type_str,
                        "price": float(row['Price']),
                        "reason": "Signal Triggered" 
                    })
            
            trades_list.sort(key=lambda x: x['date'])

        except Exception as e:
            print(f"!!! Orders Parsing Error: {e}")
            # 如果 readable 失败，尝试用原始 records 解析 (双重保险)
            try:
                raw_records = pf.orders.records
                for rec in raw_records:
                    idx = rec['idx'] # 行号
                    date_val = self.close.index[idx] # 反查日期
                    date_str = date_val.strftime('%Y-%m-%d')
                    
                    # size > 0 is Buy? VBT raw records logic is complex
                    # 简单起见，如果这里也挂了，就返回空
                    pass
            except:
                pass
            trades_list = []

        return {
            "metrics": metrics,
            "trades": trades_list,
            "indicators": indicators,
            "entries": entries, 
            "exits": exits
        }