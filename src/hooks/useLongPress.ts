import { useCallback, useRef } from 'react'

/** Fires `onComplete` after `durationMs` while pointer held; shows progress via `onProgress` 0–1 */
export function useLongPress(
  onComplete: () => void,
  durationMs = 650,
  onProgress?: (t: number) => void,
) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(0)

  const clear = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
    onProgress?.(0)
  }, [onProgress])

  const start = useCallback(() => {
    clear()
    startRef.current = performance.now()
    timer.current = setInterval(() => {
      const t = Math.min(1, (performance.now() - startRef.current) / durationMs)
      onProgress?.(t)
      if (t >= 1) {
        if (timer.current) clearInterval(timer.current)
        timer.current = null
        onProgress?.(0)
        onComplete()
      }
    }, 32)
  }, [clear, durationMs, onComplete, onProgress])

  return { start, clear }
}
