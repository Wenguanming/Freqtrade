<script setup lang="ts">
const botStore = useBotStore();
</script>

<template>
  <footer class="md:hidden">
    <!-- Only visible on xs (phone) viewport! -->
    <hr class="my-0" />
    <div class="flex gap-2 justify-between px-2">
      <UButton
        v-if="!botStore.canRunBacktest"
        variant="link"
        active-class="underline"
        class="flex flex-col gap-1"
        to="/leader"
        label="交易员"
        icon="mdi:account-eye"
      />
      <UButton
        v-if="!botStore.canRunBacktest"
        variant="link"
        active-class="underline"
        class="flex flex-col gap-1"
        to="/open_trades"
        label="交易笔数"
        icon="mdi:folder-open"
      />
      <UButton
        v-if="!botStore.canRunBacktest"
        variant="link"
        active-class="underline"
        class="flex flex-col gap-1"
        to="/trade_history"
        label="历史记录"
        icon="mdi:folder-lock"
      />
      <UButton
        v-if="!botStore.canRunBacktest"
        variant="link"
        class="flex flex-col gap-1"
        active-class="underline"
        to="/pairlist"
        label="交易对列表"
        icon="mdi:format-list-group"
      />
      <UButton
        v-if="!botStore.canRunBacktest"
        variant="link"
        active-class="underline"
        class="flex flex-col gap-1"
        to="/balance"
        label="余额"
        icon="mdi:bank"
      />
      <UButton
        v-if="!botStore.canRunBacktest"
        variant="link"
        class="flex flex-col gap-1"
        active-class="underline"
        to="/dashboard"
        label="总览"
        icon="mdi:view-dashboard-outline"
      />
    </div>
  </footer>
</template>
