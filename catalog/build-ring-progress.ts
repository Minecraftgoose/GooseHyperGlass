import type { GooseInteract } from '../context'
import type { GooseElement, LiquidGlassRenderer } from '../renderer'
import {
  gooseDP,
  gooseHL,
  gooseShadow,
  type GooseResult,
  type GooseState,
  type GoosePalette,
} from './types'
import { gooseBack } from './helpers'

/* ------------------------------------------------------------------ *
 * RING PROGRESS — circular glass progress ring
 *
 * Layout: a circular glass backdrop with a thick arc (progress ring)
 * and a centered percentage label. Tap left half to decrease by 10,
 * right half to increase by 10.
 * ------------------------------------------------------------------ */

const RING_SIZE = 180 * gooseDP
const RING_THICKNESS = 20 * gooseDP
const INNER_R = RING_SIZE / 2 - RING_THICKNESS
const OUTER_R = RING_SIZE / 2
const TOP_PAD = 60 * gooseDP

function ringArcPath(
  cx: number, cy: number, r1: number, r2: number,
  a1: number, a2: number,
): string {
  const adj = (a: number) => a - Math.PI / 2
  const s1 = adj(a1), s2 = adj(a2)
  const cos1 = Math.cos(s1), sin1 = Math.sin(s1)
  const cos2 = Math.cos(s2), sin2 = Math.sin(s2)
  const x1o = cx + r2 * cos1, y1o = cy + r2 * sin1
  const x2o = cx + r2 * cos2, y2o = cy + r2 * sin2
  const x1i = cx + r1 * cos2, y1i = cy + r1 * sin2
  const x2i = cx + r1 * cos1, y2i = cy + r1 * sin1
  const sweep = a2 - a1
  const largeArc = sweep > Math.PI ? 1 : 0
  return [
    `M ${x1o} ${y1o}`,
    `A ${r2} ${r2} 0 ${largeArc} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${r1} ${r1} 0 ${largeArc} 0 ${x2i} ${y2i}`,
    'Z',
  ].join(' ')
}

export function buildRingProgress(
  W: number,
  H: number,
  onBack: () => void,
  state: GooseState,
  setState: (patch: Partial<GooseState> | ((prev: GooseState) => Partial<GooseState>)) => void,
  rendererRef?: React.MutableRefObject<LiquidGlassRenderer | null>,
  palette?: GoosePalette,
): GooseResult {
  const p = palette!
  const elements: GooseElement[] = []
  const interactions: Record<string, GooseInteract> = {}

  const cx = W / 2
  const cy = Math.max(TOP_PAD + RING_SIZE / 2, H / 2)
  const rx = cx - RING_SIZE / 2
  const ry = cy - RING_SIZE / 2

  // Back button
  const back = gooseBack(onBack, p)
  elements.push(back.element)
  if (back.interaction) interactions[back.element.id] = back.interaction

  // Glass backdrop
  elements.push({
    id: 'ring-bg',
    kind: 'glass-shape',
    rect: { x: rx, y: ry, w: RING_SIZE, h: RING_SIZE },
    cornerRadius: RING_SIZE / 2,
    refractionHeight: 8 * gooseDP,
    refractionAmount: -16 * gooseDP,
    depthEffect: false,
    chromaticAberration: false,
    blurRadius: 3 * gooseDP,
    saturation: 1.5,
    brightness: 0,
    contrast: 1,
    tintColor: [0, 0, 0, 0],
    surfaceColor: p.buttonSurface,
    highlight: gooseHL,
    outerShadow: gooseShadow,
    label: '',
    labelColor: [1, 1, 1, 1],
    showChevron: false,
    isInteractive: false,
  })

  const progress = state.ringProgressValue
  const frac = progress / 100
  const fillAngle = frac * Math.PI * 2
  const accentColor: [number, number, number, number] = [0x00 / 255, 0x91 / 255, 0xff / 255, 1]
  const trackColor: [number, number, number, number] = [0.3, 0.3, 0.3, 0.3]

  // Track arc (full ring, grey)
  const trackPath = ringArcPath(cx - rx, cy - ry, INNER_R, OUTER_R, 0, Math.PI * 2)
  elements.push({
    id: 'ring-track',
    kind: 'button',
    rect: { x: rx, y: ry, w: RING_SIZE, h: RING_SIZE },
    cornerRadius: RING_SIZE / 2,
    refractionHeight: 0,
    refractionAmount: 0,
    depthEffect: false,
    chromaticAberration: false,
    blurRadius: 0,
    saturation: 1,
    brightness: 0,
    contrast: 1,
    tintColor: [0, 0, 0, 0],
    surfaceColor: [0, 0, 0, 0],
    highlight: null,
    outerShadow: null,
    label: '',
    labelColor: [1, 1, 1, 1],
    showChevron: false,
    isInteractive: false,
    icon: {
      path: trackPath,
      size: RING_SIZE,
      color: trackColor,
      viewport: RING_SIZE,
    },
  })

  // Fill arc (partial, blue)
  if (fillAngle > 0.001) {
    const fillPath = ringArcPath(cx - rx, cy - ry, INNER_R, OUTER_R, 0, fillAngle)
    elements.push({
      id: 'ring-fill',
      kind: 'button',
      rect: { x: rx, y: ry, w: RING_SIZE, h: RING_SIZE },
      cornerRadius: RING_SIZE / 2,
      refractionHeight: 0,
      refractionAmount: 0,
      depthEffect: false,
      chromaticAberration: false,
      blurRadius: 0,
      saturation: 1,
      brightness: 0,
      contrast: 1,
      tintColor: [0, 0, 0, 0],
      surfaceColor: [0, 0, 0, 0],
      highlight: null,
      outerShadow: null,
      label: '',
      labelColor: [1, 1, 1, 1],
      showChevron: false,
      isInteractive: false,
      icon: {
        path: fillPath,
        size: RING_SIZE,
        color: accentColor,
        viewport: RING_SIZE,
      },
    })
  }

  // Percentage label
  const labelText = `${Math.round(progress)}%`
  const labelFontPx = 36 * gooseDP
  elements.push({
    id: 'ring-label',
    kind: 'text',
    rect: { x: rx, y: ry, w: RING_SIZE, h: RING_SIZE },
    cornerRadius: 0,
    refractionHeight: 0,
    refractionAmount: 0,
    depthEffect: false,
    chromaticAberration: false,
    blurRadius: 0,
    saturation: 1,
    brightness: 0,
    contrast: 1,
    tintColor: [0, 0, 0, 0],
    surfaceColor: [0, 0, 0, 0],
    highlight: null,
    outerShadow: null,
    label: '',
    labelColor: [1, 1, 1, 1],
    showChevron: false,
    isInteractive: false,
    text: {
      content: labelText,
      color: p.homeContentColor,
      fontSizePx: labelFontPx,
      fontWeight: 700,
      align: 'center',
      valign: 'center',
    },
  })

  // Hit areas — use 'button' kind for reliable tap detection
  const halfW = RING_SIZE / 2

  elements.push({
    id: 'ring-dec',
    kind: 'button',
    rect: { x: rx, y: ry, w: halfW, h: RING_SIZE },
    cornerRadius: 0,
    refractionHeight: 0,
    refractionAmount: 0,
    depthEffect: false,
    chromaticAberration: false,
    blurRadius: 0,
    saturation: 1,
    brightness: 0,
    contrast: 1,
    tintColor: [0, 0, 0, 0],
    surfaceColor: [0, 0, 0, 0],
    highlight: null,
    outerShadow: null,
    label: '',
    labelColor: [1, 1, 1, 1],
    showChevron: false,
    isInteractive: true,
  })
  interactions['ring-dec'] = {
    onTap: () => {
      setState({ ringProgressValue: Math.max(0, state.ringProgressValue - 10) })
    },
    onDragStart: () => {},
    onDrag: () => {},
    onDragEnd: () => {},
  }

  elements.push({
    id: 'ring-inc',
    kind: 'button',
    rect: { x: rx + halfW, y: ry, w: halfW, h: RING_SIZE },
    cornerRadius: 0,
    refractionHeight: 0,
    refractionAmount: 0,
    depthEffect: false,
    chromaticAberration: false,
    blurRadius: 0,
    saturation: 1,
    brightness: 0,
    contrast: 1,
    tintColor: [0, 0, 0, 0],
    surfaceColor: [0, 0, 0, 0],
    highlight: null,
    outerShadow: null,
    label: '',
    labelColor: [1, 1, 1, 1],
    showChevron: false,
    isInteractive: true,
  })
  interactions['ring-inc'] = {
    onTap: () => {
      setState({ ringProgressValue: Math.min(100, state.ringProgressValue + 10) })
    },
    onDragStart: () => {},
    onDrag: () => {},
    onDragEnd: () => {},
  }

  const contentHeight = Math.max(H, ry + RING_SIZE + 20 * gooseDP)
  return { elements, interactions, contentHeight }
}
