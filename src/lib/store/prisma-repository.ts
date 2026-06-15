import "server-only";
import { Prisma } from "@prisma/client";
import type { Card as FsrsCard, ReviewLog as FsrsReviewLog } from "ts-fsrs";
import { prisma } from "@/lib/db/prisma";
import type { Repository } from "./repository";
import {
  DEFAULT_SETTINGS,
  type CardKind,
  type ExportBundle,
  type Settings,
  type StoredCardState,
  type StoredReviewLog,
  type StreakDay,
} from "./types";

const SETTINGS_ID = "app";
const asJson = (v: unknown) => v as unknown as Prisma.InputJsonValue;

/** ts-fsrs stores Dates; JSON columns return strings — revive them. */
function reviveFsrs(json: unknown): FsrsCard {
  const c = json as FsrsCard;
  return {
    ...c,
    due: new Date(c.due),
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  };
}

/**
 * Postgres-backed repository (Neon). Same interface as LocalRepository — the
 * app's data access doesn't change. Server-only; call from server actions or
 * route handlers.
 */
export class PrismaRepository implements Repository {
  async getCardState(cardId: string): Promise<StoredCardState | undefined> {
    const row = await prisma.userCardState.findUnique({ where: { cardId } });
    if (!row) return undefined;
    return {
      cardId: row.cardId,
      vocabId: row.vocabId,
      kind: (row.kind as CardKind) ?? "vocab",
      introduced: row.introduced,
      fsrs: reviveFsrs(row.fsrs),
    };
  }

  async getAllCardStates(): Promise<StoredCardState[]> {
    const rows = await prisma.userCardState.findMany();
    return rows.map((r) => ({
      cardId: r.cardId,
      vocabId: r.vocabId,
      kind: (r.kind as CardKind) ?? "vocab",
      introduced: r.introduced,
      fsrs: reviveFsrs(r.fsrs),
    }));
  }

  async putCardState(state: StoredCardState): Promise<void> {
    const data = {
      vocabId: state.vocabId,
      kind: state.kind,
      introduced: state.introduced,
      fsrs: asJson(state.fsrs),
    };
    await prisma.userCardState.upsert({
      where: { cardId: state.cardId },
      create: { cardId: state.cardId, ...data },
      update: data,
    });
  }

  async putCardStates(states: StoredCardState[]): Promise<void> {
    await prisma.$transaction(states.map((s) => {
      const data = {
        vocabId: s.vocabId,
        kind: s.kind,
        introduced: s.introduced,
        fsrs: asJson(s.fsrs),
      };
      return prisma.userCardState.upsert({
        where: { cardId: s.cardId },
        create: { cardId: s.cardId, ...data },
        update: data,
      });
    }));
  }

  async deleteCardState(cardId: string): Promise<void> {
    await prisma.userCardState.deleteMany({ where: { cardId } });
  }

  async appendReviewLog(log: StoredReviewLog): Promise<void> {
    await prisma.reviewLog.create({
      data: {
        cardId: log.cardId,
        log: asJson(log.log),
        reviewedAt: new Date(log.reviewedAt),
      },
    });
  }

  async removeLastReviewLog(cardId: string): Promise<void> {
    const last = await prisma.reviewLog.findFirst({
      where: { cardId },
      orderBy: { id: "desc" },
    });
    if (last) await prisma.reviewLog.delete({ where: { id: last.id } });
  }

  async getReviewLogs(cardId?: string): Promise<StoredReviewLog[]> {
    const rows = await prisma.reviewLog.findMany({
      where: cardId ? { cardId } : undefined,
      orderBy: { id: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      cardId: r.cardId,
      log: r.log as unknown as FsrsReviewLog,
      reviewedAt: r.reviewedAt.toISOString(),
    }));
  }

  async getStreakDays(): Promise<StreakDay[]> {
    return prisma.streakDay.findMany();
  }

  async getStreakDay(date: string): Promise<StreakDay | undefined> {
    return (await prisma.streakDay.findUnique({ where: { date } })) ?? undefined;
  }

  async putStreakDay(day: StreakDay): Promise<void> {
    await prisma.streakDay.upsert({
      where: { date: day.date },
      create: { ...day, frozen: day.frozen ?? false },
      update: {
        cardsCompleted: day.cardsCompleted,
        goalMet: day.goalMet,
        frozen: day.frozen ?? false,
      },
    });
  }

  async getSettings(): Promise<Settings> {
    const row = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
    if (!row) return DEFAULT_SETTINGS;
    const { id: _id, ...rest } = row;
    void _id;
    return { ...DEFAULT_SETTINGS, ...rest, theme: rest.theme as Settings["theme"] };
  }

  async saveSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.getSettings()), ...patch };
    await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...next },
      update: next,
    });
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
    await prisma.$transaction([
      prisma.userCardState.deleteMany(),
      prisma.reviewLog.deleteMany(),
      prisma.streakDay.deleteMany(),
      prisma.settings.deleteMany(),
      prisma.userCardState.createMany({
        data: bundle.cardStates.map((s) => ({
          cardId: s.cardId,
          vocabId: s.vocabId,
          kind: s.kind,
          introduced: s.introduced,
          fsrs: asJson(s.fsrs),
        })),
      }),
      prisma.reviewLog.createMany({
        data: bundle.reviewLogs.map((l) => ({
          cardId: l.cardId,
          log: asJson(l.log),
          reviewedAt: new Date(l.reviewedAt),
        })),
      }),
      prisma.streakDay.createMany({ data: bundle.streakDays }),
      prisma.settings.create({ data: { id: SETTINGS_ID, ...bundle.settings } }),
    ]);
  }

  async reset(): Promise<void> {
    await prisma.$transaction([
      prisma.userCardState.deleteMany(),
      prisma.reviewLog.deleteMany(),
      prisma.streakDay.deleteMany(),
      prisma.settings.deleteMany(),
    ]);
  }
}
