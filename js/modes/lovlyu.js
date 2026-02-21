// ==== РЕЖИМ "ЛОВЛЮ" ====

// Ресурсы персонажа-падающего
const lovlyuImgs = [];
let lovlyuImgsReady = 0;
for (let i = 1; i <= 6; i++) {
    const img = new Image();
    img.onload = () => { lovlyuImgsReady++; };
    img.src = `img/kuzya/${i}.png`;
    lovlyuImgs.push(img);
}

// Состояние режима "Ловлю"
let lovlyuChars = [];          // массив падающих персонажей
let lovlyuTotalSpawns = 50;    // сколько всего появлений
let lovlyuSpawnedCount = 0;    // сколько уже появилось
let lovlyuHeartDropTimer = 0;  // таймер для бонусного сердца
let lovlyuSpawnTimer = 0;      // таймер между спавнами
let lovlyuNextSpawnDelay = 1;  // задержка до следующего спавна
let lovlyuBatchRemaining = 0;  // сколько персонажей осталось в текущей пачке
let lovlyuBatchDelay = 0;      // задержка между персонажами в пачке
let lovlyuBatchTimer = 0;      // таймер между персонажами в пачке
let lovlyuGroundY = 0;         // уровень земли
let lovlyuVictoryShown = false;

// Бонус "Магнит"
let lovlyuMagnets = [];            // падающие бонусы-магниты
let lovlyuMagnetActive = false;    // активен ли эффект магнита
let lovlyuMagnetTimer = 0;         // оставшееся время действия магнита (сек)
let lovlyuMagnetDropTimer = 0;     // таймер спавна магнита (каждую секунду 3% шанс)
let lovlyuMagnetComboCount = 0;    // счётчик комбо для магнита (отдельный от combo)
let lovlyuMagnetDuration = 10;      // длительность эффекта магнита (сек)

// Бонус "Молния"
let lovlyuLightnings = [];           // падающие бонусы-молнии
let lovlyuLightningActive = false;   // активен ли эффект молнии
let lovlyuLightningTimer = 0;        // оставшееся время действия молнии (сек)
let lovlyuLightningDropTimer = 0;    // таймер спавна молнии (каждую секунду 4% шанс)
let lovlyuLightningDuration = 13;    // длительность эффекта молнии (сек)

/**
 * Сбрасывает runtime-состояние уровня "Ловлю".
 */
function resetLovlyuLevelState() {
    lovlyuChars = [];
    lovlyuTotalSpawns = 50;
    lovlyuSpawnedCount = 0;
    lovlyuHeartDropTimer = 0;
    lovlyuSpawnTimer = 0;
    lovlyuNextSpawnDelay = 2.0; // начальная пауза перед первым спавном
    lovlyuBatchRemaining = 0;
    lovlyuBatchDelay = 0;
    lovlyuBatchTimer = 0;
    lovlyuGroundY = 0;
    lovlyuVictoryShown = false;

    lovlyuMagnets = [];
    lovlyuMagnetActive = false;
    lovlyuMagnetTimer = 0;
    lovlyuMagnetDropTimer = 0;
    lovlyuMagnetComboCount = 0;

    lovlyuLightnings = [];
    lovlyuLightningActive = false;
    lovlyuLightningTimer = 0;
    lovlyuLightningDropTimer = 0;
}

/**
 * Инициализирует уровень "Ловлю".
 */
function initLovlyuLevel() {
    resetLovlyuLevelState();
    lovlyuGroundY = canvas.height - 20; // земля на 20px от низа (как в обычном режиме)
}

/**
 * Определяет текущую фазу по количеству заспавненных персонажей.
 * @returns {number} 1-4
 */
function getLovlyuPhase() {
    const ratio = lovlyuSpawnedCount / lovlyuTotalSpawns;
    if (ratio < 0.30) return 1;
    if (ratio < 0.60) return 2;
    if (ratio < 0.90) return 3;
    return 4;
}

/**
 * Возвращает параметры спавна для текущей фазы.
 * @returns {{batchMin:number, batchMax:number, delayMin:number, delayMax:number, pauseMin:number, pauseMax:number}}
 */
function getLovlyuPhaseParams() {
    const phase = getLovlyuPhase();
    switch (phase) {
        case 1: return { batchMin: 1, batchMax: 1, delayMin: 0, delayMax: 0, pauseMin: 2.5, pauseMax: 3.5 };
        case 2: return { batchMin: 2, batchMax: 3, delayMin: 1.0, delayMax: 2.0, pauseMin: 2.0, pauseMax: 3.0 };
        case 3: return { batchMin: 4, batchMax: 5, delayMin: 0.7, delayMax: 1.8, pauseMin: 1.5, pauseMax: 2.5 };
        case 4: return { batchMin: 4, batchMax: 7, delayMin: 0.5, delayMax: 1.0, pauseMin: 1.0, pauseMax: 2.0 };
    }
}

/**
 * Вычисляет текущие размеры и спрайт персонажа с учётом его состояния.
 * Каждый спрайт сохраняет своё родное соотношение сторон.
 * @param {{baseW:number, state:string, animFrame:number, caughtFrame:number}} ch
 * @returns {{w:number, h:number, imgIdx:number, sprite:HTMLImageElement|null}}
 */
function getLovlyuCharDims(ch) {
    let imgIdx = -1;
    if (ch.state === 'peek') imgIdx = 5;
    else if (ch.state === 'falling') imgIdx = ch.animFrame === 0 ? 3 : 2;
    else if (ch.state === 'caught') imgIdx = ch.caughtFrame === 0 ? 1 : 0;
    else if (ch.state === 'landed') imgIdx = 4;

    if (imgIdx < 0 || imgIdx >= lovlyuImgs.length) return { w: ch.baseW, h: ch.baseW, imgIdx: -1, sprite: null };
    const sprite = lovlyuImgs[imgIdx];

    // ====== НАСТРОЙКА РАЗМЕРОВ СПРАЙТОВ ======
    // baseW задаётся в spawnLovlyuChar(): player.w * 0.6375
    // Чтобы изменить общий размер ВСЕХ спрайтов — меняй множитель 0.6375 там.
    // Чтобы изменить размер КОНКРЕТНОГО спрайта — меняй drawW ниже.
    // Высота (drawH) вычисляется автоматически из пропорций картинки.
    //
    // Состояние 'peek'    → 6.png (выглядывает)
    // Состояние 'falling' → 3.png и 4.png (анимация падения)
    // Состояние 'caught'  → 2.png (caughtFrame=0) и 1.png (caughtFrame=1)
    // Состояние 'landed'  → 5.png (упал на землю)
    // ===========================================

    let drawW = ch.baseW;
    if (ch.state === 'peek')    drawW = ch.baseW / 1.5;  // 6.png — делим на 1.5. Увеличить? Ставь / 1.2 или * 1.0
    if (ch.state === 'falling') drawW = ch.baseW * 1.5; // 3.png/4.png — меняй множитель
    if (ch.state === 'caught' && ch.caughtFrame === 0) drawW = ch.baseW * 1.5; // 2.png — меняй множитель
    if (ch.state === 'caught' && ch.caughtFrame === 1) drawW = ch.baseW * 0.8; // 1.png — меняй множитель отдельно
    if (ch.state === 'landed')  drawW = ch.baseW * 1.5; // 5.png — меняй множитель

    let drawH = drawW; // fallback square
    if (sprite && sprite.complete && sprite.width > 0 && sprite.height > 0) {
        drawH = drawW * (sprite.height / sprite.width);
    }

    return { w: drawW, h: drawH, imgIdx, sprite };
}

/**
 * Создает одного падающего персонажа в зоне спавна.
 */
function spawnLovlyuChar() {
    if (lovlyuSpawnedCount >= lovlyuTotalSpawns) return;

    // Размер персонажа (увеличен в 1.5 раза)
    const baseW = player.w * 0.6375;

    // Зона спавна: верхняя половина экрана, середина, диаметр ~половина высоты экрана
    const spawnCenterX = canvas.width / 2;
    const spawnCenterY = canvas.height * 0.25;
    const spawnRadius = canvas.height * 0.25;

    // Случайная позиция в круге спавна
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spawnRadius;
    let spawnX = spawnCenterX + Math.cos(angle) * dist - baseW / 2;
    let spawnY = spawnCenterY + Math.sin(angle) * dist - baseW / 2;

    // Ограничиваем по горизонтали
    spawnX = Math.max(10, Math.min(canvas.width - baseW - 10, spawnX));
    // Не ниже 40% экрана
    spawnY = Math.max(-baseW * 0.5, Math.min(canvas.height * 0.4 - baseW, spawnY));

    const mirrored = Math.random() < 0.5;

    const fallSpeed = canvas.height * 0.30;
    const peekDuration = 0.3 + Math.random() * 0.3;

    lovlyuChars.push({
        x: spawnX,
        y: spawnY,
        baseW: baseW,
        mirrored: mirrored,
        state: 'peek',
        stateTimer: 0,
        peekDuration: peekDuration,
        fallSpeed: fallSpeed,
        vx: 0,
        vy: 0,
        swayTimer: Math.random() * 100,
        swayAmplitude: canvas.width * 0.04,
        swaySpeed: 2 + Math.random() * 2,
        animFrame: 0,
        animTimer: 0,
        caughtFrame: 0,
        caughtTimer: 0,
        landedTimer: 0,
        speechBalloonAdded: false,
        landedBalloonAdded: false,
        stunned: false  // оглушён при контакте в воздухе (падает вертикально, медленнее)
    });

    lovlyuSpawnedCount++;
}

/**
 * Обновляет игровое состояние уровня "Ловлю" за один кадр.
 * @param {number} dt - прошедшее время кадра в секундах.
 */
function updateLovlyuMode(dt) {
    if (invuln > 0) invuln -= dt;

    player.update(dt);

    // Стрельба не влияет на игровой процесс — очищаем пули
    bullets.length = 0;
    enemyBullets.length = 0;

    // Ограничиваем игрока землей (как в обычном режиме)
    if (player.y + player.h > lovlyuGroundY) {
        player.y = lovlyuGroundY - player.h;
    }

    // Обновляем облачки
    speechBalloons = speechBalloons.filter(sb => {
        sb.timer += dt;
        const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
        return sb.timer < dur;
    });

    // Обновляем взрывы
    explosions = explosions.filter(ex => {
        ex.timer += dt;
        return ex.timer < 0.5;
    });

    // Обновляем сердечки (падающие бонусы, аналогично другим режимам)
    hearts.forEach(h => {
        h.y += 1.5;
        h.x += Math.sin(h.y / 20) * 1.5;
    });
    hearts = hearts.filter(h => h.y < canvas.height + 20);

    // Игрок подбирает сердечко
    hearts.forEach((h, hi) => {
        if (rect(h, player)) {
            lives++;
            hearts.splice(hi, 1);
        }
    });

    // ==== Бонус "Магнит" ====
    // Обновляем падающие магниты
    lovlyuMagnets.forEach(m => {
        m.y += 1.5;
        m.x += Math.sin(m.y / 18) * 1.1;
    });
    lovlyuMagnets = lovlyuMagnets.filter(m => m.y < canvas.height + 20);

    // Игрок подбирает магнит
    for (let mi = lovlyuMagnets.length - 1; mi >= 0; mi--) {
        if (rect(lovlyuMagnets[mi], player)) {
            lovlyuMagnetActive = true;
            lovlyuMagnetTimer = lovlyuMagnetDuration;
            lovlyuMagnets.splice(mi, 1);
        }
    }

    // Таймер действия магнита
    if (lovlyuMagnetActive) {
        lovlyuMagnetTimer -= dt;
        if (lovlyuMagnetTimer <= 0) {
            lovlyuMagnetActive = false;
            lovlyuMagnetTimer = 0;
        }
    }

    // Спавн магнита: 3% каждую секунду
    if (!lovlyuVictoryShown) lovlyuMagnetDropTimer += dt;
    if (!lovlyuVictoryShown && lovlyuMagnetDropTimer >= 1.0) {
        lovlyuMagnetDropTimer -= 1.0;
        if (Math.random() < 0.03) {
            const mw = 40, mh = 40;
            lovlyuMagnets.push({
                x: 12 + Math.random() * Math.max(1, canvas.width - mw - 24),
                y: -mh - 10,
                w: mw, h: mh
            });
        }
    }

    // ==== Бонус "Молния" ====
    // Обновляем падающие молнии (скорость в 1.5 раза выше)
    lovlyuLightnings.forEach(l => {
        l.y += 1.5 * 1.5;
        l.x += Math.sin(l.y / 15) * 1.3;
    });
    lovlyuLightnings = lovlyuLightnings.filter(l => l.y < canvas.height + 20);

    // Игрок подбирает молнию
    for (let li = lovlyuLightnings.length - 1; li >= 0; li--) {
        if (rect(lovlyuLightnings[li], player)) {
            lovlyuLightningActive = true;
            lovlyuLightningTimer = lovlyuLightningDuration;
            player.speed = PLAYER_SPEED * 2;
            lovlyuLightnings.splice(li, 1);
        }
    }

    // Таймер действия молнии
    if (lovlyuLightningActive) {
        lovlyuLightningTimer -= dt;
        if (lovlyuLightningTimer <= 0) {
            lovlyuLightningActive = false;
            lovlyuLightningTimer = 0;
            player.speed = PLAYER_SPEED;
        }
    }

    // Спавн молнии: 4% каждую секунду
    if (!lovlyuVictoryShown) lovlyuLightningDropTimer += dt;
    if (!lovlyuVictoryShown && lovlyuLightningDropTimer >= 1.0) {
        lovlyuLightningDropTimer -= 1.0;
        if (Math.random() < 0.04) {
            const lw = 40, lh = 40;
            lovlyuLightnings.push({
                x: 12 + Math.random() * Math.max(1, canvas.width - lw - 24),
                y: -lh - 10,
                w: lw, h: lh
            });
        }
    }

    // Бонусное сердце: 5% каждую секунду (не после завершения уровня)
    if (!lovlyuVictoryShown) lovlyuHeartDropTimer += dt;
    if (!lovlyuVictoryShown && lovlyuHeartDropTimer >= 1.0) {
        lovlyuHeartDropTimer -= 1.0;
        if (Math.random() < 0.05) {
            const w = 40;
            const h = 40;
            hearts.push({
                x: 12 + Math.random() * Math.max(1, canvas.width - w - 24),
                y: -h - 10,
                w,
                h,
                fromTop: true
            });
        }
    }

    // Логика спавна персонажей
    if (lovlyuSpawnedCount < lovlyuTotalSpawns) {
        if (lovlyuBatchRemaining > 0) {
            // Спавним персонажей из пачки с задержкой
            lovlyuBatchTimer += dt;
            if (lovlyuBatchTimer >= lovlyuBatchDelay) {
                lovlyuBatchTimer = 0;
                spawnLovlyuChar();
                lovlyuBatchRemaining--;
                if (lovlyuBatchRemaining > 0) {
                    const params = getLovlyuPhaseParams();
                    lovlyuBatchDelay = params.delayMin + Math.random() * (params.delayMax - params.delayMin);
                }
            }
        } else {
            // Ждем паузу перед следующей пачкой
            lovlyuSpawnTimer += dt;
            if (lovlyuSpawnTimer >= lovlyuNextSpawnDelay) {
                lovlyuSpawnTimer = 0;
                const params = getLovlyuPhaseParams();
                // Определяем размер пачки
                let batchSize = params.batchMin + Math.floor(Math.random() * (params.batchMax - params.batchMin + 1));
                // Не больше оставшихся
                batchSize = Math.min(batchSize, lovlyuTotalSpawns - lovlyuSpawnedCount);
                lovlyuBatchRemaining = batchSize;
                lovlyuBatchDelay = (batchSize > 1) ? (params.delayMin + Math.random() * (params.delayMax - params.delayMin)) : 0;
                lovlyuBatchTimer = lovlyuBatchDelay; // спавним первого сразу
                // Задержка до следующей пачки
                lovlyuNextSpawnDelay = params.pauseMin + Math.random() * (params.pauseMax - params.pauseMin);
            }
        }
    }

    // Определяем, на земле ли игрок (для механики прыжка)
    const playerOnGround = (player.y + player.h >= lovlyuGroundY - 2);

    // Обновляем каждого персонажа
    for (let i = lovlyuChars.length - 1; i >= 0; i--) {
        const ch = lovlyuChars[i];
        ch.stateTimer += dt;
        const dims = getLovlyuCharDims(ch);

        if (ch.state === 'peek') {
            // Персонаж просто показывается. Через peekDuration начинает падать.
            if (ch.stateTimer >= ch.peekDuration) {
                ch.state = 'falling';
                ch.stateTimer = 0;
                ch.animFrame = 0;
                ch.animTimer = 0;

                // Вычисляем направление отклонения от игрока
                const playerCX = player.x + player.w / 2;
                const charCX = ch.x + dims.w / 2;
                // Базовое направление - от игрока (убегает)
                let driftDir = 0;
                if (Math.abs(playerCX - charCX) > 5) {
                    driftDir = (charCX > playerCX) ? 1 : -1;
                } else {
                    driftDir = Math.random() < 0.5 ? 1 : -1;
                }

                // Отклонение 15-45 градусов от вертикали
                const maxAngleDeg = 35;
                const angleDeg = 15 + Math.random() * (maxAngleDeg - 15);
                const angleRad = angleDeg * Math.PI / 180;

                ch.vy = ch.fallSpeed;
                ch.vx = Math.tan(angleRad) * ch.fallSpeed * driftDir * (0.6 + Math.random() * 0.4);
            }
        } else if (ch.state === 'falling') {
            // Анимация падения: кадры 3.png и 4.png (индексы 2 и 3)
            ch.animTimer += dt;
            if (ch.animTimer >= 0.15) {
                ch.animTimer = 0;
                ch.animFrame = (ch.animFrame === 0) ? 1 : 0;
            }

            // Покачивание
            ch.swayTimer += dt * ch.swaySpeed;
            const swayOffset = Math.sin(ch.swayTimer) * ch.swayAmplitude;

            // Обновляем направление отклонения от игрока каждый кадр
            const playerCX = player.x + player.w / 2;
            const charCX = ch.x + dims.w / 2;
            const dxToPlayer = playerCX - charCX;

            // Корректируем горизонтальную скорость
            if (ch.stunned) {
                // Оглушён: падает вертикально вниз, скорость падения вдвое медленнее
                ch.vx *= 0.85; // плавно гасим горизонтальную скорость
                ch.vy = ch.fallSpeed * 0.4;
            } else if (lovlyuMagnetActive) {
                // Магнит: притягиваем К игроку
                if (Math.abs(dxToPlayer) > dims.w * 0.2) {
                    const attractForce = canvas.width * 0.45 * dt;
                    if (dxToPlayer > 0) {
                        ch.vx += attractForce;
                    } else {
                        ch.vx -= attractForce;
                    }
                }
            } else if (!playerOnGround) {
                // Игрок в воздухе: персонажи пугаются и разлетаются сильнее
                if (Math.abs(dxToPlayer) > dims.w * 0.15) {
                    const scareForce = canvas.width * 0.7 * dt; // вдвое сильнее обычного
                    if (dxToPlayer > 0) {
                        ch.vx -= scareForce;
                    } else {
                        ch.vx += scareForce;
                    }
                }
            } else {
                // Обычный режим: убегаем от игрока
                if (Math.abs(dxToPlayer) > dims.w * 0.3) {
                    const evadeForce = canvas.width * 0.25 * dt;
                    if (dxToPlayer > 0) {
                        ch.vx -= evadeForce;
                    } else {
                        ch.vx += evadeForce;
                    }
                }
            }

            // Ограничиваем горизонтальную скорость (эквивалент 45 градусов)
            const maxVx = Math.tan(45 * Math.PI / 180) * ch.fallSpeed;
            ch.vx = Math.max(-maxVx, Math.min(maxVx, ch.vx));

            // Двигаем персонажа
            ch.x += ch.vx * dt + swayOffset * dt;
            ch.y += ch.vy * dt;

            // Ограничиваем по горизонтали
            ch.x = Math.max(5, Math.min(canvas.width - dims.w - 5, ch.x));

            // Проверка поимки
            const catchZone = {
                x: player.x,
                y: player.y,
                w: player.w,
                h: player.h * 0.5
            };
            const charRect = { x: ch.x, y: ch.y, w: dims.w, h: dims.h };

            if (rect(charRect, catchZone)) {
                // Ловля в воздухе: только в нижней трети экрана или на земле
                const inLowerThird = player.y >= canvas.height * (2 / 3);
                if (playerOnGround || inLowerThird) {
                    // Поимка засчитывается
                    ch.state = 'caught';
                    ch.stateTimer = 0;
                    ch.caughtFrame = 0;
                    ch.caughtTimer = 0;
                    score += 10;
                    combo++;
                    // Комбо для магнита: считаем только когда магнит НЕ активен
                    if (!lovlyuMagnetActive) {
                        lovlyuMagnetComboCount++;
                        if (lovlyuMagnetComboCount >= 10) {
                            lovlyuMagnetComboCount = 0;
                            const mw = 40, mh = 40;
                            lovlyuMagnets.push({
                                x: 12 + Math.random() * Math.max(1, canvas.width - mw - 24),
                                y: -mh - 10,
                                w: mw, h: mh
                            });
                        }
                    }
                    continue;
                } else if (!ch.stunned) {
                    // Контакт в воздухе выше нижней трети — оглушаем персонажа
                    ch.stunned = true;
                }
            }

            // Проверка достижения земли
            if (ch.y + dims.h >= lovlyuGroundY) {
                ch.y = lovlyuGroundY - dims.h;
                ch.state = 'landed';
                ch.stateTimer = 0;
                ch.landedTimer = 0;
            }
        } else if (ch.state === 'caught') {
            // Поймали! Показываем кадры 2.png -> 1.png -> облачко -> исчезает
            ch.caughtTimer += dt;
            if (ch.caughtFrame === 0 && ch.caughtTimer >= 0.3) {
                ch.caughtFrame = 1;
                ch.caughtTimer = 0;
                // 1.png — спасённый персонаж стоит на земле
                const newDims = getLovlyuCharDims(ch);
                ch.y = lovlyuGroundY - newDims.h;
                // Добавляем облачко "Спасибо банан!!"
                if (!ch.speechBalloonAdded) {
                    ch.speechBalloonAdded = true;
                    speechBalloons.push({
                        x: ch.x + newDims.w * 0.5,
                        y: ch.y - 10,
                        timer: 0,
                        text: 'Спасибо, Банан!!',
                        duration: 1.5,
                        type: 'buk',
                        scale: 0.7
                    });
                }
            }
            if (ch.caughtFrame === 1 && ch.caughtTimer >= 0.8) {
                // Удаляем пойманного
                lovlyuChars.splice(i, 1);
                continue;
            }
        } else if (ch.state === 'landed') {
            // На земле - через секунду исчезает и отнимается HP
            ch.landedTimer += dt;
            // Облачко "Жопа болит!!" при приземлении
            if (!ch.landedBalloonAdded) {
                ch.landedBalloonAdded = true;
                speechBalloons.push({
                    x: ch.x + dims.w * 0.5,
                    y: ch.y - 10,
                    timer: 0,
                    text: 'Жопа болит!!',
                    duration: 1.0,
                    type: 'buk',
                    scale: 0.7
                });
            }
            if (ch.landedTimer >= 1.0) {
                // Наносим урон только при отсутствии неуязвимости.
                if (invuln <= 0) {
                    // Баланс: стоящий игрок получает 1 урон, прыгающий/летающий получает 2 урона.
                    const dmg = playerOnGround ? 1 : 2;
                    lives -= dmg;
                    combo = 0;
                    lovlyuMagnetComboCount = 0; // Сбрасываем счетчик комбинации для магнита.
                    invuln = INVULN_TIME;
                    explosions.push({ x: ch.x + dims.w / 2, y: ch.y + dims.h / 2, timer: 0 });
                    speechBalloons.push({
                        x: player.x - player.w * 0.25,
                        y: player.y + player.h * 0.25,
                        timer: 0
                    });
                }
                lovlyuChars.splice(i, 1);
                if (lives <= 0) {
                    lives = 0;
                    showGameOver();
                    break;
                }
                continue;
            }
        }
    }

    // Проверяем условие победы: все появления прошли и все персонажи обработаны
    if (lovlyuSpawnedCount >= lovlyuTotalSpawns && lovlyuChars.length === 0 &&
        lovlyuBatchRemaining <= 0 && !lovlyuVictoryShown && lives > 0) {
        lovlyuVictoryShown = true;
        showLovlyuLevelComplete();
    }

    // HUD (стандартный стиль, как в других режимах)
    if (!hudEl) hudEl = document.getElementById('hud');
    if (hudEl) {
        const playerName = charNames[selectedChar] || selectedChar;
        const safeLives = Math.max(0, Math.floor(lives));
        if (safeLives !== lastHudLives) {
            cachedLivesStr = "\u2764\uFE0F".repeat(safeLives);
            lastHudLives = safeLives;
        }
        const caught = Math.floor(score / 10);
        const phase = getLovlyuPhase();
        const magnetInfo = lovlyuMagnetActive ? `   🧲 ${Math.ceil(lovlyuMagnetTimer)}с` : '';
        const lightningInfo = lovlyuLightningActive ? `   ⚡ ${Math.ceil(lovlyuLightningTimer)}с` : '';
        let hudHtml = `${playerName} | Жизни: ${cachedLivesStr}<br>Очки: ${score}   Комбо: ${combo}   Поймано: ${caught}/${lovlyuTotalSpawns}   Фаза: ${phase}${magnetInfo}${lightningInfo}`;
        if (hudHtml !== lastHudHtml) {
            hudEl.innerHTML = hudHtml;
            lastHudHtml = hudHtml;
        }
    }
}

/**
 * Отрисовывает уровень "Ловлю".
 */
function drawLovlyuMode() {
    // Фон
    if (bgReady) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#a2c9e2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Зона спавна (легкий индикатор)
    const spawnCX = canvas.width / 2;
    const spawnCY = canvas.height * 0.25;
    const spawnR = canvas.height * 0.25;
    ctx.save();
    ctx.beginPath();
    ctx.arc(spawnCX, spawnCY, spawnR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 200, 0.06)';
    ctx.fill();
    ctx.restore();

    // Рисуем бонусные сердечки
    const perf = window.BHBulletPerf;
    const renderMode = perf ? perf.bulletRenderMode() : 'emoji';
    const getEmojiBitmap = perf ? perf.getEmojiBitmap : null;

    hearts.forEach(h => {
        const emoji = '❤️';
        const size = h.h || 30;
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, h.x, h.y, size, size);
        } else {
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, h.x + size / 2, h.y + size / 2);
        }
    });

    // Рисуем падающие магниты
    lovlyuMagnets.forEach(m => {
        const emoji = '🧲';
        const size = m.h || 40;
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, m.x, m.y, size, size);
        } else {
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, m.x + size / 2, m.y + size / 2);
        }
    });

    // Рисуем падающие молнии
    lovlyuLightnings.forEach(l => {
        const emoji = '⚡';
        const size = l.h || 40;
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, l.x, l.y, size, size);
        } else {
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, l.x + size / 2, l.y + size / 2);
        }
    });

    // Рисуем падающих персонажей (с правильным соотношением сторон каждого спрайта)
    lovlyuChars.forEach(ch => {
        const dims = getLovlyuCharDims(ch);
        if (dims.imgIdx < 0 || !dims.sprite || !dims.sprite.complete) return;

        ctx.save();
        if (ch.mirrored) {
            ctx.translate(ch.x + dims.w, ch.y);
            ctx.scale(-1, 1);
            ctx.drawImage(dims.sprite, 0, 0, dims.w, dims.h);
        } else {
            ctx.drawImage(dims.sprite, ch.x, ch.y, dims.w, dims.h);
        }
        ctx.restore();
    });

    // Визуальная индикация неуязвимости (мигание)
    if (invuln > 0) {
        const blinkSpeed = 16;
        if (Math.floor(invuln * blinkSpeed) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }
    }

    // Рисуем игрока
    player.draw();
    ctx.globalAlpha = 1;

    // Рисуем взрывы
    explosions.forEach(ex => {
        ctx.save();
        const t = ex.timer / 0.5;
        ctx.globalAlpha = Math.max(0, 1 - t);
        const size = 60 + 40 * t;
        const emoji = '💥';
        const explosionImg = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && explosionImg) {
            ctx.drawImage(explosionImg, ex.x - size / 2, ex.y - size / 2, size, size);
        } else {
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, ex.x, ex.y);
        }
        ctx.restore();
    });

    // Рисуем облачки
    speechBalloons.forEach(sb => {
        ctx.save();
        const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
        ctx.globalAlpha = Math.max(0, 1 - sb.timer / dur);
        const text = (typeof sb.text === 'string') ? sb.text : 'Сука';

        if (sb.type === 'buk') {
            let fontSize = 36 * (sb.scale || 1);
            ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
            const maxWidth = canvas.width * 0.5;
            let textWidth = ctx.measureText(text).width;
            while (textWidth > maxWidth && fontSize > 10) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
                textWidth = ctx.measureText(text).width;
            }

            const paddingX = 18 * (sb.scale || 1);
            const paddingY = 10 * (sb.scale || 1);
            const boxW = Math.ceil(textWidth + paddingX * 2);
            const boxH = Math.ceil(fontSize + paddingY * 2);
            const left = sb.x - boxW / 2;
            const top = sb.y - boxH / 2;
            const r = Math.min(14, boxH / 2);

            ctx.beginPath();
            ctx.moveTo(left + r, top);
            ctx.lineTo(left + boxW - r, top);
            ctx.quadraticCurveTo(left + boxW, top, left + boxW, top + r);
            ctx.lineTo(left + boxW, top + boxH - r);
            ctx.quadraticCurveTo(left + boxW, top + boxH, left + boxW - r, top + boxH);
            ctx.lineTo(left + r, top + boxH);
            ctx.quadraticCurveTo(left, top + boxH, left, top + boxH - r);
            ctx.lineTo(left, top + r);
            ctx.quadraticCurveTo(left, top, left + r, top);

            const tailW = Math.min(28, boxW * 0.28);
            const tailX = sb.x;
            const tailY = top + boxH;
            ctx.moveTo(tailX - tailW / 2, tailY);
            ctx.lineTo(tailX, tailY + 18 * (sb.scale || 1));
            ctx.lineTo(tailX + tailW / 2, tailY);

            ctx.closePath();
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#bbb';
            ctx.lineWidth = 3;
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
            ctx.fillText(text, sb.x, sb.y - 2);

        } else {
            ctx.beginPath();
            ctx.ellipse(sb.x, sb.y, 70, 40, Math.PI * 0.05, 0, Math.PI * 2);
            ctx.moveTo(sb.x + 40, sb.y + 10);
            ctx.ellipse(sb.x + 40, sb.y + 10, 18, 12, Math.PI * 0.1, 0, Math.PI * 2);
            ctx.moveTo(sb.x - 40, sb.y + 10);
            ctx.ellipse(sb.x - 40, sb.y + 10, 18, 12, Math.PI * 0.1, 0, Math.PI * 2);
            ctx.closePath();
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#bbb';
            ctx.lineWidth = 3;
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 32px Comic Sans MS, Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, sb.x, sb.y);
        }

        ctx.restore();
    });

    // Профайлер
    if (perf && perf.isEnabled()) {
        perf.drawOverlay(ctx, 0);
    }
}

/**
 * Показывает оверлей победы в уровне "Ловлю".
 */
function showLovlyuLevelComplete() {
    if (typeof window.clearGameInputs === 'function') {
        window.clearGameInputs();
    }
    if (typeof window.setGameTouchControlsVisible === 'function') {
        window.setGameTouchControlsVisible(false);
    }

    // Сохраняем рекорд
    const key = 'bh_bestScore_' + (selectedChar || 'kuzy') + '_lovlyu';
    const best = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    let isNew = false;
    if (score > best) {
        localStorage.setItem(key, String(score));
        isNew = true;
    }
    updateBestScoresDisplay();

    const existing = document.getElementById('level-complete-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'level-complete-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
        background: 'rgba(255,255,255,0.95)', borderRadius: '12px', padding: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)', textAlign: 'center', minWidth: '380px'
    });

    const iconsRow = document.createElement('div');
    Object.assign(iconsRow.style, { fontSize: '28px', marginBottom: '12px' });
    const trophy = document.createElement('span');
    trophy.innerText = '🏆';
    const banana = document.createElement('span');
    banana.innerText = '🍌';
    Object.assign(trophy.style, { marginRight: '10px', display: 'inline-block' });
    Object.assign(banana.style, { marginLeft: '10px', display: 'inline-block' });
    iconsRow.appendChild(trophy);
    iconsRow.appendChild(banana);

    const msg = document.createElement('div');
    const caught = Math.floor(score / 10);
    msg.innerText = `Поздравляем, уровень "Ловлю" пройден!\nПоймано: ${caught}/${lovlyuTotalSpawns}` + (isNew ? ' — Новый рекорд!' : '');
    Object.assign(msg.style, { fontSize: '20px', marginBottom: '18px', color: '#222', opacity: '0', transform: 'translateY(12px)', whiteSpace: 'pre-line' });

    const styleId = 'lovlyu-level-complete-style';
    if (!document.getElementById(styleId)) {
        const styleTag = document.createElement('style');
        styleTag.id = styleId;
        styleTag.innerHTML = `
            @keyframes popIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes bounceIcon { 0% { transform: translateY(-6px); } 50% { transform: translateY(0); } 100% { transform: translateY(-3px); } }
        `;
        document.head.appendChild(styleTag);
    }

    const buttons = document.createElement('div');
    Object.assign(buttons.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

    const btnRetry = document.createElement('button');
    btnRetry.innerText = 'Повторить';
    Object.assign(btnRetry.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    btnRetry.onclick = () => {
        if (typeof window.clearGameInputs === 'function') window.clearGameInputs();
        beginGameRun('lovlyu', true);
        document.getElementById('menu').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        overlay.remove();
        if (typeof window.setGameTouchControlsVisible === 'function') window.setGameTouchControlsVisible(true);
    };

    const btnMain = document.createElement('button');
    btnMain.innerText = 'Главный экран';
    Object.assign(btnMain.style, { padding: '10px 16px', fontSize: '16px', cursor: 'pointer' });
    btnMain.onclick = () => {
        if (typeof window.clearGameInputs === 'function') window.clearGameInputs();
        if (typeof resetGameStateForMenu === 'function') resetGameStateForMenu();
        document.getElementById('game').style.display = 'none';
        document.getElementById('menu').style.display = 'block';
        updateBestScoresDisplay();
        if (typeof window.setGameTouchControlsVisible === 'function') window.setGameTouchControlsVisible(false);
        overlay.remove();
    };

    const btnNextLovlyu = document.createElement('button');
    btnNextLovlyu.innerText = 'Следующий уровень';
    btnNextLovlyu.disabled = true;
    Object.assign(btnNextLovlyu.style, { padding: '10px 16px', fontSize: '16px', opacity: '0.6', cursor: 'not-allowed' });

    buttons.appendChild(btnRetry);
    buttons.appendChild(btnMain);
    buttons.appendChild(btnNextLovlyu);
    box.appendChild(iconsRow);
    box.appendChild(msg);
    box.appendChild(buttons);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        msg.style.transition = 'opacity 520ms ease-out, transform 520ms ease-out';
        msg.style.opacity = '1';
        msg.style.transform = 'translateY(0)';
        trophy.style.animation = 'bounceIcon 900ms ease-in-out 1';
        banana.style.animation = 'bounceIcon 900ms ease-in-out 1';
    });
}
