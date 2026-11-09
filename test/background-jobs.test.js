import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshPopularBatch, checkDueAlerts } from '../lib/background-jobs.js';
import { createSearchStore, DEFAULTS } from '../lib/search-store.js';

const silent = { error() {} };
// سقف حقيقي من مخزن البحث: 8 أرصدة = بحثان فقط
const budgetOf = (credits) => {
  const store = createSearchStore({ sql: null, config: { ...DEFAULTS, dailyCreditBudget: credits } });
  return { store, reserve: () => store.reserveCredits(4) };
};

test('التحديث الليلي يتوقف عند نفاد الرصيد اليومي ولا يتجاوزه', async () => {
  const { store, reserve } = budgetOf(8);
  const searched = [];
  const items = ['a', 'b', 'c', 'd'].map((q) => ({ key: q, query: q, gov: 'baghdad', section: 'all' }));
  const report = await refreshPopularBatch({
    items,
    cachedAgeMs: async () => null,
    freshEnoughMs: 1000,
    reserveCredits: reserve,
    runSearch: async (item) => {
      searched.push(item.query);
      return { providerOk: true };
    },
    log: silent
  });
  assert.deepEqual(searched, ['a', 'b']);
  assert.equal(report.refreshed, 2);
  assert.equal(report.budgetExhausted, true);
  assert.equal(await store.creditsUsedToday(), 8, 'لم يُصرف أكثر من السقف');
});

function alertHarness({ credits, allowance = 20, cached = {}, failSearchFor = [] }) {
  const { store, reserve } = budgetOf(credits);
  const checked = [];
  const searched = [];
  return {
    store,
    checked,
    searched,
    deps: (alerts) => ({
      alerts,
      getPayload: async (a) => cached[a.keyword] || null,
      canSearch: true,
      freshSearchAllowance: allowance,
      reserveCredits: reserve,
      runSearch: async (a) => {
        searched.push(a.keyword);
        if (failSearchFor.includes(a.keyword)) throw new Error('provider down');
        return { providerOk: true };
      },
      checkPayload: async () => 1,
      markChecked: async (a) => checked.push(a.keyword),
      log: silent
    })
  };
}

test('فحص التنبيهات: نفاد الرصيد لا يعلّم التنبيه مفحوصاً ويبقيه لإعادة المحاولة', async () => {
  const h = alertHarness({ credits: 4, cached: { cachedOne: { offers: [{}] } } });
  const alerts = [{ id: 1, keyword: 'first' }, { id: 2, keyword: 'second' }, { id: 3, keyword: 'cachedOne' }, { id: 4, keyword: 'third' }];
  const r = await checkDueAlerts(h.deps(alerts));
  assert.deepEqual(h.searched, ['first'], 'بحث واحد فقط ضمن الرصيد');
  assert.deepEqual(h.checked.sort(), ['cachedOne', 'first'], 'المؤجل لا يُعلَّم مفحوصاً');
  assert.equal(r.deferred, 2);
  assert.equal(r.budgetExhausted, true);
  assert.equal(r.fromCache, 1, 'النتائج المحفوظة تُفحص مجاناً رغم نفاد الرصيد');
  assert.equal(await h.store.creditsUsedToday(), 4);
});

test('فحص التنبيهات: فشل البحث أو بلوغ حد الليلة يؤجل التنبيه دون تعليمه مفحوصاً', async () => {
  const h = alertHarness({ credits: 100, allowance: 1, failSearchFor: ['broken'] });
  const r = await checkDueAlerts(h.deps([{ id: 1, keyword: 'broken' }, { id: 2, keyword: 'later' }]));
  assert.deepEqual(h.checked, []);
  assert.equal(r.deferred, 2);
  assert.equal(r.freshSearchAllowanceLeft, 0);
});

test('فحص التنبيهات: النتيجة المحفوظة الفارغة تُعلَّم مفحوصة فلا تتكرر الدفعة', async () => {
  const h = alertHarness({ credits: 0, cached: { empty: { offers: [] } } });
  const r = await checkDueAlerts(h.deps([{ id: 1, keyword: 'empty' }]));
  assert.deepEqual(h.checked, ['empty']);
  assert.equal(r.deferred, 0);
});
