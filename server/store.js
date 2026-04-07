'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

/** @typedef {{ id: string, username: string, passwordHash: string, nickname: string, exp: number, level: number, createdAt: string, preferredSkin?: string, preferredAnimStyle?: string }} UserRow */

const THEME_KEYS = new Set(['classical', 'modern', 'fantasy', 'war']);
const DEFAULT_THEME = 'classical';

const defaultDb = () => ({
  users: [],
  friendships: [],
  refreshTokens: []
});

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const rep = path.join(DATA_DIR, 'replays');
  if (!fs.existsSync(rep)) fs.mkdirSync(rep, { recursive: true });
}

function loadDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    const d = defaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2), 'utf8');
    return d;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const d = JSON.parse(raw);
    if (!Array.isArray(d.users)) d.users = [];
    if (!Array.isArray(d.friendships)) d.friendships = [];
    if (!Array.isArray(d.refreshTokens)) d.refreshTokens = [];
    return d;
  } catch {
    return defaultDb();
  }
}

function saveDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

let _db = loadDb();

function persist() {
  saveDb(_db);
}

function userPublic(u) {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    exp: u.exp,
    level: u.level,
    skin: u.preferredSkin || DEFAULT_THEME,
    animStyle: u.preferredAnimStyle || DEFAULT_THEME
  };
}

async function registerUser(username, password, nickname) {
  const un = String(username || '').trim().toLowerCase();
  if (un.length < 2 || un.length > 32) {
    throw new Error('用户名长度 2–32');
  }
  if (!password || password.length < 6) {
    throw new Error('密码至少 6 位');
  }
  if (_db.users.some((u) => u.username === un)) {
    throw new Error('用户名已存在');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const row = {
    id: uuidv4(),
    username: un,
    passwordHash,
    nickname: (nickname && String(nickname).trim()) || un,
    exp: 0,
    level: 1,
    createdAt: new Date().toISOString()
  };
  _db.users.push(row);
  persist();
  return userPublic(row);
}

async function verifyLogin(username, password) {
  const un = String(username || '').trim().toLowerCase();
  const row = _db.users.find((u) => u.username === un);
  if (!row) throw new Error('账号或密码错误');
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) throw new Error('账号或密码错误');
  return row;
}

function findUserById(id) {
  return _db.users.find((u) => u.id === id) || null;
}

function updateProfile(userId, { nickname, skin, animStyle }) {
  const row = findUserById(userId);
  if (!row) throw new Error('用户不存在');
  if (nickname != null && String(nickname).trim()) {
    row.nickname = String(nickname).trim().slice(0, 32);
  }
  if (skin != null && skin !== '') {
    const s = String(skin).trim().toLowerCase();
    if (!THEME_KEYS.has(s)) throw new Error('无效的皮肤风格');
    row.preferredSkin = s;
  }
  if (animStyle != null && animStyle !== '') {
    const s = String(animStyle).trim().toLowerCase();
    if (!THEME_KEYS.has(s)) throw new Error('无效的游戏风格');
    row.preferredAnimStyle = s;
  }
  persist();
  return userPublic(row);
}

function addExpForGameEnd(userId, won) {
  const row = findUserById(userId);
  if (!row) return null;
  const gain = won ? 50 : 20;
  row.exp = (row.exp || 0) + gain;
  row.level = 1 + Math.floor(row.exp / 200);
  persist();
  return userPublic(row);
}

function storeRefreshToken(token, userId, ttlMs) {
  const exp = Date.now() + ttlMs;
  _db.refreshTokens.push({ token, userId, exp });
  _db.refreshTokens = _db.refreshTokens.filter((t) => t.exp > Date.now());
  persist();
}

function takeRefreshToken(token) {
  const i = _db.refreshTokens.findIndex((t) => t.token === token);
  if (i < 0) return null;
  const row = _db.refreshTokens[i];
  _db.refreshTokens.splice(i, 1);
  if (row.exp < Date.now()) return null;
  persist();
  return row.userId;
}

/** 好友：{ fromId, toId, status: 'pending'|'accepted' } */
function listFriends(userId) {
  const out = [];
  for (const f of _db.friendships) {
    if (f.status !== 'accepted') continue;
    if (f.fromId === userId) out.push(findUserById(f.toId));
    else if (f.toId === userId) out.push(findUserById(f.fromId));
  }
  return out.filter(Boolean).map(userPublic);
}

function requestFriend(fromId, targetUsername) {
  const un = String(targetUsername || '').trim().toLowerCase();
  const target = _db.users.find((u) => u.username === un);
  if (!target) throw new Error('用户不存在');
  if (target.id === fromId) throw new Error('不能加自己');
  const dup = _db.friendships.some(
    (f) =>
      (f.fromId === fromId && f.toId === target.id) ||
      (f.fromId === target.id && f.toId === fromId)
  );
  if (dup) throw new Error('已申请或已是好友');
  _db.friendships.push({ fromId, toId: target.id, status: 'pending' });
  persist();
  return { targetId: target.id, nickname: target.nickname };
}

function acceptFriend(userId, fromId) {
  const f = _db.friendships.find(
    (x) => x.toId === userId && x.fromId === fromId && x.status === 'pending'
  );
  if (!f) throw new Error('无待处理申请');
  f.status = 'accepted';
  persist();
}

function listPendingIncoming(userId) {
  return _db.friendships
    .filter((x) => x.toId === userId && x.status === 'pending')
    .map((x) => ({ from: userPublic(findUserById(x.fromId)) }))
    .filter((x) => x.from);
}

module.exports = {
  ensureDataDir,
  userPublic,
  registerUser,
  verifyLogin,
  findUserById,
  updateProfile,
  addExpForGameEnd,
  storeRefreshToken,
  takeRefreshToken,
  listFriends,
  requestFriend,
  acceptFriend,
  listPendingIncoming,
  persist,
  loadDb
};
