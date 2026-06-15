import "server-only";
import { STORE_BACKEND } from "@/lib/config";
import { PrismaRepository } from "./prisma-repository";
import type { Repository } from "./repository";

let instance: Repository | null = null;

/**
 * Server-side repository (Postgres via Prisma). Used by server actions / route
 * handlers when `STORE_BACKEND=db`. The client store stays on IndexedDB
 * (`getRepository`) — full DB mode routes mutations through the server.
 */
export function getServerRepository(): Repository {
  if (STORE_BACKEND !== "db") {
    throw new Error(
      "Server repository requested but STORE_BACKEND is not 'db'. Set NEXT_PUBLIC_STORE_BACKEND=db.",
    );
  }
  instance ??= new PrismaRepository();
  return instance;
}
