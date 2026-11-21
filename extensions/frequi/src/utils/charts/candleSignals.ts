import type { PairHistory } from '@/types';

type SignalKey = 'enter_long' | 'enter_short' | 'exit_long' | 'exit_short';
type SignalPoint = [time: number, anchor: number, close: number, tag: string];

export interface CandleSignal {
  key: SignalKey;
  name: string;
  entry: boolean;
  below: boolean;
  points: SignalPoint[];
}

export function candleSignals(
  dataset: Pick<PairHistory, 'data_source' | 'columns' | 'data'> | undefined,
  allowShort: boolean,
): CandleSignal[] {
  if (!dataset || dataset.data_source === 'public-market') return [];
  const { columns, data } = dataset;
  const timeIndex = columns.indexOf('__date_ts');
  const definitions: [SignalKey, string, string?][] = [
    ['enter_long', allowShort ? '做多信号' : '买入信号', '_buy_signal_close'],
    ['enter_short', '做空信号'],
    ['exit_long', allowShort ? '平多信号' : '卖出信号', '_sell_signal_close'],
    ['exit_short', '平空信号'],
  ];
  return definitions.flatMap(([key, name, legacy]) => {
    if (!allowShort && key.endsWith('_short')) return [];
    let signalIndex = columns.indexOf(`_${key}_signal_close`);
    if (signalIndex < 0 && legacy) signalIndex = columns.indexOf(legacy);
    if (signalIndex < 0) return [];
    const entry = key.startsWith('enter_');
    const below = key === 'enter_long' || (allowShort && key === 'exit_long');
    const anchorIndex = columns.indexOf(below ? 'low' : 'high');
    const tagIndex = columns.indexOf(entry ? 'enter_tag' : 'exit_tag');
    const points: SignalPoint[] = [];
    for (const row of data) {
      const time = row[timeIndex],
        anchor = row[anchorIndex],
        close = row[signalIndex];
      if (
        time != null &&
        anchor != null &&
        close != null &&
        Number.isFinite(time) &&
        Number.isFinite(anchor) &&
        Number.isFinite(close)
      ) {
        points.push([time, anchor, close, String(row[tagIndex] ?? '').slice(0, 100)]);
      }
    }
    return [{ key, name, entry, below, points }];
  });
}
