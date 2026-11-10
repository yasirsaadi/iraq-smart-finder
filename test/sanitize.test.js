import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, safeHttpUrl, safeIraqiMobile, htmlToPlainText, cleanPlainText, isReviewableSellerName } from '../shared/sanitize.js';

test('escapeHtml يعطّل الوسوم وكسر الخصائص', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src&#61;x onerror&#61;alert(1)&gt;');
  assert.equal(escapeHtml(`" onmouseover="alert(1)`), '&quot; onmouseover&#61;&quot;alert(1)');
  assert.equal(escapeHtml("x');alert(1);//"), 'x&#39;);alert(1);//');
  assert.equal(escapeHtml(null), '');
});

test('safeHttpUrl يرفض البروتوكولات الخطرة', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl(' JaVaScRiPt:alert(1)'), null);
  assert.equal(safeHttpUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeHttpUrl('https://user:pass@evil.com'), null);
  assert.equal(safeHttpUrl('https://www.facebook.com/groups/1/posts/2'), 'https://www.facebook.com/groups/1/posts/2');
  assert.equal(safeHttpUrl(undefined), null);
});

test('htmlToPlainText لا يعيد بناء وسوم بعد فك الترميز (الثغرة القديمة)', () => {
  const payload = 'عرض &lt;img src=x onerror=alert(1)&gt; رخيص';
  const out = htmlToPlainText(payload);
  assert.ok(!out.includes('<') && !out.includes('>'), out);
  assert.equal(htmlToPlainText('<b>آيفون</b> <script>alert(1)</script>15'), 'آيفون 15');
  assert.equal(htmlToPlainText('&#x3C;svg onload=alert(1)&#x3E;').includes('<'), false);
});

test('رقم الهاتف العراقي', () => {
  assert.equal(safeIraqiMobile('0770 123 4567'), '07701234567');
  assert.equal(safeIraqiMobile("07701234567');alert(1)//"), null);
  assert.equal(safeIraqiMobile('0612345678'), null);
});

test('cleanPlainText يزيل محارف التحكم واتجاه النص المخفية', () => {
  assert.equal(cleanPlainText('a‮b\u0000c   d', 10), 'abc d');
  assert.equal(cleanPlainText('x'.repeat(50), 5), 'xxxxx');
});

test('الأسماء العامة للمنصات والمواقع لا تُقيَّم كتاجر محدد', () => {
  for (const generic of ['منشور أو صفحة على فيسبوك', 'منشور أو حساب على انستغرام', 'معلن غير مسمى', 'iq.opensooq.com', 'elryan.com', 'www.facebook.com', '', ' ']) {
    assert.equal(isReviewableSellerName(generic), false, generic);
  }
  assert.equal(isReviewableSellerName('البسطية (albastiya.com)'), false, 'اسم مصدر مع نطاقه');
  assert.equal(isReviewableSellerName('Cars.iq (cars.iq)'), false);
  assert.equal(isReviewableSellerName('معرض النهضة للسيارات'), true);
  assert.equal(isReviewableSellerName('Al Rayan Store'), true);
});
