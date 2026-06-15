"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  BookText,
  Library,
  MessageCircle,
  PenLine,
  Settings as SettingsIcon,
  Snowflake,
  Target,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { StreakChain, type DayCell } from "./streak-chain";
import { DailyGoal } from "./daily-goal";
import { ChainCalendar } from "./chain-calendar";
import { IdentityAffirmation } from "./identity-affirmation";
import { getRepository } from "@/lib/store";
import { computeStreak, spendRestDay, type StreakInfo } from "@/lib/habits/streak";
import { computeStats, type ProgressStats } from "@/lib/habits/stats";
import { useDailyReminder } from "@/lib/habits/use-reminder";
import { celebrate } from "@/lib/celebrate";
import { addDays, dayKey } from "@/lib/date";
import { FEATURES } from "@/lib/config";

interface DashboardData {
  streak: StreakInfo;
  metDates: Set<string>;
  frozenDates: Set<string>;
  cells: DayCell[];
  completedToday: number;
  dailyGoal: number;
  stats: ProgressStats;
  habitCue: string;
  reminderTime: string;
}

function lastNDays(
  n: number,
  metDates: Set<string>,
  frozenDates: Set<string>,
): DayCell[] {
  const today = dayKey();
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(today, -(n - 1 - i));
    return {
      key,
      met: metDates.has(key),
      frozen: frozenDates.has(key),
      isToday: key === today,
    };
  });
}

export function Dashboard({
  contentSummary,
}: {
  contentSummary: { totalWords: number; totalCards: number };
}) {
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    const repo = getRepository();
    const [days, states, logs, settings] = await Promise.all([
      repo.getStreakDays(),
      repo.getAllCardStates(),
      repo.getReviewLogs(),
      repo.getSettings(),
    ]);
    const metDates = new Set(days.filter((d) => d.goalMet).map((d) => d.date));
    const frozenDates = new Set(
      days.filter((d) => d.frozen).map((d) => d.date),
    );
    setData({
      streak: computeStreak(days),
      metDates,
      frozenDates,
      cells: lastNDays(14, metDates, frozenDates),
      completedToday:
        days.find((d) => d.date === dayKey())?.cardsCompleted ?? 0,
      dailyGoal: settings.dailyGoalCards,
      stats: computeStats(states, logs),
      habitCue: settings.habitCue,
      reminderTime: settings.reminderTime,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async load on mount
    void load();
  }, [load]);

  useDailyReminder({
    time: data?.reminderTime ?? "",
    goalMet: data?.streak.todayDone ?? false,
    cue: data?.habitCue ?? "",
  });

  async function takeRestDay() {
    await spendRestDay(getRepository());
    await load();
  }

  // celebrate once per day when the goal is met
  useEffect(() => {
    if (!data?.streak.todayDone) return;
    const key = `ae-celebrated-${dayKey()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    celebrate();
  }, [data?.streak.todayDone]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <span className="font-display text-xl font-semibold tracking-tight">
          Atomic English
        </span>
        <div className="flex items-center gap-1">
          <NavLink href="/library" label="Words">
            <Library className="size-5" />
          </NavLink>
          <NavLink href="/grammar" label="Grammar">
            <BookOpen className="size-5" />
          </NavLink>
          <NavLink href="/progress" label="Progress">
            <BarChart3 className="size-5" />
          </NavLink>
          {FEATURES.reading && (
            <NavLink href="/read" label="Reading">
              <BookText className="size-5" />
            </NavLink>
          )}
          {FEATURES.writing && (
            <NavLink href="/write" label="Writing">
              <PenLine className="size-5" />
            </NavLink>
          )}
          {FEATURES.speaking && (
            <NavLink href="/speaking" label="Speaking">
              <MessageCircle className="size-5" />
            </NavLink>
          )}
          <NavLink href="/settings" label="Settings">
            <SettingsIcon className="size-5" />
          </NavLink>
          <ThemeToggle />
        </div>
      </header>

      {!data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <StreakChain current={data.streak.current} days={data.cells} />
          <DailyGoal completed={data.completedToday} goal={data.dailyGoal} />

          {!data.streak.todayDone && data.streak.freezeAvailable > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Snowflake className="size-4 shrink-0 text-primary" />
                Can&apos;t study today? Spend a rest day to keep your chain — you
                have {data.streak.freezeAvailable}.
              </p>
              <Button variant="outline" size="sm" onClick={takeRestDay}>
                Use a rest day
              </Button>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <ChainCalendar
              metDates={data.metDates}
              frozenDates={data.frozenDates}
            />
            <StatsPanel stats={data.stats} content={contentSummary} longest={data.streak.longest} />
          </div>

          <IdentityAffirmation />

          {data.habitCue && (
            <p className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Target className="size-4 shrink-0 text-primary" />
              {data.habitCue}
            </p>
          )}
        </>
      )}
    </main>
  );
}

function NavLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function StatsPanel({
  stats,
  content,
  longest,
}: {
  stats: ProgressStats;
  content: { totalWords: number; totalCards: number };
  longest: number;
}) {
  const items = [
    { label: "Words learned", value: `${stats.wordsLearned} / ${content.totalWords}` },
    { label: "Cards mastered", value: String(stats.cardsMastered) },
    {
      label: "Accuracy",
      value: stats.accuracy === null ? "—" : `${Math.round(stats.accuracy * 100)}%`,
    },
    { label: "Longest streak", value: `${longest}d` },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <Link
        href="/progress"
        className="mb-4 inline-flex items-center gap-1 font-display text-lg font-semibold transition-colors hover:text-primary"
      >
        Progress <span aria-hidden>→</span>
      </Link>
      <dl className="grid grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="text-sm text-muted-foreground">{it.label}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">
              {it.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {[140, 180, 220].map((h) => (
        <div
          key={h}
          className="animate-pulse rounded-2xl border border-border bg-card"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}
