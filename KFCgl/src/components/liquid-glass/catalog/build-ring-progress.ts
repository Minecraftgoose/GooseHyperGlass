import type { ElementInteraction } from '../context'
import type { GlassElementConfig, LiquidGlassRenderer } from '../renderer'
import {
  DP,
  DEFAULT_HIGHLIGHT,
  DEFAULT_SHADOW,
  type CatalogResult,
  type CatalogState,
  type ThemePalette,
} from './types'
import { makeBackButton } from './helpers'

/* ------------------------------------------------------------------ *
 * RING PROGRESS — circular glass progress ring
 *
 * Layout: a circular glass backdrop with a thick arc (progress ring)
 * and a centered percentage label. Tap left half to decrease by 10,
 * right half to increase by 10. Drag clockwise/counter-clockwise to
 * scrub.
 * ------------------------------------------------------------------ */

const RING_SIZE = 180 * DP      // outer diameter of the ring
const RING_THICKNESS = 20 * DP   // arc thickness
const INNER_R = RING_SIZE / 2 - RING_THICKNESS // inner radius
const OUTER_R = RING_SIZE / 2                   // outer radius
const TOP_PAD = 60 * DP

/**
 * Generate an SVG fill path for a circular arc segment (ring sector).
 * The path traces the outer arc then back along the inner arc,
 * forming a filled ring segment.
 *
 * @param cx center x
 * @param cy center y
 * @param r1 inner radius
 * @param r2 outer radius
 * @param a1 start angle in radians (0 = top, clockwise)
 * @param a2 end angle in radians
 */
function ringArcPath(
  cx: number, cy: number, r1: number, r2: number,
  a1: number, a2: number,
): string {
  // Adjust so 0 = top, clockwise matches SVG coordinate (y-down)
  const adj = (a: number) => a - Math.PI / 2
  const s1 = adj(a1)
  const s2 = adj(a2)

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
  state: CatalogState,
  setState: (patch: Partial<CatalogState> | ((prev: CatalogState) => Partial<CatalogState>)) => void,
  rendererRef?: React.MutableRefObject<LiquidGlassRenderer | null>,
  palette?: ThemePalette,
): CatalogResult {
  const p = palette!
  const elements: GlassElementConfig[] = []
  const interactions: Record<string, ElementInteraction> = {}

  // Center the ring
  const cx = W / 2
  const cy = Math.max(TOP_PAD + RING_SIZE / 2, H / 2)
  const rx = cx - RING_SIZE / 2
  const ry = cy - RING_SIZE / 2

  // Back button
  const back = makeBackButton(onBack, p)
  elements.push(back.element)
  if (back.interaction) interactions[back.element.id] = back.interaction

  // --- Glass backdrop (circular) ---
  elements.push({
    id: 'ring-bg',
    kind: 'glass-shape',
    rect: { x: rx, y: ry, w: RING_SIZE, h: RING_SIZE },
    cornerRadius: RING_SIZE / 2,
    refractionHeight: 8 * DP,
    refractionAmount: -16 * DP,
    depthEffect: false,
    chromaticAberration: false,
    blurRadius: 3 * DP,
    saturation: 1.5,
    brightness: 0,
    contrast: 1,
    tintColor: [0, 0, 0, 0],
    surfaceColor: p.buttonSurface,
    highlight: DEFAULT_HIGHLIGHT,
    outerShadow: DEFAULT_SHADOW,
    label: '',
    labelColor: [1, 1, 1, 1],
    showChevron: false,
    isInteractive: false,
  })

  const progress = state.ringProgressValue // 0..100
  const frac = progress / 100
  const fillAngle = frac * Math.PI * 2
  const accentColor: [number, number, number, number] = [0x00 / 255, 0x91 / 255, 0xff / 255, 1] // blue
  const trackColor: [number, number, number, number] = [0.3, 0.3, 0.3, 0.3]

  // --- Progress arc (filled portion) ---
  if (fillAngle > 0.001) {
    const fillPath = ringArcPath(
      cx - rx, cy - ry, // relative to icon rect top-left
      INNER_R, OUTER_R,
      0, fillAngle,
    )
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

  // --- Track arc (unfilled portion, drawn underneath the fill) ---
  // We draw the full ring as track, then the fill arc on top.
  // But since glass-shape is drawn after earlier elements... let me reorder.
  // Actually the fill and track arcs are both 'button' kind with icons.
  // The renderer draws in array order, so put track first, then fill on top.
  // But we already pushed ring-bg and back button. Let me rebuild the element
  // list with proper ordering.

  // Hmm, we already built the array. Let me insert track before fill.
  // Actually, I'll just redo the elements array from scratch.
  // Remove the fill arc and redo everything properly.

  // Let's use a different approach: instead of two overlapping arc buttons,
  // just draw the track as the backdrop of the ring itself (not a separate element).
  // The glass-shape ring-bg already serves as the backdrop. We add a plain-rect
  // arc for the track, then the fill arc on top.

  // Actually the cleanest: use two icon-button elements for track and fill,
  // both non-interactive, positioned on top of the glass backdrop.
  // Track first (full ring), fill on top (partial ring).

  // Let me restructure: remove the fill we already pushed, add track then fill.

  // Remove the fill arc we pushed above
  // (We can't easily splice, so let me just rebuild the whole list)

  // ... Actually this is getting messy. Let me just replace elements with a clean list.
  // We'll build a fresh elements array from scratch.

  // Clear and rebuild
  elements.length = 0
  interactions['__dummy__'] = { onTap: () => {}, onDragStart: () => {}, onDrag: () => {}, onDragEnd: () => {} }
  delete interactions['__dummy__']

  // Back button
  elements.push(back.element)
  if (back.interaction) interactions[back.element.id] = back.interaction

  // Glass backdrop
  elements.push({
    id: 'ring-bg',
    kind: 'glass-shape',
    rect: { x: rx, y: ry, w: RING_SIZE, h: RING_SIZE },
    cornerRadius: RING_SIZE / 2,
    refractionHeight: 8 * DP,
    refractionAmount: -16 * DP,
    depthEffect: false,
    chromaticAberration: false,
    blurRadius: 3 * DP,
    saturation: 1.5,
    brightness: 0,
    contrast: 1,
    tintColor: [0, 0, 0, 0],
    surfaceColor: p.buttonSurface,
    highlight: DEFAULT_HIGHLIGHT,
    outerShadow: DEFAULT_SHADOW,
    label: '',
    labelColor: [1, 1, 1, 1],
    showChevron: false,
    isInteractive: false,
  })

  // Track arc (full ring, grey) — drawn as non-interactive button with icon
  const trackPath = ringArcPath(
    cx - rx, cy - ry,
    INNER_R, OUTER_R,
    0, Math.PI * 2,
  )
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

  // Fill arc (partial, blue) — drawn on top
  if (fillAngle > 0.001) {
    const fillPath = ringArcPath(
      cx - rx, cy - ry,
      INNER_R, OUTER_R,
      0, fillAngle,
    )
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

  // --- Percentage label (centered text) ---
  const labelText = `${Math.round(progress)}%`
  const labelFontPx = 36 * DP
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

  // --- Hit areas (left/right halves for tap adjustment) ---
  const halfW = RING_SIZE / 2

  // Left half — decrease
  elements.push({
    id: 'ring-dec',
    kind: 'glass-shape',
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

  // Right half — increase
  elements.push({
    id: 'ring-inc',
    kind: 'glass-shape',
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

  const contentHeight = Math.max(H, ry + RING_SIZE + 20 * DP)
  return { elements, interactions, contentHeight }
}
