// Глобальное изменяемое состояние игры
let canvas = null;
let ctx = null;

let keys = {};
let bullets = [];
let enemyBullets = [];
let enemies = [];
let bottles = [];
let hearts = [];
let bananaBonuses = [];
let o4koVictoryBeers = [];
let o4koVictorySequenceActive = false;
let platforms = [];

let player = null;
let boss = null;
let enemy67 = null;
let bossO4ko = null;
let bossNosok = null;

let bossDefeated = false;
let score = 0;
let combo = 0;
let lives = PLAYER_LIVES;
let invuln = INVULN_TIME;
let bonusShots = 0;
let bonusMode = false;

let playerBulletDir = 'up';
let dirSwitchHeld = false;
let altShootMode = false;
let ctrlHeld = false;

let gameMode = 'normal';
let selectedChar = 'kuzy';
// Система спрайтов: 'kuzy' | 'max' | 'dron' (независима от персонажа)
let selectedSpriteSystem = (typeof localStorage !== 'undefined' && localStorage.getItem('bh_char_skin')) || 'max';
let o4koHitStreak = 0;
let o4koRandomDropTimer = 0;
let o4koVulnHitCount = 0;
let o4koLivesLost = 0;
let o4koPityHeartUsed = false;

let homePlatform = null;
let bossPlatform = null;
let platform67HitCount = 0;
let platformPlayerLastX = 0;
let platformInactivityTimer = 0;
let platformRuby = null;
let platformCup = null;

let killCount = 0;
let survivalEnemySpeedIncrease = 0;
let survivalBulletSpeedIncrease = 0;
let survivalSpeedUps = 0;
let survivalBulletMultiplier = 1;
let survivalWaveSpawning = false;

// Состояние фаз для режима `normal` (фазы сирени)
let normalPhase = 1; // 1..3, стартуем с фазы 1 (фаза 2 соответствует старому поведению)
let normalPhaseSpawning = false; // флаг текущего интерактивного спавна фазы
let normalPhaseSpawnTimer = 0; // таймер между поодиночными спавнами при переходе фазы
let normalPhaseSpawnedCount = 0; // сколько уже заспавнено в текущем переходе
let normalPhaseSpawnTotal = 0; // сколько нужно заспавнить (ENEMY_ROWS*ENEMY_COLS)
let normalPhaseTarget = 0; // номер фазы, которую сейчас спавним
// Визуальный эффект при смене фазы (секунды)
let normalPhaseEffectTimer = 0;
// Отладочный режим
let debugMode = false;

let speechBalloons = [];
let explosions = [];

let running = false;
let paused = false;
let animFrameId = null;
let levelCompleteShown = false;
let gameOverShown = false;
let last = 0;

let hudEl = null;
let lastHudHtml = '';
let lastHudLives = -1;
let cachedLivesStr = '';

let bukinTablet = null;
let modes = null;

// Состояние режима "Носок"
let nosokBall = null;
let nosokGoalSensor = null;
let nosokCrossbar = null;
let nosokGoals = 0;
let nosokTargetGoals = 10;
let nosokElapsedTime = 0;
let nosokFinalTimeMs = 0;
let nosokGoalPauseTimer = 0;
let nosokGoalFlashTimer = 0;
let nosokGoalRespawnPending = false;
let nosokGoalConfettiTimer = 0;
let nosokGoalConfetti = [];
let nosokDropTimer = 0;
let nosokNextDropTime = 0;
let nosokIceTimer = 0;
let nosokNextIceTime = 15;
let nosokDynamiteTimer = 0;
let nosokNextDynamiteTime = 20;
let nosokSpecialBonuses = [];

/**
 * Базовый сброс runtime-состояния игры.
 */
function resetGameRuntimeCore() {
    if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();

    keys = {};
    bullets = [];
    enemyBullets = [];
    enemies = [];
    bottles = [];
    hearts = [];
    bananaBonuses = [];
    o4koVictoryBeers = [];
    o4koVictorySequenceActive = false;
    platforms = [];
    speechBalloons = [];
    explosions = [];

    player = null;
    boss = null;
    enemy67 = null;
    bossO4ko = null;
    bossNosok = null;
    bukinTablet = null;

    bossDefeated = false;
    score = 0;
    combo = 0;
    // стартовое количество жизней при сбросе: едино для всех режимов
    lives = PLAYER_LIVES;
    invuln = INVULN_TIME;
    bonusShots = 0;
    bonusMode = false;

    playerBulletDir = 'up';
    dirSwitchHeld = false;
    altShootMode = false;
    ctrlHeld = false;

    gameMode = 'normal';
    if (typeof resetLibraryLevelState === 'function') resetLibraryLevelState();
    // selectedChar НЕ сбрасывается здесь — он задаётся при выборе персонажа в меню
    // и сбрасывается только в resetGameStateForMenu()
    o4koHitStreak = 0;
    o4koRandomDropTimer = 0;
    o4koVulnHitCount = 0;
    o4koLivesLost = 0;
    o4koPityHeartUsed = false;

    homePlatform = null;
    bossPlatform = null;
    platform67HitCount = 0;
    platformPlayerLastX = 0;
    platformInactivityTimer = 0;
    platformRuby = null;
    platformCup = null;

    killCount = 0;
    survivalEnemySpeedIncrease = 0;
    survivalBulletSpeedIncrease = 0;
    survivalSpeedUps = 0;
    survivalBulletMultiplier = 1;
    survivalWaveSpawning = false;
    // Состояние фаз для режима `normal`
    normalPhase = 1;
    normalPhaseSpawning = false;
    normalPhaseSpawnTimer = 0;
    normalPhaseSpawnedCount = 0;
    normalPhaseSpawnTotal = 0;
    normalPhaseTarget = 0;
    normalPhaseEffectTimer = 0;
    debugMode = false;

    running = false;
    paused = false;
    levelCompleteShown = false;
    gameOverShown = false;
    last = 0;

    lastHudHtml = '';
    lastHudLives = -1;
    cachedLivesStr = '';

    if (typeof resetNosokLevelState === 'function') resetNosokLevelState();
    if (typeof resetRunnerLevelState === 'function') resetRunnerLevelState();
    if (typeof resetLovlyuLevelState === 'function') resetLovlyuLevelState();
}

/**
 * Полностью сбрасывает runtime-состояние игры к старту из главного меню.
 */
function resetGameStateForMenu() {
    resetGameRuntimeCore();
    if (typeof resetCampaignSessionForMenu === 'function') resetCampaignSessionForMenu();
    gameMode = 'normal';
    selectedChar = 'kuzy';
    if (window.BHAudio) {
        window.BHAudio.setPaused(false);
        window.BHAudio.setMenuActive(true);
    }
}

/**
 * Сбрасывает состояние перед новым запуском режима, сохраняя выбранного персонажа.
 * @param {string} mode - идентификатор режима.
 */
function resetGameStateForRun(mode) {
    resetGameRuntimeCore();
    gameMode = mode || gameMode || 'normal';
}

/**
 * Устанавливает фон текущего уровня.
 * При смене файла фона заранее сбрасывает флаг готовности, чтобы не показывать
 * предыдущую картинку до загрузки новой.
 * @param {string} src - путь к изображению.
 */
function setRunBackground(src) {
    const next = String(src || '');
    const current = String((bgImg && bgImg.src) || '');
    const same = current.endsWith('/' + next) || current.endsWith(next);
    if (!same) bgReady = false;
    bgImg.src = next;
    if (same && bgImg.complete) bgReady = true;
}

/**
 * Инициализирует объекты и параметры конкретного игрового режима.
 * @param {string} mode - идентификатор режима.
 */
function initRunWorldByMode(mode) {
    const startMode = mode || gameMode || 'normal';
    gameMode = startMode;

    player = new Player(selectedChar, selectedSpriteSystem);

    if (startMode === '67') {
        setRunBackground('img/forest2.png');
        const adaptiveScale = ((typeof isMobileAdaptiveCombatMode === 'function')
            && isMobileAdaptiveCombatMode(startMode)
            && (typeof getMobileLandscapeAdaptiveScale === 'function'))
            ? getMobileLandscapeAdaptiveScale()
            : 1;
        player.x = Math.max(8, Math.round(20 * adaptiveScale));
        playerBulletDir = 'right';
        enemy67 = new Enemy67(player.x, player.y);
        if (window.BHBulletPerf) window.BHBulletPerf.setEnemy67RenderMode('tp');
        return;
    }

    if (startMode === 'mode67') {
        setRunBackground('img/forest2.png');
        const adaptiveScale = ((typeof isMobileAdaptiveCombatMode === 'function')
            && isMobileAdaptiveCombatMode(startMode)
            && (typeof getMobileLandscapeAdaptiveScale === 'function'))
            ? getMobileLandscapeAdaptiveScale()
            : 1;
        player.x = Math.max(8, Math.round(20 * adaptiveScale));
        playerBulletDir = 'right';
        enemy67 = new Enemy67(player.x, player.y);
        if (window.BHBulletPerf) window.BHBulletPerf.setEnemy67RenderMode('sheet');
        return;
    }

    if (startMode === 'o4ko') {
        setRunBackground('img/bg-avs.png');
        const adaptiveScale = ((typeof isMobileAdaptiveCombatMode === 'function')
            && isMobileAdaptiveCombatMode(startMode)
            && (typeof getMobileLandscapeAdaptiveScale === 'function'))
            ? getMobileLandscapeAdaptiveScale(startMode)
            : 1;
        player.x = Math.max(8, Math.round(20 * adaptiveScale));
        playerBulletDir = 'right';
        bossO4ko = new BossO4ko(player.x, player.y);
        return;
    }

    if (startMode === 'nosok') {
        setRunBackground('img/bn-bg.png');
        const adaptiveScale = ((typeof isMobileAdaptiveCombatMode === 'function')
            && isMobileAdaptiveCombatMode(startMode)
            && (typeof getMobileLandscapeAdaptiveScale === 'function'))
            ? getMobileLandscapeAdaptiveScale(startMode)
            : 1;
        player.x = Math.max(8, Math.round(20 * adaptiveScale));
        playerBulletDir = 'right';
        initNosokLevel();
        return;
    }

    if (startMode === 'lovlyu') {
        setRunBackground('img/avs-bg.png');
        playerBulletDir = 'up';
        initLovlyuLevel();
        player.y = canvas.height - player.h - 20;
        return;
    }

    if (startMode === 'runner') {
        setRunBackground('img/ud-bg.png');
        playerBulletDir = 'right';
        initRunnerLevel();
        return;
    }

    if (startMode === 'platforms') {
        setRunBackground('img/pl-bg.png');
        playerBulletDir = 'right';
        initPlatformLevel();
        platformPlayerLastX = 0;
        platformInactivityTimer = 0;
        if (homePlatform) {
            player.x = homePlatform.x + (homePlatform.w - player.w) / 2;
            player.y = homePlatform.y - player.h;
            player.onPlatform = true;
            platformPlayerLastX = player.x;
        } else {
            player.y = canvas.height - 40 - player.h - 30;
            player.x = canvas.width / 2 - player.w / 2;
        }
        if (bossPlatform) {
            enemy67 = new Enemy67(player.x, player.y, true);
            platform67HitCount = 0;
        }
        return;
    }

    if (startMode === 'library') {
        setRunBackground('img/lb2-bg.png');
        playerBulletDir = 'right';
        initLibraryLevel();
        player.x = canvas.width / 2 - player.w / 2;
        player.y = canvas.height - player.h - 20;
        return;
    }

    setRunBackground('img/forest.png');
    playerBulletDir = 'up';
    if (gameMode === 'normal') {
        // Стартуем с 1-й фазы (облегчённая)
        normalPhase = 1;
        spawnNormalPhase(1, true);
    } else {
        spawnEnemies();
    }
}

/**
 * Полный запуск игры в указанном режиме.
 * @param {string} mode - идентификатор режима.
 * @param {boolean} startLoop - true, если нужно запустить requestAnimationFrame(loop).
 */
function beginGameRun(mode, startLoop) {
    // Отменяем старый цикл, чтобы не было двойного loop при повторе
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    resetGameStateForRun(mode);
    initRunWorldByMode(gameMode);
    if (window.BHAudio) {
        window.BHAudio.setMode(gameMode);
        window.BHAudio.setMenuActive(false);
        window.BHAudio.setPaused(false);
    }
    levelCompleteShown = false;
    gameOverShown = false;
    running = true;
    paused = false;
    last = performance.now();
    if (startLoop && typeof loop === 'function') {
        requestAnimationFrame(loop);
    }
}

