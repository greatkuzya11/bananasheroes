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
        const ids = Object.keys(manifest);
        let unlocked = 0;
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const meta = manifest[id] || {};
            const isUnlocked = !!api.has(id);
            if (isUnlocked) unlocked += 1;
            lines.push(`${isUnlocked ? '[x]' : '[ ]'} ${id} | ${(meta.title || id)}`);
        }

        lines.unshift(`Achievements: ${unlocked}/${ids.length}`);

        // Служебные счётчики текущего ранa normal (если доступны).
        if (typeof normalRunDamageTaken === 'number' && typeof normalRunBeerCollected === 'number') {
            lines.push(`normal damage: ${normalRunDamageTaken}`);
            lines.push(`normal beer pickups: ${normalRunBeerCollected}`);
        }
        if (
            typeof mode67FinalBlowFromRight === 'boolean'
            && typeof mode67BossReachedMaxSize === 'boolean'
            && typeof mode67EnemyBulletLeftScreen === 'boolean'
        ) {
            lines.push(`67 final blow right: ${mode67FinalBlowFromRight}`);
            lines.push(`67 reached max size: ${mode67BossReachedMaxSize}`);
            lines.push(`67 bullet left screen: ${mode67EnemyBulletLeftScreen}`);
        }
        if (
            typeof mode67RunDamageTaken === 'number'
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
            typeof nosokElapsedTime === 'number'
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

        // На случай unlock'ов, которых нет в манифесте (устаревшие/ручные id).
        if (typeof api.list === 'function') {
            const extraUnlocked = api.list().filter(id => !Object.prototype.hasOwnProperty.call(manifest, id));
            if (extraUnlocked.length > 0) {
                lines.push(`extra unlocked ids: ${extraUnlocked.join(', ')}`);
            }
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
