from datetime import datetime

from sample_strategy import SampleStrategy


class SampleStrategyFutures(SampleStrategy):
    """SampleStrategy with both directions enabled and leverage fixed at 1x."""

    can_short: bool = True

    def leverage(
        self,
        pair: str,
        current_time: datetime,
        current_rate: float,
        proposed_leverage: float,
        max_leverage: float,
        entry_tag: str | None,
        side: str,
        **kwargs,
    ) -> float:
        return 1.0
