/**
 * RaceSession — framework-agnostic multiplayer race orchestrator (browser-only).
 *
 * Host-authoritative star topology:
 *   - The host owns the room, clock, text, board and results.
 *   - Guests connect directly to the host over one WebRTC data channel.
 *   - HTTP/Postgres signaling is used only for connection establishment.
 *
 * Events are delivered through `session.on(...)`; see RaceSessionEvents.
 */

import {
  BOARD_BROADCAST_INTERVAL_MS,
  CLOCK_SYNC_ROUNDS,
  HOST_DNF_GRACE_MS,
  PROGRESS_SEND_INTERVAL_MS,
  RACE_MAX_DURATION_MS,
  RACE_START_DELAY_MS,
  isProgressPayload,
  isValidPlayerName,
  type RaceChannelMessage,
  type RaceEndedReason,
  type RacePlayerState,
  type RaceResultsEntry,
} from './protocol';
import {
  applyProgress,
  hostTimeToLocal,
  isRaceComplete,
  markDisconnected,
  medianClockOffset,
  newBoardEntry,
  toResults,
  validateRaceText,
  type ClockSample,
} from './raceLogic';
import {
  SignalPoller,
  createPeerId,
  createRoom,
  joinRoom,
  leaveRoom,
  leaveRoomBeacon,
  quickMatch,
  sendSignal,
  type RosterEntry,
} from './signalClient';
import { PeerLink } from './webRtc';

export type RaceSessionState = 'idle' | 'connecting' | 'lobby' | 'countdown' | 'racing' | 'finished' | 'closed';
export type RaceRole = 'host' | 'guest';

export interface RaceSessionEvents {
  state: (state: RaceSessionState) => void;
  matched: (info: { role: RaceRole; code: string }) => void;
  roster: (roster: RosterEntry[]) => void;
  board: (players: RacePlayerState[]) => void;
  started: (info: { text: string; startAtLocalMs: number }) => void;
  results: (payload: { players: RaceResultsEntry[]; endedReason: RaceEndedReason }) => void;
  closed: (info: { reason: 'host-left' | 'room-closed' | 'room-gone' }) => void;
  error: (error: Error) => void;
}

export interface RaceSessionOptions {
  name: string;
  wpm?: number;
  capacity?: number;
  isPublic?: boolean;
}

type Listener<K extends keyof RaceSessionEvents> = RaceSessionEvents[K];

export class RaceSession {
  readonly peerId: string;
  private readonly options: RaceSessionOptions;

  role: RaceRole | null = null;
  code: string | null = null;
  hostPeerId: string | null = null;

  private state: RaceSessionState = 'idle';
  private poller: SignalPoller | null = null;
  private links = new Map<string, PeerLink>();
  private roster: RosterEntry[] = [];
  private board: RacePlayerState[] = [];
  private offsetToHostMs = 0;
  private raceText: string | null = null;
  private startAtHostMs = 0;

  private boardTimer: ReturnType<typeof setInterval> | null = null;
  private dnfTimer: ReturnType<typeof setInterval> | null = null;
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
  private progressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastProgressSentAt = 0;
  private pendingProgress: { charIndex: number; wpm: number; accuracy: number; finished: boolean } | null = null;
  private lastProgressAt = new Map<string, number>();
  private clockSamples: ClockSample[] = [];
  private pendingPongs = new Map<number, (t1: number) => void>();
  private hostName: string | null = null;

  private listeners: { [K in keyof RaceSessionEvents]: Set<Listener<K>> } = {
    state: new Set(),
    matched: new Set(),
    roster: new Set(),
    board: new Set(),
    started: new Set(),
    results: new Set(),
    closed: new Set(),
    error: new Set(),
  };

  // ── Construction ──

  private constructor(options: RaceSessionOptions) {
    this.options = options;
    this.peerId = createPeerId();
  }

  static assertBrowser(): void {
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      throw new Error('Multiplayer races require a browser environment');
    }
  }

  /** Create a room and become its host. */
  static async create(options: RaceSessionOptions): Promise<RaceSession> {
    RaceSession.assertBrowser();
    if (!isValidPlayerName(options.name)) throw new Error('Invalid player name');

    const session = new RaceSession(options);
    const { code } = await createRoom({
      peerId: session.peerId,
      name: options.name,
      wpm: options.wpm,
      capacity: options.capacity,
      isPublic: options.isPublic,
    });
    session.role = 'host';
    session.code = code;
    session.hostPeerId = session.peerId;
    session.beginPolling();
    session.setState('lobby');
    session.emit('matched', { role: 'host', code });
    return session;
  }

  /** Join an existing room by code as a guest. */
  static async join(code: string, options: RaceSessionOptions): Promise<RaceSession> {
    RaceSession.assertBrowser();
    if (!isValidPlayerName(options.name)) throw new Error('Invalid player name');

    const session = new RaceSession(options);
    const joined = await joinRoom(code, { peerId: session.peerId, name: options.name, wpm: options.wpm });
    session.role = 'guest';
    session.code = code;
    session.hostPeerId = joined.hostPeerId;
    session.roster = joined.roster;
    session.beginPolling();
    session.connectToHost();
    session.setState('lobby');
    session.emit('matched', { role: 'guest', code });
    return session;
  }

  /** Quick match: join a nearby open room or become the host of a new one. */
  static async match(options: RaceSessionOptions): Promise<RaceSession> {
    RaceSession.assertBrowser();
    if (!isValidPlayerName(options.name)) throw new Error('Invalid player name');

    const session = new RaceSession(options);
    const result = await quickMatch({
      peerId: session.peerId,
      name: options.name,
      wpm: options.wpm,
      capacity: options.capacity,
    });

    session.role = result.role;
    session.code = result.code;

    if (result.role === 'host') {
      session.hostPeerId = session.peerId;
      session.beginPolling();
      session.setState('lobby');
      session.emit('matched', { role: 'host', code: result.code });
      return session;
    }

    session.hostPeerId = result.hostPeerId;
    session.roster = result.roster ?? [];
    session.beginPolling();
    session.connectToHost();
    session.setState('lobby');
    session.emit('matched', { role: 'guest', code: result.code });
    return session;
  }

  // ── Public API ──

  on<K extends keyof RaceSessionEvents>(event: K, listener: Listener<K>): () => void {
    this.listeners[event].add(listener);
    return () => this.listeners[event].delete(listener);
  }

  get currentState(): RaceSessionState {
    return this.state;
  }

  get isHost(): boolean {
    return this.role === 'host';
  }

  get rosterSnapshot(): RosterEntry[] {
    return [...this.roster];
  }

  get boardSnapshot(): RacePlayerState[] {
    return this.board.map(p => ({ ...p }));
  }

  get startAtLocalMs(): number {
    return this.raceText ? hostTimeToLocal(this.startAtHostMs, this.offsetToHostMs) : 0;
  }

  /** True when every roster member has an open data channel (host: ready to start). */
  get allConnected(): boolean {
    if (!this.isHost) return this.links.get(this.hostPeerId ?? '')?.isOpen ?? false;
    const guests = this.roster.filter(r => !r.isHost);
    return guests.length > 0 && guests.every(g => this.links.get(g.peerId)?.isOpen);
  }

  /**
   * Host only — begin the race with the given text. The text is shipped over
   * the data channels; every client races the identical string.
   */
  startRace(text: string): void {
    if (!this.isHost || !this.code) throw new Error('Only the host can start the race');
    const check = validateRaceText(text);
    if (!check.valid) throw new Error(check.error);

    this.raceText = text;
    this.startAtHostMs = Date.now() + RACE_START_DELAY_MS;

    // Initialize the board from the roster (plus the host).
    this.board = [
      newBoardEntry(this.peerId, this.options.name),
      ...this.roster.filter(r => !r.isHost).map(r => newBoardEntry(r.peerId, r.name)),
    ];
    this.emit('board', this.boardSnapshot);

    this.broadcast({ type: 'start', text, startAtHostMs: this.startAtHostMs });
    this.setState('racing');
    this.emit('started', { text, startAtLocalMs: this.startAtHostMs });

    // Mark the room started so late joiners are rejected.
    void sendSignal(this.code, this.peerId, null, 'started', {}).catch(err => this.emitError(err));

    this.beginRaceTimers();
  }

  /**
   * Report the local player's progress (called by the typing UI, ~per keystroke
   * or on a timer — internally throttled to PROGRESS_SEND_INTERVAL_MS).
   */
  reportProgress(charIndex: number, wpm: number, accuracy: number, finished = false): void {
    if (this.state !== 'racing' && this.state !== 'countdown') return;

    if (this.isHost) {
      this.board = applyProgress(this.board, this.peerId, { charIndex, wpm, accuracy }, finished);
      this.emit('board', this.boardSnapshot);
      if (finished) this.maybeFinishRace();
      return;
    }

    const now = Date.now();
    const send = () => {
      this.lastProgressSentAt = Date.now();
      const p = this.pendingProgress;
      this.pendingProgress = null;
      if (!p) return;
      this.sendToHost(p.finished ? { type: 'finish', charIndex: p.charIndex, wpm: p.wpm, accuracy: p.accuracy } : { type: 'progress', charIndex: p.charIndex, wpm: p.wpm, accuracy: p.accuracy });
    };

    if (finished) {
      this.pendingProgress = { charIndex, wpm, accuracy, finished };
      if (this.progressTimer) {
        clearTimeout(this.progressTimer);
        this.progressTimer = null;
      }
      send();
      return;
    }

    if (now - this.lastProgressSentAt >= PROGRESS_SEND_INTERVAL_MS) {
      this.pendingProgress = { charIndex, wpm, accuracy, finished };
      send();
    } else {
      this.pendingProgress = { charIndex, wpm, accuracy, finished };
      if (this.progressTimer === null) {
        this.progressTimer = setTimeout(() => {
          this.progressTimer = null;
          send();
        }, PROGRESS_SEND_INTERVAL_MS);
      }
    }
  }

  /** Host closes the room for everyone; guests just leave. */
  async close(): Promise<void> {
    if (this.code) {
      if (this.isHost) {
        try {
          await sendSignal(this.code, this.peerId, null, 'closed', {});
        } catch {
          /* best-effort */
        }
      }
      try {
        await leaveRoom(this.code, this.peerId);
      } catch {
        /* best-effort */
      }
    }
    this.teardown();
    this.setState('closed');
  }

  /** Page-unload cleanup: beacon + local teardown, no awaits. */
  leaveOnUnload(): void {
    if (!this.code) return;
    leaveRoomBeacon(this.code, this.peerId);
  }

  /** Stop timers/polling without telling the server (React unmount, tests). */
  destroy(): void {
    this.teardown();
  }

  // ── Internals ──

  private setState(state: RaceSessionState): void {
    if (this.state === state) return;
    this.state = state;
    this.emit('state', state);
  }

  private emit<K extends keyof RaceSessionEvents>(event: K, ...args: Parameters<RaceSessionEvents[K]>): void {
    for (const listener of this.listeners[event]) {
      try {
        (listener as (...a: unknown[]) => void)(...args);
      } catch (error) {
        console.error(`[race] listener for "${String(event)}" threw:`, error);
      }
    }
  }

  private emitError(error: unknown): void {
    this.emit('error', error instanceof Error ? error : new Error(String(error)));
  }

  private beginPolling(): void {
    if (!this.code) return;
    this.poller = new SignalPoller(this.code, this.peerId, {
      onSignals: room => this.handleRoomUpdate(room),
      onClosed: reason => {
        this.teardown();
        this.setState('closed');
        this.emit('closed', { reason });
      },
      onError: err => this.emitError(err),
    });
    this.poller.start();
  }

  private handleRoomUpdate(room: { status: string; roster: RosterEntry[]; signals: { id: number; from: string; to: string | null; type: string; payload: unknown }[] }): void {
    if (room.status === 'closed') return;
    this.roster = room.roster;
    this.emit('roster', this.rosterSnapshot);

    for (const signal of room.signals) {
      if (signal.from === this.peerId) continue;
      if (this.isHost) this.handleGuestSignal(signal);
      else this.handleHostSignal(signal);
    }
  }

  private handleGuestSignal(signal: { from: string; type: string; payload: unknown }): void {
    const payload = (signal.payload ?? {}) as Record<string, unknown>;
    switch (signal.type) {
      case 'offer': {
        const sdp = payload as unknown as RTCSessionDescriptionInit;
        const link = this.ensureLink(signal.from, false);
        void link
          .acceptOffer(sdp)
          .then(answer => sendSignal(this.code!, this.peerId, signal.from, 'answer', answer))
          .catch(err => this.emitError(err));
        break;
      }
      case 'ice': {
        const link = this.links.get(signal.from);
        if (link) void link.addIceCandidate(payload as RTCIceCandidateInit);
        break;
      }
      case 'leave': {
        this.links.get(signal.from)?.close();
        this.links.delete(signal.from);
        this.board = markDisconnected(this.board, signal.from);
        this.emit('board', this.boardSnapshot);
        this.maybeFinishRace();
        break;
      }
      default:
        break;
    }
  }

  private handleHostSignal(signal: { from: string; type: string; payload: unknown }): void {
    const payload = (signal.payload ?? {}) as Record<string, unknown>;
    const hostLink = this.links.get('host');
    switch (signal.type) {
      case 'answer': {
        if (hostLink) {
          void hostLink.acceptAnswer(payload as unknown as RTCSessionDescriptionInit).catch(err => this.emitError(err));
        }
        break;
      }
      case 'ice': {
        if (hostLink) void hostLink.addIceCandidate(payload as RTCIceCandidateInit);
        break;
      }
      case 'closed': {
        this.teardown();
        this.setState('closed');
        this.emit('closed', { reason: 'room-closed' });
        break;
      }
      default:
        break;
    }
  }

  private connectToHost(): void {
    const target = this.hostPeerId;
    if (!target) return;
    this.setState('connecting');
    const link = this.ensureLink(target, true);
    void link
      .createOffer()
      .then(offer => sendSignal(this.code!, this.peerId, target, 'offer', offer))
      .catch(err => this.emitError(err));
  }

  private ensureLink(remotePeerId: string, initiator: boolean): PeerLink {
    const key = this.isHost ? remotePeerId : 'host';
    const existing = this.links.get(key);
    if (existing) return existing;

    const link = new PeerLink(remotePeerId, {
      onMessage: message => this.handleChannelMessage(key, message),
      onOpen: () => this.handleLinkOpen(key),
      onClose: () => {
        this.links.delete(key);
        if (!this.isHost) {
          this.teardown();
          this.setState('closed');
          this.emit('closed', { reason: 'host-left' });
        } else {
          this.board = markDisconnected(this.board, key);
          this.emit('board', this.boardSnapshot);
          this.maybeFinishRace();
        }
      },
      onIceCandidate: candidate => {
        void sendSignal(this.code!, this.peerId, remotePeerId, 'ice', candidate).catch(err => this.emitError(err));
      },
      onError: err => this.emitError(err),
    });
    this.links.set(key, link);
    return link;
  }

  private handleLinkOpen(key: string): void {
    if (this.isHost) {
      const guest = this.roster.find(r => r.peerId === key);
      this.links.get(key)?.send({
        type: 'welcome',
        name: guest?.name ?? 'Player',
        capacity: this.options.capacity ?? 4,
        peers: [this.peerId, ...this.links.keys()].filter(id => id !== key),
      } satisfies RaceChannelMessage);
    } else {
      void this.runClockSync();
      this.links.get('host')?.send({ type: 'hello', name: this.options.name, wpm: this.options.wpm ?? 0 } satisfies RaceChannelMessage);
    }
  }

  private async runClockSync(): Promise<void> {
    const link = this.links.get('host');
    if (!link) return;
    this.clockSamples = [];

    for (let round = 0; round < CLOCK_SYNC_ROUNDS; round++) {
      await new Promise<void>(resolve => {
        const t0 = Date.now();
        const timeout = setTimeout(resolve, 1500);
        this.pendingPongs.set(t0, t1 => {
          clearTimeout(timeout);
          this.clockSamples.push({ t0, t1, t2: Date.now() });
          resolve();
        });
        this.sendToHost({ type: 'clock-ping', t0 });
      });
      await new Promise(r => setTimeout(r, 60));
    }

    if (this.clockSamples.length > 0) {
      this.offsetToHostMs = medianClockOffset(this.clockSamples);
    }
  }

  private sendToHost(message: RaceChannelMessage): boolean {
    return this.links.get('host')?.send(message) ?? false;
  }

  private broadcast(message: RaceChannelMessage): void {
    for (const link of this.links.values()) link.send(message);
  }

  private handleChannelMessage(fromKey: string, message: unknown): void {
    const msg = message as RaceChannelMessage;
    if (typeof msg !== 'object' || msg === null || typeof (msg as { type?: unknown }).type !== 'string') return;

    if (this.isHost) {
      switch (msg.type) {
        case 'progress':
        case 'finish': {
          if (!isProgressPayload(msg)) return;
          this.lastProgressAt.set(fromKey, Date.now());
          this.board = applyProgress(this.board, fromKey, msg, msg.type === 'finish');
          this.emit('board', this.boardSnapshot);
          if (msg.type === 'finish') this.maybeFinishRace();
          break;
        }
        case 'hello':
          this.lastProgressAt.set(fromKey, Date.now());
          break;
        case 'bye':
          this.links.get(fromKey)?.close();
          break;
        default:
          break;
      }
      return;
    }

    switch (msg.type) {
      case 'clock-pong': {
        const resolve = this.pendingPongs.get(msg.t0);
        if (resolve) {
          this.pendingPongs.delete(msg.t0);
          resolve(msg.t1);
        }
        break;
      }
      case 'start': {
        const check = validateRaceText(msg.text);
        if (!check.valid) {
          this.emitError(new Error(`Host sent invalid race text: ${check.error}`));
          return;
        }
        this.raceText = msg.text;
        this.startAtHostMs = msg.startAtHostMs;
        this.board = [
          newBoardEntry(this.hostPeerId ?? 'host', this.hostName ?? 'Host'),
          newBoardEntry(this.peerId, this.options.name),
        ];
        this.setState('racing');
        this.emit('started', { text: msg.text, startAtLocalMs: hostTimeToLocal(msg.startAtHostMs, this.offsetToHostMs) });
        break;
      }
      case 'welcome': {
        if (typeof msg.name === 'string' && msg.name.length > 0) {
          this.hostName = msg.name;
        }
        break;
      }
      case 'board': {
        this.board = msg.players;
        this.emit('board', this.boardSnapshot);
        break;
      }
      case 'results': {
        this.clearRaceTimers();
        this.setState('finished');
        this.emit('results', { players: msg.players, endedReason: msg.endedReason });
        break;
      }
      default:
        break;
    }
  }

  private beginRaceTimers(): void {
    if (this.boardTimer) clearInterval(this.boardTimer);
    this.boardTimer = setInterval(() => {
      this.broadcast({ type: 'board', players: this.boardSnapshot, startAtHostMs: this.startAtHostMs });
    }, BOARD_BROADCAST_INTERVAL_MS);

    if (this.dnfTimer) clearInterval(this.dnfTimer);
    this.dnfTimer = setInterval(() => {
      const now = Date.now();
      for (const p of this.board) {
        if (p.finished || !p.connected) continue;
        const last = this.lastProgressAt.get(p.peerId) ?? this.startAtHostMs;
        if (now - last > HOST_DNF_GRACE_MS) {
          this.board = markDisconnected(this.board, p.peerId);
        }
      }
      this.emit('board', this.boardSnapshot);
      this.maybeFinishRace();
    }, 5000);

    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
    this.maxDurationTimer = setTimeout(() => this.endRace('timeout'), RACE_MAX_DURATION_MS);
  }

  private maybeFinishRace(): void {
    if (!this.isHost || !this.raceText) return;
    if (isRaceComplete(this.board)) {
      this.endRace('all-finished');
    }
  }

  private endRace(reason: RaceEndedReason): void {
    if (this.state === 'finished' || this.state === 'closed') return;
    this.clearRaceTimers();
    const players = toResults(this.board);
    this.broadcast({ type: 'results', players, endedReason: reason });
    this.setState('finished');
    this.emit('results', { players, endedReason: reason });
  }

  private clearRaceTimers(): void {
    if (this.boardTimer) clearInterval(this.boardTimer);
    if (this.dnfTimer) clearInterval(this.dnfTimer);
    if (this.maxDurationTimer) clearTimeout(this.maxDurationTimer);
    if (this.progressTimer) clearTimeout(this.progressTimer);
    this.boardTimer = null;
    this.dnfTimer = null;
    this.maxDurationTimer = null;
    this.progressTimer = null;
    this.pendingProgress = null;
    this.pendingPongs.clear();
  }

  private teardown(): void {
    this.clearRaceTimers();
    this.poller?.stop();
    this.poller = null;
    for (const link of this.links.values()) link.close();
    this.links.clear();
  }
}
