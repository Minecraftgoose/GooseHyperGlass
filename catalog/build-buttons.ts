import type { GooseInteract } from '../context'
import type { GooseElement } from '../renderer'
import {
  gooseBtnH,
  gooseBtnPad,
  gooseDP,
  gooseTextSz,
  type GooseResult,
  type GoosePalette,
  gooseTextW,
} from './types'
import { gooseCenter, gooseBack, gooseBtn } from './helpers'

/* ------------------------------------------------------------------ *
 * BUTTONS — faithful to ButtonsContent.kt
 *
 * Layout: centered Column with 4 capsule buttons:
 *   1. Transparent
 *   2. Surface (white 0.3)
 *   3. Tinted blue (#0088FF)
 *   4. Tinted orange (#FF8D28)
 * ------------------------------------------------------------------ */
type ButtonEntry = {
  id?: string
  label?: string
  style?: 'transparent' | 'surface' | 'blue' | 'orange' | { tintColor: [number, number, number, number]; surfaceColor: [number, number, number, number]; labelColor: [number, number, number, number] }
}

const BUTTON_STYLES: Record<string, { tintColor: [number, number, number, number]; surfaceColor: [number, number, number, number]; labelColor: [number, number, number, number] }> = {
  transparent: { tintColor: [0, 0, 0, 0], surfaceColor: [0, 0, 0, 0], labelColor: [0, 0, 0, 1] },
  surface: { tintColor: [0, 0, 0, 0], surfaceColor: [1, 1, 1, 0.3], labelColor: [0, 0, 0, 1] },
  blue: { tintColor: [0x00 / 255, 0x88 / 255, 0xff / 255, 1], surfaceColor: [0, 0, 0, 0], labelColor: [1, 1, 1, 1] },
  orange: { tintColor: [0xff / 255, 0x8d / 255, 0x28 / 255, 1], surfaceColor: [0, 0, 0, 0], labelColor: [1, 1, 1, 1] },
  red: { tintColor: [0xff / 255, 0x4d / 255, 0x4f / 255, 1], surfaceColor: [0, 0, 0, 0], labelColor: [1, 1, 1, 1] },
  green: { tintColor: [0x34 / 255, 0xc7 / 255, 0x4b / 255, 1], surfaceColor: [0, 0, 0, 0], labelColor: [1, 1, 1, 1] },
  purple: { tintColor: [0x9c / 255, 0x27 / 255, 0xb0 / 255, 1], surfaceColor: [0, 0, 0, 0], labelColor: [1, 1, 1, 1] },
}

export function buildButtons(
  W: number,
  H: number,
  onBack: () => void,
  palette: GoosePalette,
  onButtonTap?: (id: string) => void,
  buttonsConfig?: ButtonEntry[]
): GooseResult {
  const elements: GooseElement[] = []
  const interactions: Record<string, GooseInteract> = {}

  const back = gooseBack(onBack, palette)
  elements.push(back.element)
  interactions[back.element.id] = back.interaction

  // ButtonsContent.kt does NOT use isLightTheme — all button colors are
  // hardcoded (Black text for transparent + surface, White text for tinted).
  // So we keep the same colors in both themes.
  const defaultSpecs = [
    {
      id: 'btn-transparent',
      label: 'Transparent Liquid Button',
      tintColor: [0, 0, 0, 0] as [number, number, number, number],
      surfaceColor: [0, 0, 0, 0] as [number, number, number, number],
      labelColor: [0, 0, 0, 1] as [number, number, number, number],
    },
    {
      id: 'btn-surface',
      label: 'Surface Liquid Button',
      tintColor: [0, 0, 0, 0] as [number, number, number, number],
      surfaceColor: [1, 1, 1, 0.3] as [number, number, number, number],
      labelColor: [0, 0, 0, 1] as [number, number, number, number],
    },
    {
      id: 'btn-tinted-blue',
      label: 'Tinted Liquid Button',
      tintColor: [0x00 / 255, 0x88 / 255, 0xff / 255, 1] as [number, number, number, number],
      surfaceColor: [0, 0, 0, 0] as [number, number, number, number],
      labelColor: [1, 1, 1, 1] as [number, number, number, number],
    },
    {
      id: 'btn-tinted-orange',
      label: 'Tinted Liquid Button',
      tintColor: [0xff / 255, 0x8d / 255, 0x28 / 255, 1] as [number, number, number, number],
      surfaceColor: [0, 0, 0, 0] as [number, number, number, number],
      labelColor: [1, 1, 1, 1] as [number, number, number, number],
    },
  ]
  // 玻璃加模板：传入 buttonsConfig 时，每个按钮独立可配（文字 + 样式），点击各自独立 id。
  const configs: any[] = (buttonsConfig && buttonsConfig.length)
    ? buttonsConfig.map((c, i) => {
        const st = (typeof c.style === 'string' ? (BUTTON_STYLES[c.style] || BUTTON_STYLES.blue) : (c.style || BUTTON_STYLES.transparent))
        return {
          id: c.id || ('btn-' + i),
          label: c.label ?? ('按钮 ' + (i + 1)),
          tintColor: st.tintColor,
          surfaceColor: st.surfaceColor,
          labelColor: st.labelColor,
        }
      })
    : defaultSpecs

  const spacing = 16 * gooseDP
  // Start at y=0 — gooseCenter will shift everything to center.
  let cursorY = 0
  for (const spec of configs) {
    const textW = gooseTextW(spec.label, gooseTextSz)
    const w = Math.ceil(textW + 2 * gooseBtnPad)
    const x = (W - w) / 2
    const el = gooseBtn(spec.id, { x, y: cursorY, w, h: gooseBtnH }, spec)
    elements.push(el)
    if (onButtonTap) {
      interactions[spec.id] = { onTap: () => onButtonTap(spec.id) }
    }
    cursorY += gooseBtnH + spacing
  }
  const contentHeight = cursorY - spacing
  const finalHeight = gooseCenter(elements, 0, contentHeight, H)
  return { elements, interactions, contentHeight: finalHeight }
}
