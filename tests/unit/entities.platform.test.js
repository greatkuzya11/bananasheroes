import { describe, it, expect, beforeAll } from 'vitest'
import { loadScript } from '../setup/loadScript.js'

beforeAll(() => {
  loadScript('js/entities/platform.js')
})

// ─── Constructor ──────────────────────────────────────────────────────────────
describe('Platform — constructor', () => {
  it('stores position and size correctly', () => {
    const p = new globalThis.Platform(100, 200, 300, 50)
    expect(p.x).toBe(100)
    expect(p.y).toBe(200)
    expect(p.w).toBe(300)
    expect(p.h).toBe(50)
  })

  it('saves startX and startY as the initial position', () => {
    const p = new globalThis.Platform(150, 250, 200, 30)
    expect(p.startX).toBe(150)
    expect(p.startY).toBe(250)
  })

  it('defaults: movePattern=null, solid=true, visible=true, platformType=default', () => {
    const p = new globalThis.Platform(0, 0, 100, 20)
    expect(p.movePattern).toBeNull()
    expect(p.solid).toBe(true)
    expect(p.visible).toBe(true)
    expect(p.platformType).toBe('default')
    expect(p.isGoalSensor).toBe(false)
  })

  it('respects options.solid = false', () => {
    const p = new globalThis.Platform(0, 0, 100, 20, null, 50, 200, null, true, { solid: false })
    expect(p.solid).toBe(false)
  })

  it('respects options.platformType', () => {
    const p = new globalThis.Platform(0, 0, 100, 20, null, 50, 200, null, true, { platformType: 'goalPipe' })
    expect(p.platformType).toBe('goalPipe')
  })

  it('respects options.isGoalSensor', () => {
    const p = new globalThis.Platform(0, 0, 100, 20, null, 50, 200, null, true, { isGoalSensor: true })
    expect(p.isGoalSensor).toBe(true)
  })

  it('does not create image when imageSrc is null', () => {
    const p = new globalThis.Platform(0, 0, 100, 20, null, 50, 200, null)
    expect(p.image).toBeNull()
  })

  it('creates an Image when imageSrc is provided', () => {
    const p = new globalThis.Platform(0, 0, 100, 20, null, 50, 200, 'img/test.png')
    expect(p.image).not.toBeNull()
    expect(p.image.src).toContain('img/test.png')
  })

  it('initialises prevX to the starting x', () => {
    const p = new globalThis.Platform(77, 0, 100, 20)
    expect(p.prevX).toBe(77)
  })

  it('initialises moveTimer to 0', () => {
    const p = new globalThis.Platform(0, 0, 100, 20)
    expect(p.moveTimer).toBe(0)
  })
})

// ─── update() — horizontal movement ──────────────────────────────────────────
describe('Platform.update() — horizontal movement', () => {
  it('x changes over time with horizontal pattern', () => {
    const p = new globalThis.Platform(500, 300, 200, 20, 'horizontal', 50, 100)
    const x0 = p.x
    p.update(0.1)
    // After updating moveTimer, x = startX + sin(moveTimer) * range
    // sin(0.1 * 50/100) = sin(0.05) ≈ 0.05 → x ≈ 500 + 5 ≠ 500
    expect(p.x).not.toBe(x0)
  })

  it('x follows the formula: startX + sin(moveTimer) * range', () => {
    const p = new globalThis.Platform(500, 300, 200, 20, 'horizontal', 50, 100)
    p.update(0.1)
    const expected = p.startX + Math.sin(p.moveTimer) * p.range
    expect(p.x).toBeCloseTo(expected, 10)
  })

  it('y does NOT change with horizontal pattern', () => {
    const p = new globalThis.Platform(500, 300, 200, 20, 'horizontal', 50, 100)
    p.update(0.5)
    expect(p.y).toBe(300)
  })

  it('prevX is saved before each update', () => {
    const p = new globalThis.Platform(500, 300, 200, 20, 'horizontal', 50, 100)
    p.update(0)
    // After dt=0, moveTimer still 0, sin(0)=0 → x stays at startX=500
    // prevX should have been set to old x before update
    const oldX = p.x
    p.update(0.1)
    expect(p.prevX).toBe(oldX)
  })
})

// ─── update() — vertical movement ────────────────────────────────────────────
describe('Platform.update() — vertical movement', () => {
  it('y changes over time with vertical pattern', () => {
    const p = new globalThis.Platform(300, 400, 200, 20, 'vertical', 50, 80)
    const y0 = p.y
    p.update(0.1)
    expect(p.y).not.toBe(y0)
  })

  it('y follows the formula: startY + sin(moveTimer) * range', () => {
    const p = new globalThis.Platform(300, 400, 200, 20, 'vertical', 50, 80)
    p.update(0.2)
    const expected = p.startY + Math.sin(p.moveTimer) * p.range
    expect(p.y).toBeCloseTo(expected, 10)
  })

  it('x does NOT change with vertical pattern', () => {
    const p = new globalThis.Platform(300, 400, 200, 20, 'vertical', 50, 80)
    p.update(0.5)
    expect(p.x).toBe(300)
  })
})

// ─── update() — no movement ───────────────────────────────────────────────────
describe('Platform.update() — no movement pattern', () => {
  it('x and y stay unchanged when movePattern is null', () => {
    const p = new globalThis.Platform(100, 200, 150, 30, null)
    p.update(1.0)
    expect(p.x).toBe(100)
    expect(p.y).toBe(200)
  })

  it('moveTimer stays 0 when movePattern is null', () => {
    const p = new globalThis.Platform(100, 200, 150, 30, null)
    p.update(1.0)
    expect(p.moveTimer).toBe(0)
  })
})

// ─── Oscillation is bounded ───────────────────────────────────────────────────
describe('Platform horizontal oscillation stays within range', () => {
  it('|x - startX| never exceeds range over many frames', () => {
    const range = 150
    const p = new globalThis.Platform(500, 300, 200, 20, 'horizontal', 60, range)
    // Simulate 200 frames at 60fps
    for (let i = 0; i < 200; i++) {
      p.update(1 / 60)
    }
    expect(Math.abs(p.x - p.startX)).toBeLessThanOrEqual(range + 0.001)
  })
})
