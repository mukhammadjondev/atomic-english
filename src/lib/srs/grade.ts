import { Rating, type Grade } from "ts-fsrs";
import { levenshtein, typoBudget } from "./distance";

/** Grades exposed to the learner (FSRS standard 4-button). */
export const GRADES = [
  { rating: Rating.Again, key: "1", label: "Again", tone: "err" },
  { rating: Rating.Hard, key: "2", label: "Hard", tone: "muted" },
  { rating: Rating.Good, key: "3", label: "Good", tone: "brand" },
  { rating: Rating.Easy, key: "4", label: "Easy", tone: "success" },
] as const;

export type GradeTone = (typeof GRADES)[number]["tone"];

/** Normalize a typed answer for comparison: lowercase, collapse spaces, strip edge punctuation. */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.,!?;:"'’]+/u, "")
    .replace(/[.,!?;:"'’]+$/u, "")
    .trim();
}

/** True when the typed answer matches the expected answer or an accepted variant. */
export function isCorrect(
  input: string,
  answer: string,
  accepted?: string[],
): boolean {
  const norm = normalizeAnswer(input);
  if (!norm) return false;
  const targets = [answer, ...(accepted ?? [])].map(normalizeAnswer);
  return targets.includes(norm);
}

/** Outcome of judging a typed answer with typo tolerance. */
export type AnswerStatus = "correct" | "near" | "wrong";

export interface AnswerJudgement {
  status: AnswerStatus;
  /** the accepted target closest to what the learner typed (for "almost" hints) */
  nearest: string;
}

/**
 * Judge a typed answer against the expected answer + accepted variants, forgiving
 * small typos. Exact/accepted → "correct"; within the typo budget → "near"
 * (a real attempt that slipped); otherwise → "wrong".
 */
export function gradeAnswer(
  input: string,
  answer: string,
  accepted?: string[],
): AnswerJudgement {
  const norm = normalizeAnswer(input);
  const targetsRaw = [answer, ...(accepted ?? [])];
  const targets = targetsRaw.map(normalizeAnswer);

  if (!norm) return { status: "wrong", nearest: answer };
  if (targets.includes(norm)) return { status: "correct", nearest: answer };

  let best = { dist: Infinity, idx: 0 };
  targets.forEach((t, i) => {
    const d = levenshtein(norm, t);
    if (d < best.dist) best = { dist: d, idx: i };
  });

  const target = targets[best.idx];
  const near = best.dist > 0 && best.dist <= typoBudget(target.length);
  return { status: near ? "near" : "wrong", nearest: targetsRaw[best.idx] };
}

/**
 * Auto-grade for typed answers: correct → Good (learner may bump to Hard/Easy),
 * a near-miss typo → Hard, wrong → Again. Manual 4-button grading overrides this.
 */
export function autoGrade(correct: boolean): Grade {
  return correct ? Rating.Good : Rating.Again;
}

export function gradeFromStatus(status: AnswerStatus): Grade {
  if (status === "correct") return Rating.Good;
  if (status === "near") return Rating.Hard;
  return Rating.Again;
}

export function gradeFromKey(key: string): Grade | null {
  const found = GRADES.find((g) => g.key === key);
  return found ? found.rating : null;
}
