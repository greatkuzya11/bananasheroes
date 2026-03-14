import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { loadScript } from '../setup/loadScript.js'

beforeAll(() => {
  loadScript('js/core/config.js')
  loadScript('js/systems/bullets.js')
})

beforeEach(() => {
  // Reset shared arrays and state before each test
  globalThis.bullets = []
  globalThis.enemyBullets = []
  globalThis.bonusMode = false
  globalThis.bonusShots = 0
  globalThis.playerBulletDir = 'right'
  globalThis.gameMode = 'normal'
})

// Helper: create a minimal Player-like object
function makePlayer(type) {
  return {
    type,
    x: 400,
    y: 800,
    w: 100,
    h: 100,
    shooting: false,
    shootTimer: 0,
    frame: 0,
  }
}

// ─── shootPlayerBullet — kuzy ─────────────────────────────────────────────────
describe('shootPlayerBullet() — kuzy', () => {
  it('adds exactly one bullet to the bullets array', () => {
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets.length).toBe(1)
  })

  it('bullet has kuzy emoji (💦)', () => {
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets[0].emoji).toBe('💦')
  })

  it('bullet radius is 18 for kuzy', () => {
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets[0].r).toBe(18)
  })

  it('bullet flies in playerBulletDir=right: vx>0, vy=0', () => {
    globalThis.playerBulletDir = 'right'
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    const b = globalThis.bullets[0]
    expect(b.vx).toBeGreaterThan(0)
    expect(b.vy).toBe(0)
  })

  it('bullet flies up: vx=0, vy<0', () => {
    globalThis.playerBulletDir = 'up'
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    const b = globalThis.bullets[0]
    expect(b.vx).toBe(0)
    expect(b.vy).toBeLessThan(0)
  })

  it('bullet flies left: vx<0, vy=0', () => {
    globalThis.playerBulletDir = 'left'
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    const b = globalThis.bullets[0]
    expect(b.vx).toBeLessThan(0)
    expect(b.vy).toBe(0)
  })

  it('marks player as shooting', () => {
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    expect(p.shooting).toBe(true)
  })

  it('includes playerType in bullet object', () => {
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets[0].playerType).toBe('kuzy')
  })

  it('includes hitRadius = r * 2', () => {
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    const b = globalThis.bullets[0]
    expect(b.hitRadius).toBe(b.r * 2)
  })
})

// ─── shootPlayerBullet — max ──────────────────────────────────────────────────
describe('shootPlayerBullet() — max', () => {
  it('bullet has max emoji (💩)', () => {
    const p = makePlayer('max')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets[0].emoji).toBe('💩')
  })

  it('normal max bullet radius is 10', () => {
    const p = makePlayer('max')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets[0].r).toBe(10)
  })

  it('bonus max shot fires 3 bullets in a fan', () => {
    globalThis.bonusMode = true
    globalThis.bonusShots = 5
    const p = makePlayer('max')
    globalThis.playerBulletDir = 'right'
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets.length).toBe(3)
  })

  it('bonus max bullets have radius 12', () => {
    globalThis.bonusMode = true
    globalThis.bonusShots = 5
    const p = makePlayer('max')
    globalThis.shootPlayerBullet(p)
    globalThis.bullets.forEach((b) => expect(b.r).toBe(12))
  })

  it('bonus fan bullets have different angles (different vx/vy)', () => {
    globalThis.bonusMode = true
    globalThis.bonusShots = 5
    globalThis.playerBulletDir = 'right'
    const p = makePlayer('max')
    globalThis.shootPlayerBullet(p)
    // 3 bullets: angles -15°, 0°, +15° — the outer two should have non-zero vy
    const [b1, b2, b3] = globalThis.bullets
    expect(b1.vy).not.toBe(0)  // -15° fan
    expect(b2.vy).toBeCloseTo(0, 5)  // 0° straight
    expect(b3.vy).not.toBe(0)  // +15° fan
  })

  it('bonus shot decrements bonusShots', () => {
    globalThis.bonusMode = true
    globalThis.bonusShots = 3
    const p = makePlayer('max')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bonusShots).toBe(2)
  })
})

// ─── shootPlayerBullet — dron ─────────────────────────────────────────────────
describe('shootPlayerBullet() — dron', () => {
  it('bullet has dron emoji (🌀)', () => {
    const p = makePlayer('dron')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets[0].emoji).toBe('🌀')
  })

  it('dron bullet radius is 14', () => {
    const p = makePlayer('dron')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bullets[0].r).toBe(14)
  })
})

// ─── Bonus mode deactivation after last shot ──────────────────────────────────
describe('shootPlayerBullet() — bonus mode exhaustion', () => {
  it('bonusMode becomes false after last bonus shot (kuzy)', () => {
    globalThis.bonusMode = true
    globalThis.bonusShots = 1
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    expect(globalThis.bonusMode).toBe(false)
    expect(globalThis.bonusShots).toBe(0)
  })

  it('bonus bullet is larger than normal (kuzy)', () => {
    globalThis.bonusMode = true
    globalThis.bonusShots = 1
    globalThis.bullets = []
    const pNormal = makePlayer('kuzy')
    globalThis.bonusMode = false
    globalThis.shootPlayerBullet(pNormal)
    const normalR = globalThis.bullets[0].r

    globalThis.bullets = []
    globalThis.bonusMode = true
    globalThis.bonusShots = 1
    const pBonus = makePlayer('kuzy')
    globalThis.shootPlayerBullet(pBonus)
    const bonusR = globalThis.bullets[0].r

    expect(bonusR).toBeGreaterThan(normalR)
  })
})

// ─── BHAudio was called ────────────────────────────────────────────────────────
describe('shootPlayerBullet() — audio side effect', () => {
  it('calls BHAudio.playPlayerShoot with player type', () => {
    // BHAudio is mocked in globals.js
    const p = makePlayer('kuzy')
    window.BHAudio.playPlayerShoot.mockClear()
    globalThis.shootPlayerBullet(p)
    expect(window.BHAudio.playPlayerShoot).toHaveBeenCalledWith('kuzy', false)
  })

  it('calls BHAudio.playPlayerShoot with isBonus=true for bonus shot', () => {
    globalThis.bonusMode = true
    globalThis.bonusShots = 1
    window.BHAudio.playPlayerShoot.mockClear()
    const p = makePlayer('kuzy')
    globalThis.shootPlayerBullet(p)
    expect(window.BHAudio.playPlayerShoot).toHaveBeenCalledWith('kuzy', true)
  })
})
