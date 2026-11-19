<script setup lang="ts">
import type { ComparisonTableItems } from '@/types';
import type { TableColumn } from '@nuxt/ui';

const botStore = useBotStore();

const allToggled = computed<boolean>({
  get: () => Object.values(botStore.botStores).every((i) => i.isSelected),
  set: (val) => {
    for (const bot of Object.values(botStore.botStores)) {
      bot.isSelected = val;
    }
  },
});

const tableItems = computed<ComparisonTableItems[]>(() => {
  const val: ComparisonTableItems[] = [];
  const summary: ComparisonTableItems = {
    botId: undefined,
    botName: '合计',
    profitClosed: 0,
    profitClosedRatio: undefined,
    profitOpen: 0,
    profitOpenRatio: undefined,
    stakeCurrency: 'USDT',
    wins: 0,
    losses: 0,
    balance: 0,
    balanceAppendix: '',
  };
  Object.entries(botStore.allProfit).forEach(([k, v]) => {
    const thisBotStore = botStore.botStores[k];
    if (!thisBotStore) return;

    const allOpenTrades = botStore.allOpenTrades[k];
    if (!allOpenTrades) return;
    const allStakes = allOpenTrades.reduce((a, b) => a + b.stake_amount, 0);
    const profitOpenRatio =
      allOpenTrades.reduce(
        (a, b) => a + (b.total_profit_ratio ?? b.profit_ratio ?? 0) * b.stake_amount,
        0,
      ) / allStakes;
    const profitOpen = allOpenTrades.reduce(
      (a, b) => a + (b.total_profit_abs ?? b.profit_abs ?? 0),
      0,
    );

    // TODO: handle one inactive bot ...
    val.push({
      botId: k,
      // botName:
      //   `${thisBotStore.botName} - ${botStore.availableBots[k].botName}` || thisBotStore.botId,

      botName: thisBotStore.uiBotName || thisBotStore.botId,
      trades: `${botStore.allOpenTradeCount[k]} / ${
        botStore.allBotState[k]?.max_open_trades || 'N/A'
      }`,
      profitClosed: v?.profit_closed_coin ?? 0,
      profitClosedRatio: v?.profit_closed_ratio || 0,
      stakeCurrency: botStore.allBotState[k]?.stake_currency || '',
      profitOpenRatio,
      profitOpen,
      wins: v?.winning_trades ?? 0,
      losses: v?.losing_trades ?? 0,
      balance: botStore.allBalance[k]?.total_bot ?? botStore.allBalance[k]?.total ?? 0,
      stakeCurrencyDecimals: botStore.allBotState[k]?.stake_currency_decimals || 3,
      isDryRun: botStore.allBotState[k]?.dry_run,
      isLoggedIn: botStore.botStores[k]?.isBotLoggedIn,
      isOnline: botStore.botStores[k]?.isBotOnline ?? false,
      balanceAppendix: botStore.allBotState[k]?.dry_run ? '（模拟）' : '',
    });
    if (v?.profit_closed_coin !== undefined) {
      if (thisBotStore.isSelected) {
        // Summary should only include selected bots
        summary.profitClosed += v.profit_closed_coin;
        summary.profitOpen += profitOpen;
        summary.wins += v.winning_trades;
        summary.losses += v.losing_trades;
        if (botStore.allSelectedBotsSameStake) {
          summary.balance +=
            botStore.allBalance[k]?.total_bot ?? botStore.allBalance[k]?.total ?? 0;
          summary.stakeCurrencyDecimals = botStore.allBotState[k]?.stake_currency_decimals || 3;
          if (botStore.allSelectedBotsSameState) {
            summary.balanceAppendix = botStore.allBotState[k]?.dry_run ? '（模拟）' : '（实盘）';
          } else {
            summary.balanceAppendix = '（模拟与实盘混合）';
          }
        }
        // summary.decimals = this.allBotState[k]?.stake_currency_decimals || summary.decimals;
        // This will always take the last bot's stake currency
        // And therefore may result in wrong values.
        summary.stakeCurrency = botStore.allBotState[k]?.stake_currency || summary.stakeCurrency;
      }
    }
  });
  val.push(summary);
  return val;
});

const columns: TableColumn<ComparisonTableItems>[] = [
  { accessorKey: 'botName' },
  { accessorKey: 'trades', header: '交易笔数' },
  { id: 'profitOpen', header: '持仓盈亏' },
  { id: 'profitClosed', header: '已平仓盈亏' },
  { accessorKey: 'balance', header: '余额' },
  { id: 'winVsLoss', header: '盈利 / 亏损笔数' },
];
</script>

<template>
  <UTable :data="tableItems" :columns="columns">
    <template #botName-header>
      <div class="flex justify-between flex-row w-full">
        <b>机器人名称</b
        ><UBadge
          class="items-center text-slate-200 bg-slate-800 cursor-pointer"
          color="neutral"
          title="点击选择所有机器人"
          @click="botStore.toggleBotsByState('all')"
          >全部</UBadge
        >
      </div>
    </template>
    <template #botName-cell="{ row }">
      <div class="flex flex-row justify-between items-center">
        <div>
          <BaseCheckbox
            v-if="row.original.botId && botStore.botCount > 1"
            v-model="
              botStore.botStores[(row.original as unknown as ComparisonTableItems).botId!]!
                .isSelected
            "
            title="在总览中显示此机器人"
            >{{ row.original.botName }}</BaseCheckbox
          >
          <BaseCheckbox
            v-if="!row.original.botId && botStore.botCount > 1"
            v-model="allToggled"
            title="切换所有机器人的选择状态"
            class="font-bold"
            >{{ row.original.botName }}</BaseCheckbox
          >
          <span v-if="botStore.botCount <= 1">{{ row.original.botName }}</span>
        </div>
        <UBadge
          v-if="row.original.isLoggedIn === false"
          class="items-center"
          color="error"
          label="需要登录"
        />
        <UBadge
          v-else-if="row.original.isLoggedIn && row.original.isOnline === false"
          class="items-center"
          color="neutral"
          label="离线"
        />
        <template v-else>
          <UBadge
            v-if="row.original.isOnline && row.original.isDryRun"
            class="items-center bg-green-800 text-slate-200 cursor-pointer"
            color="success"
            title="选择所有模拟盘机器人"
            @click="botStore.toggleBotsByState('dry')"
            label="模拟盘"
          />
          <UBadge
            v-if="row.original.isOnline && !row.original.isDryRun"
            class="items-center cursor-pointer"
            color="warning"
            title="选择所有实盘机器人"
            @click="botStore.toggleBotsByState('live')"
            label="实盘"
          />
        </template>
      </div>
    </template>
    <template #profitOpen-cell="{ row }">
      <ProfitPill
        v-if="row.original.profitOpen && row.original.botId !== '合计'"
        :profit-ratio="row.original.profitOpenRatio"
        :profit-abs="row.original.profitOpen"
        :profit-desc="`Total Profit (Open and realized) ${formatPercent(
          row.original.profitOpenRatio ?? 0.0,
        )}`"
        :stake-currency="row.original.stakeCurrency"
      />
    </template>
    <template #profitClosed-cell="{ row }">
      <ProfitPill
        v-if="row.original.profitClosed && row.original.botId !== '合计'"
        :profit-ratio="row.original.profitClosedRatio"
        :profit-abs="row.original.profitClosed"
        :stake-currency="row.original.stakeCurrency"
      />
    </template>
    <template #balance-cell="{ row }">
      <div v-if="row.original.balance">
        <span :title="row.original.stakeCurrency"
          >{{ formatPrice(row.original.balance ?? 0, row.original.stakeCurrencyDecimals) }}
        </span>
        <span class="text-sm">{{
          ` ${row.original.stakeCurrency}${row.original.balanceAppendix}`
        }}</span>
      </div>
    </template>
    <template #winVsLoss-cell="{ row }">
      <div v-if="row.original.losses !== undefined">
        <span class="text-profit">{{ row.original.wins }}</span> /
        <span class="text-loss">{{ row.original.losses }}</span>
      </div>
    </template>
  </UTable>
</template>
