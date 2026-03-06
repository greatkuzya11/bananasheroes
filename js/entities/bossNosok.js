// ==== КЛАСС БОССА "НОСОК" ====
/**
 * Босс режима "Носок": вратарь у ворот с прыжком и стрельбой по игроку.
 */
class BossNosok {
    /**
     * Создает босса-вратаря.
     */
    constructor() {
        const adaptiveScale = (typeof isMobileAdaptiveCombatMode === 'function'
            && isMobileAdaptiveCombatMode('nosok')
            && typeof getMobileLandscapeAdaptiveScale === 'function')
            ? getMobileLandscapeAdaptiveScale('nosok')
            : 1;
        const mobileBalance = (window.BHMobileAdaptive
            && typeof window.BHMobileAdaptive.getBalance === 'function'
            && typeof window.BHMobileAdaptive.isActive === 'function'
            && window.BHMobileAdaptive.isActive('nosok'))
            ? window.BHMobileAdaptive.getBalance('nosok')
            : null;
        this.mobileAdaptiveScale = adaptiveScale;
        this.mobileBalance = mobileBalance || {
            enemyFireRate: 1,
            enemyProjectileSpeed: 1,
            enemyMoveSpeed: 1,
            bossMoveSpeed: 1,
            homing: 1
        };
        const minBody = Math.max(48, Math.round(72 * adaptiveScale));
        this.h = Math.max(minBody, player.h * 1.35);
        this.w = Math.max(minBody, this.h * 0.92);
        this.baseY = canvas.height - this.h - Math.max(8, Math.round(20 * adaptiveScale));

        this.goalX = canvas.width * 0.9;
        this.zoneWidth = canvas.width * 0.24;
        this.minX = this.goalX - this.zoneWidth;
        this.maxX = this.goalX - this.w - Math.max(6, Math.round(10 * adaptiveScale));
        this.homeX = this.maxX - this.w * 0.35;
        this.homeX = Math.max(this.minX, Math.min(this.maxX, this.homeX));

        this.x = this.homeX;
        this.y = this.baseY;
        this.vx = 0;
        this.vy = 0;
        this.facingDir = 'left';

        this.reaction = 5.2 * this.mobileBalance.enemyMoveSpeed;
        this.maxSpeed = canvas.width * 0.36 * this.mobileBalance.bossMoveSpeed;
        this.idleSwayTimer = 0;

        this.isJumping = false;
        this.jumpTimer = 0;
        this.jumpDuration = 0.94;
        this.jumpHeight = this.h * 0.72;
        this.jumpAscentRatio = 0.46;

        this.freezeTimer = 0;
        this.isFrozen = false;
        this.freezeLockX = this.x;
        this.freezeLockY = this.y;
        this.knockbackState = 'none'; // none | blast | return
        this.knockbackTimer = 0;
        this.returnDuration = 4.0;
        this.returnFromX = this.x;
        this.returnFromY = this.y;
        this.returnToX = this.homeX;
        this.returnToY = this.baseY;

        this.volleyTimer = 0;
        this.nextVolley = this.rand(1.6, 2.5) / Math.max(0.2, this.mobileBalance.enemyFireRate);
        this.fishVolleyTimer = 0;
        this.nextFishVolley = this.rand(1.05, 1.55) / Math.max(0.2, this.mobileBalance.enemyFireRate);

        this.frame = 0;
        this.animTimer = 0;
        this.animInterval = 0.11;

        this.maskCache = new Map();
        this.frozenTintCache = new Map();
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
     * Ставит босса в зону ворот при ресайзе экрана.
     */
    refreshBounds() {
        const adaptiveScale = (typeof isMobileAdaptiveCombatMode === 'function'
            && isMobileAdaptiveCombatMode('nosok')
            && typeof getMobileLandscapeAdaptiveScale === 'function')
            ? getMobileLandscapeAdaptiveScale('nosok')
            : (this.mobileAdaptiveScale || 1);
        const mobileBalance = (window.BHMobileAdaptive
            && typeof window.BHMobileAdaptive.getBalance === 'function'
            && typeof window.BHMobileAdaptive.isActive === 'function'
            && window.BHMobileAdaptive.isActive('nosok'))
            ? window.BHMobileAdaptive.getBalance('nosok')
            : this.mobileBalance;
        if (mobileBalance) this.mobileBalance = mobileBalance;
        this.mobileAdaptiveScale = adaptiveScale;
        this.reaction = 5.2 * (this.mobileBalance ? this.mobileBalance.enemyMoveSpeed : 1);
        this.maxSpeed = canvas.width * 0.36 * (this.mobileBalance ? this.mobileBalance.bossMoveSpeed : 1);
        this.baseY = canvas.height - this.h - Math.max(8, Math.round(20 * adaptiveScale));
        const goalPostX = (typeof nosokGoalSensor !== 'undefined' && nosokGoalSensor)
            ? nosokGoalSensor.x
            : canvas.width * 0.9;
        this.goalX = goalPostX;
        this.zoneWidth = canvas.width * 0.24;
        this.minX = this.goalX - this.zoneWidth;
        this.maxX = this.goalX - this.w - Math.max(6, Math.round(10 * adaptiveScale));
        this.homeX = this.maxX - this.w * 0.35;
        this.homeX = Math.max(this.minX, Math.min(this.maxX, this.homeX));
        if (this.knockbackState === 'none') {
            this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
        } else {
            // Во время динамита разрешаем улетать вправо/вверх за зону ворот.
            this.x = Math.max(-this.w * 0.5, Math.min(canvas.width - this.w * 0.05, this.x));
        }
        if (!this.isJumping && this.knockbackState === 'none') {
            this.y = this.baseY;
        }
    }

    /**
     * Замораживает босса на заданное время.
     * @param {number} seconds - длительность заморозки.
     */
    freeze(seconds) {
        this.freezeTimer = Math.max(this.freezeTimer, seconds);
        this.isFrozen = true;
        this.freezeLockX = this.x;
        this.freezeLockY = this.y;
        this.vx = 0;
        this.vy = 0;
        this.isJumping = false;
        this.jumpTimer = 0;
    }

    /**
     * Запускает эффект от динамита: взрывной отлет и возврат к воротам.
     */
    applyDynamiteBlast() {
        this.knockbackState = 'blast';
        this.knockbackTimer = 0;
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.vx = -canvas.width * 0.42;
        this.vy = -canvas.height * 0.98;
        explosions.push({
            x: this.x + this.w * 0.5,
            y: this.y + this.h * 0.55,
            timer: 0,
            size: this.w * 1.1,
            style: 'brown',
            duration: 0.62
        });
        if (window.BHAudio) {
            window.BHAudio.play('explosion_big', { volumeMul: 1.0, duck: 0.72 });
        }
    }

    /**
     * Запускает нелинейный прыжок.
     */
    startJump() {
        if (this.isJumping) return;
        this.isJumping = true;
        this.jumpTimer = 0;
        this.jumpDuration = this.rand(0.82, 1.12);
        this.jumpHeight = this.rand(this.h * 0.9, this.h * 1.5);
        this.jumpAscentRatio = this.rand(0.42, 0.49);
    }

    /**
     * Обновляет прыжок.
     * @param {number} dt - время кадра.
     */
    updateJump(dt) {
        if (!this.isJumping) return;
        this.jumpTimer += dt;
        const t = Math.min(1, this.jumpTimer / Math.max(0.0001, this.jumpDuration));
        let k = 0;
        if (t < this.jumpAscentRatio) {
            const p = t / Math.max(0.0001, this.jumpAscentRatio);
            k = 1 - Math.pow(1 - p, 2.2);
        } else {
            const p = (t - this.jumpAscentRatio) / Math.max(0.0001, (1 - this.jumpAscentRatio));
            k = Math.max(0, 1 - Math.pow(p, 1.4));
        }
        this.y = this.baseY - this.jumpHeight * k;
        if (t >= 1) {
            this.isJumping = false;
            this.jumpTimer = 0;
            this.y = this.baseY;
        }
    }

    /**
     * Выпускает вонючий носок по дуге в сторону игрока.
     */
    shootSock() {
        const sx = this.x + this.w * 0.55;
        const sy = this.y + this.h * 0.45;
        const px = player.x + player.w * 0.5;
        const py = player.y + player.h * 0.45;
        const leadT = this.rand(0.12, 0.28);
        const aimX = px + (player.vx || 0) * leadT + this.rand(-player.w * 0.28, player.w * 0.28);
        const aimY = py + this.rand(-player.h * 0.22, player.h * 0.12);
        const dx = aimX - sx;
        const dy = aimY - sy;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const speed = this.rand(canvas.width * 0.31, canvas.width * 0.44) * this.mobileBalance.enemyProjectileSpeed;
        const lift = this.rand(canvas.height * 0.13, canvas.height * 0.24);
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed - lift;
        const size = Math.max(26, this.w * 0.34);
        const curveAmp = this.rand(canvas.width * 0.010, canvas.width * 0.024);
        enemyBullets.push({
            x: sx - size * 0.5,
            y: sy - size * 0.5,
            w: size,
            h: size,
            vx,
            vy,
            gravity: canvas.height * this.rand(0.72, 0.90),
            homing: this.rand(0.34, 0.62) * this.mobileBalance.homing,
            curveAmp,
            curveFreq: this.rand(3.8, 7.2),
            curvePhase: Math.random() * Math.PI * 2,
            age: 0,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * this.rand(2.2, 4.1),
            nosokSock: true,
            img: stinkySockImg,
            fumePhase: Math.random() * Math.PI * 2,
            fumeTimer: 0,
            fumePuffs: []
        });
        if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
            window.BHAudio.playEnemyShoot('nosok');
        }
    }

    /**
     * Выпускает тухлую рыбу: быстрее, точнее и дальше, чем обычный носок.
     */
    shootFish() {
        const sx = this.x + this.w * 0.57;
        const sy = this.y + this.h * 0.38;
        const px = player.x + player.w * 0.5;
        const py = player.y + player.h * 0.44;
        const leadT = this.rand(0.24, 0.42);
        const aimX = px + (player.vx || 0) * leadT + this.rand(-player.w * 0.12, player.w * 0.12);
        const aimY = py + this.rand(-player.h * 0.12, player.h * 0.08);
        const dx = aimX - sx;
        const dy = aimY - sy;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const speed = this.rand(canvas.width * 0.46, canvas.width * 0.62) * this.mobileBalance.enemyProjectileSpeed;
        const lift = this.rand(canvas.height * 0.06, canvas.height * 0.14);
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed - lift;
        const size = Math.max(30, this.w * 0.4);
        const fishAspectRaw = (rottenFishImg && rottenFishImg.width > 0 && rottenFishImg.height > 0)
            ? (rottenFishImg.width / rottenFishImg.height)
            : 1.67;
        const fishAspect = Math.max(1.1, Math.min(4.0, fishAspectRaw));
        const fishW = size;
        const fishH = Math.max(12, fishW / fishAspect);
        const curveAmp = this.rand(canvas.width * 0.004, canvas.width * 0.011);
        enemyBullets.push({
            x: sx - fishW * 0.5,
            y: sy - fishH * 0.5,
            w: fishW,
            h: fishH,
            vx,
            vy,
            gravity: canvas.height * this.rand(0.46, 0.64),
            homing: this.rand(0.76, 1.08) * this.mobileBalance.homing,
            curveAmp,
            curveFreq: this.rand(4.1, 6.6),
            curvePhase: Math.random() * Math.PI * 2,
            age: 0,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * this.rand(3.2, 5.8),
            nosokFish: true,
            img: rottenFishImg,
            fumePhase: Math.random() * Math.PI * 2,
            fumeTimer: 0,
            fumePuffs: []
        });
        if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
            window.BHAudio.playEnemyShoot('nosok');
        }
    }

    /**
     * Обновляет поведение босса.
     * @param {number} dt - время кадра.
     * @param {{x:number,y:number,r:number,vx:number,vy:number}|null} ball - игровой мяч.
     */
    update(dt, ball) {
        this.refreshBounds();

        if (this.freezeTimer > 0) {
            this.freezeTimer = Math.max(0, this.freezeTimer - dt);
            this.isFrozen = this.freezeTimer > 0;
        } else {
            this.isFrozen = false;
        }

        if (this.knockbackState === 'blast') {
            this.knockbackTimer += dt;
            this.vy += canvas.height * 1.05 * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (this.knockbackTimer >= 0.9 || this.y >= this.baseY) {
                this.knockbackState = 'return';
                this.knockbackTimer = 0;
                this.returnFromX = this.x;
                this.returnFromY = this.y;
                this.returnToX = this.homeX;
                this.returnToY = this.baseY;
            }
            this.updateAnimation(dt);
            return;
        }

        if (this.knockbackState === 'return') {
            this.knockbackTimer += dt;
            const t = Math.min(1, this.knockbackTimer / Math.max(0.0001, this.returnDuration));
            const e = 1 - Math.pow(1 - t, 2.4);
            this.x = this.returnFromX + (this.returnToX - this.returnFromX) * e;
            this.y = this.returnFromY + (this.returnToY - this.returnFromY) * e;
            if (t >= 1) {
                this.knockbackState = 'none';
                this.x = this.returnToX;
                this.y = this.returnToY;
            }
            this.updateAnimation(dt);
            return;
        }

        if (ball) {
            this.facingDir = (ball.x < this.x + this.w * 0.5) ? 'left' : 'right';
        }

        if (this.isFrozen) {
            this.vx = 0;
            this.vy = 0;
            this.isJumping = false;
            this.jumpTimer = 0;
            this.x = Math.max(this.minX, Math.min(this.maxX, this.freezeLockX));
            this.y = Math.min(this.baseY, this.freezeLockY);
            this.updateAnimation(dt * 0.2);
            return;
        }

        if (ball) {
            const lookAhead = ball.vx * 0.12;
            const targetX = Math.max(this.minX, Math.min(this.maxX, ball.x - this.w * 0.5 + lookAhead));
            const dx = targetX - this.x;
            const wanted = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, dx * this.reaction));
            this.vx += (wanted - this.vx) * Math.min(1, dt * 8.0);
            this.x += this.vx * dt;
            this.x = Math.max(this.minX, Math.min(this.maxX, this.x));

            // Если мяч высоко рядом с воротами, вратарь подпрыгивает.
            if (!this.isJumping && ball.y < this.baseY - this.h * 0.55 && Math.abs((ball.x - this.x)) < canvas.width * 0.24) {
                if (Math.random() < 0.08 + dt * 2.4) {
                    this.startJump();
                }
            }

            const fishPhase = (typeof nosokGoals === 'number' && nosokGoals >= 5);
            if (fishPhase) {
                // После 5 голов босс полностью переключается на тухлую рыбу.
                this.volleyTimer = 0;
                this.fishVolleyTimer += dt;
                if (this.fishVolleyTimer >= this.nextFishVolley) {
                    this.fishVolleyTimer = 0;
                    this.nextFishVolley = this.rand(0.9, 1.38) / Math.max(0.2, this.mobileBalance.enemyFireRate);
                    this.shootFish();
                }
            } else {
                // До 5 голов босс кидается только носками.
                this.fishVolleyTimer = 0;
                this.volleyTimer += dt;
                if (this.volleyTimer >= this.nextVolley) {
                    this.volleyTimer = 0;
                    this.nextVolley = this.rand(1.6, 2.45) / Math.max(0.2, this.mobileBalance.enemyFireRate);
                    this.shootSock();
                }
            }
        } else {
            this.vx *= 0.84;
            this.idleSwayTimer += dt;
            this.x += Math.sin(this.idleSwayTimer * 2.6) * (canvas.width * 0.006) * dt * 60;
            this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
        }

        this.updateJump(dt);
        this.updateAnimation(dt);
    }

    /**
     * Обновляет кадр анимации.
     * @param {number} dt - время кадра.
     */
    updateAnimation(dt) {
        this.animTimer += dt;
        if (this.animTimer >= this.animInterval) {
            this.animTimer = 0;
            this.frame = (this.frame + 1) % 8;
        }
    }

    /**
     * Возвращает текущий кадр спрайта.
     * @returns {HTMLImageElement|null}
     */
    getCurrentImage() {
        if (nosokImgs.length < 8) return null;
        const allLoaded = nosokSpritesReady >= 8 || nosokImgs.every(img => img.complete && img.naturalWidth > 0);
        if (!allLoaded) return null;
        const img = nosokImgs[this.frame % nosokImgs.length];
        if (!img || !img.complete || img.naturalWidth === 0) return null;
        return img;
    }

    /**
     * Возвращает кэшированное изображение с синим "ледяным" tint по альфа-контуру.
     * @param {HTMLImageElement} img - исходный кадр спрайта.
     * @returns {HTMLCanvasElement}
     */
    getFrozenTintImage(img) {
        const key = `${img.src}|${Math.round(this.w)}|${Math.round(this.h)}`;
        if (this.frozenTintCache.has(key)) return this.frozenTintCache.get(key);

        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(this.w));
        c.height = Math.max(1, Math.round(this.h));
        const cctx = c.getContext('2d');
        cctx.clearRect(0, 0, c.width, c.height);
        cctx.drawImage(img, 0, 0, c.width, c.height);
        // source-atop применяем в offscreen-канвасе, чтобы tint был строго по непрозрачной части спрайта.
        cctx.globalCompositeOperation = 'source-atop';
        cctx.fillStyle = 'rgba(80,160,255,0.55)';
        cctx.fillRect(0, 0, c.width, c.height);
        cctx.globalCompositeOperation = 'source-over';

        if (this.frozenTintCache.size > 20) this.frozenTintCache.clear();
        this.frozenTintCache.set(key, c);
        return c;
    }

    /**
     * Возвращает кэш alpha-маски текущего кадра.
     * @returns {{data: Uint8ClampedArray, w: number, h: number}|null}
     */
    getMask() {
        const img = this.getCurrentImage();
        if (!img) return null;
        const flip = (this.facingDir === 'left') ? 'L' : 'R';
        const key = `${img.src}|${flip}|${Math.round(this.w)}|${Math.round(this.h)}`;
        if (this.maskCache.has(key)) return this.maskCache.get(key);

        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(this.w));
        c.height = Math.max(1, Math.round(this.h));
        const cctx = c.getContext('2d');
        cctx.clearRect(0, 0, c.width, c.height);
        if (this.facingDir === 'left') {
            cctx.save();
            cctx.translate(c.width, 0);
            cctx.scale(-1, 1);
            cctx.drawImage(img, 0, 0, c.width, c.height);
            cctx.restore();
        } else {
            cctx.drawImage(img, 0, 0, c.width, c.height);
        }
        const id = cctx.getImageData(0, 0, c.width, c.height);
        const mask = { data: id.data, w: c.width, h: c.height };
        if (this.maskCache.size > 18) this.maskCache.clear();
        this.maskCache.set(key, mask);
        return mask;
    }

    /**
     * Проверяет непрозрачность пикселя спрайта в мировой точке.
     * @param {number} wx - мировая X.
     * @param {number} wy - мировая Y.
     * @returns {boolean}
     */
    isOpaqueAtWorld(wx, wy) {
        if (wx < this.x || wy < this.y || wx >= this.x + this.w || wy >= this.y + this.h) return false;
        const mask = this.getMask();
        if (!mask) return false;
        const lx = Math.max(0, Math.min(mask.w - 1, Math.floor(wx - this.x)));
        const ly = Math.max(0, Math.min(mask.h - 1, Math.floor(wy - this.y)));
        const a = mask.data[(ly * mask.w + lx) * 4 + 3];
        return a > 24;
    }

    /**
     * Рисует босса.
     */
    draw() {
        const img = this.getCurrentImage();
        if (!img) return;
        const frozenImg = this.isFrozen ? this.getFrozenTintImage(img) : null;

        ctx.save();
        if (this.facingDir === 'left') {
            ctx.translate(this.x + this.w, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, this.w, this.h);
            if (frozenImg) {
                ctx.drawImage(frozenImg, 0, 0, this.w, this.h);
            }
        } else {
            ctx.drawImage(img, this.x, this.y, this.w, this.h);
            if (frozenImg) {
                ctx.drawImage(frozenImg, this.x, this.y, this.w, this.h);
            }
        }
        ctx.restore();
    }
}
