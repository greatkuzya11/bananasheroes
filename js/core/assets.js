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

// Спрайты босса "Носок" (8 кадров)
const nosokImgs = [];
let nosokSpritesReady = 0;
for (let i = 1; i <= 8; i++) {
    const img = new Image();
    img.onload = () => { nosokSpritesReady++; };
    img.src = `img/nosok/nos${i}.png`;
    nosokImgs.push(img);
}

// Прозрачная текстура сетки ворот уровня "Носок"
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

/**
 * Создает PNG-текстуру бонуса "Динамит".
 * @returns {HTMLImageElement}
 */
function createDynamiteTexture() {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 200;
    const cctx = c.getContext('2d');

    cctx.fillStyle = 'rgba(0,0,0,0.35)';
    cctx.beginPath();
    cctx.ellipse(98, 146, 62, 20, 0, 0, Math.PI * 2);
    cctx.fill();

    const body = cctx.createLinearGradient(28, 72, 170, 140);
    body.addColorStop(0, '#ed2d2d');
    body.addColorStop(1, '#ad1010');
    cctx.fillStyle = body;
    cctx.beginPath();
    cctx.roundRect(28, 78, 144, 64, 20);
    cctx.fill();

    cctx.fillStyle = '#f9d24a';
    cctx.fillRect(38, 94, 124, 10);
    cctx.fillRect(38, 120, 124, 10);

    cctx.strokeStyle = '#2b1b08';
    cctx.lineWidth = 5;
    cctx.beginPath();
    cctx.moveTo(164, 86);
    cctx.quadraticCurveTo(186, 64, 172, 34);
    cctx.stroke();

    const spark = cctx.createRadialGradient(172, 28, 2, 172, 28, 14);
    spark.addColorStop(0, '#fff5cf');
    spark.addColorStop(0.5, '#ffd54f');
    spark.addColorStop(1, 'rgba(255,167,38,0)');
    cctx.fillStyle = spark;
    cctx.beginPath();
    cctx.arc(172, 28, 14, 0, Math.PI * 2);
    cctx.fill();

    const img = new Image();
    img.src = c.toDataURL('image/png');
    return img;
}

// Реальные PNG-текстуры уровня "Носок" (без canvas/fallback)
const soccerBallImg = new Image();
soccerBallImg.src = "img/nosok/soccer_ball.png";
const stinkySockImg = new Image();
stinkySockImg.src = "img/nosok/stinky_sock.png";
const rottenFishImg = new Image();
rottenFishImg.src = "img/nosok/rotten_fish.png";
const iceCubeImg = createIceCubeTexture();
const dynamiteImg = createDynamiteTexture();

