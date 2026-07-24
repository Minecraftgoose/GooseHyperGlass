import type { LiquidGlassRenderer } from './index'

declare module './index' {
  interface LiquidGlassRenderer {
    gooseContentH(h: number): void
    gooseScrollY(y: number): void
    gooseScrollV(v: number): void
    gooseGetScrollY(): number
    gooseGetScrollV(): number
    gooseBG(color: [number, number, number] | null): void
    /** Update the gravity angle (radians) for glass highlight direction.
     *  Elements with useGravityAngle=true read this at gooseRender time. Does NOT
     *  rebuild the catalog — just triggers a gooseRender. Faithful to the original's
     *  UISensor which updates gravityAngle ~60/s via EMA smoothing. */
    gooseGravAngle(angleRad: number): void
    gooseClampScroll(y: number): number
    gooseClampY(): void
  }
}

export const scrollMethods = {
  /** Total scrollable content height in CSS px (set by the React layer). */
  gooseContentH(this: LiquidGlassRenderer, h: number) {
    this.contentHeight = h
    this.gooseClampY()
    this.gooseReqRender()
  },

  /**
   * Set the scroll offset directly (CSS px, positive = scrolled down).
   * Used during touch drag — the scroll position follows the finger with
   * no spring lag. Inertia velocity is reset to 0 (the finger is in control).
   * The value is clamped to [0, maxScroll].
   */
  gooseScrollY(this: LiquidGlassRenderer, y: number) {
    this.scrollVelocity = 0
    this.scrollY = this.gooseClampScroll(y)
    this.gooseReqRender()
  },

  /**
   * Apply an inertia impulse to the scroll (CSS px / s). Used on touch
   * release — the drag velocity becomes the initial scroll velocity,
   * then exponentially decays. The renderer's animation loop applies
   * `scrollY += scrollVelocity * dt` each frame and decays the velocity.
   * No spring rebound at edges — scrolling just stops at the boundary.
   */
  gooseScrollV(this: LiquidGlassRenderer, v: number) {
    // Clamp to a sane max to avoid absurd flicks.
    const MAX_VEL = 4000
    this.scrollVelocity = Math.max(-MAX_VEL, Math.min(MAX_VEL, v))
    this.gooseAnimStart()
  },

  /** Get current scroll offset (CSS px). */
  gooseGetScrollY(this: LiquidGlassRenderer) {
    return this.scrollY
  },

  /** Get current scroll velocity (CSS px / s, for inertia). */
  gooseGetScrollV(this: LiquidGlassRenderer) {
    return this.scrollVelocity
  },

  /** Clamp a scroll value to [0, maxScroll]. */
  gooseClampScroll(this: LiquidGlassRenderer, y: number): number {
    const max = Math.max(0, this.contentHeight - this.cssHeight)
    if (y < 0) return 0
    if (y > max) return max
    return y
  },

  /** Clamp current scrollY in place (called when content size changes). */
  gooseClampY(this: LiquidGlassRenderer) {
    this.scrollY = this.gooseClampScroll(this.scrollY)
  },

  /**
   * Set the background color override. If non-null, the renderer fills
   * the canvas with this color instead of drawing the wallpaper image.
   * Used for the Home page (black background) per the user's request.
   */
  gooseBG(
    this: LiquidGlassRenderer,
    color: [number, number, number] | null
  ) {
    this.backgroundColor = color
    this.gooseReqRender()
  },

  gooseGravAngle(
    this: LiquidGlassRenderer,
    angleRad: number
  ) {
    if (this.gravityAngle === angleRad) return
    this.gravityAngle = angleRad
    this.gooseReqRender()
  },
}
