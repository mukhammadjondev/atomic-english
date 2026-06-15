/** Unit-test the FSRS grading rules (the science that must be correct). */
import { Rating, State } from "ts-fsrs";
import {
  autoGrade,
  isCorrect,
  normalizeAnswer,
  gradeFromKey,
  gradeAnswer,
  gradeFromStatus,
} from "../src/lib/srs/grade";
import { levenshtein, typoBudget } from "../src/lib/srs/distance";
import { reviewForecast } from "../src/lib/srs/forecast";
import { computeStreak } from "../src/lib/habits/streak";
import { emptyCard, makeScheduler, reviewCard, isDue } from "../src/lib/srs/scheduler";
import { buildGrammarQueue } from "../src/lib/grammar/queue";
import type { GrammarCard } from "../src/lib/grammar/study-types";
import type { StoredCardState, StreakDay } from "../src/lib/store/types";

let failures = 0;
function assert(ok: boolean, msg: string) {
  console.log((ok ? "✓ " : "✗ ") + msg);
  if (!ok) failures++;
}

// --- answer matching ---
assert(normalizeAnswer("  Establish.  ") === "establish", "normalize trims + lowercases + strips punctuation");
assert(isCorrect("establish", "establish"), "exact match is correct");
assert(isCorrect("Set Aside", "set aside"), "case-insensitive match");
assert(isCorrect("colour", "color", ["colour"]), "accepted variant matches");
assert(!isCorrect("estabish", "establish"), "typo is wrong");
assert(!isCorrect("", "establish"), "empty is wrong");

// --- auto grade ---
assert(autoGrade(true) === Rating.Good, "correct → Good");
assert(autoGrade(false) === Rating.Again, "wrong → Again");
assert(gradeFromKey("1") === Rating.Again && gradeFromKey("4") === Rating.Easy, "key map");

// --- edit distance + typo tolerance ---
assert(levenshtein("establish", "establish") === 0, "distance of identical is 0");
assert(levenshtein("estabish", "establish") === 1, "one missing letter = distance 1");
assert(typoBudget(3) === 0 && typoBudget(6) === 1 && typoBudget(10) === 2, "typo budget scales with length");
assert(gradeAnswer("establish", "establish").status === "correct", "exact answer → correct");
assert(gradeAnswer("estabish", "establish").status === "near", "one typo on a long word → near");
assert(gradeAnswer("cat", "dog").status === "wrong", "unrelated short word → wrong");
assert(gradeAnswer("colour", "color", ["colour"]).status === "correct", "accepted variant → correct");
assert(gradeFromStatus("correct") === Rating.Good, "correct → Good grade");
assert(gradeFromStatus("near") === Rating.Hard, "near → Hard grade");
assert(gradeFromStatus("wrong") === Rating.Again, "wrong → Again grade");

// --- scheduler advances a card ---
const scheduler = makeScheduler(0.9);
const now = new Date("2026-06-13T08:00:00Z");
const fresh = emptyCard(now);
assert(fresh.state === State.New, "new card starts in New state");

const good = reviewCard(scheduler, fresh, Rating.Good, now);
assert(good.card.reps === 1, "Good review increments reps");
assert(new Date(good.card.due).getTime() > now.getTime(), "Good pushes due into the future");
assert(!isDue(good.card, now), "card not due immediately after Good");

const again = reviewCard(scheduler, fresh, Rating.Again, now);
assert(again.card.lapses >= 0 && again.card.reps === 1, "Again still logs a rep");

// --- review forecast ---
const fcToday = "2026-06-14";
const mkState = (due: string): StoredCardState => ({
  cardId: "c-" + due,
  vocabId: "v",
  kind: "vocab",
  introduced: true,
  fsrs: { ...emptyCard(new Date(due)), due: new Date(due), state: State.Review },
});
const forecast = reviewForecast(
  [mkState("2026-06-10"), mkState("2026-06-14"), mkState("2026-06-16")],
  14,
  fcToday,
);
assert(forecast[0].due === 2, "overdue + today fold into today's bucket");
assert(
  forecast.find((d) => d.date === "2026-06-16")?.due === 1,
  "a future-due card lands on its own day",
);

// --- streak: rest days bridge, real gaps reset ---
const bridged: StreakDay[] = [
  { date: "2026-06-12", cardsCompleted: 10, goalMet: true },
  { date: "2026-06-13", cardsCompleted: 0, goalMet: false, frozen: true },
  { date: "2026-06-14", cardsCompleted: 10, goalMet: true },
];
const bridgedInfo = computeStreak(bridged, "2026-06-14");
assert(bridgedInfo.current === 2, "a frozen rest day bridges the streak");
assert(bridgedInfo.todayDone === true, "today met → todayDone");

const gapInfo = computeStreak(
  [
    { date: "2026-06-12", cardsCompleted: 10, goalMet: true },
    { date: "2026-06-14", cardsCompleted: 10, goalMet: true },
  ],
  "2026-06-14",
);
assert(gapInfo.current === 1, "an uncovered gap resets the streak");

// --- grammar queue: ladder, lapse priority, deterministic interleave ---
const gnow = new Date("2026-06-14T08:00:00Z");
const gcard = (
  id: string,
  cefr: GrammarCard["cefr"],
  type: GrammarCard["type"] = "multiple_choice",
  tags?: string[],
): GrammarCard => ({
  cardId: id,
  topicId: "t-" + id,
  topic: "T",
  type,
  prompt: "p",
  answer: "a",
  cefr,
  tags,
});
const gState = (
  id: string,
  patch: Partial<StoredCardState["fsrs"]>,
): StoredCardState => ({
  cardId: id,
  vocabId: "t",
  kind: "grammar",
  introduced: true,
  fsrs: { ...emptyCard(gnow), state: State.Review, ...patch },
});

const ladderCards = [gcard("g1", "A2"), gcard("g2", "A2"), gcard("g3", "B2"), gcard("g4", "B2")];
const qLocked = buildGrammarQueue({
  cards: ladderCards,
  states: new Map(),
  reviewCap: 20,
  grammarPerDay: 10,
  now: gnow,
});
assert(
  qLocked.items.length === 2 && qLocked.items.every((i) => i.cefr === "A2"),
  "grammar ladder: lowest CEFR band surfaces first, higher band locked",
);

const masteredA2 = new Map<string, StoredCardState>([
  ["g1", gState("g1", { due: new Date("2026-07-01") })],
  ["g2", gState("g2", { due: new Date("2026-07-01") })],
]);
const qUnlocked = buildGrammarQueue({
  cards: ladderCards,
  states: masteredA2,
  reviewCap: 20,
  grammarPerDay: 10,
  now: gnow,
});
assert(
  qUnlocked.items.length === 2 && qUnlocked.items.every((i) => i.cefr === "B2"),
  "grammar ladder: next band unlocks once the lower band is mastered/exhausted",
);

const dueCards = [gcard("d1", "A2"), gcard("d2", "A2")];
const dueStates = new Map<string, StoredCardState>([
  ["d1", gState("d1", { lapses: 0, due: new Date("2026-06-10") })],
  ["d2", gState("d2", { lapses: 2, due: new Date("2026-06-13") })],
]);
const qDue = buildGrammarQueue({
  cards: dueCards,
  states: dueStates,
  reviewCap: 20,
  grammarPerDay: 0,
  now: gnow,
});
assert(
  qDue.items[0].cardId === "d2",
  "grammar due: a lapsed item resurfaces before an earlier-due clean item",
);

const interCards = ["m1", "m2", "m3", "m4"].map((id) => gcard(id, "A2", "fill_blank"));
const seqA = buildGrammarQueue({ cards: interCards, states: new Map(), reviewCap: 20, grammarPerDay: 10, now: gnow });
const seqB = buildGrammarQueue({ cards: interCards, states: new Map(), reviewCap: 20, grammarPerDay: 10, now: gnow });
assert(
  seqA.items.map((i) => i.cardId).join() === seqB.items.map((i) => i.cardId).join(),
  "grammar interleave is deterministic for the same day",
);

console.log(failures === 0 ? "\nAll SRS checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
