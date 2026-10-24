import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function generatedPolicy() {
  const routes = [];
  let precache = [];
  const empty = () => {};
  const workbox = new Proxy({
    clientsClaim: empty,
    cleanupOutdatedCaches: empty,
    precacheAndRoute(entries) { precache = entries; },
    registerRoute(matcher) { routes.push(matcher); },
  }, { get(object, name) { return object[name] || class { constructor(options) { this.options = options; } }; } });
  const self = { define: empty, skipWaiting: empty, addEventListener: empty };
  const source = readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
  // Execute only the owned generated worker against inert Workbox/network
  // stubs. No fetch, importScripts, filesystem or process API is exposed.
  vm.runInNewContext(source, { self, define(_dependencies, factory) { factory(workbox); }, URL }, { timeout: 1000 });
  return { routes, precache };
}

test('private API requests have no runtime-cache route', () => {
  const { routes } = generatedPolicy();
  for (const requestUrl of ['https://api.monitor.example/api/admin/settings/', 'https://api.monitor.example/api/me', 'https://monitor.example/api/rpc2']) {
    for (const matcher of routes) {
      const matches = typeof matcher?.test === 'function' ? matcher.test(requestUrl) : matcher({ url: new URL(requestUrl) });
      assert.equal(Boolean(matches), false, `private API cached: ${requestUrl}`);
    }
  }
});

test('immutable application assets remain precached', () => {
  const { precache } = generatedPolicy();
  assert.ok(precache.some(entry => /^assets\/entry-index-.*\.js$/.test(entry.url)));
  assert.equal(precache.some(entry => new URL(entry.url, 'https://monitor.example/').pathname.startsWith('/api/')), false);
});
