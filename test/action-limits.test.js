import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActionLimiter } from '../lib/action-limits.js';

/** قاعدة بيانات مزيفة دائمة: تبقى بعد "إعادة تشغيل" الخادم (إنشاء محدِّد جديد عليها). */
function fakeDb() {
  const rows = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?');
    if (text.includes('SELECT COUNT(*)')) {
      const [userId, action, since] = values;
      return [{ n: rows.filter((r) => r.userId === userId && r.action === action && r.at > since.getTime()).length }];
    }
    if (text.includes('INSERT INTO dalal_iraq_action_log')) {
      const [userId, action, at] = values;
      rows.push({ userId, action, at: at.getTime() });
      return [];
    }
    return [];
  };
  return { sql, rows };
}

const limits = { offer: { max: 2, windowMs: 60_000 }, review: { max: 3, windowMs: 60_000 } };

test('حد الإرسال يبقى سارياً بعد إعادة تشغيل الخادم لأنه محفوظ في قاعدة البيانات', async () => {
  const db = fakeDb();
  let clock = 1_000_000;
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
  assert.equal(await after.isLimited('offer', 7), false, 'يُسمح بعد انقضاء النافذة');
  assert.equal(db.rows.filter((r) => r.action === 'offer' && r.userId === 7).length, 3, 'المحاولة المرفوضة لا تُسجَّل');
});

test('بلا قاعدة بيانات (للتطوير فقط) يعمل الحد في الذاكرة', async () => {
  const limiter = createActionLimiter({ sql: null, limits });
  assert.equal(await limiter.isLimited('offer', 1), false);
  assert.equal(await limiter.isLimited('offer', 1), false);
  assert.equal(await limiter.isLimited('offer', 1), true);
});
