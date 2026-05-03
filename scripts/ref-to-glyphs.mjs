#!/usr/bin/env node
/**
 * Rasterize per-preset reference PNGs → 8×8 swarm glyph modules.
 *
 *   npm run glyphs:build -- scute
 *   npm run glyphs:build -- horde
 *   npm run glyphs:build -- scute horde
 *
 * Each preset reads the first existing file in its `refTry` list and writes
 * `src/viz/swarmGlyphs/<preset>.ts`.
 */
import sharp from 'sharp'
import { readFile, writeFile, access } from 'fs/promises'
import { constants } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** @type {Record<string, { outRel: string, refTry: string[] }>} */
const PRESET_CONFIG = {
  scute: {
    outRel: 'src/viz/swarmGlyphs/scute.ts',
    refTry: ['public/art/scute/token-ref.png', 'public/art/scute/beetle-ref.png'],
  },
  horde: {
    outRel: 'src/viz/swarmGlyphs/horde.ts',
    refTry: ['public/art/horde/token-ref.png'],
  },
}

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

async function firstReadable(relPaths) {
  for (const rel of relPaths) {
    const abs = join(ROOT, rel)
    try {
      await access(abs, constants.R_OK)
      return { abs, rel }
    } catch {
      /* try next */
    }
  }
  return null
}

async function rasterPreset(presetId, strict) {
  const cfg = PRESET_CONFIG[presetId]
  if (!cfg) {
    console.error(`Unknown preset "${presetId}". Known: ${Object.keys(PRESET_CONFIG).join(', ')}`)
    return false
  }

  const found = await firstReadable(cfg.refTry)
  if (!found) {
    const msg = `No reference image for preset "${presetId}". Tried:\n  ${cfg.refTry.map((r) => join(ROOT, r)).join('\n  ')}`
    if (strict) {
      console.error(msg)
      return false
    }
    console.warn(`Skip ${presetId}: ${msg.replace(/\n/g, ' ')}`)
    return false
  }

  const buf = await readFile(found.abs)
  let work = buf
  try {
    work = await sharp(buf).trim().ensureAlpha().png().toBuffer()
  } catch {
    /* uniform border */
  }

  const { data, info } = await sharp(work)
    .resize(8, 8, { fit: 'contain', position: 'center', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (info.width !== 8 || info.height !== 8) {
    console.error(`Expected 8×8 after resize, got ${info.width}×${info.height}`)
    return false
  }

  const g0 = gridToRows(data, 8, 8, 0.52, 0.06)
  const g1 = gridToRows(data, 8, 8, 0.62, 0.06)

  const title =
    presetId === 'scute'
      ? 'Scute Swarm'
      : presetId === 'horde'
        ? 'Homunculus Horde'
        : presetId

  const ts = `/**
 * ${title} — dense field glyphs (8×8, 1 = ink). AUTO-GENERATED.
 *
 *   npm run glyphs:build -- ${presetId}
 *
 * Source: ${found.rel}
 */
export const SWARM_GLYPHS = [
  ${formatGrid(g0)},
  ${formatGrid(g1)},
] as const
`

  const outAbs = join(ROOT, cfg.outRel)
  await writeFile(outAbs, ts, 'utf8')
  console.log(`Wrote ${cfg.outRel}  ←  ${found.rel}`)
  return true
}

async function main() {
  const argv = process.argv.slice(2).filter(Boolean)
  const strict = argv.length > 0
  const ids = strict ? argv : Object.keys(PRESET_CONFIG)

  let any = false
  for (const id of ids) {
    const ok = await rasterPreset(id, strict)
    if (ok) any = true
    else if (strict) process.exit(1)
  }
  if (!any && !strict) {
    console.warn('No preset had a readable token-ref.png (see docs/art-pipeline.md).')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
