# May Monitor Web

The embedded default frontend and administration UI for May Monitor: setup, nodes, history, probes, alerts, site settings and reviewed theme appearance.

[简体中文](README.md) · [User guide](docs/USER-GUIDE.zh-CN.md) · [Development](docs/DEVELOPMENT.zh-CN.md) · [Security](SECURITY.md)

The baseline is Web **0.1.0** paired with Server **0.1.0**. The Server's `frontend.lock.json` pins this repository, commit and Node version. Use the frontend embedded in the Server release for production; a Vite instance is not a monitoring backend.

The UI distinguishes first-report waiting, offline, stale, invalid, unauthorized and unreachable states. Remote control, terminal/file access, arbitrary SQL and general extensions remain disabled by default in Server. A hidden button is not an authorization boundary. May Status is a separate public theme; administration, setup and recovery keep using this embedded UI.

## Use

Open the configured HTTPS Server, complete private first-run setup and register one real Agent per node. The administrator password, Agent Token, root password and scoped read credential have separate roles. See the [Server operations guide](https://github.com/mxh110708/may-monitor-server/blob/main/docs/OPERATIONS.en.md).

Alerts require explicit rules and a delivery channel. Email additionally needs a private SMTP file; frontend configuration readiness does not prove real inbox delivery. Site icons and managed May Status settings do not require arbitrary HTML or scripts.

Private API responses always go to Server and must not be restored from a service-worker cache after logout or revocation. An inaccessible API must not appear as healthy zero-valued metrics.

## Develop

Use Node **22.23.4** and the committed lockfile:

```bash
npm ci --ignore-scripts
npm run dev
```

Copy `.env.example` to local `.env.development` and set `VITE_API_TARGET` to an isolated test Server. Do not put credentials in frontend environment variables or target production by default.

```bash
npm run lint
npm run test:security
npm run test:onboarding
npm run test:monitoring
npm run build
npm run test:service-worker
```

The resulting `dist/` must be embedded through the Server's [fixed build procedure](https://github.com/mxh110708/may-monitor-server/blob/main/docs/BUILD.md). Preview only serves static build output. Tests and compilation do not replace browser, accessibility or real provider acceptance.

Derived from [Komari Web](https://github.com/komari-monitor/komari-web); retain upstream attribution and each dependency's license requirements. This checkout has no separate root license file. Historical upstream workflows remain inactive references; they do not authorize automatic upstream publishing or deployment.
