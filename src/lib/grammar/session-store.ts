import { create } from "zustand";
import type { Grade } from "ts-fsrs";
import { getRepository } from "@/lib/store";
import type { Settings, StoredCardState, StreakDay } from "@/lib/store/types";
import { dayKey } from "@/lib/date";
import { emptyCard, makeScheduler, reviewCard } from "@/lib/srs/scheduler";
import {
  autoGrade,
  gradeAnswer,
  gradeFromStatus,
  type AnswerStatus,
} from "@/lib/srs/grade";
import { recordCardCompleted } from "@/lib/habits/streak";
import { buildGrammarQueue } from "./queue";
import type { GrammarCard, GrammarQueueItem } from "./study-types";

/** Snapshot captured before a grade so the learner can undo a mis-tap. */
interface UndoSnapshot {
  cardId: string;
  prevState?: StoredCardState;
  prevStreakDay?: StreakDay;
  dayKey: string;
  index: number;
  reviewedCount: number;
  correctCount: number;
  goalMet: boolean;
  lastCorrect: boolean | null;
  lastStatus: AnswerStatus | null;
  lastInput: string;
  suggestedRating: Grade | null;
}

type Status = "idle" | "active" | "done";

interface GrammarSessionState {
  status: Status;
  queue: GrammarQueueItem[];
  index: number;
  revealed: boolean;
  /** null for choice/build (auto-graded); set for typed answers */
  lastStatus: AnswerStatus | null;
  lastCorrect: boolean | null;
  lastInput: string;
  suggestedRating: Grade | null;
  reviewedCount: number;
  correctCount: number;
  dueCount: number;
  newCount: number;
  goalMet: boolean;
  undoable: boolean;

  // internal
  _settings: Settings | null;
  _states: Map<string, StoredCardState>;
  _undo: UndoSnapshot | null;

  start: (cards: GrammarCard[]) => Promise<void>;
  answer: (ok: boolean, raw: string) => void;
  grade: (rating: Grade) => Promise<void>;
  undo: () => Promise<void>;
  current: () => GrammarQueueItem | null;
  reset: () => void;
}

function isTyped(type: GrammarQueueItem["type"]): boolean {
  return type === "fill_blank" || type === "error_correction";
}

export const useGrammarSession = create<GrammarSessionState>((set, get) => ({
  status: "idle",
  queue: [],
  index: 0,
  revealed: false,
  lastStatus: null,
  lastCorrect: null,
  lastInput: "",
  suggestedRating: null,
  reviewedCount: 0,
  correctCount: 0,
  dueCount: 0,
  newCount: 0,
  goalMet: false,
  undoable: false,
  _settings: null,
  _states: new Map(),
  _undo: null,

  async start(cards) {
    const repo = getRepository();
    const settings = await repo.getSettings();
    const states = new Map(
      (await repo.getAllCardStates()).map((s) => [s.cardId, s]),
    );
    const { items, dueCount, newCount } = buildGrammarQueue({
      cards,
      states,
      reviewCap: settings.reviewCap,
      grammarPerDay: settings.grammarPerDay,
      weakSpotTags: settings.weakSpotTags,
    });

    set({
      _settings: settings,
      _states: states,
      _undo: null,
      queue: items,
      dueCount,
      newCount,
      index: 0,
      revealed: false,
      lastStatus: null,
      lastCorrect: null,
      lastInput: "",
      suggestedRating: null,
      reviewedCount: 0,
      correctCount: 0,
      goalMet: false,
      undoable: false,
      status: items.length === 0 ? "done" : "active",
    });
  },

  answer(ok, raw) {
    const item = get().current();
    if (!item || get().revealed) return;
    if (isTyped(item.type)) {
      const { status } = gradeAnswer(raw, item.answer, item.accepted);
      set({
        revealed: true,
        lastStatus: status,
        lastCorrect: status === "correct",
        lastInput: raw,
        suggestedRating: gradeFromStatus(status),
      });
    } else {
      set({
        revealed: true,
        lastStatus: null,
        lastCorrect: ok,
        lastInput: raw,
        suggestedRating: autoGrade(ok),
      });
    }
  },

  async grade(rating) {
    const state = get();
    const item = state.current();
    const settings = state._settings;
    if (!item || !settings) return;

    const repo = getRepository();
    const scheduler = makeScheduler(settings.retention);
    const now = new Date();
    const date = dayKey(now);
    const prev = state._states.get(item.cardId);
    const prevStreakDay = await repo.getStreakDay(date);
    const fsrsCard = prev?.fsrs ?? emptyCard(now);
    const { card: nextFsrs, log } = reviewCard(scheduler, fsrsCard, rating, now);

    const nextState: StoredCardState = {
      cardId: item.cardId,
      vocabId: item.topicId,
      kind: "grammar",
      fsrs: nextFsrs,
      introduced: true,
    };
    await repo.putCardState(nextState);
    await repo.appendReviewLog({
      cardId: item.cardId,
      log,
      reviewedAt: now.toISOString(),
    });
    const day = await recordCardCompleted(repo, settings, now);

    state._states.set(item.cardId, nextState);

    const undo: UndoSnapshot = {
      cardId: item.cardId,
      prevState: prev,
      prevStreakDay,
      dayKey: date,
      index: state.index,
      reviewedCount: state.reviewedCount,
      correctCount: state.correctCount,
      goalMet: state.goalMet,
      lastCorrect: state.lastCorrect,
      lastStatus: state.lastStatus,
      lastInput: state.lastInput,
      suggestedRating: state.suggestedRating,
    };

    const nextIndex = state.index + 1;
    const finished = nextIndex >= state.queue.length;
    set({
      _undo: undo,
      undoable: true,
      index: nextIndex,
      revealed: false,
      lastStatus: null,
      lastCorrect: null,
      lastInput: "",
      suggestedRating: null,
      reviewedCount: state.reviewedCount + 1,
      correctCount: state.correctCount + (state.lastCorrect ? 1 : 0),
      goalMet: day.goalMet,
      status: finished ? "done" : "active",
    });
  },

  async undo() {
    const u = get()._undo;
    if (!u) return;
    const repo = getRepository();
    const states = get()._states;

    await repo.removeLastReviewLog(u.cardId);
    if (u.prevState) {
      await repo.putCardState(u.prevState);
      states.set(u.cardId, u.prevState);
    } else {
      await repo.deleteCardState(u.cardId);
      states.delete(u.cardId);
    }
    await repo.putStreakDay(
      u.prevStreakDay ?? { date: u.dayKey, cardsCompleted: 0, goalMet: false },
    );

    set({
      status: "active",
      index: u.index,
      revealed: true,
      lastStatus: u.lastStatus,
      lastCorrect: u.lastCorrect,
      lastInput: u.lastInput,
      suggestedRating: u.suggestedRating,
      reviewedCount: u.reviewedCount,
      correctCount: u.correctCount,
      goalMet: u.goalMet,
      undoable: false,
      _undo: null,
    });
  },

  current() {
    const { queue, index } = get();
    return queue[index] ?? null;
  },

  reset() {
    set({
      status: "idle",
      queue: [],
      index: 0,
      revealed: false,
      lastStatus: null,
      lastCorrect: null,
      lastInput: "",
      suggestedRating: null,
      reviewedCount: 0,
      correctCount: 0,
      dueCount: 0,
      newCount: 0,
      goalMet: false,
      undoable: false,
      _settings: null,
      _states: new Map(),
      _undo: null,
    });
  },
}));
