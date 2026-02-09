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
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ==== ОБРАБОТКА ВВОДА ====
    /**
     * Обработчик нажатия клавиш: управление движением, стрельбой и бонус-режимом
     */
    /**
     * Обрабатывает нажатия клавиш для управления игроком.
     * @param {KeyboardEvent} e - событие нажатия клавиши.
     */
    document.addEventListener('keydown', e => {
        keys[e.key] = true;
        if (e.key === "Escape") {
            if (running && !levelCompleteShown && !gameOverShown) {
                if (paused) {
                    resumeGame();
                } else {
                    pauseGame();
                }
            }
        }
        if (e.key === "Shift") {
            // Если бонусный режим включен — выключаем, иначе включаем только при наличии бонусных выстрелов
            if (bonusMode) {
                bonusMode = false;
            } else if (bonusShots > 0) {
                bonusMode = true;
            }
        }
        // Переключение альтернативного режима стрельбы клавишей Ctrl
        if (e.key === "Control") {
            if (!ctrlHeld) {
                ctrlHeld = true;
                altShootMode = !altShootMode;
                // Сбрасываем направление на 'up' при смене режима
                if (!altShootMode) {
                    playerBulletDir = 'up';
                }
            }
        }
        if (e.key === "ArrowDown" && !altShootMode) {
            // Переключаем направление пули один раз за нажатие
            if (!dirSwitchHeld) {
                dirSwitchHeld = true;
                if (playerBulletDir === 'up') {
                    playerBulletDir = 'left';
                    player.facingDir = 'left';
                } else if (playerBulletDir === 'left') {
                    playerBulletDir = 'right';
                    player.facingDir = 'right';
                } else {
                    playerBulletDir = 'up';
                    // Оставляем текущее направление взгляда
                }
            }
        }
    });
    /**
     * Обработчик отпускания клавиш: сбрасывает состояние нажатия
     */
    /**
     * Обрабатывает отпускание клавиш и сбрасывает флаги.
     * @param {KeyboardEvent} e - событие отпускания клавиши.
     */
    document.addEventListener('keyup', e => {
        keys[e.key] = false;
        if (e.key === 'ArrowDown') dirSwitchHeld = false;
        if (e.key === 'Control') ctrlHeld = false;
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
        };
    });
});
