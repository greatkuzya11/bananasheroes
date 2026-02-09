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

