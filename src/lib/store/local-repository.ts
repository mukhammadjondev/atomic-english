import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { Repository } from "./repository";
import {
  DEFAULT_SETTINGS,
  type ExportBundle,
  type Settings,
  type StoredCardState,
  type StoredReviewLog,
  type StreakDay,
} from "./types";

const DB_NAME = "atomic-english";
const DB_VERSION = 1;
const SETTINGS_KEY = "app";

/** Records written before the grammar SRS stream existed have no `kind` → vocab. */
function withKind(s: StoredCardState): StoredCardState {
  return s.kind ? s : { ...s, kind: "vocab" };
}

interface AtomicDB extends DBSchema {
  cardStates: { key: string; value: StoredCardState };
  reviewLogs: {
    key: number;
    value: StoredReviewLog;
    indexes: { byCard: string };
  };
  streakDays: { key: string; value: StreakDay };
  settings: { key: string; value: Settings };
}

/**
 * IndexedDB-backed repository. Works offline with no server, so the core study
 * loop is usable on day one. Browser-only — `openDatabase` throws on the server.
 */
export class LocalRepository implements Repository {
  private dbPromise: Promise<IDBPDatabase<AtomicDB>> | null = null;

  private db(): Promise<IDBPDatabase<AtomicDB>> {
    if (typeof indexedDB === "undefined") {
      throw new Error(
        "LocalRepository requires IndexedDB — use it only in the browser.",
      );
    }
    this.dbPromise ??= openDB<AtomicDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cardStates")) {
          db.createObjectStore("cardStates", { keyPath: "cardId" });
        }
        if (!db.objectStoreNames.contains("reviewLogs")) {
          const logs = db.createObjectStore("reviewLogs", {
            keyPath: "id",
            autoIncrement: true,
          });
          logs.createIndex("byCard", "cardId");
        }
        if (!db.objectStoreNames.contains("streakDays")) {
          db.createObjectStore("streakDays", { keyPath: "date" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }
      },
    });
    return this.dbPromise;
  }

  async getCardState(cardId: string) {
    const s = await (await this.db()).get("cardStates", cardId);
    return s ? withKind(s) : undefined;
  }

  async getAllCardStates() {
    return (await this.db()).getAll("cardStates").then((all) => all.map(withKind));
  }

  async putCardState(state: StoredCardState) {
    await (await this.db()).put("cardStates", state);
  }

  async putCardStates(states: StoredCardState[]) {
    const db = await this.db();
    const tx = db.transaction("cardStates", "readwrite");
    await Promise.all([
      ...states.map((s) => tx.store.put(s)),
      tx.done,
    ]);
  }

  async deleteCardState(cardId: string) {
    await (await this.db()).delete("cardStates", cardId);
  }

  async appendReviewLog(log: StoredReviewLog) {
    await (await this.db()).add("reviewLogs", log);
  }

  async removeLastReviewLog(cardId: string) {
    const db = await this.db();
    const logs = await db.getAllFromIndex("reviewLogs", "byCard", cardId);
    if (!logs.length) return;
    const last = logs.reduce((a, b) => ((a.id ?? 0) > (b.id ?? 0) ? a : b));
    if (last.id != null) await db.delete("reviewLogs", last.id);
  }

  async getReviewLogs(cardId?: string) {
    const db = await this.db();
    if (cardId) return db.getAllFromIndex("reviewLogs", "byCard", cardId);
    return db.getAll("reviewLogs");
  }

  async getStreakDays() {
    return (await this.db()).getAll("streakDays");
  }

  async getStreakDay(date: string) {
    return (await this.db()).get("streakDays", date);
  }

  async putStreakDay(day: StreakDay) {
    await (await this.db()).put("streakDays", day);
  }

  async getSettings(): Promise<Settings> {
    const stored = await (await this.db()).get("settings", SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.getSettings()), ...patch };
    await (await this.db()).put("settings", next, SETTINGS_KEY);
    return next;
  }

  async exportAll(): Promise<ExportBundle> {
    const [cardStates, reviewLogs, streakDays, settings] = await Promise.all([
      this.getAllCardStates(),
      this.getReviewLogs(),
      this.getStreakDays(),
      this.getSettings(),
    ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      cardStates,
      reviewLogs,
      streakDays,
      settings,
    };
  }

  async importAll(bundle: ExportBundle): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(
      ["cardStates", "reviewLogs", "streakDays", "settings"],
      "readwrite",
    );
    await Promise.all([
      tx.objectStore("cardStates").clear(),
      tx.objectStore("reviewLogs").clear(),
      tx.objectStore("streakDays").clear(),
      tx.objectStore("settings").clear(),
    ]);
    for (const s of bundle.cardStates) tx.objectStore("cardStates").put(s);
    for (const l of bundle.reviewLogs) {
      // drop the old autoincrement id so keys regenerate cleanly
      const { id: _id, ...rest } = l;
      void _id;
      tx.objectStore("reviewLogs").put(rest as StoredReviewLog);
    }
    for (const d of bundle.streakDays) tx.objectStore("streakDays").put(d);
    tx.objectStore("settings").put(bundle.settings, SETTINGS_KEY);
    await tx.done;
  }

  async reset(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(
      ["cardStates", "reviewLogs", "streakDays", "settings"],
      "readwrite",
    );
    await Promise.all([
      tx.objectStore("cardStates").clear(),
      tx.objectStore("reviewLogs").clear(),
      tx.objectStore("streakDays").clear(),
      tx.objectStore("settings").clear(),
      tx.done,
    ]);
  }
}
