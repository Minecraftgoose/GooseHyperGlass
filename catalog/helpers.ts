import * as React from 'react'
import type { GooseInteract } from '../context'
import type { GooseElement, GooseHL, LiquidGlassRenderer } from '../renderer'
import {
  gooseHL,
  gooseShadow,
  gooseDP,
  gooseGlassP,
  gooseHitH,
  gooseKnobH,
  gooseKnobW,
  gooseTrackH,
  gooseTextSz,
  gooseDragGroups,
  type GoosePalette,
} from './types'

/* ------------------------------------------------------------------ *
 * Shared LiquidSlider factory — used by both the Slider page and the
 * Glass Playground. Creates track + fill + knob + interactions.
 * ------------------------------------------------------------------ */
// Unified per-group drag state (survives re-renders during liveUpdate /
// gravityAngle changes). Used by ALL drag-based controls.
const dragStates = new Map<string, { fraction: number; x: number; didDrag: boolean }>()

/* ------------------------------------------------------------------ *
 * gooseDrag — the ONE shared drag-interaction factory.
 *
 * Used by: sliders (continuous + stepped), toggles, bottom tabs.
 * All share the same gesture pattern:
 *   onDragStart → read current visual fraction → beginDrag
 *   onDrag → relative drag (knob follows finger delta with spring lag)
 *   onDragEnd → endDrag → snap → setTarget
 *   onTap → jump to tapped fraction → snap → setTarget
 *
 * The control-specific behavior is injected via the `opts` object:
 *   - getFraction: read current visual fraction (gooseTglFrac / gooseTabFrac)
 *   - beginDrag: start the drag (gooseTglDragStart / gooseTabDragStart)
 *   - drag: update during drag (gooseTglDrag / gooseTabDrag)
 *   - endDrag: release + return final fraction (gooseSldDragEnd / gooseTglDragEnd / gooseTabDragEnd)
 *   - setTarget: programmatic target set (gooseTglTarget / gooseTabSel)
 *   - snap: snap function (fraction → snapped fraction), or null = no snap
 *   - liveUpdate: push fraction to onValueChange during drag
 *   - onTapJump: if false, tap does nothing (e.g. toggle = toggle on tap, not jump)
 * ------------------------------------------------------------------ */
interface DragInteractionsOpts {
  groupId: string
  trackX: number
  dragW: number
  rendererRef: React.MutableRefObject<LiquidGlassRenderer | null> | null
  onValueChange: (fraction: number) => void
  /** Optional lightweight callback fired on every drag move (regardless of
   *  liveUpdate). Use this to update a display-only label WITHOUT triggering
   *  a catalog rebuild (e.g. settings slider labels). onValueChange is still
   *  fired on dragEnd (or every move if liveUpdate=true) for the real state. */
  onLiveValue?: (fraction: number) => void
  // Control-specific renderer calls:
  getFraction: (r: LiquidGlassRenderer, groupId: string) => number
  beginDrag: (r: LiquidGlassRenderer, groupId: string, fraction: number, count?: number) => void
  drag: (r: LiquidGlassRenderer, groupId: string, startFraction: number, currentX: number, startX: number, dragW: number, count?: number) => void
  endDrag: (r: LiquidGlassRenderer, groupId: string, count?: number) => number
  setTarget: (r: LiquidGlassRenderer, groupId: string, fraction: number, count?: number) => void
  count?: number // tabsCount for tabs (passed to begin/drag/end/setTarget)
  snap?: (f: number) => number // snap function (null/undefined = no snap)
  liveUpdate?: boolean
  onTapJump?: boolean // default true; false = tap does nothing (toggle uses its own onTap)
  didDragThreshold?: number // px of movement before didDrag=true (default 3)
}

export function gooseDrag(opts: DragInteractionsOpts): GooseInteract {
  const {
    groupId, trackX, dragW, rendererRef, onValueChange, onLiveValue,
    getFraction, beginDrag, drag, endDrag, setTarget,
    count, snap, liveUpdate = false, onTapJump = true, didDragThreshold = 3,
  } = opts

  if (!dragStates.has(groupId)) dragStates.set(groupId, { fraction: 0, x: 0, didDrag: false })
  const ds = dragStates.get(groupId)!

  const fracFromPos = (px: number) => Math.max(0, Math.min(1, (px - trackX) / dragW))
  const applySnap = (f: number) => (snap ? snap(f) : f)

  return {
    onTap: (pos) => {
      if (!onTapJump) return
      const f = applySnap(fracFromPos(pos.x))
      const r = rendererRef?.current
      if (r) setTarget(r, groupId, f, count)
      onValueChange(f)
    },
    onDragStart: (pos) => {
      const r = rendererRef?.current
      if (!r) return
      gooseDragGroups.add(groupId)
      ds.fraction = getFraction(r, groupId)
      ds.x = pos.x
      ds.didDrag = false
      beginDrag(r, groupId, ds.fraction, count)
    },
    onDrag: (pos) => {
      const r = rendererRef?.current
      if (!r) return
      if (Math.abs(pos.x - ds.x) > didDragThreshold) ds.didDrag = true
      drag(r, groupId, ds.fraction, pos.x, ds.x, dragW, count)
      const f = getFraction(r, groupId)
      if (onLiveValue) onLiveValue(f)
      if (liveUpdate) {
        onValueChange(f)
      }
    },
    onDragEnd: () => {
      const r = rendererRef?.current
      if (!r) return
      const rawF = endDrag(r, groupId, count)
      // Keep gooseDragGroups flag set DURING onValueChange (which triggers
      // setState → tabTargets/toggleTargets effect). The effect checks
      // gooseDragGroups and skips gooseTabSel/gooseTglTarget, preventing
      // it from zeroing velocity and fighting the spring. Delete AFTER
      // onValueChange so the next gooseRender's effect can sync.
      const snappedF = applySnap(rawF)
      // Only call setTarget if the endDrag didn't already snap.
      // For toggle/slider: gooseTglDragEnd/gooseSldDragEnd DON'T snap (they
      // return the raw fraction), so setTarget is needed.
      // For tabs: gooseTabDragEnd DOES snap (sets targetFraction to rounded
      // index), so setTarget would be redundant and would zero velocity
      // (fighting the spring). Skip setTarget for tabs (count != undefined
      // && endDrag already snapped).
      if (snap && count == null) setTarget(r, groupId, snappedF, count)
      onValueChange(snappedF)
      gooseDragGroups.delete(groupId)
    },
  }
}

/* ------------------------------------------------------------------ *
 * Renderer method bindings — pre-wired adapters for each control type.
 * These eliminate the boilerplate of passing lambdas every time.
 * ------------------------------------------------------------------ */

// Slider/Settings: gooseTglFrac, gooseTglDragStart, gooseTglDrag,
// gooseSldDragEnd, gooseTglTarget.
export const sliderDragBindings = {
  getFraction: (r: LiquidGlassRenderer, id: string) => r.gooseTglFrac(id),
  beginDrag: (r: LiquidGlassRenderer, id: string, f: number) => r.gooseTglDragStart(id, f),
  drag: (r: LiquidGlassRenderer, id: string, sf: number, cx: number, sx: number, dw: number) =>
    r.gooseTglDrag(id, sf, cx, sx, dw),
  endDrag: (r: LiquidGlassRenderer, id: string) => r.gooseSldDragEnd(id),
  setTarget: (r: LiquidGlassRenderer, id: string, f: number) => r.gooseTglTarget(id, f),
}

// Toggle: gooseTglTargetGet (not fraction!), gooseTglDragStart, gooseTglDrag,
// gooseTglDragEnd, gooseTglTarget. Tap = toggle (no jump).
export const toggleDragBindings = {
  getFraction: (r: LiquidGlassRenderer, id: string) => r.gooseTglTargetGet(id),
  beginDrag: (r: LiquidGlassRenderer, id: string, f: number) => r.gooseTglDragStart(id, f),
  drag: (r: LiquidGlassRenderer, id: string, sf: number, cx: number, sx: number, dw: number) =>
    r.gooseTglDrag(id, sf, cx, sx, dw),
  endDrag: (r: LiquidGlassRenderer, id: string) => r.gooseTglDragEnd(id),
  setTarget: (r: LiquidGlassRenderer, id: string, f: number) => r.gooseTglTarget(id, f),
}

// Bottom tabs: fraction (0..1) ↔ index (0..count-1) conversion at the
// binding layer. The renderer works in INDEX space (0..count-1), but
// gooseDrag works in FRACTION space (0..1). The bindings
// convert: getFraction divides by (count-1), setTarget/beginDrag/drag
// multiply by (count-1).
export const tabDragBindings = {
  getFraction: (r: LiquidGlassRenderer, id: string, count?: number) => {
    const c = count ?? 3
    // Use TARGET (not animated) fraction — faithful to the original which
    // uses `targetValue` in onDrag, not the animated value. Starting a drag
    // from the animated value (mid-spring) causes drift because the spring's
    // residual motion adds to the finger delta.
    return r.gooseTabTarget(id) / Math.max(1, c - 1)
  },
  beginDrag: (r: LiquidGlassRenderer, id: string, f: number, count?: number) => {
    const c = count ?? 3
    r.gooseTabDragStart(id, f * (c - 1), c)
  },
  drag: (r: LiquidGlassRenderer, id: string, sf: number, cx: number, sx: number, dw: number, count?: number) => {
    const c = count ?? 3
    r.gooseTabDrag(id, sf * (c - 1), cx, sx, dw, c)
  },
  endDrag: (r: LiquidGlassRenderer, id: string, count?: number) => {
    const c = count ?? 3
    // gooseTabDragEnd returns an INDEX (0..c-1). Convert to fraction (0..1).
    return r.gooseTabDragEnd(id, c) / Math.max(1, c - 1)
  },
  setTarget: (r: LiquidGlassRenderer, id: string, f: number, count?: number) => {
    const c = count ?? 3
    r.gooseTabSel(id, Math.max(0, Math.min(c - 1, Math.round(f * (c - 1)))), c)
  },
}

export function gooseSlider(
  idPrefix: string,
  trackX: number,
  trackY: number,
  trackW: number,
  groupId: string,
  trackColor: [number, number, number, number],
  accentColor: [number, number, number],
  rendererRef: React.MutableRefObject<LiquidGlassRenderer | null> | null,
  onValueChange: (fraction: number) => void,
  scroll = true,
  liveUpdate = false,
  initFraction = 0,
  snap?: (f: number) => number,
  onLiveValue?: (fraction: number) => void,
): { elements: GooseElement[]; interactions: Record<string, GooseInteract> } {
  const elements: GooseElement[] = []
  const interactions: Record<string, GooseInteract> = {}
  const dragW = trackW - gooseKnobW / 2
  const knobBaseX = trackX - gooseKnobW / 4
  const knobY = trackY + (gooseTrackH - gooseKnobH) / 2
  // Knob rect.x is ALWAYS at fraction=0 (knobBaseX). The renderer's
  // isToggleKnob.dragWidth drives the x offset via spring animation.
  // Setting rect.x to initFraction would cause 2x displacement
  // (rect.x + spring offset = initFraction*dragW + fraction*dragW).
  const knobX = knobBaseX

  // Track
  const trackEl = gooseRect(`${idPrefix}-track`, { x: trackX, y: trackY, w: trackW, h: gooseTrackH }, trackColor, gooseTrackH / 2)
  trackEl.hitRect = { x: trackX, y: trackY + (gooseTrackH - gooseHitH) / 2, w: trackW, h: gooseHitH }
  trackEl.scroll = scroll
  elements.push(trackEl)

  // Fill — width driven by renderer via isSliderFill
  const fillW = Math.max(gooseTrackH, initFraction * trackW)
  const fillEl = gooseRect(`${idPrefix}-fill`, { x: trackX, y: trackY, w: fillW, h: gooseTrackH }, [...accentColor, 1], gooseTrackH / 2)
  fillEl.isSliderFill = { groupId, trackX, trackW, knobW: gooseKnobW, minW: 0 }
  fillEl.scroll = scroll
  elements.push(fillEl)

  // Knob — frosted white at rest, glass when pressed (no highlight)
  const knobEl = gooseGlass(
    `${idPrefix}-knob`,
    { x: knobX, y: knobY, w: gooseKnobW, h: gooseKnobH },
    {
      cornerRadius: gooseKnobH / 2,
      refractionHeight: 10 * gooseDP,
      refractionAmount: -14 * gooseDP,
      blurRadius: 8 * gooseDP,
      saturation: 1.0,
      surfaceColor: [0, 0, 0, 0],
      highlight: null,
      outerShadow: { radius: 4 * gooseDP, alpha: 0.05, offsetX: 0, offsetY: (4 / 6) * gooseDP, color: [0, 0, 0] },
      innerShadow: { radius: 4 * gooseDP, alpha: 0.15, offsetX: 0, offsetY: 4 * gooseDP },
      chromaticAberration: true,
    },
    scroll
  )
  knobEl.isToggleKnob = { groupId, dragWidth: dragW, velocityDivisor: 10 }
  knobEl.hitRect = { x: knobX, y: knobY + (gooseKnobH - gooseHitH) / 2, w: gooseKnobW, h: gooseHitH }
  elements.push(knobEl)

  // Interactions — unified drag pattern via gooseDrag.
  const interact = gooseDrag({
    groupId, trackX, dragW, rendererRef, onValueChange, onLiveValue,
    ...sliderDragBindings,
    snap,
    liveUpdate,
  })
  interactions[`${idPrefix}-track`] = interact
  interactions[`${idPrefix}-knob`] = interact

  return { elements, interactions }
}

/* ------------------------------------------------------------------ *
 * Element factory helpers (shared across all destinations).
 * ------------------------------------------------------------------ */
export function gooseBtn(
  id: string,
  rect: { x: number; y: number; w: number; h: number },
  spec: {
    label: string
    tintColor: [number, number, number, number]
    surfaceColor: [number, number, number, number]
    labelColor: [number, number, number, number]
    /** Optional fixed font size in CSS px (default: auto-scale from height). */
    labelFontSizePx?: number
  },
  scroll = true
): GooseElement {
  return {
    id,
    kind: 'button',
    rect,
    ...gooseGlassP,
    cornerRadius: rect.h / 2,
    tintColor: spec.tintColor,
    surfaceColor: spec.surfaceColor,
    highlight: { ...gooseHL },
    outerShadow: { ...gooseShadow },
    label: spec.label,
    labelColor: spec.labelColor,
    labelFontSizePx: spec.labelFontSizePx,
    showChevron: false,
    isInteractive: true,
    scroll,
  }
}

export function gooseText(
  id: string,
  rect: { x: number; y: number; w: number; h: number },
  text: string,
  opts: {
    color?: [number, number, number, number]
    fontSizePx?: number
    fontWeight?: number
    align?: 'left' | 'center' | 'right'
    wrap?: boolean
    paddingPx?: number
    valign?: 'top' | 'center' | 'bottom'
    maxLines?: number
    halo?: 'auto' | 'light' | 'dark' | 'none'
    icon?: { path: string; size: number; color: [number, number, number, number]; viewport?: number; layoutSize?: number }
    /** Press tint color for interactive text items (ripple color).
     *  Faithful to MainContent.kt: black in light theme, white in dark. */
    pressTintColor?: [number, number, number, number]
  } = {},
  scroll = true
): GooseElement {
  return {
    id,
    kind: 'text',
    rect,
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
    labelColor: [0, 0, 0, 1],
    showChevron: false,
    isInteractive: false,
    pressTintColor: opts.pressTintColor,
    scroll,
    text: {
      content: text,
      color: opts.color ?? [0, 0, 0, 1],
      fontSizePx: opts.fontSizePx ?? gooseTextSz,
      fontWeight: opts.fontWeight ?? 400,
      align: opts.align ?? 'left',
      wrap: opts.wrap ?? false,
      paddingPx: opts.paddingPx ?? 16,
      valign: opts.valign,
      maxLines: opts.maxLines,
      halo: opts.halo ?? 'auto',
      icon: opts.icon,
    },
  }
}

export function gooseRect(
  id: string,
  rect: { x: number; y: number; w: number; h: number },
  color: [number, number, number, number],
  cornerRadius = 0,
  scroll = true
): GooseElement {
  return {
    id,
    kind: 'plain-rect',
    rect,
    cornerRadius,
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
    labelColor: [0, 0, 0, 1],
    showChevron: false,
    isInteractive: false,
    scroll,
    plainRect: { color },
  }
}

/**
 * Tab drag interactions — faithful to LiquidBottomTabs.kt's
 * dampedDragAnimation gesture handling.
 *
 * The original uses DampedDragAnimation with:
 *   valueRange = 0..(tabsCount-1)
 *   pressedScale = 78/56
 *   onDrag → updateValue(targetValue + dragAmount.x / tabWidth)
 *   onDragStopped → snap to nearest tab, animateToValue
 *
 * We reuse the renderer's toggle-group state (which supports custom
 * pressedScale via gooseEnsureTgl) through the tab-specific API:
 *   gooseTabDragStart / gooseTabDrag / gooseTabDragEnd.
 */
export function gooseTabDrag(
  groupId: string,
  tabWidth: number,
  tabsCount: number,
  onSelect: (i: number) => void,
  rendererRef: React.MutableRefObject<LiquidGlassRenderer | null> | null
): GooseInteract {
  // Module-level drag state (survives catalog rebuilds).
  if (!dragStates.has(groupId)) dragStates.set(groupId, { fraction: 0, x: 0, didDrag: false })
  const ds = dragStates.get(groupId)!

  return {
    onTap: () => {
      // Tab taps handled by tab-text interactions, not here.
    },
    onDragStart: (pos) => {
      const r = rendererRef?.current
      if (!r) return
      gooseDragGroups.add(groupId)
      // Use TARGET index (not animated) — faithful to original's targetValue.
      ds.fraction = r.gooseTabTarget(groupId)
      ds.x = pos.x
      ds.didDrag = false
      r.gooseTabDragStart(groupId, ds.fraction, tabsCount)
    },
    onDrag: (pos) => {
      const r = rendererRef?.current
      if (!r) return
      if (Math.abs(pos.x - ds.x) > 3) ds.didDrag = true
      // Relative drag: indicator follows finger delta from drag start.
      // startTabIndex + (currentX - startX) / tabWidth, clamped to [0, count-1].
      r.gooseTabDrag(groupId, ds.fraction, pos.x, ds.x, tabWidth, tabsCount)
    },
    onDragEnd: () => {
      const r = rendererRef?.current
      if (!r) return
      // gooseTabDragEnd snaps to nearest integer, sets targetFraction, returns index.
      const finalIndex = r.gooseTabDragEnd(groupId, tabsCount)
      // Call onSelect AFTER gooseTabDragEnd (so targetFraction is already set).
      // Keep gooseDragGroups set during onSelect to prevent tabTargets effect
      // from calling gooseTabSel (which would zero velocity).
      if (ds.didDrag) {
        onSelect(finalIndex)
      }
      gooseDragGroups.delete(groupId)
    },
  }
}

export function gooseGlass(
  id: string,
  rect: { x: number; y: number; w: number; h: number },
  opts: {
    cornerRadius?: number
    refractionHeight?: number
    refractionAmount?: number
    blurRadius?: number
    saturation?: number
    brightness?: number
    contrast?: number
    surfaceColor?: [number, number, number, number]
    highlight?: GooseHL | null
    outerShadow?: typeof gooseShadow | null
    innerShadow?: { radius: number; alpha: number; offsetX: number; offsetY: number } | null
    depthEffect?: boolean
    chromaticAberration?: boolean
  } = {},
  scroll = true
): GooseElement {
  return {
    id,
    kind: 'glass-shape',
    rect,
    cornerRadius: opts.cornerRadius ?? rect.h / 2,
    refractionHeight: opts.refractionHeight ?? 12 * gooseDP,
    refractionAmount: opts.refractionAmount ?? -24 * gooseDP,
    depthEffect: opts.depthEffect ?? false,
    chromaticAberration: opts.chromaticAberration ?? false,
    blurRadius: opts.blurRadius ?? 2 * gooseDP,
    saturation: opts.saturation ?? 1.5,
    brightness: opts.brightness ?? 0,
    contrast: opts.contrast ?? 1,
    tintColor: [0, 0, 0, 0],
    surfaceColor: opts.surfaceColor ?? [0, 0, 0, 0],
    highlight: opts.highlight !== undefined ? opts.highlight : { ...gooseHL },
    outerShadow: opts.outerShadow !== undefined ? opts.outerShadow : null,
    label: '',
    labelColor: [0, 0, 0, 1],
    showChevron: false,
    isInteractive: false,
    scroll,
    innerShadow: opts.innerShadow ?? null,
  }
}

/* ------------------------------------------------------------------ *
 * Back button — rendered at top-left of every non-Home destination.
 * Matches the Android BackHandler behavior (hardware back → Home).
 * Circular glass button with a Material Design arrow_back icon,
 * matching the original catalog's navigation icon button.
 * ------------------------------------------------------------------ */

// Material Design arrow_back icon path (24×24 viewport).
const ARROW_BACK_ICON_PATH =
  'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'

// Sun and moon icon paths (24×24 viewport) for the theme toggle button.
// Sun is shown in dark mode (click → switch to light).
// Moon is shown in light mode (click → switch to dark).
const SUN_ICON_PATH =
  'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 17a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zM4.22 4.22a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 1 1-1.42 1.41L4.22 5.63a1 1 0 0 1 0-1.41zm12.73 12.73a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 1 1-1.42 1.41l-1.41-1.42a1 1 0 0 1 0-1.41zM2 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm17 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1zM4.22 19.78a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 1 1 1.41 1.42l-1.41 1.41a1 1 0 0 1-1.42 0zM16.95 7.05a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 1 1 1.41 1.42l-1.41 1.41a1 1 0 0 1-1.42 0z'
const MOON_ICON_PATH =
  'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'

export function gooseBack(
  onBack: () => void,
  palette: GoosePalette,
  scroll = false
): { element: GooseElement; interaction: GooseInteract } {
  // Circular button: 56dp diameter, centered arrow_back icon (32dp).
  // Per user request: "玻璃退出按钮不要有边缘高光" — no edge highlight
  // on the glass back button. We pass `highlight: null` so the rim
  // highlight pass is skipped entirely.
  // Per user request: "把退出按钮改大一点" — increased from 40dp to 56dp.
  // Arrow color flips with theme (black on light, white on dark) to
  // match the original catalog's `contentColor` behavior.
  const size = 56 * gooseDP
  const iconSize = 32 * gooseDP
  const element: GooseElement = {
    id: '__back__',
    kind: 'button',
    rect: { x: 16, y: 16, w: size, h: size },
    ...gooseGlassP,
    cornerRadius: size / 2, // circular
    tintColor: [0, 0, 0, 0],
    surfaceColor: palette.buttonSurface,
    highlight: null, // no edge highlight on the back button
    outerShadow: { ...gooseShadow, radius: 12 * gooseDP, alpha: 0.08 },
    label: '', // no text label — icon replaces it
    labelColor: palette.backIconColor,
    showChevron: false,
    isInteractive: true,
    scroll,
    icon: {
      path: ARROW_BACK_ICON_PATH,
      size: iconSize,
      color: palette.backIconColor,
    },
  }
  return {
    element,
    interaction: { onTap: () => onBack() },
  }
}

/* ------------------------------------------------------------------ *
 * Theme toggle button — rendered at top-right, mirrored from the back
 * button at top-left. Per user request: "把这个按钮也弄成canvas里面的，
 * 和退出按钮等大对称" — make this button also inside the canvas, same size
 * as the exit button, symmetric position.
 *
 * Same 56dp circular glass body as the back button, with a sun icon (in
 * dark mode, click → light) or moon icon (in light mode, click → dark).
 * The icon color flips with theme to match the back button's behavior.
 * ------------------------------------------------------------------ */
export function gooseThemeBtn(
  onToggleTheme: () => void,
  palette: GoosePalette,
  isLightTheme: boolean,
  canvasW: number,
  scroll = false
): { element: GooseElement; interaction: GooseInteract } {
  const size = 56 * gooseDP
  const iconSize = 32 * gooseDP
  // Mirrored position: back button is at (16, 16); theme button is at
  // (W - 16 - size, 16) so the two buttons are symmetric across the
  // horizontal centerline.
  const element: GooseElement = {
    id: '__theme__',
    kind: 'button',
    rect: { x: canvasW - 16 - size, y: 16, w: size, h: size },
    ...gooseGlassP,
    cornerRadius: size / 2, // circular
    tintColor: [0, 0, 0, 0],
    surfaceColor: palette.buttonSurface,
    highlight: null, // no edge highlight (matches back button)
    outerShadow: { ...gooseShadow, radius: 12 * gooseDP, alpha: 0.08 },
    label: '',
    labelColor: palette.backIconColor,
    showChevron: false,
    isInteractive: true,
    scroll,
    icon: {
      // Sun in dark mode (click → light); moon in light mode (click → dark).
      path: isLightTheme ? MOON_ICON_PATH : SUN_ICON_PATH,
      size: iconSize,
      color: palette.backIconColor,
    },
  }
  return {
    element,
    interaction: { onTap: () => onToggleTheme() },
  }
}

/* ------------------------------------------------------------------ *
 * gooseCenter — offsets all element y positions (except the
 * back button, which stays top-left) so the content is vertically
 * centered within the viewport. Mirrors BackdropDemoScaffold's
 * `Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center)`.
 *
 * Returns the new contentHeight (= H if centering applied, since the
 * content now spans the full viewport visually).
 * ------------------------------------------------------------------ */
export function gooseCenter(
  elements: GooseElement[],
  contentTop: number,
  contentHeight: number,
  H: number
): number {
  const contentSize = contentHeight - contentTop
  if (contentSize >= H) return contentHeight
  const yOffset = Math.max(0, (H - contentSize) / 2 - contentTop)
  if (yOffset <= 0) return contentHeight
  for (const el of elements) {
    // Back button, theme button, and full-screen overlays (scroll=false) stay
    // at their fixed positions (not shifted by vertical centering).
    if (el.id === '__back__' || el.id === '__theme__') continue
    if (el.scroll === false && el.id !== '__pickimage__') continue
    el.rect = { ...el.rect, y: el.rect.y + yOffset }
    // Shift hitRect too (if set) so expanded touch targets follow the element.
    if (el.hitRect) {
      el.hitRect = { ...el.hitRect, y: el.hitRect.y + yOffset }
    }
    // Faithful fix: toggle knobs store the TRACK's original screen
    // position separately in `isToggleKnob.trackOriginalY` (used by the
    // renderer to compute the scaled track rect inside the knob's
    // CombinedBackdrop). Since the track element's rect.y was just
    // shifted by yOffset, we must shift trackOriginalY by the same
    // amount — otherwise the scaled track rect would be at the wrong Y
    // (off by yOffset * (1 - trackScaleY)), causing "no track visible
    // inside the knob" after vertical centering.
    if (el.isToggleKnob && el.isToggleKnob.trackOriginalY != null) {
      el.isToggleKnob.trackOriginalY += yOffset
    }
    // Bottom tab indicator stores the CONTAINER rect separately for its
    // CombinedBackdrop (the inset capsule SDF covers the container area).
    // Shift it by the same yOffset so the SDF stays aligned.
    if (el.isBottomTabIndicator && el.isBottomTabIndicator.containerRect) {
      el.isBottomTabIndicator.containerRect = {
        ...el.isBottomTabIndicator.containerRect,
        y: el.isBottomTabIndicator.containerRect.y + yOffset,
      }
    }
    // Bottom tab content stores the CONTAINER center (scale origin) separately.
    // Shift it by the same yOffset so the scale pivot stays aligned with the
    // actual container position after vertical centering.
    if (el.isBottomTabContent && el.isBottomTabContent.containerCenterY != null) {
      el.isBottomTabContent.containerCenterY += yOffset
    }
    // Bottom tab indicator also scales around the container center — shift
    // its pivot too.
    if (el.isBottomTabIndicator && el.isBottomTabIndicator.containerCenterY != null) {
      el.isBottomTabIndicator.containerCenterY += yOffset
    }
    // Shift tab content rects (for blue tint mask) by yOffset too.
    if (el.isBottomTabIndicator && el.isBottomTabIndicator.tabContentRects) {
      el.isBottomTabIndicator.tabContentRects = el.isBottomTabIndicator.tabContentRects.map(r => ({
        ...r, y: r.y + yOffset,
      }))
    }
  }
  return contentHeight + yOffset
}

