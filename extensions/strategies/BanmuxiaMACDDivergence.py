"""Causal adaptation of Yuchi Trader's Banmuxia MACD video (gRbDQM8XRCg).

Video: MACD 13/34/9 EMA, ATR 13 RMA, repeated histogram divergence,
first fading histogram bar, signal-candle extreme +/- ATR, optional 1.5R exit.
Quantification choices: two successive divergences (three confirmed extrema),
at least 30% histogram contraction at each step, all three within 100 candles.
Price extrema are the completed MACD swing's high/low, including the key candle.
Extrema are confirmed on the key candle; signals are never backdated.
"""

from collections import deque
from datetime import datetime
from math import isfinite

import numpy as np
import pandas as pd
import talib.abstract as ta
from pandas import DataFrame

from freqtrade.strategy import IStrategy, Trade, stoploss_from_absolute


def confirmed_divergences(
    dataframe: DataFrame,
    min_contraction: float = 0.30,
    max_span: int = 100,
    required_divergences: int = 2,
) -> tuple[np.ndarray, np.ndarray]:
    """Only inspect candles up to i. A plateau alone is not a new reversal."""
    hist = dataframe['macdhist'].to_numpy(dtype=float)
    low = dataframe['low'].to_numpy(dtype=float)
    high = dataframe['high'].to_numpy(dtype=float)
    bullish = np.zeros(len(dataframe), dtype=np.int8)
    bearish = np.zeros(len(dataframe), dtype=np.int8)
    troughs: deque = deque(maxlen=required_divergences + 1)
    peaks: deque = deque(maxlen=required_divergences + 1)
    direction = 0
    last_peak = last_trough = 0

    for i in range(1, len(hist)):
        if not (np.isfinite(hist[i]) and np.isfinite(hist[i - 1])):
            direction = 0
            last_peak = last_trough = i
            continue
        delta = hist[i] - hist[i - 1]
        next_direction = 1 if delta > 0 else -1 if delta < 0 else 0
        if next_direction == 0:
            continue

        if next_direction > 0 and direction < 0:
            # The previous bar is now a confirmed histogram trough.
            pivot = i - 1
            price_low = float(np.min(low[last_peak:i + 1]))
            last_trough = pivot
            if hist[pivot] < 0 and hist[i] < 0:
                troughs.append((pivot, hist[pivot], price_low))
                if len(troughs) == required_divergences + 1 and pivot - troughs[0][0] <= max_span:
                    bullish[i] = int(all(
                        new[2] < old[2]
                        and abs(new[1]) <= abs(old[1]) * (1 - min_contraction)
                        for old, new in zip(troughs, list(troughs)[1:])
                    ))

        if next_direction < 0 and direction > 0:
            pivot = i - 1
            price_high = float(np.max(high[last_trough:i + 1]))
            last_peak = pivot
            if hist[pivot] > 0 and hist[i] > 0:
                peaks.append((pivot, hist[pivot], price_high))
                if len(peaks) == required_divergences + 1 and pivot - peaks[0][0] <= max_span:
                    bearish[i] = int(all(
                        new[2] > old[2]
                        and abs(new[1]) <= abs(old[1]) * (1 - min_contraction)
                        for old, new in zip(peaks, list(peaks)[1:])
                    ))
        direction = next_direction

    return bullish, bearish


class BanmuxiaMACDDivergence(IStrategy):
    INTERFACE_VERSION = 3
    can_short = True
    timeframe = '15m'
    startup_candle_count = 300
    process_only_new_candles = True
    minimal_roi = {}
    stoploss = -0.10
    trailing_stop = False
    use_exit_signal = False
    use_custom_stoploss = True
    use_custom_roi = True
    position_adjustment_enable = False

    risk_reward = 1.5
    min_hist_contraction = 0.30
    divergence_span = 100
    required_divergences = 2

    order_types = {
        'entry': 'market', 'exit': 'market', 'stoploss': 'market',
        'stoploss_on_exchange': False,
    }
    order_time_in_force = {'entry': 'GTC', 'exit': 'GTC'}

    plot_config = {
        'main_plot': {
            'atr_stop_long': {'color': '#62c7ff'},
            'atr_stop_short': {'color': '#ff6b81'},
        },
        'subplots': {'MACD 13 34 9': {
            'macd': {'color': '#62c7ff'},
            'macdsignal': {'color': '#faba25'},
            'macdhist': {'type': 'bar', 'color': '#7ab8ad'},
        }},
    }

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # TradingView's default EMA/EMA MACD. Warmup eliminates seed sensitivity.
        close = dataframe['close']
        dataframe['macd'] = close.ewm(span=13, adjust=False).mean() - close.ewm(span=34, adjust=False).mean()
        dataframe['macdsignal'] = dataframe['macd'].ewm(span=9, adjust=False).mean()
        dataframe['macdhist'] = dataframe['macd'] - dataframe['macdsignal']
        # Wilder ATR uses the same RMA recurrence as the video (length 13, multiplier 1).
        dataframe['atr'] = ta.ATR(dataframe, timeperiod=13)
        dataframe['atr_stop_long'] = dataframe['low'] - dataframe['atr']
        dataframe['atr_stop_short'] = dataframe['high'] + dataframe['atr']
        bull, bear = confirmed_divergences(
            dataframe, self.min_hist_contraction, self.divergence_span, self.required_divergences,
        )
        dataframe['bull_divergence'] = bull
        dataframe['bear_divergence'] = bear
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['enter_long'] = 0
        dataframe['enter_short'] = 0
        dataframe['enter_tag'] = None
        valid = (dataframe['volume'] > 0) & (dataframe['atr'] > 0)
        # Do not emit signals from the indicator warmup period.
        valid &= np.arange(len(dataframe)) >= self.startup_candle_count
        long = valid & dataframe['bull_divergence'].eq(1) & (dataframe['atr_stop_long'] > 0)
        short = valid & dataframe['bear_divergence'].eq(1)
        dataframe.loc[long, 'enter_long'] = 1
        dataframe.loc[short, 'enter_short'] = 1
        # Store the original signal stop in the persistent trade tag. Never move it
        # with a later candle or lose it when live candle history rolls forward.
        dataframe.loc[long, 'enter_tag'] = dataframe.loc[long, 'atr_stop_long'].map(lambda x: f'bmxL|{x:.12g}')
        dataframe.loc[short, 'enter_tag'] = dataframe.loc[short, 'atr_stop_short'].map(lambda x: f'bmxS|{x:.12g}')
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Exits depend on each actual position's fixed SL/TP, not unconditional
        # 'close short' arrows on candles where there was never a short position.
        dataframe['exit_long'] = 0
        dataframe['exit_short'] = 0
        return dataframe

    @staticmethod
    def _signal_stop(tag: str | None, side: str) -> float | None:
        prefix = 'bmxS' if side == 'short' else 'bmxL'
        try:
            name, value = (tag or '').split('|')
            stop = float(value)
            return stop if name == prefix and isfinite(stop) and stop > 0 else None
        except (ValueError, TypeError):
            return None

    def confirm_trade_entry(
        self, pair: str, order_type: str, amount: float, rate: float,
        time_in_force: str, current_time: datetime, entry_tag: str | None,
        side: str, **kwargs,
    ) -> bool:
        stop = self._signal_stop(entry_tag, side)
        if stop is None or not isfinite(rate) or rate <= 0:
            return False
        risk = (stop - rate) / rate if side == 'short' else (rate - stop) / rate
        # Reject gaps beyond the planned stop and stops beyond the hard risk bound.
        return 0 < risk < abs(self.stoploss)

    def custom_stoploss(
        self, pair: str, trade: Trade, current_time: datetime,
        current_rate: float, current_profit: float, after_fill: bool, **kwargs,
    ) -> float | None:
        stop = self._signal_stop(trade.enter_tag, 'short' if trade.is_short else 'long')
        if stop is None:
            return None
        return stoploss_from_absolute(stop, current_rate, is_short=trade.is_short, leverage=trade.leverage)

    def custom_roi(
        self, pair: str, trade: Trade, current_time: datetime, trade_duration: int,
        entry_tag: str | None, side: str, **kwargs,
    ) -> float | None:
        stop = self._signal_stop(trade.enter_tag, side)
        if stop is None:
            return None
        risk = abs(trade.open_rate - stop)
        target = trade.open_rate + (-1 if trade.is_short else 1) * risk * self.risk_reward
        # Fee/funding-aware ROI conversion preserves the fixed price target.
        return trade.calc_profit_ratio(target)

    def leverage(
        self, pair: str, current_time: datetime, current_rate: float,
        proposed_leverage: float, max_leverage: float, entry_tag: str | None,
        side: str, **kwargs,
    ) -> float:
        return 1.0


class BanmuxiaMACDRR1(BanmuxiaMACDDivergence):
    """Predeclared 1R comparison, matching the video's headline win-rate metric."""
    risk_reward = 1.0
