<script setup lang="ts">
import type { ChartSliderPosition, PairHistory, Trade } from '@/types';
import { LoadingStatus } from '@/types';

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
const signalChart = useTemplateRef<{ showAllSignals: () => void }>('signalChart');
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

const signalCandleCount = computed(() => {
  if (!dataset.value) return 0;
  const names = [
    '_enter_long_signal_close',
    '_buy_signal_close',
    '_exit_long_signal_close',
    '_sell_signal_close',
    ...(showShortSignals.value ? ['_enter_short_signal_close', '_exit_short_signal_close'] : []),
  ];
  const indices = dataset.value.columns
    .map((name, index) => (names.includes(name) ? index : -1))
    .filter((index) => index >= 0);
  return dataset.value.data.filter((row) =>
    indices.some((index) => row[index] != null && Number.isFinite(row[index])),
  ).length;
});

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
        <div v-else class="flex flex-col md:flex-row md:gap-2">
          <div class="flex flex-row flex-wrap gap-2">
            <small v-if="dataset" class="text-sm text-nowrap" title="Long entry signals"
              >{{ showShortSignals ? '开多' : '买入' }}：
              {{ dataset.enter_long_signals ?? dataset.buy_signals ?? 0 }}</small
            >
            <small v-if="dataset" class="text-sm text-nowrap" title="Long exit signals"
              >{{ showShortSignals ? '平多' : '卖出' }}：
              {{ dataset.exit_long_signals ?? dataset.sell_signals ?? 0 }}</small
            >
          </div>
          <div v-if="showShortSignals" class="flex flex-row flex-wrap gap-2">
            <small v-if="dataset" class="text-sm text-nowrap"
              >开空： {{ dataset.enter_short_signals ?? 0 }}</small
            >
            <small v-if="dataset" class="text-sm text-nowrap"
              >平空： {{ dataset.exit_short_signals ?? 0 }}</small
            >
          </div>
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
      <span v-else>以上为全量统计；缩放后可点“显示全部信号”恢复。</span>
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
          :show-short-signals="showShortSignals"
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
