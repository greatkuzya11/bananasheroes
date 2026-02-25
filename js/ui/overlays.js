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
        o4ko: 'img/bg-avs.png',
        nosok: 'img/bn-bg.png',
        platforms: 'img/pl-bg.png',
        lovlyu: 'img/avs-bg.png',
        runner: 'img/ud-bg.png',
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

function showLevelComplete() {
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

    // Показываем оверлей, игра может продолжаться; урон отключен после смерти босса.
    // Для режима "Носок" рекорд — минимальное время, для остальных — максимальные очки.
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
    updateBestScoresDisplay();
    if (typeof refreshModeButtonsByProgress === 'function') {
        refreshModeButtonsByProgress();
    }

    // Если уже есть — удалим старое
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
    const victoryTexts = {
        normal: 'Поздравляем, уровень "Сирень и Букин" пройден. Букин освобождён.',
        '67': 'Поздравляю, вы победили 67!',
        o4ko: 'Поздравляю, вы победили Очко!',
        nosok: `Победа! 10/10 голов за ${formatNosokTime(Math.max(1, nosokFinalTimeMs || Math.round(nosokElapsedTime * 1000)))}`,
        platforms: 'Поздравляем, уровень "Платформы" пройден!',
        lovlyu: 'Поздравляем, уровень "Ловлю" пройден!',
        runner: 'Поздравляю, ты научил Дрона курить!',
        library: 'Поздравляем, уровень "Библиотека" пройден!'
    };
    const victoryText = victoryTexts[gameMode] || victoryTexts.normal;
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
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        if (typeof resetGameStateForMenu === 'function') resetGameStateForMenu();
        // Вернуться в меню
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        // Показываем выбор персонажа (скрываем выбор режима)
        if (modes) modes.style.display = 'none';
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(false);
        }
        overlay.remove();

        if (typeof refreshModeButtonsByProgress === 'function') {
            refreshModeButtonsByProgress();
        }
        const survivalText = (typeof consumePendingSurvivalNotice === 'function')
            ? consumePendingSurvivalNotice()
            : '';
        if (survivalText) {
            await showTransientInfoNotice(survivalText, 2400);
        }
        const completedText = (typeof consumePendingGameCompletedNotice === 'function')
            ? consumePendingGameCompletedNotice()
            : '';
        if (completedText) {
            await showTransientInfoNotice(completedText, 3000);
        }
    };

    const nextMode = (typeof getNextCampaignMode === 'function')
        ? getNextCampaignMode(gameMode)
        : null;
    const btnNext = document.createElement('button');
    btnNext.innerText = 'Следующий уровень';
    btnNext.dataset.overlayBtnIdx = '2';
    Object.assign(btnNext.style, { padding: '8px 14px', fontSize: '16px', cursor: 'pointer' });
    if (!nextMode) {
        btnNext.disabled = true;
        btnNext.style.opacity = '0.6';
        btnNext.style.cursor = 'not-allowed';
    } else {
        btnNext.onclick = async () => {
            overlay.remove();
            const survivalText = (typeof consumePendingSurvivalNotice === 'function')
                ? consumePendingSurvivalNotice()
                : '';
            if (survivalText) {
                await showTransientInfoNotice(survivalText, 2400);
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
    if (nextMode) {
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
    if (typeof window.clearGameInputs === 'function') {
        window.clearGameInputs();
    }
    if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
    if (typeof window.setGameTouchControlsVisible === 'function') {
        window.setGameTouchControlsVisible(false);
    }

    const isNosokMode = gameMode === 'nosok';
    let key = '';
    let isNew = false;
    if (!isNosokMode) {
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
    Object.assign(btnRetryPlatforms.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    btnRetryPlatforms.onclick = () => {
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
    Object.assign(btnMain.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    // Обработчик клика по кнопке "Главный экран"
    btnMain.onclick = () => {
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        if (typeof resetGameStateForMenu === 'function') resetGameStateForMenu();
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        updateBestScoresDisplay();
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(false);
        }
        overlay.remove();
    };

    const btnNextPlatforms = document.createElement('button');
    btnNextPlatforms.innerText = 'Следующий уровень';
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
        { id: '67', name: 'Режим 67' },
        { id: 'o4ko', name: 'Очко' },
        { id: 'nosok', name: 'Носок' },
        { id: 'platforms', name: 'Платформы' },
        { id: 'lovlyu', name: 'Ловлю' },
        { id: 'runner', name: 'Бегун' },
        { id: 'library', name: 'Библиотека' }
    ];
    
    let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
    // Проходим по списку персонажей; c — объект персонажа
    charsList.forEach(c => {
        html += `<div style="color:#fff; font-size:14px;"><b>${c.name}:</b> `;
        // Формируем строку рекордов по режимам; m — объект режима
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
/**
 * Показывает экран Game Over и останавливает игру.
 */
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

    const isNosokMode = gameMode === 'nosok';
    let key = '';
    let isNew = false;
    if (!isNosokMode) {
        key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_' + (gameMode || 'normal');
        const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        if (score > best) {
            localStorage.setItem(key, String(score));
            isNew = true;
        }
    }
    updateBestScoresDisplay();

    // Проигрываем звук (без конфетти)
    playGameOverSound(isNew);

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
        scoreLine.innerText = `Голы: ${nosokGoals}/${nosokTargetGoals}   Время: ${formatNosokTime(Math.round(nosokElapsedTime * 1000))}`;
    } else {
        scoreLine.innerText = `Очки: ${score}`;
    }
    Object.assign(scoreLine.style, { fontSize: '20px', marginBottom: '6px' });

    const bestLine = document.createElement('div');
    const displayName = (charNames && charNames[selectedChar]) ? charNames[selectedChar] : selectedChar;
    const modeNames = { 'normal': 'Сирень и Букин', 'survival': 'Выживание', '67': 'Режим 67', 'o4ko': 'Очко', 'nosok': 'Носок', 'platforms': 'Платформы', 'lovlyu': 'Ловлю', 'runner': 'Бегун', 'library': 'Библиотека' };
    const modeName = modeNames[gameMode] || gameMode;
    if (isNosokMode) {
        const bestTime = parseInt(localStorage.getItem('bh_bestTime_' + (selectedChar || 'kuzy') + '_nosok') || '0', 10) || 0;
        bestLine.innerText = `Лучшее время (${displayName}, ${modeName}): ${bestTime > 0 ? formatNosokTime(bestTime) : '—'}`;
    } else {
        const bestVal = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        bestLine.innerText = `Рекорд (${displayName}, ${modeName}): ${bestVal}` + (isNew ? ' — Новый рекорд!' : '');
    }
    Object.assign(bestLine.style, { fontSize: '16px', marginBottom: '18px', color: isNew ? '#ffd54f' : '#ddd' });

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

    const btnRetry = document.createElement('button');
    btnRetry.innerText = 'Повторить';
    btnRetry.dataset.overlayBtnIdx = '0';
    Object.assign(btnRetry.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    // Обработчик клика по кнопке "Повторить"
    btnRetry.onclick = () => {
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
    // Обработчик клика по кнопке "Главный экран"
    btnMain.onclick = () => {
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
        if (typeof resetGameStateForMenu === 'function') resetGameStateForMenu();
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        // Показываем выбор персонажа (скрываем выбор режима)
        if (modes) modes.style.display = 'none';
        updateBestScoresDisplay();
        if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(false);
        }
        overlay.remove();
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
    // Автофокус на первой кнопке (Повторить) для клавиатурной навигации
    btnRetry.classList.add('menu-kb-focus');
}

/**
 * Проигрывает короткий звуковой сигнал завершения игры.
 * @param {boolean} isNew - true, если установлен новый рекорд.
 */
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

