import { describe, it, expect, beforeAll } from 'vitest'
import { loadScript } from '../setup/loadScript.js'

beforeAll(() => {
  loadScript('js/core/config.js')
  loadScript('js/entities/player.js')
})

// Helper: create a Player and reset bullets side effects
function makePlayer(type, spriteSystem) {
  globalThis.bullets = []
  return new globalThis.Player(type, spriteSystem || type)
}

// ─── Constructor — all character types ───────────────────────────────────────
describe('Player constructor — kuzy', () => {
  it('type is kuzy', () => {
    const p = makePlayer('kuzy')
    expect(p.type).toBe('kuzy')
  })

  it('spriteSystem defaults to type', () => {
    const p = makePlayer('kuzy')
    expect(p.spriteSystem).toBe('kuzy')
  })

  it('effectiveW = w * 0.6 for kuzy sprite (transparent sides)', () => {
    const p = makePlayer('kuzy')
    expect(p.effectiveW).toBeCloseTo(p.w * 0.6)
  })

  it('jumpStyle is kuzy', () => {
    const p = makePlayer('kuzy')
    expect(p.jumpStyle).toBe('kuzy')
  })
})

describe('Player constructor — max', () => {
  it('type is max', () => {
    const p = makePlayer('max')
    expect(p.type).toBe('max')
  })

  it('effectiveW = full w for max (no transparent sides)', () => {
    const p = makePlayer('max')
    expect(p.effectiveW).toBe(p.w)
  })

  it('jumpStyle is max', () => {
    const p = makePlayer('max')
    expect(p.jumpStyle).toBe('max')
  })
})

describe('Player constructor — dron', () => {
  it('type is dron', () => {
    const p = makePlayer('dron')
    expect(p.type).toBe('dron')
  })

  it('effectiveW = full w for dron', () => {
    const p = makePlayer('dron')
    expect(p.effectiveW).toBe(p.w)
  })

  it('jumpStyle is dron', () => {
    const p = makePlayer('dron')
    expect(p.jumpStyle).toBe('dron')
  })
})

// ─── Constructor — shared initial state ──────────────────────────────────────
describe('Player constructor — shared initial state', () => {
  it.each(['kuzy', 'max', 'dron'])('%s starts not jumping', (type) => {
    const p = makePlayer(type)
    expect(p.isJumping).toBe(false)
  })

  it.each(['kuzy', 'max', 'dron'])('%s starts facing right', (type) => {
    const p = makePlayer(type)
    expect(p.facingDir).toBe('right')
  })

  it.each(['kuzy', 'max', 'dron'])('%s starts with vy=0', (type) => {
    const p = makePlayer(type)
    expect(p.vy).toBe(0)
  })

  it.each(['kuzy', 'max', 'dron'])('%s starts with frame=0', (type) => {
    const p = makePlayer(type)
    expect(p.frame).toBe(0)
  })

  it.each(['kuzy', 'max', 'dron'])('%s has speed = PLAYER_SPEED (7)', (type) => {
    const p = makePlayer(type)
    expect(p.speed).toBe(globalThis.PLAYER_SPEED)
  })

  it.each(['kuzy', 'max', 'dron'])('%s has positive width and height', (type) => {
    const p = makePlayer(type)
    expect(p.w).toBeGreaterThan(0)
    expect(p.h).toBeGreaterThan(0)
  })

  it.each(['kuzy', 'max', 'dron'])('%s size is based on canvas.height (20%)', (type) => {
    const p = makePlayer(type)
    expect(p.w).toBeCloseTo(globalThis.canvas.height * 0.2)
    expect(p.h).toBeCloseTo(globalThis.canvas.height * 0.2)
  })

  it.each(['kuzy', 'max', 'dron'])('%s has empty maskCache', (type) => {
    const p = makePlayer(type)
    expect(p.maskCache).toBeInstanceOf(Map)
    expect(p.maskCache.size).toBe(0)
  })

  it.each(['kuzy', 'max', 'dron'])('%s onPlatform starts false', (type) => {
    const p = makePlayer(type)
    expect(p.onPlatform).toBe(false)
  })
})

// ─── Jump parameters ──────────────────────────────────────────────────────────
describe('Player jump parameters', () => {
  it('kuzy has jumpMinHeight and jumpMaxHeight in reasonable range', () => {
    const p = makePlayer('kuzy')
    expect(p.jumpMinHeight).toBeGreaterThan(0)
    expect(p.jumpMaxHeight).toBeGreaterThan(p.jumpMinHeight)
  })

  it('kuzy jumpRampFactor is 4.0', () => {
    const p = makePlayer('kuzy')
    expect(p.jumpRampFactor).toBe(4.0)
  })

  it('dron jumpRampFactor is 6.0', () => {
    const p = makePlayer('dron')
    expect(p.jumpRampFactor).toBe(6.0)
  })

  it('holdMax is 0.6 seconds for all characters', () => {
    ;['kuzy', 'max', 'dron'].forEach((type) => {
      const p = makePlayer(type)
      expect(p.jumpHoldMax).toBe(0.6)
    })
  })
})

// ─── spriteSystem can override effectiveW ─────────────────────────────────────
describe('Player effectiveW respects spriteSystem not type', () => {
  it('max character with kuzy spriteSystem gets kuzy effectiveW (0.6×w)', () => {
    const p = makePlayer('max', 'kuzy')
    expect(p.effectiveW).toBeCloseTo(p.w * 0.6)
  })

  it('kuzy character with max spriteSystem gets full effectiveW', () => {
    const p = makePlayer('kuzy', 'max')
    expect(p.effectiveW).toBe(p.w)
  })
})
