#!/usr/bin/env node
/**
 * Writes `public/art/scute/token-ref.png` (SVG→PNG) for a quick pipeline demo.
 * Prefer your own art at that path, then `npm run glyphs:build -- scute`.
 * Or: `npm run glyphs:demo-scute` (this script + rasterize).
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = dirname(fileURLToPath(new URL(import.meta.url)))
const outDir = join(root, '..', 'public', 'art', 'scute')
await mkdir(outDir, { recursive: true })

/* White bg + dark bug so luminance threshold → readable 8×8 (not “all ink”). */
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" fill="#f4f4f0"/>
  <ellipse cx="44" cy="62" rx="28" ry="10" fill="#1a120c"/>
  <path fill="#0f3018" stroke="#051808" stroke-width="1"
    d="M18 58 Q22 38 44 32 Q68 28 78 44 Q82 52 80 58 Q76 64 52 66 Q28 66 18 58 Z"/>
  <path fill="#1a4a24" opacity="0.95"
    d="M30 42 Q48 36 68 42 Q72 48 70 52 Q50 48 30 52 Z"/>
  <polygon points="38,34 40,26 42,34" fill="#6a5a2a"/>
  <polygon points="52,30 54,22 56,30" fill="#6a5a2a"/>
  <polygon points="66,36 70,28 72,38" fill="#6a5a2a"/>
  <path fill="#123218" stroke="#051808" stroke-width="1"
    d="M38 48 Q28 20 52 8 Q58 6 62 12 Q48 18 44 48 Z"/>
  <path fill="#1f5c2a" opacity="0.9"
    d="M40 44 Q34 22 54 14 Q50 20 42 44 Z"/>
  <rect x="14" y="48" width="16" height="14" rx="3" fill="#0c2414"/>
  <path fill="#8a7840" stroke="#4a4020" stroke-width="0.5"
    d="M14 56 L4 52 L6 58 L14 58 Z"/>
  <path fill="#8a7840" stroke="#4a4020" stroke-width="0.5"
    d="M14 60 L2 64 L6 58 L14 58 Z"/>
  <path fill="#0f3018" stroke="#051808" stroke-width="0.5"
    d="M32 62 L28 78 L32 80 L36 64 M46 64 L44 82 L48 82 L50 66 M58 62 L60 80 L64 78 L62 64"/>
  <circle cx="28" cy="80" r="2" fill="#6a5a2a"/>
  <circle cx="46" cy="82" r="2" fill="#6a5a2a"/>
  <circle cx="62" cy="78" r="2" fill="#6a5a2a"/>
  <rect x="22" y="52" width="4" height="2" fill="#2a8a32" opacity="0.85"/>
</svg>`

const png = await sharp(Buffer.from(svg)).png().toBuffer()
const out = join(outDir, 'token-ref.png')
await writeFile(out, png)
console.log('Wrote', out)
