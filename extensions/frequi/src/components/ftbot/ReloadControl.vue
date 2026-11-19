<script setup lang="ts">
const botStore = useBotStore();
const autoRefreshLoc = computed({
  get() {
    return botStore.globalAutoRefresh;
  },
  set(newValue: boolean) {
    botStore.setGlobalAutoRefresh(newValue);
  },
});
</script>

<template>
  <div class="flex items-center ms-2">
    <BaseCheckbox v-model="autoRefreshLoc" size="sm" title="自动刷新所有机器人" />
    <UButton
      class="m-1"
      color="neutral"
      variant="outline"
      title="立即刷新所有机器人"
      icon="mdi:refresh"
      @click="botStore.allRefreshFull"
    />
  </div>
</template>
