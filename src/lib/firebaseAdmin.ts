import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const rawB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  let jsonText: string | null = null;

  if (rawB64 && rawB64.trim()) {
    jsonText = Buffer.from(rawB64.trim(), "base64").toString("utf8");
  } else if (path && path.trim()) {
    jsonText = fs.readFileSync(path.trim(), "utf8");
  } else if (raw && raw.trim()) {
    jsonText = raw.trim();
  }

  if (!jsonText) {
    throw new Error(
      "Missing service account. Set FIREBASE_SERVICE_ACCOUNT_B64 (recommended) or FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT."
    );
  }

  try {
    return JSON.parse(jsonText) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
  } catch {
    throw new Error(
      "Service account JSON could not be parsed. If using .env.local, prefer FIREBASE_SERVICE_ACCOUNT_B64 or FIREBASE_SERVICE_ACCOUNT_PATH."
    );
  }
}

export function getAdminDb() {
  if (getApps().length === 0) {
    const sa = getServiceAccount();
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    });
  }
  return getFirestore();
}

