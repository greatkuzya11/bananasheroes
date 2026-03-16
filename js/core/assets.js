// ==== РЕСУРСЫ ==== 

// Фон игры
const bgImg = new Image();
let bgReady = false;
// Обработчик загрузки фона: отмечаем готовность изображения
bgImg.onload = () => { bgReady = true; };
bgImg.src = "img/forest.png";

// Спрайт персонажа Кузи
const kuzyImg = new Image();
let spriteReady = false;
// Обработчик загрузки основного спрайта персонажа
kuzyImg.onload = () => { spriteReady = true; };
kuzyImg.src = "img/kuzy.png";

// Спрайты стрельбы (5 файлов)
const kuzyShootImgs = [];
let shootSpritesReady = 0;
for (let i = 0; i < 5; i++) {
    kuzyShootImgs[i] = new Image();
    // Обработчик загрузки кадра стрельбы: увеличиваем счетчик готовых кадров
    kuzyShootImgs[i].onload = () => { shootSpritesReady++; };
    kuzyShootImgs[i].src = `img/shoot/${i}.png`;
}

// Спрайты стрельбы вверх (7 файлов)
const kuzyShootUpImgs = [];
let shootUpSpritesReady = 0;
for (let i = 0; i < 7; i++) {
    kuzyShootUpImgs[i] = new Image();
    // Обработчик загрузки кадра стрельбы вверх: увеличиваем счетчик готовых кадров
    kuzyShootUpImgs[i].onload = () => { shootUpSpritesReady++; };
    kuzyShootUpImgs[i].src = `img/shoot/up/${i}.png`;
}

// Спрайт прыжка Кузи
const kuzyJumpImg = new Image();
let jumpSpriteReady = false;
// Обработчик загрузки спрайта прыжка
kuzyJumpImg.onload = () => { jumpSpriteReady = true; };
kuzyJumpImg.src = "img/kuzy_jump.png";

// PNG Sequences анимации "legacy"-набора.
// ВАЖНО: это НЕ каноничные "персонажные наборы" выбора Кузя/Макс/Дрон.
// Каноничные наборы персонажей для текущей игры — bananSprites (см. maxAnims + recolor-варианты).
// Этот набор оставлен только для старых режимов/совместимости и не должен использоваться
// как "привязанный к персонажу" при разработке новых режимов.
const kuzyAnimDefs = {
    idle:      { folder: 'Idle',                prefix: '0_Bloody_Alchemist_Idle',                count: 18 },
    walk:      { folder: 'Walking',             prefix: '0_Bloody_Alchemist_Walking',             count: 24 },
    run:       { folder: 'Running',             prefix: '0_Bloody_Alchemist_Running',             count: 12 },
    jumpStart: { folder: 'Jump Start',          prefix: '0_Bloody_Alchemist_Jump Start',          count: 6  },
    jumpLoop:  { folder: 'Jump Loop',           prefix: '0_Bloody_Alchemist_Jump Loop',           count: 6  },
    fallDown:  { folder: 'Falling Down',        prefix: '0_Bloody_Alchemist_Falling Down',        count: 6  },
    throw:     { folder: 'Throwing',            prefix: '0_Bloody_Alchemist_Throwing',            count: 12 },
    throwAir:  { folder: 'Throwing in The Air', prefix: '0_Bloody_Alchemist_Throwing in The Air', count: 12 },
    runThrow:  { folder: 'Run Throwing',        prefix: '0_Bloody_Alchemist_Run Throwing',        count: 12 },
    hurt:      { folder: 'Hurt',                prefix: '0_Bloody_Alchemist_Hurt',               count: 12 },
    dying:     { folder: 'Dying',               prefix: '0_Bloody_Alchemist_Dying',              count: 15 },
};
const kuzyAnims = {};
let kuzyAnimsReady = 0;
let kuzyAnimsTotal = 0;
for (const [animName, def] of Object.entries(kuzyAnimDefs)) {
    kuzyAnims[animName] = [];
    for (let i = 0; i < def.count; i++) {
        kuzyAnimsTotal++;
        const img = new Image();
        img.onload = () => { kuzyAnimsReady++; };
        const idx = String(i).padStart(3, '0');
        img.src = `img/PNG Sequences/${def.folder}/${def.prefix}_${idx}.png`;
        kuzyAnims[animName].push(img);
    }
}

// Спрайт пули персонажа Макс
const maxBulletImg = new Image();
maxBulletImg.src = 'img/max_bullet.png';

// PNG фреймы анимаций персонажа Макс
const maxAnims = {
    walk:          [1,2,3,4,5,6,7,8,9,10].map(n => { const i = new Image(); i.src = `img/bananSprites/walk/${n}.png`; return i; }),
    shootOnWalk:   [11,12,13,14,15,16,17,18,19,20].map(n => { const i = new Image(); i.src = `img/bananSprites/shootOnWalk/${n}.png`; return i; }),
    shootOnStand:  [12,13,16].map(n => { const i = new Image(); i.src = `img/bananSprites/shootOnStand/${n}.png`; return i; }),
    shootUpStand:  [1,2,3,4,5,6].map(n => { const i = new Image(); i.src = `img/bananSprites/shootUpStand/${n}.png`; return i; }),
    jump:          [21,22,23,24,25,26,34,35,37].map(n => { const i = new Image(); i.src = `img/bananSprites/jump/${n}.png`; return i; }),
    shootOnJump:   [27,28,29,30,31,32,33,36,38].map(n => { const i = new Image(); i.src = `img/bananSprites/shootOnJump/${n}.png`; return i; }),
    levelComplete: [39,40,41,42,43,44].map(n => { const i = new Image(); i.src = `img/bananSprites/levelComplete/${n}.png`; return i; }),
};

// Кэш перекрашенных вариантов банан-спрайта:
// dron -> синий акцент, max -> черный акцент.
const bananAnimsVariantCache = {
    dron: null,
    max: null
};

/**
 * Проверяет, готов ли растровый источник для drawImage.
 * @param {CanvasImageSource} img
 * @returns {boolean}
 */
function isRasterSourceReady(img) {
    if (!img) return false;
    if (typeof img.complete === 'boolean') {
        const w = (typeof img.naturalWidth === 'number' && img.naturalWidth > 0) ? img.naturalWidth : (img.width || 0);
        const h = (typeof img.naturalHeight === 'number' && img.naturalHeight > 0) ? img.naturalHeight : (img.height || 0);
        return !!img.complete && w > 0 && h > 0;
    }
    return (img.width || 0) > 0 && (img.height || 0) > 0;
}

/**
 * Проверяет, загружены ли базовые кадры bananSprites.
 * @returns {boolean}
 */
function areBaseBananAnimsReady() {
    const animLists = Object.values(maxAnims);
    for (let i = 0; i < animLists.length; i++) {
        const frames = animLists[i];
        for (let j = 0; j < frames.length; j++) {
            if (!isRasterSourceReady(frames[j])) return false;
        }
    }
    return true;
}

/**
 * Конвертирует RGB в HSV.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{h:number,s:number,v:number}}
 */
function rgbToHsv(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
        if (max === rn) h = 60 * (((gn - bn) / d) % 6);
        else if (max === gn) h = 60 * (((bn - rn) / d) + 2);
        else h = 60 * (((rn - gn) / d) + 4);
    }
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v };
}

/**
 * Конвертирует HSV в RGB.
 * @param {number} h - 0..360
 * @param {number} s - 0..1
 * @param {number} v - 0..1
 * @returns {{r:number,g:number,b:number}}
 */
function hsvToRgb(h, s, v) {
    const c = v * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let rp = 0, gp = 0, bp = 0;

    if (hp >= 0 && hp < 1) { rp = c; gp = x; bp = 0; }
    else if (hp < 2) { rp = x; gp = c; bp = 0; }
    else if (hp < 3) { rp = 0; gp = c; bp = x; }
    else if (hp < 4) { rp = 0; gp = x; bp = c; }
    else if (hp < 5) { rp = x; gp = 0; bp = c; }
    else { rp = c; gp = 0; bp = x; }

    const m = v - c;
    return {
        r: Math.round((rp + m) * 255),
        g: Math.round((gp + m) * 255),
        b: Math.round((bp + m) * 255)
    };
}

/**
 * Определяет, относится ли пиксель к красному акценту (включая бордовый/оранжево-красный).
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {boolean}
 */
function isRedAccentColor(r, g, b) {
    const hsv = rgbToHsv(r, g, b);
    const hueInRange = (hsv.h >= 330 || hsv.h <= 30);
    return hueInRange && hsv.s >= 0.18 && hsv.v >= 0.10;
}

/**
 * Перекрашивает красные акценты кадра.
 * @param {HTMLImageElement} source
 * @param {'blue'|'black'} mode
 * @returns {HTMLCanvasElement}
 */
function recolorBananFrame(source, mode) {
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;
    const c = document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    const cctx = c.getContext('2d', { willReadFrequently: true });
    cctx.clearRect(0, 0, c.width, c.height);
    cctx.drawImage(source, 0, 0, c.width, c.height);

    const imgData = cctx.getImageData(0, 0, c.width, c.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        if (a < 8) continue;

        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        if (!isRedAccentColor(r, g, b)) continue;

        if (mode === 'blue') {
            const hsv = rgbToHsv(r, g, b);
            // Сохраняем светотень исходного пикселя, меняем только тон/насыщенность.
            const out = hsvToRgb(212, Math.min(1, Math.max(0.45, hsv.s * 0.92 + 0.12)), hsv.v);
            d[i] = out.r;
            d[i + 1] = out.g;
            d[i + 2] = out.b;
        } else {
            // Черный вариант: переводим в темные нейтральные оттенки с сохранением объема.
            const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            const shade = Math.max(8, Math.min(110, Math.round(8 + lum * 102)));
            d[i] = shade;
            d[i + 1] = shade;
            d[i + 2] = shade;
        }
    }

    cctx.putImageData(imgData, 0, 0);
    return c;
}

/**
 * Собирает перекрашенный набор кадров bananSprites.
 * @param {'dron'|'max'} playerType
 * @returns {Record<string, CanvasImageSource[]>}
 */
function buildBananVariantAnims(playerType) {
    const mode = (playerType === 'dron') ? 'blue' : 'black';
    const out = {};
    const animEntries = Object.entries(maxAnims);
    for (let i = 0; i < animEntries.length; i++) {
        const entry = animEntries[i];
        const animName = entry[0];
        const frames = entry[1];
        out[animName] = frames.map(frame => recolorBananFrame(frame, mode));
    }
    return out;
}

/**
 * Возвращает набор bananSprites с учетом выбранного персонажа.
 * kuzy  -> оригинальные (красные) кадры,
 * dron  -> красные акценты перекрашены в синие,
 * max   -> красные акценты перекрашены в черные.
 * @param {'kuzy'|'dron'|'max'|string} playerType
 * @returns {Record<string, CanvasImageSource[]>}
 */
function getBananAnimsByPlayerType(playerType) {
    if (playerType === 'kuzy') return maxAnims;
    if (playerType !== 'dron' && playerType !== 'max') return maxAnims;
    if (!areBaseBananAnimsReady()) return maxAnims;
    if (!bananAnimsVariantCache[playerType]) {
        bananAnimsVariantCache[playerType] = buildBananVariantAnims(playerType);
    }
    return bananAnimsVariantCache[playerType] || maxAnims;
}

// Спрайт врага 67
const enemy67Img = new Image();
let enemy67SpriteReady = false;
// Обработчик загрузки спрайта врага 67
enemy67Img.onload = () => { enemy67SpriteReady = true; };
enemy67Img.src = "img/67.png";

// Дополнительный спрайт врага 67 (опционально, для переключения через perf_debug)
const enemy67AltImg = new Image();
let enemy67AltSpriteReady = false;
enemy67AltImg.onload = () => { enemy67AltSpriteReady = true; };
enemy67AltImg.src = "img/67_alt.png";

// Покадровая PNG-анимация врага 67 (22 кадра)
const enemy67TpFrames = [];
let enemy67TpFramesReady = 0;
for (let i = 1; i <= 22; i++) {
    const img = new Image();
    img.onload = () => { enemy67TpFramesReady++; };
    const frameNum = String(i).padStart(4, '0');
    img.src = `img/tp/frame_${frameNum}.png`;
    enemy67TpFrames.push(img);
}

// Спрайты босса "Очко" (6 отдельных кадров)
const o4koImgs = [];
let o4koSpritesReady = 0;
for (let i = 1; i <= 6; i++) {
    const img = new Image();
    // Обработчик загрузки кадра босса "Очко"
    img.onload = () => { o4koSpritesReady++; };
    img.src = `img/bosso4ko/o${i}.png`;
    o4koImgs.push(img);
}

// Снаряды босса "Очко" (варианты "говна")
const o4koPoopImgs = [];
let o4koPoopReady = 0;
for (let i = 1; i <= 3; i++) {
    const img = new Image();
    img.onload = () => { o4koPoopReady++; };
    img.src = `img/o4ko/shit${i}.png`;
    o4koPoopImgs.push(img);
}

// Редкий банан-бонус для режима "Очко"
const bananaBonusImg = new Image();
let bananaBonusReady = false;
bananaBonusImg.onload = () => { bananaBonusReady = true; };
bananaBonusImg.src = "img/o4ko/banana_bonus.png";

// Победные бутылки для завершения уровня "Очко"
const o4koVictoryBeerImgs = [];
let o4koVictoryBeerReady = 0;
const o4koVictoryBeerPaths = [
    "img/beer/beer2.png",
    "img/beer/beer1.png",
    "img/beer/beer3.png"
];
for (let i = 0; i < o4koVictoryBeerPaths.length; i++) {
    const img = new Image();
    img.onload = () => { o4koVictoryBeerReady++; };
    img.src = o4koVictoryBeerPaths[i];
    o4koVictoryBeerImgs.push(img);
}

// Ресурсы режима платформ: рубин и кубок
const rubyImg1 = new Image();
let ruby1Ready = false;
// Обработчик загрузки первого рубина
rubyImg1.onload = () => { ruby1Ready = true; };
rubyImg1.src = "img/rub1.png";

const rubyImg2 = new Image();
let ruby2Ready = false;
// Обработчик загрузки второго рубина
rubyImg2.onload = () => { ruby2Ready = true; };
rubyImg2.src = "img/rub2.png";

const cupImg = new Image();
let cupImgReady = false;
// Обработчик загрузки кубка
cupImg.onload = () => { cupImgReady = true; };
cupImg.src = "img/cup.png";

// Табличка Букин
const bukinImg = new Image();
let bukinImgReady = false;
// Обработчик загрузки таблички Букин
bukinImg.onload = () => { bukinImgReady = true; };
bukinImg.src = "img/bukintablet.png";

// Спрайты босса "нАсок" (8 кадров)
const nosokImgs = [];
let nosokSpritesReady = 0;
for (let i = 1; i <= 8; i++) {
    const img = new Image();
    img.onload = () => { nosokSpritesReady++; };
    img.src = `img/nosok/nos${i}.png`;
    nosokImgs.push(img);
}

// Прозрачная текстура сетки ворот уровня "нАсок"
const goalNetImg = new Image();
let goalNetReady = false;
goalNetImg.onload = () => { goalNetReady = true; };
goalNetImg.src = "img/nosok/net.png";


/**
 * Создает PNG-текстуру бонуса "Кубик льда".
 * @returns {HTMLImageElement}
 */
function createIceCubeTexture() {
    const c = document.createElement('canvas');
    c.width = 180;
    c.height = 180;
    const cctx = c.getContext('2d');

    const g = cctx.createLinearGradient(20, 18, 152, 160);
    g.addColorStop(0, 'rgba(233,245,255,0.96)');
    g.addColorStop(1, 'rgba(73,151,255,0.88)');
    cctx.fillStyle = g;
    cctx.beginPath();
    cctx.roundRect(24, 24, 132, 132, 22);
    cctx.fill();

    cctx.strokeStyle = 'rgba(255,255,255,0.75)';
    cctx.lineWidth = 5;
    cctx.beginPath();
    cctx.moveTo(44, 54);
    cctx.lineTo(128, 44);
    cctx.moveTo(50, 94);
    cctx.lineTo(136, 84);
    cctx.moveTo(40, 124);
    cctx.lineTo(114, 112);
    cctx.stroke();

    cctx.strokeStyle = 'rgba(28,86,170,0.5)';
    cctx.lineWidth = 3;
    cctx.strokeRect(27, 27, 126, 126);

    const img = new Image();
    img.src = c.toDataURL('image/png');
    return img;
}

// Реальные PNG-текстуры уровня "нАсок" (без canvas/fallback)
const soccerBallImg = new Image();
soccerBallImg.src = "img/nosok/soccer_ball.png";
const stinkySockImg = new Image();
stinkySockImg.src = "img/nosok/stinky_sock.png";
const rottenFishImg = new Image();
rottenFishImg.src = "img/nosok/rotten_fish.png";
const iceCubeImg = createIceCubeTexture();
// Бонус "Динамит" в режиме "нАсок":
// используем тот же PNG, что и у пули-бомбы врага 67 (🧨).
const dynamiteImg = new Image();
dynamiteImg.src = "img/emoji/1f9e8.png";
