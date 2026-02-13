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

    let bulletRenderMode = 'png'; // режим отрисовки пуль: 'emoji' | 'png'
    let bulletRotationEnabled = true;
    let enemy67RenderMode = 'sheet'; // 'sheet' | 'tp'
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
        ctx.save();
        // Сбрасываем трансформации и выравнивание текста после игрового рендера
        if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(10, 10, 300, 100);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${PERF.avg.fps.toFixed(1)}`, 18, 28);
        ctx.fillText(`Bullets: ${count}`, 18, 42);
        ctx.fillText(`Update: ${PERF.avg.bulletUpdate.toFixed(3)} ms`, 18, 56);
        ctx.fillText(`Draw: ${PERF.avg.bulletDraw.toFixed(3)} ms`, 18, 70);
        ctx.fillText(`Mode: ${bulletRenderMode} rot:${bulletRotationEnabled ? 'on' : 'off'}`, 18, 84);
        ctx.fillText(`E67: ${enemy67RenderMode}/${enemy67SpriteVariant}`, 18, 98);
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
