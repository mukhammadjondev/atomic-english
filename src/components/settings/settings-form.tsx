"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Bell, Download, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  notificationsSupported,
  requestNotificationPermission,
} from "@/lib/habits/use-reminder";
import { useEnsureSettings, useSettings } from "@/lib/settings/settings-store";
import { getRepository } from "@/lib/store";
import type { ExportBundle } from "@/lib/store/types";
import { ensureVoices, listEnglishVoices } from "@/lib/tts/voices";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SettingsForm() {
  const loaded = useEnsureSettings();
  const { settings, update } = useSettings();
  const { setTheme } = useTheme();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureVoices().then(() => setVoices(listEnglishVoices()));
  }, []);

  if (!loaded) {
    return <p className="py-10 text-muted-foreground">Loading settings…</p>;
  }

  async function exportData() {
    const bundle = await getRepository().exportAll();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atomic-english-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    const text = await file.text();
    try {
      const bundle = JSON.parse(text) as ExportBundle;
      await getRepository().importAll(bundle);
      window.location.reload();
    } catch {
      alert("That file couldn't be imported. Make sure it's an Atomic English export.");
    }
  }

  async function resetAll() {
    if (!confirm("Erase all progress, streaks, and settings? This can't be undone.")) {
      return;
    }
    await getRepository().reset();
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <Section title="Daily session">
        <NumberRow
          label="New words per day"
          hint="Each word brings its full set of cards. Keep this low — starting is the win."
          value={settings.newCardsPerDay}
          min={0}
          max={50}
          onChange={(v) => update({ newCardsPerDay: v })}
        />
        <NumberRow
          label="New grammar per day"
          hint="New grammar exercises introduced in the grammar practice mode."
          value={settings.grammarPerDay}
          min={0}
          max={50}
          onChange={(v) => update({ grammarPerDay: v })}
        />
        <NumberRow
          label="Review cap per day"
          value={settings.reviewCap}
          min={5}
          max={200}
          onChange={(v) => update({ reviewCap: v })}
        />
        <NumberRow
          label="Daily goal (cards)"
          hint="Cards needed to mark the day done."
          value={settings.dailyGoalCards}
          min={1}
          max={100}
          onChange={(v) => update({ dailyGoalCards: v })}
        />
        <NumberRow
          label="Target retention"
          hint="0.90 recommended. Higher = many more reviews."
          value={settings.retention}
          min={0.8}
          max={0.97}
          step={0.01}
          onChange={(v) => update({ retention: v })}
        />
        <div className="space-y-1.5">
          <Label htmlFor="weak-tags">Weak-spot tags</Label>
          <Input
            id="weak-tags"
            placeholder="weak-spot, conditionals"
            value={settings.weakSpotTags.join(", ")}
            onChange={(e) =>
              update({
                weakSpotTags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
          <p className="text-sm text-muted-foreground">
            New words tagged with these surface first in your daily queue.
          </p>
        </div>
      </Section>

      <Section title="Pronunciation">
        <Row label="Voice">
          <select
            className={selectClass}
            value={settings.ttsVoice ?? ""}
            onChange={(e) => update({ ttsVoice: e.target.value || null })}
          >
            <option value="">Automatic (best available)</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </Row>
        <Row label="Auto-play on reveal" hint="Speak the word when the answer shows.">
          <Switch
            checked={settings.ttsAutoplay}
            onCheckedChange={(c: boolean) => update({ ttsAutoplay: c })}
          />
        </Row>
      </Section>

      <Section title="Appearance & habit">
        <Row label="Theme">
          <select
            className={selectClass}
            value={settings.theme}
            onChange={(e) => {
              const theme = e.target.value as typeof settings.theme;
              setTheme(theme);
              update({ theme });
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Row>
        <div className="space-y-1.5">
          <Label htmlFor="cue">Habit cue</Label>
          <Input
            id="cue"
            placeholder="After I finish reading at 20:30, I open Atomic English"
            value={settings.habitCue}
            onChange={(e) => update({ habitCue: e.target.value })}
          />
          <p className="text-sm text-muted-foreground">
            Stack the habit onto something you already do.
          </p>
        </div>
        <ReminderField />
      </Section>

      <Section title="Your data">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData} className="gap-2">
            <Download className="size-4" /> Export
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="gap-2"
          >
            <Upload className="size-4" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
              e.target.value = "";
            }}
          />
          <Button variant="destructive" onClick={resetAll} className="gap-2">
            <RotateCcw className="size-4" /> Reset everything
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Export keeps a portable backup of your progress. Import replaces all
          current data.
        </p>
      </Section>
    </div>
  );
}

function ReminderField() {
  const { settings, update } = useSettings();
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  // resolve permission on the client only — avoids an SSR/client mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-only API after mount
    if (notificationsSupported()) setPerm(Notification.permission);
  }, []);

  const hint =
    perm === "unsupported"
      ? "This browser doesn't support notifications."
      : perm === "granted"
        ? "You'll get a nudge if you haven't studied by then (while the app is open)."
        : perm === "denied"
          ? "Notifications are blocked — enable them in your browser settings."
          : "Set a time, then enable notifications.";

  async function enable() {
    setPerm(await requestNotificationPermission());
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="reminder">Daily reminder</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="reminder"
          type="time"
          className="w-36"
          value={settings.reminderTime}
          onChange={(e) => update({ reminderTime: e.target.value })}
        />
        {settings.reminderTime &&
          perm !== "granted" &&
          perm !== "unsupported" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enable}
              className="gap-1.5"
            >
              <Bell className="size-4" /> Enable notifications
            </Button>
          )}
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium">{label}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function NumberRow({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <Row label={label} hint={hint}>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className={cn("h-9 w-24 text-right")}
      />
    </Row>
  );
}
