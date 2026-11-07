// ============================================================================
// بوابة دفع كي كارد (QiCard Payment Gateway، الإصدار 2)
// التوثيق: https://developers-gate.qi.iq/
// - إنشاء عملية دفع تعيد رابط صفحة الدفع المستضافة (formUrl): بيانات البطاقة لا تمر بخادمنا أبداً.
// - التفعيل لا يعتمد على المتصفح ولا على محتوى الإشعار: الخادم يسأل البوابة مباشرة عن حالة الدفع.
// ============================================================================

import { randomUUID, createVerify } from 'node:crypto';

export const QICARD_SANDBOX_BASE = 'https://uat-sandbox-3ds-api.qi.iq/api/v1';

export function readQiCardConfig() {
  const cfg = {
    baseUrl: (process.env.QICARD_API_BASE || QICARD_SANDBOX_BASE).replace(/\/+$/, ''),
    username: process.env.QICARD_USERNAME || '',
    password: process.env.QICARD_PASSWORD || '',
    terminalId: process.env.QICARD_TERMINAL_ID || '',
    webhookPublicKey: (process.env.QICARD_WEBHOOK_PUBLIC_KEY || '').replace(/\\n/g, '\n').trim()
  };
  cfg.configured = Boolean(cfg.username && cfg.password && cfg.terminalId);
  cfg.isSandbox = cfg.baseUrl.includes('uat-sandbox');
  return cfg;
}

function authHeaders(cfg) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Basic ${Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')}`,
    'X-Terminal-Id': cfg.terminalId
  };
}

async function callQi(cfg, method, path, body) {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: authHeaders(cfg),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const code = data.error?.code ?? res.status;
    const err = new Error(`qicard ${method} ${path} failed: ${code} ${data.error?.description || ''}`.trim());
    err.qiCode = code;
    throw err;
  }
  return data;
}

/**
 * ينشئ عملية دفع. يعيد { requestId, paymentId, status, formUrl, amount, currency }.
 * @param {{ amountIQD: number, finishPaymentUrl: string, notificationUrl: string, customerInfo?: object, additionalInfo?: object }} p
 */
export async function createQiPayment(cfg, p) {
  const requestId = randomUUID();
  const body = {
    requestId,
    amount: Number(Number(p.amountIQD).toFixed(2)),
    currency: 'IQD',
    locale: 'ar_IQ',
    finishPaymentUrl: p.finishPaymentUrl,
    notificationUrl: p.notificationUrl,
    appChannel: false,
    ...(p.customerInfo ? { customerInfo: p.customerInfo } : {}),
    ...(p.additionalInfo ? { additionalInfo: p.additionalInfo } : {})
  };
  const data = await callQi(cfg, 'POST', '/payment', body);
  if (!data.paymentId || !data.formUrl) throw new Error('qicard create payment: missing paymentId/formUrl');
  return { requestId, ...data };
}

export async function getQiPaymentStatus(cfg, paymentId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(paymentId || ''))) throw new Error('invalid paymentId');
  return callQi(cfg, 'GET', `/payment/${paymentId}/status`);
}

/**
 * هل الدفع مكتمل فعلاً وبالمبلغ والعملة المتوقعين؟ (يُستدعى على نتيجة getQiPaymentStatus)
 */
export function isPaymentSettled(status, { expectedAmountIQD, expectedRequestId }) {
  if (!status || status.status !== 'SUCCESS' || status.canceled === true) return false;
  if (String(status.currency || '').toUpperCase() !== 'IQD') return false;
  if (Math.round(Number(status.amount) * 1000) !== Math.round(Number(expectedAmountIQD) * 1000)) return false;
  if (expectedRequestId && status.requestId && status.requestId !== expectedRequestId) return false;
  return true;
}

/**
 * التحقق الاختياري من توقيع الإشعار (يتطلب المفتاح العام للبوابة الذي تطلبه من دعم كي كارد).
 * سلسلة التوقيع حسب التوثيق: paymentId|amount.000|currency|creationDate|status
 */
export function verifyQiWebhookSignature(payload, signatureB64, publicKeyPem) {
  if (!publicKeyPem || !signatureB64 || !payload) return false;
  const amount = payload.amount !== undefined && payload.amount !== null ? `${payload.amount}.000` : '-';
  const data = [payload.paymentId || '-', amount, payload.currency || '-', payload.creationDate || '-', payload.status || '-'].join('|');
  try {
    const verifier = createVerify('sha256');
    verifier.update(data);
    verifier.end();
    return verifier.verify(publicKeyPem, Buffer.from(String(signatureB64).replace(/\s+/g, ''), 'base64'));
  } catch {
    return false;
  }
}
