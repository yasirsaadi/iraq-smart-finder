import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyGoogleIdToken } from '../lib/google-auth.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-kid', alg: 'RS256', use: 'sig' };
const getKeys = async () => [jwk];
const CLIENT = 'test-client.apps.googleusercontent.com';
const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

function makeToken(payloadOver = {}, headerOver = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid: 'test-kid', typ: 'JWT', ...headerOver };
  const payload = { iss: 'https://accounts.google.com', aud: CLIENT, sub: '1234567890', email: 'u@gmail.com', email_verified: true, name: 'ياسر صبيح', iat: now, exp: now + 3600, ...payloadOver };
  const data = `${b64u(header)}.${b64u(payload)}`;
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')}`;
}

test('رمز غوغل صحيح يُقبل ويعيد بيانات المستخدم', async () => {
  const user = await verifyGoogleIdToken(makeToken(), { clientId: CLIENT, getKeys });
  assert.equal(user.sub, '1234567890');
  assert.equal(user.email, 'u@gmail.com');
  assert.equal(user.name, 'ياسر صبيح');
});

test('الرموز المزورة أو غير الصالحة تُرفض', async () => {
  const v = (t) => verifyGoogleIdToken(t, { clientId: CLIENT, getKeys });
  await assert.rejects(v(makeToken({ aud: 'another-app' })), /bad_audience/);
  await assert.rejects(v(makeToken({ iss: 'https://evil.com' })), /bad_issuer/);
  await assert.rejects(v(makeToken({ exp: Math.floor(Date.now() / 1000) - 3600 })), /token_expired/);
  await assert.rejects(v(makeToken({ email_verified: false })), /email_not_verified/);
  await assert.rejects(v(makeToken({}, { alg: 'none' })), /unsupported_algorithm/);
  await assert.rejects(v(makeToken({}, { kid: 'unknown' })), /unknown_key/);
  const [h, , sig] = makeToken().split('.');
  const forged = `${h}.${b64u({ iss: 'https://accounts.google.com', aud: CLIENT, sub: 'attacker', exp: 9999999999 })}.${sig}`;
  await assert.rejects(v(forged), /bad_signature/);
  await assert.rejects(v('not.a.jwt.at.all'), /malformed_token/);
  await assert.rejects(verifyGoogleIdToken(makeToken(), { clientId: '', getKeys }), /google_client_id_missing/);
});
