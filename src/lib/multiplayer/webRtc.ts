/**
 * WebRTC data-channel wrapper for the star topology (host ↔ each guest).
 * Browser-only.
 */

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

/**
 * ICE servers for race connections. Defaults to public STUN; production
 * deployments that need to traverse strict NATs should provide TURN via
 * NEXT_PUBLIC_RACE_ICE (JSON array of RTCIceServer, including credentials).
 */
export function getIceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_RACE_ICE;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as RTCIceServer[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      console.warn('[race] NEXT_PUBLIC_RACE_ICE is not valid JSON — using default STUN');
    }
  }
  return DEFAULT_ICE_SERVERS;
}

export interface PeerLinkHandlers {
  onMessage: (message: unknown) => void;
  onOpen: () => void;
  onClose: () => void;
  /** Local ICE candidate to relay to the remote peer via HTTP signaling. */
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onError?: (error: Error) => void;
}

/**
 * One RTCPeerConnection + one reliable data channel between this client and
 * a single remote peer. Messages are JSON-encoded RaceChannelMessage objects.
 */
export class PeerLink {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private closed = false;

  constructor(
    public readonly remotePeerId: string,
    private readonly handlers: PeerLinkHandlers
  ) {
    this.pc = new RTCPeerConnection({
      iceServers: getIceServers(),
      // Small races do not need bundling tricks; keep defaults predictable.
      bundlePolicy: 'max-bundle',
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.handlers.onIceCandidate(event.candidate.toJSON());
      }
    };
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      if (state === 'failed') {
        this.handlers.onError?.(new Error(`Connection to ${this.remotePeerId} failed`));
        this.close();
      } else if (state === 'closed' || state === 'disconnected') {
        this.close();
      }
    };
    this.pc.ondatachannel = (event) => {
      this.attachChannel(event.channel);
    };
  }

  get isOpen(): boolean {
    return this.channel !== null && this.channel.readyState === 'open';
  }

  /** Initiator path: create the channel and an offer to ship over signaling. */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.attachChannel(this.pc.createDataChannel('race', { ordered: true }));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.waitForIceGathering();
    return this.pc.localDescription ?? offer;
  }

  /** Responder path: consume the remote offer and produce an answer. */
  async acceptOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitForIceGathering();
    return this.pc.localDescription ?? answer;
  }

  async acceptAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (this.pc.signalingState === 'stable') return; // duplicate answer
    await this.pc.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (error) {
      // Stale candidates after close are harmless.
      if (!this.closed) {
        this.handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  send(message: unknown): boolean {
    if (!this.channel || this.channel.readyState !== 'open') return false;
    this.channel.send(JSON.stringify(message));
    return true;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.channel?.close();
    } catch {
      /* already closing */
    }
    try {
      this.pc.close();
    } catch {
      /* already closed */
    }
    this.handlers.onClose();
  }

  private attachChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.onopen = () => this.handlers.onOpen();
    channel.onclose = () => this.close();
    channel.onmessage = (event) => {
      try {
        this.handlers.onMessage(JSON.parse(event.data as string));
      } catch {
        this.handlers.onError?.(new Error('Received malformed channel message'));
      }
    };
  }

  /**
   * Wait until ICE gathering completes (or a short deadline). Ship-then-connect
   * via signaling is simpler than trickling and only costs ~1-2s on join.
   */
  private waitForIceGathering(timeoutMs = 2500): Promise<void> {
    if (this.pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const deadline = setTimeout(done, timeoutMs);
      const check = () => {
        if (this.pc.iceGatheringState === 'complete') done();
      };
      function done() {
        clearTimeout(deadline);
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
      const pc = this.pc;
      pc.addEventListener('icegatheringstatechange', check);
    });
  }
}
