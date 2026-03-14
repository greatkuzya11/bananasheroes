// ==== ПРОГРЕССИЯ КАМПАНИИ / ОТКРЫТИЕ УРОВНЕЙ ====
/**
 * Порядок уровней сюжетного прохождения.
 * Выживание открывается отдельно после прохождения первого уровня.
 */
const CAMPAIGN_LEVEL_ORDER = Object.freeze([
    'normal',
    '67',
    'o4ko',
    'nosok',
    'platforms',
    'lovlyu',
    'runner',
    'library'
]);

/**
 * Набор уровней "основного прохождения" (до финального уровня).
 * После прохождения всех этих уровней открывается "Библиотека".
 */
const CAMPAIGN_RUN_LEVELS = Object.freeze([
    'normal',
    '67',
    'o4ko',
    'nosok',
    'platforms',
    'lovlyu',
    'runner'
]);
const FINAL_CAMPAIGN_LEVEL = 'library';
const LIBRARY_UNLOCK_TOOLTIP = 'Для открытия уровня пройди все прошлые уровни кампании и получи достижение "Охотник за трофеями".';

/**
 * Метаданные уровней для меню и стартовой таблички.
 */
const CAMPAIGN_LEVEL_META = Object.freeze({
    normal:    { title: 'Сирень и Букин', desc: 'Замочи эту кучи сирени дойди до Букина, ведь ты же Банан!' },
    survival:  { title: 'Выживание', desc: 'Бесконечная сирень, без Букина, сирень, фу!!' },
    '67':      { title: 'Телепузик', desc: 'Каждый Банан в своей жизни обязан замочить телепузика!' },
    o4ko:      { title: 'Очко', desc: 'Просто злое очко и кидается говном, говорят такое правда было. С балалайкой и магнитофоном, хз зачем они ей, её проблемы.' },
    nosok:     { title: 'Носок', desc: 'Просто сделай из него кусок говна!.' },
    stepan:    { title: 'Степан', desc: 'Бесконечный футбол с Носком: голы без лимита, тухлая рыба тоже.' },
    platforms: { title: 'Опять Телепузик', desc: 'Телепузик никак не уймется, опять надо замочить.' },
    lovlyu:    { title: 'Ловлю', desc: 'Все стандартно - Кузя кричит: "Лови", Банан кричит: "Ловлю"' },
    poimal:    { title: 'Поймал', desc: 'Падающие Кузи без конца: зарабатывай очки и держи темп фаз 2/3.' },
    runner:    { title: 'Бегун', desc: 'Дрон должен научится курить. Даже если не научится, хоть ногу подвернет.' },
    library:   { title: 'Библиотека', desc: 'Я хз зачем, но унитаз захотел почитать. Помоги ему - он поможет тебе.' },
    tutorial:  { title: 'Обучение', desc: 'Быстрый интро-уровень: движение, стрельба, бонусы, смена персонажа и мини-босс.' },
    bonus:     { title: 'Бонусный уровень', desc: 'Финальная секретная сцена после прохождения игры.' },
    mode67:   { title: 'Режим 67', desc: 'Сразись с оригинальным врагом 67  он снова вернулся!' }
});

const PROGRESS_KEYS = Object.freeze({
    unlockedCampaignIndex: 'bh_campaign_unlocked_index_v1',
    survivalUnlocked: 'bh_survival_unlocked_v1',
    survivalNoticeShown: 'bh_survival_unlocked_notice_shown_v1',
    poimalUnlocked: 'bh_poimal_unlocked_v1',
    poimalNoticeShown: 'bh_poimal_unlocked_notice_shown_v1',
    stepanUnlocked: 'bh_stepan_unlocked_v1',
    stepanNoticeShown: 'bh_stepan_unlocked_notice_shown_v1',
    gameCompletedOnce: 'bh_game_completed_once_v1',
    mode67Unlocked: 'bh_mode67_unlocked_v1',
    mode67NoticeShown: 'bh_mode67_notice_shown_v1',
    tutorialDone: 'bh_tutorial_done_v1',
    levelCompletedPrefix: 'bh_level_completed_v1_',
    completionFlagsMigrated: 'bh_completion_flags_migrated_v1'
});

/**
 * Runtime-состояние текущей игровой сессии кампании.
 * "Полный проход" считается только если уровни пройдены подряд с первого по последний
 * и игрок не выходил в главное меню.
 */
let campaignSession = {
    active: false,
    totalScore: 0,
    completedLevels: [],
    fullRunDone: false
};

/**
 * Отложенные уведомления, которые должны быть показаны после победы.
 */
let pendingProgressNotices = {
    survivalUnlock: false,
    poimalUnlock: false,
    stepanUnlock: false,
    gameCompleted: false,
    mode67Unlock: false
};

/**
 * Безопасно читает число из localStorage.
 * @param {string} key - ключ.
 * @param {number} fallback - значение по умолчанию.
 * @returns {number}
 */
function readIntLS(key, fallback = 0) {
    try {
        const raw = localStorage.getItem(key);
        const n = parseInt(raw || '', 10);
        return Number.isFinite(n) ? n : fallback;
    } catch (err) {
        return fallback;
    }
}

/**
 * Безопасно читает boolean-флаг из localStorage.
 * @param {string} key - ключ.
 * @param {boolean} fallback - значение по умолчанию.
 * @returns {boolean}
 */
function readBoolLS(key, fallback = false) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === '1') return true;
        if (raw === '0') return false;
        return fallback;
    } catch (err) {
        return fallback;
    }
}

/**
 * Безопасно пишет значение в localStorage.
 * @param {string} key - ключ.
 * @param {string} value - строковое значение.
 */
function writeLS(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        // Игнорируем браузеры/режимы без доступа к localStorage.
    }
}

/**
 * Возвращает ключ флага "уровень пройден хотя бы один раз".
 * @param {string} mode - идентификатор режима.
 * @returns {string}
 */
function getLevelCompletedKey(mode) {
    return `${PROGRESS_KEYS.levelCompletedPrefix}${mode}`;
}

/**
 * Помечает уровень как пройденный.
 * @param {string} mode - идентификатор режима.
 */
function setLevelCompleted(mode) {
    if (!isCampaignMode(mode)) return;
    writeLS(getLevelCompletedKey(mode), '1');
}

/**
 * Проверяет, был ли уровень пройден хотя бы один раз.
 * @param {string} mode - идентификатор режима.
 * @returns {boolean}
 */
function isLevelCompleted(mode) {
    if (!isCampaignMode(mode)) return false;
    return readBoolLS(getLevelCompletedKey(mode), false);
}

/**
 * Выполняет одноразовую миграцию старого индексного прогресса
 * в флаги "уровень пройден".
 */
function migrateLegacyProgressToCompletionFlags() {
    if (readBoolLS(PROGRESS_KEYS.completionFlagsMigrated, false)) return;
    const legacyUnlockedIdx = readIntLS(PROGRESS_KEYS.unlockedCampaignIndex, -1);
    if (legacyUnlockedIdx >= 0) {
        const max = Math.min(CAMPAIGN_LEVEL_ORDER.length - 1, legacyUnlockedIdx);
        for (let i = 0; i <= max; i++) {
            setLevelCompleted(CAMPAIGN_LEVEL_ORDER[i]);
        }
    }
    writeLS(PROGRESS_KEYS.completionFlagsMigrated, '1');
}

migrateLegacyProgressToCompletionFlags();

/**
 * Возвращает максимальный открытый индекс кампании.
 * По умолчанию открыт только первый уровень (index 0).
 * @returns {number}
 */
function getUnlockedCampaignIndex() {
    const maxIdx = CAMPAIGN_LEVEL_ORDER.length - 1;
    const idx = readIntLS(PROGRESS_KEYS.unlockedCampaignIndex, 0);
    return Math.max(0, Math.min(maxIdx, idx));
}

/**
 * Сохраняет максимальный открытый индекс кампании.
 * @param {number} idx - индекс.
 */
function setUnlockedCampaignIndex(idx) {
    const maxIdx = CAMPAIGN_LEVEL_ORDER.length - 1;
    const clamped = Math.max(0, Math.min(maxIdx, Math.floor(idx)));
    writeLS(PROGRESS_KEYS.unlockedCampaignIndex, String(clamped));
}

/**
 * Возвращает true, если режим "Выживание" открыт.
 * @returns {boolean}
 */
function isSurvivalUnlocked() {
    return readBoolLS(PROGRESS_KEYS.survivalUnlocked, false);
}

/**
 * Помечает режим "Выживание" как открытый.
 */
function setSurvivalUnlocked() {
    writeLS(PROGRESS_KEYS.survivalUnlocked, '1');
}

/**
 * Возвращает true, если режим "Поймал" открыт.
 * @returns {boolean}
 */
function isPoimalUnlocked() {
    return readBoolLS(PROGRESS_KEYS.poimalUnlocked, false);
}

/**
 * Помечает режим "Поймал" как открытый.
 */
function setPoimalUnlocked() {
    writeLS(PROGRESS_KEYS.poimalUnlocked, '1');
}

/**
 * Возвращает true, если режим "Степан" открыт.
 * @returns {boolean}
 */
function isStepanUnlocked() {
    return readBoolLS(PROGRESS_KEYS.stepanUnlocked, false);
}

/**
 * Помечает режим "Степан" как открытый.
 */
function setStepanUnlocked() {
    writeLS(PROGRESS_KEYS.stepanUnlocked, '1');
}

/**
 * Возвращает true, если режим относится к основной кампании.
 * @param {string} mode - идентификатор режима.
 * @returns {boolean}
 */
function isCampaignMode(mode) {
    return CAMPAIGN_LEVEL_ORDER.indexOf(mode) >= 0;
}

/**
 * Возвращает следующий уровень кампании или null.
 * @param {string} mode - текущий режим.
 * @returns {string|null}
 */
function getNextCampaignMode(mode) {
    const idx = CAMPAIGN_LEVEL_ORDER.indexOf(mode);
    if (idx < 0 || idx >= CAMPAIGN_LEVEL_ORDER.length - 1) return null;
    const next = CAMPAIGN_LEVEL_ORDER[idx + 1];
    if (next === FINAL_CAMPAIGN_LEVEL && !isLibraryUnlockedByProgress()) return null;
    return next;
}

/**
 * Возвращает отображаемое имя режима.
 * @param {string} mode - идентификатор режима.
 * @returns {string}
 */
function getModeDisplayName(mode) {
    const meta = CAMPAIGN_LEVEL_META[mode];
    return meta ? meta.title : mode;
}

/**
 * Возвращает данные таблички старта уровня.
 * @param {string} mode - идентификатор режима.
 * @returns {{title:string,desc:string}}
 */
function getLevelIntroData(mode) {
    const meta = CAMPAIGN_LEVEL_META[mode];
    if (meta) return meta;
    return { title: getModeDisplayName(mode), desc: 'Описание уровня в разработке.' };
}

/**
 * Возвращает true, если режим 'Режим 67' открыт.
 * @returns {boolean}
 */
function isMode67Unlocked() {
    return readBoolLS(PROGRESS_KEYS.mode67Unlocked, false);
}

/**
 * Возвращает true, если открыт бонусный финальный уровень.
 * Открывается после первого полного прохождения игры (победа в библиотеке).
 * @returns {boolean}
 */
function isBonusUnlocked() {
    return readBoolLS(PROGRESS_KEYS.gameCompletedOnce, false);
}

/**
 * Помечает режим 'Режим 67' как открытый.
 */
function setMode67Unlocked() {
    writeLS(PROGRESS_KEYS.mode67Unlocked, '1');
}

/**
 * Проверяет, открыт ли режим по прогрессии.
 * @param {string} mode - идентификатор режима.
 * @returns {boolean}
 */
function isModeUnlockedByProgress(mode) {
    if (mode === 'survival') return isSurvivalUnlocked();
    if (mode === 'poimal') return isPoimalUnlocked();
    if (mode === 'stepan') return isStepanUnlocked();
    if (mode === 'mode67') return isMode67Unlocked();
    if (mode === 'bonus') return isBonusUnlocked();
    if (mode === FINAL_CAMPAIGN_LEVEL) return isLibraryUnlockedByProgress();
    if (CAMPAIGN_RUN_LEVELS.indexOf(mode) >= 0) return true;
    const campaignIdx = CAMPAIGN_LEVEL_ORDER.indexOf(mode);
    if (campaignIdx >= 0) return true;
    return true;
}

/**
 * Обновляет состояние кнопок режимов в меню по текущему прогрессу.
 */
function refreshModeButtonsByProgress() {
    const buttons = document.querySelectorAll('#modes .mode');
    buttons.forEach(btn => {
        const mode = btn.dataset.mode || '';
        const unlocked = isModeUnlockedByProgress(mode);
        const inCampaignChain = CAMPAIGN_LEVEL_ORDER.indexOf(mode) >= 0;
        const completed = inCampaignChain && isLevelCompleted(mode);
        const isLibrary = mode === FINAL_CAMPAIGN_LEVEL;
        btn.classList.toggle('mode-completed', completed);
        if (!unlocked) {
            if (isLibrary) {
                btn.disabled = false;
                btn.setAttribute('aria-disabled', 'true');
                btn.dataset.locked = '1';
                btn.style.opacity = '0.48';
                btn.style.cursor = 'not-allowed';
                btn.title = '';
            } else {
                btn.disabled = true;
                btn.removeAttribute('aria-disabled');
                btn.dataset.locked = '0';
                btn.style.opacity = '0.48';
                btn.style.cursor = 'not-allowed';
                btn.title = (mode === FINAL_CAMPAIGN_LEVEL)
                    ? 'Откроется после прохождения всех уровней кампании'
                    : 'Откроется после выполнения условий прогрессии';
            }
            btn.classList.remove('selected');
        } else {
            btn.disabled = false;
            btn.removeAttribute('aria-disabled');
            btn.dataset.locked = '0';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = '';
        }
    });

    // Отдельная кнопка бонусного уровня в меню (вне блока #modes).
    const bonusBtn = document.getElementById('bonus-level-btn');
    if (bonusBtn) {
        const unlocked = isModeUnlockedByProgress('bonus');
        bonusBtn.disabled = !unlocked;
        bonusBtn.style.display = unlocked ? 'inline-flex' : 'none';
        if (!unlocked) bonusBtn.classList.remove('menu-kb-focus');
        bonusBtn.style.opacity = unlocked ? '1' : '0.5';
        bonusBtn.style.cursor = unlocked ? 'pointer' : 'not-allowed';
        bonusBtn.title = unlocked
            ? 'Открыть бонусный уровень'
            : 'Откроется после первого прохождения игры';
    }
}

/**
 * Запускает новую сессионную кампанию (для начала с первого уровня).
 */
function startNewCampaignSession() {
    campaignSession = {
        active: true,
        totalScore: 0,
        completedLevels: [],
        fullRunDone: false
    };
}

/**
 * Сбрасывает сессионную кампанию при выходе в главное меню.
 */
function resetCampaignSessionForMenu() {
    campaignSession = {
        active: false,
        totalScore: 0,
        completedLevels: [],
        fullRunDone: false
    };
}

/**
 * Подготавливает состояние сессионной кампании при запуске режима.
 * @param {string} mode - запускаемый режим.
 * @param {'menu'|'next'|'retry'|'pause-restart'} source - источник запуска.
 */
function prepareCampaignSessionForStart(mode, source = 'menu') {
    window.BHLastRunStartSource = source;
    if (source === 'menu') {
        const campaignIdx = CAMPAIGN_LEVEL_ORDER.indexOf(mode);
        window.BHChainStartIndex = campaignIdx >= 0 ? campaignIdx : -1;
    } else if (source !== 'next') {
        window.BHChainStartIndex = -1;
    }

    if (source === 'menu') {
        if (mode === CAMPAIGN_LEVEL_ORDER[0]) {
            startNewCampaignSession();
        } else {
            resetCampaignSessionForMenu();
        }
        return;
    }
    // next/retry/pause-restart: сохраняем текущую сессию как есть.
}

/**
 * Открывает следующий режим/режимы по факту победы в текущем режиме.
 * @param {string} mode - пройденный режим.
 */
function unlockByCompletedMode(mode) {
    if (isCampaignMode(mode)) {
        setLevelCompleted(mode);
    }

    if (mode === '67') {
        if (!isMode67Unlocked()) {
            setMode67Unlocked();
            pendingProgressNotices.mode67Unlock = true;
        }
    }

    if (mode === 'normal') {
        const wasUnlocked = isSurvivalUnlocked();
        if (!wasUnlocked) {
            setSurvivalUnlocked();
        } else if (!readBoolLS(PROGRESS_KEYS.survivalUnlocked, false)) {
            // Нормализуем флаг для старых сохранений.
            setSurvivalUnlocked();
        }

        if (!readBoolLS(PROGRESS_KEYS.survivalNoticeShown, false)) {
            pendingProgressNotices.survivalUnlock = true;
        }
    }

    if (mode === 'lovlyu') {
        const wasUnlocked = isPoimalUnlocked();
        if (!wasUnlocked) {
            setPoimalUnlocked();
        } else if (!readBoolLS(PROGRESS_KEYS.poimalUnlocked, false)) {
            setPoimalUnlocked();
        }
        if (!readBoolLS(PROGRESS_KEYS.poimalNoticeShown, false)) {
            pendingProgressNotices.poimalUnlock = true;
        }
    }

    if (mode === 'nosok') {
        const wasUnlocked = isStepanUnlocked();
        if (!wasUnlocked) {
            setStepanUnlocked();
        } else if (!readBoolLS(PROGRESS_KEYS.stepanUnlocked, false)) {
            setStepanUnlocked();
        }
        if (!readBoolLS(PROGRESS_KEYS.stepanNoticeShown, false)) {
            pendingProgressNotices.stepanUnlock = true;
        }
    }
}

/**
 * Регистрирует победу в режиме для прогрессии и сессионного полного счета.
 * @param {string} mode - идентификатор режима.
 * @param {number} levelScore - очки, набранные в режиме.
 */
function registerCampaignLevelCompletion(mode, levelScore) {
    if (isCampaignMode(mode)) {
        setLevelCompleted(mode);
    }
    unlockByCompletedMode(mode);

    if (campaignSession.active && isCampaignMode(mode)) {
        const lastCompleted = campaignSession.completedLevels[campaignSession.completedLevels.length - 1] || null;
        const expected = CAMPAIGN_LEVEL_ORDER[campaignSession.completedLevels.length];
        // Повторная фиксация уже пройденного уровня не ломает сессионный прогресс.
        if (mode === lastCompleted) {
            return;
        }
        if (mode === expected) {
            campaignSession.totalScore += Math.max(0, Math.floor(levelScore || 0));
            campaignSession.completedLevels.push(mode);
            if (campaignSession.completedLevels.length === CAMPAIGN_LEVEL_ORDER.length) {
                campaignSession.fullRunDone = true;
            }
        } else {
            // Последовательность нарушена — полноценный "сквозной" проход не засчитываем.
            campaignSession.active = false;
            campaignSession.fullRunDone = false;
        }
    }

    if (mode === 'library') {
        if (!readBoolLS(PROGRESS_KEYS.gameCompletedOnce, false)) {
            writeLS(PROGRESS_KEYS.gameCompletedOnce, '1');
            pendingProgressNotices.gameCompleted = true;
        }
        if (window.BHGlobalAchievements && typeof window.BHGlobalAchievements.markCampaignCompleted === 'function') {
            window.BHGlobalAchievements.markCampaignCompleted();
        }
    }
}

/**
 * Возвращает копию сводки текущей сессии кампании.
 * @returns {{active:boolean,totalScore:number,completedLevels:string[],fullRunDone:boolean}}
 */
function getCampaignSessionSummary() {
    return {
        active: campaignSession.active,
        totalScore: campaignSession.totalScore,
        completedLevels: campaignSession.completedLevels.slice(),
        fullRunDone: campaignSession.fullRunDone
    };
}

/**
 * Возвращает и сбрасывает уведомление об открытии выживания (если есть).
 * @returns {string}
 */
function consumePendingSurvivalNotice() {
    if (!pendingProgressNotices.survivalUnlock) return '';
    pendingProgressNotices.survivalUnlock = false;
    writeLS(PROGRESS_KEYS.survivalNoticeShown, '1');
    return 'Открыт новый режим: Выживание!';
}

/**
 * Возвращает и сбрасывает уведомление об открытии режима "Поймал".
 * @returns {string}
 */
function consumePendingPoimalNotice() {
    if (!pendingProgressNotices.poimalUnlock) return '';
    pendingProgressNotices.poimalUnlock = false;
    writeLS(PROGRESS_KEYS.poimalNoticeShown, '1');
    return 'Открыт новый режим: Поймал!';
}

/**
 * Возвращает и сбрасывает уведомление об открытии режима "Степан".
 * @returns {string}
 */
function consumePendingStepanNotice() {
    if (!pendingProgressNotices.stepanUnlock) return '';
    pendingProgressNotices.stepanUnlock = false;
    writeLS(PROGRESS_KEYS.stepanNoticeShown, '1');
    return 'Открыт новый режим: Степан!';
}

/**
 * Возвращает и сбрасывает уведомление о полном прохождении игры (если есть).
 * @returns {string}
 */
function consumePendingGameCompletedNotice() {
    if (!pendingProgressNotices.gameCompleted) return '';
    pendingProgressNotices.gameCompleted = false;
    return 'Игра Bananas Heroes полностью пройдена!';
}

function consumePendingMode67Notice() {
    if (!pendingProgressNotices.mode67Unlock) return '';
    pendingProgressNotices.mode67Unlock = false;
    writeLS(PROGRESS_KEYS.mode67NoticeShown, '1');
    return 'Открыт новый режим: Режим 67!';
}

/**
 * Сбрасывает прогресс кампании:
 * уровни основного прохождения снова доступны сразу,
 * финальный уровень "Библиотека" закрыт до выполнения условий,
 * одноразовые уведомления сбрасываются.
 */
function resetCampaignProgressState() {
    // Старый индексный ключ оставляем для совместимости, но больше не используем как источник логики.
    setUnlockedCampaignIndex(CAMPAIGN_RUN_LEVELS.length - 1);
    writeLS(PROGRESS_KEYS.survivalUnlocked, '0');
    writeLS(PROGRESS_KEYS.survivalNoticeShown, '0');
    writeLS(PROGRESS_KEYS.poimalUnlocked, '0');
    writeLS(PROGRESS_KEYS.poimalNoticeShown, '0');
    writeLS(PROGRESS_KEYS.stepanUnlocked, '0');
    writeLS(PROGRESS_KEYS.stepanNoticeShown, '0');
    writeLS(PROGRESS_KEYS.gameCompletedOnce, '0');
    for (let i = 0; i < CAMPAIGN_LEVEL_ORDER.length; i++) {
        writeLS(getLevelCompletedKey(CAMPAIGN_LEVEL_ORDER[i]), '0');
    }
    writeLS(PROGRESS_KEYS.completionFlagsMigrated, '1');
    pendingProgressNotices.survivalUnlock = false;
    pendingProgressNotices.poimalUnlock = false;
    pendingProgressNotices.stepanUnlock = false;
    pendingProgressNotices.gameCompleted = false;
    pendingProgressNotices.mode67Unlock = false;
    writeLS(PROGRESS_KEYS.mode67Unlocked, '0');
    writeLS(PROGRESS_KEYS.mode67NoticeShown, '0');
    // Полный сброс прогресса: обучение снова считается не пройденным.
    writeLS(PROGRESS_KEYS.tutorialDone, '0');
    resetCampaignSessionForMenu();
}

/**
 * Возвращает true, если все уровни "основного прохождения" пройдены.
 * @returns {boolean}
 */
function areAllRunLevelsCompleted() {
    for (let i = 0; i < CAMPAIGN_RUN_LEVELS.length; i++) {
        if (!isLevelCompleted(CAMPAIGN_RUN_LEVELS[i])) return false;
    }
    return true;
}

/**
 * Возвращает количество открытых достижений (fallback без BHAchievements).
 * @returns {number}
 */
function getUnlockedAchievementsCountFallback() {
    try {
        const raw = localStorage.getItem('bh_achievements_v1') || '';
        if (!raw) return 0;
        const obj = JSON.parse(raw);
        if (Array.isArray(obj)) return obj.length;
        if (obj && typeof obj === 'object') return Object.keys(obj).length;
        return 0;
    } catch (err) {
        return 0;
    }
}

/**
 * Возвращает true, если открыто достижение "Охотник за трофеями" или 20 ачивок.
 * @returns {boolean}
 */
function hasTrophyHunterUnlock() {
    try {
        if (window.BHAchievements && typeof window.BHAchievements.has === 'function') {
            if (window.BHAchievements.has('global_trophy_hunter_20')) return true;
        }
        let count = 0;
        if (window.BHAchievements && typeof window.BHAchievements.list === 'function') {
            count = window.BHAchievements.list().length;
        } else {
            count = getUnlockedAchievementsCountFallback();
        }
        return count >= 20;
    } catch (err) {
        return false;
    }
}

/**
 * Возвращает true, если открыт уровень "Библиотека".
 * @returns {boolean}
 */
function isLibraryUnlockedByProgress() {
    return areAllRunLevelsCompleted() && hasTrophyHunterUnlock();
}

// Экспорт в глобальную область (обычные script-теги).
window.CAMPAIGN_LEVEL_ORDER = CAMPAIGN_LEVEL_ORDER;
window.getModeDisplayName = getModeDisplayName;
window.getLevelIntroData = getLevelIntroData;
window.isModeUnlockedByProgress = isModeUnlockedByProgress;
window.refreshModeButtonsByProgress = refreshModeButtonsByProgress;
window.getNextCampaignMode = getNextCampaignMode;
window.prepareCampaignSessionForStart = prepareCampaignSessionForStart;
window.resetCampaignSessionForMenu = resetCampaignSessionForMenu;
window.registerCampaignLevelCompletion = registerCampaignLevelCompletion;
window.getCampaignSessionSummary = getCampaignSessionSummary;
window.isMode67Unlocked = isMode67Unlocked;
window.isBonusUnlocked = isBonusUnlocked;
window.isLibraryUnlockedByProgress = isLibraryUnlockedByProgress;
window.LIBRARY_UNLOCK_TOOLTIP = LIBRARY_UNLOCK_TOOLTIP;
window.consumePendingMode67Notice = consumePendingMode67Notice;
window.consumePendingSurvivalNotice = consumePendingSurvivalNotice;
window.consumePendingPoimalNotice = consumePendingPoimalNotice;
window.consumePendingStepanNotice = consumePendingStepanNotice;
window.consumePendingGameCompletedNotice = consumePendingGameCompletedNotice;
window.resetCampaignProgressState = resetCampaignProgressState;
