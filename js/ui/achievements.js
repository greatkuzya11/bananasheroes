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
        },
        'stepan_not_worthy': {
            id: 'stepan_not_worthy',
            title: '\u042d\u0442\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u043e\u0439\u043d\u043e \u043c\u0435\u043d\u044f',
            desc: '\u041e\u0442\u043a\u0430\u0436\u0438\u0441\u044c \u0437\u0430\u0431\u0438\u0432\u0430\u0442\u044c \u043f\u043e\u0441\u043b\u0435 \u0036\u0037 \u0433\u043e\u043b\u0430',
            icon: '👑',
            mode: 'stepan'
        },
        'stepan_need_cannon': {
            id: 'stepan_need_cannon',
            title: '\u041f\u0443\u0448\u043a\u0430 \u043d\u0443\u0436\u043d\u0430',
            desc: '\u0414\u0430\u0436\u0435 \u043d\u0435 \u043f\u044b\u0442\u0430\u0439\u0441\u044f \u043a \u043d\u0435\u043c\u0443 \u043f\u043e\u0434\u043e\u0439\u0442\u0438 \u0438 \u0437\u0430\u0431\u0435\u0439 \u0031\u0031',
            icon: '🔫',
            mode: 'stepan'
        },
        'stepan_hundred_in_motion': {
            id: 'stepan_hundred_in_motion',
            title: '\u0421\u043e\u0442\u043a\u0430 \u0432 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u0438',
            desc: '\u041d\u0430\u0432\u0430\u043b\u0438 \u0435\u043c\u0443 \u0441\u043e\u0442\u043a\u0443 \u0431\u0435\u0437 \u043f\u0440\u043e\u0441\u0442\u043e\u0435\u0432',
            icon: '🏃',
            mode: 'stepan'
        },
        'lovlyu_no_butt_pain': {
            id: 'lovlyu_no_butt_pain',
            title: '\u0416\u043e\u043f\u0430 \u043d\u0435 \u0431\u043e\u043b\u0438\u0442',
            desc: '\u041f\u043e\u0439\u043c\u0430\u0439 \u0432\u0441\u0435\u0445 \u041a\u0443\u0437\u0435\u0439',
            icon: '🍑',
            mode: 'lovlyu'
        },
        'lovlyu_magic_kick': {
            id: 'lovlyu_magic_kick',
            title: '\u0412\u043e\u043b\u0448\u0435\u0431\u043d\u044b\u0439 \u043f\u0435\u043d\u0434\u0435\u043b\u044c',
            desc: '\u0437\u0430\u043c\u0435\u0434\u043b\u0438 \u043f\u043e\u043b\u043e\u0432\u0438\u043d\u0443 \u041a\u0443\u0437\u0435\u0439 \u0432\u043e\u043b\u0448\u0435\u0431\u043d\u044b\u043c \u043f\u0435\u043d\u0434\u0435\u043b\u0435\u043c.',
            icon: '🦶',
            mode: 'lovlyu'
        },
        'lovlyu_no_energy': {
            id: 'lovlyu_no_energy',
            title: '\u0411\u0435\u0437 \u044d\u043d\u0435\u0440\u0433\u0435\u0442\u0438\u043a\u043e\u0432',
            desc: '\u041f\u043e\u043a\u0430\u0436\u0438, \u0447\u0442\u043e \u0438 \u043d\u0430 \u0431\u0430\u043d\u0430\u043d\u0441\u043a\u043e\u0439 \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0438 \u0442\u044b \u0432\u0441\u0451 \u0441\u043c\u043e\u0436\u0435\u0448\u044c',
            icon: '🚫',
            mode: 'lovlyu'
        },
        'poimal_hands_not_leaky': {
            id: 'poimal_hands_not_leaky',
            title: '\u0420\u0443\u043a\u0438 \u043d\u0435 \u0434\u044b\u0440\u044f\u0432\u044b\u0435',
            desc: '\u0033\u0030 \u043f\u043e\u0434\u0440\u044f\u0434, \u043d\u0438 \u043e\u0434\u043d\u043e\u0433\u043e \u043d\u0430 \u043f\u043e\u043b',
            icon: '\ud83e\udde4',
            mode: 'poimal'
        },
        'poimal_kick_master': {
            id: 'poimal_kick_master',
            title: '\u041f\u0435\u043d\u0434\u0435\u043b\u044c-\u043c\u0430\u0441\u0442\u0435\u0440',
            desc: '\u0414\u0430\u0439 \u0031\u0032 \u0432\u043e\u043b\u0448\u0435\u0431\u043d\u044b\u0445 \u043f\u0435\u043d\u0434\u0435\u043b\u0435\u0439',
            icon: '\ud83e\uddb5',
            mode: 'poimal'
        },
        'poimal_banana_thrust': {
            id: 'poimal_banana_thrust',
            title: '\u041d\u0430 \u0431\u0430\u043d\u0430\u043d\u0441\u043a\u043e\u0439 \u0442\u044f\u0433\u0435',
            desc: '\u041e\u0447\u043a\u0438 \u0431\u0435\u0437 \u043f\u0440\u044b\u0436\u043a\u0430',
            icon: '\ud83c\udf4c',
            mode: 'poimal'
        },
        'library_banapocalypse_plumber': {
            id: 'library_banapocalypse_plumber',
            title: '\u0421\u0430\u043d\u0442\u0435\u0445\u043d\u0438\u043a \u0411\u0430\u043d\u0430\u043f\u043e\u043a\u0430\u043b\u0438\u043f\u0441\u0438\u0441\u0430',
            desc: '\u041f\u0440\u043e\u0441\u0442\u043e \u043e\u0431\u043e\u0433\u0430\u0449\u0430\u0439 \u0443\u043d\u0438\u0442\u0430\u0437',
            icon: '\ud83d\udebd',
            mode: 'library'
        },
        'library_kind_of_goal': {
            id: 'library_kind_of_goal',
            title: '\u0422\u043e\u0436\u0435 \u0441\u0432\u043e\u0435\u0433\u043e \u0440\u043e\u0434\u0430 \u0433\u043e\u043b',
            desc: '\u041f\u043e\u043a\u0430\u0436\u0438 \u0447\u0435\u043c\u0443 \u043d\u0430\u0443\u0447\u0438\u043b\u0441\u044f \u0432 \u0443\u0440\u043e\u0432\u043d\u0435 \u043d\u0410\u0441\u043e\u043a',
            icon: '\ud83d\udcda',
            mode: 'library'
        },
        'library_sober_reader': {
            id: 'library_sober_reader',
            title: '\u0422\u0440\u0435\u0437\u0432\u044b\u0439 \u0447\u0438\u0442\u0430\u0442\u0435\u043b\u044c',
            desc: '\u0411\u0435\u0437 \u043f\u0438\u0432\u0430 \u0434\u043e \u0444\u0438\u043d\u0430\u043b\u0430',
            icon: '\ud83d\udeab\ud83c\udf7a',
            mode: 'library'
        },
        'platforms_last_strength': {
            id: 'platforms_last_strength',
            title: '\u0418\u0437 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0445 \u0441\u0438\u043b',
            desc: '\u0421\u043d\u0435\u0441\u0438 \u0431\u043e\u0441\u0441\u0443 \u0431\u043e\u043b\u044c\u0448\u0438\u043d\u0441\u0442\u0432\u043e hp, \u0438\u043c\u0435\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043e\u0434\u043d\u043e \u2764\ufe0f',
            icon: '💔',
            mode: 'platforms'
        },
        'platforms_not_skewered': {
            id: 'platforms_not_skewered',
            title: '\u041d\u0435 \u043d\u0430\u0441\u0430\u0436\u0435\u043d\u043d\u044b\u0439 \u043d\u0430 \u043a\u0443\u043a\u0430\u043d',
            desc: '\u0418\u0437\u0431\u0435\u0433\u0430\u0439 \u043f\u0430\u0434\u0435\u043d\u0438\u044f \u043d\u0430 \u0440\u043e\u0437\u043e\u0432\u044b\u0435 \u0448\u0438\u043f\u044b',
            icon: '🛡️',
            mode: 'platforms'
        },
        'platforms_no_idle_spawns': {
            id: 'platforms_no_idle_spawns',
            title: '\u0411\u0435\u0437 \u043f\u0440\u043e\u0441\u0442\u043e\u0435\u0432',
            desc: '\u041f\u0440\u043e\u0439\u0434\u0438 \u0431\u0435\u0437 \u043b\u0438\u0448\u043d\u0438\u0445 \u0441\u043f\u0430\u0432\u043d\u043e\u0432 \u0432\u0440\u0430\u0433\u043e\u0432',
            icon: '🏃',
            mode: 'platforms'
        },
        'o4ko_three_bananas': {
            id: 'o4ko_three_bananas',
            title: '\u0033 \u0411\u0430\u043d\u0430\u043d\u0430 \u043d\u0430 \u0431\u0435\u0440\u0435\u0437\u043a\u0430\u0445',
            desc: '\u041a\u043e\u043c\u0431\u043e \u0031\u0035 \u043c\u043e\u0436\u0435\u0442 \u0441\u043f\u0430\u0432\u043d\u0438\u0442\u044c \u0431\u0430\u043d\u0430\u043d',
            icon: '🍌',
            mode: 'o4ko'
        },
        'o4ko_no_jump': {
            id: 'o4ko_no_jump',
            title: '\u042f \u043d\u0435 \u043f\u0440\u044b\u0433\u043d\u0443',
            desc: '\u041d\u0435\u043b\u044c\u0437\u044f \u043f\u0440\u044b\u0433\u0430\u0442\u044c \u043f\u0440\u0438 \u0434\u0435\u0432\u043e\u0447\u043a\u0430\u0445',
            icon: '🚫',
            mode: 'o4ko'
        },
        'o4ko_no_bonus_use': {
            id: 'o4ko_no_bonus_use',
            title: '\u041d\u0435 \u0437\u0430\u0441\u043b\u0443\u0436\u0438\u043b\u0430 \u0431\u043e\u043d\u0443\u0441\u044b',
            desc: '\u041d\u0435 \u043c\u0430\u0440\u0430\u0439 \u0441\u0432\u043e\u0438 \u0431\u043e\u043d\u0443\u0441\u044b \u043e\u0431 \u043e\u0447\u043a\u043e',
            icon: '🙅',
            mode: 'o4ko'
        },
        'runner_karate_101': {
            id: 'runner_karate_101',
            title: '\u0031\u0030\u0031 \u043f\u0440\u0438\u0435\u043c \u043a\u0430\u0440\u0430\u0442\u0435',
            desc: '\u0418\u0437\u043c\u0430\u0442\u044b\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0442\u0438\u0432\u043d\u0438\u043a\u0430 \u0431\u0435\u0433\u043e\u043c',
            icon: '\ud83e\udd4b',
            mode: 'runner'
        },
        'runner_too_easy': {
            id: 'runner_too_easy',
            title: '\u042d\u0442\u043e \u0431\u044b\u043b\u043e \u043b\u0435\u0433\u043a\u043e',
            desc: '\u0417\u0430\u0448\u0435\u043b-\u0432\u044b\u0448\u0435\u043b, \u0434\u0435\u043b\u043e \u043d\u0430 \u0032\u0030 \u0441\u0435\u043a\u0443\u043d\u0434',
            icon: '\u23f1\ufe0f',
            mode: 'runner'
        },
        'runner_no_arcade_magic': {
            id: 'runner_no_arcade_magic',
            title: '\u0411\u0435\u0437 \u0430\u0440\u043a\u0430\u0434\u043d\u043e\u0439 \u043c\u0430\u0433\u0438\u0438',
            desc: '\u041f\u0440\u043e\u0439\u0442\u0438 \u0431\u0435\u0437 \u0442\u0435\u043b\u0435\u043f\u043e\u0440\u0442\u043e\u0432',
            icon: '\ud83e\uddf1',
            mode: 'runner'
        },
        'tutorial_saved_for_sweet': {
            id: 'tutorial_saved_for_sweet',
            title: '\u041f\u0440\u0438\u0431\u0435\u0440\u0451\u0433 \u043d\u0430 \u0441\u043b\u0430\u0434\u043a\u043e\u0435',
            desc: '\u0411\u043e\u043d\u0443\u0441\u043d\u044b\u0435 \u0432\u044b\u0441\u0442\u0440\u0435\u043b\u044b, \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043b\u043e\u0436\u0438\u0442\u044c, \u0036\u0037 \u043e\u0446\u0435\u043d\u0438\u0442',
            icon: '\ud83c\udf70',
            mode: 'tutorial'
        },
        'tutorial_good_for_something': {
            id: 'tutorial_good_for_something',
            title: '\u0425\u043e\u0442\u044c \u043d\u0430 \u0447\u0442\u043e-\u0442\u043e \u0433\u043e\u0436\u0443\u0441\u044c',
            desc: '\u041f\u0440\u043e\u0439\u0442\u0438 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435',
            icon: '\ud83d\udc4d',
            mode: 'tutorial'
        },
        'tutorial_no_promises': {
            id: 'tutorial_no_promises',
            title: '\u042f \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0438\u043a\u043e\u043c\u0443 \u043d\u0435 \u043e\u0431\u0435\u0449\u0430\u043b',
            desc: '\u041d\u0435 \u0441\u043b\u0443\u0448\u0430\u0442\u044c\u0441\u044f \u0440\u0430\u0441\u0441\u043a\u0430\u0437\u0447\u0438\u043a\u0430',
            icon: '\ud83e\udd2b',
            mode: 'tutorial',
            secret: true
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
