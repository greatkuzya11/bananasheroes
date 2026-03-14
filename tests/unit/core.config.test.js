import { describe, it, expect, beforeAll } from 'vitest'
import { loadScript } from '../setup/loadScript.js'

beforeAll(() => {
  loadScript('js/core/config.js')
})

describe('config.js — constants', () => {
  it('PLAYER_LIVES is 7', () => {
    expect(globalThis.PLAYER_LIVES).toBe(7)
  })

  it('PLAYER_SPEED is 7', () => {
    expect(globalThis.PLAYER_SPEED).toBe(7)
  })

  it('reference resolution is 1920×1080', () => {
    expect(globalThis.REF_WIDTH).toBe(1920)
    expect(globalThis.REF_HEIGHT).toBe(1080)
  })

  it('INVULN_TIME is 0.5', () => {
    expect(globalThis.INVULN_TIME).toBe(0.5)
  })

  it('BONUS_SHOTS_PER_BOTTLE is 3', () => {
    expect(globalThis.BONUS_SHOTS_PER_BOTTLE).toBe(3)
  })

  it('BONUS_CHANCE is 0.1', () => {
    expect(globalThis.BONUS_CHANCE).toBeCloseTo(0.1)
  })

  it('HEART_CHANCE is 0.08', () => {
    expect(globalThis.HEART_CHANCE).toBeCloseTo(0.08)
  })

  it('ENEMY_ROWS is 3 and ENEMY_COLS is 7', () => {
    expect(globalThis.ENEMY_ROWS).toBe(3)
    expect(globalThis.ENEMY_COLS).toBe(7)
  })

  it('sprite frame constants are positive integers', () => {
    expect(globalThis.FRAME_W).toBeGreaterThan(0)
    expect(globalThis.FRAME_H).toBeGreaterThan(0)
    expect(globalThis.FRAME_67_W).toBeGreaterThan(0)
    expect(globalThis.FRAME_67_H).toBeGreaterThan(0)
  })
})

describe('config.js — isMobileLandscapeGameplay()', () => {
  it('returns false on desktop (matchMedia.matches=false, no touch, landscape)', () => {
    window.innerWidth = 1920
    window.innerHeight = 1080
    // matchMedia is mocked to return matches:false in globals.js setup
    expect(globalThis.isMobileLandscapeGameplay()).toBe(false)
  })

  it('returns false when BHMobileAdaptive.isLandscapeTouch() returns false', () => {
    // BHMobileAdaptive stub already returns false
    expect(globalThis.isMobileLandscapeGameplay()).toBe(false)
  })
})

describe('config.js — getMobileLandscapeAdaptiveScale()', () => {
  it('delegates to BHMobileAdaptive.getScale when available', () => {
    // Stub returns 1 for desktop
    expect(typeof globalThis.getMobileLandscapeAdaptiveScale).toBe('function')
    const scale = globalThis.getMobileLandscapeAdaptiveScale('normal')
    expect(scale).toBe(1)
  })
})

describe('config.js — isMobileAdaptiveCombatMode()', () => {
  it('returns false on desktop regardless of mode', () => {
    const modes = ['normal', 'survival', '67', 'o4ko', 'nosok', 'platforms']
    modes.forEach((mode) => {
      expect(globalThis.isMobileAdaptiveCombatMode(mode)).toBe(false)
    })
  })
})
