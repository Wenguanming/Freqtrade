/** Read-only public trade export for FreqUI. Does not access trading APIs. */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TRADER_ID = '5075281354358777856';
const fields = ['id', 'symbol', 'side', 'positionSide', 'qty', 'price', 'time',
  'detectedAt', 'realizedPnl', 'effect', 'after', 'revision'];
const select = (object, keys) => Object.fromEntries(keys.map(key => [key, object[key] ?? null]));

export async function collectMuMarket(previous, now, request = fetch) {
  try {
    const response = await request('https://fapi.binance.com/fapi/v1/klines?symbol=MUUSDT&interval=15m&limit=500', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('行情接口返回 HTTP ' + response.status);
    const raw = await response.json();
    if (!Array.isArray(raw) || !raw.length) throw new Error('行情为空');
    const candles = raw.map(row => row.slice(0, 6).map(Number));
    if (candles.some((row, i) => row.length !== 6 || row.some(value => !Number.isFinite(value)) ||
        row[0] <= 0 || row[1] <= 0 || row[2] < Math.max(row[1], row[4]) ||
        row[3] > Math.min(row[1], row[4]) || row[3] <= 0 || row[5] < 0 ||
        i > 0 && row[0] <= candles[i - 1][0])) throw new Error('行情格式异常');
    return { symbol: 'MUUSDT', pair: 'MU/USDT:USDT', timeframe: '15m',
      source: 'binance-usdt-perpetual', updatedAt: now, error: null, candles };
  } catch (error) {
    return { ...(previous ?? { symbol: 'MUUSDT', pair: 'MU/USDT:USDT', timeframe: '15m',
      source: 'binance-usdt-perpetual', updatedAt: null, candles: [] }), error: error.message };
  }
}

async function get(path) {
  const response = await fetch('http://127.0.0.1:8787' + path, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('本机采集服务返回 HTTP ' + response.status);
  return response.json();
}

export async function collect(previous, now, read = get) {
  try {
    const snapshot = await read('/api/snapshot');
    if (snapshot.mode !== 'binance' || snapshot.trader?.id !== TRADER_ID) throw new Error('监控对象不匹配');
    const trades = [];
    let total;
    for (let page = 1; page <= 200; page++) {
      const result = await read(`/api/trades?page=${page}&limit=100`);
      total ??= result.total;
      if (result.total !== total) throw new Error('分页期间记录有变化，等待下次同步');
      trades.push(...result.items);
      if (trades.length >= total) break;
    }
    if (trades.length !== total || new Set(trades.map(t => t.id)).size !== total) throw new Error('成交记录不完整');
    if (trades.some(t => t.portfolioId !== TRADER_ID)) throw new Error('成交记录的交易员不匹配');
    trades.sort((a, b) => b.time - a.time || b.id.localeCompare(a.id));
    return {
      version: 1, generatedAt: now, lastReadAt: now, bridgeError: null,
      trader: { id: TRADER_ID, name: snapshot.trader.name },
      health: select(snapshot.health, ['initialized', 'paused', 'lastSuccess', 'failures', 'error']),
      trades: trades.map(t => select(t, fields)), total,
      positionScope: snapshot.positionScope ?? null,
      positionReliable: snapshot.positionReliable ?? false,
      positionWarning: snapshot.positionWarning ?? null,
      positions: (snapshot.positions ?? []).map(p => select(p, ['symbol', 'positionSide', 'qty', 'avg'])),
    };
  } catch (error) {
    const fallback = previous ?? {
      version: 1, lastReadAt: null, trader: { id: TRADER_ID, name: '熬鹰资本' },
      health: { initialized: false, paused: false, lastSuccess: null, failures: 0, error: null },
      trades: [], total: 0, positionScope: null, positionReliable: false, positionWarning: null, positions: [],
    };
    return { ...fallback, generatedAt: now, bridgeError: '公开成交同步失败：' + error.message };
  }
}

async function main() {
  const index = process.argv.indexOf('--output');
  if (index < 0 || !process.argv[index + 1]) throw new Error('--output is required');
  const output = resolve(process.argv[index + 1]);
  await mkdir(dirname(output), { recursive: true });
  let previous = null;
  try { previous = JSON.parse(await readFile(output, 'utf8')); } catch {}
  let status = '';
  let muMarket = previous?.muMarket ?? null;
  let nextMarketPoll = 0;
  while (true) {
    const start = performance.now();
    const due = Date.now() >= nextMarketPoll;
    const [result, market] = await Promise.all([
      collect(previous, Date.now()),
      due ? collectMuMarket(muMarket, Date.now()) : Promise.resolve(muMarket),
    ]);
    if (due) nextMarketPoll = Date.now() + (market.error ? 120000 : 60000);
    muMarket = market;
    result.muMarket = muMarket;
    await writeFile(output + '.tmp', JSON.stringify(result));
    await rename(output + '.tmp', output);
    previous = result;
    const nextStatus = JSON.stringify({ bridgeError: result.bridgeError, total: result.total });
    if (status !== nextStatus) { process.stdout.write(nextStatus + '\n'); status = nextStatus; }
    if (process.argv.includes('--once')) return;
    await new Promise(resolve => setTimeout(resolve, Math.max(1000, 15000 - (performance.now() - start))));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
