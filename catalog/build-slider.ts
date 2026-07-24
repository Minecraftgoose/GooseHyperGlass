import * as React from 'react'
import type { GooseInteract } from '../context'
import type { GooseElement, LiquidGlassRenderer } from '../renderer'
import {
  gooseDP,
  gooseLight,
  gooseHitH,
  gooseKnobH,
  gooseKnobW,
  gooseTrackH,
  type GooseResult,
  type GooseState,
  type GoosePalette,
} from './types'
import { gooseCenter, gooseBack, gooseDrag, gooseGlass, gooseRect, sliderDragBindings } from './helpers'

/* ------------------------------------------------------------------ *
 * SLIDER — faithful to SliderContent.kt + LiquidSlider.kt
 *
 * Layout: centered Column with:
 *   1. Slider on wallpaper (full-width 6dp track + 40×24 knob)
 *   2. White rounded card (32dp radius) containing another slider
 *
 * KNOB VISUAL STATES (faithful to LiquidSlider.kt):
 *   At rest (pressProgress = 0):
 *     - blur(8dp) → frosted backdrop
 *     - lens(0, 0) → no refraction
 *     - highlight.Ambient.alpha = 0 → no edge highlight
 *     - innerShadow(radius=0, alpha=0) → no inner shadow
 *     - onDrawSurface: drawRect(White alpha=1) → solid frosted white pebble
 *   Pressed (pressProgress = 1):
 *     - blur(0) → clear backdrop
 *     - lens(10dp, 14dp) → glass refraction visible (bigger lens than toggle)
 *     - highlight.Ambient.alpha = 1 → subtle edge glow
 *     - innerShadow(radius=4dp, alpha=1) → depth cue
 *     - onDrawSurface: drawRect(White alpha=0) → no overlay, glass visible
 *
 * KNOB POSITION (faithful to LiquidSlider.kt graphicsLayer):
 *   translationX = -knobW/2 + trackW * progress, clamped to
 *   [-knobW/4, trackW - knobW*3/4]. So the knob goes "half off" the
 *   track at both extremes (progress=0 and progress=1).
 *
 * We reuse the renderer's GooseTglState machinery for spring-animated
 * position (groupId 'slider1' / 'slider2'). The page.tsx layer pushes
 * the target fraction via `toggleTargets`.
 * ------------------------------------------------------------------ */
export function buildSlider(
  W: number,
  H: number,
  onBack: () => void,
  state: GooseState,
  setState: (patch: Partial<GooseState> | ((prev: GooseState) => Partial<GooseState>)) => void,
  rendererRef?: React.MutableRefObject<LiquidGlassRenderer | null>,
  palette: GoosePalette = gooseLight,
  single: boolean = false,
  cardOnly: boolean = false
): GooseResult {
  const elements: GooseElement[] = []
  const interactions: Record<string, GooseInteract> = {}

  const back = gooseBack(onBack, palette)
  elements.push(back.element)
  interactions[back.element.id] = back.interaction

  // Theme-aware slider colors (faithful to LiquidSlider.kt):
  //   accentColor: Color(0xFF0088FF) (light) ↔ Color(0xFF0091FF) (dark)
  //   trackColor:   Color(0xFF787878).copy(0.2f) (light) ↔ Color(0xFF787880).copy(0.36f) (dark)
  //   cardBg:       Color(0xFFFFFFFF) (light) ↔ Color(0xFF121212) (dark)
  //   [from SliderContent.kt's `backgroundColor`]
  const SLIDER_ACCENT_T = palette.sliderAccent
  const SLIDER_TRACK_T = palette.sliderTrackOff
  const CARD_BG_T = palette.sliderCardBg

  const SLIDER_PAD = 32 * gooseDP
  const gooseTrackH = 6 * gooseDP
  const gooseKnobW = 40 * gooseDP
  const gooseKnobH = 24 * gooseDP

  // NOTE: No page title — original SliderContent.kt has no title.
  // Content is vertically centered via gooseCenter at the end
  // (mirrors BackdropDemoScaffold's Box(contentAlignment = Center)).

  const drawWall = !single || !cardOnly
  const drawCard = !single || cardOnly

  // --- Slider 1: on wallpaper ---
  const s1TrackX = SLIDER_PAD
  const s1TrackY = 0 // gooseCenter shifts this
  const s1TrackW = W - 2 * SLIDER_PAD
  const s1KnobBaseX = s1TrackX - gooseKnobW / 4
  const s1KnobY = s1TrackY + (gooseTrackH - gooseKnobH) / 2
  const gooseHitH = 48 * gooseDP
  const SLIDER_KNOB_HIT_H = 48 * gooseDP // lifted: used by BOTH wall + card knob hit areas (const is block-scoped)
  if (drawWall) {
  // LiquidSlider(modifier = padding(horizontal = 32dp))
  //   → slider track fillMaxWidth = W - 64
  // Knob base position (fraction=0): faithful to LiquidSlider.kt's
  //   translationX = (-knobW/2 + trackW * progress)
  //                  .fastCoerceIn(-knobW/4, trackW - knobW*3/4)
  // At fraction=0, translationX = -knobW/4 (clamped), so knob left edge
  // is at trackX - knobW/4 (knob is 1/4 off the left edge of the track).
  // At fraction=1, knob left edge is at trackX + trackW - knobW*3/4
  // (knob is 1/4 off the right edge).
  // So dragWidth = trackW - knobW/2 (the knob center moves from
  // trackX + knobW/4 to trackX + trackW - knobW/4).
  // Track (background, off color)
  const s1TrackEl = gooseRect('slider1-track', { x: s1TrackX, y: s1TrackY, w: s1TrackW, h: gooseTrackH }, SLIDER_TRACK_T, gooseTrackH / 2)
  // Expanded touch target: visually 6dp tall, but touchable over a 48dp band
  // centered on the track (faithful to Material touch-target guidelines).
  s1TrackEl.hitRect = { x: s1TrackX, y: s1TrackY + (gooseTrackH - gooseHitH) / 2, w: s1TrackW, h: gooseHitH }
  elements.push(s1TrackEl)
  // Fill (accent color) — width is driven by the renderer via isSliderFill,
  // using the toggle group's animated fraction (spring) so it stays in sync
  // with the knob's motion and aligns exactly with the knob center.
  // The initial rect.w is a placeholder; the renderer recomputes it each frame.
  const s1FillEl = gooseRect('slider1-fill', { x: s1TrackX, y: s1TrackY, w: gooseTrackH, h: gooseTrackH }, [...SLIDER_ACCENT_T, 1], gooseTrackH / 2)
  s1FillEl.isSliderFill = { groupId: 'slider1', trackX: s1TrackX, trackW: s1TrackW, knobW: gooseKnobW, minW: 0 }
  elements.push(s1FillEl)
  // Knob — solid frosted white at rest, glass when pressed (renderer handles modulation).
  const s1KnobEl = gooseGlass(
    'slider1-knob',
    { x: s1KnobBaseX, y: s1KnobY, w: gooseKnobW, h: gooseKnobH },
    {
      cornerRadius: gooseKnobH / 2,
      refractionHeight: 10 * gooseDP, // lens height when pressed (bigger than toggle)
      refractionAmount: -14 * gooseDP, // lens amount when pressed
      blurRadius: 8 * gooseDP, // frosted blur at rest (renderer modulates)
      saturation: 1.0, // NO saturation boost — slider effects block only has blur+lens
      surfaceColor: [0, 0, 0, 0],
      highlight: null,
      outerShadow: { radius: 4 * gooseDP, alpha: 0.05, offsetX: 0, offsetY: (4 / 6) * gooseDP, color: [0, 0, 0] },
      innerShadow: { radius: 4 * gooseDP, alpha: 0.15, offsetX: 0, offsetY: 4 * gooseDP },
      chromaticAberration: true,
    }
  )
  s1KnobEl.isToggleKnob = { groupId: 'slider1', dragWidth: s1TrackW - gooseKnobW / 2, velocityDivisor: 10 }
  // Expanded touch target: knob is visually 40×24, but touchable over a 48dp
  // band centered on the knob (faithful to Material touch-target guidelines).
  // The hitRect is centered on the knob's rect so the touch zone extends ~12dp
  // above and below the visible knob.
  s1KnobEl.hitRect = {
    x: s1KnobBaseX,
    y: s1KnobY + (gooseKnobH - SLIDER_KNOB_HIT_H) / 2,
    w: gooseKnobW,
    h: SLIDER_KNOB_HIT_H,
  }
  elements.push(s1KnobEl)
  }

  // 白卡对照（仅当 drawCard）。
  let cardContentBottom = s1TrackY + gooseKnobH + 24 * gooseDP
  // White-card + Slider-2 geometry lifted to function scope: the card element is
  // still pushed only when drawCard, but s2* vars are ALSO read by the second
  // if(drawCard) interaction block below — const is block-scoped, so they must
  // live at function scope to be visible there.
  const VISIBLE_CARD_H = 24 + 48 // 72dp = slider (knob height) + inner pad
  const cardX = 24 * gooseDP
  const cardW = W - 2 * cardX
  const cardH = VISIBLE_CARD_H
  const cardY = drawWall ? (s1TrackY + gooseKnobH + 16 + 24) : (24 * gooseDP) // 只白卡时从顶部起排
  const cardRadius = 32 * gooseDP
  const s2TrackX = cardX + 24 + SLIDER_PAD
  const s2TrackW = cardW - 2 * 24 - 2 * SLIDER_PAD
  const s2TrackY = cardY + 24 + (gooseKnobH - gooseTrackH) / 2
  const s2KnobBaseX = s2TrackX - gooseKnobW / 4
  const s2KnobY = s2TrackY + (gooseTrackH - gooseKnobH) / 2
  if (drawCard) {
  // Box(Modifier.padding(24dp).clip(RoundedRectangle(32dp)).background(white).padding(24dp))
  // The Box is wrap_content, but its child (LiquidSlider with fillMaxWidth)
  // makes the Box take the full available width.
  //   Slider1 layout height = 24dp (max of track 6 and knob 24)
  //   Visible card height = 24 (slider) + 48 (inner pad 24*2) = 72dp
  //   Visible card width = W - 48 (outer pad 24*2)
  //   Total Box height = 72 + 48 (outer pad) = 120dp
  // The Column has spacedBy(16dp) between slider1 and the Box.
  // The outer padding(24dp) provides 24dp space above the visible card.
  // Slider1 layout bottom = s1TrackY + 24 (slider1 Box height)
  //   = s1TrackY + gooseKnobH (since knob is the tallest child)
  //   But the slider1 layout bottom is actually s1TrackY + max(track, knob) = s1TrackY + 24
  //   However, the slider1 layout extends from s1KnobY to s1KnobY + 24
  //   = s1TrackY - 9 to s1TrackY + 15. So layout bottom = s1TrackY + 15.
  //   For simplicity, use s1TrackY + gooseKnobH as the layout height.
  elements.push(gooseRect('slider-card', { x: cardX, y: cardY, w: cardW, h: cardH }, CARD_BG_T, cardRadius))

  // Slider 2 inside the card:
  //   Box inner padding 24 + LiquidSlider padding(horizontal=32)
  //   → track X = cardX + 24 + 32 = cardX + 56
  //   → track W = cardW - 2*24 - 2*32 = cardW - 112
  //   Track Y = cardY + 24 (inner pad) + (24-6)/2 = cardY + 24 + 9
  //   (track is vertically centered in the 24dp-tall slider layout)
  const s2TrackEl = gooseRect('slider2-track', { x: s2TrackX, y: s2TrackY, w: s2TrackW, h: gooseTrackH }, SLIDER_TRACK_T, gooseTrackH / 2)
  s2TrackEl.hitRect = { x: s2TrackX, y: s2TrackY + (gooseTrackH - gooseHitH) / 2, w: s2TrackW, h: gooseHitH }
  elements.push(s2TrackEl)
  const s2FillEl = gooseRect('slider2-fill', { x: s2TrackX, y: s2TrackY, w: gooseTrackH, h: gooseTrackH }, [...SLIDER_ACCENT_T, 1], gooseTrackH / 2)
  s2FillEl.isSliderFill = { groupId: 'slider2', trackX: s2TrackX, trackW: s2TrackW, knobW: gooseKnobW, minW: 0 }
  elements.push(s2FillEl)
  const s2KnobEl = gooseGlass(
    'slider2-knob',
    { x: s2KnobBaseX, y: s2KnobY, w: gooseKnobW, h: gooseKnobH },
    {
      cornerRadius: gooseKnobH / 2,
      refractionHeight: 10 * gooseDP,
      refractionAmount: -14 * gooseDP,
      blurRadius: 8 * gooseDP,
      saturation: 1.0, // NO saturation boost — slider effects block only has blur+lens
      surfaceColor: [0, 0, 0, 0],
      highlight: null,
      outerShadow: { radius: 4 * gooseDP, alpha: 0.05, offsetX: 0, offsetY: (4 / 6) * gooseDP, color: [0, 0, 0] },
      innerShadow: { radius: 4 * gooseDP, alpha: 0.15, offsetX: 0, offsetY: 4 * gooseDP },
      chromaticAberration: true,
    }
  )
  s2KnobEl.isToggleKnob = { groupId: 'slider2', dragWidth: s2TrackW - gooseKnobW / 2, velocityDivisor: 10 }
  // Expanded touch target (same as slider1 knob).
  s2KnobEl.hitRect = {
    x: s2KnobBaseX,
    y: s2KnobY + (gooseKnobH - SLIDER_KNOB_HIT_H) / 2,
    w: gooseKnobW,
    h: SLIDER_KNOB_HIT_H,
  }
  elements.push(s2KnobEl)
  cardContentBottom = cardY + cardH + 24 * gooseDP
  }

  // --- Interactions ---
  // Tap on track → animate knob to tapped position.
  // Drag on track → knob follows finger (added for usability; the original
  //   only supports tap on track + drag on knob, but a small knob is hard
  //   to hit on touch devices, so we forward track drags to the knob).
  // Drag on knob → knob follows finger continuously (stepless, faithful to
  //   LiquidSlider.kt's continuous valueRange + onValueChange).
  //
  // Faithful to LiquidSlider.kt:
  //   - onDrag: onValueChange(targetValue + delta)  — continuous, live
  //   - onDragStopped: onValueChange(targetValue)    — NO snap (unlike toggle)
  // We mirror this by calling setState during drag (so the fill width tracks
  // the knob live) and using gooseSldDragEnd (no 0/1 snap) on release.
  //
  // dragWidth for fraction computation = trackW - knobW/2 (matches the
  // renderer's positioning dragWidth). This ensures the knob tracks the
  // finger 1:1 — previously we passed `trackW` here, which made the knob
  // move ~6% slower than the finger.
  const SLIDER_DRAG_W1 = s1TrackW - gooseKnobW / 2
  // Slider page: NO liveUpdate (fill driven by renderer's isSliderFill).
  // Tap → jump to position. Drag → relative. End → sync state.
  const makeSliderInteract = (groupId: string, trackX: number, dragW: number): GooseInteract =>
    gooseDrag({
      groupId, trackX, dragW, rendererRef,
      onValueChange: (f) => setState({ sliderValue: f * 100 }),
      ...sliderDragBindings,
      // No liveUpdate — state synced on dragEnd only (avoids feedback loop
      // with toggleTargets effect that would fight the spring).
      liveUpdate: false,
    })

  if (drawWall) {
    interactions['slider1-track'] = makeSliderInteract('slider1', s1TrackX, SLIDER_DRAG_W1)
    interactions['slider1-knob'] = interactions['slider1-track']
  }
  if (drawCard) {
    const SLIDER_DRAG_W2 = s2TrackW - gooseKnobW / 2
    interactions['slider2-track'] = makeSliderInteract('slider2', s2TrackX, SLIDER_DRAG_W2)
    interactions['slider2-knob'] = interactions['slider2-track']
  }

  // Content height = card bottom (including outer padding 24dp below the card)
  const contentHeight = cardContentBottom
  const finalHeight = gooseCenter(elements, 0, contentHeight, H)
  return { elements, interactions, contentHeight: finalHeight }
}
