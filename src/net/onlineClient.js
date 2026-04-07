import { io } from 'socket.io-client';
import { parseWatchInput } from './watchInput.js';

/**
 * Socket.IO 联机（经 devServer 代理到后端）
 */
export class OnlineGameClient {
  constructor() {
    /** @type {import('socket.io-client').Socket | null} */
    this.socket = null;
  }

  /** @param {string} accessToken */
  connect(accessToken) {
    this.disconnect();
    this.socket = io({
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 8000,
      timeout: 20000
    });
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  get connected() {
    return !!this.socket?.connected;
  }

  hasSocket() {
    return !!this.socket;
  }

  /** 已有实例时尝试重连，勿与 connect 混用导致重复 disconnect */
  reconnectSocket() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  matchJoin() {
    this.socket?.emit('match:join');
  }

  matchCancel() {
    this.socket?.emit('match:cancel');
  }

  roomCreate() {
    this.socket?.emit('room:create');
  }

  /** @param {string} code */
  roomJoin(code) {
    this.socket?.emit('room:join', { code: code.trim().toUpperCase() });
  }

  /**
   * 观战：6 位房间码（好友房开局后）或对局 UUID（快速匹配等可分享 ID 时）
   * @param {string} raw
   * @param {{ onStatus?: (msg: string) => void }} [opts] onStatus 用于「正在连接…」等提示
   */
  watchJoin(raw, opts = {}) {
    const onStatus = opts.onStatus;
    const parsed = parseWatchInput(raw);
    if (parsed.kind === 'empty') {
      onStatus?.('请输入对局 ID 或房间码');
      return;
    }
    const sock = this.socket;
    if (!sock) {
      onStatus?.('连接未就绪，请稍后重试');
      return;
    }
    const payload =
      parsed.kind === 'gameId'
        ? { gameId: parsed.value }
        : { code: parsed.value };
    const emit = () => {
      sock.emit('watch:join', payload);
    };
    if (sock.connected) {
      emit();
    } else {
      onStatus?.('正在连接服务器…');
      sock.once('connect', emit);
    }
  }

  gameSync() {
    this.socket?.emit('game:sync');
  }

  /** @param {{x:number,z:number}} from @param {{x:number,z:number}} to */
  emitMove(from, to) {
    this.socket?.emit('game:move', { from, to });
  }

  /** @param {'surrender'|'leave'} kind 认输 / 退出房间（均判对手胜） */
  emitForfeit(kind) {
    this.socket?.emit('game:forfeit', { kind });
  }
}
