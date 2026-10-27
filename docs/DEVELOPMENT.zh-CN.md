# Web 开发与 Server 嵌入

使用 Node 22.23.4 和本仓库 `package-lock.json`。这是 React／Radix 的默认前端，May Status 是另一套 Vue 公开主题；两者的 dist、锁文件和维护流程不能互换。

## 本地开发

1. 检出所选 May Web 提交；复现发行时使用 Server 的 `frontend.lock.json` 指定提交。
2. 执行 `npm ci --ignore-scripts`，不以浮动依赖替代锁文件。
3. 复制 `.env.example` 为不提交的 `.env.development`，把 `VITE_API_TARGET` 改为自己隔离测试 Server 的来源。示例文件只是开发配置，不是生产地址。
4. 执行 `npm run dev`；确认测试身份、浏览器源与后端接口版本。Vite 代理不绕过后端鉴权。

```dotenv
VITE_API_TARGET=http://127.0.0.1:5000
```

本地回环 HTTP 仅作开发示例，端口应与实际测试后端一致。`VITE_` 变量会进入前端构建或开发流程，不能放 Token、SMTP 或管理员秘密。非根路径基址由 `VITE_BASE_URL` 指定，需同时验证静态资源和管理路由；不能只改一个页面链接。

## 验证与构建

```bash
npm run lint
npm run test:security
npm run test:onboarding
npm run test:monitoring
npm run build
npm run test:service-worker
```

`test:service-worker` 需检查刚生成的构建。API 不能从 Worker 运行缓存恢复，退出登录或撤销后不能返回旧私有响应。现有 lint 警告与新增错误分开评估；测试不证明真实 SSO、浏览器无障碍或所有扩展可用。

## 配套打包

记录 Web 提交、Node、锁文件及 `SOURCE_DATE_EPOCH`，构建 `dist/`，再由 Server 的 `tools/packfrontend` 打成内嵌归档，同时复制本提交的 `komari-theme.json`。完整步骤见[Server Build](https://github.com/mxh110708/may-monitor-server/blob/main/docs/BUILD.md)。

固定 Server 前端锁是源码配套合同；纯文档更新不需要修改锁或替换生产二进制。`npm run preview` 只是静态预览，不会启动数据库、Agent 通道或真实鉴权服务。

## 修改边界

文案和界面应区分离线、过期、未知、鉴权失败和服务不可达。前端不能自行放宽 Server 能力、缓存身份或把配置就绪显示为外发成功。只审查默认监控范围，不以保留源代码推断远程终端／文件功能获得验收。

脚本和工作流说明见[安全说明](../SECURITY.md)。上游翻译自动提交和发行跟随已停用；按需适配上游需要审查与明确验证，不自动发布。
