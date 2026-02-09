// ==== РљР›РђРЎРЎ Р‘РћРЎРЎРђ "РћР§РљРћ" ====
/**
 * Р‘РѕСЃСЃ СЂРµР¶РёРјР° "РћС‡РєРѕ":
 * - фазы боя, телеграфы, волна, рывок, стрельба
 */
class BossO4ko {
    /**
     * РЎРѕР·РґР°РµС‚ Р±РѕСЃСЃР° "РћС‡РєРѕ".
     * @param {number} playerX - СЃС‚Р°СЂС‚РѕРІР°СЏ РєРѕРѕСЂРґРёРЅР°С‚Р° РёРіСЂРѕРєР° X (РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РЅР°РїСЂСЏРјСѓСЋ, РѕСЃС‚Р°РІР»РµРЅР° РґР»СЏ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё).
     * @param {number} playerY - СЃС‚Р°СЂС‚РѕРІР°СЏ РєРѕРѕСЂРґРёРЅР°С‚Р° РёРіСЂРѕРєР° Y (РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РЅР°РїСЂСЏРјСѓСЋ, РѕСЃС‚Р°РІР»РµРЅР° РґР»СЏ СЃРѕРІРјРµСЃС‚РёРјРѕСЃС‚Рё).
     */
    constructor(playerX, playerY) {
        // Р Р°Р·РјРµСЂ Р±РѕСЃСЃР° = 1.5 СЂРѕСЃС‚Р° РёРіСЂРѕРєР°.
        this.h = Math.max(48, player.h * 1.5);
        this.w = this.h;

        // РџСЂР°РІР°СЏ Р·РѕРЅР° РґРІРёР¶РµРЅРёСЏ: РѕС‚ 55% С€РёСЂРёРЅС‹ СЌРєСЂР°РЅР° РґРѕ РїСЂР°РІРѕР№ РіСЂР°РЅРёС†С‹.
        // Левая четверть экрана недоступна боссу, по остальным 3/4 он может двигаться.
        this.rightZoneStartRatio = 0.25;
        this.minX = 0;
        this.maxX = 0;
        this.refreshBounds();
        this.x = this.maxX; // СЃРїР°РІРЅ СЃРїСЂР°РІР°
        this.y = this.baseY;

        // РҐРѕРґСЊР±Р°.
        this.baseWalkSpeed = Math.max(70, canvas.width * 0.07); // px/s
        this.dir = -1; // СЃС‚Р°СЂС‚ РІР»РµРІРѕ
        this.facingDir = 'left';
        this.dirTimer = 0;
        this.nextDirChange = this.rand(1.2, 2.6);

        // РџСЂС‹Р¶РѕРє.
        this.isJumping = false;
        this.jumpTimer = 0;
        this.jumpDuration = 0.95;
        this.jumpHeight = this.h * 0.75;
        this.jumpAscentRatio = 0.44;
        this.jumpCooldown = this.rand(0.9, 1.6);
        this.landingCount = 0;

        // РЎРѕСЃС‚РѕСЏРЅРёСЏ СЃРїРµС†РґРµР№СЃС‚РІРёР№.
        this.state = 'normal'; // normal | slamTelegraph | dashTelegraph | dashing
        this.stateTimer = 0;
        this.pendingSlam = false;
        this.pendingDash = false;
        this.pendingShortDash = false;

        // Р’РѕР»РЅР° РѕС‚ СѓРґР°СЂР° Рѕ Р·РµРјР»СЋ.
        this.groundWave = {
            active: false,
            timer: 0,
            duration: 0.55,
            maxRadius: canvas.width * 0.40,
            currentRadius: 0,
            centerX: this.x + this.w * 0.5,
            groundY: canvas.height - 20
        };

        // Р С‹РІРѕРє.
        this.dashFromX = this.x;
        this.dashToX = this.x;
        this.dashDuration = 0.25;
        this.dashTelegraphDuration = 0.35;
        this.dashFinishedSignal = false;

        // Р¤Р°Р·С‹ Рё СѓСЏР·РІРёРјРѕСЃС‚СЊ.
        this.hp = 120;
        this.maxHp = 120;
        this.phase = 1;
        this.phaseTransitionPending = false;
        this.vulnerabilityTimer = 0;
        this.vulnerabilityFlashSeed = Math.random() * 10;

        // Р РµР¶РёРј СЏСЂРѕСЃС‚Рё (Р¤4): С‡РёС‚Р°РµРјС‹Р№ С†РёРєР».
        this.rageState = 'inactive';
        this.rageTimer = 0;
        this.ultFrequencyMul = 2;

        // РЎС‚СЂРµР»СЊР±Р°.
        this.attackDelay = 1.35;
        this.attackTimer = 0;
        this.shootTimer = 0;
        this.shootInterval = 1.4;
        this.basePoopSize = 28;

        // РђРЅРёРјР°С†РёСЏ РєР°РґСЂРѕРІ.
        this.frame = 0;
        this.animTimer = 0;
        this.animIntervalWalk = 0.11;
        this.animIntervalJump = 0.13;
        this.outlineCache = new Map();
    }

    /**
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ СЃР»СѓС‡Р°Р№РЅРѕРµ С‡РёСЃР»Рѕ РІ РґРёР°РїР°Р·РѕРЅРµ.
     * @param {number} min - РјРёРЅРёРјСѓРј.
     * @param {number} max - РјР°РєСЃРёРјСѓРј.
     * @returns {number}
     */
    rand(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * РћР±РЅРѕРІР»СЏРµС‚ РіСЂР°РЅРёС†С‹ РґРІРёР¶РµРЅРёСЏ РІ РїСЂР°РІРѕР№ С‡Р°СЃС‚Рё СЌРєСЂР°РЅР°.
     */
    refreshBounds() {
        const rightStart = canvas.width * this.rightZoneStartRatio;
        const rightLimit = canvas.width - this.w - 20;
        this.minX = Math.max(20, Math.min(rightStart, rightLimit));
        this.maxX = Math.max(this.minX, rightLimit);
        this.baseY = canvas.height - this.h - 20;
    }

    /**
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ РЅРѕРјРµСЂ С„Р°Р·С‹ РїРѕ С‚РµРєСѓС‰РµРјСѓ HP.
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
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ РєРѕРЅС„РёРі С‚РµРєСѓС‰РµР№ С„Р°Р·С‹.
     * @param {number} [phase] - РЅРѕРјРµСЂ С„Р°Р·С‹.
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
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ РєРѕСЂРѕС‚РєСѓСЋ РјРµС‚РєСѓ С„Р°Р·С‹ РґР»СЏ HUD.
     * @returns {string}
     */
    getPhaseLabel() {
        if (this.phase === 4) return '\u042F\u0440\u043E\u0441\u0442\u044C';
        return `\u0424${this.phase}`;
    }

    /**
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ true, РµСЃР»Рё СЃ РїСЂРѕС€Р»РѕРіРѕ РєР°РґСЂР° Р±С‹Р»Р° СЃРјРµРЅР° С„Р°Р·С‹.
     * @returns {boolean}
     */
    consumePhaseTransition() {
        if (!this.phaseTransitionPending) return false;
        this.phaseTransitionPending = false;
        return true;
    }

    /**
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ true, РµСЃР»Рё РѕС‚РєСЂС‹С‚ РїРµСЂРёРѕРґ СѓСЏР·РІРёРјРѕСЃС‚Рё.
     * @returns {boolean}
     */
    isVulnerable() {
        return this.vulnerabilityTimer > 0;
    }

    /**
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ true, РµСЃР»Рё Р±РѕСЃСЃ РІ РІРѕР·РґСѓС…Рµ.
     * @returns {boolean}
     */
    isInAir() {
        return this.isJumping || this.y < this.baseY - 1;
    }

    /**
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ РјРЅРѕР¶РёС‚РµР»СЊ СѓСЂРѕРЅР° С„Р°Р·С‹.
     * @returns {number}
     */
    getPhaseDamageMultiplier() {
        return this.getPhaseConfig().phaseDamageMult;
    }

    /**
     * Р Р°СЃСЃС‡РёС‚С‹РІР°РµС‚ Рё РїСЂРёРјРµРЅСЏРµС‚ СѓСЂРѕРЅ РїРѕ Р±РѕСЃСЃСѓ СЃ СѓС‡РµС‚РѕРј СЃРѕСЃС‚РѕСЏРЅРёСЏ Рё С„Р°Р·С‹.
     * @param {number} baseDamage - Р±Р°Р·РѕРІС‹Р№ СѓСЂРѕРЅ (РѕР±С‹С‡РЅРѕ 1, Р±РѕРЅСѓСЃРЅР°СЏ РїСѓР»СЏ 2).
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
     * РћС‚РєСЂС‹РІР°РµС‚ РѕРєРЅРѕ СѓСЏР·РІРёРјРѕСЃС‚Рё.
     * @param {number} seconds - РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ РѕРєРЅР°.
     */
    openVulnerability(seconds) {
        this.vulnerabilityTimer = Math.max(this.vulnerabilityTimer, seconds);
    }

    /**
     * Р—Р°РїСѓСЃРєР°РµС‚ РЅРµР»РёРЅРµР№РЅС‹Р№ "С‡РµР»РѕРІРµС‡РµСЃРєРёР№" РїСЂС‹Р¶РѕРє.
     * @param {number|null} duration - РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ РїСЂС‹Р¶РєР°.
     * @param {number|null} height - РІС‹СЃРѕС‚Р° РїСЂС‹Р¶РєР°.
     */
    startJump(duration = null, height = null) {
        this.isJumping = true;
        this.jumpTimer = 0;
        this.jumpDuration = duration || this.rand(0.8, 1.25);
        const minH = this.h * 0.62;
        const maxH = this.h * 1.0; // РЅРµ РІС‹С€Рµ СЃРѕР±СЃС‚РІРµРЅРЅРѕРіРѕ СЂРѕСЃС‚Р°
        this.jumpHeight = Math.min(this.h, Math.max(minH, height || this.rand(minH, maxH)));
        this.jumpAscentRatio = this.rand(0.40, 0.48);
    }

    /**
     * РћР±РЅРѕРІР»СЏРµС‚ С‚РµРєСѓС‰РёР№ РїСЂС‹Р¶РѕРє.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
     * @returns {boolean} true, РµСЃР»Рё РїСЂРѕРёР·РѕС€Р»Р° РїРѕСЃР°РґРєР°.
     */
    updateJump(dt) {
        if (!this.isJumping) return false;
        this.jumpTimer += dt;
        const t = Math.min(1, this.jumpTimer / this.jumpDuration);

        // РќРµР»РёРЅРµР№РЅР°СЏ РґСѓРіР°: Р±С‹СЃС‚СЂС‹Р№ РЅР°Р±РѕСЂ РІС‹СЃРѕС‚С‹ Рё Р±РѕР»РµРµ "С‚СЏР¶РµР»РѕРµ" РїР°РґРµРЅРёРµ.
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
     * РћР±РЅРѕРІР»СЏРµС‚ СЃР»СѓС‡Р°Р№РЅСѓСЋ СЃРјРµРЅСѓ РЅР°РїСЂР°РІР»РµРЅРёСЏ.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
     * @param {boolean} lowRandomness - СѓРјРµРЅСЊС€РµРЅРЅР°СЏ СЃР»СѓС‡Р°Р№РЅРѕСЃС‚СЊ (РґР»СЏ СЏСЂРѕСЃС‚Рё).
     */
    updateDirection(dt, lowRandomness = false) {
        this.dirTimer += dt;
        if (this.dirTimer >= this.nextDirChange) {
            this.dirTimer = 0;
            this.nextDirChange = lowRandomness ? this.rand(1.6, 2.3) : this.rand(1.1, 2.4);

            // Р’ СЂРµР¶РёРјРµ СЏСЂРѕСЃС‚Рё РЅР°РїСЂР°РІР»РµРЅРёРµ С‡Р°С‰Рµ РІС‹Р±РёСЂР°РµС‚СЃСЏ РІ СЃС‚РѕСЂРѕРЅСѓ РёРіСЂРѕРєР°.
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
     * РџСЂРёРјРµРЅСЏРµС‚ РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ РґРІРёР¶РµРЅРёРµ Рё СѓРґРµСЂР¶РёРІР°РµС‚ Р±РѕСЃСЃР° РІ РїСЂР°РІРѕР№ Р·РѕРЅРµ.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
     * @param {number} speedMult - РјРЅРѕР¶РёС‚РµР»СЊ СЃРєРѕСЂРѕСЃС‚Рё.
     */
    moveHorizontally(dt, speedMult) {
        this.x += this.dir * this.baseWalkSpeed * speedMult * dt;
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
     * Р—Р°РїСѓСЃРєР°РµС‚ С‚РµР»РµРіСЂР°С„ СѓРґР°СЂР° Рѕ Р·РµРјР»СЋ.
     */
    startGroundSlamTelegraph() {
        if (this.state !== 'normal') return;
        this.state = 'slamTelegraph';
        this.stateTimer = 0;
    }

    /**
     * РђРєС‚РёРІРёСЂСѓРµС‚ РІРѕР»РЅСѓ СѓРґР°СЂР° Рѕ Р·РµРјР»СЋ.
     */
    activateGroundWave() {
        this.groundWave.active = true;
        this.groundWave.timer = 0;
        this.groundWave.duration = 0.55;
        this.groundWave.maxRadius = canvas.width * 0.40;
        this.groundWave.currentRadius = 0;
        this.groundWave.centerX = this.x + this.w * 0.5;
        this.groundWave.groundY = canvas.height - 20;
    }

    /**
     * Р—Р°РїСѓСЃРєР°РµС‚ С‚РµР»РµРіСЂР°С„ СЂС‹РІРєР°.
     * @param {boolean} shortDash - РєРѕСЂРѕС‚РєРёР№ СЂС‹РІРѕРє (РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РІ СЏСЂРѕСЃС‚Рё).
     */
    startDashTelegraph(shortDash = false) {
        if (this.state !== 'normal') return;
        this.pendingShortDash = shortDash;
        this.state = 'dashTelegraph';
        this.stateTimer = 0;
        this.dashTelegraphDuration = shortDash ? 0.15 : 0.35;
    }

    /**
     * Р—Р°РїСѓСЃРєР°РµС‚ СЂС‹РІРѕРє РїРѕСЃР»Рµ С‚РµР»РµРіСЂР°С„Р°.
     * @param {boolean} shortDash - РєРѕСЂРѕС‚РєРёР№ СЂС‹РІРѕРє.
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

        // Р•СЃР»Рё РІ РІС‹Р±СЂР°РЅРЅРѕРј РЅР°РїСЂР°РІР»РµРЅРёРё РјРµСЃС‚Р° РјР°Р»Рѕ, РїСЂРѕР±СѓРµРј РїСЂРѕС‚РёРІРѕРїРѕР»РѕР¶РЅРѕРµ.
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
     * РћР±РЅРѕРІР»СЏРµС‚ Р°РєС‚РёРІРЅС‹Рµ СЃРїРµС†-СЃРѕСЃС‚РѕСЏРЅРёСЏ.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
     * @returns {boolean} true, РµСЃР»Рё РѕР±С‹С‡РЅР°СЏ Р»РѕРіРёРєР° РґРІРёР¶РµРЅРёСЏ/РїСЂС‹Р¶РєР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РїСЂРѕРїСѓС‰РµРЅР°.
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

            // Р’ Р¤3 СѓСЏР·РІРёРјРѕСЃС‚СЊ РЅР°СЃС‚СѓРїР°РµС‚ РїРѕСЃР»Рµ СЂС‹РІРєР°.
            if (this.phase === 3) {
                this.openVulnerability(0.55);
            }
            return false;
        }

        return false;
    }

    /**
     * РћР±РЅРѕРІР»СЏРµС‚ РІРѕР»РЅСѓ СѓРґР°СЂР° Рѕ Р·РµРјР»СЋ.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
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
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ true, РµСЃР»Рё СЂС‹РІРѕРє СЃРµР№С‡Р°СЃ РЅР°РЅРѕСЃРёС‚ РєРѕРЅС‚Р°РєС‚РЅС‹Р№ СѓСЂРѕРЅ.
     * @returns {boolean}
     */
    isDashDangerActive() {
        return this.state === 'dashing';
    }

    /**
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ С…РёС‚Р±РѕРєСЃ СЂС‹РІРєР°.
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
     * РџСЂРѕРІРµСЂСЏРµС‚, РїРѕРїР°Р» Р»Рё РёРіСЂРѕРє РїРѕРґ РЅР°Р·РµРјРЅСѓСЋ РІРѕР»РЅСѓ.
     * @param {{x:number,y:number,w:number,h:number}} target - С†РµР»СЊ (РёРіСЂРѕРє).
     * @returns {boolean}
     */
    isTargetHitByGroundWave(target) {
        if (!this.groundWave.active) return false;

        // Р’РѕР»РЅСѓ РїРѕР»СѓС‡Р°РµС‚ С‚РѕР»СЊРєРѕ С†РµР»СЊ, СЃС‚РѕСЏС‰Р°СЏ РЅР° Р·РµРјР»Рµ.
        const grounded = target.y + target.h >= canvas.height - 25;
        if (!grounded) return false;

        const tx = target.x + target.w * 0.5;
        const dx = Math.abs(tx - this.groundWave.centerX);
        return dx <= (this.groundWave.currentRadius + target.w * 0.35);
    }

    /**
     * РџСЂРёРјРµРЅСЏРµС‚ Р»РѕРіРёРєСѓ РїРѕСЃР°РґРєРё РІ РѕР±С‹С‡РЅС‹С… С„Р°Р·Р°С… (Р¤1-Р¤3).
     * @param {{
     *   landingVuln:number,
     *   slamEvery:number,
     *   dashEvery:number,
     *   jumpCdMin:number,
     *   jumpCdMax:number
     * }} cfg - РєРѕРЅС„РёРі С‚РµРєСѓС‰РµР№ С„Р°Р·С‹.
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
     * РћР±РЅРѕРІР»СЏРµС‚ complex-Р»РѕРіРёРєСѓ С„Р°Р· 1-3.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
     * @param {{
     *   speedMult:number,
     *   jumpCdMin:number,
     *   jumpCdMax:number
     * }} cfg - РєРѕРЅС„РёРі С„Р°Р·С‹.
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
     * РћР±РЅРѕРІР»СЏРµС‚ СЃР»РѕР¶РЅС‹Р№ С†РёРєР» С„Р°Р·С‹ СЏСЂРѕСЃС‚Рё (Р¤4).
     * Р¦РёРєР»: 2 РїСЂС‹Р¶РєР° -> СѓРґР°СЂ Рѕ Р·РµРјР»СЋ -> РєРѕСЂРѕС‚РєРёР№ СЂС‹РІРѕРє -> РґР»РёРЅРЅР°СЏ СѓСЏР·РІРёРјРѕСЃС‚СЊ.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
     * @param {{speedMult:number}} cfg - РєРѕРЅС„РёРі С‚РµРєСѓС‰РµР№ С„Р°Р·С‹.
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
                // РћР¶РёРґР°РµРј СЃРёРіРЅР°Р» Р·Р°РІРµСЂС€РµРЅРёСЏ СЂС‹РІРєР°.
                break;
            }
            case 'recover': {
                // Р”Р»РёРЅРЅРѕРµ Р±РµР·РѕРїР°СЃРЅРѕРµ РѕРєРЅРѕ РїРѕСЃР»Рµ С†РёРєР»Р°.
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
     * РћР±РЅРѕРІР»СЏРµС‚ С‡Р°СЃС‚РѕС‚Сѓ СЃС‚СЂРµР»СЊР±С‹ РїРѕ С„Р°Р·Р°Рј.
     * @param {{shootBase:number, shootJitter:number}} cfg - РєРѕРЅС„РёРі С„Р°Р·С‹.
     */
    refreshShootInterval(cfg) {
        const hpK = (this.maxHp > 0) ? (this.hp / this.maxHp) : 1;
        const healthFactor = (1 - hpK) * 0.08;
        this.shootInterval = Math.max(0.62, cfg.shootBase + Math.random() * cfg.shootJitter - healthFactor);
    }

    /**
     * Р’РѕР·РІСЂР°С‰Р°РµС‚ РєРѕР»РёС‡РµСЃС‚РІРѕ СЃРЅР°СЂСЏРґРѕРІ РІ Р·Р°Р»РїРµ.
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
     * Р’С‹РїСѓСЃРєР°РµС‚ Р·Р°Р»Рї СЃРЅР°СЂСЏРґРѕРІ РІ СЃС‚РѕСЂРѕРЅСѓ РёРіСЂРѕРєР°.
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
            const speed = 3.6 + Math.random() * 1.1; // px/frame
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
    }

    /**
     * РћР±РЅРѕРІР»СЏРµС‚ СЃС‚СЂРµР»СЊР±Сѓ Р±РѕСЃСЃР° РІ complex-СЂРµР¶РёРјРµ.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
     * @param {{shootBase:number, shootJitter:number}} cfg - РєРѕРЅС„РёРі С„Р°Р·С‹.
     */
    updateShooting(dt, cfg) {
        // Р’Рѕ РІСЂРµРјСЏ С‚РµР»РµРіСЂР°С„Р°/СЂС‹РІРєР° СЃС‚СЂРµР»СЊР±Сѓ Р±Р»РѕРєРёСЂСѓРµРј РґР»СЏ С‡РёС‚Р°РµРјРѕСЃС‚Рё.
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
     * РћР±РЅРѕРІР»СЏРµС‚ С„Р°Р·Сѓ Рё РїРµСЂРµРІРѕРґРёС‚ СЃРѕСЃС‚РѕСЏРЅРёРµ РїСЂРё СЃРјРµРЅРµ С„Р°Р·С‹.
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
    }

    /**
     * РћР±РЅРѕРІР»СЏРµС‚ Р±РѕСЃСЃР° Р·Р° РєР°РґСЂ.
     * @param {number} dt - РІСЂРµРјСЏ РєР°РґСЂР°, СЃРµРє.
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

        // РђРЅРёРјР°С†РёСЏ СЃРїСЂР°Р№С‚РѕРІ.
        this.animTimer += dt;
        const interval = this.isJumping ? this.animIntervalJump : this.animIntervalWalk;
        if (this.animTimer >= interval) {
            this.animTimer = 0;
            this.frame = (this.frame + 1) % 6;
        }
    }

    /**
     * Рисует текущий кадр спрайта с учетом направления.
     * @param {CanvasRenderingContext2D} targetCtx - контекст отрисовки.
     * @param {HTMLImageElement} img - текущий кадр спрайта.
     * @param {number} x - координата X.
     * @param {number} y - координата Y.
     * @param {boolean} facingLeft - true, если спрайт нужно отзеркалить.
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
     * Возвращает кэшированный canvas c контуром по альфа-маске спрайта.
     * @param {HTMLImageElement} img - текущий кадр спрайта.
     * @param {boolean} facingLeft - true, если спрайт нужно отзеркалить.
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

        // Вырезаем внутреннюю часть, чтобы остался только контур.
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
     * РћС‚СЂРёСЃРѕРІС‹РІР°РµС‚ Р±РѕСЃСЃР°, С‚РµР»РµРіСЂР°С„С‹ Рё РІРѕР»РЅСѓ.
     */
    draw() {
        if (o4koSpritesReady < 6 || o4koImgs.length < 6) return;
        const img = o4koImgs[this.frame % o4koImgs.length];
        if (!img || !img.complete) return;
        const facingLeft = this.facingDir === 'left';

        // Р РёСЃСѓРµРј РІРѕР»РЅСѓ СѓРґР°СЂР° Рѕ Р·РµРјР»СЋ.
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

        // Р’РёР·СѓР°Р»СЊРЅР°СЏ С‚РµР»РµРіСЂР°С„РёСЏ РїРѕ РєРѕРЅС‚СѓСЂСѓ С„РёРіСѓСЂС‹ (Р±РµР· РїСЂСЏРјРѕСѓРіРѕР»СЊРЅРѕР№ СЂР°РјРєРё).
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

        // Эффект уязвимости: контур только по фигуре, без прямоугольной рамки спрайта.
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
