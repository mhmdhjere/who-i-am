"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameDoc, PlayerDoc } from "./types";
import { ensureGameDoc, subscribeGame, subscribePlayer } from "./gameStore";
import { useAuthedUser } from "./useAuthedUser";

export function useGame() {
  const { user, ready: authReady, error: authError } = useAuthedUser();
  const [game, setGame] = useState<GameDoc | null>(null);
  const [player, setPlayer] = useState<PlayerDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubGame: (() => void) | null = null;
    let unsubPlayer: (() => void) | null = null;
    let cancelled = false;

    async function start() {
      if (!authReady) return;
      if (!user) return;
      try {
        setLoading(true);
        await ensureGameDoc();
        if (cancelled) return;

        unsubGame = subscribeGame(setGame);
        unsubPlayer = subscribePlayer(user.uid, setPlayer);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load game");
      } finally {
        setLoading(false);
      }
    }

    start();

    return () => {
      cancelled = true;
      unsubGame?.();
      unsubPlayer?.();
    };
  }, [authReady, user]);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const ready = useMemo(
    () => authReady && !!user && !!game && !loading,
    [authReady, user, game, loading]
  );

  return { user, game, player, loading, ready, error };
}

