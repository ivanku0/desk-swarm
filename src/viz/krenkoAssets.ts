/**
 * Resolve paths under `public/art/...` for the current Vite `base` (e.g. `./` vs `/`).
 * Root-absolute `/art/...` breaks when the app is not served from domain root.
 */
export function krenkoArtUrl(pathUnderPublic: string): string {
  const tail = pathUnderPublic.replace(/^\//, '')
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return `/${tail}`
  return `${base}${tail}`
}

/** Centralized Krenko sprite paths so art swaps do not require code edits elsewhere. */
export const KRENKO_ASSET_URLS = {
  boss: krenkoArtUrl('art/krenko/krenko-boss.png'),
  /** Optional: face-only or bust for board-wipe death (falls back to live boss if missing). */
  bossDeath: krenkoArtUrl('art/krenko/krenko-boss-death.png'),
  minionA: krenkoArtUrl('art/krenko/krenko-minion-a.png'),
  minionB: krenkoArtUrl('art/krenko/krenko-minion-b.png'),
} as const

/** Back-compat fallback paths for existing reference files. */
export const KRENKO_ASSET_FALLBACK_URLS = {
  boss: krenkoArtUrl('art/krenko/leader-ref.png'),
  minionA: krenkoArtUrl('art/krenko/token-ref.png'),
  minionB: krenkoArtUrl('art/krenko/token-ref-2.png'),
} as const
