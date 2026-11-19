<script setup lang="ts">
defineProps<{
  history?: boolean;
}>();
const botStore = useBotStore();
</script>

<template>
  <div>
    <!-- <TradeList
      class="open-trades"
      :trades="openTrades"
      title="持仓中的交易"
      :active-trades="true"
      empty-text="当前没有持仓中的交易。"
    /> -->
    <CustomTradeList
      v-if="!history && !botStore.activeBot.detailTradeId"
      :trades="botStore.activeBot.openTrades"
      title="持仓中的交易"
      :active-trades="true"
      :stake-currency-decimals="botStore.activeBot.stakeCurrencyDecimals"
      empty-text="当前没有持仓中的交易。"
    />
    <CustomTradeList
      v-if="history && !botStore.activeBot.detailTradeId"
      :trades="botStore.activeBot.closedTrades"
      title="历史交易"
      :stake-currency-decimals="botStore.activeBot.stakeCurrencyDecimals"
      empty-text="暂无已平仓交易。"
    />
    <div
      v-if="botStore.activeBot.detailTradeId && botStore.activeBot.tradeDetail"
      class="flex flex-col"
    >
      <UButton
        color="neutral"
        class="self-start my-1 ms-1"
        @click="botStore.activeBot.setDetailTrade(null)"
        label="返回"
        icon="mdi:arrow-left"
      />
      <TradeDetail
        :trade="botStore.activeBot.tradeDetail"
        :stake-currency="botStore.activeBot.stakeCurrency"
      />
    </div>
  </div>
</template>
