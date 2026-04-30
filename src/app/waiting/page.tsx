"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhaseGate } from "@/components/PhaseGate";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/Card";
import { SpinnerDots } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useGame } from "@/lib/useGame";
import { phaseToPath } from "@/lib/routing";
import { GUESSES_PER_PLAYER } from "@/lib/config";
import { ar } from "@/lib/i18n";

export default function WaitingPage() {
  const router = useRouter();
  const { game, player, ready } = useGame();

  useEffect(() => {
    if (!game) return;
    // This screen is used in multiple phases as a "you're done, waiting for others" UX.
    // We only keep you here if you finished your part for the current phase.
    if (game.phase === "questions") {
      const qCount = game.questions?.length ?? 0;
      const done = !!player && qCount > 0 && (player.answers?.length ?? 0) === qCount;
      if (!done) router.replace("/questions");
      return;
    }
    if (game.phase === "guessing") {
      const done =
        !!player && Object.keys(player.guesses ?? {}).length === GUESSES_PER_PLAYER;
      if (!done) router.replace("/guess");
      return;
    }
    if (game.phase === "registration") router.replace("/");
    if (game.phase === "results") router.replace("/results");
  }, [game, player, router]);

  const title =
    game?.phase === "questions"
      ? ar.waiting.titleQuestions
      : game?.phase === "guessing"
        ? ar.waiting.titleGuessing
        : ar.waiting.titleAdmin;

  const subtitle =
    game?.phase === "questions"
      ? ar.waiting.subQuestions
      : game?.phase === "guessing"
        ? ar.waiting.subGuessing
        : ar.waiting.subAdmin;

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
        {game ? (
          <PhaseGate phase={game.phase} allow={["questions", "guessing", "waiting"]} />
        ) : null}

        <div className="stack center" style={{ gap: 10, marginTop: 24 }}>
          <div className="pageTitle">{title}</div>
          <div className="pageSubtitle">{subtitle}</div>
          <div style={{ height: 6 }} />
          <SpinnerDots />
        </div>

        <div style={{ height: 20 }} />

        <Card className="stack">
          <div style={{ fontWeight: 750, fontSize: 16 }}>{ar.waiting.allSet}</div>
          <div className="muted">{ar.waiting.keepOpen}</div>
          <Button
            variant="primary"
            onClick={() => router.replace("/results")}
            disabled={game?.phase !== "results"}
          >
            {ar.waiting.viewResults}
          </Button>
        </Card>
      </div>
    </>
  );
}

