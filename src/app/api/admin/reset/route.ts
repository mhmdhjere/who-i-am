import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { DEFAULT_QUESTIONS_AR } from "@/lib/questions";

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

  const playersSnap = await playersRef.get();
  const batch = db.batch();
  for (const d of playersSnap.docs) batch.delete(d.ref);

  batch.set(
    gameRef,
    {
      phase: "registration",
      questions: DEFAULT_QUESTIONS_AR,
      registeredCount: 0,
      registeredNamesLower: [],
      playerOrder: [],
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    },
    { merge: false }
  );

  await batch.commit();
  return NextResponse.json({ ok: true });
}

