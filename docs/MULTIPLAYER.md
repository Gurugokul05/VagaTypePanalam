# Multiplayer Races — Architecture (P2P WebRTC)

Status: **implemented, pending DB push + UI integration** (see ROADMAP).

## Why not Socket.IO

The original plan (`implementation_plan.md`) specified a Socket.IO server in
`apps/realtime/`. That requires a long-running process, which **Vercel
serverless functions cannot provide**. Since the site is Vercel-deployed with
a client-rendered UI and no heavy backend, multiplayer was redesigned as:

- **Gameplay**: peer-to-peer WebRTC data channels (host-authoritative star).
- **Signaling / matchmaking**: existing Next API routes + Neon Postgres
  (a short-lived "mailbox" table, polled at ~1.2 s).

No new hosting, no new vendors, works inside the current free tiers.

## Topology

```
        ┌──────────┐   data channel   ┌──────────┐
        │  Guest A │◀────────────────▶│          │
        └──────────┘                  │   HOST   │
        ┌──────────┐   data channel   │(browser) │
        │  Guest B │◀────────────────▶│          │
        └──────────┘                  └────┬─────┘
                                           │ HTTP (signaling only)
                                     /api/race/*  ──▶  Postgres
```

- The host owns: race text, start time, board state, placement, results.
- Guests connect **only** to the host (N−1 connections for N players).
- Clock sync: guests run 3 ping/pong rounds over the data channel and use the
  median offset; the host's `startAtHostMs` is converted to local time.
- Placement is assigned in the order the host *receives* `finish` messages.

## Data model (Prisma)

- `RaceRoom` — code (PK), hostPeerId, status (`open|started|closed`),
  capacity (2–4), skillBucket, isPublic, expiry (30 min).
- `RaceSignal` — autoincrement mailbox rows: roomCode, fromPeer, toPeer
  (null = broadcast), type, JSON payload (≤ 16 KB), createdAt.
- Roster & capacity are **derived** from join/leave signals (TTL-windowed).
- Expired rooms are purged lazily by the match/create routes (1 h grace).

## Delivery

| Layer | Where |
| --- | --- |
| Protocol/types/logic | `src/lib/multiplayer/{protocol,raceLogic}.ts` |
| HTTP signaling client | `src/lib/multiplayer/signalClient.ts` |
| WebRTC link wrapper | `src/lib/multiplayer/webRtc.ts` |
| Orchestrator (events) | `src/lib/multiplayer/raceSession.ts` |
| React hook (UI surface) | `src/lib/multiplayer/useRaceRoom.ts` |
| Server helpers | `src/lib/multiplayer/server.ts` |
| API routes | `src/app/api/race/**` |
| Frontend guide | `src/lib/multiplayer/README.md` |

## Limits & known trade-offs

- **Rate limits** (in-memory, per instance): create 10/min/IP, join
  30/min/IP, match 12/min/IP, signal 240/min/peer, poll 180/min/peer.
  Multi-instance deployments should move the limiter to a shared store.
- **No anti-cheat**: progress is peer-reported; fine for friendly races.
- **NAT traversal**: public STUN by default; set `NEXT_PUBLIC_RACE_ICE` with
  TURN credentials for strict networks (~10% of users).
- **Host disconnect aborts the race** (no host migration yet).
- **Polling-based signaling**: connection setup takes ~2–4 s; gameplay is
  unaffected (data channels are direct). SSE can replace polling later if
  lobby feel needs it.
- **Race results are not persisted** server-side yet (P2P only); a future
  leaderboard can POST host-verified results.

## Ops checklist (go-live)

1. `npx prisma db push` (adds the two tables; additive, no data loss).
2. Integrate `useRaceRoom` into `RacePage` (handoff doc linked above).
3. Two-profile manual test (`/race` in two browser profiles).
4. Optional: add TURN via `NEXT_PUBLIC_RACE_ICE`.
