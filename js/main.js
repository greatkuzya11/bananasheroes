// Главная точка входа: инициализация игры после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // ==== BACKGROUND IMAGE ====
    const bgImg = new Image();         
    bgImg.onload = () => bgReady = true;
    bgImg.src = "img/forest.png";

    // ==== CONSTANTS ====
    const FRAME_W = 256;
    const FRAME_H = 256;
    const WALK_START = 1;
    const WALK_END = 4;
    const SHOOT_FRAME = 5;
    const PLAYER_SPEED = 7;
    const ENEMY_ROWS = 3;
    const ENEMY_COLS = 7;
    const ENEMY_WIDTH_RATIO = 0.1;
    const ENEMY_HEIGHT_RATIO = 0.1;
    const ENEMY_START_Y = 60;
    const ENEMY_X_SPACING = 120;
    const ENEMY_Y_SPACING = 100;
    const PLAYER_LIVES = 10;
    const INVULN_TIME = 0.5;
    const BONUS_SHOTS_PER_BOTTLE = 3;

    // ==== CANVAS SETUP ====
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    /**
     * Изменяет размер canvas под размер окна браузера
     */
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Показываем модальное окно завершения уровня с двумя кнопками
    function showLevelComplete() {
        // Show overlay — keep game running so player can still move; damage disabled after boss death.
        // Save best score if this run produced a new record and reflect it in the message
        const key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_' + (gameMode || 'normal');
        const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        let isNew = false;
        if (score > best) {
            localStorage.setItem(key, String(score));
            isNew = true;
        }
        updateBestScoresDisplay();

        // Если уже есть — удалим старое
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

        // Icons row (beer + bananas)
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
        // Отдельная победная фраза для режима 67
        const victoryText67 = 'Поздравляю, вы победили 67!';
        const victoryTextDefault = 'Поздравляем, уровень пройден. Букин освобождён.';
        msg.innerText = (gameMode === '67' ? victoryText67 : victoryTextDefault) + (isNew ? ' — Новый рекорд!' : '');
        Object.assign(msg.style, { fontSize: '20px', marginBottom: '18px', color: '#222', opacity: '0', transform: 'translateY(12px)' });

        // Add simple CSS animations via a style tag for pop-in and small icon bounce
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
        btnMain.onclick = () => {
            // Вернуться в меню
            running = false;
            levelCompleteShown = false;
            // очистим состояние игры
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            boss = null;
            bukinTablet = null;
            document.getElementById('game').style.display = 'none';
            document.getElementById('menu').style.display = 'block';
            // Show character selection (hide mode choices)
            if (modes) modes.style.display = 'none';
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

        // Trigger animations after appended
        requestAnimationFrame(() => {
            msg.style.transition = 'opacity 520ms ease-out, transform 520ms ease-out';
            msg.style.opacity = '1';
            msg.style.transform = 'translateY(0)';
            // small icon bounce
            beer.style.animation = 'bounceIcon 900ms ease-in-out 1';
            bananas.style.animation = 'bounceIcon 900ms ease-in-out 1';
        });
    }

    // ==== GAME OVER HANDLERS ====
    const charNames = { max: 'Макс', dron: 'Дрон', kuzy: 'Кузя' };
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
            { id: '67', name: 'Режим 67' }
        ];
        
        let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
        charsList.forEach(c => {
            html += `<div style="color:#fff; font-size:14px;"><b>${c.name}:</b> `;
            const scores = modes.map(m => {
                const best = parseInt(localStorage.getItem('bh_bestScore_' + c.id + '_' + m.id) || '0', 10) || 0;
                return `${m.name}: <b>${best}</b>`;
            }).join(' | ');
            html += scores + '</div>';
        });
        html += '</div>';
        el.innerHTML = html;
    }

    function showGameOver() {
        if (gameOverShown) return;
        gameOverShown = true;
        running = false;

        const key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_' + (gameMode || 'normal');
        const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        let isNew = false;
        if (score > best) {
            localStorage.setItem(key, String(score));
            isNew = true;
        }
        updateBestScoresDisplay();

        // play sound (no confetti)
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
        scoreLine.innerText = `Очки: ${score}`;
        Object.assign(scoreLine.style, { fontSize: '20px', marginBottom: '6px' });

        const bestLine = document.createElement('div');
        const bestVal = parseInt(localStorage.getItem(key) || '0', 10) || 0;
        const displayName = (charNames && charNames[selectedChar]) ? charNames[selectedChar] : selectedChar;
        const modeNames = { 'normal': 'Обычный', 'survival': 'Выживание', '67': 'Режим 67', 'platforms': 'Платформы' };
        const modeName = modeNames[gameMode] || gameMode;
        bestLine.innerText = `Рекорд (${displayName}, ${modeName}): ${bestVal}` + (isNew ? ' — Новый рекорд!' : '');
        Object.assign(bestLine.style, { fontSize: '16px', marginBottom: '18px', color: isNew ? '#ffd54f' : '#ddd' });

        const buttons = document.createElement('div');
        Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

        const btnRetry = document.createElement('button');
        btnRetry.innerText = 'Повторить';
        Object.assign(btnRetry.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
        btnRetry.onclick = () => {
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            hearts = [];
            platforms = [];
            boss = null;
            bukinTablet = null;
            score = 0;
            combo = 0;
            bonusShots = 0;
            lives = PLAYER_LIVES;
            invuln = INVULN_TIME;
            levelCompleteShown = false;
            gameOverShown = false;
            bossDefeated = false;
            // reset survival counters
            killCount = 0;
            survivalEnemySpeedIncrease = 0;
            survivalBulletSpeedIncrease = 0;
            survivalSpeedUps = 0;
            survivalBulletMultiplier = 1;
            survivalWaveSpawning = false;
            player = new Player(selectedChar);
            // Спавним врагов только если не режим 67
            if (gameMode !== '67') {
                spawnEnemies();
                playerBulletDir = 'up';
            } else {
                enemies = [];
                enemy67 = new Enemy67(player.x, player.y);
                // Позиция игрока почти с левого угла для режима 67
                player.x = 20;
                // Направление пуль по умолчанию направо для режима 67
                playerBulletDir = 'right';
            }
            // Инициализация платформ для режима platforms
            if (gameMode === 'platforms') {
                initPlatformLevel();
                spawnEnemiesOnPlatforms();
            }
            document.getElementById('menu').style.display = 'none';
            document.getElementById('game').style.display = 'block';
            overlay.remove();
            running = true;
            last = performance.now();
            requestAnimationFrame(loop);
        };

        const btnMain = document.createElement('button');
        btnMain.innerText = 'Главный экран';
        Object.assign(btnMain.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
        btnMain.onclick = () => {
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            boss = null;
            bukinTablet = null;
            score = 0;
            combo = 0;
            bonusShots = 0;
            lives = PLAYER_LIVES;
            invuln = INVULN_TIME;
            levelCompleteShown = false;
            gameOverShown = false;
            running = false;
            document.getElementById('game').style.display = 'none';
            document.getElementById('menu').style.display = 'block';
            // Show character selection (hide mode choices)
            if (modes) modes.style.display = 'none';
            updateBestScoresDisplay();
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
     * Показывает меню паузы
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
        btnResume.onmouseover = () => {
            btnResume.style.transform = 'scale(1.05)';
            btnResume.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        btnResume.onmouseout = () => {
            btnResume.style.transform = 'scale(1)';
            btnResume.style.boxShadow = 'none';
        };
        btnResume.onmousedown = () => {
            btnResume.style.transform = 'scale(0.95)';
        };
        btnResume.onmouseup = () => {
            btnResume.style.transform = 'scale(1.05)';
        };
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
        btnRestart.onmouseover = () => {
            btnRestart.style.transform = 'scale(1.05)';
            btnRestart.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        btnRestart.onmouseout = () => {
            btnRestart.style.transform = 'scale(1)';
            btnRestart.style.boxShadow = 'none';
        };
        btnRestart.onmousedown = () => {
            btnRestart.style.transform = 'scale(0.95)';
        };
        btnRestart.onmouseup = () => {
            btnRestart.style.transform = 'scale(1.05)';
        };
        btnRestart.onclick = () => {
            const pauseOverlay = document.getElementById('pauseOverlay');
            if (pauseOverlay) pauseOverlay.remove();
            paused = false;
            
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            hearts = [];
            platforms = [];
            boss = null;
            bukinTablet = null;
            score = 0;
            combo = 0;
            bonusShots = 0;
            lives = PLAYER_LIVES;
            invuln = INVULN_TIME;
            levelCompleteShown = false;
            gameOverShown = false;
            bossDefeated = false;
            // reset survival counters
            killCount = 0;
            survivalEnemySpeedIncrease = 0;
            survivalBulletSpeedIncrease = 0;
            survivalSpeedUps = 0;
            survivalBulletMultiplier = 1;
            survivalWaveSpawning = false;
            player = new Player(selectedChar);
            // Спавним врагов только если не режим 67
            if (gameMode !== '67') {
                playerBulletDir = 'up';
                // Инициализация платформ для режима platforms
                if (gameMode === 'platforms') {
                    initPlatformLevel();
                    // Позиционируем игрока на 30 пикселей выше земли
                    player.y = canvas.height - 40 - player.h - 30;
                    player.x = canvas.width / 2 - player.w / 2;
                    // spawnEnemiesOnPlatforms(); // Отключено для тестирования
                } else {
                    spawnEnemies();
                }
            } else {
                enemies = [];
                // Позиция игрока почти с левого угла для режима 67
                player.x = 20;
                // Направление пуль по умолчанию направо для режима 67
                playerBulletDir = 'right';
                enemy67 = new Enemy67(player.x, player.y);
            }
            // Не нужно запускать requestAnimationFrame - loop уже работает
            // running уже true, просто сбрасываем last
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
        btnMain.onmouseover = () => {
            btnMain.style.transform = 'scale(1.05)';
            btnMain.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        btnMain.onmouseout = () => {
            btnMain.style.transform = 'scale(1)';
            btnMain.style.boxShadow = 'none';
        };
        btnMain.onmousedown = () => {
            btnMain.style.transform = 'scale(0.95)';
        };
        btnMain.onmouseup = () => {
            btnMain.style.transform = 'scale(1.05)';
        };
        btnMain.onclick = () => {
            const pauseOverlay = document.getElementById('pauseOverlay');
            if (pauseOverlay) pauseOverlay.remove();
            paused = false;
            
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            hearts = [];
            platforms = [];
            boss = null;
            bukinTablet = null;
            score = 0;
            combo = 0;
            bonusShots = 0;
            lives = PLAYER_LIVES;
            invuln = INVULN_TIME;
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
     * Возобновляет игру после паузы
     */
    function resumeGame() {
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.remove();
        }
        paused = false;
        last = performance.now(); // сбрасываем время чтобы не было скачка
    }

    // ==== AUDIO ====
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
            // short envelope
            gain.gain.exponentialRampToValueAtTime(0.001, now + (isNew ? 0.45 : 0.33));
            osc.stop(now + (isNew ? 0.5 : 0.36));
            // if new record, play a second higher note
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
            // ignore audio errors (browser restrictions)
            console.warn('Audio not available', e);
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ==== GAME STATE ====
    let keys = {};
    let bullets = [];
    let enemyBullets = [];
    let enemies = [];
    let bottles = [];
    let hearts = []; // сердечки жизни
    let player;
    let bossDefeated = false;
    let score = 0;
    let combo = 0;
    let lives = PLAYER_LIVES;
    let invuln = INVULN_TIME;
    let bonusShots = 0;
    let bonusMode = false;
    // player bullet firing direction: 'up'|'left'|'right'
    let playerBulletDir = 'up';
    let dirSwitchHeld = false;
    // alternative shooting mode flag
    let altShootMode = false;
    let ctrlHeld = false;
    // game mode: 'normal' or 'survival' or 'platforms'
    let gameMode = 'normal';
    // platforms for platform mode
    let platforms = [];
    // survival counters
    let killCount = 0;
    let survivalEnemySpeedIncrease = 0;
    let survivalBulletSpeedIncrease = 0;
    let survivalSpeedUps = 0; // up to 10
    let survivalBulletMultiplier = 1; // количество пуль за выстрел, увеличивается каждые 20 убийств, максимум 1024 (2^10)
    let survivalWaveSpawning = false; // флаг для предотвращения множественного спавна

    // ==== BOSS STATE ====
    let boss = null;

    // ==== PLAYER SPEECH BALLOON ====
    let speechBalloons = [];
    const SPEECH_BALLOON_DURATION = 1.0;

    // ==== EXPLOSION ANIMATION ====
    let explosions = [];

    // ==== SPRITES ====
    const kuzyImg = new Image();
    let spriteReady = false;
    kuzyImg.onload = () => spriteReady = true;
    kuzyImg.src = "img/kuzy.png";
    
    // Спрайты для стрельбы - 5 отдельных файлов
    const kuzyShootImgs = [];
    let shootSpritesReady = 0;
    for (let i = 0; i < 5; i++) {
        kuzyShootImgs[i] = new Image();
        kuzyShootImgs[i].onload = () => shootSpritesReady++;
        kuzyShootImgs[i].src = `img/shoot/${i}.png`;
    }
    
    // Спрайты для стрельбы вверх - 7 отдельных файлов (0-4 для стрельбы, 5-6 для прыжка со стрельбой)
    const kuzyShootUpImgs = [];
    let shootUpSpritesReady = 0;
    for (let i = 0; i < 7; i++) {
        kuzyShootUpImgs[i] = new Image();
        kuzyShootUpImgs[i].onload = () => shootUpSpritesReady++;
        kuzyShootUpImgs[i].src = `img/shoot/up/${i}.png`;
    }
    
    const kuzyJumpImg = new Image();
    let jumpSpriteReady = false;
    kuzyJumpImg.onload = () => jumpSpriteReady = true;
    kuzyJumpImg.src = "img/kuzy_jump.png";

    // Sprite for Enemy 67
    const FRAME_67_W = 326;
    const FRAME_67_H = 326;
    const enemy67Img = new Image();
    let enemy67SpriteReady = false;
    enemy67Img.onload = () => enemy67SpriteReady = true;
    enemy67Img.src = "img/67.png";

    // ---------- PLAYER ----------

    // ==== PLAYER CLASS ====
    /**
     * Класс игрока: хранит состояние, управляет движением, анимацией и отрисовкой
     */
    class Player {
        constructor(type) {
            this.type = type;
            this.w = canvas.height * 0.2;
            this.h = this.w;
            this.x = canvas.width / 2 - this.w / 2;
            this.y = canvas.height - this.h - 20;
            this.speed = PLAYER_SPEED;
            this.lastShot = 0;
            this.frame = 0;
            this.timer = 0;
            this.shootTimer = 0;
            // Jump state
            this.isJumping = false;
            this.jumpTimer = 0;
            this.jumpDuration = 2.0; // target total time up+down (used for feel)
            this.jumpBaseY = this.y;
            this.vy = 0; // vertical velocity (px/s), positive = down
            this.gravity = 0; // will be set on jump start for physics styles
            // Variable-height jump parameters
            this.jumpMinHeight = 0.6 * this.h;
            this.jumpMaxHeight = 1.5 * this.h;
            this.jumpHoldTimer = 0;
            this.jumpHoldMax = 0.6; // seconds of hold-to-increase height while ascending
            // Character-specific jump style: 'max' = linear, 'dron' = physics instant boost, 'kuzy' = physics with smooth vy ramp
            this.jumpStyle = (type === 'max') ? 'max' : (type === 'dron') ? 'dron' : 'kuzy';
            this.jumpRampFactor = (type === 'kuzy') ? 4.0 : 6.0; // lower = smoother for 'kuzy'
            // Facing direction for sprite mirroring: 'left' or 'right'
            this.facingDir = 'right';
        }
        /**
         * Обновляет положение, анимацию и обработку выстрелов игрока
         */
        update(dt) {
            // Alternative shooting mode: arrows change direction
            if (altShootMode) {
                if (keys["ArrowLeft"]) {
                    playerBulletDir = 'left';
                    this.facingDir = 'left';
                    this.x -= this.speed;
                }
                if (keys["ArrowRight"]) {
                    playerBulletDir = 'right';
                    this.facingDir = 'right';
                    this.x += this.speed;
                }
                // ArrowDown shoots up in alternative mode
                if (keys["ArrowDown"]) {
                    playerBulletDir = 'up';
                }
            } else {
                // Normal mode: just horizontal movement
                if (keys["ArrowLeft"]) {
                    this.x -= this.speed;
                }
                if (keys["ArrowRight"]) {
                    this.x += this.speed;
                }
            }
            this.x = Math.max(10, Math.min(canvas.width - this.w - 10, this.x));

            // Jump initiation (only when not already jumping)
            // В режиме платформ можно прыгать только стоя на платформе
            const canJump = (gameMode === 'platforms') ? this.onPlatform : true;
            if (keys["ArrowUp"] && !this.isJumping && canJump) {
                this.isJumping = true;
                this.jumpTimer = 0;
                this.jumpBaseY = this.y;
                this.jumpHoldTimer = 0;
                // recalc min/max based on current size
                this.jumpMinHeight = 0.6 * this.h;
                this.jumpMaxHeight = 1.5 * this.h;
                if (this.jumpStyle === 'max') {
                    // linear fixed-height jump (no charge)
                    this.jumpHeight = this.jumpMaxHeight;
                } else {
                    // physics styles: set gravity and initial upward velocity based on min height
                    this.gravity = 2 * this.jumpMaxHeight;
                    const v0 = 2 * this.jumpMinHeight;
                    this.vy = -v0;
                }
            }

            // Shooting logic
            // In alternative mode with ArrowDown held (shooting up), shoot automatically
            const autoShootUp = altShootMode && keys["ArrowDown"] && playerBulletDir === 'up';
            if ((keys[" "] || autoShootUp) && performance.now() - this.lastShot > 333) {
                this.lastShot = performance.now();
                shootPlayerBullet(this);
            }
            
            // Выключаем режим стрельбы, если клавиша не нажата
            if (!keys[" "] && !autoShootUp) {
                this.shooting = false;
            }

            // Consider jumping as movement for animation purposes
            const moving = keys["ArrowLeft"] || keys["ArrowRight"] || this.isJumping;
            
            // В режиме платформ: если не на платформе и не прыгаем = падаем
            const isFalling = (gameMode === 'platforms') && !this.onPlatform && !this.isJumping;

            // Логика анимации в зависимости от состояния
            if ((this.isJumping || isFalling) && this.shooting) {
                // Прыжок/падение со стрельбой
                if (playerBulletDir === 'up') {
                    // Стрельба вверх в прыжке/падении: кадры 5-6 из img/shoot/up
                    this.timer += dt;
                    if (this.timer > 0.12) {
                        this.frame++;
                        if (this.frame < 5 || this.frame > 6) this.frame = 5; // циклируем 5-6
                        this.timer = 0;
                    }
                } else {
                    // Стрельба влево/вправо в прыжке/падении: кадры 4-5 из kuzy_jump.png
                    this.timer += dt;
                    if (this.timer > 0.12) {
                        this.frame++;
                        if (this.frame < 4 || this.frame > 5) this.frame = 4; // циклируем 4-5
                        this.timer = 0;
                    }
                }
            } else if ((this.isJumping || isFalling) && !this.shooting) {
                // Прыжок/падение без стрельбы: кадры 0-3 из kuzy_jump.png
                this.timer += dt;
                if (this.timer > 0.12) {
                    this.frame++;
                    if (this.frame > 3) this.frame = 0; // циклируем 0-3
                    this.timer = 0;
                }
            } else if (!this.isJumping && this.shooting) {
                // Стрельба без прыжка: кадры 0-4 из отдельных файлов
                this.timer += dt;
                if (this.timer > 0.12) {
                    this.frame++;
                    if (this.frame > 4) this.frame = 0; // циклируем 0-4 (5 кадров)
                    this.timer = 0;
                }
            } else if (moving) {
                // Обычная ходьба: кадры из kuzy.png
                this.timer += dt;
                if (this.timer > 0.12) {
                    this.frame++;
                    if (this.frame > WALK_END) this.frame = WALK_START;
                    this.timer = 0;
                }
            } else {
                this.frame = 0;
            }

            // Update vertical behavior when jumping according to style
            if (this.isJumping) {
                this.jumpTimer += dt;
                if (this.jumpStyle === 'max') {
                    // Linear up then down over jumpDuration, fixed peak
                    const half = this.jumpDuration / 2;
                    if (this.jumpTimer <= half) {
                        const t = this.jumpTimer / half;
                        this.y = this.jumpBaseY - this.jumpHeight * t;
                    } else if (this.jumpTimer <= this.jumpDuration) {
                        const t = (this.jumpTimer - half) / half;
                        this.y = this.jumpBaseY - this.jumpHeight * (1 - t);
                    } else {
                        this.isJumping = false;
                        this.jumpTimer = 0;
                        this.y = this.jumpBaseY;
                    }
                } else if (this.jumpStyle === 'dron') {
                    // Physics with immediate boost when holding
                    const half = this.jumpDuration / 2;
                    if (this.jumpTimer <= half && keys["ArrowUp"]) {
                        this.jumpHoldTimer = Math.min(this.jumpHoldMax, this.jumpHoldTimer + dt);
                        const k = this.jumpHoldTimer / this.jumpHoldMax;
                        const desiredPeak = this.jumpMinHeight + (this.jumpMaxHeight - this.jumpMinHeight) * k;
                        const desiredV0 = 2 * desiredPeak;
                        if (-this.vy < desiredV0) this.vy = -desiredV0;
                    }
                    this.vy += this.gravity * dt;
                    this.y += this.vy * dt;
                    // В режиме платформ приземление обработается ниже через коллизию с платформами
                    if (gameMode !== 'platforms' && this.y >= this.jumpBaseY) {
                        this.y = this.jumpBaseY;
                        this.vy = 0;
                        this.isJumping = false;
                        this.jumpTimer = 0;
                        this.jumpHoldTimer = 0;
                    }
                } else {
                    // 'kuzy' smooth ramp: approach desired vy gradually for a natural feel
                    const half = this.jumpDuration / 2;
                    if (this.jumpTimer <= half && keys["ArrowUp"]) {
                        this.jumpHoldTimer = Math.min(this.jumpHoldMax, this.jumpHoldTimer + dt);
                        const k = this.jumpHoldTimer / this.jumpHoldMax;
                        const desiredPeak = this.jumpMinHeight + (this.jumpMaxHeight - this.jumpMinHeight) * k;
                        const desiredV0 = 2 * desiredPeak;
                        const desiredVy = -desiredV0;
                        // Smoothly approach desiredVy
                        this.vy += (desiredVy - this.vy) * Math.min(1, this.jumpRampFactor * dt);
                    }
                    this.vy += this.gravity * dt;
                    this.y += this.vy * dt;
                    // В режиме платформ приземление обработается ниже через коллизию с платформами
                    if (gameMode !== 'platforms' && this.y >= this.jumpBaseY) {
                        this.y = this.jumpBaseY;
                        this.vy = 0;
                        this.isJumping = false;
                        this.jumpTimer = 0;
                        this.jumpHoldTimer = 0;
                    }
                }
            }
            
            // Platform mode physics
            if (gameMode === 'platforms') {
                // Проверяем, стоим ли мы на платформе
                let onPlatform = false;
                let currentPlatform = null;
                this.onPlatform = false; // Сохраняем состояние для проверки прыжков
                
                platforms.forEach(p => {
                    // Проверка по вертикали - стоим ли на платформе по высоте
                    if (this.y + this.h >= p.y + 25 && this.y + this.h <= p.y + 35) {
                        // Проверяем, находится ли ЦЕНТР игрока над платформой
                        const playerCenterX = this.x + this.w / 2;
                        const platformLeftEdge = p.x;
                        const platformRightEdge = p.x + p.w;
                        
                        if (playerCenterX >= platformLeftEdge && playerCenterX <= platformRightEdge) {
                            onPlatform = true;
                            currentPlatform = p;
                            this.onPlatform = true; // Сохраняем для проверки прыжка
                        }
                    }
                });
                
                // Применяем гравитацию только если НЕ на платформе
                if (!onPlatform) {
                    // В воздухе - если не прыгаем, применяем гравитацию падения
                    if (!this.isJumping) {
                        this.vy += 800 * dt;
                        this.y += this.vy * dt;
                    }
                    // Если прыгаем, то логика прыжков выше уже обработала физику
                } else if (currentPlatform) {
                    // Игрок стоит на платформе
                    if (!this.isJumping) {
                        // Только корректируем позицию если не прыгаем
                        this.y = currentPlatform.y - this.h + 30;
                        this.vy = 0;
                        this.jumpBaseY = this.y; // Обновляем базовую позицию для следующего прыжка
                    }
                    // Двигаем игрока вместе с платформой по горизонтали
                    if (currentPlatform.movePattern === 'horizontal') {
                        const platformDeltaX = currentPlatform.x - currentPlatform.prevX;
                        this.x += platformDeltaX;
                    }
                }
                
                // Проверка столкновения с платформами при падении
                platforms.forEach(p => {
                    // Проверяем центр игрока для приземления
                    const playerCenterX = this.x + this.w / 2;
                    const platformLeftEdge = p.x;
                    const platformRightEdge = p.x + p.w;
                    
                    // Игрок падает сверху на платформу (центр должен быть над платформой)
                    if (this.vy >= 0 && 
                        playerCenterX >= platformLeftEdge && 
                        playerCenterX <= platformRightEdge &&
                        this.y + this.h >= p.y && 
                        this.y + this.h <= p.y + 40) {
                        this.y = p.y - this.h + 30;
                        this.vy = 0;
                        this.isJumping = false;
                        this.jumpTimer = 0;
                        this.jumpHoldTimer = 0;
                        this.jumpBaseY = this.y;
                    }
                });
                
                // Проверка выхода за нижнюю границу (телепорт наверх с потерей жизни)
                if (this.y > canvas.height) {
                    lives--;
                    combo = 0;
                    if (lives <= 0) {
                        showGameOver();
                    } else {
                        // Телепорт на верхнюю платформу
                        this.y = 50;
                        this.x = canvas.width / 2 - this.w / 2;
                        this.vy = 0;
                        this.isJumping = false;
                        invuln = INVULN_TIME;
                    }
                }
            }
        }
        /**
         * Отрисовывает спрайт игрока на canvas
         */
        draw() {
            // В режиме платформ: если не на платформе и не прыгаем = падаем
            const isFalling = (gameMode === 'platforms') && !this.onPlatform && !this.isJumping;
            
            // Определяем какой спрайт использовать
            let useShootFiles = false; // флаг для использования отдельных файлов стрельбы
            let useShootUpFiles = false; // флаг для использования отдельных файлов стрельбы вверх
            let currentSprite = kuzyImg;
            let spriteIsReady = spriteReady;
            
            if ((this.isJumping || isFalling) && this.shooting) {
                // Прыжок/падение со стрельбой
                if (playerBulletDir === 'up') {
                    // Стрельба вверх в прыжке/падении - используем отдельные файлы 5-6
                    useShootUpFiles = true;
                    spriteIsReady = (shootUpSpritesReady === 7);
                } else {
                    // Стрельба влево/вправо в прыжке/падении
                    currentSprite = kuzyJumpImg;
                    spriteIsReady = jumpSpriteReady;
                }
            } else if ((this.isJumping || isFalling) && !this.shooting) {
                // Прыжок/падение без стрельбы
                currentSprite = kuzyJumpImg;
                spriteIsReady = jumpSpriteReady;
            } else if (!this.isJumping && this.shooting) {
                // Стрельба без прыжка
                if (playerBulletDir === 'up') {
                    // Стрельба вверх - используем отдельные файлы 0-4
                    useShootUpFiles = true;
                    spriteIsReady = (shootUpSpritesReady === 7);
                } else {
                    // Стрельба влево/вправо - используем отдельные файлы
                    useShootFiles = true;
                    spriteIsReady = (shootSpritesReady === 5);
                }
            }
            // Иначе используется обычный спрайт ходьбы (kuzyImg)
            
            if (!spriteIsReady) return;
            
            ctx.save();
            
            // Отзеркаливаем спрайт если игрок смотрит влево
            if (this.facingDir === 'left') {
                // Переворачиваем по горизонтали
                ctx.translate(this.x + this.w, this.y);
                ctx.scale(-1, 1);
                
                if (useShootFiles) {
                    // Используем отдельный файл по индексу кадра
                    const shootFrame = Math.min(this.frame, 4); // ограничиваем 0-4
                    ctx.drawImage(
                        kuzyShootImgs[shootFrame],
                        0,
                        0,
                        this.w,
                        this.h
                    );
                } else if (useShootUpFiles) {
                    // Стрельба вверх (не зеркалится)
                    // Если в прыжке/падении - кадры 5-6, иначе 0-4
                    let shootFrame = this.frame;
                    if (this.isJumping || isFalling) {
                        shootFrame = Math.max(5, Math.min(this.frame, 6)); // ограничиваем 5-6
                    } else {
                        shootFrame = Math.min(this.frame, 4); // ограничиваем 0-4
                    }
                    ctx.drawImage(
                        kuzyShootUpImgs[shootFrame],
                        0,
                        0,
                        this.w,
                        this.h
                    );
                } else {
                    ctx.drawImage(
                        currentSprite,
                        this.frame * FRAME_W,
                        0,
                        FRAME_W,
                        FRAME_H,
                        0,
                        0,
                        this.w,
                        this.h
                    );
                }
            } else {
                // Обычное отображение (вправо или вверх)
                if (useShootFiles) {
                    // Используем отдельный файл по индексу кадра
                    const shootFrame = Math.min(this.frame, 4); // ограничиваем 0-4
                    ctx.drawImage(
                        kuzyShootImgs[shootFrame],
                        this.x,
                        this.y,
                        this.w,
                        this.h
                    );
                } else if (useShootUpFiles) {
                    // Стрельба вверх
                    // Если в прыжке/падении - кадры 5-6, иначе 0-4
                    let shootFrame = this.frame;
                    if (this.isJumping || isFalling) {
                        shootFrame = Math.max(5, Math.min(this.frame, 6)); // ограничиваем 5-6
                    } else {
                        shootFrame = Math.min(this.frame, 4); // ограничиваем 0-4
                    }
                    ctx.drawImage(
                        kuzyShootUpImgs[shootFrame],
                        this.x,
                        this.y,
                        this.w,
                        this.h
                    );
                } else {
                    ctx.drawImage(
                        currentSprite,
                        this.frame * FRAME_W,
                        0,
                        FRAME_W,
                        FRAME_H,
                        this.x,
                        this.y,
                        this.w,
                        this.h
                    );
                }
            }
            
            ctx.restore();
        }
    }

    // ==== ENEMY 67 CLASS ====
    /**
     * Враг "67": декоративный враг с анимированным спрайтом и покачиванием
     */
    class Enemy67 {
        constructor(playerX, playerY) {
            // Размер: высота = 1/2 экрана
            this.h = canvas.height * 0.5;
            this.w = this.h; // квадратный спрайт
            // Позиция: почти с правого угла
            this.x = canvas.width - this.w - 20;
            this.y = canvas.height - this.h - 20;
            // Анимация: 2 кадра, 0.3 сек на кадр
            this.frame = 0;
            this.timer = 0;
            this.animInterval = 0.3;
            // Покачивание: сохраняем базовую позицию
            this.baseX = this.x;
            this.baseY = this.y;
            this.swayTime = 0;
            // Амплитуда и скорость покачивания
            this.swayAmplitudeX = 15;
            this.swayAmplitudeY = 10;
            this.swaySpeedX = 1.2;
            this.swaySpeedY = 1.5;
            // HP и атака
            this.hp = 20;
            this.attackTimer = 0;
            this.attackDelay = 5.0; // начинает атаковать через 5 секунд
            this.shootTimer = 0;
            this.shootInterval = 0.8; // в 3 раза быстрее сирени (~1 сек)
            this.bulletEmojis = ['🪳', '🧨', '7️⃣', '6️⃣', '💩'];
            // Движение к игроку
            this.moveSpeed = 50; // скорость 50 пикселей в секунду
            this.sizeIncreaseTimer = 0; // таймер для увеличения размера каждую секунду
        }

        update(dt) {
            // Анимация кадров
            this.timer += dt;
            if (this.timer >= this.animInterval) {
                this.frame = (this.frame + 1) % 2; // 0 -> 1 -> 0 -> 1...
                this.timer = 0;
            }
            
            // Атака
            this.attackTimer += dt;
            if (this.attackTimer >= this.attackDelay) {
                // После начала атаки увеличиваем размер каждую секунду на 5%
                this.sizeIncreaseTimer += dt;
                if (this.sizeIncreaseTimer >= 1.0) {
                    // Проверяем, не достиг ли размер 90% от экрана
                    const maxSize = Math.min(canvas.width, canvas.height) * 0.9;
                    if (this.w < maxSize && this.h < maxSize) {
                        // Каждую секунду увеличиваем размер на 5%
                        this.w *= 1.05;
                        this.h *= 1.05;
                    }
                    this.sizeIncreaseTimer = 0;
                }
                
                // Движение к игроку
                const dx = player.x + player.w / 2 - (this.baseX + this.w / 2);
                const dy = player.y + player.h / 2 - (this.baseY + this.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 5) { // двигаемся только если не слишком близко
                    this.baseX += (dx / dist) * this.moveSpeed * dt;
                    this.baseY += (dy / dist) * this.moveSpeed * dt;
                }
                
                // Ограничиваем позицию в границах экрана
                this.baseX = Math.max(0, Math.min(canvas.width - this.w, this.baseX));
                this.baseY = Math.max(0, Math.min(canvas.height - this.h, this.baseY));
                
                // Стрельба
                this.shootTimer += dt;
                if (this.shootTimer >= this.shootInterval) {
                    this.shoot();
                    this.shootTimer = 0;
                }
            }
            
            // Покачивание относительно базовой позиции (с меньшей амплитудой чтобы не выходить за границы)
            this.swayTime += dt;
            const swayX = Math.sin(this.swayTime * this.swaySpeedX) * this.swayAmplitudeX;
            const swayY = Math.sin(this.swayTime * this.swaySpeedY) * this.swayAmplitudeY;
            
            // Применяем покачивание и проверяем границы
            this.x = Math.max(0, Math.min(canvas.width - this.w, this.baseX + swayX));
            this.y = Math.max(0, Math.min(canvas.height - this.h, this.baseY + swayY));
        }
        
        shoot() {
            // Выбираем случайное эмодзи для пули
            const emoji = this.bulletEmojis[Math.floor(Math.random() * this.bulletEmojis.length)];
            // Пуля появляется из случайной части врага
            const offsetX = this.w * (0.2 + Math.random() * 0.6);
            const offsetY = this.h * (0.2 + Math.random() * 0.6);
            const bx = this.x + offsetX;
            const by = this.y + offsetY;
            
            // Наводим на игрока
            const dx = player.x + player.w / 2 - bx;
            const dy = player.y + player.h / 2 - by;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 10; // в 5 раз медленнее начальной скорости (350/5=70)
            const vx = (dx / dist) * speed;
            const vy = (dy / dist) * speed;
            
            enemyBullets.push({ x: bx, y: by, w: 16, h: 24, emoji, vx, vy });
        }

        draw() {
            if (!enemy67SpriteReady) return;
            ctx.drawImage(
                enemy67Img,
                this.frame * FRAME_67_W, // srcX: 0 или 326
                0,                         // srcY
                FRAME_67_W,               // srcWidth: 326
                FRAME_67_H,               // srcHeight: 326
                this.x,                   // destX
                this.y,                   // destY
                this.w,                   // destWidth
                this.h                    // destHeight
            );
        }
    }

    // ==== PLATFORM CLASS ====
    class Platform {
        constructor(x, y, w, h, movePattern = null, speed = 50, range = 200, imageSrc = null, visible = true) {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
            this.movePattern = movePattern; // null, 'horizontal', 'vertical'
            this.moveTimer = 0;
            this.startX = x;
            this.startY = y;
            this.speed = speed;
            this.range = range;
            this.prevX = x; // Для отслеживания движения
            this.visible = visible; // Видимость платформы
            
            // Загрузка картинки если указана
            if (imageSrc) {
                this.image = new Image();
                this.image.src = imageSrc;
            } else {
                this.image = null;
            }
        }
        
        update(dt) {
            this.prevX = this.x; // Сохраняем предыдущую позицию
            
            if (this.movePattern === 'horizontal') {
                this.moveTimer += dt * this.speed / this.range;
                this.x = this.startX + Math.sin(this.moveTimer) * this.range;
            } else if (this.movePattern === 'vertical') {
                this.moveTimer += dt * this.speed / this.range;
                this.y = this.startY + Math.sin(this.moveTimer) * this.range;
            }
        }
        
        draw() {
            // Не рисуем если платформа невидима
            if (!this.visible) return;
            
            // Если есть загруженная картинка
            if (this.image && this.image.complete) {
                ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
            } else {
                // Запасной вариант - рисуем платформу с текстурой дерева
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.strokeStyle = '#654321';
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x, this.y, this.w, this.h);
                
                // Добавляем эмодзи текстуру
                const emojiSize = Math.min(this.h * 0.8, 20);
                ctx.font = `${emojiSize}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const numEmojis = Math.floor(this.w / (emojiSize * 1.5));
                for (let i = 0; i < numEmojis; i++) {
                    const ex = this.x + (i + 0.5) * (this.w / numEmojis);
                    ctx.fillText('🪵', ex, this.y + this.h / 2);
                }
            }
        }
    }

    // ---------- BULLETS ----------

    // ==== BULLET LOGIC ====
    /**
     * Создаёт пулю игрока с параметрами в зависимости от типа персонажа и бонусов
     * @param {Player} p - объект игрока
     */
    function shootPlayerBullet(p) {
        let r = 8, speed = 8, color = "#222";
        p.shooting = true;
        p.shootTimer = 0;
        p.frame = SHOOT_FRAME;

        let emoji;
        switch (p.type) {
            case "dron":
                r = 14; speed = 9; color = "#66ccff";
                emoji = '🌀';
                break;
            case "max":
                r = 8; speed = 8; color = "#222";
                emoji = '💩';
                break;
            case "kuzy":
                r = 18; speed = 5; color = "#333";
                emoji = '💦';
                break;
        }

        let isBonus = false;
        if (bonusMode && bonusShots > 0) {
            r *= 1.8;
            speed *= 1.8;
            color = "gold";
            bonusShots--;
            isBonus = true;
            // If we've just used the last bonus shot, automatically switch back to main weapon
            if (bonusShots <= 0) {
                bonusShots = 0;
                bonusMode = false;
            }
        }

        // Determine initial position and velocity based on current bullet direction
        let bx = p.x + p.w / 2;
        let by = p.y;
        let vx = 0, vy = 0;
        if (playerBulletDir === 'up') {
            bx = p.x + p.w / 2;
            by = p.y;
            vx = 0; vy = -speed;
        } else if (playerBulletDir === 'left') {
            bx = p.x; by = p.y + p.h / 2; vx = -speed; vy = 0;
        } else { // 'right'
            bx = p.x + p.w; by = p.y + p.h / 2; vx = speed; vy = 0;
        }

        // Бонусный выстрел Макса выпускает 3 пули с разными углами
        if (isBonus && p.type === 'max') {
            const angleSpread = 15 * Math.PI / 180; // 15 градусов в радианах
            const angles = [-angleSpread, 0, angleSpread]; // -15°, 0°, +15°
            
            angles.forEach(angle => {
                let vx_angled, vy_angled;
                if (playerBulletDir === 'up') {
                    // Для направления вверх: применяем угол относительно вертикали
                    vx_angled = speed * Math.sin(angle);
                    vy_angled = -speed * Math.cos(angle);
                } else if (playerBulletDir === 'left') {
                    // Для направления влево: применяем угол относительно горизонтали
                    vx_angled = -speed * Math.cos(angle);
                    vy_angled = -speed * Math.sin(angle);
                } else { // 'right'
                    // Для направления вправо: применяем угол относительно горизонтали
                    vx_angled = speed * Math.cos(angle);
                    vy_angled = speed * Math.sin(angle);
                }
                bullets.push({ x: bx, y: by, r, speed, color, vx: vx_angled, vy: vy_angled, emoji, dir: playerBulletDir, isBonus, rotation: 0, playerType: p.type, hitRadius: r * 2 });
            });
        } else {
            bullets.push({ x: bx, y: by, r, speed, color, vx, vy, emoji, dir: playerBulletDir, isBonus, rotation: 0, playerType: p.type, hitRadius: r * 2 });
        }
    }

    // ---------- PLATFORMS ----------

    /**
     * Инициализирует уровень с платформами для режима platforms
     */
    function initPlatformLevel() {
        platforms = [];
        
        // Все размеры и позиции в процентах от размера canvas для адаптивности
        const cw = canvas.width;
        const ch = canvas.height;
        
        // ========== ЗЕМЛЯ (НЕВИДИМАЯ) ==========
        // X: 0 (от левого края)
        // Y: 94% от верха (6% от низа)
        // Ширина: 100% экрана
        // Высота: 6% экрана
        // Движение: null (статичная)
        // Speed: 50 (не используется для статичных)
        // Range: 200 (не используется для статичных)
        // Текстура: null (без текстуры)
        // Видимость: false (невидимая, т.к. фон уже содержит землю)
        platforms.push(new Platform(cw * 0.07, ch * 0.35, cw*0.3, ch * 0.1, null, 50, 200, null, false));
        
        // ========== ЛЕВАЯ НИЖНЯЯ ПЛАТФОРМА ==========
        // X: 5% от ширины экрана
        // Y: 70% от верха (30% от низа)
        // Ширина: 30% от ширины экрана
        // Высота: 20% от высоты экрана
        // Движение: null (статичная)
        // Speed: 50 (не используется)
        // Range: 200 (не используется)
        // Текстура: img/platform2.png
        // Видимость: true (по умолчанию)
        platforms.push(new Platform(cw * 0.05, ch * 0.65, cw * 0.20, ch * 0.10, null, 100, 200, 'img/platform2.png'));
        
        // ========== ЦЕНТРАЛЬНАЯ ГОРИЗОНТАЛЬНАЯ ПЛАТФОРМА ==========
        // X: 40% от ширины (центр минус половина ширины платформы)
        // Y: 40% от верха
        // Ширина: 30% от ширины экрана
        // Высота: 20% от высоты экрана
        // Движение: 'horizontal' (влево-вправо)
        // Speed: 50 (скорость колебаний)
        // Range: 12% от ширины экрана (амплитуда движения)
        // Текстура: img/platform3.png
        // Видимость: true (по умолчанию)
        platforms.push(new Platform(cw * 0.150, ch * 0.20, cw * 0.20, ch * 0.15, 'horizontal', 50, cw * 0.12, 'img/platform3.png'));
        
        // ========== ПРАВАЯ ВЕРХНЯЯ ВЕРТИКАЛЬНАЯ ПЛАТФОРМА ==========
        // X: 80% от ширины экрана
        // Y: 15% от верха
        // Ширина: 15% от ширины экрана
        // Высота: 11% от высоты экрана
        // Движение: 'vertical' (вверх-вниз)
        // Speed: 40 (скорость колебаний)
        // Range: 12% от высоты экрана (амплитуда движения)
        // Текстура: img/platform4.png
        // Видимость: true (по умолчанию)
        platforms.push(new Platform(cw * 0.80, ch * 0.75, cw * 0.15, ch * 0.11, 'vertical', 40, ch * 0.12, 'img/platform4.png'));
        
        // ========== ЛЕВАЯ ВЕРХНЯЯ ГОРИЗОНТАЛЬНАЯ ПЛАТФОРМА ==========
        // X: 20% от ширины экрана
        // Y: 20% от верха
        // Ширина: 15% от ширины экрана
        // Высота: 11% от высоты экрана
        // Движение: 'horizontal' (влево-вправо)
        // Speed: 180 (быстрые колебания)
        // Range: 50% от высоты экрана (большая амплитуда)
        // Текстура: img/platform5.png
        // Видимость: true (по умолчанию)
        platforms.push(new Platform(cw * 0.20, ch * 0.20, cw * 0.15, ch * 0.11, 'horizontal', 180, ch * 0.50, 'img/platform5.png'));
         platforms.push(new Platform(cw * 0.82, ch * 0.13, cw * 0.15, ch * 0.11, null, 180, ch * 0.50, 'img/platform8.png'));
    }

    /**
     * Спавнит врагов на платформах для режима platforms
     */
    function spawnEnemiesOnPlatforms() {
        const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
        enemies = [];
        
        // Берем только средние и верхние платформы (не землю)
        const spawnPlatforms = platforms.filter((p, i) => i > 0 && i < platforms.length - 1);
        
        spawnPlatforms.forEach(plat => {
            // На каждой платформе 1-2 врага
            const numEnemies = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numEnemies; i++) {
                const flowers = [];
                for (let j = 0; j < 18; j++) {
                    const angle = Math.PI * 2 * Math.random();
                    const rad = 0.18 + Math.random() * 0.18;
                    const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
                    const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
                    const sizeK = 0.5 + Math.random()*0.5;
                    const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
                    flowers.push({relX, relY, rad, sizeK, color});
                }
                
                const enemyW = canvas.height * ENEMY_WIDTH_RATIO;
                const enemyH = canvas.height * ENEMY_HEIGHT_RATIO;
                const spacing = plat.w / (numEnemies + 1);
                const ex = plat.x + spacing * (i + 1) - enemyW / 2;
                const ey = plat.y - enemyH - 5;
                
                enemies.push({
                    x: ex,
                    y: ey,
                    w: enemyW,
                    h: enemyH,
                    dir: 1,
                    diving: false,
                    targetX: 0,
                    shootTimer: 0,
                    flowers,
                    platformIndex: platforms.indexOf(plat) // запоминаем платформу
                });
            }
        });
    }

    // ---------- ENEMIES ----------

    // ==== ENEMY LOGIC ====
    /**
     * Генерирует массив врагов в виде сетки
     */
    function spawnEnemies() {
        const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
        enemies = [];
        for (let r = 0; r < ENEMY_ROWS; r++) {
            for (let c = 0; c < ENEMY_COLS; c++) {
                // Генерируем массив кружков для грозди сирени
                const flowers = [];
                for (let i = 0; i < 18; i++) {
                    const angle = Math.PI * 2 * Math.random();
                    const rad = 0.18 + Math.random() * 0.18;
                    const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
                    const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
                    const sizeK = 0.5 + Math.random()*0.5;
                    const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
                    flowers.push({relX, relY, rad, sizeK, color});
                }
                enemies.push({
                    x: 100 + c * ENEMY_X_SPACING,
                    y: ENEMY_START_Y + r * ENEMY_Y_SPACING,
                    w: canvas.height * ENEMY_WIDTH_RATIO,
                    h: canvas.height * ENEMY_HEIGHT_RATIO,
                    dir: 1,
                    diving: false,
                    targetX: 0,
                    shootTimer: 0,
                    flowers
                });
            }
        }
    }


    // ==== ENEMY DRAWING ====
    /**
     * Рисует врага в виде цветка сирени
     * @param {number} x - координата X центра
     * @param {number} y - координата Y центра
     * @param {number} size - размер врага
     */
    /**
     * Рисует врага в виде детализированной ветки сирени
     * @param {number} x - координата X центра
     * @param {number} y - координата Y центра
     * @param {number} size - размер врага
     */
    function drawLilac(x, y, size, flowers) {
        // Стебель
        ctx.save();
        ctx.strokeStyle = "#388e3c";
        ctx.lineWidth = size * 0.08;
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.1);
        ctx.lineTo(x, y + size * 0.6);
        ctx.stroke();

        // Веточки
        ctx.lineWidth = size * 0.04;
        for (let a = -0.7; a <= 0.7; a += 0.7) {
            ctx.beginPath();
            ctx.moveTo(x, y + size * 0.3);
            ctx.lineTo(x + Math.sin(a) * size * 0.25, y + size * 0.5);
            ctx.stroke();
        }

        // Гроздь сирени (кружки из массива flowers)
        for (const f of flowers) {
            ctx.beginPath();
            ctx.arc(x + f.relX * size, y + f.relY * size, f.rad * size * f.sizeK, 0, Math.PI * 2);
            ctx.fillStyle = f.color;
            ctx.globalAlpha = 0.85;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // ---------- HELPERS ----------

    // ==== COLLISION DETECTION ====
    /**
     * Проверяет пересечение двух прямоугольников (коллизия)
     * @param {object} a - первый объект с x, y, w, h
     * @param {object} b - второй объект с x, y, w, h
     * @returns {boolean} true если объекты пересекаются
     */
    function rect(a, b) {
        return a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y;
    }

    // ---------- GAME LOOP ----------

    // ==== GAME UPDATE ====
    /**
     * Главная функция обновления состояния игры: движение, столкновения, очки, бонусы
     * @param {number} dt - дельта времени в секундах
     */
    function update(dt) {
        if (invuln > 0) invuln -= dt;
        
        // Обновляем платформы в режиме platforms
        if (gameMode === 'platforms') {
            platforms.forEach(p => p.update(dt));
        }
        
        player.update(dt);

        // Обновляем врага 67 (если есть)
        if (enemy67) {
            enemy67.update(dt);
        }

        // Обновляем падение таблички Букин (если есть)
        if (bukinTablet && !bukinTablet.landed) {
            // вычисляем текущие размеры с сохранением пропорций, если изображение загружено
            let curW = bukinTablet.desiredW;
            let curH = bukinTablet.desiredW; // запасной вариант
            if (bukinImgReady && bukinImg.width > 0) {
                curH = curW * (bukinImg.height / bukinImg.width);
            }
            // Падаем вниз (изменяем центр Y)
            bukinTablet.cy += 8;
            // Сдвигаемся по горизонтали к целевому центру
            bukinTablet.cx += (bukinTablet.targetCx - bukinTablet.cx) * 0.12;
            // Останавливаем падение на уровне, рассчитанном по самой нижней точке, которой может достичь игрок
            const playerMaxBottom = canvas.height - 20; // player's lowest bottom (initial spawn bottom)
            const landCy = playerMaxBottom - 10 - curH / 2; // center Y so bottom is ~10px above player's lowest bottom
            if (bukinTablet.cy >= landCy) {
                bukinTablet.cy = landCy;
                bukinTablet.cx = bukinTablet.targetCx;
                bukinTablet.landed = true;
                // Показываем экран завершения уровня, если ещё не показан
                if (!levelCompleteShown) {
                    showLevelComplete();
                    levelCompleteShown = true;
                }
            }
        }

        // Обновляем падение таблички Букин (если есть)
        if (bukinTablet && !bukinTablet.landed) {
            // Падаем вниз
            bukinTablet.y += 8;
            // Сдвигаемся по горизонтали к цели (рядом с игроком)
            bukinTablet.x += (bukinTablet.targetX - bukinTablet.x) * 0.12;
            // Останавливаем падение на уровне, рассчитанном по самой нижней точке, которой может достичь игрок
            const playerMaxBottom2 = canvas.height - 20;
            const landY = playerMaxBottom2 - 10 - bukinTablet.h; // top Y so bottom is ~10px above player's lowest bottom
            if (bukinTablet.y >= landY) {
                bukinTablet.y = landY;
                bukinTablet.x = bukinTablet.targetX;
                bukinTablet.landed = true;
            }
        }

        // Обновляем облачки с текстом
        speechBalloons = speechBalloons.filter(sb => {
            sb.timer += dt;
            const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
            return sb.timer < dur;
        });

        // Обновляем анимации взрывов
        explosions = explosions.filter(ex => {
            ex.timer += dt;
            return ex.timer < 0.5;
        });

        bullets.forEach(b => {
            if (typeof b.vx === 'number' && typeof b.vy === 'number') {
                b.x += b.vx;
                b.y += b.vy;
            } else {
                b.y -= b.speed;
            }
            // Вращаем пулю Дрона
            if (b.playerType === 'dron' && typeof b.rotation === 'number') {
                b.rotation += 0.3; // скорость вращения
            }
            // Вращаем пулю Макса
            if (b.playerType === 'max' && typeof b.rotation === 'number') {
                b.rotation += 0.3; // скорость вращения
            }
        });
        // Move enemy bullets using their velocity if provided (supports homing)
        enemyBullets.forEach(b => {
            if (typeof b.vx === 'number' && typeof b.vy === 'number') {
                b.x += b.vx;
                b.y += b.vy;
            } else {
                b.y += 4;
            }
        });
        bottles.forEach(b => {
            b.y += 2;
            b.x += Math.sin(b.y / 20) * 1.5;
        });

        // Keep bullets while within a reasonable extended bounds
        bullets = bullets.filter(b => b.x >= -100 && b.x <= canvas.width + 100 && b.y >= -100 && b.y <= canvas.height + 100);
        enemyBullets = enemyBullets.filter(b => b.y < canvas.height);
        bottles = bottles.filter(b => b.y < canvas.height);
        hearts.forEach(h => {
            h.y += 2;
            h.x += Math.sin(h.y / 20) * 1.5;
        });
        hearts = hearts.filter(h => h.y < canvas.height);

        const leafEmojis = ["🍃", "🍂", "🍁", "🌿", "🌱"];

        // SURVIVAL MODE: spawn new wave if enemies < 12
        if (gameMode === 'survival' && enemies.length < 12 && !survivalWaveSpawning) {
            survivalWaveSpawning = true;
            scheduleWave(canvas.width / 2, ENEMY_START_Y, 12, 1000);
            // Сбросим флаг через 12 секунд (время появления всех врагов)
            setTimeout(() => {
                survivalWaveSpawning = false;
            }, 12000);
        }

        // BOSS LOGIC
        if (gameMode !== 'survival' && gameMode !== '67' && gameMode !== 'platforms' && !boss && !bossDefeated && enemies.length === 0) {
            // Создаем босса-сосиску после уничтожения всех врагов
            const baseSize = canvas.height * 0.08;
            boss = {
                x: canvas.width / 2,
                y: -baseSize * 5,
                w: baseSize * 5,
                h: baseSize * 5,
                dir: 1,
                shootTimer: 0,
                hp: 11,
                angle: 0,
                angleSpeed: 0.04 + Math.random()*0.04,
                centered: false
            };
            // Ensure player is not considered immune until boss is actually defeated
            bossDefeated = false;
        }

        if (boss) {
            // Если босс ещё не в центре — плавно двигаем его туда и не выполняем активную логику
            if (!boss.centered) {
                const targetX = canvas.width / 2 - boss.w / 2;
                const targetY = 60;
                boss.x += (targetX - boss.x) * 0.08;
                boss.y += (targetY - boss.y) * 0.08;
                if (Math.abs(boss.x - targetX) < 2 && Math.abs(boss.y - targetY) < 2) {
                    boss.x = targetX;
                    boss.y = targetY;
                    boss.centered = true;
                }
            } else {
                // Покачивание
                boss.angle += boss.angleSpeed;
                boss.x += Math.sin(boss.angle) * 2;
                // Движение по экрану
                boss.x += boss.dir * 1.2;
                if (boss.x < 0 || boss.x + boss.w > canvas.width) {
                    boss.dir *= -1;
                }
                // Стрельба в 3 раза чаще
                boss.shootTimer += dt;
                // Increase firing frequency (approx. 2x) and make bullets slightly home towards player
                if (Math.random() < 0.03 && boss.shootTimer > 0.16) {
                    boss.shootTimer = 0;
                    for (let i = 0; i < 3; i++) {
                        const emojiIdx = Math.floor(Math.random() * leafEmojis.length);
                        const bx = boss.x + boss.w / 2 + (i - 1) * 30;
                        const by = boss.y + boss.h;
                        const px = player.x + player.w / 2;
                        const py = player.y + player.h / 2;
                        const dx = px - bx;
                        const dy = py - by;
                        const dist = Math.max(1, Math.hypot(dx, dy));
                        const speed = 5.0;
                        // Homing: stronger for boss bullets
                        const homing = 0.45;
                        const vx = (dx / dist) * speed * homing;
                        const vy = (dy / dist) * speed * 0.95;
                        enemyBullets.push({ x: bx, y: by, w: 16, h: 24, emoji: leafEmojis[emojiIdx], vx, vy });
                    }
                }
            }
        }
        enemies.forEach(e => {
            if (!e.diving) {
                e.x += e.dir * (1.2 + survivalEnemySpeedIncrease);
                if (e.x < 0 || e.x + e.w > canvas.width) {
                    e.dir *= -1;
                    e.y += 20;
                }
                if (Math.random() < 0.002) {
                    e.diving = true;
                    e.targetX = player.x + player.w / 2;
                }
            } else {
                e.y += 4;
                e.x += (e.targetX - e.x) * 0.02;
                // Теперь враг летит чуть ниже игрока, чтобы мог столкнуться
                if (e.y > player.y + player.h * 0.5) {
                    e.diving = false;
                    e.y = ENEMY_START_Y;
                }
            }

            e.shootTimer += dt;
            if (Math.random() < 0.004 && e.shootTimer > 0.9) {
                e.shootTimer = 0;
                const bx = e.x + e.w / 2;
                const by = e.y + e.h;
                const px = player.x + player.w / 2;
                const py = player.y + player.h / 2;
                const dx = px - bx;
                const dy = py - by;
                const dist = Math.max(1, Math.hypot(dx, dy));
                const speed = 4.0 + survivalBulletSpeedIncrease;
                const homing = 0.18; // gentle homing for normal enemies
                
                // Выпускаем несколько пуль в зависимости от survivalBulletMultiplier
                for (let i = 0; i < survivalBulletMultiplier; i++) {
                    // Назначаем случайный эмодзи-листик при создании пули
                    const emojiIdx = Math.floor(Math.random() * leafEmojis.length);
                    // Небольшой разброс для множественных пуль
                    const spreadAngle = (i - (survivalBulletMultiplier - 1) / 2) * 0.15;
                    const angle = Math.atan2(dy, dx) + spreadAngle;
                    const vx = Math.cos(angle) * speed * homing;
                    const vy = Math.sin(angle) * speed * 0.9;
                    enemyBullets.push({ x: bx, y: by, w: 8, h: 12, emoji: leafEmojis[emojiIdx], vx, vy });
                }
            }
        });

        // Bullet vs enemy/boss bullets collisions: player bullets can destroy enemy bullets
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            const b = bullets[bi];
            for (let ebi = enemyBullets.length - 1; ebi >= 0; ebi--) {
                const eb = enemyBullets[ebi];
                const ew = eb.w || 8;
                const eh = eb.h || 12;
                const hr = b.hitRadius || (b.r * 2);
                // simple circle-rect overlap check (approx)
                if (b.x > eb.x - hr && b.x < eb.x + ew + hr && b.y > eb.y - hr && b.y < eb.y + eh + hr) {
                    // smaller explosion when bullets collide
                    const cx = (b.x + (eb.x + ew / 2)) / 2;
                    const cy = (b.y + (eb.y + eh / 2)) / 2;
                    explosions.push({ x: cx, y: cy, timer: 0, scale: 0.5 });
                    // Бонусная пуля Дрона не исчезает и продолжает лететь
                    if (!(b.isBonus && player.type === 'dron')) {
                        bullets.splice(bi, 1);
                    }
                    enemyBullets.splice(ebi, 1);
                    // +1 point for destroying an enemy bullet with player's bullet
                    score += 1;
                    
                    // Бонусный выстрел Кузи уничтожает 3 ближайших пули врагов
                    if (b.isBonus && player.type === 'kuzy' && enemyBullets.length > 0) {
                        const hitX = cx;
                        const hitY = cy;
                        
                        // Создаем массив пуль с расстояниями
                        const bulletsWithDist = enemyBullets.map((bullet, idx) => {
                            const bulletCx = bullet.x + (bullet.w || 8) / 2;
                            const bulletCy = bullet.y + (bullet.h || 12) / 2;
                            const dx = bulletCx - hitX;
                            const dy = bulletCy - hitY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            return { bullet, idx, dist, cx: bulletCx, cy: bulletCy };
                        });
                        
                        // Сортируем по расстоянию и берем 3 ближайших
                        bulletsWithDist.sort((a, b) => a.dist - b.dist);
                        const toDestroy = bulletsWithDist.slice(0, 3);
                        
                        // Уничтожаем от конца к началу чтобы индексы не сбивались
                        toDestroy.sort((a, b) => b.idx - a.idx);
                        toDestroy.forEach(item => {
                            explosions.push({ x: item.cx, y: item.cy, timer: 0, scale: 0.5 });
                            enemyBullets.splice(item.idx, 1);
                            score += 1;
                        });
                    }
                    
                    // Бонусная пуля Дрона продолжает лететь, не прерываем цикл
                    if (b.isBonus && player.type === 'dron') {
                        continue;
                    }
                    
                    break;
                }
            }
        }

        // Bullet hits enemy
        /**
         * Проверяет попадание пули по врагу и вызывает выпадение бонуса через trySpawnBonus
         */
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            const b = bullets[bi];
            
            // Проверка попадания по enemy67
            if (enemy67 && enemy67.hp > 0) {
                if (b.x > enemy67.x && b.x < enemy67.x + enemy67.w && b.y > enemy67.y && b.y < enemy67.y + enemy67.h) {
                    // Бонусный выстрел Кузи наносит 2 урона
                    const damage = (b.isBonus && player.type === 'kuzy') ? 2 : 1;
                    enemy67.hp -= damage;
                    // Бонусная пуля Дрона не исчезает и продолжает лететь
                    if (!(b.isBonus && player.type === 'dron')) {
                        bullets.splice(bi, 1);
                    }
                    score += 5;
                    // Маленький взрыв при попадании
                    explosions.push({ x: b.x, y: b.y, timer: 0 });
                    
                    if (enemy67.hp <= 0) {
                        // Большой взрыв размером с врага
                        explosions.push({ 
                            x: enemy67.x + enemy67.w / 2, 
                            y: enemy67.y + enemy67.h / 2, 
                            timer: 0,
                            size: enemy67.w * 0.8 // размер взрыва как размер врага
                        });
                        // Показываем экран победы по аналогии с боссом
                        enemy67 = null;
                        if (!levelCompleteShown) {
                            showLevelComplete();
                            levelCompleteShown = true;
                        }
                    }
                    continue;
                }
            }
            
            if (!boss) {
                // Используем обратный цикл для безопасного удаления при итерации
                for (let ei = enemies.length - 1; ei >= 0; ei--) {
                    const e = enemies[ei];
                    if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                        // Взрыв на месте врага
                        explosions.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, timer: 0 });
                        enemies.splice(ei, 1);
                        // survival: increment kill count and trigger speedups
                        if (gameMode === 'survival') {
                            killCount++;
                            // every 20 kills double the bullet count up to 10 times (max 1024 bullets)
                            if (killCount % 20 === 0 && survivalBulletMultiplier < 1024) {
                                survivalBulletMultiplier *= 1.2;
                            }
                            // every 30 kills increase enemy/bullet speed up to 10 times
                            if (killCount % 30 === 0 && survivalSpeedUps < 10) {
                                survivalEnemySpeedIncrease += 1;
                                survivalBulletSpeedIncrease += 1;
                                survivalSpeedUps += 1;
                            }
                        }
                        // Бонусная пуля Дрона не исчезает и продолжает лететь
                        if (!(b.isBonus && player.type === 'dron')) {
                            bullets.splice(bi, 1);
                        }
                        score += 2;
                        combo++;
                        // Выпадение бонуса по обычному шансу
                        trySpawnBonus(e.x, e.y);
                        // Выпадение сердечка по обычному шансу
                        trySpawnHeart(e.x, e.y);
                        // Гарантированное выпадение бонуса при 5 комбо подряд
                        if (combo > 0 && combo % 5 === 0) {
                            bottles.push({ x: e.x, y: e.y, w: 18, h: 36 });
                        }
                        
                        // Бонусный выстрел Кузи убивает еще одного ближайшего врага
                        if (b.isBonus && player.type === 'kuzy' && enemies.length > 0) {
                            let nearestEnemy = null;
                            let nearestDist = Infinity;
                            const hitX = e.x + e.w / 2;
                            const hitY = e.y + e.h / 2;
                            
                            for (let j = 0; j < enemies.length; j++) {
                                const enemy = enemies[j];
                                const dx = (enemy.x + enemy.w / 2) - hitX;
                                const dy = (enemy.y + enemy.h / 2) - hitY;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist < nearestDist) {
                                    nearestDist = dist;
                                    nearestEnemy = { enemy, idx: j };
                                }
                            }
                            
                            if (nearestEnemy) {
                                const ne = nearestEnemy.enemy;
                                // Взрыв на месте второго врага
                                explosions.push({ x: ne.x + ne.w / 2, y: ne.y + ne.h / 2, timer: 0 });
                                enemies.splice(nearestEnemy.idx, 1);
                                score += 2;
                                combo++;
                                trySpawnBonus(ne.x, ne.y);
                                trySpawnHeart(ne.x, ne.y);
                            }
                        }
                        break; // Пуля может убить только одного врага за раз
                    }
                }
            } else {
                // Попадание по боссу-сосиске
                if (b.x > boss.x && b.x < boss.x + boss.w && b.y > boss.y && b.y < boss.y + boss.h && boss.hp > 0) {
                    // Бонусный выстрел Кузи наносит 2 урона
                    const damage = (b.isBonus && player.type === 'kuzy') ? 2 : 1;
                    boss.hp -= damage;
                    // +3 points per hit on boss
                    score += 3;
                    explosions.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, timer: 0 });
                    // Удаляем пулю после попадания (даже бонусную пулю Дрона, чтобы избежать множественных ударов)
                    bullets.splice(bi, 1);
                    if (boss.hp <= 0) {
                        // Boss death bonus
                        // Mark boss as defeated so remaining enemy bullets no longer damage the player
                        bossDefeated = true;
                        score += 20;
                        combo++;
                            // Взрыв босса
                            explosions.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, timer: 0 });
                            // Создаём табличку Букин, она упадёт рядом с игроком (сохраняем центр и желаемую ширину)
                            const desiredW = boss.w / 2;
                            // Выбираем сторону (лево/право) по доступному месту
                            const leftCenter = player.x - desiredW - 10 + desiredW / 2;
                            const rightCenter = player.x + player.w + 10 + desiredW / 2;
                            let targetCx = leftCenter;
                            if (leftCenter < desiredW / 2 && rightCenter + desiredW / 2 <= canvas.width) {
                                targetCx = rightCenter;
                            } else if (rightCenter + desiredW / 2 > canvas.width && leftCenter >= desiredW / 2) {
                                targetCx = leftCenter;
                            }
                            bukinTablet = {
                                cx: boss.x + boss.w / 2,
                                cy: boss.y + boss.h / 2,
                                desiredW,
                                targetCx,
                                landed: false
                            };
                            // Добавляем облачко у игрока: не блокирует падение таблички, длится 5 секунд
                            speechBalloons.push({
                                x: player.x + player.w / 2,
                                y: player.y - player.h * 0.15,
                                timer: 0,
                                duration: 5.0,
                                text: "Хуем Пам-Пам!!",
                                type: 'buk'
                            });
                            boss = null;
                    }
                }
            }
        }

        /**
         * Пытается создать бонус (бутылку) с определённым шансом
         * @param {number} x - координата X врага
         * @param {number} y - координата Y врага
         */
        function trySpawnBonus(x, y) {
            const BONUS_CHANCE = 0.1; // 10% шанс
            if (Math.random() < BONUS_CHANCE) {
                bottles.push({ x, y, w: 18, h: 36 });
            }
        }

        /**
         * Пытается создать сердечко с определённым шансом
         * @param {number} x - координата X врага
         * @param {number} y - координата Y врага
         */
        function trySpawnHeart(x, y) {
            const HEART_CHANCE = 0.08; // 8% шанс
            if (Math.random() < HEART_CHANCE) {
                hearts.push({ x, y, w: 48, h: 48 });
            }
        }

        // Spawn a single enemy at approx given center coordinates
        function spawnEnemyAt(cx, cy) {
            const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
            const flowers = [];
            for (let i = 0; i < 18; i++) {
                const angle = Math.PI * 2 * Math.random();
                const rad = 0.18 + Math.random() * 0.18;
                const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
                const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
                const sizeK = 0.5 + Math.random()*0.5;
                const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
                flowers.push({relX, relY, rad, sizeK, color});
            }
            const w = canvas.height * ENEMY_WIDTH_RATIO;
            const h = canvas.height * ENEMY_HEIGHT_RATIO;
            enemies.push({ x: cx - w/2, y: cy - h/2, w, h, dir: 1, diving: false, targetX: 0, shootTimer: 0, flowers });
        }

        function scheduleWave(cx, cy, count, intervalMs) {
            // If it's a large wave (e.g., 12), spawn them in a horizontal formation across the playfield
            if (count >= 12) {
                const spacing = canvas.width / (count + 1);
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        const rx = spacing * (i + 1);
                        const ry = ENEMY_START_Y + (Math.random() - 0.5) * 20;
                        spawnEnemyAt(rx, ry);
                    }, i * intervalMs);
                }
                return;
            }
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    // slight random offset so they don't stack exactly
                    const rx = cx + (Math.random() - 0.5) * 60;
                    const ry = cy + (Math.random() - 0.5) * 40;
                    spawnEnemyAt(rx, ry);
                }, i * intervalMs);
            }
        }

        // Player collects bottle
        bottles.forEach((b, bi) => {
            if (rect(b, player)) {
                bonusShots += BONUS_SHOTS_PER_BOTTLE;
                bottles.splice(bi, 1);
            }
        });

        // Player collects heart
        hearts.forEach((h, hi) => {
            if (rect(h, player)) {
                if (lives < PLAYER_LIVES) {
                    lives++; // +1 жизнь если не максимум
                } else {
                    bonusShots += 5; // +5 бонусных выстрелов если максимум жизней
                }
                hearts.splice(hi, 1);
            }
        });

        // Enemy bullet hits player
        enemyBullets.forEach((eb, ei) => {
            // After boss is defeated, remaining enemy bullets no longer damage the player
            if (bossDefeated) return;
            if (rect(eb, player) && invuln <= 0) {
                lives--;
                combo = 0;
                invuln = 1;
                // Добавляем взрыв
                explosions.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, timer: 0 });
                // Добавляем облачко с текстом
                // Облачко слева от игрока
                speechBalloons.push({ x: player.x - player.w * 0.25, y: player.y + player.h * 0.25, timer: 0 });
                enemyBullets.splice(ei, 1);
                if (lives <= 0) {
                    showGameOver();
                }
            }
        });

        // Enemy collides with player
        enemies.forEach((e) => {
            // Проверяем столкновение по прямоугольникам
            if (
                rect(
                    { x: e.x, y: e.y, w: e.w, h: e.h },
                    { x: player.x, y: player.y, w: player.w, h: player.h }
                ) && invuln <= 0
            ) {
                lives--;
                combo = 0;
                invuln = 1;
                // Добавляем взрыв
                explosions.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, timer: 0 });
                // Добавляем облачко с текстом
                // Облачко слева от игрока
                speechBalloons.push({ x: player.x - player.w * 0.25, y: player.y + player.h * 0.25, timer: 0 });
                    if (lives <= 0) {
                        showGameOver();
                    }
            }
        });

        const hudEl = document.getElementById('hud');
        if (hudEl) {
            const dirIcon = playerBulletDir === 'up' ? '↑' : (playerBulletDir === 'left' ? '←' : '→');
            const playerName = charNames[selectedChar] || selectedChar;
            const modeIndicator = altShootMode ? '<span style="color:orange">🔫ALT</span>' : '';
            if (bonusMode && bonusShots > 0) {
                hudEl.innerHTML = `${playerName} | Жизни: ${"❤️".repeat(lives)}<br>Очки: ${score}   Комбо: ${combo}   <span style="color:black">Бонус: ${bonusShots}</span>   Пули: ${dirIcon} ${modeIndicator}`;
            } else {
                hudEl.innerHTML = `${playerName} | Жизни: ${"❤️".repeat(lives)}<br>Очки: ${score}   Комбо: ${combo}   Бонус: ${bonusShots}   Пули: ${dirIcon} ${modeIndicator}`;
            }
        }
    }


    // ==== GAME DRAW ====
    /**
     * Главная функция отрисовки всех игровых объектов и фона
     */
    function draw() {
        // Рисуем адаптивный фон
        if (bgReady) {
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#a2c9e2"; // Нежно голубой фон
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Рисуем платформы в режиме platforms
        if (gameMode === 'platforms') {
            platforms.forEach(p => p.draw());
        }

        // Рисуем табличку Букин позади игрока (если есть)
        if (bukinTablet) {
            if (bukinImgReady && bukinImg.width > 0) {
                const curW = bukinTablet.desiredW;
                const curH = curW * (bukinImg.height / bukinImg.width);
                const drawX = bukinTablet.cx - curW / 2;
                const drawY = bukinTablet.cy - curH / 2;
                ctx.save();
                ctx.drawImage(bukinImg, drawX, drawY, curW, curH);
                ctx.restore();
            } else {
                // Пока картинка не загружена — рисуем серый прямоугольник
                const curW = bukinTablet.desiredW;
                const curH = boss ? boss.h / 3 : curW;
                const drawX = bukinTablet.cx - curW / 2;
                const drawY = bukinTablet.cy - curH / 2;
                ctx.save();
                ctx.fillStyle = '#888';
                ctx.fillRect(drawX, drawY, curW, curH);
                ctx.restore();
            }
        }

        // Визуальная индикация неуязвимости (мигание)
        if (invuln > 0) {
            const blinkSpeed = 16; // 16 миганий в секунду
            if (Math.floor(invuln * blinkSpeed) % 2 === 0) {
                ctx.globalAlpha = 0.3; // Полупрозрачный
            }
        }
        player.draw();
        ctx.globalAlpha = 1; // Восстановить прозрачность

        bullets.forEach(b => {
            if (b.emoji) {
                ctx.save();
                const size = Math.max(16, b.r * 2);
                ctx.font = `${size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // rotate according to bullet direction
                let angle = 0;
                if (b.dir === 'up') angle = -Math.PI / 2;
                else if (b.dir === 'left') angle = Math.PI;
                else angle = 0; // right
                
                ctx.translate(b.x, b.y);
                ctx.rotate(angle);
                
                // Дополнительное вращение для пули Дрона
                if (b.playerType === 'dron' && typeof b.rotation === 'number') {
                    ctx.rotate(b.rotation);
                }
                // Дополнительное вращение для пули Макса
                if (b.playerType === 'max' && typeof b.rotation === 'number') {
                    ctx.rotate(b.rotation);
                }
                
                ctx.fillText(b.emoji, 0, 0);
                ctx.restore();
            } else {
                ctx.fillStyle = b.color;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Отрисовываем пули врагов с их индивидуальным эмодзи-листиком
        enemyBullets.forEach(b => {
            ctx.font = `${b.h * 2.4}px serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(b.emoji || "🍃", b.x, b.y);
        });

        bottles.forEach(b => {
            ctx.font = `${b.h}px serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText("🍺", b.x, b.y);
        });

        hearts.forEach(h => {
            ctx.font = `${h.h}px serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText("❤️", h.x, h.y);
        });

        enemies.forEach(e => {
            drawLilac(e.x + e.w / 2, e.y + e.h / 2, e.w, e.flowers);
        });

        // Отрисовываем врага 67
        if (enemy67) {
            enemy67.draw();
        }

        // Рисуем босса-сосиску
        if (boss) {
            ctx.save();
            ctx.font = `${boss.h}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.globalAlpha = 1;
            ctx.fillText("🌭", boss.x + boss.w / 2, boss.y + boss.h / 2);
            // HP bar
            ctx.fillStyle = "#fff";
            ctx.fillRect(boss.x, boss.y - 18, boss.w, 12);
            ctx.fillStyle = "#e53935";
            ctx.fillRect(boss.x, boss.y - 18, boss.w * (boss.hp / 11), 12);
            ctx.strokeStyle = "#222";
            ctx.strokeRect(boss.x, boss.y - 18, boss.w, 12);
            ctx.restore();
        }

        // Рисуем взрывы
        explosions.forEach(ex => {
            ctx.save();
            const scale = ex.scale || 1;
            // Если указан размер, используем его, иначе стандартный
            const baseSize = ex.size || 60;
            ctx.font = `${(baseSize + ex.timer * baseSize) * scale}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.globalAlpha = 1 - ex.timer * 2;
            ctx.fillText("💥", ex.x, ex.y);
            ctx.restore();
        });

        // Рисуем облачки с текстом
        speechBalloons.forEach(sb => {
            ctx.save();
            const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
            ctx.globalAlpha = Math.max(0, 1 - sb.timer / dur);
            const text = (typeof sb.text === 'string') ? sb.text : 'Сука';

            if (sb.type === 'buk') {
                // Adaptive rectangular bubble with tail (different style)
                let fontSize = 36 * (sb.scale || 1);
                ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
                const maxWidth = canvas.width * 0.5;
                let textWidth = ctx.measureText(text).width;
                while (textWidth > maxWidth && fontSize > 10) {
                    fontSize -= 2;
                    ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
                    textWidth = ctx.measureText(text).width;
                }

                const paddingX = 18 * (sb.scale || 1);
                const paddingY = 10 * (sb.scale || 1);
                const boxW = Math.ceil(textWidth + paddingX * 2);
                const boxH = Math.ceil(fontSize + paddingY * 2);
                const left = sb.x - boxW / 2;
                const top = sb.y - boxH / 2;
                const r = Math.min(14, boxH / 2);

                // Rounded rect
                ctx.beginPath();
                ctx.moveTo(left + r, top);
                ctx.lineTo(left + boxW - r, top);
                ctx.quadraticCurveTo(left + boxW, top, left + boxW, top + r);
                ctx.lineTo(left + boxW, top + boxH - r);
                ctx.quadraticCurveTo(left + boxW, top + boxH, left + boxW - r, top + boxH);
                ctx.lineTo(left + r, top + boxH);
                ctx.quadraticCurveTo(left, top + boxH, left, top + boxH - r);
                ctx.lineTo(left, top + r);
                ctx.quadraticCurveTo(left, top, left + r, top);

                // Tail pointing down towards player
                const tailW = Math.min(28, boxW * 0.28);
                const tailX = sb.x; // center tail at sb.x
                const tailY = top + boxH;
                ctx.moveTo(tailX - tailW / 2, tailY);
                ctx.lineTo(tailX, tailY + 18 * (sb.scale || 1));
                ctx.lineTo(tailX + tailW / 2, tailY);

                ctx.closePath();
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#bbb';
                ctx.lineWidth = 3;
                ctx.fill();
                ctx.stroke();

                // Text
                ctx.fillStyle = '#222';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
                ctx.fillText(text, sb.x, sb.y - 2);

            } else {
                // Original 'Сука' oval style, but use sb.text if provided
                // sizes are fixed for this style
                ctx.beginPath();
                ctx.ellipse(sb.x, sb.y, 70, 40, Math.PI * 0.05, 0, Math.PI * 2);
                ctx.moveTo(sb.x + 40, sb.y + 10);
                ctx.ellipse(sb.x + 40, sb.y + 10, 18, 12, Math.PI * 0.1, 0, Math.PI * 2);
                ctx.moveTo(sb.x - 40, sb.y + 10);
                ctx.ellipse(sb.x - 40, sb.y + 10, 18, 12, Math.PI * 0.1, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#bbb';
                ctx.lineWidth = 3;
                ctx.fill();
                ctx.stroke();
                // Text
                ctx.font = 'bold 32px Comic Sans MS, Arial';
                ctx.fillStyle = '#222';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, sb.x, sb.y);
            }

            ctx.restore();
        });

        // (табличка теперь рисуется позади игрока)
    }


    // ==== MAIN GAME LOOP ====
    let last = 0;
    let running = false;
    let paused = false;
    let levelCompleteShown = false;
    let gameOverShown = false;
    /**
     * Главный игровой цикл: обновляет и рисует игру, вызывает сам себя через requestAnimationFrame
     * @param {number} ts - текущее время (timestamp)
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


    // ==== INPUT HANDLING ====
    /**
     * Обработчик нажатия клавиш: управление движением, стрельбой и бонус-режимом
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
            // If currently in bonus mode, toggle off; otherwise only toggle on when we have bonus shots
            if (bonusMode) {
                bonusMode = false;
            } else if (bonusShots > 0) {
                bonusMode = true;
            }
        }
        // Toggle alternative shooting mode with Ctrl
        if (e.key === "Control") {
            if (!ctrlHeld) {
                ctrlHeld = true;
                altShootMode = !altShootMode;
                // Reset direction to 'up' when switching modes
                if (!altShootMode) {
                    playerBulletDir = 'up';
                }
            }
        }
        if (e.key === "ArrowDown" && !altShootMode) {
            // cycle bullet direction once per key press
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
    document.addEventListener('keyup', e => {
        keys[e.key] = false;
        if (e.key === 'ArrowDown') dirSwitchHeld = false;
        if (e.key === 'Control') ctrlHeld = false;
    });


    // ==== MENU LOGIC ====
    const chars = document.querySelectorAll('.char');
    const modes = document.getElementById('modes');
    let selectedChar = "kuzy";

    /**
     * Обработчик выбора персонажа в меню
     */
    chars.forEach(c => {
        c.onclick = () => {
            // Убираем выделение со всех персонажей
            chars.forEach(ch => ch.classList.remove('selected'));
            // Выделяем выбранного
            c.classList.add('selected');
            
            selectedChar = c.dataset.char;
            modes.style.display = 'block';
        };
    });

    // show best scores in menu
    updateBestScoresDisplay();

    /**
     * Обработчик выбора режима игры в меню
     */
    const modeButtons = document.querySelectorAll('.mode');
    modeButtons.forEach(m => {
        m.onclick = () => {
            // Убираем выделение со всех режимов
            modeButtons.forEach(mb => mb.classList.remove('selected'));
            // Выделяем выбранный
            m.classList.add('selected');
            
            // Reset full game state for a fresh run
            enemies = [];
            bullets = [];
            enemyBullets = [];
            bottles = [];
            boss = null;
            bukinTablet = null;
            speechBalloons = [];
            explosions = [];
            bossDefeated = false;
            // reset scores and player state
            score = 0;
            combo = 0;
            bonusShots = 0;
            lives = PLAYER_LIVES;
            invuln = INVULN_TIME;

            document.getElementById('menu').style.display = 'none';
            document.getElementById('game').style.display = 'block';
            // set game mode
            gameMode = m.dataset.mode || 'normal';
            // reset survival counters
            killCount = 0;
            survivalEnemySpeedIncrease = 0;
            survivalBulletSpeedIncrease = 0;
            survivalSpeedUps = 0;
            survivalBulletMultiplier = 1;
            survivalWaveSpawning = false;
            player = new Player(selectedChar);
            // Mode-specific setup
            if (gameMode === '67') {
                // Mode 67: no enemies and alternate background
                enemies = [];
                bgImg.src = 'img/forest2.png';
                // Позиция игрока почти с левого угла
                player.x = 20;
                // Направление пуль по умолчанию направо
                playerBulletDir = 'right';
                // Create Enemy 67
                enemy67 = new Enemy67(player.x, player.y);
            } else {
                enemy67 = null;
                // В других режимах направление по умолчанию вверх
                playerBulletDir = 'up';
                // Инициализация платформ для режима platforms
                if (gameMode === 'platforms') {
                    bgImg.src = 'img/pl-bg.png';
                    initPlatformLevel();
                    // Позиционируем игрока на 30 пикселей выше земли
                    player.y = canvas.height - 40 - player.h - 30;
                    player.x = canvas.width / 2 - player.w / 2;
                    // spawnEnemiesOnPlatforms(); // Отключено для тестирования
                } else {
                    // Normal/survival modes: standard background and spawn enemies
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

// ==== BUKIN TABLET DROP ====
let bukinTablet = null;
const bukinImg = new Image();
let bukinImgReady = false;
bukinImg.onload = () => bukinImgReady = true;
bukinImg.src = "img/bukintablet.png";
