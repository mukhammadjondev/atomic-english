import { loadBlocks } from "@/lib/content/loader";
import { Dashboard } from "@/components/habits/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  let totalWords = 0;
  let totalCards = 0;
  try {
    const { vocabById, cards } = await loadBlocks();
    totalWords = vocabById.size;
    totalCards = cards.length;
  } catch {
    // dashboard still renders; content issues surface on the study/grammar pages
  }

  return <Dashboard contentSummary={{ totalWords, totalCards }} />;
}
