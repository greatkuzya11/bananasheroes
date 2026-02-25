// ==== КЛАСС ВРАГА 67 ====
/**
 * Враг 67: декоративный противник с анимацией и покачиванием.
 */
class Enemy67 {
    // Совместимость со старым вызовом из draw.js.
    static hideGifOverlay() {}

    /**
     * Возвращает кэш альфа-канала для указанного прямоугольника источника.
     * @param {HTMLImageElement} img - изображение.
     * @param {number} sx - X источника.
     * @param {number} sy - Y источника.
     * @param {number} sw - ширина источника.
     * @param {number} sh - высота источника.
     * @returns {{w:number,h:number,data:Uint8ClampedArray}|null}
     */
    static getAlphaMask(img, sx, sy, sw, sh) {
        if (!img || sw <= 0 || sh <= 0) return null;
        if (!Enemy67._alphaCache) Enemy67._alphaCache = new Map();
        const key = `${img.src || 'img'}|${sx}|${sy}|${sw}|${sh}`;
        const cached = Enemy67._alphaCache.get(key);
        if (cached) return cached;

        const c = document.createElement('canvas');
        c.width = sw;
        c.height = sh;
        const cctx = c.getContext('2d', { willReadFrequently: true });
        if (!cctx) return null;

        cctx.clearRect(0, 0, sw, sh);
        cctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        let data = null;
        try {
            data = cctx.getImageData(0, 0, sw, sh).data;
        } catch (err) {
            return null;
        }

        const result = { w: sw, h: sh, data };
        Enemy67._alphaCache.set(key, result);
        return result;
    }

    /**
     * Создает врага 67 в зависимости от режима игры.
     * @param {number} playerX - начальная X позиция игрока (для ориентира).
     * @param {number} playerY - начальная Y позиция игрока (для ориентира).
     * @param {boolean} platformMode - true для режима платформ.
     */
    constructor(playerX, playerY, platformMode = false) {
        // Размер: высота = 1/2 экрана, но в режиме платформ больше (в 2.25 раза)
        this.h = platformMode ? (canvas.height * 0.3375) : (canvas.height * 0.5);
        this.w = this.h; // квадратный спрайт
        // Позиция: почти с правого угла или на платформе
        this.x = platformMode ? (bossPlatform.x + (bossPlatform.w - this.w) / 2) : (canvas.width - this.w - 20);
        this.y = platformMode ? (bossPlatform.y - this.h * 0.92) : (canvas.height - this.h - 20);
        // Анимация: отдельные интервалы для старого sheet и для покадрового tp.
        this.frame = 0;
        this.timer = 0;
        this.animIntervalSheet = 0.3;  // прежняя скорость старого спрайта 67
        this.animIntervalTp = 0.075;   // скорость покадровой PNG-анимации
        // Покачивание: сохраняем базовую позицию
        this.baseX = this.x;
        this.baseY = this.y;
        this.swayTime = 0;
        // Амплитуда и скорость покачивания
        this.swayAmplitudeX = platformMode ? 5 : 15; // меньше в режиме платформ
        this.swayAmplitudeY = platformMode ? 0 : 10; // не качается по вертикали на платформе
        this.swaySpeedX = 1.2;
        this.swaySpeedY = 1.5;
        // Здоровье (HP) и атака
        this.hp = platformMode ? 76 : 67; // 76 попаданий в режиме платформ
        this.maxHp = this.hp; // максимальное HP для полосы
        this.attackTimer = 0; // начинаем с 0
        this.attackDelay = platformMode ? 0 : 5.0; // в режиме 67 ждем 5 сек, на платформе сразу
        this.shootTimer = 0;
        this.shootInterval = 0.8; // в 3 раза быстрее сирени (~1 сек)
        this.bulletEmojis = ['🪳', '🧨', '7️⃣', '6️⃣', '💩'];
        // Движение к игроку
        this.moveSpeed = platformMode ? 0 : 50; // не движется в режиме платформ
        this.sizeIncreaseTimer = 0; // таймер для увеличения размера каждую секунду
        this.platformMode = platformMode; // флаг режима платформ
    }
    /**
     * Обновляет анимацию, позицию и стрельбу врага.
     * @param {number} dt - прошедшее время кадра в секундах.
     */
    update(dt) {
        // Анимация кадров
        const profile = this.getRenderProfile();
        const isTp = !!(profile && profile.type === 'tpFrames' && Array.isArray(profile.frames) && profile.frames.length > 0);
        const frameCount = isTp ? profile.frames.length : 2;
        const animInterval = isTp ? this.animIntervalTp : this.animIntervalSheet;
        this.timer += dt;
        while (this.timer >= animInterval) {
            this.frame = (this.frame + 1) % frameCount;
            this.timer -= animInterval;
        }
        
        // Атака
        this.attackTimer += dt;
        if (this.attackTimer >= this.attackDelay) {
            // В режиме платформ не увеличиваем размер
            if (!this.platformMode) {
                // После начала атаки увеличиваем размер каждую секунду на 5%
                this.sizeIncreaseTimer += dt;
                if (this.sizeIncreaseTimer >= 1.0) {
                    // Проверяем, не достиг ли размер 90% от экрана
                    const maxSize = Math.min(canvas.width, canvas.height) * 0.9;
                    if (this.w < maxSize && this.h < maxSize) {
                        // Каждую секунду увеличиваем размер на 5%
                        this.w *= 1.05;
                        this.h *= 1.05;
                    }
                    this.sizeIncreaseTimer = 0;
                }
            }
            
            // Движение к игроку (только не в режиме платформ)
            if (!this.platformMode) {
                const dx = player.x + player.w / 2 - (this.baseX + this.w / 2);
                const dy = player.y + player.h / 2 - (this.baseY + this.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 5) { // двигаемся только если не слишком близко
                    this.baseX += (dx / dist) * this.moveSpeed * dt;
                    this.baseY += (dy / dist) * this.moveSpeed * dt;
                }
                
                // Ограничиваем позицию в границах экрана
                this.baseX = Math.max(0, Math.min(canvas.width - this.w, this.baseX));
                this.baseY = Math.max(0, Math.min(canvas.height - this.h, this.baseY));
            } else if (bossPlatform) {
                // В режиме платформ держимся над платформой (с смещением вниз на 1/10 размера)
                this.baseX = bossPlatform.x + (bossPlatform.w - this.w) / 2;
                this.baseY = bossPlatform.y - this.h * 0.88; // чуть ниже, чтобы не висеть слишком высоко
            }
            
            // Стрельба
            this.shootTimer += dt;
            if (this.shootTimer >= this.shootInterval) {
                this.shoot();
                this.shootTimer = 0;
            }
        }
        
        // Покачивание относительно базовой позиции (с меньшей амплитудой чтобы не выходить за границы)
        this.swayTime += dt;
        const swayX = Math.sin(this.swayTime * this.swaySpeedX) * this.swayAmplitudeX;
        const swayY = Math.sin(this.swayTime * this.swaySpeedY) * this.swayAmplitudeY;
        
        // Применяем покачивание и проверяем границы
        this.x = Math.max(0, Math.min(canvas.width - this.w, this.baseX + swayX));
        this.y = Math.max(0, Math.min(canvas.height - this.h, this.baseY + swayY));
    }
    /**
     * Выпускает пулю врага 67 в сторону игрока.
     */
    shoot() {
        // Выбираем случайное эмодзи для пули
        const emoji = this.bulletEmojis[Math.floor(Math.random() * this.bulletEmojis.length)];
        // Пуля появляется из непрозрачной точки фигурки (без прозрачного фона).
        const spawn = this.getRandomOpaquePoint();
        const bx = spawn.x;
        const by = spawn.y;
        
        // Наводим на игрока
        const dx = player.x + player.w / 2 - bx;
        const dy = player.y + player.h / 2 - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 10; // в 5 раз медленнее начальной скорости (350/5=70)
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        
        enemyBullets.push({ x: bx, y: by, w: 16, h: 24, emoji, vx, vy });
        if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
            window.BHAudio.playEnemyShoot('67');
        }
    }

    /**
     * Возвращает текущий источник рендера врага 67 с учетом perf-настроек.
     * @returns {{type:'sheet', img: HTMLImageElement}|{type:'tpFrames', frames: HTMLImageElement[]}|null}
     */
    getRenderProfile() {
        const perf = window.BHBulletPerf;
        const renderMode = (perf && typeof perf.enemy67RenderMode === 'function')
            ? perf.enemy67RenderMode()
            : 'sheet';
        const spriteVariant = (perf && typeof perf.enemy67SpriteVariant === 'function')
            ? perf.enemy67SpriteVariant()
            : 'default';

        if (renderMode === 'tp' && Array.isArray(enemy67TpFrames) && enemy67TpFramesReady > 0) {
            return { type: 'tpFrames', frames: enemy67TpFrames };
        }

        if (spriteVariant === 'alt' && enemy67AltSpriteReady && enemy67AltImg && enemy67AltImg.complete) {
            return { type: 'sheet', img: enemy67AltImg };
        }

        if (enemy67SpriteReady && enemy67Img && enemy67Img.complete) {
            return { type: 'sheet', img: enemy67Img };
        }

        if (Array.isArray(enemy67TpFrames) && enemy67TpFramesReady > 0) {
            return { type: 'tpFrames', frames: enemy67TpFrames };
        }

        return null;
    }

    /**
     * Возвращает активный кадр источника для рендера/коллизии.
     * @returns {{img:HTMLImageElement,sx:number,sy:number,sw:number,sh:number}|null}
     */
    getCurrentSourceFrame() {
        const profile = this.getRenderProfile();
        if (!profile) return null;

        if (profile.type === 'tpFrames' && Array.isArray(profile.frames) && profile.frames.length > 0) {
            const frameImg = profile.frames[this.frame % profile.frames.length];
            const img = (frameImg && frameImg.complete) ? frameImg : profile.frames.find(f => f && f.complete);
            if (!img) return null;
            const sw = img.naturalWidth || img.width || 0;
            const sh = img.naturalHeight || img.height || 0;
            if (sw <= 0 || sh <= 0) return null;
            return { img, sx: 0, sy: 0, sw, sh };
        }

        if (profile.type === 'sheet' && profile.img && profile.img.complete) {
            const img = profile.img;
            const srcNaturalW = img.naturalWidth || img.width || 0;
            const srcNaturalH = img.naturalHeight || img.height || 0;
            if (srcNaturalW <= 0 || srcNaturalH <= 0) return null;
            if (srcNaturalW >= srcNaturalH * 1.8) {
                const sw = Math.max(1, Math.floor(srcNaturalW / 2));
                const sh = srcNaturalH;
                const sx = (this.frame % 2) * sw;
                return { img, sx, sy: 0, sw, sh };
            }
            return { img, sx: 0, sy: 0, sw: srcNaturalW, sh: srcNaturalH };
        }

        return null;
    }

    /**
     * Рисует кадр с сохранением пропорций внутри хитбокса врага.
     * @param {HTMLImageElement} img - изображение-источник.
     * @param {number} sx - X источника.
     * @param {number} sy - Y источника.
     * @param {number} sw - ширина источника.
     * @param {number} sh - высота источника.
     */
    drawContained(img, sx, sy, sw, sh) {
        const rect = this.getContainedRect(sw, sh);
        const dw = rect.w;
        const dh = rect.h;
        const dx = rect.x;
        const dy = rect.y;
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    /**
     * Считает прямоугольник вписывания источника внутрь контейнера врага.
     * @param {number} sw - ширина источника.
     * @param {number} sh - высота источника.
     * @returns {{x:number,y:number,w:number,h:number}}
     */
    getContainedRect(sw, sh) {
        const fit = Math.min(this.w / Math.max(1, sw), this.h / Math.max(1, sh));
        const dw = sw * fit;
        const dh = sh * fit;
        const dx = this.x + (this.w - dw) * 0.5;
        const dy = this.y + (this.h - dh) * 0.5;
        return { x: dx, y: dy, w: dw, h: dh };
    }

    /**
     * Возвращает видимый хитбокс врага (без прозрачных полей контейнера).
     * Используется для точной коллизии попаданий.
     * @returns {{x:number,y:number,w:number,h:number,cx:number,cy:number}}
     */
    getVisibleHitbox() {
        const fallback = {
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
            cx: this.x + this.w * 0.5,
            cy: this.y + this.h * 0.5
        };

        const src = this.getCurrentSourceFrame();
        if (!src) return fallback;

        const rect = this.getContainedRect(src.sw, src.sh);
        return {
            x: rect.x,
            y: rect.y,
            w: rect.w,
            h: rect.h,
            cx: rect.x + rect.w * 0.5,
            cy: rect.y + rect.h * 0.5
        };
    }

    /**
     * Проверяет, попадает ли точка в непрозрачный пиксель текущего кадра врага.
     * @param {number} px - X точки в координатах canvas.
     * @param {number} py - Y точки в координатах canvas.
     * @param {number} alphaThreshold - порог альфы (0-255).
     * @returns {boolean}
     */
    isOpaquePoint(px, py, alphaThreshold = 12) {
        const src = this.getCurrentSourceFrame();
        if (!src) return false;
        const rect = this.getContainedRect(src.sw, src.sh);
        if (px < rect.x || px > rect.x + rect.w || py < rect.y || py > rect.y + rect.h) return false;

        const mask = Enemy67.getAlphaMask(src.img, src.sx, src.sy, src.sw, src.sh);
        if (!mask) return true; // фолбек, если чтение пикселей недоступно

        const u = (px - rect.x) / Math.max(1e-6, rect.w);
        const v = (py - rect.y) / Math.max(1e-6, rect.h);
        const ix = Math.max(0, Math.min(src.sw - 1, Math.floor(u * src.sw)));
        const iy = Math.max(0, Math.min(src.sh - 1, Math.floor(v * src.sh)));
        const alpha = mask.data[(iy * src.sw + ix) * 4 + 3];
        return alpha >= alphaThreshold;
    }

    /**
     * Возвращает случайную непрозрачную точку текущего кадра врага.
     * @param {number} alphaThreshold - порог альфы (0-255).
     * @param {number} maxAttempts - число попыток случайного выбора.
     * @returns {{x:number,y:number}}
     */
    getRandomOpaquePoint(alphaThreshold = 12, maxAttempts = 40) {
        const src = this.getCurrentSourceFrame();
        if (!src) {
            return { x: this.x + this.w * 0.5, y: this.y + this.h * 0.5 };
        }

        const rect = this.getContainedRect(src.sw, src.sh);
        const mask = Enemy67.getAlphaMask(src.img, src.sx, src.sy, src.sw, src.sh);
        if (!mask) {
            return { x: rect.x + rect.w * 0.5, y: rect.y + rect.h * 0.5 };
        }

        for (let i = 0; i < maxAttempts; i++) {
            const ix = Math.floor(Math.random() * src.sw);
            const iy = Math.floor(Math.random() * src.sh);
            const alpha = mask.data[(iy * src.sw + ix) * 4 + 3];
            if (alpha >= alphaThreshold) {
                return {
                    x: rect.x + ((ix + 0.5) / src.sw) * rect.w,
                    y: rect.y + ((iy + 0.5) / src.sh) * rect.h
                };
            }
        }

        return { x: rect.x + rect.w * 0.5, y: rect.y + rect.h * 0.5 };
    }

    /**
     * Отрисовывает врага 67 на canvas.
     */
    draw() {
        const src = this.getCurrentSourceFrame();
        if (!src) return;
        this.drawContained(src.img, src.sx, src.sy, src.sw, src.sh);
    }
}



