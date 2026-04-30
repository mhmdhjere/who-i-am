"use client";

import type { GamePhase } from "./types";

export function phaseToPath(phase: GamePhase) {
  switch (phase) {
    case "registration":
      return "/";
    case "questions":
      return "/questions";
    case "guessing":
      return "/guess";
    case "waiting":
      return "/waiting";
    case "results":
      return "/results";
  }
}

