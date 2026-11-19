<script setup lang="ts">
import ECharts from 'vue-echarts';
import type { EChartsOption, ScatterSeriesOption } from 'echarts';
import { use } from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { LabelLayout } from 'echarts/features';
import type { LeaderTrade } from '@/types/leader';
import { leaderAction, leaderTime } from '@/utils/leaderDisplay';

use([
  ScatterChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  CanvasRenderer,
  LabelLayout,
]);
const props = defineProps<{ trades: LeaderTrade[]; selectedId: string }>();
const emit = defineEmits<{ select: [id: string] }>();
const groups = [
  { key: 'BUY_LONG', name: '买入 · 多头', color: '#16a077', symbol: 'triangle', rotate: 0 },
  { key: 'SELL_LONG', name: '卖出 · 多头', color: '#d68618', symbol: 'triangle', rotate: 180 },
  { key: 'SELL_SHORT', name: '卖出 · 空头', color: '#e05270', symbol: 'diamond', rotate: 0 },
  { key: 'BUY_SHORT', name: '买入 · 空头', color: '#3688df', symbol: 'diamond', rotate: 0 },
  { key: 'OTHER', name: '方向待确认', color: '#85909b', symbol: 'circle', rotate: 0 },
];
const options = computed((): EChartsOption => ({
  backgroundColor: 'transparent',
  textStyle: { color: '#8997a5', fontFamily: 'inherit' },
  grid: { left: 84, right: 32, top: 55, bottom: 95 },
  legend: { top: 4, textStyle: { color: '#8997a5' }, data: groups.map((g) => g.name) },
  tooltip: { trigger: 'item', renderMode: 'richText', confine: true },
  xAxis: {
    type: 'time',
    axisLabel: { formatter: (value: number) => leaderTime(value).slice(5, 16), hideOverlap: true },
  },
  yAxis: {
    type: 'value',
    scale: true,
    name: '成交价 · USDT',
    splitLine: { lineStyle: { color: '#8997a522' } },
  },
  dataZoom: [
    { type: 'inside', filterMode: 'none' },
    {
      type: 'slider',
      bottom: 14,
      height: 24,
      labelFormatter: (value: number) => leaderTime(value).slice(5, 16),
    },
  ],
  series: groups.map((group): ScatterSeriesOption => ({
    name: group.name,
    type: 'scatter',
    symbol: group.symbol,
    symbolRotate: group.rotate,
    itemStyle: { color: group.color, opacity: 0.95 },
    label: { show: true, position: 'top', color: group.color, formatter: '{b}' },
    labelLayout: { hideOverlap: true },
    emphasis: { scale: 1.5 },
    data: props.trades
      .filter((t) =>
        group.key === 'OTHER'
          ? !['LONG', 'SHORT'].includes(t.positionSide)
          : `${t.side}_${t.positionSide}` === group.key,
      )
      .map((t) => ({
        name: leaderAction(t),
        value: [t.time, Number(t.price)],
        id: t.id,
        symbolSize: t.id === props.selectedId ? 24 : 14,
        itemStyle: t.id === props.selectedId ? { borderColor: '#fff', borderWidth: 3 } : {},
        tooltip: {
          formatter: `${t.symbol}  ${leaderAction(t)}${t.effect === 'unknown' ? '（开/加/减/平待确认）' : ''}\n成交：${leaderTime(t.time)}\n数量：${t.qty}\n均价：${t.price} USDT\n发现：${leaderTime(t.detectedAt)}`,
        },
      })),
  })),
}));
function onClick(params: { data?: unknown }) {
  const data = params.data;
  if (data && typeof data === 'object' && 'id' in data && typeof data.id === 'string') {
    emit('select', data.id);
  }
}
</script>

<template>
  <ECharts
    :option="options"
    autoresize
    style="height: 340px; width: 100%; display: block"
    @click="onClick"
  />
</template>
