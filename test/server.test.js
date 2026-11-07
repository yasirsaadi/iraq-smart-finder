// اختبارات تكامل: تشغيل الخادم فعلياً دون قاعدة بيانات ودون اتصال بالإنترنت
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function startServer(port, extraEnv = {}) {
  const env = { ...process.env, PORT: String(port), DATABASE_URL: '', DEMO_MODE: '', PAYMENTS_ENABLED: '', ALERTS_DELIVERY_ENABLED: '', GOOGLE_CLIENT_ID: 'disabled', ...extraEnv };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const child = spawn(process.execPath, ['server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 8000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('running on')) {
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.on('exit', (code) => reject(new Error(`server exited ${code}`)));
  });
}

const PROD = 3871;
const DEMO = 3872;
let prod;
let demo;

before(async () => {
  prod = await startServer(PROD);
  demo = await startServer(DEMO, { DEMO_MODE: 'true', GOOGLE_CLIENT_ID: undefined });
});
after(() => {
  prod?.kill();
  demo?.kill();
});

const get = (port, p) => fetch(`http://127.0.0.1:${port}${p}`);
const post = (port, p, body) =>
  fetch(`http://127.0.0.1:${port}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('الإعدادات الافتراضية للإنتاج: كل الميزات غير المكتملة معطلة', async () => {
  const cfg = await (await get(PROD, '/api/config')).json();
  assert.equal(cfg.demoMode, false);
  assert.equal(cfg.paymentsEnabled, false);
  assert.equal(cfg.alertsDeliveryEnabled, false);
});

test('البيانات التجريبية محجوبة في الإنتاج ومتاحة في وضع العرض', async () => {
  assert.equal((await get(PROD, '/demo/demo-offers.js')).status, 404);
  const res = await get(DEMO, '/demo/demo-offers.js');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
  assert.equal((await (await get(DEMO, '/api/config')).json()).demoMode, true);
});

test('الاشتراك المدفوع معطل ولا يمنح عضوية وهمية', async () => {
  const sub = await post(PROD, '/api/subscribe', { phone: '07701234567' });
  assert.equal(sub.status, 503);
  const status = await (await get(PROD, '/api/subscription-status?phone=07701234567')).json();
  assert.equal(status.active, false);
});

test('التنبيهات: لا حفظ وهمي ولا كشف لأرقام الآخرين', async () => {
  const create = await post(PROD, '/api/alerts', { keyword: 'ايفون', targetPriceIQD: 1000000, contactPhone: '07701234567' });
  assert.equal(create.status, 503);
  const list = await (await get(PROD, '/api/alerts')).json();
  assert.deepEqual(list.alerts, []);
  assert.equal((await fetch(`http://127.0.0.1:${PROD}/api/alerts/1`, { method: 'DELETE' })).status, 401, 'الحذف يتطلب تسجيل الدخول');
});

test('إضافة العروض والتقييمات: تحقق المدخلات وعدم ادعاء الحفظ دون قاعدة بيانات', async () => {
  assert.equal((await post(PROD, '/api/offers', {})).status, 400);
  const res = await post(PROD, '/api/offers', { title: 'عرض', directUrl: 'javascript:alert(1)' });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).saved, false);
  assert.equal((await post(PROD, '/api/reviews', { storeName: 'متجر', rating: 9 })).status, 400);
});

test('البحث الحي يتحقق من المعاملات ولا يعيد أخطاء داخلية', async () => {
  const empty = await (await get(PROD, '/api/live-search?q=')).json();
  assert.deepEqual(empty.offers, []);
});

test('الصفحة الرئيسية تحمّل السكربت كوحدة', async () => {
  const html = await (await get(PROD, '/')).text();
  assert.match(html, /<script type="module" src="\/app.js"><\/script>/);
  const engine = await get(PROD, '/shared/price-engine.js');
  assert.equal(engine.status, 200);
});

test('التحديث الليلي محمي برمز سري ولا يعمل بدونه', async () => {
  const res = await fetch(`http://127.0.0.1:${PROD}/api/admin/refresh-popular`, { method: 'POST' });
  assert.equal(res.status, 401);
  const wrong = await fetch(`http://127.0.0.1:${PROD}/api/admin/refresh-popular`, { method: 'POST', headers: { Authorization: 'Bearer wrong' } });
  assert.equal(wrong.status, 401);
});

test('الإعدادات تعلن مدة حفظ النتائج وحصة البحث المجانية', async () => {
  const cfg = await (await get(PROD, '/api/config')).json();
  assert.equal(cfg.cacheTtlHours, 12);
  assert.equal(cfg.freeNewSearchesPerMonth, 30);
});

test('الحساب والدفع: معطلان بأمان دون إعداد، والمسار القديم لا يمنح عضوية', async () => {
  const me = await (await get(PROD, '/api/auth/me')).json();
  assert.equal(me.user, null);
  assert.equal((await post(PROD, '/api/auth/google', { credential: 'x' })).status, 503);
  assert.equal((await post(PROD, '/api/payments/qicard/create', {})).status, 503);
  const hook = await post(PROD, '/api/payments/qicard/webhook', { paymentId: 'b91e8d70-1ab7-4275-85a2-61f7dbb31410', status: 'SUCCESS' });
  assert.equal(hook.status, 200);
  assert.equal((await hook.json()).ignored, true);
  const legacy = await post(PROD, '/api/subscribe', { phone: '07701234567' });
  assert.equal((await legacy.json()).subscribed, false);
  const cfg = await (await get(PROD, '/api/config')).json();
  assert.equal(cfg.loginEnabled, false);
  assert.equal(cfg.paymentsEnabled, false);
});

test('تسجيل الدخول بغوغل مفعل افتراضياً بمعرّف التطبيق العام', async () => {
  const cfg = await (await get(DEMO, '/api/config')).json();
  assert.equal(cfg.loginEnabled, true);
  assert.match(cfg.googleClientId, /^249349705532-.+\.apps\.googleusercontent\.com$/);
  assert.equal(cfg.paymentsEnabled, false, 'الدفع يبقى معطلاً دون إعدادات كي كارد');
});

test('صفحتا الخصوصية والشروط حقيقيتان ومرتبطتان من الصفحة الرئيسية', async () => {
  const privacy = await (await get(PROD, '/privacy')).text();
  assert.match(privacy, /<title>سياسة الخصوصية/);
  assert.match(privacy, /كي كارد/);
  const terms = await (await get(PROD, '/terms')).text();
  assert.match(terms, /<title>شروط الاستخدام/);
  const home = await (await get(PROD, '/')).text();
  assert.match(home, /href="\/privacy"/);
  assert.match(home, /href="\/terms"/);
});

test('الإشعارات وإشعارات المتصفح: تتطلب تسجيل الدخول، وملف عامل الخدمة متاح', async () => {
  assert.deepEqual(await (await get(PROD, '/api/notifications')).json(), { items: [], unread: 0 });
  assert.equal((await post(PROD, '/api/push/subscribe', { subscription: {} })).status, 503, 'معطل حين يكون الدخول معطلاً');
  assert.equal((await post(DEMO, '/api/push/subscribe', { subscription: {} })).status, 401, 'يتطلب تسجيل الدخول');
  const key = await (await get(DEMO, '/api/push/public-key')).json();
  assert.match(key.publicKey, /^[A-Za-z0-9_-]{80,100}$/);
  const sw = await get(PROD, '/sw.js');
  assert.equal(sw.status, 200);
  assert.match(sw.headers.get('content-type'), /javascript/);
  assert.equal((await fetch(`http://127.0.0.1:${PROD}/api/admin/check-alerts`, { method: 'POST' })).status, 401);
});
