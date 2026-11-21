import { describe, expect, it } from 'vitest';
import type { Order, PairHistory, Trade } from '@/types';
import { candleSignals } from '@/utils/charts/candleSignals';
import { generateTradeSeries } from '@/utils/charts/tradeChartData';

const step = 900_000;
const start = Date.UTC(2026, 10, 16, 0, 0);
const window = {
  timeframe_ms: step,
  data_start_ts: start,
  data_stop_ts: start + step * 2,
} as PairHistory;

describe('directional candle signals', () => {
  const dataset = {
    columns: [
      '__date_ts',
      'low',
      'high',
      '_enter_long_signal_close',
      '_enter_short_signal_close',
      'enter_tag',
    ],
    data: [
      [start, 98, 110, null, 107, 'sweep'],
      [start + step, 95, 101, 97, 97, 'both'],
      [start + 2 * step, 96, 101, null, null, null],
    ],
  } as unknown as PairHistory;

  it('marks every signalled candle on the correct side and keeps its real signal close', () => {
    const [long, short] = candleSignals(dataset, true);
    expect(long).toMatchObject({
      name: '做多信号',
      below: true,
      points: [[start + step, 95, 97, 'both']],
    });
    expect(short).toMatchObject({
      name: '做空信号',
      below: false,
      points: [
        [start, 110, 107, 'sweep'],
        [start + step, 101, 97, 'both'],
      ],
    });
  });

  it('omits shorts for spot and never treats third-party market data as strategy signals', () => {
    expect(candleSignals(dataset, false).map((signal) => signal.name)).toEqual(['买入信号']);
    expect(candleSignals({ ...dataset, data_source: 'public-market' }, true)).toEqual([]);
    expect(
      candleSignals(
        {
          columns: ['__date_ts', 'low', 'high', '_buy_signal_close', '_sell_signal_close'],
          data: [[start, 1, 3, 2, 2]],
        },
        false,
      ).map((signal) => signal.points[0]),
    ).toEqual([
      [start, 1, 2, ''],
      [start, 3, 2, ''],
    ]);
  });
});

function order(
  side: string,
  time: number | undefined,
  price: number,
  extra: Partial<Order> = {},
): Order {
  return {
    ft_order_side: side,
    order_filled_timestamp: time,
    safe_price: price,
    amount: 1,
    ...extra,
  } as Order;
}

function markers(short: boolean, orders: Order[], open = false) {
  const trade = {
    pair: 'TEST/USDT:USDT',
    is_short: short,
    is_open: open,
    profit_ratio: 0.01,
    orders,
  } as Trade;
  return generateTradeSeries('模拟成交', 'dark', window, [trade]);
}

describe('directional fill markers', () => {
  it.each([
    [false, 'buy', 'sell', '多'],
    [true, 'sell', 'buy', '空'],
  ] as const)(
    'uses the actual fill time and price for both ends (short=%s)',
    (short, entry, exit, direction) => {
      const series = markers(short, [
        order(entry, undefined, 85, { order_timestamp: start - step }),
        order(exit, start + 2 * step + 1, 98, { filled: 1 }),
        order(entry, start, 90, { filled: 1, order_timestamp: start - step }),
        order(entry, start + step, 93, { filled: 0 }),
        order('stoploss', undefined, 87),
      ]);
      const rows = series.data as (number | string)[][];
      expect(rows.map((row) => [row[0], row[1], row[5]])).toEqual([
        [start, 90, `开${direction}成交`],
        [start + 2 * step, 98, `平${direction}成交`],
      ]);
      expect(rows[0]?.[6]).toContain('成交价：90 USDT');
    },
  );

  it('keeps out-of-window fills out, and distinguishes adds, reductions and the filled stop', () => {
    const series = markers(true, [
      order('sell', start - step, 99),
      order('sell', start, 100),
      order('buy', start + step, 95),
      order('stoploss', start + 2 * step, 103),
      order('stoploss', undefined, 104),
    ]);
    expect((series.data as (number | string)[][]).map((row) => row[5])).toEqual([
      '加空成交',
      '减空成交',
      '平空成交',
    ]);
    expect(markers(false, [order('buy', start + 3 * step, 99)]).data).toEqual([]);
    const pending = markers(
      false,
      [order('buy', undefined, 99, { filled: 0, order_timestamp: start })],
      true,
    );
    expect(pending.data).toEqual([]);
    expect(pending.markLine).toBeUndefined();
  });
});
