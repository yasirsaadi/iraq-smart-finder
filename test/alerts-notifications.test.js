import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findAlertMatches, createAlertStore } from '../lib/price-alerts.js';
import { validatePushSubscription, createNotifier } from '../lib/notifications.js';

const offer = (id, title, priceIQD, extra = {}) => ({ id, title, snippet: title, priceIQD, directUrl: `https://www.facebook.com/p/${id}`, ...extra });
const alert = { keyword: 'ايفون 15', targetPriceIQD: 1_500_000 };

test('التنبيه: العروض ذات الصلة تحت السعر المستهدف فقط، الأرخص أولاً', () => {
  const offers = [
    offer('a', 'ايفون 15 برو', 1_600_000),
    offer('b', 'ايفون 15 نظيف', 1_450_000),
    offer('c', 'ايفون 15 مختوم', 1_400_000),
    offer('d', 'ايفون 13 نظيف', 900_000),
    offer('e', 'ايفون 15 للايجار', 100_000, { priceIsRent: true })
  ];
  assert.deepEqual(findAlertMatches(alert, offers).map((o) => o.id), ['c', 'b']);
});

test('التنبيه: السعر الشاذ (خطأ استخراج) لا يطلق تنبيهاً', () => {
  const offers = [offer('a', 'ايفون 15', 1_550_000), offer('b', 'ايفون 15', 1_600_000), offer('c', 'ايفون 15', 1_620_000), offer('d', 'ايفون 15', 1_580_000), offer('x', 'ايفون 15 سعر خاطئ', 20_000)];
  assert.deepEqual(findAlertMatches(alert, offers).map((o) => o.id), []);
});

test('التنبيه: العرض نفسه لا يُنبَّه عنه مرتين', () => {
  const offers = [offer('b', 'ايفون 15 نظيف', 1_450_000)];
  assert.equal(findAlertMatches(alert, offers, ['https://www.facebook.com/p/b']).length, 0);
});

test('مخزن التنبيهات: حد لكل مستخدم، وكل مستخدم يحذف تنبيهاته فقط', async () => {
  const store = createAlertStore({ sql: null });
  for (let i = 0; i < 2; i += 1) assert.ok((await store.create(1, { keyword: `سلعة ${i}`, targetPriceIQD: 1000, governorate: 'baghdad' }, 2)).alert);
  assert.equal((await store.create(1, { keyword: 'ثالثة', targetPriceIQD: 1000, governorate: 'baghdad' }, 2)).error, 'alert_limit_reached');
  assert.equal((await store.create(1, { keyword: '', targetPriceIQD: 1000, governorate: 'baghdad' }, 5)).error, 'invalid_alert');
  const [first] = await store.list(1);
  assert.equal(await store.remove(2, first.id), false, 'مستخدم آخر لا يحذف');
  assert.equal(await store.remove(1, first.id), true);
  assert.equal((await store.forSearch('سلعة 1', 'baghdad', 'products')).length, 1);
});

test('اشتراك إشعارات المتصفح: يُقبل الصحيح ويُرفض المزيف', () => {
  const good = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } };
  assert.ok(validatePushSubscription(good));
  assert.equal(validatePushSubscription({ ...good, endpoint: 'http://insecure.example/x' }), null);
  assert.equal(validatePushSubscription({ ...good, endpoint: 'javascript:alert(1)' }), null);
  assert.equal(validatePushSubscription({ ...good, keys: { p256dh: '<script>', auth: 'x' } }), null);
});

test('صندوق الإشعارات داخل الموقع: حفظ وقراءة وتعليم كمقروء', async () => {
  const n = createNotifier({ sql: null });
  const r = await n.notifyUser(7, { kind: 'price_drop', title: '🔔 نزل السعر', body: 'ايفون 15', url: '/?q=x' });
  assert.equal(r.stored, true);
  assert.equal(r.pushed, 0, 'لا اشتراكات متصفح بعد');
  assert.equal((await n.inbox(7)).unread, 1);
  assert.equal((await n.inbox(8)).items.length, 0, 'لا يرى مستخدم آخر إشعاراتك');
  await n.markAllRead(7);
  assert.equal((await n.inbox(7)).unread, 0);
  const evil = await n.notifyUser(7, { kind: 'x', title: 't', url: 'javascript:alert(1)' });
  assert.equal(evil.stored, true);
  assert.equal((await n.inbox(7)).items[0].url, '/', 'رابط خطير يُستبدل بالصفحة الرئيسية');
  assert.match(await n.publicKey(), /^[A-Za-z0-9_-]{80,100}$/);
});

test('مطابقة الأقسام: بحث "جميع الأقسام" يفحص تنبيه "السلع"، والعكس', async () => {
  const store = createAlertStore({ sql: null });
  await store.create(1, { keyword: 'سبلت جري 2 طن', targetPriceIQD: 2_000_000, governorate: 'baghdad', section: 'products' }, 10);
  await store.create(2, { keyword: 'سبلت جري 2 طن', targetPriceIQD: 2_000_000, governorate: 'baghdad', section: 'all' }, 10);
  assert.equal((await store.forSearch('سبلت جري 2 طن', 'baghdad', 'all')).length, 2);
  assert.equal((await store.forSearch('سبلت جري 2 طن', 'baghdad', 'products')).length, 2);
  assert.equal((await store.forSearch('سبلت جري 2 طن', 'baghdad', 'cars')).length, 1, 'تنبيه السلع لا يُفحص بنتائج السيارات');
  assert.equal((await store.forSearch('سبلت جري 2 طن', 'basra', 'all')).length, 0);
});

test('تعديل التنبيه: السعر وحده يُبقي السجل، وتغيير السلعة أو المحافظة يبدأ المراقبة من جديد', async () => {
  const store = createAlertStore({ sql: null });
  const { alert } = await store.create(1, { keyword: 'ايفون 15', targetPriceIQD: 1_500_000, governorate: 'baghdad', section: 'products' }, 10);
  await store.markChecked(alert.id, ['https://www.facebook.com/p/1']);
  const priceOnly = await store.update(1, alert.id, { targetPriceIQD: 1_700_000 });
  assert.equal(priceOnly.scopeChanged, false);
  assert.equal(priceOnly.alert.targetPriceIQD, 1_700_000);
  assert.deepEqual(priceOnly.alert.notifiedUrls, ['https://www.facebook.com/p/1']);
  const moved = await store.update(1, alert.id, { governorate: 'basra' });
  assert.equal(moved.scopeChanged, true);
  assert.deepEqual(moved.alert.notifiedUrls, []);
  assert.equal((await store.update(2, alert.id, { targetPriceIQD: 1 })).error, 'not_found', 'مستخدم آخر لا يعدّل');
  assert.equal((await store.update(1, alert.id, { targetPriceIQD: -5 })).error, 'invalid_alert');
});
