import { describe, expect, it } from 'vitest';
import { leaderAction, leaderFeedHealthy, leaderTime } from '../../src/utils/leaderDisplay';
import type { LeaderFeed, LeaderTrade } from '../../src/types/leader';

describe('external leader records', () => {
  it('only calls a buy a short close when the position effect is confirmed', () => {
    const trade = { side: 'BUY', positionSide: 'SHORT', effect: 'unknown' } as LeaderTrade;
    expect(leaderAction(trade)).toBe('买入 · 空头');
    expect(leaderAction({ ...trade, effect: 'close' })).toBe('平空');
    expect(leaderAction({ ...trade, side: 'SELL', effect: 'open' })).toBe('开空');
  });
  it('does not infer first entry from an uncalibrated long buy', () => {
    expect(
      leaderAction({ side: 'BUY', positionSide: 'LONG', effect: 'unknown' } as LeaderTrade),
    ).toBe('买入 · 多头');
  });
  it('marks stale collectors and disconnected bridges unhealthy', () => {
    const feed = {
      generatedAt: 200_000,
      lastReadAt: 200_000,
      bridgeError: null,
      health: { initialized: true, paused: false, failures: 0, lastSuccess: 195_000 },
    } as LeaderFeed;
    expect(leaderFeedHealthy(feed, 205_000)).toBe(true);
    expect(leaderFeedHealthy(feed, 265_000)).toBe(false);
    expect(leaderFeedHealthy({ ...feed, bridgeError: 'offline' }, 205_000)).toBe(false);
    expect(leaderFeedHealthy({ ...feed, health: { ...feed.health, paused: true } }, 205_000)).toBe(
      false,
    );
    expect(
      leaderFeedHealthy({ ...feed, health: { ...feed.health, lastSuccess: 1 } }, 205_000),
    ).toBe(false);
  });
  it('always uses Beijing time regardless of browser timezone', () => {
    expect(leaderTime(Date.parse('2026-11-18T15:00:27Z'))).toContain('23:00:27');
  });
});
