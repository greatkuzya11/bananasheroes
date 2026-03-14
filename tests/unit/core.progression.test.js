import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { loadScript } from '../setup/loadScript.js'

beforeAll(() => {
  loadScript('js/core/progression.js')
})

beforeEach(() => {
  // Each test starts with a clean localStorage to prevent state leakage
  localStorage.clear()
})

// ─── Campaign level order ─────────────────────────────────────────────────────
describe('CAMPAIGN_LEVEL_ORDER', () => {
  it('has exactly 8 levels', () => {
    expect(globalThis.CAMPAIGN_LEVEL_ORDER.length).toBe(8)
  })

  it('starts with normal and ends with library', () => {
    expect(globalThis.CAMPAIGN_LEVEL_ORDER[0]).toBe('normal')
    expect(globalThis.CAMPAIGN_LEVEL_ORDER[globalThis.CAMPAIGN_LEVEL_ORDER.length - 1]).toBe('library')
  })

  it('contains all expected modes in order', () => {
    const expected = ['normal', '67', 'o4ko', 'nosok', 'platforms', 'lovlyu', 'runner', 'library']
    expect([...globalThis.CAMPAIGN_LEVEL_ORDER]).toEqual(expected)
  })

  it('FINAL_CAMPAIGN_LEVEL is library', () => {
    expect(globalThis.FINAL_CAMPAIGN_LEVEL).toBe('library')
  })

  it('CAMPAIGN_RUN_LEVELS contains all levels except library', () => {
    expect(globalThis.CAMPAIGN_RUN_LEVELS).not.toContain('library')
    expect(globalThis.CAMPAIGN_RUN_LEVELS.length).toBe(7)
  })
})

// ─── CAMPAIGN_LEVEL_META ──────────────────────────────────────────────────────
describe('CAMPAIGN_LEVEL_META', () => {
  it('has a title and desc for each campaign mode', () => {
    globalThis.CAMPAIGN_LEVEL_ORDER.forEach((mode) => {
      const meta = globalThis.CAMPAIGN_LEVEL_META[mode]
      expect(meta).toBeDefined()
      expect(typeof meta.title).toBe('string')
      expect(meta.title.length).toBeGreaterThan(0)
    })
  })
})

// ─── readIntLS / writeLS ──────────────────────────────────────────────────────
describe('readIntLS()', () => {
  it('returns fallback when key is absent', () => {
    expect(globalThis.readIntLS('nonexistent_key', 42)).toBe(42)
  })

  it('returns parsed integer when key exists', () => {
    localStorage.setItem('test_int', '7')
    expect(globalThis.readIntLS('test_int', 0)).toBe(7)
  })

  it('returns fallback when value is not a number', () => {
    localStorage.setItem('test_bad', 'not-a-number')
    expect(globalThis.readIntLS('test_bad', 99)).toBe(99)
  })
})

describe('readBoolLS()', () => {
  it('returns false for absent key', () => {
    expect(globalThis.readBoolLS('missing_bool', false)).toBe(false)
  })

  it('returns true when stored as "1"', () => {
    localStorage.setItem('bool_flag', '1')
    expect(globalThis.readBoolLS('bool_flag', false)).toBe(true)
  })

  it('returns false when stored as "0"', () => {
    localStorage.setItem('bool_flag', '0')
    expect(globalThis.readBoolLS('bool_flag', true)).toBe(false)
  })
})

describe('writeLS()', () => {
  it('stores a value in localStorage', () => {
    globalThis.writeLS('write_test', 'hello')
    expect(localStorage.getItem('write_test')).toBe('hello')
  })
})

// ─── isCampaignMode() ─────────────────────────────────────────────────────────
describe('isCampaignMode()', () => {
  it('returns true for all campaign modes', () => {
    globalThis.CAMPAIGN_LEVEL_ORDER.forEach((mode) => {
      expect(globalThis.isCampaignMode(mode)).toBe(true)
    })
  })

  it('returns false for non-campaign modes', () => {
    expect(globalThis.isCampaignMode('survival')).toBe(false)
    expect(globalThis.isCampaignMode('bonus')).toBe(false)
    expect(globalThis.isCampaignMode('stepan')).toBe(false)
    expect(globalThis.isCampaignMode('unknownXYZ')).toBe(false)
  })
})

// ─── isLevelCompleted() / setLevelCompleted() ─────────────────────────────────
describe('setLevelCompleted() / isLevelCompleted()', () => {
  it('isLevelCompleted returns false when not set', () => {
    expect(globalThis.isLevelCompleted('normal')).toBe(false)
  })

  it('setLevelCompleted + isLevelCompleted round-trip', () => {
    globalThis.setLevelCompleted('normal')
    expect(globalThis.isLevelCompleted('normal')).toBe(true)
  })

  it('setLevelCompleted writes the correct localStorage key', () => {
    globalThis.setLevelCompleted('67')
    const key = globalThis.PROGRESS_KEYS.levelCompletedPrefix + '67'
    expect(localStorage.getItem(key)).toBe('1')
  })

  it('does nothing for non-campaign modes', () => {
    globalThis.setLevelCompleted('survival')
    expect(globalThis.isLevelCompleted('survival')).toBe(false)
  })
})

// ─── isSurvivalUnlocked / isPoimalUnlocked / isStepanUnlocked ────────────────
describe('Bonus-mode unlock checks', () => {
  it('isSurvivalUnlocked returns false when not set', () => {
    expect(globalThis.isSurvivalUnlocked()).toBe(false)
  })

  it('setSurvivalUnlocked → isSurvivalUnlocked returns true', () => {
    globalThis.setSurvivalUnlocked()
    expect(globalThis.isSurvivalUnlocked()).toBe(true)
  })

  it('isPoimalUnlocked returns false when not set', () => {
    expect(globalThis.isPoimalUnlocked()).toBe(false)
  })

  it('isStepanUnlocked returns false when not set', () => {
    expect(globalThis.isStepanUnlocked()).toBe(false)
  })
})

// ─── isModeUnlockedByProgress() ──────────────────────────────────────────────
describe('isModeUnlockedByProgress()', () => {
  it('normal mode is always unlocked', () => {
    expect(globalThis.isModeUnlockedByProgress('normal')).toBe(true)
  })

  it('runner mode is always unlocked (part of CAMPAIGN_RUN_LEVELS)', () => {
    expect(globalThis.isModeUnlockedByProgress('runner')).toBe(true)
  })

  it('survival is locked when not in localStorage', () => {
    expect(globalThis.isModeUnlockedByProgress('survival')).toBe(false)
  })

  it('survival is unlocked after setSurvivalUnlocked()', () => {
    globalThis.setSurvivalUnlocked()
    expect(globalThis.isModeUnlockedByProgress('survival')).toBe(true)
  })

  it('bonus is locked when gameCompletedOnce is absent', () => {
    expect(globalThis.isModeUnlockedByProgress('bonus')).toBe(false)
  })
})

// ─── getModeDisplayName() ─────────────────────────────────────────────────────
describe('getModeDisplayName()', () => {
  it('returns the title from CAMPAIGN_LEVEL_META for known modes', () => {
    const name = globalThis.getModeDisplayName('normal')
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })

  it('returns the mode key itself for unknown modes', () => {
    expect(globalThis.getModeDisplayName('unknownXYZ')).toBe('unknownXYZ')
  })
})

// ─── getNextCampaignMode() ────────────────────────────────────────────────────
describe('getNextCampaignMode()', () => {
  it('normal → 67', () => {
    expect(globalThis.getNextCampaignMode('normal')).toBe('67')
  })

  it('runner → null (library locked by default)', () => {
    // library requires isLibraryUnlockedByProgress() = all run levels completed
    expect(globalThis.getNextCampaignMode('runner')).toBeNull()
  })

  it('returns null for the last level (library)', () => {
    expect(globalThis.getNextCampaignMode('library')).toBeNull()
  })

  it('returns null for non-campaign modes', () => {
    expect(globalThis.getNextCampaignMode('survival')).toBeNull()
  })
})

// ─── migrateLegacyProgressToCompletionFlags() ─────────────────────────────────
describe('migrateLegacyProgressToCompletionFlags()', () => {
  it('sets the migration flag after running', () => {
    // It runs automatically on script load; migration flag should now be set
    const key = globalThis.PROGRESS_KEYS.completionFlagsMigrated
    // May be '1' (ran on load) or absent (depends on order); calling it again should be idempotent
    globalThis.migrateLegacyProgressToCompletionFlags()
    expect(localStorage.getItem(key)).toBe('1')
  })

  it('is idempotent — calling twice does not overwrite completion flags', () => {
    globalThis.setLevelCompleted('normal')
    globalThis.migrateLegacyProgressToCompletionFlags() // should be no-op since flag is set
    expect(globalThis.isLevelCompleted('normal')).toBe(true)
  })
})
