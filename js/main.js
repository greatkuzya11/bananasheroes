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
    requestAnimationFrame(loop);
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
    const isTouchDevice = ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0 || ('ontouchstart' in window));
    const inputSourceState = {
        keyboard: new Set(),
        touch: new Set()
    };
    const touchPointers = new Map();
    const touchKeyHoldCount = new Map();
    const controlKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Escape", "Shift", "Control"]);
    let mobileHintSeenThisSession = false;

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
        if (!isTouchDevice || !mobileHintEl) return;
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
        const shouldShow = !!visible && isTouchDevice;
        touchControlsEl.classList.toggle('active', shouldShow);
        touchControlsEl.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        if (!shouldShow) {
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
        if (!touchControlsEl || !isTouchDevice) {
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
    window.setGameTouchControlsVisible = (visible) => {
        setTouchControlsVisible(visible);
    };
    
    /**
     * Изменяет размер canvas под размер окна браузера.
     */
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    /**
     * Показывает меню паузы.
     */
    function pauseGame() {
        paused = true;
        setTouchControlsVisible(false);
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
            resumeGame();
        };
        overlay.appendChild(btnResume);

        const btnRestart = document.createElement('button');
        btnRestart.innerText = '🔄 Начать заново';
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
            const pauseOverlay = document.getElementById('pauseOverlay');
            if (pauseOverlay) pauseOverlay.remove();
            paused = false;
            clearInputSource('keyboard');
            clearTouchInputs();
            
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            hearts = [];
            bananaBonuses = [];
            o4koVictoryBeers = [];
            o4koVictorySequenceActive = false;
            platforms = [];
            boss = null;
            bossO4ko = null;
            bukinTablet = null;
            enemy67 = null;
            score = 0;
            combo = 0;
            bonusShots = 0;
            lives = PLAYER_LIVES;
            invuln = INVULN_TIME;
            levelCompleteShown = false;
            gameOverShown = false;
            bossDefeated = false;
            // Сбрасываем счетчики режима выживания
            killCount = 0;
            survivalEnemySpeedIncrease = 0;
            survivalBulletSpeedIncrease = 0;
            survivalSpeedUps = 0;
            survivalBulletMultiplier = 1;
            survivalWaveSpawning = false;
            o4koHitStreak = 0;
            o4koRandomDropTimer = 0;
            o4koVulnHitCount = 0;
            o4koLivesLost = 0;
            o4koPityHeartUsed = false;
            // Сбрасываем счетчики режима платформ
            platform67HitCount = 0;
            homePlatform = null;
            bossPlatform = null;
            platformRuby = null;
            platformCup = null;
            player = new Player(selectedChar);
            // Спавним врагов в зависимости от режима
            if (gameMode === 'platforms') {
                enemies = [];
                playerBulletDir = 'right';
                // Инициализация платформ для режима платформ
                initPlatformLevel();
                // Инициализация отслеживания неподвижности
                platformPlayerLastX = 0;
                platformInactivityTimer = 0;
                // Позиционируем игрока в центр домашней платформы
                if (homePlatform) {
                    player.x = homePlatform.x + (homePlatform.w - player.w) / 2;
                    player.y = homePlatform.y - player.h;
                    player.onPlatform = true; // Игрок стартует на платформе, может прыгать
                    platformPlayerLastX = player.x;
                }
                // Спавним врага 67 на платформе босса
                if (bossPlatform) {
                    enemy67 = new Enemy67(player.x, player.y, true);
                    platform67HitCount = 0;
                }
            } else if (gameMode === '67') {
                enemies = [];
                enemy67 = new Enemy67(player.x, player.y);
                // Позиция игрока почти с левого угла для режима 67
                player.x = 20;
                playerBulletDir = 'right';
            } else if (gameMode === 'o4ko') {
                enemies = [];
                enemy67 = null;
                bgImg.src = 'img/bg-avs.png';
                // Позиция игрока почти с левого угла для режима "Очко"
                player.x = 20;
                playerBulletDir = 'right';
                bossO4ko = new BossO4ko(player.x, player.y);
            } else {
                spawnEnemies();
                playerBulletDir = 'up';
            }
            // Не нужно запускать requestAnimationFrame — цикл уже работает
            // Переменная running уже true, просто сбрасываем last
            last = performance.now();
            setTouchControlsVisible(true);
        };
        overlay.appendChild(btnRestart);

        const btnMain = document.createElement('button');
        btnMain.innerText = '🏠 Главный экран';
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
            const pauseOverlay = document.getElementById('pauseOverlay');
            if (pauseOverlay) pauseOverlay.remove();
            paused = false;
            clearInputSource('keyboard');
            clearTouchInputs();
            
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            hearts = [];
            bananaBonuses = [];
            o4koVictoryBeers = [];
            o4koVictorySequenceActive = false;
            platforms = [];
            boss = null;
            bossO4ko = null;
            bukinTablet = null;
            score = 0;
            combo = 0;
            bonusShots = 0;
            lives = PLAYER_LIVES;
            invuln = INVULN_TIME;
            o4koHitStreak = 0;
            o4koRandomDropTimer = 0;
            o4koVulnHitCount = 0;
            o4koLivesLost = 0;
            o4koPityHeartUsed = false;
            levelCompleteShown = false;
            gameOverShown = false;
            running = false;
            document.getElementById('game').style.display = 'none';
            document.getElementById('menu').style.display = 'block';
            updateBestScoresDisplay();
            setTouchControlsVisible(false);
        };
        overlay.appendChild(btnMain);

        document.body.appendChild(overlay);
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
        last = performance.now(); // сбрасываем время чтобы не было скачка
        if (running) setTouchControlsVisible(true);
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
            // Убираем выделение со всех персонажей
            // ch — элемент персонажа из списка
            chars.forEach(ch => ch.classList.remove('selected'));
            // Выделяем выбранного
            c.classList.add('selected');
            
            selectedChar = c.dataset.char;
            modes.style.display = 'block';
        };
    });

    // Показываем лучшие результаты в меню
    updateBestScoresDisplay();

    const modeButtons = document.querySelectorAll('.mode');
    /**
     * Назначает обработчик выбора режима игры.
     * @param {HTMLElement} m - DOM-элемент кнопки режима.
     */
    modeButtons.forEach(m => {
        // Обрабатываем клик по конкретному режиму игры
        m.onclick = () => {
            clearInputSource('keyboard');
            clearTouchInputs();
            paused = false;
            // Снимаем выделение со всех кнопок режима
            // mb — кнопка режима
            modeButtons.forEach(mb => mb.classList.remove('selected'));
            // Выделяем выбранный
            m.classList.add('selected');
            
            // Полный сброс состояния для нового запуска
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            hearts = [];
            bananaBonuses = [];
            o4koVictoryBeers = [];
            o4koVictorySequenceActive = false;
            boss = null;
            bossO4ko = null;
            bukinTablet = null;
            speechBalloons = [];
            explosions = [];
            bossDefeated = false;
            // Сбрасываем очки и состояние игрока
            score = 0;
            combo = 0;
            bonusShots = 0;
            lives = PLAYER_LIVES;
            invuln = INVULN_TIME;

            document.getElementById('menu').style.display = 'none';
            document.getElementById('game').style.display = 'block';
            // Устанавливаем режим игры
            gameMode = m.dataset.mode || 'normal';
            // Сбрасываем счетчики выживания
            killCount = 0;
            survivalEnemySpeedIncrease = 0;
            survivalBulletSpeedIncrease = 0;
            survivalSpeedUps = 0;
            survivalBulletMultiplier = 1;
            survivalWaveSpawning = false;
            o4koHitStreak = 0;
            o4koRandomDropTimer = 0;
            o4koVulnHitCount = 0;
            o4koLivesLost = 0;
            o4koPityHeartUsed = false;
            player = new Player(selectedChar);
            // Настройка в зависимости от режима
            if (gameMode === '67') {
                // Режим 67: без обычных врагов и с другим фоном
                enemies = [];
                bossO4ko = null;
                bgImg.src = 'img/forest2.png';
                // Позиция игрока почти с левого угла
                player.x = 20;
                // Направление пуль по умолчанию направо
                playerBulletDir = 'right';
                // Создаем врага 67
                enemy67 = new Enemy67(player.x, player.y);
            } else if (gameMode === 'o4ko') {
                // Режим "Очко": логика старта как у режима 67, но со своим боссом
                enemies = [];
                enemy67 = null;
                bgImg.src = 'img/bg-avs.png';
                player.x = 20;
                playerBulletDir = 'right';
                bossO4ko = new BossO4ko(player.x, player.y);
            } else {
                enemy67 = null;
                bossO4ko = null;
                // В других режимах направление по умолчанию вверх
                playerBulletDir = 'up';
                // Инициализация платформ для режима платформ
                if (gameMode === 'platforms') {
                    bgImg.src = 'img/pl-bg.png';
                    playerBulletDir = 'right'; // Направление пуль вправо для режима платформ
                    initPlatformLevel();
                    // Инициализация отслеживания неподвижности
                    platformPlayerLastX = 0;
                    platformInactivityTimer = 0;
                    // Позиционируем игрока в центр домашней платформы
                    if (homePlatform) {
                        player.x = homePlatform.x + (homePlatform.w - player.w) / 2;
                        player.y = homePlatform.y - player.h;
                        player.onPlatform = true; // Игрок стартует на платформе, может прыгать
                        platformPlayerLastX = player.x;
                    } else {
                        // Запасной вариант позиционирования
                        player.y = canvas.height - 40 - player.h - 30;
                        player.x = canvas.width / 2 - player.w / 2;
                    }
                    // Спавним врага 67 на платформе босса
                    if (bossPlatform) {
                        enemy67 = new Enemy67(player.x, player.y, true);
                        platform67HitCount = 0;
                    }
                } else {
                    // Обычный/выживание: стандартный фон и спавн врагов
                    bgImg.src = 'img/forest.png';
                    spawnEnemies();
                }
            }
            levelCompleteShown = false;
            gameOverShown = false;
            running = true;
            last = performance.now();
            requestAnimationFrame(loop);
            setTouchControlsVisible(true);
        };
    });
});
