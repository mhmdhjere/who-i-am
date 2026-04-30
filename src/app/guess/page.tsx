"use client";

export const dynamic = "force-dynamic";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhaseGate } from "@/components/PhaseGate";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  listPlayersOrdered,
  maybeAdvanceToWaiting,
  submitGuesses,
} from "@/lib/gameStore";
import { useGame } from "@/lib/useGame";
import type { PlayerDoc } from "@/lib/types";
import { phaseToPath } from "@/lib/routing";
import { ar } from "@/lib/i18n";

type GuessMap = Record<string, string>;

export default function GuessPage() {
  const router = useRouter();
  const { user, game, player, ready, loading, error } = useGame();

  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [fetching, setFetching] = useState(false);
  const [guesses, setGuesses] = useState<GuessMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!game) return;
    if (game.phase !== "guessing") router.replace(phaseToPath(game.phase));
  }, [game, router]);

  useEffect(() => {
    if (!player) return;
    setGuesses(player.guesses ?? {});
  }, [player]);

  useEffect(() => {
    if (!game) return;
    if (game.phase !== "guessing") return;
    setFetching(true);
    listPlayersOrdered()
      .then(setPlayers)
      .catch((e) =>
        setLocalError(e instanceof Error ? e.message : "تعذر تحميل اللاعبين")
      )
      .finally(() => setFetching(false));
  }, [game]);

  const nameOptions = useMemo(() => {
    return players.map((p) => ({ id: p.id, name: p.name }));
  }, [players]);

  const otherPlayerIds = useMemo(() => {
    if (!game?.playerOrder || !user) return [];
    return game.playerOrder.filter((id) => id !== user.uid);
  }, [game?.playerOrder, user]);
  const guessesPerPlayer = useMemo(() => {
    const n = game?.playerCount;
    if (typeof n !== "number" || !Number.isFinite(n)) return 15;
    return Math.max(1, Math.round(n) - 1);
  }, [game?.playerCount]);


  const answerOwners = useMemo(() => {
    const byId = new Map(players.map((p) => [p.id, p]));
    return otherPlayerIds
      .map((id) => byId.get(id))
      .filter((p): p is PlayerDoc => !!p);
  }, [players, otherPlayerIds]);

  const usedGuessedIds = useMemo(() => {
    const used = new Set(Object.values(guesses).filter(Boolean));
    return used;
  }, [guesses]);

  const completed = useMemo(() => {
    return otherPlayerIds.filter((ownerId) => guesses[ownerId])?.length ?? 0;
  }, [otherPlayerIds, guesses]);

  useEffect(() => {
    setIdx((v) => Math.min(v, Math.max(0, answerOwners.length - 1)));
  }, [answerOwners.length]);

  const canSubmit =
    !!user &&
    !!game &&
    !!player &&
    game.phase === "guessing" &&
    otherPlayerIds.length === guessesPerPlayer &&
    Object.keys(guesses).length >= guessesPerPlayer &&
    otherPlayerIds.every((id) => !!guesses[id]) &&
    new Set(Object.values(guesses)).size === guessesPerPlayer;

  async function onSubmit() {
    if (!user) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      // Persist only the required keys, in stable owner order.
      const payload: GuessMap = {};
      for (const ownerId of otherPlayerIds) payload[ownerId] = guesses[ownerId];

      // Extra client validation: no duplicates.
      const uniq = new Set(Object.values(payload));
      if (uniq.size !== guessesPerPlayer)
        throw new Error(ar.guessing.uniquePickError);

      await submitGuesses({ playerId: user.uid, guesses: payload });
      await maybeAdvanceToWaiting();
      router.replace("/waiting");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "تعذر إرسال التخمينات");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TopBar
        right={
          <span className="pill">
            {player?.name
              ? ar.common.you(player.name)
              : ready
                ? ar.common.notRegistered
                : ar.common.loading}
          </span>
        }
      />

      <div className="container fadeIn">
        {game ? <PhaseGate phase={game.phase} allow={["guessing"]} /> : null}

        <div className="stack" style={{ gap: 10, marginTop: 10 }}>
          <div className="pageTitle">{ar.guessing.title}</div>
          <div className="pageSubtitle">{ar.guessing.subtitle}</div>
        </div>

        <div style={{ height: 18 }} />

        {!player && ready && (
          <Card className="stack">
            <div style={{ fontWeight: 750, fontSize: 16 }}>
              {ar.guessing.notRegisteredTitle}
            </div>
            <div className="muted">{ar.guessing.notRegisteredSubtitle}</div>
            <Button variant="primary" onClick={() => router.replace("/")}>
              {ar.guessing.goToRegistration}
            </Button>
          </Card>
        )}

        {player && (
          <div className="stack">
            <Card className="stack">
              <ProgressBar
                value={guessesPerPlayer ? completed / guessesPerPlayer : 0}
                label={ar.guessing.progressLabel(completed, guessesPerPlayer)}
              />
              <div className="muted">
                {fetching || loading
                  ? ar.guessing.loadingProfiles
                  : ar.guessing.profileCount(idx + 1, answerOwners.length)}
              </div>
            </Card>

            <AnimatePresence mode="wait">
              <motion.div
                key={answerOwners[idx]?.id ?? "empty"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {answerOwners[idx] ? (
                  <Card className="stack">
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 750, fontSize: 16 }}>
                        {ar.guessing.answersTitle}
                      </div>
                      <span className="pill">{ar.guessing.whoIsThis}</span>
                    </div>

                    <div className="stack" style={{ gap: 10 }}>
                      {(answerOwners[idx].answers ?? []).map((a, i) => (
                        <div key={i} className="cardSoft stack" style={{ gap: 6 }}>
                          <div className="muted">
                            {game?.questions?.[i] ?? `سؤال ${i + 1}`}
                          </div>
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{a}</div>
                        </div>
                      ))}
                    </div>

                    <div className="divider" />

                    {(() => {
                      const owner = answerOwners[idx]!;
                      const current = guesses[owner.id] ?? "";
                      return (
                        <div className="stack" style={{ gap: 10 }}>
                          <div className="stack" style={{ gap: 6 }}>
                            <label>{ar.guessing.whoIsThis}</label>
                            <select
                              value={current}
                              onChange={(e) => {
                                const guessedId = e.target.value;
                                setGuesses((prev) => ({ ...prev, [owner.id]: guessedId }));
                                setLocalError(null);

                                // Subtle UX: advance when a selection is made.
                                setTimeout(() => {
                                  setIdx((v) => Math.min(answerOwners.length - 1, v + 1));
                                }, 120);
                              }}
                              disabled={submitting || game?.phase !== "guessing"}
                            >
                              <option value="" disabled>
                                {ar.guessing.selectName}
                              </option>
                              {nameOptions.map((opt) => {
                                const taken = usedGuessedIds.has(opt.id) && opt.id !== current;
                                return (
                                  <option key={opt.id} value={opt.id} disabled={taken}>
                                    {opt.name}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="muted">
                              {ar.guessing.duplicatesDisabled}
                            </div>
                          </div>

                          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                            <Button
                              type="button"
                              onClick={() => setIdx((v) => Math.max(0, v - 1))}
                              disabled={idx === 0 || submitting}
                            >
                              {ar.guessing.back}
                            </Button>

                            {idx < answerOwners.length - 1 ? (
                              <Button
                                type="button"
                                variant="primary"
                                onClick={() => setIdx((v) => Math.min(answerOwners.length - 1, v + 1))}
                                disabled={submitting}
                              >
                                {ar.guessing.next}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="success"
                                onClick={onSubmit}
                                disabled={!canSubmit || submitting}
                              >
                                {submitting ? ar.guessing.submitting : ar.guessing.submitGuesses}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                ) : (
                  <Card className="stack">
                    <div style={{ fontWeight: 750, fontSize: 16 }}>{ar.guessing.preparing}</div>
                    <div className="muted">{ar.guessing.preparingSub}</div>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>

            {(error || localError) && <div className="errorBox">{error || localError}</div>}
          </div>
        )}
      </div>
    </>
  );
}

