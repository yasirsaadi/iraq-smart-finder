import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSearchStore, quotaSubjectFor, DEFAULTS } from '../lib/search-store.js';

const cfg = (over = {}) => ({ ...DEFAULTS, ...over });

test('الذاكرة المشتركة تحفظ النتيجة وتعيدها مع وقت الحفظ', async () => {
  const store = createSearchStore({ sql: null, config: cfg() });
  assert.equal(await store.getCached('k'), null);
  await store.setCached('k', { offers: [1, 2] }, { query: 'q', governorate: 'baghdad', section: 'all' });
  const hit = await store.getCached('k');
  assert.deepEqual(hit.value, { offers: [1, 2] });
  assert.ok(Date.parse(hit.cachedAt) <= Date.now());
  assert.ok((await store.cachedAgeMs('k')) < 5000);
});

test('سقف الرصيد اليومي يمنع الصرف بعد بلوغه، والاسترداد يعيده', async () => {
  const store = createSearchStore({ sql: null, config: cfg({ dailyCreditBudget: 8 }) });
  assert.equal(await store.reserveCredits(4), true);
  assert.equal(await store.reserveCredits(4), true);
  assert.equal(await store.reserveCredits(4), false, 'تجاوز السقف');
  await store.refundCredits(4);
  assert.equal(await store.reserveCredits(4), true);
  assert.equal(await store.reserveCredits(4, { enforce: false }), false, 'لا يوجد أي تجاوز للسقف، حتى للمهام الليلية');
  assert.equal(await store.creditsUsedToday(), 8);
});

test('حصة البحث الجديد الشهرية لكل زائر', async () => {
  const store = createSearchStore({ sql: null, config: cfg() });
  for (let i = 1; i <= 3; i += 1) assert.deepEqual(await store.consumeNewSearch('c:a', 3), { allowed: true, used: i, limit: 3 });
  assert.equal((await store.consumeNewSearch('c:a', 3)).allowed, false);
  assert.equal((await store.consumeNewSearch('c:b', 3)).allowed, true, 'زائر آخر له حصته');
  await store.releaseNewSearch('c:a');
  assert.equal((await store.consumeNewSearch('c:a', 3)).allowed, true);
  assert.equal((await store.consumeNewSearch('c:x', 0)).allowed, false);
});

test('هوية الحصة: معرّف المتصفح الصالح وإلا عنوان الشبكة', () => {
  const req = (h, ip = '1.2.3.4') => ({ ip, get: (name) => (name === 'x-client-id' ? h : undefined) });
  assert.equal(quotaSubjectFor(req('3f2b8c1e-9a4d-4e6b-8c2a-1b2c3d4e5f60')), 'c:3f2b8c1e-9a4d-4e6b-8c2a-1b2c3d4e5f60');
  assert.equal(quotaSubjectFor(req("x'; DROP TABLE x;--")), 'ip:1.2.3.4');
  assert.equal(quotaSubjectFor(req(undefined)), 'ip:1.2.3.4');
});
