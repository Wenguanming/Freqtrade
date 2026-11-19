<script setup lang="ts">
definePage({
  meta: {
    allowAnonymous: true,
  },
});
</script>

<template>
  <div class="mt-5">
    <div class="flex justify-center">
      <BotList class="max-w-xl" />
    </div>
    <USeparator class="my-5" />
    <AppIcon class="my-5 sm:w-80 sm:h-80 w-64 h-64" />

    <h1 class="font-bold text-2xl sm:text-4xl mb-4 transition-all">
      欢迎使用 <AppText class="text-2xl! sm:text-4xl!" />
    </h1>
    <div>在这里查看并管理你的量化交易机器人。</div>
    <USeparator class="my-5" />
    <p class="mb-2">
      如需帮助，请查看
      <a
        class="text-primary underline cursor-pointer"
        href="https://www.freqtrade.io/en/latest/"
        target="_blank"
      >
        Freqtrade 文档
      </a>
      .
    </p>

    <p class="mb-5">祝使用愉快，来自 <i>wishes you the Freqtrade team</i></p>
  </div>
</template>
