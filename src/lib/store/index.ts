import { STORE_BACKEND } from "@/lib/config";
import { LocalRepository } from "./local-repository";
import type { Repository } from "./repository";

export type { Repository } from "./repository";
export * from "./types";

let instance: Repository | null = null;

/**
 * Single access point for the store. Switching `STORE_BACKEND` (config) is the
 * only change needed to move local → DB; callers never construct a repository
 * directly.
 */
export function getRepository(): Repository {
  if (instance) return instance;

  switch (STORE_BACKEND) {
    case "db":
      // PrismaRepository lands in phase 08; fall back to local until then.
      instance = new LocalRepository();
      break;
    case "local":
    default:
      instance = new LocalRepository();
  }
  return instance;
}
