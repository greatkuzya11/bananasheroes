// Главная точка входа: инициализация игры после загрузки DOM
/**
 * Главный игровой цикл: обновляет состояние и рисует кадр.
 * @param {number} ts - текущее время (timestamp) от requestAnimationFrame.
 */
function loop(ts) {
    if (!running) return;
    if (!paused) {
        pollGamepad();
        const dt = (ts - last) / 1000;
        last = ts;
        update(dt);
    }
    draw();
    animFrameId = requestAnimationFrame(loop);
}

/**
 * Опрашивает подключённые геймпады и транслирует их состояние в систему ввода.
 * Вызывается каждый кадр до update(). Использует window._bhGpSrc —
 * прокси-объект, устанавливаемый в DOMContentLoaded после инициализации ввода.
 */
function pollGamepad() {
    if (!navigator.getGamepads || !window._bhGpSrc) return;
    const gamepads = navigator.getGamepads();

    // Найти первый подключённый геймпад
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) { gp = gamepads[i]; break; }
    }

    // Нет ни одного геймпада — отпускаем все удерживаемые кнопки
    if (!gp) {
        const toRelease = [];
        window._bhGpSrc.forEach(k => toRelease.push(k));
        toRelease.forEach(k => window._bhGpSrc.releaseKey(k));
        return;
    }

    const DEAD = 0.25;
    const want = new Set();

    // Левый стик X
    const ax0 = gp.axes[0] || 0;
    if (ax0 < -DEAD)  want.add('ArrowLeft');
    if (ax0 >  DEAD)  want.add('ArrowRight');

    // Левый стик Y — прыжок при отклонении вверх
    const ax1 = gp.axes[1] || 0;
    if (ax1 < -DEAD)  want.add('ArrowUp');

    // D-pad (стандартный маппинг: кнопки 12-15)
    if (gp.buttons[12]?.pressed)  want.add('ArrowUp');
    if (gp.buttons[13]?.pressed)  want.add('ArrowDown');
    if (gp.buttons[14]?.pressed)  want.add('ArrowLeft');
    if (gp.buttons[15]?.pressed)  want.add('ArrowRight');

    // Лицевые кнопки
    if (gp.buttons[0]?.pressed)   want.add('ArrowUp');  // A → прыжок
    if (gp.buttons[1]?.pressed)   want.add('Shift');    // B → бонусный режим
    if (gp.buttons[2]?.pressed)   want.add(' ');        // X → огонь
    if (gp.buttons[3]?.pressed)   want.add('Control');  // Y → alt-выстрел
    if (gp.buttons[4]?.pressed)   want.add('ArrowDown');// LB → прицел вниз
    if (gp.buttons[5]?.pressed)   want.add('ArrowDown');// RB → прицел вниз
    if (gp.buttons[9]?.pressed)   want.add('Escape');   // Start → пауза

    // Синхронизируем: отпускаем исчезнувшие, нажимаем новые
    const toRelease = [];
    window._bhGpSrc.forEach(k => { if (!want.has(k)) toRelease.push(k); });
    toRelease.forEach(k => window._bhGpSrc.releaseKey(k));
    want.forEach(k => { if (!window._bhGpSrc.has(k)) window._bhGpSrc.pressKey(k); });
}

/**
 * Инициализирует игру после загрузки DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
    // ==== НАСТРОЙКА КАНВАСА ====
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    const touchControlsEl = document.getElementById('touch-controls');
    const mobileHintEl = document.getElementById('mobile-controls-hint');
    const MOBILE_HINT_SEEN_KEY = 'bh_mobile_controls_hint_seen_v2';
    const TUTORIAL_DONE_KEY = 'bh_tutorial_done_v1';
    // Живая проверка — не кешируем, чтобы DevTools-эмуляция мобильного работала корректно
    const isTouchDevice = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const inputSourceState = {
        keyboard: new Set(),
        touch: new Set(),
        gamepad: new Set()
    };
    const touchPointers = new Map();
    const touchKeyHoldCount = new Map();
    const controlKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Escape", "Shift", "Control"]);
    let mobileHintSeenThisSession = false;
    const audioPlay = (id, opts) => {
        if (window.BHAudio && typeof window.BHAudio.play === 'function') {
            window.BHAudio.play(id, opts);
        }
    };

    /**
     * Возвращает true, если обучение уже пройдено.
     * @returns {boolean}
     */
    function isTutorialDone() {
        try {
            return localStorage.getItem(TUTORIAL_DONE_KEY) === '1';
        } catch (err) {
            return false;
        }
    }

    /**
     * Показывает подсказку о необходимости пройти обучение.
     */
    function showTutorialHint() {
        const existing = document.getElementById('tutorial-lock-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'tutorial-lock-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '3200',
            background: 'rgba(0,0,0,0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            boxSizing: 'border-box'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            width: 'min(620px, 96vw)',
            background: 'rgba(12,18,30,0.96)',
            border: '2px solid rgba(255,255,255,0.30)',
            borderRadius: '12px',
            padding: '18px 16px',
            color: '#fff',
            textAlign: 'center',
            boxShadow: '0 14px 34px rgba(0,0,0,0.45)'
        });

        const title = document.createElement('div');
        title.textContent = '📖 Сначала пройди обучение';
        Object.assign(title.style, {
            fontSize: '26px',
            fontWeight: '900',
            marginBottom: '10px'
        });

        const text = document.createElement('div');
        text.textContent = 'Сначала пройди обучение. Нажми кнопку «📖 Обучение» внизу меню.';
        Object.assign(text.style, {
            fontSize: '18px',
            lineHeight: '1.4',
            opacity: '0.95'
        });

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = 'Закрыть';
        Object.assign(closeBtn.style, {
            marginTop: '14px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: '2px solid rgba(255,255,255,0.35)',
            background: '#ffd54f',
            color: '#000',
            fontWeight: '800',
            cursor: 'pointer'
        });
        closeBtn.onclick = () => overlay.remove();

        box.appendChild(title);
        box.appendChild(text);
        box.appendChild(closeBtn);
        overlay.appendChild(box);
        overlay.addEventListener('click', (ev) => {
            if (ev.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
    }

    /**
     * Проверяет, можно ли запускать выбранный режим (с учетом обязательного туториала).
     * @param {string} mode - идентификатор режима.
     * @returns {boolean}
     */
    function canLaunchMode(mode) {
        if (mode === 'tutorial') return true;
        if (isTutorialDone()) return true;
        showTutorialHint();
        return false;
    }

    /**
     * Синхронизирует общее состояние конкретной клавиши по источникам ввода.
     * @param {string} key - код клавиши.
     */
    function refreshKeyState(key) {
        keys[key] = inputSourceState.keyboard.has(key)
                 || inputSourceState.touch.has(key)
                 || inputSourceState.gamepad.has(key);
    }

    /**
     * Побочные эффекты при нажатии игровой клавиши.
     * @param {string} key - код клавиши.
     */
    function onGameKeyDownLogic(key) {
        if (key === "Escape") {
            if (running && !levelCompleteShown && !gameOverShown) {
                if (paused) {
                    resumeGame();
                } else {
                    pauseGame();
                }
            }
        }
        if (key === "Shift") {
            // Если бонусный режим включен — выключаем, иначе включаем только при наличии бонусных выстрелов.
            if (bonusMode) {
                bonusMode = false;
            } else if (bonusShots > 0) {
                bonusMode = true;
            }
        }
        // Переключение альтернативного режима стрельбы.
        if (key === "Control") {
            if (!ctrlHeld) {
                ctrlHeld = true;
                altShootMode = !altShootMode;
                // При возврате из ALT уходим в обычное направление вверх.
                if (!altShootMode) {
                    playerBulletDir = 'up';
                }
            }
        }
        if (key === "ArrowDown" && !altShootMode) {
            // В обычном режиме одно нажатие циклично меняет направление пули.
            if (!dirSwitchHeld) {
                dirSwitchHeld = true;
                if (playerBulletDir === 'up') {
                    playerBulletDir = 'left';
                    if (player) player.facingDir = 'left';
                } else if (playerBulletDir === 'left') {
                    playerBulletDir = 'right';
                    if (player) player.facingDir = 'right';
                } else {
                    playerBulletDir = 'up';
                }
            }
        }
    }

    /**
     * Побочные эффекты при отпускании игровой клавиши.
     * @param {string} key - код клавиши.
     */
    function onGameKeyUpLogic(key) {
        if (key === 'ArrowDown') dirSwitchHeld = false;
        if (key === 'Control') ctrlHeld = false;
    }

    /**
     * Нажимает клавишу от выбранного источника ввода.
     * @param {string} key - код клавиши.
     * @param {'keyboard'|'touch'} source - источник ввода.
     */
    function pressInputKey(key, source) {
        if (!inputSourceState[source] || inputSourceState[source].has(key)) return;
        const wasDown = !!keys[key];
        inputSourceState[source].add(key);
        refreshKeyState(key);
        if (!wasDown && keys[key]) {
            onGameKeyDownLogic(key);
        }
    }

    /**
     * Отпускает клавишу от выбранного источника ввода.
     * @param {string} key - код клавиши.
     * @param {'keyboard'|'touch'} source - источник ввода.
     */
    function releaseInputKey(key, source) {
        if (!inputSourceState[source] || !inputSourceState[source].has(key)) return;
        const wasDown = !!keys[key];
        inputSourceState[source].delete(key);
        refreshKeyState(key);
        if (wasDown && !keys[key]) {
            onGameKeyUpLogic(key);
        }
    }

    /**
     * Отпускает все клавиши указанного источника ввода.
     * @param {'keyboard'|'touch'} source - источник ввода.
     */
    function clearInputSource(source) {
        const srcSet = inputSourceState[source];
        if (!srcSet) return;
        const keysToRelease = Array.from(srcSet);
        keysToRelease.forEach(k => releaseInputKey(k, source));
    }

    /**
     * Освобождает один активный pointer для удерживаемой экранной кнопки.
     * @param {number} pointerId - идентификатор pointer.
     */
    function releaseTouchPointer(pointerId) {
        const state = touchPointers.get(pointerId);
        if (!state) return;
        touchPointers.delete(pointerId);
        const key = state.key;
        const prevCount = touchKeyHoldCount.get(key) || 0;
        if (prevCount <= 1) {
            touchKeyHoldCount.delete(key);
            releaseInputKey(key, 'touch');
        } else {
            touchKeyHoldCount.set(key, prevCount - 1);
        }
        if (state.btn) {
            state.btn.classList.remove('is-pressed');
            try { state.btn.releasePointerCapture(pointerId); } catch (err) { /* no-op */ }
        }
    }

    /**
     * Отпускает все удерживаемые экранные кнопки и чистит состояния touch-ввода.
     */
    function clearTouchInputs() {
        const pointerIds = Array.from(touchPointers.keys());
        pointerIds.forEach(pid => releaseTouchPointer(pid));
        touchKeyHoldCount.clear();
        clearInputSource('touch');
        if (touchControlsEl) {
            touchControlsEl.querySelectorAll('.touch-btn.is-pressed').forEach(btn => btn.classList.remove('is-pressed'));
        }
    }

    /**
     * Возвращает true, если подсказка мобильного управления уже была показана.
     * @returns {boolean}
     */
    function hasSeenMobileHint() {
        if (mobileHintSeenThisSession) return true;
        try {
            return localStorage.getItem(MOBILE_HINT_SEEN_KEY) === '1';
        } catch (err) {
            return false;
        }
    }

    /**
     * Помечает подсказку мобильного управления как показанную.
     */
    function markMobileHintSeen() {
        mobileHintSeenThisSession = true;
        try {
            localStorage.setItem(MOBILE_HINT_SEEN_KEY, '1');
        } catch (err) {
            // Игнорируем браузеры/режимы без доступа к localStorage.
        }
    }

    /**
     * Скрывает подсказку мобильного управления (legacy — элемент внутри #game).
     */
    function hideMobileControlsHint() {
        if (!mobileHintEl) return;
        mobileHintEl.classList.remove('active');
        mobileHintEl.setAttribute('aria-hidden', 'true');
    }

    /**
     * Подсказка теперь показывается ДО старта уровня через showMobileControlsHintModal().
     * Эта функция оставлена как заглушка для совместимости.
     */
    function maybeShowMobileControlsHint() {
        // Hint is now shown before the level starts — see showMobileControlsHintModal()
    }

    /**
     * Показывает блокирующий модал с обучением управления на мобиле.
     * Вызывается перед стартом первого уровня.
     * @returns {Promise<void>} Резолвится после нажатия «ОК».
     */
    function showMobileControlsHintModal() {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            Object.assign(modal.style, {
                position: 'fixed', inset: '0', zIndex: '3000',
                background: 'rgba(0,0,0,0.82)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px', boxSizing: 'border-box',
                fontFamily: 'Arial, sans-serif'
            });

            const card = document.createElement('div');
            Object.assign(card.style, {
                width: 'min(94vw, 520px)',
                background: 'rgba(15,23,42,0.97)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '16px',
                padding: '18px 16px 14px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                color: '#fff',
                maxHeight: '90svh',
                overflowY: 'auto',
                boxSizing: 'border-box'
            });

            const titleEl = document.createElement('div');
            titleEl.textContent = '📱 Управление на телефоне';
            Object.assign(titleEl.style, {
                fontSize: '17px', fontWeight: '800',
                marginBottom: '12px', textAlign: 'center'
            });
            card.appendChild(titleEl);

            const rows = [
                ['🕹️ Джойстик', 'Движение влево/вправо. В режиме 2D-джойстика: смахни вверх — прыжок.'],
                ['⬆ UP', 'Прыжок (отдельная кнопка, если включена в паузе).'],
                ['FIRE', 'Стрельба — удерживай.'],
                ['BONUS', 'Бонусный режим — нажми (нужны заряды 🍺).'],
                ['ALT', 'Альтернативная стрельба — нажми для переключения.'],
                ['DIR', 'Смена направления пули (←/→/↑). Удерживай в режиме ALT — стрелять вверх.']
            ];
            const table = document.createElement('div');
            Object.assign(table.style, { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 10px', fontSize: '13px', lineHeight: '1.4', marginBottom: '12px' });
            rows.forEach(([key, desc]) => {
                const k = document.createElement('div');
                k.textContent = key;
                Object.assign(k.style, { fontWeight: '700', color: '#ffd54f', whiteSpace: 'nowrap', paddingTop: '1px' });
                const d = document.createElement('div');
                d.textContent = desc;
                d.style.opacity = '0.92';
                table.appendChild(k);
                table.appendChild(d);
            });
            card.appendChild(table);

            const tip = document.createElement('div');
            tip.innerHTML = '⚙️ <b>Настройка кнопок:</b> нажми <b>⏸ Пауза</b> во время игры. Можно перетаскивать блоки кнопок, менять их размер (+/−) и переключать режим прыжка (⬆).';
            Object.assign(tip.style, {
                fontSize: '12px', color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '8px', padding: '8px 10px',
                lineHeight: '1.45', marginBottom: '14px'
            });
            card.appendChild(tip);

            const okBtn = document.createElement('button');
            okBtn.textContent = 'ОК, понял!';
            Object.assign(okBtn.style, {
                display: 'block', width: '100%',
                padding: '12px', fontSize: '16px', fontWeight: '800',
                borderRadius: '10px', border: '2px solid rgba(255,255,255,0.5)',
                background: 'rgba(250,204,21,0.95)', color: '#111',
                cursor: 'pointer', touchAction: 'manipulation'
            });
            okBtn.onclick = () => {
                markMobileHintSeen();
                modal.remove();
                resolve();
            };
            card.appendChild(okBtn);

            modal.appendChild(card);
            document.body.appendChild(modal);
        });
    }

    /**
     * Показывает/скрывает экранные кнопки на мобильных устройствах.
     * @param {boolean} visible - true, если нужно показать блок управления.
     */
    function setTouchControlsVisible(visible) {
        if (!touchControlsEl) return;
        const shouldShow = !!visible && isTouchDevice();
        touchControlsEl.classList.toggle('active', shouldShow);
        touchControlsEl.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        if (!shouldShow) {
            // Сброс inline-стилей drag-режима (z-index, display) при скрытии
            touchControlsEl.style.zIndex = '';
            touchControlsEl.style.display = '';
            clearTouchInputs();
            hideMobileControlsHint();
        } else {
            maybeShowMobileControlsHint();
        }
    }

    /**
     * Инициализирует обработчики экранного управления для touch-устройств.
     */
    function initTouchControls() {
        if (!touchControlsEl) {
            setTouchControlsVisible(false);
            return;
        }

        touchControlsEl.querySelectorAll('.touch-btn').forEach(btn => {
            const key = btn.dataset.key;
            if (!key) return;
            const isHold = btn.dataset.hold === '1';
            const isTap = btn.dataset.tap === '1';

            if (isHold) {
                btn.addEventListener('pointerdown', e => {
                    e.preventDefault();
                    if (touchPointers.has(e.pointerId)) return;
                    touchPointers.set(e.pointerId, { key, btn });
                    const prevCount = touchKeyHoldCount.get(key) || 0;
                    touchKeyHoldCount.set(key, prevCount + 1);
                    if (prevCount === 0) {
                        pressInputKey(key, 'touch');
                    }
                    btn.classList.add('is-pressed');
                    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
                });

                const release = (e) => {
                    e.preventDefault();
                    releaseTouchPointer(e.pointerId);
                };
                btn.addEventListener('pointerup', release);
                btn.addEventListener('pointercancel', release);
                btn.addEventListener('lostpointercapture', release);
            } else if (isTap) {
                btn.addEventListener('pointerdown', e => {
                    e.preventDefault();
                    btn.classList.add('is-pressed');
                    pressInputKey(key, 'touch');
                    releaseInputKey(key, 'touch');
                });
                const releaseTap = (e) => {
                    e.preventDefault();
                    btn.classList.remove('is-pressed');
                };
                btn.addEventListener('pointerup', releaseTap);
                btn.addEventListener('pointercancel', releaseTap);
                btn.addEventListener('pointerleave', releaseTap);
            }
        });

        touchControlsEl.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('blur', () => {
            clearInputSource('keyboard');
            clearInputSource('gamepad');
            clearTouchInputs();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInputSource('keyboard');
                clearInputSource('gamepad');
                clearTouchInputs();
            }
        });

        loadTouchBlockPositions();
        loadTouchBlockScale();
        applyJoyJumpMode(); // show/hide UP block based on saved pref

        // ==== Double-tap modifier block: toggle vertical ↔ horizontal layout ====
        const modBlock = touchControlsEl.querySelector('.touch-block-modifiers');
        if (modBlock) {
            const MOD_LAYOUT_KEY = 'bh_touch_mod_layout_v1';
            // restore saved layout
            if (localStorage.getItem(MOD_LAYOUT_KEY) === 'horizontal') {
                modBlock.classList.add('horizontal');
            }
            let lastTapTime = 0;
            // Shared handler — called from normal listener AND from drag overlay
            modBlock._handleDoubleTap = () => {
                const now = Date.now();
                if (now - lastTapTime < 350) {
                    const isH = modBlock.classList.toggle('horizontal');
                    localStorage.setItem(MOD_LAYOUT_KEY, isH ? 'horizontal' : 'vertical');
                }
                lastTapTime = now;
            };
            // Double-tap works ONLY in pause (via drag overlay's onDown → _handleDoubleTap).
            // No listener during gameplay to avoid accidental triggers.
        }

        // ==== State-indicator polling: update button labels/highlight per game state ====
        let modPollRaf = null;
        const modPollButtons = modBlock ? {
            bonus: modBlock.querySelector('[data-mod="bonus"]'),
            alt:   modBlock.querySelector('[data-mod="alt"]'),
            dir:   modBlock.querySelector('[data-mod="dir"]'),
        } : null;

        function updateModIndicators() {
            if (!modPollButtons) return;
            const { bonus: bBtn, alt: aBtn, dir: dBtn } = modPollButtons;

            // BONUS — yellow when bonusMode is active AND shots remain
            if (bBtn) {
                const bonusOn = typeof bonusMode !== 'undefined' && bonusMode &&
                                typeof bonusShots !== 'undefined' && bonusShots > 0;
                bBtn.classList.toggle('state-on', !!bonusOn);
            }

            // ALT — yellow when altShootMode is on
            if (aBtn) {
                const altOn = typeof altShootMode !== 'undefined' && !!altShootMode;
                aBtn.classList.toggle('state-on', altOn);
            }

            // DIR — shows current direction / alt-shoot-up state
            if (dBtn) {
                const dir = (typeof playerBulletDir !== 'undefined') ? playerBulletDir : 'up';
                const altOn = typeof altShootMode !== 'undefined' && !!altShootMode;
                if (altOn) {
                    // In alt mode: ArrowDown held = shoot up; button stays grey (ready)
                    dBtn.textContent = '↑ALT';
                    dBtn.classList.remove('state-on');
                } else {
                    const icon = dir === 'up' ? '↑' : dir === 'left' ? '←' : '→';
                    dBtn.textContent = icon;
                    dBtn.classList.toggle('state-on', dir !== 'up'); // highlight when non-default dir chosen
                }
            }
        }

        function modIndicatorLoop() {
            updateModIndicators();
            modPollRaf = requestAnimationFrame(modIndicatorLoop);
        }
        modIndicatorLoop();
        // expose stop/start so pauseGame/resumeGame can control it (optional — it's cheap)
        touchControlsEl._stopModPoll = () => { if (modPollRaf) { cancelAnimationFrame(modPollRaf); modPollRaf = null; } };
        touchControlsEl._startModPoll = () => { if (!modPollRaf) modIndicatorLoop(); };

        // ==== Джойстик (LEFT/RIGHT + UP если режим джойстика-прыжка) ====
        const joystick = touchControlsEl.querySelector('.touch-joystick');
        if (joystick) {
            const knob = joystick.querySelector('.touch-joystick-knob');
            const DEAD_X = 14;   // мёртвая зона горизонтальной оси
            const DEAD_Y = 18;   // мёртвая зона вертикальной оси (чуть больше чтоб не случайный прыжок)
            const TRAVEL = 38;
            let joyActive = false, joyCenterX = 0, joyCenterY = 0;
            let joyHKey = null, joyVKey = null;

            const joySetH = (key) => {
                if (joyHKey === key) return;
                if (joyHKey) { releaseInputKey(joyHKey, 'touch'); joystick.classList.remove('active-left', 'active-right'); }
                joyHKey = key;
                if (key) { pressInputKey(key, 'touch'); joystick.classList.add(key === 'ArrowLeft' ? 'active-left' : 'active-right'); }
            };
            const joySetV = (key) => {
                if (joyVKey === key) return;
                if (joyVKey) releaseInputKey(joyVKey, 'touch');
                joyVKey = key;
                if (key) pressInputKey(key, 'touch');
            };
            const joyReleaseAll = () => {
                joySetH(null);
                joySetV(null);
                window._joyAimUp = false;
                if (knob) knob.style.transform = 'translate(-50%, -50%)';
            };

            joystick.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                joyActive = true;
                const r = joystick.getBoundingClientRect();
                joyCenterX = r.left + r.width / 2;
                joyCenterY = r.top  + r.height / 2;
                try { joystick.setPointerCapture(e.pointerId); } catch (_) {}
            }, { passive: false });

            joystick.addEventListener('pointermove', (e) => {
                if (!joyActive) return;
                e.preventDefault();
                const dx = e.clientX - joyCenterX;
                const dy = e.clientY - joyCenterY; // negative = UP
                const tx = Math.max(-TRAVEL, Math.min(TRAVEL, dx));
                const ty = Math.max(-TRAVEL, Math.min(TRAVEL, dy));
                if (knob) knob.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;

                // Horizontal axis
                if (dx < -DEAD_X)      joySetH('ArrowLeft');
                else if (dx > DEAD_X)  joySetH('ArrowRight');
                else                   joySetH(null);

                // Vertical axis: jump only when separate UP button is hidden
                if (!isJoyJumpMode()) {
                    if (dy < -DEAD_Y) joySetV('ArrowUp');
                    else              joySetV(null);
                } else {
                    joySetV(null); // separate button handles jump
                }
                // В alt-режиме стрельбы: джойстик вверх → целиться вверх (без авто-выстрела)
                window._joyAimUp = !!(typeof altShootMode !== 'undefined' && altShootMode && dy < -DEAD_Y);
            }, { passive: false });

            const endJoy = () => { if (!joyActive) return; joyActive = false; joyReleaseAll(); };
            joystick.addEventListener('pointerup',          endJoy);
            joystick.addEventListener('pointercancel',      endJoy);
            joystick.addEventListener('lostpointercapture', endJoy);
        }

        if (mobileHintEl) {
            const closeBtn = mobileHintEl.querySelector('[data-action="close-mobile-hint"]');
            if (closeBtn) {
                closeBtn.addEventListener('click', e => {
                    e.preventDefault();
                    hideMobileControlsHint();
                });
            }
            mobileHintEl.addEventListener('pointerdown', e => {
                if (e.target === mobileHintEl) {
                    hideMobileControlsHint();
                }
            });
        }
    }

    // Экспортируем сервисные функции ввода для оверлеев и экранов завершения.
    window.clearGameInputs = () => {
        clearInputSource('keyboard');
        clearInputSource('gamepad');
        clearTouchInputs();
    };
    // ResizeObserver: держим CSS-переменную --hud-h актуальной,
    // чтобы touch-pad всегда находился выше HUD
    const gameEl = document.getElementById('game');
    const hudEl = document.getElementById('hud');
    if (gameEl && hudEl && typeof ResizeObserver !== 'undefined') {
        const hudObserver = new ResizeObserver(() => {
            gameEl.style.setProperty('--hud-h', hudEl.offsetHeight + 'px');
        });
        hudObserver.observe(hudEl);
    }

    const pauseGameBtnEl = document.getElementById('pause-game-btn');
    function setPauseGameBtnVisible(show) {
        if (!pauseGameBtnEl) return;
        pauseGameBtnEl.classList.toggle('visible', !!show);
    }
    if (pauseGameBtnEl) {
        pauseGameBtnEl.addEventListener('click', () => {
            if (!paused && running) pauseGame();
        });
    }
    window.setGameTouchControlsVisible = (visible) => {
        setTouchControlsVisible(visible);
        setPauseGameBtnVisible(visible);
    };
    
    /**
     * Изменяет размер canvas под размер окна браузера.
     */
    function resizeCanvas() {
        const prevW = canvas.width || window.innerWidth;
        const prevH = canvas.height || window.innerHeight;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Поддержка корректного позиционирования объектов в режиме "Носок" после ресайза.
        if (gameMode === 'nosok' || gameMode === 'stepan') {
            if (typeof setupNosokGoal === 'function') {
                setupNosokGoal();
            }
            if (bossNosok && typeof bossNosok.refreshBounds === 'function') {
                bossNosok.refreshBounds();
            }
            if (nosokBall) {
                const targetR = Math.max(18, Math.round(Math.min(canvas.width, canvas.height) * 0.035));
                const sx = canvas.width / Math.max(1, prevW);
                const sy = canvas.height / Math.max(1, prevH);
                nosokBall.r = targetR;
                nosokBall.x *= sx;
                nosokBall.y *= sy;
                nosokBall.x = Math.max(nosokBall.r, Math.min(canvas.width - nosokBall.r, nosokBall.x));
                const groundPad = Math.max(8, Math.round(canvas.height * 0.033));
                nosokBall.y = Math.max(nosokBall.r, Math.min(canvas.height - groundPad - nosokBall.r, nosokBall.y));
            }
            if (player) {
                player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
                const groundPad = Math.max(8, Math.round(canvas.height * 0.033));
                player.y = Math.min(player.y, canvas.height - player.h - groundPad);
            }
        }
        if (gameMode === 'runner' && typeof onRunnerResize === 'function') {
            onRunnerResize(prevW, prevH);
        }
        if (gameMode === 'bonus' && typeof onBonusResize === 'function') {
            onBonusResize(prevW, prevH);
        }
        if (gameMode === 'tutorial' && typeof onTutorialResize === 'function') {
            onTutorialResize(prevW, prevH);
        }
    }

    const TOUCH_SCALE_KEY = 'bh_touch_scale_v1';
    const TOUCH_JOY_JUMP_KEY = 'bh_touch_joy_jump_v1'; // 'true' = separate UP btn, default = joystick jump

    function isJoyJumpMode() {
        return localStorage.getItem(TOUCH_JOY_JUMP_KEY) === 'true';
    }

    // Shows/hides the separate UP block and saves state
    function applyJoyJumpMode(save) {
        if (!touchControlsEl) return;
        const upBlock = touchControlsEl.querySelector('.touch-block-up');
        const on = isJoyJumpMode();
        if (upBlock) upBlock.style.display = on ? '' : 'none';
    }

    function toggleJoyJumpMode(btn) {
        const next = !isJoyJumpMode();
        localStorage.setItem(TOUCH_JOY_JUMP_KEY, String(next));
        applyJoyJumpMode();
        // update button highlight
        if (btn) Object.assign(btn.style, {
            background: next ? 'rgba(250,204,21,0.88)' : 'rgba(255,255,255,0.2)',
            color: next ? '#111' : '#fff',
            borderColor: next ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
        });
    }

    function getTouchBlocks() {
        if (!touchControlsEl) return [];
        return Array.from(touchControlsEl.querySelectorAll('[data-block-key]'));
    }

    function loadTouchBlockScale() {
        const raw = parseFloat(localStorage.getItem(TOUCH_SCALE_KEY) || '1');
        const s = isNaN(raw) ? 1 : Math.max(0.5, Math.min(2.0, raw));
        getTouchBlocks().forEach(el => { el.style.transform = `scale(${s})`; });
    }

    function changeTouchBlockScale(delta) {
        const cur = parseFloat(localStorage.getItem(TOUCH_SCALE_KEY) || '1') || 1;
        const next = Math.round(Math.max(0.5, Math.min(2.0, cur + delta)) * 10) / 10;
        localStorage.setItem(TOUCH_SCALE_KEY, String(next));
        getTouchBlocks().forEach(el => { el.style.transform = `scale(${next})`; });
    }

    function loadTouchBlockPositions() {
        if (!touchControlsEl) return;
        getTouchBlocks().forEach(el => {
            const key = el.dataset.blockKey;
            if (!key) return;
            try {
                const saved = localStorage.getItem(key);
                if (!saved) return;
                const pos = JSON.parse(saved);
                el.style.left   = pos.left + 'px';
                el.style.top    = pos.top  + 'px';
                el.style.bottom = 'auto';
                el.style.right  = 'auto';
            } catch (e) { /* ignore */ }
        });
    }

    function resetTouchBlockPositions() {
        if (!touchControlsEl) return;
        getTouchBlocks().forEach(el => {
            const key = el.dataset.blockKey;
            if (key) localStorage.removeItem(key);
            el.style.left = ''; el.style.top = ''; el.style.bottom = ''; el.style.right = '';
        });
        localStorage.removeItem(TOUCH_SCALE_KEY);
        getTouchBlocks().forEach(el => { el.style.transform = ''; });
    }

    function enableTouchBlockDragging() {
        if (!touchControlsEl || !isTouchDevice()) return;
        touchControlsEl.style.zIndex = '1050';
        touchControlsEl.style.display = 'block';

        const blocks = getTouchBlocks().map(el => ({ el, key: el.dataset.blockKey })).filter(({ el }) => !!el);

        blocks.forEach(({ el, key }) => {
            el.classList.add('dragging-mode');

            // Создаём прозрачный оверлей точно поверх блока — он перехватывает касания,
            // не трогая pointer-events кнопок (они работают как обычно в игре)
            const overlay = document.createElement('div');
            overlay.className = 'drag-overlay';
            Object.assign(overlay.style, {
                position: 'absolute', inset: '0',
                zIndex: '1', cursor: 'grab',
                touchAction: 'none', borderRadius: 'inherit',
                pointerEvents: 'auto'
            });
            el.appendChild(overlay);
            el._dragOverlay = overlay;

            let dragging = false, startPX, startPY, startLeft, startTop;
            const DRAG_THRESHOLD = 6;

            const onDown = (e) => {
                e.stopPropagation(); // не давать всплывать к собственным обработчикам блока (джойстик)
                // Двойной тап на блоке модификаторов переключает layout (даже через overlay)
                if (el._handleDoubleTap) el._handleDoubleTap();
                const cr = touchControlsEl.getBoundingClientRect();
                const br = el.getBoundingClientRect();
                const computedLeft = br.left - cr.left;
                const computedTop  = br.top  - cr.top;
                el.style.left   = computedLeft + 'px';
                el.style.top    = computedTop  + 'px';
                el.style.bottom = 'auto';
                el.style.right  = 'auto';
                dragging  = true;
                startPX   = e.clientX;
                startPY   = e.clientY;
                startLeft = computedLeft;
                startTop  = computedTop;
                overlay.style.cursor = 'grabbing';
                try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
                e.preventDefault();
            };
            const onMove = (e) => {
                if (!dragging) return;
                const dx = e.clientX - startPX;
                const dy = e.clientY - startPY;
                if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
                const cr = touchControlsEl.getBoundingClientRect();
                el.style.left = Math.max(0, Math.min(cr.width  - el.offsetWidth,  startLeft + dx)) + 'px';
                el.style.top  = Math.max(0, Math.min(cr.height - el.offsetHeight, startTop  + dy)) + 'px';
                e.preventDefault();
            };
            const onUp = () => {
                if (!dragging) return;
                dragging = false;
                overlay.style.cursor = 'grab';
                localStorage.setItem(key, JSON.stringify({
                    left: parseFloat(el.style.left),
                    top:  parseFloat(el.style.top)
                }));
            };

            overlay._dragHandlers = { onDown, onMove, onUp };
            overlay.addEventListener('pointerdown',   onDown, { passive: false });
            overlay.addEventListener('pointermove',   onMove, { passive: false });
            overlay.addEventListener('pointerup',     onUp);
            overlay.addEventListener('pointercancel', onUp);
        });
    }

    function disableTouchBlockDragging() {
        if (!touchControlsEl) return;
        touchControlsEl.style.zIndex = '';
        touchControlsEl.style.display = '';

        const blocks = getTouchBlocks();

        blocks.forEach(el => {
            el.classList.remove('dragging-mode');
            if (el._dragOverlay) {
                const ov = el._dragOverlay;
                if (ov._dragHandlers) {
                    const { onDown, onMove, onUp } = ov._dragHandlers;
                    ov.removeEventListener('pointerdown',   onDown);
                    ov.removeEventListener('pointermove',   onMove);
                    ov.removeEventListener('pointerup',     onUp);
                    ov.removeEventListener('pointercancel', onUp);
                }
                ov.remove();
                delete el._dragOverlay;
            }
        });
    }

    // ──────────────────────────────────────────────
    /**
     * Показывает меню паузы.
     */
    function pauseGame() {
        paused = true;
        if (window.BHAudio) {
            window.BHAudio.setPaused(true);
            audioPlay('ui_pause');
        }
        setPauseGameBtnVisible(false);
        // На тач-устройствах скрываем touch-controls только если НЕ тач
        if (isTouchDevice()) {
            enableTouchBlockDragging();
        } else {
            setTouchControlsVisible(false);
        }
        const overlay = document.createElement('div');
        overlay.id = 'pauseOverlay';
        Object.assign(overlay.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            zIndex: 1000
        });

        const isMob = isTouchDevice();
        // Относительные размеры — используются для всех элементов оверлея паузы
        const titleFs = isMob ? 'clamp(20px, 5vw, 30px)'  : 'clamp(36px, 5vw, 48px)';
        const titleMB = isMob ? 'min(2vh, 14px)'           : 'min(4vh, 30px)';
        const btnFs   = isMob ? 'clamp(13px, 3.5vw, 17px)' : 'clamp(18px, 2.5vw, 24px)';
        const btnPad  = isMob ? 'clamp(7px, 1.5vw, 11px)'  : 'clamp(11px, 1.5vh, 15px)';
        const btnMB   = isMob ? 'min(1.2vh, 8px)'           : 'min(1.6vh, 12px)';
        const btnW    = isMob ? 'min(58vw, 220px)'          : 'min(42vw, 300px)';

        const title = document.createElement('div');
        title.innerHTML = '⏸️ ПАУЗА ⏸️';
        title.style.fontSize = titleFs;
        title.style.marginBottom = titleMB;
        title.style.fontWeight = 'bold';
        overlay.appendChild(title);

        const btnResume = document.createElement('button');
        btnResume.innerText = '▶️ Продолжить';
        btnResume.dataset.pauseIdx = '0';
        Object.assign(btnResume.style, { 
            padding: btnPad, 
            fontSize: btnFs, 
            cursor: 'pointer', 
            marginBottom: btnMB,
            borderRadius: '10px',
            background: '#ffcc00',
            border: '3px solid transparent',
            transition: 'all 0.2s ease',
            color: '#000',
            minWidth: btnW
        });
        // Обработчик наведения на кнопку "Продолжить"
        btnResume.onmouseover = () => {
            btnResume.style.transform = 'scale(1.05)';
            btnResume.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        // Обработчик ухода курсора с кнопки "Продолжить"
        btnResume.onmouseout = () => {
            btnResume.style.transform = 'scale(1)';
            btnResume.style.boxShadow = 'none';
        };
        // Обработчик нажатия кнопки "Продолжить"
        btnResume.onmousedown = () => {
            btnResume.style.transform = 'scale(0.95)';
        };
        // Обработчик отпускания кнопки "Продолжить"
        btnResume.onmouseup = () => {
            btnResume.style.transform = 'scale(1.05)';
        };
        // Обработчик клика по кнопке "Продолжить"
        btnResume.onclick = () => {
            audioPlay('ui_click');
            resumeGame();
        };
        overlay.appendChild(btnResume);

        const btnRestart = document.createElement('button');
        btnRestart.innerText = '🔄 Начать заново';
        btnRestart.dataset.pauseIdx = '1';
        Object.assign(btnRestart.style, { 
            padding: btnPad, 
            fontSize: btnFs, 
            cursor: 'pointer', 
            marginBottom: btnMB,
            borderRadius: '10px',
            background: '#ffcc00',
            border: '3px solid transparent',
            transition: 'all 0.2s ease',
            color: '#000',
            minWidth: btnW
        });
        // Обработчик наведения на кнопку "Начать заново"
        btnRestart.onmouseover = () => {
            btnRestart.style.transform = 'scale(1.05)';
            btnRestart.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        // Обработчик ухода курсора с кнопки "Начать заново"
        btnRestart.onmouseout = () => {
            btnRestart.style.transform = 'scale(1)';
            btnRestart.style.boxShadow = 'none';
        };
        // Обработчик нажатия кнопки "Начать заново"
        btnRestart.onmousedown = () => {
            btnRestart.style.transform = 'scale(0.95)';
        };
        // Обработчик отпускания кнопки "Начать заново"
        btnRestart.onmouseup = () => {
            btnRestart.style.transform = 'scale(1.05)';
        };
        // Обработчик клика по кнопке "Начать заново"
        btnRestart.onclick = () => {
            audioPlay('ui_click');
            disableTouchBlockDragging();
            const pauseOverlay = document.getElementById('pauseOverlay');
            if (pauseOverlay) pauseOverlay.remove();
            paused = false;
            clearInputSource('keyboard');
            clearInputSource('gamepad');
            clearTouchInputs();
            beginGameRun(gameMode, true);
            setTouchControlsVisible(true);
            setPauseGameBtnVisible(true);
        };
        overlay.appendChild(btnRestart);

        const btnMain = document.createElement('button');
        btnMain.innerText = '🏠 Главный экран';
        btnMain.dataset.pauseIdx = '2';
        Object.assign(btnMain.style, { 
            padding: btnPad, 
            fontSize: btnFs, 
            cursor: 'pointer',
            borderRadius: '10px',
            background: '#ffcc00',
            border: '3px solid transparent',
            transition: 'all 0.2s ease',
            color: '#000',
            minWidth: btnW
        });
        // Обработчик наведения на кнопку "Главный экран"
        btnMain.onmouseover = () => {
            btnMain.style.transform = 'scale(1.05)';
            btnMain.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        // Обработчик ухода курсора с кнопки "Главный экран"
        btnMain.onmouseout = () => {
            btnMain.style.transform = 'scale(1)';
            btnMain.style.boxShadow = 'none';
        };
        // Обработчик нажатия кнопки "Главный экран"
        btnMain.onmousedown = () => {
            btnMain.style.transform = 'scale(0.95)';
        };
        // Обработчик отпускания кнопки "Главный экран"
        btnMain.onmouseup = () => {
            btnMain.style.transform = 'scale(1.05)';
        };
        // Обработчик клика по кнопке "Главный экран"
        btnMain.onclick = () => {
            audioPlay('ui_click');
            disableTouchBlockDragging();
            const pauseOverlay = document.getElementById('pauseOverlay');
            if (pauseOverlay) pauseOverlay.remove();
            paused = false;
            clearInputSource('keyboard');
            clearInputSource('gamepad');
            clearTouchInputs();
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
            setTouchControlsVisible(false);
            menuNavFocus('char', 0);
        };
        overlay.appendChild(btnMain);

        // На тач: показываем подсказку и кнопку сброса позиций
        if (isTouchDevice()) {
            const dragHint = document.createElement('div');
            dragHint.textContent = '✥ Перетащите блоки управления для смены позиции';
            Object.assign(dragHint.style, {
                marginTop: '18px', fontSize: '13px', color: 'rgba(255,255,255,0.6)',
                textAlign: 'center', maxWidth: '300px'
            });
            overlay.appendChild(dragHint);

            const scaleRow = document.createElement('div');
            Object.assign(scaleRow.style, {
                marginTop: 'min(1.5vh, 10px)', display: 'flex', alignItems: 'center', gap: '6px'
            });
            const mkScaleBtn = (lbl) => {
                const b = document.createElement('button');
                b.textContent = lbl;
                Object.assign(b.style, {
                    width: 'min(10vw, 40px)', height: 'min(10vw, 40px)', fontSize: 'min(5.5vw, 22px)', lineHeight: '1',
                    cursor: 'pointer', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.45)', color: '#fff',
                    fontWeight: '700', flexShrink: '0'
                });
                return b;
            };

            // Toggle: separate UP button vs joystick-jump
            const btnJoyJump = mkScaleBtn('⬆');
            btnJoyJump.title = 'Отдельная кнопка прыжка (вкл) / Прыжок джойстиком (выкл)';
            const refreshJoyJumpBtn = () => {
                const on = isJoyJumpMode();
                Object.assign(btnJoyJump.style, {
                    background: on ? 'rgba(250,204,21,0.88)' : 'rgba(255,255,255,0.2)',
                    color: on ? '#111' : '#fff',
                    borderColor: on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                });
            };
            refreshJoyJumpBtn();
            const joyJumpDesc = document.createElement('div');
            Object.assign(joyJumpDesc.style, {
                fontSize: 'clamp(10px, 2.6vw, 12px)', color: 'rgba(255,255,255,0.55)',
                textAlign: 'left', width: btnW, boxSizing: 'border-box', lineHeight: '1.4'
            });
            const updateJoyJumpDesc = () => {
                joyJumpDesc.textContent = isJoyJumpMode()
                    ? '⬆ жёлтая — отдельная кнопка прыжка включена'
                    : '⬆ серая — прыжок джойстиком вверх (без отрыва пальца)';
            };
            updateJoyJumpDesc();
            btnJoyJump.onclick = () => { toggleJoyJumpMode(null); refreshJoyJumpBtn(); updateJoyJumpDesc(); };

            const btnScaleMinus = mkScaleBtn('−');
            btnScaleMinus.title = 'Уменьшить кнопки';
            btnScaleMinus.onclick = () => changeTouchBlockScale(-0.1);

            const btnReset = document.createElement('button');
            btnReset.innerText = '↺ Сбросить позиции кнопок';
            Object.assign(btnReset.style, {
                padding: 'clamp(6px, 1.5vw, 9px) clamp(5px, 1.8vw, 10px)',
                fontSize: 'clamp(10px, 2.8vw, 13px)', cursor: 'pointer',
                borderRadius: '8px', background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.35)', color: '#fff',
                width: btnW, flexShrink: '0', boxSizing: 'border-box', textAlign: 'center'
            });
            btnReset.onclick = () => resetTouchBlockPositions();

            const btnScalePlus = mkScaleBtn('+');
            btnScalePlus.title = 'Увеличить кнопки';
            btnScalePlus.onclick = () => changeTouchBlockScale(+0.1);

            const btnAudio = mkScaleBtn('🔊');
            btnAudio.title = 'Включить/выключить звук';
            const refreshAudioBtn = () => {
                const enabled = !(window.BHAudio && typeof window.BHAudio.isEnabled === 'function')
                    ? true : !!window.BHAudio.isEnabled();
                btnAudio.textContent = enabled ? '🔊' : '🔇';
                Object.assign(btnAudio.style, {
                    background: enabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,80,80,0.35)',
                    borderColor: enabled ? 'rgba(255,255,255,0.45)' : 'rgba(255,120,120,0.7)',
                    color: '#fff'
                });
            };
            refreshAudioBtn();
            btnAudio.onclick = () => {
                if (!window.BHAudio || typeof window.BHAudio.setEnabled !== 'function') return;
                const wasEnabled = typeof window.BHAudio.isEnabled === 'function' ? !!window.BHAudio.isEnabled() : true;
                if (wasEnabled) audioPlay('ui_click');
                window.BHAudio.setEnabled(!wasEnabled);
                if (!wasEnabled) audioPlay('ui_confirm');
                refreshAudioBtn();
                // Sync the menu audio button label too
                if (typeof updateAudioToggleButtonLabel === 'function') updateAudioToggleButtonLabel();
            };

            scaleRow.appendChild(btnJoyJump);
            scaleRow.appendChild(btnScaleMinus);
            scaleRow.appendChild(btnReset);
            scaleRow.appendChild(btnScalePlus);
            scaleRow.appendChild(btnAudio);
            overlay.appendChild(scaleRow);
            overlay.appendChild(joyJumpDesc);
        }

        document.body.appendChild(overlay);
        // Автофокус на первой кнопке паузы для клавиатурной навигации
        const firstPauseBtn = overlay.querySelector('button[data-pause-idx]');
        if (firstPauseBtn) firstPauseBtn.classList.add('menu-kb-focus');
    }

    /**
     * Возобновляет игру после паузы.
     */
    function resumeGame() {
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.remove();
        }
        paused = false;
        clearInputSource('keyboard');
        clearInputSource('gamepad');
        disableTouchBlockDragging();
        if (window.BHAudio) {
            window.BHAudio.setPaused(false);
            audioPlay('ui_resume');
        }
        last = performance.now(); // сбрасываем время чтобы не было скачка
        if (running) {
            setTouchControlsVisible(true);
            setPauseGameBtnVisible(true);
        }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    initTouchControls();
    setTouchControlsVisible(false);

    // ==== GAMEPAD ====
    // Прокси-объект для удобной работы с источником 'gamepad' из pollGamepad()
    window._bhGpSrc = {
        has:  (k) => inputSourceState.gamepad.has(k),
        pressKey:   (k) => pressInputKey(k, 'gamepad'),
        releaseKey: (k) => releaseInputKey(k, 'gamepad'),
        forEach: (cb) => inputSourceState.gamepad.forEach(cb)
    };

    window.addEventListener('gamepadconnected', (e) => {
        // Коротко уведомляем игрока (только если игра не запущена или на паузе)
        if (!running || paused) return;
        if (typeof showTransientInfoNotice === 'function') {
            showTransientInfoNotice('🎮 Геймпад подключён: ' + (e.gamepad.id.slice(0, 32) || 'контроллер'), 2000);
        }
    });
    window.addEventListener('gamepaddisconnected', () => {
        clearInputSource('gamepad');
    });

    // ==== GAMEPAD МЕНЮ-НАВИГАЦИЯ ====
    // Отдельный RAF-цикл для UI-навигации геймпадом (меню, пауза, оверлеи).
    // Edge-triggered: одно нажатие = одно событие, удержание даёт повтор.
    // Активен только вне активного геймплея (running && !paused).
    (function startMenuGamepadNav() {
        // Маппинг: btn-индекс → key (как у клавиатуры)
        const NAV_MAP = [
            [12, 'ArrowUp'],
            [13, 'ArrowDown'],
            [14, 'ArrowLeft'],
            [15, 'ArrowRight'],
            [0,  'Enter'],    // A → подтвердить
            [1,  'Escape'],   // B → назад
            [3,  'Enter'],    // Y → подтвердить (альт)
            [9,  'Escape'],   // Start → пауза/назад
        ];
        const AXIS_DEAD      = 0.55; // высокий порог чтобы стик не срабатывал случайно
        const REPEAT_DELAY   = 350;  // мс до начала повтора
        const REPEAT_INTERVAL = 160; // мс между повторами

        const prevBtns = {};
        let axisX = 0, axisY = 0;
        const activeRepeats = {};

        function fireNav(key) {
            const evt = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
            evt._bhMenuNav = true; // маркер: игровой обработчик ввода должен игнорировать это событие
            document.dispatchEvent(evt);
        }

        function beginRepeat(key) {
            if (activeRepeats[key]) return;
            fireNav(key);
            const t = setTimeout(() => {
                if (!activeRepeats[key]) return;
                const iv = setInterval(() => {
                    if (!activeRepeats[key]) { clearInterval(iv); return; }
                    fireNav(key);
                }, REPEAT_INTERVAL);
                if (activeRepeats[key]) activeRepeats[key].iv = iv;
            }, REPEAT_DELAY);
            activeRepeats[key] = { t };
        }

        function endRepeat(key) {
            const s = activeRepeats[key];
            if (!s) return;
            clearTimeout(s.t);
            if (s.iv) clearInterval(s.iv);
            delete activeRepeats[key];
        }

        function stopAll() {
            Object.keys(activeRepeats).forEach(endRepeat);
            axisX = 0; axisY = 0;
            Object.keys(prevBtns).forEach(k => { prevBtns[k] = false; });
        }

        function poll() {
            requestAnimationFrame(poll);
            // Не мешаем геймплею: во время активной игры (не на паузе и без оверлея результата) выходим
            const inActivePlay = typeof running !== 'undefined' && typeof paused !== 'undefined'
                && running && !paused
                && !levelCompleteShown && !gameOverShown;
            if (inActivePlay) {
                stopAll();
                return;
            }

            if (!navigator.getGamepads) return;
            const gamepads = navigator.getGamepads();
            let gp = null;
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]?.connected) { gp = gamepads[i]; break; }
            }
            if (!gp) { stopAll(); return; }

            // Кнопки
            NAV_MAP.forEach(([btnIdx, key]) => {
                const pressed = !!gp.buttons[btnIdx]?.pressed;
                if (pressed && !prevBtns[btnIdx]) beginRepeat(key);
                else if (!pressed && prevBtns[btnIdx]) endRepeat(key);
                prevBtns[btnIdx] = pressed;
            });

            // Левый аналоговый стик
            const rawX = gp.axes[0] || 0;
            const rawY = gp.axes[1] || 0;
            const nx = rawX < -AXIS_DEAD ? -1 : rawX > AXIS_DEAD ? 1 : 0;
            const ny = rawY < -AXIS_DEAD ? -1 : rawY > AXIS_DEAD ? 1 : 0;

            if (nx !== axisX) {
                if (axisX === -1) endRepeat('ArrowLeft');
                if (axisX ===  1) endRepeat('ArrowRight');
                if (nx  === -1) beginRepeat('ArrowLeft');
                if (nx  ===  1) beginRepeat('ArrowRight');
                axisX = nx;
            }
            if (ny !== axisY) {
                if (axisY === -1) endRepeat('ArrowUp');
                if (axisY ===  1) endRepeat('ArrowDown');
                if (ny  === -1) beginRepeat('ArrowUp');
                if (ny  ===  1) beginRepeat('ArrowDown');
                axisY = ny;
            }
        }

        requestAnimationFrame(poll);
    })();

    // ==== ОБРАБОТКА ВВОДА ====
    document.addEventListener('keydown', e => {
        if (e._bhMenuNav) return; // синтетическое событие меню-навигации — игнорируем
        if (controlKeys.has(e.key)) e.preventDefault();
        pressInputKey(e.key, 'keyboard');
    });
    document.addEventListener('keyup', e => {
        if (e._bhMenuNav) return;
        if (controlKeys.has(e.key)) e.preventDefault();
        releaseInputKey(e.key, 'keyboard');
    });


    // ==== ЛОГИКА МЕНЮ ====
    const chars = document.querySelectorAll('.char');
    modes = document.getElementById('modes');

    /**
     * Назначает обработчик выбора персонажа.
     * @param {HTMLElement} c - DOM-элемент карточки персонажа.
     */
    chars.forEach(c => {
        // Обрабатываем клик по конкретному персонажу
        c.onclick = () => {
            audioPlay('ui_click');
            // Убираем выделение со всех персонажей
            // ch — элемент персонажа из списка
            chars.forEach(ch => ch.classList.remove('selected'));
            // Выделяем выбранного
            c.classList.add('selected');
            
            selectedChar = c.dataset.char;
            modes.classList.add('active');
            if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();
        };
    });

    // Показываем лучшие результаты в меню
    updateBestScoresDisplay();
    if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();

    const modeButtons = document.querySelectorAll('.mode');
    const tutorialBtn = document.getElementById('btnTutorial');
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const resetProgressBtn = document.getElementById('reset-progress-btn');
    const bonusLevelBtn = document.getElementById('bonus-level-btn');
    const updateAudioToggleButtonLabel = () => {
        if (!audioToggleBtn) return;
        const enabled = !(window.BHAudio && typeof window.BHAudio.isEnabled === 'function')
            ? true
            : !!window.BHAudio.isEnabled();
        audioToggleBtn.textContent = enabled ? '🔊 Звук: ВКЛ' : '🔇 Звук: ВЫКЛ';
        audioToggleBtn.title = enabled ? 'Выключить все звуки' : 'Включить все звуки';
    };
    updateAudioToggleButtonLabel();
    if (audioToggleBtn) {
        audioToggleBtn.onclick = () => {
            if (!window.BHAudio || typeof window.BHAudio.setEnabled !== 'function') return;
            const wasEnabled = (typeof window.BHAudio.isEnabled === 'function') ? !!window.BHAudio.isEnabled() : true;
            if (wasEnabled) audioPlay('ui_click');
            window.BHAudio.setEnabled(!wasEnabled);
            if (!wasEnabled) audioPlay('ui_confirm');
            updateAudioToggleButtonLabel();
        };
    }
    if (resetProgressBtn) {
        resetProgressBtn.onclick = () => {
            audioPlay('ui_click');
            const ok = window.confirm('Сбросить прогресс кампании? Библиотека и Bonus снова будут закрыты.');
            if (!ok) return;
            if (typeof resetCampaignProgressState === 'function') {
                resetCampaignProgressState();
            }
            audioPlay('ui_confirm');
            modeButtons.forEach(mb => mb.classList.remove('selected'));
            if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();
        };
    }
    if (bonusLevelBtn) {
        bonusLevelBtn.onclick = async () => {
            audioPlay('ui_click');
            const targetMode = 'bonus';
            if (typeof isModeUnlockedByProgress === 'function' && !isModeUnlockedByProgress(targetMode)) {
                audioPlay('ui_error');
                return;
            }
            if (!canLaunchMode(targetMode)) {
                audioPlay('ui_error');
                return;
            }
            if (typeof startModeWithIntro === 'function') {
                await startModeWithIntro(targetMode, { source: 'menu' });
            } else {
                document.getElementById('menu').style.display = 'none';
                document.getElementById('game').style.display = 'block';
                gameMode = targetMode;
                beginGameRun(gameMode, true);
                setTouchControlsVisible(true);
                setPauseGameBtnVisible(true);
            }
        };
    }
    if (tutorialBtn) {
        tutorialBtn.onclick = async () => {
            audioPlay('ui_click');
            clearInputSource('keyboard');
            clearInputSource('gamepad');
            clearTouchInputs();
            paused = false;
            const targetMode = 'tutorial';
            if (typeof startModeWithIntro === 'function') {
                await startModeWithIntro(targetMode, { source: 'menu' });
            } else {
                document.getElementById('menu').style.display = 'none';
                document.getElementById('game').style.display = 'block';
                gameMode = targetMode;
                beginGameRun(gameMode, true);
                setTouchControlsVisible(true);
                setPauseGameBtnVisible(true);
            }
        };
    }
    /**
     * Назначает обработчик выбора режима игры.
     * @param {HTMLElement} m - DOM-элемент кнопки режима.
     */
    modeButtons.forEach(m => {
        // Обрабатываем клик по конкретному режиму игры
        m.onclick = async () => {
            // Блокируем старт если тач-устройство в портретном режиме
            if (isTouchDevice() && window.matchMedia('(orientation: portrait)').matches) {
                return;
            }
            audioPlay('ui_click');
            clearInputSource('keyboard');
            clearInputSource('gamepad');
            clearTouchInputs();
            paused = false;
            const targetMode = m.dataset.mode || 'normal';
            if (typeof isModeUnlockedByProgress === 'function' && !isModeUnlockedByProgress(targetMode)) {
                audioPlay('ui_error');
                return;
            }
            if (!canLaunchMode(targetMode)) {
                audioPlay('ui_error');
                return;
            }
            // Снимаем выделение со всех кнопок режима
            // mb — кнопка режима
            modeButtons.forEach(mb => mb.classList.remove('selected'));
            // Выделяем выбранный
            m.classList.add('selected');

            // На мобиле при первом запуске показываем обучение управлению ДО старта уровня
            if (isTouchDevice() && !hasSeenMobileHint()) {
                await showMobileControlsHintModal();
            }

            if (typeof startModeWithIntro === 'function') {
                await startModeWithIntro(targetMode, { source: 'menu' });
            } else {
                document.getElementById('menu').style.display = 'none';
                document.getElementById('game').style.display = 'block';
                gameMode = targetMode;
                beginGameRun(gameMode, true);
                setTouchControlsVisible(true);
                setPauseGameBtnVisible(true);
            }
        };
    });

    // ==== KEYBOARD NAVIGATION IN MENU ====
    // Initialize: focus first character on page load
    menuNavFocus('char', 0);
    document.addEventListener('keydown', menuKeyNav);
    window.menuNavFocus = menuNavFocus; // expose for overlays

    // Синхронизация фокуса: при наведении мышью кнопка получает menu-kb-focus,
    // снимая его со всех остальных — чтобы не было двух одновременных фокусов.
    document.addEventListener('mouseover', e => {
        const el = e.target.closest(
            '.char, .mode, #help-btn, #audio-toggle-btn, #bonus-level-btn, #reset-progress-btn, #btnTutorial, #help-back-btn, ' +
            'button[data-pause-idx], button[data-overlay-btn-idx]'
        );
        if (!el || el.disabled) return;
        // Снимаем menu-kb-focus со всего документа
        document.querySelectorAll('.menu-kb-focus').forEach(x => x.classList.remove('menu-kb-focus'));
        el.classList.add('menu-kb-focus');
    });

    // ==== HELP SCREEN ====
    const helpBtn = document.getElementById('help-btn');
    const helpScreen = document.getElementById('help-screen');
    const helpBackBtn = document.getElementById('help-back-btn');
    if (helpBtn && helpScreen && helpBackBtn) {
        helpBtn.onclick = () => {
            audioPlay('ui_click');
            helpScreen.style.display = 'block';
            // Сбрасываем скролл и фокус кнопки «Назад» при каждом открытии
            helpBackBtn.classList.remove('menu-kb-focus');
            const scrollEl = helpScreen.querySelector('.help-scroll');
            if (scrollEl) scrollEl.scrollTop = 0;
            // focus the bonus-open button so keyboard users can open sprite selector
            setTimeout(() => { const b = document.getElementById('bonus-open-btn'); if (b) { b.classList.add('menu-kb-focus'); b.focus(); } }, 10);
        };
        helpBackBtn.onclick = () => {
            audioPlay('ui_click');
            helpScreen.style.display = 'none';
            helpBackBtn.classList.remove('menu-kb-focus');
            menuNavFocus('help', 0);
        };
    }

    // ==== FULLSCREEN TOGGLE ====
    (function () {
        const fsBtn = document.getElementById('fullscreen-btn');
        if (!fsBtn) return;

        const fsEnabled = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
        // iOS Safari: ни один из флагов не выставлен, но устройство мобильное
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isStandalone = !!navigator.standalone; // уже запущен как PWA с домашнего экрана

        if (!fsEnabled && !isIOS) return; // десктоп-браузер без поддержки — не показываем

        fsBtn.style.display = 'block';

        if (isStandalone) {
            // Уже в полноэкранном (standalone) режиме — кнопка не нужна
            fsBtn.style.display = 'none';
            return;
        }

        if (!fsEnabled && isIOS) {
            // iOS: показываем кнопку с инструкцией через Safari
            fsBtn.textContent = '⛶';
            fsBtn.title = 'Полный экран';

            // Тост-подсказка
            const showIOSToast = () => {
                const existing = document.getElementById('ios-fs-toast');
                if (existing) { existing.remove(); return; }
                const toast = document.createElement('div');
                toast.id = 'ios-fs-toast';
                Object.assign(toast.style, {
                    position: 'fixed', zIndex: '9999',
                    top: '60px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(20,20,30,0.96)',
                    color: '#fff', borderRadius: '12px',
                    padding: '12px 16px', fontSize: '13px',
                    lineHeight: '1.5', maxWidth: '260px',
                    textAlign: 'center', boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    pointerEvents: 'none'
                });
                toast.innerHTML = '📱 Для полного экрана:<br>Нажмите <b>Поделиться</b> (<span style="font-size:16px">⎙</span>) в браузере → <b>«На экран "Домой"»</b>';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 5000);
            };
            fsBtn.onclick = showIOSToast;
            return;
        }

        // Стандартный Fullscreen API
        const updateIcon = () => {
            const inFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
            fsBtn.textContent = inFs ? '\u2715' : '\u26F6';
            fsBtn.title = inFs ? 'Выйти из полного экрана' : 'Полный экран';
        };

        fsBtn.onclick = () => {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } else {
                const el = document.documentElement;
                (el.requestFullscreen || el.webkitRequestFullscreen).call(el).catch(() => {});
            }
        };

        document.addEventListener('fullscreenchange', updateIcon);
        document.addEventListener('webkitfullscreenchange', updateIcon);
        updateIcon();
    })();

    // ==== SCORES OVERLAY (mobile) ====
    const scoresToggleBtn = document.getElementById('scores-toggle-btn');
    const scoresOverlay = document.getElementById('scores-overlay');
    const scoresBackBtn = document.getElementById('scores-back-btn');
    const scoresOverlayContent = document.getElementById('scores-overlay-content');
    if (scoresToggleBtn && scoresOverlay && scoresBackBtn && scoresOverlayContent) {
        scoresToggleBtn.onclick = () => {
            audioPlay('ui_click');
            // Sync content from hidden #best-scores div
            const bestScoresEl = document.getElementById('best-scores');
            if (bestScoresEl) scoresOverlayContent.innerHTML = bestScoresEl.innerHTML;
            scoresOverlay.classList.add('open');
            scoresOverlayContent.scrollTop = 0;
        };
        scoresBackBtn.onclick = () => {
            audioPlay('ui_click');
            scoresOverlay.classList.remove('open');
        };
    }

    if (window.BHAudio) {
        window.BHAudio.setMenuActive(true);
        window.BHAudio.setPaused(false);
    }

    // ==== MENU KEYBOARD NAVIGATION FUNCTIONS ====
    // Объявлены как function declarations — hoisting даёт им доступ везде в этой callback,
    // включая showPause() -> btnMain.onclick, который вызывает menuNavFocus('char', 0).
    // Состояние хранится в DOM (класс menu-kb-focus), что исключает проблемы с TDZ.

    // Grace-period: при появлении нового оверлея результата блокируем Enter/Space
    // чтобы зажатая клавиша стрельбы не кликала кнопку сразу.
    let _lastResultOverlayEl = null;
    let _overlayInputGraceUntil = 0;
    const OVERLAY_INPUT_GRACE_MS = 850;

    function menuNavFocus(section, idx) {
        const cEls = Array.from(document.querySelectorAll('.char'));
        const mEls = Array.from(document.querySelectorAll('.mode'));
        const helpBtnEl = document.getElementById('help-btn');
        const audioBtnEl = document.getElementById('audio-toggle-btn');
        const bonusBtnEl = document.getElementById('bonus-level-btn');
        const resetBtnEl = document.getElementById('reset-progress-btn');
        const tutorialBtnEl = document.getElementById('btnTutorial');
        // Снимаем подсветку со всех элементов меню
        [...cEls, ...mEls].forEach(el => el.classList.remove('menu-kb-focus'));
        [helpBtnEl, audioBtnEl, bonusBtnEl, resetBtnEl, tutorialBtnEl].forEach(el => el && el.classList.remove('menu-kb-focus'));
        if (section === 'char') {
            if (cEls[idx]) cEls[idx].classList.add('menu-kb-focus');
        } else if (section === 'mode') {
            if (mEls[idx]) mEls[idx].classList.add('menu-kb-focus');
        } else if (section === 'help') {
            if (helpBtnEl) helpBtnEl.classList.add('menu-kb-focus');
        } else if (section === 'audio') {
            if (audioBtnEl) audioBtnEl.classList.add('menu-kb-focus');
        } else if (section === 'bonus') {
            if (bonusBtnEl && bonusBtnEl.style.display !== 'none' && !bonusBtnEl.disabled) {
                bonusBtnEl.classList.add('menu-kb-focus');
            }
        } else if (section === 'reset') {
            if (resetBtnEl) resetBtnEl.classList.add('menu-kb-focus');
        } else if (section === 'tutorial') {
            if (tutorialBtnEl) tutorialBtnEl.classList.add('menu-kb-focus');
        }
    }

    function menuKeyNav(e) {
        const menuElement = document.getElementById('menu');
        const helpElement = document.getElementById('help-screen');
        const pauseOverlay = document.getElementById('pauseOverlay');
        const levelCompleteOverlay = document.getElementById('level-complete-overlay');
        const gameOverOverlay = document.getElementById('game-over-overlay');

        // ==== ТАБЛИЧКИ завершения уровня / game over ====
        const resultOverlay = levelCompleteOverlay || gameOverOverlay;
        if (resultOverlay) {
            // Новый оверлей — выставляем grace-period и сбрасываем все зажатые клавиши
            if (resultOverlay !== _lastResultOverlayEl) {
                _lastResultOverlayEl = resultOverlay;
                _overlayInputGraceUntil = Date.now() + OVERLAY_INPUT_GRACE_MS;
                clearInputSource('keyboard');
                clearInputSource('gamepad');
                clearTouchInputs();
            }

            const btns = Array.from(resultOverlay.querySelectorAll('button[data-overlay-btn-idx]'))
                .filter(b => !b.disabled);
            if (!btns.length) return;
            let curIdx = btns.findIndex(b => b.classList.contains('menu-kb-focus'));
            if (curIdx < 0) { curIdx = 0; btns[0].classList.add('menu-kb-focus'); }

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                btns[curIdx].classList.remove('menu-kb-focus');
                btns[(curIdx + 1) % btns.length].classList.add('menu-kb-focus');
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                btns[curIdx].classList.remove('menu-kb-focus');
                btns[(curIdx - 1 + btns.length) % btns.length].classList.add('menu-kb-focus');
                e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
                // Блокируем в течение grace-period — игрок мог зажать огонь в конце уровня
                if (Date.now() < _overlayInputGraceUntil) { e.preventDefault(); return; }
                btns[curIdx]?.click();
                e.preventDefault();
            }
            return;
        }

        // ==== ПАУЗА: навигация по кнопкам ====
        if (pauseOverlay) {
            const pauseBtns = Array.from(pauseOverlay.querySelectorAll('button[data-pause-idx]'));
            if (!pauseBtns.length) return;
            let curIdx = pauseBtns.findIndex(b => b.classList.contains('menu-kb-focus'));
            if (curIdx < 0) { curIdx = 0; pauseBtns[0].classList.add('menu-kb-focus'); }

            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                pauseBtns[curIdx].classList.remove('menu-kb-focus');
                const next = (curIdx + 1) % pauseBtns.length;
                pauseBtns[next].classList.add('menu-kb-focus');
                e.preventDefault();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                pauseBtns[curIdx].classList.remove('menu-kb-focus');
                const prev = (curIdx - 1 + pauseBtns.length) % pauseBtns.length;
                pauseBtns[prev].classList.add('menu-kb-focus');
                e.preventDefault();
            } else if (e.key === 'Enter' || e.key === ' ') {
                pauseBtns[curIdx]?.click();
                e.preventDefault();
            }
            return;
        }

        // ==== HELP: Escape закрывает ====
        if (e.key === 'Escape' && helpElement && helpElement.style.display === 'block') {
            helpElement.style.display = 'none';
            document.getElementById('help-back-btn')?.classList.remove('menu-kb-focus');
            e.preventDefault();
            return;
        }

        // ==== HELP: навигация внутри ====
        if (helpElement && helpElement.style.display === 'block') {
            const scrollEl = helpElement.querySelector('.help-scroll');
            const backBtn = document.getElementById('help-back-btn');
            const bonusBtn = document.getElementById('bonus-open-btn');
            const bonusFocused = bonusBtn && bonusBtn.classList.contains('menu-kb-focus');
            const backFocused = backBtn && backBtn.classList.contains('menu-kb-focus');
            const SCROLL_STEP = 120;

            if (e.key === 'ArrowDown') {
                if (!backFocused) {
                    if (!bonusFocused && bonusBtn) {
                        // move focus to bonus button first
                        // remove focus from other elements first
                        document.querySelectorAll('.menu-kb-focus').forEach(x=>x.classList.remove('menu-kb-focus'));
                        bonusBtn.classList.add('menu-kb-focus');
                        try { bonusBtn.focus(); } catch (er) {}
                    } else if (scrollEl) {
                        scrollEl.scrollTop += SCROLL_STEP;
                        const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 4;
                        if (atBottom && backBtn) {
                            document.querySelectorAll('.menu-kb-focus').forEach(x=>x.classList.remove('menu-kb-focus'));
                            backBtn.classList.add('menu-kb-focus');
                            try { backBtn.focus(); } catch (er) {}
                        }
                    }
                }
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                if (backFocused && scrollEl) {
                    // move focus back into scroll region (do not call focus to avoid visible outline)
                    backBtn.classList.remove('menu-kb-focus');
                    scrollEl.scrollTop -= SCROLL_STEP;
                } else if (scrollEl) {
                    // if bonus is focused, move up to end of scroll
                    if (bonusFocused) {
                        // move to last scroll position (do not call focus to avoid visible outline)
                        document.querySelectorAll('.menu-kb-focus').forEach(x=>x.classList.remove('menu-kb-focus'));
                        if (scrollEl) {
                            scrollEl.scrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight - SCROLL_STEP);
                        }
                    } else {
                        scrollEl.scrollTop -= SCROLL_STEP;
                    }
                }
                e.preventDefault();
            } else if ((e.key === 'Enter' || e.key === ' ') ) {
                // Prefer the element which actually holds menu-kb-focus class
                if (bonusBtn && bonusBtn.classList.contains('menu-kb-focus')) {
                    bonusBtn.click();
                    e.preventDefault();
                    return;
                }
                if (backBtn && backBtn.classList.contains('menu-kb-focus')) {
                    helpElement.style.display = 'none';
                    backBtn.classList.remove('menu-kb-focus');
                    e.preventDefault();
                }
            }
            return;
        }

        // ==== МЕНЮ: работаем только когда оно видимо ====
        if (!menuElement || menuElement.style.display === 'none') return;

        const cEls = Array.from(document.querySelectorAll('.char'));
        const mEls = Array.from(document.querySelectorAll('.mode'));
        const helpBtnEl = document.getElementById('help-btn');
        const audioBtnEl = document.getElementById('audio-toggle-btn');
        const bonusBtnEl = document.getElementById('bonus-level-btn');
        const resetBtnEl = document.getElementById('reset-progress-btn');
        const tutorialBtnEl = document.getElementById('btnTutorial');
        const modesContainer = document.getElementById('modes');
        const modesVisible = modesContainer && modesContainer.style.display !== 'none';

        // Определяем текущую секцию и индекс из DOM
        let section = 'char', idx = 0;
        const fChar = cEls.findIndex(el => el.classList.contains('menu-kb-focus'));
        const fMode = mEls.findIndex(el => el.classList.contains('menu-kb-focus'));
        const fHelp = helpBtnEl && helpBtnEl.classList.contains('menu-kb-focus');
        const fAudio = audioBtnEl && audioBtnEl.classList.contains('menu-kb-focus');
        const fBonus = bonusBtnEl && bonusBtnEl.classList.contains('menu-kb-focus');
        const fReset = resetBtnEl && resetBtnEl.classList.contains('menu-kb-focus');
        const fTutorial = tutorialBtnEl && tutorialBtnEl.classList.contains('menu-kb-focus');
        if (fTutorial)   { section = 'tutorial'; idx = 0; }
        else if (fReset) { section = 'reset'; idx = 0; }
        else if (fBonus) { section = 'bonus'; idx = 0; }
        else if (fAudio) { section = 'audio'; idx = 0; }
        else if (fHelp)  { section = 'help';  idx = 0; }
        else if (fMode >= 0 && modesVisible) { section = 'mode'; idx = fMode; }
        else if (fChar >= 0) { section = 'char'; idx = fChar; }
        // Очищаем зависший menu-kb-focus с кнопок режима, если панель скрыта
        if (!modesVisible && fMode >= 0) mEls[fMode].classList.remove('menu-kb-focus');

        if (e.key === 'Escape') {
            // Из режимов / help / reset → вернуться к выбору персонажа
            if (section !== 'char') {
                // Сбросить выбор персонажа и скрыть режимы
                cEls.forEach(el => el.classList.remove('selected'));
                if (modesContainer) modesContainer.style.display = 'none';
                menuNavFocus('char', 0);
                e.preventDefault();
            }
            return;
        }

        if (e.key === 'ArrowLeft') {
            if (section === 'char') menuNavFocus('char', (idx - 1 + cEls.length) % cEls.length);
            else if (section === 'mode') menuNavFocus('mode', (idx - 1 + mEls.length) % mEls.length);
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            if (section === 'char') menuNavFocus('char', (idx + 1) % cEls.length);
            else if (section === 'mode') menuNavFocus('mode', (idx + 1) % mEls.length);
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            if (section === 'char') {
                cEls[idx]?.click();
                if (modesContainer && modesContainer.style.display !== 'none') menuNavFocus('mode', 0);
            } else if (section === 'mode') {
                if (idx < mEls.length - 1) menuNavFocus('mode', idx + 1);
                else menuNavFocus('tutorial', 0);
            } else if (section === 'tutorial') {
                menuNavFocus('help', 0);
            } else if (section === 'help') {
                menuNavFocus('audio', 0);
            } else if (section === 'audio') {
                if (bonusBtnEl && bonusBtnEl.style.display !== 'none' && !bonusBtnEl.disabled) {
                    menuNavFocus('bonus', 0);
                } else {
                    menuNavFocus('reset', 0);
                }
            } else if (section === 'bonus') {
                menuNavFocus('reset', 0);
            } else if (section === 'reset') {
                menuNavFocus('mode', mEls.length - 1); // циклируем обратно
            }
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            if (section === 'mode') {
                if (idx === 0) menuNavFocus('char', fChar >= 0 ? fChar : 0);
                else menuNavFocus('mode', idx - 1);
            } else if (section === 'tutorial') {
                menuNavFocus('mode', mEls.length - 1);
            } else if (section === 'help') {
                menuNavFocus('tutorial', 0);
            } else if (section === 'audio') {
                menuNavFocus('help', 0);
            } else if (section === 'bonus') {
                menuNavFocus('audio', 0);
            } else if (section === 'reset') {
                if (bonusBtnEl && bonusBtnEl.style.display !== 'none' && !bonusBtnEl.disabled) {
                    menuNavFocus('bonus', 0);
                } else {
                    menuNavFocus('audio', 0);
                }
            }
            e.preventDefault();
        } else if (e.key === 'Enter' || e.key === ' ') {
            if (section === 'char') {
                cEls[idx]?.click();
                if (modesContainer && modesContainer.style.display !== 'none') menuNavFocus('mode', 0);
            } else if (section === 'mode') {
                mEls[idx]?.click();
            } else if (section === 'help') {
                helpBtnEl?.click();
            } else if (section === 'audio') {
                audioBtnEl?.click();
            } else if (section === 'bonus') {
                bonusBtnEl?.click();
            } else if (section === 'reset') {
                resetBtnEl?.click();
            } else if (section === 'tutorial') {
                tutorialBtnEl?.click();
            }
            e.preventDefault();
        }
    }
});

// ──── BONUS SCREEN LOGIC ────
if (typeof window !== 'undefined') {
    const bonusScreen = document.getElementById('bonus-screen');
    const bonusOpenBtn = document.getElementById('bonus-open-btn');
    const bonusBackBtn = document.getElementById('bonus-back-btn');
    const skinCards = document.querySelectorAll('.skin-card');
    const helpScreen = document.getElementById('help-screen');

    function updateBonusSkinSelection() {
        const savedSkin = localStorage.getItem('bh_char_skin') || 'max';
        skinCards.forEach(card => {
            card.classList.toggle('selected', card.dataset.skin === savedSkin);
        });
    }

    // Open bonus from help
    if (bonusOpenBtn) {
        bonusOpenBtn.addEventListener('click', function() {
            if (helpScreen) helpScreen.style.display = 'none';
            if (bonusScreen) bonusScreen.style.display = 'flex';
            updateBonusSkinSelection();
            // focus selected skin card or first card for keyboard navigation
            setTimeout(() => {
                const sel = document.querySelector('.skin-card.selected');
                if (sel) sel.focus(); else if (skinCards[0]) skinCards[0].focus();
            }, 10);
            // attach keyboard handler for navigation while bonus is open (capture phase to preempt global handlers)
            document.removeEventListener('keydown', bonusKeyHandler, true);
            document.addEventListener('keydown', bonusKeyHandler, true);
            // ensure selected card has menu-kb-focus class for styling
            setTimeout(()=>{ const sel = document.querySelector('.skin-card.selected'); if (sel) sel.classList.add('menu-kb-focus'); }, 20);
        });
    }

    // Back to help from bonus
    if (bonusBackBtn) {
        bonusBackBtn.addEventListener('click', function() {
            if (bonusScreen) bonusScreen.style.display = 'none';
            if (helpScreen) helpScreen.style.display = 'block';
            // focus bonus-open button in help so user can re-enter bonus selector via keyboard
            setTimeout(() => { const b = document.getElementById('bonus-open-btn'); if (b) { b.classList.add('menu-kb-focus'); b.focus(); } }, 10);
            // remove bonus keyboard handler (capture)
            document.removeEventListener('keydown', bonusKeyHandler, true);
        });
    }

    // Skin selection
    skinCards.forEach(card => {
        // ensure focus styling when keyboard-focused
        card.addEventListener('focus', function() { this.classList.add('menu-kb-focus'); });
        card.addEventListener('blur', function() { this.classList.remove('menu-kb-focus'); });
        card.addEventListener('click', function() {
            const skin = this.dataset.skin;
            localStorage.setItem('bh_char_skin', skin);
            updateBonusSkinSelection();
            selectedSpriteSystem = skin;
            if (typeof player !== 'undefined' && player) player.spriteSystem = skin;
        });
    });

    // Escape from bonus screen
    // Keyboard navigation handler for bonus screen
    function bonusKeyHandler(ev) {
        if (!bonusScreen || bonusScreen.style.display !== 'flex') return;
        // prevent other global menu key handlers from running while bonus is open
        ev.stopImmediatePropagation && ev.stopImmediatePropagation();
        ev.stopPropagation && ev.stopPropagation();
        const focused = document.activeElement;
        if (ev.key === 'Escape') {
            ev.preventDefault();
            if (bonusBackBtn) bonusBackBtn.click();
            return;
        }
        if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
            ev.preventDefault();
            const arr = Array.from(skinCards);
            let idx = arr.indexOf(focused);
            if (idx === -1) { if (arr[0]) arr[0].focus(); return; }
            idx = (ev.key === 'ArrowLeft') ? (idx - 1 + arr.length) % arr.length : (idx + 1) % arr.length;
            arr[idx].focus();
            return;
        }
        if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            const arrUp = Array.from(skinCards);
            let idxUp = arrUp.indexOf(focused);
            if (idxUp === -1) { if (arrUp[arrUp.length-1]) arrUp[arrUp.length-1].focus(); }
            else { idxUp = (idxUp - 1 + arrUp.length) % arrUp.length; arrUp[idxUp].focus(); }
            return;
        }
        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            if (bonusBackBtn) bonusBackBtn.focus();
            return;
        }
        if (ev.key === 'Enter' || ev.key === ' ') {
            if (focused && focused.classList && focused.classList.contains('skin-card')) {
                ev.preventDefault(); ev.stopPropagation(); focused.click();
                return;
            }
            if (focused === bonusBackBtn) { ev.preventDefault(); bonusBackBtn.click(); return; }
        }
    }
}
