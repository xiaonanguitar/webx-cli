# dev-proxy

开发时将本地 webpack devServer 的请求按规则转发到指定线上/预发环境的工具。

## 快速开始

1. 安装依赖：

   npm install

2. 在项目根目录创建 `proxy.config.json`（可参考 `proxy.config.example.json`）

3. 启动 webpack devServer（例如端口 8080），然后运行：

   ```bash
   npx dev-proxy --port 8080 --config proxy.config.json
   ```

   或：

   ```bash
   npm run dev-proxy -- --port 8080
   ```

4. 在打开的浏览器中访问 `http://localhost:8080` 进行调试，符合映射规则的请求会被转发到配置里的目标地址并返回结果。

## 配置示例 (proxy.config.json)

```json
{
  "mappings": [
    {
      "prefix": "/api",
      "target": "https://api.prod.example.com",
      "pathRewrite": { "^/api": "/v1" },
      "headers": {
        "x-forwarded-environment": "prod"
      }
    }
  ]
}
```

- prefix: 本地 devServer 上请求的路径前缀，用于匹配需要代理的请求。
- target: 目标环境的基础 URL（不以 `/` 结尾更稳妥）。
- pathRewrite: 可选，使用正则规则替换路径。
- headers: 可选，向转发请求追加或覆盖头部。
- auth: 可选，自动在代理启动时为该 mapping 执行登录并把凭证应用到转发请求。支持两种类型：
  - `type: "basic"`：使用 HTTP Basic Auth，配置 `username` / `password`，会把 `Authorization: Basic ...` 附加到转发的请求头。
  - `type: "form"`：在目标环境执行表单登录，配置项（示例）：
    - `loginUrl`：登录页面路径，支持相对（以 `target` 为基础）或绝对 URL
    - `usernameField` / `passwordField`：用于定位表单输入框的选择器
    - `submitSelector`：提交按钮选择器（可选，不提供则按 Enter 提交）
    - `username` / `password`：登录凭据
    - `postLoginSelector`：可选，登录后用于确认登录成功的页面选择器（例如用户菜单）

示例：
```json
{
  "prefix": "/api",
  "target": "https://api.prod.example.com",
  "auth": {
    "type": "form",
    "loginUrl": "/login",
    "usernameField": "input[name=\"username\"]",
    "passwordField": "input[name=\"password\"]",
    "submitSelector": "button[type=submit]",
    "username": "your-username",
    "password": "your-password",
    "postLoginSelector": ".user-profile"
  }
}
```

登录后，工具会把登录时产生的 Cookie 合并进后续的转发请求（通过 `Cookie` 头）或把 Basic Auth 通过 `Authorization` 头附加。若登录失败会打印错误日志，但不会阻止代理的其余功能。

## 注意事项

- 目前仅转发普通的 REST 请求（XHR / Fetch），不保证对 WebSocket、SSE、文件下载等场景完整支持。
- 如需在无 headless 模式下手动操作页面，可传 `--headless` 开关。默认为有界面模式。

注意：在网络受限或不希望自动下载 Chromium 的环境，安装 `puppeteer` 可能会因下载失败而错误退出。为了避免自动下载，本项目默认使用 `puppeteer-core`，它不会自动下载浏览器；你需要在系统中安装 Chrome/Chromium，并通过设置环境变量 `PUPPETEER_EXECUTABLE_PATH` 指向可执行文件（或在启动时使用 `--executable-path` 参数），或在安装时使用 `PUPPETEER_SKIP_DOWNLOAD=1 npm install` 来跳过下载（Windows 中可用 `set PUPPETEER_SKIP_DOWNLOAD=1 && npm install`）。

如果你使用的是 Channel（例如 `chrome`, `chrome-beta`, `msedge` 等），可以通过 `--channel <name>` 或设置 `PUPPETEER_CHANNEL` 环境变量来指定。

---

欢迎在使用时反馈问题。