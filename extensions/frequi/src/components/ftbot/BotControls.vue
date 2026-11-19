<script setup lang="ts">
import type { ForceExitPayload } from '@/types';

const botStore = useBotStore();
const { confirm } = useConfirmBox();

const { forceEntryDialog } = useForceTrade();

const isRunning = computed((): boolean => {
  return botStore.activeBot.botState?.state === 'running';
});

async function handleStopBot() {
  const result = await confirm({
    title: '停止机器人',
    message: '确认停止机器人运行？已有持仓也将停止管理。',
  });
  if (result) {
    botStore.activeBot.stopBot();
  }
}

async function handleStopBuy() {
  if (
    await confirm({
      title: '暂停开仓',
      message:
        '继续管理已有持仓，但不再开新仓或加仓。\n确认暂停开仓？',
    })
  ) {
    botStore.activeBot.stopBuy();
  }
}

async function handleReloadConfig() {
  if (
    await confirm({
      title: '重新加载配置',
      message: '确认重新加载配置和策略？',
    })
  ) {
    botStore.activeBot.reloadConfig();
  }
}

async function handleForceExit() {
  if (
    await confirm({
      title: '全部强制平仓',
      message: '确认对全部持仓执行强制平仓？',
    })
  ) {
    const payload: ForceExitPayload = {
      tradeid: 'all',
      // TODO: support ordertype (?)
    };
    botStore.activeBot.forceexit(payload);
  }
}

async function handleForceEntry() {
  await forceEntryDialog({
    pair: botStore.activeBot.selectedPair,
  });
}
</script>

<template>
  <div class="flex flex-row gap-1">
    <UButton
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading || isRunning"
      title="启动交易"
      icon="mdi:play"
      @click="botStore.activeBot.startBot()"
    />
    <UButton
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading || !isRunning"
      title="停止交易：同时停止管理已有持仓。"
      icon="mdi:stop"
      @click="handleStopBot()"
    />
    <UButton
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading || !isRunning"
      title="暂停开仓：继续管理已有持仓，但不再开新仓或加仓。"
      icon="mdi:pause"
      @click="handleStopBuy()"
    />
    <UButton
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading"
      title="重新加载配置和策略，并重置运行期间临时修改的设置。"
      icon="mdi:reload"
      @click="handleReloadConfig()"
    />
    <UButton
      color="neutral"
      size="xl"
      :disabled="!botStore.activeBot.isTrading"
      title="全部强制平仓"
      icon="mdi:close-box-multiple"
      @click="handleForceExit()"
    />
    <UButton
      v-if="botStore.activeBot.botState && botStore.activeBot.botState.force_entry_enable"
      size="xl"
      color="neutral"
      :disabled="!botStore.activeBot.isTrading || !isRunning"
      title="手动开仓：可指定价格立即开仓，之后按策略规则管理平仓。"
      icon="mdi:plus-box-multiple-outline"
      @click="handleForceEntry"
    />
  </div>
</template>
