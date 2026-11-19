import type { LeaderFeed, LeaderTrade } from '@/types/leader';

export function leaderAction(trade: LeaderTrade): string {
  const direction =
    trade.positionSide === 'SHORT' ? '空' : trade.positionSide === 'LONG' ? '多' : '';
  const verbs = { open: '开', add: '加', reduce: '减', close: '平' };
  if (direction && trade.effect !== 'unknown' && trade.effect in verbs) {
    return verbs[trade.effect] + direction;
  }
  return `${trade.side === 'BUY' ? '买入' : '卖出'}${direction ? ` · ${direction}头` : ''}`;
}

export function leaderTime(time: number | null | undefined): string {
  if (!time) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(time);
}

export function leaderFeedHealthy(feed: LeaderFeed | null, now: number): boolean {
  return (
    !!feed &&
    !feed.bridgeError &&
    feed.health.initialized &&
    !feed.health.paused &&
    feed.health.failures < 3 &&
    !!feed.health.lastSuccess &&
    !!feed.lastReadAt &&
    now - feed.generatedAt < 60_000 &&
    now - feed.lastReadAt < 60_000 &&
    now - feed.health.lastSuccess < 120_000
  );
}

export function leaderDirection(trade: LeaderTrade): string {
  return trade.positionSide === 'LONG'
    ? '多头'
    : trade.positionSide === 'SHORT'
      ? '空头'
      : '未确认';
}
