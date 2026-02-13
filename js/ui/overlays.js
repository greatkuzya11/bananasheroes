// ==== ОВЕРЛЕИ / РЕКОРДЫ ====
/**
 * Показывает экран завершения уровня и фиксирует рекорд при необходимости.
 */
function showLevelComplete() {
    if (typeof window.clearGameInputs === 'function') {
        window.clearGameInputs();
    }
    if (typeof clearScheduledEnemySpawns === 'function') clearScheduledEnemySpawns();
    if (typeof window.setGameTouchControlsVisible === 'function') {
        window.setGameTouchControlsVisible(false);
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
    const victoryText67 = 'Поздравляю, вы победили 67!';
    const victoryTextO4ko = 'Поздравляю, вы победили Очко!';
    const victoryTextNosok = `Победа! 10/10 голов за ${formatNosokTime(Math.max(1, nosokFinalTimeMs || Math.round(nosokElapsedTime * 1000)))}`;
    const victoryTextDefault = 'Поздравляем, уровень пройден. Букин освобождён.';
    const victoryText = (gameMode === '67')
        ? victoryText67
        : (gameMode === 'o4ko') ? victoryTextO4ko
            : (gameMode === 'nosok') ? victoryTextNosok : victoryTextDefault;
    msg.innerText = victoryText + (isNew ? ' — Новый рекорд!' : '');
    Object.assign(msg.style, { fontSize: '20px', marginBottom: '18px', color: '#222', opacity: '0', transform: 'translateY(12px)' });

    // Добавляем простые CSS-анимации (появление и подпрыгивание иконок)
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @keyframes popIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIcon { 0% { transform: translateY(-6px); } 50% { transform: translateY(0); } 100% { transform: translateY(-3px); } }
    `;
    document.head.appendChild(styleTag);

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

    const btnMain = document.createElement('button');
    btnMain.innerText = 'Главный экран';
    Object.assign(btnMain.style, { padding: '8px 14px', fontSize: '16px', cursor: 'pointer' });
    // Обработчик клика по кнопке "Главный экран"
    btnMain.onclick = () => {
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
    };

    const btnNext = document.createElement('button');
    btnNext.innerText = 'Следующий уровень';
    btnNext.disabled = true;
    Object.assign(btnNext.style, { padding: '8px 14px', fontSize: '16px', opacity: '0.6', cursor: 'not-allowed' });

    buttons.appendChild(btnMain);
    buttons.appendChild(btnNext);

    box.appendChild(iconsRow);
    box.appendChild(msg);
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

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

    buttons.appendChild(btnMain);
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
        { id: 'normal', name: 'Обычный' },
        { id: 'survival', name: 'Выживание' },
        { id: '67', name: 'Режим 67' },
        { id: 'o4ko', name: 'Очко' },
        { id: 'nosok', name: 'Носок' },
        { id: 'platforms', name: 'Платформы' }
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
    const modeNames = { 'normal': 'Обычный', 'survival': 'Выживание', '67': 'Режим 67', 'o4ko': 'Очко', 'nosok': 'Носок', 'platforms': 'Платформы' };
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
    Object.assign(btnRetry.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    // Обработчик клика по кнопке "Повторить"
    btnRetry.onclick = () => {
        if (typeof window.clearGameInputs === 'function') {
            window.clearGameInputs();
        }
        beginGameRun(gameMode, true);
        document.getElementById('menu').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        overlay.remove();
        if (typeof window.setGameTouchControlsVisible === 'function') {
            window.setGameTouchControlsVisible(true);
        }
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
        // Показываем выбор персонажа (скрываем выбор режима)
        if (modes) modes.style.display = 'none';
        updateBestScoresDisplay();
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

