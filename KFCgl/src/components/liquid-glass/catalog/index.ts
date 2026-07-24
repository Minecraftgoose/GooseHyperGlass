'use client'

import * as React from 'react'
import type { LiquidGlassRenderer } from '../renderer'
import {
  CatalogDestination,
  DEFAULT_CATALOG_STATE,
  DP,
  getPalette,
  type CatalogResult,
  type CatalogState,
  type ThemePalette,
  measureTextWidth,
  setGravityAngle,
  draggingGroups,
} from './types'
import { makeButton, makeThemeToggleButton } from './helpers'
import { buildButtons } from './build-buttons'
import { buildToggle } from './build-toggle'
import { buildSlider } from './build-slider'
import { buildBottomTabs } from './build-bottom-tabs'
import { buildDialog } from './build-dialog'
import { buildMagnifier } from './build-magnifier'
import { buildScrollContainer } from './build-scroll-container'
import { buildRating } from './build-rating'
import { buildRingProgress } from './build-ring-progress'

// Re-export public API (preserving the original catalog.tsx surface).
export {
  CatalogDestination,
  DEFAULT_CATALOG_STATE,
  type CatalogState,
  type CatalogResult,
  type ThemePalette,
  setGravityAngle,
  draggingGroups,
}

/* ------------------------------------------------------------------ *
 * Main entry — dispatches to the right builder.
 *
 * `isLightTheme` is forwarded as a `ThemePalette` to each builder so
 * they can pick the correct per-destination colors (faithful to each
 * *Content.kt file's `isLightTheme = !isSystemInDarkTheme()` check).
 *
 * `onToggleTheme` is wired into a canvas-rendered theme toggle button
 * (top-right, 56dp, mirrored from the back button) that is added to
 * EVERY destination's element list. Per user request: "把这个按钮也弄成
 * canvas里面的，和退出按钮等大对称".
 * ------------------------------------------------------------------ */
export function buildCatalog(
  dest: CatalogDestination,
  W: number,
  H: number,
  state: CatalogState,
  setState: (patch: Partial<CatalogState> | ((prev: CatalogState) => Partial<CatalogState>)) => void,
  onNavigate: (d: CatalogDestination) => void,
  onBack: () => void,
  rendererRef?: React.MutableRefObject<LiquidGlassRenderer | null>,
  isLightTheme: boolean = true,
  onToggleTheme?: () => void,
  onPickImage?: () => void,
  onButtonTap?: (id: string) => void,
  tabsConfig?: Array<Array<{ icon: string; label: string; viewport?: number }>>,
  buttonsConfig?: Array<{ id?: string; label?: string; style?: any }>,
  dialogConfig?: { title?: string; body?: string; cancelText?: string; okayText?: string },
  onDialogTap?: (action: 'cancel' | 'okay') => void,
  scrollConfig?: Array<{ title: string; subtitle?: string; link?: { text: string; href?: string } }>,
  onLinkTap?: (itemIndex: number, href?: string) => void
): CatalogResult {
  const palette = getPalette(isLightTheme)
  let result: CatalogResult
  switch (dest) {
    case CatalogDestination.Buttons:
      result = buildButtons(W, H, onBack, palette, onButtonTap, buttonsConfig)
      break
    case CatalogDestination.Toggle:
      result = buildToggle(W, H, onBack, state, setState, rendererRef, palette)
      break
    case CatalogDestination.Slider:
      result = buildSlider(W, H, onBack, state, setState, rendererRef, palette)
      break
    case CatalogDestination.SingleSlider:
      result = buildSlider(W, H, onBack, state, setState, rendererRef, palette, true)
      break
    case CatalogDestination.SingleToggle:
      result = buildToggle(W, H, onBack, state, setState, rendererRef, palette, true)
      break
    case CatalogDestination.SingleBottomTabs:
      result = buildBottomTabs(W, H, onBack, state, setState, rendererRef, palette, tabsConfig, true)
      break
    case CatalogDestination.ToggleCard:
      result = buildToggle(W, H, onBack, state, setState, rendererRef, palette, true, true)
      break
    case CatalogDestination.SliderCard:
      result = buildSlider(W, H, onBack, state, setState, rendererRef, palette, true, true)
      break
    case CatalogDestination.BottomTabs2:
      result = buildBottomTabs(W, H, onBack, state, setState, rendererRef, palette, tabsConfig, true, true)
      break
    case CatalogDestination.BottomTabs:
      result = buildBottomTabs(W, H, onBack, state, setState, rendererRef, palette, tabsConfig)
      break
    case CatalogDestination.Dialog:
      result = buildDialog(W, H, onBack, state, palette, dialogConfig, onDialogTap)
      break
    case CatalogDestination.Magnifier:
      result = buildMagnifier(W, H, onBack, state, setState, palette)
      break
    case CatalogDestination.ScrollContainer:
      result = buildScrollContainer(W, onBack, 20, palette, scrollConfig, onLinkTap)
      break
    case CatalogDestination.LazyScrollContainer:
      result = buildScrollContainer(W, onBack, 100, palette, scrollConfig, onLinkTap)
      break
    case CatalogDestination.Rating:
      result = buildRating(W, H, onBack, state, setState, rendererRef, palette)
      break
    case CatalogDestination.RingProgress:
      result = buildRingProgress(W, H, onBack, state, setState, rendererRef, palette)
      break
    default:
      result = buildButtons(W, H, onBack, palette, onButtonTap)
      break
  }
  // Move the back button to the end of the element list so it's on top of
  // all layers (scrims, overlays, glass elements). It was pushed first by
  // each builder, but scrims/overlays pushed after it would cover it.
  // When hideOverlayButtons is true (default), the back button + theme toggle
  // are NOT rendered on non-Settings pages — use the browser back button / Esc
  // to return to Home. Settings itself is EXEMPT so you can always toggle this
  // setting back off (otherwise you'd be locked out of the Settings controls).
  const isSettings = dest === CatalogDestination.Settings
  const hideOverlays = state.hideOverlayButtons && !isSettings
  const backIdx = result.elements.findIndex((e) => e.id === '__back__')
  if (backIdx >= 0) {
    if (hideOverlays) {
      // Remove the back button entirely (hidden by setting).
      result.elements.splice(backIdx, 1)
      delete result.interactions['__back__']
    } else {
      const [backEl] = result.elements.splice(backIdx, 1)
      result.elements.push(backEl)
    }
  }
  // Theme toggle — appended AFTER the destination's elements so it sits on top
  // in z-order (tappable even over other glass elements). The button is
  // non-scrolling (stays at top-right when the page scrolls).
  // Skipped when hideOverlays is true.
  if (onToggleTheme && !hideOverlays) {
    const themeBtn = makeThemeToggleButton(onToggleTheme, palette, isLightTheme, W, false)
    // Apply global separable blur to the theme toggle too (it's created
    // AFTER the globalSeparableBlur loop above, so it misses the mark).
    if (state.globalSeparableBlur) {
      themeBtn.element.useSeparableBlur = true
    }
    result.elements.push(themeBtn.element)
    result.interactions[themeBtn.element.id] = themeBtn.interaction
  }
  // "Pick an image" button — faithful to BackdropDemoScaffold.kt's LiquidButton
  // at the bottom center. Blue tint, 56dp tall capsule (the original wraps
  // LiquidButton with Modifier.height(56f.dp), overriding the default 48dp).
  // The original uses BasicText("Pick an image", TextStyle(White, 16f.sp)) —
  // a FIXED 16sp, NOT scaled from button height. Horizontal padding = 16dp
  // (button) + 8dp (text) per side = 48dp total.
  // Only on non-Home pages.
  if (onPickImage && dest !== CatalogDestination.Home) {
    const pickLabel = 'Pick an image'
    const pickH = 56 * DP
    const pickFontPx = 16 // 16sp fixed (original: TextStyle(White, 16f.sp))
    const pickW = Math.ceil(measureTextWidth(pickLabel, pickFontPx) + 2 * (16 * DP + 8 * DP))
    const pickBtn = makeButton(
      '__pickimage__',
      { x: W / 2 - pickW / 2, y: H - 16 - pickH, w: pickW, h: pickH },
      {
        label: pickLabel,
        tintColor: [0x00 / 255, 0x88 / 255, 0xff / 255, 1], // accentColor (blue)
        surfaceColor: [0, 0, 0, 0],
        labelColor: [1, 1, 1, 1], // white text
        labelFontSizePx: pickFontPx,
      },
      false // scroll = false (fixed at bottom)
    )
    result.elements.push(pickBtn)
    result.interactions['__pickimage__'] = {
      onTap: () => onPickImage(),
      onDragStart: () => {},
      onDrag: () => {},
      onDragEnd: () => {},
    }
  }
  // Global separable 2-pass blur: when enabled in Settings, apply useSeparableBlur
  // to all glass elements (buttons + glass-shapes). Skip special elements that
  // have their own backdrop semantics (toggle knob, indicator, magnifier, SDF
  // texture) — those keep inline blur for correctness. Glass Playground square
  // always has useSeparableBlur regardless of this setting.
  // Applied AFTER all elements (including back button, theme toggle, pick-image)
  // are created so none are missed.
  if (state.globalSeparableBlur) {
    for (const el of result.elements) {
      if ((el.kind === 'button' || el.kind === 'glass-shape') &&
          !el.isSdfTexture && !el.isToggleKnob &&
          !el.isBottomTabIndicator && !el.isMagnifier) {
        el.useSeparableBlur = true
      }
    }
  }
  return result
}
