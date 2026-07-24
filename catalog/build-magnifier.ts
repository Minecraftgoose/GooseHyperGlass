import type { GooseInteract } from '../context'
import type { GooseElement } from '../renderer'
import { gooseHL, gooseShadow, gooseDP, gooseFont, gooseLight, gooseLorem, gooseTextW, type GooseResult, type GooseState, type GoosePalette } from './types'
import { gooseCenter, gooseBack, gooseGlass, gooseRect, gooseText } from './helpers'

// Magnifier drag-start offset (survives re-renders)
const magDragStart: { x: number; y: number } = { x: 0, y: 0 }

/** Measure the wrapped height of `text` at `fontPx` within `maxW`.
 *  Uses the same greedy word-wrap as the rasterizer (gl-utils.ts wrapText). */
function measureWrappedHeight(text: string, fontPx: number, maxW: number): number {
  const lineH = fontPx * 1.35
  const words = text.split(/\s+/)
  let cur = ''
  let lines = 0
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word
    if (gooseTextW(test, fontPx) <= maxW || !cur) {
      cur = test
    } else {
      lines++
      cur = word
    }
  }
  if (cur) lines++
  return lines * lineH
}

/* ------------------------------------------------------------------ *
 * MAGNIFIER — faithful to MagnifierContent.kt
 *
 * Layout: text block (LoremIpsum) on a white card + a draggable
 * magnifier glass (128×96 capsule) that refracts the content below.
 * The magnifier follows a drag offset.
 * ------------------------------------------------------------------ */
export function buildMagnifier(W: number, H: number, onBack: () => void, state: GooseState, setState: (patch: Partial<GooseState> | ((prev: GooseState) => Partial<GooseState>)) => void, palette: GoosePalette = gooseLight): GooseResult {
  const elements: GooseElement[] = []
  const interactions: Record<string, GooseInteract> = {}

  const back = gooseBack(onBack, palette)
  elements.push(back.element)
  interactions[back.element.id] = back.interaction

  // Faithful to MagnifierContent.kt:
  //   contentColor = if (isLightTheme) Color.Black else Color.White
  //   accentColor  = if (isLightTheme) Color(0xFF0088FF) else Color(0xFF0091FF)
  //   backgroundColor = if (isLightTheme) Color(0xFFFFFFFF) else Color(0xFF121212)
  //   Card uses backgroundColor.copy(alpha = 0.9f).

  // Card with text — theme-aware background.
  // Faithful to MagnifierContent.kt: the card is auto-sized to the text
  // content with two 24dp paddings (outer clip + inner text). We measure
  // the wrapped text height to size the card correctly.
  const cardX = 24 * gooseDP
  const cardY = 0 // gooseCenter shifts this
  const cardW = W - 2 * cardX
  const cardRadius = 32 * gooseDP
  const innerPad = 24 * gooseDP
  const textW = cardW - 2 * innerPad
  const fontPx = 16
  const textH = measureWrappedHeight(gooseLorem, fontPx, textW)
  const cardH = textH + 2 * innerPad
  elements.push(gooseRect('mag-card', { x: cardX, y: cardY, w: cardW, h: cardH }, palette.magnifierCardBg, cardRadius))
  elements.push(
    gooseText(
      'mag-text',
      { x: cardX + innerPad, y: cardY + innerPad, w: textW, h: textH },
      gooseLorem,
      {
        color: palette.magnifierContentColor,
        fontSizePx: fontPx,
        fontWeight: 400,
        align: 'left',
        wrap: true,
        paddingPx: 0,
        halo: 'none', // card is solid; no halo needed
      }
    )
  )

  // Cursor (small accent capsule) — accent color flips with theme.
  // Positioned lower on the card so the drag/sampling area sits near the
  // bottom text lines (faithful to the original layout where the cursor
  // follows the text content below the card's vertical center).
  const cursorBaseX = W / 2 - 2
  const cursorBaseY = cardY + cardH / 2 - 12 * gooseDP
  const cursorX = cursorBaseX + state.magnifierX
  const cursorY = cursorBaseY + state.magnifierY
  const cursorEl = gooseRect('mag-cursor', { x: cursorX, y: cursorY, w: 4 * gooseDP, h: 24 * gooseDP }, palette.magnifierAccent, 2 * gooseDP)
  // Larger hit area for easy dragging (48×48dp touch target)
  cursorEl.hitRect = { x: cursorX - 22 * gooseDP, y: cursorY - 12 * gooseDP, w: 48 * gooseDP, h: 48 * gooseDP }
  elements.push(cursorEl)

  // Magnifier glass (128×96 capsule, sits 80dp above the cursor)
  // Faithful to MagnifierContent.kt: the glass refracts the content at the
  // cursor position with 1.5x zoom. onDrawBackdrop does scale(1.5) + translate(-80dp).
  const magW = 128 * gooseDP
  const magH = 96 * gooseDP
  const magX = cursorX + 2 - magW / 2
  const magY = cursorY + 12 - 80 * gooseDP - magH / 2
  const magGlass = gooseGlass(
    'mag-glass',
    { x: magX, y: magY, w: magW, h: magH },
    {
      cornerRadius: magH / 2,
      refractionHeight: 8 * gooseDP,
      refractionAmount: -24 * gooseDP,
      blurRadius: 0,
      saturation: 1.0,
      surfaceColor: [0, 0, 0, 0],
      // Faithful to MagnifierContent.kt: drawBackdrop uses default highlight
      // (Highlight.Default, alpha=1) and default shadow (Shadow.Default).
      highlight: { ...gooseHL },
      outerShadow: { ...gooseShadow },
      // Faithful to InnerShadow(radius = 16f.dp) — defaults: offset=(0,radius),
      // color=Black(0.15), alpha=1.
      innerShadow: { radius: 16 * gooseDP, alpha: 0.15, offsetX: 0, offsetY: 16 * gooseDP },
      depthEffect: true,
      chromaticAberration: true,
    }
  )
  magGlass.isMagnifier = { zoom: 1.5, sampleOffsetY: 80 * gooseDP }
  elements.push(magGlass)

  // Drag interaction — bound to BOTH the cursor and the glass (either can be
  // dragged). Faithful to MagnifierContent.kt: draggable2D is on the cursor Box.
  const magDragHandler: GooseInteract = {
    onDragStart: () => {
      magDragStart.x = state.magnifierX
      magDragStart.y = state.magnifierY
    },
    onDrag: (_pos, delta) => {
      setState({
        magnifierX: magDragStart.x + delta.x,
        magnifierY: magDragStart.y + delta.y,
      })
    },
    onDragEnd: () => {},
  }
  interactions['mag-glass'] = magDragHandler
  interactions['mag-cursor'] = magDragHandler

  const contentHeight = cardH
  const finalHeight = gooseCenter(elements, 0, contentHeight, H)
  return { elements, interactions, contentHeight: finalHeight }
}
