"use client";

import { useEffect, useState } from "react";
import { getRepository } from "@/lib/store";
import {
  accuracyByDay,
  computeStats,
  topicsMastered,
  wordsLearnedByDay,
  type DayPoint,
  type ProgressStats,
} from "@/lib/habits/stats";
import { reviewForecast, type ForecastDay } from "@/lib/srs/forecast";
import { dayKey } from "@/lib/date";
import { BarChart, Sparkline } from "./charts";

interface GrammarData {
  stats: ProgressStats;
  topicsMastered: number;
  accuracy: DayPoint[];
  forecast: ForecastDay[];
}

interface Data {
  stats: ProgressStats;
  accuracy: DayPoint[];
  words: DayPoint[];
  forecast: ForecastDay[];
  grammar: GrammarData | null;
}

export function ProgressView() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const repo = getRepository();
      const [states, logs] = await Promise.all([
        repo.getAllCardStates(),
        repo.getReviewLogs(),
      ]);
      if (!active) return;

      // keep the two SRS streams separate so grammar can't inflate vocab numbers
      const grammarStates = states.filter((s) => s.kind === "grammar");
      const vocabStates = states.filter((s) => s.kind !== "grammar");
      const grammarIds = new Set(grammarStates.map((s) => s.cardId));
      const grammarLogs = logs.filter((l) => grammarIds.has(l.cardId));
      const vocabLogs = logs.filter((l) => !grammarIds.has(l.cardId));

      setData({
        stats: computeStats(vocabStates, vocabLogs),
        accuracy: accuracyByDay(vocabLogs),
        words: wordsLearnedByDay(vocabStates, vocabLogs),
        forecast: reviewForecast(vocabStates),
        grammar: grammarStates.length
          ? {
              stats: computeStats(grammarStates, grammarLogs),
              topicsMastered: topicsMastered(grammarStates),
              accuracy: accuracyByDay(grammarLogs),
              forecast: reviewForecast(grammarStates),
            }
          : null,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!data) {
    return (
      <div className="space-y-5">
        {[96, 200, 200].map((h, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-border bg-card"
            style={{ height: h }}
          />
        ))}
      </div>
    );
  }

  const { stats } = data;
  const summary = [
    { label: "Words learned", value: String(stats.wordsLearned) },
    { label: "Cards mastered", value: String(stats.cardsMastered) },
    { label: "In progress", value: String(stats.cardsInProgress) },
    {
      label: "Accuracy",
      value:
        stats.accuracy === null ? "—" : `${Math.round(stats.accuracy * 100)}%`,
    },
  ];
  const dueSoon = data.forecast.reduce((n, d) => n + d.due, 0);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="font-display text-3xl font-semibold tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <Card
        title="Review forecast"
        hint={`${dueSoon} review${dueSoon === 1 ? "" : "s"} over the next 14 days`}
      >
        <BarChart
          data={data.forecast.map((d) => ({ date: d.date, value: d.due }))}
          highlightDate={dayKey()}
          format={(v) => `${v} due`}
        />
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card title="Words learned" hint="Cumulative, last 14 days">
          <Sparkline data={data.words} />
        </Card>
        <Card title="Accuracy" hint="First-try Good/Easy, last 14 days">
          <BarChart
            data={data.accuracy}
            max={1}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </Card>
      </div>

      {data.grammar && <GrammarSection grammar={data.grammar} />}
    </div>
  );
}

function GrammarSection({ grammar }: { grammar: GrammarData }) {
  const dueSoon = grammar.forecast.reduce((n, d) => n + d.due, 0);
  const summary = [
    { label: "Topics mastered", value: String(grammar.topicsMastered) },
    { label: "Exercises mastered", value: String(grammar.stats.cardsMastered) },
    { label: "In progress", value: String(grammar.stats.cardsInProgress) },
    {
      label: "Accuracy",
      value:
        grammar.stats.accuracy === null
          ? "—"
          : `${Math.round(grammar.stats.accuracy * 100)}%`,
    },
  ];

  return (
    <div className="space-y-5 border-t border-border pt-6">
      <h2 className="font-display text-xl font-semibold">Grammar</h2>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="font-display text-3xl font-semibold tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card
          title="Grammar forecast"
          hint={`${dueSoon} review${dueSoon === 1 ? "" : "s"} over the next 14 days`}
        >
          <BarChart
            data={grammar.forecast.map((d) => ({ date: d.date, value: d.due }))}
            highlightDate={dayKey()}
            format={(v) => `${v} due`}
          />
        </Card>
        <Card title="Grammar accuracy" hint="First-try Good/Easy, last 14 days">
          <BarChart
            data={grammar.accuracy}
            max={1}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
