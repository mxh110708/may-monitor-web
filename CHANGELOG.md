# Changelog

## 0.1.0-rc.1 — 2026-10-24

Update the locked dependencies and DOMPurify, sanitize remote HTML, isolate plugin frames, synchronize POST mutations and first-run setup headers. Restore the missing onboarding regression entry and permit deterministic build timestamps.

Initial prerelease based on Komari. Security defaults remain enabled. Existing Komari, Deploy and Route installations are not modified by publishing this release. See SECURITY.md and the shared review for test coverage and limits.

Private API responses are never runtime-cached by the Service Worker; immutable assets remain precached. The generated worker has an isolated policy regression test.
