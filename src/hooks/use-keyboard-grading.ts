"use client";

import { useEffect } from "react";
import type { Grade } from "ts-fsrs";
import { gradeFromKey } from "@/lib/srs/grade";

/**
 * Keyboard shortcuts for the study loop:
 *  1/2/3/4 → Again/Hard/Good/Easy (only after reveal)
 *  Space   → reveal (when focus isn't in a text field)
 */
export function useKeyboardGrading({
  enabled,
  revealed,
  onGrade,
  onReveal,
}: {
  enabled: boolean;
  revealed: boolean;
  onGrade: (g: Grade) => void;
  onReveal: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";

      if (revealed) {
        const grade = gradeFromKey(e.key);
        if (grade !== null) {
          e.preventDefault();
          onGrade(grade);
        }
      } else if (e.key === " " && !inField) {
        e.preventDefault();
        onReveal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, revealed, onGrade, onReveal]);
}
