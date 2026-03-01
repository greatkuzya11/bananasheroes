// Главная точка входа: инициализация игры после загрузки DOM
/**
 * Главный игровой цикл: обновляет состояние и рисует кадр.
 * @param {number} ts - текущее время (timestamp) от requestAnimationFrame.
 */
function loop(ts) {
    if (!running) return;
    if (!paused) {
        const dt = (ts - last) / 1000;
        last = ts;
        update(dt);
    }
    draw();
    animFrameId = requestAnimationFrame(loop);
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
    const MOBILE_HINT_SEEN_KEY = 'bh_mobile_controls_hint_seen_v1';
    // Живая проверка — не кешируем, чтобы DevTools-эмуляция мобильного работала корректно
    const isTouchDevice = () => ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0 || ('ontouchstart' in window));
    const inputSourceState = {
        keyboard: new Set(),
        touch: new Set()
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
     * Синхронизирует общее состояние конкретной клавиши по источникам ввода.
     * @param {string} key - код клавиши.
     */
    function refreshKeyState(key) {
        keys[key] = inputSourceState.keyboard.has(key) || inputSourceState.touch.has(key);
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
     * Скрывает подсказку мобильного управления.
     */
    function hideMobileControlsHint() {
        if (!mobileHintEl) return;
        mobileHintEl.classList.remove('active');
        mobileHintEl.setAttribute('aria-hidden', 'true');
    }

    /**
     * Показывает подсказку управления на мобильных устройствах при первом запуске.
     */
    function maybeShowMobileControlsHint() {
        if (!isTouchDevice() || !mobileHintEl) return;
        if (!running || paused) return;
        if (hasSeenMobileHint()) return;

        mobileHintEl.classList.add('active');
        mobileHintEl.setAttribute('aria-hidden', 'false');
        markMobileHintSeen();
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
            clearTouchInputs();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearInputSource('keyboard');
                clearTouchInputs();
            }
        });

        loadTouchBlockPositions();

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
        if (gameMode === 'nosok') {
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
                nosokBall.y = Math.max(nosokBall.r, Math.min(canvas.height - 20 - nosokBall.r, nosokBall.y));
            }
            if (player) {
                player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
                player.y = Math.min(player.y, canvas.height - player.h - 20);
            }
        }
        if (gameMode === 'runner' && typeof onRunnerResize === 'function') {
            onRunnerResize(prevW, prevH);
        }
    }

    const TOUCH_PAD_POS_KEY = 'bh_touch_pad_pos_v1';
    const TOUCH_ACTIONS_POS_KEY = 'bh_touch_actions_pos_v1';

    function loadTouchBlockPositions() {
        if (!touchControlsEl) return;
        const blocks = [
            { el: touchControlsEl.querySelector('.touch-pad'), key: TOUCH_PAD_POS_KEY },
            { el: touchControlsEl.querySelector('.touch-actions'), key: TOUCH_ACTIONS_POS_KEY }
        ];
        blocks.forEach(({ el, key }) => {
            if (!el) return;
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
        [TOUCH_PAD_POS_KEY, TOUCH_ACTIONS_POS_KEY].forEach(key => localStorage.removeItem(key));
        const pad = touchControlsEl.querySelector('.touch-pad');
        const act = touchControlsEl.querySelector('.touch-actions');
        if (pad) { pad.style.left = ''; pad.style.top = ''; pad.style.bottom = ''; pad.style.right = ''; }
        if (act) { act.style.left = ''; act.style.top = ''; act.style.bottom = ''; act.style.right = ''; }
    }

    function enableTouchBlockDragging() {
        if (!touchControlsEl || !isTouchDevice()) return;
        touchControlsEl.style.zIndex = '1050';
        touchControlsEl.style.display = 'block';

        const blocks = [
            { el: touchControlsEl.querySelector('.touch-pad'),     key: TOUCH_PAD_POS_KEY },
            { el: touchControlsEl.querySelector('.touch-actions'), key: TOUCH_ACTIONS_POS_KEY }
        ].filter(({ el }) => el);

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

        const blocks = [
            touchControlsEl.querySelector('.touch-pad'),
            touchControlsEl.querySelector('.touch-actions')
        ].filter(Boolean);

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

        const title = document.createElement('div');
        title.innerHTML = '⏸️ ПАУЗА ⏸️';
        title.style.fontSize = '48px';
        title.style.marginBottom = '30px';
        title.style.fontWeight = 'bold';
        overlay.appendChild(title);

        const btnResume = document.createElement('button');
        btnResume.innerText = '▶️ Продолжить';
        btnResume.dataset.pauseIdx = '0';
        Object.assign(btnResume.style, { 
            padding: '15px', 
            fontSize: '24px', 
            cursor: 'pointer', 
            marginBottom: '10px',
            borderRadius: '10px',
            background: '#ffcc00',
            border: '3px solid transparent',
            transition: 'all 0.2s ease',
            color: '#000',
            minWidth: '300px'
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
            padding: '15px', 
            fontSize: '24px', 
            cursor: 'pointer', 
            marginBottom: '10px',
            borderRadius: '10px',
            background: '#ffcc00',
            border: '3px solid transparent',
            transition: 'all 0.2s ease',
            color: '#000',
            minWidth: '300px'
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
            padding: '15px', 
            fontSize: '24px', 
            cursor: 'pointer',
            borderRadius: '10px',
            background: '#ffcc00',
            border: '3px solid transparent',
            transition: 'all 0.2s ease',
            color: '#000',
            minWidth: '300px'
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

            const btnReset = document.createElement('button');
            btnReset.innerText = '↺ Сбросить позиции кнопок';
            Object.assign(btnReset.style, {
                marginTop: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
                borderRadius: '8px', background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.35)', color: '#fff'
            });
            btnReset.onclick = () => { resetTouchBlockPositions(); };
            overlay.appendChild(btnReset);
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

    // ==== ОБРАБОТКА ВВОДА ====
    document.addEventListener('keydown', e => {
        if (controlKeys.has(e.key)) e.preventDefault();
        pressInputKey(e.key, 'keyboard');
    });
    document.addEventListener('keyup', e => {
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
            modes.style.display = 'block';
            if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();
        };
    });

    // Показываем лучшие результаты в меню
    updateBestScoresDisplay();
    if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();

    const modeButtons = document.querySelectorAll('.mode');
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const resetProgressBtn = document.getElementById('reset-progress-btn');
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
            const ok = window.confirm('Сбросить прогресс кампании? Останется открыт только первый уровень.');
            if (!ok) return;
            if (typeof resetCampaignProgressState === 'function') {
                resetCampaignProgressState();
            }
            audioPlay('ui_confirm');
            modeButtons.forEach(mb => mb.classList.remove('selected'));
            if (typeof refreshModeButtonsByProgress === 'function') refreshModeButtonsByProgress();
        };
    }
    /**
     * Назначает обработчик выбора режима игры.
     * @param {HTMLElement} m - DOM-элемент кнопки режима.
     */
    modeButtons.forEach(m => {
        // Обрабатываем клик по конкретному режиму игры
        m.onclick = async () => {
            audioPlay('ui_click');
            clearInputSource('keyboard');
            clearTouchInputs();
            paused = false;
            const targetMode = m.dataset.mode || 'normal';
            if (typeof isModeUnlockedByProgress === 'function' && !isModeUnlockedByProgress(targetMode)) {
                audioPlay('ui_error');
                return;
            }
            // Снимаем выделение со всех кнопок режима
            // mb — кнопка режима
            modeButtons.forEach(mb => mb.classList.remove('selected'));
            // Выделяем выбранный
            m.classList.add('selected');

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
            '.char, .mode, #help-btn, #audio-toggle-btn, #reset-progress-btn, #help-back-btn, ' +
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

    if (window.BHAudio) {
        window.BHAudio.setMenuActive(true);
        window.BHAudio.setPaused(false);
    }

    // ==== MENU KEYBOARD NAVIGATION FUNCTIONS ====
    // Объявлены как function declarations — hoisting даёт им доступ везде в этой callback,
    // включая showPause() -> btnMain.onclick, который вызывает menuNavFocus('char', 0).
    // Состояние хранится в DOM (класс menu-kb-focus), что исключает проблемы с TDZ.

    function menuNavFocus(section, idx) {
        const cEls = Array.from(document.querySelectorAll('.char'));
        const mEls = Array.from(document.querySelectorAll('.mode'));
        const helpBtnEl = document.getElementById('help-btn');
        const audioBtnEl = document.getElementById('audio-toggle-btn');
        const resetBtnEl = document.getElementById('reset-progress-btn');
        // Снимаем подсветку со всех элементов меню
        [...cEls, ...mEls].forEach(el => el.classList.remove('menu-kb-focus'));
        [helpBtnEl, audioBtnEl, resetBtnEl].forEach(el => el && el.classList.remove('menu-kb-focus'));
        if (section === 'char') {
            if (cEls[idx]) cEls[idx].classList.add('menu-kb-focus');
        } else if (section === 'mode') {
            if (mEls[idx]) mEls[idx].classList.add('menu-kb-focus');
        } else if (section === 'help') {
            if (helpBtnEl) helpBtnEl.classList.add('menu-kb-focus');
        } else if (section === 'audio') {
            if (audioBtnEl) audioBtnEl.classList.add('menu-kb-focus');
        } else if (section === 'reset') {
            if (resetBtnEl) resetBtnEl.classList.add('menu-kb-focus');
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
        const resetBtnEl = document.getElementById('reset-progress-btn');
        const modesContainer = document.getElementById('modes');
        const modesVisible = modesContainer && modesContainer.style.display !== 'none';

        // Определяем текущую секцию и индекс из DOM
        let section = 'char', idx = 0;
        const fChar = cEls.findIndex(el => el.classList.contains('menu-kb-focus'));
        const fMode = mEls.findIndex(el => el.classList.contains('menu-kb-focus'));
        const fHelp = helpBtnEl && helpBtnEl.classList.contains('menu-kb-focus');
        const fAudio = audioBtnEl && audioBtnEl.classList.contains('menu-kb-focus');
        const fReset = resetBtnEl && resetBtnEl.classList.contains('menu-kb-focus');
        if (fReset)      { section = 'reset'; idx = 0; }
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
                else menuNavFocus('help', 0);
            } else if (section === 'help') {
                menuNavFocus('audio', 0);
            } else if (section === 'audio') {
                menuNavFocus('reset', 0);
            } else if (section === 'reset') {
                menuNavFocus('mode', mEls.length - 1); // циклируем обратно
            }
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            if (section === 'mode') {
                if (idx === 0) menuNavFocus('char', fChar >= 0 ? fChar : 0);
                else menuNavFocus('mode', idx - 1);
            } else if (section === 'help') {
                menuNavFocus('mode', mEls.length - 1);
            } else if (section === 'audio') {
                menuNavFocus('help', 0);
            } else if (section === 'reset') {
                menuNavFocus('audio', 0);
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
            } else if (section === 'reset') {
                resetBtnEl?.click();
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
