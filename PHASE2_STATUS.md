# 第二阶段开发进度（实时维护）

对应规格：`phase_2.md`。本文档随功能合并持续更新。

## 已完成


| 模块        | 说明                                                                                                                                            | 测试                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 服务端象棋引擎   | `server/lib/xiangqiEngine.js`：走法几何、将帅对面、**允许送将**、将死终局；吃子后 `applyMoveInPlace` 修正下标避免联机「双棋子」                                                    | `npm test`                                    |
| 开局同步 ID   | `src/chess/initialBoard.js` + 棋子 `logicalId`（p0–p31）                                                                                          | 与引擎布局一致（需与 `server/lib/initialBoard.js` 同步维护） |
| 用户与 JWT   | 注册/登录、Access + Refresh、`/api/me`、`PATCH /api/me`（昵称 + **皮肤/游戏风格** `skin` `animStyle`）；`data/db.json` 存 `preferredSkin` / `preferredAnimStyle` | 登录后换肤→刷新仍保留；未登录仅本地                            |
| 好友 API    | `GET /api/friends`、`/api/friends/pending`、`POST request` / `accept`                                                                           | 手动                                            |
| 回放 API    | 终局写 `data/replays/<gameId>.json`；`GET /api/replays`、`GET /api/replays/:id`                                                                    | 打完一局联机后查列表                                    |
| 复盘 UI     | `src/replay/replayState.js`（着法还原 + 单测）；`GameScene` `beginReplay` / 步进；`GameUI`「我的回放」列表、滑块与按钮；认输局仅 `final` 时两步（开局→终局）                          | 登录 → 我的回放 → 点选 → 步进 / 终局                      |
| Socket.IO | 鉴权握手、`match:join` 快速匹配、`room:create` / `room:join`、 `game:move` / `game:state`、`game:sync`                                                    | 双开浏览器联机走子                                     |
| 前端联机      | `src/net/onlineClient.js`、`GameUI` 联机区、`GameScene.beginOnlineMatch` / `applyServerGameState`                                                  | 同上                                            |
| 观战        | `watch:join`、`GET /api/game/watchable`；大厅「观战」输入房间码或 `gameId`；`GameScene` 禁止观战端选子/走子                                                           | 好友房三开：两人对弈 + 第三人观战                            |
| 断线重连      | `io` 重连参数；`connect` → `gameSync` / 观战重 `watch:join`；`game:peer_reconnected`；`disconnect` 提示                                                   | 断网/停服恢复后对弈与观战                                 |
| 联机动画      | `game:state.lastMove` → `GameScene` 复用 `animateMove` / `animateCapture`，再 `syncFromServer` 对齐；无 `lastMove` 或解析失败则直同步                          | 双开走子 / 吃子 / 将死最后一手                            |
| 客户端单测     | `src/net/watchInput.js` + `watchInput.test.js`；`jest` 对 `src/**/*.test.js` 启用 `babel-jest`（与引擎单测同跑）                                           | `npm test`                                    |
| 开发代理      | `webpack` `proxy`：`/api`、`/socket.io` → `localhost:3030`                                                                                      | `npm run dev:full`                            |
| 生产部署说明    | `**DEPLOY.md`**：JWT / `CORS_ORIGIN`、HTTPS 反代与 WebSocket、`**data/**` 备份清单；`**.env.example**`；`.gitignore` 忽略 `.env`                            | 按文档核对上线前项                                     |


## 最近修复（2026-04）

- 联机吃子后原位置仍残留棋子：`tryApplyMove` 在 `splice` 吃掉的子后未重新 `findIndex` 走子方，已改为 `applyMoveInPlace`。
- 送将提示：已取消「不能送将」校验（认输/故意送吃）；将死判定仍只统计能解除己方老将受攻的走法（`hasLegalMove` 不变）。
- **刷新恢复对局**：Socket 连接时若 `userGame` 仍有未终局对局，自动 `wireSocketToGame` 下发 `game:state`（`resumed: true`）；`GET /api/game/active` 供首页提示「正在恢复」。
- **认输 / 退出房间**：HUD 按钮与 `game:forfeit`；对手立即获胜，`finalizeEndedGame` 统一结算与回放；「回到首页」在未终局联机时会先判负再断开（短延迟保证报文发出）。
- **观战**：非席玩家可 `watch:join`；**对弈方**在局内 HUD「邀请观战」复制对局 ID 或房间码（无需回首页）。
- **断线重连**：自动重连、`game:peer_reconnected`、棋手/观战恢复同步。
- **联机动画**：服务端广播的 `lastMove` 驱动与本地相同的走子 / 吃子动画。
- **客户端单测**：观战输入解析抽成 `parseWatchInput`，供 `OnlineGameClient.watchJoin` 复用。
- **主题持久化**：`GET /api/me` 返回 `skin`/`animStyle`；首页改下拉后防抖 `PATCH`；与 `phase_2` 6.4 局外切换一致。
- **复盘 UI**：联机终局写入的 JSON 在首页「我的回放」打开，按 `moves[]` 几何还原（忽略 `forfeit` 元数据），有 `final` 时多一步终局快照。

## 自测建议

1. 双开联机开局 → 一方刷新 → 应回到棋盘 HUD 且局面一致。
2. 一方点「认输」或「退出房间」→ 另一方收到终局状态并提示胜。
3. 未终局点「回到首页」→ 对手判胜；己方回菜单。
4. 好友房：第三人登录后输入同一房间码点「观战」→ 棋盘同步且无法走子；对局未开始时提示稍后再试。
5. 对局中拔网线或停后端再恢复：应出现「正在自动重连」，恢复后可继续走子；对手侧先提示断线、重连后提示「对手已重新连接」。
6. 联机走子 / 吃子：双方应看到与当前皮肤一致的移动与吃子动画（非瞬移）。
7. 登录后改「皮肤风格」「游戏风格」→ 刷新页面 → 下拉与 3D 应与保存一致。
8. 登录 →「我的回放」→ 选一局 → 滑块 / 上一步 / 下一步 / 终局 / 退出复盘。

## 进行中 / 待加强（可选）

- 限流、审计日志、对象存储托管回放文件、多实例 Socket.IO 适配（Redis 等）

## 本地验证命令

```bash
# 安装依赖（若 package.json 有更新）
npm install

# 仅跑象棋引擎单测
npm test

# 仅后端
npm run server:dev

# 前端（需后端已起时联机）
npm run dev

# 前后端同时（需已安装 concurrently）
npm run dev:full
```

## 备注

- 首次注册会在仓库下创建 `data/db.json`（已 gitignore）。
- 若 `io.sockets.sockets.get` 与当前 socket.io 版本不符导致房间加入失败，查看控制台并改为主命名空间取 Socket 的写法。

