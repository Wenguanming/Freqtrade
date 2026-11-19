import { describe, expect, it } from 'vitest';
import { muPerpetualHistory } from '../../src/utils/muPerpetual';
import type { LeaderFeed } from '../../src/types/leader';

const start = Date.parse('2026-11-18T15:00:00Z');
const feed = {
  muMarket: {
    pair: 'MU/USDT:USDT',
    timeframe: '15m',
    source: 'binance-usdt-perpetual',
    updatedAt: start + 5000,
    error: null,
    candles: [[start, 700, 720, 690, 710, 1234]],
  },
  trades: [
    {
      symbol: 'MUUSDT',
      time: start + 30000,
      side: 'BUY',
      positionSide: 'LONG',
      effect: 'unknown',
      price: '711.98',
      qty: '280.98',
    },
    { symbol: 'BTCUSDT', time: start + 30000, side: 'SELL', price: '63732', qty: '28' },
    { symbol: 'MUUSDT', time: start - 30000, side: 'BUY', price: '710', qty: '1' },
  ],
} as LeaderFeed;
describe('MU perpetual read-only candles', () => {
  it('uses exact trade timestamp and price without inventing opening or closing status', () => {
    const data = muPerpetualHistory(feed, start + 10000);
    expect(data.annotations).toHaveLength(1);
    expect(data.annotations[0]).toMatchObject({
      x: new Date(start + 30000).toISOString(),
      y: 711.98,
      label: '熬鹰 买入 · 多头 280.98',
    });
    expect(data.columns).toEqual(['__date_ts', 'open', 'high', 'low', 'close', 'volume']);
    expect(data.buy_signals).toBe(0);
    expect(data.source_error).toBe(null);
  });
  it('marks stale prices rather than representing them as current', () => {
    expect(muPerpetualHistory(feed, start + 200000).source_error).toContain('未更新');
  });
  it('rejects missing or wrong contract data', () => {
    expect(() => muPerpetualHistory({ ...feed, muMarket: undefined })).toThrow();
    expect(() =>
      muPerpetualHistory({ ...feed, muMarket: { ...feed.muMarket!, pair: 'MU/USDT' } }),
    ).toThrow();
  });
});
