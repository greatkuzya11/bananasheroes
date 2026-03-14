// ==== ОВЕРЛЕИ / РЕКОРДЫ ====
/**
 * Показывает экран завершения уровня и фиксирует рекорд при необходимости.
 */
let levelIntroStartTimerId = null;
let levelIntroFadeTimerId = null;

/**
 * Возвращает путь к фону уровня для стартовой таблички.
 * @param {string} mode - идентификатор режима.
 * @returns {string}
 */
function getIntroBackgroundForMode(mode) {
    const bgByMode = {
        normal: 'img/forest.png',
        survival: 'img/forest.png',
        '67': 'img/forest2.png',
        mode67: 'img/forest2.png',
        o4ko: 'img/bg-avs.png',
        nosok: 'img/bn-bg.png',
        stepan: 'img/bn-bg.png',
        platforms: 'img/pl-bg.png',
        lovlyu: 'img/avs-bg.png',
        poimal: 'img/avs-bg.png',
        runner: 'img/ud-bg.png',
        bonus: 'img/bg-avs.png',
        tutorial: 'img/bg-avs2.png',
        library: 'img/lb2-bg.png'
    };
    return bgByMode[mode] || 'img/forest.png';
}

/**
 * Ждет готовности фона текущего уровня перед снятием стартовой таблички.
 * Нужно, чтобы при fade-out не мелькал предыдущий кадр/фон.
 * @param {number} [maxWaitMs=2500] - максимальное время ожидания.
 * @returns {Promise<void>}
 */
function waitForBgReadyBeforeIntroFade(maxWaitMs = 2500) {
    return new Promise(resolve => {
        const startTs = performance.now();
        const step = () => {
            if (bgReady) return resolve();
            if (performance.now() - startTs >= maxWaitMs) return resolve();
            requestAnimationFrame(step);
        };
        step();
    });
}

/**
 * Очищает таймеры и удаляет оверлей стартовой карточки уровня.
 */
function clearLevelIntroOverlayState() {
    if (levelIntroStartTimerId) {
        clearTimeout(levelIntroStartTimerId);
        levelIntroStartTimerId = null;
    }
    if (levelIntroFadeTimerId) {
        clearTimeout(levelIntroFadeTimerId);
        levelIntroFadeTimerId = null;
    }
    const existing = document.getElementById('level-intro-overlay');
    if (existing) existing.remove();
}

/**
 * Показывает короткое информационное сообщение по центру экрана.
 * @param {string} text - текст уведомления.
 * @param {number} [durationMs=2200] - длительность показа в миллисекундах.
 * @returns {Promise<void>}
 */
function showTransientInfoNotice(text, durationMs = 2200) {
    return new Promise(resolve => {
        if (!text) {
            resolve();
            return;
        }
        const existing = document.getElementById('transient-info-notice');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'transient-info-notice';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: '2500'
        });

        const box = document.createElement('div');
        box.innerText = text;
        Object.assign(box.style, {
            background: 'rgba(16,22,36,0.94)',
            color: '#fff',
            border: '2px solid rgba(255,255,255,0.35)',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '20px',
            fontWeight: '700',
            boxShadow: '0 10px 26px rgba(0,0,0,0.42)',
            opacity: '0',
            transform: 'translateY(8px)',
            transition: 'opacity 260ms ease, transform 260ms ease'
        });
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            box.style.opacity = '1';
            box.style.transform = 'translateY(0)';
        });

        const fadeAt = Math.max(400, durationMs - 260);
        setTimeout(() => {
            box.style.opacity = '0';
            box.style.transform = 'translateY(-8px)';
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
                resolve();
            }, 280);
        }, fadeAt);
    });
}

/**
 * Запускает выбранный режим через стартовую карточку уровня:
 * 4 секунды показа и плавное исчезновение перед началом игры.
 * @param {string} mode - идентификатор режима.
 * @param {{source?:'menu'|'next'|'retry'|'pause-restart'}} [options] - источник запуска.
 * @returns {Promise<void>}
 */
function startModeWithIntro(mode, options = {}) {
    return new Promise(resolve => {
        const launchMode = mode || 'normal';
        const source = options.source || 'menu';
        let runPrepared = false;

        if (typeof prepareCampaignSessionForStart === 'function') {
            prepareCampaignSessionForStart(launchMode, source);
        }
        if (typeof window.clearGameInputs === 'function') window.clearGameInputs();
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(false);
        }
        clearLevelIntroOverlayState();

        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        running = false;
        paused = false;

        const menuEl = document.getElementById('menu');
        const gameEl = document.getElementById('game');
        if (menuEl) menuEl.style.display = 'none';
        if (gameEl) gameEl.style.display = 'block';
        if (window.BHAudio) {
            window.BHAudio.setMode(launchMode);
            window.BHAudio.setMenuActive(false);
            window.BHAudio.setPaused(false);
        }

        // Подготавливаем новый уровень под оверлеем (без запуска апдейта),
        // чтобы при плавном исчезновении не просвечивал кадр прошлого уровня.
        if (typeof resetGameStateForRun === 'function' && typeof initRunWorldByMode === 'function') {
            resetGameStateForRun(launchMode);
            initRunWorldByMode(gameMode);
            levelCompleteShown = false;
            gameOverShown = false;
            running = false;
            paused = false;
            if (typeof draw === 'function') draw();
            runPrepared = true;
        }

        const intro = (typeof getLevelIntroData === 'function')
            ? getLevelIntroData(launchMode)
            : { title: launchMode, desc: 'Описание уровня в разработке.' };

        const overlay = document.createElement('div');
        overlay.id = 'level-intro-overlay';
        const introBgPath = getIntroBackgroundForMode(launchMode);
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('${introBgPath}')`,
            // Как в самой игре: фон растягивается на весь экран без сохранения пропорций.
            backgroundSize: '100% 100%',
            backgroundPosition: '0 0',
            backgroundRepeat: 'no-repeat',
            zIndex: '2400',
            pointerEvents: 'auto',
            opacity: '1',
            transition: 'opacity 520ms ease'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            minWidth: 'min(680px, 92vw)',
            background: 'rgba(12,18,30,0.94)',
            border: '2px solid rgba(255,255,255,0.28)',
            borderRadius: '14px',
            padding: '24px',
            color: '#fff',
            textAlign: 'center',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)'
        });

        const title = document.createElement('div');
        title.innerText = intro.title;
        Object.assign(title.style, {
            fontSize: '34px',
            fontWeight: '900',
            marginBottom: '10px'
        });

        const desc = document.createElement('div');
        desc.innerText = intro.desc || 'Описание уровня в разработке.';
        Object.assign(desc.style, {
            fontSize: '20px',
            opacity: '0.92',
            lineHeight: '1.4'
        });

        box.appendChild(title);
        box.appendChild(desc);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        if (window.BHAudio) {
            window.BHAudio.playLevelIntro();
        }

        levelIntroStartTimerId = setTimeout(async () => {
            await waitForBgReadyBeforeIntroFade(2500);
            // Важно: после загрузки фона перерисовываем кадр ДО начала fade,
            // иначе просвечивает старый/временный кадр на один момент.
            if (typeof draw === 'function') draw();
            overlay.style.opacity = '0';
            levelIntroFadeTimerId = setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
                levelIntroStartTimerId = null;
                levelIntroFadeTimerId = null;
                if (runPrepared) {
                    running = true;
                    paused = false;
                    last = performance.now();
                    if (typeof loop === 'function') {
                        animFrameId = requestAnimationFrame(loop);
                    }
                } else {
                    beginGameRun(launchMode, true);
                }
                if (typeof window.setGameTouchControlsVisible === 'function') {
                    window.setGameTouchControlsVisible(true);
                }
                resolve();
            }, 540);
        }, 4000);
    });
}
window.startModeWithIntro = startModeWithIntro;

/**
 * Специальный экран завершения для режима "Обучение".
 * Без рекордов и без кнопки "Следующий уровень".
 */
function showTutorialCompleteOverlay() {
    if (typeof window.clearGameInputs === 'function') {
        window.clearGameInputs();
    }
    if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
    if (typeof window.setGameTouchControlsVisible === 'function') {
        window.setGameTouchControlsVisible(false);
    }
    if (window.BHAudio) {
        window.BHAudio.playLevelWin();
        window.BHAudio.setPaused(true);
    }
    paused = true;
    levelCompleteShown = true;
    try {
        if (typeof BHAchievements !== 'undefined' && gameMode === 'tutorial') {
            if (tutorialRunBoss67KilledByBonusFromPrevPhases) {
                BHAchievements.grant('tutorial_saved_for_sweet');
            }
            if (tutorialRunCompletedSuccessfully) {
                BHAchievements.grant('tutorial_good_for_something');
            }
            if (!tutorialRunBonusShotUsed) {
                BHAchievements.grant('tutorial_no_promises');
            }
        }
    } catch (e) { }

    const existing = document.getElementById('level-complete-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'level-complete-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        background: 'rgba(0,0,0,0.20)'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        textAlign: 'center',
        minWidth: '420px'
    });

    const title = document.createElement('div');
    title.innerText = '📖 Обучение пройдено';
    Object.assign(title.style, {
        fontSize: '26px',
        fontWeight: '800',
        color: '#1b5e20',
        marginBottom: '12px'
    });

    const msg = document.createElement('div');
    msg.innerText = 'Теперь открыта вся кампания. Можешь запускать основные уровни. Но лучше сначала зайди в раздел HELP и почитай еще.';
    Object.assign(msg.style, {
        fontSize: '19px',
        marginBottom: '18px',
        color: '#222'
    });

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

    const btnRetry = document.createElement('button');
    btnRetry.innerText = 'Повторить обучение';
    btnRetry.dataset.overlayBtnIdx = '0';
    Object.assign(btnRetry.style, { padding: '8px 14px', fontSize: '16px', cursor: 'pointer' });
    btnRetry.onclick = async () => {
        if (window.BHAudio) window.BHAudio.play('ui_click');
        overlay.remove();
        paused = false;
        if (typeof startModeWithIntro === 'function') {
            await startModeWithIntro('tutorial', { source: 'retry' });
        } else {
            beginGameRun('tutorial', true);
        }
    };

    const btnMain = document.createElement('button');
    btnMain.innerText = 'Главный экран';
    btnMain.dataset.overlayBtnIdx = '1';
    Object.assign(btnMain.style, { padding: '8px 14px', fontSize: '16px', cursor: 'pointer' });
    btnMain.onclick = () => {
        if (window.BHAudio) window.BHAudio.play('ui_click');
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        if (typeof resetGameStateForMenu === 'function') resetGameStateForMenu();
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        overlay.remove();
        paused = false;
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(false);
        }
        if (window.BHAudio) {
            window.BHAudio.setMenuActive(true);
            window.BHAudio.setPaused(false);
        }
        if (typeof refreshModeButtonsByProgress === 'function') {
            refreshModeButtonsByProgress();
        }
        if (typeof window.menuNavFocus === 'function') {
            window.lastGameMode = gameMode;
            window.restoreMenuFocusAfterGame(window.menuNavFocus);
        }
    };

    buttons.appendChild(btnRetry);
    buttons.appendChild(btnMain);
    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    btnRetry.classList.add('menu-kb-focus');
}
window.showTutorialCompleteOverlay = showTutorialCompleteOverlay;

function showLevelComplete() {
    levelCompleteShown = true;
    if (typeof window.clearGameInputs === 'function') {
        window.clearGameInputs();
    }
    if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
    if (typeof window.setGameTouchControlsVisible === 'function') {
        window.setGameTouchControlsVisible(false);
    }
    if (typeof registerCampaignLevelCompletion === 'function') {
        registerCampaignLevelCompletion(gameMode, score);
    }
    if (window.BHAudio) {
        window.BHAudio.playLevelWin();
        window.BHAudio.setPaused(true);
    }
    // Запускаем анимацию levelComplete для Макса
    if (typeof player !== 'undefined' && player && player.spriteSystem === 'max' &&
        typeof player.triggerLevelComplete === 'function') {
        player.triggerLevelComplete();
    }

    // Показываем оверлей; после победы по боссу урон игроку уже не применяется.
    // В режиме "Носок" рекорд считается по минимальному времени, в остальных — по очкам.
    const isNosokVictory = gameMode === 'nosok';
    let isNew = false;
    if (isNosokVictory) {
        const timeKey = getNosokBestTimeKey();
        const prevBest = parseInt(localStorage.getItem(timeKey) || '0', 10) || 0;
        const currentTime = Math.max(1, nosokFinalTimeMs || Math.round(nosokElapsedTime * 1000));
        if (prevBest <= 0 || currentTime < prevBest) {
            localStorage.setItem(timeKey, String(currentTime));
            isNew = true;
        }
    } else {
        const key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_' + (gameMode || 'normal');
        const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        if (score > best) {
            localStorage.setItem(key, String(score));
            isNew = true;
        }
    }
    try {
        if (window.BHGlobalAchievements && typeof window.BHGlobalAchievements.onRunWin === 'function') {
            window.BHGlobalAchievements.onRunWin({
                mode: gameMode,
                selectedChar: selectedChar || 'kuzy',
                noDamage: (typeof runHeartsDamageTaken === 'number') ? (runHeartsDamageTaken === 0) : false,
                isNewRecord: isNew,
                campaignChainSource: window.BHLastRunStartSource || '',
                campaignChainStartIndex: (typeof window.BHChainStartIndex === 'number')
                    ? window.BHChainStartIndex
                    : -1
            });
        }
    } catch (e) { }
    updateBestScoresDisplay();
    if (typeof refreshModeButtonsByProgress === 'function') {
        refreshModeButtonsByProgress();
    }

    // Grant achievements for normal mode
    try {
        if (typeof BHAchievements !== 'undefined' && gameMode === 'normal') {
            // Achievement 1: Букин спасен - for completing the level
            BHAchievements.grant('normal_bukins_saved');
            
            // Achievement 2: complete normal with zero damage taken in the run.
            if (normalRunDamageTaken === 0) {
                BHAchievements.grant('normal_fresh_air');
            }
            
            // Achievement 3: complete normal without collecting any beer bottle pickup.
            if (normalRunBeerCollected === 0) {
                BHAchievements.grant('normal_no_bonus');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === '67') {
            // Achievement 1: last hit on 67 while player is on the right side.
            if (mode67FinalBlowFromRight) {
                BHAchievements.grant('67_right_funeral');
            }
            // Achievement 2: kill 67 before it reaches max size.
            if (!mode67BossReachedMaxSize) {
                BHAchievements.grant('67_early_death');
            }
            // Achievement 3: no enemy bullet is allowed to leave the screen.
            if (!mode67EnemyBulletLeftScreen) {
                BHAchievements.grant('67_no_miss');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'mode67') {
            // Achievement 1: kill boss without taking damage.
            if (mode67RunDamageTaken === 0) {
                BHAchievements.grant('mode67_no_69');
            }
            // Achievement 2: kill boss only after 3 minutes in-level.
            if (mode67RunElapsedSec >= 180) {
                BHAchievements.grant('mode67_forgot_how_to_shoot');
            }
            // Achievement 3: do not intercept boss bullets and do not get hit by them.
            if (!mode67RunBulletRuleBroken && mode67RunEnemyBulletsFired > 0) {
                BHAchievements.grant('mode67_boris_no_hit');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'nosok') {
            const runTimeMs = Math.max(1, nosokFinalTimeMs || Math.round(nosokElapsedTime * 1000));
            // Achievement 1: score all 10 goals within 100 seconds.
            if (runTimeMs <= 100000) {
                BHAchievements.grant('nosok_speed_shooter');
            }
            // Achievement 2: complete 10 goals without a single player shot.
            if (!nosokRunAnyShotFired) {
                BHAchievements.grant('nosok_no_gun_needed');
            }
            // Achievement 3 can be granted later after victory when dynamite explodes the poop-form.
            if (nosokRunPoopExplodedAfterWin) {
                BHAchievements.grant('nosok_purifying_fire');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'lovlyu') {
            const kickTarget = Math.ceil(Math.max(1, lovlyuTotalSpawns || 50) * 0.5);
            // Achievement 1: finish lovlyu without any fallen character touching ground.
            if (!lovlyuRunAnyLanded) {
                BHAchievements.grant('lovlyu_no_butt_pain');
            }
            // Achievement 2: stun at least half of all spawned characters and finish the level.
            if (lovlyuRunStunnedCount >= kickTarget) {
                BHAchievements.grant('lovlyu_magic_kick');
            }
            // Achievement 3: finish lovlyu without picking lightning speed bonus.
            if (!lovlyuRunLightningPicked) {
                BHAchievements.grant('lovlyu_no_energy');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'poimal') {
            // Achievement 1: catch 30 characters in a row without a single miss to the ground.
            if (poimalRunCatchStreak >= 30) {
                BHAchievements.grant('poimal_hands_not_leaky');
            }
            // Achievement 2: 12 consecutive jump-stunned catches in one run.
            if (poimalRunKickStreak >= 12) {
                BHAchievements.grant('poimal_kick_master');
            }
            // Achievement 3: reach 120 points without any jump.
            if (!poimalRunJumped && score >= 120) {
                BHAchievements.grant('poimal_banana_thrust');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'platforms') {
            const bossMaxHp = Math.max(0, platformRunBossMaxHp || 0);
            // Achievement 1: deal more than half of boss HP while player has exactly 1 heart
            // and finish boss with exactly 1 heart.
            if (
                bossMaxHp > 0
                && platformRunDamageAtOneHp > (bossMaxHp * 0.5)
                && platformRunBossKilledAtOneHp
            ) {
                BHAchievements.grant('platforms_last_strength');
            }
            // Achievement 2: never fall off the level into spikes.
            if (!platformRunFellOffLevel) {
                BHAchievements.grant('platforms_not_skewered');
            }
            // Achievement 3: never trigger extra lilac spawns from standing still too long.
            if (!platformRunIdleLilacSpawned) {
                BHAchievements.grant('platforms_no_idle_spawns');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'o4ko') {
            // Achievement 1: collect at least 3 banana bonuses in a successful run.
            if (o4koRunBananaCollectedCount >= 3) {
                BHAchievements.grant('o4ko_three_bananas');
            }
            // Achievement 2: beat the level without a single jump.
            if (!o4koRunJumped) {
                BHAchievements.grant('o4ko_no_jump');
            }
            // Achievement 3: no bonus shots were used (can pick bonuses, but not fire bonus bullets).
            if (!o4koRunBonusShotUsed) {
                BHAchievements.grant('o4ko_no_bonus_use');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'runner') {
            // Achievement 1: catch boss outside the 5-second slowdown window.
            if (runnerRunBossCaught && !runnerRunBossCaughtDuringSlow) {
                BHAchievements.grant('runner_karate_101');
            }
            // Achievement 2: catch boss in less than 25 seconds from run start.
            if (runnerRunBossCaught && runnerRunCatchTimeSec > 0 && runnerRunCatchTimeSec < 25) {
                BHAchievements.grant('runner_too_easy');
            }
            // Achievement 3: complete without using edge-warp teleports.
            if (!runnerRunPlayerUsedEdgeWarp) {
                BHAchievements.grant('runner_no_arcade_magic');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'tutorial') {
            // Achievement 1: kill final boss 67 with a bonus bullet carried into boss phase.
            if (tutorialRunBoss67KilledByBonusFromPrevPhases) {
                BHAchievements.grant('tutorial_saved_for_sweet');
            }
            // Achievement 2: complete tutorial successfully.
            if (tutorialRunCompletedSuccessfully) {
                BHAchievements.grant('tutorial_good_for_something');
            }
            // Achievement 3: finish tutorial without using any bonus shots.
            if (!tutorialRunBonusShotUsed) {
                BHAchievements.grant('tutorial_no_promises');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'library') {
            // Achievement 1: deliver at least 25 books to toilet by player actions and win.
            if (libraryRunToiletBooksByPlayer >= 25) {
                BHAchievements.grant('library_banapocalypse_plumber');
            }
            // Achievement 2: one book touched by player >=10 times and then delivered to toilet.
            if (libraryRunJuggleToiletDone && !libraryRunJuggleToiletFailed) {
                BHAchievements.grant('library_kind_of_goal');
            }
            // Achievement 3: finish level without picking any beer bonus.
            if (!libraryRunBeerPicked) {
                BHAchievements.grant('library_sober_reader');
            }
        }
    } catch (e) { }

    // Если оверлей уже существует, удаляем его перед созданием нового.
    const existing = document.getElementById('level-complete-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'level-complete-overlay';
    const isO4koVictory = gameMode === 'o4ko';
    Object.assign(overlay.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        display: 'flex',
        alignItems: isO4koVictory ? 'flex-start' : 'center',
        justifyContent: 'center',
        paddingTop: isO4koVictory ? '5vh' : '0',
        pointerEvents: 'auto'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
        background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)', textAlign: 'center', minWidth: '380px'
    });

    // Ряд иконок (пиво + бананы)
    const iconsRow = document.createElement('div');
    Object.assign(iconsRow.style, { fontSize: '28px', marginBottom: '12px' });
    const beer = document.createElement('span');
    beer.innerText = '🍺';
    const bananas = document.createElement('span');
    bananas.innerText = '🍌';
    Object.assign(beer.style, { marginRight: '10px', display: 'inline-block' });
    Object.assign(bananas.style, { marginLeft: '10px', display: 'inline-block' });
    iconsRow.appendChild(beer);
    iconsRow.appendChild(bananas);

    const msg = document.createElement('div');
    // Отдельные победные фразы для специальных режимов
    const lovlyuCaught = (gameMode === 'lovlyu') ? Math.floor(score / 10) : 0;
    const victoryTexts = {
        normal: 'Поздравляем, уровень "Сирень и Букин" пройден. Букин освобождён.',
        '67': 'Поздравляю, вы победили телепузика!',
        'mode67': 'Поздравляю, вы победили врага 67!',
        o4ko: 'Поздравляю, вы победили Очко!',
        nosok: `Победа! 10/10 голов за ${formatNosokTime(Math.max(1, nosokFinalTimeMs || Math.round(nosokElapsedTime * 1000)))}`,
        stepan: 'Рекордный матч: забивай голы без ограничений!',
        platforms: 'Поздравляем, уровень "Опять Телепузик" пройден!',
        lovlyu: `Поздравляем, уровень "Ловлю" пройден!\nПоймано: ${lovlyuCaught} Кузей`,
        poimal: 'Рекордный режим "Поймал"!',
        runner: 'Поздравляю, ты научил Дрона курить!',
        library: 'Поздравляем, уровень "Библиотека" пройден!'
    };
    const victoryText = victoryTexts[gameMode] || victoryTexts.normal;
    msg.style.whiteSpace = (gameMode === 'lovlyu') ? 'pre-line' : '';
    msg.innerText = victoryText + (isNew ? ' — Новый рекорд!' : '');
    Object.assign(msg.style, { fontSize: '20px', marginBottom: '18px', color: '#222', opacity: '0', transform: 'translateY(12px)' });

    const campaignSummary = (typeof getCampaignSessionSummary === 'function')
        ? getCampaignSessionSummary()
        : null;
    const showFullRunTotal = (gameMode === 'library' && campaignSummary && campaignSummary.fullRunDone);
    const campaignTotalLine = document.createElement('div');
    if (showFullRunTotal) {
        campaignTotalLine.innerText = `Суммарные очки полного прохождения: ${campaignSummary.totalScore}`;
        Object.assign(campaignTotalLine.style, {
            fontSize: '18px',
            marginBottom: '14px',
            color: '#1a237e',
            fontWeight: '700'
        });
    }

    // Добавляем простые CSS-анимации (появление и подпрыгивание иконок)
    const styleId = 'level-complete-anim-style';
    if (!document.getElementById(styleId)) {
        const styleTag = document.createElement('style');
        styleTag.id = styleId;
        styleTag.innerHTML = `
            @keyframes popIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes bounceIcon { 0% { transform: translateY(-6px); } 50% { transform: translateY(0); } 100% { transform: translateY(-3px); } }
        `;
        document.head.appendChild(styleTag);
    }

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

    const btnRetry = document.createElement('button');
    btnRetry.innerText = 'Повторить';
    btnRetry.dataset.overlayBtnIdx = '0';
    Object.assign(btnRetry.style, { padding: '8px 14px', fontSize: '16px', cursor: 'pointer' });
    btnRetry.onclick = async () => {
        if (window.BHAudio) window.BHAudio.play('ui_click');
        overlay.remove();
        if (typeof startModeWithIntro === 'function') {
            await startModeWithIntro(gameMode, { source: 'retry' });
        } else {
            beginGameRun(gameMode, true);
        }
    };

    const btnMain = document.createElement('button');
    btnMain.innerText = 'Главный экран';
    btnMain.dataset.overlayBtnIdx = '1';
    Object.assign(btnMain.style, { padding: '8px 14px', fontSize: '16px', cursor: 'pointer' });
    // Обработчик клика по кнопке "Главный экран"
    btnMain.onclick = async () => {
        if (window.BHAudio) window.BHAudio.play('ui_click');
        const completedFromMode = gameMode;
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        if (typeof resetGameStateForMenu === 'function') resetGameStateForMenu();
        // Вернуться в меню
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(false);
        }
        overlay.remove();

        if (typeof refreshModeButtonsByProgress === 'function') {
            refreshModeButtonsByProgress();
        }
        if (window.BHAudio) {
            window.BHAudio.setMenuActive(true);
            window.BHAudio.setPaused(false);
        }
        if (typeof window.menuNavFocus === 'function') {
            // Save the last game mode before restoring menu focus
            if (typeof window !== 'undefined') {
                window.lastGameMode = gameMode;
            }
            // Restore keyboard focus to last played mode after character selection
            window.restoreMenuFocusAfterGame(window.menuNavFocus);
        }
        const mode67Text = (typeof consumePendingMode67Notice === 'function') ? consumePendingMode67Notice() : '';
        if (mode67Text) { await showTransientInfoNotice(mode67Text, 2400); }
        const survivalText = (typeof consumePendingSurvivalNotice === 'function')
            ? consumePendingSurvivalNotice()
            : '';
        if (survivalText) {
            await showTransientInfoNotice(survivalText, 2400);
        }
        const poimalText = (typeof consumePendingPoimalNotice === 'function')
            ? consumePendingPoimalNotice()
            : '';
        if (poimalText) {
            await showTransientInfoNotice(poimalText, 2400);
        }
        const stepanText = (typeof consumePendingStepanNotice === 'function')
            ? consumePendingStepanNotice()
            : '';
        if (stepanText) {
            await showTransientInfoNotice(stepanText, 2400);
        }
        const completedText = (typeof consumePendingGameCompletedNotice === 'function')
            ? consumePendingGameCompletedNotice()
            : '';
        if (completedText) {
            await showTransientInfoNotice(completedText, 3000);
            const shouldAutoOpenBonus = (
                completedFromMode === 'library'
                && (typeof isBonusUnlocked === 'function' ? isBonusUnlocked() : true)
            );
            if (shouldAutoOpenBonus) {
                if (typeof startModeWithIntro === 'function') {
                    await startModeWithIntro('bonus', { source: 'next' });
                } else {
                    document.getElementById('menu').style.display = 'none';
                    document.getElementById('game').style.display = 'block';
                    beginGameRun('bonus', true);
                    if (typeof window.setGameTouchControlsVisible === 'function') {
                        window.setGameTouchControlsVisible(true);
                    }
                }
                return;
            }
        }
    };

    const nextCandidate = (typeof CAMPAIGN_LEVEL_ORDER !== 'undefined' && Array.isArray(CAMPAIGN_LEVEL_ORDER))
        ? (() => {
            const idx = CAMPAIGN_LEVEL_ORDER.indexOf(gameMode);
            if (idx < 0 || idx >= CAMPAIGN_LEVEL_ORDER.length - 1) return null;
            return CAMPAIGN_LEVEL_ORDER[idx + 1] || null;
        })()
        : (typeof getNextCampaignMode === 'function' ? getNextCampaignMode(gameMode) : null);
    let nextMode = null;
    let nextLocked = false;
    if (nextCandidate) {
        if (nextCandidate === 'library') {
            const libUnlocked = (typeof isModeUnlockedByProgress === 'function')
                ? isModeUnlockedByProgress('library')
                : false;
            if (libUnlocked) {
                nextMode = 'library';
            } else {
                nextLocked = true;
            }
        } else if (typeof getNextCampaignMode === 'function') {
            nextMode = getNextCampaignMode(gameMode);
            if (!nextMode) nextMode = nextCandidate;
        } else {
            nextMode = nextCandidate;
        }
    }

    const btnNext = document.createElement('button');
    btnNext.innerText = 'Следующий уровень';
    btnNext.dataset.overlayBtnIdx = '2';
    Object.assign(btnNext.style, { padding: '8px 14px', fontSize: '16px', cursor: 'pointer' });

    const libraryTooltipText = (typeof window.LIBRARY_UNLOCK_TOOLTIP === 'string' && window.LIBRARY_UNLOCK_TOOLTIP)
        ? window.LIBRARY_UNLOCK_TOOLTIP
        : 'Для открытия уровня пройди все прошлые уровни кампании и получи достижение "Охотник за трофеями".';
    const showNextLockedTooltip = () => {
        if (window.showFloatingTooltip) {
            window.showFloatingTooltip(btnNext, libraryTooltipText, { maxWidth: 360 });
        }
    };
    const hideNextLockedTooltip = () => {
        if (window.hideFloatingTooltip) {
            window.hideFloatingTooltip();
        }
    };

    if (nextLocked) {
        btnNext.setAttribute('aria-disabled', 'true');
        btnNext.style.opacity = '0.6';
        btnNext.style.cursor = 'not-allowed';
        btnNext.onclick = () => {
            showNextLockedTooltip();
            setTimeout(() => {
                if (window.hideFloatingTooltip) window.hideFloatingTooltip();
            }, 3000);
        };
        btnNext.addEventListener('mouseenter', showNextLockedTooltip);
        btnNext.addEventListener('mouseleave', hideNextLockedTooltip);
        btnNext.addEventListener('focus', showNextLockedTooltip);
        btnNext.addEventListener('blur', hideNextLockedTooltip);
    } else if (nextMode) {
        btnNext.onclick = async () => {
            if (window.BHAudio) window.BHAudio.play('ui_click');
            overlay.remove();
            if (window.hideFloatingTooltip) window.hideFloatingTooltip();
            const mode67Text2 = (typeof consumePendingMode67Notice === 'function') ? consumePendingMode67Notice() : '';
            if (mode67Text2) { await showTransientInfoNotice(mode67Text2, 2400); }
            const survivalText = (typeof consumePendingSurvivalNotice === 'function')
                ? consumePendingSurvivalNotice()
                : '';
            if (survivalText) {
                await showTransientInfoNotice(survivalText, 2400);
            }
            const poimalText = (typeof consumePendingPoimalNotice === 'function')
                ? consumePendingPoimalNotice()
                : '';
            if (poimalText) {
                await showTransientInfoNotice(poimalText, 2400);
            }
            const stepanText = (typeof consumePendingStepanNotice === 'function')
                ? consumePendingStepanNotice()
                : '';
            if (stepanText) {
                await showTransientInfoNotice(stepanText, 2400);
            }
            if (typeof startModeWithIntro === 'function') {
                await startModeWithIntro(nextMode, { source: 'next' });
            } else {
                beginGameRun(nextMode, true);
            }
        };
    }

    buttons.appendChild(btnRetry);
    buttons.appendChild(btnMain);
    if (nextMode || nextLocked) {
        buttons.appendChild(btnNext);
    }

    box.appendChild(iconsRow);
    box.appendChild(msg);
    if (showFullRunTotal) {
        box.appendChild(campaignTotalLine);
    }
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    // Автофокус на первой кнопке (Повторить) для клавиатурной навигации
    btnRetry.classList.add('menu-kb-focus');

    // Запускаем анимации после добавления элементов в DOM
    // Коллбек анимации: запускаем плавное появление текста и иконок
    requestAnimationFrame(() => {
        msg.style.transition = 'opacity 520ms ease-out, transform 520ms ease-out';
        msg.style.opacity = '1';
        msg.style.transform = 'translateY(0)';
        // Небольшое подпрыгивание иконок
        beer.style.animation = 'bounceIcon 900ms ease-in-out 1';
        bananas.style.animation = 'bounceIcon 900ms ease-in-out 1';
    });
}

/**
 * Показывает сообщение о завершении уровня платформ и фиксирует рекорд.
 */
function showLevelCompleteMessage() {
    levelCompleteShown = true;
    if (typeof window.clearGameInputs === 'function') {
        window.clearGameInputs();
    }
    if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
    if (typeof window.setGameTouchControlsVisible === 'function') {
        window.setGameTouchControlsVisible(false);
    }
    if (window.BHAudio) {
        window.BHAudio.playLevelWin();
        window.BHAudio.setPaused(true);
    }

    const isNosokMode = gameMode === 'nosok';
    const isStepanMode = gameMode === 'stepan';
    let key = '';
    let isNew = false;
    if (isStepanMode) {
        key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_stepan';
        const goalsScore = Math.max(0, Math.floor(nosokGoals || 0));
        const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        if (goalsScore > best) {
            localStorage.setItem(key, String(goalsScore));
            isNew = true;
        }
    } else if (!isNosokMode) {
        key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_' + (gameMode || 'normal');
        const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        if (score > best) {
            localStorage.setItem(key, String(score));
            isNew = true;
        }
    }
    updateBestScoresDisplay();

    const existing = document.getElementById('level-complete-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'level-complete-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
        background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)', textAlign: 'center', minWidth: '380px'
    });

    // Ряд иконок
    const iconsRow = document.createElement('div');
    Object.assign(iconsRow.style, { fontSize: '28px', marginBottom: '12px' });
    const cup = document.createElement('span');
    cup.innerText = '🏆';
    const bananas = document.createElement('span');
    bananas.innerText = '🍌';
    Object.assign(cup.style, { marginRight: '10px', display: 'inline-block' });
    Object.assign(bananas.style, { marginLeft: '10px', display: 'inline-block' });
    iconsRow.appendChild(cup);
    iconsRow.appendChild(bananas);

    const msg = document.createElement('div');
    msg.innerText = 'Поздравляем, уровень с платформами пройден' + (isNew ? ' — Новый рекорд!' : '');
    Object.assign(msg.style, { fontSize: '20px', marginBottom: '18px', color: '#222', opacity: '0', transform: 'translateY(12px)' });

    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @keyframes popIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIcon { 0% { transform: translateY(-6px); } 50% { transform: translateY(0); } 100% { transform: translateY(-3px); } }
    `;
    document.head.appendChild(styleTag);

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

    const btnRetryPlatforms = document.createElement('button');
    btnRetryPlatforms.innerText = 'Повторить';
    btnRetryPlatforms.dataset.overlayBtnIdx = '0';
    Object.assign(btnRetryPlatforms.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    btnRetryPlatforms.onclick = () => {
        if (window.BHAudio) window.BHAudio.play('ui_click');
        if (typeof window.clearGameInputs === 'function') window.clearGameInputs();
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        beginGameRun('platforms', true);
        document.getElementById('menu').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        overlay.remove();
        if (typeof window.setGameTouchControlsVisible === 'function') window.setGameTouchControlsVisible(true);
    };

    const btnMain = document.createElement('button');
    btnMain.innerText = 'Главный экран';
    btnMain.dataset.overlayBtnIdx = '1';
    Object.assign(btnMain.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    // Обработчик клика по кнопке "Главный экран"
    btnMain.onclick = () => {
        if (window.BHAudio) window.BHAudio.play('ui_click');
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        if (typeof resetGameStateForMenu === 'function') resetGameStateForMenu();
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        updateBestScoresDisplay();
        if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();
        if (window.BHAudio) {
            window.BHAudio.setMenuActive(true);
            window.BHAudio.setPaused(false);
        }
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(false);
        }
        window.lastGameMode = gameMode;
        window.restoreMenuFocusAfterGame(window.menuNavFocus);
        overlay.remove();
    };

    const btnNextPlatforms = document.createElement('button');
    btnNextPlatforms.innerText = 'Следующий уровень';
    btnNextPlatforms.dataset.overlayBtnIdx = '2';
    btnNextPlatforms.disabled = true;
    Object.assign(btnNextPlatforms.style, { padding: '10px 16px', fontSize: '16px', opacity: '0.6', cursor: 'not-allowed' });

    buttons.appendChild(btnRetryPlatforms);
    buttons.appendChild(btnMain);
    buttons.appendChild(btnNextPlatforms);
    box.appendChild(iconsRow);
    box.appendChild(msg);
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Инициализируем фокус на первой кнопке для навигации с джойстика
    btnRetryPlatforms.classList.add('menu-kb-focus');

    // Коллбек анимации: запускаем плавное появление текста и иконок
    requestAnimationFrame(() => {
        msg.style.transition = 'opacity 520ms ease-out, transform 520ms ease-out';
        msg.style.opacity = '1';
        msg.style.transform = 'translateY(0)';
        cup.style.animation = 'bounceIcon 900ms ease-in-out 1';
        bananas.style.animation = 'bounceIcon 900ms ease-in-out 1';
    });
}
// ==== ОБРАБОТЧИКИ ЗАВЕРШЕНИЯ ИГРЫ ====
const charNames = { max: 'Макс', dron: 'Дрон', kuzy: 'Кузя' };
/**
 * Обновляет блок лучших результатов на экране меню.
 */
function updateBestScoresDisplay() {
    const el = document.getElementById('best-scores');
    if (!el) return;
    const charsList = [
        { id: 'max', name: 'Макс' },
        { id: 'dron', name: 'Дрон' },
        { id: 'kuzy', name: 'Кузя' }
    ];
    const modes = [
        { id: 'normal', name: 'Сирень и Букин' },
        { id: 'survival', name: 'Выживание' },
        { id: '67', name: 'Телепузик' },
        { id: 'o4ko', name: 'Очко' },
        { id: 'nosok', name: 'Носок' },
        { id: 'stepan', name: 'Степан' },
        { id: 'platforms', name: 'Опять Телепузик' },
        { id: 'lovlyu', name: 'Ловлю' },
        { id: 'poimal', name: 'Поймал' },
        { id: 'runner', name: 'Бегун' },
        { id: 'library', name: 'Библиотека' }
    ];

    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
    charsList.forEach(c => {
        html += `<div style="color:#fff; font-size:14px;"><b>${c.name}:</b> `;
        const scores = modes.map(m => {
            if (m.id === 'nosok') {
                const bestTime = parseInt(localStorage.getItem('bh_bestTime_' + c.id + '_nosok') || '0', 10) || 0;
                const shown = bestTime > 0 ? formatNosokTime(bestTime) : '—';
                return `${m.name}: <b>${shown}</b>`;
            }
            const best = parseInt(localStorage.getItem('bh_bestScore_' + c.id + '_' + m.id) || '0', 10) || 0;
            return `${m.name}: <b>${best}</b>`;
        }).join(' | ');
        html += scores + '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    if (typeof refreshModeButtonsByProgress === 'function') {
        refreshModeButtonsByProgress();
    }
}

function showGameOver() {
    if (gameOverShown) return;
    gameOverShown = true;
    running = false;
    if (typeof window.clearGameInputs === 'function') {
        window.clearGameInputs();
    }
    if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
    if (typeof window.setGameTouchControlsVisible === 'function') {
        window.setGameTouchControlsVisible(false);
    }
    if (window.BHAudio) {
        window.BHAudio.playLevelLose();
        window.BHAudio.setPaused(true);
    }

    const isNosokMode = gameMode === 'nosok';
    const isStepanMode = gameMode === 'stepan';
    let key = '';
    let isNew = false;
    if (isStepanMode) {
        key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_stepan';
        const goalsScore = Math.max(0, Math.floor(nosokGoals || 0));
        const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        if (goalsScore > best) {
            localStorage.setItem(key, String(goalsScore));
            isNew = true;
        }
    } else if (!isNosokMode) {
        key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_' + (gameMode || 'normal');
        const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        if (score > best) {
            localStorage.setItem(key, String(score));
            isNew = true;
        }
    }
    if (!window.BHAudio) {
        playGameOverSound(isNew);
    }
    try {
        if (window.BHGlobalAchievements && typeof window.BHGlobalAchievements.onRunLoss === 'function') {
            window.BHGlobalAchievements.onRunLoss({
                mode: gameMode,
                selectedChar: selectedChar || 'kuzy',
                isNewRecord: isNew
            });
        }
    } catch (e) { }
    updateBestScoresDisplay();
    try {
        if (gameMode === 'survival') {
            const survivalScoreTarget = 1000;
            const survivalAttemptsTarget = 20;
            const survivalAttemptsKey = 'bh_survival_death_attempts_v1';
            let survivalAttempts = 0;

            if (typeof BHAchievements !== 'undefined' && score > survivalScoreTarget) {
                // Achievement 1: death with score strictly greater than 1000.
                BHAchievements.grant('survival_four_digits');
            }

            try {
                survivalAttempts = parseInt(localStorage.getItem(survivalAttemptsKey) || '0', 10) || 0;
            } catch (e) {
                survivalAttempts = 0;
            }
            survivalAttempts += 1;
            try {
                localStorage.setItem(survivalAttemptsKey, String(survivalAttempts));
            } catch (e) { }

            if (typeof BHAchievements !== 'undefined' && survivalAttempts >= survivalAttemptsTarget) {
                // Achievement 3: cumulative 20 survival deaths (menu exits are not counted).
                BHAchievements.grant('survival_next_time');
            }
        }
        if (typeof BHAchievements !== 'undefined' && gameMode === 'stepan') {
            if (stepanRunNoMoveShootGoalsStreak >= 11 || stepanRunNoMoveShootAchieved) {
                stepanRunNoMoveShootAchieved = true;
                BHAchievements.grant('stepan_need_cannon');
            }
            if (
                (!stepanRunStationaryRuleBroken && Math.max(0, Math.floor(nosokGoals || 0)) >= 100)
                || stepanRunSotkaInMotionAchieved
            ) {
                stepanRunSotkaInMotionAchieved = true;
                BHAchievements.grant('stepan_hundred_in_motion');
            }
        }
    } catch (e) { }

    const existing = document.getElementById('game-over-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
        background: 'rgba(0,0,0,0.85)', color: '#fff', borderRadius: '12px', padding: '28px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)', textAlign: 'center', minWidth: '420px'
    });

    const iconsRow = document.createElement('div');
    Object.assign(iconsRow.style, { fontSize: '34px', marginBottom: '8px' });
    iconsRow.innerText = '💀  🍌  🍺';

    const title = document.createElement('div');
    title.innerText = 'Game Over';
    Object.assign(title.style, { fontSize: '34px', fontWeight: '700', marginBottom: '12px' });

    const scoreLine = document.createElement('div');
    if (isNosokMode) {
        scoreLine.innerText = `Голы: ${nosokGoals || 0}/10   Время: ${formatNosokTime(Math.round((nosokElapsedTime || 0) * 1000))}`;
    } else if (isStepanMode) {
        scoreLine.innerText = `Голы: ${Math.max(0, Math.floor(nosokGoals || 0))}`;
    } else {
        scoreLine.innerText = `Счёт: ${score}`;
    }
    Object.assign(scoreLine.style, { fontSize: '20px', marginBottom: '6px' });

    const bestLine = document.createElement('div');
    const displayName = (charNames && charNames[selectedChar]) ? charNames[selectedChar] : selectedChar;
    const modeNames = {
        normal: 'Сирень и Букин',
        survival: 'Выживание',
        '67': 'Телепузик',
        mode67: 'Режим 67',
        o4ko: 'Очко',
        nosok: 'Носок',
        stepan: 'Степан',
        platforms: 'Опять Телепузик',
        lovlyu: 'Ловлю',
        poimal: 'Поймал',
        runner: 'Бегун',
        library: 'Библиотека',
        bonus: 'Бонусный уровень'
    };
    const modeName = modeNames[gameMode] || gameMode;
    if (isNosokMode) {
        const bestTime = parseInt(localStorage.getItem('bh_bestTime_' + (selectedChar || 'kuzy') + '_nosok') || '0', 10) || 0;
        bestLine.innerText = `Лучший рекорд (${displayName}, ${modeName}): ${bestTime > 0 ? formatNosokTime(bestTime) : '—'}`;
    } else if (isStepanMode) {
        const bestGoals = parseInt(localStorage.getItem('bh_bestScore_' + (selectedChar || 'kuzy') + '_stepan') || '0', 10) || 0;
        bestLine.innerText = `Лучший рекорд по голам (${displayName}, ${modeName}): ${bestGoals}` + (isNew ? ' — новый личный рекорд!' : '');
    } else {
        const bestVal = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        bestLine.innerText = `Лучший рекорд (${displayName}, ${modeName}): ${bestVal}` + (isNew ? ' — новый личный рекорд!' : '');
    }
    Object.assign(bestLine.style, { fontSize: '16px', marginBottom: '18px', color: isNew ? '#ffd54f' : '#ddd' });

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

    const btnRetry = document.createElement('button');
    btnRetry.innerText = 'Повторить';
    btnRetry.dataset.overlayBtnIdx = '0';
    Object.assign(btnRetry.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    btnRetry.onclick = () => {
        if (window.BHAudio) window.BHAudio.play('ui_click');
        overlay.remove();
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        beginGameRun(gameMode, true);
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(true);
        }
    };

    const btnMain = document.createElement('button');
    btnMain.innerText = 'Главный экран';
    btnMain.dataset.overlayBtnIdx = '1';
    Object.assign(btnMain.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    btnMain.onclick = () => {
        if (window.BHAudio) window.BHAudio.play('ui_click');
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        if (typeof resetGameStateForMenu === 'function') resetGameStateForMenu();
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        updateBestScoresDisplay();
        if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();
        if (window.BHAudio) {
            window.BHAudio.setMenuActive(true);
            window.BHAudio.setPaused(false);
        }
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(false);
        }
        overlay.remove();
        window.lastGameMode = gameMode;
        window.restoreMenuFocusAfterGame(window.menuNavFocus);
    };

    buttons.appendChild(btnRetry);
    buttons.appendChild(btnMain);

    box.appendChild(iconsRow);
    box.appendChild(title);
    box.appendChild(scoreLine);
    box.appendChild(bestLine);
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    btnRetry.classList.add('menu-kb-focus');
}

function playGameOverSound(isNew) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isNew ? 520 : 220, now);
        osc.connect(gain);
        osc.start(now);
        // Короткая огибающая звука
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isNew ? 0.45 : 0.33));
        osc.stop(now + (isNew ? 0.5 : 0.36));
        // Если новый рекорд, играем вторую более высокую ноту
        if (isNew) {
            const osc2 = ctx.createOscillator();
            const g2 = ctx.createGain();
            g2.connect(ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(760, now + 0.12);
            g2.gain.setValueAtTime(0.0001, now + 0.12);
            g2.gain.exponentialRampToValueAtTime(0.18, now + 0.14);
            osc2.connect(g2);
            osc2.start(now + 0.12);
            g2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc2.stop(now + 0.65);
        }
    } catch (e) {
        // Игнорируем ошибки аудио (ограничения браузера)
        console.warn('Audio not available', e);
    }
}




