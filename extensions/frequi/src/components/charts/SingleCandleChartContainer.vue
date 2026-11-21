<script setup lang="ts">
import type { ChartSliderPosition, PairHistory, Trade } from '@/types';
import { LoadingStatus } from '@/types';
import { candleSignals, type CandleSignal } from '@/utils/charts/candleSignals';

const props = withDefaults(
  defineProps<{
    trades?: Trade[];
    availablePairs: string[];
    timeframe: string;
    historicView?: boolean;
    pair?: string;
    sliderPosition?: ChartSliderPosition;
    isSinglePairView?: boolean;
  }>(),
  {
    trades: () => [],
    historicView: false,
    pair: '',
    sliderPosition: undefined,
    isSinglePairView: true,
  },
);

const emit = defineEmits<{
  refreshData: [pair: string, columns: string[]];
}>();

const settingsStore = useSettingsStore();
const colorStore = useColorStore();
const botStore = useBotStore();
const plotStore = usePlotConfigStore();
const signalChart = useTemplateRef<{
  showAllSignals: () => void;
  showLatestSignal: (signal: CandleSignal) => void;
}>('signalChart');
// A spot bot can calculate unused short columns; do not present them as active signals.
const showShortSignals = computed(
  () => !botStore.activeBot.isTrading || botStore.activeBot.shortAllowed,
);

const dataset = computed((): PairHistory | undefined => {
  if (props.historicView) {
    return botStore.activeBot.history[`${props.pair}__${props.timeframe}`]?.data;
  }
  return botStore.activeBot.candleData[`${props.pair}__${props.timeframe}`]?.data;
});
const isPublicMarket = computed(() => dataset.value?.data_source === 'public-market');

const signals = computed(() => candleSignals(dataset.value, showShortSignals.value));
const signalCandleCount = computed(
  () => new Set(signals.value.flatMap((signal) => signal.points.map(([time]) => time))).size,
);
const fillSeriesName = computed(() =>
  props.historicView ? '回测成交' : botStore.activeBot.botState.dry_run ? '模拟成交' : '实盘成交',
);

const loadedRange = computed(() => {
  if (!dataset.value) return '';
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: settingsStore.timezone === 'UTC' ? 'UTC' : undefined,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${formatter.format(dataset.value.data_start_ts)} — ${formatter.format(dataset.value.data_stop_ts)}（${settingsStore.timezone === 'UTC' ? 'UTC' : '本地时间'}）`;
});

const datasetColumns = computed(() =>
  dataset.value ? (dataset.value.all_columns ?? dataset.value.columns) : [],
);
const datasetLoadedColumns = computed(() =>
  dataset.value ? (dataset.value.columns ?? dataset.value.all_columns) : [],
);

const hasDataset = computed(() => dataset.value && dataset.value.data.length > 0);
const isLoadingDataset = computed((): boolean => {
  if (props.historicView) {
    return botStore.activeBot.historyStatus === LoadingStatus.loading;
  }

  return botStore.activeBot.candleDataStatus === LoadingStatus.loading;
});
const noDatasetText = computed((): string => {
  const status = props.historicView
    ? botStore.activeBot.historyStatus
    : botStore.activeBot.candleDataStatus;

  switch (status) {
    case LoadingStatus.not_loaded:
      return 'Not loaded yet.';
    case LoadingStatus.loading:
      return 'Loading...';
    case LoadingStatus.success:
      return 'No data available';
    case LoadingStatus.error:
      return 'Failed to load data';
    default:
      return 'Unknown';
  }
});

function refresh() {
  emit('refreshData', props.pair, plotStore.usedColumns);
}

function refreshIfNecessary() {
  if (!hasDataset.value) {
    refresh();
  }
}

function assignFirstPair() {
  const [firstPair] = props.availablePairs;
  if (firstPair) {
    //props.pair = firstPair;
  }
}

watch(
  () => props.availablePairs,
  () => {
    if (!props.availablePairs.find((p) => p === props.pair)) {
      assignFirstPair();
      refresh();
    }
  },
);

watch(
  () => plotStore.plotConfig,
  () => {
    // Trigger reload if the used columns are not loaded yet but would be available.
    const hasAllColumns = plotStore.usedColumns.some(
      (c) => datasetColumns.value.includes(c) && !datasetLoadedColumns.value.includes(c),
    );

    if (settingsStore.useReducedPairCalls && hasAllColumns) {
      refresh();
    }
  },
);

watch(
  () => props.timeframe,
  () => {
    refreshIfNecessary();
  },
);
</script>

<template>
  <div
    class="flex-fill w-full flex-col align-items-stretch flex"
    :class="{
      'h-full': isSinglePairView,
      'h-150 border border-r border-b border-neutral-300 dark:border-neutral-700':
        !isSinglePairView,
    }"
  >
    <div class="flex flex-wrap gap-2 me-0 w-full items-center justify-between">
      <div class="ms-1 md:ms-2 flex flex-wrap md:flex-nowrap items-center gap-1">
        <div v-if="isPublicMarket" class="text-sm">
          只读行情 · 交易员成交 {{ dataset?.annotations.length ?? 0 }} 笔
        </div>
        <div v-else class="flex flex-wrap items-center gap-2">
          <template v-for="signal in signals" :key="signal.key">
            <UButton
              v-if="signal.entry"
              size="xs"
              variant="subtle"
              :color="signal.below ? 'success' : 'error'"
              :disabled="!signal.points.length"
              :title="`定位最近一次${signal.name}`"
              @click="signalChart?.showLatestSignal(signal)"
            >
              {{ signal.below ? '▲' : '▼' }} {{ signal.name }} {{ signal.points.length }}
              <span v-if="signal.points.length">· 定位最近</span>
            </UButton>
            <small v-else class="text-xs text-muted"
              >{{ signal.name }} {{ signal.points.length }}</small
            >
          </template>
        </div>
      </div>
      <div>
        {{ pair || '交易对' }}
      </div>
      <UButton
        v-if="hasDataset"
        size="xs"
        color="neutral"
        variant="ghost"
        title="缩放至当前已加载的全部 K 线，查看所有信号"
        @click="signalChart?.showAllSignals()"
        >{{ isPublicMarket ? '显示全部行情' : '显示全部信号' }}</UButton
      >
      <div class="w-4 h-4">
        <UProgress v-if="isLoadingDataset" stroke-width="4" small label="Spinning" />
      </div>
    </div>
    <div v-if="dataset" class="mx-1 my-1 text-xs text-muted flex flex-wrap gap-x-3 gap-y-1">
      <span
        >全部已加载：{{ dataset.data.length }} 根 K 线<span v-if="!isPublicMarket">
          · {{ signalCandleCount }} 个信号时刻</span
        ></span
      >
      <span>{{ loadedRange }}</span>
      <span v-if="isPublicMarket"
        >行情更新：{{ leaderTime(dataset.source_updated_at) }}（北京时间）</span
      >
      <span v-if="isPublicMarket"
        >标记来自熬鹰资本的公开成交，不是本机器人的交易。末根 K 线尚未收盘。</span
      >
      <span v-else
        >三角是策略信号，不代表成交；带“成交”的标记才是{{ fillSeriesName }}，按成交价绘制。</span
      >
    </div>
    <UAlert
      v-if="dataset?.source_error"
      color="warning"
      title="行情更新异常"
      :description="dataset.source_error + '，当前保留最后一次行情。'"
    />
    <div class="h-full flex">
      <div class="min-w-0 w-full flex-1">
        <CandleChart
          v-if="hasDataset && dataset"
          ref="signalChart"
          :dataset="dataset"
          :trades="trades"
          :plot-config="isPublicMarket ? { main_plot: {}, subplots: {} } : plotStore.plotConfig"
          :heikin-ashi="settingsStore.useHeikinAshiCandles"
          :show-mark-area="
            isPublicMarket ? settingsStore.showSignalLabels : settingsStore.showMarkArea
          "
          :show-signal-labels="settingsStore.showSignalLabels"
          :signals="signals"
          :fill-series-name="fillSeriesName"
          :use-u-t-c="settingsStore.timezone === 'UTC'"
          :theme="settingsStore.chartTheme"
          :slider-position="sliderPosition"
          :color-up="colorStore.colorUp"
          :color-down="colorStore.colorDown"
          :start-candle-count="settingsStore.chartDefaultCandleCount"
          :label-side="settingsStore.chartLabelSide"
        />
        <div v-else class="m-auto">
          <UProgress v-if="isLoadingDataset" class="m-5 w-5 h-5" label="Spinning" />
          <div v-else class="text-lg">
            {{ noDatasetText }}
          </div>
          <p v-if="botStore.activeBot.historyTakesLonger">耗时较长，请稍候……</p>
        </div>
      </div>
    </div>
  </div>
</template>
