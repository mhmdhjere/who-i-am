export type GamePhase =
  | "registration"
  | "questions"
  | "guessing"
  | "waiting"
  | "results";

export type GameDoc = {
  phase: GamePhase;
  questions: string[];
  /**
   * Cached registration state so registration can be enforced atomically.
   * (Firestore transactions can't read an entire collection.)
   */
  registeredCount: number; // 0..16
  registeredNamesLower: string[]; // lowercased unique names
  /**
   * Stable ordering of players for guessing.
   * This must not change once guessing starts.
   */
  playerOrder: string[]; // array of playerIds (uids)
  createdAtMs: number;
  updatedAtMs: number;
};

export type PlayerDoc = {
  id: string; // equals auth uid
  name: string;
  createdAtMs: number;

  answers: string[]; // same length/order as GameDoc.questions when complete

  /**
   * Map of answerOwnerPlayerId -> guessedPlayerId
   * Each player submits exactly (playerCount - 1) guesses (everyone except themselves).
   */
  guesses: Record<string, string>;

  score: number | null; // set when game ends
};

