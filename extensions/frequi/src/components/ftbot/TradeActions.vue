<script setup lang="ts">
import type { Trade, BotFeatures } from '@/types';

withDefaults(
  defineProps<{
    botFeatures: BotFeatures;
    trade: Trade;
    enableForceEntry?: boolean;
  }>(),
  {
    enableForceEntry: false,
  },
);
defineEmits<{
  forceExit: [trade: Trade, type?: 'limit' | 'market'];
  forceExitPartial: [trade: Trade];
  cancelOpenOrder: [trade: Trade];
  reloadTrade: [trade: Trade];
  deleteTrade: [trade: Trade];
  forceEntry: [trade: Trade];
}>();
</script>

<template>
  <div class="flex flex-col gap-1">
    <UButton
      v-if="!botFeatures.forceExitParams"
      class="justify-start!"
      color="neutral"
      title="强制平仓"
      label="强制平仓"
      icon="mdi:close-box"
      @click="$emit('forceExit', trade)"
    />
    <UButton
      v-if="botFeatures.forceExitParams"
      class="justify-start!"
      color="neutral"
      title="限价强制平仓"
      label="限价强制平仓"
      icon="mdi:close-box"
      @click="$emit('forceExit', trade, 'limit')"
    />
    <UButton
      v-if="botFeatures.forceExitParams"
      class="justify-start!"
      color="neutral"
      title="市价强制平仓"
      label="市价强制平仓"
      icon="mdi:close-box"
      @click="$emit('forceExit', trade, 'market')"
    />
    <UButton
      v-if="botFeatures.forceEntryTag"
      class="justify-start!"
      color="neutral"
      title="部分强制平仓"
      label="部分强制平仓"
      icon="mdi:close-box-multiple"
      @click="$emit('forceExitPartial', trade)"
    />
    <UButton
      v-if="botFeatures.cancelOpenOrders && (trade.open_order_id || trade.has_open_orders)"
      class="justify-start!"
      color="neutral"
      title="撤销挂单"
      label="撤销挂单"
      icon="mdi:cancel"
      @click="$emit('cancelOpenOrder', trade)"
    />
    <UButton
      v-if="enableForceEntry"
      class="justify-start!"
      color="neutral"
      title="加仓"
      label="加仓"
      icon="mdi:plus-box-multiple-outline"
      @click="$emit('forceEntry', trade)"
    />
    <UButton
      v-if="botFeatures.reloadTrade"
      class="justify-start!"
      color="neutral"
      title="重新加载"
      label="重新加载"
      icon="mdi:reload-alert"
      @click="$emit('reloadTrade', trade)"
    />
    <UButton
      class="justify-start!"
      color="neutral"
      title="删除交易记录"
      label="删除交易记录"
      icon="mdi:delete"
      @click="$emit('deleteTrade', trade)"
    />
  </div>
</template>
