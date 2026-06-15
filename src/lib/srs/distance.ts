/**
 * Levenshtein edit distance — number of single-character insert/delete/substitute
 * edits to turn `a` into `b`. Pure + cheap (answers are short). Used to forgive
 * one-off typos so a near-miss isn't punished as a hard failure.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * How many typos to forgive for a target of the given length. Short answers get
 * no slack (so a wrong 3-letter word isn't accepted); longer answers tolerate more.
 */
export function typoBudget(targetLength: number): number {
  if (targetLength <= 3) return 0;
  if (targetLength <= 7) return 1;
  return 2;
}
