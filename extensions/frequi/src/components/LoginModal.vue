<script setup lang="ts">
import type { AuthStorageWithBotId } from '@/types';

export interface LoginModalProps {
  loginInfo?: AuthStorageWithBotId;
}

defineProps<LoginModalProps>();
const emit = defineEmits<{
  close: [value: boolean];
}>();

function loginResult(result: boolean) {
  if (result) {
    // Only close if
    emit('close', result);
  }
}
</script>

<template>
  <UModal title="登录交易机器人" description="输入机器人登录信息以连接">
    <template #body>
      <BotLogin in-modal :existing-auth="loginInfo" @login-result="loginResult" />
    </template>
  </UModal>
</template>
