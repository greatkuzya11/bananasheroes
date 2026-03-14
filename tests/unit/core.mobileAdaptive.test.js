import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { loadScript } from '../setup/loadScript.js'

beforeAll(() => {
  loadScript('js/core/config.js')
  loadScript('js/core/mobileAdaptive.js')
})

// After loading, BHMobileAdaptive class is on globalThis (via window.BHMobileAdaptive = ...)
const getClass = () => globalThis.BHMobileAdaptive

describe('BHMobileAdaptive — static configuration', () => {
  it('adaptiveModes contains expected modes', () => {
    const modes = getClass().adaptiveModes
    const expected = ['normal', 'survival', '67', 'mode67', 'o4ko', 'nosok', 'stepan',
      'platforms', 'lovlyu', 'poimal', 'runner', 'bonus', 'library', 'tutorial']
    expected.forEach((m) => expect(modes.has(m)).toBe(true))
  })

  it('reference returns 1920×1080', () => {
    const ref = getClass().reference
    expect(ref.w).toBe(1920)
    expect(ref.h).toBe(1080)
  })

  it('supportsMode returns true for all adaptive modes', () => {
    expect(getClass().supportsMode('normal')).toBe(true)
    expect(getClass().supportsMode('library')).toBe(true)
  })

  it('supportsMode returns false for unknown mode', () => {
    expect(getClass().supportsMode('unknownXYZ')).toBe(false)
  })
})

describe('BHMobileAdaptive — desktop (non-touch) behaviour', () => {
  // Ensure portrait / non-touch state for every test in this block
  beforeEach(() => {
    // Portrait dimensions → isLandscape = false → isLandscapeTouch() always false
    window.innerWidth = 768
    window.innerHeight = 1024
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    // matchMedia: no coarse pointer (same as global mock, but make explicit)
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  afterEach(() => {
    // Restore neutral dimensions after each desktop test
    window.innerWidth = 0
    window.innerHeight = 0
  })

  it('isLandscapeTouch() returns false on desktop (portrait, no touch)', () => {
    expect(getClass().isLandscapeTouch()).toBe(false)
  })

  it('isLandscapeTouch() returns false in portrait even when touch APIs present', () => {
    // Portrait orientation → isLandscape = false → function always returns false
    // regardless of hasCoarsePointer or hasTouch (jsdom may have ontouchstart)
    window.innerWidth = 768
    window.innerHeight = 1024
    expect(getClass().isLandscapeTouch()).toBe(false)
  })

  it('isActive(mode) returns false on desktop for any mode', () => {
    expect(getClass().isActive('normal')).toBe(false)
    expect(getClass().isActive('nosok')).toBe(false)
  })

  it('getScale() returns 1 when not active', () => {
    expect(getClass().getScale('normal')).toBe(1)
  })

  it('frameMul(dt) returns 1 when not active', () => {
    expect(getClass().frameMul(0.016, 'normal')).toBe(1)
  })

  it('speedMul() returns 1 when not active', () => {
    expect(getClass().speedMul('normal')).toBe(1)
  })

  it('size(w, h) returns original dimensions when not active', () => {
    const result = getClass().size(200, 100, 'normal')
    expect(result.w).toBe(200)
    expect(result.h).toBe(100)
  })

  it('runtime(dt) returns active=false, scale=1, frameMul=1', () => {
    const r = getClass().runtime(0.016, 'normal')
    expect(r.active).toBe(false)
    expect(r.scale).toBe(1)
    expect(r.frameMul).toBe(1)
    expect(r.speedMul).toBe(1)
  })

  it('getBalance returns all-ones profile when not active', () => {
    const b = getClass().getBalance('normal')
    expect(b.enemyFireRate).toBe(1)
    expect(b.enemyProjectileSpeed).toBe(1)
    expect(b.enemyMoveSpeed).toBe(1)
    expect(b.dropFallSpeed).toBe(1)
    expect(b.bossMoveSpeed).toBe(1)
    expect(b.homing).toBe(1)
    expect(b.targetFallSpeed).toBe(1)
  })
})

describe('BHMobileAdaptive — mobile landscape behaviour', () => {
  beforeEach(() => {
    // Simulate mobile landscape: coarse pointer + landscape orientation
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('pointer: coarse'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    window.innerWidth = 800
    window.innerHeight = 480
    // Ensure no touch APIs that would interfere
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, configurable: true })
  })

  afterEach(() => {
    // Restore desktop matchMedia mock
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
  })

  it('isLandscapeTouch() returns true on coarse-pointer landscape', () => {
    expect(getClass().isLandscapeTouch()).toBe(true)
  })

  it('isActive(normal) returns true on mobile landscape', () => {
    expect(getClass().isActive('normal')).toBe(true)
  })

  it('getScale() returns a value in [0.4, 1] on mobile landscape 800×480', () => {
    // canvas is 1920×1080, device is 800×480 → scale ≈ min(800/1920, 480/1080) ≈ 0.41
    const scale = getClass().getScale('normal')
    expect(scale).toBeGreaterThanOrEqual(0.4)
    expect(scale).toBeLessThanOrEqual(1)
  })

  it('frameMul(dt) returns dt*60 when active', () => {
    const dt = 0.016
    expect(getClass().frameMul(dt, 'normal')).toBeCloseTo(dt * 60)
  })

  it('getBalance(normal) returns reduced fire-rate on mobile', () => {
    const b = getClass().getBalance('normal')
    expect(b.enemyFireRate).toBeLessThan(1)
    expect(b.enemyProjectileSpeed).toBeLessThanOrEqual(1)
  })

  it('getBalance has all expected keys', () => {
    const b = getClass().getBalance('nosok')
    const keys = ['enemyFireRate', 'enemyProjectileSpeed', 'enemyMoveSpeed',
      'dropFallSpeed', 'bossMoveSpeed', 'homing', 'targetFallSpeed']
    keys.forEach((k) => expect(b).toHaveProperty(k))
  })

  it('getBalance uses base profile for unknown mode', () => {
    const b = getClass().getBalance('unknownXYZ')
    expect(b.enemyFireRate).toBe(1)
  })
})
