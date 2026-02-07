(function () {
    'use strict';

    const PERF = {
        enabled: true,
        frameCount: 0,
        bulletUpdateMs: 0,
        bulletDrawMs: 0,
        lastReport: 0,
        avg: { fps: 0, bulletUpdate: 0, bulletDraw: 0 },
        updateStart: 0,
        drawStart: 0
    };

    let bulletRenderMode = 'emoji'; // 'emoji' | 'png'
    let bulletRotationEnabled = true;

    const EMOJI_SOURCES = {
        // Player bullets
        '🌀': 'img/dron_bullet.png',
        '💩': 'img/emoji/1f4a9.png',
        '💦': 'img/emoji/1f4a6.png',
        // Enemy67 bullets
        '🪳': 'img/emoji/1fab3.png',
        '🧨': 'img/emoji/1f9e8.png',
        '7️⃣': 'img/emoji/0037-fe0f-20e3.png',
        '6️⃣': 'img/emoji/0036-fe0f-20e3.png',
        // Enemy bullets (leafs)
        '🍃': 'img/emoji/1f343.png',
        '🍂': 'img/emoji/1f342.png',
        '🍁': 'img/emoji/1f341.png',
        '🌿': 'img/emoji/1f33f.png',
        '🌱': 'img/emoji/1f331.png',
        // Bonuses / effects
        '🍺': 'img/emoji/1f37a.png',
        '❤️': 'img/emoji/2764-fe0f.png',
        '💥': 'img/emoji/1f4a5.png',
        '🪵': 'img/emoji/1fab5.png',
        // Boss emoji
        '🌭': 'img/emoji/1f32d.png'
    };

    const emojiImages = {};
    const emojiReady = {};

    function loadEmoji(emoji, src) {
        const img = new Image();
        img.onload = () => { emojiReady[emoji] = true; };
        img.src = src;
        emojiImages[emoji] = img;
    }

    Object.keys(EMOJI_SOURCES).forEach(emoji => {
        loadEmoji(emoji, EMOJI_SOURCES[emoji]);
    });

    function getEmojiBitmap(emoji) {
        if (!emoji) return null;
        if (emojiReady[emoji]) return emojiImages[emoji];
        return null;
    }

    function resetStats() {
        PERF.frameCount = 0;
        PERF.bulletUpdateMs = 0;
        PERF.bulletDrawMs = 0;
        PERF.lastReport = 0;
        PERF.avg.fps = 0;
        PERF.avg.bulletUpdate = 0;
        PERF.avg.bulletDraw = 0;
    }

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
        }
    }

    document.addEventListener('keydown', handleKey);

    function beforeBulletUpdate() {
        if (!PERF.enabled) return;
        PERF.updateStart = performance.now();
    }

    function afterBulletUpdate() {
        if (!PERF.enabled) return;
        PERF.bulletUpdateMs += performance.now() - PERF.updateStart;
    }

    function beforeBulletDraw() {
        if (!PERF.enabled) return;
        PERF.drawStart = performance.now();
    }

    function afterBulletDraw() {
        if (!PERF.enabled) return;
        PERF.bulletDrawMs += performance.now() - PERF.drawStart;
    }

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
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(10, 10, 280, 86);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${PERF.avg.fps.toFixed(1)}`, 18, 28);
        ctx.fillText(`Bullets: ${count}`, 18, 42);
        ctx.fillText(`Update: ${PERF.avg.bulletUpdate.toFixed(3)} ms`, 18, 56);
        ctx.fillText(`Draw: ${PERF.avg.bulletDraw.toFixed(3)} ms`, 18, 70);
        ctx.fillText(`Mode: ${bulletRenderMode} rot:${bulletRotationEnabled ? 'on' : 'off'}`, 18, 84);
        ctx.restore();
    }

    window.BHBulletPerf = {
        isEnabled: () => PERF.enabled,
        bulletRenderMode: () => bulletRenderMode,
        bulletRotationEnabled: () => bulletRotationEnabled,
        getEmojiBitmap,
        beforeBulletUpdate,
        afterBulletUpdate,
        beforeBulletDraw,
        afterBulletDraw,
        drawOverlay
    };
})();
