// ==== РљР›РђРЎРЎ Р‘РћРЎРЎРђ "РћР§РљРћ" ====
/**
 * Р‘РѕСЃСЃ СЂРµР¶РёРјР° "РћС‡РєРѕ": С…РѕРґРёС‚ РїРѕ Р»РµРІРѕР№ С‡Р°СЃС‚Рё СЌРєСЂР°РЅР° Рё РїРµСЂРёРѕРґРёС‡РµСЃРєРё РїСЂС‹РіР°РµС‚.
 */
class BossO4ko {
    /**
     * РЎРѕР·РґР°РµС‚ Р±РѕСЃСЃР° "РћС‡РєРѕ".
     * @param {number} playerX - РЅР°С‡Р°Р»СЊРЅР°СЏ X РїРѕР·РёС†РёСЏ РёРіСЂРѕРєР° (РґР»СЏ РѕСЂРёРµРЅС‚РёСЂР°).
     * @param {number} playerY - РЅР°С‡Р°Р»СЊРЅР°СЏ Y РїРѕР·РёС†РёСЏ РёРіСЂРѕРєР° (РґР»СЏ РѕСЂРёРµРЅС‚РёСЂР°).
     */
    constructor(playerX, playerY) {
        // Р Р°Р·РјРµСЂ Р±РѕСЃСЃР° = 1.5 СЂР°Р·РјРµСЂР° РёРіСЂРѕРєР°
        this.h = Math.max(48, player.h * 1.5);
        this.w = this.h;

        // Р”РІРёРіР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РІ Р»РµРІРѕР№ С‡Р°СЃС‚Рё СЌРєСЂР°РЅР°
        this.rightZoneStartRatio = 0.55;
        const rightStart = canvas.width * this.rightZoneStartRatio;
        const rightLimit = canvas.width - this.w - 20;
        this.minX = Math.max(20, Math.min(rightStart, rightLimit));
        this.maxX = Math.max(this.minX, rightLimit);
        this.x = this.maxX;

        // Р‘Р°Р·РѕРІР°СЏ "Р·РµРјР»СЏ" РґР»СЏ Р±РѕСЃСЃР°
        this.baseY = canvas.height - this.h - 20;
        this.y = this.baseY;

        // РҐРѕРґСЊР±Р°
        this.dir = Math.random() < 0.5 ? -1 : 1;
        this.facingDir = this.dir < 0 ? 'left' : 'right';
        this.walkSpeed = Math.max(70, canvas.width * 0.07); // px/s
        this.dirTimer = 0;
        this.nextDirChange = 1.2 + Math.random() * 1.8;

        // РќРµР»РёРЅРµР№РЅС‹Р№ РїСЂС‹Р¶РѕРє
        this.isJumping = false;
        this.jumpTimer = 0;
        this.jumpDuration = 0.95;
        this.jumpHeight = this.h * 0.75; // РЅРµ РІС‹С€Рµ РѕРґРЅРѕРіРѕ СЂРѕСЃС‚Р°
        this.jumpCooldown = 0.8 + Math.random() * 1.4;

        // РђРЅРёРјР°С†РёСЏ
        this.frame = 0;
        this.animTimer = 0;
        this.animIntervalWalk = 0.11;
        this.animIntervalJump = 0.13;

        // РҐРџ РєР°Рє Сѓ 67-СЂРµР¶РёРјР°
        this.hp = 20;
        this.maxHp = this.hp;
    }

    /**
     * РћР±РЅРѕРІР»СЏРµС‚ РґРІРёР¶РµРЅРёРµ, РїСЂС‹Р¶РѕРє Рё Р°РЅРёРјР°С†РёСЋ Р±РѕСЃСЃР°.
     * @param {number} dt - РїСЂРѕС€РµРґС€РµРµ РІСЂРµРјСЏ РєР°РґСЂР° РІ СЃРµРєСѓРЅРґР°С….
     */
    update(dt) {
        // РћР±РЅРѕРІР»СЏРµРј РіСЂР°РЅРёС†С‹ Р»РµРІРѕР№ Р·РѕРЅС‹, РµСЃР»Рё РїРѕРјРµРЅСЏР»СЃСЏ СЂР°Р·РјРµСЂ РѕРєРЅР°
        const rightStart = canvas.width * this.rightZoneStartRatio;
        const rightLimit = canvas.width - this.w - 20;
        this.minX = Math.max(20, Math.min(rightStart, rightLimit));
        this.maxX = Math.max(this.minX, rightLimit);
        this.baseY = canvas.height - this.h - 20;

        // РЎР»СѓС‡Р°Р№РЅР°СЏ СЃРјРµРЅР° РЅР°РїСЂР°РІР»РµРЅРёСЏ
        this.dirTimer += dt;
        if (this.dirTimer >= this.nextDirChange) {
            this.dirTimer = 0;
            this.nextDirChange = 1.1 + Math.random() * 2.0;
            this.dir *= -1;
        }

        // РҐРѕРґСЊР±Р° РІР»РµРІРѕ-РІРїСЂР°РІРѕ
        this.x += this.dir * this.walkSpeed * dt;
        if (this.x <= this.minX) {
            this.x = this.minX;
            this.dir = 1;
        } else if (this.x >= this.maxX) {
            this.x = this.maxX;
            this.dir = -1;
        }
        this.facingDir = this.dir < 0 ? 'left' : 'right';

        // РџСЂС‹Р¶РѕРє: РЅРµР»РёРЅРµР№РЅР°СЏ РґСѓРіР° С‡РµСЂРµР· СЃРёРЅСѓСЃ
        if (this.isJumping) {
            this.jumpTimer += dt;
            const t = Math.min(1, this.jumpTimer / this.jumpDuration);
            const arc = Math.sin(Math.PI * t); // 0 -> 1 -> 0
            this.y = this.baseY - this.jumpHeight * arc;
            if (t >= 1) {
                this.isJumping = false;
                this.jumpTimer = 0;
                this.y = this.baseY;
                this.jumpCooldown = 0.8 + Math.random() * 1.6;
            }
        } else {
            this.y = this.baseY;
            this.jumpCooldown -= dt;
            if (this.jumpCooldown <= 0) {
                this.startJump();
            }
        }

        // РђРЅРёРјР°С†РёСЏ: РёСЃРїРѕР»СЊР·СѓРµРј 6 РєР°РґСЂРѕРІ РІ Р»СЋР±РѕРј СЃРѕСЃС‚РѕСЏРЅРёРё
        this.animTimer += dt;
        const interval = this.isJumping ? this.animIntervalJump : this.animIntervalWalk;
        if (this.animTimer >= interval) {
            this.animTimer = 0;
            this.frame = (this.frame + 1) % 6;
        }
    }

    /**
     * Р—Р°РїСѓСЃРєР°РµС‚ РїСЂС‹Р¶РѕРє СЃ РѕРіСЂР°РЅРёС‡РµРЅРёРµРј РІС‹СЃРѕС‚С‹ РЅРµ Р±РѕР»СЊС€Рµ РѕРґРЅРѕРіРѕ СЂРѕСЃС‚Р° Р±РѕСЃСЃР°.
     */
    startJump() {
        this.isJumping = true;
        this.jumpTimer = 0;
        this.jumpDuration = 0.8 + Math.random() * 0.45;
        this.jumpHeight = Math.min(this.h, this.h * (0.62 + Math.random() * 0.35));
    }

    /**
     * РћС‚СЂРёСЃРѕРІС‹РІР°РµС‚ Р±РѕСЃСЃР° Рё РµРіРѕ РїРѕР»РѕСЃСѓ Р·РґРѕСЂРѕРІСЊСЏ.
     */
    draw() {
        if (o4koSpritesReady < 6 || o4koImgs.length < 6) return;
        const img = o4koImgs[this.frame % o4koImgs.length];
        if (!img || !img.complete) return;

        ctx.save();
        if (this.facingDir === 'left') {
            ctx.translate(this.x + this.w, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, this.w, this.h);
        } else {
            ctx.drawImage(img, this.x, this.y, this.w, this.h);
        }
        ctx.restore();
    }
}

