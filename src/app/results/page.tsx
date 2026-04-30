"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhaseGate } from "@/components/PhaseGate";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { listPlayersOrdered } from "@/lib/gameStore";
import { useGame } from "@/lib/useGame";
import type { PlayerDoc } from "@/lib/types";
import { phaseToPath } from "@/lib/routing";
import { ar } from "@/lib/i18n";

export default function ResultsPage() {
  const router = useRouter();
  const { game, player, ready } = useGame();
  const guessesPerPlayer =
    typeof game?.playerCount === "number" && Number.isFinite(game.playerCount)
      ? Math.max(1, Math.round(game.playerCount) - 1)
      : 15;
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!game) return;
    if (game.phase !== "results") router.replace(phaseToPath(game.phase));
  }, [game, router]);

  useEffect(() => {
    if (!game) return;
    if (game.phase !== "results") return;
    setLoadingPlayers(true);
    listPlayersOrdered()
      .then(setPlayers)
      .catch((e) => setErr(e instanceof Error ? e.message : "تعذر تحميل لوحة الصدارة"))
      .finally(() => setLoadingPlayers(false));
  }, [game]);

  const leaderboard = useMemo(() => {
    return players
      .slice()
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [players]);

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
        {game ? <PhaseGate phase={game.phase} allow={["results"]} /> : null}

        <div className="stack" style={{ gap: 10, marginTop: 10 }}>
          <div className="pageTitle">{ar.results.title}</div>
          <div className="pageSubtitle">
            {ar.results.subtitle(guessesPerPlayer, loadingPlayers)}
          </div>
        </div>

        <div style={{ height: 18 }} />

        <Card className="stack">
          <div className="stack" style={{ gap: 10 }}>
            {leaderboard.map((p, idx) => {
              const place = idx + 1;
              const isTop = place <= 3;
              const bg = isTop
                ? place === 1
                  ? "linear-gradient(135deg, rgba(79,70,229,0.25), rgba(34,197,94,0.18))"
                  : place === 2
                    ? "linear-gradient(135deg, rgba(79,70,229,0.16), rgba(148,163,184,0.10))"
                    : "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(148,163,184,0.10))"
                : undefined;

              return (
                <div
                  key={p.id}
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: bg ?? "color-mix(in srgb, var(--surface) 86%, transparent)",
                  }}
                >
                  <div className="row" style={{ gap: 10 }}>
                    <span
                      className="pill"
                      style={{
                        minWidth: 44,
                        justifyContent: "center",
                        fontWeight: 750,
                        color: isTop ? "var(--text)" : "var(--muted)",
                      }}
                    >
                      #{place}
                    </span>
                    <div style={{ fontWeight: 750 }}>{p.name}</div>
                    {isTop ? <span className="pill">{ar.results.top(place)}</span> : null}
                  </div>

                  <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 750 }}>
                    {(p.score ?? 0)}/{guessesPerPlayer}
                  </div>
                </div>
              );
            })}
          </div>

          {err && <div className="errorBox">{err}</div>}

          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <Button onClick={() => router.replace("/")}>{ar.results.backHome}</Button>
            <Button variant="primary" onClick={() => router.replace("/admin")}>
              {ar.results.admin}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

