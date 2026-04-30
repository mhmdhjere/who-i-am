"use client";

export const dynamic = "force-dynamic";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhaseGate } from "@/components/PhaseGate";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, TextArea } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { maybeAdvanceToGuessing, submitAnswers } from "@/lib/gameStore";
import { useGame } from "@/lib/useGame";
import { phaseToPath } from "@/lib/routing";
import { ar } from "@/lib/i18n";

export default function QuestionsPage() {
  const router = useRouter();
  const { user, game, player, ready, loading, error } = useGame();
  const questions = game?.questions ?? [];

  const initialAnswers = useMemo(() => questions.map(() => ""), [questions]);
  const [answers, setAnswers] = useState<string[]>(initialAnswers);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setAnswers((prev) => {
      if (prev.length === questions.length) return prev;
      return questions.map((_, i) => prev[i] ?? "");
    });
  }, [questions]);

  useEffect(() => {
    if (!game) return;
    if (game.phase !== "questions") {
      router.replace(phaseToPath(game.phase));
    }
  }, [game, router]);

  useEffect(() => {
    if (!player) return;
    if (player.answers?.length === questions.length && questions.length > 0) {
      setAnswers(player.answers);
    }
  }, [player, questions.length]);

  useEffect(() => {
    setIdx((v) => Math.min(v, Math.max(0, questions.length - 1)));
  }, [questions.length]);

  const canSubmit =
    !!user &&
    !!game &&
    !!player &&
    game.phase === "questions" &&
    questions.length > 0 &&
    answers.length === questions.length &&
    answers.every((a) => a.trim().length > 0);

  const currentQuestion = questions[idx] ?? "";
  const currentAnswer = answers[idx] ?? "";
  const total = questions.length;
  const progress = total > 0 ? (idx + 1) / total : 0;

  function setCurrentAnswer(v: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  }

  async function submitAll() {
    if (!user) return;
    setSaving(true);
    setLocalError(null);
    try {
      await submitAnswers({ playerId: user.uid, answers });
      await maybeAdvanceToGuessing();
      // UX: once you finish, you always go to waiting.
      // If the game advances to guessing immediately, the waiting screen will redirect you.
      router.replace("/waiting");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "تعذر حفظ الإجابات");
    } finally {
      setSaving(false);
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
        {game ? <PhaseGate phase={game.phase} allow={["questions"]} /> : null}

        <div className="stack" style={{ gap: 10, marginTop: 10 }}>
          <div className="pageTitle">{ar.questions.title}</div>
          <div className="pageSubtitle">{ar.questions.subtitle}</div>
        </div>

        <div style={{ height: 18 }} />

        {!player && ready && (
          <Card className="stack">
            <div style={{ fontWeight: 750, fontSize: 16 }}>
              {ar.questions.notRegisteredTitle}
            </div>
            <div className="muted">{ar.questions.notRegisteredSubtitle}</div>
            <Button variant="primary" onClick={() => router.replace("/")}>
              {ar.questions.goToRegistration}
            </Button>
          </Card>
        )}

        {player && (
          <Card className="stack">
            <ProgressBar
              value={progress}
              label={ar.questions.progressLabel(idx + 1, total)}
            />

            <div className="divider" />

            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="stack"
              >
                <Field label={currentQuestion} hint={ar.questions.hint}>
                  <TextArea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    disabled={saving || loading || game?.phase !== "questions"}
                    placeholder={ar.questions.placeholder}
                  />
                </Field>

                <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <Button
                    type="button"
                    onClick={() => setIdx((v) => Math.max(0, v - 1))}
                    disabled={idx === 0 || saving}
                  >
                    {ar.questions.back}
                  </Button>

                  {idx < total - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        if (!currentAnswer.trim()) {
                          setLocalError(ar.questions.answerBeforeNext);
                          return;
                        }
                        setLocalError(null);
                        setIdx((v) => Math.min(total - 1, v + 1));
                      }}
                      disabled={saving}
                    >
                      {ar.questions.next}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => {
                        if (!canSubmit) {
                          setLocalError(ar.questions.answerAllBeforeSubmit);
                          return;
                        }
                        submitAll();
                      }}
                      disabled={!canSubmit || saving}
                    >
                      {saving ? ar.questions.submitting : ar.questions.submitAnswers}
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {(error || localError) && <div className="errorBox">{error || localError}</div>}
          </Card>
        )}
      </div>
    </>
  );
}

