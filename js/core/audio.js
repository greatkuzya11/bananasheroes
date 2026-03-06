// ==== АУДИО-СИСТЕМА ====
(function initBHAudioGlobal() {
    const STORAGE_KEY_ENABLED = 'bh_audio_enabled_v1';

    /**
     * Безопасно читает флаг из localStorage.
     * @returns {boolean}
     */
    function readEnabledFlag() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_ENABLED);
            if (raw === '0') return false;
            if (raw === '1') return true;
        } catch (_err) {
            // ignore
        }
        return true;
    }

    /**
     * Безопасно записывает флаг в localStorage.
     * @param {boolean} enabled - включено ли аудио.
     */
    function writeEnabledFlag(enabled) {
        try {
            localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? '1' : '0');
        } catch (_err) {
            // ignore
        }
    }

    const state = {
        enabled: readEnabledFlag(),
        unlocked: false,
        paused: false,
        inMenu: true,
        currentMode: 'normal',
        currentMusicKey: '',
        currentMusic: null,
        poolById: new Map(),
        poolCursorById: new Map(),
        lastPlayById: new Map(),
        duckLevel: 1,
        duckUntilTs: 0,
        duckTimer: null,
        masterVol: 0.9,
        musicVol: 0.46,
        sfxVol: 0.9,
        uiVol: 0.8
    };

    const SOUND_DEFS = {
        ui_click:            { src: 'audio/sfx/ui_click.wav', vol: 0.80, pool: 4, cooldownMs: 35, channel: 'ui' },
        ui_error:            { src: 'audio/sfx/ui_error.wav', vol: 0.86, pool: 3, cooldownMs: 80, channel: 'ui' },
        ui_confirm:          { src: 'audio/sfx/ui_confirm.wav', vol: 0.86, pool: 3, cooldownMs: 80, channel: 'ui' },
        ui_pause:            { src: 'audio/sfx/ui_pause.wav', vol: 0.88, pool: 2, cooldownMs: 100, channel: 'ui' },
        ui_resume:           { src: 'audio/sfx/ui_resume.wav', vol: 0.88, pool: 2, cooldownMs: 100, channel: 'ui' },
        intro_whoosh:        { src: 'audio/sfx/intro_whoosh.wav', vol: 0.72, pool: 2, cooldownMs: 120, channel: 'ui' },

        player_jump:         { src: 'audio/sfx/player_jump.wav', vol: 0.85, pool: 5, cooldownMs: 70, channel: 'sfx' },
        player_land:         { src: 'audio/sfx/player_land.wav', vol: 0.70, pool: 4, cooldownMs: 60, channel: 'sfx' },
        player_shoot_kuzy:   { src: 'audio/sfx/player_shoot_kuzy.wav', vol: 0.78, pool: 8, cooldownMs: 45, channel: 'sfx' },
        player_shoot_dron:   { src: 'audio/sfx/player_shoot_dron.wav', vol: 0.76, pool: 8, cooldownMs: 45, channel: 'sfx' },
        player_shoot_max:    { src: 'audio/sfx/player_shoot_max.wav', vol: 0.78, pool: 8, cooldownMs: 45, channel: 'sfx' },
        player_shoot_bonus:  { src: 'audio/sfx/player_shoot_bonus.wav', vol: 0.86, pool: 8, cooldownMs: 50, channel: 'sfx' },

        enemy_shoot_lilac:   { src: 'audio/sfx/enemy_shoot_lilac.wav', vol: 0.70, pool: 8, cooldownMs: 70, channel: 'sfx' },
        enemy_shoot_67:      { src: 'audio/sfx/enemy_shoot_67.wav', vol: 0.75, pool: 6, cooldownMs: 70, channel: 'sfx' },
        enemy_shoot_o4ko:    { src: 'audio/sfx/enemy_shoot_o4ko.wav', vol: 0.76, pool: 8, cooldownMs: 75, channel: 'sfx' },
        enemy_shoot_nosok:   { src: 'audio/sfx/enemy_shoot_nosok.wav', vol: 0.74, pool: 8, cooldownMs: 75, channel: 'sfx' },
        enemy_shoot_tele:    { src: 'audio/sfx/enemy_shoot_tele.wav', vol: 0.74, pool: 8, cooldownMs: 75, channel: 'sfx' },

        hit_enemy:           { src: 'audio/sfx/hit_enemy.wav', vol: 0.74, pool: 10, cooldownMs: 45, channel: 'sfx' },
        hit_boss:            { src: 'audio/sfx/hit_boss.wav', vol: 0.80, pool: 8, cooldownMs: 50, channel: 'sfx' },
        explosion_small:     { src: 'audio/sfx/explosion_small.wav', vol: 0.78, pool: 8, cooldownMs: 45, channel: 'sfx' },
        explosion_big:       { src: 'audio/sfx/explosion_big.wav', vol: 0.88, pool: 6, cooldownMs: 80, channel: 'sfx' },
        player_hurt:         { src: 'audio/sfx/player_hurt.wav', vol: 0.90, pool: 4, cooldownMs: 120, channel: 'sfx' },

        pickup_beer:         { src: 'audio/sfx/pickup_beer.wav', vol: 0.85, pool: 4, cooldownMs: 90, channel: 'sfx' },
        pickup_heart:        { src: 'audio/sfx/pickup_heart.wav', vol: 0.88, pool: 4, cooldownMs: 90, channel: 'sfx' },
        pickup_banana:       { src: 'audio/sfx/pickup_banana.wav', vol: 0.88, pool: 4, cooldownMs: 90, channel: 'sfx' },
        pickup_ice:          { src: 'audio/sfx/pickup_ice.wav', vol: 0.86, pool: 3, cooldownMs: 90, channel: 'sfx' },
        pickup_dynamite:     { src: 'audio/sfx/pickup_dynamite.wav', vol: 0.86, pool: 3, cooldownMs: 120, channel: 'sfx' },

        goal_horn:           { src: 'audio/sfx/goal_horn.wav', vol: 0.88, pool: 2, cooldownMs: 180, channel: 'sfx' },
        goal_applause:       { src: 'audio/sfx/goal_applause.wav', vol: 0.80, pool: 2, cooldownMs: 250, channel: 'sfx' },

        library_plop:        { src: 'audio/sfx/library_plop.wav', vol: 0.86, pool: 5, cooldownMs: 120, channel: 'sfx' },
        library_splash:      { src: 'audio/sfx/library_splash.wav', vol: 0.84, pool: 5, cooldownMs: 110, channel: 'sfx' },
        toilet_charge:       { src: 'audio/sfx/toilet_charge.wav', vol: 0.74, pool: 2, cooldownMs: 180, channel: 'sfx' },
        toilet_fire:         { src: 'audio/sfx/toilet_fire.wav', vol: 0.86, pool: 3, cooldownMs: 140, channel: 'sfx' },
        book_hit:            { src: 'audio/sfx/book_hit.wav', vol: 0.72, pool: 6, cooldownMs: 60, channel: 'sfx' },

        victory_stinger:     { src: 'audio/sfx/victory_stinger.wav', vol: 0.95, pool: 2, cooldownMs: 250, channel: 'ui' },
        gameover_stinger:    { src: 'audio/sfx/gameover_stinger.wav', vol: 0.95, pool: 2, cooldownMs: 250, channel: 'ui' },
        phase_up:            { src: 'audio/sfx/phase_up.wav', vol: 0.82, pool: 3, cooldownMs: 160, channel: 'sfx' },
        dash_whoosh:         { src: 'audio/sfx/dash_whoosh.wav', vol: 0.78, pool: 5, cooldownMs: 90, channel: 'sfx' },
        slam_impact:         { src: 'audio/sfx/slam_impact.wav', vol: 0.84, pool: 4, cooldownMs: 120, channel: 'sfx' },

        runner_puff:         { src: 'audio/sfx/runner_puff.wav', vol: 0.70, pool: 6, cooldownMs: 75, channel: 'sfx' },
        runner_turbo:        { src: 'audio/sfx/runner_turbo.wav', vol: 0.76, pool: 4, cooldownMs: 110, channel: 'sfx' },
        lovlyu_catch:        { src: 'audio/sfx/lovlyu_catch.wav', vol: 0.82, pool: 6, cooldownMs: 80, channel: 'sfx' },
        lovlyu_miss:         { src: 'audio/sfx/lovlyu_miss.wav', vol: 0.72, pool: 6, cooldownMs: 100, channel: 'sfx' },
        platform_ruby:       { src: 'audio/sfx/platform_ruby.wav', vol: 0.83, pool: 3, cooldownMs: 110, channel: 'sfx' },
        platform_cup:        { src: 'audio/sfx/platform_cup.wav', vol: 0.86, pool: 3, cooldownMs: 150, channel: 'sfx' }
    };

    const MUSIC_BY_MODE = {
        menu: 'audio/music/menu_theme.wav',
        normal: 'audio/music/normal_theme.wav',
        survival: 'audio/music/survival_theme.wav',
        '67': 'audio/music/m67_theme.wav',
        o4ko: 'audio/music/o4ko_theme.wav',
        nosok: 'audio/music/nosok_theme.wav',
        stepan: 'audio/music/nosok_theme.wav',
        platforms: 'audio/music/platforms_theme.wav',
        lovlyu: 'audio/music/lovlyu_theme.wav',
        poimal: 'audio/music/lovlyu_theme.wav',
        runner: 'audio/music/runner_theme.wav',
        library: 'audio/music/library_theme.wav'
    };

    /**
     * Возвращает текущую громкость по каналу.
     * @param {'sfx'|'ui'} channel - тип канала.
     * @returns {number}
     */
    function getChannelGain(channel) {
        const base = (channel === 'ui') ? state.uiVol : state.sfxVol;
        return state.masterVol * base;
    }

    /**
     * Пересчитывает громкость текущей музыки с учетом duck и паузы.
     */
    function refreshMusicVolume() {
        if (!state.currentMusic) return;
        const base = state.masterVol * state.musicVol;
        const pauseMul = state.paused ? 0.22 : 1;
        const vol = base * state.duckLevel * pauseMul;
        state.currentMusic.volume = Math.max(0, Math.min(1, vol));
    }

    /**
     * Запускает таймер восстановления duck-громкости.
     */
    function ensureDuckTimer() {
        if (state.duckTimer) return;
        state.duckTimer = setInterval(() => {
            const now = performance.now();
            if (state.duckUntilTs > 0 && now <= state.duckUntilTs) {
                return;
            }
            if (state.duckLevel < 0.999) {
                state.duckLevel = Math.min(1, state.duckLevel + 0.08);
                refreshMusicVolume();
                return;
            }
            state.duckLevel = 1;
            state.duckUntilTs = 0;
            refreshMusicVolume();
            clearInterval(state.duckTimer);
            state.duckTimer = null;
        }, 40);
    }

    /**
     * Применяет duck к музыке на короткое время.
     * @param {number} level - множитель громкости музыки в duck-состоянии.
     * @param {number} durationMs - длительность duck в миллисекундах.
     */
    function duckMusic(level = 0.6, durationMs = 320) {
        if (!state.enabled) return;
        const now = performance.now();
        state.duckLevel = Math.min(state.duckLevel, Math.max(0.05, Math.min(1, level)));
        state.duckUntilTs = Math.max(state.duckUntilTs, now + Math.max(60, durationMs));
        refreshMusicVolume();
        ensureDuckTimer();
    }

    /**
     * Создает пул аудио-элементов для эффекта.
     * @param {string} id - идентификатор эффекта.
     * @returns {HTMLAudioElement[]}
     */
    function getPool(id) {
        if (state.poolById.has(id)) return state.poolById.get(id);
        const def = SOUND_DEFS[id];
        if (!def) return [];
        const count = Math.max(1, def.pool || 1);
        const arr = [];
        for (let i = 0; i < count; i++) {
            const a = new Audio(def.src);
            a.preload = 'auto';
            a.crossOrigin = 'anonymous';
            arr.push(a);
        }
        state.poolById.set(id, arr);
        state.poolCursorById.set(id, 0);
        return arr;
    }

    /**
     * Запускает воспроизведение короткого звука.
     * @param {string} id - идентификатор звука.
     * @param {{volumeMul?:number,playbackRate?:number,bypassCooldown?:boolean,duck?:number}} [opts] - доп.параметры.
     */
    function play(id, opts = {}) {
        if (!state.enabled) return;
        if (!state.unlocked) return;
        const def = SOUND_DEFS[id];
        if (!def) return;

        const now = performance.now();
        const cooldownMs = def.cooldownMs || 0;
        const lastTs = state.lastPlayById.get(id) || 0;
        if (!opts.bypassCooldown && cooldownMs > 0 && (now - lastTs) < cooldownMs) return;
        state.lastPlayById.set(id, now);

        const pool = getPool(id);
        if (!pool || pool.length === 0) return;
        const cursor = state.poolCursorById.get(id) || 0;
        const a = pool[cursor % pool.length];
        state.poolCursorById.set(id, (cursor + 1) % pool.length);

        try {
            a.pause();
            a.currentTime = 0;
            a.playbackRate = Math.max(0.6, Math.min(1.8, opts.playbackRate || 1));
            const gain = getChannelGain(def.channel || 'sfx') * (opts.volumeMul || 1);
            a.volume = Math.max(0, Math.min(1, gain * (def.vol || 1)));
            const p = a.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
            if (typeof opts.duck === 'number' && opts.duck < 1) {
                duckMusic(opts.duck, 260);
            }
        } catch (_err) {
            // ignore
        }
    }

    /**
     * Возвращает ключ музыки по режиму.
     * @param {string} mode - идентификатор режима.
     * @returns {string}
     */
    function resolveMusicSrc(mode) {
        return MUSIC_BY_MODE[mode] || MUSIC_BY_MODE.normal;
    }

    /**
     * Переключает loop-трек музыки.
     * @param {string} src - путь к треку.
     */
    function switchMusic(src) {
        if (!state.enabled) return;
        if (!src) return;
        if (state.currentMusicKey === src && state.currentMusic) {
            refreshMusicVolume();
            if (state.unlocked && !state.paused) {
                const p = state.currentMusic.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
            }
            return;
        }

        if (state.currentMusic) {
            try {
                state.currentMusic.pause();
                state.currentMusic.currentTime = 0;
            } catch (_err) {
                // ignore
            }
        }

        const m = new Audio(src);
        m.preload = 'auto';
        m.loop = true;
        m.crossOrigin = 'anonymous';
        state.currentMusic = m;
        state.currentMusicKey = src;
        refreshMusicVolume();

        if (state.unlocked && !state.paused) {
            const p = m.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
        }
    }

    /**
     * Включает режим меню/игры для музыки.
     * @param {boolean} isMenu - true, если активен главный экран.
     */
    function setMenuActive(isMenu) {
        state.inMenu = !!isMenu;
        const src = resolveMusicSrc(state.inMenu ? 'menu' : state.currentMode);
        switchMusic(src);
    }

    /**
     * Устанавливает режим уровня для музыки.
     * @param {string} mode - идентификатор режима.
     */
    function setMode(mode) {
        state.currentMode = mode || state.currentMode || 'normal';
        if (!state.inMenu) {
            switchMusic(resolveMusicSrc(state.currentMode));
        }
    }

    /**
     * Переключает паузу музыки.
     * @param {boolean} paused - true, если игра на паузе.
     */
    function setPaused(paused) {
        state.paused = !!paused;
        if (!state.currentMusic) return;
        if (state.paused) {
            refreshMusicVolume();
            return;
        }
        refreshMusicVolume();
        if (state.enabled && state.unlocked) {
            const p = state.currentMusic.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
        }
    }

    /**
     * Разблокирует аудио после первого действия пользователя.
     */
    function unlockByGesture() {
        if (state.unlocked) return;
        state.unlocked = true;
        if (state.currentMusic && state.enabled && !state.paused) {
            const p = state.currentMusic.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
        }
    }

    /**
     * Включает/выключает всю аудиосистему.
     * @param {boolean} enabled - новое состояние.
     */
    function setEnabled(enabled) {
        state.enabled = !!enabled;
        writeEnabledFlag(state.enabled);
        if (!state.enabled) {
            if (state.currentMusic) {
                try { state.currentMusic.pause(); } catch (_err) { /* ignore */ }
            }
            return;
        }
        const src = resolveMusicSrc(state.inMenu ? 'menu' : state.currentMode);
        switchMusic(src);
    }

    /**
     * Воспроизводит выстрел игрока с учетом персонажа и бонуса.
     * @param {'kuzy'|'dron'|'max'} playerType - тип персонажа.
     * @param {boolean} isBonus - бонусный ли выстрел.
     */
    function playPlayerShoot(playerType, isBonus) {
        if (isBonus) {
            play('player_shoot_bonus', { volumeMul: 1.0, duck: 0.92 });
            return;
        }
        if (playerType === 'dron') play('player_shoot_dron', { duck: 0.95 });
        else if (playerType === 'max') play('player_shoot_max', { duck: 0.95 });
        else play('player_shoot_kuzy', { duck: 0.95 });
    }

    /**
     * Воспроизводит выстрел врага по типу.
     * @param {'lilac'|'67'|'o4ko'|'nosok'|'tele'} enemyType - тип врага.
     */
    function playEnemyShoot(enemyType) {
        if (enemyType === '67') play('enemy_shoot_67', { duck: 0.92 });
        else if (enemyType === 'o4ko') play('enemy_shoot_o4ko', { duck: 0.92 });
        else if (enemyType === 'nosok') play('enemy_shoot_nosok', { duck: 0.92 });
        else if (enemyType === 'tele') play('enemy_shoot_tele', { duck: 0.92 });
        else play('enemy_shoot_lilac', { duck: 0.94 });
    }

    // Авто-разблокировка аудио после первого ввода.
    const unlockOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', unlockByGesture, unlockOptions);
    window.addEventListener('keydown', unlockByGesture, unlockOptions);
    window.addEventListener('touchstart', unlockByGesture, unlockOptions);

    // Инициализируем трек меню (воспроизведение начнется после unlock).
    switchMusic(resolveMusicSrc('menu'));

    window.BHAudio = {
        play,
        duck: duckMusic,
        setMode,
        setMenuActive,
        setPaused,
        setEnabled,
        isEnabled: () => !!state.enabled,
        unlock: unlockByGesture,
        playPlayerShoot,
        playEnemyShoot,
        playLevelIntro: () => play('intro_whoosh', { volumeMul: 0.9 }),
        playLevelWin: () => { play('victory_stinger', { bypassCooldown: true }); duckMusic(0.5, 540); },
        playLevelLose: () => { play('gameover_stinger', { bypassCooldown: true }); duckMusic(0.45, 620); }
    };
})();


