<script setup lang="ts">
import type { LeaderFeed } from '@/types/leader';
import {
  leaderAction,
  leaderDirection,
  leaderFeedHealthy,
  leaderTime,
} from '@/utils/leaderDisplay';

const feed = shallowRef<LeaderFeed | null>(null);
const botStore = useBotStore();
const router = useRouter();
function openMuPerpetual() {
  botStore.activeBot.selectedPair = 'MU/USDT:USDT';
  botStore.activeBot.plotMultiPairs = ['MU/USDT:USDT'];
  router.push('/graph');
}
const error = ref('');
const loading = ref(false);
const now = ref(Date.now());
const symbol = ref('');
const side = ref('');
const page = ref(1);
const pageSize = 20;
const trades = computed(() => feed.value?.trades ?? []);
const symbols = computed(() => [...new Set(trades.value.map((t) => t.symbol))].sort());
const filtered = computed(() =>
  trades.value.filter(
    (t) =>
      (!symbol.value || t.symbol === symbol.value) &&
      (!side.value || t.positionSide === side.value),
  ),
);
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const healthy = computed(() => !error.value && leaderFeedHealthy(feed.value, now.value));
const today = computed(
  () =>
    trades.value.filter(
      (t) => leaderTime(t.time).slice(0, 10) === leaderTime(now.value).slice(0, 10),
    ).length,
);
let timer: ReturnType<typeof setInterval> | undefined;
let controller: AbortController | undefined;
let disposed = false;

async function refresh() {
  if (loading.value) return;
  loading.value = true;
  controller = new AbortController();
  const timeout = setTimeout(() => controller?.abort(), 10_000);
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}leader-feed.json?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('无法读取交易员数据');
    const data: LeaderFeed = await response.json();
    if (
      data.version !== 1 ||
      data.trader.id !== '5075281354358777856' ||
      !Array.isArray(data.trades)
    )
      throw new Error('交易员数据格式不匹配');
    if (disposed) return;
    feed.value = data;
    error.value = '';
    page.value = Math.min(page.value, pageCount.value);
  } catch {
    if (!disposed) error.value = '暂时无法更新，保留上次记录；请检查本机监控服务。';
  } finally {
    clearTimeout(timeout);
    loading.value = false;
    now.value = Date.now();
  }
}
watch([symbol, side], () => {
  page.value = 1;
});
onMounted(() => {
  refresh();
  timer = setInterval(() => {
    now.value = Date.now();
    refresh();
  }, 15_000);
});
onBeforeUnmount(() => {
  disposed = true;
  clearInterval(timer);
  controller?.abort();
});
</script>

<template>
  <div class="leader-page mx-auto max-w-[1600px] p-4 md:p-6 text-left space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div class="text-xs text-muted mb-1">币安合约 · 外部交易员公开成交</div>
        <h1 class="text-2xl font-semibold">
          {{ feed?.trader.name ?? '熬鹰资本' }}
          <span class="text-base font-normal text-muted">/ 交易员操作</span>
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <UButton icon="i-mdi-chart-candlestick" @click="openMuPerpetual">MU 永续 K 线</UButton>
        <UBadge :color="healthy ? 'success' : 'warning'" variant="subtle">{{
          healthy ? '监控正常' : loading && !feed ? '正在连接' : '更新异常'
        }}</UBadge>
        <UButton icon="i-mdi-refresh" :loading="loading" @click="refresh">刷新记录</UButton>
      </div>
    </header>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="metric">
        <span>累计公开成交</span><strong>{{ feed?.total ?? '—' }} <small>笔</small></strong>
      </div>
      <div class="metric">
        <span>今日成交 · 北京时间</span><strong>{{ feed ? today : '—' }} <small>笔</small></strong>
      </div>
      <div class="metric">
        <span>涉及合约</span><strong>{{ feed ? symbols.length : '—' }} <small>个</small></strong>
      </div>
      <div class="metric">
        <span>最近采集 · 每 15 秒刷新页面</span
        ><strong class="!text-base">{{ leaderTime(feed?.health.lastSuccess) }}</strong>
      </div>
    </div>
    <UAlert
      v-if="(feed && !healthy) || error"
      color="warning"
      title="数据更新异常"
      :description="
        error ||
        feed?.bridgeError ||
        feed?.health.error ||
        '采集暂停或数据已过期，以下为最后一次保存的记录。'
      "
    />

    <section class="rounded-lg border border-default overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 p-4">
        <h2 class="font-semibold text-lg">
          操作记录 <span class="text-sm font-normal text-muted">{{ filtered.length }} 笔</span>
        </h2>
        <div class="flex flex-wrap gap-3 text-sm">
          <label class="flex items-center gap-2"
            >合约
            <select v-model="symbol" aria-label="记录合约">
              <option value="">全部合约</option>
              <option v-for="s in symbols" :key="s" :value="s">{{ s }}</option>
            </select></label
          >
          <label class="flex items-center gap-2"
            >方向
            <select v-model="side" aria-label="持仓方向">
              <option value="">全部方向</option>
              <option value="LONG">多头</option>
              <option value="SHORT">空头</option>
              <option value="BOTH">未确认</option>
            </select></label
          >
        </div>
      </div>
      <div class="md:hidden">
        <article
          v-for="trade in rows"
          :key="trade.id"
          class="p-4 border-t border-default space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <b>{{ trade.symbol }}</b
            ><span
              :class="
                trade.side === 'BUY'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              "
              >{{ leaderAction(trade) }}</span
            >
          </div>
          <div class="text-xs text-muted">
            {{ leaderTime(trade.time)
            }}<span v-if="trade.effect === 'unknown'"> · 开/加/减/平待确认</span>
          </div>
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt class="text-xs text-muted">数量</dt>
              <dd>{{ trade.qty }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">均价 · USDT</dt>
              <dd>{{ trade.price }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">已实现盈亏 · USDT</dt>
              <dd>{{ trade.realizedPnl }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">操作后持仓</dt>
              <dd>{{ trade.after ?? '未确认' }}</dd>
            </div>
          </dl>
          <div class="text-xs text-muted">
            发现 {{ leaderTime(trade.detectedAt)
            }}<span v-if="trade.revision > 1"> · 修订 v{{ trade.revision }}</span>
          </div>
        </article>
        <p v-if="!rows.length" class="p-8 text-center text-muted">
          {{ !feed ? '尚未收到交易员数据' : '没有匹配的成交记录' }}
        </p>
      </div>
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm whitespace-nowrap">
          <thead class="bg-elevated text-muted">
            <tr>
              <th>成交时间 · 北京时间</th>
              <th>合约</th>
              <th>操作 / 方向</th>
              <th class="numeric">数量</th>
              <th class="numeric">均价 · USDT</th>
              <th class="numeric">已实现盈亏 · USDT</th>
              <th class="numeric">操作后持仓</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trade in rows" :key="trade.id">
              <td>
                {{ leaderTime(trade.time) }}
                <div class="text-xs text-muted mt-1">
                  发现 {{ leaderTime(trade.detectedAt)
                  }}<span v-if="trade.revision > 1"> · 已修订 v{{ trade.revision }}</span>
                </div>
              </td>
              <td class="font-medium">{{ trade.symbol }}</td>
              <td>
                <span
                  :class="
                    trade.side === 'BUY'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  "
                  >{{ leaderAction(trade) }}</span
                >
                <div class="text-xs text-muted mt-1">
                  {{ trade.side === 'BUY' ? '买入' : '卖出' }} · {{ leaderDirection(trade)
                  }}<span v-if="trade.effect === 'unknown'"> · 开/加/减/平待确认</span>
                </div>
              </td>
              <td class="numeric">{{ trade.qty }}</td>
              <td class="numeric">{{ trade.price }}</td>
              <td
                class="numeric"
                :class="
                  Number(trade.realizedPnl) > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : Number(trade.realizedPnl) < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : ''
                "
              >
                {{ trade.realizedPnl }}
              </td>
              <td class="numeric">{{ trade.after ?? '未确认' }}</td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="7" class="text-center !py-10 text-muted">
                {{ !feed ? '尚未收到交易员数据' : '没有匹配的成交记录' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="p-3 flex items-center justify-between gap-2 text-sm border-t border-default">
        <span class="text-muted">公开数据可能延迟；记录按成交时间倒序</span>
        <div class="flex items-center gap-3">
          <UButton size="xs" :disabled="page <= 1" @click="page--">上一页</UButton
          ><span>{{ page }} / {{ pageCount }}</span
          ><UButton size="xs" :disabled="page >= pageCount" @click="page++">下一页</UButton>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.metric {
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.metric > span {
  font-size: 12px;
  color: var(--ui-text-muted);
}
.metric strong {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}
.metric small {
  font-size: 12px;
  font-weight: 400;
  color: var(--ui-text-muted);
}
select {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--ui-text);
}
th,
td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--ui-border);
  text-align: left;
}
th {
  font-size: 12px;
  font-weight: 500;
}
.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
