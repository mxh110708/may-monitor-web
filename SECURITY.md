# May Monitor web security profile

The 2026-10-24 review updates the dependency lockfile, removes the recursive
self-dependency and applies the fixed DOMPurify version to both direct and
nested dependencies. Use `npm ci --ignore-scripts`, the locked Node 22.23.4
toolchain, build/lint and the onboarding/DOM security tests.

Remote footer and configuration HTML are sanitized. Plugin frames no longer
combine script execution with same-origin privilege. Plugins and custom themes
also remain disabled by default at the server. Theme activation, logout and
2FA enrollment initiation use POST, matching the server's cookie mutation
boundary. First-run API mutations use the setup key from the private URL
fragment; the key is not put into request URLs or persistent browser storage.

Old release-following, translation auto-commit and publishing workflows are
inactive reference material under `.github/upstream-workflows/`. The only active
workflow is manually invoked, uses pinned official Actions and has read-only
repository permissions. There is no automatic upstream deployment approval.

Dependency audit success describes known advisories at scan time. Build and
synthetic DOM tests do not replace real SSO, browser/device accessibility,
remote terminal or production deployment acceptance. See the workspace report
for the exact reviewed source manifest and remaining boundaries.

## Review provenance and current release

`v0.1.0-rc.1` was the first package of the reviewed profile; the current documentation baseline is stable `0.1.0`, including the later fixes recorded in release notes. The initial review is historical evidence, not a renewed audit of every later commit. See the [shared security review](https://github.com/mxh110708/may-monitor-server/blob/v0.1.0-rc.1/docs/SECURITY-REVIEW-2026-10-24.zh-CN.md). Release manifests pin all three source commits. No automatic installation or production migration is authorized.

The Service Worker precaches immutable assets only. API responses always go to the server; authenticated data must not be restored from a runtime cache after logout or revocation. Run `npm run test:service-worker` after building.
