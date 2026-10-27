# May Monitor Web

May Monitor 的默认前端与管理界面：初始化、节点与历史、探测、告警、站点及受审主题外观。它随 Server 固定构建嵌入，不是另一个独立监控后端，也不是 May Status 公开主题。

[English](README.en.md) · [使用教程](docs/USER-GUIDE.zh-CN.md) · [开发与嵌入](docs/DEVELOPMENT.zh-CN.md) · [安全边界](SECURITY.md)

## 配套关系

文档基线为 **Web 0.1.0 + Server 0.1.0**。Server 的 `frontend.lock.json` 固定 Web 仓库、提交和 Node 版本；生产使用 Server 发行附件内的已嵌入资源。独立下载 Web 源码或运行 Vite 不会自动安装 Server、创建管理员或配置 Agent。

| 页面职责 | 说明 |
| --- | --- |
| 初始化与登录 | 使用私人一次性 setup 令牌建立管理员，后续使用独立登录凭据。 |
| 节点、当前指标与历史 | 区分等待、离线、过期、无效值、鉴权失败和不可达。 |
| 探测与监测告警 | 管理明确任务、规则、确认、恢复、静默和通知状态。 |
| 站点与外观 | 站点标题、图标、公开范围、固定主题的 managed 配置。 |

默认关闭的终端、命令、文件、SQL 和通用扩展能力不因前端保留相应代码就视为受支持。前端隐藏按钮也不是鉴权；能力边界由 Server 决定。May Status 只负责公开页面，后台及恢复入口继续使用这里的内置界面。

## 使用

打开已经配置好的 May Monitor HTTPS 站点。首次部署按照[Server 安装教程](https://github.com/mxh110708/may-monitor-server/blob/main/docs/OPERATIONS.zh-CN.md)完成初始化，再逐个添加真实 Agent。首次设定的管理员密码不等于 VPS root 或 Agent Token。

站点默认图标为原始梅花照片裁剪资源；可在站点设置上传或恢复默认。图标的来源与构建规则见[图标说明](docs/DEFAULT-SITE-ICON.md)。不需要为图标、监测或固定 May Status 开启任意 HTML／脚本扩展。

浏览器 API 响应不应被 Service Worker 当成离线旧数据恢复。页面暂不可读取时应显示对应状态；自动清空全部用户浏览器数据不是更新步骤。

## 本地开发

使用固定 Node **22.23.4** 与 `package-lock.json`：

```bash
npm ci --ignore-scripts
npm run dev
```

按[开发教程](docs/DEVELOPMENT.zh-CN.md)把 `.env.example` 复制为本地 `.env.development`，配置自己隔离测试 Server 的 `VITE_API_TARGET`。不放 Token 或管理员密码；不要默认将开发代理指向生产。

```bash
npm run lint
npm run test:security
npm run test:onboarding
npm run test:monitoring
npm run build
npm run test:service-worker
```

构建得到 `dist/`，还需由 Server 的固定打包流程嵌入并记录来源。Vite preview 只展示构建资源，不提供持久化、鉴权或 Agent 服务。现有 lint 警告与错误分开记录，命令通过不代替真实浏览器验收。

源自 [Komari Web](https://github.com/komari-monitor/komari-web)，保留上游版权与各依赖的许可要求；当前仓库没有单独的根许可证文件，不以不存在的文件声明授权。简体中文为文档主语言，英文入口提供配套说明；技术字段、协议与上游版权不作品牌替换。反馈只提交版本、复现步骤和脱敏资料。
