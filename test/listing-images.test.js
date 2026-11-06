import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePageUrl, extractOgImage, fetchOgImage, attachListingImages } from '../lib/listing-images.js';

test('توحيد رابط الصفحة لمطابقة الصورة بالإعلان', () => {
  assert.equal(normalizePageUrl('https://www.instagram.com/reel/DcyCNZ7onXo/?hl=ar'), 'instagram.com/reel/dcycnz7onxo');
  assert.equal(normalizePageUrl('https://m.facebook.com/groups/1/posts/2/'), normalizePageUrl('https://www.facebook.com/groups/1/posts/2'));
  assert.equal(normalizePageUrl('javascript:alert(1)'), null);
});

test('استخراج og:image وقبول الروابط الآمنة فقط', () => {
  const base = 'https://www.elryan.com/ar/item.html';
  assert.equal(extractOgImage('<meta property="og:image" content="https://cdn.x.iq/a.jpg">', base), 'https://cdn.x.iq/a.jpg');
  assert.equal(extractOgImage('<meta content="/img/b.png" property="og:image" >', base), 'https://www.elryan.com/img/b.png', 'ترتيب الخصائص المعكوس');
  assert.equal(extractOgImage('<meta name="og:image" property="og:image" content="/img/b.png">', base), 'https://www.elryan.com/img/b.png');
  assert.equal(extractOgImage('<meta property="og:image" content="javascript:alert(1)">', base), null);
  assert.equal(extractOgImage('<html></html>', base), null);
});

test('لا جلب لعناوين داخلية أو محلية', async () => {
  assert.equal(await fetchOgImage('http://127.0.0.1/admin'), null);
  assert.equal(await fetchOgImage('http://localhost:3000/'), null);
  assert.equal(await fetchOgImage('http://169.254.169.254/latest/meta-data'), null);
});

test('العروض بلا صورة معروفة تبقى بلا صورة، ولا تُجلب صفحات فيسبوك', async () => {
  const offers = [
    { id: 'a', directUrl: 'https://www.facebook.com/p/1', sourceHost: 'facebook.com', imageUrl: null },
    { id: 'b', directUrl: 'https://iq.opensooq.com/ar/cars', sourceHost: 'iq.opensooq.com', isListingPage: true, imageUrl: null }
  ];
  const out = await attachListingImages(offers, { imageQuery: null });
  assert.deepEqual(out.map((o) => o.imageUrl), [null, null]);
});

test('روابط صور فيسبوك وانستغرام المخصصة للزواحف مرفوضة', async () => {
  const { isLoadableImage } = await import('../lib/listing-images.js');
  assert.equal(await isLoadableImage('https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=1'), false);
  assert.equal(await isLoadableImage('https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=1'), false);
  assert.equal(await isLoadableImage('javascript:alert(1)'), false);
});
