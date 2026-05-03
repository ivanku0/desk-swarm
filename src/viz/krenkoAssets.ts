/** Centralized Krenko sprite paths so art swaps do not require code edits elsewhere. */
export const KRENKO_ASSET_URLS = {
  boss: '/art/krenko/krenko-boss.png',
  /** Optional: face-only or bust for board-wipe death spin (falls back to live boss if missing). */
  bossDeath: '/art/krenko/krenko-boss-death.png',
  minionA: '/art/krenko/krenko-minion-a.png',
  minionB: '/art/krenko/krenko-minion-b.png',
} as const

/** Back-compat fallback paths for existing reference files. */
export const KRENKO_ASSET_FALLBACK_URLS = {
  boss: '/art/krenko/leader-ref.png',
  minionA: '/art/krenko/token-ref.png',
  minionB: '/art/krenko/token-ref-2.png',
} as const
