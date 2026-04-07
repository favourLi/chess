'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const store = require('./store');
const { buildPiecesWithIds } = require('./lib/initialBoard');
const xiangqi = require('./lib/xiangqiEngine');

const PORT = Number(process.env.PORT) || 3030;
const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SPECTATORS_PER_GAME = 50;

const app = express();
const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((s) => s.trim()).filter(Boolean)
      : true,
    credentials: true
  })
);
app.use(express.json());

/** @type {Map<string, object>} */
const games = new Map();
/** @type {Map<string, string>} userId -> gameId */
const userGame = new Map();
/** @type {{userId:string,socketId:string}[]} */
const matchQueue = [];
/** @type {Map<string, object>} code -> waiting room */
const lobbies = new Map();

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

function signRefresh(userId) {
  return jwt.sign({ sub: userId, typ: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  const token = h && h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const p = jwt.verify(token, JWT_ACCESS_SECRET);
    req.userId = p.sub;
    next();
  } catch {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body || {};
    const u = await store.registerUser(username, password, nickname);
    const full = store.findUserById(u.id);
    const access = signAccess(full);
    const refresh = signRefresh(full.id);
    store.storeRefreshToken(refresh, full.id, REFRESH_TTL_MS);
    res.json({ accessToken: access, refreshToken: refresh, user: u });
  } catch (e) {
    res.status(400).json({ error: e.message || '注册失败' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const row = await store.verifyLogin(username, password);
    const u = store.userPublic(row);
    const access = signAccess(row);
    const refresh = signRefresh(row.id);
    store.storeRefreshToken(refresh, row.id, REFRESH_TTL_MS);
    res.json({ accessToken: access, refreshToken: refresh, user: u });
  } catch (e) {
    res.status(400).json({ error: e.message || '登录失败' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: '缺少 refreshToken' });
  try {
    const p = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (p.typ !== 'refresh') throw new Error('bad');
    const uid = store.takeRefreshToken(refreshToken);
    if (!uid || uid !== p.sub) return res.status(401).json({ error: '刷新失败' });
    const row = store.findUserById(uid);
    if (!row) return res.status(401).json({ error: '用户不存在' });
    const access = signAccess(row);
    const nextRefresh = signRefresh(row.id);
    store.storeRefreshToken(nextRefresh, row.id, REFRESH_TTL_MS);
    res.json({ accessToken: access, refreshToken: nextRefresh });
  } catch {
    res.status(401).json({ error: '刷新令牌无效' });
  }
});

app.get('/api/me', authMiddleware, (req, res) => {
  const u = store.findUserById(req.userId);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  res.json(store.userPublic(u));
});

app.patch('/api/me', authMiddleware, (req, res) => {
  try {
    const u = store.updateProfile(req.userId, req.body || {});
    res.json(u);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/friends', authMiddleware, (req, res) => {
  res.json({ friends: store.listFriends(req.userId) });
});

app.get('/api/friends/pending', authMiddleware, (req, res) => {
  res.json({ incoming: store.listPendingIncoming(req.userId) });
});

app.post('/api/friends/request', authMiddleware, (req, res) => {
  try {
    const r = store.requestFriend(req.userId, req.body?.username);
    res.json(r);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/friends/accept', authMiddleware, (req, res) => {
  try {
    store.acceptFriend(req.userId, req.body?.fromId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/replays', authMiddleware, (req, res) => {
  const dir = path.join(__dirname, '..', 'data', 'replays');
  if (!fs.existsSync(dir)) return res.json({ replays: [] });
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const list = [];
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (j.players?.some((p) => p.id === req.userId)) list.push(j.meta || j);
    } catch {
      /* skip */
    }
  }
  list.sort((a, b) => (b.endedAt || '').localeCompare(a.endedAt || ''));
  res.json({ replays: list.slice(0, 50) });
});

app.get('/api/replays/:id', authMiddleware, (req, res) => {
  const fp = path.join(__dirname, '..', 'data', 'replays', `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: '不存在' });
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!j.players?.some((p) => p.id === req.userId)) {
    return res.status(403).json({ error: '无权查看' });
  }
  res.json(j);
});

/** 刷新页面后用于判断是否仍在进行中的对局（再靠 Socket 拉全量状态） */
app.get('/api/game/active', authMiddleware, (req, res) => {
  const gid = userGame.get(req.userId);
  const g = gid ? games.get(gid) : null;
  const active = !!(g && !g.engine.gameOver);
  res.json({ inGame: active, gameId: active ? gid : null });
});

/** 观战前查询：房间码对应对局是否进行中（仍在等待大厅则 status=waiting） */
app.get('/api/game/watchable', authMiddleware, (req, res) => {
  const code = String(req.query.code || '')
    .trim()
    .toUpperCase();
  if (!code || code.length !== 6) {
    return res.status(400).json({ error: '房间码须为 6 位' });
  }
  for (const g of games.values()) {
    if (g.code === code && !g.engine.gameOver) {
      return res.json({ status: 'playing', gameId: g.id });
    }
  }
  if (lobbies.has(code)) return res.json({ status: 'waiting', gameId: null });
  res.json({ status: 'none', gameId: null });
});

const distDir = path.join(__dirname, '..', 'dist');
const distIndex = path.join(distDir, 'index.html');
const shouldServeDist =
  fs.existsSync(distIndex) &&
  (process.env.NODE_ENV === 'production' || process.env.SERVE_DIST === '1');
if (shouldServeDist) {
  app.use(express.static(distDir));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  if (lobbies.has(s) || [...games.values()].some((g) => g.code === s)) return randomRoomCode();
  return s;
}

function publicGameState(g) {
  return xiangqi.serializeGame(g.engine);
}

/** 供客户端展示「邀请观战」：快速匹配无房间码，好友房有 6 位码 */
function gameShareFields(gid, g) {
  return {
    gameId: gid,
    shareRoomCode: g.code || null
  };
}

function saveReplay(g, metaExtra = {}) {
  const meta = {
    id: g.id,
    startedAt: g.startedAt,
    endedAt: new Date().toISOString(),
    players: g.players,
    winner: g.engine.winner,
    ...metaExtra
  };
  const doc = {
    meta,
    players: g.players,
    moves: g.engine.moveHistory || [],
    final: publicGameState(g)
  };
  const fp = path.join(__dirname, '..', 'data', 'replays', `${g.id}.json`);
  fs.writeFileSync(fp, JSON.stringify(doc, null, 2), 'utf8');
}

function finalizeEndedGame(ioSrv, gid, g, emitExtra = {}) {
  const { endReason, forfeitBy, ...restEmit } = emitExtra;
  const state = publicGameState(g);
  ioSrv.to(`game:${gid}`).emit('game:state', {
    ...gameShareFields(gid, g),
    state,
    endReason: endReason || 'normal',
    forfeitBy: forfeitBy || null,
    ...restEmit
  });
  const w = g.engine.winner;
  const wid = w === 'red' ? g.players.red : g.players.black;
  const lid = w === 'red' ? g.players.black : g.players.red;
  store.addExpForGameEnd(wid, true);
  store.addExpForGameEnd(lid, false);
  saveReplay(
    {
      id: gid,
      players: [
        { id: g.players.red, color: 'red' },
        { id: g.players.black, color: 'black' }
      ],
      engine: g.engine,
      startedAt: g.startedAt
    },
    {
      endReason: endReason || 'normal',
      forfeitBy: forfeitBy || undefined
    }
  );
  userGame.delete(g.players.red);
  userGame.delete(g.players.black);
  games.delete(gid);
  const room = `game:${gid}`;
  try {
    ioSrv.in(room).socketsLeave(room);
  } catch {
    /* ignore */
  }
}

function assignColorsAndStart(p1, p2) {
  const gameId = uuidv4();
  const redFirst = Math.random() < 0.5;
  const players = redFirst
    ? { red: p1, black: p2 }
    : { red: p2, black: p1 };
  const engine = xiangqi.createNewGame(buildPiecesWithIds());
  const g = {
    id: gameId,
    engine,
    players,
    sockets: {},
    spectatorSockets: new Set(),
    startedAt: new Date().toISOString(),
    code: null
  };
  games.set(gameId, g);
  userGame.set(p1, gameId);
  userGame.set(p2, gameId);
  return g;
}

function emitSpectatorState(socket, g) {
  const gid = g.id;
  socket.emit('game:state', {
    ...gameShareFields(gid, g),
    spectator: true,
    you: null,
    state: publicGameState(g),
    players: {
      red: store.userPublic(store.findUserById(g.players.red)),
      black: store.userPublic(store.findUserById(g.players.black))
    }
  });
}

function findActiveGameForWatch(codeRaw, gameIdRaw) {
  const gameId = gameIdRaw ? String(gameIdRaw).trim().toLowerCase() : '';
  if (gameId) {
    const g = games.get(gameId);
    if (g && !g.engine.gameOver) return g;
    return null;
  }
  const code = codeRaw ? String(codeRaw).trim().toUpperCase() : '';
  if (!code) return null;
  for (const g of games.values()) {
    if (g.code === code && !g.engine.gameOver) return g;
  }
  return null;
}

function wireSocketToGame(socket, gameId, userId, opts = {}) {
  const g = games.get(gameId);
  if (!g) return;
  socket.join(`game:${gameId}`);
  socket.data.gameId = gameId;
  socket.data.userId = userId;
  g.sockets[userId] = socket.id;

  const color =
    g.players.red === userId ? 'red' : g.players.black === userId ? 'black' : null;
  socket.emit('game:state', {
    ...gameShareFields(gameId, g),
    you: color,
    state: publicGameState(g),
    resumed: !!opts.resumed,
    players: {
      red: store.userPublic(store.findUserById(g.players.red)),
      black: store.userPublic(store.findUserById(g.players.black))
    }
  });
}

function tryMatch(ioRef) {
  while (matchQueue.length >= 2) {
    const a = matchQueue.shift();
    const b = matchQueue.shift();
    if (!a || !b) continue;
    const sa = ioRef.sockets.sockets.get(a.socketId);
    const sb = ioRef.sockets.sockets.get(b.socketId);
    if (!sa || !sb) {
      if (sa) matchQueue.unshift(a);
      if (sb) matchQueue.unshift(b);
      continue;
    }
    const g = assignColorsAndStart(a.userId, b.userId);
    g.sockets[a.userId] = a.socketId;
    g.sockets[b.userId] = b.socketId;
    wireSocketToGame(sa, g.id, a.userId);
    wireSocketToGame(sb, g.id, b.userId);
    ioRef.to(`game:${g.id}`).emit('game:started', { gameId: g.id });
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('未授权'));
  try {
    const p = jwt.verify(token, JWT_ACCESS_SECRET);
    socket.data.userId = p.sub;
    next();
  } catch {
    next(new Error('令牌无效'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;

  const gidResume = userGame.get(userId);
  const gResume = gidResume ? games.get(gidResume) : null;
  if (gResume && !gResume.engine.gameOver) {
    wireSocketToGame(socket, gidResume, userId, { resumed: true });
    socket.to(`game:${gidResume}`).emit('game:peer_reconnected', { userId });
  }

  socket.on('match:join', () => {
    if (userGame.has(userId)) {
      socket.emit('match:error', { error: '已在房间中' });
      return;
    }
    if (matchQueue.some((x) => x.userId === userId)) return;
    matchQueue.push({ userId, socketId: socket.id });
    socket.emit('match:queued');
    tryMatch(io);
  });

  socket.on('match:cancel', () => {
    const i = matchQueue.findIndex((x) => x.userId === userId);
    if (i >= 0) matchQueue.splice(i, 1);
    socket.emit('match:cancelled');
  });

  socket.on('room:create', () => {
    if (userGame.has(userId)) {
      socket.emit('room:error', { error: '已在房间中' });
      return;
    }
    const code = randomRoomCode();
    lobbies.set(code, {
      hostId: userId,
      hostSocketId: socket.id,
      guestId: null
    });
    socket.data.lobbyCode = code;
    socket.join(`lobby:${code}`);
    socket.emit('room:created', { code });
  });

  socket.on('room:join', (payload) => {
    const code = String(payload?.code || '')
      .trim()
      .toUpperCase();
    const L = lobbies.get(code);
    if (!L) {
      socket.emit('room:error', { error: '房间不存在' });
      return;
    }
    if (L.hostId === userId) {
      socket.emit('room:error', { error: '你是房主' });
      return;
    }
    if (L.guestId) {
      socket.emit('room:error', { error: '房间已满' });
      return;
    }
    if (userGame.has(userId)) {
      socket.emit('room:error', { error: '已在其他对局' });
      return;
    }
    L.guestId = userId;
    const hostSock = io.sockets.sockets.get(L.hostSocketId);
    if (!hostSock) {
      L.guestId = null;
      socket.emit('room:error', { error: '房主已离线' });
      return;
    }
    lobbies.delete(code);
    hostSock.data.lobbyCode = null;
    const g = assignColorsAndStart(L.hostId, userId);
    g.sockets[L.hostId] = hostSock.id;
    g.sockets[userId] = socket.id;
    g.code = code;
    wireSocketToGame(hostSock, g.id, L.hostId);
    wireSocketToGame(socket, g.id, userId);
    io.to(`game:${g.id}`).emit('game:started', { gameId: g.id });
  });

  socket.on('game:sync', () => {
    const gid = userGame.get(userId);
    if (!gid) return;
    const g = games.get(gid);
    if (!g) return;
    wireSocketToGame(socket, gid, userId);
  });

  socket.on('watch:join', (payload) => {
    const code = payload?.code != null ? String(payload.code) : '';
    const gameId = payload?.gameId != null ? String(payload.gameId) : '';
    const g = findActiveGameForWatch(code, gameId);
    if (!g) {
      const c = code.trim().toUpperCase();
      if (c.length === 6 && lobbies.has(c)) {
        socket.emit('watch:error', { error: '对局尚未开始，请稍后再试' });
      } else {
        socket.emit('watch:error', { error: '对局不存在或已结束' });
      }
      return;
    }
    if (userGame.has(userId)) {
      socket.emit('watch:error', { error: '你正在对局中，无法观战' });
      return;
    }
    if (g.players.red === userId || g.players.black === userId) {
      socket.emit('watch:error', { error: '你本局在席，请直接对弈或刷新恢复' });
      return;
    }
    if (g.spectatorSockets.size >= MAX_SPECTATORS_PER_GAME) {
      socket.emit('watch:error', { error: '观战人数已满' });
      return;
    }
    if (socket.data.spectatorGameId && socket.data.spectatorGameId !== g.id) {
      const prev = games.get(socket.data.spectatorGameId);
      if (prev?.spectatorSockets) prev.spectatorSockets.delete(socket.id);
    }
    socket.join(`game:${g.id}`);
    socket.data.spectatorGameId = g.id;
    g.spectatorSockets.add(socket.id);
    emitSpectatorState(socket, g);
  });

  socket.on('game:move', (payload) => {
    const gid = userGame.get(userId) || socket.data.gameId;
    if (!gid) return;
    const g = games.get(gid);
    if (!g || g.engine.gameOver) return;
    const color =
      g.players.red === userId ? 'red' : g.players.black === userId ? 'black' : null;
    if (!color) return;
    const { from, to } = payload || {};
    if (
      !from ||
      typeof from.x !== 'number' ||
      typeof from.z !== 'number' ||
      !to ||
      typeof to.x !== 'number' ||
      typeof to.z !== 'number'
    ) {
      socket.emit('game:move_result', { ok: false, error: '参数无效' });
      return;
    }
    const r = xiangqi.tryApplyMove(
      g.engine,
      from.x,
      from.z,
      to.x,
      to.z,
      color
    );
    if (!r.ok) {
      socket.emit('game:move_result', { ok: false, error: r.error });
      return;
    }
    socket.emit('game:move_result', { ok: true });
    if (g.engine.gameOver) {
      finalizeEndedGame(io, gid, g, {
        endReason: 'checkmate_or_capture',
        lastMove: r.move
      });
    } else {
      const state = publicGameState(g);
      io.to(`game:${gid}`).emit('game:state', {
        ...gameShareFields(gid, g),
        state,
        lastMove: r.move
      });
    }
  });

  socket.on('game:forfeit', (payload) => {
    const gid = userGame.get(userId);
    if (!gid) return;
    const g = games.get(gid);
    if (!g || g.engine.gameOver) return;
    const myColor =
      g.players.red === userId ? 'red' : g.players.black === userId ? 'black' : null;
    if (!myColor) return;
    const winnerColor = myColor === 'red' ? 'black' : 'red';
    g.engine.gameOver = true;
    g.engine.winner = winnerColor;
    const winLabel = winnerColor === 'red' ? '红方' : '黑方';
    const kind = payload?.kind === 'surrender' ? '认输' : '退出房间';
    g.engine.uiStatusLine = `${winLabel}胜（对手${kind}）`;
    g.engine.moveHistory = g.engine.moveHistory || [];
    g.engine.moveHistory.push({
      forfeit: true,
      byUserId: userId,
      byColor: myColor,
      kind: payload?.kind === 'surrender' ? 'surrender' : 'leave'
    });
    finalizeEndedGame(io, gid, g, {
      endReason: 'forfeit',
      forfeitBy: userId,
      forfeitKind: payload?.kind === 'surrender' ? 'surrender' : 'leave'
    });
  });

  socket.on('disconnect', () => {
    if (socket.data.spectatorGameId) {
      const sg = games.get(socket.data.spectatorGameId);
      if (sg?.spectatorSockets) sg.spectatorSockets.delete(socket.id);
      socket.data.spectatorGameId = null;
    }
    const i = matchQueue.findIndex((x) => x.userId === userId);
    if (i >= 0) matchQueue.splice(i, 1);
    const gid = userGame.get(userId);
    if (gid) {
      const g = games.get(gid);
      if (g) {
        io.to(`game:${gid}`).emit('game:peer_disconnected', { userId });
      }
    }
    for (const [code, L] of lobbies.entries()) {
      if (L.hostId === userId) lobbies.delete(code);
    }
  });
});

server.listen(PORT, () => {
  store.ensureDataDir();
  console.log(`[chess-server] http://localhost:${PORT}  API + Socket.IO`);
});
