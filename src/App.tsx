import { useCallback, useState, useSyncExternalStore } from 'react'
import type { PresetId } from './presets/types'
import { MainMenu } from './ui/MainMenu'
import { ReplacementLabScreen } from './ui/ReplacementLabScreen'
import { TrackScreen } from './ui/TrackScreen'
import { InfoSheet } from './ui/InfoSheet'
import type { ActivityEntry } from './ui/ActivityLog'

type Phase = 'menu' | 'track' | 'lab'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function reducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function reducedMotionServerSnapshot() {
  return false
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('menu')
  const [preset, setPreset] = useState<PresetId | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [infoOpen, setInfoOpen] = useState(false)

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    reducedMotionServerSnapshot,
  )

  const appendActivity = useCallback((e: Omit<ActivityEntry, 'id' | 'at'>) => {
    setActivity((a) =>
      [...a, { ...e, id: uid(), at: Date.now() }].slice(-200),
    )
  }, [])

  const pickPreset = (id: PresetId) => {
    setPreset(id)
    setPhase('track')
    appendActivity({
      presetId: id,
      text: `started ${
        id === 'scute' ? 'scute swarm' : id === 'krenko' ? 'krenko track' : 'homunculus horde'
      }`,
    })
  }

  const openLab = () => {
    setPhase('lab')
    setPreset(null)
    appendActivity({ presetId: null, text: 'opened replacement lab' })
  }

  const leaveLab = () => {
    appendActivity({ presetId: null, text: 'left replacement lab (menu)' })
    setPhase('menu')
  }

  const leaveTrack = () => {
    if (preset) appendActivity({ presetId: preset, text: 'left run (menu)' })
    setPhase('menu')
    setPreset(null)
    setInfoOpen(false)
  }

  return (
    <div className="app-root">
      {phase === 'menu' ? (
        <MainMenu onPick={pickPreset} onOpenLab={openLab} activity={activity} />
      ) : null}
      {phase === 'lab' ? (
        <ReplacementLabScreen onLeave={leaveLab} reducedMotion={reducedMotion} />
      ) : null}
      {phase === 'track' && preset ? (
        <TrackScreen
          presetId={preset}
          onLeave={leaveTrack}
          appendActivity={appendActivity}
          reducedMotion={reducedMotion}
          onOpenInfo={() => setInfoOpen(true)}
        />
      ) : null}
      {infoOpen && preset ? (
        <InfoSheet presetId={preset} onClose={() => setInfoOpen(false)} />
      ) : null}
    </div>
  )
}
