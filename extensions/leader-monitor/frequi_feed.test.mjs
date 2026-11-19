import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collect, collectMuMarket, TRADER_ID } from './frequi_feed.mjs';

const trade = { id: '1', portfolioId: TRADER_ID, time: 1000, symbol: 'MUUSDT',
  side: 'BUY', positionSide: 'LONG', effect: 'unknown', after: null,
  qty: '251.94', price: '714.6780757', revision: 1 };
const snapshot = { mode: 'binance', trader: { id: TRADER_ID, name: '熬鹰资本' },
  health: {}, positions: [], positionScope: 'selected', privateSecret: 'MUST_NOT_EXPORT' };
const source = async path => path === '/api/snapshot' ? snapshot : { total: 1, items: [trade] };

test('public allowlist preserves unknown action and exact decimals', async () => {
  const data = await collect(null, 2000, source);
  assert.equal(data.bridgeError, null);
  assert.equal(data.trades[0].effect, 'unknown');
  assert.equal(data.trades[0].after, null);
  assert.equal(data.trades[0].price, '714.6780757');
  assert.equal(data.positionScope, 'selected');
  assert.equal('privateSecret' in data, false);
});
test('failed collector retains records and original freshness', async () => {
  const previous = await collect(null, 2000, source);
  const data = await collect(previous, 3000, async () => { throw new Error('offline'); });
  assert.deepEqual(data.trades, previous.trades);
  assert.equal(data.lastReadAt, 2000);
  assert.equal(data.generatedAt, 3000);
  assert.match(data.bridgeError, /offline/);
});
test('rejects duplicate pages instead of dropping records', async () => {
  const previous = await collect(null, 2000, source);
  const data = await collect(previous, 3000, async path => path === '/api/snapshot' ? snapshot : { total: 2, items: [trade] });
  assert.notEqual(data.bridgeError, null);
  assert.equal(data.total, 1);
});
test('rejects a different trader', async () => {
  const data = await collect(null, 2000, async path => path === '/api/snapshot' ? snapshot : { total: 1, items: [{ ...trade, portfolioId: 'other' }] });
  assert.notEqual(data.bridgeError, null);
  assert.equal(data.total, 0);
});
test('rejects inconsistent pagination totals', async () => {
  let calls = 0;
  const data = await collect(null, 2000, async path => path === '/api/snapshot' ? snapshot : { total: ++calls === 1 ? 2 : 3, items: [trade] });
  assert.match(data.bridgeError, /分页/);
});
test('MU market uses perpetual endpoint and preserves candle values', async () => {
  const data = await collectMuMarket(null, 2000, async url => {
    assert.match(url, /^https:\/\/fapi\.binance\.com\/fapi\/v1\/klines\?symbol=MUUSDT&interval=15m/);
    return { ok: true, json: async () => [[900000, '700', '710', '690', '705', '123.4']] };
  });
  assert.equal(data.error, null);
  assert.deepEqual(data.candles, [[900000, 700, 710, 690, 705, 123.4]]);
});
test('MU market rejects malformed candles and retains last good data', async () => {
  const previous = { candles: [[900000, 700, 710, 690, 705, 10]], updatedAt: 1000 };
  const data = await collectMuMarket(previous, 2000, async () => ({ ok: true, json: async () => [[900000, 'NaN', '710', '690', '705', '10']] }));
  assert.notEqual(data.error, null);
  assert.equal(data.updatedAt, 1000);
  assert.deepEqual(data.candles, previous.candles);
});
