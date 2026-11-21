# Freqtrade 本地中文版本

本仓库在 Freqtrade 上增加中文 FreqUI、策略信号标记、公开交易员操作页面及 MU 永续行情接入。

## 当前默认配置

- `SampleStrategy` 原版，5 分钟周期，仅做多。
- Binance USDT 永续、逐仓、模拟资金；初始模拟钱包 1,000 USDT，每笔 100 USDT，最多 3 笔持仓。
- 交易对：`BTC/USDT:USDT`、`ETH/USDT:USDT`、`SOL/USDT:USDT`、`MU/USDT:USDT`。
- API/UI 仅映射到本机 `127.0.0.1:8080`。
- 策略是示例实现，没有盈利保证。仓库不包含个人凭据、数据库、历史行情、日志、备份或本机守护进程设置。

## 首次运行

需要 Docker Compose、Python 3.10+、Node.js 24，以及 `extensions/frequi/package.json` 指定版本的 pnpm。

```sh
git clone https://github.com/Wenguanming/Freqtrade.git
cd Freqtrade
cd extensions/frequi
corepack pnpm install --frozen-lockfile
corepack pnpm build
cd ../..
python3 scripts/setup_local.py
docker compose up -d
```

打开 <http://127.0.0.1:8080>。登录用户名为 `frequi`；密码由安装脚本随机生成，位于本机 `user_data/config.json` 的 `api_server.password`。安装脚本不会打印或上传密码。`dry_run` 默认开启，不需要币安交易 API Key。

`setup_local.py` 保留已有配置和交易数据库；策略文件内容冲突时会停止，避免覆盖用户修改。首次启动的模拟交易记录保存在 `user_data/tradesv3-sample-dryrun.sqlite`。请勿用新配置直接覆盖已有交易实例。

## 中文 FreqUI

源码位于 `extensions/frequi/`，包含中文文本、策略参数显示、买卖信号标记及窄屏布局。

- “图表”：合约 K 线下方的绿色 ▲ 是做多信号，上方的红色 ▼ 是做空信号。可点各方向的“定位最近”查看信号 K 线，或点“显示全部信号”恢复全图。三角不代表成交；“开多成交”“开空成交”等标记按订单实际成交价绘制。
- “交易员操作”：显示熬鹰资本的公开成交，支持合约、多空筛选、成交/发现时间和数量价格。
- “MU 永续 K 线”：进入 `MU/USDT:USDT` 图表。机器人运行时使用策略周期；机器人停用且周期为 15 分钟时，可使用只读公共行情。
- 停用或重启机器人后，原生图表的分析缓存可能为空。恢复模拟运行会重新加载；本地历史文件和交易数据库不会因此删除。

更新 UI 后重新构建并运行 `python3 scripts/setup_local.py`，然后刷新浏览器。构建产物保存在忽略目录中，不提交 Git。

## 可选：交易员监控

采集程序维护在 [Trading-System](https://github.com/Wenguanming/Trading-System)；本次接入核对版本为 `781128a2437b26e170887bdbd758f97ccbd93794`。

按该项目 README 安装并运行生产服务，保持 `127.0.0.1:8787` 可访问。在本仓库根目录另开终端运行：

```sh
node extensions/leader-monitor/frequi_feed.mjs --output user_data/ui-zh/leader-feed.json
```

数据桥每 15 秒读取已有采集结果；MU 的 15 分钟永续 K 线约每分钟从币安公开行情更新一次，失败会退避并保留最后数据。它不访问 Freqtrade 下单接口，也不修改策略状态。

FreqUI 入口：<http://127.0.0.1:8080/leader>。公开记录可能延迟或缺失；当前仓位隐藏时，仅能在已确认的仓位范围内推算。未确认的开/加/减/平仓状态保持未知，空列表不能代表整个账户空仓。

仓库不携带本机 LaunchAgent、聊天定时任务或通知密钥；需要持续运行时，请自行按部署环境管理采集进程和数据桥。

## 策略源码

| 文件 | 作用 |
| --- | --- |
| `extensions/strategies/sample_strategy.py` | 原版 SampleStrategy，5 分钟，仅做多 |
| `extensions/strategies/SampleStrategyFutures.py` | 继承 SampleStrategy，允许做空，固定 1 倍杠杆 |
| `extensions/strategies/DirectionalSweep15m.py` | 15 分钟策略：ETH 可做多、做空；BTC、SOL 仅做空，MU 仅做多 |
| `extensions/strategies/BanmuxiaMACDDivergence.py` | 此前适配的 MACD 背离策略，保留供研究 |
| `extensions/strategies/EMASkipPump.py` | 此前试用的公开策略，保留供研究 |

更换策略时同时检查 `docker-compose.yml` 的 `--strategy` 与本机配置的 `strategy`、`timeframe`；运行中的命令行参数会覆盖配置。

`DirectionalSweep15m` 用前 12 根已收盘 K 线的高低点判断是否突破。ETH 扫低后收盘回升标为“扫低回升”，冲高后收盘回落标为“冲高回落”；同根同时触发则跳过，不同时开多和开空。仅回测 ETH 时，选择 `ETH/USDT:USDT` 和 `15m`。仓库默认示例策略不变。

## 验证

```sh
node --test extensions/leader-monitor/frequi_feed.test.mjs
cd extensions/frequi
CHOKIDAR_USEPOLLING=1 corepack pnpm exec vitest run tests/unit/leaderDisplay.spec.ts tests/unit/muPerpetual.spec.ts
corepack pnpm typecheck
corepack pnpm build
```

## 上游来源与许可证

- Freqtrade：<https://github.com/freqtrade/freqtrade>，此分支基于 `56a3326fa`，保留上游 Git 历史与 GPL-3.0 许可证。
- FreqUI：<https://github.com/freqtrade/frequi>，3.2.1 / `4e1717ad1eaaf98447ebe2bdf4c00c8d755d2191`，许可证保存在 `extensions/frequi/LICENSE`。
- EMASkipPump 来源于公开的 Freqtrade 策略集合；其余适配代码保留在 `extensions/strategies/`。

完整 Freqtrade 文档和上游说明见根目录 README。
