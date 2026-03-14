# Banana Heroes — Архитектура и руководство разработчика

> Версия: март 2026. Цель документа — дать любому ИИ-агенту или разработчику полное понимание устройства игры, чтобы добавлять уровни и механики без неожиданных поломок.

---

## Содержание

1. [Структура файлов](#1-структура-файлов)
2. [Технический стек и точка входа](#2-технический-стек-и-точка-входа)
3. [Игровой цикл](#3-игровой-цикл)
4. [Глобальное состояние](#4-глобальное-состояние)
5. [Константы](#5-константы)
6. [Система ввода (клавиатура + тач)](#6-система-ввода-клавиатура--тач)
7. [Персонажи игрока](#7-персонажи-игрока)
8. [Враги и боссы](#8-враги-и-боссы)
9. [Система пуль](#9-система-пуль)
10. [Платформы](#10-платформы)
11. [Система спавна](#11-система-спавна)
12. [Система обновления (update)](#12-система-обновления-update)
13. [Система отрисовки (draw)](#13-система-отрисовки-draw)
14. [Бонусы и дропы](#14-бонусы-и-дропы)
15. [Прогрессия и открытие уровней](#15-прогрессия-и-открытие-уровней)
16. [Описание всех игровых режимов](#16-описание-всех-игровых-режимов)
17. [Мобильный адаптив](#17-мобильный-адаптив)
18. [Звуковая система](#18-звуковая-система)
19. [Ресурсы (assets)](#19-ресурсы-assets)
20. [UI и оверлеи](#20-ui-и-оверлеи)
21. [localStorage — все ключи](#21-localstorage--все-ключи)
22. [Как добавить новый уровень](#22-как-добавить-новый-уровень)
23. [Как добавить новую механику](#23-как-добавить-новую-механику)
24. [Критические технические нюансы](#24-критические-технические-нюансы)
25. [Юнит-тесты](#25-юнит-тесты)

---

## 1. Структура файлов

```
bananasheroes/
├── index.html            ← единственная HTML-страница, всё меню и канвас
├── style.css             ← стили меню, оверлеев, тач-контролов
├── sw.js                 ← Service Worker (PWA / оффлайн кэш)
├── package.json          ← npm-манифест (devDeps: vitest, @vitest/coverage-v8, jsdom)
├── vitest.config.js      ← конфигурация Vitest (environment: jsdom, globals: true)
├── tests/                ← юнит-тесты (Vitest)
│   ├── setup/
│   │   ├── globals.js    ← моки браузерных API и игровых глобалов
│   │   └── loadScript.js ← загрузчик игровых JS-файлов в тестовый контекст
│   └── unit/
│       ├── core.config.test.js          ← 13 тестов: константы и config-функции
│       ├── core.utils.test.js           ← 11 тестов: rect(), playerHitTest()
│       ├── core.mobileAdaptive.test.js  ← 20 тестов: BHMobileAdaptive
│       ├── core.progression.test.js     ← 36 тестов: прогрессия, localStorage
│       ├── systems.bullets.test.js      ← 21 тест: shootPlayerBullet()
│       ├── entities.platform.test.js    ← 20 тестов: класс Platform
│       ├── entities.player.test.js      ← 43 теста: класс Player
│       └── entities.bosses.test.js      ← 30 тестов: Enemy67, BossO4ko, BossNosok
├── audio/                ← .mp3 / .ogg звуки
├── img/                  ← все картинки (PNG, JPG)
│   ├── PNG Sequences/    ← кадры анимаций Кузи (папки по состояниям)
│   ├── bananSprites/     ← кадры анимаций Макса (walk, shootOnWalk, …)
│   ├── dron/             ← кадры анимации босса/Дрона (d1.png … d7.png)
│   ├── kuzya/            ← кадры анимации Кузи-NPC (1.png … 6.png)
│   ├── book/             ← кадры анимации книг (режим Library)
│   ├── platform*.png     ← текстуры платформ (1..9)
│   └── bg-*.png          ← фоновые изображения уровней
└── js/
    ├── main.js           ← точка входа DOMContentLoaded, игровой цикл loop()
    ├── perf_debug.js     ← отладочные инструменты производительности
    ├── core/
    │   ├── config.js     ← все игровые константы (PLAYER_LIVES, FRAME_W, …)
    │   ├── state.js      ← ВСЕ глобальные переменные + resetGameRuntimeCore()
    │   ├── assets.js     ← загрузка всех Image() объектов (спрайты, фоны)
    │   ├── progression.js← логика прогрессии, localStorage, CAMPAIGN_LEVEL_ORDER
    │   ├── utils.js      ← rect(), playerHitTest() и вспомогательные функции
    │   ├── audio.js      ← система BHAudio (Web Audio API)
    │   └── mobileAdaptive.js ← класс BHMobileAdaptive (масштаб, баланс)
    ├── entities/
    │   ├── player.js     ← класс Player (движение, прыжок, анимация)
    │   ├── platform.js   ← класс Platform (статичные и движущиеся платформы)
    │   ├── enemy67.js    ← класс Enemy67 (телепузик, режимы 67/platforms)
    │   ├── bossO4ko.js   ← класс BossO4ko (босс Очко, режим o4ko)
    │   └── bossNosok.js  ← класс BossNosok (вратарь, режим nosok/stepan)
    ├── systems/
    │   ├── update.js     ← главный update(dt): маршрутизирует по gameMode
    │   ├── draw.js       ← главный draw(): маршрутизирует по gameMode
    │   ├── bullets.js    ← shootPlayerBullet(), обновление/столкновение пуль
    │   └── spawn.js      ← спавн платформ, врагов сирени, бонусов
    ├── render/
    │   ├── draw.js       ← общий рендер (фон, HUD, спич-баллоны, взрывы)
    │   └── lilac.js      ← кэшированная отрисовка сирени
    ├── modes/
    │   ├── nosok.js      ← режим "Носок" / "Степан"
    │   ├── runner.js     ← режим "Бегун"
    │   ├── lovlyu.js     ← режим "Ловлю" / "Поймал"
    │   ├── bonus.js      ← финальный бонусный уровень
    │   ├── library.js    ← режим "Библиотека"
    │   └── tutorial.js   ← режим обучения (в разработке)
    └── ui/
        └── overlays.js   ← showLevelComplete(), showGameOver(), стартовые таблички
```

---

## 2. Технический стек и точка входа

- **Чистый JavaScript (ES6 классы, без сборщиков/фреймворков).**
- Canvas 2D API — всё рисуется в `<canvas id="canvas">`.
- Все JS-файлы подключены `<script>` в `index.html` в строго определённом порядке:
  1. `config.js` → 2. `state.js` → 3. `assets.js` → 4. `audio.js` → 5. `mobileAdaptive.js` → 6. `progression.js` → 7. `utils.js` → 8. Entities → 9. Systems → 10. Modes → 11. UI → 12. `main.js`
- **ВАЖНО**: нет `import/export`. Все функции и переменные — глобальные. Порядок `<script>` тегов критичен — файл, использующий функцию, должен идти после файла, определяющего её.
- Canvas масштабируется через CSS (`width: 100%; height: 100%;`), физические пиксели задаются через `canvas.width = window.innerWidth; canvas.height = window.innerHeight;` при старте и при изменении размера окна.

---

## 3. Игровой цикл

```
DOMContentLoaded
    └── initGame()
           ├── настройка canvas, тач-контролов, input-обработчиков
           └── startLevel(mode) ← запускает нужный режим
                   └── running = true
                          └── requestAnimationFrame(loop)
                                 ├── dt = (ts - last) / 1000  ← дельта в секундах
                                 ├── update(dt)               ← логика
                                 └── draw()                   ← рендер
```

- `dt` (delta time) — время между кадрами в **секундах** (~0.016 при 60 fps).
- **Desktop**: движение/скорость задаётся в условных юнитах «пикселей за кадр» (старый подход), умноженных на `moveMul = 1`.
- **Mobile landscape**: `moveMul = dt * 60 * adaptiveScale`, что делает скорость кадронезависимой.
- При `paused === true` `update()` не вызывается, только `draw()`.

---

## 4. Глобальное состояние

Файл: `js/core/state.js`

Все переменные — глобальные (`let`). Никакого инкапсулирования нет — это сознательное решение для простоты доступа из любого файла.

### Главные группы переменных

| Переменная | Тип | Назначение |
|---|---|---|
| `canvas`, `ctx` | HTMLCanvasElement, CanvasRenderingContext2D | Ссылки на элемент и контекст |
| `gameMode` | string | Текущий режим: `'normal'`, `'survival'`, `'67'`, `'o4ko'`, `'nosok'`, `'stepan'`, `'platforms'`, `'lovlyu'`, `'poimal'`, `'runner'`, `'library'`, `'bonus'`, `'tutorial'` |
| `player` | Player\|null | Текущий объект игрока |
| `keys` | Object | Словарь нажатых клавиш: `keys['ArrowLeft'] === true` если нажата |
| `bullets` | Array | Пули игрока: `{x, y, r, vx, vy, emoji, dir, isBonus, rotation, playerType, hitRadius, img?}` |
| `enemyBullets` | Array | Пули врагов: `{x, y, r, vx, vy, emoji?, color?}` |
| `enemies` | Array | Враги-сирени: plain objects с полями `{x, y, w, h, dir, flowers, shootTimer, …}` |
| `boss`, `enemy67`, `bossO4ko`, `bossNosok` | class\|null | Боссы по типам |
| `bottles` | Array | Упавшие бутылки пива (бонус) |
| `hearts` | Array | Упавшие сердечки (восстановление жизни) |
| `bananaBonuses` | Array | Бонусы-бананы (увеличивают очки) |
| `explosions` | Array | Визуальные взрывы: `{x, y, r, timer, maxTimer, color?}` |
| `speechBalloons` | Array | Речевые облачка: `{x, y, timer, duration, text, type}` |
| `platforms` | Array | Платформы (режим platforms) |
| `homePlatform` | Platform\|null | Стартовая платформа (точка возврата при падении) |
| `lives` | number | Текущие жизни (начинается с PLAYER_LIVES=7) |
| `score` | number | Очки |
| `combo` | number | Текущее комбо (сбрасывается при пропуске/уроне) |
| `invuln` | number | Таймер неуязвимости в секундах (убывает каждый кадр) |
| `bonusShots` | number | Оставшиеся бонусные выстрелы |
| `bonusMode` | boolean | Включён ли расход бонусных выстрелов |
| `playerBulletDir` | string | Направление пули: `'up'`, `'left'`, `'right'` |
| `altShootMode` | boolean | Альт-режим: стрелки = направление + движение одновременно |
| `selectedChar` | string | Выбранный персонаж: `'kuzy'`, `'max'`, `'dron'` |
| `selectedSpriteSystem` | string | Система спрайтов (может отличаться от персонажа, хранится в localStorage) |
| `running` | boolean | Игровой цикл активен |
| `paused` | boolean | Пауза |
| `levelCompleteShown` | boolean | Флаг, что экран победы уже отображён |
| `gameOverShown` | boolean | Флаг, что экран поражения уже отображён |

### Сброс состояния

`resetGameRuntimeCore()` — сбрасывает все массивы и боевые переменные к стартовым значениям. Вызывается перед каждым стартом уровня. **НЕ сбрасывает** `selectedChar`, `selectedSpriteSystem`, прогрессию.

---

## 5. Константы

Файл: `js/core/config.js`

```js
PLAYER_LIVES = 7          // жизни при старте
INVULN_TIME  = 0.5        // сек неуязвимости после удара
BONUS_SHOTS_PER_BOTTLE = 3// зарядов бонуса за 1 бутылку
BONUS_CHANCE = 0.1        // 10% шанс дропа бутылки при убийстве
HEART_CHANCE = 0.08       // 8% шанс дропа сердца при убийстве
SPEECH_BALLOON_DURATION = 1.0 // сек показа облачка
PLAYER_SPEED = 7          // скорость игрока (пкс/кадр в desktop-режиме)
ENEMY_ROWS = 3, ENEMY_COLS = 7  // сетка врагов-сирени в normal/survival
REF_WIDTH = 1920, REF_HEIGHT = 1080  // референсное разрешение для адаптива
```

---

## 6. Система ввода (клавиатура + тач)

Файл: `js/main.js` (внутри DOMContentLoaded)

### Архитектура двойного источника

Объект `inputSourceState` хранит два `Set`:
- `keyboard` — клавиши, нажатые физической клавиатурой
- `touch` — виртуальные клавиши, нажатые тач-кнопками

Финальный `keys[key]` = `keyboard.has(key) || touch.has(key)`.

Это важно: при снятии нажатия с одного источника клавиша остаётся нажатой, если удерживается в другом.

### Клавиши управления

| Клавиша | Действие |
|---|---|
| `ArrowLeft` / `ArrowRight` | Движение (в altShootMode — тоже меняет `playerBulletDir`) |
| `ArrowUp` | Прыжок (удержание увеличивает высоту для kuzy/dron) |
| `ArrowDown` | Цикличная смена направления пули (в обычном режиме) / прицел вверх (в altShootMode) |
| `Space` / `z` / `Z` | Стрельба (обрабатывается в `player.update`) |
| `Shift` | Включить/выключить бонусный режим |
| `Control` | Переключить `altShootMode` |
| `Escape` | Пауза/снятие паузы |

### Тач-контролы

HTML-элемент `#touch-controls` содержит кнопки с `data-key` атрибутами. Каждая кнопка имеет:
- `data-hold="1"` — работает пока зажата (движение, прыжок, огонь)
- `data-tap="1"` — срабатывает по нажатию (бонус, alt, dir)

Тач-контролы видны **только** на устройствах с `pointer: coarse` (touch-устройства). При повороте экрана (`orientationchange`) контролы обновляются.

В меню паузы игрок может:
- Перетаскивать блоки кнопок
- Изменять размер (+/−)
- Переключать режим прыжка (отдельная кнопка UP или свайп джойстиком вверх)

---

## 7. Персонажи игрока

Файл: `js/entities/player.js`

Класс `Player` создаётся через `new Player(type, spriteSystem)`.

### Три типа персонажа

| Параметр | `kuzy` | `max` | `dron` |
|---|---|---|---|
| `jumpStyle` | `'kuzy'` | `'max'` | `'dron'` |
| Механика прыжка | Физика + плавный набор скорости | Баллистика (одна дуга) | Физика + мгновенный буст |
| `jumpRampFactor` | `4.0` (плавнее) | — | `6.0` (резче) |
| Удержание прыжка | Да, увеличивает высоту до `jumpMaxHeight` | **Нет** (высота фиксирована) | Да, мгновенный буст скорости вверх |
| `jumpMaxHeight` | `1.5 * h` | высокая фиксированная дуга | `1.5 * h` |
| `jumpHoldMax` | `0.6` сек | — | `0.6` сек |
| Пуля (emoji) | 💦 (r=18, speed=6) | 💩 (r=10, speed=11) | 🌀 (r=14, speed=9) |
| Бонусная пуля | Увеличенная 💦 | 3 пули веером 💩💩💩 | Увеличенный 🌀 |
| `effectiveW` | `w * 0.6` (прозрачные бока!) | `w` | `w` |
| Анимация | PNG Sequences (18 состояний) | PNG кадры (walk, shootOnWalk…) | Emoji-кружок (нет PNG) |

### Важно про effectiveW

**Кузя** имеет `effectiveW = w * 0.6`. Это потому что его спрайты 900×900 px имеют ~20% прозрачного поля с каждого бока. Это влияет на:
1. Коллизию `playerHitTest()` — используется `isOpaqueAtWorld()` по альфа-маске
2. Хитбоксы в некоторых режимах

### Физика прыжков (детально)

**max (`jumpStyle='max'`)**:
- При прыжке задаётся начальная `vy` через `canvas.height * 2.45` (баллистика)
- `vy += gravity * dt` каждый кадр
- Удержание кнопки НЕ влияет на прыжок

**dron (`jumpStyle='dron'`)**:
- Каждый кадр пока `jumpTimer <= half && keys["ArrowUp"]`:
  - `jumpHoldTimer` нарастает до `jumpHoldMax`
  - `desiredV0 = 2 * (min + (max-min)*k) * nosokJumpMul`
  - Если текущая `-vy < desiredV0` → `vy = -desiredV0` (мгновенный буст)

**kuzy (`jumpStyle='kuzy'`)**:
- То же, но вместо мгновенного буста: `vy += (desiredVy - vy) * min(1, rampFactor * dt)` — плавная интерполяция

### Режим платформ (gameMode === 'platforms')

Когда `gameMode === 'platforms'`, `Player.update()` дополнительно:
1. Проверяет коллизию с каждой платформой (центр игрока должен быть над платформой)
2. Применяет гравитацию при падении (vy += 800 * dt)
3. Двигает игрока вместе с горизонтальной платформой (`platformDeltaX`)
4. При падении `y > canvas.height`: `lives--`, телепорт на `homePlatform`

### altShootMode

При `altShootMode = true`:
- `ArrowLeft` → движение влево И `playerBulletDir = 'left'`
- `ArrowRight` → движение вправо И `playerBulletDir = 'right'`
- `ArrowDown` → `playerBulletDir = 'up'` (прицел вверх)
- Стрельба происходит по `playerBulletDir`, обновляющемуся в реальном времени

---

## 8. Враги и боссы

### Сирень (lilac)

Plain object в массиве `enemies[]`:
```js
{
  x, y, w, h,
  dir: 1 | -1,        // направление движения
  diving: false,       // пикирует ли вниз
  targetX, targetY,   // цель при пикировании
  shootTimer,         // таймер стрельбы
  flowers: [{relX, relY, rad, sizeK, color}],  // параметры рисования
  lilacSprite: null,  // кэш Canvas (создаётся при первой отрисовке)
  platformIndex: -1   // для режима platforms
}
```
- Рисуется через `drawLilacCached()` — отрисовывает на отдельный Canvas при первом вызове, потом кэширует
- Движется горизонтально, иногда пикирует вниз к игроку
- Стреляет вниз (или к игроку в ряду) `enemyBullets`

### Enemy67 (Телепузик)

Класс в `js/entities/enemy67.js`:
- Используется в режимах `67`, `platforms`, `mode67`
- В режиме `67`: HP=67, размер полэкрана, движется к игроку, стреляет `['🪳','🧨','7️⃣','6️⃣','💩']`
- В режиме `platforms`: HP=76, сидит на `bossPlatform` (не движется), атакует чаще
- `AnimIntervalTp = 0.075` — покадровая PNG анимация (tp = Teletubbies animation frames)
- Хранится в глобальной переменной `enemy67`

### BossO4ko (Очко)

Класс в `js/entities/bossO4ko.js`:
- Используется только в режиме `o4ko`
- HP = 120, 4 фазы здоровья
- Поведение: ходьба по правой зоне (55%+ ширины), прыжки, рывки, удары об землю (волна)
- **Фазы HP**: при каждых ~30 HP появляется уязвимость (можно бить) + меняется агрессивность
- **Ярость (Ф4)**: при HP < 30% активируется `rageState`, ультра-частота атак
- Дропает бутылки/бананы при хорошем стрике (`o4koHitStreak`)

### BossNosok (Носок)

Класс в `js/entities/bossNosok.js`:
- Вратарь в правой зоне, `goalX = canvas.width * 0.9`
- Следит за мячом (bossNosok), прыгает, бросает `рыбу` вглубь поля
- Freeze-состояние после пропущенного гола (уязвим на это время)
- Knockback при ударе рыбой в игрока

---

## 9. Система пуль

Файл: `js/systems/bullets.js`

### Выстрел игрока — `shootPlayerBullet(player)`

1. Определяет `r`, `speed`, `emoji` по `player.type`
2. Если `bonusMode && bonusShots > 0` → увеличивает r×1.8, speed×1.8, цвет gold, `bonusShots--`
3. Макс-бонус: 3 пули под углом ±15°
4. Добавляет объект в `bullets[]`

### Структура объекта пули

```js
{
  x, y, r,           // позиция и радиус
  vx, vy,            // скорость компонентами
  speed,             // скалярная скорость (для справки)
  color,             // резервный цвет
  emoji,             // эмодзи (рисуется через getEmojiBitmap)
  dir,               // 'up' | 'left' | 'right'
  isBonus,           // флаг бонусности
  rotation,          // угол поворота (для анимации)
  swayAge,           // возраст покачивания (для волнистого полёта Кузи)
  playerType,        // 'kuzy' | 'max' | 'dron'
  hitRadius,         // фактический радиус коллизии (r * 2)
  img?               // картинка (у пули Макса — maxBulletImg)
}
```

### Обновление пуль (в `update.js`)

Каждый кадр:
1. `x += vx * frameMul`, `y += vy * frameMul`
2. **Пули Кузи (💦) покачиваются**: `vy += waveAmp * sin(swayAge * freq) * frameMul`
3. Проверка выхода за край → удалить
4. Коллизия с врагами → `enemy.hp--` / удалить врага, спавн дропа
5. Коллизия `enemyBullets` с игроком → `playerHitTest()` → `lives--`, `invuln = INVULN_TIME`

---

## 10. Платформы

Файл: `js/entities/platform.js`

```js
new Platform(x, y, w, h, movePattern, speed, range, imageSrc, visible, options)
```

| Параметр | Описание |
|---|---|
| `movePattern` | `null` — статичная, `'horizontal'` — влево-вправо, `'vertical'` — вверх-вниз |
| `speed` | Скорость движения (используется как коэффициент в `sin(moveTimer * speed/range)`) |
| `range` | Амплитуда качания в пикселях |
| `imageSrc` | Путь к текстуре (например `'img/platform3.png'`), или `null` — нарисует деревянный прямоугольник |
| `visible` | `false` — невидимая (но физика работает, используется для невидимых стен / ловушек) |
| `options.solid` | По умолчанию `true`; `false` = сквозная платформа |
| `options.isGoalSensor` | `true` = используется как триггер гола (режим nosok) |

### Физика коллизии

Успешнее всего воспринимают поверхность платформы по **центру** игрока (горизонтально) и **нижней границе** игрока с допуском `p.h * 0.28`.

Игрок стоит на платформе если:
- `playerCenterX >= p.x && playerCenterX <= p.x + p.w`
- `player.y + player.h` примерно равно верхушке платформы (±10px)

Горизонтальное движение платформы передаётся игроку через `platformDeltaX = p.x - p.prevX`.

---

## 11. Система спавна

Файл: `js/systems/spawn.js`

### Отложенный спавн (pendingEnemySpawnTimeouts)

Отдельный массив `pendingEnemySpawnTimeouts[]` хранит все `setTimeout`-ID. При перезапуске уровня или Game Over вызывается `clearScheduledEnemySpawns()`, чтобы не было «призраков» из старого уровня.

Вместо прямого `setTimeout(...)` всегда использовать `scheduleEnemySpawnTimeout(cb, ms)` — он регистрирует таймер в массиве.

### Инициализация платформенного уровня

`initPlatformLevel()` создаёт все платформы в процентах от `canvas.width/height` — это гарантирует работу на любом разрешении.

### Параметры сетки сирени

`getLilacFormationLayout()` возвращает `{startX, startY, spacingX, spacingY, enemyW, enemyH}` с учётом мобильного адаптива.

Desktop значения: `startX=100, startY=60, spacingX=120, spacingY=100`.
Mobile: масштабируются пропорционально `canvas.width / REF_WIDTH`.

---

## 12. Система обновления (update)

Файл: `js/systems/update.js`

Главная функция `update(dt)` — диспетчер:

```js
function update(dt) {
    if (gameMode === 'nosok' || gameMode === 'stepan') { updateNosokMode(dt); return; }
    if (gameMode === 'lovlyu' || gameMode === 'poimal') { updateLovlyuMode(dt); return; }
    if (gameMode === 'runner')   { updateRunnerMode(dt);   return; }
    if (gameMode === 'bonus')    { updateBonusMode(dt);    return; }
    if (gameMode === 'tutorial') { updateTutorialMode(dt); return; }
    // Для остальных режимов (normal, survival, 67, mode67, o4ko, platforms): общий код ниже
}
```

**Режимы с общим update**: `normal`, `survival`, `67`, `mode67`, `o4ko`, `platforms`.

В общем update за один кадр происходит:
1. Убывание `invuln`
2. Обновление платформ (`platforms.forEach(p => p.update(dt))`)
3. `player.update(dt)`
4. `enemy67?.update(dt)`, `bossO4ko?.update(dt)`, `bossNosok?.update(dt)`
5. Движение врагов-сирени, их пикирование к игроку, стрельба
6. Обновление `enemyBullets` (движение + коллизия с игроком)
7. Обновление `bullets` (движение + коллизия с врагами)
8. Обновление `bottles`, `hearts`, `bananaBonuses` — падение и коллизия с игроком
9. Обновление `speechBalloons` (убывание timer)
10. Обновление `explosions`
11. Падение `bukinTablet` — физика финальной таблички Букина (финал `normal`)
12. Падение 3 бутылок победы (`o4koVictorySequenceActive`)
13. Проверка конца уровня → `showLevelComplete()`

---

## 13. Система отрисовки (draw)

Файл: `js/render/draw.js` (основная функция) + `js/systems/draw.js` (вероятно то же, проверь)

Главная функция `draw()`:

1. `ctx.clearRect(0, 0, canvas.width, canvas.height)` — очистка экрана
2. Фон — `ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)`
3. Специфичные рендеры по `gameMode` — диспетчер аналогичен `update()`
4. Общие элементы: платформы, сирень, пули, взрывы, речевые облачка
5. HUD — обновляется в DOM (`#hud` элемент), не на canvas

### Речевые облачка (speechBalloons)

```js
speechBalloons.push({ x, y, timer: 0, duration: 1.0, text: 'Текст', type: 'default' | 'buk' })
```
- `type = 'buk'` → стиль Букина (большой шар)
- `type = 'default'` → стандартный

Отрисовка через `drawSpeechBalloonAdaptive(sb, mode)` — масштабирует размер шрифта под мобильный режим.

### HUD

HUD рендерится в HTML-элементе `#hud`, не на canvas. Это позволяет использовать CSS и не перерисовывать каждый кадр. Обновление происходит только при реальном изменении значений (`lastHudLives`, `lastHudHtml`).

---

## 14. Бонусы и дропы

### Бутылки пива (bonusShots)

- Дроп при убийстве врага: `BONUS_CHANCE = 10%`
- `bottles[]` — падающие объекты, при коллизии с игроком: `bonusShots += BONUS_SHOTS_PER_BOTTLE` (3 заряда)
- Включить трату: `bonusMode = true` (клавиша Shift или кнопка BONUS на тач)
- В `shootPlayerBullet()` если `bonusMode && bonusShots > 0`: расход 1 заряда, усиление пули
- При `bonusShots === 0`: `bonusMode = false` автоматически

### Сердечки (hearts)

- Дроп при убийстве: `HEART_CHANCE = 8%`
- `hearts[]` — при коллизии с игроком: `lives = Math.min(lives + 1, PLAYER_LIVES)`

### Бонусы-бананы (bananaBonuses)

- `bananaBonuses[]` — при коллизии: `score += 50` (или другой бонус, зависит от режима)
- В `o4ko`: дропаются при стрике `o4koHitStreak >= 15`

### Магнит (режим lovlyu)

- `lovlyuMagnetActive = true` — все персонажи притягиваются к игроку со скоростью умноженной на коэффициент
- Длительность `lovlyuMagnetDuration = 10` сек

### Молния (режим lovlyu)

- `lovlyuLightningActive = true` — автоматическая поимка персонажей (не надо стоять под ними)
- Длительность `lovlyuLightningDuration = 13` сек

---

## 15. Прогрессия и открытие уровней

Файл: `js/core/progression.js`

### Порядок кампании

```js
CAMPAIGN_LEVEL_ORDER = [
    'normal',    // 1. Сирень и Букин
    '67',        // 2. Телепузик
    'o4ko',      // 3. Очко
    'nosok',     // 4. Носок
    'platforms', // 5. Опять Телепузик
    'lovlyu',    // 6. Ловлю
    'runner',    // 7. Бегун
    'library'    // 8. Библиотека (ФИНАЛ)
]
```

### Правила открытия

| Режим | Условие открытия |
|---|---|
| `normal` | Открыт всегда |
| `67` .. `runner` | Открываются последовательно после прохождения предыдущего |
| `library` | Только если пройдены ВСЕ 7 уровней `CAMPAIGN_RUN_LEVELS` |
| `survival` | После прохождения `normal` (`bh_survival_unlocked_v1`) |
| `poimal` | После прохождения `lovlyu` (`bh_poimal_unlocked_v1`) |
| `stepan` | После прохождения `nosok` (`bh_stepan_unlocked_v1`) |
| `mode67` | После прохождения `67` (`bh_mode67_unlocked_v1`) |
| `bonus` | После первого завершения всей игры (`bh_game_completed_once_v1`) |
| `tutorial` | Всегда доступен |

### Механизм сохранения прогресса

- `bh_level_completed_v1_{mode}` = `'1'` — уровень пройден
- `bh_campaign_unlocked_index_v1` — старый индексный прогресс (поддерживается для миграции)
- `migrateLegacyProgressToCompletionFlags()` — одноразовая миграция старого формата в новый

### Отображение в меню

`refreshModeButtonsByProgress()` вызывается при старте и после каждого завершения уровня:
- Заблокированные кнопки: `disabled=true, opacity=0.48, cursor='not-allowed'`
- Пройденные кнопки: CSS-класс `mode-completed`

### Защита через Tutorial

Перед запуском **любого** режима кроме `tutorial` вызывается `canLaunchMode(mode)`:
```js
function canLaunchMode(mode) {
    if (mode === 'tutorial') return true;
    if (isTutorialDone()) return true;  // localStorage.getItem('bh_tutorial_done_v1') === '1'
    showTutorialHint();
    return false;
}
```

---

## 16. Описание всех игровых режимов

### normal — «Сирень и Букин»

- Сетка 3×7 = 21 сирени
- 3 фазы (`normalPhase 1→3`): фаза 1 — медленные, фаза 3 — быстрые и плотные
- Финал: появляется BossO4ko? (нет, финал — падение таблички Букина через `bukinTablet`)
- После победы падает табличка Букина и вызывается `showLevelComplete()`

### survival — «Выживание»

- Бесконечные волны сирени с нарастающей скоростью
- `survivalEnemySpeedIncrease`, `survivalBulletSpeedIncrease`, `survivalSpeedUps` — растут через `scheduleEnemySpawnTimeout`
- Нет победного условия, только Game Over / выход в меню

### 67 — «Телепузик»

- `enemy67 = new Enemy67(...)` с HP=67
- Враг движется к игроку, стреляет emoji-снарядами
- Дополнительные волны сирени появляются по таймеру
- После смерти врага `showLevelComplete()`

### o4ko — «Очко»

- `bossO4ko = new BossO4ko(...)` с HP=120
- 4 фазы: меняется агрессивность, скорость, частота атак
- Случайные дропы каждые 15 сек (`o4koRandomDropTimer`)
- Финал: `startO4koVictorySequence()` — 3 бутылки падают с неба

### nosok — «Носок»

- Режим мини-футбола: игрок бьёт мяч (`nosokBall`) в ворота
- `nosokGoals` нужно набрать `nosokTargetGoals = 10`
- `bossNosok` — вратарь, защищает ворота
- Специальные бонусы: лёд (замораживает), динамит (взрыв мяча), ускорение
- Финал по времени или голам

### stepan — «Степан»

- Та же механика, что nosok, но без лимита голов
- Открывается после победы в nosok

### platforms — «Опять Телепузик»

- `gameMode = 'platforms'` — активирует физику платформ в Player
- 6 платформ с разным движением (статичные, горизонтальные, вертикальные)
- `enemy67 = new Enemy67(..., platformMode=true)` на `bossPlatform` с HP=76
- Враги-сирени на средних платформах
- `platformRuby` и `platformCup` — коллекционные объекты для очков

### lovlyu — «Ловлю»

- 50 Кузей падают сверху, игрок должен их поймать
- Нужно поймать все 50 (`lovlyuTotalSpawns`)
- Промах = не трагедия, но враги всё равно ходят
- Бонусы: магнит (10 сек), молния (13 сек)

### poimal — «Поймал»

- Бесконечные волны падающих Кузей (нет лимита)
- Три фазы ускорения (`poimalCurrentPhase 3→1`) управляемые `poimalPhaseCycleActive`

### runner — «Бегун»

- Сайд-скроллер: игрок бежит вправо, препятствия летят навстречу
- `runnerBoss` — Прапор справа, идёт на встречу
- Сигареты, энергетики — временные бонусы скорости
- `runnerPlatforms[]` — платформы в этом режиме полностью отдельные от `platforms[]`
- При победе (игрок добегает до Прапора) — сцена встречи

### library — «Библиотека»

- Книги падают сверху, унитаз (toilet) должен их поймать
- 3 вида книг (7 PNG обложек)
- Боссы по очереди появляются и мешают: o4ko, nosok, как teletubbies
- Финальный уровень кампании

### bonus — Финальный бонусный уровень

- Открывается после полного прохождения игры
- Сцена: Прапор, Макс, Кузи — говорят фразы
- Только кинематик, не боевой уровень

### mode67 — «Режим 67»

- Усиленный вариант режима 67 (более агрессивный враг)
- Открывается после прохождения 67

---

## 17. Мобильный адаптив

Файл: `js/core/mobileAdaptive.js` — класс `BHMobileAdaptive`, экспортируется как `window.BHMobileAdaptive`.

### Условие активации

Адаптив **включается только** при:
1. Устройство touch (coarse pointer или `maxTouchPoints > 0`)
2. Ориентация landscape (`width > height`)

Desktop и portrait — никаких изменений.

### Масштаб (`getScale(mode)`)

```
scale = min(canvas.width / 1920, canvas.height / 1080)
scale = clamp(scale, 0.4, 1.0)
```

### Что масштабируется

| Параметр | Механизм |
|---|---|
| Движение игрока | `moveMul = dt * 60 * adaptiveScale` вместо `1` |
| Скорость врагов | Умножается на `adaptiveScale * balMoveSpeed` |
| Скорость пуль врагов | Умножается на `balProjSpeed` |
| Частота стрельбы врагов | Умножается на `balFireRate` |
| Падение дропов | Умножается на `balDropFallSpeed` |
| Радиусы пуль игрока | `r = max(4, r * adaptiveScale)` |
| Размер врагов | Умножается на `adaptiveScale` в конструкторах |
| Скорость платформ | `platformSpeedMul` в `initPlatformLevel()` |

### Баланс-профили (`getBalance(mode)`)

Каждый режим имеет профиль коэффициентов < 1, чтобы mobile-версия была чуть проще:
```js
nosok: { enemyFireRate: 0.85, bossMoveSpeed: 0.95, homing: 0.90 }
o4ko:  { enemyFireRate: 0.90, homing: 0.95 }
// и т.д.
```

### frameMul vs moveMul

Старый desktop-код двигал объекты на `N пикселей за кадр`. Mobile-код переходит на `N * dt * 60 * scale` — физически то же самое при 60fps, но кадронезависимо.

Паттерн: `const frameMul = adaptiveCombat ? (dt * 60) : 1; x += speed * frameMul`.

---

## 18. Звуковая система

Файл: `js/core/audio.js` — объект `window.BHAudio`

```js
window.BHAudio.play('player_land')
window.BHAudio.playPlayerShoot('kuzy', isBonus)
```

Все звуки воспроизводятся через Web Audio API. Если браузер не поддерживает или пользователь не взаимодействовал со страницей — звук молча игнорируется через `try/catch`.

Функция-обёртка в update.js: `bhPlaySfx(id, opts)` — безопасный вызов без проверки.

---

## 19. Ресурсы (assets)

Файл: `js/core/assets.js`

Все картинки загружаются как глобальные `new Image()` объекты на старте страницы. Проверка готовности через `imgObj.complete && imgObj.naturalWidth > 0` или отдельные `ready`-флаги (`spriteReady`, `bgReady`, `kuzyAnimsReady` и т.д.).

**Важно**: canvas 2D не ждёт загрузку изображений. Если img.complete = false — `drawImage()` просто ничего не нарисует (без ошибки). Поэтому всегда проверяй флаги перед отрисовкой.

### Кэш эмодзи — `getEmojiBitmap(emoji, size)`

Пули и бонусы рисуются как эмодзи. Функция `getEmojiBitmap` рисует эмодзи на offscreen Canvas и кэширует результат в `Map`. Повторный вызов отдаёт кэш.

### Alpha-маски для пиксельной коллизии

`Enemy67.getAlphaMask(img, sx, sy, sw, sh)` — рисует кадр на offscreen Canvas, читает `getImageData`, кэширует массив alpha-данных. Используется в `playerHitTest` для проверки реального пересечения (не только AABB).

Аналогично `player.maskCache` — кэш масок кузи для попиксельной проверки.

---

## 20. UI и оверлеи

Файл: `js/ui/overlays.js`

### showLevelComplete()

Показывает экран победы. Алгоритм:
1. `setLevelCompleted(gameMode)` — пишет в localStorage
2. `handleLevelCompletion(gameMode)` — разблокирует следующий уровень
3. Если `campaignSession.active` — добавляет очки в `campaignSession.totalScore`
4. Создаёт DOM-оверлей с кнопками «Следующий уровень», «Меню»
5. Показывает уведомления о разблокировке (survival, stepan, mode67 и т.д.)

### showGameOver()

Показывает экран Game Over с кнопками «Попробовать снова», «Меню».

### Стартовая карточка уровня (level-intro-overlay)

Перед стартом каждого уровня показывается карточка с:
- Фоновым изображением уровня
- Названием и описанием (`CAMPAIGN_LEVEL_META[mode]`)
- Кратким уведомлением о персонаже

Убирается через fade-out через `clearLevelIntroOverlayState()`.

### showTransientInfoNotice(text, ms)

Временная информационная плашка по центру экрана — для разблокировок.

---

## 21. localStorage — все ключи

| Ключ | Значение | Назначение |
|---|---|---|
| `bh_campaign_unlocked_index_v1` | число | Старый формат прогресса (мигрируется) |
| `bh_level_completed_v1_{mode}` | `'1'` | Уровень пройден хотя бы раз |
| `bh_survival_unlocked_v1` | `'1'` | Режим выживания открыт |
| `bh_survival_unlocked_notice_shown_v1` | `'1'` | Уведомление об открытии показано |
| `bh_poimal_unlocked_v1` | `'1'` | Режим «Поймал» открыт |
| `bh_poimal_unlocked_notice_shown_v1` | `'1'` | Уведомление показано |
| `bh_stepan_unlocked_v1` | `'1'` | Режим «Степан» открыт |
| `bh_stepan_unlocked_notice_shown_v1` | `'1'` | Уведомление показано |
| `bh_game_completed_once_v1` | `'1'` | Игра пройдена полностью (открывает bonus) |
| `bh_mode67_unlocked_v1` | `'1'` | Режим 67 открыт |
| `bh_mode67_notice_shown_v1` | `'1'` | Уведомление показано |
| `bh_completion_flags_migrated_v1` | `'1'` | Миграция прогресса выполнена |
| `bh_tutorial_done_v1` | `'1'` | Обучение пройдено (разблокирует кампанию) |
| `bh_char_skin` | `'kuzy'\|'max'\|'dron'` | Последняя выбранная система спрайтов |
| `bh_mobile_controls_hint_seen_v2` | `'1'` | Подсказка мобильного управления показана |
| `bh_bestTime_{char}_nosok` | число мс | Лучшее время в режиме «Носок» |

---

## 22. Как добавить новый уровень

### Шаг 1: Решить тип уровня

**Тип A** — общий update (сирень + boss): достаточно добавить `gameMode` в общий поток.
**Тип B** — отдельный update/draw (как nosok, runner): нужен свой файл в `js/modes/`.

### Шаг 2: Зарегистрировать режим в `progression.js`

```js
// 1. Добавить в CAMPAIGN_LEVEL_ORDER (если это уровень кампании):
const CAMPAIGN_LEVEL_ORDER = Object.freeze([...existingLevels, 'myNewLevel']);

// 2. Добавить в CAMPAIGN_LEVEL_META:
const CAMPAIGN_LEVEL_META = Object.freeze({
    ...existing,
    myNewLevel: { title: 'Мой уровень', desc: 'Описание...' }
});
```

### Шаг 3: Добавить фон в `overlays.js`

```js
function getIntroBackgroundForMode(mode) {
    const bgByMode = {
        ...existing,
        myNewLevel: 'img/my-bg.png'
    };
}
```

### Шаг 4: Добавить маршрут в `update.js` и `draw.js`

Для Типа B:
```js
// В update(dt):
if (gameMode === 'myNewLevel') { updateMyNewLevel(dt); return; }

// В draw():
if (gameMode === 'myNewLevel') { drawMyNewLevel(); return; }
```

### Шаг 5: Создать файл `js/modes/mynewlevel.js`

Минимальный шаблон:
```js
// Runtime-состояние
let myLevelPhase = 0;
let myLevelTimer = 0;

function initMyNewLevel() {
    resetGameRuntimeCore();
    gameMode = 'myNewLevel';
    // Создать player, enemies, platforms...
    player = new Player(selectedChar, selectedSpriteSystem);
    // Задать фон:
    bgImg.src = 'img/my-bg.png';
    bgReady = false;
    bgImg.onload = () => { bgReady = true; };
}

function updateMyNewLevel(dt) {
    if (levelCompleteShown || gameOverShown) return;
    player.update(dt);
    // ... логика уровня ...
}

function drawMyNewLevel() {
    // Рисуем фон
    if (bgReady) ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    // Рисуем платформы
    platforms.forEach(p => p.draw());
    // Рисуем игрока
    player.draw();
    // ...
}
```

### Шаг 6: Подключить в `index.html`

```html
<script src="js/modes/mynewlevel.js"></script>
```
**До** `<script src="js/main.js">`.

### Шаг 7: Добавить кнопку в меню

В `index.html` внутри `#modes`:
```html
<button class="mode" data-mode="myNewLevel">🆕 Мой уровень</button>
```

### Шаг 8: Подключить запуск

В `main.js` в switch-оператор запуска или в обработчике кнопок:
```js
case 'myNewLevel':
    initMyNewLevel();
    break;
```

### Шаг 9 (mobile): Добавить в мобильный адаптив

В `mobileAdaptive.js`:
```js
static get adaptiveModes() {
    return new Set([...existing, 'myNewLevel']);
}
// И добавить профиль баланса в getBalance():
myNewLevel: { enemyFireRate: 0.90, enemyMoveSpeed: 0.95 }
```
В `config.js` в `isMobileAdaptiveCombatMode()`:
```js
|| mode === 'myNewLevel'
```

---

## 23. Как добавить новую механику

### Новый тип врага

1. Создать класс/функцию в `js/entities/` (или в файле режима)
2. Добавить обновление в `update.js` или в `updateMyMode()`
3. Добавить отрисовку в `draw.js` или в `drawMyMode()`
4. В `bullets.js`: добавить проверку коллизии пуль с новым врагом

### Новый тип дропа/бонуса

1. Добавить массив (например `myDrops = []`) в `state.js` (или локально в режиме)
2. В `resetGameRuntimeCore()` добавить `myDrops = []`
3. Спавн в `spawn.js` через `scheduleEnemySpawnTimeout`
4. Логику коллизии и эффекта — в обновлении режима

### Новый тип пули

В `bullets.js`, в `shootPlayerBullet()`:
- Добавить параметры в `switch(p.type)` если новый персонаж
- Или создать отдельную функцию `shootSpecialBullet()`
- Добавить объект в `bullets[]` с теми же полями что и обычная пуля

### Новый тип бонуса-режима (не bonusMode)

Аналогично магниту и молнии в `lovlyu.js`:
1. Флаг-активатор + таймер длительности
2. Спавн объекта-подбираемого
3. При коллизии: активировать флаг, `myBonusTimer = myBonusDuration`
4. В `updateMyMode(dt)`: `if (myBonusActive) { myBonusTimer -= dt; if (myBonusTimer <= 0) myBonusActive = false; }`

---

## 24. Критические технические нюансы

### Порядок загрузки скриптов

Файлы **обязательно** в правильном порядке в `index.html`. Если функция вызывается до объявления — будет `undefined is not a function`. Правило: сначала утилиты (`config.js`, `state.js`, `assets.js`), потом entitie, потом systems, потом modes, **последним** `main.js`.

### dt-независимость

Весь **desktop**-код написан в юнитах «пикселей за кадр» (исторический стиль). При добавлении нового кода:
- Desktop: `x += speed` (speed в px/frame)
- Mobile adaptive: `x += speed * frameMul` где `frameMul = dt * 60 * adaptiveScale`

Смешивать нельзя — используй паттерн:
```js
const frameMul = adaptiveCombat ? (dt * 60 * adaptiveScale) : 1;
x += speed * frameMul;
```

### Кэш сирени (lilacSprite)

При первой отрисовке каждая сирень создаёт свой offscreen Canvas (`buildLilacSprite`). Это дешёвая операция, но при изменении цвета/размера нужно сбрасывать: `enemy.lilacSprite = null`.

### clearScheduledEnemySpawns() — обязательно при рестарте

Если уровень рестартуется, а не просто обновляется — **обязательно** вызвать `clearScheduledEnemySpawns()` иначе старые `setTimeout` сработают в новой сессии.

### Коллизия пуль с Кузей — эффективная ширина

Для Кузи `effectiveW = w * 0.6`. Хитбокс меньше визуального спрайта. `playerHitTest()` использует попиксельную alpha-маску через `player.isOpaqueAtWorld(x, y)` — проверяет реальную прозрачность спрайта.

### BossO4ko — обязательно consumePhaseTransition()

Если `bossO4ko` меняет фазу в своём `update()`, он выставляет `phaseTransitionPending = true`. Внешний код должен забрать это событие через `bossO4ko.consumePhaseTransition()` (возвращает `true` и сбрасывает флаг). Иначе событие потеряется или сработает дважды.

### Мобильная инверсия BulletDir в altShootMode

В `altShootMode`: `ArrowDown` → `playerBulletDir = 'up'` — это намеренная инверсия. Физический смысл: нажимаешь вниз на джойстике = прицел вверх (как у зенитного орудия).

### Нет глобального paused в nosok/runner/lovlyu

Эти режимы сами обрабатывают паузу внутри своих `updateXxx()` — проверяй `paused` в начале каждой такой функции.

### Коллизия с платформами — центр, не угол

Логика платформ проверяет **центр** игрока по X, а не bbox. Это означает, что игрок может наполовину свисать с платформы — это нормальное поведение, намеренное.

### Почему score/combo/lives — глобальные числа, а не в Player

Все режимы используют одни и те же переменные `score`, `combo`, `lives`. Это упрощает HUD-обновление и экран завершения. При добавлении нового режима — просто читай/пиши эти же переменные.

### Пули дрона vs Кузи — hitRadius

`hitRadius = r * 2`. У Кузи `r=18` → `hitRadius=36`. Это намеренно большой хитбокс чтобы компенсировать медленную пулю (speed=6). У Макса `r=10, hitRadius=20`, но speed=11.

### onload vs complete для Image

Когда `Image.src` задаётся программно, `onload` может сработать до установки или не сработать если изображение уже в кэше. Безопасный паттерн:
```js
const img = new Image();
img.onload = () => { ready = true; };
img.src = 'path.png';
// Если браузер взял из кэша синхронно:
if (img.complete && img.naturalWidth > 0) ready = true;
```

### localStorage недоступен в incognito (Safari)

Все обращения к `localStorage` обёрнуты в `try/catch` в `writeLS/readIntLS/readBoolLS`. Никогда не обращайся к `localStorage` напрямую — используй эти функции.

---

---

## 25. Юнит-тесты

### Технологии

- **Test runner**: [Vitest](https://vitest.dev/) v2.1.x
- **Среда**: jsdom@25.0.1 — эмулирует браузерный DOM (пиннирована под Node 20.x; jsdom@28+ требует Node ≥20.19.0)
- **Покрытие**: `@vitest/coverage-v8` — запускается через `npm run coverage`, но показывает 0% из-за ограничения V8: `(0, eval)()` код не инструментируется
- **Node.js**: проверено на v20.11.1

### Команды

```bash
npm test            # однократный прогон всех тестов
npm run test:watch  # watch-режим (пересчёт при изменении файлов)
npm run coverage    # запуск с отчётом о покрытии
```

### Архитектура тестов

Игра написана без модульной системы — все переменные и классы глобальные. Тесты не трогают игровые файлы, а загружают их в тестовый контекст через вспомогательный модуль `tests/setup/loadScript.js`:

1. `readFileSync` читает JS-файл
2. Регулярными выражениями `const ` → `var `, `let ` → `var `, `class Foo` → `var Foo = class Foo`
3. `(0, eval)(transformedCode)` — код выполняется в `globalThis`, все объявления становятся глобальными

Этот подход позволяет тестировать игровую логику без рефакторинга исходников.

### Моки браузерного окружения (`tests/setup/globals.js`)

Запускается как `setupFiles` перед каждым тестовым файлом. Создаёт:

| Мок | Назначение |
|---|---|
| `canvas` + `ctx` | Полный mock Canvas 2D (все методы через `vi.fn()`) |
| `window.matchMedia` | Возвращает `matches: false` |
| `window.BHAudio` | Заглушка с `playPlayerShoot`, `play`, `stop` как `vi.fn()` |
| `window.BHMobileAdaptive` | Заглушка (isActive → false, getScale → 1, frameMul → 1) |
| Игровые глобалы | `bullets=[], enemies=[], player=null, gameMode='normal', lives=7, bonusShots=0, bonusMode=false, ...` |
| `Image` | Класс-мок (src-setter ничего не делает) |
| `requestAnimationFrame` | `vi.fn()` |

**Важный нюанс**: jsdom@25 добавляет `ontouchstart` на `window`, поэтому `maxTouchPoints` и `hasTouch` всегда считаются «touch»-устройством. Тесты, проверяющие desktop-поведение `BHMobileAdaptive`, явно выставляют портретные размеры (`innerWidth=768, innerHeight=1024`).

### Тестовые файлы

| Файл | Тестов | Что покрывается |
|---|---|---|
| `core.config.test.js` | 13 | Все константы, `isMobileLandscapeGameplay()`, `getMobileLandscapeAdaptiveScale()`, `isMobileAdaptiveCombatMode()` |
| `core.utils.test.js` | 11 | `rect()` (7 сценариев: перекрытие, зазор, касание, вложение, нулевые размеры, симметрия), `playerHitTest()` (4 сценария) |
| `core.mobileAdaptive.test.js` | 20 | Статический конфиг, desktop-режим (портрет, нет тача), mobile landscape (scale, frameMul, balance) |
| `core.progression.test.js` | 36 | Порядок кампании, `readIntLS`/`readBoolLS`/`writeLS`, флаги прохождения, разблокировки (survival/poimal/stepan), `isModeUnlockedByProgress`, `getModeDisplayName`, `getNextCampaignMode`, миграция прогресса |
| `systems.bullets.test.js` | 21 | `shootPlayerBullet()` для kuzy/max/dron: параметры пуль, направление, бонусный режим, веер max, звуковые вызовы |
| `entities.platform.test.js` | 20 | Конструктор (позиция, defaults, options), горизонтальное/вертикальное/статическое движение, ограниченная амплитуда |
| `entities.player.test.js` | 43 | Конструктор всех трёх персонажей, начальное состояние, параметры прыжка (jumpMinHeight, jumpMaxHeight, jumpHoldMax, rampFactor) |
| `entities.bosses.test.js` | 30 | Enemy67 (normal и platforms режимы), BossO4ko (конструктор, takeHit, HP-границы), BossNosok (позиция, размер, начальное состояние) |
| **Итого** | **194** | |

### Ограничение покрытия

`npm run coverage` показывает 0% — это известное ограничение V8-инструментирования: код, загруженный через `(0, eval)()`, не отслеживается V8 Coverage. Сами тесты при этом работают корректно и проверяют поведение функций.

Для получения реального отчёта покрытия потребовалось бы добавить тонкие ES-модуль-обёртки с `export` для каждой функции и импортировать их в тесты вместо `loadScript()` — без изменения самих игровых файлов.

---

*Документ создан автоматически на основе анализа исходного кода. При значительных изменениях архитектуры — обновляй соответствующие разделы.*
