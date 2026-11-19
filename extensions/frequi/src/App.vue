<script setup lang="ts">
import { zh_cn } from '@nuxt/ui/locale';
const settingsStore = useSettingsStore();
const colorStore = useColorStore();
onMounted(() => {
  setTimezone(settingsStore.timezone);
  colorStore.updateProfitLossColor();
});
watch(
  () => settingsStore.timezone,
  (tz) => {
    console.log('timezone changed', tz);
    setTimezone(tz);
  },
);
</script>

<template>
  <UApp :locale="zh_cn">
    <div id="app" class="flex flex-col h-dvh" :style="colorStore.cssVars">
      <NavBar />
      <BodyLayout class="grow overflow-auto" />
      <NavFooter />
    </div>
  </UApp>
</template>

<style scoped>
#app {
  font-family: Avenir, 'PingFang SC', 'Microsoft YaHei', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
}

/* * {
  outline: 1px solid #f00 !important;
} */
</style>
