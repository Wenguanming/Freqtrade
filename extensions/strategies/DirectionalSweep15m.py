from freqtrade.strategy import IStrategy


class DirectionalSweep15m(IStrategy):
    timeframe = "15m"
    can_short = True
    startup_candle_count = 180
    position_adjustment_enable = False
    use_exit_signal = False
    minimal_roi = {"0": 0.006, "10080": -1}
    stoploss = -0.10
    short_pairs = {"BTC/USDT:USDT", "ETH/USDT:USDT", "SOL/USDT:USDT"}
    long_pairs = {"ETH/USDT:USDT", "MU/USDT:USDT"}

    def populate_indicators(self, dataframe, metadata):
        high, low, close = dataframe["high"], dataframe["low"], dataframe["close"]
        span = (high - low).replace(0, float("nan"))
        dataframe["range_fraction"] = (span / close).rolling(32).median().shift(1)
        dataframe["close_location"] = (close - low) / span
        dataframe["prior_low"] = low.rolling(12).min().shift(1)
        dataframe["prior_high"] = high.rolling(12).max().shift(1)
        return dataframe

    def populate_entry_trend(self, dataframe, metadata):
        tradable = (dataframe["volume"] > 0) & (dataframe["range_fraction"] > 0)
        long = (dataframe["low"] < dataframe["prior_low"]) & (dataframe["close_location"] > 0.35)
        short = (dataframe["high"] > dataframe["prior_high"]) & (dataframe["close_location"] < 0.65)
        pair = metadata["pair"]
        long_entry = tradable & long & (pair in self.long_pairs)
        short_entry = tradable & short & (pair in self.short_pairs)
        dataframe["enter_long"] = (long_entry & ~short_entry).astype(int)
        dataframe["enter_short"] = (short_entry & ~long_entry).astype(int)
        if pair in self.long_pairs and pair in self.short_pairs:
            dataframe.loc[dataframe["enter_long"] == 1, "enter_tag"] = "扫低回升"
            dataframe.loc[dataframe["enter_short"] == 1, "enter_tag"] = "冲高回落"
        return dataframe

    def populate_exit_trend(self, dataframe, metadata):
        dataframe["exit_long"] = 0
        dataframe["exit_short"] = 0
        return dataframe

    def confirm_trade_entry(self, pair, order_type, amount, rate, time_in_force, current_time,
                            entry_tag, side, **kwargs):
        return current_time.minute % 15 == 0

    def confirm_trade_exit(self, pair, trade, order_type, amount, rate, time_in_force,
                           exit_reason, current_time, **kwargs):
        filled_minute = trade.date_last_filled_utc.replace(second=0, microsecond=0)
        return exit_reason != "roi" or current_time.replace(second=0, microsecond=0) > filled_minute
