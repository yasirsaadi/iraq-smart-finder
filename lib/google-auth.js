// ============================================================================
// تسجيل الدخول بحساب غوغل: التحقق من رمز الهوية (ID Token) في الخادم
// - يُتحقق من التوقيع RS256 بمفاتيح غوغل العامة (JWKS) دون أي مكتبة خارجية.
// - يُتحقق من الجمهور (معرّف تطبيقك)، والمُصدِر، وتاريخ الانتهاء، وتأكيد البريد.
// ============================================================================

import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let jwksCache = { keys: null, expiresAt: 0 };

/** يجلب مفاتيح غوغل العامة ويحفظها حسب مدة الحفظ التي تعلنها غوغل. */
export async function fetchGoogleKeys() {
  if (jwksCache.keys && Date.now() < jwksCache.expiresAt) return jwksCache.keys;
  const res = await fetch(GOOGLE_JWKS_URL, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`google jwks HTTP ${res.status}`);
  const body = await res.json();
  const maxAge = Number((res.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 3600);
  jwksCache = { keys: body.keys || [], expiresAt: Date.now() + Math.min(maxAge, 86400) * 1000 };
  return jwksCache.keys;
}

function base64UrlToBuffer(part) {
  return Buffer.from(String(part).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/**
 * يتحقق من رمز هوية غوغل ويعيد بيانات المستخدم، أو يرمي خطأ.
 * @param {string} idToken
 * @param {{ clientId: string, getKeys?: () => Promise<object[]>, now?: () => number }} options
 */
export async function verifyGoogleIdToken(idToken, { clientId, getKeys = fetchGoogleKeys, now = () => Date.now() } = {}) {
  if (!clientId) throw new Error('google_client_id_missing');
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3 || idToken.length > 4096) throw new Error('malformed_token');

  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlToBuffer(parts[0]).toString('utf8'));
    payload = JSON.parse(base64UrlToBuffer(parts[1]).toString('utf8'));
  } catch {
    throw new Error('malformed_token');
  }
  if (header.alg !== 'RS256' || !header.kid) throw new Error('unsupported_algorithm');

  const keys = await getKeys();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown_key');
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const valid = cryptoVerify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, base64UrlToBuffer(parts[2]));
  if (!valid) throw new Error('bad_signature');

  const nowSec = Math.floor(now() / 1000);
  if (!GOOGLE_ISSUERS.has(payload.iss)) throw new Error('bad_issuer');
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(clientId)) throw new Error('bad_audience');
  if (!(Number(payload.exp) > nowSec - 30)) throw new Error('token_expired');
  if (payload.iat && Number(payload.iat) > nowSec + 300) throw new Error('token_from_future');
  if (!payload.sub) throw new Error('missing_subject');
  if (payload.email && payload.email_verified !== true && payload.email_verified !== 'true') throw new Error('email_not_verified');

  return {
    sub: String(payload.sub),
    email: payload.email ? String(payload.email).slice(0, 200) : null,
    name: payload.name ? String(payload.name).slice(0, 120) : null,
    givenName: payload.given_name ? String(payload.given_name).slice(0, 60) : null,
    picture: payload.picture ? String(payload.picture).slice(0, 500) : null
  };
}

/** لاختبارات الوحدة فقط */
export function _resetGoogleKeyCache() {
  jwksCache = { keys: null, expiresAt: 0 };
}
