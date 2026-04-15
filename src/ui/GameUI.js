import './game-ui.css';
import {
  STYLE_KEYS,
  STYLE_LABELS,
  ANIM_PRESETS
} from '../config/stylePresets.js';
import { OnlineGameClient } from '../net/onlineClient.js';

const STYLE_ORDER = [
  STYLE_KEYS.CLASSICAL,
  STYLE_KEYS.MODERN,
  STYLE_KEYS.FANTASY,
  STYLE_KEYS.WAR
];

const LS_ACCESS = 'chess_access';
const LS_REFRESH = 'chess_refresh';

function skinOptionsHtml() {
  return STYLE_ORDER.map(
    (k) => `<option value="${k}">${STYLE_LABELS[k]}</option>`
  ).join('');
}

function animOptionsHtml() {
  return STYLE_ORDER.map(
    (k) => `<option value="${k}">${ANIM_PRESETS[k].label}</option>`
  ).join('');
}

/**
 * 纯 DOM 菜单与对局 HUD。
 * @param {{ getGameScene: () => import('../scenes/GameScene.js').GameScene, applyStyleConfig: (cfg: { skin: string, animStyle: string }) => void }} opts
 */
export class GameUI {
  constructor(opts) {
    this.getGameScene = opts.getGameScene;
    this.applyStyleConfig = opts.applyStyleConfig;
    this._online = new OnlineGameClient();
    this._access = localStorage.getItem(LS_ACCESS);
    this._refresh = localStorage.getItem(LS_REFRESH);
    this._lastSyncPlayer = null;
    this._lastSyncMoves = -1;
    this._lastGameOver = null;
    this._lastStatusText = '';
    this._styleLocked = false;
    this._postAuthOpenOnline = false;
    this._onlineTab = 'play';
    this._els = {};
    this._mount();
    this._bind();
    this._updateOnlineAuthUi();
    if (this._access) {
      this._tryRestoreUser();
    }
  }

  _mount() {
    const root = document.createElement('div');
    root.id = 'game-ui-overlay';
    root.className = 'game-ui-overlay';
    root.innerHTML = `
      <div class="game-ui-main-menu" id="game-ui-main-menu">
        <div class="game-ui-home-bg" aria-hidden="true"></div>
        <div class="game-ui-home-ambient" aria-hidden="true">
          <span class="game-ui-home-orb game-ui-home-orb--a"></span>
          <span class="game-ui-home-orb game-ui-home-orb--b"></span>
          <span class="game-ui-home-orb game-ui-home-orb--c"></span>
        </div>
        <div class="game-ui-home-inner game-ui-home-inner--splash">
          <div class="game-ui-home-grid">
            <div class="game-ui-home-hero-col">
              <header class="game-ui-home-hero">
                <span class="game-ui-home-badge">WebGL · 在线联机</span>
                <h1 class="game-ui-title">3D 象棋</h1>
                <p class="game-ui-subtitle">本地同桌或联机对弈</p>
                <p class="game-ui-home-tagline">沉浸式棋盘 · 走子动画 · 房间与观战</p>
              </header>
              <p class="game-ui-home-auth-line game-ui-home-auth-line--splash" id="game-ui-home-auth-line" aria-live="polite"></p>
              <ul class="game-ui-home-features" aria-label="玩法亮点">
                <li class="game-ui-home-feature">
                  <span class="game-ui-home-feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M8 7h8M8 12h8M8 17h5"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                  </span>
                  <span class="game-ui-home-feature-text"><strong>本机双控</strong>同一屏幕轮流走子</span>
                </li>
                <li class="game-ui-home-feature">
                  <span class="game-ui-home-feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M12 20v-4M8 20v-2M16 20v-2"/><path d="M4 12a8 8 0 0 1 16 0"/><path d="M9 12h6"/></svg>
                  </span>
                  <span class="game-ui-home-feature-text"><strong>联机大厅</strong>匹配、房间与观战</span>
                </li>
                <li class="game-ui-home-feature">
                  <span class="game-ui-home-feature-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>
                  </span>
                  <span class="game-ui-home-feature-text"><strong>多皮肤棋盘</strong>开局前可预览主题</span>
                </li>
              </ul>
            </div>
            <aside class="game-ui-home-panel" aria-label="开始游戏">
              <div class="game-ui-home-panel-head">
                <h2 class="game-ui-home-panel-title">选择开局方式</h2>
              </div>
              <nav class="game-ui-home-nav" aria-label="主菜单">
                <button type="button" class="game-ui-btn game-ui-btn--primary" data-ui="start">本地双人对弈</button>
                <button type="button" class="game-ui-btn" data-ui="open-online-modal">联机大厅</button>
                <div class="game-ui-home-nav-row">
                  <button type="button" class="game-ui-btn game-ui-btn--ghost" data-ui="open-style-modal">棋盘与动画</button>
                  <button type="button" class="game-ui-btn game-ui-btn--ghost" data-ui="help">走子帮助</button>
                </div>
              </nav>
              <p class="game-ui-menu-hint game-ui-menu-hint--splash" id="game-ui-menu-hint" aria-live="polite"></p>
            </aside>
          </div>
        </div>
      </div>

      <div class="game-ui-modal" id="game-ui-modal-auth" hidden role="dialog" aria-modal="true" aria-labelledby="game-ui-modal-auth-title">
        <div class="game-ui-modal-backdrop" data-modal-close="auth" tabindex="-1" aria-hidden="true"></div>
        <div class="game-ui-modal-panel">
          <div class="game-ui-modal-header">
            <h2 id="game-ui-modal-auth-title" class="game-ui-modal-title">登录 / 注册</h2>
            <button type="button" class="game-ui-modal-x" data-modal-close="auth" aria-label="关闭">×</button>
          </div>
          <p class="game-ui-modal-lead">注册后可进行联机匹配、房间对战、观战与回放。</p>
          <div class="game-ui-online-row">
            <input id="game-ui-username" class="game-ui-input" placeholder="用户名" autocomplete="username" />
            <input id="game-ui-password" class="game-ui-input" type="password" placeholder="密码" autocomplete="current-password" />
          </div>
          <div class="game-ui-online-actions">
            <button type="button" class="game-ui-btn game-ui-btn--small" data-ui="register">注册</button>
            <button type="button" class="game-ui-btn game-ui-btn--small" data-ui="login">登录</button>
            <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--small" data-ui="logout">退出登录</button>
          </div>
          <p class="game-ui-menu-hint game-ui-online-hint" id="game-ui-auth-hint" aria-live="polite"></p>
          <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-modal-footer-btn" data-modal-close="auth">关闭</button>
        </div>
      </div>

      <div class="game-ui-modal" id="game-ui-modal-style" hidden role="dialog" aria-modal="true" aria-labelledby="game-ui-modal-style-title">
        <div class="game-ui-modal-backdrop" data-modal-close="style" tabindex="-1" aria-hidden="true"></div>
        <div class="game-ui-modal-panel game-ui-modal-panel--deck">
          <div class="game-ui-modal-header">
            <h2 id="game-ui-modal-style-title" class="game-ui-modal-title">棋盘与动画</h2>
            <button type="button" class="game-ui-modal-x" data-modal-close="style" aria-label="关闭">×</button>
          </div>
          <p class="game-ui-modal-lead">开局前可更换皮肤与走子动画；对局开始后直至本局结束前锁定。</p>
          <div class="game-ui-style-panel game-ui-style-panel--modal" id="game-ui-style-panel">
            <div class="game-ui-style-row">
              <label for="game-ui-skin">皮肤风格</label>
              <select id="game-ui-skin" class="game-ui-select" aria-label="皮肤风格">${skinOptionsHtml()}</select>
            </div>
            <div class="game-ui-style-row">
              <label for="game-ui-anim">游戏风格</label>
              <select id="game-ui-anim" class="game-ui-select" aria-label="游戏风格">${animOptionsHtml()}</select>
            </div>
            <p class="game-ui-style-note" id="game-ui-style-note" hidden>对局进行中，风格已锁定</p>
          </div>
          <button type="button" class="game-ui-btn game-ui-btn--primary game-ui-modal-footer-btn" data-modal-close="style">完成</button>
        </div>
      </div>

      <div class="game-ui-modal" id="game-ui-modal-online" hidden role="dialog" aria-modal="true" aria-labelledby="game-ui-modal-online-title">
        <div class="game-ui-modal-backdrop" data-modal-close="online" tabindex="-1" aria-hidden="true"></div>
        <div class="game-ui-modal-panel game-ui-modal-panel--wide game-ui-modal-panel--deck">
          <div class="game-ui-modal-header">
            <div class="game-ui-modal-header-left">
              <h2 id="game-ui-modal-online-title" class="game-ui-modal-title">联机大厅</h2>
              <p class="game-ui-modal-lead game-ui-modal-lead--tight">匹配、房间与观战</p>
            </div>
            <div class="game-ui-online-header-right">
              <div id="game-ui-online-header-guest" class="game-ui-online-header-auth">
                <span class="game-ui-online-header-tag">未登录</span>
                <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--tiny" data-ui="open-auth-modal">登录 / 注册</button>
              </div>
              <div id="game-ui-online-header-session" class="game-ui-online-header-auth" hidden>
                <p class="game-ui-online-user game-ui-online-user--header" id="game-ui-online-user" role="status"></p>
                <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--tiny" data-ui="logout">退出</button>
              </div>
              <button type="button" class="game-ui-modal-x" data-modal-close="online" aria-label="关闭">×</button>
            </div>
          </div>
          <div class="game-ui-online" id="game-ui-online">
            <div class="game-ui-online-tabs" role="tablist" aria-label="联机功能">
              <button type="button" class="game-ui-online-tab" role="tab" aria-selected="true" data-ui="online-tab-play">对战</button>
              <button type="button" class="game-ui-online-tab" role="tab" aria-selected="false" data-ui="online-tab-watch">观战</button>
            </div>

            <p id="game-ui-online-gate-hint" class="game-ui-online-gate" role="note" hidden>请先登录后再使用联机功能。</p>

            <div id="game-ui-online-panel-play" role="tabpanel" aria-label="对战">
              <div class="game-ui-online-actions">
                <button type="button" class="game-ui-btn game-ui-btn--primary" data-ui="match" disabled>快速匹配</button>
                <button type="button" class="game-ui-btn game-ui-btn--ghost" data-ui="create-room" disabled>创建房间</button>
              </div>
              <div class="game-ui-online-row game-ui-online-row--room">
                <label for="game-ui-room-code" class="game-ui-label game-ui-label--inline">房间码</label>
                <input id="game-ui-room-code" class="game-ui-input" placeholder="6 位" maxlength="6" inputmode="text" autocomplete="off" aria-label="房间码，6 位" />
                <button type="button" class="game-ui-btn game-ui-btn--ghost" data-ui="join-room-submit" disabled>加入</button>
              </div>
            </div>

            <div id="game-ui-online-panel-watch" role="tabpanel" aria-label="观战" hidden>
              <div class="game-ui-online-row game-ui-online-row--watch">
                <label for="game-ui-watch-code" class="game-ui-label game-ui-label--inline">观战</label>
                <input id="game-ui-watch-code" class="game-ui-input" placeholder="房间码或对局 ID" spellcheck="false" autocomplete="off" aria-label="观战用房间码或完整对局 ID" />
                <button type="button" class="game-ui-btn game-ui-btn--primary" data-ui="watch-submit" disabled>进入</button>
              </div>
              <div class="game-ui-online-actions">
                <button type="button" class="game-ui-btn game-ui-btn--ghost" data-ui="replays-open" disabled>我的回放</button>
              </div>
            </div>

            <p class="game-ui-menu-hint game-ui-online-hint" id="game-ui-online-hint" aria-live="polite"></p>
          </div>
          <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-modal-footer-btn" data-modal-close="online">关闭</button>
        </div>
      </div>
      <div class="game-ui-hud game-ui-hud--deck" id="game-ui-hud" hidden>
        <div class="game-ui-hud-shell">
          <div class="game-ui-hud-bar" aria-label="对局状态">
            <span id="game-ui-hud-status" class="game-ui-hud-status">对局中</span>
            <span id="game-ui-hud-turn" class="game-ui-hud-turn">第 1 手</span>
            <span id="game-ui-hud-player" class="game-ui-hud-player--red">当前行棋：红方</span>
          </div>
          <div class="game-ui-hud-toolbar">
            <div class="game-ui-hud-online" id="game-ui-hud-online" hidden>
              <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="surrender">认输</button>
              <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="leave-room">退出房间</button>
            </div>
            <div class="game-ui-hud-actions">
              <button type="button" class="game-ui-btn game-ui-btn--inline" data-ui="restart">重新开始</button>
              <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="home">回到首页</button>
              <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="menu">菜单</button>
            </div>
          </div>
        </div>
        <p class="game-ui-hud-hint" id="game-ui-hud-hint">操作：先点己方棋子，再点目标格或对方子</p>
      </div>

      <div class="game-ui-modal" id="game-ui-modal-share" hidden role="dialog" aria-modal="true" aria-labelledby="game-ui-modal-share-title">
        <div class="game-ui-modal-backdrop" data-modal-close="share" tabindex="-1" aria-hidden="true"></div>
        <div class="game-ui-modal-panel">
          <div class="game-ui-modal-header">
            <h2 id="game-ui-modal-share-title" class="game-ui-modal-title">分享观战</h2>
            <button type="button" class="game-ui-modal-x" data-modal-close="share" aria-label="关闭">×</button>
          </div>
          <p class="game-ui-modal-lead">好友登录后，在「联机大厅」→ 观战中粘贴以下信息即可观战。</p>
          <div class="game-ui-share-panel" id="game-ui-share-panel">
            <div class="game-ui-hud-share-row">
              <span class="game-ui-hud-share-label">对局 ID</span>
              <code id="game-ui-hud-share-gameid" class="game-ui-hud-share-code"></code>
              <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="copy-game-id">复制</button>
            </div>
            <div class="game-ui-hud-share-row" id="game-ui-hud-share-room-wrap" hidden>
              <span class="game-ui-hud-share-label">房间码</span>
              <code id="game-ui-hud-share-room" class="game-ui-hud-share-code"></code>
              <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="copy-room-code">复制</button>
            </div>
          </div>
          <p class="game-ui-hud-share-tip">好友登录后，在「联机大厅」→ 观战中粘贴对局 ID 或房间码（局内也可复制）</p>
        </div>
      </div>
      <div class="game-ui-replay-overlay" id="game-ui-replay-overlay" hidden>
        <div class="game-ui-replay-panel game-ui-replay-panel--deck">
          <h3 class="game-ui-replay-panel-title">我的回放</h3>
          <ul class="game-ui-replay-ul" id="game-ui-replay-ul"></ul>
          <button type="button" class="game-ui-btn game-ui-btn--ghost" data-ui="replays-close">关闭</button>
        </div>
      </div>
      <div class="game-ui-replay-bar game-ui-replay-bar--deck" id="game-ui-replay-bar" hidden>
        <span id="game-ui-replay-step" class="game-ui-replay-step">步进 0 / 0</span>
        <input type="range" id="game-ui-replay-slider" class="game-ui-replay-slider" min="0" max="0" value="0" />
        <div class="game-ui-replay-bar-btns">
          <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="replay-prev">上一步</button>
          <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="replay-next">下一步</button>
          <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="replay-start">开局</button>
          <button type="button" class="game-ui-btn game-ui-btn--ghost game-ui-btn--inline" data-ui="replay-end">终局</button>
          <button type="button" class="game-ui-btn game-ui-btn--inline" data-ui="replay-close">退出复盘</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    this._els.root = root;
    this._els.mainMenu = root.querySelector('#game-ui-main-menu');
    this._els.modalAuth = root.querySelector('#game-ui-modal-auth');
    this._els.modalStyle = root.querySelector('#game-ui-modal-style');
    this._els.modalOnline = root.querySelector('#game-ui-modal-online');
    this._els.modalShare = root.querySelector('#game-ui-modal-share');
    this._els.homeUserName = root.querySelector('#game-ui-home-user-name');
    this._els.homeLoginBtn = root.querySelector('#game-ui-home-login-btn');
    this._els.homeLogoutBtn = root.querySelector('#game-ui-home-logout-btn');
    this._els.menuHint = root.querySelector('#game-ui-menu-hint');
    this._els.hud = root.querySelector('#game-ui-hud');
    this._els.hudPlayer = root.querySelector('#game-ui-hud-player');
    this._els.hudTurn = root.querySelector('#game-ui-hud-turn');
    this._els.hudStatus = root.querySelector('#game-ui-hud-status');
    this._els.hudHint = root.querySelector('#game-ui-hud-hint');
    this._els.skinSelect = root.querySelector('#game-ui-skin');
    this._els.animSelect = root.querySelector('#game-ui-anim');
    this._els.styleNote = root.querySelector('#game-ui-style-note');
    this._els.stylePanel = root.querySelector('#game-ui-style-panel');
    this._els.username = root.querySelector('#game-ui-username');
    this._els.password = root.querySelector('#game-ui-password');
    this._els.authHint = root.querySelector('#game-ui-auth-hint');
    this._els.onlineUser = root.querySelector('#game-ui-online-user');
    this._els.onlineHint = root.querySelector('#game-ui-online-hint');
    this._els.onlineHeaderGuest = root.querySelector('#game-ui-online-header-guest');
    this._els.onlineHeaderSession = root.querySelector('#game-ui-online-header-session');
    this._els.onlineGateHint = root.querySelector('#game-ui-online-gate-hint');
    this._els.onlineTabPlay = root.querySelector('[data-ui="online-tab-play"]');
    this._els.onlineTabWatch = root.querySelector('[data-ui="online-tab-watch"]');
    this._els.onlinePanelPlay = root.querySelector('#game-ui-online-panel-play');
    this._els.onlinePanelWatch = root.querySelector('#game-ui-online-panel-watch');
    this._els.roomCode = root.querySelector('#game-ui-room-code');
    this._els.btnMatch = root.querySelector('[data-ui="match"]');
    this._els.btnCreateRoom = root.querySelector('[data-ui="create-room"]');
    this._els.btnJoinRoom = root.querySelector('[data-ui="join-room-submit"]');
    this._els.watchCode = root.querySelector('#game-ui-watch-code');
    this._els.btnWatch = root.querySelector('[data-ui="watch-submit"]');
    this._els.hudShareBtn = root.querySelector('#game-ui-hud-share-open');
    this._els.hudShareGameId = root.querySelector('#game-ui-hud-share-gameid');
    this._els.hudShareRoomWrap = root.querySelector('#game-ui-hud-share-room-wrap');
    this._els.hudShareRoom = root.querySelector('#game-ui-hud-share-room');
    this._els.btnReplays = root.querySelector('[data-ui="replays-open"]');
    this._els.replayListOverlay = root.querySelector('#game-ui-replay-overlay');
    this._els.replayUl = root.querySelector('#game-ui-replay-ul');
    this._els.replayBar = root.querySelector('#game-ui-replay-bar');
    this._els.replayStepLabel = root.querySelector('#game-ui-replay-step');
    this._els.replaySlider = root.querySelector('#game-ui-replay-slider');
    this._shareGameId = '';
    this._shareRoomCode = '';
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._themeSaveTimer = null;
  }

  /** @param {{ skin?: string, animStyle?: string } | null | undefined} me */
  _applyUserThemeFromMe(me) {
    if (!me) return;
    const skinSel = this._els.skinSelect;
    const animSel = this._els.animSelect;
    if (me.skin && [...skinSel.options].some((o) => o.value === me.skin)) {
      skinSel.value = me.skin;
    }
    if (me.animStyle && [...animSel.options].some((o) => o.value === me.animStyle)) {
      animSel.value = me.animStyle;
    }
    if (!this._styleLocked) {
      this._previewStyleIfAllowed();
    }
  }

  _persistThemePrefsDebounced() {
    if (!this._access || this._styleLocked) return;
    if (this._themeSaveTimer) clearTimeout(this._themeSaveTimer);
    this._themeSaveTimer = setTimeout(() => {
      this._themeSaveTimer = null;
      this._persistThemePrefsNow();
    }, 450);
  }

  async _persistThemePrefsNow() {
    if (!this._access || this._styleLocked) return;
    try {
      await this._api('/api/me', {
        method: 'PATCH',
        body: JSON.stringify(this._readStyleConfig())
      });
    } catch {
      /* 静默失败，避免打断操作 */
    }
  }

  async _openReplayList() {
    if (!this._access) return;
    this._els.onlineHint.textContent = '加载回放列表…';
    try {
      const { replays } = await this._api('/api/replays');
      this._renderReplayList(replays || []);
      this._els.replayListOverlay.hidden = false;
      this._els.onlineHint.textContent =
        replays?.length ? '' : '暂无回放（需先完成联机对局）';
    } catch (e) {
      this._els.onlineHint.textContent = e.message || '加载失败';
    }
  }

  _renderReplayList(replays) {
    const ul = this._els.replayUl;
    ul.innerHTML = '';
    for (const r of replays) {
      const li = document.createElement('li');
      li.className = 'game-ui-replay-li';
      const ended = (r.endedAt || '').slice(0, 19).replace('T', ' ');
      const win =
        r.winner === 'red' ? '红胜' : r.winner === 'black' ? '黑胜' : '';
      const reason = r.endReason === 'forfeit' ? '（认输/退出）' : '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'game-ui-btn game-ui-btn--ghost game-ui-replay-item';
      btn.dataset.replayId = r.id;
      btn.textContent = `${ended} ${win}${reason}`.trim() || r.id;
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  async _loadReplayById(id) {
    if (!id) return;
    try {
      const doc = await this._api(`/api/replays/${encodeURIComponent(id)}`);
      this._enterReplayView(doc);
    } catch (e) {
      this._els.onlineHint.textContent = e.message || '加载回放失败';
    }
  }

  _enterReplayView(doc) {
    const scene = this.getGameScene?.();
    if (!scene?.beginReplay) return;
    const cfg = this._readStyleConfig();
    this.applyStyleConfig?.(cfg);
    this._setStyleControlsLocked(true);
    this._els.mainMenu.hidden = true;
    this._els.replayListOverlay.hidden = true;
    this._els.hud.hidden = false;
    this._els.hudHint.textContent = '复盘：拖动滑块或使用下方按钮步进';
    scene.beginReplay(doc);
    this._syncReplayBar();
    this.syncGameState(scene);
    this._syncOnlineHudActions();
  }

  _exitReplayUi() {
    if (this._themeSaveTimer) {
      clearTimeout(this._themeSaveTimer);
      this._themeSaveTimer = null;
    }
    this.getGameScene?.().exitReplay?.();
    this._els.replayBar.hidden = true;
    this._els.replayListOverlay.hidden = true;
    this._shareGameId = '';
    this._shareRoomCode = '';
    this._syncShareHud();
    this._setStyleControlsLocked(false);
    this._closeModals();
    this._els.mainMenu.hidden = false;
    this._els.hud.hidden = true;
    this._els.hudHint.textContent = '操作：先点己方棋子，再点目标格或对方子';
    this._lastSyncPlayer = null;
    this._lastSyncMoves = -1;
    this._lastStatusText = '';
    this._lastGameOver = null;
    if (this._access) this._connectSocketAndWire();
    this._syncOnlineHudActions();
  }

  _syncReplayBar() {
    const scene = this.getGameScene?.();
    const st = scene?.getReplayUiState?.();
    const bar = this._els.replayBar;
    const slider = this._els.replaySlider;
    if (!st || scene?.networkMode !== 'replay') {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    slider.min = '0';
    slider.max = String(st.maxStep);
    slider.value = String(st.step);
    this._els.replayStepLabel.textContent = `步进 ${st.step} / ${st.maxStep}`;
  }

  _readStyleConfig() {
    return {
      skin: this._els.skinSelect.value,
      animStyle: this._els.animSelect.value
    };
  }

  _previewStyleIfAllowed() {
    if (this._styleLocked || !this.applyStyleConfig) return;
    this.applyStyleConfig(this._readStyleConfig());
  }

  _setStyleControlsLocked(locked) {
    this._styleLocked = locked;
    this._els.skinSelect.disabled = locked;
    this._els.animSelect.disabled = locked;
    this._els.styleNote.hidden = !locked;
    this._els.stylePanel.classList.toggle('game-ui-style-panel--locked', locked);
  }

  _updateOnlineAuthUi() {
    const logged = !!this._access;
    this._els.btnMatch.disabled = !logged;
    this._els.btnCreateRoom.disabled = !logged;
    this._els.btnJoinRoom.disabled = !logged;
    this._els.btnWatch.disabled = !logged;
    this._els.btnReplays.disabled = !logged;
    if (this._els.onlineHeaderGuest) {
      if (logged) this._els.onlineHeaderGuest.setAttribute('hidden', '');
      else this._els.onlineHeaderGuest.removeAttribute('hidden');
    }
    if (this._els.onlineHeaderSession) {
      if (logged) this._els.onlineHeaderSession.removeAttribute('hidden');
      else this._els.onlineHeaderSession.setAttribute('hidden', '');
    }
    if (this._els.onlineGateHint) this._els.onlineGateHint.hidden = logged;
    if (this._els.homeAuthLine) {
      if (!logged) {
        this._els.homeAuthLine.textContent = '未登录 · 打开「联机大厅」注册或登录';
      } else {
        const u = this._els.onlineUser?.textContent?.trim();
        this._els.homeAuthLine.textContent = u || '已登录';
      }
    }
  }

  /** 打开联机大厅后将焦点放到首个有意义控件（未登录 → 用户名，已登录 → 快速匹配） */
  _focusOnlineModalEntry() {
    if (!this._els.modalOnline || this._els.modalOnline.hidden) return;
    if (!this._access) {
      const btn = this._els.modalOnline.querySelector('[data-ui="open-auth-modal"]');
      if (btn) {
        try {
          btn.focus();
          return;
        } catch {
          /* ignore */
        }
      }
      return;
    }
    try {
      this._els.btnMatch?.focus();
    } catch {
      /* ignore */
    }
  }

  /** @param {'play'|'watch'} tab */
  _setOnlineTab(tab) {
    const next = tab === 'watch' ? 'watch' : 'play';
    this._onlineTab = next;
    const playBtn = this._els.onlineTabPlay;
    const watchBtn = this._els.onlineTabWatch;
    const playPanel = this._els.onlinePanelPlay;
    const watchPanel = this._els.onlinePanelWatch;
    if (playBtn) playBtn.setAttribute('aria-selected', String(next === 'play'));
    if (watchBtn) watchBtn.setAttribute('aria-selected', String(next === 'watch'));
    if (playPanel) playPanel.hidden = next !== 'play';
    if (watchPanel) watchPanel.hidden = next !== 'watch';
  }

  _closeModal(which) {
    if (which === 'style' && this._els.modalStyle) this._els.modalStyle.hidden = true;
    if (which === 'online' && this._els.modalOnline) this._els.modalOnline.hidden = true;
    if (which === 'auth' && this._els.modalAuth) this._els.modalAuth.hidden = true;
    if (which === 'share' && this._els.modalShare) this._els.modalShare.hidden = true;
  }

  _closeModals() {
    this._closeModal('style');
    this._closeModal('online');
    this._closeModal('auth');
    this._closeModal('share');
  }

  /** @param {'style' | 'online' | 'auth' | 'share'} which */
  _openModal(which) {
    if (which === 'style') {
      if (this._els.modalOnline) this._els.modalOnline.hidden = true;
      if (this._els.modalAuth) this._els.modalAuth.hidden = true;
      if (this._els.modalShare) this._els.modalShare.hidden = true;
      if (this._els.modalStyle) this._els.modalStyle.hidden = false;
    } else if (which === 'online') {
      if (this._els.modalStyle) this._els.modalStyle.hidden = true;
      if (this._els.modalAuth) this._els.modalAuth.hidden = true;
      if (this._els.modalShare) this._els.modalShare.hidden = true;
      if (this._els.modalOnline) this._els.modalOnline.hidden = false;
      this._setOnlineTab(this._onlineTab || 'play');
      requestAnimationFrame(() => this._focusOnlineModalEntry());
    } else if (which === 'auth') {
      if (this._els.modalStyle) this._els.modalStyle.hidden = true;
      if (this._els.modalOnline) this._els.modalOnline.hidden = true;
      if (this._els.modalShare) this._els.modalShare.hidden = true;
      if (this._els.modalAuth) this._els.modalAuth.hidden = false;
      requestAnimationFrame(() => this._els.username?.focus());
    } else if (which === 'share') {
      if (this._els.modalStyle) this._els.modalStyle.hidden = true;
      if (this._els.modalOnline) this._els.modalOnline.hidden = true;
      if (this._els.modalAuth) this._els.modalAuth.hidden = true;
      if (this._els.modalShare) this._els.modalShare.hidden = false;
    }
  }

  async _api(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (this._access) headers.Authorization = `Bearer ${this._access}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  async _tryRestoreUser() {
    try {
      const me = await this._api('/api/me');
      this._applyUserThemeFromMe(me);
      this._els.onlineUser.textContent = `已登录：${me.nickname}（Lv.${me.level}）`;
      try {
        const active = await this._api('/api/game/active');
        if (active.inGame) {
          this._els.onlineHint.textContent = '检测到未结束的对局，正在恢复…';
        }
      } catch {
        /* ignore */
      }
      this._connectSocketAndWire();
    } catch {
      await this._tryRefreshToken();
    }
    this._updateOnlineAuthUi();
  }

  _syncOnlineHudActions() {
    const scene = this.getGameScene?.();
    const show =
      !!scene &&
      scene.networkMode === 'online' &&
      !!scene.myOnlineColor &&
      !scene.gameOver &&
      !this._els.hud.hidden;
    this._syncShareHud();
  }

  _syncShareHud() {
    const scene = this.getGameScene?.();
    const show =
      !!this._shareGameId &&
      !!scene &&
      scene.networkMode === 'online' &&
      !!scene.myOnlineColor &&
      !scene.gameOver &&
      !this._els.hud.hidden;
    const btn = this._els.hudShareBtn;
    if (btn) btn.hidden = !show;
    if (!show) return;
    this._els.hudShareGameId.textContent = this._shareGameId;
    const hasRoom = !!this._shareRoomCode;
    this._els.hudShareRoomWrap.hidden = !hasRoom;
    if (hasRoom) this._els.hudShareRoom.textContent = this._shareRoomCode;
  }

  async _copyToClipboard(label, text) {
    const t = String(text || '').trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      this._els.hudHint.textContent = `已复制${label}`;
    } catch {
      this._els.hudHint.textContent = `${label}（请手动复制）：${t}`;
    }
  }

  async _tryRefreshToken() {
    if (!this._refresh) return;
    try {
      const data = await this._api('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this._refresh })
      });
      this._access = data.accessToken;
      this._refresh = data.refreshToken;
      localStorage.setItem(LS_ACCESS, this._access);
      localStorage.setItem(LS_REFRESH, this._refresh);
      const me = await this._api('/api/me');
      this._applyUserThemeFromMe(me);
      this._els.onlineUser.textContent = `已登录：${me.nickname}（Lv.${me.level}）`;
      this._connectSocketAndWire();
    } catch {
      this._access = null;
      this._refresh = null;
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem(LS_REFRESH);
      this._els.onlineUser.textContent = '';
    }
    this._updateOnlineAuthUi();
  }

  _connectSocketAndWire() {
    if (!this._access) return;
    const socket = this._online.connect(this._access);
    socket.on('connect', () => this._onSocketConnect());
    socket.on('disconnect', () => this._onSocketDisconnect());
    socket.on('game:state', (payload) => this._onGameState(payload));
    socket.on('game:started', () => {
      if (!this._els.mainMenu.hidden) {
        this._els.onlineHint.textContent = '对局开始';
      }
    });
    socket.on('game:move_result', (r) => {
      if (!r?.ok && r?.error) {
        this._els.hudHint.textContent = `服务器：${r.error}`;
      }
    });
    socket.on('match:queued', () => {
      this._els.onlineHint.textContent = '匹配队列中…';
    });
    socket.on('match:error', (e) => {
      this._els.onlineHint.textContent = e?.error || '匹配失败';
    });
    socket.on('match:cancelled', () => {
      this._els.onlineHint.textContent = '已取消匹配';
    });
    socket.on('room:created', (p) => {
      this._els.onlineHint.textContent = `房间码：${p.code}，等待对手加入…`;
    });
    socket.on('room:error', (e) => {
      this._els.onlineHint.textContent = e?.error || '房间错误';
    });
    socket.on('watch:error', (e) => {
      this._els.onlineHint.textContent = e?.error || '无法观战';
    });
    socket.on('game:peer_disconnected', () => {
      this._els.hudHint.textContent =
        '对手已断线；对方重连后将自动恢复，您也可刷新恢复连接';
    });
    socket.on('game:peer_reconnected', () => {
      const scene = this.getGameScene?.();
      if (scene?.networkMode === 'online' && scene.myOnlineColor && !scene.gameOver) {
        this._els.hudHint.textContent =
          '对手已重新连接；对局继续。操作：先点己方棋子，再点目标格或对方子';
      }
    });
    socket.on('connect_error', (err) => {
      this._els.onlineHint.textContent = `联机连接失败：${err.message}（是否已启动 server？）`;
    });
  }

  /** Socket 恢复后拉回局面（服务端 connection 也会推 state，此处作双保险） */
  _onSocketConnect() {
    if (!this._els.mainMenu.hidden && this._access) {
      const oh = this._els.onlineHint.textContent;
      if (oh === '与服务器断开，正在自动重连…') {
        this._els.onlineHint.textContent = '已重新连接服务器';
      }
    }
    const scene = this.getGameScene?.();
    if (!scene || scene.networkMode !== 'online' || scene.gameOver) return;
    if (scene.myOnlineColor) {
      this._online.gameSync();
    } else if (this._shareGameId) {
      this._online.watchJoin(this._shareGameId, {});
    }
    if (!this._els.hud.hidden && scene.networkMode === 'online' && !scene.gameOver) {
      if (scene.myOnlineColor) {
        const sideLabel = scene.myOnlineColor === 'red' ? '红方' : '黑方';
        this._els.hudHint.textContent = `联机：你执${sideLabel}。操作：先点己方棋子，再点目标格或对方子`;
      }
    }
  }

  _onSocketDisconnect() {
    const scene = this.getGameScene?.();
    if (!scene || scene.networkMode !== 'online' || scene.gameOver) return;
    if (!this._els.hud.hidden) {
      this._els.hudHint.textContent = '与服务器断开，正在自动重连…';
    } else if (!this._els.mainMenu.hidden && this._access) {
      this._els.onlineHint.textContent = '与服务器断开，正在自动重连…';
    }
  }

  _onGameState(payload) {
    const scene = this.getGameScene?.();
    if (!scene || !payload?.state) return;
    if (payload.resumed) {
      this._els.onlineHint.textContent = '已重新连接对局';
    }
    const isSpectatorPacket = payload.spectator === true;
    const enterAsPlayer = !!payload.you && !isSpectatorPacket;
    if ((enterAsPlayer || isSpectatorPacket) && scene.networkMode !== 'online') {
      const cfg = this._readStyleConfig();
      this.applyStyleConfig?.(cfg);
      this._setStyleControlsLocked(true);
      // 进入对局：自动关闭联机大厅弹窗
      this._closeModal('online');
      this._els.mainMenu.hidden = true;
      this._els.hud.hidden = false;
      scene.beginOnlineMatch(enterAsPlayer ? payload.you : null, this._online);
      if (isSpectatorPacket) this._els.onlineHint.textContent = '';
    }
    scene.applyServerGameState(payload.state, { lastMove: payload.lastMove });
    if (payload.gameId) this._shareGameId = payload.gameId;
    if (payload.shareRoomCode != null) {
      this._shareRoomCode = payload.shareRoomCode ? String(payload.shareRoomCode) : '';
    }
    if (scene.networkMode === 'online') {
      if (!scene.myOnlineColor) {
        this._els.hudHint.textContent = '观战：局面与对局端同步，无法走棋';
      } else {
        const sideLabel = scene.myOnlineColor === 'red' ? '红方' : '黑方';
        this._els.hudHint.textContent = `联机：你执${sideLabel}。操作：先点己方棋子，再点目标格或对方子`;
      }
    } else {
      this._els.hudHint.textContent = '操作：先点己方棋子，再点目标格或对方子';
    }
    this.syncGameState(scene);
    this._syncOnlineHudActions();
  }

  async _register() {
    const username = this._els.username.value.trim();
    const password = this._els.password.value;
    if (this._els.authHint) this._els.authHint.textContent = '';
    if (this._els.onlineHint) this._els.onlineHint.textContent = '';
    if (!username || !password) {
      if (this._els.authHint) this._els.authHint.textContent = '请先填写用户名与密码';
      if (!username) this._els.username?.focus();
      else this._els.password?.focus();
      return;
    }
    try {
      const data = await this._api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          nickname: username
        })
      });
      this._access = data.accessToken;
      this._refresh = data.refreshToken;
      localStorage.setItem(LS_ACCESS, this._access);
      localStorage.setItem(LS_REFRESH, this._refresh);
      this._applyUserThemeFromMe(data.user);
      this._els.onlineUser.textContent = `已登录：${data.user.nickname}（Lv.${data.user.level}）`;
      this._connectSocketAndWire();
      this._updateOnlineAuthUi();
      if (this._els.authHint) {
        this._els.authHint.textContent = '注册成功，已自动登录。';
      }
      if (this._els.onlineHint) {
        this._els.onlineHint.textContent = '已登录。可选择快速匹配或创建房间。';
      }
      if (this._postAuthOpenOnline) {
        this._postAuthOpenOnline = false;
        this._closeModal('auth');
        this._openModal('online');
        return;
      }
      requestAnimationFrame(() => {
        try {
          this._els.btnMatch?.focus();
        } catch {
          /* ignore */
        }
      });
    } catch (e) {
      if (this._els.authHint) this._els.authHint.textContent = e.message || '注册失败';
    }
  }

  async _login() {
    const username = this._els.username.value.trim();
    const password = this._els.password.value;
    if (this._els.authHint) this._els.authHint.textContent = '';
    if (this._els.onlineHint) this._els.onlineHint.textContent = '';
    if (!username || !password) {
      if (this._els.authHint) this._els.authHint.textContent = '请先填写用户名与密码';
      if (!username) this._els.username?.focus();
      else this._els.password?.focus();
      return;
    }
    try {
      const data = await this._api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      this._access = data.accessToken;
      this._refresh = data.refreshToken;
      localStorage.setItem(LS_ACCESS, this._access);
      localStorage.setItem(LS_REFRESH, this._refresh);
      this._applyUserThemeFromMe(data.user);
      this._els.onlineUser.textContent = `已登录：${data.user.nickname}（Lv.${data.user.level}）`;
      this._connectSocketAndWire();
      this._updateOnlineAuthUi();
      if (this._els.authHint) this._els.authHint.textContent = '登录成功。';
      if (this._els.onlineHint) this._els.onlineHint.textContent = '已登录。可进行匹配、房间或观战。';
      if (this._postAuthOpenOnline) {
        this._postAuthOpenOnline = false;
        this._closeModal('auth');
        this._openModal('online');
        return;
      }
      requestAnimationFrame(() => {
        try {
          this._els.btnMatch?.focus();
        } catch {
          /* ignore */
        }
      });
    } catch (e) {
      if (this._els.authHint) this._els.authHint.textContent = e.message || '登录失败';
    }
  }

  _logout() {
    if (this._themeSaveTimer) {
      clearTimeout(this._themeSaveTimer);
      this._themeSaveTimer = null;
    }
    this._online.matchCancel();
    this._online.disconnect();
    this._access = null;
    this._refresh = null;
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
    this._els.onlineUser.textContent = '';
    this._updateOnlineAuthUi();
    this._els.onlineHint.textContent = '已退出登录';
    if (this._els.modalOnline && !this._els.modalOnline.hidden) {
      requestAnimationFrame(() => {
        const btn = this._els.modalOnline.querySelector('[data-ui="open-auth-modal"]');
        btn?.focus?.();
      });
    }
  }

  _bind() {
    this._els.skinSelect.addEventListener('change', () => {
      this._previewStyleIfAllowed();
      this._persistThemePrefsDebounced();
    });
    this._els.animSelect.addEventListener('change', () => {
      this._previewStyleIfAllowed();
      this._persistThemePrefsDebounced();
    });

    this._els.replaySlider.addEventListener('input', () => {
      const scene = this.getGameScene?.();
      if (!scene || scene.networkMode !== 'replay') return;
      scene.replaySeek(Number(this._els.replaySlider.value));
      this.syncGameState(scene);
    });

    this._els.password?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      this._login();
    });
    this._els.username?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      this._els.password?.focus();
    });

    this._els.root.addEventListener('click', (e) => {
      const closer = e.target.closest('[data-modal-close]');
      if (closer) {
        this._closeModal(closer.getAttribute('data-modal-close'));
        return;
      }
      const rp = e.target.closest('[data-replay-id]');
      if (rp) {
        this._loadReplayById(rp.getAttribute('data-replay-id'));
        return;
      }
      const btn = e.target.closest('[data-ui]');
      if (!btn) return;
      const id = btn.getAttribute('data-ui');
      const map = {
        start: () => this.startGame(),
        help: () => this.openHelp(),
        'open-style-modal': () => this._openModal('style'),
        'open-online-modal': () => {
          if (!this._access) {
            this._postAuthOpenOnline = true;
            if (this._els.authHint) {
              this._els.authHint.textContent = '请先登录或注册后再进入联机大厅。';
            }
            this._openModal('auth');
            return;
          }
          this._openModal('online');
        },
        'open-auth-modal': () => {
          this._postAuthOpenOnline = false;
          this._openModal('auth');
        },
        'online-tab-play': () => this._setOnlineTab('play'),
        'online-tab-watch': () => this._setOnlineTab('watch'),
        'hud-share-open': () => {
          this._syncShareHud();
          this._openModal('share');
        },
        undo: () => this.undoMove(),
        restart: () => this.restartGame(),
        home: () => this.goHome(),
        menu: () => {
          if (this.getGameScene?.()?.networkMode === 'replay') {
            this._exitReplayUi();
            return;
          }
          this.openMainMenuFromGame();
        },
        register: () => this._register(),
        login: () => this._login(),
        logout: () => this._logout(),
        match: () => {
          if (!this._access) return;
          if (!this._online.connected) this._connectSocketAndWire();
          this._online.matchJoin();
        },
        'create-room': () => {
          if (!this._access) return;
          if (!this._online.connected) this._connectSocketAndWire();
          this._online.roomCreate();
        },
        'join-room-submit': () => {
          if (!this._access) return;
          if (!this._online.connected) this._connectSocketAndWire();
          this._online.roomJoin(this._els.roomCode.value || '');
        },
        'watch-submit': () => {
          if (!this._access) return;
          if (!this._online.hasSocket()) this._connectSocketAndWire();
          else this._online.reconnectSocket();
          this._online.watchJoin(this._els.watchCode.value || '', {
            onStatus: (msg) => {
              if (msg) this._els.onlineHint.textContent = msg;
            }
          });
        },
        forfeit: () => {
          if (confirm('退出对局将判负，对手获胜。确定？')) {
            this._online.emitForfeit('leave');
            // 立即回到首页：让用户有明确的“退出成功”反馈；同时给 socket 一个极短时间发出消息
            setTimeout(() => this.goHome(), 50);
          }
        },
        'copy-game-id': () => this._copyToClipboard('对局 ID', this._shareGameId),
        'copy-room-code': () => this._copyToClipboard('房间码', this._shareRoomCode),
        'replays-open': () => this._openReplayList(),
        'replays-close': () => {
          this._els.replayListOverlay.hidden = true;
        },
        'replay-prev': () => {
          const scene = this.getGameScene?.();
          if (!scene || scene.networkMode !== 'replay') return;
          scene.replayPrev();
          this.syncGameState(scene);
        },
        'replay-next': () => {
          const scene = this.getGameScene?.();
          if (!scene || scene.networkMode !== 'replay') return;
          scene.replayNext();
          this.syncGameState(scene);
        },
        'replay-start': () => {
          const scene = this.getGameScene?.();
          if (!scene || scene.networkMode !== 'replay') return;
          scene.replayToStart();
          this.syncGameState(scene);
        },
        'replay-end': () => {
          const scene = this.getGameScene?.();
          if (!scene || scene.networkMode !== 'replay') return;
          scene.replayToEnd();
          this.syncGameState(scene);
        },
        'replay-close': () => this._exitReplayUi()
      };
      map[id]?.();
    });

    this._onDocKeydown = (e) => {
      if (e.key !== 'Escape') return;
      if (this._els.modalStyle && !this._els.modalStyle.hidden) {
        this._closeModal('style');
        return;
      }
      if (this._els.modalAuth && !this._els.modalAuth.hidden) {
        this._closeModal('auth');
        return;
      }
      if (this._els.modalShare && !this._els.modalShare.hidden) {
        this._closeModal('share');
        return;
      }
      if (this._els.modalOnline && !this._els.modalOnline.hidden) {
        this._closeModal('online');
      }
    };
    document.addEventListener('keydown', this._onDocKeydown);
    this._bindHomeParallax();
  }

  /** 首页轻量视差：仅影响背景与指挥台位移，尊重 prefers-reduced-motion */
  _bindHomeParallax() {
    const el = this._els.mainMenu;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMove = (e) => {
      if (reduced.matches) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--home-px', (px * 2).toFixed(4));
      el.style.setProperty('--home-py', (py * 2).toFixed(4));
    };
    const onLeave = () => {
      el.style.setProperty('--home-px', '0');
      el.style.setProperty('--home-py', '0');
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
  }

  openMainMenuFromGame() {
    if (this.getGameScene?.()?.networkMode === 'replay') {
      this._exitReplayUi();
      return;
    }
    this._closeModals();
    this._els.mainMenu.hidden = false;
    this._els.hud.hidden = true;
  }

  /** 回到首页：重置对局、解锁风格选择、显示主菜单（可重新选皮肤并开始游戏） */
  goHome() {
    const scene = this.getGameScene?.();
    if (scene?.networkMode === 'replay') {
      this._exitReplayUi();
      return;
    }
    const mustForfeit =
      scene?.networkMode === 'online' && !!scene.myOnlineColor && !scene.gameOver;
    if (mustForfeit) {
      this._online.emitForfeit('leave');
    }
    const finish = () => {
      this._shareGameId = '';
      this._shareRoomCode = '';
      this._syncShareHud();
      this._online.matchCancel();
      this._online.disconnect();
      if (scene?.resetGame) scene.resetGame();
      this._setStyleControlsLocked(false);
      this._closeModals();
      this._els.mainMenu.hidden = false;
      this._els.hud.hidden = true;
      this._els.hudHint.textContent = '操作：先点己方棋子，再点目标格或对方子';
      this._lastSyncPlayer = null;
      this._lastSyncMoves = -1;
      this._lastStatusText = '';
      this._lastGameOver = null;
      if (this._access) this._connectSocketAndWire();
      this._syncOnlineHudActions();
    };
    if (mustForfeit) setTimeout(finish, 80);
    else finish();
  }

  startGame() {
    if (this.getGameScene?.()?.networkMode === 'replay') {
      this._exitReplayUi();
    }
    const cfg = this._readStyleConfig();
    this.applyStyleConfig?.(cfg);
    this._setStyleControlsLocked(true);
    this._closeModals();

    this._els.mainMenu.hidden = true;
    this._els.hud.hidden = false;
    this._els.hudHint.textContent = '操作：先点己方棋子，再点目标格或对方子';
    this._lastSyncPlayer = null;
    this._lastSyncMoves = -1;
    this.syncGameState(this.getGameScene?.());
    this._syncOnlineHudActions();
  }

  openSettings() {
    this._openModal('style');
    this._els.menuHint.textContent =
      '在弹窗中选择「皮肤风格」「游戏风格」；对局开始后不可更改';
  }

  openHelp() {
    this._els.menuHint.textContent = '走棋：点己方棋子选中，再点空格或对方子走棋 / 吃子';
  }

  undoMove() {
    this._els.hudHint.textContent = '悔棋：尚未实现';
  }

  restartGame() {
    const scene = this.getGameScene?.();
    if (scene && !scene.canRestartLocal()) {
      this._els.hudHint.textContent =
        scene.networkMode === 'replay'
          ? '复盘模式请用底部滑块与按钮'
          : '联机对局不能本地重置，请使用「回到首页」';
      return;
    }
    if (scene?.resetGame) scene.resetGame();
    this._els.hudHint.textContent = '已重新开始对局';
    this._lastSyncPlayer = null;
    this._lastSyncMoves = -1;
    this._lastStatusText = '';
    this.syncGameState(scene);
  }

  syncGameState(gameScene) {
    if (!gameScene || this._els.hud.hidden) return;

    const moves = gameScene.halfMoveCount ?? 0;
    const player = gameScene.currentPlayer;
    const gameOver = !!gameScene.gameOver;

    let status = '对局中';
    if (gameOver) {
      status = gameScene.uiStatusLine || '对局结束';
    } else if (gameScene.uiStatusLine) {
      status = gameScene.uiStatusLine;
    }

    if (
      player !== this._lastSyncPlayer ||
      moves !== this._lastSyncMoves ||
      gameOver !== this._lastGameOver ||
      status !== this._lastStatusText
    ) {
      this._lastSyncPlayer = player;
      this._lastSyncMoves = moves;
      this._lastGameOver = gameOver;
      this._lastStatusText = status;

      const side = player === 'red' ? '红方' : '黑方';
      this._els.hudPlayer.textContent = `当前行棋：${side}`;
      this._els.hudPlayer.classList.toggle('game-ui-hud-player--red', player === 'red');
      this._els.hudPlayer.classList.toggle('game-ui-hud-player--black', player === 'black');

      this._els.hudTurn.textContent = `第 ${moves + 1} 手`;
      this._els.hudStatus.textContent = status;
    }
    if (gameScene.networkMode === 'replay') {
      this._syncReplayBar();
    }
    this._syncOnlineHudActions();
  }
}
