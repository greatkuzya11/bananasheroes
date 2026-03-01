// ==== ОБЩИЙ МОБИЛЬНЫЙ АДАПТИВ (LANDSCAPE) ====
/**
 * Единая утилита мобильной адаптации геймплея.
 * Применяется только на touch-устройствах в горизонтальной ориентации.
 * Desktop-режим и portrait-режим не затрагиваются.
 */
class BHMobileAdaptive {
    /**
     * Набор режимов, для которых включается мобильный геймплейный адаптив.
     * @returns {Set<string>}
     */
    static get adaptiveModes() {
        return new Set([
            'normal',
            'survival',
            '67',
            'mode67',
            'o4ko',
            'nosok',
            'platforms',
            'lovlyu',
            'runner',
            'library'
        ]);
    }

    /**
     * Референс-разрешение, под которое балансировалась desktop-версия.
     * @returns {{w:number,h:number}}
     */
    static get reference() {
        return {
            w: (typeof REF_WIDTH === 'number') ? REF_WIDTH : 1920,
            h: (typeof REF_HEIGHT === 'number') ? REF_HEIGHT : 1080
        };
    }

    /**
     * Проверяет, что устройство мобильное (coarse/touch) и ориентация горизонтальная.
     * @returns {boolean}
     */
    static isLandscapeTouch() {
        const hasCoarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        const hasTouch = (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
        const isLandscape = window.innerWidth > window.innerHeight;
        return (hasCoarsePointer || hasTouch) && isLandscape;
    }

    /**
     * Проверяет, поддерживается ли адаптив в указанном режиме.
     * @param {string} mode - идентификатор режима.
     * @returns {boolean}
     */
    static supportsMode(mode) {
        return this.adaptiveModes.has(mode);
    }

    /**
     * Возвращает true, если для режима сейчас активен мобильный адаптив.
     * @param {string} mode - идентификатор режима.
     * @returns {boolean}
     */
    static isActive(mode) {
        if (!this.isLandscapeTouch()) return false;
        return this.supportsMode(mode);
    }

    /**
     * Возвращает масштаб адаптации относительно референса.
     * @param {string} mode - идентификатор режима.
     * @returns {number}
     */
    static getScale(mode) {
        if (!this.isActive(mode)) return 1;
        const ref = this.reference;
        const cw = (typeof canvas !== 'undefined' && canvas) ? canvas.width : window.innerWidth;
        const ch = (typeof canvas !== 'undefined' && canvas) ? canvas.height : window.innerHeight;
        const raw = Math.min(cw / Math.max(1, ref.w), ch / Math.max(1, ref.h));
        return Math.max(0.4, Math.min(1, raw));
    }

    /**
     * Возвращает множитель "кадровой" логики (исторический frame-step -> dt*60).
     * @param {number} dt - длительность кадра в секундах.
     * @param {string} mode - идентификатор режима.
     * @returns {number}
     */
    static frameMul(dt, mode) {
        if (!this.isActive(mode)) return 1;
        return dt * 60;
    }

    /**
     * Возвращает скоростной множитель для мобильного режима.
     * @param {string} mode - идентификатор режима.
     * @returns {number}
     */
    static speedMul(mode) {
        return this.isActive(mode) ? this.getScale(mode) : 1;
    }

    /**
     * Масштабирует пиксельное значение для мобильного режима.
     * @param {number} value - базовое значение.
     * @param {string} mode - идентификатор режима.
     * @param {number} [minValue=0] - минимально допустимое значение.
     * @param {boolean} [round=true] - округлять ли итог.
     * @returns {number}
     */
    static px(value, mode, minValue = 0, round = true) {
        if (!this.isActive(mode)) return value;
        const scaled = value * this.getScale(mode);
        const out = Math.max(minValue, scaled);
        return round ? Math.round(out) : out;
    }

    /**
     * Масштабирует размеры прямоугольника под мобильный режим.
     * @param {number} w - базовая ширина.
     * @param {number} h - базовая высота.
     * @param {string} mode - идентификатор режима.
     * @param {number} [minW=1] - минимальная ширина.
     * @param {number} [minH=1] - минимальная высота.
     * @returns {{w:number,h:number}}
     */
    static size(w, h, mode, minW = 1, minH = 1) {
        if (!this.isActive(mode)) return { w, h };
        const s = this.getScale(mode);
        return {
            w: Math.max(minW, Math.round(w * s)),
            h: Math.max(minH, Math.round(h * s))
        };
    }

    /**
     * Возвращает набор runtime-множителей для текущего кадра.
     * @param {number} dt - длительность кадра.
     * @param {string} mode - идентификатор режима.
     * @returns {{active:boolean,scale:number,frameMul:number,speedMul:number}}
     */
    static runtime(dt, mode) {
        const active = this.isActive(mode);
        const scale = active ? this.getScale(mode) : 1;
        return {
            active,
            scale,
            frameMul: active ? dt * 60 : 1,
            speedMul: active ? scale : 1
        };
    }

    /**
     * Возвращает профиль мобильного баланса для режима.
     * Значения < 1 слегка упрощают темп/плотность на тач-управлении.
     * @param {string} mode - идентификатор режима.
     * @returns {{
     *   enemyFireRate:number,
     *   enemyProjectileSpeed:number,
     *   enemyMoveSpeed:number,
     *   dropFallSpeed:number,
     *   bossMoveSpeed:number,
     *   homing:number,
     *   targetFallSpeed:number
     * }}
     */
    static getBalance(mode) {
        const base = {
            enemyFireRate: 1,
            enemyProjectileSpeed: 1,
            enemyMoveSpeed: 1,
            dropFallSpeed: 1,
            bossMoveSpeed: 1,
            homing: 1,
            targetFallSpeed: 1
        };
        if (!this.isActive(mode)) return base;

        const profiles = {
            normal:   { enemyFireRate: 0.92, enemyProjectileSpeed: 0.95, enemyMoveSpeed: 0.97, dropFallSpeed: 0.95 },
            survival: { enemyFireRate: 0.88, enemyProjectileSpeed: 0.92, enemyMoveSpeed: 0.96, dropFallSpeed: 0.95 },
            '67':     { enemyFireRate: 0.88, enemyProjectileSpeed: 0.90, enemyMoveSpeed: 0.95, dropFallSpeed: 0.95 },
            mode67:   { enemyFireRate: 0.88, enemyProjectileSpeed: 0.90, enemyMoveSpeed: 0.95, dropFallSpeed: 0.95 },
            o4ko:     { enemyFireRate: 0.90, enemyProjectileSpeed: 0.90, enemyMoveSpeed: 0.96, dropFallSpeed: 0.94, homing: 0.95 },
            nosok:    { enemyFireRate: 0.85, enemyProjectileSpeed: 0.90, enemyMoveSpeed: 0.95, dropFallSpeed: 0.95, bossMoveSpeed: 0.95, homing: 0.90 },
            platforms:{ enemyFireRate: 0.90, enemyProjectileSpeed: 0.92, enemyMoveSpeed: 0.96, dropFallSpeed: 0.95 },
            lovlyu:   { dropFallSpeed: 0.95, targetFallSpeed: 0.92 },
            runner:   { dropFallSpeed: 0.95, bossMoveSpeed: 0.96 },
            library:  { enemyFireRate: 0.82, enemyProjectileSpeed: 0.90, enemyMoveSpeed: 0.95, dropFallSpeed: 0.95, homing: 0.92 }
        };
        return { ...base, ...(profiles[mode] || {}) };
    }
}

window.BHMobileAdaptive = BHMobileAdaptive;
