"use client";

import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getClientAuth } from "./firebaseClient";

export function useAuthedUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setReady(true);
      setError(null);

      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to sign in");
        }
      }
    });

    // Ensure we trigger anonymous sign-in on first load too
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to sign in");
      });
    }

    return () => unsub();
  }, []);

  return { user, ready, error };
}

