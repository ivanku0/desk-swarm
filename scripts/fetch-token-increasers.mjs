#!/usr/bin/env node
/**
 * Fetches Scryfall search JSON for otag:token-increaser (unique cards).
 * Use to refresh oracle text / ids when the set changes. Committed catalog
 * lives in src/data/tokenIncreaserCatalog.ts — merge by hand after diff.
 *
 * Usage: node scripts/fetch-token-increasers.mjs
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const URL =
  'https://api.scryfall.com/cards/search?q=otag:token-increaser&unique=cards'

const res = await fetch(URL)
if (!res.ok) {
  console.error(res.status, await res.text())
  process.exit(1)
}
const data = await res.json()
const slim = data.data.map((c) => ({
  id: c.id,
  name: c.name,
  oracle_text: c.oracle_text ?? '',
  card_faces: c.card_faces?.map((f) => ({ name: f.name, oracle_text: f.oracle_text ?? '' })),
}))

const outPath = resolve('scripts/token-increaser-scryfall-snapshot.json')
await writeFile(outPath, JSON.stringify({ fetched: new Date().toISOString(), total: slim.length, cards: slim }, null, 2))
console.log(`Wrote ${slim.length} cards to ${outPath}`)
