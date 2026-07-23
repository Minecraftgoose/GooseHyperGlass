// Native custom-element wrapper around the REAL wong2 liquid-glass-webgl
// renderer + catalog. Faithful port of:
//   - src/components/liquid-glass/context.tsx  (LiquidGlassCanvas gesture system)
//   - src/app/page.tsx                          (buildCatalog wiring / state)
// No React ships — `react` is aliased to an empty stub at build time.
//
// Usage:
//   <script src="liquid-glass.js"></script>
//   <liquid-glass mode="bottom-tabs"></liquid-glass>
//   <liquid-glass mode="toggle" dark></liquid-glass>
//
// mode values (kebab): buttons, toggle, slider, bottom-tabs, dialog,
//   magnifier, scroll-container, lazy-scroll-container
//
// Assets are NEVER bundled. `wallpaper` = image URL (default: a generated
// gradient, file:// safe). `clock-sdf` = optional URL for SDF clock texture.
import { LiquidGlassRenderer } from '../liquid-glass-webgl-main/src/components/liquid-glass/renderer'
import {
  buildCatalog,
  CatalogDestination,
  DEFAULT_CATALOG_STATE,
  draggingGroups,
} from '../liquid-glass-webgl-main/src/components/liquid-glass/catalog'

type AnyEl = any
type Interact = {
  onTap?: (pos: { x: number; y: number }) => void
  onDragStart?: (pos: { x: number; y: number }) => void
  onDrag?: (pos: { x: number; y: number }, delta: { x: number; y: number }) => void
  onDragEnd?: (pos: { x: number; y: number }, vel: { x: number; y: number }) => void
  onTransform?: (pan: { x: number; y: number }, zoom: number, rot: number) => void
}

const MODE_MAP: Record<string, CatalogDestination> = {
  buttons: CatalogDestination.Buttons,
  toggle: CatalogDestination.Toggle,
  slider: CatalogDestination.Slider,
  'single-slider': CatalogDestination.SingleSlider,
  'single-toggle': CatalogDestination.SingleToggle,
  'bottom-tabs': CatalogDestination.BottomTabs,
  'single-bottom-tabs': CatalogDestination.SingleBottomTabs,
  'toggle-card': CatalogDestination.ToggleCard,
  'slider-card': CatalogDestination.SliderCard,
  'bottom-tabs-2': CatalogDestination.BottomTabs2,
  dialog: CatalogDestination.Dialog,
  magnifier: CatalogDestination.Magnifier,
  'scroll-container': CatalogDestination.ScrollContainer,
  'lazy-scroll-container': CatalogDestination.LazyScrollContainer,
}

// Reverse map: CatalogDestination enum value -> mode name (for lg-navigate event).
const ENUM_TO_MODE: Record<number, string> = Object.fromEntries(
  Object.entries(MODE_MAP).map(([k, v]) => [v as number, k])
)

function genGradient(isLight: boolean, w: number, h: number): string {
  const c = document.createElement('canvas')
  c.width = Math.max(2, w | 0)
  c.height = Math.max(2, h | 0)
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, c.width, c.height)
  if (isLight) {
    g.addColorStop(0, '#3f6fd6')
    g.addColorStop(0.45, '#7b5cff')
    g.addColorStop(1, '#c44ad6')
  } else {
    g.addColorStop(0, '#0a1230')
    g.addColorStop(0.5, '#141a3a')
    g.addColorStop(1, '#2a1240')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)
  return c.toDataURL()
}

type GestureState = {
  pressedId: string | null
  startX: number
  startY: number
  startClientY: number
  startScrollY: number
  dragStarted: boolean
  mode: 'pending' | 'drag' | 'scroll' | 'transform' | 'none'
  hasDrag: boolean
  velocitySamples: { t: number; x: number; y: number }[]
  x: number
  y: number
  transformPartner: number | null
}

class LiquidGlass extends HTMLElement {
  private _canvas!: HTMLCanvasElement
  private _renderer: AnyEl = null
  private _state: AnyEl
  private _elements: AnyEl[] = []
  private _interactions: Record<string, Interact> = {}
  private _gestures = new Map<number, GestureState>()
  private _prevPinch: AnyEl = null
  private _w = 0
  private _h = 0
  private _dark = false
  private _ro: ResizeObserver | null = null
  private _disposed = false
  private _gradientLoaded = false
  private _onWheel!: (e: WheelEvent) => void
  private _dbg: any = null
  private _tabsConfig: AnyEl = null
  private _buttonsConfig: AnyEl = null
  private _dialogConfig: AnyEl = null
  private _scrollConfig: AnyEl = null
  private _prevMode: string = 'bottom-tabs' // 进入 dialog 前的视图，点弹窗按钮后回退用

  constructor() {
    super()
    this._state = { ...DEFAULT_CATALOG_STATE }
    const shadow = this.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent =
      ':host{position:relative;display:block;overflow:hidden;}' +
      'canvas{display:block;width:100%;height:100%;touch-action:none;cursor:pointer;}'
    this._canvas = document.createElement('canvas')
    shadow.appendChild(style)
    shadow.appendChild(this._canvas)
  }

  static get observedAttributes() {
    return ['mode', 'dark', 'wallpaper', 'clock-sdf', 'dpr', 'corner-style', 'blur-tap-cap', 'overlay-buttons', 'theme-button', 'tabs', 'buttons', 'dialog', 'scroll']
  }

  connectedCallback() {
    if (this._renderer) return
    this._dark = this.hasAttribute('dark')
    const overlayButtons = this.hasAttribute('overlay-buttons')
    this._showThemeButton = this.hasAttribute('theme-button')
    this._state = { ...DEFAULT_CATALOG_STATE, hideOverlayButtons: !overlayButtons }

    const renderer = new LiquidGlassRenderer(this._canvas)
    this._renderer = renderer

    const dprAttr = this.getAttribute('dpr')
    if (dprAttr != null) {
      const dv = parseFloat(dprAttr)
      const deviceDpr = window.devicePixelRatio || 1
      renderer.dpr = dv > 0 ? Math.max(0.5, Math.min(deviceDpr, dv)) : deviceDpr
    }
    const tapCap = this.getAttribute('blur-tap-cap')
    if (tapCap != null) renderer.blurTapCap = Math.max(1, Math.min(33, parseInt(tapCap) || 17))
    const corner = this.getAttribute('corner-style')
    if (corner != null) renderer.cornerStyle = parseFloat(corner)

    const mode = this._mode()
    renderer.setBackgroundColor(mode === CatalogDestination.Home ? [0, 0, 0] : null)

    const wp = this.getAttribute('wallpaper')
    if (wp && wp !== 'gradient') {
      renderer.loadWallpaper(wp).catch((e: any) => console.warn('[liquid-glass] wallpaper load failed:', e))
    }
    const sdf = this.getAttribute('clock-sdf')
    if (sdf) renderer.loadSdfTexture(sdf).catch((e: any) => console.warn('[liquid-glass] sdf load failed:', e))

    const ro = new ResizeObserver(() => this._resize())
    ro.observe(this)
    this._ro = ro

    this._onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX
      renderer.setScrollY(renderer.getScrollY() + delta)
    }
    this._canvas.addEventListener('wheel', this._onWheel, { passive: false })
    this._canvas.addEventListener('pointerdown', this._onDown)

    this._resize()
    this._emitState()
  }

  disconnectedCallback() {
    this._disposed = true
    if (this._ro) this._ro.disconnect()
    if (this._canvas) {
      this._canvas.removeEventListener('wheel', this._onWheel)
      this._canvas.removeEventListener('pointerdown', this._onDown)
      this._canvas.removeEventListener('pointermove', this._onMove)
      this._canvas.removeEventListener('pointerup', this._onUp)
      this._canvas.removeEventListener('pointerleave', this._onUp)
      this._canvas.removeEventListener('pointercancel', this._onUp)
    }
    if (this._renderer) {
      this._renderer.dispose()
      this._renderer = null
    }
  }

  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    if (!this._renderer) return
    const r = this._renderer
    if (name === 'mode') {
      const oldM = (_old || 'bottom-tabs').toLowerCase()
      if (oldM !== 'dialog') this._prevMode = oldM
      r.setScrollY(0)
      this._rebuild()
    } else if (name === 'dark') {
      this._dark = this.hasAttribute('dark')
      r.setBackgroundColor(this._mode() === CatalogDestination.Home ? [0, 0, 0] : null)
      this._gradientLoaded = false
      this._maybeLoadGradient()
      this._rebuild()
      this._emitState()
    } else if (name === 'wallpaper') {
      this._gradientLoaded = false
      if (val && val !== 'gradient') r.loadWallpaper(val).catch(() => {})
      else this._maybeLoadGradient()
    } else if (name === 'clock-sdf') {
      if (val) r.loadSdfTexture(val).catch(() => {})
    } else if (name === 'dpr') {
      const dv = parseFloat(val || '0')
      const deviceDpr = window.devicePixelRatio || 1
      r.dpr = dv > 0 ? Math.max(0.5, Math.min(deviceDpr, dv)) : deviceDpr
      this._resize()
    } else if (name === 'corner-style') {
      if (val != null) {
        r.cornerStyle = parseFloat(val)
        r.requestRender()
      }
    } else if (name === 'blur-tap-cap') {
      if (val != null) {
        r.blurTapCap = Math.max(1, Math.min(33, parseInt(val) || 17))
        r.requestRender()
      }
    } else if (name === 'overlay-buttons') {
      this._state = { ...this._state, hideOverlayButtons: !this.hasAttribute('overlay-buttons') }
      this._rebuild()
      this._emitState()
    } else if (name === 'theme-button') {
      this._showThemeButton = this.hasAttribute('theme-button')
      this._rebuild()
      this._emitState()
    } else if (name === 'tabs') {
      if (val) {
        try { this._tabsConfig = JSON.parse(val) } catch { this._tabsConfig = null }
      } else {
        this._tabsConfig = null
      }
      this._rebuild()
    } else if (name === 'buttons') {
      if (val) {
        try { this._buttonsConfig = JSON.parse(val) } catch { this._buttonsConfig = null }
      } else {
        this._buttonsConfig = null
      }
      this._rebuild()
    } else if (name === 'dialog') {
      if (val) {
        try { this._dialogConfig = JSON.parse(val) } catch { this._dialogConfig = null }
      } else {
        this._dialogConfig = null
      }
      this._rebuild()
    } else if (name === 'scroll') {
      if (val) {
        try { this._scrollConfig = JSON.parse(val) } catch { this._scrollConfig = null }
      } else {
        this._scrollConfig = null
      }
      this._rebuild()
    }
  }

  private _mode(): CatalogDestination {
    const m = (this.getAttribute('mode') || 'bottom-tabs').toLowerCase()
    return MODE_MAP[m] ?? CatalogDestination.BottomTabs
  }

  private _maybeLoadGradient() {
    const wp = this.getAttribute('wallpaper')
    if (this._w <= 0 || this._gradientLoaded) return
    // 显式 wallpaper="gradient" → 生成渐变
    if (wp === 'gradient') {
      this._gradientLoaded = true
      this._renderer?.loadWallpaper(genGradient(!this._dark, this._w, this._h)).catch(() => {})
    } else if (!wp) {
      // 不传 wallpaper → 默认透明
      this._gradientLoaded = true
      const tc = document.createElement('canvas')
      tc.width = Math.max(2, this._w | 0)
      tc.height = Math.max(2, this._h | 0)
      this._renderer?.loadWallpaper(tc.toDataURL()).catch(() => {})
    }
  }

  private _resize() {
    const r = this.getBoundingClientRect()
    if (!r.width || !r.height) return
    this._w = r.width
    this._h = r.height
    this._canvas.style.width = r.width + 'px'
    this._canvas.style.height = r.height + 'px'
    this._renderer?.resize(r.width, r.height)
    this._maybeLoadGradient()
    this._rebuild()
  }

  private _emitState() {
    this.dispatchEvent(
      new CustomEvent('lg-statechange', {
        detail: { ...this._state, dark: this._dark },
        bubbles: true,
      })
    )
  }

  private _setState(patch: AnyEl) {
    const next = typeof patch === 'function' ? patch(this._state) : patch
    this._state = { ...this._state, ...next }
    this._emitState()
    this._rebuild()
  }

  private _onNavigate = (d: CatalogDestination) => {
    const name = ENUM_TO_MODE[d] ?? ('dest:' + d)
    this.dispatchEvent(new CustomEvent('lg-navigate', { detail: { dest: d, name }, bubbles: true }))
  }
  private _onBack = () => {
    this.dispatchEvent(new CustomEvent('lg-back', { bubbles: true }))
  }
  private _onButtonTap = (id: string) => {
    this.dispatchEvent(new CustomEvent('lg-buttontap', { detail: { id }, bubbles: true }))
  }
  private _onDialogTap = (action: string) => {
    this.dispatchEvent(new CustomEvent('lg-dialogtap', { detail: { action }, bubbles: true }))
    // 组件层自动关闭弹窗：切回进入 dialog 前的视图（无记录则回退底部标签栏）。
    // 在派发 lg-back 前先切走 mode，使 demo 端 "mode===dialog 才回退" 的兜底不会重复切换。
    this.setAttribute('mode', this._prevMode || 'bottom-tabs')
    this._onBack()
  }
  private _onLinkTap = (index: number, href?: string) => {
    this.dispatchEvent(new CustomEvent('lg-linktap', { detail: { index, href }, bubbles: true }))
  }
  /** 配置底部标签栏内容：[[{icon,label}...],[{icon,label}...]]（两组，可只传一组）。icon 为 SVG path 字符串。 */
  setTabs(config: AnyEl) {
    this._tabsConfig = config
    this._rebuild()
  }
  /** 配置按钮组：[{id?, label?, style?}]，每个按钮独立（文字 + 样式）。style: 'transparent'|'surface'|'blue'|'orange' 或自定义 rgba 色。 */
  setButtons(config: AnyEl) {
    this._buttonsConfig = config
    this._rebuild()
  }
  /** 配置弹窗内容：{ title?, body?, cancelText?, okayText? }。不传则回退原版默认文案。 */
  setDialog(config: AnyEl) {
    this._dialogConfig = config
    this._rebuild()
  }
  /** 配置滚动容器列表项：[{ title, subtitle? }]。不传则回退原版空卡片。 */
  setScroll(config: AnyEl) {
    this._scrollConfig = config
    this._rebuild()
  }
  private _onToggleTheme = () => {
    this._dark = !this._dark
    this._renderer?.setBackgroundColor(this._mode() === CatalogDestination.Home ? [0, 0, 0] : null)
    this._gradientLoaded = false
    this._maybeLoadGradient()
    this._emitState()
    this._rebuild()
  }

  private _rebuild() {
    if (!this._renderer || this._disposed) return
    const W = this._w
    const H = this._h
    if (!W || !H) return
    const dest = this._mode()
    const result = buildCatalog(
      dest,
      W,
      H,
      this._state,
      (p: AnyEl) => this._setState(p),
      this._onNavigate,
      this._onBack,
      this._renderer ? { current: this._renderer } : undefined,
      !this._dark,
      this.hasAttribute('overlay-buttons') || this.hasAttribute('theme-button') ? this._onToggleTheme : undefined,
      undefined,
      this._onButtonTap,
      this._tabsConfig,
      this._buttonsConfig,
      this._dialogConfig,
      this._onDialogTap,
      this._scrollConfig,
      this._onLinkTap
    )
    this._elements = result.elements
    this._interactions = result.interactions
    this._renderer.setElements(this._elements)
    this._renderer.setContentHeight(result.contentHeight)
    this._renderer.requestRender()
    this._syncTargets()
  }

  // Faithful port of context.tsx's toggleTargets/tabTargets useEffect sync.
  private _syncTargets() {
    const r = this._renderer
    if (!r) return
    const sync = (id: string, fn: () => void) => {
      if (draggingGroups.has(id)) return
      try {
        fn()
      } catch {
        /* group not present in this mode */
      }
    }
    sync('toggle1', () => r.setToggleTarget('toggle1', this._state.toggleOn ? 1 : 0))
    sync('toggle2', () => r.setToggleTarget('toggle2', this._state.toggleOn ? 1 : 0))
    sync('tabs3', () => r.setTabSelected('tabs3', this._state.selectedTab, (this._tabsConfig?.[0]?.length ?? 3)))
    sync('tabs4', () => r.setTabSelected('tabs4', this._state.selectedTab2, (this._tabsConfig?.[1]?.length ?? 4)))
    sync('slider1', () => r.setToggleTarget('slider1', this._state.sliderValue / 100))
    sync('slider2', () => r.setToggleTarget('slider2', this._state.sliderValue / 100))
  }

  // ---- pointer gesture system (faithful port of context.tsx) ----
  private _localPos(e: PointerEvent) {
    const rect = this._canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private _computeReleaseVelocity(samples: { t: number; x: number; y: number }[]): number {
    if (samples.length < 2) return 0
    const now = samples[samples.length - 1].t
    const cutoff = now - 100
    let oldest = samples[samples.length - 1]
    for (let i = samples.length - 1; i >= 0; i--) {
      if (samples[i].t < cutoff) break
      oldest = samples[i]
    }
    const dt = (now - oldest.t) / 1000
    if (dt < 0.001) return 0
    const dy = samples[samples.length - 1].y - oldest.y
    return -dy / dt
  }

  private _computeReleaseVelocity2D(samples: { t: number; x: number; y: number }[]) {
    if (samples.length < 2) return { x: 0, y: 0 }
    const last = samples[samples.length - 1]
    const now = last.t
    const cutoff = now - 100
    let oldest = last
    for (let i = samples.length - 1; i >= 0; i--) {
      if (samples[i].t < cutoff) break
      oldest = samples[i]
    }
    const dt = (now - oldest.t) / 1000
    if (dt < 0.001) return { x: 0, y: 0 }
    return { x: (last.x - oldest.x) / dt, y: (last.y - oldest.y) / dt }
  }

  private _onDown = (e: PointerEvent) => {
    const renderer = this._renderer
    if (!renderer) return
    const { x, y } = this._localPos(e)
    const scrollY = renderer.getScrollY()
    const els = this._elements
    const interactions = this._interactions

    let hit: AnyEl = null
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i]
      const hr = el.hitRect ?? el.rect
      const visibleHY = el.scroll ? hr.y - scrollY : hr.y
      let testX = x
      let testY = y
      const elRot = (el as AnyEl).elementRotation
      if (elRot && Math.abs(elRot) > 0.001) {
        const cx = hr.x + hr.w * 0.5
        const cy = (el.scroll ? hr.y - scrollY : hr.y) + hr.h * 0.5
        const dx = x - cx
        const dy = y - cy
        const cos = Math.cos(-elRot)
        const sin = Math.sin(-elRot)
        testX = cx + dx * cos - dy * sin
        testY = cy + dx * sin + dy * cos
      }
      if (testX >= hr.x && testX <= hr.x + hr.w && testY >= visibleHY && testY <= visibleHY + hr.h) {
        const hasInteraction = !!interactions?.[el.id]
        if (!hasInteraction && !el.isInteractive) continue
        hit = el
        break
      }
    }

    if (hit) {
      const hitId = hit.id
      const existingEntry = Array.from(this._gestures.entries()).find(
        ([, g]) => g.pressedId === hitId && g.mode !== 'transform'
      )
      if (existingEntry && interactions?.[hitId]?.onTransform) {
        const [partnerPid, partnerGs] = existingEntry
        if (hit.isInteractive && (hit.kind === 'button' || hit.kind === 'text')) {
          renderer.setPressed(hitId, false)
        }
        const p1 = { x: partnerGs.x, y: partnerGs.y }
        const p2 = { x, y }
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        this._prevPinch = {
          dist: Math.hypot(dx, dy),
          angle: Math.atan2(dy, dx),
          cx: (p1.x + p2.x) / 2,
          cy: (p1.y + p2.y) / 2,
        }
        partnerGs.mode = 'transform'
        partnerGs.transformPartner = e.pointerId
        this._gestures.set(e.pointerId, {
          pressedId: hitId,
          startX: x,
          startY: y,
          startClientY: e.clientY,
          startScrollY: renderer.getScrollY(),
          dragStarted: false,
          mode: 'transform',
          hasDrag: !!interactions?.[hitId]?.onDrag,
          velocitySamples: [{ t: performance.now(), x: e.clientX, y: e.clientY }],
          x,
          y,
          transformPartner: partnerPid,
        })
        try {
          this._canvas.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        return
      }
    }

    const hasDrag = !!(hit && interactions?.[hit.id]?.onDrag)
    if (!this._dbg) this._dbg = {}
    if (!this._dbg.downOnce) {
      this._dbg.downOnce = true
      console.log('[lg-debug] down hitId=', hit?.id, 'hasDrag=', hasDrag)
    }
    this._gestures.set(e.pointerId, {
      pressedId: hit ? hit.id : null,
      startX: x,
      startY: y,
      startClientY: e.clientY,
      startScrollY: renderer.getScrollY(),
      dragStarted: false,
      mode: 'pending',
      hasDrag,
      velocitySamples: [{ t: performance.now(), x: e.clientX, y: e.clientY }],
      x,
      y,
      transformPartner: null,
    })

    if (hit && hit.isInteractive) {
      const hasDrag0 = !!interactions?.[hit.id]?.onDrag
      if (
        hit.kind === 'button' ||
        hit.kind === 'text' ||
        (hit.kind === 'glass-shape' && !hasDrag0 && !!interactions?.[hit.id]?.onTap)
      ) {
        renderer.setPressed(hit.id, true, { x, y })
      }
    }
      try {
        this._canvas.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      // 拖动鲁棒性: 同时挂 window 级 move/up, 即使 capture 失效或指针移出 canvas
      // 也能继续收到移动事件, 避免 pointerleave 提前结束手势(表现为"只能点不能拖")。
      window.addEventListener('pointermove', this._onMove)
      window.addEventListener('pointerup', this._onUp)
      window.addEventListener('pointercancel', this._onUp)
    }

  private _onMove = (e: PointerEvent) => {
    const renderer = this._renderer
    if (!renderer) return
    const { x, y } = this._localPos(e)
    const gs = this._gestures.get(e.pointerId)
    if (!gs) return
    gs.x = x
    gs.y = y

    if (gs.mode === 'transform') {
      const partnerPid = gs.transformPartner
      if (partnerPid == null) return
      const partner = this._gestures.get(partnerPid)
      if (!partner) return
      const id = gs.pressedId
      if (!id) return
      const dx = partner.x - gs.x
      const dy = partner.y - gs.y
      const dist = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)
      const cx = (gs.x + partner.x) / 2
      const cy = (gs.y + partner.y) / 2
      const prev = this._prevPinch
      if (prev && prev.dist > 0.001) {
        const gestureZoom = dist / prev.dist
        let gestureRotate = angle - prev.angle
        if (gestureRotate > Math.PI) gestureRotate -= 2 * Math.PI
        if (gestureRotate < -Math.PI) gestureRotate += 2 * Math.PI
        const pan = { x: cx - prev.cx, y: cy - prev.cy }
        this._interactions?.[id]?.onTransform?.(pan, gestureZoom, gestureRotate)
      }
      this._prevPinch = { dist, angle, cx, cy }
      return
    }

    gs.velocitySamples.push({ t: performance.now(), x: e.clientX, y: e.clientY })
    if (gs.velocitySamples.length > 20) gs.velocitySamples.shift()

    const dx = x - gs.startX
    const dy = y - gs.startY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (gs.mode === 'pending') {
      const MOVE_THRESHOLD = 4
      const id0 = gs.pressedId
      if (id0) {
        const el0 = this._elements.find((b: AnyEl) => b.id === id0)
        if (el0?.kind === 'button' && el0.isInteractive) {
          renderer.setDragPosition(id0, { x, y })
        }
      }
      if (absDx < MOVE_THRESHOLD && absDy < MOVE_THRESHOLD) return

      const id = gs.pressedId
      const hitEl = id ? this._elements.find((b: AnyEl) => b.id === id) : null
      const isButton = hitEl?.kind === 'button' && hitEl?.isInteractive
      const hasDrag = !!hitEl && !!this._interactions?.[id!]?.onDrag
    if (hasDrag && !(this._dbg?.dragOnce)) {
      this._dbg = this._dbg || {}
      this._dbg.dragOnce = true
      console.log('[lg-debug] pending→drag id=', id, 'onDragType=', typeof this._interactions?.[id!]?.onDrag)
    }
      const isShapeButton =
        !hasDrag && hitEl?.kind === 'glass-shape' && hitEl?.isInteractive && !!this._interactions?.[id!]?.onTap

      if (hasDrag) {
        gs.mode = 'drag'
        gs.dragStarted = true
        this._interactions?.[id!]?.onDragStart?.({ x, y })
      } else if (isButton || isShapeButton) {
        renderer.setDragPosition(id!, { x, y })
      } else {
        const SCROLL_TAKEOVER_THRESHOLD = 14
        const verticalDominant = absDy > absDx + 2 && absDy >= SCROLL_TAKEOVER_THRESHOLD
        if (verticalDominant) {
          const otherScrolling = Array.from(this._gestures.entries()).some(
            ([pid, g]) => pid !== e.pointerId && g.mode === 'scroll'
          )
          if (otherScrolling) return
          if (id) {
            const el = this._elements.find((b: AnyEl) => b.id === id)
            if (el?.isInteractive && el.kind === 'text') renderer.setPressed(id, false)
          }
          gs.mode = 'scroll'
          const scrollDelta = e.clientY - gs.startClientY
          renderer.setScrollY(gs.startScrollY - scrollDelta)
          return
        }
      }
    }

    if (gs.mode === 'scroll') {
      const scrollDelta = e.clientY - gs.startClientY
      renderer.setScrollY(gs.startScrollY - scrollDelta)
      return
    }

    if (gs.mode === 'drag') {
      const id = gs.pressedId
      if (!id) return
      const el = this._elements.find((b: AnyEl) => b.id === id)
      if (!el) return
      if (el.kind === 'button' && el.isInteractive) renderer.setDragPosition(id, { x, y })
      this._interactions?.[id]?.onDrag?.({ x, y }, { x: dx, y: dy })
    }
  }

  private _onUp = (e: PointerEvent) => {
    const renderer = this._renderer
    const gs = this._gestures.get(e.pointerId)
    if (!gs) {
      window.removeEventListener('pointermove', this._onMove)
      window.removeEventListener('pointerup', this._onUp)
      window.removeEventListener('pointercancel', this._onUp)
      if (this._canvas.hasPointerCapture(e.pointerId)) {
        try {
          this._canvas.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      return
    }
    const mode = gs.mode
    const id = gs.pressedId

    if (mode === 'transform') {
      const partnerPid = gs.transformPartner
      this._gestures.delete(e.pointerId)
      this._prevPinch = null
      if (partnerPid != null) {
        const partner = this._gestures.get(partnerPid)
        if (partner) {
          partner.transformPartner = null
          partner.mode = 'drag'
          partner.dragStarted = true
          partner.startX = partner.x
          partner.startY = partner.y
          if (partner.pressedId) {
            this._interactions?.[partner.pressedId]?.onDragStart?.({ x: partner.x, y: partner.y })
          }
        }
      }
      if (this._canvas.hasPointerCapture(e.pointerId)) {
        try {
          this._canvas.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      return
    }

    if (renderer) {
      if (id) {
        const el = this._elements.find((b: AnyEl) => b.id === id)
        if (el?.isInteractive) {
          const hasDrag1 = !!this._interactions?.[id]?.onDrag
          if (
            el.kind === 'button' ||
            el.kind === 'text' ||
            (el.kind === 'glass-shape' && !hasDrag1 && !!this._interactions?.[id]?.onTap)
          ) {
            renderer.setPressed(id, false)
          }
        }
      }
      if (mode === 'scroll') {
        const v = this._computeReleaseVelocity(gs.velocitySamples)
        if (Math.abs(v) > 50) renderer.setScrollVelocity(v)
      }
      if (id) {
        const { x, y } = this._localPos(e)
        if (gs.dragStarted) {
          const { x: vx, y: vy } = this._computeReleaseVelocity2D(gs.velocitySamples)
          this._interactions?.[id]?.onDragEnd?.({ x, y }, { x: vx, y: vy })
        } else if (mode === 'pending' || mode === 'drag') {
          this._interactions?.[id]?.onTap?.({ x, y })
        }
      }
    }
    window.removeEventListener('pointermove', this._onMove)
    window.removeEventListener('pointerup', this._onUp)
    window.removeEventListener('pointercancel', this._onUp)
    this._gestures.delete(e.pointerId)
    if (this._canvas.hasPointerCapture(e.pointerId)) {
      try {
        this._canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
  }
}

customElements.define('liquid-glass', LiquidGlass)
