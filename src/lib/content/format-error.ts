import type { ZodError, ZodIssue } from "zod";

/** Render a Zod path as `vocabulary[3].cards[0].answer`. */
function formatPath(path: ZodIssue["path"]): string {
  let out = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      out += `[${segment}]`;
    } else {
      const key = String(segment);
      out += out ? `.${key}` : key;
    }
  }
  return out || "(root)";
}

/**
 * Turn a ZodError into author-friendly, located messages:
 *   block-002.json: vocabulary[3].cards[0].answer — Invalid input: expected string
 *
 * Author mistakes are first-class — a precise message saves hours.
 */
export function formatBlockError(file: string, error: ZodError): string {
  const lines = error.issues.map(
    (issue) => `  ${file}: ${formatPath(issue.path)} — ${issue.message}`,
  );
  return [`Invalid content block "${file}":`, ...lines].join("\n");
}

/** Error thrown when one or more blocks fail to load or validate. */
export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentError";
  }
}
