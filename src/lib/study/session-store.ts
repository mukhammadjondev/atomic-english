import { create } from "zustand";
import type { Grade } from "ts-fsrs";
import { getRepository } from "@/lib/store";
import type { Settings, StoredCardState, StreakDay } from "@/lib/store/types";
import { dayKey } from "@/lib/date";
import { emptyCard, makeScheduler, reviewCard } from "@/lib/srs/scheduler";
import { gradeAnswer, gradeFromStatus, type AnswerStatus } from "@/lib/srs/grade";
import { recordCardCompleted } from "@/lib/habits/streak";
import { buildQueue } from "./queue";
import type { QueueItem, StudyCard } from "./types";

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
/** "meet" = first-encounter exposure for a new word; "drill" = active recall. */
type Phase = "meet" | "drill";

interface SessionState {
  status: Status;
  queue: QueueItem[];
  index: number;
  phase: Phase;
  revealed: boolean;
  /** null for self-graded modes (recall) */
  lastCorrect: boolean | null;
  /** typo-aware judgement of the last typed answer */
  lastStatus: AnswerStatus | null;
  /** what the learner actually typed (for an "almost — you wrote X" hint) */
  lastInput: string;
  suggestedRating: Grade | null;
  reviewedCount: number;
  correctCount: number;
  dueCount: number;
  newCount: number;
  goalMet: boolean;
  /** true while the most recent grade can still be undone */
  undoable: boolean;

  // internal
  _settings: Settings | null;
  _states: Map<string, StoredCardState>;
  /** vocab already "met" this session — so a word's 2nd/3rd new card skips meet */
  _metVocab: Set<string>;
  _undo: UndoSnapshot | null;

  start: (cards: StudyCard[]) => Promise<void>;
  beginDrill: () => void;
  submitTyped: (input: string) => void;
  revealSelf: () => void;
  grade: (rating: Grade) => Promise<void>;
  undo: () => Promise<void>;
  current: () => QueueItem | null;
  reset: () => void;
}

/** A new card whose word hasn't been met yet opens on the meet screen. */
function phaseFor(card: QueueItem | undefined, met: Set<string>): Phase {
  return card && card.isNew && !met.has(card.vocabId) ? "meet" : "drill";
}

export const useStudySession = create<SessionState>((set, get) => ({
  status: "idle",
  queue: [],
  index: 0,
  phase: "drill",
  revealed: false,
  lastCorrect: null,
  lastStatus: null,
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
  _metVocab: new Set(),
  _undo: null,

  async start(cards) {
    const repo = getRepository();
    const settings = await repo.getSettings();
    const states = new Map(
      (await repo.getAllCardStates()).map((s) => [s.cardId, s]),
    );
    const { queue, dueCount, newCount } = buildQueue({
      cards,
      states,
      reviewCap: settings.reviewCap,
      newCardsPerDay: settings.newCardsPerDay,
      weakSpotTags: settings.weakSpotTags,
    });

    const met = new Set<string>();
    set({
      _settings: settings,
      _states: states,
      _metVocab: met,
      _undo: null,
      queue,
      dueCount,
      newCount,
      index: 0,
      phase: phaseFor(queue[0], met),
      revealed: false,
      lastCorrect: null,
      lastStatus: null,
      lastInput: "",
      suggestedRating: null,
      reviewedCount: 0,
      correctCount: 0,
      goalMet: false,
      undoable: false,
      status: queue.length === 0 ? "done" : "active",
    });
  },

  beginDrill() {
    const card = get().current();
    if (card) get()._metVocab.add(card.vocabId);
    set({ phase: "drill" });
  },

  submitTyped(input) {
    const card = get().current();
    if (!card || get().revealed) return;
    const { status } = gradeAnswer(input, card.answer, card.accepted);
    set({
      revealed: true,
      lastCorrect: status === "correct",
      lastStatus: status,
      lastInput: input,
      suggestedRating: gradeFromStatus(status),
    });
  },

  revealSelf() {
    if (get().revealed) return;
    set({
      revealed: true,
      lastCorrect: null,
      lastStatus: null,
      lastInput: "",
      suggestedRating: null,
    });
  },

  async grade(rating) {
    const state = get();
    const card = state.current();
    const settings = state._settings;
    if (!card || !settings) return;

    const repo = getRepository();
    const scheduler = makeScheduler(settings.retention);
    const now = new Date();
    const date = dayKey(now);
    const prev = state._states.get(card.cardId);
    const prevStreakDay = await repo.getStreakDay(date);
    const fsrsCard = prev?.fsrs ?? emptyCard(now);
    const { card: nextFsrs, log } = reviewCard(scheduler, fsrsCard, rating, now);

    const nextState: StoredCardState = {
      cardId: card.cardId,
      vocabId: card.vocabId,
      kind: "vocab",
      fsrs: nextFsrs,
      introduced: true,
    };
    await repo.putCardState(nextState);
    await repo.appendReviewLog({
      cardId: card.cardId,
      log,
      reviewedAt: now.toISOString(),
    });
    const day = await recordCardCompleted(repo, settings, now);

    state._states.set(card.cardId, nextState);

    const undo: UndoSnapshot = {
      cardId: card.cardId,
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
      phase: phaseFor(state.queue[nextIndex], state._metVocab),
      revealed: false,
      lastCorrect: null,
      lastStatus: null,
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
      phase: "drill",
      revealed: true,
      lastCorrect: u.lastCorrect,
      lastStatus: u.lastStatus,
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
      phase: "drill",
      revealed: false,
      lastCorrect: null,
      lastStatus: null,
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
      _metVocab: new Set(),
      _undo: null,
    });
  },
}));
