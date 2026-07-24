import * as React from 'react'
import type { ElementInteraction } from '../context'
import type { GlassElementConfig, GlassHighlight, LiquidGlassRenderer } from '../renderer'
import {
  DP,
  DEFAULT_HIGHLIGHT,
  getPalette,
  type CatalogResult,
  type CatalogState,
  type ThemePalette,
} from './types'
import { makeBackButton } from './helpers'

/* ------------------------------------------------------------------ *
 * RATING — 5-star glass rating component
 *
 * Layout: 5 star icons in a centered row, each as a glass button.
 * Tap star N to set rating to N (1-5), tap same star again to set to 0.
 * ------------------------------------------------------------------ */

const STAR_PATH = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'

const STARS = 5
const STAR_SIZE = 36 * DP       // icon drawing size
const STAR_GAP = 12 * DP         // gap between stars
const STAR_VIEWPORT = 24
const TOP_PAD = 60 * DP          // top padding to avoid back button

export function buildRating(
  W: number,
  H: number,
  onBack: () => void,
  state: CatalogState,
  setState: (patch: Partial<CatalogState> | ((prev: CatalogState) => Partial<CatalogState>)) => void,
  rendererRef?: React.MutableRefObject<LiquidGlassRenderer | null>,
  palette?: ThemePalette,
): CatalogResult {
  const p = palette ?? getPalette(true)
  const elements: GlassElementConfig[] = []
  const interactions: Record<string, ElementInteraction> = {}

  const totalW = STARS * STAR_SIZE + (STARS - 1) * STAR_GAP
  const startX = (W - totalW) / 2
  const starY = Math.max(TOP_PAD, (H - STAR_SIZE) / 2)

  // Back button (standard, placed first)
  const back = makeBackButton(onBack, p)
  elements.push(back.element)
  if (back.interaction) interactions[back.element.id] = back.interaction

  // Star colors — gold for filled, gray for empty. Works on both themes.
  const filledColor: [number, number, number, number] = [0xFF / 255, 0xCC / 255, 0x00 / 255, 1]
  const emptyColor: [number, number, number, number] = [0.4, 0.4, 0.4, 0.5]

  for (let i = 0; i < STARS; i++) {
    const starId = `star-${i}`
    const x = startX + i * (STAR_SIZE + STAR_GAP)
    const centerX = x + STAR_SIZE / 2
    const centerY = starY + STAR_SIZE / 2

    // Create a glass button element for each star
    const isFilled = state.ratingValue > i
    const iconColor = isFilled ? filledColor : emptyColor

    const starEl: GlassElementConfig = {
      id: starId,
      kind: 'button',
      rect: { x, y: starY, w: STAR_SIZE, h: STAR_SIZE },
      cornerRadius: STAR_SIZE / 2, // circular
      refractionHeight: 6 * DP,
      refractionAmount: -12 * DP,
      depthEffect: false,
      chromaticAberration: false,
      blurRadius: 2 * DP,
      saturation: 1.5,
      brightness: 0,
      contrast: 1,
      tintColor: [0, 0, 0, 0],
      surfaceColor: isFilled ? [0xFF/255, 0xCC/255, 0x00/255, 0.15] : [0.5, 0.5, 0.5, 0.1],
      highlight: DEFAULT_HIGHLIGHT,
      outerShadow: { radius: 8 * DP, alpha: 0.15, offsetX: 0, offsetY: 2 * DP, color: [0, 0, 0] },
      label: '',
      labelColor: [1, 1, 1, 1],
      showChevron: false,
      isInteractive: true,
      icon: {
        path: STAR_PATH,
        size: STAR_SIZE * 0.7,
        color: iconColor,
        viewport: STAR_VIEWPORT,
        layoutSize: STAR_SIZE,
      },
    }
    elements.push(starEl)

    // Interaction: tap to set rating
    interactions[starId] = {
      onTap: () => {
        const newVal = state.ratingValue === i + 1 ? 0 : i + 1
        setState({ ratingValue: newVal })
      },
      onDragStart: () => {},
      onDrag: () => {},
      onDragEnd: () => {},
    }
  }

  const contentHeight = Math.max(H, starY + STAR_SIZE + 20 * DP)
  return { elements, interactions, contentHeight }
}
