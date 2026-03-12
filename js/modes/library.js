
// Описание.

// Описание.
const libraryBookImgs = [];
for (let i = 1; i <= 7; i++) {
    const img = new Image();
    img.src = `img/book/br-${i}.png`;
    libraryBookImgs.push(img);
}

// Описание.
const libraryBookImgsBg = [];
for (let i = 1; i <= 4; i++) {
    const img = new Image();
    img.src = `img/book/bg${i}.png`;
    libraryBookImgsBg.push(img);
}

// Описание.
const libraryBookImgsBb = [];
for (let i = 1; i <= 8; i++) {
    const img = new Image();
    let triedFallback = false;
    img.onerror = () => {
        if (triedFallback) return;
        triedFallback = true;
        img.src = `img/book/bb${i}.png`;
    };
    img.src = `img/book/bb-${i}.png`;
    libraryBookImgsBb.push(img);
}

// Описание.
const libraryUnitazImg = new Image();
libraryUnitazImg.src = 'img/unitaz.png';

// Invisible toilet catch platform tuning.
// Edit values below to calibrate placement/size.
const libraryToiletCatchPlatformTuning = {
    widthFactor: 2 / 3,
    heightFactor: 0.05,
    minHeight: 4,
    offsetXFactor: -0.2,
    offsetYFactor: 0.5,
    debugVisibleSeconds: 0
};

// Описание.
let libraryBooks = [];
let libraryBooksSpawned = 0;
let librarySpawnTimer = 0;
let libraryNextSpawnDelay = 1.5;
let libraryGroundY = 0;

// Описание.
let libraryTopRail = null; // Описание.
let libraryBosses = [];                  // o4ko / nosok / tele
let libraryToilet = null; // Описание.
let libraryToiletCaughtBooks = 0; // Описание.
let libraryToiletShots = []; // Описание.
let libraryCatchSplashes = []; // Описание.
let libraryHeartDropTimer = 0; // Описание.
let libraryBeerDropTimer = 0; // Описание.
let libraryNextBeerDropTime = 12; // Описание.
let libraryVictoryShown = false;
let libraryLayoutWidth = 0;
let libraryLayoutHeight = 0;
let libraryCatchPlatformDebugTimer = 0;

// Описание.
const libraryAlphaMaskCache = new WeakMap();

/**
 * Возвращает runtime-параметры мобильного адаптива для уровня "Библиотека".
 * @param {number} dt - время кадра.
 * @returns {{active:boolean,scale:number,frameMul:number,speedMul:number}}
 */
function getLibraryAdaptiveRuntime(dt) {
    const ma = window.BHMobileAdaptive;
    if (ma && typeof ma.runtime === 'function') {
        return ma.runtime(dt, 'library');
    }
    return { active: false, scale: 1, frameMul: 1, speedMul: 1 };
}

/**
 * Масштабирует пиксельное значение под mobile landscape для уровня "Библиотека".
 * @param {number} value - базовое значение.
 * @param {number} minValue - минимальное значение.
 * @param {boolean} round - округление.
 * @returns {number}
 */
function libraryPx(value, minValue = 0, round = true) {
    const ma = window.BHMobileAdaptive;
    if (ma && typeof ma.px === 'function') {
        return ma.px(value, 'library', minValue, round);
    }
    return value;
}

/**
 * Масштабирует размеры бонусов/пуль под mobile landscape для уровня "Библиотека".
 * @param {number} w - базовая ширина.
 * @param {number} h - базовая высота.
 * @param {number} minW - минимальная ширина.
 * @param {number} minH - минимальная высота.
 * @returns {{w:number,h:number}}
 */
function librarySize(w, h, minW = 1, minH = 1) {
    const ma = window.BHMobileAdaptive;
    if (ma && typeof ma.size === 'function') {
        return ma.size(w, h, 'library', minW, minH);
    }
    return { w, h };
}

/**
 * Возвращает профиль мобильного баланса для уровня "Библиотека".
 * @returns {{enemyFireRate:number,enemyProjectileSpeed:number,enemyMoveSpeed:number,dropFallSpeed:number,bossMoveSpeed:number,homing:number,targetFallSpeed:number}}
 */
function getLibraryMobileBalance() {
    const ma = window.BHMobileAdaptive;
    if (ma && typeof ma.getBalance === 'function') {
        return ma.getBalance('library');
    }
    return {
        enemyFireRate: 1,
        enemyProjectileSpeed: 1,
        enemyMoveSpeed: 1,
        dropFallSpeed: 1,
        bossMoveSpeed: 1,
        homing: 1,
        targetFallSpeed: 1
    };
}

/**
 * Возвращает случайное число с плавающей точкой в диапазоне [min, max].
 * Используется для случайных таймеров, скоростей и интервалов в уровне «Библиотека».
 * @param {number} min - Нижняя граница диапазона.
 * @param {number} max - Верхняя граница диапазона.
 * @returns {number} Случайное число в заданном диапазоне.
 */
function libraryRand(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Возвращает массив кадров для выбранного набора спрайтов книги.
 * Поддерживаемые наборы: `br`, `bg`, `bb`.
 * @param {'br'|'bg'|'bb'} spriteSet - Идентификатор набора спрайтов.
 * @returns {HTMLImageElement[]} Массив изображений кадров анимации.
 */
function getLibrarySpriteArray(spriteSet) {
    if (spriteSet === 'bg') return libraryBookImgsBg;
    if (spriteSet === 'bb') return libraryBookImgsBb;
    return libraryBookImgs;
}

/**
 * Возвращает изображение текущего кадра книги по её набору и индексу кадра.
 * Если кадр не загружен или отсутствует, возвращает `null`.
 * @param {{spriteSet:string, animFrame:number}} book - Объект книги с типом набора и индексом кадра.
 * @returns {HTMLImageElement|null} Кадр спрайта или `null`.
 */
function getLibraryBookFrameImage(book) {
    const arr = getLibrarySpriteArray(book.spriteSet);
    if (!arr || arr.length === 0) return null;
    const idx = ((book.animFrame | 0) % arr.length + arr.length) % arr.length;
    const img = arr[idx];
    if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return null;
    return img;
}

/**
 * Строит и кэширует alpha-маску изображения для pixel-perfect проверок.
 * Маска хранится в `libraryAlphaMaskCache` и переиспользуется между кадрами.
 * @param {HTMLImageElement} img - Изображение, для которого требуется alpha-маска.
 * @returns {{w:number,h:number,data:Uint8ClampedArray}|null} Объект маски или `null`, если маску получить нельзя.
 */
function getLibraryAlphaMask(img) {
    if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return null;
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
 * Проверяет, попадает ли мировая точка в непрозрачный пиксель книги.
 * Учитывает поворот книги, её масштаб и порог альфа-канала.
 * @param {{x:number,y:number,w:number,h:number,rotation:number,spriteSet:string,animFrame:number}} book - Книга в мире.
 * @param {number} px - Координата X проверяемой точки в мировых координатах.
 * @param {number} py - Координата Y проверяемой точки в мировых координатах.
 * @param {number} [alphaThreshold=12] - Минимальная альфа для признания пикселя непрозрачным.
 * @returns {boolean} `true`, если точка лежит на непрозрачной части книги.
 */
function isLibraryBookOpaqueAtWorldPoint(book, px, py, alphaThreshold = 12) {
    const cx = book.x + book.w * 0.5;
    const cy = book.y + book.h * 0.5;
    const dx = px - cx;
    const dy = py - cy;
    const ang = book.rotation || 0;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);

    // Описание.
    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;
    const tx = lx + book.w * 0.5;
    const ty = ly + book.h * 0.5;
    if (tx < 0 || ty < 0 || tx >= book.w || ty >= book.h) return false;

    const frame = getLibraryBookFrameImage(book);
    if (!frame) return true; // Описание.
    const mask = getLibraryAlphaMask(frame);
    if (!mask) return true;

    const ix = Math.max(0, Math.min(mask.w - 1, Math.floor((tx / Math.max(1, book.w)) * mask.w)));
    const iy = Math.max(0, Math.min(mask.h - 1, Math.floor((ty / Math.max(1, book.h)) * mask.h)));
    const alpha = mask.data[(iy * mask.w + ix) * 4 + 3];
    return alpha > alphaThreshold;
}

/**
 * Выполняет pixel-perfect проверку попадания круглой пули в книгу.
 * Тестирует несколько точек (центр + контур окружности пули).
 * @param {{x:number,y:number,r:number}} bullet - Пуля игрока.
 * @param {{x:number,y:number,w:number,h:number,rotation:number,spriteSet:string,animFrame:number}} book - Книга-цель.
 * @returns {boolean} `true`, если найдено попадание в непрозрачную часть книги.
 */
function isLibraryBulletPixelHit(bullet, book) {
    const br = Math.max(2, bullet.r || 8);
    const samples = [
        [0, 0],
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [0.707, 0.707], [0.707, -0.707], [-0.707, 0.707], [-0.707, -0.707]
    ];
    for (let i = 0; i < samples.length; i++) {
        const px = bullet.x + samples[i][0] * br;
        const py = bullet.y + samples[i][1] * br;
        if (isLibraryBookOpaqueAtWorldPoint(book, px, py)) return true;
    }
    return false;
}

/**
 * Возвращает верхнюю невидимую рельсу, по которой движутся боссы.
 * @returns {{x:number,y:number,w:number}|null} Геометрия рельсы или `null`, если layout ещё не подготовлен.
 */
function getLibraryRail() {
    return libraryTopRail;
}

/**
 * Возвращает прямоугольник невидимой платформы ловли книг у унитаза.
 * Геометрия рассчитывается по `libraryToiletCatchPlatformTuning`.
 * @returns {{x:number,y:number,w:number,h:number}|null} Прямоугольник платформы или `null`.
 */
function getLibraryToiletCatchPlatform() {
    if (!libraryToilet) return null;
    const t = libraryToiletCatchPlatformTuning;
    const w = libraryToilet.w * t.widthFactor;
    const h = Math.max(t.minHeight, libraryToilet.h * t.heightFactor);
    const x = libraryToilet.x + (libraryToilet.w - w) * 0.5 + libraryToilet.w * t.offsetXFactor;
    const y = libraryToilet.y + libraryToilet.h * t.offsetYFactor;
    return { x, y, w, h };
}
/**
 * Создаёт объект босса для режима «Библиотека».
 * Инициализирует движение, анимацию, таймеры стрельбы, HP и служебные флаги.
 * @param {'o4ko'|'nosok'|'tele'} type - Тип босса.
 * @param {number} x - Начальная координата X.
 * @param {number} y - Начальная координата Y.
 * @param {number} w - Ширина спрайта/хитбокса.
 * @param {number} h - Высота спрайта/хитбокса.
 * @param {number} speed - Базовая скорость движения (px/сек).
 * @returns {object} Полностью инициализированный объект босса.
 */
function createLibraryBoss(type, x, y, w, h, speed) {
    let animInterval = 0.12;
    if (type === 'o4ko') animInterval = 0.11;
    if (type === 'nosok') animInterval = 0.11;
    if (type === 'tele') animInterval = 0.08;
    return {
        id: `${type}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        x,
        y,
        w,
        h,
        dir: Math.random() < 0.5 ? -1 : 1,
        speed,
        speedScale: libraryRand(0.8, 1.25),
        moveTimer: 0,
        nextMoveFlip: libraryRand(0.7, 2.3),
        wavePhase: Math.random() * Math.PI * 2,
        waveFreq: libraryRand(1.2, 2.8),
        waveAmp: libraryRand(0.2, 0.45),
        minX: 0,
        maxX: 0,
        hp: 10,
        hitFlashTimer: 0,
        alive: true,
        frame: 0,
        animTimer: 0,
        animInterval,
        shootTimer: 0,
        nextShoot: 1.6,
        nosokNextType: 'sock'
    };
}

/**
 * Возвращает случайную задержку следующего выстрела по типу босса.
 * Значения подобраны под баланс уровня «Библиотека».
 * @param {'o4ko'|'nosok'|'tele'} type - Тип босса.
 * @returns {number} Время в секундах до следующего выстрела.
 */
function getLibraryBossShootDelay(type) {
    const bal = getLibraryAdaptiveRuntime(0).active ? getLibraryMobileBalance() : null;
    const fireRate = bal ? Math.max(0.2, bal.enemyFireRate) : 1;
    // Частота стрельбы снижена примерно в 3 раза для баланса.
    if (type === 'o4ko') return libraryRand(4.05, 5.7) / fireRate;
    if (type === 'nosok') return libraryRand(9.6, 14.4) / fireRate;
    return libraryRand(4.35, 5.25) / fireRate;
}


/**
 * Формирует список всех живых боссов (alive=true и hp>0).
 * @returns {Array<object>} Массив живых боссов.
 */
function getLibraryAliveBosses() {
    return libraryBosses.filter(b => b.alive && b.hp > 0);
}

/**
 * Ищет босса в массиве `libraryBosses` по уникальному идентификатору.
 * @param {string} id - Идентификатор босса.
 * @returns {object|null} Найденный босс или `null`.
 */
function getLibraryBossById(id) {
    for (let i = 0; i < libraryBosses.length; i++) {
        if (libraryBosses[i].id === id) return libraryBosses[i];
    }
    return null;
}

/**
 * Пересчитывает геометрию уровня при старте и при изменении размеров canvas.
 * Обновляет землю, рельсу, унитаз, зоны перемещения и позиции боссов.
 * При первом запуске создаёт боссов и подготавливает их таймеры атак.
 */
function refreshLibraryLayout() {
    const edgePad = libraryPx(20, 10);
    libraryGroundY = canvas.height - edgePad;
    libraryTopRail = {
        x: Math.max(libraryPx(16, 8), canvas.width * 0.04),
        y: canvas.height * 0.26,
        w: Math.max(120, canvas.width * 0.92)
    };
    if (libraryTopRail.x + libraryTopRail.w > canvas.width - libraryPx(16, 8)) {
        libraryTopRail.w = Math.max(120, canvas.width - libraryTopRail.x - libraryPx(16, 8));
    }

    if (!libraryToilet) {
        const h = Math.max(player.h * 1.5, canvas.height * 0.18);
        const ratio = (libraryUnitazImg.complete && libraryUnitazImg.naturalWidth > 0 && libraryUnitazImg.naturalHeight > 0)
            ? (libraryUnitazImg.naturalWidth / libraryUnitazImg.naturalHeight)
            : 1.0;
        const w = Math.max(h * 0.8, h * ratio);
        libraryToilet = {
            x: canvas.width - w - libraryPx(28, 12),
            y: libraryGroundY - h,
            w,
            h,
            baseY: libraryGroundY - h,
            zoneMinX: canvas.width * 0.5,
            zoneMaxX: canvas.width - w - libraryPx(18, 8),
            actionTimer: libraryRand(0.9, 2.8),
            isHopping: false,
            hopFromX: 0,
            hopToX: 0,
            hopTimer: 0,
            hopDuration: 0.6,
            hopHeight: h * 0.16,
            shakeTimer: 0,
            shakeDuration: 0,
            shakeAmpX: 0,
            shakeAmpY: 0,
            shakeX: 0,
            shakeY: 0,
            volleyPendingCount: 0,
            volleyChargeTimer: 0,
            volleyChargeDuration: 0
        };
    } else {
        libraryToilet.baseY = libraryGroundY - libraryToilet.h;
        libraryToilet.y = Math.min(libraryToilet.y, libraryToilet.baseY);
        libraryToilet.zoneMinX = canvas.width * 0.5;
        libraryToilet.zoneMaxX = canvas.width - libraryToilet.w - libraryPx(18, 8);
        libraryToilet.x = Math.max(libraryToilet.zoneMinX, Math.min(libraryToilet.zoneMaxX, libraryToilet.x));
        if (typeof libraryToilet.volleyPendingCount !== 'number') libraryToilet.volleyPendingCount = 0;
        if (typeof libraryToilet.volleyChargeTimer !== 'number') libraryToilet.volleyChargeTimer = 0;
        if (typeof libraryToilet.volleyChargeDuration !== 'number') libraryToilet.volleyChargeDuration = 0;
    }

    if (!libraryBosses || libraryBosses.length === 0) {
        const baseH = Math.max(player.h * 1.18, canvas.height * 0.12);
        const o4koH = baseH * 1.04;
        const o4koW = o4koH;
        const nosokH = baseH * 1.02;
        const nosokW = nosokH * 0.94;
        const teleH = baseH * 1.08;
        const teleW = teleH * 0.96;
        const e67H = baseH * 1.0;
        const e67W = e67H * 0.9;
        const spots = [0.16, 0.40, 0.65, 0.88];
        libraryBosses = [
            Object.assign(createLibraryBoss(
                'e67',
                libraryTopRail.x + libraryTopRail.w * spots[0] - e67W * 0.5,
                libraryTopRail.y - e67H,
                e67W,
                e67H,
                canvas.width * 0.078
            ), { hp: 5 }),
            createLibraryBoss(
                'o4ko',
                libraryTopRail.x + libraryTopRail.w * spots[1] - o4koW * 0.5,
                libraryTopRail.y - o4koH,
                o4koW,
                o4koH,
                canvas.width * 0.09
            ),
            createLibraryBoss(
                'nosok',
                libraryTopRail.x + libraryTopRail.w * spots[2] - nosokW * 0.5,
                libraryTopRail.y - nosokH,
                nosokW,
                nosokH,
                canvas.width * 0.075
            ),
            createLibraryBoss(
                'tele',
                libraryTopRail.x + libraryTopRail.w * spots[3] - teleW * 0.5,
                libraryTopRail.y - teleH,
                teleW,
                teleH,
                canvas.width * 0.082
            )
        ];
        for (let i = 0; i < libraryBosses.length; i++) {
            libraryBosses[i].nextShoot = getLibraryBossShootDelay(libraryBosses[i].type);
        }
    }

    const rail = getLibraryRail();
    for (let i = 0; i < libraryBosses.length; i++) {
        const b = libraryBosses[i];
        b.minX = rail.x;
        b.maxX = rail.x + rail.w - b.w;
        b.x = Math.max(b.minX, Math.min(b.maxX, b.x));
        b.y = rail.y - b.h;
    }
}

/**
 * Возвращает параметры текущей фазы спавна книг.
 * Параметры зависят от `libraryBooksSpawned` и включают лимит, интервалы и флаг бесконечной фазы.
 * @returns {{maxOnScreen:number,rateMin:number,rateMax:number,infinite:boolean}} Параметры фазы спавна.
 */
function getLibraryPhaseParams() {
    const n = libraryBooksSpawned;
    // После правок параметры фаз усилены: книг на экране и частота спавна увеличены в 2 раза.
    if (n < 60) return { maxOnScreen: 10, rateMin: 2.0, rateMax: 3.0, infinite: false };
    if (n < 120) return { maxOnScreen: 16, rateMin: 1.0, rateMax: 2.0, infinite: false };
    return { maxOnScreen: 24, rateMin: 0.6, rateMax: 1.0, infinite: true };
}


/**
 * Создаёт новую книгу со случайным набором спрайтов и физикой.
 * Инициализирует позицию, скорость, вращение и состояние анимации книги.
 */
function spawnLibraryBook() {
    const h = canvas.height * 0.095;
    const w = h * 0.72;
    const edgeInset = libraryPx(24, 10);
    const laneInset = edgeInset * 2;
    const x = edgeInset + Math.random() * Math.max(1, canvas.width - w - laneInset);
    const y = Math.random() * Math.max(1, canvas.height * (2 / 3) - h);
    const sets = ['br', 'bg', 'bb'];
    const spriteSet = sets[Math.floor(Math.random() * sets.length)];
    const arr = getLibrarySpriteArray(spriteSet);
    const frameCount = Math.max(1, arr.length);

    const speedMul = getLibraryAdaptiveRuntime(0).speedMul;
    const bal = getLibraryMobileBalance();
    const fallMul = bal.targetFallSpeed || 1;
    libraryBooks.push({
        x,
        y,
        w,
        h,
        vx: (Math.random() - 0.5) * (55 * speedMul * fallMul),
        vy: (75 + Math.random() * 70) * speedMul * fallMul,
        gravity: 180 * speedMul * fallMul,
        state: 'falling',
        rotation: (Math.random() - 0.5) * 0.4,
        rotSpeed: (Math.random() - 0.5) * 1.2,
        spriteSet,
        frameCount,
        animFrame: Math.floor(Math.random() * frameCount),
        frameTimer: 0,
        touchedByPlayer: false,
        playerTouchCount: 0,
        playerHitCooldown: 0
    });
}

/**
 * Создаёт эффект «брызг» в точке попадания книги в платформу унитаза.
 * Добавляет три частицы с разными цветами и направлениями разлёта.
 * @param {number} x - Координата X точки эффекта.
 * @param {number} y - Координата Y точки эффекта.
 */
function spawnLibraryCatchSplash(x, y) {
    const speedMul = getLibraryAdaptiveRuntime(0).speedMul;
    const colors = ['#f5cf4c', '#8a5a2b', '#74b83f'];
    const vxs = [-90 * speedMul, 0, 90 * speedMul];
    for (let i = 0; i < 3; i++) {
        libraryCatchSplashes.push({
            x,
            y,
            vx: vxs[i] + libraryRand(-16 * speedMul, 16 * speedMul),
            vy: -libraryRand(120 * speedMul, 185 * speedMul),
            gravity: (280 + libraryRand(0, 120)) * speedMul,
            r: libraryRand(libraryPx(4.5, 3, false), libraryPx(8.2, 5, false)),
            timer: 0,
            life: 2.0,
            color: colors[i]
        });
    }
    if (window.BHAudio) {
        window.BHAudio.play('library_splash', { volumeMul: 0.95 });
    }
}
/**
 * Описание.
 * @param {number} duration - Параметр.
 */
/**
 * Добавляет залп унитаза в очередь.
 * Если зарядка ещё не запущена, включает подготовку выстрела (2–3 секунды тряски).
 */
function triggerLibraryToiletVolley() {
    if (!libraryToilet) return;
    libraryToilet.volleyPendingCount = (libraryToilet.volleyPendingCount || 0) + 1;
    if (libraryToilet.volleyChargeTimer > 0) return;
    libraryToilet.volleyChargeDuration = libraryRand(2.0, 3.0);
    libraryToilet.volleyChargeTimer = libraryToilet.volleyChargeDuration;
    if (window.BHAudio) {
        window.BHAudio.play('toilet_charge', { volumeMul: 0.92, duck: 0.84 });
    }
}

/**
 * Создаёт усиленный эффект брызг в момент залпа унитаза.
 * Используется как визуальная индикация «выстрела» унитаза.
 */
function spawnLibraryToiletFireSplash() {
    if (!libraryToilet) return;
    const baseX = libraryToilet.x + libraryToilet.w * 0.5;
    const baseY = libraryToilet.y + libraryToilet.h * 0.42;
    const colors = ['#f5cf4c', '#8a5a2b', '#74b83f'];
    for (let i = 0; i < 9; i++) {
        const side = (i % 3) - 1;
        libraryCatchSplashes.push({
            x: baseX + side * libraryRand(4, 12),
            y: baseY + libraryRand(-4, 8),
            vx: side * libraryRand(60, 180) + libraryRand(-35, 35),
            vy: -libraryRand(160, 250),
            gravity: 300 + libraryRand(0, 140),
            r: libraryRand(4.2, 8.8),
            timer: 0,
            life: 2.0,
            color: colors[i % colors.length]
        });
    }
    if (window.BHAudio) {
        window.BHAudio.play('toilet_fire', { volumeMul: 0.96, duck: 0.8 });
    }
}
/**
 * Запускает тряску унитаза на заданное время.
 * @param {number} duration - Длительность тряски в секундах.
 */
function startLibraryToiletShake(duration) {
    if (!libraryToilet) return;
    libraryToilet.shakeDuration = duration;
    libraryToilet.shakeTimer = duration;
    libraryToilet.shakeAmpX = libraryRand(1.3, 3.8);
    libraryToilet.shakeAmpY = libraryRand(0.6, 2.2);
}

/**
 * Запускает прыжок унитаза внутри разрешённой зоны.
 * Прыжок выполняется по дуге и ограничен по высоте.
 */
function startLibraryToiletHop() {
    if (!libraryToilet) return;
    libraryToilet.isHopping = true;
    libraryToilet.hopTimer = 0;
    libraryToilet.hopDuration = libraryRand(0.42, 0.72);
    libraryToilet.hopHeight = libraryRand(libraryToilet.h * 0.08, libraryToilet.h * 0.20); // Описание.
    libraryToilet.hopFromX = libraryToilet.x;

    const dir = Math.random() < 0.5 ? -1 : 1;
    const dist = libraryRand(libraryToilet.w * 0.18, libraryToilet.w * 0.52);
    let targetX = libraryToilet.x + dir * dist;
    targetX = Math.max(libraryToilet.zoneMinX, Math.min(libraryToilet.zoneMaxX, targetX));
    libraryToilet.hopToX = targetX;
}

/**
 * Обновляет поведение унитаза: зарядку, тряску, прыжки и простои.
 * Во время зарядки унитаз не прыгает и остаётся зафиксирован по высоте.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryToilet(dt) {
    if (!libraryToilet) return;

    // Если есть очередь залпа, сначала идет зарядка 2-3 секунды,
    // затем выполняется выстрел и усиливается тряска.
    if (libraryToilet.volleyChargeTimer > 0) {
        libraryToilet.volleyChargeTimer = Math.max(0, libraryToilet.volleyChargeTimer - dt);
        libraryToilet.isHopping = false;
        libraryToilet.y = libraryToilet.baseY;

        const pulse = performance.now() * 0.085;
        libraryToilet.shakeX = Math.sin(pulse * 1.9) * libraryRand(5.5, 10.5);
        libraryToilet.shakeY = Math.cos(pulse * 2.3) * libraryRand(3.0, 6.8);

        if (libraryToilet.volleyChargeTimer <= 0) {
            fireLibraryToiletVolley();
            spawnLibraryToiletFireSplash();
            // Пост-отдача после выстрела.
            libraryToilet.shakeDuration = 0.65;
            libraryToilet.shakeTimer = 0.65;
            libraryToilet.shakeAmpX = libraryRand(7.5, 12.0);
            libraryToilet.shakeAmpY = libraryRand(4.0, 7.5);

            libraryToilet.volleyPendingCount = Math.max(0, (libraryToilet.volleyPendingCount || 0) - 1);
            if (libraryToilet.volleyPendingCount > 0) {
                libraryToilet.volleyChargeDuration = libraryRand(2.0, 3.0);
                libraryToilet.volleyChargeTimer = libraryToilet.volleyChargeDuration;
            }
        }

        libraryToilet.x = Math.max(libraryToilet.zoneMinX, Math.min(libraryToilet.zoneMaxX, libraryToilet.x));
        return;
    }

    // Обычная тряска.
    if (libraryToilet.shakeTimer > 0) {
        libraryToilet.shakeTimer = Math.max(0, libraryToilet.shakeTimer - dt);
        const t = (libraryToilet.shakeDuration > 0) ? (1 - libraryToilet.shakeTimer / libraryToilet.shakeDuration) : 1;
        const ampK = Math.max(0, 1 - t * 0.75);
        const pulse = performance.now() * 0.05;
        libraryToilet.shakeX = Math.sin(pulse * 1.4) * libraryToilet.shakeAmpX * ampK;
        libraryToilet.shakeY = Math.cos(pulse * 1.9) * libraryToilet.shakeAmpY * ampK;
    } else {
        libraryToilet.shakeX = 0;
        libraryToilet.shakeY = 0;
        if (Math.random() < dt * 0.22) {
            startLibraryToiletShake(libraryRand(0.18, 0.45));
        }
    }

    // Логика прыжка и пауз.
    if (libraryToilet.isHopping) {
        libraryToilet.hopTimer += dt;
        const t = Math.min(1, libraryToilet.hopTimer / Math.max(0.001, libraryToilet.hopDuration));
        const arch = Math.sin(t * Math.PI);
        libraryToilet.x = libraryToilet.hopFromX + (libraryToilet.hopToX - libraryToilet.hopFromX) * t;
        libraryToilet.y = libraryToilet.baseY - arch * libraryToilet.hopHeight;
        if (t >= 1) {
            libraryToilet.isHopping = false;
            libraryToilet.y = libraryToilet.baseY;
            libraryToilet.actionTimer = libraryRand(0.5, 5.0);
        }
    } else {
        libraryToilet.y = libraryToilet.baseY;
        libraryToilet.actionTimer -= dt;
        if (libraryToilet.actionTimer <= 0) {
            const roll = Math.random();
            if (roll < 0.24) {
                libraryToilet.actionTimer = libraryRand(1.2, 5.0);
            } else if (roll < 0.62) {
                startLibraryToiletShake(libraryRand(0.2, 0.65));
                libraryToilet.actionTimer = libraryRand(0.4, 1.6);
            } else {
                startLibraryToiletHop();
                if (Math.random() < 0.65) {
                    startLibraryToiletShake(libraryRand(0.24, 0.72));
                }
            }
        }
    }

    libraryToilet.x = Math.max(libraryToilet.zoneMinX, Math.min(libraryToilet.zoneMaxX, libraryToilet.x));
}

/**
 * Формирует залп из 5 снарядов унитаза по живым боссам.
 * Часть снарядов получает принудительное наведение для гарантированных попаданий.
 */
function fireLibraryToiletVolley() {
    const alive = getLibraryAliveBosses();
    if (alive.length === 0 || !libraryToilet) return;

    const sx = libraryToilet.x + libraryToilet.w * 0.5;
    const sy = libraryToilet.y + libraryToilet.h * 0.34;
    const forcedCount = Math.min(3, alive.length > 0 ? 3 : 0);

    for (let i = 0; i < 5; i++) {
        const forced = i < forcedCount;
        const target = alive[Math.floor(Math.random() * alive.length)];
        const tx = target.x + target.w * 0.5 + (forced ? 0 : libraryRand(-target.w * 0.45, target.w * 0.45));
        const ty = target.y + target.h * 0.5 + (forced ? 0 : libraryRand(-target.h * 0.35, target.h * 0.35));
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const speed = libraryRand(canvas.width * 0.44, canvas.width * 0.56);
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        const size = Math.round(libraryRand(24, 34));
        const img = (o4koPoopImgs && o4koPoopImgs.length > 0)
            ? o4koPoopImgs[Math.floor(Math.random() * o4koPoopImgs.length)]
            : null;

        libraryToiletShots.push({
            x: sx - size * 0.5,
            y: sy - size * 0.5,
            w: size,
            h: size,
            vx,
            vy,
            speed,
            timer: 0,
            life: 2.6,
            forced,
            targetId: target.id,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * libraryRand(4.2, 6.8),
            img
        });
    }
}

/**
 * Применяет урон боссу от снаряда унитаза.
 * Обновляет HP, запускает мигание/взрыв и обрабатывает смерть босса.
 * @param {object} boss - Целевой босс.
 * @param {number} dmg - Величина урона.
 */
function applyLibraryBossDamage(boss, dmg) {
    if (!boss || !boss.alive || boss.hp <= 0) return;
    boss.hp -= dmg;
    boss.hitFlashTimer = Math.max(boss.hitFlashTimer || 0, 0.28);
    explosions.push({ x: boss.x + boss.w * 0.5, y: boss.y + boss.h * 0.5, timer: 0, scale: 0.55 });
    if (window.BHAudio) {
        window.BHAudio.play('hit_boss', { volumeMul: 0.86, duck: 0.9 });
    }

    if (boss.hp > 0) return;
    boss.hp = 0;
    boss.alive = false;
    score += 15;
    explosions.push({
        x: boss.x + boss.w * 0.5,
        y: boss.y + boss.h * 0.5,
        timer: 0,
        size: Math.max(boss.w, boss.h) * 0.9,
        style: (boss.type === 'o4ko') ? 'brown' : undefined
    });
    if (window.BHAudio) {
        window.BHAudio.play('explosion_big', { volumeMul: 0.9, duck: 0.76 });
    }

    // Описание.
    enemyBullets = enemyBullets.filter(b => b.libraryOwnerId !== boss.id);
}

/**
 * Обновляет все снаряды унитаза.
 * Обрабатывает наведение, движение, столкновения с боссами и удаление по времени жизни/выходу за границы.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryToiletShots(dt) {
    if (!libraryToiletShots || libraryToiletShots.length === 0) return;
    const alive = getLibraryAliveBosses();

    for (let i = libraryToiletShots.length - 1; i >= 0; i--) {
        const shot = libraryToiletShots[i];
        shot.timer += dt;

        if (shot.forced) {
            let target = getLibraryBossById(shot.targetId);
            if (!target || !target.alive || target.hp <= 0) {
                if (alive.length > 0) {
                    target = alive[Math.floor(Math.random() * alive.length)];
                    shot.targetId = target.id;
                } else {
                    libraryToiletShots.splice(i, 1);
                    continue;
                }
            }
            const scx = shot.x + shot.w * 0.5;
            const scy = shot.y + shot.h * 0.5;
            const tcx = target.x + target.w * 0.5;
            const tcy = target.y + target.h * 0.5;
            const dx = tcx - scx;
            const dy = tcy - scy;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const desiredVx = (dx / dist) * shot.speed;
            const desiredVy = (dy / dist) * shot.speed;
            const homingK = Math.min(1, dt * 10.5);
            shot.vx += (desiredVx - shot.vx) * homingK;
            shot.vy += (desiredVy - shot.vy) * homingK;

            // Описание.
            if (dist <= Math.max(18, target.w * 0.18) || shot.timer > 1.05) {
                applyLibraryBossDamage(target, 1);
                libraryToiletShots.splice(i, 1);
                continue;
            }
        }

        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        shot.rotation += (shot.rotationSpeed || 0) * dt;

        if (shot.timer > shot.life ||
            shot.x + shot.w < -120 ||
            shot.x > canvas.width + 120 ||
            shot.y + shot.h < -120 ||
            shot.y > canvas.height + 120) {
            libraryToiletShots.splice(i, 1);
            continue;
        }

        // Описание.
        const scx = shot.x + shot.w * 0.5;
        const scy = shot.y + shot.h * 0.5;
        const sr = Math.max(8, shot.w * 0.28);
        for (let bi = 0; bi < libraryBosses.length; bi++) {
            const b = libraryBosses[bi];
            if (!b.alive || b.hp <= 0) continue;
            const cx = Math.max(b.x, Math.min(scx, b.x + b.w));
            const cy = Math.max(b.y, Math.min(scy, b.y + b.h));
            const dx = scx - cx;
            const dy = scy - cy;
            if (dx * dx + dy * dy <= sr * sr) {
                applyLibraryBossDamage(b, 1);
                libraryToiletShots.splice(i, 1);
                break;
            }
        }
    }
}
/**
 * Выпускает залп снарядов босса типа `o4ko` в сторону игрока.
 * @param {object} boss - Босс-стрелок типа `o4ko`.
 */
function shootLibraryBossO4ko(boss) {
    const bal = getLibraryMobileBalance();
    const bx = boss.x + boss.w * 0.5;
    const by = boss.y + boss.h * 0.5;
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.5;
    const baseAngle = Math.atan2(py - by, px - bx);
    const count = (Math.random() < 0.5) ? 1 : 2;
    const spread = (count === 2) ? 0.16 : 0;

    for (let i = 0; i < count; i++) {
        const offset = (i - (count - 1) * 0.5) * spread;
        const angle = baseAngle + offset;
        const speed = (3.4 + Math.random() * 1.0) * bal.enemyProjectileSpeed; // Описание.
        const size = Math.round(24 * (1 + Math.random() * 1.2));
        const img = (o4koPoopImgs && o4koPoopImgs.length > 0)
            ? o4koPoopImgs[Math.floor(Math.random() * o4koPoopImgs.length)]
            : null;
        enemyBullets.push({
            x: bx - size * 0.5,
            y: by - size * 0.5,
            w: size,
            h: size,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.07 + Math.random() * 0.05),
            emoji: '\u{1F4A9}',
            img,
            o4koPoop: true,
            libraryBullet: true,
            libraryOwnerId: boss.id
        });
    }
    if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
        window.BHAudio.playEnemyShoot('o4ko');
    }
}

/**
 * Выпускает снаряд босса типа `nosok` (чередование носок/рыба).
 * Для снаряда задаются физика полёта, вращение и параметры шлейфа.
 * @param {object} boss - Босс-стрелок типа `nosok`.
 */
function shootLibraryBossNosok(boss) {
    const bal = getLibraryMobileBalance();
    const shootFish = boss.nosokNextType === 'fish';
    boss.nosokNextType = shootFish ? 'sock' : 'fish';

    const sx = boss.x + boss.w * 0.55;
    const sy = boss.y + boss.h * 0.46;
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.45;
    const leadT = shootFish ? libraryRand(0.22, 0.36) : libraryRand(0.10, 0.24);
    const aimX = px + (player.vx || 0) * leadT + libraryRand(-player.w * 0.24, player.w * 0.24);
    const aimY = py + libraryRand(-player.h * 0.2, player.h * 0.12);
    const dx = aimX - sx;
    const dy = aimY - sy;
    const dist = Math.max(1, Math.hypot(dx, dy));

    if (!shootFish) {
        const size = Math.max(24, boss.w * 0.34);
        const speed = libraryRand(canvas.width * 0.29, canvas.width * 0.39) * bal.enemyProjectileSpeed;
        const mvx = (dx / dist) * speed;
        const mvy = (dy / dist) * speed - libraryRand(canvas.height * 0.14, canvas.height * 0.24);
        enemyBullets.push({
            x: sx - size * 0.5,
            y: sy - size * 0.5,
            w: size,
            h: size,
            vx: 0,
            vy: 0,
            mvx,
            mvy,
            gravity: canvas.height * libraryRand(0.68, 0.9),
            homing: libraryRand(0.28, 0.52) * bal.homing,
            age: 0,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * libraryRand(2.1, 3.9),
            nosokSock: true,
            img: stinkySockImg,
            fumeTimer: 0,
            fumePuffs: [],
            libraryManaged: true,
            libraryNosok: true,
            libraryBullet: true,
            libraryOwnerId: boss.id
        });
        if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
            window.BHAudio.playEnemyShoot('nosok');
        }
        return;
    }

    // Описание.
    const fishBaseW = Math.max(30, boss.w * 0.42);
    const fishAspectRaw = (rottenFishImg && rottenFishImg.width > 0 && rottenFishImg.height > 0)
        ? (rottenFishImg.width / rottenFishImg.height)
        : 1.67;
    const fishAspect = Math.max(1.1, Math.min(4.0, fishAspectRaw));
    const fishW = fishBaseW;
    const fishH = Math.max(12, fishW / fishAspect);
    const fishSpeed = libraryRand(canvas.width * 0.41, canvas.width * 0.55) * bal.enemyProjectileSpeed;
    const fvx = (dx / dist) * fishSpeed;
    const fvy = (dy / dist) * fishSpeed - libraryRand(canvas.height * 0.07, canvas.height * 0.15);
    enemyBullets.push({
        x: sx - fishW * 0.5,
        y: sy - fishH * 0.5,
        w: fishW,
        h: fishH,
        vx: 0,
        vy: 0,
        mvx: fvx,
        mvy: fvy,
        gravity: canvas.height * libraryRand(0.42, 0.62),
        homing: libraryRand(0.62, 0.95) * bal.homing,
        age: 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * libraryRand(2.8, 5.2),
        nosokFish: true,
        img: rottenFishImg,
        fumeTimer: 0,
        fumePuffs: [],
        libraryManaged: true,
        libraryNosok: true,
        libraryBullet: true,
        libraryOwnerId: boss.id
    });
    if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
        window.BHAudio.playEnemyShoot('nosok');
    }
}

/**
 * Выпускает снаряд босса типа `tele` в сторону игрока.
 * @param {object} boss - Босс-стрелок типа `tele`.
 */
function shootLibraryBossE67(boss) {
    const bal = getLibraryMobileBalance();
    const emojis = ['', '', '7', '6', ''];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const bx = boss.x + boss.w * 0.5;
    const by = boss.y + boss.h * 0.55;
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.5;
    const dx = px - bx;
    const dy = py - by;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = (5.0 + Math.random() * 1.0) * bal.enemyProjectileSpeed;
    const bs = librarySize(16, 24, 8, 12);
    enemyBullets.push({
        x: bx,
        y: by,
        w: bs.w,
        h: bs.h,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        emoji,
        libraryBullet: true,
        libraryOwnerId: boss.id
    });
    if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
        window.BHAudio.playEnemyShoot('67');
    }
}
function shootLibraryBossTele(boss) {
    const bal = getLibraryMobileBalance();
    const emojis = ['\u{1FAB3}', '\u{1F9E8}', '7\uFE0F\u20E3', '6\uFE0F\u20E3', '\u{1F4A9}'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const bx = boss.x + boss.w * 0.5;
    const by = boss.y + boss.h * 0.55;
    const px = player.x + player.w * 0.5;
    const py = player.y + player.h * 0.5;
    const dx = px - bx;
    const dy = py - by;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const speed = (4.6 + Math.random() * 0.9) * bal.enemyProjectileSpeed; // Описание.
    const bs = librarySize(16, 24, 8, 12);
    enemyBullets.push({
        x: bx,
        y: by,
        w: bs.w,
        h: bs.h,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        emoji,
        libraryBullet: true,
        libraryOwnerId: boss.id
    });
    if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
        window.BHAudio.playEnemyShoot('tele');
    }
}

/**
 * Обновляет боссов: независимое движение, анимацию, таймеры и стрельбу.
 * Если остаётся один живой босс, его частота атак автоматически увеличивается.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryBosses(dt) {
    const alive = getLibraryAliveBosses();
    const aliveCount = alive.length;
    if (aliveCount <= 0) return;
    const frequencyMul = (aliveCount === 1) ? 2 : 1;
    const bal = getLibraryMobileBalance();

    for (let i = 0; i < libraryBosses.length; i++) {
        const b = libraryBosses[i];
        if (!b.alive || b.hp <= 0) continue;
        b.hitFlashTimer = Math.max(0, (b.hitFlashTimer || 0) - dt);

        b.animTimer += dt;
        if (b.animTimer >= b.animInterval) {
            b.animTimer = 0;
            b.frame++;
        }

        // Независимое хаотичное движение каждого босса.
        b.moveTimer += dt;
        if (b.moveTimer >= b.nextMoveFlip) {
            b.moveTimer = 0;
            b.nextMoveFlip = libraryRand(0.6, 2.6);
            if (Math.random() < 0.8) b.dir *= -1;
            else b.dir = (Math.random() < 0.5) ? -1 : 1;
            b.speedScale = libraryRand(0.75, 1.35);
            b.waveFreq = libraryRand(1.0, 3.0);
            b.waveAmp = libraryRand(0.18, 0.52);
        }

        b.wavePhase += dt * b.waveFreq;
        const micro = 1 + Math.sin(b.wavePhase) * b.waveAmp;
        b.x += b.dir * b.speed * b.speedScale * micro * bal.enemyMoveSpeed * dt;

        if (b.x <= b.minX) {
            b.x = b.minX;
            b.dir = 1;
            b.speedScale = libraryRand(0.8, 1.3);
        } else if (b.x >= b.maxX) {
            b.x = b.maxX;
            b.dir = -1;
            b.speedScale = libraryRand(0.8, 1.3);
        }

        b.y = libraryTopRail.y - b.h;

        b.shootTimer += dt;
        const threshold = b.nextShoot / frequencyMul;
        if (b.shootTimer >= threshold) {
            b.shootTimer = 0;
            b.nextShoot = getLibraryBossShootDelay(b.type);
            if (b.type === 'o4ko') shootLibraryBossO4ko(b);
            else if (b.type === 'nosok') shootLibraryBossNosok(b);
            else shootLibraryBossTele(b);
        }
    }
}

/**
 * Обновляет специальные пули режима библиотеки (носок/рыба).
 * Применяет гравитацию, доведение к игроку, вращение и динамический шлейф.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryManagedEnemyBullets(dt) {
    if (!enemyBullets || enemyBullets.length === 0) return;
    const bal = getLibraryMobileBalance();
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        if (!eb.libraryManaged || !eb.libraryNosok) continue;
        const isFish = !!eb.nosokFish;
        eb.age = (eb.age || 0) + dt;

        const bw = eb.w || 28;
        const bh = eb.h || 28;
        const cx = eb.x + bw * 0.5;
        const cy = eb.y + bh * 0.5;
        const tx = player.x + player.w * 0.5;
        const ty = player.y + player.h * 0.44;
        const dx = tx - cx;
        const dy = ty - cy;
        const d = Math.max(1, Math.hypot(dx, dy));
        const nx = dx / d;

        const homingScale = (eb.age < 0.35) ? (isFish ? 0.72 : 0.52) : 1.0;
        const homingPower = (isFish ? canvas.width * 0.070 : canvas.width * 0.052) * bal.homing;
        eb.mvx += nx * (eb.homing || 0.35) * homingScale * dt * homingPower;
        eb.mvy += (eb.gravity || canvas.height * 0.95) * dt;

        const minForward = canvas.width * (isFish ? 0.22 : 0.15);
        if (Math.abs(eb.mvx) < minForward) {
            eb.mvx += Math.sign(nx || eb.mvx || 1) * canvas.width * (isFish ? 0.035 : 0.02) * dt;
        }

        eb.x += eb.mvx * dt;
        eb.y += eb.mvy * dt;
        eb.rotation = (typeof eb.rotation === 'number' ? eb.rotation : 0) + (eb.rotationSpeed || 0) * dt;

        // Описание.
        eb.fumeTimer = (eb.fumeTimer || 0) + dt;
        if (!Array.isArray(eb.fumePuffs)) eb.fumePuffs = [];
        if (eb.fumeTimer >= (isFish ? 0.045 : 0.055)) {
            eb.fumeTimer = 0;
            eb.fumePuffs.push({
                x: eb.x + bw * 0.5,
                y: eb.y + bh * 0.5,
                r: isFish ? libraryRand(10, 18) : libraryRand(8, 16),
                life: isFish ? libraryRand(0.46, 0.8) : libraryRand(0.4, 0.72),
                timer: 0,
                alpha: isFish ? libraryRand(0.78, 0.96) : libraryRand(0.74, 0.92),
                vx: isFish ? libraryRand(-22, 22) : libraryRand(-18, 18),
                vy: isFish ? libraryRand(-58, -18) : libraryRand(-50, -18),
                colorCore: isFish ? 'rgba(62,56,34,1)' : 'rgba(66,63,44,0.98)',
                colorMid: isFish ? 'rgba(109,132,58,0.70)' : 'rgba(92,109,49,0.62)',
                colorEdge: isFish ? 'rgba(20,24,14,0)' : 'rgba(24,28,18,0)'
            });
        }
        eb.fumePuffs = eb.fumePuffs.filter(p => {
            p.timer += dt;
            p.r += dt * (isFish ? 31 : 27);
            p.x += (p.vx || 0) * dt;
            p.y += (p.vy || -18) * dt;
            return p.timer < p.life;
        });

        const pad = isFish ? 360 : 240;
        if (eb.x + bw < -pad || eb.x > canvas.width + pad || eb.y + bh < -pad || eb.y > canvas.height + pad) {
            enemyBullets.splice(i, 1);
        }
    }
}
/**
 * Обновляет физику и спавн книг: падение, вращение, отскоки и удаление.
 * Также обрабатывает ловлю книг унитазом и запуск залпа по счётчику ловли.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryBooksPhysics(dt) {
    const params = getLibraryPhaseParams();
    librarySpawnTimer += dt;
    while (librarySpawnTimer >= libraryNextSpawnDelay) {
        const canSpawnNow = params.infinite || libraryBooks.length < params.maxOnScreen;
        if (!canSpawnNow) break;
        librarySpawnTimer -= libraryNextSpawnDelay;
        libraryNextSpawnDelay = params.rateMin + Math.random() * (params.rateMax - params.rateMin);
        libraryBooksSpawned++;
        spawnLibraryBook();
    }

    const catchPlatform = getLibraryToiletCatchPlatform();

    for (let i = libraryBooks.length - 1; i >= 0; i--) {
        const bk = libraryBooks[i];
        const prevY = bk.y;

        bk.vy += bk.gravity * dt;
        bk.x += bk.vx * dt;
        bk.y += bk.vy * dt;
        bk.rotation += bk.rotSpeed * dt;

        bk.frameTimer += dt;
        if (bk.frameTimer >= 0.1) {
            bk.frameTimer -= 0.1;
            bk.animFrame = (bk.animFrame + 1) % bk.frameCount;
        }

        if (bk.state === 'arc') {
            if (bk.x < 0) {
                bk.x = 0;
                bk.vx = Math.abs(bk.vx) * 0.65;
            } else if (bk.x + bk.w > canvas.width) {
                bk.x = canvas.width - bk.w;
                bk.vx = -Math.abs(bk.vx) * 0.65;
            }
        }

        // Описание.
        if (catchPlatform) {
            const prevBottom = prevY + bk.h;
            const curBottom = bk.y + bk.h;
            const crossedDown = prevBottom <= catchPlatform.y && curBottom >= catchPlatform.y;
            const overlapX = bk.x + bk.w > catchPlatform.x && bk.x < catchPlatform.x + catchPlatform.w;
            if (bk.vy > 0 && crossedDown && overlapX) {
                const splashX = Math.max(catchPlatform.x, Math.min(catchPlatform.x + catchPlatform.w, bk.x + bk.w * 0.5));
                const splashY = catchPlatform.y;
                spawnLibraryCatchSplash(splashX, splashY);
                const deliveredByPlayer = !!bk.touchedByPlayer;
                const playerTouches = Math.max(0, Math.floor(bk.playerTouchCount || 0));
                if (deliveredByPlayer) {
                    libraryRunToiletBooksByPlayer += 1;
                    if (!libraryRunJuggleToiletDone && !libraryRunJuggleToiletFailed) {
                        if (playerTouches >= 10) {
                            libraryRunJuggleToiletDone = true;
                        } else {
                            libraryRunJuggleToiletFailed = true;
                        }
                    }
                }
                libraryBooks.splice(i, 1); // Описание.

                libraryToiletCaughtBooks++;
                if (libraryToiletCaughtBooks > 0 && libraryToiletCaughtBooks % 5 === 0) {
                    triggerLibraryToiletVolley();
                }
                continue;
            }
        }

        // Описание.
        if (bk.y + bk.h >= libraryGroundY) {
            const playerTouches = Math.max(0, Math.floor(bk.playerTouchCount || 0));
            if (!libraryRunJuggleToiletDone && !libraryRunJuggleToiletFailed && playerTouches >= 10) {
                libraryRunJuggleToiletFailed = true;
            }
            explosions.push({ x: bk.x + bk.w * 0.5, y: libraryGroundY - 10, timer: 0 });
            if (window.BHAudio) {
                window.BHAudio.play('library_plop', { volumeMul: 0.9 });
            }
            libraryBooks.splice(i, 1);
        }
    }
}

/**
 * Описание.
 */
/**
 * Применяет к книге импульс и переводит её в состояние дугового полёта.
 * Сила импульса зависит от точки удара, направления и множителя мощности.
 * @param {object} bk - Объект книги.
 * @param {number} hitY - Координата Y точки попадания.
 * @param {number} pushDir - Направление импульса: `-1` влево, `1` вправо.
 * @param {number} [powerMul=1] - Множитель силы импульса.
 * @param {boolean} [addScore=false] - Нужно ли начислять очки за попадание.
 */
function applyLibraryBookArcImpulse(bk, hitY, pushDir, powerMul = 1, addScore = false, fromPlayer = false) {
    const hitFraction = Math.max(0, Math.min(1, (hitY - bk.y) / Math.max(1, bk.h)));
    const upFactor = 0.6 + hitFraction * 1.6;
    const heightFactor = 0.55 + ((canvas.height - hitY) / canvas.height) * 0.9;
    const baseSpeed = (190 + Math.random() * 170) * Math.max(0.4, powerMul);
    const dir = pushDir >= 0 ? 1 : -1;

    bk.vx = dir * baseSpeed * (0.45 + Math.random() * 0.65);
    bk.vy = -(baseSpeed * upFactor * heightFactor * (0.7 + Math.random() * 0.6));
    bk.state = 'arc';
    bk.gravity = 320 + Math.random() * 180;
    bk.rotSpeed = (Math.random() < 0.5 ? 1 : -1) * (3 + Math.random() * 6);
    if (window.BHAudio) {
        window.BHAudio.play('book_hit', { volumeMul: 0.8 });
    }

    if (fromPlayer) {
        bk.touchedByPlayer = true;
        bk.playerTouchCount = Math.max(0, Math.floor(bk.playerTouchCount || 0)) + 1;
    }
    if (addScore) score += 5;
}

/**
 * Проверяет попадания пуль игрока по книгам с pixel-perfect логикой.
 * При попадании удаляет пулю и применяет импульс книге.
 */
function updateLibraryBookHitsByPlayerBullets() {
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        const br = Math.max(2, b.r || 8);
        let hit = false;

        for (let ki = libraryBooks.length - 1; ki >= 0; ki--) {
            const bk = libraryBooks[ki];
            const cx = bk.x + bk.w * 0.5;
            const cy = bk.y + bk.h * 0.5;
            const boundR = Math.hypot(bk.w * 0.5, bk.h * 0.5);
            const dx = b.x - cx;
            const dy = b.y - cy;
            if (dx * dx + dy * dy > (boundR + br) * (boundR + br)) continue;
            if (!isLibraryBulletPixelHit(b, bk)) continue;

            const bulletVx = (typeof b.vx === 'number' && b.vx !== 0) ? b.vx : 5;
            const pushDir = bulletVx >= 0 ? 1 : -1;
            applyLibraryBookArcImpulse(bk, b.y, pushDir, 1.0, true, true);

            bullets.splice(bi, 1);
            hit = true;
            break;
        }
        if (hit) continue;
    }
}

/**
 * Проверяет столкновение книги с непрозрачными пикселями спрайта игрока.
 * Использует сетку семплов в зоне пересечения для точной реакции.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryBookHitsByPlayerSprite(dt) {
    if (!player || typeof player.isOpaqueAtWorld !== 'function') return;
    if (!libraryBooks || libraryBooks.length === 0) return;

    for (let i = libraryBooks.length - 1; i >= 0; i--) {
        const bk = libraryBooks[i];
        bk.playerHitCooldown = Math.max(0, (bk.playerHitCooldown || 0) - dt);
        if (bk.playerHitCooldown > 0) continue;

        const x1 = Math.max(player.x, bk.x);
        const y1 = Math.max(player.y, bk.y);
        const x2 = Math.min(player.x + player.w, bk.x + bk.w);
        const y2 = Math.min(player.y + player.h, bk.y + bk.h);
        if (x2 <= x1 || y2 <= y1) continue;

        const overlapW = x2 - x1;
        const overlapH = y2 - y1;
        const cols = 5;
        const rows = 5;
        let hit = false;
        let hitY = y1 + overlapH * 0.5;

        for (let ry = 0; ry < rows && !hit; ry++) {
            const py = y1 + ((ry + 0.5) / rows) * overlapH;
            for (let rx = 0; rx < cols; rx++) {
                const px = x1 + ((rx + 0.5) / cols) * overlapW;
                if (!player.isOpaqueAtWorld(px, py)) continue;
                if (!isLibraryBookOpaqueAtWorldPoint(bk, px, py)) continue;
                hit = true;
                hitY = py;
                break;
            }
        }
        if (!hit) continue;

        let pushDir = 0;
        if (keys["ArrowLeft"] && !keys["ArrowRight"]) pushDir = -1;
        else if (keys["ArrowRight"] && !keys["ArrowLeft"]) pushDir = 1;
        else {
            const pcx = player.x + player.w * 0.5;
            const bcx = bk.x + bk.w * 0.5;
            pushDir = (bcx >= pcx) ? 1 : -1;
        }

        const power = player.isJumping ? 1.12 : 1.0;
        applyLibraryBookArcImpulse(bk, hitY, pushDir, power, false, true);
        bk.playerHitCooldown = 0.08;
    }
}

/**
 * Обновляет частицы брызг: позицию, скорость, гравитацию и время жизни.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryCatchSplashes(dt) {
    if (!libraryCatchSplashes || libraryCatchSplashes.length === 0) return;
    libraryCatchSplashes = libraryCatchSplashes.filter(p => {
        p.timer += dt;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.timer < p.life;
    });
}

/**
 * Обновляет таймеры выпадения бонусов (сердце/пиво) в режиме библиотеки.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryDropTimers(dt) {
    libraryHeartDropTimer += dt;
    if (libraryHeartDropTimer >= 1.0) {
        libraryHeartDropTimer -= 1.0;
        if (Math.random() < 0.05) {
            const hs = librarySize(40, 40, 24, 24);
            const w = hs.w;
            const h = hs.h;
            const edgeInset = libraryPx(12, 8);
            const laneInset = edgeInset * 2;
            hearts.push({
                x: edgeInset + Math.random() * Math.max(1, canvas.width - w - laneInset),
                y: -h - 10,
                w,
                h,
                fromTop: true
            });
        }
    }

    libraryBeerDropTimer += dt;
    if (libraryBeerDropTimer >= libraryNextBeerDropTime) {
        libraryBeerDropTimer = 0;
        libraryNextBeerDropTime = libraryRand(10, 15);
        const bs = librarySize(36, 36, 20, 20);
        const w = bs.w;
        const h = bs.h;
        const edgeInset = libraryPx(12, 8);
        const laneInset = edgeInset * 2;
        bottles.push({
            x: edgeInset + Math.random() * Math.max(1, canvas.width - w - laneInset),
            y: -h - 10,
            w,
            h,
            fromTop: true
        });
    }
}

/**
 * Полностью сбрасывает runtime-состояние уровня «Библиотека».
 * Очищает книги, боссов, эффекты, таймеры и внутренние счётчики.
 */
function resetLibraryLevelState() {
    libraryBooks = [];
    libraryBooksSpawned = 0;
    librarySpawnTimer = 0;
    libraryNextSpawnDelay = 1.5;
    libraryGroundY = 0;

    libraryTopRail = null;
    libraryBosses = [];
    libraryToilet = null;
    libraryToiletCaughtBooks = 0;
    libraryToiletShots = [];
    libraryCatchSplashes = [];

    libraryHeartDropTimer = 0;
    libraryBeerDropTimer = 0;
    libraryNextBeerDropTime = libraryRand(10, 15);
    libraryVictoryShown = false;
    libraryRunBeerPicked = false;
    libraryRunToiletBooksByPlayer = 0;
    libraryRunJuggleToiletDone = false;
    libraryRunJuggleToiletFailed = false;

    libraryLayoutWidth = 0;
    libraryLayoutHeight = 0;
    libraryCatchPlatformDebugTimer = 0;
}

/**
 * Инициализирует уровень «Библиотека» перед стартом.
 * Выполняет сброс состояния и пересчёт layout под текущий размер canvas.
 */
function initLibraryLevel() {
    resetLibraryLevelState();
    refreshLibraryLayout();
    libraryLayoutWidth = canvas.width;
    libraryLayoutHeight = canvas.height;
    libraryCatchPlatformDebugTimer = libraryToiletCatchPlatformTuning.debugVisibleSeconds;
}

/**
 * Главный update-цикл уровня «Библиотека».
 * Обновляет layout, физику книг, поведение боссов/унитаза, бонусы и условие победы.
 * @param {number} dt - Время кадра в секундах.
 */
function updateLibraryBooks(dt) {
    if (gameMode !== 'library') return;

    if (canvas.width !== libraryLayoutWidth || canvas.height !== libraryLayoutHeight) {
        refreshLibraryLayout();
        libraryLayoutWidth = canvas.width;
        libraryLayoutHeight = canvas.height;
    }
    libraryGroundY = canvas.height - libraryPx(20, 10);
    if (libraryCatchPlatformDebugTimer > 0) {
        libraryCatchPlatformDebugTimer = Math.max(0, libraryCatchPlatformDebugTimer - dt);
    }

    updateLibraryCatchSplashes(dt);
    updateLibraryManagedEnemyBullets(dt);
    updateLibraryToiletShots(dt);

    if (libraryVictoryShown) return;

    updateLibraryToilet(dt);
    updateLibraryBooksPhysics(dt);
    updateLibraryBookHitsByPlayerBullets();
    updateLibraryBookHitsByPlayerSprite(dt);
    updateLibraryBosses(dt);
    updateLibraryDropTimers(dt);

    const alive = getLibraryAliveBosses();
    if (alive.length === 0 && !libraryVictoryShown) {
        libraryVictoryShown = true;
        libraryBooks = [];
        libraryToiletShots = [];
        enemyBullets = enemyBullets.filter(b => !b.libraryBullet);
        if (!levelCompleteShown) {
            levelCompleteShown = true;
            showLevelComplete();
        }
    }
}
/**
 * Рисует изображение в прямоугольнике с сохранением пропорций (режим contain).
 * @param {HTMLImageElement} img - Изображение для отрисовки.
 * @param {number} x - Координата X области отрисовки.
 * @param {number} y - Координата Y области отрисовки.
 * @param {number} w - Ширина области отрисовки.
 * @param {number} h - Высота области отрисовки.
 */
function drawLibraryContainImage(img, x, y, w, h) {
    if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
    const fit = Math.min(w / Math.max(1, img.naturalWidth), h / Math.max(1, img.naturalHeight));
    const dw = img.naturalWidth * fit;
    const dh = img.naturalHeight * fit;
    const dx = x + (w - dw) * 0.5;
    const dy = y + (h - dh) * 0.5;
    ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Отрисовывает одного босса библиотеки с учётом типа, кадра и визуала урона.
 * @param {object} b - Объект босса для отрисовки.
 */
function drawLibraryBoss(b) {
    if (!b || !b.alive || b.hp <= 0) return;
    const blinkOn = (b.hitFlashTimer > 0) && (Math.floor(b.hitFlashTimer * 16) % 2 === 0);
    const renderAlpha = blinkOn ? 0.3 : 1;
    const shadowY = libraryTopRail ? libraryTopRail.y + 4 : (b.y + b.h + 4);
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(b.x + b.w * 0.5, shadowY, b.w * 0.38, Math.max(4, b.h * 0.08), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (b.type === 'o4ko') {
        if (o4koImgs.length > 0 && o4koSpritesReady > 0) {
            const img = o4koImgs[b.frame % o4koImgs.length];
            if (img && img.complete) {
                ctx.save();
                ctx.globalAlpha = renderAlpha;
                ctx.drawImage(img, b.x, b.y, b.w, b.h);
                ctx.restore();
                return;
            }
        }
        ctx.save();
        ctx.globalAlpha = renderAlpha;
        ctx.font = `${Math.round(b.h)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u{1F4A9}', b.x + b.w * 0.5, b.y + b.h * 0.5);
        ctx.restore();
        return;
    }

    if (b.type === 'nosok') {
        if (nosokImgs.length > 0 && nosokSpritesReady > 0) {
            const img = nosokImgs[b.frame % nosokImgs.length];
            if (img && img.complete) {
                ctx.save();
                ctx.globalAlpha = renderAlpha;
                ctx.drawImage(img, b.x, b.y, b.w, b.h);
                ctx.restore();
                return;
            }
        }
        ctx.save();
        ctx.globalAlpha = renderAlpha;
        ctx.font = `${Math.round(b.h)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u{1F9E6}', b.x + b.w * 0.5, b.y + b.h * 0.5);
        ctx.restore();
        return;
    }

    if (b.type === 'e67') {
        if (enemy67Img && enemy67Img.complete && enemy67Img.naturalWidth > 0 && enemy67Img.naturalHeight > 0) {
            const srcW = enemy67Img.naturalWidth;
            const srcH = enemy67Img.naturalHeight;
            if (srcW >= srcH * 1.8) {
                const sw = Math.floor(srcW / 2);
                const sh = srcH;
                const sx = (b.frame % 2) * sw;
                const fit = Math.min(b.w / sw, b.h / sh);
                const dw = sw * fit;
                const dh = sh * fit;
                const dx = b.x + (b.w - dw) * 0.5;
                const dy = b.y + (b.h - dh) * 0.5;
                ctx.save();
                ctx.globalAlpha = renderAlpha;
                ctx.drawImage(enemy67Img, sx, 0, sw, sh, dx, dy, dw, dh);
                ctx.restore();
            } else {
                ctx.save();
                ctx.globalAlpha = renderAlpha;
                drawLibraryContainImage(enemy67Img, b.x, b.y, b.w, b.h);
                ctx.restore();
            }
        } else {
            ctx.save();
            ctx.globalAlpha = renderAlpha;
            ctx.font = Math.round(b.h) + 'px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('7\uFE0F\u20E3', b.x + b.w * 0.5, b.y + b.h * 0.5);
            ctx.restore();
        }
        return;
    }

    // tele
    if (Array.isArray(enemy67TpFrames) && enemy67TpFramesReady > 0) {
        const img = enemy67TpFrames[b.frame % enemy67TpFrames.length];
        if (img && img.complete) {
            ctx.save();
            ctx.globalAlpha = renderAlpha;
            drawLibraryContainImage(img, b.x, b.y, b.w, b.h);
            ctx.restore();
            return;
        }
    }
    if (enemy67Img && enemy67Img.complete && enemy67Img.naturalWidth > 0 && enemy67Img.naturalHeight > 0) {
        const srcW = enemy67Img.naturalWidth;
        const srcH = enemy67Img.naturalHeight;
        if (srcW >= srcH * 1.8) {
            const sw = Math.floor(srcW / 2);
            const sh = srcH;
            const sx = (b.frame % 2) * sw;
            const fit = Math.min(b.w / sw, b.h / sh);
            const dw = sw * fit;
            const dh = sh * fit;
            const dx = b.x + (b.w - dw) * 0.5;
            const dy = b.y + (b.h - dh) * 0.5;
            ctx.save();
            ctx.globalAlpha = renderAlpha;
            ctx.drawImage(enemy67Img, sx, 0, sw, sh, dx, dy, dw, dh);
            ctx.restore();
            return;
        }
        ctx.save();
        ctx.globalAlpha = renderAlpha;
        drawLibraryContainImage(enemy67Img, b.x, b.y, b.w, b.h);
        ctx.restore();
        return;
    }
    ctx.save();
    ctx.globalAlpha = renderAlpha;
    ctx.font = `${Math.round(b.h)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('7\uFE0F\u20E3', b.x + b.w * 0.5, b.y + b.h * 0.5);
    ctx.restore();
}

/**
 * Отрисовывает унитаз-компаньон и его тень.
 * Если PNG недоступен, используется упрощённый fallback-рендер.
 */
function drawLibraryToilet() {
    if (!libraryToilet) return;
    const x = libraryToilet.x + (libraryToilet.shakeX || 0);
    const y = libraryToilet.y + (libraryToilet.shakeY || 0);

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(
        x + libraryToilet.w * 0.5,
        libraryGroundY + 6,
        libraryToilet.w * 0.42,
        Math.max(6, libraryToilet.h * 0.09),
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    if (libraryUnitazImg.complete && libraryUnitazImg.naturalWidth > 0) {
        ctx.drawImage(libraryUnitazImg, x, y, libraryToilet.w, libraryToilet.h);
        return;
    }

    // Описание.
    ctx.save();
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(x, y + libraryToilet.h * 0.2, libraryToilet.w, libraryToilet.h * 0.8);
    ctx.fillStyle = '#dbe3eb';
    ctx.fillRect(x + libraryToilet.w * 0.12, y, libraryToilet.w * 0.76, libraryToilet.h * 0.28);
    ctx.restore();
}

/**
 * Отрисовывает временный debug-прямоугольник платформы ловли унитаза.
 * Используется только для калибровки позиции/размера платформы.
 */
function drawLibraryToiletCatchPlatformDebug() {
    if (libraryCatchPlatformDebugTimer <= 0) return;
    const p = getLibraryToiletCatchPlatform();
    if (!p) return;
    const fade = Math.min(1, libraryCatchPlatformDebugTimer / 1.2);

    ctx.save();
    ctx.globalAlpha = 0.32 * fade;
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.globalAlpha = 0.95 * fade;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.restore();
}

/**
 * Главный draw-цикл уровня «Библиотека».
 * Отрисовывает боссов, унитаз, книги, снаряды унитаза и эффекты брызг.
 */
function drawLibraryBooks() {
    if (gameMode !== 'library') return;

    // Описание.
    for (let i = 0; i < libraryBosses.length; i++) {
        drawLibraryBoss(libraryBosses[i]);
    }

    // Описание.
    drawLibraryToilet();
    drawLibraryToiletCatchPlatformDebug();

    // Описание.
    for (let i = 0; i < libraryBooks.length; i++) {
        const bk = libraryBooks[i];
        const arr = getLibrarySpriteArray(bk.spriteSet);
        const len = Math.max(1, arr.length);
        const idx = ((bk.animFrame | 0) % len + len) % len;
        const img = arr[idx];
        ctx.save();
        ctx.translate(bk.x + bk.w * 0.5, bk.y + bk.h * 0.5);
        ctx.rotate(bk.rotation || 0);
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -bk.w * 0.5, -bk.h * 0.5, bk.w, bk.h);
        } else {
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(-bk.w * 0.5, -bk.h * 0.5, bk.w, bk.h);
        }
        ctx.restore();
    }

    // Описание.
    for (let i = 0; i < libraryToiletShots.length; i++) {
        const s = libraryToiletShots[i];
        const cx = s.x + s.w * 0.5;
        const cy = s.y + s.h * 0.5;
        if (s.img && s.img.complete) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(s.rotation || 0);
            ctx.drawImage(s.img, -s.w * 0.5, -s.h * 0.5, s.w, s.h);
            ctx.restore();
        } else {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(s.rotation || 0);
            ctx.font = `${Math.max(s.w, s.h)}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('\u{1F4A9}', 0, 0);
            ctx.restore();
        }
    }

    // Описание.
    for (let i = 0; i < libraryCatchSplashes.length; i++) {
        const p = libraryCatchSplashes[i];
        const lifeK = 1 - (p.timer / Math.max(0.001, p.life));
        ctx.save();
        ctx.globalAlpha = Math.max(0, lifeK);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
