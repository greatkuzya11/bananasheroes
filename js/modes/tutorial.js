// ==== РЕЖИМ "ОБУЧЕНИЕ" ====

const TUTORIAL_MODE_KEY = 'bh_tutorial_done_v1';

const TUTORIAL_PHASE = Object.freeze({
    HUD: 0,
    MOVE: 1,
    BASIC_SHOOT: 2,
    BONUS_SHOOT: 3,
    ALT_SHOOT: 4,
    BANANA_1: 5,
    MAX_JUMP_SHOOT: 6,
    PLATFORM_MAX: 7,
    BANANA_2: 8,
    BOSS_67: 9,
    FINAL: 10
});

let _tActive = false;
let _tPhase = 0;
let _tSubPhase = 0;
let _tOverlay = null;
let _tOverlayTimer = 0;
let _tWaitKey = false;
let _tWaitKeyLock = 0;
let _tPendingAnyKey = false;
let _tWaitShootWasDown = false;
let _tSuppressShootUntilRelease = false;
let _tFrozen = false;
let _tHint = '';
let _tHintPulse = 0;

let _tArrow = null;
let _tBananaz = [];
let _tBananaUsed = [false, false, false];

let _tBossSpawned = false;
let _tBossDeathTimer = 0;
let _tBossDoneMessageTimer = 0;
let _tDone = false;

let _tKillCount = 0;
let _tKillTarget = 0;
let _tSavedLives = PLAYER_LIVES;
let _tSwitchCount = 0;
let _tCharOrder = ['kuzy', 'max', 'dron'];
let _tCurrentCharIdx = 0;

let _tHomePlatform = null;
let _tStepPlatforms = [];
let _tTempPlatform = null;
let _tUsePlatformPhysics = false;
let _tUseStepPlatforms = false;
let _tGroundY = 0;
let _tMarkerX = 0;
let _tMarkerY = 0;

let _tJumpWasActive = false;
let _tJumpCount = 0;
let _tPhase3WrongShotTimer = 0;
let _tWaitContinue = null;
let _tTutorialHeartSpawned = false;
let _tBananaMaskCache = new Map();

let _tLastHudHtml = '';
let _tLastHudLives = -1;
let _tCachedLivesStr = '';

const _tLilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
const _tLeafEmojis = ["🍃", "🍂", "🍁", "🌿", "🌱"];

/**
 * Возвращает runtime-параметры мобильного адаптива для уровня "Обучение".
 * @param {number} dt - время кадра.
 * @returns {{active:boolean,scale:number,frameMul:number,speedMul:number}}
 */
function getTutorialAdaptiveRuntime(dt) {
    const ma = window.BHMobileAdaptive;
    if (ma && typeof ma.runtime === 'function') {
        return ma.runtime(dt, 'tutorial');
    }
    const active = (typeof isMobileAdaptiveCombatMode === 'function')
        ? isMobileAdaptiveCombatMode('tutorial')
        : false;
    const scale = active && (typeof getMobileLandscapeAdaptiveScale === 'function')
        ? getMobileLandscapeAdaptiveScale('tutorial')
        : 1;
    return { active, scale, frameMul: dt * 60, speedMul: active ? scale : 1 };
}

/**
 * Масштабирует пиксельное значение под mobile landscape для уровня обучения.
 * @param {number} value - базовое значение.
 * @param {number} minValue - минимальное значение.
 * @param {boolean} round - округлять ли результат.
 * @returns {number}
 */
function tutorialPx(value, minValue = 0, round = true) {
    const ma = window.BHMobileAdaptive;
    if (ma && typeof ma.px === 'function') {
        return ma.px(value, 'tutorial', minValue, round);
    }
    return value;
}

/**
 * Масштабирует размер под mobile landscape для уровня обучения.
 * @param {number} w - базовая ширина.
 * @param {number} h - базовая высота.
 * @param {number} minW - минимальная ширина.
 * @param {number} minH - минимальная высота.
 * @returns {{w:number,h:number}}
 */
function tutorialSize(w, h, minW = 1, minH = 1) {
    const ma = window.BHMobileAdaptive;
    if (ma && typeof ma.size === 'function') {
        return ma.size(w, h, 'tutorial', minW, minH);
    }
    return { w, h };
}

/**
 * Возвращает профиль мобильного баланса для уровня обучения.
 * @returns {{enemyFireRate:number,enemyProjectileSpeed:number,enemyMoveSpeed:number,dropFallSpeed:number,bossMoveSpeed:number,homing:number,targetFallSpeed:number}}
 */
function getTutorialMobileBalance() {
    const ma = window.BHMobileAdaptive;
    if (ma && typeof ma.getBalance === 'function') {
        return ma.getBalance('tutorial');
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
 * Подключает глобальный перехват клавиши стрельбы (Пробел) для пауз обучения.
 * Добавляется один раз за всю сессию.
 */
function _tEnsureAnyKeyListener() {
    if (window.__bhTutorialAnyKeyListener) return;
    window.__bhTutorialAnyKeyListener = true;
    window.addEventListener('keydown', (ev) => {
        if (!_tActive) return;
        if (!_tWaitKey) return;
        const isShootKey = ev && (ev.key === ' ' || ev.key === 'Spacebar' || ev.code === 'Space');
        if (!isShootKey) return;
        _tPendingAnyKey = true;
    }, true);
}

/**
 * Полный сброс runtime-состояния уровня обучения.
 */
function resetTutorialLevelState() {
    _tActive = false;
    _tPhase = TUTORIAL_PHASE.HUD;
    _tSubPhase = 0;
    _tOverlay = null;
    _tOverlayTimer = 0;
    _tWaitKey = false;
    _tWaitKeyLock = 0;
    _tPendingAnyKey = false;
    _tWaitShootWasDown = false;
    _tSuppressShootUntilRelease = false;
    _tFrozen = false;
    _tHint = '';
    _tHintPulse = 0;
    _tArrow = null;
    _tBananaz = [];
    _tBananaUsed = [false, false, false];
    _tBossSpawned = false;
    _tBossDeathTimer = 0;
    _tBossDoneMessageTimer = 0;
    _tDone = false;
    _tKillCount = 0;
    _tKillTarget = 0;
    _tSavedLives = PLAYER_LIVES;
    _tSwitchCount = 0;
    _tCurrentCharIdx = 0;
    _tHomePlatform = null;
    _tStepPlatforms = [];
    _tTempPlatform = null;
    _tUsePlatformPhysics = false;
    _tUseStepPlatforms = false;
    _tGroundY = 0;
    _tMarkerX = 0;
    _tMarkerY = 0;
    _tJumpWasActive = false;
    _tJumpCount = 0;
    _tPhase3WrongShotTimer = 0;
    _tWaitContinue = null;
    _tTutorialHeartSpawned = false;
    _tBananaMaskCache = new Map();
    _tLastHudHtml = '';
    _tLastHudLives = -1;
    _tCachedLivesStr = '';
}

/**
 * Создает игрока tutorial-режима.
 * В обучении у всех персонажей используется bananSprites-визуал (`spriteSystem='max'`),
 * а механика (прыжок/скорость/пули) берется из `type`.
 * @param {'kuzy'|'max'|'dron'} type - тип персонажа.
 */
function _tCreateTutorialPlayer(type) {
    player = new Player(type, 'max');
    // В обучении базовая "земля" фиксирована, поэтому после создания персонажа
    // синхронизируем его базовую высоту приземления с tutorial-ground.
    const baseY = _tGetTutorialGroundPlayerY(player);
    player.jumpBaseY = baseY;
    player.jumpStartY = baseY;
}

/**
 * Возвращает Y-координату "земли" для текущего игрока в обучении.
 * @param {Player} p - игрок.
 * @returns {number}
 */
function _tGetTutorialGroundPlayerY(p) {
    const target = p || player;
    if (!target) return canvas.height - 10;
    if (_tHomePlatform) {
        return _tHomePlatform.y - target.h + _tHomePlatform.h * 0.28;
    }
    if (_tGroundY > 0) {
        return _tGroundY - target.h;
    }
    return canvas.height - target.h - 10;
}

/**
 * Синхронизирует высоту бананов со средней высотой текущего спрайта игрока на земле.
 * Банан-станция должна быть доступна без обязательного прыжка.
 */
function _tSyncBananaYToPlayer() {
    if (!_tBananaz || !_tBananaz.length) return;
    const target = player || null;
    const estH = target ? target.h : Math.max(52, Math.round(canvas.height * PLAYER_H_RATIO));
    const groundY = _tGetTutorialGroundPlayerY(target || undefined);
    const y = groundY + estH * 0.5;
    for (let i = 0; i < _tBananaz.length; i++) {
        _tBananaz[i].y = y;
    }
}

/**
 * Возвращает прямоугольник AABB вокруг банан-станции.
 * @param {{x:number,y:number}} b - точка банана.
 * @returns {{x:number,y:number,w:number,h:number}}
 */
function _tBananaRect(b) {
    const sz = tutorialPx(40, 24);
    return { x: b.x - sz / 2, y: b.y - sz / 2, w: sz, h: sz };
}

/**
 * Возвращает true, если банан с указанным индексом должен быть видим в текущей фазе.
 * @param {number} idx - индекс банана.
 * @returns {boolean}
 */
function _tIsBananaVisible(idx) {
    if (_tBananaUsed[idx]) return false;
    if (idx === 0) return _tPhase === TUTORIAL_PHASE.BANANA_1;
    if (idx === 1) return _tPhase === TUTORIAL_PHASE.BANANA_2 && _tSubPhase === 0;
    if (idx === 2) return _tPhase === TUTORIAL_PHASE.FINAL;
    return false;
}

/**
 * Создает/возвращает alpha-маску банана-эмодзи для попиксельной коллизии.
 * @param {number} size - размер банана.
 * @returns {{w:number,h:number,data:Uint8ClampedArray}|null}
 */
function _tGetBananaMask(size) {
    const key = Math.max(8, Math.round(size));
    if (_tBananaMaskCache.has(key)) return _tBananaMaskCache.get(key);
    const c = document.createElement('canvas');
    c.width = key;
    c.height = key;
    const cctx = c.getContext('2d', { willReadFrequently: true });
    if (!cctx) return null;
    cctx.clearRect(0, 0, key, key);
    cctx.font = `${key}px serif`;
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText('🍌', key * 0.5, key * 0.5);
    let data = null;
    try {
        data = cctx.getImageData(0, 0, key, key).data;
    } catch (err) {
        return null;
    }
    const mask = { w: key, h: key, data };
    _tBananaMaskCache.set(key, mask);
    return mask;
}

/**
 * Попиксельно проверяет пересечение банана и непрозрачной части спрайта игрока.
 * @param {{x:number,y:number}} b - объект банана.
 * @returns {boolean}
 */
function _tBananaPixelHit(b) {
    const r = _tBananaRect(b);
    if (!rect(r, player)) return false;
    if (!player || typeof player.isOpaqueAtWorld !== 'function') {
        return _tPlayerIntersectsZone(r.x, r.y, r.w, r.h);
    }

    const mask = _tGetBananaMask(Math.max(r.w, r.h));
    if (!mask) return _tPlayerIntersectsZone(r.x, r.y, r.w, r.h);

    const x0 = Math.max(r.x, player.x);
    const y0 = Math.max(r.y, player.y);
    const x1 = Math.min(r.x + r.w, player.x + player.w);
    const y1 = Math.min(r.y + r.h, player.y + player.h);
    if (x1 <= x0 || y1 <= y0) return false;

    for (let wy = y0; wy < y1; wy += 1) {
        const by = Math.max(0, Math.min(mask.h - 1, Math.floor(((wy - r.y) / r.h) * mask.h)));
        for (let wx = x0; wx < x1; wx += 1) {
            const bx = Math.max(0, Math.min(mask.w - 1, Math.floor(((wx - r.x) / r.w) * mask.w)));
            const alpha = mask.data[(by * mask.w + bx) * 4 + 3];
            if (alpha < 20) continue;
            if (player.isOpaqueAtWorld(wx + 0.5, wy + 0.5)) return true;
        }
    }
    return false;
}

/**
 * Создает объект сирени для обучающих волн.
 * @param {number} x - координата X.
 * @param {number} y - координата Y.
 * @returns {object}
 */
function _tCreateLilacEnemy(x, y) {
    const minEnemySize = tutorialPx(34, 20);
    const w = Math.max(minEnemySize, Math.round(canvas.height * ENEMY_WIDTH_RATIO));
    const h = Math.max(minEnemySize, Math.round(canvas.height * ENEMY_HEIGHT_RATIO));
    const flowers = [];
    for (let i = 0; i < 18; i++) {
        const angle = Math.PI * 2 * Math.random();
        const rad = 0.18 + Math.random() * 0.18;
        const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random() * 0.7);
        const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random() * 0.7);
        const sizeK = 0.5 + Math.random() * 0.5;
        const color = _tLilacColors[Math.floor(Math.random() * _tLilacColors.length)];
        flowers.push({ relX, relY, rad, sizeK, color });
    }

    const bal = getTutorialMobileBalance();
    const patrolPad = tutorialPx(16, 8);
    return {
        x,
        y: y - h * 0.5,
        w,
        h,
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: canvas.width * 0.03 * (bal.enemyMoveSpeed || 1),
        minX: x - Math.max(patrolPad, canvas.width * 0.02),
        maxX: x + Math.max(patrolPad, canvas.width * 0.02),
        diving: false,
        targetX: 0,
        shootTimer: 0,
        flowers
    };
}

/**
 * Возвращает список платформ текущего обучающего уровня.
 * @returns {Platform[]}
 */
function _tCollectPlatforms() {
    const arr = [];
    if (_tHomePlatform) arr.push(_tHomePlatform);
    if (_tUseStepPlatforms) {
        for (let i = 0; i < _tStepPlatforms.length; i++) arr.push(_tStepPlatforms[i]);
    }
    if (_tTempPlatform) arr.push(_tTempPlatform);
    return arr;
}

/**
 * Перестраивает геометрию карты обучения под текущий размер canvas.
 */
function _tRebuildLayout() {
    const W = canvas.width;
    const H = canvas.height;
    const groundH = Math.max(tutorialPx(18, 10), Math.round(H * 0.03));
    _tGroundY = H * 0.94;

    // Техническая "земля": участвует в коллизии, но визуально в обучении не отрисовывается.
    _tHomePlatform = new Platform(0, _tGroundY, W, groundH, null, 0, 0, 'img/platform1.png', true, { solid: true });
    homePlatform = _tHomePlatform;

    // Три ступени для платформенного сегмента:
    // используем размеры/коллизии как в режиме "Платформы" (статичные, видимые).
    const stepW = W * 0.20;
    const stepH = H * 0.15;
    _tStepPlatforms = [
        new Platform(W * 0.30, _tGroundY - H * 0.22, stepW, stepH, null, 0, 0, 'img/platform1.png', true, { solid: true }),
        new Platform(W * 0.55, _tGroundY - H * 0.40, stepW, stepH, null, 0, 0, 'img/platform3.png', true, { solid: true }),
        new Platform(W * 0.80, _tGroundY - H * 0.58, stepW, stepH, null, 0, 0, 'img/platform4.png', true, { solid: true })
    ];

    const switchBananaX = W * 0.38;
    const estPlayerH = player ? player.h : Math.max(52, Math.round(H * PLAYER_H_RATIO));
    const estPlayerY = _tGroundY - estPlayerH + _tHomePlatform.h * 0.28;
    const switchBananaY = estPlayerY + estPlayerH * 0.5;
    _tBananaz = [
        { x: switchBananaX, y: switchBananaY, nextChar: 'max', label: '' },
        { x: switchBananaX, y: switchBananaY, nextChar: 'dron', label: '' },
        { x: W * 0.92, y: switchBananaY, nextChar: 'kuzy', label: '' }
    ];

    _tMarkerX = W * 0.22;
    _tMarkerY = _tHomePlatform.y - Math.max(tutorialPx(18, 12), H * 0.05);
    platforms = _tCollectPlatforms();
}

/**
 * Возвращает true, если игрок пересек заданную зону.
 * @param {number} x - X зоны.
 * @param {number} y - Y зоны.
 * @param {number} w - ширина зоны.
 * @param {number} h - высота зоны.
 * @returns {boolean}
 */
function _tPlayerIntersectsZone(x, y, w, h) {
    return rect({ x, y, w, h }, player);
}

/**
 * Включает центральное окно-паузу "нажми Пробел".
 * @param {string} text - текст окна.
 * @param {Function|null} onContinue - callback после продолжения.
 */
function _tSetWaitOverlay(text, onContinue = null) {
    _tOverlay = text;
    _tWaitKey = true;
    _tWaitKeyLock = 0.20;
    _tPendingAnyKey = false;
    _tWaitShootWasDown = !!(keys && keys[' ']);
    _tSuppressShootUntilRelease = false;
    _tFrozen = true;
    _tWaitContinue = onContinue;
}

/**
 * Устанавливает активный персонаж игрока с сохранением позиции.
 * @param {'kuzy'|'max'|'dron'} type - новый тип игрока.
 */
function _tSwitchToChar(type) {
    if (!player) return;
    selectedChar = type;
    const prevX = player.x;
    const prevY = player.y;
    const prevFacing = player.facingDir;
    _tCreateTutorialPlayer(type);
    player.x = prevX;
    player.y = prevY;
    player.facingDir = prevFacing || 'right';
    if (!_tUsePlatformPhysics) {
        const baseY = _tGetTutorialGroundPlayerY(player);
        player.jumpBaseY = baseY;
        const onGroundNow = Math.abs(player.y - baseY) <= tutorialPx(3, 2, false);
        if (!onGroundNow || player.isJumping || !player.onPlatform) {
            player.y = baseY;
            player.isJumping = false;
            player.vy = 0;
            player.jumpStartY = baseY;
            player.onPlatform = true;
        }
    }
    _tSyncBananaYToPlayer();
}

/**
 * Создает/обновляет центральную временную платформу.
 * @param {number} yRatio - вертикальная позиция (0..1).
 */
function _tCreateTempPlatform(yRatio) {
    const W = canvas.width;
    const H = canvas.height;
    const groundH = Math.max(tutorialPx(18, 10), Math.round(H * 0.03));
    const w = W * 0.22;
    const x = (W - w) * 0.5;
    _tTempPlatform = new Platform(x, H * yRatio, w, groundH, null, 0, 0, 'img/platform5.png', true, { solid: true });
    platforms = _tCollectPlatforms();
}

/**
 * Удаляет временную платформу, если она была активна.
 */
function _tClearTempPlatform() {
    _tTempPlatform = null;
    platforms = _tCollectPlatforms();
}

/**
 * Спавнит простую волну сирени по списку позиций.
 * @param {{x:number,y:number}[]} coords - позиции спавна.
 */
function _tSpawnLilacWave(coords) {
    enemies = [];
    for (let i = 0; i < coords.length; i++) {
        const c = coords[i];
        enemies.push(_tCreateLilacEnemy(c.x, c.y));
    }
    _tKillCount = 0;
    _tKillTarget = enemies.length;
}

/**
 * Спавнит бутылку бонуса на земле tutorial и ставит на нее стрелку.
 * @returns {{x:number,y:number,w:number,h:number}}
 */
function _tSpawnTutorialBottle() {
    const size = (typeof getCombatPickupSize === 'function')
        ? getCombatPickupSize('bottle')
        : { w: tutorialPx(18, 10), h: tutorialPx(36, 20) };
    const bx = canvas.width * 0.32;
    const by = _tHomePlatform.y - size.h;
    const item = { x: bx, y: by, w: size.w, h: size.h };
    bottles.push(item);
    _tArrow = {
        x: bx + size.w * 0.5,
        y: by - tutorialPx(28, 16),
        dir: 'down',
        label: '',
        kind: 'bottle'
    };
    return item;
}

/**
 * Убирает стрелку на бутылку, если бутылок на сцене больше нет.
 */
function _tClearBottleArrowIfNoBottle() {
    if (_tArrow && _tArrow.kind === 'bottle' && bottles.length === 0) {
        _tArrow = null;
    }
}

/**
 * Спавнит одиночную сирень на стороне, противоположной игроку.
 * @returns {void}
 */
function _tSpawnOppositeSideLilacAtPlayerHeight() {
    const W = canvas.width;
    const H = canvas.height;
    const eW = Math.max(tutorialPx(34, 20), Math.round(H * ENEMY_WIDTH_RATIO));
    const playerOnLeft = (player.x + player.w * 0.5) < W * 0.5;
    const spawnX = playerOnLeft ? (W * 0.80) : (W * 0.20);
    const spawnY = player.y;
    _tSpawnLilacWave([{ x: spawnX, y: spawnY }]);
    _tHint = 'Добей сирень на противоположной стороне!';
}

/**
 * Спавнит подпоследовательность фазы 2.
 */
function _tSpawnPhase2SubWave() {
    const W = canvas.width;
    const H = canvas.height;
    const eW = Math.max(tutorialPx(34, 20), Math.round(H * ENEMY_WIDTH_RATIO));
    const baseY = _tHomePlatform.y - Math.max(tutorialPx(26, 16), eW * 0.95);
    const edgePad = tutorialPx(12, 8);
    const yJitter = tutorialPx(8, 5);

    if (_tSubPhase === 0) {
        _tHint = 'Пробел — стрелять. Враги справа!';
        playerBulletDir = 'right';
        _tSpawnLilacWave([
            { x: Math.min(W - eW - edgePad, player.x + W * 0.30), y: baseY },
            { x: Math.min(W - eW - edgePad, player.x + W * 0.36), y: baseY - yJitter }
        ]);
        return;
    }

    if (_tSubPhase === 1) {
        _tHint = 'Враги слева! Нажми ↓, чтобы сменить направление, потом стреляй.';
        _tSpawnLilacWave([
            { x: Math.max(edgePad, player.x - W * 0.24), y: baseY },
            { x: Math.max(edgePad, player.x - W * 0.30), y: baseY - yJitter }
        ]);
        return;
    }

    _tHint = 'Враги сверху! Смени направление стрельбы вверх и стреляй вверх.';
    const topY = _tGroundY - H * 0.56;
    _tSpawnLilacWave([
        { x: W * 0.52, y: topY },
        { x: W * 0.66, y: topY - tutorialPx(6, 4) }
    ]);
}

/**
 * Спавнит волну бонусной стрельбы для фазы 3.
 */
function _tSpawnPhase3Wave() {
    const W = canvas.width;
    const H = canvas.height;
    const eW = Math.max(tutorialPx(34, 20), Math.round(H * ENEMY_WIDTH_RATIO));
    const baseY = _tHomePlatform.y - Math.max(tutorialPx(30, 18), eW);
    const offsetA = tutorialPx(30, 18);
    const offsetB = tutorialPx(12, 8);
    const offsetC = tutorialPx(24, 14);
    const offsetD = tutorialPx(8, 5);
    const offsetE = tutorialPx(18, 12);
    _tSpawnLilacWave([
        { x: W * 0.48, y: baseY - offsetA },
        { x: W * 0.56, y: baseY - offsetB },
        { x: W * 0.64, y: baseY - offsetC },
        { x: W * 0.72, y: baseY - offsetD },
        { x: W * 0.80, y: baseY - offsetE }
    ]);
}

/**
 * Спавнит волну altShootMode для фазы 4.
 */
function _tSpawnPhase4Wave() {
    const W = canvas.width;
    const H = canvas.height;
    const eW = Math.max(tutorialPx(34, 20), Math.round(H * ENEMY_WIDTH_RATIO));
    const edgePad = tutorialPx(8, 6);
    const yA = tutorialPx(16, 10);
    const yB = tutorialPx(24, 14);
    _tSpawnLilacWave([
        { x: Math.min(W - eW - edgePad, player.x + W * 0.24), y: _tHomePlatform.y - eW - yA },
        { x: Math.max(edgePad, player.x - W * 0.18), y: H * 0.34 },
        { x: Math.max(edgePad, player.x - W * 0.30), y: _tHomePlatform.y - eW - yB }
    ]);
}

/**
 * Спавнит волну для фазы 6 (Макс: прыжок + стрельба).
 */
function _tSpawnPhase6Wave() {
    const W = canvas.width;
    const H = canvas.height;
    const eW = Math.max(tutorialPx(34, 20), Math.round(H * ENEMY_WIDTH_RATIO));
    const y = _tGroundY - Math.max(tutorialPx(44, 26), eW * 1.05);
    _tSpawnLilacWave([
        { x: W * 0.56, y },
        { x: W * 0.68, y: y - tutorialPx(6, 4) },
        { x: W * 0.80, y }
    ]);
}

/**
 * Спавнит усиленную демонстрацию бонуса Макса: 9 разнесенных целей сверху.
 */
function _tSpawnPhase6MaxBonusWave() {
    const W = canvas.width;
    const H = canvas.height;
    const eW = Math.max(tutorialPx(34, 20), Math.round(H * ENEMY_WIDTH_RATIO));
    const topY = _tGroundY - H * 0.56;
    const points = [];
    for (let i = 0; i < 9; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        points.push({
            x: W * (0.44 + col * 0.11) + (row % 2 === 0 ? 0 : tutorialPx(14, 8)),
            y: topY + row * Math.max(tutorialPx(18, 10), eW * 0.32)
        });
    }
    _tSpawnLilacWave(points);
}

/**
 * Спавнит демонстрацию обычной стрельбы Дрона.
 */
function _tSpawnPhase8DronBaseWave() {
    const W = canvas.width;
    const H = canvas.height;
    const eW = Math.max(tutorialPx(34, 20), Math.round(H * ENEMY_WIDTH_RATIO));
    const y = _tGroundY - Math.max(tutorialPx(44, 26), eW * 1.05);
    _tSpawnLilacWave([
        { x: W * 0.52, y },
        { x: W * 0.62, y: y - tutorialPx(8, 5) },
        { x: W * 0.72, y },
        { x: W * 0.82, y: y - tutorialPx(6, 4) }
    ]);
}

/**
 * Спавнит ряд врагов для демонстрации пробивания бонусной пулей Дрона.
 */
function _tSpawnPhase8DronBonusRow() {
    const W = canvas.width;
    const H = canvas.height;
    const eW = Math.max(tutorialPx(34, 20), Math.round(H * ENEMY_WIDTH_RATIO));
    const y = _tGroundY - Math.max(tutorialPx(40, 24), eW * 1.02);
    const points = [];
    for (let i = 0; i < 7; i++) {
        points.push({ x: W * (0.50 + i * 0.06), y });
    }
    _tSpawnLilacWave(points);
}

/**
 * Проверяет, стоит ли игрок на верхней ступени.
 * Используется вместо грубого порога по Y, чтобы нельзя было скипнуть фазу.
 * @returns {boolean}
 */
function _tIsPlayerOnTopStep() {
    const p = _tStepPlatforms[2];
    if (!p || !player) return false;
    const centerX = player.x + player.w * 0.5;
    const feetY = player.y + player.h;
    return (
        centerX >= p.x + p.w * 0.08 &&
        centerX <= p.x + p.w * 0.92 &&
        feetY >= p.y - tutorialPx(8, 6) &&
        feetY <= p.y + p.h + tutorialPx(10, 7)
    );
}

/**
 * Устанавливает текущую фазу обучения и применяет стартовую конфигурацию.
 * @param {number} phase - номер фазы.
 */
function _tEnterPhase(phase) {
    _tPhase = phase;
    _tSubPhase = 0;
    _tHintPulse = 0;
    _tArrow = null;
    _tOverlay = null;
    _tOverlayTimer = 0;
    _tWaitKey = false;
    _tWaitContinue = null;
    _tFrozen = false;
    _tPendingAnyKey = false;
    _tJumpWasActive = !!(player && player.isJumping);
    _tJumpCount = 0;
    _tKillCount = 0;
    _tKillTarget = 0;
    _tPhase3WrongShotTimer = 0;
    _tUsePlatformPhysics = false;
    _tUseStepPlatforms = false;
    _tClearTempPlatform();
    enemies = [];
    bullets = [];
    enemyBullets = [];
    bottles = [];
    hearts = [];
    bananaBonuses = [];
    altShootMode = false;

    if (phase === TUTORIAL_PHASE.HUD) {
        _tHint = '';
        _tSetWaitOverlay(
            'Это обучение.\n\n' +
            '1) Жизни: потеряешь все — проиграешь.\n' +
            '2) Очки растут за убийства.\n' +
            '3) Комбо множит очки.\n\n' +
            'Нажми Пробел, чтобы начать.',
            () => _tEnterPhase(TUTORIAL_PHASE.MOVE)
        );
        return;
    }

    if (phase === TUTORIAL_PHASE.MOVE) {
        _tSwitchToChar('kuzy');
        _tCurrentCharIdx = 0;
        playerBulletDir = 'right';
        _tHint = '← → — ходить. ↑ — прыгнуть. У Кузи постепенный набор высоты в прыжке. Зажми прыжок — взлетишь выше!';
        _tArrow = { x: _tMarkerX, y: _tMarkerY, dir: 'down', label: 'Иди сюда' };
        return;
    }

    if (phase === TUTORIAL_PHASE.BASIC_SHOOT) {
        _tSwitchToChar('kuzy');
        _tCurrentCharIdx = 0;
        _tSpawnPhase2SubWave();
        return;
    }

    if (phase === TUTORIAL_PHASE.BONUS_SHOOT) {
        _tHint = 'Подбери пиво — получишь бонусные выстрелы. Переключи их кнопкой Shift. У Кузи бонусные выстрелы - это фонтан!';
        _tSpawnTutorialBottle();
        return;
    }

    if (phase === TUTORIAL_PHASE.ALT_SHOOT) {
        _tSetWaitOverlay(
            'Режим ALT-стрельбы.\n' +
            'Стрелки двигают и меняют направление.\n' +
            'В ALT: удерживай ↓ — стрельба вверх.\n\n' +
            'Нажми Пробел.',
            () => {
                altShootMode = true;
                _tFrozen = false;
                _tHint = 'Уничтожь 3 цели в ALT-режиме.';
                _tSubPhase = 1;
                _tSpawnPhase4Wave();
            }
        );
        return;
    }

    if (phase === TUTORIAL_PHASE.BANANA_1) {
        _tSwitchToChar('kuzy');
        _tCurrentCharIdx = 0;
        _tHint = 'Дотронься до банана, чтобы сменить персонажа.';
        _tArrow = { x: _tBananaz[0].x, y: _tBananaz[0].y - tutorialPx(54, 36), dir: 'down', label: '' };
        return;
    }

    if (phase === TUTORIAL_PHASE.MAX_JUMP_SHOOT) {
        _tHint = 'Макс: сначала обычные пули, потом бонусные.';
        _tSubPhase = 0;
        _tSpawnPhase6Wave();
        return;
    }

    if (phase === TUTORIAL_PHASE.PLATFORM_MAX) {
        _tUsePlatformPhysics = true;
        _tUseStepPlatforms = true;
        _tSavedLives = lives;
        _tHint = 'Доберись до верхней платформы ★. Падение не тратит жизни.';
        _tSetWaitOverlay(
            'Теперь платформенный сегмент.\n' +
            'Прыгай по трем ступеням справа.\n' +
            'Упадешь — вернешься без потери жизни.\n\n' +
            'Нажми Пробел.',
            () => {
                _tUsePlatformPhysics = true;
                _tFrozen = false;
            }
        );
        return;
    }

    if (phase === TUTORIAL_PHASE.BANANA_2) {
        _tUsePlatformPhysics = true;
        _tUseStepPlatforms = true;
        _tHint = 'Еще одна смена: дотронься до банана → Дрон.';
        _tArrow = { x: _tBananaz[1].x, y: _tBananaz[1].y - tutorialPx(54, 36), dir: 'down', label: '' };
        return;
    }

    if (phase === TUTORIAL_PHASE.BOSS_67) {
        _tUsePlatformPhysics = false;
        _tUseStepPlatforms = false;
        _tHint = 'Перейди в левую часть экрана, чтобы безопасно заспавнить босса 67.';
        enemy67 = null;
        _tBossSpawned = false;
        _tArrow = { x: _tMarkerX, y: _tMarkerY, dir: 'down', label: 'Иди влево' };
        _tBossDeathTimer = 0;
        _tBossDoneMessageTimer = 0;
        return;
    }

    if (phase === TUTORIAL_PHASE.FINAL) {
        _tUsePlatformPhysics = false;
        _tUseStepPlatforms = false;
        _tHint = 'Коснись последнего банана и заверши обучение.';
        _tArrow = { x: _tBananaz[2].x, y: _tBananaz[2].y - tutorialPx(54, 36), dir: 'down', label: '' };
    }
}

/**
 * Инициализирует уровень обучения.
 */
function initTutorialLevel() {
    resetTutorialLevelState();
    _tEnsureAnyKeyListener();
    _tActive = true;

    setRunBackground('img/bg-avs2.png');
    selectedChar = 'kuzy';
    _tCurrentCharIdx = 0;
    _tCreateTutorialPlayer('kuzy');
    playerBulletDir = 'right';

    _tRebuildLayout();
    _tSyncBananaYToPlayer();
    platforms = _tCollectPlatforms();
    homePlatform = _tHomePlatform;

    player.x = Math.max(tutorialPx(10, 6), Math.round(canvas.width * 0.08));
    player.y = _tGetTutorialGroundPlayerY(player);
    player.jumpBaseY = player.y;
    player.jumpStartY = player.y;
    player.facingDir = 'right';
    player.onPlatform = true;

    lives = PLAYER_LIVES;
    score = 0;
    combo = 0;
    bonusMode = false;
    bonusShots = 0;
    invuln = INVULN_TIME;
    levelCompleteShown = false;
    gameOverShown = false;

    _tEnterPhase(TUTORIAL_PHASE.HUD);
}

/**
 * Возвращает true, если сейчас активен обучающий режим.
 * @returns {boolean}
 */
function isTutorialModeActive() {
    return _tActive && gameMode === 'tutorial';
}

/**
 * Пересчитывает стрелку-подсказку после ресайза под текущую фазу.
 */
function _tRefreshPhaseArrow() {
    if (_tPhase === TUTORIAL_PHASE.BANANA_1) {
        _tArrow = { x: _tBananaz[0].x, y: _tBananaz[0].y - tutorialPx(54, 36), dir: 'down', label: '' };
    } else if (_tPhase === TUTORIAL_PHASE.BANANA_2) {
        _tArrow = { x: _tBananaz[1].x, y: _tBananaz[1].y - tutorialPx(54, 36), dir: 'down', label: '' };
    } else if (_tPhase === TUTORIAL_PHASE.FINAL) {
        _tArrow = { x: _tBananaz[2].x, y: _tBananaz[2].y - tutorialPx(54, 36), dir: 'down', label: '' };
    } else if (_tPhase === TUTORIAL_PHASE.MOVE && player && player.x <= canvas.width * 0.22) {
        _tArrow = { x: _tMarkerX, y: _tMarkerY, dir: 'down', label: 'Иди сюда' };
    } else if (_tPhase !== TUTORIAL_PHASE.MOVE) {
        _tArrow = null;
    }
}

/**
 * Обновляет геометрию и сущности tutorial-уровня после ресайза canvas.
 * @param {number} prevW - старая ширина canvas.
 * @param {number} prevH - старая высота canvas.
 */
function onTutorialResize(prevW, prevH) {
    if (!_tActive) return;
    const oldW = Math.max(1, prevW || canvas.width);
    const oldH = Math.max(1, prevH || canvas.height);
    const sx = canvas.width / oldW;
    const sy = canvas.height / oldH;

    _tRebuildLayout();
    homePlatform = _tHomePlatform;
    platforms = _tCollectPlatforms();

    if (player) {
        player.x *= sx;
        player.y *= sy;
        player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
        const baseY = _tGetTutorialGroundPlayerY(player);
        player.jumpBaseY = baseY;
        if (!_tUsePlatformPhysics && !player.isJumping) {
            player.y = baseY;
            player.jumpStartY = baseY;
        }
    }
    _tSyncBananaYToPlayer();

    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        e.x *= sx;
        e.y *= sy;
        e.minX *= sx;
        e.maxX *= sx;
        const shaped = _tCreateLilacEnemy(e.x, e.y);
        e.w = shaped.w;
        e.h = shaped.h;
        e.speed = shaped.speed;
    }

    for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i];
        b.x *= sx;
        b.y *= sy;
        if (typeof b.vx === 'number') b.vx *= sx;
        if (typeof b.vy === 'number') b.vy *= sy;
    }
    for (let i = 0; i < enemyBullets.length; i++) {
        const b = enemyBullets[i];
        b.x *= sx;
        b.y *= sy;
        if (typeof b.vx === 'number') b.vx *= sx;
        if (typeof b.vy === 'number') b.vy *= sy;
        const sz = tutorialSize(8, 12, 6, 8);
        b.w = sz.w;
        b.h = sz.h;
    }
    for (let i = 0; i < bottles.length; i++) {
        const b = bottles[i];
        b.x *= sx;
        b.y *= sy;
        const size = (typeof getCombatPickupSize === 'function')
            ? getCombatPickupSize('bottle')
            : { w: tutorialPx(18, 10), h: tutorialPx(36, 20) };
        b.w = size.w;
        b.h = size.h;
    }
    for (let i = 0; i < hearts.length; i++) {
        const h = hearts[i];
        h.x *= sx;
        h.y *= sy;
        const size = (typeof getCombatPickupSize === 'function')
            ? getCombatPickupSize('heart')
            : { w: tutorialPx(48, 24), h: tutorialPx(48, 24) };
        h.w = size.w;
        h.h = size.h;
    }
    for (let i = 0; i < explosions.length; i++) {
        explosions[i].x *= sx;
        explosions[i].y *= sy;
    }
    for (let i = 0; i < speechBalloons.length; i++) {
        speechBalloons[i].x *= sx;
        speechBalloons[i].y *= sy;
    }

    _tRefreshPhaseArrow();
}

/**
 * Обновляет таймеры взрывов/облачков.
 * @param {number} dt - время кадра.
 */
function _tUpdateFx(dt) {
    speechBalloons = speechBalloons.filter(sb => {
        sb.timer += dt;
        const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
        return sb.timer < dur;
    });
    explosions = explosions.filter(ex => {
        ex.timer += dt;
        const dur = (typeof ex.duration === 'number') ? ex.duration : 0.5;
        return ex.timer < dur;
    });
}

/**
 * Обновляет движение всех сиреневых врагов обучения.
 * @param {number} dt - время кадра.
 */
function _tUpdateLilacEnemies(dt) {
    const bal = getTutorialMobileBalance();
    const fireRate = Math.max(0.25, bal.enemyFireRate || 1);
    const projMul = Math.max(0.25, bal.enemyProjectileSpeed || 1);
    const bulletSize = tutorialSize(8, 12, 6, 8);
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        e.x += e.dir * e.speed * dt;
        if (e.x < e.minX) {
            e.x = e.minX;
            e.dir = 1;
        } else if (e.x > e.maxX) {
            e.x = e.maxX;
            e.dir = -1;
        }
        e.shootTimer += dt;
        if (_tPhase >= TUTORIAL_PHASE.BOSS_67) continue;
        // Наведение как в основном режиме: пуля летит к игроку с той же моделью.
        if (Math.random() < (0.002 * fireRate * (dt * 60)) && e.shootTimer > (0.9 / fireRate)) {
            e.shootTimer = 0;
            const bx = e.x + e.w * 0.5;
            const by = e.y + e.h;
            const px = player.x + player.w * 0.5;
            const py = player.y + player.h * 0.5;
            const dx = px - bx;
            const dy = py - by;
            const speed = 4.0 * projMul;
            const homing = 0.18;
            const angle = Math.atan2(dy, dx);
            const vx = Math.cos(angle) * speed * homing;
            const vy = Math.sin(angle) * speed * 0.9;
            enemyBullets.push({
                x: bx,
                y: by,
                w: bulletSize.w,
                h: bulletSize.h,
                emoji: _tLeafEmojis[Math.floor(Math.random() * _tLeafEmojis.length)],
                vx,
                vy
            });
        }
    }
}

/**
 * Обновляет движение пуль игрока/врагов и дропов.
 * @param {number} dt - время кадра.
 */
function _tUpdateProjectiles(dt) {
    const rt = getTutorialAdaptiveRuntime(dt);
    const frameMul = dt * 60;
    const speedMul = rt.active ? rt.speedMul : 1;
    const perf = window.BHBulletPerf;
    const rotationEnabled = perf ? perf.bulletRotationEnabled() : true;

    if (perf && perf.isEnabled()) perf.beforeBulletUpdate();
    for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i];
        if (typeof b.vx === 'number' && typeof b.vy === 'number') {
            b.x += b.vx * frameMul * speedMul;
            b.y += b.vy * frameMul * speedMul;
        } else {
            b.y -= b.speed * frameMul * speedMul;
        }
        if (rotationEnabled && b.playerType === 'dron' && typeof b.rotation === 'number') {
            b.rotation += 0.3;
        }
        if (b.playerType === 'max') {
            if (b.isBonus && rotationEnabled && typeof b.rotation === 'number') b.rotation += 0.3;
            if (!b.isBonus) b.swayAge = (b.swayAge || 0) + 0.15;
        }
    }
    if (perf && perf.isEnabled()) perf.afterBulletUpdate();

    for (let i = 0; i < enemyBullets.length; i++) {
        const b = enemyBullets[i];
        if (typeof b.vx === 'number' && typeof b.vy === 'number') {
            b.x += b.vx * frameMul * speedMul;
            b.y += b.vy * frameMul * speedMul;
        } else {
            b.y += 4 * frameMul * speedMul;
        }
    }

    const cullPad = tutorialPx(120, 80);
    bullets = bullets.filter(b => b.x >= -cullPad && b.x <= canvas.width + cullPad && b.y >= -cullPad && b.y <= canvas.height + cullPad);
    enemyBullets = enemyBullets.filter(b => b.x >= -cullPad && b.x <= canvas.width + cullPad && b.y >= -cullPad && b.y <= canvas.height + cullPad);
    const dropPad = tutorialPx(50, 30);
    bottles = bottles.filter(b => b.y < canvas.height + dropPad);
    hearts = hearts.filter(h => h.y < canvas.height + dropPad);
}

/**
 * Обрабатывает попадание пули игрока по врагам/боссу.
 * @param {object} b - объект пули.
 * @param {number} bi - индекс пули.
 */
function _tHandlePlayerBulletHit(b, bi) {
    // Сначала босс 67.
    if (enemy67 && enemy67.hp > 0) {
        const hitPad = tutorialPx(12, 8);
        const hit67 = enemy67.isOpaquePoint
            ? enemy67.isOpaquePoint(b.x, b.y, hitPad)
            : (b.x > enemy67.x && b.x < enemy67.x + enemy67.w && b.y > enemy67.y && b.y < enemy67.y + enemy67.h);
        if (hit67) {
            const dmg = (b.isBonus && (player.type === 'kuzy' || player.type === 'dron')) ? 2 : 1;
            enemy67.hp -= dmg;
            score += 5;
            combo++;
            const pt = enemy67.getRandomOpaquePoint
                ? enemy67.getRandomOpaquePoint(hitPad, tutorialPx(20, 12))
                : { x: enemy67.x + enemy67.w * 0.5, y: enemy67.y + enemy67.h * 0.5 };
            explosions.push({ x: pt.x, y: pt.y, timer: 0 });
            // Для босса 67 в обучении поведение как в основных уровнях:
            // любая пуля исчезает после попадания (в т.ч. бонусная у Дрона).
            bullets.splice(bi, 1);
            if (enemy67.hp <= 0) {
                enemy67 = null;
                _tBossDeathTimer = 1.0;
                _tSubPhase = 1;
            }
            return;
        }
    }

    for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            enemies.splice(ei, 1);
            explosions.push({ x: e.x + e.w * 0.5, y: e.y + e.h * 0.5, timer: 0 });
            score += 2;
            combo++;
            _tKillCount++;
            if (_tPhase === TUTORIAL_PHASE.BONUS_SHOOT && !b.isBonus) {
                _tPhase3WrongShotTimer = 1.6;
            }
            if ((_tPhase === TUTORIAL_PHASE.MAX_JUMP_SHOOT || _tPhase === TUTORIAL_PHASE.BANANA_2) && !b.isBonus) {
                _tPhase3WrongShotTimer = 1.2;
            }

            // Как в основных режимах: бонус Кузи дополнительно снимает ближайшую цель.
            if (b.isBonus && player.type === 'kuzy' && enemies.length > 0) {
                let nearestIdx = -1;
                let nearestDist = Infinity;
                const hx = e.x + e.w * 0.5;
                const hy = e.y + e.h * 0.5;
                for (let j = 0; j < enemies.length; j++) {
                    const ne = enemies[j];
                    const dx = (ne.x + ne.w * 0.5) - hx;
                    const dy = (ne.y + ne.h * 0.5) - hy;
                    const dist = Math.hypot(dx, dy);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = j;
                    }
                }
                if (nearestIdx >= 0) {
                    const ne = enemies[nearestIdx];
                    enemies.splice(nearestIdx, 1);
                    explosions.push({ x: ne.x + ne.w * 0.5, y: ne.y + ne.h * 0.5, timer: 0, scale: 0.9 });
                    score += 2;
                    combo++;
                    _tKillCount++;
                }
            }

            if (!(b.isBonus && player.type === 'dron')) bullets.splice(bi, 1);
            return;
        }
    }
}

/**
 * Обрабатывает столкновения пуль между собой (пуля игрока против вражеской).
 */
function _tHandleBulletVsBullet() {
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        let removedPlayerBullet = false;
        for (let ei = enemyBullets.length - 1; ei >= 0; ei--) {
            const eb = enemyBullets[ei];
            if (!rect({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, eb)) continue;
            enemyBullets.splice(ei, 1);
            explosions.push({ x: eb.x + eb.w * 0.5, y: eb.y + eb.h * 0.5, timer: 0, scale: 0.6 });
            score += 1;

            // Как в основных режимах: бонус Кузи добивает еще до 3 ближайших вражеских пуль.
            if (b.isBonus && player.type === 'kuzy' && enemyBullets.length > 0) {
                const hitX = eb.x + eb.w * 0.5;
                const hitY = eb.y + eb.h * 0.5;
                const nearest = enemyBullets.map((x, idx) => {
                    const cx = x.x + (x.w || 8) * 0.5;
                    const cy = x.y + (x.h || 12) * 0.5;
                    return { idx, cx, cy, d: Math.hypot(cx - hitX, cy - hitY) };
                }).sort((a, b2) => a.d - b2.d).slice(0, 3).sort((a, b2) => b2.idx - a.idx);
                for (let k = 0; k < nearest.length; k++) {
                    const n = nearest[k];
                    explosions.push({ x: n.cx, y: n.cy, timer: 0, scale: 0.5 });
                    enemyBullets.splice(n.idx, 1);
                    score += 1;
                }
            }

            if (!(b.isBonus && player.type === 'dron')) {
                bullets.splice(bi, 1);
                removedPlayerBullet = true;
            }
            break;
        }
        if (removedPlayerBullet) continue;
    }
}

/**
 * Проверяет сбор бутылок/сердец игроком.
 */
function _tHandlePickups() {
    for (let i = bottles.length - 1; i >= 0; i--) {
        const b = bottles[i];
        if (!rect(b, player)) continue;
        bonusShots += BONUS_SHOTS_PER_BOTTLE;
        bottles.splice(i, 1);
    }
    for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i];
        if (!rect(h, player)) continue;
        if (lives < PLAYER_LIVES) lives++;
        else bonusShots += 5;
        hearts.splice(i, 1);
    }
}

/**
 * Обновляет HUD для обучающего уровня в стандартном стиле игры.
 */
function _tUpdateHud() {
    if (!hudEl) hudEl = document.getElementById('hud');
    if (!hudEl) return;
    const mobile = (typeof isMobileAdaptiveCombatMode === 'function') && isMobileAdaptiveCombatMode('tutorial');
    const dirIcon = playerBulletDir === 'up' ? '↑' : (playerBulletDir === 'left' ? '←' : '→');
    const playerName = (typeof charNames !== 'undefined' && charNames[selectedChar]) ? charNames[selectedChar] : selectedChar;
    const modeIndicator = altShootMode ? '<span style="color:orange">🔫ALT</span>' : '';
    if (lives !== _tLastHudLives) {
        _tCachedLivesStr = "❤️".repeat(lives);
        _tLastHudLives = lives;
    }
    const bonusClass = (bonusMode && bonusShots > 0) ? 'hud-bonus active' : 'hud-bonus';
    const bonusHtml = `<span class="${bonusClass}"><span>Бонус:</span><span class="hud-bonus-value">${Math.max(0, bonusShots)}</span></span>`;
    const phaseHtml = mobile ? `   Ф:${_tPhase + 1}/11` : `   Фаза: ${_tPhase + 1}/11`;
    const scoreLabel = mobile ? 'О:' : 'Очки:';
    const comboLabel = mobile ? 'К:' : 'Комбо:';
    const bulletsLabel = mobile ? 'П:' : 'Пули:';
    const html = `${playerName} | Жизни: ${_tCachedLivesStr}<br>${scoreLabel} ${score}   ${comboLabel} ${combo}   ${bonusHtml}   ${bulletsLabel} ${dirIcon} ${modeIndicator}${phaseHtml}`;
    if (html !== _tLastHudHtml) {
        hudEl.innerHTML = html;
        _tLastHudHtml = html;
    }
}

/**
 * Обновляет фазу 1 (движение + первый прыжок).
 */
function _tUpdatePhase1() {
    if (!_tArrow && player.x <= canvas.width * 0.22) {
        _tArrow = { x: _tMarkerX, y: _tMarkerY, dir: 'down', label: 'Иди сюда' };
    }
    if (player.x > canvas.width * 0.22) {
        _tHint = 'Подпрыгни! Зажми ↑ подольше, чтобы прыгнуть выше.';
    }
    if (player.isJumping) {
        _tJumpWasActive = true;
    } else if (_tJumpWasActive) {
        _tEnterPhase(TUTORIAL_PHASE.BASIC_SHOOT);
    }
}

/**
 * Обновляет фазу 2 (базовая стрельба в 3 подволны).
 */
function _tUpdatePhase2() {
    if (enemies.length > 0) return;
    _tSubPhase++;
    if (_tSubPhase <= 2) {
        _tSpawnPhase2SubWave();
        return;
    }
    _tClearTempPlatform();
    _tEnterPhase(TUTORIAL_PHASE.BONUS_SHOOT);
}

/**
 * Обновляет фазу 3 (бонусные выстрелы).
 */
function _tUpdatePhase3() {
    if (_tSubPhase === 0) {
        // Если бутылка потерялась/пропала — возвращаем на землю.
        if (!bottles.length && !bonusMode && bonusShots <= 0) {
            _tSpawnTutorialBottle();
        }
        if (bonusMode || bonusShots > 0) {
            _tSubPhase = 1;
            _tHint = 'Бонусные пули активны! Это Фонтан! Стреляй!';
            _tArrow = null;
            _tSpawnPhase3Wave();
        }
        return;
    }

    // Если зарядов не осталось, а враги живы — снова даем бутылку.
    if (enemies.length > 0 && !bonusMode && bonusShots <= 0 && !bottles.length) {
        _tSpawnTutorialBottle();
        _tHint = 'Заряды кончились. Подбери пиво еще раз и продолжай.';
    }

    if (enemies.length === 0) {
        _tArrow = null;
        _tEnterPhase(TUTORIAL_PHASE.ALT_SHOOT);
    }
}

/**
 * Обновляет фазу 4 (альтернативная стрельба).
 */
function _tUpdatePhase4() {
    if (_tSubPhase !== 1) return;
    if (enemies.length > 0) return;
    altShootMode = false;
    _tSetWaitOverlay(
        'Режим отключен.\nДалее — смена персонажа через банан.',
        () => _tEnterPhase(TUTORIAL_PHASE.BANANA_1)
    );
}

/**
 * Проверяет и обрабатывает подбор банана по индексу.
 * @param {number} idx - индекс банана.
 * @returns {boolean}
 */
function _tTryPickBanana(idx) {
    const b = _tBananaz[idx];
    if (!b || _tBananaUsed[idx]) return false;
    if (!_tIsBananaVisible(idx)) return false;
    if (!_tBananaPixelHit(b)) return false;
    _tBananaUsed[idx] = true;
    if (!(_tPhase === TUTORIAL_PHASE.FINAL && idx === 2)) {
        _tSwitchCount++;
        _tSwitchToChar(b.nextChar);
        if (b.nextChar === 'max') _tCurrentCharIdx = 1;
        if (b.nextChar === 'dron') _tCurrentCharIdx = 2;
        if (b.nextChar === 'kuzy') _tCurrentCharIdx = 0;
    }
    return true;
}

/**
 * Обновляет фазу 5 (банан 1 + прыжки Макса).
 */
function _tUpdatePhase5(dt) {
    if (_tSubPhase === 0) {
        if (_tTryPickBanana(0)) {
            _tArrow = null;
            _tSetWaitOverlay(
                'Это Макс!\n' +
                'Его прыжок — одна высокая дуга, удержание не работает.\n' +
                'Зато он стреляет быстрее, а бонус - это пулемет Максим! (💩).\n\n' +
                'Нажми Пробел.',
                () => {
                    _tSubPhase = 1;
                    _tHint = 'Прыгни 2 раза, чтобы почувствовать разницу.';
                    _tJumpCount = 0;
                    _tJumpWasActive = false;
                }
            );
        }
        return;
    }

    if (player.isJumping && !_tJumpWasActive) {
        _tJumpWasActive = true;
    } else if (!player.isJumping && _tJumpWasActive) {
        _tJumpWasActive = false;
        _tJumpCount++;
        if (_tJumpCount >= 2) {
            _tHint = 'Видишь? Высокий, но высота не регулируется.';
            _tOverlayTimer = 0.9;
            _tSubPhase = 2;
        }
    }

    if (_tSubPhase === 2) {
        _tOverlayTimer -= dt;
        if (_tOverlayTimer <= 0) {
            _tEnterPhase(TUTORIAL_PHASE.MAX_JUMP_SHOOT);
        }
    }
}

/**
 * Обновляет фазу 6 (платформа + стрельба Макса).
 */
function _tUpdatePhase6() {
    // Подфаза 0: обычные пули Макса по 3 верхним целям.
    if (_tSubPhase === 0) {
        _tHint = 'Обычные пули Макса: убей 3 сирени сверху.';
        if (enemies.length > 0) return;
        _tSubPhase = 1;
        _tSpawnTutorialBottle();
        _tHint = 'Теперь подбери пиво и покажи пулемет Максим.';
        return;
    }

    // Подфаза 1: ожидание включения бонуса.
    if (_tSubPhase === 1) {
        if (!bonusMode && bonusShots <= 0) {
            if (!bottles.length) {
                _tSpawnTutorialBottle();
            }
            return;
        }
        _tSubPhase = 2;
        _tArrow = null;
        _tSpawnPhase6MaxBonusWave();
        _tHint = 'Пулемет Максим: зачисти 9 целей сверху.';
        return;
    }

    // Подфаза 2: бонус-волна.
    if (enemies.length > 0) {
        if (!bonusMode && bonusShots <= 0 && !bottles.length) {
            _tSpawnTutorialBottle();
            _tHint = 'Подбери пиво снова и добей оставшиеся цели.';
        }
        return;
    }
    _tClearTempPlatform();
    _tEnterPhase(TUTORIAL_PHASE.PLATFORM_MAX);
}

/**
 * Обновляет фазу 7 (платформенный сегмент Макса).
 */
function _tUpdatePhase7() {
    _tUsePlatformPhysics = true;
    _tUseStepPlatforms = true;
    if (lives < _tSavedLives) lives = _tSavedLives;
    if (_tSubPhase === 0) {
        if (_tIsPlayerOnTopStep()) {
            _tSpawnOppositeSideLilacAtPlayerHeight();
            _tSubPhase = 1;
        }
        return;
    }
    if (enemies.length === 0) {
        lives = _tSavedLives;
        _tEnterPhase(TUTORIAL_PHASE.BANANA_2);
    }
}

/**
 * Обновляет фазу 8 (банан 2 -> Дрон + платформы).
 */
function _tUpdatePhase8() {
    if (_tSubPhase === 0) {
        if (_tTryPickBanana(1)) {
            _tArrow = null;
            _tSetWaitOverlay(
                'Это Дрон!\n' +
                'Его пули — вихрь рыга (🌀).\n' +
                'Зажми прыжок — он взлетает выше(Дрон умеет летать).\n\n' +
                'Нажми Пробел.',
                () => {
                    _tSubPhase = 1;
                    _tUsePlatformPhysics = false;
                    _tUseStepPlatforms = false;
                    _tHint = 'Обычные пули Дрона(просто рыг): убей 4 сирени.';
                    _tSpawnPhase8DronBaseWave();
                }
            );
        }
        return;
    }

    // Подфаза 1: обычные пули Дрона.
    if (_tSubPhase === 1) {
        if (enemies.length > 0) return;
        _tSubPhase = 2;
        _tSpawnTutorialBottle();
        _tHint = 'Подбери пиво. Бонусная пуля Дрона пробивает ряд врагов.';
        return;
    }

    // Подфаза 2: ожидание включения бонуса Дрона.
    if (_tSubPhase === 2) {
        if (!bonusMode && bonusShots <= 0) {
            if (!bottles.length) {
                _tSpawnTutorialBottle();
            }
            return;
        }
        _tSubPhase = 3;
        _tArrow = null;
        _tSpawnPhase8DronBonusRow();
        _tHint = 'Бонусная пуля Дрона: прошей ряд целей насквозь.';
        return;
    }

    // Подфаза 3: бонус-ряд Дрона.
    if (_tSubPhase === 3) {
        if (enemies.length > 0) {
            if (!bonusMode && bonusShots <= 0 && !bottles.length) {
                _tSpawnTutorialBottle();
                _tHint = 'Подбери пиво снова, чтобы прошить оставшиеся цели.';
            }
            return;
        }
        _tSubPhase = 4;
        _tUsePlatformPhysics = true;
        _tUseStepPlatforms = true;
        _tHint = 'Теперь поднимись на верхнюю платформу.';
        return;
    }

    _tUsePlatformPhysics = true;
    _tUseStepPlatforms = true;
    if (_tSubPhase === 4 && _tIsPlayerOnTopStep()) {
        _tSpawnOppositeSideLilacAtPlayerHeight();
        _tSubPhase = 5;
        return;
    }
    if (_tSubPhase === 5 && enemies.length === 0) {
        _tEnterPhase(TUTORIAL_PHASE.BOSS_67);
    }
}

/**
 * Обновляет фазу 9 (бой с боссом 67).
 * @param {number} dt - время кадра.
 */
function _tUpdatePhase9(dt) {
    if (_tSubPhase === 0) {
        if (!_tBossSpawned) {
            if (player.x <= canvas.width * 0.22) {
                enemy67 = new Enemy67(player.x, player.y, false, { forceBaseSheet: true });
                enemy67.hp = 10;
                enemy67.maxHp = 10;
                _tBossSpawned = true;
                _tArrow = null;
                _tHint = 'Босс 67 появился! Уничтожь его.';
            }
            return;
        }
        if (enemy67) enemy67.update(dt);
        return;
    }

    if (_tSubPhase === 1) {
        _tBossDeathTimer -= dt;
        if (_tBossDeathTimer <= 0) {
            _tBossDeathTimer = 0;
            _tBossDoneMessageTimer = 1.0;
            _tOverlay = 'Готово!';
            _tSubPhase = 2;
        }
        return;
    }

    _tBossDoneMessageTimer -= dt;
    if (_tBossDoneMessageTimer <= 0) {
        _tOverlay = null;
        _tEnterPhase(TUTORIAL_PHASE.FINAL);
    }
}

/**
 * Обновляет фазу 10 (финал обучения).
 */
function _tUpdatePhase10() {
    if (!_tTryPickBanana(2)) return;
    _tArrow = null;
    _tSetWaitOverlay(
        'Обучение пройдено!\n' +
        'Ты знаешь всё необходимое.\n' +
        'Теперь тебе открыта кампания.\n\n' +
        'Нажми Пробел.',
        () => {
            localStorage.setItem(TUTORIAL_MODE_KEY, '1');
            _tDone = true;
            _tActive = false;
            enemies = [];
            bullets = [];
            enemyBullets = [];
            levelCompleteShown = true;
            if (typeof showTutorialCompleteOverlay === 'function') {
                showTutorialCompleteOverlay();
            } else {
                showLevelComplete();
            }
        }
    );
}

/**
 * Обновляет логику активной фазы обучения.
 * @param {number} dt - время кадра.
 */
function _tUpdatePhases(dt) {
    if (_tPhase === TUTORIAL_PHASE.MOVE) _tUpdatePhase1();
    else if (_tPhase === TUTORIAL_PHASE.BASIC_SHOOT) _tUpdatePhase2();
    else if (_tPhase === TUTORIAL_PHASE.BONUS_SHOOT) _tUpdatePhase3();
    else if (_tPhase === TUTORIAL_PHASE.ALT_SHOOT) _tUpdatePhase4();
    else if (_tPhase === TUTORIAL_PHASE.BANANA_1) _tUpdatePhase5(dt);
    else if (_tPhase === TUTORIAL_PHASE.MAX_JUMP_SHOOT) _tUpdatePhase6();
    else if (_tPhase === TUTORIAL_PHASE.PLATFORM_MAX) _tUpdatePhase7();
    else if (_tPhase === TUTORIAL_PHASE.BANANA_2) _tUpdatePhase8();
    else if (_tPhase === TUTORIAL_PHASE.BOSS_67) _tUpdatePhase9(dt);
    else if (_tPhase === TUTORIAL_PHASE.FINAL) _tUpdatePhase10();
}

/**
 * Главный update-цикл режима обучения.
 * @param {number} dt - время кадра.
 */
function updateTutorialMode(dt) {
    if (_tDone) return;
    if (!_tActive) initTutorialLevel();

    _tHintPulse += dt;
    if (invuln > 0) invuln = Math.max(0, invuln - dt);
    _tUpdateFx(dt);

    // Пауза "нажми Пробел".
    if (_tWaitKey) {
        _tWaitKeyLock = Math.max(0, _tWaitKeyLock - dt);
        const shootDown = !!(keys && keys[' ']);
        if (shootDown && !_tWaitShootWasDown) {
            _tPendingAnyKey = true;
        }
        _tWaitShootWasDown = shootDown;
        if (_tWaitKeyLock <= 0 && _tPendingAnyKey) {
            _tPendingAnyKey = false;
            _tWaitKey = false;
            _tFrozen = false;
            _tSuppressShootUntilRelease = true;
            _tOverlay = null;
            const cb = _tWaitContinue;
            _tWaitContinue = null;
            if (typeof cb === 'function') cb();
        }
    }

    platforms = _tCollectPlatforms();
    homePlatform = _tHomePlatform;

    // Обновляем игрока (при платформенном сегменте временно включаем physics режима platforms).
    if (!_tFrozen && player) {
        if (_tSuppressShootUntilRelease) {
            if (keys && keys[' ']) {
                keys[' '] = false;
            } else {
                _tSuppressShootUntilRelease = false;
            }
        }
        const prevMode = gameMode;
        if (_tUsePlatformPhysics) gameMode = 'platforms';
        player.update(dt);
        gameMode = prevMode;
        if (!_tUsePlatformPhysics) {
            const baseY = _tGetTutorialGroundPlayerY(player);
            player.jumpBaseY = baseY;
            if (!player.isJumping) {
                if (player.y < baseY) {
                    const dropSpeed = canvas.height * 1.8 * dt;
                    player.y = Math.min(baseY, player.y + dropSpeed);
                } else if (player.y > baseY) {
                    player.y = baseY;
                }
                player.jumpStartY = baseY;
            }
        }
    }

    _tUpdateProjectiles(dt);

    if (!_tFrozen) {
        _tUpdateLilacEnemies(dt);
        if (enemy67 && _tPhase !== TUTORIAL_PHASE.BOSS_67) {
            enemy67 = null;
        }
    }

    // Коллизии пуль игрока.
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        _tHandlePlayerBulletHit(bullets[bi], bi);
    }
    _tHandleBulletVsBullet();
    _tHandlePickups();
    _tClearBottleArrowIfNoBottle();

    // Урон игроку в обучении такой же, как в боевых режимах.
    const applyTutorialDamage = () => {
        lives--;
        combo = 0;
        invuln = INVULN_TIME;
        speechBalloons.push({
            x: player.x - player.w * 0.25,
            y: player.y + player.h * 0.25,
            timer: 0
        });
        explosions.push({ x: player.x + player.w * 0.5, y: player.y + player.h * 0.5, timer: 0, scale: 0.8 });
        if (window.BHAudio) window.BHAudio.play('player_hurt', { volumeMul: 1.0, duck: 0.75 });

        // Сценарное сердце: гарантированно показываем механику лечения после первого урона.
        if (!_tTutorialHeartSpawned) {
            _tTutorialHeartSpawned = true;
            const size = (typeof getCombatPickupSize === 'function')
                ? getCombatPickupSize('heart')
                : { w: tutorialPx(48, 24), h: tutorialPx(48, 24) };
            hearts.push({
                x: Math.max(8, Math.min(canvas.width - size.w - 8, player.x + player.w * 0.25)),
                y: _tHomePlatform.y - size.h,
                w: size.w,
                h: size.h
            });
        }

        if (lives <= 0) {
            showGameOver();
        }
    };

    if (invuln <= 0) {
        // Урон от контакта с боссом 67.
        if (enemy67 && enemy67.hp > 0) {
            const bossRect = (typeof enemy67.getVisibleHitbox === 'function')
                ? enemy67.getVisibleHitbox()
                : { x: enemy67.x, y: enemy67.y, w: enemy67.w, h: enemy67.h };
            if (playerHitTest(bossRect)) {
                applyTutorialDamage();
            }
        }

        // Урон от пуль врага.
        for (let i = enemyBullets.length - 1; i >= 0 && invuln <= 0; i--) {
            if (!playerHitTest(enemyBullets[i])) continue;
            enemyBullets.splice(i, 1);
            applyTutorialDamage();
            break;
        }

        // Урон от контакта с сиренью.
        for (let i = 0; i < enemies.length && invuln <= 0; i++) {
            const e = enemies[i];
            if (!playerHitTest({ x: e.x, y: e.y, w: e.w, h: e.h })) continue;
            applyTutorialDamage();
            break;
        }
    }

    if (_tPhase3WrongShotTimer > 0) {
        _tPhase3WrongShotTimer = Math.max(0, _tPhase3WrongShotTimer - dt);
    }

    if (!_tWaitKey && !_tFrozen) {
        _tUpdatePhases(dt);
    }

    _tUpdateHud();
}

/**
 * Рисует стрелку-указатель.
 * @param {number} x - X.
 * @param {number} y - Y.
 * @param {'up'|'down'|'left'|'right'} dir - направление.
 * @param {string} label - подпись.
 */
function _tDrawArrow(x, y, dir, label) {
    const t = performance.now() * 0.004;
    const pulse = Math.sin(t) * tutorialPx(6, 4, false);
    const size = tutorialPx(18, 12);
    const ax = x + (dir === 'left' ? -pulse : dir === 'right' ? pulse : 0);
    const ay = y + (dir === 'up' ? -pulse : dir === 'down' ? pulse : 0);

    ctx.save();
    ctx.fillStyle = '#ffd54f';
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (dir === 'up') {
        ctx.moveTo(ax, ay - size);
        ctx.lineTo(ax - size * 0.7, ay + size * 0.6);
        ctx.lineTo(ax + size * 0.7, ay + size * 0.6);
    } else if (dir === 'down') {
        ctx.moveTo(ax, ay + size);
        ctx.lineTo(ax - size * 0.7, ay - size * 0.6);
        ctx.lineTo(ax + size * 0.7, ay - size * 0.6);
    } else if (dir === 'left') {
        ctx.moveTo(ax - size, ay);
        ctx.lineTo(ax + size * 0.6, ay - size * 0.7);
        ctx.lineTo(ax + size * 0.6, ay + size * 0.7);
    } else {
        ctx.moveTo(ax + size, ay);
        ctx.lineTo(ax - size * 0.6, ay - size * 0.7);
        ctx.lineTo(ax - size * 0.6, ay + size * 0.7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (label) {
        ctx.font = `bold ${tutorialPx(16, 12)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur = tutorialPx(6, 3, false);
        ctx.fillText(label, ax, ay - size - tutorialPx(8, 5));
    }
    ctx.restore();
}

/**
 * Рисует банан-станцию.
 * @param {number} idx - индекс банана.
 */
function _tDrawBanana(idx) {
    const b = _tBananaz[idx];
    if (!b) return;
    if (!_tIsBananaVisible(idx)) return;
    const active = !_tBananaUsed[idx];
    const glow = 0.55 + 0.45 * Math.sin(_tHintPulse * 7);
    const bananaFont = tutorialPx(40, 26);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${bananaFont}px serif`;
    if (!active) ctx.globalAlpha = 0.32;
    if (active) {
        ctx.shadowColor = `rgba(255,214,79,${0.4 + glow * 0.35})`;
        ctx.shadowBlur = tutorialPx(14, 8, false);
    }
    ctx.fillText('🍌', b.x, b.y);
    ctx.restore();

    // Подписи к бананам в обучении отключены: только визуальный маркер + стрелки/оверлей.
}

/**
 * Рисует центральное оверлей-окно обучения.
 */
function _tDrawOverlay() {
    if (!_tOverlay) return;
    const lines = String(_tOverlay).split('\n');

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const boxW = Math.min(canvas.width * 0.86, 760);
    const lineH = tutorialPx(30, 22);
    const boxH = Math.max(tutorialPx(170, 130), lines.length * lineH + tutorialPx(70, 46));
    const boxX = (canvas.width - boxW) * 0.5;
    const boxY = (canvas.height - boxH) * 0.5;

    ctx.fillStyle = 'rgba(12,18,30,0.94)';
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 2;
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, tutorialPx(14, 10));
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
    }

    ctx.font = `700 ${tutorialPx(24, 17)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
        const y = boxY + tutorialPx(38, 28) + i * lineH;
        ctx.fillText(lines[i], boxX + boxW * 0.5, y);
    }

    if (_tWaitKey) {
        ctx.font = `700 ${tutorialPx(18, 14)}px Arial`;
        ctx.fillStyle = '#ffd54f';
        ctx.fillText('[Пробел — продолжить]', boxX + boxW * 0.5, boxY + boxH - tutorialPx(26, 18));
    }
    ctx.restore();
}

/**
 * Рисует подсветки HUD для фазы 0.
 */
function _tDrawHudHighlights() {
    const topY = tutorialPx(6, 4);
    const blockH = tutorialPx(64, 46);
    const lifeW = Math.max(tutorialPx(210, 150), canvas.width * 0.24);
    const scoreW = Math.max(tutorialPx(170, 120), canvas.width * 0.20);
    const comboW = Math.max(tutorialPx(170, 120), canvas.width * 0.20);

    const lifeRect = { x: tutorialPx(8, 5), y: topY, w: lifeW, h: blockH };
    const scoreRect = { x: lifeRect.x + lifeRect.w + tutorialPx(10, 6), y: topY, w: scoreW, h: blockH };
    const comboRect = { x: scoreRect.x + scoreRect.w + tutorialPx(10, 6), y: topY, w: comboW, h: blockH };
    const regions = [
        { r: lifeRect, text: 'Жизни: потеряешь 7 — game over' },
        { r: scoreRect, text: 'Очки за каждое убийство' },
        { r: comboRect, text: 'Комбо множит очки' }
    ];

    ctx.save();
    for (let i = 0; i < regions.length; i++) {
        const it = regions[i];
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = tutorialPx(2, 1, false);
        ctx.strokeRect(it.r.x, it.r.y, it.r.w, it.r.h);
        ctx.fillStyle = 'rgba(255,213,79,0.15)';
        ctx.fillRect(it.r.x, it.r.y, it.r.w, it.r.h);
        ctx.font = `bold ${tutorialPx(14, 11)}px Arial`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(it.text, it.r.x + tutorialPx(6, 4), it.r.y + it.r.h + tutorialPx(6, 4));
    }
    ctx.restore();
}

/**
 * Рисует стилизованную полосу HP босса.
 * @param {string} label - подпись.
 * @param {number} hp - текущее HP.
 * @param {number} maxHp - максимальное HP.
 */
function _tDrawBossHpBar(label, hp, maxHp) {
    const safeMax = Math.max(1, Number(maxHp) || 1);
    const safeHp = Math.max(0, Number(hp) || 0);
    const ratio = Math.max(0, Math.min(1, safeHp / safeMax));
    const barW = Math.max(tutorialPx(220, 150), canvas.width * 0.34);
    const barH = tutorialPx(16, 10);
    const barX = (canvas.width - barW) * 0.5;
    const barY = tutorialPx(24, 14);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `900 ${tutorialPx(15, 11)}px Arial`;
    ctx.fillStyle = '#ffd54f';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillText(label, barX + barW / 2, barY - tutorialPx(8, 5));

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const framePad = tutorialPx(2, 1, false);
    ctx.fillRect(barX - framePad, barY - framePad, barW + framePad * 2, barH + framePad * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = tutorialPx(2, 1, false);
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 2;
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${tutorialPx(13, 10)}px Arial`;
    ctx.fillText(`${Math.ceil(safeHp)}/${Math.ceil(safeMax)}`, barX + barW / 2, barY + barH / 2);
    ctx.restore();
}

/**
 * Отрисовывает режим обучения.
 */
function drawTutorialMode() {
    if (bgReady) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#7fb0d8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Отрисовываем только видимые платформы этапа (техническую "землю" не рисуем).
    if (_tUseStepPlatforms) {
        for (let i = 0; i < _tStepPlatforms.length; i++) {
            _tStepPlatforms[i].draw();
        }
    }
    if (_tTempPlatform) {
        _tTempPlatform.draw();
    }

    // Банановые станции.
    for (let i = 0; i < _tBananaz.length; i++) _tDrawBanana(i);

    // Маркер движения фазы 1.
    if (_tPhase === TUTORIAL_PHASE.MOVE && !_tWaitKey) {
        const pulse = 0.65 + 0.35 * Math.sin(_tHintPulse * 8);
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = tutorialPx(4, 2, false);
        ctx.beginPath();
        ctx.arc(_tMarkerX, _tMarkerY, Math.max(tutorialPx(16, 10), canvas.height * 0.022), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Пули.
    const perf = window.BHBulletPerf;
    const renderMode = perf ? perf.bulletRenderMode() : 'emoji';
    const getEmojiBitmap = perf ? perf.getEmojiBitmap : null;
    bullets.forEach(b => {
        const size = Math.max(tutorialPx(16, 10), b.r * 2);
        if (b.playerType === 'max' && !b.isBonus && b.img && b.img.complete && b.img.naturalWidth) {
            const swayX = Math.sin((b.swayAge || 0) * 3) * tutorialPx(3, 2, false);
            ctx.drawImage(b.img, b.x - size / 2 + swayX, b.y - size / 2, size, size);
        } else if (b.emoji) {
            ctx.save();
            let angle = 0;
            if (b.dir === 'up') angle = -Math.PI / 2;
            else if (b.dir === 'left') angle = Math.PI;
            ctx.translate(b.x, b.y);
            ctx.rotate(angle);
            if (typeof b.rotation === 'number') ctx.rotate(b.rotation);
            const img = getEmojiBitmap ? getEmojiBitmap(b.emoji) : null;
            if (renderMode === 'png' && img) {
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
            } else {
                ctx.font = `${size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(b.emoji, 0, 0);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = b.color || '#fff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r || 6, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    enemyBullets.forEach(b => {
        const emoji = b.emoji || '🍃';
        const size = Math.max(tutorialPx(16, 10), (b.h || tutorialPx(12, 8)) * 2.2);
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, b.x, b.y, size, size);
        } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(emoji, b.x, b.y);
        }
    });

    // Бонусы.
    bottles.forEach(b => {
        const size = b.h || tutorialPx(36, 24);
        const img = getEmojiBitmap ? getEmojiBitmap('🍺') : null;
        if (renderMode === 'png' && img) ctx.drawImage(img, b.x, b.y, size, size);
        else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('🍺', b.x, b.y);
        }
    });

    // Враги-сирени.
    enemies.forEach(e => drawLilacCached(e));

    // Игрок с миганием от урона.
    if (invuln > 0 && Math.floor(invuln * 16) % 2 === 0) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        player.draw();
        ctx.restore();
    } else {
        player.draw();
    }

    // Босс 67.
    if (enemy67) {
        enemy67.draw();
        _tDrawBossHpBar('Босс 67', enemy67.hp, enemy67.maxHp || 10);
    } else if (typeof Enemy67 !== 'undefined' && typeof Enemy67.hideGifOverlay === 'function') {
        Enemy67.hideGifOverlay();
    }

    // Взрывы.
    explosions.forEach(ex => {
        ctx.save();
        const scale = ex.scale || 1;
        const baseSize = ex.size || 60;
        const size = (baseSize + ex.timer * baseSize) * scale;
        const dur = (typeof ex.duration === 'number') ? ex.duration : 0.5;
        const t = Math.min(1, ex.timer / Math.max(0.0001, dur));
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.max(0, 1 - t);
        const img = getEmojiBitmap ? getEmojiBitmap('💥') : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, ex.x - size / 2, ex.y - size / 2, size, size);
        } else {
            ctx.font = `${size}px serif`;
            ctx.fillText('💥', ex.x, ex.y);
        }
        ctx.restore();
    });

    speechBalloons.forEach(sb => {
        drawSpeechBalloonAdaptive(sb, 'tutorial');
    });

    // Текст фазы/подсказки (без мигания и с переносом строк внутри панели).
    if (_tHint) {
        ctx.save();
        const panelW = Math.min(canvas.width * 0.86, 980);
        const panelX = (canvas.width - panelW) * 0.5;
        const panelY = tutorialPx(84, 58);
        const basePanelH = tutorialPx(40, 30);
        const fontPx = tutorialPx(19, 14);
        const lineH = tutorialPx(21, 15);
        const padX = tutorialPx(14, 10);
        const padY = tutorialPx(8, 6);
        const maxTextW = Math.max(40, panelW - padX * 2);

        ctx.font = `bold ${fontPx}px Arial`;
        const words = String(_tHint).split(/\s+/).filter(Boolean);
        const lines = [];
        let cur = '';

        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            const test = cur ? `${cur} ${w}` : w;
            if (ctx.measureText(test).width <= maxTextW) {
                cur = test;
                continue;
            }
            if (cur) lines.push(cur);
            // Если слово само длиннее лимита — режем посимвольно.
            if (ctx.measureText(w).width > maxTextW) {
                let chunk = '';
                for (let j = 0; j < w.length; j++) {
                    const t = chunk + w[j];
                    if (ctx.measureText(t).width <= maxTextW) {
                        chunk = t;
                    } else {
                        if (chunk) lines.push(chunk);
                        chunk = w[j];
                    }
                }
                cur = chunk;
            } else {
                cur = w;
            }
        }
        if (cur) lines.push(cur);
        if (!lines.length) lines.push('');

        const panelH = Math.max(basePanelH, padY * 2 + lines.length * lineH);
        ctx.fillStyle = 'rgba(8,14,26,0.76)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = tutorialPx(2, 1, false);
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textStartY = panelY + panelH * 0.5 - ((lines.length - 1) * lineH) * 0.5;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], panelX + panelW * 0.5, textStartY + i * lineH);
        }
        ctx.restore();
    }

    if (_tPhase3WrongShotTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.2, _tPhase3WrongShotTimer / 1.6);
        ctx.fillStyle = '#5c3904';
        ctx.font = `bold ${tutorialPx(20, 14)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Мы же договорились стрелять бонусными!', canvas.width * 0.5, tutorialPx(132, 92));
        ctx.restore();
    }

    // Стрелка-указатель.
    if (_tArrow) _tDrawArrow(_tArrow.x, _tArrow.y, _tArrow.dir, _tArrow.label);

    _tDrawOverlay();

    if (perf && perf.isEnabled()) perf.drawOverlay(ctx, bullets.length);
}

window.resetTutorialLevelState = resetTutorialLevelState;
window.initTutorialLevel = initTutorialLevel;
window.updateTutorialMode = updateTutorialMode;
window.drawTutorialMode = drawTutorialMode;
window.isTutorialModeActive = isTutorialModeActive;
window.onTutorialResize = onTutorialResize;
