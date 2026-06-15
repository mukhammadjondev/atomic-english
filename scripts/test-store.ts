/** Smoke-test the LocalRepository against an in-memory IndexedDB. */
import "fake-indexeddb/auto";
import { createEmptyCard } from "ts-fsrs";
import { LocalRepository } from "../src/lib/store/local-repository";
import { DEFAULT_SETTINGS } from "../src/lib/store/types";

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error("✗ " + msg);
    process.exit(1);
  }
  console.log("✓ " + msg);
}

async function main() {
  const repo = new LocalRepository();

  await repo.putCardState({
    cardId: "v-0001-c1",
    vocabId: "v-0001",
    kind: "vocab",
    fsrs: createEmptyCard(),
    introduced: true,
  });
  const got = await repo.getCardState("v-0001-c1");
  assert(got?.vocabId === "v-0001", "card state round-trips");

  const settings = await repo.getSettings();
  assert(
    settings.newCardsPerDay === DEFAULT_SETTINGS.newCardsPerDay,
    "settings fall back to defaults",
  );
  const saved = await repo.saveSettings({ newCardsPerDay: 7 });
  assert(saved.newCardsPerDay === 7, "settings patch persists");
  assert(
    (await repo.getSettings()).reviewCap === DEFAULT_SETTINGS.reviewCap,
    "unpatched settings keep defaults",
  );

  await repo.putStreakDay({
    date: "2026-06-13",
    cardsCompleted: 12,
    goalMet: true,
  });
  assert((await repo.getStreakDays()).length === 1, "streak day stored");

  const bundle = await repo.exportAll();
  assert(bundle.cardStates.length === 1, "export captures card states");

  // simulate a "fresh device": new repo wiped, then import
  await repo.reset();
  assert((await repo.getAllCardStates()).length === 0, "reset clears data");
  await repo.importAll(bundle);
  assert(
    (await repo.getAllCardStates()).length === 1,
    "import restores from bundle",
  );

  console.log("\nAll store checks passed.");
}

main();
