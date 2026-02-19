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

// Состояние книг
let libraryBooks = [];           // массив активных книг
let libraryBooksSpawned = 0;     // счётчик заспавненных (для фаз)
let librarySpawnTimer = 0;       // таймер до следующего спавна
let libraryNextSpawnDelay = 1.5; // задержка до первого спавна
let libraryGroundY = 0;          // уровень пола

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
    if (n < 30) return { maxOnScreen: 5,  rateMin: 2.0, rateMax: 3.0, infinite: false };
    if (n < 60) return { maxOnScreen: 8,  rateMin: 1.0, rateMax: 2.0, infinite: false };
    return            { maxOnScreen: 12, rateMin: 0.6, rateMax: 1.0, infinite: true  };
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

            // Случайно выбираем набор спрайтов: 'br' (7 кадров) или 'bg' (4 кадра)
            const spriteSet = Math.random() < 0.5 ? 'br' : 'bg';
            const frameCount = spriteSet === 'br' ? 7 : 4;

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
        bk.x  += bk.vx * dt;
        bk.y  += bk.vy * dt;
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

        // Касание пола → взрыв
        if (bk.y + bk.h >= groundY) {
            explosions.push({ x: bk.x + bk.w / 2, y: groundY - 10, timer: 0 });
            libraryBooks.splice(i, 1);
        }
    }

    // --- Столкновения книг с пулями игрока ---
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        const br = b.r || 8;
        let hit = false;

        for (let ki = libraryBooks.length - 1; ki >= 0; ki--) {
            const bk = libraryBooks[ki];

            // AABB + радиус пули
            if (b.x + br < bk.x || b.x - br > bk.x + bk.w ||
                b.y + br < bk.y || b.y - br > bk.y + bk.h) continue;

            // Где по высоте попала пуля (0=верх книги, 1=низ)
            const hitFraction = Math.max(0, Math.min(1, (b.y - bk.y) / Math.max(1, bk.h)));

            // Чем ниже попала пуля — тем сильнее дуга вверх
            const upFactor = 0.6 + hitFraction * 1.6;

            // Чем выше на экране попадание — тем больше места для дуги
            const heightFactor = 0.55 + ((canvas.height - b.y) / canvas.height) * 0.9;

            // Направление толчка: берём из vx пули; если 0 — то по направлению игрока
            const bulletVx = (typeof b.vx === 'number' && b.vx !== 0) ? b.vx : 5;
            const pushDir = bulletVx >= 0 ? 1 : -1;

            const baseSpeed = 190 + Math.random() * 170;
            const launchVx = pushDir * baseSpeed * (0.45 + Math.random() * 0.65);
            const launchVy = -(baseSpeed * upFactor * heightFactor * (0.7 + Math.random() * 0.6));

            bk.vx      = launchVx;
            bk.vy      = launchVy;
            bk.state   = 'arc';
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
        const arr = bk.spriteSet === 'bg' ? libraryBookImgsBg : libraryBookImgs;
        const img = arr[bk.animFrame];
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


