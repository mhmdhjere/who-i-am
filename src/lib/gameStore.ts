"use client";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  type Unsubscribe,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { getClientDb } from "./firebaseClient";
import type { GameDoc, GamePhase, PlayerDoc } from "./types";
import { DEFAULT_PLAYER_COUNT, MAX_PLAYER_COUNT, MIN_PLAYER_COUNT } from "./config";
import { DEFAULT_QUESTIONS_AR } from "./questions";

export const GAME_ID = "current";
export const gameRef = () => doc(getClientDb(), "games", GAME_ID);
export const playersCol = () =>
  collection(getClientDb(), "games", GAME_ID, "players");
export const playerRef = (playerId: string) =>
  doc(getClientDb(), "games", GAME_ID, "players", playerId);

export const DEFAULT_QUESTIONS: string[] = DEFAULT_QUESTIONS_AR;

export function getPlayerCount(game: Pick<GameDoc, "playerCount"> | null | undefined) {
  const n = game?.playerCount;
  if (typeof n !== "number") return DEFAULT_PLAYER_COUNT;
  if (!Number.isFinite(n)) return DEFAULT_PLAYER_COUNT;
  return Math.max(MIN_PLAYER_COUNT, Math.min(MAX_PLAYER_COUNT, Math.round(n)));
}

export async function ensureGameDoc() {
  const ref = gameRef();
  const snap = await getDoc(ref);
  const now = Date.now();
  if (!snap.exists()) {
    const initial: GameDoc = {
      phase: "registration",
      questions: DEFAULT_QUESTIONS,
      playerCount: DEFAULT_PLAYER_COUNT,
      registeredCount: 0,
      registeredNamesLower: [],
      playerOrder: [],
      createdAtMs: now,
      updatedAtMs: now,
    };
    await setDoc(ref, initial);
    return;
  }

  const data = snap.data() as Partial<GameDoc>;
  const patch: Partial<GameDoc> = {};
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    patch.questions = DEFAULT_QUESTIONS;
  }
  if (!data.phase) patch.phase = "registration";
  if (typeof data.playerCount !== "number") patch.playerCount = DEFAULT_PLAYER_COUNT;
  if (typeof data.registeredCount !== "number") patch.registeredCount = 0;
  if (!Array.isArray(data.registeredNamesLower)) patch.registeredNamesLower = [];
  if (!Array.isArray(data.playerOrder)) patch.playerOrder = [];
  if (Object.keys(patch).length > 0) {
    await setDoc(
      ref,
      { ...patch, updatedAtMs: now },
      { merge: true }
    );
  }
}

export function subscribeGame(cb: (g: GameDoc | null) => void): Unsubscribe {
  return onSnapshot(gameRef(), (snap) => {
    cb(snap.exists() ? (snap.data() as GameDoc) : null);
  });
}

export function subscribePlayer(
  playerId: string,
  cb: (p: PlayerDoc | null) => void
): Unsubscribe {
  return onSnapshot(playerRef(playerId), (snap) => {
    if (!snap.exists()) return cb(null);
    const data = snap.data() as Omit<PlayerDoc, "id">;
    cb({ ...data, id: snap.id });
  });
}

export async function listPlayersOrdered() {
  const q = query(playersCol(), orderBy("createdAtMs", "asc"));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({
    ...(d.data() as Omit<PlayerDoc, "id">),
    id: d.id,
  }));
}

export async function registerPlayer(params: {
  playerId: string;
  name: string;
}) {
  const { playerId, name } = params;
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");

  const db = getClientDb();
  await runTransaction(db, async (tx) => {
    const gRef = gameRef();
    const gSnap = await tx.get(gRef);
    if (!gSnap.exists()) throw new Error("Game not initialized");
    const game = gSnap.data() as GameDoc;
    if (game.phase !== "registration")
      throw new Error("Registration is closed");

    const playerCount = getPlayerCount(game);
    const normalized = trimmed.toLowerCase();
    const registeredCount = typeof game.registeredCount === "number" ? game.registeredCount : 0;
    const namesLower = Array.isArray(game.registeredNamesLower)
      ? game.registeredNamesLower
      : [];

    if (registeredCount >= playerCount)
      throw new Error(`Game is full (${playerCount} players)`);
    if (namesLower.includes(normalized)) throw new Error("Name must be unique");

    const pRef = playerRef(playerId);
    const pSnap = await tx.get(pRef);
    if (!pSnap.exists()) {
      const now = Date.now();
      const newPlayer: Omit<PlayerDoc, "id"> = {
        name: trimmed,
        createdAtMs: now,
        answers: [],
        guesses: {},
        score: null,
      };
      tx.set(pRef, newPlayer);

      const newCount = registeredCount + 1;
      const newNames = [...namesLower, normalized];

      // Auto-close registration by moving to questions when we reach the target count.
      tx.update(gRef, {
        registeredCount: newCount,
        registeredNamesLower: newNames,
        phase: (newCount >= playerCount
          ? "questions"
          : "registration") satisfies GamePhase,
        updatedAtMs: Date.now(),
      });
    } else {
      // Existing player can't rename in MVP (keeps name-uniqueness simple).
      throw new Error("You are already registered on this device");
    }
  });
}

export async function submitAnswers(params: {
  playerId: string;
  answers: string[];
}) {
  const { playerId, answers } = params;
  const ref = playerRef(playerId);
  const cleaned = answers.map((a) => a.trim());
  await updateDoc(ref, { answers: cleaned });
}

export async function submitGuesses(params: {
  playerId: string;
  guesses: Record<string, string>;
}) {
  const { playerId, guesses } = params;
  await updateDoc(playerRef(playerId), { guesses });
}

export async function maybeAdvanceToGuessing() {
  const gSnap = await getDoc(gameRef());
  if (!gSnap.exists()) return;
  const g = gSnap.data() as GameDoc;
  if (g.phase !== "questions") return;
  const playerCount = getPlayerCount(g);
  if (g.registeredCount !== playerCount) return;

  const players = await listPlayersOrdered();
  const qCount = Array.isArray(g.questions) ? g.questions.length : 0;
  const allAnswered =
    qCount > 0 &&
    players.length === playerCount &&
    players.every((p) => Array.isArray(p.answers) && p.answers.length === qCount);
  if (!allAnswered) return;

  // Freeze stable order for guessing once.
  const order = players.map((p) => p.id);
  const db = getClientDb();
  await runTransaction(db, async (tx) => {
    const ref = gameRef();
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const latest = snap.data() as GameDoc;
    if (latest.phase !== "questions") return;
    if (Array.isArray(latest.playerOrder) && latest.playerOrder.length > 0) return;
    tx.update(ref, {
      phase: "guessing" satisfies GamePhase,
      playerOrder: order,
      updatedAtMs: Date.now(),
    });
  });
}

export async function maybeAdvanceToWaiting() {
  const gSnap = await getDoc(gameRef());
  if (!gSnap.exists()) return;
  const g = gSnap.data() as GameDoc;
  if (g.phase !== "guessing") return;
  const playerCount = getPlayerCount(g);
  const guessesPerPlayer = playerCount - 1;
  const players = await listPlayersOrdered();
  if (players.length !== playerCount) return;
  const allSubmitted = players.every(
    (p) => Object.keys(p.guesses ?? {}).length === guessesPerPlayer
  );
  if (!allSubmitted) return;
  const db = getClientDb();
  await runTransaction(db, async (tx) => {
    const ref = gameRef();
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const latest = snap.data() as GameDoc;
    if (latest.phase !== "guessing") return;
    tx.update(ref, {
      phase: "waiting" satisfies GamePhase,
      updatedAtMs: Date.now(),
    });
  });
}

