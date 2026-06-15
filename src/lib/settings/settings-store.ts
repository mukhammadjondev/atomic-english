"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { getRepository } from "@/lib/store";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/store/types";

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

let loadStarted = false;

export const useSettings = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  async load() {
    if (loadStarted) return;
    loadStarted = true;
    const settings = await getRepository().getSettings();
    set({ settings, loaded: true });
  },
  async update(patch) {
    const settings = await getRepository().saveSettings(patch);
    set({ settings });
  },
}));

/** Load persisted settings once, on the client. */
export function useEnsureSettings(): boolean {
  const load = useSettings((s) => s.load);
  const loaded = useSettings((s) => s.loaded);
  useEffect(() => {
    void load();
  }, [load]);
  return loaded;
}
