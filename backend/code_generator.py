from typing import Dict, Any

def generate_pseudocode(strategy: str, params: Dict[str, Any]) -> str:
    if strategy == "SMA_CROSSOVER":
        return f"""LOGIC EXPLANATION:
1. Calculate the Short-term Moving Average (SMA) over {params.get('shortWindow')} days.
2. Calculate the Long-term Moving Average (SMA) over {params.get('longWindow')} days.
3. BUY SIGNAL: When the Short SMA crosses ABOVE the Long SMA.
   -> This indicates momentum is shifting upwards (Golden Cross).
4. SELL SIGNAL: When the Short SMA crosses BELOW the Long SMA.
   -> This indicates momentum is shifting downwards (Death Cross).
"""
    elif strategy == "RSI_REVERSAL":
        return f"""LOGIC EXPLANATION:
1. Calculate the Relative Strength Index (RSI) over {params.get('rsiPeriod')} days.
2. BUY SIGNAL: When RSI drops below {params.get('rsiOversold')}.
   -> The asset is considered 'Oversold' and might bounce back.
3. SELL SIGNAL: When RSI rises above {params.get('rsiOverbought')}.
   -> The asset is considered 'Overbought' and might correct.
"""
    # ... 其他策略可以按需补充 ...
    return "Logic description not available for this strategy."

def generate_vectorbt_code(ticker: str, strategy: str, params: Dict[str, Any], fees: float, slippage: float) -> str:
    # 基础头部
    code = f"""import vectorbt as vbt
import yfinance as yf

# 1. Configuration
SYMBOL = "{ticker}"
FEES = {fees}
SLIPPAGE = {slippage}
CAPITAL = {params.get('initialCapital', 10000)}

# 2. Fetch Data
print(f"Fetching data for {{SYMBOL}}...")
data = yf.Ticker(SYMBOL).history(period="2y", auto_adjust=True)
close = data['Close']
open_price = data['Open']

# 3. Strategy Logic: {strategy}
"""
    # 策略特定逻辑
    if strategy == "SMA_CROSSOVER":
        code += f"""
fast_ma = vbt.MA.run(close, {params.get('shortWindow')})
slow_ma = vbt.MA.run(close, {params.get('longWindow')})

entries = fast_ma.ma_crossed_above(slow_ma)
exits = fast_ma.ma_crossed_below(slow_ma)
"""
    elif strategy == "RSI_REVERSAL":
        code += f"""
rsi = vbt.RSI.run(close, window={params.get('rsiPeriod')})
entries = rsi.rsi_crossed_below({params.get('rsiOversold')})
exits = rsi.rsi_crossed_above({params.get('rsiOverbought')})
"""
    # ... 其他策略 ...
    else:
        code += "\n# Strategy logic placeholder\nentries = close > close.shift(1)\nexits = close < close.shift(1)\n"

    # 通用尾部
    code += """
# 4. Reality Check (Prevent Look-ahead Bias)
# Shift signals to execute on the NEXT open
real_entries = entries.vbt.signals.fshift(1)
real_exits = exits.vbt.signals.fshift(1)

# 5. Run Backtest
pf = vbt.Portfolio.from_signals(
    close=close,
    entries=real_entries,
    exits=real_exits,
    price=open_price, # Execute at Open
    fees=FEES,
    slippage=SLIPPAGE,
    init_cash=CAPITAL,
    freq='1D',
    size=1.0,
    size_type='percent'
)

# 6. Print Stats
print(pf.stats())
pf.plot().show()
"""
    return code

def generate_backtrader_code(ticker: str, strategy: str, params: Dict[str, Any], fees: float, slippage: float) -> str:
    code = f"""import backtrader as bt
import yfinance as yf

class MyStrategy(bt.Strategy):
    params = (
"""
    # 参数定义
    for k, v in params.items():
        if isinstance(v, (int, float)):
            code += f"        ('{k}', {v}),\n"
            
    code += f"""    )

    def __init__(self):
        self.dataclose = self.datas[0].close
        self.order = None
"""
    
    # 策略初始化
    if strategy == "SMA_CROSSOVER":
        code += f"""
        self.fast_ma = bt.indicators.SimpleMovingAverage(
            self.datas[0], period=self.params.shortWindow)
        self.slow_ma = bt.indicators.SimpleMovingAverage(
            self.datas[0], period=self.params.longWindow)
        self.crossover = bt.ind.CrossOver(self.fast_ma, self.slow_ma)
"""
    elif strategy == "RSI_REVERSAL":
        code += f"""
        self.rsi = bt.indicators.RSI(self.datas[0], period=self.params.rsiPeriod)
"""

    code += """
    def next(self):
        if self.order:
            return  # Pending order exists

        if not self.position:
"""
    # 买入逻辑
    if strategy == "SMA_CROSSOVER":
        code += """            if self.crossover > 0:
                self.buy()
"""
    elif strategy == "RSI_REVERSAL":
        code += """            if self.rsi < self.params.rsiOversold:
                self.buy()
"""
    
    code += """        else:
"""
    # 卖出逻辑
    if strategy == "SMA_CROSSOVER":
        code += """            if self.crossover < 0:
                self.close()
"""
    elif strategy == "RSI_REVERSAL":
        code += """            if self.rsi > self.params.rsiOverbought:
                self.close()
"""

    # 运行逻辑
    code += f"""
if __name__ == '__main__':
    cerebro = bt.Cerebro()
    cerebro.addstrategy(MyStrategy)

    # Data Feed
    data = bt.feeds.PandasData(dataname=yf.download('{ticker}', period='2y', auto_adjust=True))
    cerebro.adddata(data)

    # Broker Settings
    cerebro.broker.setcash({params.get('initialCapital', 10000)})
    cerebro.broker.setcommission(commission={fees})
    # Note: Backtrader slippage handling is more complex, usually done via slippage_perc

    print('Starting Portfolio Value: %.2f' % cerebro.broker.getvalue())
    cerebro.run()
    print('Final Portfolio Value: %.2f' % cerebro.broker.getvalue())
    cerebro.plot()
"""
    return code