import { vi } from 'vitest'

// ─── Canvas 2D context mock ───────────────────────────────────────────────────
const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  clip: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  drawFocusIfNeeded: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createPattern: vi.fn().mockReturnValue({}),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  textAlign: 'left',
  textBaseline: 'alphabetic',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  imageSmoothingEnabled: true,
  shadowBlur: 0,
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  lineCap: 'butt',
  lineJoin: 'miter',
  canvas: null, // filled below
}

globalThis.canvas = {
  width: 1920,
  height: 1080,
  getContext: vi.fn(() => mockCtx),
}
mockCtx.canvas = globalThis.canvas
globalThis.ctx = mockCtx

// ─── matchMedia mock (simulates desktop: no coarse pointer) ──────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false, // desktop: no coarse pointer / not mobile
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ─── Audio mock ───────────────────────────────────────────────────────────────
globalThis.BHAudio = {
  isEnabled: vi.fn(() => true),
  play: vi.fn(),
  playPlayerShoot: vi.fn(),
  playEnemyShoot: vi.fn(),
  startMusic: vi.fn(),
  stopMusic: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  setVolume: vi.fn(),
  duck: vi.fn(),
  unlock: vi.fn(),
}
window.BHAudio = globalThis.BHAudio

// ─── Minimal BHMobileAdaptive stub (overridden in mobileAdaptive tests) ──────
globalThis.BHMobileAdaptive = {
  isLandscapeTouch: () => false,
  isActive: () => false,
  supportsMode: () => false,
  getScale: () => 1,
  frameMul: (dt) => 1,
  speedMul: () => 1,
  px: (v) => v,
  size: (w, h) => ({ w, h }),
  runtime: (dt) => ({ active: false, scale: 1, frameMul: 1, speedMul: 1 }),
  getBalance: () => ({
    enemyFireRate: 1,
    enemyProjectileSpeed: 1,
    enemyMoveSpeed: 1,
    dropFallSpeed: 1,
    bossMoveSpeed: 1,
    homing: 1,
    targetFallSpeed: 1,
  }),
}
window.BHMobileAdaptive = globalThis.BHMobileAdaptive

// ─── Core game state globals (mirrors essentials from state.js) ───────────────
globalThis.gameMode = 'normal'
globalThis.keys = {}
globalThis.bullets = []
globalThis.enemyBullets = []
globalThis.enemies = []
globalThis.platforms = []
globalThis.player = null
globalThis.boss = null
globalThis.score = 0
globalThis.combo = 0
globalThis.lives = 7
globalThis.invuln = 0
globalThis.paused = false
globalThis.running = false
globalThis.levelCompleteShown = false
globalThis.gameOverShown = false
globalThis.bonusMode = false
globalThis.bonusShots = 0
globalThis.playerBulletDir = 'right'
globalThis.selectedChar = 'kuzy'

// Mode-specific globals used by bullets.js
globalThis.nosokGoals = 0
globalThis.nosokTargetGoals = 5
globalThis.nosokRunAnyShotFired = false
globalThis.stepanRunNoMoveShootShotSinceGoal = false
globalThis.o4koRunBonusShotUsed = false
globalThis.tutorialRunBonusShotUsed = false
globalThis.tutorialRunBossPhaseStarted = false
globalThis.tutorialRunBoss67Killed = false
globalThis.tutorialRunBossPhaseBonusShotsFired = 0

// Asset mocks
globalThis.maxBulletImg = { src: '', complete: false }

// ─── Image mock ───────────────────────────────────────────────────────────────
// jsdom provides Image but doesn't load files; mark src as a no-op setter
globalThis.Image = class MockImage {
  constructor() {
    this._src = ''
    this.complete = false
    this.width = 0
    this.height = 0
    this.onload = null
    this.onerror = null
  }
  get src() { return this._src }
  set src(val) {
    this._src = val
    // Simulate asynchronous load completion (does not actually fetch)
    Promise.resolve().then(() => {
      this.complete = true
      if (this.onload) this.onload()
    })
  }
}

// ─── requestAnimationFrame mock ───────────────────────────────────────────────
globalThis.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
globalThis.cancelAnimationFrame = vi.fn((id) => clearTimeout(id))

// ─── document.createElement('canvas') → return mock canvas ───────────────────
const _origCreateElement = document.createElement.bind(document)
vi.spyOn(document, 'createElement').mockImplementation((tag, opts) => {
  if (tag.toLowerCase() === 'canvas') {
    const el = _origCreateElement('canvas', opts)
    el.getContext = () => mockCtx
    el.width = 1
    el.height = 1
    return el
  }
  return _origCreateElement(tag, opts)
})
