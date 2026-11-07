import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { isPaymentSettled, verifyQiWebhookSignature } from '../lib/qicard.js';
import { createAccountStore, parseCookies, sessionCookieHeader } from '../lib/accounts.js';

test('الدفع لا يُعد مكتملاً إلا بالحالة والمبلغ والعملة والمعرّف الصحيحة', () => {
  const ok = { status: 'SUCCESS', canceled: false, amount: 1000.0, currency: 'IQD', requestId: 'r1' };
  assert.equal(isPaymentSettled(ok, { expectedAmountIQD: 1000, expectedRequestId: 'r1' }), true);
  assert.equal(isPaymentSettled({ ...ok, status: 'CREATED' }, { expectedAmountIQD: 1000 }), false);
  assert.equal(isPaymentSettled({ ...ok, canceled: true }, { expectedAmountIQD: 1000 }), false);
  assert.equal(isPaymentSettled({ ...ok, amount: 10 }, { expectedAmountIQD: 1000 }), false, 'مبلغ أقل من سعر الاشتراك');
  assert.equal(isPaymentSettled({ ...ok, currency: 'USD' }, { expectedAmountIQD: 1000 }), false);
  assert.equal(isPaymentSettled({ ...ok, requestId: 'other' }, { expectedAmountIQD: 1000, expectedRequestId: 'r1' }), false);
});

test('التحقق من توقيع إشعار كي كارد حسب صيغة التوثيق', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  const payload = { paymentId: 'b91e8d70-1ab7-4275-85a2-61f7dbb31410', status: 'SUCCESS', amount: 10000, currency: 'IQD', creationDate: '2025-01-13T21:25:19' };
  const signer = createSign('sha256');
  signer.update('b91e8d70-1ab7-4275-85a2-61f7dbb31410|10000.000|IQD|2025-01-13T21:25:19|SUCCESS');
  const sig = signer.sign(privateKey, 'base64');
  assert.equal(verifyQiWebhookSignature(payload, sig, pem), true);
  assert.equal(verifyQiWebhookSignature({ ...payload, status: 'FAILED' }, sig, pem), false, 'تغيير الحالة يبطل التوقيع');
  assert.equal(verifyQiWebhookSignature(payload, 'AAAA', pem), false);
  assert.equal(verifyQiWebhookSignature(payload, sig, ''), false);
});

test('الاشتراك يُفعَّل مرة واحدة لكل دفعة، والتجديد يُضاف إلى المدة المتبقية', async () => {
  const store = createAccountStore({ sql: null });
  const user = await store.upsertGoogleUser({ sub: 's1', email: 'a@gmail.com', name: 'A' });
  await store.recordPayment({ requestId: 'r1', paymentId: 'p1', userId: user.id, amountIQD: 1000, planDays: 30 });
  assert.equal((await store.subscriptionFor(user.id)).active, false);
  assert.equal(await store.activateFromPayment('p1'), true);
  assert.equal(await store.activateFromPayment('p1'), false, 'الإشعار المكرر لا يضيف مدة');
  const first = Date.parse((await store.subscriptionFor(user.id)).expiresAt);
  await store.recordPayment({ requestId: 'r2', paymentId: 'p2', userId: user.id, amountIQD: 1000, planDays: 30 });
  await store.activateFromPayment('p2');
  const second = Date.parse((await store.subscriptionFor(user.id)).expiresAt);
  assert.ok(Math.abs(second - first - 30 * 86400000) < 5000, 'التجديد أضاف 30 يوماً فوق المتبقي');
});

test('الجلسة: رمز عشوائي يُحفظ مشفراً، والكعكة محمية', async () => {
  const store = createAccountStore({ sql: null });
  const user = await store.upsertGoogleUser({ sub: 's2', email: 'b@gmail.com' });
  const token = await store.createSession(user.id);
  assert.ok(token.length >= 40);
  assert.equal((await store.userForSessionToken(token)).id, user.id);
  assert.equal(await store.userForSessionToken('guess'), null);
  await store.deleteSession(token);
  assert.equal(await store.userForSessionToken(token), null);
  const header = sessionCookieHeader('abc', { secure: true });
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Secure/);
  assert.deepEqual(parseCookies('a=1; radar_session=xyz; b=%D8%B9'), { a: '1', radar_session: 'xyz', b: 'ع' });
});
