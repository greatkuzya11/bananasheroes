// ==== ОБНОВЛЕНИЕ ИГРЫ ====
/**
 * Обновляет игровое состояние за один кадр.
 * @param {number} dt - прошедшее время кадра в секундах.
 */
function update(dt) {
    if (invuln > 0) invuln -= dt;
    
    // Обновляем платформы в режиме платформ
    if (gameMode === 'platforms') {
        // Обновляем каждую платформу; p — объект платформы
        platforms.forEach(p => p.update(dt));
    }
    
    player.update(dt);

    // Обновляем врага 67 (если есть)
    if (enemy67) {
        enemy67.update(dt);
    }

    // Обновляем падение таблички Букин (если есть)
    if (bukinTablet && !bukinTablet.landed) {
        // вычисляем текущие размеры с сохранением пропорций, если изображение загружено
        let curW = bukinTablet.desiredW;
        let curH = bukinTablet.desiredW; // запасной вариант
        if (bukinImgReady && bukinImg.width > 0) {
            curH = curW * (bukinImg.height / bukinImg.width);
        }
        // Падаем вниз (изменяем центр Y)
        bukinTablet.cy += 8;
        // Сдвигаемся по горизонтали к целевому центру
        bukinTablet.cx += (bukinTablet.targetCx - bukinTablet.cx) * 0.12;
        // Останавливаем падение на уровне, рассчитанном по самой нижней точке, которой может достичь игрок
        const playerMaxBottom = canvas.height - 20; // минимальная нижняя граница игрока (позиция при старте)
        const landCy = playerMaxBottom - 10 - curH / 2; // центр Y так, чтобы низ был примерно на 10px выше нижней границы игрока
        if (bukinTablet.cy >= landCy) {
            bukinTablet.cy = landCy;
            bukinTablet.cx = bukinTablet.targetCx;
            bukinTablet.landed = true;
            // Показываем экран завершения уровня, если ещё не показан
            if (!levelCompleteShown) {
                showLevelComplete();
                levelCompleteShown = true;
            }
        }
    }

    // Обновляем облачки с текстом
    // Фильтруем активные облачки; sb — объект облачка
    speechBalloons = speechBalloons.filter(sb => {
        sb.timer += dt;
        const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
        return sb.timer < dur;
    });

    // Обновляем анимации взрывов
    // Фильтруем активные взрывы; ex — объект взрыва
    explosions = explosions.filter(ex => {
        ex.timer += dt;
        return ex.timer < 0.5;
    });

    const perf = window.BHBulletPerf;
    const rotationEnabled = perf ? perf.bulletRotationEnabled() : true;
    if (perf && perf.isEnabled()) perf.beforeBulletUpdate();
    // Обновляем позиции всех пуль игрока; b — объект пули
    bullets.forEach(b => {
        if (typeof b.vx === 'number' && typeof b.vy === 'number') {
            b.x += b.vx;
            b.y += b.vy;
        } else {
            b.y -= b.speed;
        }
        // Вращаем пулю Дрона
        if (rotationEnabled && b.playerType === 'dron' && typeof b.rotation === 'number') {
            b.rotation += 0.3; // скорость вращения
        }
        // Вращаем пулю Макса
        if (rotationEnabled && b.playerType === 'max' && typeof b.rotation === 'number') {
            b.rotation += 0.3; // скорость вращения
        }
    });
    if (perf && perf.isEnabled()) perf.afterBulletUpdate();
    // Двигаем пули врагов по их скорости, если она задана (поддержка самонаведения)
    // b — объект вражеской пули
    enemyBullets.forEach(b => {
        if (typeof b.vx === 'number' && typeof b.vy === 'number') {
            b.x += b.vx;
            b.y += b.vy;
        } else {
            b.y += 4;
        }
    });
    // Двигаем бонусные бутылки; b — объект бутылки
    bottles.forEach(b => {
        b.y += 2;
        b.x += Math.sin(b.y / 20) * 1.5;
    });

    // Оставляем пули в пределах расширенных границ экрана
    // Фильтруем пули игрока по границам; b — объект пули
    bullets = bullets.filter(b => b.x >= -100 && b.x <= canvas.width + 100 && b.y >= -100 && b.y <= canvas.height + 100);
    // Фильтруем пули врагов по вертикали; b — объект пули врага
    enemyBullets = enemyBullets.filter(b => b.y < canvas.height);
    // Фильтруем бутылки по вертикали; b — объект бутылки
    bottles = bottles.filter(b => b.y < canvas.height);
    // Двигаем сердечки; h — объект сердечка
    hearts.forEach(h => {
        h.y += 2;
        h.x += Math.sin(h.y / 20) * 1.5;
    });
    // Фильтруем сердечки по вертикали; h — объект сердечка
    hearts = hearts.filter(h => h.y < canvas.height);

    const leafEmojis = ["🍃", "🍂", "🍁", "🌿", "🌱"];

    // РЕЖИМ ВЫЖИВАНИЯ: новая волна, если врагов меньше 12
    if (gameMode === 'survival' && enemies.length < 12 && !survivalWaveSpawning) {
        survivalWaveSpawning = true;
        scheduleWave(canvas.width / 2, ENEMY_START_Y, 12, 1000);
        // Сбросим флаг через 12 секунд (время появления всех врагов)
        // Коллбек таймера сбрасывает флаг спавна волны
        setTimeout(() => {
            survivalWaveSpawning = false;
        }, 12000);
    }

    // ЛОГИКА БОССА
    if (gameMode !== 'survival' && gameMode !== '67' && gameMode !== 'platforms' && !boss && !bossDefeated && enemies.length === 0) {
        // Создаем босса-сосиску после уничтожения всех врагов
        const baseSize = canvas.height * 0.08;
        boss = {
            x: canvas.width / 2,
            y: -baseSize * 5,
            w: baseSize * 5,
            h: baseSize * 5,
            dir: 1,
            shootTimer: 0,
            hp: 11,
            angle: 0,
            angleSpeed: 0.04 + Math.random()*0.04,
            centered: false
        };
        // Не считаем игрока неуязвимым, пока босс действительно не побежден
        bossDefeated = false;
    }

    if (boss) {
        // Если босс ещё не в центре — плавно двигаем его туда и не выполняем активную логику
        if (!boss.centered) {
            const targetX = canvas.width / 2 - boss.w / 2;
            const targetY = 60;
            boss.x += (targetX - boss.x) * 0.08;
            boss.y += (targetY - boss.y) * 0.08;
            if (Math.abs(boss.x - targetX) < 2 && Math.abs(boss.y - targetY) < 2) {
                boss.x = targetX;
                boss.y = targetY;
                boss.centered = true;
            }
        } else {
            // Покачивание
            boss.angle += boss.angleSpeed;
            boss.x += Math.sin(boss.angle) * 2;
            // Движение по экрану
            boss.x += boss.dir * 1.2;
            if (boss.x < 0 || boss.x + boss.w > canvas.width) {
                boss.dir *= -1;
            }
            // Стрельба в 3 раза чаще
            boss.shootTimer += dt;
            // Увеличиваем частоту стрельбы и слегка наводим пули на игрока
            if (Math.random() < 0.03 && boss.shootTimer > 0.16) {
                boss.shootTimer = 0;
                for (let i = 0; i < 3; i++) {
                    const emojiIdx = Math.floor(Math.random() * leafEmojis.length);
                    const bx = boss.x + boss.w / 2 + (i - 1) * 30;
                    const by = boss.y + boss.h;
                    const px = player.x + player.w / 2;
                    const py = player.y + player.h / 2;
                    const dx = px - bx;
                    const dy = py - by;
                    const dist = Math.max(1, Math.hypot(dx, dy));
                    const speed = 5.0;
                    // Самонаведение: сильнее для пуль босса
                    const homing = 0.45;
                    const vx = (dx / dist) * speed * homing;
                    const vy = (dy / dist) * speed * 0.95;
                    enemyBullets.push({ x: bx, y: by, w: 16, h: 24, emoji: leafEmojis[emojiIdx], vx, vy });
                }
            }
        }
    }

    // Режим платформ: проверяем неподвижность игрока и спавним врагов
    // Враги спавнятся только если враг 67 ещё жив
    if (gameMode === 'platforms' && enemy67) {
        const playerMovement = Math.abs(player.x - platformPlayerLastX);
        const inactivityThreshold = canvas.width * 0.1; // 1/10 ширины экрана
        
        if (playerMovement > inactivityThreshold) {
            // Игрок двигается, сбрасываем таймер
            platformInactivityTimer = 0;
            platformPlayerLastX = player.x;
        } else {
            // Игрок не двигается
            platformInactivityTimer += dt;
            
            // Если неподвижен 3 секунды - спавним одного врага сирень
            if (platformInactivityTimer >= 3.0) {
                platformInactivityTimer = 0;
                platformPlayerLastX = player.x;
                
                // Спавним одного врага сирень на случайной платформе (кроме домашней и трофейной платформ)
                // Отбираем платформы для спавна врагов; p — платформа, i — индекс
                const spawnablePlatforms = platforms.filter((p, i) => i > 0 && i < platforms.length - 1);
                if (spawnablePlatforms.length > 0) {
                    const plat = spawnablePlatforms[Math.floor(Math.random() * spawnablePlatforms.length)];
                    const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
                    const flowers = [];
                    for (let j = 0; j < 18; j++) {
                        const angle = Math.PI * 2 * Math.random();
                        const rad = 0.18 + Math.random() * 0.18;
                        const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
                        const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
                        const sizeK = 0.5 + Math.random()*0.5;
                        const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
                        flowers.push({relX, relY, rad, sizeK, color});
                    }
                    const enemyW = canvas.height * ENEMY_WIDTH_RATIO;
                    const enemyH = canvas.height * ENEMY_HEIGHT_RATIO;
                    const ex = plat.x + plat.w / 2 - enemyW / 2;
                    const ey = plat.y - enemyH - 5;
                    
                    enemies.push({
                        x: ex,
                        y: ey,
                        w: enemyW,
                        h: enemyH,
                        dir: 1,
                        diving: false,
                        targetX: 0,
                        shootTimer: 0,
                        flowers,
                        platformIndex: platforms.indexOf(plat)
                    });
                }
            }
        }
    }

    // Обновляем состояние всех врагов; e — объект врага
    enemies.forEach(e => {
        if (!e.diving) {
            e.x += e.dir * (1.2 + survivalEnemySpeedIncrease);
            if (e.x < 0 || e.x + e.w > canvas.width) {
                e.dir *= -1;
                e.y += 20;
            }
            if (Math.random() < 0.002) {
                e.diving = true;
                e.targetX = player.x + player.w / 2;
            }
        } else {
            e.y += 4;
            e.x += (e.targetX - e.x) * 0.02;
            // Теперь враг летит чуть ниже игрока, чтобы мог столкнуться
            if (e.y > player.y + player.h * 0.5) {
                e.diving = false;
                e.y = ENEMY_START_Y;
            }
        }

        e.shootTimer += dt;
        if (Math.random() < 0.004 && e.shootTimer > 0.9) {
            e.shootTimer = 0;
            const bx = e.x + e.w / 2;
            const by = e.y + e.h;
            const px = player.x + player.w / 2;
            const py = player.y + player.h / 2;
            const dx = px - bx;
            const dy = py - by;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const speed = 4.0 + survivalBulletSpeedIncrease;
            const homing = 0.18; // мягкое самонаведение для обычных врагов
            
            // Выпускаем несколько пуль в зависимости от множителя пуль режима выживания
            for (let i = 0; i < survivalBulletMultiplier; i++) {
                // Назначаем случайный эмодзи-листик при создании пули
                const emojiIdx = Math.floor(Math.random() * leafEmojis.length);
                // Небольшой разброс для множественных пуль
                const spreadAngle = (i - (survivalBulletMultiplier - 1) / 2) * 0.15;
                const angle = Math.atan2(dy, dx) + spreadAngle;
                const vx = Math.cos(angle) * speed * homing;
                const vy = Math.sin(angle) * speed * 0.9;
                enemyBullets.push({ x: bx, y: by, w: 8, h: 12, emoji: leafEmojis[emojiIdx], vx, vy });
            }
        }
    });

    // Столкновения пуль: пули игрока могут уничтожать пули врагов и босса
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        for (let ebi = enemyBullets.length - 1; ebi >= 0; ebi--) {
            const eb = enemyBullets[ebi];
            const ew = eb.w || 8;
            const eh = eb.h || 12;
            const hr = b.hitRadius || (b.r * 2);
            // Простая проверка пересечения круга и прямоугольника (приближенно)
            if (b.x > eb.x - hr && b.x < eb.x + ew + hr && b.y > eb.y - hr && b.y < eb.y + eh + hr) {
                // Меньший взрыв при столкновении пуль
                const cx = (b.x + (eb.x + ew / 2)) / 2;
                const cy = (b.y + (eb.y + eh / 2)) / 2;
                explosions.push({ x: cx, y: cy, timer: 0, scale: 0.5 });
                // Бонусная пуля Дрона не исчезает и продолжает лететь
                if (!(b.isBonus && player.type === 'dron')) {
                    bullets.splice(bi, 1);
                }
                enemyBullets.splice(ebi, 1);
                // +1 очко за уничтожение пули врага пулей игрока
                score += 1;
                
                // Бонусный выстрел Кузи уничтожает 3 ближайших пули врагов
                if (b.isBonus && player.type === 'kuzy' && enemyBullets.length > 0) {
                    const hitX = cx;
                    const hitY = cy;
                    
                    // Создаем массив пуль с расстояниями
                    // Формируем массив пуль с расстояниями; пуля — объект пули, idx — индекс
                    const bulletsWithDist = enemyBullets.map((bullet, idx) => {
                        const bulletCx = bullet.x + (bullet.w || 8) / 2;
                        const bulletCy = bullet.y + (bullet.h || 12) / 2;
                        const dx = bulletCx - hitX;
                        const dy = bulletCy - hitY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        return { bullet, idx, dist, cx: bulletCx, cy: bulletCy };
                    });
                    
                    // Сортируем по расстоянию и берем 3 ближайших
                    // Сортируем по расстоянию по возрастанию; a и b — элементы массива
                    bulletsWithDist.sort((a, b) => a.dist - b.dist);
                    const toDestroy = bulletsWithDist.slice(0, 3);
                    
                    // Уничтожаем от конца к началу чтобы индексы не сбивались
                    // Сортируем индексы по убыванию, чтобы безопасно удалять; a и b — элементы массива
                    toDestroy.sort((a, b) => b.idx - a.idx);
                    // Уничтожаем выбранные пули; item — элемент с данными пули
                    toDestroy.forEach(item => {
                        explosions.push({ x: item.cx, y: item.cy, timer: 0, scale: 0.5 });
                        enemyBullets.splice(item.idx, 1);
                        score += 1;
                    });
                }
                
                // Бонусная пуля Дрона продолжает лететь, не прерываем цикл
                if (b.isBonus && player.type === 'dron') {
                    continue;
                }
                
                break;
            }
        }
    }

    // Попадание пули во врага
    /**
     * Проверяет попадание пули по врагу и вызывает выпадение бонуса через trySpawnBonus
     */
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        
        // Проверка попадания по врагу 67
        if (enemy67 && enemy67.hp > 0) {
            if (b.x > enemy67.x && b.x < enemy67.x + enemy67.w && b.y > enemy67.y && b.y < enemy67.y + enemy67.h) {
                // Бонусный выстрел Кузи и Дрона наносит 2 урона
                const damage = (b.isBonus && (player.type === 'kuzy' || player.type === 'dron')) ? 2 : 1;
                enemy67.hp -= damage;
                
                // В режиме платформ отслеживаем попадания для спавна врагов
                if (gameMode === 'platforms') {
                    platform67HitCount += damage;
                    
                    // После 20 попаданий спавнится 1 враг
                    if (platform67HitCount === 20) {
                        const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
                        const flowers = [];
                        for (let j = 0; j < 18; j++) {
                            const angle = Math.PI * 2 * Math.random();
                            const rad = 0.18 + Math.random() * 0.18;
                            const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
                            const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
                            const sizeK = 0.5 + Math.random()*0.5;
                            const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
                            flowers.push({relX, relY, rad, sizeK, color});
                        }
                        const enemyW = canvas.height * ENEMY_WIDTH_RATIO;
                        const enemyH = canvas.height * ENEMY_HEIGHT_RATIO;
                        enemies.push({
                            x: canvas.width / 2 - enemyW / 2,
                            y: 50,
                            w: enemyW,
                            h: enemyH,
                            dir: 1,
                            diving: false,
                            targetX: 0,
                            shootTimer: 0,
                            flowers
                        });
                    }
                    
                    // После 25, 30, 35, 40 попаданий спавняются по 2 врага
                    if ((platform67HitCount === 25 || platform67HitCount === 30 || platform67HitCount === 35 || platform67HitCount === 40) && platform67HitCount >= 25) {
                        const lilacColors = ["#b57edc", "#c084fc", "#a855f7", "#e1bee7", "#ede7f6"];
                        
                        for (let spawn = 0; spawn < 2; spawn++) {
                            const flowers = [];
                            for (let j = 0; j < 18; j++) {
                                const angle = Math.PI * 2 * Math.random();
                                const rad = 0.18 + Math.random() * 0.18;
                                const relX = Math.cos(angle) * 0.22 * (0.7 + Math.random()*0.7);
                                const relY = 0.18 + Math.sin(angle) * 0.22 * (0.7 + Math.random()*0.7);
                                const sizeK = 0.5 + Math.random()*0.5;
                                const color = lilacColors[Math.floor(Math.random() * lilacColors.length)];
                                flowers.push({relX, relY, rad, sizeK, color});
                            }
                            const enemyW = canvas.height * ENEMY_WIDTH_RATIO;
                            const enemyH = canvas.height * ENEMY_HEIGHT_RATIO;
                            const spawnX = spawn === 0 ? canvas.width * 0.25 : canvas.width * 0.75;
                            enemies.push({
                                x: spawnX - enemyW / 2,
                                y: 50,
                                w: enemyW,
                                h: enemyH,
                                dir: 1,
                                diving: false,
                                targetX: 0,
                                shootTimer: 0,
                                flowers
                            });
                        }
                    }
                }
                
                // Пуля исчезает после попадания, включая бонусную пулю Дрона
                bullets.splice(bi, 1);
                score += 5;
                // Маленький взрыв при попадании
                explosions.push({ x: b.x, y: b.y, timer: 0 });
                
                if (enemy67.hp <= 0) {
                    // Большой взрыв размером с врага
                    explosions.push({ 
                        x: enemy67.x + enemy67.w / 2, 
                        y: enemy67.y + enemy67.h / 2, 
                        timer: 0,
                        size: enemy67.w * 0.8 // размер взрыва как размер врага
                    });
                    
                    // В режиме платформ: взрываем всех врагов и пули врагов
                    if (gameMode === 'platforms') {
                        // Взрываем всех врагов сирень на уровне
                        for (let i = 0; i < enemies.length; i++) {
                            const e = enemies[i];
                            explosions.push({ 
                                x: e.x + e.w / 2, 
                                y: e.y + e.h / 2, 
                                timer: 0 
                            });
                        }
                        enemies = []; // очищаем всех врагов
                        
                        // Взрываем все пули врагов
                        for (let i = 0; i < enemyBullets.length; i++) {
                            const eb = enemyBullets[i];
                            explosions.push({ 
                                x: eb.x, 
                                y: eb.y, 
                                timer: 0 
                            });
                        }
                        enemyBullets = []; // очищаем все пули врагов
                    }
                    
                    // В режиме платформ создаем рубин на платформе 67
                    if (gameMode === 'platforms' && platforms.length > 1) {
                        const platform67 = platforms[1]; // вторая платформа - это платформа 67
                        const rubyW = platform67.h;
                        const rubyH = platform67.h;
                        platformRuby = {
                            x: platform67.x + (platform67.w - rubyW) / 2,
                            y: platform67.y + platform67.h * 0.3 - rubyH,
                            w: rubyW,
                            h: rubyH,
                            stage: 1 // первая стадия рубина
                        };
                    }
                    
                    // Показываем экран победы по аналогии с боссом
                    enemy67 = null;
                    platform67HitCount = 0; // сбрасываем счётчик
                    if (!levelCompleteShown && gameMode !== 'platforms') {
                        showLevelComplete();
                        levelCompleteShown = true;
                    }
                }
                continue;
            }
        }
        
        if (!boss) {
            // Используем обратный цикл для безопасного удаления при итерации
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const e = enemies[ei];
                if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                    // Взрыв на месте врага
                    explosions.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, timer: 0 });
                    enemies.splice(ei, 1);
                    // Выживание: увеличиваем счетчик убийств и ускоряем игру
                    if (gameMode === 'survival') {
                        killCount++;
                        // Каждые 20 убийств увеличиваем число пуль (до 10 раз, максимум 1024)
                        if (killCount % 20 === 0 && survivalBulletMultiplier < 1024) {
                            survivalBulletMultiplier *= 1.2;
                        }
                        // Каждые 30 убийств увеличиваем скорость врагов и пуль (до 10 раз)
                        if (killCount % 30 === 0 && survivalSpeedUps < 10) {
                            survivalEnemySpeedIncrease += 1;
                            survivalBulletSpeedIncrease += 1;
                            survivalSpeedUps += 1;
                        }
                    }
                    // Бонусная пуля Дрона не исчезает и продолжает лететь
                    if (!(b.isBonus && player.type === 'dron')) {
                        bullets.splice(bi, 1);
                    }
                    score += 2;
                    combo++;
                    // Выпадение бонуса по обычному шансу
                    trySpawnBonus(e.x, e.y);
                    // Выпадение сердечка по обычному шансу
                    trySpawnHeart(e.x, e.y);
                    // Гарантированное выпадение бонуса при 5 комбо подряд
                    if (combo > 0 && combo % 5 === 0) {
                        bottles.push({ x: e.x, y: e.y, w: 18, h: 36 });
                    }
                    
                    // Бонусный выстрел Кузи убивает еще одного ближайшего врага
                    if (b.isBonus && player.type === 'kuzy' && enemies.length > 0) {
                        let nearestEnemy = null;
                        let nearestDist = Infinity;
                        const hitX = e.x + e.w / 2;
                        const hitY = e.y + e.h / 2;
                        
                        for (let j = 0; j < enemies.length; j++) {
                            const enemy = enemies[j];
                            const dx = (enemy.x + enemy.w / 2) - hitX;
                            const dy = (enemy.y + enemy.h / 2) - hitY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < nearestDist) {
                                nearestDist = dist;
                                nearestEnemy = { enemy, idx: j };
                            }
                        }
                        
                        if (nearestEnemy) {
                            const ne = nearestEnemy.enemy;
                            // Взрыв на месте второго врага
                            explosions.push({ x: ne.x + ne.w / 2, y: ne.y + ne.h / 2, timer: 0 });
                            enemies.splice(nearestEnemy.idx, 1);
                            score += 2;
                            combo++;
                            trySpawnBonus(ne.x, ne.y);
                            trySpawnHeart(ne.x, ne.y);
                        }
                    }
                    if (b.isBonus && player.type === 'dron') {
                        continue;
                    }
                    break; // Пуля может убить только одного врага за раз
                }
            }
        } else {
            // Попадание по боссу-сосиске
            if (b.x > boss.x && b.x < boss.x + boss.w && b.y > boss.y && b.y < boss.y + boss.h && boss.hp > 0) {
                // Бонусный выстрел Кузи и Дрона наносит 2 урона
                const damage = (b.isBonus && (player.type === 'kuzy' || player.type === 'dron')) ? 2 : 1;
                boss.hp -= damage;
                // +3 очка за попадание по боссу
                score += 3;
                explosions.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, timer: 0 });
                // Удаляем пулю после попадания (даже бонусную пулю Дрона, чтобы избежать множественных ударов)
                bullets.splice(bi, 1);
                if (boss.hp <= 0) {
                    // Бонус за смерть босса
                    // Отмечаем победу над боссом, чтобы оставшиеся пули не наносили урон
                    bossDefeated = true;
                    score += 20;
                    combo++;
                        // Взрыв босса
                        explosions.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, timer: 0 });
                        // Создаём табличку Букин, она упадёт рядом с игроком (сохраняем центр и желаемую ширину)
                        const desiredW = boss.w / 2;
                        // Выбираем сторону (лево/право) по доступному месту
                        const leftCenter = player.x - desiredW - 10 + desiredW / 2;
                        const rightCenter = player.x + player.w + 10 + desiredW / 2;
                        let targetCx = leftCenter;
                        if (leftCenter < desiredW / 2 && rightCenter + desiredW / 2 <= canvas.width) {
                            targetCx = rightCenter;
                        } else if (rightCenter + desiredW / 2 > canvas.width && leftCenter >= desiredW / 2) {
                            targetCx = leftCenter;
                        }
                        bukinTablet = {
                            cx: boss.x + boss.w / 2,
                            cy: boss.y + boss.h / 2,
                            desiredW,
                            targetCx,
                            landed: false
                        };
                        // Добавляем облачко у игрока: не блокирует падение таблички, длится 5 секунд
                        speechBalloons.push({
                            x: player.x + player.w / 2,
                            y: player.y - player.h * 0.15,
                            timer: 0,
                            duration: 5.0,
                            text: "Хуем Пам-Пам!!",
                            type: 'buk'
                        });
                        boss = null;
                }
            }
        }
    }

    // Игрок подбирает бутылку
    // b — объект бутылки, bi — индекс в массиве
    bottles.forEach((b, bi) => {
        if (rect(b, player)) {
            bonusShots += BONUS_SHOTS_PER_BOTTLE;
            bottles.splice(bi, 1);
        }
    });

    // Игрок подбирает сердечко
    // h — объект сердечка, hi — индекс в массиве
    hearts.forEach((h, hi) => {
        if (rect(h, player)) {
            if (lives < PLAYER_LIVES) {
                lives++; // +1 жизнь если не максимум
            } else {
                bonusShots += 5; // +5 бонусных выстрелов если максимум жизней
            }
            hearts.splice(hi, 1);
        }
    });

    if (invuln <= 0) {
        // Пуля врага попадает в игрока
        // eb — объект пули врага, ei — индекс в массиве
        enemyBullets.forEach((eb, ei) => {
            // После победы над боссом пули врагов больше не наносят урон
            if (bossDefeated) return;
            if (rect(eb, player)) {
                lives--;
                combo = 0;
                invuln = 1;
                // Добавляем взрыв
                explosions.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, timer: 0 });
                // Добавляем облачко с текстом
                // Облачко слева от игрока
                speechBalloons.push({ x: player.x - player.w * 0.25, y: player.y + player.h * 0.25, timer: 0 });
                enemyBullets.splice(ei, 1);
                if (lives <= 0) {
                    showGameOver();
                }
            }
        });

        // Враг сталкивается с игроком
        // e — объект врага
        enemies.forEach((e) => {
            // Проверяем столкновение по прямоугольникам
            if (
                rect(
                    { x: e.x, y: e.y, w: e.w, h: e.h },
                    { x: player.x, y: player.y, w: player.w, h: player.h }
                )
            ) {
                lives--;
                combo = 0;
                invuln = 1;
                // Добавляем взрыв
                explosions.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, timer: 0 });
                // Добавляем облачко с текстом
                // Облачко слева от игрока
                speechBalloons.push({ x: player.x - player.w * 0.25, y: player.y + player.h * 0.25, timer: 0 });
                if (lives <= 0) {
                    showGameOver();
                }
            }
        });
    }

    // Режим платформ: проверяем столкновение с рубином (по расстоянию центров)
    if (gameMode === 'platforms' && platformRuby) {
        const rubyCenterX = platformRuby.x + platformRuby.w / 2;
        const rubyCenterY = platformRuby.y + platformRuby.h / 2;
        const playerCenterX = player.x + player.w / 2;
        const playerCenterY = player.y + player.h / 2;
        const dx = rubyCenterX - playerCenterX;
        const dy = rubyCenterY - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (platformRuby.w + player.w) / 2;
        
        if (distance < minDistance) {
            if (platformRuby.stage === 1) {
                // Первая стадия -> вторая стадия (смена стадии рубина)
                platformRuby.stage = 2;
                // Создаем падение кубка с платформы трофея
                if (platforms.length > 4) {
                    const trophyPlatform = platforms[platforms.length - 1];
                    const cupW = trophyPlatform.h;
                    const cupH = trophyPlatform.h;
                    platformCup = {
                        x: trophyPlatform.x + (trophyPlatform.w - cupW) / 2,
                        y: -cupH,
                        cy: -cupH,
                        cx: trophyPlatform.x + (trophyPlatform.w - cupW) / 2,
                        w: cupW,
                        h: cupH,
                        landed: false,
                        collisionTriggered: false,
                        targetCx: trophyPlatform.x + (trophyPlatform.w - cupW) / 2,
                        targetCy: trophyPlatform.y + trophyPlatform.h * 0.1 - cupH,
                        desiredW: cupW
                    };
                }
            }
        }
    }

    // Режим платформ: обновляем падение кубка
    if (gameMode === 'platforms' && platformCup && !platformCup.landed) {
        platformCup.cy += 8;
        platformCup.cx += (platformCup.targetCx - platformCup.cx) * 0.12;
        
        if (platformCup.cy >= platformCup.targetCy) {
            platformCup.cy = platformCup.targetCy;
            platformCup.cx = platformCup.targetCx;
            platformCup.x = platformCup.targetCx;
            platformCup.y = platformCup.targetCy;
            platformCup.landed = true;
        } else {
            platformCup.x = platformCup.cx;
            platformCup.y = platformCup.cy;
        }
    }

    // Режим платформ: проверяем столкновение с кубком (только после приземления)
    if (gameMode === 'platforms' && platformCup && platformCup.landed) {
        const cupCenterX = platformCup.x + platformCup.w / 2;
        const cupCenterY = platformCup.y + platformCup.h / 2;
        const playerCenterX = player.x + player.w / 2;
        const playerCenterY = player.y + player.h / 2;
        const dx = cupCenterX - playerCenterX;
        const dy = cupCenterY - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (platformCup.w + player.w) / 2;
        
        if (distance < minDistance && !platformCup.collisionTriggered) {
            platformCup.collisionTriggered = true;
            levelCompleteShown = true;
            showLevelCompleteMessage();
        }
    }

    if (!hudEl) hudEl = document.getElementById('hud');
    if (hudEl) {
        const dirIcon = playerBulletDir === 'up' ? '↑' : (playerBulletDir === 'left' ? '←' : '→');
        const playerName = charNames[selectedChar] || selectedChar;
        const modeIndicator = altShootMode ? '<span style="color:orange">🔫ALT</span>' : '';
        if (lives !== lastHudLives) {
            cachedLivesStr = "❤️".repeat(lives);
            lastHudLives = lives;
        }
        let hudHtml = '';
        if (bonusMode && bonusShots > 0) {
            hudHtml = `${playerName} | Жизни: ${cachedLivesStr}<br>Очки: ${score}   Комбо: ${combo}   <span style="color:black">Бонус: ${bonusShots}</span>   Пули: ${dirIcon} ${modeIndicator}`;
        } else {
            hudHtml = `${playerName} | Жизни: ${cachedLivesStr}<br>Очки: ${score}   Комбо: ${combo}   Бонус: ${bonusShots}   Пули: ${dirIcon} ${modeIndicator}`;
        }
        if (hudHtml !== lastHudHtml) {
            hudEl.innerHTML = hudHtml;
            lastHudHtml = hudHtml;
        }
    }
}

