import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// أنماط التعابير النمطية داخل عبارات SQL تمر عبر قوالب JavaScript؛ "\\?" تصبح "?" فتفسد النمط
// وتوقف تهيئة قاعدة البيانات. نتحقق أن كل نمط يُترجم كتعبير صحيح.
test('كل أنماط ~ في عبارات SQL صالحة بعد مرورها عبر قالب JavaScript', async () => {
  const files = ['lib/listing-index.js', 'lib/search-store.js', 'lib/price-alerts.js', 'lib/accounts.js', 'server.js'];
  let checked = 0;
  for (const f of files) {
    const src = fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/!?~\s*'((?:[^'\\]|\\.)*)'/g)) {
      // ما يصل فعلاً إلى قاعدة البيانات: قيمة النص بعد تفسير القالب
      const asSent = Function(`return \`${m[1].replace(/`/g, '\\`')}\`;`)();
      assert.doesNotThrow(() => new RegExp(asSent), `${f}: ${asSent}`);
      checked += 1;
    }
  }
  assert.ok(checked >= 4, `عدد الأنماط المفحوصة ${checked}`);
});
