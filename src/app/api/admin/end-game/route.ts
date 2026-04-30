import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { GameDoc, PlayerDoc } from "@/lib/types";

export async function POST(req: Request) {
  const secret = req.headers.get("x-admin-secret") ?? "";
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Server misconfigured: missing ADMIN_SECRET" },
      { status: 500 }
    );
  }
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const gameRef = db.collection("games").doc("current");
  const playersRef = gameRef.collection("players");

  const [gameSnap, playersSnap] = await Promise.all([
    gameRef.get(),
    playersRef.get(),
  ]);

  if (!gameSnap.exists) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const game = gameSnap.data() as GameDoc;
  const players = playersSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<PlayerDoc, "id">),
  }));

  // Build answer-owner truth map: each answer-set belongs to the playerId itself.
  const playerIds = players.map((p) => p.id);
  const playerCount =
    typeof game.playerCount === "number" && Number.isFinite(game.playerCount)
      ? Math.max(2, Math.min(16, Math.round(game.playerCount)))
      : 16;
  const guessesPerPlayer = playerCount - 1;

  if (playerIds.length !== playerCount) {
    return NextResponse.json(
      { error: `Expected ${playerCount} players, found ${playerIds.length}` },
      { status: 400 }
    );
  }

  const batch = db.batch();
  for (const p of players) {
    const guesses = p.guesses ?? {};
    let correct = 0;
    for (const ownerId of playerIds) {
      if (ownerId === p.id) continue;
      const guessed = guesses[ownerId];
      if (guessed && guessed === ownerId) correct += 1;
    }
    if (correct > guessesPerPlayer) correct = guessesPerPlayer;
    batch.update(playersRef.doc(p.id), { score: correct });
  }

  batch.update(gameRef, { phase: "results", updatedAtMs: Date.now() });
  await batch.commit();

  return NextResponse.json({ ok: true });
}

