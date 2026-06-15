"use client";

import { useEffect } from "react";
import { dayKey } from "@/lib/date";

/** "HH:MM" → minutes since midnight, or null if malformed/empty. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Ask the browser for notification permission. Returns the resulting state. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  return Notification.requestPermission();
}

/**
 * Best-effort daily reminder. While the app is open and permission is granted,
 * once the local clock passes the reminder time and today's goal isn't met, fire
 * a single notification (guarded once per day). True background reminders need a
 * push server — out of scope; this nudges whenever the tab is alive.
 */
export function useDailyReminder({
  time,
  goalMet,
  cue,
}: {
  time: string;
  goalMet: boolean;
  cue: string;
}) {
  useEffect(() => {
    const target = toMinutes(time);
    if (target === null || goalMet) return;
    if (!notificationsSupported() || Notification.permission !== "granted") {
      return;
    }

    const fireKey = `ae-reminded-${dayKey()}`;

    const check = () => {
      if (localStorage.getItem(fireKey)) return;
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      if (mins < target) return;
      localStorage.setItem(fireKey, "1");
      new Notification("Atomic English", {
        body: cue || "Two minutes keeps the chain alive. Ready for today?",
        icon: "/icons/icon-192.png",
      });
    };

    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [time, goalMet, cue]);
}
