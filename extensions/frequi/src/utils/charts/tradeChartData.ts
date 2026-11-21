import type { Order, PairHistory, Trade, BTOrder } from '@/types';
import { formatNumber, formatPercent, formatPriceCurrency } from '@/utils/formatters/numberformat';
import { splitTradePair } from '@/utils/formatters/pairFormat';
import { timestampmsWithTimezone } from '@/utils/formatters/timeformat';
import roundTimeframe from '@/utils/roundTimeframe';

import type {
  MarkAreaComponentOption,
  MarkLineComponentOption,
  MarkPointComponentOption,
  ScatterSeriesOption,
  TooltipComponentOption,
} from 'echarts';

function filledAt(order: Order | BTOrder): number | undefined {
  const time = order.order_filled_timestamp;
  if (time == null || !Number.isFinite(time) || ('filled' in order && !(Number(order.filled) > 0)))
    return;
  return time;
}

function buildToolTip(
  trade: Trade,
  order: Order | BTOrder,
  label: string,
  time: number,
  quoteCurrency: string,
  finalExit: boolean,
): string {
  return [
    label,
    `成交时间：${timestampmsWithTimezone(time)}`,
    `成交价：${formatNumber(order.safe_price)} ${quoteCurrency}`,
    `成交额：${formatPriceCurrency('cost' in order ? order.cost : order.amount * order.safe_price, quoteCurrency)}`,
    finalExit && `本笔盈亏：${formatPercent(trade.profit_ratio, 2)}`,
    trade.enter_tag && `入场标签：${trade.enter_tag}`,
    'ft_order_tag' in order &&
      order.ft_order_tag &&
      order.ft_order_tag !== trade.enter_tag &&
      `订单标签：${order.ft_order_tag}`,
    finalExit && trade.exit_reason && `离场原因：${trade.exit_reason}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const ADJUSTMENT_SYMBOL =
  'path://m 52.444161,104.1909 8.386653,25.34314 8.386651,25.34313 -16.731501,0.0422 -16.731501,0.0422 8.344848,-25.38539 z m 0.08656,-48.368126 8.386652,25.343139 8.386652,25.343137 -16.731501,0.0422 -16.731502,0.0422 8.344848,-25.385389 z';
const OPEN_CLOSE_SYMBOL =
  'path://m 102.20764,19.885384 h 24.1454 v 41.928829 h -24.1454 z m 12.17344,36.423813 8.38665,25.343139 8.38666,25.343134 -16.7315,0.0422 -16.731507,0.0422 8.344847,-25.385386 z';

const SHORT_COLOR = '#AD00FF';
//const SHORT_ADJUST_COLOR = '#CE3BFF';
const LONG_COLOR = '#0066FF';
//const LONG_ADJUST_COLOR = '#00A9FF';

/** Return trade entries for charting */
function getTradeEntries(dataset: PairHistory, trades: Trade[]) {
  const tradeData: (number | string)[][] = [];
  // Return schema:
  // 0: Timeframe
  // 1: rate
  // 2: symbol
  // 3: symbol rotate
  // 4: color
  // 5: label
  // 6: tooltip
  for (const trade of trades) {
    const entrySide = trade.is_short ? 'sell' : 'buy';
    const side = trade.is_short ? '空' : '多';
    const { quoteCurrency } = splitTradePair(trade.quote_currency ?? trade.pair);
    const fills = (trade.orders ?? [])
      .flatMap((order) => {
        const time = filledAt(order);
        return time === undefined ? [] : [{ order, time }];
      })
      .sort((left, right) => left.time - right.time);
    const firstEntry = fills.find(({ order }) => order.ft_order_side === entrySide);
    const lastExit =
      !trade.is_open && [...fills].reverse().find(({ order }) => order.ft_order_side !== entrySide);
    for (const fill of fills) {
      const { order, time } = fill;
      const candleTime = roundTimeframe(dataset.timeframe_ms, time);
      if (candleTime < dataset.data_start_ts || candleTime > dataset.data_stop_ts) continue;
      const entry = order.ft_order_side === entrySide;
      const action = entry ? (fill === firstEntry ? '开' : '加') : fill === lastExit ? '平' : '减';
      const label = `${action}${side}成交`;
      tradeData.push([
        candleTime,
        order.safe_price,
        fill === firstEntry || fill === lastExit ? OPEN_CLOSE_SYMBOL : ADJUSTMENT_SYMBOL,
        Boolean(trade.is_short) === entry ? 180 : 0,
        trade.is_short ? SHORT_COLOR : LONG_COLOR,
        label,
        buildToolTip(trade, order, label, time, quoteCurrency, fill === lastExit),
      ]);
    }
  }
  return { tradeData };
}

/**
 *  Generate Series displaying trades
 *  This may include trades, orders, and eventually other things related to the trade.
 */
export function generateTradeSeries(
  nameTrades: string,
  theme: string,
  dataset: PairHistory,
  trades: Trade[],
): ScatterSeriesOption {
  const { tradeData } = getTradeEntries(dataset, trades);

  const openTrade = trades.find(
    (trade) =>
      trade.is_open &&
      trade.orders?.some(
        (order) =>
          order.ft_order_side === (trade.is_short ? 'sell' : 'buy') &&
          filledAt(order) !== undefined,
      ),
  );

  const tradesSeries: ScatterSeriesOption = {
    name: nameTrades,
    type: 'scatter',
    xAxisIndex: 0,
    yAxisIndex: 0,
    encode: {
      x: 0,
      y: 1,
      label: 5,
      tooltip: 6,
    },
    label: {
      show: true,
      fontSize: 12,
      backgroundColor: theme !== 'dark' ? '#fff' : '#000',
      padding: 2,
      color: theme === 'dark' ? '#fff' : '#000',
      position: 'right',
    },
    itemStyle: {
      // color: tradeSellColor,
      color: (v) => (v.data ? v.data[4] : '#000'),
      opacity: 0.9,
    },
    symbol: (v) => v[2],
    symbolRotate: (v) => v[3],
    symbolSize: 13,
    labelLayout: { hideOverlap: true },
    z: 11,
    data: tradeData,
  };
  // Show distance to stoploss
  if (openTrade) {
    // Ensure to import and "use" whatever feature in candleChart! (MarkLine, MarkArea, ...)
    // Offset to avoid having the line at the very end of the chart
    const offset = dataset.timeframe_ms * 10;

    tradesSeries.markLine = {
      symbol: 'none',
      label: {
        show: true,
        position: 'middle',
      },
      data: [
        [
          {
            name: 'Stoploss',
            yAxis: openTrade.stop_loss_abs,
            lineStyle: {
              color: '#ff0000AA',
              type: 'solid',
            },
            xAxis:
              dataset.data_stop_ts - offset > openTrade.open_timestamp
                ? openTrade.open_timestamp
                : dataset.data_stop_ts - offset,
          },
          {
            lineStyle: {
              color: '#ff0000AA',
              type: 'solid',
            },
            yAxis: openTrade.stop_loss_abs,
            xAxis: openTrade.close_timestamp ?? dataset.data_stop_ts + dataset.timeframe_ms,
          },
        ],
      ],
    };
  }
  return tradesSeries;
}

export function generateMarkArea(
  dataset: PairHistory,
  enabled: boolean,
  markAreaZIndex?: number | undefined,
): {
  markArea?: MarkAreaComponentOption;
  markLine?: MarkLineComponentOption;
  markPoint?: MarkPointComponentOption;
  tooltip?: TooltipComponentOption;
} {
  if (!dataset.annotations || !enabled) return {};

  const markArea: MarkAreaComponentOption = {
    label: {
      position: 'insideTop',
    },
    z: markAreaZIndex ?? 1,
    data: dataset.annotations
      .filter((area) => area.type === 'area')
      .map((area) => {
        return [
          {
            z2: area.z_index ?? 1,
            xAxis: area.start,
            yAxis: area.y_start,
            itemStyle: {
              color: area.color,
            },
            label: {
              formatter: area.label,
            },
          },
          {
            z2: area.z_index ?? 1,
            xAxis: area.end,
            yAxis: area.y_end,
          },
        ];
      }),
  };
  const markLine: MarkLineComponentOption = {
    label: {
      position: 'middle',
    },
    symbol: ['none', 'none'],
    z: markAreaZIndex ?? 1,
    data: dataset.annotations
      .filter((line) => line.type === 'line')
      .map((line) => {
        return [
          {
            name: line.label,
            xAxis: line.start,
            yAxis: line.y_start,
            lineStyle: {
              color: line.color,
              width: line.width ?? 1,
              type: line.line_style ?? 'solid',
            },
            z2: line.z_index ?? 1,
          },
          {
            xAxis: line.end,
            yAxis: line.y_end,
            z2: line.z_index ?? 1,
          },
        ];
      }),
  };

  const markPoint: MarkPointComponentOption = {
    label: {
      position: 'top',
      show: true,
    },
    z: markAreaZIndex ? markAreaZIndex : 5,
    data: dataset.annotations
      .filter((point) => point.type === 'point')
      .map((point) => {
        return {
          name: point.label ?? '',
          xAxis: point.x,
          yAxis: point.y,
          itemStyle: {
            color: point.color,
          },
          label: {
            formatter: '{b}',
          },
          symbolSize: point.size ?? 10,
          symbol: point.shape ?? 'circle',
          symbolRotate: point.rotate,
          z2: point.z_index ?? 1,
        };
      }),
  };
  return {
    markArea,
    markLine,
    markPoint,
    tooltip: {
      show: false,
    },
  };
}

export function generateMarkAreaSeries(
  dataset: PairHistory,
  enabled: boolean,
  markAreaZIndex?: number | undefined,
): ScatterSeriesOption | undefined {
  if (!dataset.annotations || !enabled) {
    return undefined;
  }
  // Invisible series added to chart to work around marklines bug
  // TODO: https://github.com/apache/echarts/issues/21300
  return {
    // Invisible
    type: 'scatter',
    symbol: 'none',
    xAxisIndex: 0,
    ...generateMarkArea(dataset, enabled, markAreaZIndex),
  };
}
