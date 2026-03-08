// Игровые константы
const FRAME_W = 256;
const FRAME_H = 256;
const WALK_START = 1;
const WALK_END = 4;
const SHOOT_FRAME = 5;
const PLAYER_SPEED = 7;
const ENEMY_ROWS = 3;
const ENEMY_COLS = 7;
const ENEMY_WIDTH_RATIO = 0.1;
const ENEMY_HEIGHT_RATIO = 0.1;
const ENEMY_START_Y = 60;
const ENEMY_X_SPACING = 120;
const ENEMY_Y_SPACING = 100;
// базовое количество жизней для всех «боевых» уровней (не считая runner/survival)
// единое число должно оставаться достаточным для прохождения, но давать серьёзный
// вызов; после обзора кода и бонусов оптимальное значение — 7.
const PLAYER_LIVES = 7; // было 20, теперь ужесточено
const INVULN_TIME = 0.5;
const BONUS_SHOTS_PER_BOTTLE = 3;
const SPEECH_BALLOON_DURATION = 1.0;
const FRAME_67_W = 326;
const FRAME_67_H = 326;
const BONUS_CHANCE = 0.1; // 10% шанс выпадения бонуса
const HEART_CHANCE = 0.08; // 8% шанс выпадения сердечка

// Базовое референс-разрешение, под которое изначально балансировалась игра.
const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;

/**
 * Возвращает true, если сейчас мобильное устройство в горизонтальной ориентации.
 * Адаптив боевых параметров включается только в этом случае.
 * @returns {boolean}
 */
function isMobileLandscapeGameplay() {
    if (window.BHMobileAdaptive && typeof window.BHMobileAdaptive.isLandscapeTouch === 'function') {
        return window.BHMobileAdaptive.isLandscapeTouch();
    }
    const hasCoarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const hasTouch = (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
    const isLandscape = window.innerWidth > window.innerHeight;
    return (hasCoarsePointer || hasTouch) && isLandscape;
}

/**
 * Мягкий коэффициент масштаба геймплея относительно референса.
 * Используется в мобильном landscape для уровней с адаптивом.
 * @returns {number}
 */
function getMobileLandscapeAdaptiveScale(mode = gameMode) {
    if (window.BHMobileAdaptive && typeof window.BHMobileAdaptive.getScale === 'function') {
        return window.BHMobileAdaptive.getScale(mode || gameMode);
    }
    const rw = canvas.width / REF_WIDTH;
    const rh = canvas.height / REF_HEIGHT;
    const raw = Math.min(rw, rh);
    // Не даём масштабу опускаться слишком низко, чтобы не "ломать" темп боя.
    return Math.max(0.4, Math.min(1, raw));
}

/**
 * Проверяет, нужно ли включать мобильный адаптив для боевых уровней:
 * normal, survival, 67, mode67.
 * @param {string} mode - текущий игровой режим.
 * @returns {boolean}
 */
function isMobileAdaptiveCombatMode(mode) {
    if (window.BHMobileAdaptive && typeof window.BHMobileAdaptive.isActive === 'function') {
        return window.BHMobileAdaptive.isActive(mode);
    }
    if (!isMobileLandscapeGameplay()) return false;
    return mode === 'normal'
        || mode === 'survival'
        || mode === '67'
        || mode === 'mode67'
        || mode === 'o4ko'
        || mode === 'nosok'
        || mode === 'stepan'
        || mode === 'platforms'
        || mode === 'lovlyu'
        || mode === 'poimal'
        || mode === 'runner'
        || mode === 'bonus'
        || mode === 'library'
        || mode === 'tutorial';
}

