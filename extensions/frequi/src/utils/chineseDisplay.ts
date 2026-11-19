/** Translate known exit reasons for display while preserving the API value. */
export function chineseExitReason(reason: string | null | undefined): string {
  if (!reason) return '';
  const labels: Record<string, string> = {
    roi: '达到止盈目标',
    stop_loss: '触发止损',
    stoploss_on_exchange: '交易所止损',
    trailing_stop_loss: '移动止损',
    exit_signal: '策略平仓信号',
    custom_exit: '自定义平仓',
    force_exit: '强制平仓',
    emergency_exit: '紧急平仓',
    liquidation: '强制清算',
    partial_exit: '部分平仓',
  };
  return labels[reason] ? `${labels[reason]}（${reason}）` : reason;
}
