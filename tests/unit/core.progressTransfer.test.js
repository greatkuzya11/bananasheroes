import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { loadScript } from '../setup/loadScript.js'

beforeAll(() => {
  loadScript('js/core/progressTransfer.js')
})

beforeEach(() => {
  localStorage.clear()
})

describe('BHProgressTransfer.isTransferableKey()', () => {
  it('includes regular bh_* keys', () => {
    expect(window.BHProgressTransfer.isTransferableKey('bh_achievements_v1')).toBe(true)
    expect(window.BHProgressTransfer.isTransferableKey('bh_audio_enabled_v1')).toBe(true)
  })

  it('excludes touch layout keys and mobile hint key', () => {
    expect(window.BHProgressTransfer.isTransferableKey('bh_touch_fire_pos_v1')).toBe(false)
    expect(window.BHProgressTransfer.isTransferableKey('bh_mobile_controls_hint_seen_v2')).toBe(false)
  })

  it('ignores non-game keys', () => {
    expect(window.BHProgressTransfer.isTransferableKey('foo')).toBe(false)
    expect(window.BHProgressTransfer.isTransferableKey('touch_fire_pos_v1')).toBe(false)
  })
})

describe('BHProgressTransfer.createSnapshot()', () => {
  it('exports only transferable keys', () => {
    localStorage.setItem('bh_achievements_v1', '{"a":1}')
    localStorage.setItem('bh_audio_enabled_v1', '1')
    localStorage.setItem('bh_touch_fire_pos_v1', '{"left":50}')
    localStorage.setItem('bh_mobile_controls_hint_seen_v2', '1')
    localStorage.setItem('custom_key', 'x')

    const snapshot = window.BHProgressTransfer.createSnapshot()

    expect(snapshot.app).toBe('bananasheroes')
    expect(snapshot.kind).toBe('progress-transfer')
    expect(snapshot.version).toBe(1)
    expect(typeof snapshot.exportedAt).toBe('string')
    expect(snapshot.payload).toEqual({
      bh_achievements_v1: '{"a":1}',
      bh_audio_enabled_v1: '1'
    })
  })
})

describe('BHProgressTransfer.serializeSnapshot() / parseSnapshot()', () => {
  it('round-trips a valid snapshot', () => {
    const snapshot = {
      app: 'bananasheroes',
      kind: 'progress-transfer',
      version: 1,
      exportedAt: '2026-03-29T00:00:00.000Z',
      payload: {
        bh_achievements_v1: '{"win":1}',
        bh_game_completed_once_v1: '1'
      }
    }

    const raw = window.BHProgressTransfer.serializeSnapshot(snapshot)
    const parsed = window.BHProgressTransfer.parseSnapshot(raw)

    expect(parsed).toEqual(snapshot)
  })
})

describe('BHProgressTransfer.clearTransferableStorage()', () => {
  it('clears only transferable keys', () => {
    localStorage.setItem('bh_achievements_v1', '{"a":1}')
    localStorage.setItem('bh_audio_enabled_v1', '0')
    localStorage.setItem('bh_touch_fire_pos_v1', '{"left":12}')
    localStorage.setItem('custom_key', 'keep')

    window.BHProgressTransfer.clearTransferableStorage()

    expect(localStorage.getItem('bh_achievements_v1')).toBeNull()
    expect(localStorage.getItem('bh_audio_enabled_v1')).toBeNull()
    expect(localStorage.getItem('bh_touch_fire_pos_v1')).toBe('{"left":12}')
    expect(localStorage.getItem('custom_key')).toBe('keep')
  })
})

describe('BHProgressTransfer.applySnapshot()', () => {
  it('replaces transferable storage and keeps excluded keys', () => {
    localStorage.setItem('bh_achievements_v1', '{"old":1}')
    localStorage.setItem('bh_audio_enabled_v1', '0')
    localStorage.setItem('bh_touch_fire_pos_v1', '{"left":12}')

    window.BHProgressTransfer.applySnapshot({
      app: 'bananasheroes',
      kind: 'progress-transfer',
      version: 1,
      exportedAt: '2026-03-29T00:00:00.000Z',
      payload: {
        bh_achievements_v1: '{"new":1}',
        bh_game_completed_once_v1: '1'
      }
    })

    expect(localStorage.getItem('bh_achievements_v1')).toBe('{"new":1}')
    expect(localStorage.getItem('bh_game_completed_once_v1')).toBe('1')
    expect(localStorage.getItem('bh_audio_enabled_v1')).toBeNull()
    expect(localStorage.getItem('bh_touch_fire_pos_v1')).toBe('{"left":12}')
  })

  it('does not mutate storage for invalid JSON input', () => {
    localStorage.setItem('bh_achievements_v1', '{"old":1}')

    expect(() => window.BHProgressTransfer.parseSnapshot('{')).toThrow()
    expect(localStorage.getItem('bh_achievements_v1')).toBe('{"old":1}')
  })

  it('does not mutate storage for invalid schema input', () => {
    localStorage.setItem('bh_achievements_v1', '{"old":1}')

    expect(() => window.BHProgressTransfer.applySnapshot({
      app: 'bananasheroes',
      kind: 'progress-transfer',
      version: 2,
      exportedAt: '2026-03-29T00:00:00.000Z',
      payload: {
        bh_achievements_v1: '{"new":1}'
      }
    })).toThrow()

    expect(localStorage.getItem('bh_achievements_v1')).toBe('{"old":1}')
  })

  it('does not mutate storage for non-string payload values', () => {
    localStorage.setItem('bh_achievements_v1', '{"old":1}')

    expect(() => window.BHProgressTransfer.applySnapshot({
      app: 'bananasheroes',
      kind: 'progress-transfer',
      version: 1,
      exportedAt: '2026-03-29T00:00:00.000Z',
      payload: {
        bh_achievements_v1: 42
      }
    })).toThrow()

    expect(localStorage.getItem('bh_achievements_v1')).toBe('{"old":1}')
  })
})
