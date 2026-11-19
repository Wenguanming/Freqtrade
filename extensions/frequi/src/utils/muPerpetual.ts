import type { PairHistory, MarkPoint } from '@/types';
import type { LeaderFeed } from '@/types/leader';
import { leaderAction } from './leaderDisplay';

export function muPerpetualHistory(feed: LeaderFeed, now = Date.now()): PairHistory {
  const market = feed.muMarket;
  if (
    !market ||
    market.pair !== 'MU/USDT:USDT' ||
    market.timeframe !== '15m' ||
    market.source !== 'binance-usdt-perpetual' ||
    !market.updatedAt ||
    !market.candles.length
  ) {
    throw new Error('MU 永续行情尚未就绪');
  }
  const data = market.candles.map((row) => [...row]);
  const start = data[0]![0]!;
  const stop = data[data.length - 1]![0]!;
  const annotations: MarkPoint[] = feed.trades
    .filter((t) => t.symbol === 'MUUSDT' && t.time >= start && t.time < stop + 900000)
    .map((t) => ({
      type: 'point',
      x: new Date(t.time).toISOString(),
      y: Number(t.price),
      label: `熬鹰 ${leaderAction(t)} ${t.qty}`,
      shape: 'triangle',
      rotate: t.side === 'BUY' ? 0 : 180,
      size: 15,
      color: t.side === 'BUY' ? '#22c997' : '#f7b84b',
      z_index: 10,
    }));
  return {
    data_source: 'public-market',
    source_updated_at: market.updatedAt,
    source_error:
      market.error || (now - market.updatedAt > 180000 ? '行情超过 3 分钟未更新' : null),
    strategy: 'MU 永续 · 只读行情',
    pair: market.pair,
    timeframe: '15m',
    timeframe_ms: 900000,
    columns: ['__date_ts', 'open', 'high', 'low', 'close', 'volume'],
    data,
    annotations,
    length: data.length,
    buy_signals: 0,
    sell_signals: 0,
    last_analyzed: market.updatedAt,
    data_start_ts: start,
    data_stop_ts: stop,
    data_start: new Date(start).toISOString(),
    data_stop: new Date(stop).toISOString(),
  };
}
