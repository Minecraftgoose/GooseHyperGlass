import type { GooseInteract } from '../context'
import type { GooseElement } from '../renderer'
import { gooseHL, gooseDP, gooseLight, type GooseResult, type GoosePalette } from './types'
import { gooseBack, gooseGlass, gooseText } from './helpers'

/* ------------------------------------------------------------------ *
 * SCROLL CONTAINER — faithful to ScrollContainerContent.kt
 *
 * Layout: 20 glass cards (160dp tall, 32dp radius) in a vertical
 * scroll, each with vibrancy + lens effects.
 * ------------------------------------------------------------------ */
export interface ScrollItem {
  title: string
  subtitle?: string
  /** 可选跳转链接：text 显示在卡片底部, href 为链接地址。点击派发 onLinkTap。 */
  link?: { text: string; href?: string }
}

export function buildScrollContainer(W: number, onBack: () => void, count: number, palette: GoosePalette = gooseLight, scrollConfig?: ScrollItem[], onLinkTap?: (itemIndex: number, href?: string) => void): GooseResult {
  const elements: GooseElement[] = []
  const interactions: Record<string, GooseInteract> = {}

  const back = gooseBack(onBack, palette)
  elements.push(back.element)
  interactions[back.element.id] = back.interaction

  const pad = 16 * gooseDP
  const spacing = 16 * gooseDP
  const cardW = W - 2 * pad
  const cardH = 160 * gooseDP
  const items = scrollConfig && scrollConfig.length > 0 ? scrollConfig : null
  const n = items ? items.length : count
  let y = 80
  for (let i = 0; i < n; i++) {
    elements.push(
      gooseGlass(
        `sc-card-${i}`,
        { x: pad, y, w: cardW, h: cardH },
        {
          cornerRadius: 32 * gooseDP,
          refractionHeight: 16 * gooseDP,
          refractionAmount: -32 * gooseDP,
          blurRadius: 0, // Original has NO blur — only vibrancy() + lens()
          saturation: 1.5,
          surfaceColor: [0, 0, 0, 0],
          highlight: { ...gooseHL },
          outerShadow: null,
        }
      )
    )
    const item = items?.[i]
    if (item) {
      // 标题（加粗）
      elements.push(
        gooseText(
          `sc-title-${i}`,
          { x: pad + 16 * gooseDP, y: y + 18 * gooseDP, w: cardW - 32 * gooseDP, h: 24 * gooseDP },
          item.title,
          {
            color: palette.homeContentColor,
            fontSizePx: 17,
            fontWeight: 600,
            align: 'left',
            valign: 'top',
            paddingPx: 0,
            scroll: true,
            halo: palette.homeTextHalo,
          }
        )
      )
      // 副标题（可选）
      if (item.subtitle) {
        elements.push(
          gooseText(
            `sc-sub-${i}`,
            { x: pad + 16 * gooseDP, y: y + 18 * gooseDP + 28 * gooseDP, w: cardW - 32 * gooseDP, h: 20 * gooseDP },
            item.subtitle,
            {
              color: palette.homeSubtitleColor,
              fontSizePx: 14,
              fontWeight: 400,
              align: 'left',
              valign: 'top',
              paddingPx: 0,
              scroll: true,
              halo: palette.homeTextHalo,
            }
          )
        )
      }
      // 跳转链接（可选）：纯文本「查看详情」式，点击派发 onLinkTap
      if (item.link && item.link.text) {
        const linkColor: [number, number, number, number] =
          palette.homeTextHalo === 'dark' ? [0.10, 0.40, 0.90, 1] : [0.36, 0.58, 1, 1]
        const linkEl = gooseText(
          `sc-link-${i}`,
          { x: pad + 16 * gooseDP, y: y + cardH - 34 * gooseDP, w: cardW - 32 * gooseDP, h: 22 * gooseDP },
          item.link.text,
          {
            color: linkColor,
            fontSizePx: 15,
            fontWeight: 600,
            align: 'left',
            valign: 'center',
            paddingPx: 0,
            scroll: true,
            halo: palette.homeTextHalo,
          }
        )
        linkEl.isInteractive = true
        elements.push(linkEl)
        if (onLinkTap) {
          interactions[`sc-link-${i}`] = { onTap: () => onLinkTap(i, item.link?.href) }
        }
      }
    }
    y += cardH + spacing
  }

  return { elements, interactions, contentHeight: y + 16 }
}
