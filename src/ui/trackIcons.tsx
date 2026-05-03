/**
 * Lucide icons for track UI (MIT).
 * https://lucide.dev — tree-shaken per import.
 */
import { ArrowLeft, Check, Info, Minus, Plus, RotateCcw, Skull, Undo2, X } from 'lucide-react'

const stroke = 2.25 as const

export function IconUndo(props: { className?: string }) {
  return <Undo2 className={props.className} size={20} strokeWidth={stroke} aria-hidden />
}

export function IconMinus(props: { className?: string }) {
  return <Minus className={props.className} size={22} strokeWidth={stroke} aria-hidden />
}

export function IconPlus(props: { className?: string }) {
  return <Plus className={props.className} size={22} strokeWidth={stroke} aria-hidden />
}

export function IconSkull(props: { className?: string }) {
  return <Skull className={props.className} size={22} strokeWidth={stroke} aria-hidden />
}

/** Counter reset to 1 — circular reset metaphor */
export function IconReset(props: { className?: string }) {
  return <RotateCcw className={props.className} size={22} strokeWidth={stroke} aria-hidden />
}

export function IconBackToMenu(props: { className?: string }) {
  return <ArrowLeft className={props.className} size={22} strokeWidth={stroke} aria-hidden />
}

export function IconInfo(props: { className?: string }) {
  return <Info className={props.className} size={22} strokeWidth={stroke} aria-hidden />
}

export function IconModalDismiss(props: { className?: string }) {
  return <X className={props.className} size={24} strokeWidth={2.5} aria-hidden />
}

export function IconModalConfirm(props: { className?: string }) {
  return <Check className={props.className} size={24} strokeWidth={2.5} aria-hidden />
}
