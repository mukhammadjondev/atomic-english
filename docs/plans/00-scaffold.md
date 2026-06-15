# Phase 00 — Scaffold

**Goal:** Next.js app boots with the Warm Focus design system and dark mode.

## Steps
1. `create-next-app` — App Router, TS, Tailwind v4, ESLint, `src/`, `@/*` alias, pnpm.
2. Install deps: `zod ts-fsrs zustand framer-motion canvas-confetti react-markdown remark-gfm idb clsx tailwind-merge lucide-react next-themes class-variance-authority @radix-ui/react-slot` (+ `@types/canvas-confetti`).
3. `src/app/globals.css` — Warm Focus tokens (light + `.dark`), `@theme inline` mapping, type scale, focus ring, reduced-motion guard.
4. Fonts via `next/font/google`: Fraunces (`--font-fraunces`), Inter (`--font-inter`), JetBrains Mono (`--font-jetbrains`).
5. `components/theme-provider.tsx` (next-themes, `attribute="class"`) wired in `layout.tsx`.
6. `lib/utils.ts` → `cn()`. `components/theme-toggle.tsx`.
7. **shadcn via its own CLI** — `pnpm dlx shadcn@latest init -d -b base --force`, then `shadcn add <component>` for any primitive (never hand-write them). Keep shadcn token NAMES (`background`/`foreground`/`primary`/`muted`…); only override VALUES to Warm Focus in `globals.css`. Custom extras: `--reward`, `--success`. Note: current shadcn uses `@base-ui/react` (`render` prop, not `asChild`).
   - Requires `allowBuilds: { sharp: true, unrs-resolver: true }` in `pnpm-workspace.yaml` so the CLI's `pnpm add` doesn't abort.
8. Home page placeholder proving tokens/fonts/dark mode.

## Files
`globals.css`, `layout.tsx`, `page.tsx`, `lib/utils.ts`, `components/theme-provider.tsx`,
`components/theme-toggle.tsx`, `components/ui/button.tsx`, `components.json`.

## Done when
- `pnpm build` passes, `pnpm dev` boots.
- Light/dark toggle works; amber appears only on the flame.
