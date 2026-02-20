// ==== РЕЖИМ "БИБЛИОТЕКА" ====

// Предзагрузка спрайтов книг — набор 1: br-1.png … br-7.png
const libraryBookImgs = [];
for (let i = 1; i <= 7; i++) {
    const img = new Image();
    img.src = `img/book/br-${i}.png`;
    libraryBookImgs.push(img);
}

// Предзагрузка спрайтов книг — набор 2: bg1.png … bg4.png
const libraryBookImgsBg = [];
for (let i = 1; i <= 4; i++) {
    const img = new Image();
    img.src = `img/book/bg${i}.png`;
    libraryBookImgsBg.push(img);
}

// Предзагрузка спрайтов книг — набор 3: bb-1.png … bb-8.png
const libraryBookImgsBb = [];
for (let i = 1; i <= 8; i++) {
    const img = new Image();
    // Фолбек для старого именования bb1.png, bb2.png...
    let triedFallback = false;
    img.onerror = () => {
        if (!triedFallback) {
            triedFallback = true;
            img.src = `img/book/bb${i}.png`;
        }
    };
    img.src = `img/book/bb-${i}.png`;
    libraryBookImgsBb.push(img);
}

// Состояние книг
let libraryBooks = [];           // массив активных книг
let libraryBooksSpawned = 0;     // счётчик заспавненных (для фаз)
let librarySpawnTimer = 0;       // таймер до следующего спавна
let libraryNextSpawnDelay = 1.5; // задержка до первого спавна
let libraryGroundY = 0;          // уровень пола

// Кэш пиксельных альфа-масок для изображений
const libraryAlphaMaskCache = new WeakMap();

/**
 * Возвращает набор спрайтов по идентификатору.
 * @param {'br'|'bg'|'bb'} spriteSet
 * @returns {HTMLImageElement[]}
 */
function getLibrarySpriteArray(spriteSet) {
    if (spriteSet === 'bg') return libraryBookImgsBg;
    if (spriteSet === 'bb') return libraryBookImgsBb;
    return libraryBookImgs;
}

/**
 * Возвращает альфа-маску изображения книги.
 * @param {HTMLImageElement} img
 * @returns {{w:number,h:number,data:Uint8ClampedArray}|null}
 */
function getLibraryAlphaMask(img) {
    if (!img || !img.complete || !(img.naturalWidth > 0) || !(img.naturalHeight > 0)) return null;
    const cached = libraryAlphaMaskCache.get(img);
    if (cached) return cached;

    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const cctx = c.getContext('2d', { willReadFrequently: true });
    if (!cctx) return null;

    cctx.clearRect(0, 0, c.width, c.height);
    cctx.drawImage(img, 0, 0);

    let data = null;
    try {
        data = cctx.getImageData(0, 0, c.width, c.height).data;
    } catch (_err) {
        return null;
    }

    const mask = { w: c.width, h: c.height, data };
    libraryAlphaMaskCache.set(img, mask);
    return mask;
}

/**
 * Возвращает текущий кадр спрайта книги.
 * @param {{spriteSet:string,animFrame:number}} bk
 * @returns {HTMLImageElement|null}
 */
function getLibraryBookFrameImage(bk) {
    const arr = getLibrarySpriteArray(bk.spriteSet);
    if (!arr || arr.length === 0) return null;
    const idx = ((bk.animFrame | 0) % arr.length + arr.length) % arr.length;
    const img = arr[idx];
    if (!img || !img.complete || !(img.naturalWidth > 0) || !(img.naturalHeight > 0)) return null;
    return img;
}

/**
 * Проверяет попадание точки в непрозрачную часть книги с учетом поворота.
 * @param {{x:number,y:number,w:number,h:number,rotation:number,spriteSet:string,animFrame:number}} bk
 * @param {number} px
 * @param {number} py
 * @param {number} alphaThreshold
 * @returns {boolean}
 */
function isLibraryBookOpaqueAtWorldPoint(bk, px, py, alphaThreshold = 12) {
    const cx = bk.x + bk.w * 0.5;
    const cy = bk.y + bk.h * 0.5;
    const dx = px - cx;
    const dy = py - cy;
    const ang = bk.rotation || 0;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);

    // Инверсное вращение: переводим точку в локальные координаты книги.
    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;
    const tx = lx + bk.w * 0.5;
    const ty = ly + bk.h * 0.5;

    if (tx < 0 || ty < 0 || tx >= bk.w || ty >= bk.h) return false;

    const img = getLibraryBookFrameImage(bk);
    if (!img) return true; // fallback: если кадр не загружен, считаем попадание в видимый прямоугольник

    const mask = getLibraryAlphaMask(img);
    if (!mask) return true;

    const ix = Math.max(0, Math.min(mask.w - 1, Math.floor((tx / Math.max(1, bk.w)) * mask.w)));
    const iy = Math.max(0, Math.min(mask.h - 1, Math.floor((ty / Math.max(1, bk.h)) * mask.h)));
    const alpha = mask.data[(iy * mask.w + ix) * 4 + 3];
    return alpha > alphaThreshold;
}

/**
 * Пиксель-перфект проверка попадания круглой пули по книге.
 * @param {{x:number,y:number,r:number}} b
 * @param {{x:number,y:number,w:number,h:number,rotation:number,spriteSet:string,animFrame:number}} bk
 * @returns {boolean}
 */
function isLibraryBulletPixelHit(b, bk) {
    const br = Math.max(2, b.r || 8);
    const samples = [
        [0, 0],
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [0.707, 0.707], [0.707, -0.707], [-0.707, 0.707], [-0.707, -0.707]
    ];

    for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const px = b.x + s[0] * br;
        const py = b.y + s[1] * br;
        if (isLibraryBookOpaqueAtWorldPoint(bk, px, py)) return true;
    }
    return false;
}

/**
 * Сбрасывает runtime-состояние уровня "Библиотека".
 */
function resetLibraryLevelState() {
    libraryBooks = [];
    libraryBooksSpawned = 0;
    librarySpawnTimer = 0;
    libraryNextSpawnDelay = 1.5;
    libraryGroundY = 0;
}

/**
 * Инициализирует уровень "Библиотека".
 */
function initLibraryLevel() {
    resetLibraryLevelState();
    libraryGroundY = canvas.height - 20;
}

/**
 * Возвращает параметры текущей фазы в зависимости от числа заспавненных книг.
 */
function getLibraryPhaseParams() {
    const n = libraryBooksSpawned;
    if (n < 30) return { maxOnScreen: 5, rateMin: 2.0, rateMax: 3.0, infinite: false };
    if (n < 60) return { maxOnScreen: 8, rateMin: 1.0, rateMax: 2.0, infinite: false };
    return { maxOnScreen: 12, rateMin: 0.6, rateMax: 1.0, infinite: true };
}

/**
 * Обновляет механику книг: спавн, физику, столкновения с пулями и полом.
 * Вызывается из update.js когда gameMode === 'library'.
 * @param {number} dt
 */
function updateLibraryBooks(dt) {
    const groundY = libraryGroundY || canvas.height - 20;
    const params = getLibraryPhaseParams();

    // --- Спавн ---
    const shouldSpawn = params.infinite || libraryBooksSpawned < 90;
    if (shouldSpawn && libraryBooks.length < params.maxOnScreen) {
        librarySpawnTimer += dt;
        if (librarySpawnTimer >= libraryNextSpawnDelay) {
            librarySpawnTimer = 0;
            libraryNextSpawnDelay = params.rateMin + Math.random() * (params.rateMax - params.rateMin);
            if (!params.infinite) libraryBooksSpawned++;

            const bh = canvas.height * 0.095;
            const bw = bh * 0.72;
            const spawnX = 24 + Math.random() * Math.max(1, canvas.width - bw - 48);
            // Появляются в случайном месте внутри верхних 2/3 экрана
            const spawnY = Math.random() * Math.max(1, canvas.height * (2 / 3) - bh);

            // Случайно выбираем набор спрайтов: 'br' (7), 'bg' (4) или 'bb' (8)
            const spriteSets = ['br', 'bg', 'bb'];
            const spriteSet = spriteSets[Math.floor(Math.random() * spriteSets.length)];
            const arr = getLibrarySpriteArray(spriteSet);
            const frameCount = Math.max(1, arr.length);

            libraryBooks.push({
                x: spawnX,
                y: spawnY,
                w: bw,
                h: bh,
                vx: (Math.random() - 0.5) * 55,
                vy: 75 + Math.random() * 70,
                gravity: 180,
                state: 'falling',
                rotation: (Math.random() - 0.5) * 0.4,
                rotSpeed: (Math.random() - 0.5) * 1.2,
                spriteSet,
                frameCount,
                animFrame: Math.floor(Math.random() * frameCount),
                frameTimer: 0
            });
        }
    }

    // --- Физика и удаление ---
    for (let i = libraryBooks.length - 1; i >= 0; i--) {
        const bk = libraryBooks[i];

        bk.vy += bk.gravity * dt;
        bk.x += bk.vx * dt;
        bk.y += bk.vy * dt;
        bk.rotation += bk.rotSpeed * dt;

        // Анимация спрайтов: смена кадра каждые ~0.1 с
        bk.frameTimer += dt;
        if (bk.frameTimer >= 0.1) {
            bk.frameTimer -= 0.1;
            bk.animFrame = (bk.animFrame + 1) % bk.frameCount;
        }

        // Отскок от стен в режиме дуги
        if (bk.state === 'arc') {
            if (bk.x < 0) {
                bk.x = 0;
                bk.vx = Math.abs(bk.vx) * 0.65;
            } else if (bk.x + bk.w > canvas.width) {
                bk.x = canvas.width - bk.w;
                bk.vx = -Math.abs(bk.vx) * 0.65;
            }
        }

        // Касание пола -> взрыв
        if (bk.y + bk.h >= groundY) {
            explosions.push({ x: bk.x + bk.w / 2, y: groundY - 10, timer: 0 });
            libraryBooks.splice(i, 1);
        }
    }

    // --- Столкновения книг с пулями игрока ---
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        const br = Math.max(2, b.r || 8);
        let hit = false;

        for (let ki = libraryBooks.length - 1; ki >= 0; ki--) {
            const bk = libraryBooks[ki];

            // Broad-phase по окружности-оболочке книги
            const cx = bk.x + bk.w * 0.5;
            const cy = bk.y + bk.h * 0.5;
            const boundR = Math.hypot(bk.w * 0.5, bk.h * 0.5);
            const dx = b.x - cx;
            const dy = b.y - cy;
            if (dx * dx + dy * dy > (boundR + br) * (boundR + br)) continue;

            // Narrow-phase: пиксель-перфект по непрозрачным пикселям
            if (!isLibraryBulletPixelHit(b, bk)) continue;

            // Где по высоте попала пуля (0=верх книги, 1=низ)
            const hitFraction = Math.max(0, Math.min(1, (b.y - bk.y) / Math.max(1, bk.h)));

            // Чем ниже попала пуля — тем сильнее дуга вверх
            const upFactor = 0.6 + hitFraction * 1.6;

            // Чем выше на экране попадание — тем больше места для дуги
            const heightFactor = 0.55 + ((canvas.height - b.y) / canvas.height) * 0.9;

            // Направление толчка: из vx пули; если 0 — по направлению вправо
            const bulletVx = (typeof b.vx === 'number' && b.vx !== 0) ? b.vx : 5;
            const pushDir = bulletVx >= 0 ? 1 : -1;

            const baseSpeed = 190 + Math.random() * 170;
            const launchVx = pushDir * baseSpeed * (0.45 + Math.random() * 0.65);
            const launchVy = -(baseSpeed * upFactor * heightFactor * (0.7 + Math.random() * 0.6));

            bk.vx = launchVx;
            bk.vy = launchVy;
            bk.state = 'arc';
            bk.gravity = 320 + Math.random() * 180;
            bk.rotSpeed = (Math.random() < 0.5 ? 1 : -1) * (3 + Math.random() * 6);

            score += 5;
            bullets.splice(bi, 1);
            hit = true;
            break;
        }
        if (hit) break;
    }
}

/**
 * Рисует книги уровня "Библиотека".
 * Вызывается из draw.js когда gameMode === 'library'.
 */
function drawLibraryBooks() {
    libraryBooks.forEach(bk => {
        const arr = getLibrarySpriteArray(bk.spriteSet);
        const idx = ((bk.animFrame | 0) % Math.max(1, arr.length) + Math.max(1, arr.length)) % Math.max(1, arr.length);
        const img = arr[idx];

        ctx.save();
        ctx.translate(bk.x + bk.w / 2, bk.y + bk.h / 2);
        ctx.rotate(bk.rotation);
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -bk.w / 2, -bk.h / 2, bk.w, bk.h);
        } else {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(-bk.w / 2, -bk.h / 2, bk.w, bk.h);
        }
        ctx.restore();
    });
}
