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

/**
 * Параметры сетки сирени для текущего режима.
 * Desktop-значения не меняем.
 * Для mobile landscape в normal/survival используем адаптив относительно Full HD.
 * Для остальных режимов (включая 67/mode67) этот layout не используется.
 * @returns {{startX:number,startY:number,spacingX:number,spacingY:number,enemyW:number,enemyH:number}}
 */
function getLilacFormationLayout() {
    const adaptiveLilacMode = (gameMode === 'normal' || gameMode === 'survival')
        && (typeof isMobileAdaptiveCombatMode === 'function')
        && isMobileAdaptiveCombatMode(gameMode);
    if (!adaptiveLilacMode) {
        return {
            startX: 100,
            startY: ENEMY_START_Y,
            spacingX: ENEMY_X_SPACING,
            spacingY: ENEMY_Y_SPACING,
            enemyW: canvas.height * ENEMY_WIDTH_RATIO,
            enemyH: canvas.height * ENEMY_HEIGHT_RATIO
        };
    }

    const scale = (typeof getMobileLandscapeAdaptiveScale === 'function')
        ? getMobileLandscapeAdaptiveScale()
        : 1;

    const enemyW = Math.max(32, Math.round(REF_HEIGHT * ENEMY_WIDTH_RATIO * scale));
    const enemyH = Math.max(32, Math.round(REF_HEIGHT * ENEMY_HEIGHT_RATIO * scale));

    const sideMargin = Math.max(10, Math.round(canvas.width * 0.04));
    const fullFormationW = Math.max(enemyW, canvas.width - sideMargin * 2);
    // На мобиле слегка "сжимаем" построение по X, чтобы сирени были ближе,
    // но оставались по центру и визуально походили на desktop-раскладку.
    const compactFactor = 0.86;
    const formationW = Math.max(enemyW, Math.round(fullFormationW * compactFactor));
    const spacingX = (ENEMY_COLS > 1) ? ((formationW - enemyW) / (ENEMY_COLS - 1)) : 0;
    const startX = Math.round((canvas.width - formationW) * 0.5);

    const startY = Math.max(16, Math.round(canvas.height * 0.08));
    const maxFormationH = canvas.height * 0.33;
    const spacingY = (ENEMY_ROWS > 1)
        ? Math.min(Math.max(enemyH * 0.62, 18), maxFormationH / (ENEMY_ROWS - 1))
        : 0;

    return {
        startX,
        startY,
        spacingX,
        spacingY,
        enemyW,
        enemyH
    };
}

/**
 * Размеры обычных бонусов normal/survival (бутылка/сердце) с учетом mobile-landscape адаптива.
 * В desktop возвращает исторические размеры без изменений.
 * @param {'bottle'|'heart'} kind - тип бонуса.
 * @returns {{w:number,h:number}}
 */
function getCombatPickupSize(kind) {
    const base = (kind === 'heart')
        ? { w: 48, h: 48 }
        : { w: 18, h: 36 };
    if (!(typeof isMobileAdaptiveCombatMode === 'function' && isMobileAdaptiveCombatMode(gameMode))) {
        return base;
    }
    const scale = (typeof getMobileLandscapeAdaptiveScale === 'function')
        ? getMobileLandscapeAdaptiveScale()
        : 1;
    return {
        w: Math.max(kind === 'heart' ? 24 : 10, Math.round(base.w * scale)),
        h: Math.max(kind === 'heart' ? 24 : 20, Math.round(base.h * scale))
    };
}

// ==== ЛОГИКА ВРАГОВ ====
/**
 * Генерирует массив врагов в виде сетки
 */
/**
 * Создает стандартную сетку врагов для обычных режимов.
 */
function spawnEnemies() {
    const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
    const layout = getLilacFormationLayout();
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
                x: layout.startX + c * layout.spacingX,
                y: layout.startY + r * layout.spacingY,
                w: layout.enemyW,
                h: layout.enemyH,
                dir: 1,
                diving: false,
                targetX: 0,
                shootTimer: 0,
                flowers
            });
        }
    }
}
/**
 * Создаёт сетку врагов для указанной фазы (1..3).
 * Фаза влияет на множители скорости и частоты стрельбы.
 * Если `immediate` === true — создаём всю сетку сразу.
 */
function spawnNormalPhase(phase, immediate = true) {
    const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
    const layout = getLilacFormationLayout();
    enemies = [];
    const phaseMap = {
        1: { speedMul: 0.5, shootMul: 0.5 },
        2: { speedMul: 0.5, shootMul: 0.5 },
        3: { speedMul: 1.0, shootMul: 1.0 },
        4: { speedMul: 1.5, shootMul: 1.5 }
    };
    const mul = phaseMap[phase] || phaseMap[2];
    for (let r = 0; r < ENEMY_ROWS; r++) {
        for (let c = 0; c < ENEMY_COLS; c++) {
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
            const enemyW = layout.enemyW;
            const enemyH = layout.enemyH;
            const ex = layout.startX + c * layout.spacingX;
            const ey = layout.startY + r * layout.spacingY;
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
                phase: phase,
                speedMul: mul.speedMul,
                shootMul: mul.shootMul
            });
        }
    }
    // Если immediate === false, we will spawn incrementally via spawnOneNormalEnemy
}

/**
 * Начинает поодиночный спавн фазы (переход): в `normalPhaseSpawnTotal` будет общее число,
 * и во время `update` будет происходить по-одному созданию в течение 3 секунд.
 */
function startNormalPhaseSpawn(phase) {
    normalPhaseSpawning = true;
    normalPhaseSpawnTimer = 0;
    normalPhaseSpawnedCount = 0;
    normalPhaseSpawnTotal = ENEMY_ROWS * ENEMY_COLS;
    normalPhaseTarget = phase;
}

/**
 * Создаёт одного врага из сетки для фазы `phase` по индексу `idx` (row-major порядок).
 */
function spawnOneNormalEnemy(phase, idx) {
    const r = Math.floor(idx / ENEMY_COLS);
    const c = idx % ENEMY_COLS;
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
    const layout = getLilacFormationLayout();
    const enemyW = layout.enemyW;
    const enemyH = layout.enemyH;
    const ex = layout.startX + c * layout.spacingX;
    const ey = layout.startY + r * layout.spacingY;
    const phaseMap = {1: { speedMul: 0.5, shootMul: 0.5 }, 2: { speedMul: 0.5, shootMul: 0.5 }, 3: { speedMul: 1.0, shootMul: 1.0 }, 4: { speedMul: 1.5, shootMul: 1.5 }};
    const mul = phaseMap[phase] || phaseMap[2];
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
        phase: phase,
        speedMul: mul.speedMul,
        shootMul: mul.shootMul
    });
}
// ==== БОНУСЫ / ВОЛНЫ ====
/**
 * Пытается создать бонус в точке гибели врага.
 * @param {number} x - координата X врага.
 * @param {number} y - координата Y врага.
 */
function trySpawnBonus(x, y) {
    if (Math.random() < BONUS_CHANCE) {
        const size = getCombatPickupSize('bottle');
        bottles.push({ x, y, w: size.w, h: size.h });
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
        const size = getCombatPickupSize('heart');
        hearts.push({ x, y, w: size.w, h: size.h });
    }
}

/**
 * Спавнит бонус сверху экрана для режима "Очко".
 * @param {'beer'|'heart'|'banana'|'random'} kind - тип бонуса.
 * @returns {'beer'|'heart'|'banana'} фактически созданный тип.
 */
function spawnO4koDrop(kind = 'random') {
    const ma = window.BHMobileAdaptive;
    const o4koScale = (ma && typeof ma.getScale === 'function' && typeof ma.isActive === 'function' && ma.isActive('o4ko'))
        ? ma.getScale('o4ko')
        : 1;
    const edgeInset = Math.max(8, Math.round(12 * o4koScale));
    const laneInset = edgeInset * 2;

    let actual = kind;
    if (actual === 'random') {
        // random для уровня "Очко": 70% пиво, 30% сердце
        actual = Math.random() < 0.7 ? 'beer' : 'heart';
    }

    if (actual === 'beer') {
        const w = Math.max(20, Math.round(36 * o4koScale));
        const h = Math.max(20, Math.round(36 * o4koScale));
        const x = edgeInset + Math.random() * Math.max(1, canvas.width - w - laneInset);
        bottles.push({ x, y: -h - 8, w, h, fromTop: true });
        return 'beer';
    }
    if (actual === 'heart') {
        const w = Math.max(24, Math.round(40 * o4koScale));
        const h = Math.max(24, Math.round(40 * o4koScale));
        const x = edgeInset + Math.random() * Math.max(1, canvas.width - w - laneInset);
        hearts.push({ x, y: -h - 8, w, h, fromTop: true });
        return 'heart';
    }

    const w = Math.max(24, Math.round(40 * o4koScale));
    const h = Math.max(24, Math.round(40 * o4koScale));
    const x = edgeInset + Math.random() * Math.max(1, canvas.width - w - laneInset);
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
    const layout = getLilacFormationLayout();
    const w = layout.enemyW;
    const h = layout.enemyH;
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
        const layout = getLilacFormationLayout();
        const spacing = canvas.width / (count + 1);
        for (let i = 0; i < count; i++) {
            // Коллбек таймера спавнит очередного врага волны
            scheduleEnemySpawnTimeout(() => {
                if (!canSpawnScheduledLilacNow()) return;
                const rx = spacing * (i + 1);
                const ry = layout.startY + (Math.random() - 0.5) * Math.max(10, layout.enemyH * 0.2);
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

