<script setup lang="ts">
import { FtWsMessageTypes } from '@/types/wsMessageTypes';

const settingsStore = useSettingsStore();
const colorStore = useColorStore();
const layoutStore = useLayoutStore();

const timezoneOptions = ['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone];
const openTradesOptions = [
  { value: OpenTradeVizOptions.showPill, text: '在图标上显示角标' },
  { value: OpenTradeVizOptions.asTitle, text: '在页面标题中显示' },
  { value: OpenTradeVizOptions.noOpenTrades, text: "不在顶部显示持仓数量" },
];
const colorPreferenceOptions = [
  { value: ColorPreferences.GREEN_UP, text: '绿涨红跌' },
  { value: ColorPreferences.RED_UP, text: '红涨绿跌' },
];

const resetDynamicLayout = () => {
  layoutStore.resetTradingLayout();
  layoutStore.resetDashboardLayout();
  showAlert('布局已重置。');
};
</script>

<template>
  <UCard class="mx-auto mt-3 p-4 max-w-4xl">
    <template #header><span class="text-2xl font-bold">FreqUI 设置</span></template>
    <div class="flex flex-col gap-4 text-start dark:text-neutral-300">
      <p class="text-left">UI Version: {{ settingsStore.uiVersion }}</p>

      <div class="border border-neutral-400 rounded-sm p-4 space-y-4">
        <h4 class="text-xl font-semibold">界面设置</h4>

        <BaseCheckbox v-model="layoutStore.layoutLocked" class="space-y-1">
          锁定可拖动布局
          <template #hint>
            Lock dynamic layouts, so they cannot move anymore. Can also be set from the navbar at
            the top.
          </template>
        </BaseCheckbox>

        <div class="flex flex-row items-center gap-2 space-y-2">
          <UButton color="neutral" size="md" class="mb-0" @click="resetDynamicLayout"
            >重置布局</UButton
          >
          <small class="text-sm block text-neutral-600 dark:text-neutral-400"
            >恢复默认布局。</small
          >
        </div>

        <USeparator />

        <div class="space-y-1">
          <label class="block text-sm">在顶部显示持仓数量</label>
          <USelect
            v-model="settingsStore.openTradesInTitle"
            :items="openTradesOptions"
            label-key="text"
            value-key="value"
            class="w-full"
          />
          <small class="text-sm text-neutral-600 dark:text-neutral-400"
            >选择持仓数量的显示方式</small
          >
        </div>

        <div class="space-y-1">
          <label class="block text-sm">显示时区</label>
          <USelect v-model="settingsStore.timezone" :items="timezoneOptions" class="w-full" />
          <small class="text-sm text-neutral-600 dark:text-neutral-400"
            >选择显示时区；交易所通常使用 UTC</small
          >
        </div>

        <BaseCheckbox v-model="settingsStore.backgroundSync" class="space-y-1">
          后台同步
          <template #hint> 选择其他机器人时仍保持后台同步。 </template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.confirmDialog" class="space-y-1">
          强制平仓时显示确认对话框
          <template #hint
            >强制平仓前要求确认。<br />
            This will also show <i-mdi-run-fast class="text-yellow-300 inline" />
            <i-mdi-alert class="text-yellow-300 inline" />
            in the title bar.
          </template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.multiPaneButtonsShowText" class="space-y-1">
          显示交易面板按钮文字
          <template #hint
            >在面板按钮上显示文字；关闭后仅显示图标。</template
          >
        </BaseCheckbox>
      </div>

      <div class="border border-neutral-400 rounded-sm p-4 space-y-4">
        <h4 class="text-lg font-semibold">图表设置</h4>

        <div class="space-y-1">
          <label class="block text-sm">图表价格刻度位置</label>
          <URadioGroup
            v-model="settingsStore.chartLabelSide"
            :items="[
              { label: '左侧', value: 'left' },
              { label: '右侧', value: 'right' },
            ]"
            orientation="horizontal"
          />
          <small class="text-sm text-neutral-600 dark:text-neutral-400">
            选择价格刻度显示在左侧还是右侧。
          </small>
        </div>

        <BaseCheckbox v-model="settingsStore.useHeikinAshiCandles" class="space-y-1">
          使用平均 K 线
          <template #hint>在图表中使用平均 K 线</template>
        </BaseCheckbox>

        <BaseCheckbox v-model="settingsStore.useReducedPairCalls" class="space-y-1">
          仅请求需要的数据列
          <template #hint
            >Can reduce the transfer size for large dataframes. May require additional calls if the
            plot config changes.</template
          >
        </BaseCheckbox>

        <div>
          <p>默认显示的 K 线数量（默认 250 根）</p>
          <div class="flex flex-row gap-5 w-full items-center">
            <USlider
              v-model="settingsStore.chartDefaultCandleCount"
              class="flex-1"
              :step="50"
              :min="100"
              :max="2000"
            />
            <UInputNumber
              v-model="settingsStore.chartDefaultCandleCount"
              :step="50"
              :min="100"
              :max="2000"
              size="sm"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block">K 线颜色</label>
          <div class="flex flex-row gap-5 items-center">
            <URadioGroup
              v-model="colorStore.colorPreference"
              :items="colorPreferenceOptions"
              label-key="text"
              value-key="value"
              orientation="horizontal"
            >
              <template #label="{ item }">
                <div class="flex items-center">
                  <span class="mr-2">{{ item.text }}</span>
                  <UIcon
                    name="mdi:arrow-up-thin"
                    :color="
                      item.value === ColorPreferences.GREEN_UP
                        ? colorStore.colorProfit
                        : colorStore.colorLoss
                    "
                    class="-ml-2 size-5"
                  />
                  <UIcon
                    name="mdi:arrow-down-thin"
                    :color="
                      item.value === ColorPreferences.GREEN_UP
                        ? colorStore.colorLoss
                        : colorStore.colorProfit
                    "
                    class="-ml-2 size-5"
                  />
                </div>
              </template>
            </URadioGroup>
          </div>
        </div>
      </div>

      <div class="border rounded-sm border-neutral-400 p-4 space-y-4">
        <h4 class="text-lg font-semibold">通知设置</h4>
        <div class="space-y-2">
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryFill]">
            开仓成交通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitFill]">
            平仓成交通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.entryCancel]">
            开仓撤单通知
          </BaseCheckbox>
          <BaseCheckbox v-model="settingsStore.notifications[FtWsMessageTypes.exitCancel]">
            平仓撤单通知
          </BaseCheckbox>
        </div>
      </div>

      <div class="border rounded-sm border-neutral-400 p-4 space-y-4">
        <h4 class="text-lg font-semibold">回测设置</h4>
        <div>
          <label for="backtestMetrics" class="block">回测指标</label>
          <USelectMenu
            multiple
            id="backtestMetrics"
            v-model="settingsStore.backtestAdditionalMetrics"
            :items="availableBacktestMetrics"
            label-key="header"
            value-key="field"
            class="w-full"
            display="chip"
          />
          <small class="text-sm text-neutral-600 dark:text-neutral-400"
            >Select which metrics should be shown on a per pair / tag basis.</small
          >
        </div>
      </div>
    </div>
  </UCard>
</template>
