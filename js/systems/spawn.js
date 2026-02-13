// ==== СПАВН / БОНУСЫ ====
/**
 * Инициализирует платформенный уровень и заполняет массив платформ.
 */
let pendingEnemySpawnTimeouts = [];

/**
 * Очищает все отложенные таймеры спавна врагов.
 */
function clearScheduledEnemySpawns() {
    if (!pendingEnemySpawnTimeouts.length) return;
    for (let i = 0; i < pendingEnemySpawnTimeouts.length; i++) {
        clearTimeout(pendingEnemySpawnTimeouts[i]);
    }
    pendingEnemySpawnTimeouts = [];
}

/**
 * Ставит таймер спавна и отслеживает его для последующей очистки.
 * @param {Function} cb - коллбек таймера.
 * @param {number} delayMs - задержка в миллисекундах.
 */
function scheduleEnemySpawnTimeout(cb, delayMs) {
    let timerId = null;
    const wrapped = () => {
        pendingEnemySpawnTimeouts = pendingEnemySpawnTimeouts.filter(id => id !== timerId);
        cb();
    };
    timerId = setTimeout(wrapped, delayMs);
    pendingEnemySpawnTimeouts.push(timerId);
}

/**
 * Проверяет, допустим ли отложенный спавн сирени в текущем состоянии игры.
 * @returns {boolean}
 */
function canSpawnScheduledLilacNow() {
    if (!running || paused || levelCompleteShown || gameOverShown) return false;
    return gameMode === 'normal' || gameMode === 'survival';
}

function initPlatformLevel() {
    platforms = [];
    
    // Все размеры и позиции в процентах от размера canvas для адаптивности
    const cw = canvas.width;
    const ch = canvas.height;
    
    // ========== НАЧАЛЬНАЯ ПЛАТФОРМА (ДОМАШНЯЯ ПЛАТФОРМА) ==========
    // cw X: 7% от ширины (примерно центр слева)
    // ch Y: 35% от верха
    // cw Ширина: 30% от ширины экрана
    // ch Высота: 10% от высоты экрана
    // Движение: null (статичная)
    // Скорость: 50 (не используется для статичных)
    // Диапазон: 200 (не используется для статичных)
    // Текстура: null (без текстуры)
    // Видимость: false (невидимая для скорости, но игрок на ней стартует)
    homePlatform = new Platform(cw * 0.07, ch * 0.35, cw*0.3, ch * 0.1, null, 50, 200, null, false);
    platforms.push(homePlatform);
    
    // ========== ЛЕВАЯ НИЖНЯЯ ПЛАТФОРМА ==========
    // X: 5% от ширины экрана
    // Y: 70% от верха (30% от низа)
    // Ширина: 30% от ширины экрана
    // Высота: 20% от высоты экрана
    // Движение: null (статичная)
    // Скорость: 50 (не используется)
    // Диапазон: 200 (не используется)
    // Текстура: img/platform2.png
    // Видимость: true (по умолчанию)
    let platform67 = new Platform(cw * 0.05, ch * 0.65, cw * 0.20, ch * 0.15, null, 100, 200, 'img/platform1.png');
    platforms.push(platform67);
    
    // ========== ЦЕНТРАЛЬНАЯ ГОРИЗОНТАЛЬНАЯ ПЛАТФОРМА ==========
    // X: 40% от ширины (центр минус половина ширины платформы)
    // Y: 40% от верха
    // Ширина: 30% от ширины экрана
    // Высота: 20% от высоты экрана
    // Движение: 'horizontal' (влево-вправо)
    // Скорость: 50 (скорость колебаний)
    // Диапазон: 12% от ширины экрана (амплитуда движения)
    // Текстура: img/platform3.png
    // Видимость: true (по умолчанию)
    platforms.push(new Platform(cw * 0.425, ch * 0.70, cw * 0.20, ch * 0.15, 'horizontal', 400, cw * 0.18, 'img/platform3.png'));
    
    // ========== ПРАВАЯ ВЕРХНЯЯ ВЕРТИКАЛЬНАЯ ПЛАТФОРМА ==========
    // X: 80% от ширины экрана
    // Y: 55% от верха (измещено вниз для режима платформ)
    // Ширина: 15% от ширины экрана
    // Высота: 11% от высоты экрана
    // Движение: 'vertical' (вверх-вниз)
    // Скорость: 200 (скорость колебаний)
    // Диапазон: 22% от высоты экрана (амплитуда движения)
    // Текстура: img/platform4.png
    // Видимость: true (по умолчанию)
    bossPlatform = new Platform(cw * 0.80, ch * 0.55, cw * 0.15, ch * 0.11, 'vertical', 200, ch * 0.22, 'img/platform4.png')
    platforms.push(bossPlatform);
    
    // ========== ЛЕВАЯ ВЕРХНЯЯ ГОРИЗОНТАЛЬНАЯ ПЛАТФОРМА ==========
    // X: 20% от ширины экрана
    // Y: 20% от верха
    // Ширина: 15% от ширины экрана
    // Высота: 11% от высоты экрана
    // Движение: 'horizontal' (влево-вправо)
    // Скорость: 180 (быстрые колебания)
    // Диапазон: 50% от высоты экрана (большая амплитуда)
    // Текстура: img/platform5.png
    // Видимость: true (по умолчанию)
    let movingPlatform = new Platform(cw * 0.55, ch * 0.25, cw * 0.15, ch * 0.11, 'horizontal', 800, ch * 0.18, 'img/platform5.png');
    platforms.push(movingPlatform);
    // платформа с кубком. 
    let trophyPlatform = new Platform(cw * 0.82, ch * 0.13, cw * 0.15, ch * 0.11, null, 180, ch * 0.50, 'img/platform8.png');
    platforms.push(trophyPlatform);
}

/**
 * Спавнит врагов на платформах для режима platforms
 */
/**
 * Спавнит врагов на платформах для режима "platforms".
 */
function spawnEnemiesOnPlatforms() {
    const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
    enemies = [];
    
    // Берем только средние и верхние платформы (не землю)
    // Отбираем платформы для спавна врагов; p — платформа, i — индекс
    const spawnPlatforms = platforms.filter((p, i) => i > 0 && i < platforms.length - 1);
    
    // Для каждой платформы спавним 1-2 врага; plat — платформа
    spawnPlatforms.forEach(plat => {
        // На каждой платформе 1-2 врага
        const numEnemies = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numEnemies; i++) {
            const flowers = [];
            for (let j = 0; j < 18; j++) {
                const angle = Math.PI * 2 * Math.random();
                const rad = 0.18 + Math.random() * 0.18;
                const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
                const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
                const sizeK = 0.5 + Math.random()*0.5;
                const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
                flowers.push({relX, relY, rad, sizeK, color});
            }
            
            const enemyW = canvas.height * ENEMY_WIDTH_RATIO;
            const enemyH = canvas.height * ENEMY_HEIGHT_RATIO;
            const spacing = plat.w / (numEnemies + 1);
            const ex = plat.x + spacing * (i + 1) - enemyW / 2;
            const ey = plat.y - enemyH - 5;
            
            enemies.push({
                x: ex,
                y: ey,
                w: enemyW,
                h: enemyH,
                dir: 1,
                diving: false,
                targetX: 0,
                shootTimer: 0,
                flowers,
                platformIndex: platforms.indexOf(plat) // запоминаем платформу
            });
        }
    });
}

// ---------- ВРАГИ ----------

// ==== ЛОГИКА ВРАГОВ ====
/**
 * Генерирует массив врагов в виде сетки
 */
/**
 * Создает стандартную сетку врагов для обычных режимов.
 */
function spawnEnemies() {
    const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
    enemies = [];
    for (let r = 0; r < ENEMY_ROWS; r++) {
        for (let c = 0; c < ENEMY_COLS; c++) {
            // Генерируем массив кружков для грозди сирени
            const flowers = [];
            for (let i = 0; i < 18; i++) {
                const angle = Math.PI * 2 * Math.random();
                const rad = 0.18 + Math.random() * 0.18;
                const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
                const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
                const sizeK = 0.5 + Math.random()*0.5;
                const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
                flowers.push({relX, relY, rad, sizeK, color});
            }
            enemies.push({
                x: 100 + c * ENEMY_X_SPACING,
                y: ENEMY_START_Y + r * ENEMY_Y_SPACING,
                w: canvas.height * ENEMY_WIDTH_RATIO,
                h: canvas.height * ENEMY_HEIGHT_RATIO,
                dir: 1,
                diving: false,
                targetX: 0,
                shootTimer: 0,
                flowers
            });
        }
    }
}
// ==== БОНУСЫ / ВОЛНЫ ====
/**
 * Пытается создать бонус в точке гибели врага.
 * @param {number} x - координата X врага.
 * @param {number} y - координата Y врага.
 */
function trySpawnBonus(x, y) {
    if (Math.random() < BONUS_CHANCE) {
        bottles.push({ x, y, w: 18, h: 36 });
    }
}

/**
 * Пытается создать сердечко с определённым шансом
 * @param {number} x - координата X врага
 * @param {number} y - координата Y врага
 */
/**
 * Пытается создать сердечко в точке гибели врага.
 * @param {number} x - координата X врага.
 * @param {number} y - координата Y врага.
 */
function trySpawnHeart(x, y) {
    if (Math.random() < HEART_CHANCE) {
        hearts.push({ x, y, w: 48, h: 48 });
    }
}

/**
 * Спавнит бонус сверху экрана для режима "Очко".
 * @param {'beer'|'heart'|'banana'|'random'} kind - тип бонуса.
 * @returns {'beer'|'heart'|'banana'} фактически созданный тип.
 */
function spawnO4koDrop(kind = 'random') {
    let actual = kind;
    if (actual === 'random') {
        // random для уровня "Очко": 70% пиво, 30% сердце
        actual = Math.random() < 0.7 ? 'beer' : 'heart';
    }

    if (actual === 'beer') {
        const w = 36;
        const h = 36;
        const x = 12 + Math.random() * Math.max(1, canvas.width - w - 24);
        bottles.push({ x, y: -h - 8, w, h, fromTop: true });
        return 'beer';
    }
    if (actual === 'heart') {
        const w = 40;
        const h = 40;
        const x = 12 + Math.random() * Math.max(1, canvas.width - w - 24);
        hearts.push({ x, y: -h - 8, w, h, fromTop: true });
        return 'heart';
    }

    const w = 40;
    const h = 40;
    const x = 12 + Math.random() * Math.max(1, canvas.width - w - 24);
    bananaBonuses.push({ x, y: -h - 8, w, h, fromTop: true });
    return 'banana';
}

// Спавнит одного врага примерно в заданных координатах центра
/**
 * Спавнит одного врага по приблизительным координатам центра.
 * @param {number} cx - координата X центра.
 * @param {number} cy - координата Y центра.
 */
function spawnEnemyAt(cx, cy) {
    if (!canSpawnScheduledLilacNow()) return;
    const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
    const flowers = [];
    for (let i = 0; i < 18; i++) {
        const angle = Math.PI * 2 * Math.random();
        const rad = 0.18 + Math.random() * 0.18;
        const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
        const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
        const sizeK = 0.5 + Math.random()*0.5;
        const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
        flowers.push({relX, relY, rad, sizeK, color});
    }
    const w = canvas.height * ENEMY_WIDTH_RATIO;
    const h = canvas.height * ENEMY_HEIGHT_RATIO;
    enemies.push({ x: cx - w/2, y: cy - h/2, w, h, dir: 1, diving: false, targetX: 0, shootTimer: 0, flowers });
}

/**
 * Планирует появление волны врагов с интервалом по времени.
 * @param {number} cx - базовая координата X для спавна.
 * @param {number} cy - базовая координата Y для спавна.
 * @param {number} count - количество врагов в волне.
 * @param {number} intervalMs - интервал между спавнами в миллисекундах.
 */
function scheduleWave(cx, cy, count, intervalMs) {
    // Если волна большая (например, 12), спавним их по горизонтали по всему полю
    if (count >= 12) {
        const spacing = canvas.width / (count + 1);
        for (let i = 0; i < count; i++) {
            // Коллбек таймера спавнит очередного врага волны
            scheduleEnemySpawnTimeout(() => {
                if (!canSpawnScheduledLilacNow()) return;
                const rx = spacing * (i + 1);
                const ry = ENEMY_START_Y + (Math.random() - 0.5) * 20;
                spawnEnemyAt(rx, ry);
            }, i * intervalMs);
        }
        return;
    }
    for (let i = 0; i < count; i++) {
        // Коллбек таймера спавнит очередного врага волны
        scheduleEnemySpawnTimeout(() => {
            if (!canSpawnScheduledLilacNow()) return;
            // небольшой случайный разброс, чтобы враги не накладывались
            const rx = cx + (Math.random() - 0.5) * 60;
            const ry = cy + (Math.random() - 0.5) * 40;
            spawnEnemyAt(rx, ry);
        }, i * intervalMs);
    }
}

