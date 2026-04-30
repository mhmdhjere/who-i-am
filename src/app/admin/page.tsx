"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { listPlayersOrdered } from "@/lib/gameStore";
import { useGame } from "@/lib/useGame";
import type { PlayerDoc } from "@/lib/types";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { ar } from "@/lib/i18n";
import { MAX_PLAYER_COUNT, MIN_PLAYER_COUNT } from "@/lib/config";
import { doc, updateDoc } from "firebase/firestore";
import { getClientDb } from "@/lib/firebaseClient";

async function postAdmin(path: string, secret: string) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "x-admin-secret": secret,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json;
}

export default function AdminPage() {
  const { game } = useGame();
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [secret, setSecret] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<null | "end" | "reset">(null);
  const [error, setError] = useState<string | null>(null);
  const [playerCountInput, setPlayerCountInput] = useState<string>("");

  useEffect(() => {
    const s = localStorage.getItem("adminSecret");
    if (s) {
      setSecret(s);
      setSaved(true);
    }
  }, []);

  useEffect(() => {
    if (typeof game?.playerCount === "number") {
      setPlayerCountInput(String(game.playerCount));
    }
  }, [game?.playerCount]);

  useEffect(() => {
    setLoadingPlayers(true);
    listPlayersOrdered()
      .then(setPlayers)
      .catch((e) => setError(e instanceof Error ? e.message : "تعذر تحميل اللاعبين"))
      .finally(() => setLoadingPlayers(false));
  }, [game?.updatedAtMs]);

  const qCount = game?.questions?.length ?? 0;
  const playerCount =
    typeof game?.playerCount === "number" && Number.isFinite(game.playerCount)
      ? Math.max(MIN_PLAYER_COUNT, Math.min(MAX_PLAYER_COUNT, Math.round(game.playerCount)))
      : MAX_PLAYER_COUNT;
  const guessesPerPlayer = playerCount - 1;
  const stats = useMemo(() => {
    const registered = players.length;
    const answered = players.filter((p) => (p.answers?.length ?? 0) === qCount && qCount > 0)
      .length;
    const guessed = players.filter(
      (p) => Object.keys(p.guesses ?? {}).length === guessesPerPlayer
    ).length;
    const scored = players.filter((p) => typeof p.score === "number").length;
    return { registered, answered, guessed, scored };
  }, [players, qCount, guessesPerPlayer]);

  async function savePlayerCount() {
    const raw = Number(playerCountInput);
    const next = Number.isFinite(raw) ? Math.round(raw) : NaN;
    if (!Number.isFinite(next)) {
      setError("الرجاء إدخال رقم صحيح لعدد اللاعبين");
      return;
    }
    if (next < MIN_PLAYER_COUNT || next > MAX_PLAYER_COUNT) {
      setError(`عدد اللاعبين يجب أن يكون بين ${MIN_PLAYER_COUNT} و ${MAX_PLAYER_COUNT}`);
      return;
    }
    try {
      setError(null);
      // Update game doc directly from client (MVP rules allow it).
      const ref = doc(getClientDb(), "games", "current");
      await updateDoc(ref, { playerCount: next, updatedAtMs: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ عدد اللاعبين");
    }
  }

  function saveSecret() {
    localStorage.setItem("adminSecret", secret);
    setSaved(true);
  }

  async function endGame() {
    setBusy("end");
    setError(null);
    try {
      await postAdmin("/api/admin/end-game", secret);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إنهاء اللعبة");
    } finally {
      setBusy(null);
    }
  }

  async function resetGame() {
    setBusy("reset");
    setError(null);
    try {
      await postAdmin("/api/admin/reset", secret);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إعادة ضبط اللعبة");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <TopBar
        right={
          <span className="pill">
            {ar.admin.phase}: <b>{game?.phase ?? "…"}</b>
          </span>
        }
      />
      <div className="container fadeIn">
        <div className="stack" style={{ gap: 10, marginTop: 10 }}>
          <div className="pageTitle">{ar.admin.title}</div>
          <div className="pageSubtitle">{ar.admin.subtitle}</div>
        </div>

        <div style={{ height: 18 }} />

        <div className="grid2">
          <Card className="stack">
            <div style={{ fontWeight: 750, fontSize: 16 }}>{ar.admin.access}</div>
            <div className="muted">{ar.admin.accessSub}</div>
            <Field
              label={ar.admin.adminSecret}
              hint={saved ? ar.admin.saved : ar.admin.notSaved}
            >
              <TextInput
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
                  setSaved(false);
                }}
                placeholder={ar.admin.secretPlaceholder}
                type="password"
              />
            </Field>
            <Button onClick={saveSecret} disabled={!secret.trim()} variant="primary">
              {saved ? ar.admin.saved : ar.admin.saveSecret}
            </Button>
          </Card>

          <Card className="stack">
            <div style={{ fontWeight: 750, fontSize: 16 }}>{ar.admin.status}</div>
            <div className="stack" style={{ gap: 10 }}>
              <StatRow label={ar.admin.playerCount} value={`${playerCount}`} />
              <StatRow label={ar.admin.registered} value={`${stats.registered}/${playerCount}`} />
              <StatRow label={ar.admin.answered} value={`${stats.answered}/${playerCount}`} />
              <StatRow
                label={ar.admin.submittedGuesses}
                value={`${stats.guessed}/${playerCount}`}
              />
              <StatRow label={ar.admin.scored} value={`${stats.scored}/${playerCount}`} />
              <div className="muted">{loadingPlayers ? ar.admin.refreshing : ""}</div>
            </div>
          </Card>
        </div>

        <div style={{ height: 12 }} />

        <Card className="stack">
          <div style={{ fontWeight: 750, fontSize: 16 }}>{ar.admin.controls}</div>
          <div className="muted">{ar.admin.controlsSub}</div>
          <Field
            label={ar.admin.playerCount}
            hint={`بين ${MIN_PLAYER_COUNT} و ${MAX_PLAYER_COUNT}`}
          >
            <div className="row">
              <TextInput
                value={playerCountInput}
                onChange={(e) => setPlayerCountInput(e.target.value)}
                inputMode="numeric"
                placeholder={`${playerCount}`}
              />
              <Button type="button" variant="primary" onClick={savePlayerCount}>
                حفظ
              </Button>
            </div>
          </Field>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <Button
              variant="danger"
              onClick={endGame}
              disabled={!secret.trim() || busy !== null}
            >
              {busy === "end" ? ar.admin.ending : ar.admin.endGame}
            </Button>
            <Button
              onClick={resetGame}
              disabled={!secret.trim() || busy !== null}
              title={ar.admin.resetHint}
            >
              {busy === "reset" ? ar.admin.resetting : ar.admin.resetGame}
            </Button>
          </div>

          {error && <div className="errorBox">{error}</div>}
        </Card>

        <div style={{ height: 12 }} />

        <Card className="stack">
          <div style={{ fontWeight: 750, fontSize: 16 }}>{ar.admin.players}</div>
          <div className="muted">{ar.admin.playersSub}</div>
          <div className="stack">
            {players.map((p) => (
              <div
                key={p.id}
                className="row"
                style={{
                  justifyContent: "space-between",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background:
                    "color-mix(in srgb, var(--surface) 86%, transparent)",
                }}
              >
                <div className="row" style={{ gap: 10 }}>
                  <div style={{ fontWeight: 750 }}>{p.name}</div>
                  <div className="muted">
                    {(p.answers?.length ?? 0)}/{qCount} {ar.admin.answers} •{" "}
                    {Object.keys(p.guesses ?? {}).length}/{guessesPerPlayer} {ar.admin.guesses}
                  </div>
                </div>
                <div className="muted">
                  {typeof p.score === "number" ? `${p.score}/${guessesPerPlayer}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function StatRow(props: { label: string; value: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between" }}>
      <div className="muted">{props.label}</div>
      <div style={{ fontWeight: 750 }}>{props.value}</div>
    </div>
  );
}

