/**
 * Pre-generate natural-voice MP3s for every word + example sentence using
 * edge-tts (free Microsoft neural voices), then write the audio URLs back into
 * the content blocks. Layer-2 TTS — runtime falls back to Web Speech without it.
 *
 *   pnpm tsx scripts/generate-audio.ts          # generate missing audio
 *   pnpm tsx scripts/generate-audio.ts --force  # regenerate everything
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const VOICE = process.env.TTS_VOICE ?? "en-US-AriaNeural";
const BLOCKS_DIR = path.join(process.cwd(), "content", "blocks");
const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
const FORCE = process.argv.includes("--force");

interface ExampleJson {
  en: string;
  audioUrl?: string | null;
  [k: string]: unknown;
}
interface VocabJson {
  id: string;
  word: string;
  audioUrl?: string | null;
  examples?: ExampleJson[];
  [k: string]: unknown;
}
interface BlockJson {
  vocabulary?: VocabJson[];
  [k: string]: unknown;
}

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function synth(tts: MsEdgeTTS, text: string, file: string) {
  const out = path.join(AUDIO_DIR, file);
  if (!FORCE && (await exists(out))) return;
  const { audioStream } = tts.toStream(text);
  await pipeline(audioStream, createWriteStream(out));
  console.log(`  ♪ ${file}`);
}

async function main() {
  await mkdir(AUDIO_DIR, { recursive: true });
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const files = (await readdir(BLOCKS_DIR)).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const full = path.join(BLOCKS_DIR, file);
    const block = JSON.parse(await readFile(full, "utf8")) as BlockJson;
    console.log(`\n${file}`);

    for (const v of block.vocabulary ?? []) {
      const wordFile = `${v.id}.mp3`;
      await synth(tts, v.word, wordFile);
      v.audioUrl = `/audio/${wordFile}`;

      const examples = v.examples ?? [];
      for (let i = 0; i < examples.length; i++) {
        const exFile = `${v.id}-ex${i + 1}.mp3`;
        await synth(tts, examples[i].en, exFile);
        examples[i].audioUrl = `/audio/${exFile}`;
      }
    }

    await writeFile(full, JSON.stringify(block, null, 2) + "\n");
    console.log(`  ✓ wrote audio URLs back to ${file}`);
  }

  console.log("\nDone. Audio in /public/audio, URLs saved to blocks.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
