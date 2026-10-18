'use client';

/**
 * useRaceRoom — thin React binding around RaceSession for the race UI.
 *
 * The session object is created once per hook instance and torn down on
 * unmount. All UI state is exposed as React state; actions are stable
 * callbacks. Browser-only (never import from a server component).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { RaceSession, type RaceRole, type RaceSessionOptions, type RaceSessionState } from './raceSession';
import type { RaceEndedReason, RacePlayerState, RaceResultsEntry } from './protocol';
import type { RosterEntry } from './signalClient';

export interface UseRaceRoomResult {
  /** Current lifecycle state of the session. */
  state: RaceSessionState;
  role: RaceRole | null;
  code: string | null;
  roster: RosterEntry[];
  board: RacePlayerState[];
  /** Emitted when the race starts: identical text + synchronized start time. */
  race: { text: string; startAtLocalMs: number } | null;
  results: { players: RaceResultsEntry[]; endedReason: RaceEndedReason } | null;
  closedReason: 'host-left' | 'room-closed' | 'room-gone' | null;
  error: string | null;
  /** True when every roster member has an open data channel. */
  allConnected: boolean;
  busy: boolean;

  create: (options: RaceSessionOptions) => Promise<RaceSession | null>;
  join: (code: string, options: RaceSessionOptions) => Promise<RaceSession | null>;
  quickMatch: (options: RaceSessionOptions) => Promise<RaceSession | null>;
  start: (text: string) => void;
  reportProgress: (charIndex: number, wpm: number, accuracy: number, finished?: boolean) => void;
  close: () => Promise<void>;
  reset: () => void;
  /** Escape hatch for advanced UI needs (e.g. raw roster updates). */
  session: RaceSession | null;
}

export function useRaceRoom(): UseRaceRoomResult {
  const sessionRef = useRef<RaceSession | null>(null);
  const unloadListenerRef = useRef<(() => void) | null>(null);
  const [session, setSession] = useState<RaceSession | null>(null);
  const [state, setState] = useState<RaceSessionState>('idle');
  const [role, setRole] = useState<RaceRole | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [board, setBoard] = useState<RacePlayerState[]>([]);
  const [race, setRace] = useState<{ text: string; startAtLocalMs: number } | null>(null);
  const [results, setResults] = useState<{ players: RaceResultsEntry[]; endedReason: RaceEndedReason } | null>(null);
  const [closedReason, setClosedReason] = useState<'host-left' | 'room-closed' | 'room-gone' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allConnected, setAllConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  const attach = useCallback((next: RaceSession) => {
    if (unloadListenerRef.current) {
      window.removeEventListener('beforeunload', unloadListenerRef.current);
      unloadListenerRef.current = null;
    }
    sessionRef.current?.destroy();
    sessionRef.current = next;
    setSession(next);

    setRole(next.role);
    setCode(next.code);
    setRace(null);
    setResults(null);
    setClosedReason(null);
    setError(null);
    setBoard([]);

    next.on('state', s => {
      setState(s);
      setAllConnected(next.allConnected);
    });
    next.on('roster', r => {
      setRoster(r);
      setAllConnected(next.allConnected);
    });
    next.on('board', b => setBoard(b));
    next.on('started', info => setRace(info));
    next.on('results', payload => setResults(payload));
    next.on('closed', info => setClosedReason(info.reason));
    next.on('error', err => setError(err.message));

    const unload = () => next.leaveOnUnload();
    window.addEventListener('beforeunload', unload);
    unloadListenerRef.current = unload;
  }, []);

  useEffect(() => {
    setState(sessionRef.current?.currentState ?? 'idle');
    return () => {
      if (unloadListenerRef.current) {
        window.removeEventListener('beforeunload', unloadListenerRef.current);
        unloadListenerRef.current = null;
      }
      sessionRef.current?.leaveOnUnload();
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  const run = useCallback(async (factory: () => Promise<RaceSession>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await factory();
      attach(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [attach]);

  const create = useCallback(
    (options: RaceSessionOptions) => run(() => RaceSession.create(options)),
    [run]
  );

  const join = useCallback(
    (roomCode: string, options: RaceSessionOptions) => run(() => RaceSession.join(roomCode, options)),
    [run]
  );

  const quickMatch = useCallback(
    (options: RaceSessionOptions) => run(() => RaceSession.match(options)),
    [run]
  );

  const start = useCallback((text: string) => {
    try {
      sessionRef.current?.startRace(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const reportProgress = useCallback((charIndex: number, wpm: number, accuracy: number, finished = false) => {
    sessionRef.current?.reportProgress(charIndex, wpm, accuracy, finished);
  }, []);

  const close = useCallback(async () => {
    await sessionRef.current?.close();
  }, []);

  const reset = useCallback(() => {
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setSession(null);
    setState('idle');
    setRole(null);
    setCode(null);
    setRoster([]);
    setBoard([]);
    setRace(null);
    setResults(null);
    setClosedReason(null);
    setError(null);
    setBusy(false);
  }, []);

  return {
    state, role, code, roster, board, race, results, closedReason, error, allConnected, busy,
    create, join, quickMatch, start, reportProgress, close, reset, session,
  };
}
