// Lightweight achievements system
(function () {
    const KEY = 'bh_achievements_v1';
    const manifest = {
        'normal_bukins_saved': { 
            id: 'normal_bukins_saved', 
            title: 'Букин спасен', 
            desc: 'Спасите Букина в уровне «Сирень и Букин»', 
            icon: '🍌',
            mode: 'normal'
        },
        'normal_fresh_air': { 
            id: 'normal_fresh_air', 
            title: 'Свежий воздух', 
            desc: 'Пройти уровень без потерь сердец', 
            icon: '❤️',
            mode: 'normal'
        },
        'normal_no_bonus': { 
            id: 'normal_no_bonus', 
            title: 'Бананы так не делают', 
            desc: '\u041f\u0440\u043e\u0439\u0442\u0438 \u0443\u0440\u043e\u0432\u0435\u043d\u044c, \u043d\u0435 \u043f\u043e\u0434\u043e\u0431\u0440\u0430\u0432 \u043d\u0438 \u043e\u0434\u043d\u043e\u0439 \u0431\u0443\u0442\u044b\u043b\u043a\u0438 \u043f\u0438\u0432\u0430', 
            icon: '🍺',
            mode: 'normal'
        },
        '67_right_funeral': {
            id: '67_right_funeral',
            title: 'Правый похоронный',
            desc: 'Замочи урода в левый бок!',
            icon: '⚰️',
            mode: '67'
        },
        '67_early_death': {
            id: '67_early_death',
            title: 'Смерть не в расцвете сил.',
            desc: 'Не дай ему разжиреть',
            icon: '🥀',
            mode: '67'
        },
        '67_no_miss': {
            id: '67_no_miss',
            title: 'Ни капли мимо',
            desc: 'Сбей или прими каждую пулю - ни одной за экран',
            icon: '🎯',
            mode: '67'
        },
        'mode67_no_69': {
            id: 'mode67_no_69',
            title: '\u0036\u0037 \u043d\u0435 \u0036\u0039',
            desc: '\u041f\u0440\u043e\u0439\u0442\u0438 \u043d\u0430 \u0438\u0437\u0438 \u0431\u0435\u0437 \u0443\u0440\u043e\u043d\u0430',
            icon: '🛡️',
            mode: 'mode67'
        },
        'mode67_forgot_how_to_shoot': {
            id: 'mode67_forgot_how_to_shoot',
            title: '\u0417\u0430\u0431\u044b\u043b \u043a\u0430\u043a \u0441\u0442\u0440\u0435\u043b\u044f\u0442\u044c',
            desc: '\u0420\u0430\u0441\u0441\u043a\u0430\u0437\u0430\u0442\u044c \u0435\u043c\u0443 \u043f\u0440\u0435\u0434\u0441\u043c\u0435\u0440\u0442\u043d\u0443\u044e \u0440\u0435\u0447\u044c \u043d\u0430 \u0033 \u043c\u0438\u043d\u0443\u0442\u044b, \u0430 \u043f\u043e\u0442\u043e\u043c \u0443\u0431\u0438\u0442\u044c',
            icon: '⏳',
            mode: 'mode67'
        },
        'mode67_boris_no_hit': {
            id: 'mode67_boris_no_hit',
            title: '\u0411\u043e\u0440\u0438\u0441, \u0445\u0440\u0435\u043d \u043f\u043e\u043f\u0430\u0434\u0435\u0448\u044c',
            desc: '\u0443\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0439\u0441\u044f \u043e\u0442\u043e \u0432\u0441\u0435\u0445 \u043f\u0443\u043b\u044c',
            icon: '🫥',
            mode: 'mode67'
        },
        'nosok_speed_shooter': {
            id: 'nosok_speed_shooter',
            title: '\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u0440\u0435\u043b',
            desc: '\u041d\u0435 \u0431\u043e\u043b\u0435\u0435 \u0031\u0030 \u0441\u0435\u043a \u043d\u0430 \u0433\u043e\u043b',
            icon: '⚡',
            mode: 'nosok'
        },
        'nosok_no_gun_needed': {
            id: 'nosok_no_gun_needed',
            title: '\u041f\u0443\u0448\u043a\u0430 \u043d\u0435 \u043d\u0443\u0436\u043d\u0430',
            desc: '\u0434\u043e\u043a\u0430\u0437\u0430\u0442\u044c, \u0447\u0442\u043e \u043c\u043e\u0436\u0435\u0448\u044c \u0435\u0433\u043e \u0437\u0430\u043c\u043e\u0447\u0438\u0442\u044c \u0433\u043e\u043b\u044b\u043c\u0438 \u0440\u0443\u043a\u0430\u043c\u0438',
            icon: '🥊',
            mode: 'nosok'
        },
        'nosok_purifying_fire': {
            id: 'nosok_purifying_fire',
            title: '\u041e\u0433\u043e\u043d\u044c \u043e\u0447\u0438\u0449\u0435\u043d\u0438\u044f \u043e\u0442 \u0433\u043e\u0432\u043d\u0430',
            desc: '\u0412\u0437\u043e\u0440\u0432\u0438 \u044d\u0442\u043e\u0442 \u043a\u0443\u0441\u043e\u043a \u0433\u043e\u0432\u043d\u0430.',
            icon: '🧨',
            mode: 'nosok'
        }
    };

    const load = () => {
        try {
            const raw = localStorage.getItem(KEY) || '{}';
            const obj = JSON.parse(raw);
            // Support both old array format and new object format {id: timestamp}
            if (Array.isArray(obj)) {
                const newFormat = {};
                obj.forEach(id => { newFormat[id] = Date.now(); });
                return newFormat;
            }
            return obj;
        } catch (e) { return {}; }
    };

    const save = (obj) => {
        try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { }
    };

    let achievementNoticeQueue = Promise.resolve();

    function getAchievementNoticeText(id, meta) {
        const iconPart = (meta && meta.icon) ? (meta.icon + ' ') : '';
        const title = (meta && meta.title) ? meta.title : id;
        return `🏆 Достижение разблокировано - ${iconPart}${title}`;
    }

    function showAchievementTopNotice(text, durationMs = 3000) {
        return new Promise(resolve => {
            if (!text || typeof document === 'undefined' || !document.body) {
                resolve();
                return;
            }

            const wrap = document.createElement('div');
            Object.assign(wrap.style, {
                position: 'fixed',
                left: '0',
                right: '0',
                top: '0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                paddingTop: 'calc(12px + env(safe-area-inset-top))',
                pointerEvents: 'none',
                zIndex: '3600'
            });

            const box = document.createElement('div');
            box.textContent = text;
            Object.assign(box.style, {
                background: 'rgba(16,22,36,0.95)',
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.35)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '20px',
                fontWeight: '700',
                boxShadow: '0 10px 26px rgba(0,0,0,0.42)',
                opacity: '0',
                transform: 'translateY(-10px)',
                transition: 'opacity 220ms ease, transform 220ms ease',
                maxWidth: 'min(94vw, 980px)',
                textAlign: 'center',
                whiteSpace: 'pre-wrap'
            });

            wrap.appendChild(box);
            document.body.appendChild(wrap);

            requestAnimationFrame(() => {
                box.style.opacity = '1';
                box.style.transform = 'translateY(0)';
            });

            const fadeMs = 220;
            const holdMs = Math.max(400, durationMs - fadeMs * 2);
            setTimeout(() => {
                box.style.opacity = '0';
                box.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (wrap.parentNode) wrap.remove();
                    resolve();
                }, fadeMs);
            }, fadeMs + holdMs);
        });
    }

    function enqueueAchievementNotice(id, meta) {
        const text = getAchievementNoticeText(id, meta);
        achievementNoticeQueue = achievementNoticeQueue
            .catch(() => {})
            .then(() => showAchievementTopNotice(text, 3000));
    }

    const unlocked = load();

    window.BHAchievements = {
        manifest,
        has(id) { return !!unlocked[id]; },
        getTimestamp(id) { return unlocked[id] || null; },
        list() { return Object.keys(unlocked); },
        grant(id) {
            if (!id || unlocked[id]) return false;
            const timestamp = Date.now();
            unlocked[id] = timestamp;
            save(unlocked);
            const meta = manifest[id] || { id, title: id };
            try {
                window.dispatchEvent(new CustomEvent('achievement:granted', { detail: { id, meta, timestamp } }));
            } catch (e) { }
            // Queue top notices so multiple unlocked achievements appear one after another.
            enqueueAchievementNotice(id, meta);
            // update achievements overlay grid if present
            try {
                const tile = document.querySelector('#ach-grid [data-ach-id="' + id + '"]');
                if (tile) tile.classList.add('unlocked');
            } catch (e) { }
            return true;
        }
    };
})();
