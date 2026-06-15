import confetti from "canvas-confetti";

/** Reward palette — amber leads, with brand + soft accents. */
const COLORS = ["#F2A33C", "#2F6F5E", "#FBE6C6", "#3E8E5A"];

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * A short, classy celebration burst. Respects reduced-motion (no-op so callers
 * can show a static celebration state instead).
 */
export function celebrate(): void {
  if (prefersReducedMotion()) return;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 60 };
  confetti({
    ...defaults,
    particleCount: 60,
    origin: { x: 0.5, y: 0.35 },
    colors: COLORS,
    scalar: 0.9,
  });
}
