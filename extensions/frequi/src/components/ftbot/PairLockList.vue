<script setup lang="ts">
import type { Lock } from '@/types';
import type { TableColumn } from '@nuxt/ui';

const botStore = useBotStore();

const columns: TableColumn<Lock>[] = [
  { accessorKey: 'pair', header: '交易对' },
  { accessorKey: 'lock_end_timestamp', header: '截止时间' },
  { accessorKey: 'reason', header: '原因' },
  { id: 'actions', header: '操作' },
];

function removePairLock(item: Lock) {
  console.log(item);
  if (item.id !== undefined) {
    botStore.activeBot.deleteLock(item.id);
  } else {
    showAlert('This Freqtrade version does not support deleting locks.');
  }
}
</script>

<template>
  <div>
    <div class="mb-2">
      <label class="me-auto text-xl">交易对锁定</label>
      <UButton
        class="float-end"
        color="neutral"
        icon="mdi:refresh"
        @click="botStore.activeBot.getLocks"
      />
    </div>
    <UTable
      :data="botStore.activeBot.activeLocks"
      :columns="columns"
      :ui="{
        td: 'whitespace-normal',
      }"
    >
      <template #lock_end_timestamp-cell="{ row }">
        {{ timestampms(row.original.lock_end_timestamp) }}
      </template>
      <template #actions-cell="{ row }">
        <UButton
          class="btn-xs ms-1"
          size="sm"
          color="neutral"
          title="解除锁定"
          icon="mdi:delete"
          @click="removePairLock(row.original)"
        />
      </template>
    </UTable>
  </div>
</template>
