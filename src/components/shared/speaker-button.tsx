"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveSpeak } from "@/lib/tts/speak";
import { useEnsureSettings, useSettings } from "@/lib/settings/settings-store";
import { cn } from "@/lib/utils";

interface SpeakerButtonProps {
  /** text to speak (used when no pre-generated audio exists) */
  text: string;
  /** optional pre-generated MP3 (layer-2 TTS) */
  audioUrl?: string | null;
  label?: string;
  size?: "icon" | "icon-sm";
  className?: string;
}

/** Small speaker control. Plays MP3 if available, else Web Speech. Reusable
 *  anywhere a word, example, or grammar example appears. */
export function SpeakerButton({
  text,
  audioUrl,
  label,
  size = "icon",
  className,
}: SpeakerButtonProps) {
  const [playing, setPlaying] = useState(false);
  const voiceName = useSettings((s) => s.settings.ttsVoice);
  useEnsureSettings();

  return (
    <Button
      variant="ghost"
      size={size}
      aria-label={label ?? `Hear "${text}"`}
      onClick={() =>
        resolveSpeak(text, audioUrl, {
          voiceName,
          onStart: () => setPlaying(true),
          onEnd: () => setPlaying(false),
        })
      }
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      <Volume2 className={cn(playing && "animate-pulse text-primary")} />
    </Button>
  );
}
