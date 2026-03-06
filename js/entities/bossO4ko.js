// ==== КЛАСС БОССА "ОЧКО" ====
/**
 * Босс режима "Очко":
 * - фазы HP, телеграфы, прыжки, рывки, уязвимость
 */
class BossO4ko {
    /**
     * Создает босса "Очко".
     * @param {number} playerX - стартовая координата игрока X (не используется напрямую, оставлена для совместимости).
     * @param {number} playerY - стартовая координата игрока Y (не используется напрямую, оставлена для совместимости).
     */
    constructor(playerX, playerY) {
        const adaptiveScale = (typeof isMobileAdaptiveCombatMode === 'function'
            && isMobileAdaptiveCombatMode('o4ko')
            && typeof getMobileLandscapeAdaptiveScale === 'function')
            ? getMobileLandscapeAdaptiveScale('o4ko')
            : 1;
        const mobileBalance = (window.BHMobileAdaptive
            && typeof window.BHMobileAdaptive.getBalance === 'function'
            && typeof window.BHMobileAdaptive.isActive === 'function'
            && window.BHMobileAdaptive.isActive('o4ko'))
            ? window.BHMobileAdaptive.getBalance('o4ko')
            : null;
        this.mobileAdaptiveScale = adaptiveScale;
        this.mobileBalance = mobileBalance || {
            enemyFireRate: 1,
            enemyProjectileSpeed: 1,
            enemyMoveSpeed: 1
        };
        // Размер босса = 1.5 роста игрока.
        this.h = Math.max(48, player.h * 1.5);
        this.w = this.h;

        // Правая зона движения: от 55% ширины экрана до правой границы.
        // Левая четверть экрана недоступна боссу, остальная часть доступна.
        this.rightZoneStartRatio = 0.25;
        this.minX = 0;
        this.maxX = 0;
        this.refreshBounds();
        this.x = this.maxX; // спавн справа
        this.y = this.baseY;

        // Ходьба.
        this.baseWalkSpeed = Math.max(70 * adaptiveScale, canvas.width * 0.07); // px/s
        this.dir = -1; // старт влево
        this.facingDir = 'left';
        this.dirTimer = 0;
        this.nextDirChange = this.rand(1.2, 2.6);

        // Прыжок.
        this.isJumping = false;
        this.jumpTimer = 0;
        this.jumpDuration = 0.95;
        this.jumpHeight = this.h * 0.75;
        this.jumpAscentRatio = 0.44;
        this.jumpCooldown = this.rand(0.9, 1.6);
        this.landingCount = 0;

        // Состояния спецдействий.
        this.state = 'normal'; // normal | slamTelegraph | dashTelegraph | dashing
        this.stateTimer = 0;
        this.pendingSlam = false;
        this.pendingDash = false;
        this.pendingShortDash = false;

        // Волна от удара о землю.
        this.groundWave = {
            active: false,
            timer: 0,
            duration: 0.55,
            maxRadius: canvas.width * 0.40,
            currentRadius: 0,
            centerX: this.x + this.w * 0.5,
            groundY: canvas.height - Math.max(8, Math.round(20 * adaptiveScale))
        };

        // Рывок.
        this.dashFromX = this.x;
        this.dashToX = this.x;
        this.dashDuration = 0.25;
        this.dashTelegraphDuration = 0.35;
        this.dashFinishedSignal = false;

        // Фазы и уязвимость.
        this.hp = 120;
        this.maxHp = 120;
        this.phase = 1;
        this.phaseTransitionPending = false;
        this.vulnerabilityTimer = 0;
        this.vulnerabilityFlashSeed = Math.random() * 10;

        // Режим ярости (Ф4): читаемый цикл.
        this.rageState = 'inactive';
        this.rageTimer = 0;
        this.ultFrequencyMul = 2;

        // Стрельба.
        this.attackDelay = 1.35;
        this.attackTimer = 0;
        this.shootTimer = 0;
        this.shootInterval = 1.4;
        this.basePoopSize = Math.max(16, Math.round(28 * adaptiveScale));

        // Анимация кадров.
        this.frame = 0;
        this.animTimer = 0;
        this.animIntervalWalk = 0.11;
        this.animIntervalJump = 0.13;
        this.outlineCache = new Map();
    }

    /**
     * Возвращает случайное число в диапазоне.
     * @param {number} min - минимум.
     * @param {number} max - максимум.
     * @returns {number}
     */
    rand(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Обновляет границы движения в правой части экрана.
     */
    refreshBounds() {
        const adaptiveScale = (typeof isMobileAdaptiveCombatMode === 'function'
            && isMobileAdaptiveCombatMode('o4ko')
            && typeof getMobileLandscapeAdaptiveScale === 'function')
            ? getMobileLandscapeAdaptiveScale('o4ko')
            : (this.mobileAdaptiveScale || 1);
        this.mobileAdaptiveScale = adaptiveScale;
        const rightStart = canvas.width * this.rightZoneStartRatio;
        const edgePad = Math.max(8, Math.round(20 * adaptiveScale));
        const rightLimit = canvas.width - this.w - edgePad;
        this.minX = Math.max(edgePad, Math.min(rightStart, rightLimit));
        this.maxX = Math.max(this.minX, rightLimit);
        this.baseY = canvas.height - this.h - edgePad;
    }

    /**
     * Возвращает номер фазы по текущему HP.
     * @returns {1|2|3|4}
     */
    getPhaseByHp() {
        const hpRatio = (this.maxHp > 0) ? (this.hp / this.maxHp) : 0;
        if (hpRatio <= 0.10) return 4;
        if (hpRatio <= 0.40) return 3;
        if (hpRatio <= 0.70) return 2;
        return 1;
    }

    /**
     * Возвращает конфиг текущей фазы.
     * @param {number} [phase] - номер фазы.
     * @returns {{
     *   speedMult:number,
     *   jumpCdMin:number, jumpCdMax:number,
     *   landingVuln:number,
     *   slamEvery:number,
     *   dashEvery:number,
     *   phaseDamageMult:number,
     *   shootBase:number, shootJitter:number
     * }}
     */
    getPhaseConfig(phase = this.phase) {
        if (phase === 1) {
            return {
                speedMult: 1.0,
                jumpCdMin: 0.9,
                jumpCdMax: 1.6,
                landingVuln: 0.60,
                slamEvery: 0,
                dashEvery: 0,
                phaseDamageMult: 1.00,
                shootBase: 1.45,
                shootJitter: 0.35
            };
        }
        if (phase === 2) {
            return {
                speedMult: 1.15,
                jumpCdMin: 0.8,
                jumpCdMax: 1.4,
                landingVuln: 0.45,
                slamEvery: 3,
                dashEvery: 0,
                phaseDamageMult: 0.95,
                shootBase: 1.30,
                shootJitter: 0.30
            };
        }
        if (phase === 3) {
            return {
                speedMult: 1.30,
                jumpCdMin: 0.7,
                jumpCdMax: 1.2,
                landingVuln: 0.45,
                slamEvery: 3,
                dashEvery: 2,
                phaseDamageMult: 0.90,
                shootBase: 1.15,
                shootJitter: 0.26
            };
        }
        return {
            speedMult: 1.45,
            jumpCdMin: 0.6,
            jumpCdMax: 0.9,
            landingVuln: 0.90,
            slamEvery: 0,
            dashEvery: 0,
            phaseDamageMult: 0.85,
            shootBase: 1.00,
            shootJitter: 0.22
        };
    }

    /**
     * Возвращает короткую метку фазы для HUD.
     * @returns {string}
     */
    getPhaseLabel() {
        if (this.phase === 4) return '\u042F\u0440\u043E\u0441\u0442\u044C';
        return `\u0424${this.phase}`;
    }

    /**
     * Возвращает true, если с прошлого кадра была смена фазы.
     * @returns {boolean}
     */
    consumePhaseTransition() {
        if (!this.phaseTransitionPending) return false;
        this.phaseTransitionPending = false;
        return true;
    }

    /**
     * Возвращает true, если открыт период уязвимости.
     * @returns {boolean}
     */
    isVulnerable() {
        return this.vulnerabilityTimer > 0;
    }

    /**
     * Возвращает true, если босс в воздухе.
     * @returns {boolean}
     */
    isInAir() {
        return this.isJumping || this.y < this.baseY - 1;
    }

    /**
     * Возвращает множитель урона фазы.
     * @returns {number}
     */
    getPhaseDamageMultiplier() {
        return this.getPhaseConfig().phaseDamageMult;
    }

    /**
     * Рассчитывает и применяет урон по боссу с учетом состояния и фазы.
     * @param {number} baseDamage - базовый урон (обычно 1, бонусная пуля 2).
     * @returns {{damage:number, vulnerable:boolean, killed:boolean}}
     */
    takeHit(baseDamage) {
        if (this.hp <= 0) {
            return { damage: 0, vulnerable: false, killed: true };
        }

        const vulnerable = this.isVulnerable();
        const postureMult = this.isInAir() ? 0.5 : (vulnerable ? 1.0 : 0.5);
        const phaseMult = this.getPhaseDamageMultiplier();
        const raw = baseDamage * postureMult * phaseMult;
        const damage = Math.max(1, Math.ceil(raw));

        this.hp = Math.max(0, this.hp - damage);
        return { damage, vulnerable, killed: this.hp <= 0 };
    }

    /**
     * Открывает окно уязвимости.
     * @param {number} seconds - длительность окна.
     */
    openVulnerability(seconds) {
        this.vulnerabilityTimer = Math.max(this.vulnerabilityTimer, seconds);
    }

    /**
     * Запускает нелинейный "человеческий" прыжок.
     * @param {number|null} duration - длительность прыжка.
     * @param {number|null} height - высота прыжка.
     */
    startJump(duration = null, height = null) {
        this.isJumping = true;
        this.jumpTimer = 0;
        this.jumpDuration = duration || this.rand(0.8, 1.25);
        const minH = this.h * 0.62;
        const maxH = this.h * 1.0; // не выше собственного роста
        this.jumpHeight = Math.min(this.h, Math.max(minH, height || this.rand(minH, maxH)));
        this.jumpAscentRatio = this.rand(0.40, 0.48);
    }

    /**
     * Обновляет текущий прыжок.
     * @param {number} dt - время кадра, сек.
     * @returns {boolean} true, если произошла посадка.
     */
    updateJump(dt) {
        if (!this.isJumping) return false;
        this.jumpTimer += dt;
        const t = Math.min(1, this.jumpTimer / this.jumpDuration);

        // Нелинейная дуга: быстрый набор высоты и более "тяжелое" падение.
        let k = 0;
        if (t < this.jumpAscentRatio) {
            const p = t / this.jumpAscentRatio;
            k = 1 - Math.pow(1 - p, 2.3);
        } else {
            const p = (t - this.jumpAscentRatio) / (1 - this.jumpAscentRatio);
            k = Math.max(0, 1 - Math.pow(p, 1.35));
        }
        this.y = this.baseY - this.jumpHeight * k;

        if (t >= 1) {
            this.isJumping = false;
            this.jumpTimer = 0;
            this.y = this.baseY;
            return true;
        }
        return false;
    }

    /**
     * Обновляет случайную смену направления.
     * @param {number} dt - время кадра, сек.
     * @param {boolean} lowRandomness - уменьшенная случайность (для ярости).
     */
    updateDirection(dt, lowRandomness = false) {
        this.dirTimer += dt;
        if (this.dirTimer >= this.nextDirChange) {
            this.dirTimer = 0;
            this.nextDirChange = lowRandomness ? this.rand(1.6, 2.3) : this.rand(1.1, 2.4);

            // В режиме ярости направление чаще выбирается в сторону игрока.
            if (lowRandomness && Math.random() < 0.75) {
                const px = player.x + player.w * 0.5;
                const bx = this.x + this.w * 0.5;
                this.dir = (px < bx) ? -1 : 1;
            } else {
                this.dir *= -1;
            }
        }
    }

    /**
     * Применяет горизонтальное движение и удерживает босса в правой зоне.
     * @param {number} dt - время кадра, сек.
     * @param {number} speedMult - множитель скорости.
     */
    moveHorizontally(dt, speedMult) {
        const moveBal = (this.mobileBalance && this.mobileBalance.enemyMoveSpeed) ? this.mobileBalance.enemyMoveSpeed : 1;
        this.x += this.dir * this.baseWalkSpeed * speedMult * moveBal * dt;
        if (this.x <= this.minX) {
            this.x = this.minX;
            this.dir = 1;
        } else if (this.x >= this.maxX) {
            this.x = this.maxX;
            this.dir = -1;
        }
        this.facingDir = (this.dir < 0) ? 'left' : 'right';
    }

    /**
     * Запускает телеграф удара о землю.
     */
    startGroundSlamTelegraph() {
        if (this.state !== 'normal') return;
        this.state = 'slamTelegraph';
        this.stateTimer = 0;
    }

    /**
     * Активирует волну удара о землю.
     */
    activateGroundWave() {
        this.groundWave.active = true;
        this.groundWave.timer = 0;
        this.groundWave.duration = 0.55;
        this.groundWave.maxRadius = canvas.width * 0.40;
        this.groundWave.currentRadius = 0;
        this.groundWave.centerX = this.x + this.w * 0.5;
        this.groundWave.groundY = canvas.height - Math.max(8, Math.round(20 * (this.mobileAdaptiveScale || 1)));
        if (window.BHAudio) {
            window.BHAudio.play('slam_impact', { volumeMul: 1.0, duck: 0.8 });
        }
    }

    /**
     * Запускает телеграф рывка.
     * @param {boolean} shortDash - короткий рывок (используется в ярости).
     */
    startDashTelegraph(shortDash = false) {
        if (this.state !== 'normal') return;
        this.pendingShortDash = shortDash;
        this.state = 'dashTelegraph';
        this.stateTimer = 0;
        this.dashTelegraphDuration = shortDash ? 0.15 : 0.35;
        if (window.BHAudio) {
            window.BHAudio.play('dash_whoosh', { volumeMul: shortDash ? 0.8 : 1.0, playbackRate: shortDash ? 1.2 : 1.0, duck: 0.9 });
        }
    }

    /**
     * Запускает рывок после телеграфа.
     * @param {boolean} shortDash - короткий рывок.
     */
    startDash(shortDash = false) {
        this.state = 'dashing';
        this.stateTimer = 0;
        this.dashDuration = shortDash ? 0.10 : 0.25;

        const bossCenter = this.x + this.w * 0.5;
        const playerCenter = player.x + player.w * 0.5;
        let preferredDir = (playerCenter < bossCenter) ? -1 : 1;
        const maxLen = canvas.width * (shortDash ? 0.14 : 0.22);

        const leftRoom = this.x - this.minX;
        const rightRoom = this.maxX - this.x;
        let dashLen = maxLen;
        if (preferredDir < 0) {
            dashLen = Math.min(maxLen, leftRoom);
        } else {
            dashLen = Math.min(maxLen, rightRoom);
        }

        // Если в выбранном направлении места мало, пробуем противоположное.
        if (dashLen < 24) {
            preferredDir *= -1;
            if (preferredDir < 0) dashLen = Math.min(maxLen, leftRoom);
            else dashLen = Math.min(maxLen, rightRoom);
        }

        this.dashFromX = this.x;
        this.dashToX = this.x + preferredDir * dashLen;
        this.dashToX = Math.max(this.minX, Math.min(this.maxX, this.dashToX));
        this.dir = preferredDir;
        this.facingDir = (this.dir < 0) ? 'left' : 'right';
    }

    /**
     * Обновляет активные спец-состояния.
     * @param {number} dt - время кадра, сек.
     * @returns {boolean} true, если обычная логика движения/прыжка должна быть пропущена.
     */
    updateSpecialStates(dt) {
        if (this.state === 'slamTelegraph') {
            this.stateTimer += dt;
            if (this.stateTimer < 0.2) return true;
            this.state = 'normal';
            this.stateTimer = 0;
            this.activateGroundWave();
            return false;
        }

        if (this.state === 'dashTelegraph') {
            this.stateTimer += dt;
            if (this.stateTimer < this.dashTelegraphDuration) return true;
            this.startDash(this.pendingShortDash);
            return true;
        }

        if (this.state === 'dashing') {
            this.stateTimer += dt;
            const t = Math.min(1, this.stateTimer / this.dashDuration);
            const eased = 1 - Math.pow(1 - t, 3);
            this.x = this.dashFromX + (this.dashToX - this.dashFromX) * eased;
            this.x = Math.max(this.minX, Math.min(this.maxX, this.x));

            if (t < 1) return true;

            this.state = 'normal';
            this.stateTimer = 0;
            this.dashFinishedSignal = true;

            // В Ф3 уязвимость наступает после рывка.
            if (this.phase === 3) {
                this.openVulnerability(0.55);
            }
            return false;
        }

        return false;
    }

    /**
     * Обновляет волну удара о землю.
     * @param {number} dt - время кадра, сек.
     */
    updateGroundWave(dt) {
        if (!this.groundWave.active) return;
        this.groundWave.timer += dt;
        const t = Math.min(1, this.groundWave.timer / this.groundWave.duration);
        this.groundWave.currentRadius = this.groundWave.maxRadius * t;
        if (t >= 1) {
            this.groundWave.active = false;
            this.groundWave.timer = 0;
            this.groundWave.currentRadius = 0;
        }
    }

    /**
     * Возвращает true, если рывок сейчас наносит контактный урон.
     * @returns {boolean}
     */
    isDashDangerActive() {
        return this.state === 'dashing';
    }

    /**
     * Возвращает хитбокс рывка.
     * @returns {{x:number, y:number, w:number, h:number}}
     */
    getDashHitbox() {
        return {
            x: this.x + this.w * 0.08,
            y: this.y + this.h * 0.12,
            w: this.w * 0.84,
            h: this.h * 0.84
        };
    }

    /**
     * Проверяет, попал ли игрок под наземную волну.
     * @param {{x:number,y:number,w:number,h:number}} target - цель (игрок).
     * @returns {boolean}
     */
    isTargetHitByGroundWave(target) {
        if (!this.groundWave.active) return false;

        // Волну получает только цель, стоящая на земле.
        const grounded = target.y + target.h >= canvas.height - 25;
        if (!grounded) return false;

        const tx = target.x + target.w * 0.5;
        const dx = Math.abs(tx - this.groundWave.centerX);
        return dx <= (this.groundWave.currentRadius + target.w * 0.35);
    }

    /**
     * Применяет логику посадки в обычных фазах (Ф1-Ф3).
     * @param {{
     *   landingVuln:number,
     *   slamEvery:number,
     *   dashEvery:number,
     *   jumpCdMin:number,
     *   jumpCdMax:number
     * }} cfg - конфиг текущей фазы.
     */
    onLandingStandard(cfg) {
        this.landingCount += 1;
        this.openVulnerability(cfg.landingVuln);

        if (cfg.slamEvery > 0 && this.landingCount % cfg.slamEvery === 0) {
            this.pendingSlam = true;
        }
        if (cfg.dashEvery > 0 && this.landingCount % cfg.dashEvery === 0) {
            this.pendingDash = true;
        }

        this.jumpCooldown = this.rand(cfg.jumpCdMin, cfg.jumpCdMax);
    }

    /**
     * Обновляет complex-логику фаз 1-3.
     * @param {number} dt - время кадра, сек.
     * @param {{
     *   speedMult:number,
     *   jumpCdMin:number,
     *   jumpCdMax:number
     * }} cfg - конфиг фазы.
     */
    updateComplexStandard(dt, cfg) {
        const busy = this.updateSpecialStates(dt);
        if (busy) return;

        this.updateDirection(dt, false);
        this.moveHorizontally(dt, cfg.speedMult);

        if (this.isJumping) {
            const landed = this.updateJump(dt);
            if (landed) {
                this.onLandingStandard(this.getPhaseConfig());
            }
            return;
        }

        if (this.pendingSlam) {
            this.pendingSlam = false;
            this.startGroundSlamTelegraph();
            return;
        }

        if (this.pendingDash) {
            this.pendingDash = false;
            this.startDashTelegraph(false);
            return;
        }

        this.jumpCooldown -= dt;
        if (this.jumpCooldown <= 0) {
            this.startJump();
            this.jumpCooldown = this.rand(cfg.jumpCdMin, cfg.jumpCdMax);
        }
    }

    /**
     * Обновляет сложный цикл фазы ярости (Ф4).
     * Цикл: 2 прыжка -> удар о землю -> короткий рывок -> длинная уязвимость.
     * @param {number} dt - время кадра, сек.
     * @param {{speedMult:number}} cfg - конфиг текущей фазы.
     */
    updateRageCycle(dt, cfg) {
        const ultRate = Math.max(1, this.ultFrequencyMul || 1);
        const t = (v) => v / ultRate;
        const busy = this.updateSpecialStates(dt);
        if (busy) return;

        this.updateDirection(dt, true);
        this.moveHorizontally(dt, cfg.speedMult);

        if (this.isJumping) {
            const landed = this.updateJump(dt);
            if (landed) {
                if (this.rageState === 'jump1') {
                    this.rageState = 'jump2_delay';
                    this.rageTimer = 0;
                } else if (this.rageState === 'jump2') {
                    this.rageState = 'slam_delay';
                    this.rageTimer = 0;
                }
            }
            return;
        }

        if (this.dashFinishedSignal && this.rageState === 'dash_wait') {
            this.dashFinishedSignal = false;
            this.openVulnerability(0.9);
            this.rageState = 'recover';
            this.rageTimer = 0;
            return;
        }

        this.rageTimer += dt;
        switch (this.rageState) {
            case 'inactive':
            case 'jump1_delay': {
                if (this.rageTimer >= t(0.12)) {
                    this.startJump(t(0.82), this.h * 0.72);
                    this.rageState = 'jump1';
                    this.rageTimer = 0;
                }
                break;
            }
            case 'jump2_delay': {
                if (this.rageTimer >= t(0.34)) {
                    this.startJump(t(0.86), this.h * 0.78);
                    this.rageState = 'jump2';
                    this.rageTimer = 0;
                }
                break;
            }
            case 'slam_delay': {
                if (this.rageTimer >= t(0.24)) {
                    this.startGroundSlamTelegraph();
                    this.rageState = 'slam_wait';
                    this.rageTimer = 0;
                }
                break;
            }
            case 'slam_wait': {
                if (this.state === 'normal' && !this.groundWave.active) {
                    this.rageState = 'dash_delay';
                    this.rageTimer = 0;
                }
                break;
            }
            case 'dash_delay': {
                if (this.rageTimer >= t(0.22)) {
                    this.startDashTelegraph(true);
                    this.rageState = 'dash_wait';
                    this.rageTimer = 0;
                }
                break;
            }
            case 'dash_wait': {
                // Ожидаем сигнал завершения рывка.
                break;
            }
            case 'recover': {
                // Длинное безопасное окно после цикла.
                if (this.rageTimer >= t(1.95)) {
                    this.rageState = 'jump1_delay';
                    this.rageTimer = 0;
                }
                break;
            }
            default: {
                this.rageState = 'jump1_delay';
                this.rageTimer = 0;
                break;
            }
        }
    }

    /**
     * Обновляет частоту стрельбы по фазам.
     * @param {{shootBase:number, shootJitter:number}} cfg - конфиг фазы.
     */
    refreshShootInterval(cfg) {
        const hpK = (this.maxHp > 0) ? (this.hp / this.maxHp) : 1;
        const healthFactor = (1 - hpK) * 0.08;
        const fireRate = (this.mobileBalance && this.mobileBalance.enemyFireRate) ? this.mobileBalance.enemyFireRate : 1;
        const baseInterval = Math.max(0.62, cfg.shootBase + Math.random() * cfg.shootJitter - healthFactor);
        this.shootInterval = baseInterval / Math.max(0.2, fireRate);
    }

    /**
     * Возвращает количество снарядов в залпе.
     * @returns {number}
     */
    getShotCount() {
        // Ф1: 1-2 пули
        if (this.phase === 1) {
            return (Math.random() < 0.5) ? 1 : 2;
        }
        // Ф2: 2 или 3 пули (50/50)
        if (this.phase === 2) {
            return (Math.random() < 0.5) ? 2 : 3;
        }
        // Ф3: 3-5 пуль; добавление 4-й и 5-й пули по 50% на каждый шаг.
        if (this.phase === 3) {
            let count = 3;
            if (Math.random() < 0.5) count += 1;
            if (Math.random() < 0.5) count += 1;
            return count;
        }
        // Ф4: 4-6 пуль; добавление 5-й и 6-й пули по 50% на каждый шаг.
        let count = 4;
        if (Math.random() < 0.5) count += 1;
        if (Math.random() < 0.5) count += 1;
        return count;
    }

    /**
     * Выпускает залп снарядов в сторону игрока.
     */
    shoot() {
        const bx = this.x + this.w * 0.5;
        const by = this.y + this.h * 0.42;
        const px = player.x + player.w * 0.5;
        const py = player.y + player.h * 0.5;
        const baseAngle = Math.atan2(py - by, px - bx);

        const count = this.getShotCount();
        let spread = 0;
        if (count === 2) spread = 0.16;
        else if (count === 3) spread = 0.22;
        else if (count <= 5) spread = 0.17;
        else spread = 0.13;

        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * spread;
            const angle = baseAngle + offset;
            const projBal = (this.mobileBalance && this.mobileBalance.enemyProjectileSpeed) ? this.mobileBalance.enemyProjectileSpeed : 1;
            const speed = (3.6 + Math.random() * 1.1) * projBal; // px/frame
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const sizeScale = 1 + Math.random() * 1.5; // 1.0x .. 2.5x
            const size = Math.round(this.basePoopSize * sizeScale);

            const img = (o4koPoopImgs.length > 0)
                ? o4koPoopImgs[Math.floor(Math.random() * o4koPoopImgs.length)]
                : null;

            enemyBullets.push({
                x: bx - size * 0.5,
                y: by - size * 0.5,
                w: size,
                h: size,
                vx,
                vy,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.07 + Math.random() * 0.05),
                emoji: '\u{1F4A9}',
                img,
                o4koPoop: true
            });
        }
        if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
            window.BHAudio.playEnemyShoot('o4ko');
        }
    }

    /**
     * Обновляет стрельбу босса в complex-режиме.
     * @param {number} dt - время кадра, сек.
     * @param {{shootBase:number, shootJitter:number}} cfg - конфиг фазы.
     */
    updateShooting(dt, cfg) {
        // Во время телеграфа/рывка стрельбу блокируем для читаемости.
        if (this.state !== 'normal') return;

        this.attackTimer += dt;
        if (this.attackTimer < this.attackDelay) return;

        this.shootTimer += dt;
        if (this.shootTimer < this.shootInterval) return;

        this.shootTimer = 0;
        this.shoot();
        this.refreshShootInterval(cfg);
    }

    /**
     * Обновляет фазу и переводит состояние при смене фазы.
     */
    updatePhase() {
        const nextPhase = this.getPhaseByHp();
        if (nextPhase === this.phase) return;

        this.phase = nextPhase;
        this.phaseTransitionPending = true;
        this.pendingSlam = false;
        this.pendingDash = false;
        this.state = 'normal';
        this.stateTimer = 0;
        this.dashFinishedSignal = false;

        if (this.phase === 4) {
            this.rageState = 'jump1_delay';
            this.rageTimer = 0;
        } else {
            this.rageState = 'inactive';
            this.rageTimer = 0;
        }
        if (window.BHAudio) {
            window.BHAudio.play('phase_up', { volumeMul: 1.0, duck: 0.78 });
        }
    }

    /**
     * Обновляет босса за кадр.
     * @param {number} dt - время кадра, сек.
     */
    update(dt) {
        if (this.hp <= 0) return;

        this.refreshBounds();
        this.updatePhase();
        this.updateGroundWave(dt);
        if (this.vulnerabilityTimer > 0) {
            this.vulnerabilityTimer = Math.max(0, this.vulnerabilityTimer - dt);
        }

        const cfg = this.getPhaseConfig();
        if (this.phase === 4) {
            this.updateRageCycle(dt, cfg);
        } else {
            this.updateComplexStandard(dt, cfg);
        }
        this.updateShooting(dt, cfg);

        // Анимация спрайтов.
        this.animTimer += dt;
        const interval = this.isJumping ? this.animIntervalJump : this.animIntervalWalk;
        if (this.animTimer >= interval) {
            this.animTimer = 0;
            this.frame = (this.frame + 1) % 6;
        }
    }

    /**
     * Рисует кадр спрайта босса с учетом направления.
     * @param {CanvasRenderingContext2D} targetCtx - контекст отрисовки.
     * @param {HTMLImageElement} img - текущий кадр спрайта.
     * @param {number} x - координата X.
     * @param {number} y - координата Y.
     * @param {boolean} facingLeft - true, если босс смотрит влево.
     */
    drawSpriteFrame(targetCtx, img, x, y, facingLeft) {
        targetCtx.save();
        if (facingLeft) {
            targetCtx.translate(x + this.w, y);
            targetCtx.scale(-1, 1);
            targetCtx.drawImage(img, 0, 0, this.w, this.h);
        } else {
            targetCtx.drawImage(img, x, y, this.w, this.h);
        }
        targetCtx.restore();
    }

    /**
     * Возвращает вспомогательный canvas с контуром по альфа-маске спрайта.
     * @param {HTMLImageElement} img - текущий кадр спрайта.
     * @param {boolean} facingLeft - true, если босс смотрит влево.
     * @param {number} thickness - толщина контура.
     * @param {string} color - цвет контура.
     * @returns {HTMLCanvasElement}
     */
    getOutlineCanvas(img, facingLeft, thickness, color = '#ffffff') {
        const key = `${img.src}|${facingLeft ? 'L' : 'R'}|${Math.round(this.w)}|${Math.round(this.h)}|${thickness}|${color}`;
        if (this.outlineCache.has(key)) {
            return this.outlineCache.get(key);
        }

        const ow = Math.ceil(this.w + thickness * 2);
        const oh = Math.ceil(this.h + thickness * 2);
        const oc = document.createElement('canvas');
        oc.width = ow;
        oc.height = oh;
        const octx = oc.getContext('2d');
        const baseX = thickness;
        const baseY = thickness;

        const drawMaskAt = (x, y) => {
            octx.save();
            if (facingLeft) {
                octx.translate(x + this.w, y);
                octx.scale(-1, 1);
                octx.drawImage(img, 0, 0, this.w, this.h);
                octx.globalCompositeOperation = 'source-atop';
                octx.fillStyle = color;
                octx.fillRect(0, 0, this.w, this.h);
            } else {
                octx.drawImage(img, x, y, this.w, this.h);
                octx.globalCompositeOperation = 'source-atop';
                octx.fillStyle = color;
                octx.fillRect(x, y, this.w, this.h);
            }
            octx.restore();
        };

        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const dx = Math.round(Math.cos(a) * thickness);
            const dy = Math.round(Math.sin(a) * thickness);
            drawMaskAt(baseX + dx, baseY + dy);
        }

        // Удаляем исходный спрайт, чтобы остался только внешний контур.
        octx.save();
        octx.globalCompositeOperation = 'destination-out';
        if (facingLeft) {
            octx.translate(baseX + this.w, baseY);
            octx.scale(-1, 1);
            octx.drawImage(img, 0, 0, this.w, this.h);
        } else {
            octx.drawImage(img, baseX, baseY, this.w, this.h);
        }
        octx.restore();

        if (this.outlineCache.size > 24) {
            this.outlineCache.clear();
        }
        this.outlineCache.set(key, oc);
        return oc;
    }

    /**
     * Отрисовывает босса, телеграфы и волну.
     */
    draw() {
        if (o4koImgs.length < 6) return;
        const allLoaded = o4koSpritesReady >= 6 || o4koImgs.every(img => img.complete && img.naturalWidth > 0);
        if (!allLoaded) return;
        const img = o4koImgs[this.frame % o4koImgs.length];
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const facingLeft = this.facingDir === 'left';

        // Рисуем волну удара о землю.
        if (this.groundWave.active) {
            const t = Math.min(1, this.groundWave.timer / Math.max(0.0001, this.groundWave.duration));
            const alpha = 0.9 - t * 0.5;
            ctx.save();
            ctx.strokeStyle = `rgba(229,57,53,${alpha})`;
            ctx.lineWidth = Math.max(6, this.h * 0.07);
            ctx.beginPath();
            ctx.ellipse(
                this.groundWave.centerX,
                this.groundWave.groundY,
                this.groundWave.currentRadius,
                Math.max(10, this.groundWave.currentRadius * 0.14),
                0,
                0,
                Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
        }

        this.drawSpriteFrame(ctx, img, this.x, this.y, facingLeft);

        // Визуальная телеграфия по контуру фигуры (без прямоугольной рамки).
        if (this.state === 'dashTelegraph' || this.state === 'slamTelegraph') {
            const pulse = 0.35 + 0.25 * Math.sin((performance.now() * 0.012) + this.vulnerabilityFlashSeed);
            const color = (this.state === 'dashTelegraph') ? '#ffb300' : '#ff7043';
            const thickness = Math.max(2, Math.round(this.w * 0.032));
            const outline = this.getOutlineCanvas(img, facingLeft, thickness, color);
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.drawImage(outline, this.x - thickness, this.y - thickness);
            ctx.restore();
        }

        // Окно уязвимости: белый контур по фигуре, без прямоугольной рамки.
        if (this.isVulnerable()) {
            const pulse = 0.25 + 0.25 * Math.sin((performance.now() * 0.015) + this.vulnerabilityFlashSeed);
            const thickness = Math.max(2, Math.round(this.w * 0.03));
            const outline = this.getOutlineCanvas(img, facingLeft, thickness, '#ffffff');
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.drawImage(outline, this.x - thickness, this.y - thickness);
            ctx.restore();
        }
    }
}
