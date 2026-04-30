"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PhaseGate } from "@/components/PhaseGate";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, TextInput } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { registerPlayer } from "@/lib/gameStore";
import { useGame } from "@/lib/useGame";
import { PLAYER_COUNT } from "@/lib/config";
import { ar } from "@/lib/i18n";

export default function RegistrationPage() {
  const router = useRouter();
  const { user, game, player, loading, error } = useGame();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const canRegister = useMemo(() => {
    if (!game) return false;
    if (game.phase !== "registration") return false;
    if (game.registeredCount >= PLAYER_COUNT) return false;
    return true;
  }, [game, PLAYER_COUNT]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      await registerPlayer({ playerId: user.uid, name });
      router.replace("/questions");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "تعذر التسجيل");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TopBar
        right={
          <span className="pill">
            {ar.registration.joinedPill(game?.registeredCount ?? 0)}
          </span>
        }
      />
      <div className="container fadeIn">
        {game ? <PhaseGate phase={game.phase} allow={["registration"]} /> : null}

        <div className="stack" style={{ gap: 10, marginTop: 10 }}>
          <div className="pageTitle">{ar.registration.title}</div>
          <div className="pageSubtitle">{ar.registration.subtitle}</div>
        </div>

        <div style={{ height: 18 }} />

        <Card className="stack">
          <ProgressBar
            value={
              game ? (PLAYER_COUNT ? game.registeredCount / PLAYER_COUNT : 0) : 0
            }
            label={
              game ? ar.registration.progressLabel(game.registeredCount) : ar.common.loading
            }
          />

          <div className="divider" />

          {player ? (
            <div className="stack" style={{ gap: 10 }}>
              <div style={{ fontWeight: 750, fontSize: 16 }}>
                {ar.registration.youAreIn}
              </div>
              <div className="muted">
                {ar.registration.registeredAs(player.name)}
              </div>
              <Button variant="primary" fullWidth onClick={() => router.replace("/questions")}>
                {ar.registration.continue}
              </Button>
            </div>
          ) : (
            <form className="stack" onSubmit={onSubmit}>
              <Field label={ar.registration.yourName} hint={ar.registration.uniqueName}>
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ar.registration.namePlaceholder}
                  disabled={!canRegister || submitting}
                  autoComplete="off"
                />
              </Field>

              <Button
                variant="primary"
                fullWidth
                disabled={!canRegister || submitting || loading || !name.trim()}
                type="submit"
              >
                {submitting ? ar.registration.entering : ar.registration.enter}
              </Button>

              {!canRegister && game?.phase === "registration" && (
                <div className="muted center">{ar.registration.gameFull}</div>
              )}
            </form>
          )}

          {(error || localError) && <div className="errorBox">{error || localError}</div>}
        </Card>

        <div style={{ height: 14 }} />
        <div className="muted center">
          {ar.registration.adminLink}: <a href="/admin">/admin</a>
        </div>
      </div>
    </>
  );
}
