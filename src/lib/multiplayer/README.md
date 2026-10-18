# Multiplayer Races (P2P)

Real-time typing races between 2–4 players. **No gameplay server**: browsers
connect directly via WebRTC data channels (star topology, host-authoritative).
Vercel + Postgres is used only for room discovery, quick-match and WebRTC
signaling — nothing on the gameplay path.

```
Guests ──WebRTC data channels──▶ Host
   │                              │
   └──── /api/race/* (HTTP) ──────┘   ← signaling + lobby only
             │
         Postgres (rooms, signaling mailbox)
```

## Quick start (in a client component)

```tsx
'use client';
import { useRaceRoom } from '@/lib/multiplayer/useRaceRoom';

function RaceLobby() {
  const room = useRaceRoom();

  // Host a private room
  await room.create({ name: 'Harish', wpm: 52, isPublic: false });

  // Join by code
  await room.join('ABC23', { name: 'Guest', wpm: 48 });

  // Quick match (hosts a room if none found nearby)
  await room.quickMatch({ name: 'Harish', wpm: 52 });
}
```

State exposed by the hook: `state`, `role`, `code`, `roster`, `board`,
`race`, `results`, `closedReason`, `error`, `allConnected`, `busy`.
Actions: `create`, `join`, `quickMatch`, `start(text)`,
`reportProgress(charIndex, wpm, accuracy, finished)`, `close`, `reset`.

## Wiring the typing UI

1. **Lobby**: render `roster`; host enables "Start" when `allConnected`
   (≥1 guest connected). Guests see "waiting for host…".
2. **Start (host)**: `room.start(text)` — ship any text you already generate
   for solo races (50–3000 chars, validated server-less client-side too).
3. **Countdown (everyone)**: on the `race` event, run your own countdown until
   `race.startAtLocalMs` (epoch ms, already clock-synced to the host). The
   text to type is `race.text` — identical on every client.
4. **While typing**: call
   `room.reportProgress(currentCharIndex, currentWpm, accuracy)` on each
   progress change (throttled internally to 5 Hz) and once with
   `finished: true` when the player completes the text. Report the same
   numbers you show in your own HUD.
5. **During the race**: render `board` (all players: `charIndex`, `wpm`,
   `accuracy`, `finished`, `place`, `connected`) — e.g. reuse the existing
   race lane visuals, one lane per board entry.
6. **Finish**: on `results` show standings (`players` sorted, `place`, plus
   `endedReason`); reuse `Confetti` / results styling. `closedReason` fires
   when the host leaves — show an abort state.
7. **Cleanup**: call `room.close()` (host closes the room; guests just leave)
   or `room.reset()` to return to solo racing.

## Events / states

`state`: `idle → connecting → lobby → racing → finished → closed`.
`results.endedReason`: `all-finished | host-closed | timeout | aborted`.

## Integration notes

- **Host-authoritative**: the host owns the clock, text, board and placement.
  Placement = order in which the host *receives* each `finish` message.
- **Disconnects**: a guest channel closing = DNF (marked disconnected on the
  board); host leaving = race closed for everyone.
- **Text**: the host's text ships over the data channel; do not generate it
  independently on guests.
- **Bots**: keep the existing local bot-race mode as-is; this module does not
  handle bots. (Later: host can simulate bots into `board` if wanted — the
  types already carry `isBot`.)
- **No anti-cheat**: progress values are peer-reported. Fine for friendly
  races; ranked play would need server validation (future work).

## Testing locally

```bash
npm run dev
# Open http://localhost:3000/race in two browser profiles
# Profile A: create room → copy code. Profile B: join with the code.
```

WebRTC works between two tabs/profiles on one machine (loopback ICE).
`IPV6`/corporate networks may block P2P; set `NEXT_PUBLIC_RACE_ICE` (see
below) with a TURN server for those cases.

## Environment

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_RACE_ICE` | Optional JSON array of `RTCIceServer` (e.g. with TURN credentials). Defaults to Google STUN. |

TURN is only needed when direct P2P fails (~10% of consumer networks).
Any managed TURN provider works (e.g. metered.ca, Twilio NTS).

## API surface (server side)

| Route | Purpose |
| --- | --- |
| `POST /api/race/room` | Create a lobby |
| `POST /api/race/room/[code]/join` | Join by code (capacity + status enforced) |
| `POST /api/race/room/[code]/signal` | Relay offer/answer/ICE + lifecycle |
| `GET /api/race/room/[code]/signal` | Poll mailbox + roster + room status |
| `POST /api/race/room/[code]/leave` | Leave / close |
| `POST /api/race/match` | Quick match (skill bucket ±1, oldest room first) |

Rate limits: create 10/min/IP, join 30/min/IP, match 12/min/IP,
signal 240/min/peer, poll 180/min/peer. Rooms expire after 30 minutes.

## Files

| File | Role |
| --- | --- |
| `protocol.ts` | Constants + message/event types (client & server) |
| `raceLogic.ts` | Pure logic: codes, buckets, clock math, board reducer |
| `signalClient.ts` | HTTP signaling + polling (`SignalPoller`) |
| `webRtc.ts` | `PeerLink` — one RTCPeerConnection + data channel |
| `raceSession.ts` | Orchestrator (`RaceSession`) — all protocol flows |
| `useRaceRoom.ts` | React binding (this is what UI code should import) |
| `server.ts` | Server helpers (routes only) |
| `raceLogic.test.ts` | Unit tests for the pure logic |
