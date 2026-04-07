# 生产部署与环境说明

面向本仓库 **Node + Express + Socket.IO** 后端与 **webpack 构建** 的前端静态资源。与 `phase_2.md` 非功能需求（HTTPS、密钥、数据）对齐。

## 1. 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | HTTP 端口，默认 `3030` |
| `JWT_ACCESS_SECRET` | **生产必填** | 签发 Access Token；勿与 Refresh 相同 |
| `JWT_REFRESH_SECRET` | **生产必填** | 签发 Refresh Token |
| `CORS_ORIGIN` | 否 | 允许的前端源，多个用英文逗号分隔；不设则保持当前「反射 Origin」的宽松行为 |

生成密钥示例（任选其一，长度建议 ≥ 32 字节）：

```bash
openssl rand -base64 48
```

本地可参考根目录 **`.env.example`**，复制为 `.env` 并填入（`.env` 已加入 `.gitignore`）。

**注意**：当前 `server/index.js` **不会自动读取 `.env` 文件**。请使用下列方式之一注入环境变量：

- **systemd**：`Environment=JWT_ACCESS_SECRET=...` 或 `EnvironmentFile=/etc/chess.env`
- **Docker**：`docker run -e JWT_ACCESS_SECRET=...`
- **PM2**：`ecosystem.config.cjs` 里 `env` / `env_production`
- **Windows**：部署前在会话中 `set JWT_ACCESS_SECRET=...` 或使用系统环境变量

若希望进程自动加载 `.env`，可自行增加依赖 `dotenv` 并在 `server/index.js` 首部调用 `require('dotenv').config()`（本仓库为减少依赖未内置）。

## 2. HTTPS 与反向代理

浏览器环境建议使用 **HTTPS**，并由 **Nginx / Caddy** 等终止 TLS，反代到本机 `127.0.0.1:PORT`。

**Socket.IO** 需支持 **WebSocket** 与 **polling** 升级，Nginx 示例要点：

```nginx
location /socket.io/ {
  proxy_pass http://127.0.0.1:3030;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

API 与静态页同域时，前端 `fetch('/api/...')` 与 `io({ path: '/socket.io' })` 可共用同一主机名，减少 CORS 问题。若前后端不同域，请设置 `CORS_ORIGIN` 为前端完整源（含协议与端口）。

## 3. 前端构建与静态资源

```bash
npm ci
npm run build
```

产物在 `dist/`。由 Nginx `root` 指向 `dist`，并将 **`/api` 与 `/socket.io`** 反代到 Node（与开发时 webpack `proxy` 行为一致）。若静态站点与 API 不同源，需配置 `CORS_ORIGIN` 并确保 JWT、Cookie（若未来使用）的域策略正确。

## 4. `data` 目录与备份

| 路径 | 内容 |
|------|------|
| `data/db.json` | 用户、好友、刷新令牌等（已在 `.gitignore`） |
| `data/replays/*.json` | 对局回放（默认忽略，勿将用户数据提交仓库） |

**备份建议**：

- 定时任务（如每日）将 `data/` 复制到异地或对象存储；恢复时停服后覆盖再启动。
- 生产环境对 `db.json` 做快照前尽量**停止写入**或接受极短窗口一致性问题。
- 令牌与密码字段：备份介质访问权限与线上服务器同级管控。

## 5. 进程与日志

```bash
NODE_ENV=production node server/index.js
```

或使用 **PM2**、**systemd** 托管崩溃自启。将应用日志与访问日志轮转，避免磁盘占满。

## 6. 上线前检查清单

- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` 已替换且足够随机  
- [ ] 生产环境不再使用代码内默认密钥字符串  
- [ ] HTTPS 已启用，反代 WebSocket 正常（双端联机 smoke test）  
- [ ] （可选）`CORS_ORIGIN` 收紧为实际前端域名  
- [ ] `data/` 备份策略已落实  
- [ ] 防火墙仅暴露 443（及 80 跳转），Node 端口仅本机回环  

更细的产品与阶段划分见 **`PHASE2_STATUS.md`**、**`phase_2.md`**。
