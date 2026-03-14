import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { loadScript } from '../setup/loadScript.js'

beforeAll(() => {
  loadScript('js/core/config.js')
  loadScript('js/entities/enemy67.js')
  loadScript('js/entities/bossO4ko.js')
  loadScript('js/entities/bossNosok.js')
})

// A mock player needed by BossO4ko and BossNosok constructors
const MOCK_PLAYER = { x: 400, y: 800, w: 216, h: 216 }

// ─── Enemy67 ──────────────────────────────────────────────────────────────────
describe('Enemy67 — constructor (normal mode)', () => {
  let e

  beforeEach(() => {
    globalThis.gameMode = '67'
    e = new globalThis.Enemy67(400, 800)
  })

  it('HP is 67 in normal mode', () => {
    expect(e.hp).toBe(67)
    expect(e.maxHp).toBe(67)
  })

  it('size is half the canvas height', () => {
    expect(e.h).toBeCloseTo(globalThis.canvas.height * 0.5)
    expect(e.w).toBe(e.h)
  })

  it('attackTimer starts at 0', () => {
    expect(e.attackTimer).toBe(0)
  })

  it('bulletEmojis is a non-empty array', () => {
    expect(Array.isArray(e.bulletEmojis)).toBe(true)
    expect(e.bulletEmojis.length).toBeGreaterThan(0)
  })

  it('baseX and baseY are saved', () => {
    expect(e.baseX).toBe(e.x)
    expect(e.baseY).toBe(e.y)
  })

  it('swayTime starts at 0', () => {
    expect(e.swayTime).toBe(0)
  })
})

describe('Enemy67 — constructor (platformMode)', () => {
  let e

  beforeEach(() => {
    globalThis.gameMode = 'platforms'
    // bossPlatform is needed in platformMode
    globalThis.bossPlatform = { x: 800, y: 400, w: 300, h: 20 }
    e = new globalThis.Enemy67(400, 800, true)
  })

  it('HP is 76 in platform mode', () => {
    expect(e.hp).toBe(76)
    expect(e.maxHp).toBe(76)
  })

  it('height is 33.75% canvas height in platform mode', () => {
    expect(e.h).toBeCloseTo(globalThis.canvas.height * 0.3375)
  })

  it('moveSpeed is 0 in platform mode (boss is stationary)', () => {
    expect(e.moveSpeed).toBe(0)
  })

  it('attackDelay is 0 in platform mode (attacks immediately)', () => {
    expect(e.attackDelay).toBe(0)
  })
})

// ─── BossO4ko ─────────────────────────────────────────────────────────────────
describe('BossO4ko — constructor', () => {
  let boss

  beforeEach(() => {
    globalThis.gameMode = 'o4ko'
    globalThis.player = MOCK_PLAYER
    boss = new globalThis.BossO4ko(400, 800)
  })

  it('HP is 120', () => {
    expect(boss.hp).toBe(120)
    expect(boss.maxHp).toBe(120)
  })

  it('rageState starts as inactive (non-rage initial state)', () => {
    // BossO4ko stores rageState as a state-machine string; 'inactive' = no rage yet
    expect(boss.rageState).toBe('inactive')
  })

  it('state starts as normal', () => {
    expect(boss.state).toBe('normal')
  })

  it('isJumping starts false', () => {
    expect(boss.isJumping).toBe(false)
  })

  it('facingDir starts as left', () => {
    expect(boss.facingDir).toBe('left')
  })

  it('groundWave.active starts false', () => {
    expect(boss.groundWave.active).toBe(false)
  })

  it('size is at least 1.5× player height', () => {
    expect(boss.h).toBeGreaterThanOrEqual(MOCK_PLAYER.h * 1.5)
  })
})

describe('BossO4ko — takeHit()', () => {
  let boss

  beforeEach(() => {
    globalThis.player = MOCK_PLAYER
    boss = new globalThis.BossO4ko(400, 800)
  })

  it('reduces HP by effective damage', () => {
    const before = boss.hp
    const result = boss.takeHit(1)
    expect(result.damage).toBeGreaterThan(0)
    expect(boss.hp).toBe(Math.max(0, before - result.damage))
  })

  it('returns killed=true when HP reaches 0', () => {
    boss.hp = 1
    const result = boss.takeHit(100)
    expect(result.killed).toBe(true)
    expect(boss.hp).toBe(0)
  })

  it('returns killed=false when HP > 0', () => {
    boss.hp = 100
    const result = boss.takeHit(1)
    expect(result.killed).toBe(false)
  })

  it('returns damage=0 and killed=true when already dead', () => {
    boss.hp = 0
    const result = boss.takeHit(10)
    expect(result.damage).toBe(0)
    expect(result.killed).toBe(true)
  })

  it('HP never goes below 0', () => {
    boss.hp = 5
    boss.takeHit(1000)
    expect(boss.hp).toBe(0)
  })
})

// ─── BossNosok ────────────────────────────────────────────────────────────────
describe('BossNosok — constructor', () => {
  let boss

  beforeEach(() => {
    globalThis.gameMode = 'nosok'
    globalThis.player = MOCK_PLAYER
    boss = new globalThis.BossNosok()
  })

  it('goalX is 90% of canvas width', () => {
    expect(boss.goalX).toBeCloseTo(globalThis.canvas.width * 0.9)
  })

  it('is not jumping at start', () => {
    expect(boss.isJumping).toBe(false)
  })

  it('is not frozen at start', () => {
    expect(boss.isFrozen).toBe(false)
  })

  it('knockbackState starts as none', () => {
    expect(boss.knockbackState).toBe('none')
  })

  it('facingDir starts as left', () => {
    expect(boss.facingDir).toBe('left')
  })

  it('x is within allowed zone [minX, maxX]', () => {
    expect(boss.x).toBeGreaterThanOrEqual(boss.minX)
    expect(boss.x).toBeLessThanOrEqual(boss.maxX)
  })

  it('size is at least 1.35× player height', () => {
    expect(boss.h).toBeGreaterThanOrEqual(MOCK_PLAYER.h * 1.35)
  })

  it('maskCache is an empty Map', () => {
    expect(boss.maskCache).toBeInstanceOf(Map)
    expect(boss.maskCache.size).toBe(0)
  })
})
