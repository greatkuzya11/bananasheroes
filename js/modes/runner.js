// ==== РЕЖИМ "БЕГУН" ====

// PNG-кадры босса "прапор" (1..7), анимация ping-pong.
const runnerBossFrames = [];
let runnerBossFramesReady = 0;
for (let i = 1; i <= 7; i++) {
    const img = new Image();
    img.onload = () => { runnerBossFramesReady++; };
    img.src = `img/dron/d${i}.png`;
    runnerBossFrames.push(img);
}

// Спрайт активной сигареты игрока в режиме "Бегун".
const runnerCigImg = new Image();
let runnerCigReady = false;
runnerCigImg.onload = () => { runnerCigReady = true; };
runnerCigImg.src = 'img/seguza.png';

// Пул текстур платформ режима "Бегун".
const runnerPlatformTextures = [
    'img/platform1.png',
    'img/platform2.png',
    'img/platform3.png',
    'img/platform4.png',
    'img/platform5.png',
    'img/platform6.png',
    'img/platform7.png',
    'img/platform8.png',
    'img/platform9.png'
];

// Runtime-состояние режима "Бегун".
let runnerPlatforms = [];
let runnerGround = null;
let runnerBands = [];
let runnerMovingPlatform = null;
let runnerBoss = null;
let runnerSmoke = [];
let runnerTurboTrail = [];
let runnerLastPlayerX = 0;
let runnerLastPlayerY = 0;
let runnerIdleTimer = 0;
let runnerIdleArmed = false;
let runnerBossSlowTimer = 0;
let runnerVictory = false;
let runnerBossSpeech = null;
let runnerPlayerMoveSpeed = 0;
let runnerPlayerJumpSpeed = 0;
let runnerGravity = 0;
let runnerMaxFallSpeed = 0;
let runnerBossJumpSpeed = 0;
let runnerPlayerJumpProfiles = null;
let runnerEnergyDrops = [];
let runnerCigarDrops = [];
let runnerEnergyDropTimer = 0;
let runnerCigarDropTimer = 0;
let runnerEnergyActive = false;
let runnerEnergyTimer = 0;
let runnerCigarXLActive = false;
let runnerCigarXLTimer = 0;
let runnerScoreDecayTimer = 0;

// Сохраненный старый вариант прыжка (не используется по умолчанию):
// "фиксированный баллистический прыжок".
const runnerFixedBallisticJump = {
    jumpSpeedScale: 0.98, // vy = -canvas.height * scale
    gravityScale: 2.8,    // g = canvas.height * scale
    maxFallScale: 1.6     // maxFall = canvas.height * scale
};

/**
 * Возвращает параметры сохраненного старого прыжка "фиксированный баллистический".
 * @returns {{jumpSpeedScale:number,gravityScale:number,maxFallScale:number}}
 */
function getRunnerFixedBallisticJumpPreset() {
    return runnerFixedBallisticJump;
}

/**
 * Возвращает случайный элемент массива.
 * @template T
 * @param {T[]} arr - исходный массив.
 * @returns {T}
 */
function runnerPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Возвращает случайное число в диапазоне [min, max].
 * @param {number} min - нижняя граница.
 * @param {number} max - верхняя граница.
 * @returns {number}
 */
function runnerRand(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Полный сброс runtime-состояния режима "Бегун".
 */
function resetRunnerLevelState() {
    runnerPlatforms = [];
    runnerGround = null;
    runnerBands = [];
    runnerMovingPlatform = null;
    runnerBoss = null;
    runnerSmoke = [];
    runnerTurboTrail = [];
    runnerLastPlayerX = 0;
    runnerLastPlayerY = 0;
    runnerIdleTimer = 0;
    runnerIdleArmed = false;
    runnerBossSlowTimer = 0;
    runnerVictory = false;
    runnerBossSpeech = null;
    runnerPlayerMoveSpeed = 0;
    runnerPlayerJumpSpeed = 0;
    runnerGravity = 0;
    runnerMaxFallSpeed = 0;
    runnerBossJumpSpeed = 0;
    runnerPlayerJumpProfiles = null;
    runnerEnergyDrops = [];
    runnerCigarDrops = [];
    runnerEnergyDropTimer = 0;
    runnerCigarDropTimer = 0;
    runnerEnergyActive = false;
    runnerEnergyTimer = 0;
    runnerCigarXLActive = false;
    runnerCigarXLTimer = 0;
    runnerScoreDecayTimer = 0;
}

/**
 * Создает платформу для режима "Бегун".
 * @param {number} x - координата X.
 * @param {number} y - координата Y.
 * @param {number} w - ширина.
 * @param {number} h - высота.
 * @param {number} band - индекс полосы (0..3, где 0 — земля).
 * @param {boolean} edge - true, если платформа прилегает к краю экрана.
 * @param {'left'|'right'|'center'} side - сторона расположения.
 * @param {('horizontal'|null)} movePattern - тип движения платформы.
 * @param {number} moveSpeed - скорость движения платформы.
 * @param {number} moveRange - диапазон движения платформы.
 * @returns {Platform}
 */
function createRunnerPlatform(x, y, w, h, band, edge, side, movePattern = null, moveSpeed = 0, moveRange = 0) {
    const p = new Platform(
        x,
        y,
        w,
        h,
        movePattern,
        moveSpeed,
        moveRange,
        runnerPick(runnerPlatformTextures),
        true,
        { solid: true }
    );
    p.runnerBand = band;
    p.runnerEdge = edge;
    p.runnerSide = side;
    return p;
}

/**
 * Пересчитывает геометрию платформ режима "Бегун".
 * @param {boolean} preserveActors - true, если нужно сохранить примерные позиции игрока/босса.
 * @param {number} prevW - предыдущая ширина canvas.
 * @param {number} prevH - предыдущая высота canvas.
 */
function refreshRunnerLayout(preserveActors = false, prevW = canvas.width, prevH = canvas.height) {
    const oldPlayerRatioX = preserveActors && player ? player.x / Math.max(1, prevW) : null;
    const oldBossRatioX = preserveActors && runnerBoss ? runnerBoss.x / Math.max(1, prevW) : null;

    const usableHeight = Math.max(240, canvas.height);
    const stripe = usableHeight / 4;
    // Толщина платформ как в уровне "Платформы" (по высоте),
    // длины/расположение оставляем по ТЗ "Бегуна".
    const platformH = Math.max(12, Math.round(canvas.height * 0.075));

    // Полосы: 0 = земля (нижняя), 1 = вторая снизу, 2 = третья, 3 = верхняя.
    // Земля остается у нижней кромки, как в других режимах.
    const bandGroundY = canvas.height - 20;
    const band2Y = stripe * 3 - platformH * 0.5;
    const band3Y = stripe * 2 - platformH * 0.5;
    const band4Y = Math.max(12, stripe * 1 - platformH * 0.5);

    runnerBands = [bandGroundY, band2Y, band3Y, band4Y];

    // Невидимая "земля" как твердая поверхность на нижней полосе.
    runnerGround = {
        x: 0,
        y: bandGroundY,
        w: canvas.width,
        h: Math.max(24, canvas.height - bandGroundY),
        runnerBand: 0,
        runnerEdge: true,
        runnerSide: 'center',
        movePattern: null,
        prevX: 0,
        solid: true
    };

    const p2Width = canvas.width * 0.20;
    const p3Width = canvas.width * 0.30;
    const p4Width = canvas.width * 0.35;

    const moveStartX = (canvas.width - p3Width) * 0.5;
    const moveRange = Math.max(20, (canvas.width - p3Width) * 0.5);
    const moveSpeed = Math.max(120, canvas.width * 0.20); // "средняя" скорость

    runnerPlatforms = [
        createRunnerPlatform(0, band2Y, p2Width, platformH, 1, true, 'left'),
        createRunnerPlatform(canvas.width - p2Width, band2Y, p2Width, platformH, 1, true, 'right'),
        createRunnerPlatform(moveStartX, band3Y, p3Width, platformH, 2, false, 'center', 'horizontal', moveSpeed, moveRange),
        createRunnerPlatform(0, band4Y, p4Width, platformH, 3, true, 'left'),
        createRunnerPlatform(canvas.width - p4Width, band4Y, p4Width, platformH, 3, true, 'right')
    ];

    runnerMovingPlatform = runnerPlatforms[2] || null;

    if (player) {
        const playerFootOffset = (typeof player.runnerFootOffset === 'number') ? player.runnerFootOffset : 30;
        if (preserveActors && oldPlayerRatioX !== null) {
            player.x = Math.max(-player.w, Math.min(canvas.width, oldPlayerRatioX * canvas.width));
            player.y = Math.min(player.y, runnerGround.y - player.h + playerFootOffset);
        } else {
            player.x = 20;
            player.y = runnerGround.y - player.h + playerFootOffset;
        }
    }

    if (runnerBoss) {
        const bossFootOffset = (typeof runnerBoss.runnerFootOffset === 'number') ? runnerBoss.runnerFootOffset : 28;
        if (preserveActors && oldBossRatioX !== null) {
            runnerBoss.x = Math.max(-runnerBoss.w, Math.min(canvas.width, oldBossRatioX * canvas.width));
            runnerBoss.y = Math.min(runnerBoss.y, runnerGround.y - runnerBoss.h + bossFootOffset);
        } else {
            runnerBoss.x = canvas.width - runnerBoss.w - 24;
            runnerBoss.y = runnerGround.y - runnerBoss.h + bossFootOffset;
        }
    }
}

/**
 * Инициализирует объект босса "прапор".
 */
function initRunnerBoss() {
    const size = Math.max(player.w * 1.02, canvas.height * 0.18);
    const footOffset = 28;
    runnerBoss = {
        x: canvas.width - size - 24,
        y: runnerBands[0] - size + footOffset,
        w: size,
        h: size,
        vx: 0,
        vy: 0,
        onGround: true,
        isJumping: false,
        jumpElapsed: 0,
        jumpStartBand: 0,
        jumpFromEdge: false,
        runnerFootOffset: footOffset,
        currentPlatform: runnerGround,
        facingDir: 'left',
        frameIndex: Math.floor(Math.random() * 7),
        frameDir: 1,
        animTimer: 0,
        animInterval: 0.09,
        idleDecisionTimer: runnerRand(1.0, 2.8),
        idleMode: 'move',
        idleMul: runnerRand(0.2, 0.8),
        jumpDecisionTimer: runnerRand(0.4, 1.1),
        gaitTimer: runnerRand(0.28, 0.75),
        gaitMul: 1.0,
        escapeDir: 1,
        postWarpTimer: 0,
        postWarpDir: 0,
        turboTimer: 0,
        teaseTimer: 0
    };
}

/**
 * Возвращает список всех твердых поверхностей уровня.
 * @returns {Array<{x:number,y:number,w:number,h:number,runnerBand:number,runnerEdge:boolean,runnerSide:string,movePattern:any,prevX:number}>}
 */
function getRunnerSolidSurfaces() {
    const out = [runnerGround];
    for (let i = 0; i < runnerPlatforms.length; i++) {
        const p = runnerPlatforms[i];
        if (!p || p.solid === false) continue;
        out.push(p);
    }
    return out;
}

/**
 * Возвращает смещение "опорной точки ног" для спрайта.
 * В режиме платформ это соответствует старому смещению +30 пикселей.
 * @param {any} actor - игрок или босс.
 * @returns {number}
 */
function getRunnerFootOffset(actor) {
    return (actor && typeof actor.runnerFootOffset === 'number') ? actor.runnerFootOffset : 30;
}

/**
 * Возвращает Y-позицию актора при стоянии на поверхности.
 * @param {any} actor - игрок или босс.
 * @param {{y:number}} surface - платформа/земля.
 * @returns {number}
 */
function getRunnerSurfaceSnapY(actor, surface) {
    return surface.y - actor.h + getRunnerFootOffset(actor);
}

/**
 * Определяет индекс полосы по текущей высоте персонажа.
 * @param {number} bottomY - нижняя Y-координата персонажа.
 * @returns {number}
 */
function estimateRunnerBandByBottom(bottomY) {
    if (!runnerBands || runnerBands.length < 4) return 0;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < runnerBands.length; i++) {
        const d = Math.abs(bottomY - runnerBands[i]);
        if (d < best) {
            best = d;
            nearest = i;
        }
    }
    return nearest;
}

/**
 * Возвращает платформу указанной полосы и стороны для телепорта.
 * @param {number} band - индекс полосы.
 * @param {'left'|'right'} side - требуемая сторона.
 * @returns {{x:number,y:number,w:number,h:number,runnerBand:number,runnerEdge:boolean,runnerSide:string}|null}
 */
function getRunnerBandEdgeSurface(band, side) {
    if (band === 0) return runnerGround;
    for (let i = 0; i < runnerPlatforms.length; i++) {
        const p = runnerPlatforms[i];
        if (!p) continue;
        if (p.runnerBand === band && p.runnerEdge && p.runnerSide === side) return p;
    }
    return null;
}

/**
 * Пытается выполнить переход через край экрана (обычный или диагональный).
 * @param {any} actor - игрок или босс.
 * @param {'left'|'right'} side - сторона выхода за экран.
 * @returns {boolean} true, если переход выполнен.
 */
function tryRunnerEdgeWarp(actor, side) {
    const curBand = actor.currentPlatform
        ? (actor.currentPlatform.runnerBand || 0)
        : estimateRunnerBandByBottom(actor.y + actor.h);

    const onEdgeSurface = actor.currentPlatform
        ? !!actor.currentPlatform.runnerEdge
        : (curBand === 0 || !!actor.jumpFromEdge);

    if (!onEdgeSurface) return false;

    let targetBand = curBand;
    const targetSide = side === 'left' ? 'right' : 'left';
    let diagonal = false;

    const jumpBand = (typeof actor.jumpStartBand === 'number') ? actor.jumpStartBand : curBand;
    if (actor.isJumping && actor.jumpElapsed <= 1.0 && (jumpBand === 0 || jumpBand === 3)) {
        diagonal = true;
        targetBand = jumpBand === 0 ? 3 : 0;
    }

    const targetSurface = getRunnerBandEdgeSurface(targetBand, targetSide);
    if (!targetSurface) return false;
    const footOffset = getRunnerFootOffset(actor);

    if (targetSide === 'left') {
        actor.x = targetSurface.x + 2;
    } else {
        actor.x = targetSurface.x + targetSurface.w - actor.w - 2;
    }

    if (diagonal) {
        actor.onGround = false;
        actor.currentPlatform = null;
        actor.y = targetSurface.y - actor.h + footOffset - Math.max(4, actor.h * 0.08);
        actor.vy = Math.min(actor.vy, -canvas.height * 0.14);
    } else {
        actor.y = targetSurface.y - actor.h + footOffset;
        actor.vy = 0;
        actor.onGround = true;
        actor.currentPlatform = targetSurface;
        actor.isJumping = false;
    }

    // После телепорта босс кратко бежит "внутрь" экрана,
    // чтобы не дергаться на одном и том же краю.
    if (actor === runnerBoss) {
        actor.postWarpTimer = 0.42;
        actor.postWarpDir = (targetSide === 'left') ? 1 : -1;
        actor.escapeDir = actor.postWarpDir;
        const minInward = runnerPlayerMoveSpeed * (runnerBossSlowTimer > 0 ? 0.95 : 2.1);
        actor.vx = actor.postWarpDir * Math.max(Math.abs(actor.vx), minInward);
    }

    return true;
}

/**
 * Применяет горизонтальную границу/телепорт персонажа.
 * @param {any} actor - игрок или босс.
 */
function clampOrWarpRunnerActorX(actor) {
    // Для Кузи используем эффективную ширину (контент занимает только ~60% от AABB)
    const width = actor.effectiveW || actor.w;
    const leftPad = (actor.effectiveW && actor.effectiveW < actor.w) ? (actor.w - actor.effectiveW) / 2 : 0;
    
    if (actor.x + leftPad < 0) {
        const warped = tryRunnerEdgeWarp(actor, 'left');
        if (!warped) actor.x = -leftPad;
        return;
    }
    if (actor.x + leftPad + width > canvas.width) {
        const warped = tryRunnerEdgeWarp(actor, 'right');
        if (!warped) actor.x = canvas.width - leftPad - width;
        return;
    }
}

/**
 * Выполняет физику персонажа с коллизией о платформы.
 * Логика намеренно совпадает с режимом "Платформы":
 * опора/приземление проверяются по центру персонажа и допускают запрыгивание снизу.
 * @param {any} actor - игрок или босс.
 * @param {number} dt - время кадра.
 * @param {boolean} jumpRequested - запрос на прыжок в этом кадре.
 */
function updateRunnerActorPhysics(actor, dt, jumpRequested) {
    if (!actor) return;
    const footOffset = getRunnerFootOffset(actor);
    const standMin = Math.max(0, footOffset - 5);
    const standMax = footOffset + 5;
    const landWindow = footOffset + 10;

    if (actor.onGround && actor.currentPlatform && actor.currentPlatform.movePattern === 'horizontal') {
        actor.x += actor.currentPlatform.x - actor.currentPlatform.prevX;
    }

    if (jumpRequested && actor.onGround) {
        const fromEdge = actor.currentPlatform
            ? !!actor.currentPlatform.runnerEdge
            : (estimateRunnerBandByBottom(actor.y + actor.h) === 0);
        const jumpSpeed = (actor === runnerBoss)
            ? runnerBossJumpSpeed
            : ((actor.runnerJumpProfile && actor.runnerJumpProfile.height)
                ? Math.sqrt(2 * runnerGravity * actor.runnerJumpProfile.height)
                : runnerPlayerJumpSpeed);
        actor.vy = -jumpSpeed;
        actor.onGround = false;
        actor.isJumping = true;
        actor.jumpElapsed = 0;
        actor.jumpStartBand = actor.currentPlatform
            ? (actor.currentPlatform.runnerBand || 0)
            : estimateRunnerBandByBottom(actor.y + actor.h);
        actor.jumpFromEdge = fromEdge;
        actor.jumpHoldTimer = 0;
        actor.currentPlatform = null;
    }

    if (actor.isJumping) actor.jumpElapsed += dt;

    // Переменная высота прыжка для стилей dron/kuzy при удержании ArrowUp.
    if (actor === player && actor.isJumping && actor.vy < 0 && actor.runnerJumpProfile) {
        const holdTime = actor.runnerJumpProfile.holdTime || 0;
        if (holdTime > 0 && keys['ArrowUp'] && actor.jumpHoldTimer < holdTime) {
            actor.jumpHoldTimer += dt;
            actor.vy -= (actor.runnerJumpProfile.holdAccel || 0) * dt;
        }
    }

    const prevX = actor.x;

    actor.x += actor.vx * dt;
    clampOrWarpRunnerActorX(actor);

    actor.vy += runnerGravity * dt;
    if (actor.vy > runnerMaxFallSpeed) actor.vy = runnerMaxFallSpeed;
    actor.y += actor.vy * dt;

    const surfaces = getRunnerSolidSurfaces();
    const centerX = actor.x + actor.w * 0.5;
    const curBottom = actor.y + actor.h;

    // 1) Приземление "сверху" по центру персонажа (как в режиме platforms).
    let landed = null;
    for (let i = 0; i < surfaces.length; i++) {
        const p = surfaces[i];
        if (!p) continue;
        if (centerX < p.x || centerX > p.x + p.w) continue;
        if (actor.vy >= 0 && curBottom >= p.y && curBottom <= p.y + landWindow) {
            landed = p;
            break;
        }
    }

    if (landed) {
        actor.y = getRunnerSurfaceSnapY(actor, landed);
        actor.vy = 0;
        actor.onGround = true;
        actor.currentPlatform = landed;
        actor.isJumping = false;
        actor.jumpElapsed = 0;
        actor.jumpFromEdge = false;
        actor.jumpHoldTimer = 0;
    } else if (!actor.isJumping) {
        // 2) Состояние "стоим на платформе" (по центру и узкому диапазону у верха платформы).
        let standSurface = null;
        for (let i = 0; i < surfaces.length; i++) {
            const p = surfaces[i];
            if (!p) continue;
            if (centerX < p.x || centerX > p.x + p.w) continue;
            if (curBottom >= p.y + standMin && curBottom <= p.y + standMax) {
                standSurface = p;
                break;
            }
        }

        if (standSurface) {
            actor.y = getRunnerSurfaceSnapY(actor, standSurface);
            actor.vy = 0;
            actor.onGround = true;
            actor.currentPlatform = standSurface;
        } else {
            actor.onGround = false;
            actor.currentPlatform = null;
        }
    } else {
        actor.onGround = false;
        actor.currentPlatform = null;
    }

    // Подстраховка от ухода ниже низа.
    const maxY = getRunnerSurfaceSnapY(actor, runnerGround);
    if (actor.y > maxY) {
        actor.y = maxY;
        actor.vy = 0;
        actor.onGround = true;
        actor.currentPlatform = runnerGround;
        actor.isJumping = false;
        actor.jumpFromEdge = false;
        actor.jumpHoldTimer = 0;
    }

    // Если персонаж полностью застрял у края, мягко возвращаем внутрь.
    if (Math.abs(actor.x - prevX) < 0.001 && (actor.x <= 0 || actor.x + actor.w >= canvas.width)) {
        actor.x = Math.max(0, Math.min(canvas.width - actor.w, actor.x));
    }
}

/**
 * Обновляет анимацию игрока для режима "Бегун".
 * @param {number} dt - время кадра.
 * @param {boolean} movingHoriz - есть ли горизонтальное движение.
 */
function updateRunnerPlayerAnimation(dt, movingHoriz) {
    if (!player) return;
    player.shooting = false;

    // Кузя: анимация через PNG Sequences
    if (player.type === 'kuzy') {
        const inAir = !player.onGround || player.isJumping;
        player._updateKuzyAnim(dt, inAir, true, movingHoriz);
        return;
    }

    if (!player.onGround || player.isJumping) {
        player.timer += dt;
        if (player.timer > 0.12) {
            player.frame++;
            if (player.frame > 3) player.frame = 0;
            player.timer = 0;
        }
        return;
    }

    if (movingHoriz) {
        player.timer += dt;
        if (player.timer > 0.12) {
            player.frame++;
            if (player.frame < WALK_START || player.frame > WALK_END) player.frame = WALK_START;
            player.timer = 0;
        }
    } else {
        player.frame = 0;
        player.timer = 0;
    }
}

/**
 * Обновляет поведение босса "прапор".
 * @param {number} dt - время кадра.
 * @param {boolean} playerMoving - движется ли игрок.
 */
function updateRunnerBossAi(dt, playerMoving) {
    if (!runnerBoss || !player) return;

    const playerCenterX = player.x + player.w * 0.5;
    const bossCenterX = runnerBoss.x + runnerBoss.w * 0.5;
    const distX = Math.abs(playerCenterX - bossCenterX);

    const baseBossSpeed = runnerPlayerMoveSpeed * 2 * (runnerEnergyActive ? 1.35 : 1.0);
    let targetSpeed = baseBossSpeed;

    if (!playerMoving) {
        runnerBoss.idleDecisionTimer -= dt;
        if (runnerBoss.idleDecisionTimer <= 0) {
            runnerBoss.idleMode = (Math.random() < 0.38) ? 'stand' : 'slow';
            runnerBoss.idleMul = runnerRand(0.2, 0.8);
            runnerBoss.idleDecisionTimer = runnerRand(1.0, 4.0);
        }
        if (runnerBoss.idleMode === 'stand') targetSpeed = 0;
        else targetSpeed = baseBossSpeed * runnerBoss.idleMul;
    } else {
        // Игрок двигается — босс должен быть в движении.
        runnerBoss.idleMode = 'run';
        runnerBoss.idleDecisionTimer = 0;

        // Периодический "турбо-рывок" с шлейфом.
        if (distX < canvas.width * 0.24 && Math.random() < dt * 1.7) {
            runnerBoss.turboTimer = Math.max(runnerBoss.turboTimer, runnerRand(0.35, 0.75));
        }
        // Дразнилка: в обычном режиме редко (dt*0.10), в окне замедления чаще (dt*0.48).
        const teaseChance = runnerBossSlowTimer > 0 ? dt * 0.48 : dt * 0.10;
        if (Math.random() < teaseChance) {
            runnerBoss.teaseTimer = runnerRand(0.25, 0.55);
        }
    }

    // Уловка уровня: после 20с простоя игрока босс 5с медленный.
    if (runnerBossSlowTimer > 0) {
        targetSpeed = Math.min(targetSpeed, runnerPlayerMoveSpeed * 0.8);
    }

    if (runnerBoss.turboTimer > 0) {
        runnerBoss.turboTimer = Math.max(0, runnerBoss.turboTimer - dt);
        targetSpeed *= 1.28;
    }

    // Легкая вариативность походки: скорость меняется короткими "пачками",
    // чтобы движения не выглядели как однообразный цикл.
    runnerBoss.gaitTimer -= dt;
    if (runnerBoss.gaitTimer <= 0) {
        runnerBoss.gaitTimer = runnerRand(0.24, 0.65);
        runnerBoss.gaitMul = playerMoving ? runnerRand(0.82, 1.22) : runnerRand(0.62, 1.0);
    }
    targetSpeed *= runnerBoss.gaitMul;

    const minSafeDist = Math.max(
        canvas.width * (runnerBossSlowTimer > 0 ? 0.10 : 0.19),
        player.w * (runnerBossSlowTimer > 0 ? 1.2 : 2.15)
    );

    // Бежим от игрока.
    const awayDir = (bossCenterX >= playerCenterX) ? 1 : -1;
    let moveDir = awayDir;

    // Гистерезис направления: если почти по центру игрока, не меняем сторону каждый кадр.
    if (Math.abs(bossCenterX - playerCenterX) < minSafeDist * 0.45) {
        moveDir = runnerBoss.escapeDir || awayDir;
    } else {
        runnerBoss.escapeDir = awayDir;
    }

    // Во время "дразнилки" босс может чуть сократить дистанцию (работает в любом режиме).
    if (runnerBoss.teaseTimer > 0 && playerMoving && distX > minSafeDist * 1.8) {
        runnerBoss.teaseTimer = Math.max(0, runnerBoss.teaseTimer - dt);
        moveDir *= -1;
        targetSpeed *= 0.58;
    } else if (distX <= minSafeDist * 1.2) {
        // Слишком близко — отключаем дразнилку.
        runnerBoss.teaseTimer = 0;
    }

    // Если босс слишком близко к игроку, включаем экстренное уклонение.
    if (distX < minSafeDist && runnerBossSlowTimer <= 0) {
        targetSpeed *= 1.55;
        runnerBoss.turboTimer = Math.max(runnerBoss.turboTimer, 0.6);
        if (runnerBoss.onGround) {
            runnerBoss.vy = -runnerBossJumpSpeed * runnerRand(0.98, 1.08);
            runnerBoss.onGround = false;
            runnerBoss.isJumping = true;
            runnerBoss.jumpElapsed = 0;
            runnerBoss.jumpStartBand = estimateRunnerBandByBottom(runnerBoss.y + runnerBoss.h);
            runnerBoss.jumpFromEdge = !!(runnerBoss.currentPlatform && runnerBoss.currentPlatform.runnerEdge);
            runnerBoss.currentPlatform = null;
        }
    }

    // После warp кратко принудительно идем вглубь экрана.
    if (runnerBoss.postWarpTimer > 0) {
        runnerBoss.postWarpTimer = Math.max(0, runnerBoss.postWarpTimer - dt);
        moveDir = runnerBoss.postWarpDir || moveDir;
        const minPostWarpSpeed = runnerPlayerMoveSpeed * (runnerBossSlowTimer > 0 ? 0.95 : 2.1);
        targetSpeed = Math.max(targetSpeed, minPostWarpSpeed);
    }

    // Плавная смена скорости вместо мгновенного рывка.
    const desiredVx = moveDir * targetSpeed;
    const accel = runnerBoss.onGround ? canvas.width * 2.8 : canvas.width * 2.0;
    const maxDelta = accel * dt;
    const dv = desiredVx - runnerBoss.vx;
    if (Math.abs(dv) <= maxDelta) runnerBoss.vx = desiredVx;
    else runnerBoss.vx += Math.sign(dv) * maxDelta;

    if (runnerBoss.vx < -8) runnerBoss.facingDir = 'left';
    if (runnerBoss.vx > 8) runnerBoss.facingDir = 'right';

    // Прыжки по платформам.
    runnerBoss.jumpDecisionTimer -= dt;
    if (runnerBoss.onGround && runnerBoss.jumpDecisionTimer <= 0) {
        const playerBand = estimateRunnerBandByBottom(player.y + player.h);
        const bossBand = estimateRunnerBandByBottom(runnerBoss.y + runnerBoss.h);

        let jumpChance = 0.26;
        if (playerMoving) jumpChance += 0.16;
        if (distX < canvas.width * 0.26) jumpChance += 0.18;
        if (bossBand <= playerBand) jumpChance += 0.14;

        // Если босс ниже игрока по полосе — усиливаем вероятность прыжка.
        if (bossBand < playerBand) jumpChance += 0.22;

        if (Math.random() < jumpChance) {
            runnerBoss.vy = -runnerBossJumpSpeed * runnerRand(0.94, 1.10);
            runnerBoss.onGround = false;
            runnerBoss.isJumping = true;
            runnerBoss.jumpElapsed = 0;
            runnerBoss.jumpStartBand = bossBand;
            runnerBoss.jumpFromEdge = !!(runnerBoss.currentPlatform && runnerBoss.currentPlatform.runnerEdge);
            runnerBoss.currentPlatform = null;
        }

        runnerBoss.jumpDecisionTimer = runnerRand(0.28, 0.95);
    }
}

/**
 * Обновляет ping-pong анимацию босса.
 * @param {number} dt - время кадра.
 */
function updateRunnerBossAnimation(dt) {
    if (!runnerBoss) return;
    const speedAbs = Math.abs(runnerBoss.vx);
    const moving = speedAbs > 2 || !runnerBoss.onGround;
    let interval = 0.18;
    if (moving) {
        const speedNorm = Math.min(1.2, speedAbs / Math.max(1, runnerPlayerMoveSpeed * 2));
        interval = 0.115 - speedNorm * 0.04;
        if (!runnerBoss.onGround) interval *= 0.9;
        interval = Math.max(0.06, interval);
    }

    runnerBoss.animTimer += dt;
    if (runnerBoss.animTimer < interval) return;

    runnerBoss.animTimer -= interval;
    const maxFrame = moving ? 6 : 2;
    runnerBoss.frameIndex += runnerBoss.frameDir;
    if (runnerBoss.frameIndex >= maxFrame) {
        runnerBoss.frameIndex = maxFrame;
        runnerBoss.frameDir = -1;
    } else if (runnerBoss.frameIndex <= 0) {
        runnerBoss.frameIndex = 0;
        runnerBoss.frameDir = 1;
    }
}

/**
 * Добавляет частицы дыма от сигареты.
 * @param {{x:number,y:number,w:number,h:number}} cig - прямоугольник сигареты.
 * @param {number} dt - время кадра.
 */
function spawnRunnerSmoke(cig, dt, facingDir) {
    const densityMul = runnerCigarXLActive ? 2.2 : 1.0;
    const count = Math.max(1, Math.floor(dt * 42 * densityMul));
    // Дым идёт с дальнего конца сигареты (горящего края).
    // При движении вправо — это правый край (x + w), влево — левый (x).
    const tipX = (facingDir === 'left') ? cig.x : cig.x + cig.w;
    for (let i = 0; i < count; i++) {
        runnerSmoke.push({
            x: tipX + runnerRand(-cig.w * 0.12, cig.w * 0.12),
            y: cig.y + cig.h * runnerRand(0.1, 0.5),
            vx: runnerRand(-18, 18),
            vy: runnerRand(-52, -26),
            r: runnerRand(4, 10),
            life: runnerRand(0.45, 0.95),
            t: 0
        });
    }
}

/**
 * Обновляет частицы дыма сигареты.
 * @param {number} dt - время кадра.
 */
function updateRunnerSmoke(dt) {
    runnerSmoke = runnerSmoke.filter(s => {
        s.t += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= (1 - Math.min(0.5, dt * 1.7));
        s.vy -= 18 * dt;
        return s.t < s.life;
    });
}

/**
 * Добавляет турбо-шлейф босса.
 * @param {number} dt - время кадра.
 */
function spawnRunnerTurboTrail(dt) {
    if (!runnerBoss) return;
    if (runnerBoss.turboTimer <= 0) return;

    const count = Math.max(1, Math.floor(dt * 70));
    const sign = runnerBoss.vx >= 0 ? -1 : 1;
    for (let i = 0; i < count; i++) {
        runnerTurboTrail.push({
            x: runnerBoss.x + runnerBoss.w * (sign < 0 ? 0.2 : 0.8),
            y: runnerBoss.y + runnerBoss.h * runnerRand(0.2, 0.82),
            vx: sign * runnerRand(120, 220),
            vy: runnerRand(-26, 26),
            life: runnerRand(0.12, 0.22),
            t: 0,
            size: runnerRand(5, 11)
        });
    }
}

/**
 * Обновляет частицы турбо-шлейфа.
 * @param {number} dt - время кадра.
 */
function updateRunnerTurboTrail(dt) {
    runnerTurboTrail = runnerTurboTrail.filter(p => {
        p.t += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= (1 - Math.min(0.6, dt * 4));
        return p.t < p.life;
    });
}

/**
 * Обновляет псевдо-полезные бонусы режима "Бегун":
 * - энергетик (ускоряет игрока и скрыто ускоряет прапора),
 * - сигарета XL (только визуал сигареты/дыма, без изменения хитбокса).
 * @param {number} dt - время кадра.
 */
function updateRunnerFakeBonuses(dt) {
    const fallSpeed = 135; // px/сек, визуально близко к "Ловлю"

    // Падающие энергетики.
    for (let i = 0; i < runnerEnergyDrops.length; i++) {
        const b = runnerEnergyDrops[i];
        b.y += fallSpeed * dt;
        b.x += Math.sin((b.y + b.phase) / 15) * 1.3;
    }
    runnerEnergyDrops = runnerEnergyDrops.filter(b => b.y < canvas.height + 20);

    // Падающие сигареты XL.
    for (let i = 0; i < runnerCigarDrops.length; i++) {
        const b = runnerCigarDrops[i];
        b.y += fallSpeed * dt;
        b.x += Math.sin((b.y + b.phase) / 15) * 1.3;
    }
    runnerCigarDrops = runnerCigarDrops.filter(b => b.y < canvas.height + 20);

    // Подбор бонусов игроком.
    for (let i = runnerEnergyDrops.length - 1; i >= 0; i--) {
        if (rect(runnerEnergyDrops[i], player)) {
            runnerEnergyActive = true;
            runnerEnergyTimer = 10.0;
            runnerEnergyDrops.splice(i, 1);
        }
    }
    for (let i = runnerCigarDrops.length - 1; i >= 0; i--) {
        if (rect(runnerCigarDrops[i], player)) {
            runnerCigarXLActive = true;
            runnerCigarXLTimer = 10.0;
            runnerCigarDrops.splice(i, 1);
        }
    }

    // Таймеры эффектов.
    if (runnerEnergyActive) {
        runnerEnergyTimer -= dt;
        if (runnerEnergyTimer <= 0) {
            runnerEnergyActive = false;
            runnerEnergyTimer = 0;
        }
    }
    if (runnerCigarXLActive) {
        runnerCigarXLTimer -= dt;
        if (runnerCigarXLTimer <= 0) {
            runnerCigarXLActive = false;
            runnerCigarXLTimer = 0;
        }
    }

    // Спавн энергетика: аналогично "Ловлю" — 4% каждую секунду.
    if (!runnerVictory && !levelCompleteShown) runnerEnergyDropTimer += dt;
    if (!runnerVictory && !levelCompleteShown && runnerEnergyDropTimer >= 1.0) {
        runnerEnergyDropTimer -= 1.0;
        if (Math.random() < 0.04) {
            const w = 40, h = 40;
            runnerEnergyDrops.push({
                x: 12 + Math.random() * Math.max(1, canvas.width - w - 24),
                y: -h - 10,
                w, h,
                phase: Math.random() * 1000
            });
        }
    }

    // Спавн сигареты XL: примерно как энергетик.
    if (!runnerVictory && !levelCompleteShown) runnerCigarDropTimer += dt;
    if (!runnerVictory && !levelCompleteShown && runnerCigarDropTimer >= 1.0) {
        runnerCigarDropTimer -= 1.0;
        if (Math.random() < 0.04) {
            const w = 40, h = 40;
            runnerCigarDrops.push({
                x: 12 + Math.random() * Math.max(1, canvas.width - w - 24),
                y: -h - 10,
                w, h,
                phase: Math.random() * 1000
            });
        }
    }
}

/**
 * Рисует падающие бонусы режима "Бегун".
 */
function drawRunnerFakeBonuses() {
    const perf = window.BHBulletPerf;
    const renderMode = perf ? perf.bulletRenderMode() : 'emoji';
    const getEmojiBitmap = perf ? perf.getEmojiBitmap : null;

    // Энергетик: тот же значок, что в "Ловлю" (молния).
    for (let i = 0; i < runnerEnergyDrops.length; i++) {
        const b = runnerEnergyDrops[i];
        const emoji = '⚡';
        const size = b.h || 40;
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, b.x, b.y, size, size);
        } else {
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, b.x + size / 2, b.y + size / 2);
        }
    }

    // Сигарета XL.
    for (let i = 0; i < runnerCigarDrops.length; i++) {
        const b = runnerCigarDrops[i];
        const emoji = '🚬';
        const size = b.h || 40;
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, b.x, b.y, size, size);
        } else {
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, b.x + size / 2, b.y + size / 2);
        }
    }
}

/**
 * Возвращает прямоугольник сигареты относительно игрока.
 * Это базовый хитбокс (без масштабирования бонусом XL).
 * @returns {{x:number,y:number,w:number,h:number}}
 */
function getRunnerCigaretteRect() {
    const w = Math.max(16, player.w * 0.24);
    const h = Math.max(8, player.h * 0.08);
    // Для Кузи: сигарета ниже из-за пропорций спрайта PNG Sequences
    const cigYFraction = (player && player.type === 'kuzy') ? 0.72 : 0.56;
    const cy = player.y + player.h * cigYFraction - h * 0.5;
    const sideInset = 0.16;
    if (player.facingDir === 'left') {
        return {
            x: player.x + player.w * sideInset - w,
            y: cy,
            w,
            h
        };
    }
    return {
        // Симметрично левой стороне: справа сигарета выходит за край спрайта так же,
        // как слева (зеркально относительно игрока).
        x: player.x + player.w * (1 - sideInset),
        y: cy,
        w,
        h
    };
}

/**
 * Возвращает визуальный прямоугольник сигареты.
 * В бонусе XL рендер увеличен, но хитбокс остается базовым.
 * @returns {{x:number,y:number,w:number,h:number}}
 */
function getRunnerCigaretteVisualRect() {
    const base = getRunnerCigaretteRect();
    // Базовый скин сигареты крупнее, чтобы читался на фоне.
    const baseScale = 2.0;
    const bonusScale = runnerCigarXLActive ? 2.0 : 1.0;
    const scale = baseScale * bonusScale;
    if (Math.abs(scale - 1.0) < 1e-6) return base;
    const nw = base.w * scale;
    const nh = base.h * scale;
    return {
        x: base.x + (base.w - nw) * 0.5,
        y: base.y + (base.h - nh) * 0.5,
        w: nw,
        h: nh
    };
}

/**
 * Разрешает пересечение игрока и босса: босс всегда отталкивается от игрока.
 */
function resolveRunnerPlayerBossSeparation() {
    if (!player || !runnerBoss) return;

    const a = { x: player.x, y: player.y, w: player.w, h: player.h };
    const b = { x: runnerBoss.x, y: runnerBoss.y, w: runnerBoss.w, h: runnerBoss.h };

    if (!rect(a, b)) return;

    const overlapLeft = (a.x + a.w) - b.x;
    const overlapRight = (b.x + b.w) - a.x;
    const pushRight = overlapLeft < overlapRight;
    const dir = pushRight ? 1 : -1;
    const gap = runnerBossSlowTimer > 0 ? 4 : Math.max(14, player.w * 0.45);
    const targetX = pushRight
        ? (player.x + player.w + gap)
        : (player.x - runnerBoss.w - gap);

    runnerBoss.x = targetX;
    const minEscapeSpeed = runnerPlayerMoveSpeed * (runnerBossSlowTimer > 0 ? 0.95 : 2.2);
    runnerBoss.vx = dir * Math.max(Math.abs(runnerBoss.vx), minEscapeSpeed);
    runnerBoss.escapeDir = dir;

    // Если коррекция вытолкнула босса за край — даем сработать edge-warp.
    if (runnerBoss.x < -runnerBoss.w) runnerBoss.x = -runnerBoss.w - 2;
    if (runnerBoss.x > canvas.width) runnerBoss.x = canvas.width + 2;
}

/**
 * Принудительно удерживает безопасную дистанцию между игроком и боссом.
 * Нужен, чтобы босс не "тёрся" рядом с игроком на краях.
 * @param {number} dt - время кадра.
 */
function enforceRunnerBossMinDistance(dt) {
    if (!player || !runnerBoss) return;

    const playerCenterX = player.x + player.w * 0.5;
    const bossCenterX = runnerBoss.x + runnerBoss.w * 0.5;
    const minGap = Math.max(20, player.w * (runnerBossSlowTimer > 0 ? 0.30 : 1.00));
    const minCenterDist = (player.w + runnerBoss.w) * 0.5 + minGap;
    const dx = bossCenterX - playerCenterX;

    if (Math.abs(dx) >= minCenterDist) return;

    const dir = dx >= 0 ? 1 : -1; // куда уводим босса от игрока
    runnerBoss.escapeDir = dir;
    const minEscapeSpeed = runnerPlayerMoveSpeed * (runnerBossSlowTimer > 0 ? 0.85 : 2.05);
    const desiredEscapeVx = dir * Math.max(Math.abs(runnerBoss.vx), minEscapeSpeed);
    runnerBoss.vx += (desiredEscapeVx - runnerBoss.vx) * Math.min(1, dt * 14);

    // В обычном режиме (без окна замедления) — дополнительный шанс экстренного прыжка.
    if (runnerBossSlowTimer <= 0 && runnerBoss.onGround && Math.random() < dt * 2.2) {
        runnerBoss.vy = -runnerBossJumpSpeed * runnerRand(1.02, 1.12);
        runnerBoss.onGround = false;
        runnerBoss.isJumping = true;
        runnerBoss.jumpElapsed = 0;
        runnerBoss.jumpStartBand = estimateRunnerBandByBottom(runnerBoss.y + runnerBoss.h);
        runnerBoss.jumpFromEdge = !!(runnerBoss.currentPlatform && runnerBoss.currentPlatform.runnerEdge);
        runnerBoss.currentPlatform = null;
    }
}

/**
 * Обновляет HUD режима "Бегун".
 */
function updateRunnerHud() {
    if (!hudEl) hudEl = document.getElementById('hud');
    if (!hudEl) return;

    const playerName = charNames[selectedChar] || selectedChar;
    if (lives !== lastHudLives) {
        cachedLivesStr = '❤️'.repeat(lives);
        lastHudLives = lives;
    }

    // 🐢 — индикатор уловки: появляется только когда уловка заряжена или активна.
    // Не показываем отладочные числа — только нужный игроку сигнал.
    let trickStr = '';
    if (runnerBossSlowTimer > 0) {
        trickStr = `   🐢 ${runnerBossSlowTimer.toFixed(1)}с`;
    } else if (runnerIdleArmed) {
        trickStr = '   🐢 Готово!';
    }
    const energyStr = runnerEnergyActive ? `   ⚡ ${Math.ceil(runnerEnergyTimer)}с` : '';
    const cigarStr = runnerCigarXLActive ? `   🚬x2 ${Math.ceil(runnerCigarXLTimer)}с` : '';

    const hudHtml = `${playerName} | Жизни: ${cachedLivesStr}<br>Очки: ${Math.max(0, Math.floor(score))}   Цель: 🚬 по прапору${trickStr}${energyStr}${cigarStr}`;
    if (hudHtml !== lastHudHtml) {
        hudEl.innerHTML = hudHtml;
        lastHudHtml = hudHtml;
    }
}

/**
 * Инициализирует режим "Бегун".
 */
function initRunnerLevel() {
    resetRunnerLevelState();
    // В режиме "Бегун" очки стартуют со 100 и постепенно убывают от времени.
    score = 100;
    runnerScoreDecayTimer = 0;

    // Скорости в px/сек.
    runnerPlayerMoveSpeed = player.speed * 60;
    runnerGravity = canvas.height * 2.45;
    runnerMaxFallSpeed = canvas.height * 2.2;

    // Профили прыжка по стилям игрока (max/dron/kuzy), чтобы сохранить различия персонажей.
    runnerPlayerJumpProfiles = {
        max: {
            height: Math.max(player.h * 1.5, canvas.height * 0.28),
            holdTime: 0,
            holdAccel: 0
        },
        dron: {
            height: Math.max(player.h * 1.08, canvas.height * 0.23),
            holdTime: 0.22,
            holdAccel: canvas.height * 3.5
        },
        kuzy: {
            height: Math.max(player.h * 1.0, canvas.height * 0.22),
            holdTime: 0.30,
            holdAccel: canvas.height * 2.9
        }
    };
    const jumpStyle = player.jumpStyle || 'kuzy';
    player.runnerJumpProfile = runnerPlayerJumpProfiles[jumpStyle] || runnerPlayerJumpProfiles.kuzy;
    runnerPlayerJumpSpeed = Math.sqrt(2 * runnerGravity * player.runnerJumpProfile.height);

    refreshRunnerLayout(false);

    player.runnerFootOffset = 30;
    player.x = 20;
    player.y = getRunnerSurfaceSnapY(player, runnerGround);
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.isJumping = false;
    player.jumpElapsed = 0;
    player.jumpStartBand = 0;
    player.jumpFromEdge = false;
    player.jumpHoldTimer = 0;
    player.currentPlatform = runnerGround;
    player.facingDir = 'right';
    player.shooting = false;
    player.frame = 0;
    player.timer = 0;

    initRunnerBoss();
    runnerBossJumpSpeed = Math.sqrt(2 * runnerGravity * Math.max(runnerBoss.h * 1.6, canvas.height * 0.34));

    runnerLastPlayerX = player.x;
    runnerLastPlayerY = player.y;
}

/**
 * Обработчик пересчета режима "Бегун" при изменении размера окна.
 * @param {number} prevW - предыдущая ширина canvas.
 * @param {number} prevH - предыдущая высота canvas.
 */
function onRunnerResize(prevW, prevH) {
    if (gameMode !== 'runner') return;
    runnerGravity = canvas.height * 2.45;
    runnerMaxFallSpeed = canvas.height * 2.2;
    if (player && runnerPlayerJumpProfiles) {
        runnerPlayerJumpProfiles.max.height = Math.max(player.h * 1.5, canvas.height * 0.28);
        runnerPlayerJumpProfiles.dron.height = Math.max(player.h * 1.08, canvas.height * 0.23);
        runnerPlayerJumpProfiles.kuzy.height = Math.max(player.h * 1.0, canvas.height * 0.22);
        runnerPlayerJumpProfiles.dron.holdAccel = canvas.height * 3.5;
        runnerPlayerJumpProfiles.kuzy.holdAccel = canvas.height * 2.9;
        const jumpStyle = player.jumpStyle || 'kuzy';
        player.runnerJumpProfile = runnerPlayerJumpProfiles[jumpStyle] || runnerPlayerJumpProfiles.kuzy;
        runnerPlayerJumpSpeed = Math.sqrt(2 * runnerGravity * player.runnerJumpProfile.height);
    }
    if (runnerBoss) {
        runnerBossJumpSpeed = Math.sqrt(2 * runnerGravity * Math.max(runnerBoss.h * 1.6, canvas.height * 0.34));
    }
    refreshRunnerLayout(true, prevW, prevH);
}

/**
 * Главный update-цикл режима "Бегун".
 * @param {number} dt - время кадра.
 */
function updateRunnerMode(dt) {
    if (!player || !runnerGround || !runnerBoss) {
        initRunnerLevel();
    }

    if (invuln > 0) invuln -= dt;

    // Таймер очков "Бегуна":
    // каждые 5 секунд уменьшаем очки на 1, не ниже 0.
    if (!runnerVictory && !levelCompleteShown && score > 0) {
        runnerScoreDecayTimer += dt;
        while (runnerScoreDecayTimer >= 5.0 && score > 0) {
            runnerScoreDecayTimer -= 5.0;
            score = Math.max(0, score - 1);
        }
    }

    // Обновляем движущиеся платформы заранее (нужно для переносов игрока/босса).
    for (let i = 0; i < runnerPlatforms.length; i++) {
        runnerPlatforms[i].update(dt);
    }

    // Обновляем бонусы уровня (падение, подбор, таймеры эффектов).
    updateRunnerFakeBonuses(dt);

    // Ввод игрока.
    let move = 0;
    if (keys['ArrowLeft']) move -= 1;
    if (keys['ArrowRight']) move += 1;

    const playerSpeedMul = runnerEnergyActive ? 1.5 : 1.0;
    player.vx = move * runnerPlayerMoveSpeed * playerSpeedMul;
    if (move < 0) player.facingDir = 'left';
    if (move > 0) player.facingDir = 'right';

    const jumpRequested = !!keys['ArrowUp'] && !!player.onGround;
    updateRunnerActorPhysics(player, dt, jumpRequested);

    // Анимация игрока.
    updateRunnerPlayerAnimation(dt, move !== 0);

    // Логика простоя игрока для "уловки" с замедлением босса.
    const playerDx = Math.abs(player.x - runnerLastPlayerX);
    const playerDy = Math.abs(player.y - runnerLastPlayerY);
    const playerMovingNow = (move !== 0) || playerDx > 0.4 || playerDy > 0.4 || !player.onGround;

    if (!playerMovingNow) {
        runnerIdleTimer += dt;
        if (runnerIdleTimer >= 20) runnerIdleArmed = true;
    } else {
        if (runnerIdleArmed) {
            runnerBossSlowTimer = 5.0;
        }
        runnerIdleTimer = 0;
        runnerIdleArmed = false;
    }

    runnerLastPlayerX = player.x;
    runnerLastPlayerY = player.y;

    if (runnerBossSlowTimer > 0) {
        runnerBossSlowTimer = Math.max(0, runnerBossSlowTimer - dt);
    }

    // Босс обновляется, пока уровень не завершен.
    if (!runnerVictory) {
        updateRunnerBossAi(dt, playerMovingNow);
        const bossJumpRequested = false; // прыжок инициируется AI напрямую.
        updateRunnerActorPhysics(runnerBoss, dt, bossJumpRequested);
        updateRunnerBossAnimation(dt);
        resolveRunnerPlayerBossSeparation();
        enforceRunnerBossMinDistance(dt);
        spawnRunnerTurboTrail(dt);
    } else {
        runnerBoss.vx = 0;
    }

    // Сигарета/дым (без пуль).
    const smoking = !!keys[' '];
    if (smoking) {
        const cigHitRect = getRunnerCigaretteRect();
        const cigVisualRect = getRunnerCigaretteVisualRect();
        spawnRunnerSmoke(cigVisualRect, dt, player.facingDir);

        // Условие победы: сигарета коснулась босса.
        if (!runnerVictory && runnerBoss && rect(cigHitRect, runnerBoss) && !levelCompleteShown) {
            runnerVictory = true;
            levelCompleteShown = true;
            runnerBossSpeech = {
                text: 'Я из-за тебя ногу подвернул, я тебя сука убью!!',
                timer: 0,
                duration: 6.0
            };
            showLevelComplete();
        }
    }

    updateRunnerSmoke(dt);
    updateRunnerTurboTrail(dt);

    // Таймер реплики босса.
    if (runnerBossSpeech) {
        runnerBossSpeech.timer += dt;
        if (runnerBossSpeech.timer >= runnerBossSpeech.duration) {
            runnerBossSpeech = null;
        }
    }

    // Поддерживаем пустые массивы боевой логики, чтобы ничего лишнего не протекало в режим.
    bullets = [];
    enemyBullets = [];
    enemies = [];
    bottles = [];
    hearts = [];

    updateRunnerHud();
}

/**
 * Рисует дым от сигареты.
 */
function drawRunnerSmoke() {
    for (let i = 0; i < runnerSmoke.length; i++) {
        const s = runnerSmoke[i];
        const k = 1 - (s.t / Math.max(0.0001, s.life));
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, k * 0.68));
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
        g.addColorStop(0, 'rgba(242,242,242,0.9)');
        g.addColorStop(1, 'rgba(180,180,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (1 + (1 - k) * 0.55), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Рисует турбо-шлейф босса.
 */
function drawRunnerTurboTrail() {
    for (let i = 0; i < runnerTurboTrail.length; i++) {
        const p = runnerTurboTrail[i];
        const k = 1 - (p.t / Math.max(0.0001, p.life));
        ctx.save();
        ctx.globalAlpha = Math.max(0, k * 0.85);
        ctx.fillStyle = 'rgba(120,220,255,0.95)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * (0.8 + (1 - k) * 1.1), p.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Рисует сигарету в руках игрока.
 */
function drawRunnerCigarette() {
    if (!keys[' '] || !player) return;
    const c = getRunnerCigaretteVisualRect();
    const angle = player.facingDir === 'left' ? Math.PI : 0;

    ctx.save();
    ctx.translate(c.x + c.w * 0.5, c.y + c.h * 0.5);
    ctx.rotate(angle);

    if (runnerCigReady && runnerCigImg.naturalWidth > 0 && runnerCigImg.naturalHeight > 0) {
        // Рисуем PNG с сохранением пропорций внутри визуального прямоугольника.
        const aspect = runnerCigImg.naturalWidth / runnerCigImg.naturalHeight;
        let dw = c.w;
        let dh = c.h;
        if (dw / dh > aspect) dw = dh * aspect;
        else dh = dw / aspect;
        ctx.drawImage(runnerCigImg, -dw * 0.5, -dh * 0.5, dw, dh);
    } else {
        // Fallback, если PNG еще не загружен.
        ctx.fillStyle = '#f7efe1';
        ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
        ctx.fillStyle = '#d68a41';
        ctx.fillRect(c.w * 0.18, -c.h * 0.5, c.w * 0.32, c.h);
        ctx.fillStyle = '#ff6d00';
        ctx.fillRect(-c.w * 0.5, -c.h * 0.5, Math.max(2, c.w * 0.14), c.h);
    }

    ctx.restore();
}

/**
 * Рисует босса "прапор".
 */
function drawRunnerBoss() {
    if (!runnerBoss) return;

    const img = runnerBossFrames[runnerBoss.frameIndex] || null;
    const drawX = runnerBoss.x;
    const drawY = runnerBoss.y;

    // Тень рисуется на поверхности под боссом, а не под спрайтом.
    let shadowSurfaceY = runnerGround ? runnerGround.y : canvas.height;
    if (runnerBoss.onGround && runnerBoss.currentPlatform) {
        shadowSurfaceY = runnerBoss.currentPlatform.y;
    } else {
        // Босс в воздухе — ищем ближайшую платформу ниже центра.
        const bCenterX = drawX + runnerBoss.w * 0.5;
        const bBottom  = drawY + runnerBoss.h;
        const surfaces = getRunnerSolidSurfaces();
        for (let _i = 0; _i < surfaces.length; _i++) {
            const _p = surfaces[_i];
            if (!_p) continue;
            if (bCenterX < _p.x || bCenterX > _p.x + _p.w) continue;
            if (_p.y >= bBottom && _p.y < shadowSurfaceY) shadowSurfaceY = _p.y;
        }
    }
    const _shadowDist   = Math.max(0, shadowSurfaceY - (drawY + runnerBoss.h));
    const _shadowScale  = Math.max(0.12, 1 - _shadowDist / (canvas.height * 0.55));
    ctx.save();
    ctx.globalAlpha = 0.22 * _shadowScale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(
        drawX + runnerBoss.w * 0.5,
        shadowSurfaceY + 3,
        runnerBoss.w * 0.34 * _shadowScale,
        Math.max(3, runnerBoss.h * 0.07 * _shadowScale),
        0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    ctx.save();
    if (img && img.complete && img.naturalWidth > 0) {
        if (runnerBoss.facingDir === 'right') {
            ctx.translate(drawX + runnerBoss.w, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, runnerBoss.w, runnerBoss.h);
        } else {
            ctx.drawImage(img, drawX, drawY, runnerBoss.w, runnerBoss.h);
        }
    } else {
        ctx.font = `${Math.round(runnerBoss.h)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏃', drawX + runnerBoss.w * 0.5, drawY + runnerBoss.h * 0.5);
    }
    ctx.restore();
}

/**
 * Рисует реплику босса в облачке.
 */
function drawRunnerBossSpeech() {
    if (!runnerBossSpeech || !runnerBoss) return;
    const lifeK = 1 - (runnerBossSpeech.timer / Math.max(0.001, runnerBossSpeech.duration));
    const alpha = Math.max(0, Math.min(1, lifeK));

    const text = runnerBossSpeech.text;
    const fontSize = Math.max(13, Math.round(canvas.width * 0.016));
    const pad = 12;
    const lineH = fontSize * 1.45;
    const maxLineW = Math.min(canvas.width * 0.58, 340);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${fontSize}px Arial`;

    // Перенос по словам.
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (let _wi = 0; _wi < words.length; _wi++) {
        const test = cur ? cur + ' ' + words[_wi] : words[_wi];
        if (cur && ctx.measureText(test).width > maxLineW) {
            lines.push(cur);
            cur = words[_wi];
        } else {
            cur = test;
        }
    }
    if (cur) lines.push(cur);

    const boxW = Math.min(maxLineW + pad * 2, canvas.width - 20);
    const boxH = lines.length * lineH + pad * 2;

    let bx = runnerBoss.x + runnerBoss.w * 0.5 - boxW * 0.5;
    bx = Math.max(8, Math.min(canvas.width - boxW - 8, bx));

    // Стандартная позиция — над боссом.
    let by = Math.max(12, runnerBoss.y - boxH - 18);

    // Когда активна победная табличка, она занимает примерно центральные 25–75%
    // высоты canvas. Если облачко попадает в эту зону — сдвигаем его:
    // пробуем над запретной зоной, потом под боссом, потом под запретной зоной.
    if (runnerVictory) {
        const forbidTop    = canvas.height * 0.22;
        const forbidBottom = canvas.height * 0.78;
        const bubbleBottom = by + boxH;
        const overlaps = by < forbidBottom && bubbleBottom > forbidTop;
        if (overlaps) {
            // Вариант А: над запретной зоной
            const aboveBy = forbidTop - boxH - 10;
            // Вариант Б: под боссом
            const belowBy = runnerBoss.y + runnerBoss.h + 18;
            // Вариант В: под запретной зоной
            const belowForbidBy = forbidBottom + 10;

            // Выбираем ближайший к боссу вариант, который не перекрывает запретную зону
            const bossMidY = runnerBoss.y + runnerBoss.h * 0.5;
            const candidates = [];
            if (aboveBy >= 8) candidates.push({ y: aboveBy, dist: Math.abs(aboveBy + boxH * 0.5 - bossMidY) });
            if (belowBy + boxH <= canvas.height - 4) candidates.push({ y: belowBy, dist: Math.abs(belowBy + boxH * 0.5 - bossMidY) });
            if (belowForbidBy + boxH <= canvas.height - 4) candidates.push({ y: belowForbidBy, dist: Math.abs(belowForbidBy + boxH * 0.5 - bossMidY) });

            if (candidates.length > 0) {
                candidates.sort((a, b) => a.dist - b.dist);
                by = candidates[0].y;
            } else {
                // Крайний случай: прижать к самому низу.
                by = canvas.height - boxH - 8;
            }
        }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    // Хвостик привязан к центру спрайта босса, но не вылезает за края облачка.
    const tailX = Math.max(bx + 16, Math.min(bx + boxW - 16, runnerBoss.x + runnerBoss.w * 0.5));
    const tailY = by + boxH;
    ctx.beginPath();
    ctx.moveTo(tailX - 10, tailY);
    ctx.lineTo(tailX + 2, tailY + 14);
    ctx.lineTo(tailX + 10, tailY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#222';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let _li = 0; _li < lines.length; _li++) {
        ctx.fillText(lines[_li], bx + pad, by + pad + _li * lineH);
    }
    ctx.restore();
}

/**
 * Полная отрисовка режима "Бегун".
 */
function drawRunnerMode() {
    // Фон.
    if (bgReady) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#87b36c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Визуальный слой "земли" отключен: оставляем только фон уровня без коричневой подложки.

    // Платформы.
    for (let i = 0; i < runnerPlatforms.length; i++) {
        runnerPlatforms[i].draw();
    }

    // Падающие псевдо-полезные бонусы.
    drawRunnerFakeBonuses();

    drawRunnerTurboTrail();

    // Игрок.
    if (invuln > 0 && Math.floor(invuln * 16) % 2 === 0) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        player.draw();
        ctx.restore();
    } else {
        player.draw();
    }

    drawRunnerCigarette();
    drawRunnerSmoke();

    // Босс.
    drawRunnerBoss();
    drawRunnerBossSpeech();

    const perf = window.BHBulletPerf;
    if (perf && perf.isEnabled()) perf.drawOverlay(ctx, 0);
}
