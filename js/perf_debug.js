/**
 * Модуль профилирования: считает время обновления/отрисовки пуль и выводит оверлей.
 */
(function () {
    'use strict';

    const PERF = {
        enabled: false,
        frameCount: 0,
        bulletUpdateMs: 0,
        bulletDrawMs: 0,
        lastReport: 0,
        avg: { fps: 0, bulletUpdate: 0, bulletDraw: 0 },
        updateStart: 0,
        drawStart: 0
    };
    const ACH = {
        lastReport: 0,
        intervalMs: 250,
        lines: ['Achievements: n/a']
    };

    let bulletRenderMode = 'png'; // режим отрисовки пуль: 'emoji' | 'png'
    let bulletRotationEnabled = true;
    let enemy67RenderMode = 'tp'; // 'sheet' | 'tp'
    let enemy67SpriteVariant = 'default'; // 'default' | 'alt'

    const EMOJI_SOURCES = {
        // Пули игрока
        '🌀': 'img/dron_bullet.png',
        '💩': 'img/emoji/1f4a9.png',
        '💦': 'img/emoji/1f4a6.png',
        // Пули врага 67
        '🪳': 'img/emoji/1fab3.png',
        '🧨': 'img/emoji/1f9e8.png',
        '7️⃣': 'img/emoji/0037-fe0f-20e3.png',
        '6️⃣': 'img/emoji/0036-fe0f-20e3.png',
        // Пули врагов (листья)
        '🍃': 'img/emoji/1f343.png',
        '🍂': 'img/emoji/1f342.png',
        '🍁': 'img/emoji/1f341.png',
        '🌿': 'img/emoji/1f33f.png',
        '🌱': 'img/emoji/1f331.png',
        // Бонусы / эффекты
        '🍺': 'img/emoji/1f37a.png',
        '❤️': 'img/emoji/2764-fe0f.png',
        '💥': 'img/emoji/1f4a5.png',
        '🪵': 'img/emoji/1fab5.png',
        // Эмодзи босса
        '🌭': 'img/emoji/1f32d.png'
    };

    const emojiImages = {};
    const emojiReady = {};

    /**
     * Загружает PNG для эмодзи и отмечает готовность.
     * @param {string} emoji - символ эмодзи.
     * @param {string} src - путь к PNG-иконке.
     */
    function loadEmoji(emoji, src) {
        const img = new Image();
        // Отмечаем готовность изображения для данного эмодзи
        // Обработчик загрузки PNG: отмечаем готовность текущего эмодзи
        img.onload = () => { emojiReady[emoji] = true; };
        img.src = src;
        emojiImages[emoji] = img;
    }

    /**
     * Инициирует загрузку всех эмодзи, перечисленных в словаре источников.
     * @param {string} emoji - ключ эмодзи из словаря.
     */
    // Загружаем PNG для каждого эмодзи; emoji — символ эмодзи
    Object.keys(EMOJI_SOURCES).forEach(emoji => {
        loadEmoji(emoji, EMOJI_SOURCES[emoji]);
    });

    /**
     * Возвращает загруженное изображение для эмодзи, если оно готово.
     * @param {string} emoji - символ эмодзи.
     * @returns {HTMLImageElement|null} изображение или null, если еще не готово.
     */
    function getEmojiBitmap(emoji) {
        if (!emoji) return null;
        if (emojiReady[emoji]) return emojiImages[emoji];
        return null;
    }

    /**
     * Сбрасывает накопленную статистику профайлера.
     */
    function resetStats() {
        PERF.frameCount = 0;
        PERF.bulletUpdateMs = 0;
        PERF.bulletDrawMs = 0;
        PERF.lastReport = 0;
        PERF.avg.fps = 0;
        PERF.avg.bulletUpdate = 0;
        PERF.avg.bulletDraw = 0;
        ACH.lastReport = 0;
    }

    /**
     * Обновляет кэш диагностических строк по ачивкам.
     * @param {number} now - текущее время performance.now().
     */
    function updateAchievementsDebug(now) {
        if (!PERF.enabled) return;
        if (ACH.lastReport && (now - ACH.lastReport) < ACH.intervalMs) return;
        ACH.lastReport = now;

        const lines = [];
        const api = window.BHAchievements;
        if (!api || typeof api.has !== 'function') {
            ACH.lines = ['Achievements: API not ready'];
            return;
        }

        const manifest = (api.manifest && typeof api.manifest === 'object') ? api.manifest : {};
        const currentMode = (typeof gameMode === 'string' && gameMode) ? gameMode : 'unknown';
        const ids = Object.keys(manifest).filter(id => {
            const meta = manifest[id] || {};
            return meta.mode === currentMode;
        });
        let unlocked = 0;
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const meta = manifest[id] || {};
            const isUnlocked = !!api.has(id);
            if (isUnlocked) unlocked += 1;
            lines.push(`${isUnlocked ? '[x]' : '[ ]'} ${id} | ${(meta.title || id)}`);
        }

        lines.unshift(`Achievements[${currentMode}]: ${unlocked}/${ids.length}`);

        if (window.BHGlobalAchievements && typeof window.BHGlobalAchievements.getStats === 'function') {
            const gs = window.BHGlobalAchievements.getStats();
            const allIds = Object.keys(manifest);
            const allTotal = Math.max(1, allIds.length);
            let allUnlocked = 0;
            for (let i = 0; i < allIds.length; i++) {
                if (api.has(allIds[i])) allUnlocked += 1;
            }
            const campaignModes = (Array.isArray(window.CAMPAIGN_LEVEL_ORDER) && window.CAMPAIGN_LEVEL_ORDER.length > 0)
                ? window.CAMPAIGN_LEVEL_ORDER.slice()
                : ['normal', '67', 'o4ko', 'nosok', 'platforms', 'lovlyu', 'runner', 'library'];
            let campaignCompleted = 0;
            for (let i = 0; i < campaignModes.length; i++) {
                const mode = campaignModes[i];
                const modeFromStats = gs.campaignWinsByMode && (gs.campaignWinsByMode[mode] > 0);
                let modeFromLs = false;
                try { modeFromLs = localStorage.getItem('bh_level_completed_v1_' + mode) === '1'; } catch (e) { modeFromLs = false; }
                if (modeFromStats || modeFromLs) campaignCompleted += 1;
            }
            const required90 = Math.ceil(allTotal * 0.9);
            const playSec = Math.max(0, (Number(gs.activePlayMs) || 0) / 1000);

            lines.push('--- Global achievements ---');
            lines.push(`global beer picked: ${Math.max(0, Math.floor(gs.beerPicked || 0))}/225`);
            lines.push(`global campaign completed: ${campaignCompleted}/${campaignModes.length}`);
            lines.push(`global wins by char: max=${Math.max(0, Math.floor(gs.campaignWinsByChar?.max || 0))}, dron=${Math.max(0, Math.floor(gs.campaignWinsByChar?.dron || 0))}, kuzy=${Math.max(0, Math.floor(gs.campaignWinsByChar?.kuzy || 0))}`);
            lines.push(`campaignWinStreak: ${Math.max(0, Math.floor(gs.campaignWinStreak || 0))}/5`);
            lines.push(`campaignNoDamageWinStreak: ${Math.max(0, Math.floor(gs.campaignNoDamageWinStreak || 0))}/3`);
            lines.push(`global active time: ${playSec.toFixed(1)}s / 3600.0s`);
            lines.push(`global bonuses picked: ${Math.max(0, Math.floor(gs.bonusPicked || 0))}/500`);
            lines.push(`global personal records: ${Math.max(0, Math.floor(gs.personalRecordsSet || 0))}/10`);
            lines.push(`global unlocked all: ${allUnlocked}/${allTotal} (need 20/39/${required90})`);
            lines.push(`global ach just_for_beer: ${api.has('global_just_for_beer')}`);
            lines.push(`global ach tour_of_bananstvo: ${api.has('global_tour_of_bananstvo')}`);
            lines.push(`global ach all_in_game: ${api.has('global_all_in_game')}`);
            lines.push(`global ach on_streak: ${api.has('global_on_streak')}`);
            lines.push(`global ach unkillable: ${api.has('global_unkillable')}`);
            lines.push(`global ach banana_marathon: ${api.has('global_banana_marathon')}`);
            lines.push(`global ach hoarder: ${api.has('global_hoarder')}`);
            lines.push(`global ach record_on_record: ${api.has('global_record_on_record')}`);
            lines.push(`global ach trophy_hunter_20: ${api.has('global_trophy_hunter_20')}`);
            lines.push(`global ach trophy_hunter_39: ${api.has('global_trophy_hunter_39')}`);
            lines.push(`global ach trophy_hunter_90pct: ${api.has('global_trophy_hunter_90pct')}`);
        }

        if (currentMode === 'normal'
            && typeof normalRunDamageTaken === 'number'
            && typeof normalRunBeerCollected === 'number'
        ) {
            lines.push(`normal damage: ${normalRunDamageTaken}`);
            lines.push(`normal beer pickups: ${normalRunBeerCollected}`);
        }
        if (
            currentMode === 'survival'
            && typeof score === 'number'
            && typeof killCount === 'number'
            && typeof survivalSpeedUps === 'number'
            && typeof survivalEnemySpeedIncrease === 'number'
            && typeof survivalBulletSpeedIncrease === 'number'
            && typeof survivalBulletMultiplier === 'number'
        ) {
            const survivalScoreTarget = 1000;
            const survivalSpeedUpsCap = 10;
            const survivalAttemptsTarget = 20;
            const survivalAttemptsKey = 'bh_survival_death_attempts_v1';
            let survivalAttempts = 0;
            try {
                survivalAttempts = parseInt(localStorage.getItem(survivalAttemptsKey) || '0', 10) || 0;
            } catch (e) {
                survivalAttempts = 0;
            }
            lines.push(`survival score: ${Math.max(0, Math.floor(score || 0))} (> ${survivalScoreTarget})`);
            lines.push(`survival kills: ${Math.max(0, Math.floor(killCount || 0))}`);
            lines.push(`survival speed-ups: ${survivalSpeedUps}/${survivalSpeedUpsCap}`);
            lines.push(`survival enemy speed bonus: ${survivalEnemySpeedIncrease}`);
            lines.push(`survival bullet speed bonus: ${survivalBulletSpeedIncrease}`);
            lines.push(`survival bullet multiplier: ${survivalBulletMultiplier.toFixed(2)}`);
            lines.push(`survival death attempts: ${survivalAttempts}/${survivalAttemptsTarget}`);
            lines.push(`survival ach four_digits: ${score > survivalScoreTarget}`);
            lines.push(`survival ach hardcore: ${survivalSpeedUps >= survivalSpeedUpsCap}`);
            lines.push(`survival ach next_time: ${survivalAttempts >= survivalAttemptsTarget}`);
        }
        if (
            currentMode === '67'
            && typeof mode67FinalBlowFromRight === 'boolean'
            && typeof mode67BossReachedMaxSize === 'boolean'
            && typeof mode67EnemyBulletLeftScreen === 'boolean'
        ) {
            lines.push(`67 final blow right: ${mode67FinalBlowFromRight}`);
            lines.push(`67 reached max size: ${mode67BossReachedMaxSize}`);
            lines.push(`67 bullet left screen: ${mode67EnemyBulletLeftScreen}`);
        }
        if (
            currentMode === 'mode67'
            && typeof mode67RunDamageTaken === 'number'
            && typeof mode67RunElapsedSec === 'number'
            && typeof mode67RunEnemyBulletsFired === 'number'
            && typeof mode67RunBulletRuleBroken === 'boolean'
        ) {
            lines.push(`mode67 damage: ${mode67RunDamageTaken}`);
            lines.push(`mode67 time: ${mode67RunElapsedSec.toFixed(1)}s`);
            lines.push(`mode67 bullets fired: ${mode67RunEnemyBulletsFired}`);
            lines.push(`mode67 bullet rule broken: ${mode67RunBulletRuleBroken}`);
        }
        if (
            currentMode === 'nosok'
            && typeof nosokElapsedTime === 'number'
            && typeof nosokFinalTimeMs === 'number'
            && typeof nosokGoals === 'number'
            && typeof nosokTargetGoals === 'number'
            && typeof nosokRunAnyShotFired === 'boolean'
            && typeof nosokRunPoopExplodedAfterWin === 'boolean'
        ) {
            const runTimeMs = Math.max(1, nosokFinalTimeMs || Math.round(nosokElapsedTime * 1000));
            const speedShooterOk = (nosokGoals >= nosokTargetGoals) && (runTimeMs <= 100000);
            const noGunOk = (nosokGoals >= nosokTargetGoals) && !nosokRunAnyShotFired;
            const purifyingFireOk = !!nosokRunPoopExplodedAfterWin;
            lines.push(`nosok goals: ${nosokGoals}/${nosokTargetGoals}`);
            lines.push(`nosok time: ${(runTimeMs / 1000).toFixed(2)}s`);
            lines.push(`nosok any shot fired: ${nosokRunAnyShotFired}`);
            lines.push(`nosok poop exploded: ${nosokRunPoopExplodedAfterWin}`);
            lines.push(`nosok ach speed_shooter: ${speedShooterOk}`);
            lines.push(`nosok ach no_gun_needed: ${noGunOk}`);
            lines.push(`nosok ach purifying_fire: ${purifyingFireOk}`);
        }
        if (
            currentMode === 'stepan'
            && typeof stepanRunExitWith67FromPause === 'boolean'
            && typeof stepanRunNoMoveShootGoalsStreak === 'number'
            && typeof stepanRunNoMoveShootShotSinceGoal === 'boolean'
            && typeof stepanRunNoMoveShootInvalid === 'boolean'
            && typeof stepanRunNoMoveShootAchieved === 'boolean'
            && typeof stepanRunStationaryTimerSec === 'number'
            && typeof stepanRunStationaryRuleBroken === 'boolean'
            && typeof stepanRunSotkaInMotionAchieved === 'boolean'
            && typeof nosokGoals === 'number'
        ) {
            const goals = Math.max(0, Math.floor(nosokGoals || 0));
            const notWorthyEligible = goals >= 67;
            const needCannonOk = stepanRunNoMoveShootAchieved || stepanRunNoMoveShootGoalsStreak >= 11;
            const hundredInMotionOk = stepanRunSotkaInMotionAchieved || (!stepanRunStationaryRuleBroken && goals >= 100);
            lines.push(`stepan goals: ${goals}`);
            lines.push(`stepan exit>=67 via pause: ${stepanRunExitWith67FromPause}`);
            lines.push(`stepan ach not_worthy eligible: ${notWorthyEligible}`);
            lines.push(`stepan no-move shoot streak: ${stepanRunNoMoveShootGoalsStreak}/11`);
            lines.push(`stepan shot since goal: ${stepanRunNoMoveShootShotSinceGoal}`);
            lines.push(`stepan streak invalid: ${stepanRunNoMoveShootInvalid}`);
            lines.push(`stepan stationary timer: ${stepanRunStationaryTimerSec.toFixed(2)}s`);
            lines.push(`stepan stationary broken: ${stepanRunStationaryRuleBroken}`);
            lines.push(`stepan ach need_cannon: ${needCannonOk}`);
            lines.push(`stepan ach hundred_in_motion: ${hundredInMotionOk}`);
        }
        if (
            currentMode === 'lovlyu'
            && typeof lovlyuRunAnyLanded === 'boolean'
            && typeof lovlyuRunStunnedCount === 'number'
            && typeof lovlyuRunLightningPicked === 'boolean'
            && typeof lovlyuSpawnedCount === 'number'
            && typeof lovlyuTotalSpawns === 'number'
        ) {
            const totalSpawns = Math.max(1, Math.floor(lovlyuTotalSpawns || 1));
            const kickTarget = Math.ceil(totalSpawns * 0.5);
            lines.push(`lovlyu spawned: ${lovlyuSpawnedCount}/${totalSpawns}`);
            lines.push(`lovlyu landed any: ${lovlyuRunAnyLanded}`);
            lines.push(`lovlyu stunned: ${lovlyuRunStunnedCount}/${kickTarget}`);
            lines.push(`lovlyu lightning picked: ${lovlyuRunLightningPicked}`);
            lines.push(`lovlyu ach no_butt_pain: ${!lovlyuRunAnyLanded}`);
            lines.push(`lovlyu ach magic_kick: ${lovlyuRunStunnedCount >= kickTarget}`);
            lines.push(`lovlyu ach no_energy: ${!lovlyuRunLightningPicked}`);
        }
        if (
            currentMode === 'poimal'
            && typeof poimalRunCatchStreak === 'number'
            && typeof poimalRunKickStreak === 'number'
            && typeof poimalRunJumped === 'boolean'
            && typeof poimalRunAnyLanded === 'boolean'
            && typeof score === 'number'
        ) {
            const handsOk = poimalRunCatchStreak >= 30;
            const kickOk = poimalRunKickStreak >= 12;
            const bananaOk = !poimalRunJumped && score >= 120;
            lines.push(`poimal score: ${Math.max(0, Math.floor(score || 0))}/120`);
            lines.push(`poimal catch streak: ${poimalRunCatchStreak}/30`);
            lines.push(`poimal kick streak: ${poimalRunKickStreak}/12`);
            lines.push(`poimal jumped: ${poimalRunJumped}`);
            lines.push(`poimal landed any: ${poimalRunAnyLanded}`);
            lines.push(`poimal ach hands_not_leaky: ${handsOk}`);
            lines.push(`poimal ach kick_master: ${kickOk}`);
            lines.push(`poimal ach banana_thrust: ${bananaOk}`);
        }
        if (
            currentMode === 'platforms'
            && typeof platformRunDamageAtOneHp === 'number'
            && typeof platformRunBossMaxHp === 'number'
            && typeof platformRunBossKilledAtOneHp === 'boolean'
            && typeof platformRunFellOffLevel === 'boolean'
            && typeof platformRunIdleLilacSpawned === 'boolean'
            && typeof platformRunIdleLilacSpawnCount === 'number'
        ) {
            const bossMaxHp = Math.max(0, platformRunBossMaxHp || 0);
            const lastStrengthOk = bossMaxHp > 0
                && platformRunDamageAtOneHp > bossMaxHp * 0.5
                && platformRunBossKilledAtOneHp;
            lines.push(`platforms damage@1hp: ${platformRunDamageAtOneHp}/${bossMaxHp}`);
            lines.push(`platforms killed@1hp: ${platformRunBossKilledAtOneHp}`);
            lines.push(`platforms fell off level: ${platformRunFellOffLevel}`);
            lines.push(`platforms idle lilac spawned: ${platformRunIdleLilacSpawned} (${platformRunIdleLilacSpawnCount})`);
            lines.push(`platforms ach last_strength: ${lastStrengthOk}`);
            lines.push(`platforms ach not_skewered: ${!platformRunFellOffLevel}`);
            lines.push(`platforms ach no_idle_spawns: ${!platformRunIdleLilacSpawned}`);
        }
        if (
            currentMode === 'o4ko'
            && typeof o4koRunBananaCollectedCount === 'number'
            && typeof o4koRunJumped === 'boolean'
            && typeof o4koRunBonusShotUsed === 'boolean'
        ) {
            lines.push(`o4ko bananas picked: ${o4koRunBananaCollectedCount}/3`);
            lines.push(`o4ko jumped: ${o4koRunJumped}`);
            lines.push(`o4ko bonus shot used: ${o4koRunBonusShotUsed}`);
            lines.push(`o4ko ach three_bananas: ${o4koRunBananaCollectedCount >= 3}`);
            lines.push(`o4ko ach no_jump: ${!o4koRunJumped}`);
            lines.push(`o4ko ach no_bonus_use: ${!o4koRunBonusShotUsed}`);
        }
        if (
            currentMode === 'runner'
            && typeof runnerRunElapsedSec === 'number'
            && typeof runnerRunBossCaught === 'boolean'
            && typeof runnerRunBossCaughtDuringSlow === 'boolean'
            && typeof runnerRunCatchTimeSec === 'number'
            && typeof runnerRunPlayerUsedEdgeWarp === 'boolean'
            && typeof runnerRunSlowWindowActivations === 'number'
        ) {
            const karateOk = runnerRunBossCaught && !runnerRunBossCaughtDuringSlow;
            const easyOk = runnerRunBossCaught && runnerRunCatchTimeSec > 0 && runnerRunCatchTimeSec < 25;
            const noMagicOk = !runnerRunPlayerUsedEdgeWarp;
            lines.push(`runner elapsed: ${runnerRunElapsedSec.toFixed(2)}s`);
            lines.push(`runner caught: ${runnerRunBossCaught}`);
            lines.push(`runner catch time: ${runnerRunCatchTimeSec.toFixed(2)}s`);
            lines.push(`runner caught during slow: ${runnerRunBossCaughtDuringSlow}`);
            lines.push(`runner slow windows: ${runnerRunSlowWindowActivations}`);
            lines.push(`runner edge warp used: ${runnerRunPlayerUsedEdgeWarp}`);
            lines.push(`runner ach karate_101: ${karateOk}`);
            lines.push(`runner ach too_easy: ${easyOk}`);
            lines.push(`runner ach no_arcade_magic: ${noMagicOk}`);
        }
        if (
            currentMode === 'tutorial'
            && typeof tutorialRunBonusShotUsed === 'boolean'
            && typeof tutorialRunBossPhaseStarted === 'boolean'
            && typeof tutorialRunBossPhaseEntryBonusShots === 'number'
            && typeof tutorialRunBossPhaseBonusShotsFired === 'number'
            && typeof tutorialRunBoss67Killed === 'boolean'
            && typeof tutorialRunBoss67KilledByBonus === 'boolean'
            && typeof tutorialRunBoss67KilledByBonusFromPrevPhases === 'boolean'
            && typeof tutorialRunCompletedSuccessfully === 'boolean'
        ) {
            lines.push(`tutorial bonus shot used: ${tutorialRunBonusShotUsed}`);
            lines.push(`tutorial boss phase started: ${tutorialRunBossPhaseStarted}`);
            lines.push(`tutorial boss phase entry bonus: ${tutorialRunBossPhaseEntryBonusShots}`);
            lines.push(`tutorial boss phase bonus fired: ${tutorialRunBossPhaseBonusShotsFired}`);
            lines.push(`tutorial boss killed: ${tutorialRunBoss67Killed}`);
            lines.push(`tutorial boss killed by bonus: ${tutorialRunBoss67KilledByBonus}`);
            lines.push(`tutorial boss killed by carried bonus: ${tutorialRunBoss67KilledByBonusFromPrevPhases}`);
            lines.push(`tutorial completed: ${tutorialRunCompletedSuccessfully}`);
            lines.push(`tutorial ach saved_for_sweet: ${tutorialRunBoss67KilledByBonusFromPrevPhases}`);
            lines.push(`tutorial ach good_for_something: ${tutorialRunCompletedSuccessfully}`);
            lines.push(`tutorial ach no_promises: ${!tutorialRunBonusShotUsed}`);
        }
        if (
            currentMode === 'library'
            && typeof libraryRunBeerPicked === 'boolean'
            && typeof libraryRunToiletBooksByPlayer === 'number'
            && typeof libraryRunJuggleToiletDone === 'boolean'
            && typeof libraryRunJuggleToiletFailed === 'boolean'
        ) {
            const toiletTotal = (typeof libraryToiletCaughtBooks === 'number')
                ? Math.max(0, Math.floor(libraryToiletCaughtBooks))
                : '?';
            const plumberOk = libraryRunToiletBooksByPlayer >= 25;
            const kindOfGoalOk = libraryRunJuggleToiletDone && !libraryRunJuggleToiletFailed;
            const soberOk = !libraryRunBeerPicked;
            lines.push(`library toilet total: ${toiletTotal}`);
            lines.push(`library toilet by player: ${libraryRunToiletBooksByPlayer}/25`);
            lines.push(`library juggle done: ${libraryRunJuggleToiletDone}`);
            lines.push(`library juggle failed: ${libraryRunJuggleToiletFailed}`);
            lines.push(`library beer picked: ${libraryRunBeerPicked}`);
            lines.push(`library ach plumber: ${plumberOk}`);
            lines.push(`library ach kind_of_goal: ${kindOfGoalOk}`);
            lines.push(`library ach sober_reader: ${soberOk}`);
        }

        ACH.lines = lines;
    }

    /**
     * Обрабатывает горячие клавиши профайлера.
     * @param {KeyboardEvent} e - событие нажатия клавиши.
     */
    function handleKey(e) {
        const key = (e.key || '').toLowerCase();
        if (key === 'p') {
            PERF.enabled = !PERF.enabled;
            if (PERF.enabled) resetStats();
            return;
        }
        if (key === 'o') {
            bulletRenderMode = (bulletRenderMode === 'emoji') ? 'png' : 'emoji';
            return;
        }
        if (key === 'r') {
            bulletRotationEnabled = !bulletRotationEnabled;
            return;
        }
        if (key === 'g') {
            enemy67RenderMode = (enemy67RenderMode === 'sheet') ? 'tp' : 'sheet';
            return;
        }
        if (key === 'k') {
            enemy67SpriteVariant = (enemy67SpriteVariant === 'default') ? 'alt' : 'default';
        }
    }

    document.addEventListener('keydown', handleKey);

    /**
     * Помечает начало измерения времени обновления пуль.
     */
    function beforeBulletUpdate() {
        if (!PERF.enabled) return;
        PERF.updateStart = performance.now();
    }

    /**
     * Заканчивает измерение времени обновления пуль.
     */
    function afterBulletUpdate() {
        if (!PERF.enabled) return;
        PERF.bulletUpdateMs += performance.now() - PERF.updateStart;
    }

    /**
     * Помечает начало измерения времени отрисовки пуль.
     */
    function beforeBulletDraw() {
        if (!PERF.enabled) return;
        PERF.drawStart = performance.now();
    }

    /**
     * Заканчивает измерение времени отрисовки пуль.
     */
    function afterBulletDraw() {
        if (!PERF.enabled) return;
        PERF.bulletDrawMs += performance.now() - PERF.drawStart;
    }

    /**
     * Рисует оверлей профилирования поверх игрового кадра.
     * @param {CanvasRenderingContext2D} ctx - контекст canvas для отрисовки.
     * @param {number} bulletsCount - текущее количество пуль.
     */
    function drawOverlay(ctx, bulletsCount) {
        if (!PERF.enabled || !ctx) return;
        const now = performance.now();
        updateAchievementsDebug(now);
        if (!PERF.lastReport) PERF.lastReport = now;
        PERF.frameCount++;
        const elapsed = now - PERF.lastReport;
        if (elapsed >= 1000) {
            PERF.avg.fps = (PERF.frameCount * 1000) / elapsed;
            PERF.avg.bulletUpdate = PERF.bulletUpdateMs / PERF.frameCount;
            PERF.avg.bulletDraw = PERF.bulletDrawMs / PERF.frameCount;
            PERF.frameCount = 0;
            PERF.bulletUpdateMs = 0;
            PERF.bulletDrawMs = 0;
            PERF.lastReport = now;
        }

        const count = (typeof bulletsCount === 'number') ? bulletsCount : 0;
        const perfLines = [
            `FPS: ${PERF.avg.fps.toFixed(1)}`,
            `Bullets: ${count}`,
            `Update: ${PERF.avg.bulletUpdate.toFixed(3)} ms`,
            `Draw: ${PERF.avg.bulletDraw.toFixed(3)} ms`,
            `Mode: ${bulletRenderMode} rot:${bulletRotationEnabled ? 'on' : 'off'}`,
            `E67: ${enemy67RenderMode}/${enemy67SpriteVariant}`
        ];
        const allLines = perfLines.concat(ACH.lines);
        const lineH = 14;
        const panelW = Math.max(320, Math.min(860, ((ctx.canvas && ctx.canvas.width) ? (ctx.canvas.width - 20) : 860)));
        const panelH = 20 + (allLines.length * lineH) + 10;
        ctx.save();
        // Сбрасываем трансформации и выравнивание текста после игрового рендера
        if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(10, 10, panelW, panelH);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        for (let i = 0; i < allLines.length; i++) {
            ctx.fillText(allLines[i], 18, 22 + (i * lineH));
        }
        ctx.restore();
    }

    // Публичное API профайлера
    window.BHBulletPerf = {
        // Возвращает, включен ли профайлер
        isEnabled: () => PERF.enabled,
        // Возвращает текущий режим отрисовки пуль
        bulletRenderMode: () => bulletRenderMode,
        // Возвращает, включено ли вращение пуль
        bulletRotationEnabled: () => bulletRotationEnabled,
        // Возвращает режим рендера врага 67
        enemy67RenderMode: () => enemy67RenderMode,
        setEnemy67RenderMode: (m) => { enemy67RenderMode = m; },
        // Возвращает выбранный вариант спрайта врага 67
        enemy67SpriteVariant: () => enemy67SpriteVariant,
        // Возвращает PNG-иконку для эмодзи
        getEmojiBitmap,
        // Хук начала измерения обновления пуль
        beforeBulletUpdate,
        // Хук конца измерения обновления пуль
        afterBulletUpdate,
        // Хук начала измерения отрисовки пуль
        beforeBulletDraw,
        // Хук конца измерения отрисовки пуль
        afterBulletDraw,
        // Рисует оверлей профайлера
        drawOverlay
    };
})();
