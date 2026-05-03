#!/usr/bin/env node
/**
 * Rasterize public/art/scute/beetle-ref.png → two 8×8 bitmask variants and
 * overwrite src/viz/scuteBeetleGlyphsFromRef.ts
 *
 * Usage: npm run beetle:glyphs
 * Optional: node scripts/beetle-ref-to-glyphs.mjs path/to.png
 */
import sharp from 'sharp'
import { readFile, writeFile, access } from 'fs/promises'
import { constants } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_REF = join(ROOT, 'public/art/scute/beetle-ref.png')
const OUT = join(ROOT, 'src/viz/scuteBeetleGlyphsFromRef.ts')

const refPath = process.argv[2] ?? DEFAULT_REF

function gridToRows(data, width, height, threshold, alphaMin) {
  const rows = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255
      const a = data[i + 3] / 255
      if (a < alphaMin) {
        row.push(0)
        continue
      }
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      row.push(lum < threshold ? 1 : 0)
    }
    rows.push(row)
  }
  return rows
}

function formatGrid(grid) {
  return (
    '[\n' +
    grid
      .map(
        (row) =>
          '    [' +
          row.map((c) => (c ? '1' : '0')).join(', ') +
          '],',
      )
      .join('\n') +
    '\n  ]'
  )
}

async function main() {
  try {
    await access(refPath, constants.R_OK)
  } catch {
    console.error(
      `Missing reference image:\n  ${refPath}\n\nAdd a PNG (your beetle photo or line art), then run again.`,
    )
    process.exit(1)
  }

  const buf = await readFile(refPath)
  let work = buf
  try {
    work = await sharp(buf).trim().ensureAlpha().png().toBuffer()
  } catch {
    /* uniform border / empty trim — use full frame */
  }

  const { data, info } = await sharp(work)
    .resize(8, 8, { fit: 'contain', position: 'center', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  if (w !== 8 || h !== 8) {
    console.error(`Expected 8×8 after resize, got ${w}×${h}`)
    process.exit(1)
  }

  const g0 = gridToRows(data, 8, 8, 0.52, 0.06)
  const g1 = gridToRows(data, 8, 8, 0.62, 0.06)

  const ts = `/**
 * Scute swarm field glyphs (8×8, 1 = ink). AUTO-GENERATED — edit or re-run:
 *
 *   npm run beetle:glyphs
 *
 * Source: ${refPath.replace(ROOT + '/', '')}
 */
export const SCUTE_BUG_REF_GLYPHS = [
  ${formatGrid(g0)},
  ${formatGrid(g1)},
] as const
`

  await writeFile(OUT, ts, 'utf8')
  console.log(`Wrote ${OUT.replace(ROOT + '/', '')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
