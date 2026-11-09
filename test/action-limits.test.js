import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActionLimiter } from '../lib/action-limits.js';

const tick = () => new Promise((r) => setTimeout(r, 1));

/**
 * قاعدة بيانات مزيفة دائمة تحاكي سلوك Postgres: كل عبارة SQL تُنفَّذ كاملة دون تداخل،
 * لكن العبارات المتتالية من الطلبات المتزامنة تتداخل (بانتظار بين كل عبارة وأخرى).
 */
function fakeDb() {
  const counters = new Map();
  const sql = async (strings, ...values) => {
    const text = strings.join('?');
    await tick();
    if (text.includes('INSERT INTO dalal_iraq_action_counters')) {
      const [userId, action, windowStart, max] = values;
      const key = `${userId}|${action}|${windowStart.getTime()}`;
      const count = counters.get(key);
      if (count === undefined) {
        counters.set(key, 1);
        return [{ count: 1 }];
      }
      if (count < max) {
        counters.set(key, count + 1);
        return [{ count: count + 1 }];
      }
      return [];
    }
    return [];
  };
  return { sql, counters };
}

const limits = { offer: { max: 2, windowMs: 60_000 }, review: { max: 3, windowMs: 60_000 } };

test('حد الإرسال يبقى سارياً بعد إعادة تشغيل الخادم لأنه محفوظ في قاعدة البيانات', async () => {
  const db = fakeDb();
  let clock = 1_000_000_020;
  const before = createActionLimiter({ sql: db.sql, limits, now: () => clock });
  assert.equal(await before.isLimited('offer', 7), false);
  assert.equal(await before.isLimited('offer', 7), false);
  assert.equal(await before.isLimited('offer', 7), true, 'بلغ الحد');

  // إعادة تشغيل: محدِّد جديد بذاكرة فارغة على قاعدة البيانات نفسها
  const after = createActionLimiter({ sql: db.sql, limits, now: () => clock });
  assert.equal(await after.isLimited('offer', 7), true, 'الحد مستمر بعد إعادة التشغيل');
  assert.equal(await after.isLimited('offer', 8), false, 'حساب آخر غير متأثر');
  assert.equal(await after.isLimited('review', 7), false, 'نوع آخر من الإرسال غير متأثر');

  clock += 61_000;
  assert.equal(await after.isLimited('offer', 7), false, 'يُسمح في النافذة التالية');
});

test('المحاولات المتزامنة لا تتجاوز الحد', async () => {
  const db = fakeDb();
  const limiter = createActionLimiter({ sql: db.sql, limits: { review: { max: 10, windowMs: 3_600_000 } }, now: () => 5_000_000 });
  const results = await Promise.all(Array.from({ length: 40 }, () => limiter.isLimited('review', 3)));
  assert.equal(results.filter((limited) => !limited).length, 10, 'مسموح بعشر محاولات بالضبط');
  assert.equal([...db.counters.values()][0], 10);
});

test('بلا قاعدة بيانات (للتطوير فقط) يعمل الحد في الذاكرة', async () => {
  const limiter = createActionLimiter({ sql: null, limits });
  assert.equal(await limiter.isLimited('offer', 1), false);
  assert.equal(await limiter.isLimited('offer', 1), false);
  assert.equal(await limiter.isLimited('offer', 1), true);
});
