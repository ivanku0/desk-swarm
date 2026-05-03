import type { PresetId } from '../presets/types'
import { zoomStepFromCountLegacy } from '../model/countScale'

/** Step 0 = wide view … step 5 = tight on center (scale > 1 so pan is meaningful) */
const ZOOM_SCALES = [0.56, 0.74, 0.9, 1.06, 1.28, 1.52] as const

export function zoomScaleFromStep(step: number): number {
  const i = Math.max(0, Math.min(ZOOM_SCALES.length - 1, Math.round(step)))
  return ZOOM_SCALES[i]!
}

/**
 * Counts 1…256: from a modest single-scute lens toward the legacy scale at 256.
 * Ease-in on log₂ progress (u = (log₂N/8)^k, k>1) so the camera **stays tighter
 * longer** for small/medium swarms, then **zooms out more** in the high hundreds,
 * avoiding a big “step down” right after the first few tokens.
 */
const SWARM_LOW_ZOOM_CAP = 256n
/** Max zoom (count 1); still above step-5 but less extreme than a 1.7+ lens. */
const SWARM_SCALE_AT_ONE = 1.58
/** >1: stronger “hold zoom” early; must stay >0 for monotonic zoom-out. */
const SWARM_ZOOM_EASE_IN_POWER = 1.32

/**
 * Camera scale: eased lens (1 → 256), then legacy log steps above 256.
 * Same mapping for every preset (`presetId` reserved for call sites / future).
 */
export function zoomScaleFromCount(count: bigint, _presetId?: PresetId): number {
  void _presetId
  if (count <= 0n) return zoomScaleFromStep(5)
  if (count > SWARM_LOW_ZOOM_CAP) {
    return zoomScaleFromStep(zoomStepFromCountLegacy(count))
  }
  const scaleAt256 = zoomScaleFromStep(zoomStepFromCountLegacy(256n))
  const t = Math.log2(Number(count)) / 8
  const uRaw = Math.max(0, Math.min(1, t))
  const u = Math.pow(uRaw, SWARM_ZOOM_EASE_IN_POWER)
  return SWARM_SCALE_AT_ONE + (scaleAt256 - SWARM_SCALE_AT_ONE) * u
}
