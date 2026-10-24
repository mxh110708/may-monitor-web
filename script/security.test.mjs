import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

test('remote HTML keeps formatting while removing active content', () => {
  const dom = new JSDOM(''); // Scripts and remote resources are never enabled.
  const purify = createDOMPurify(dom.window);
  const safe = purify.sanitize('<p><b>Monitor</b><img src=x onerror="synthetic()"><script>synthetic()</script><a href="javascript:synthetic()">link</a></p>', { USE_PROFILES: { html: true } });
  const doc = new JSDOM(safe).window.document;
  assert.equal(doc.querySelector('b')?.textContent, 'Monitor');
  assert.equal(doc.querySelector('script'), null);
  assert.equal(doc.querySelector('img')?.hasAttribute('onerror'), false);
  assert.equal(doc.querySelector('a')?.hasAttribute('href'), false);
  dom.window.close();
});

test('HTML profile excludes embedded documents and SVG event surfaces', () => {
  const dom = new JSDOM('');
  const purify = createDOMPurify(dom.window);
  const safe = purify.sanitize('<iframe srcdoc="synthetic"></iframe><svg onload="synthetic()"></svg><strong>OK</strong>', { USE_PROFILES: { html: true } });
  assert.equal(safe, '<strong>OK</strong>');
  dom.window.close();
});
