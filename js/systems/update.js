// ==== ОБНОВЛЕНИЕ ИГРЫ ====
/**
 * Безопасно воспроизводит SFX, если аудиосистема подключена.
 * @param {string} id - идентификатор звука.
 * @param {object} [opts] - доп. параметры воспроизведения.
 */
function bhPlaySfx(id, opts) {
    if (window.BHAudio && typeof window.BHAudio.play === 'function') {
        window.BHAudio.play(id, opts);
    }
}

/**
 * Запускает финальную анимацию победы в уровне "Очко":
 * коричневый взрыв и падение трех бутылок.
 */
function startO4koVictorySequence() {
    o4koVictoryBeers = [];
    o4koVictorySequenceActive = true;

    const baseH = Math.max(72, Math.round(canvas.height * 0.11)) * 2;
    const centerY = canvas.height * 0.51;

    const beerLayout = [];
    for (let i = 0; i < 3; i++) {
        const img = o4koVictoryBeerImgs[i] || null;
        let h = baseH;
        let w = Math.round(h * 0.62);
        // Сохраняем исходные пропорции текстуры, чтобы не было "сплющивания".
        if (img && img.complete && img.width > 0 && img.height > 0) {
            w = Math.max(24, Math.round(h * (img.width / img.height)));
        }
        beerLayout.push({ img, w, h });
    }

    const widest = beerLayout.reduce((m, b) => Math.max(m, b.w), 0);
    const gap = Math.max(14, Math.round(widest * 0.28));
    const totalW = beerLayout.reduce((sum, b) => sum + b.w, 0) + gap * (beerLayout.length - 1);
    let curX = canvas.width * 0.5 - totalW * 0.5;

    for (let i = 0; i < beerLayout.length; i++) {
        const item = beerLayout[i];
        const targetY = centerY - item.h * 0.5;
        o4koVictoryBeers.push({
            x: curX,
            y: -item.h - 18 - i * 10,
            w: item.w,
            h: item.h,
            targetY,
            vy: 0,
            gravity: canvas.height * 1.9,
            landed: false,
            img: item.img
        });
        curX += item.w + gap;
    }
}

/**
 * Обновляет игровое состояние за один кадр.
 * @param {number} dt - прошедшее время кадра в секундах.
 */
function update(dt) {
    // Отдельный игровой цикл уровней "Носок"/"Степан".
    if (gameMode === 'nosok' || gameMode === 'stepan') {
        updateNosokMode(dt);
        return;
    }

    // Отдельный игровой цикл уровней "Ловлю"/"Поймал".
    if (gameMode === 'lovlyu' || gameMode === 'poimal') {
        updateLovlyuMode(dt);
        return;
    }

    // Отдельный игровой цикл уровня "Бегун".
    if (gameMode === 'runner') {
        updateRunnerMode(dt);
        return;
    }

    // Отдельный игровой цикл бонусного уровня.
    if (gameMode === 'bonus') {
        updateBonusMode(dt);
        return;
    }

    // Отдельный игровой цикл обучающего уровня.
    if (gameMode === 'tutorial') {
        updateTutorialMode(dt);
        return;
    }

    if (invuln > 0) invuln -= dt;
    // Таймер визуального эффекта смены фазы
    if (normalPhaseEffectTimer > 0) normalPhaseEffectTimer = Math.max(0, normalPhaseEffectTimer - dt);

    const adaptiveCombat = (typeof isMobileAdaptiveCombatMode === 'function') && isMobileAdaptiveCombatMode(gameMode);
    const adaptiveScale = adaptiveCombat && (typeof getMobileLandscapeAdaptiveScale === 'function')
        ? getMobileLandscapeAdaptiveScale()
        : 1;
    const frameMul = adaptiveCombat ? (dt * 60) : 1;
    const speedMul = adaptiveCombat ? adaptiveScale : 1;
    const mobileBalance = (window.BHMobileAdaptive
        && typeof window.BHMobileAdaptive.getBalance === 'function'
        && adaptiveCombat)
        ? window.BHMobileAdaptive.getBalance(gameMode)
        : null;
    const balFire = mobileBalance ? mobileBalance.enemyFireRate : 1;
    const balProj = mobileBalance ? mobileBalance.enemyProjectileSpeed : 1;
    const balMove = mobileBalance ? mobileBalance.enemyMoveSpeed : 1;
    const balDrop = mobileBalance ? mobileBalance.dropFallSpeed : 1;
    
    // Обновляем платформы в режиме платформ
    if (gameMode === 'platforms') {
        // Обновляем каждую платформу; p — объект платформы
        platforms.forEach(p => p.update(dt));
    }
    
    player.update(dt);

    // Обновляем врага 67 (если есть)
    if (enemy67) {
        enemy67.update(dt);
        if (gameMode === '67' && enemy67.hp > 0) {
            const maxEnemy67Size = Math.min(canvas.width, canvas.height) * 0.9;
            if (enemy67.w >= maxEnemy67Size || enemy67.h >= maxEnemy67Size) {
                mode67BossReachedMaxSize = true;
            }
        }
        if (gameMode === 'mode67' && enemy67.hp > 0) {
            mode67RunElapsedSec += dt;
        }
    }
    // Обновляем босса "Очко" (если есть)
    if (bossO4ko) {
        bossO4ko.update(dt);
        if (gameMode === 'o4ko' && bossO4ko.consumePhaseTransition()) {
            score += 10; // Бонус за смену фазы
        }
    }

    // Случайные дропы в уровне "Очко"
    if (gameMode === 'o4ko' && bossO4ko) {
        o4koRandomDropTimer += dt;
        if (o4koRandomDropTimer >= 10) {
            o4koRandomDropTimer = 0;
            if (Math.random() < 0.50) {
                spawnO4koDrop('random');
            }
            // Банан по таймеру: при хорошем стрике
            if (o4koHitStreak >= 15 && Math.random() < 0.50) {
                spawnO4koDrop('banana');
            }
        }
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
        const playerMaxBottom = canvas.height - Math.max(8, Math.round(canvas.height * 0.033)); // минимальная нижняя граница игрока (позиция при старте)
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

    // Финал уровня "Очко": падение 3 бутылок и показ сообщения после приземления.
    if (gameMode === 'o4ko' && o4koVictorySequenceActive && o4koVictoryBeers.length > 0) {
        let landedCount = 0;
        o4koVictoryBeers.forEach(b => {
            if (!b.landed) {
                b.vy += b.gravity * dt;
                b.y += b.vy * dt;
                if (b.y >= b.targetY) {
                    b.y = b.targetY;
                    b.vy = 0;
                    b.landed = true;
                }
            }
            if (b.landed) landedCount++;
        });
        if (landedCount === o4koVictoryBeers.length && !levelCompleteShown) {
            showLevelComplete();
            levelCompleteShown = true;
            o4koVictorySequenceActive = false;
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
        const dur = (typeof ex.duration === 'number') ? ex.duration : 0.5;
        return ex.timer < dur;
    });

    const perf = window.BHBulletPerf;
    const rotationEnabled = perf ? perf.bulletRotationEnabled() : true;
    if (perf && perf.isEnabled()) perf.beforeBulletUpdate();
    // Обновляем позиции всех пуль игрока; b — объект пули
    bullets.forEach(b => {
        if (typeof b.vx === 'number' && typeof b.vy === 'number') {
            b.x += b.vx * frameMul * speedMul;
            b.y += b.vy * frameMul * speedMul;
        } else {
            b.y -= b.speed * frameMul * speedMul;
        }
        // Вращаем пулю Дрона
        if (rotationEnabled && b.playerType === 'dron' && typeof b.rotation === 'number') {
            b.rotation += 0.3; // скорость вращения
        }
        // Анимация пули Макса: бонусная крутится, обычная покачивается
        if (b.playerType === 'max') {
            if (b.isBonus && rotationEnabled && typeof b.rotation === 'number') {
                b.rotation += 0.3;
            } else if (!b.isBonus) {
                b.swayAge = (b.swayAge || 0) + 0.15;
            }
        }
    });
    if (perf && perf.isEnabled()) perf.afterBulletUpdate();
    // Двигаем пули врагов по их скорости, если она задана (поддержка самонаведения)
    // b — объект вражеской пули
    enemyBullets.forEach(b => {
        if (typeof b.vx === 'number' && typeof b.vy === 'number') {
            b.x += b.vx * frameMul * speedMul;
            b.y += b.vy * frameMul * speedMul;
        } else {
            b.y += 4 * frameMul * speedMul;
        }
        if (b.o4koPoop) {
            b.rotation = (typeof b.rotation === 'number' ? b.rotation : 0) + (typeof b.rotationSpeed === 'number' ? b.rotationSpeed : 0.08);
        }
    });
    // Двигаем бонусные бутылки; b — объект бутылки
    bottles.forEach(b => {
        b.y += 2 * balDrop * frameMul * speedMul;
        b.x += Math.sin(b.y / 20) * 1.5 * balDrop;
    });

    // Оставляем пули в пределах расширенных границ экрана
    // Фильтруем пули игрока по границам; b — объект пули
    bullets = bullets.filter(b => b.x >= -100 && b.x <= canvas.width + 100 && b.y >= -100 && b.y <= canvas.height + 100);
    if (gameMode === '67' && !mode67EnemyBulletLeftScreen) {
        for (let i = 0; i < enemyBullets.length; i++) {
            const eb = enemyBullets[i];
            if (eb.x < 0 || eb.x > canvas.width || eb.y < 0 || eb.y > canvas.height) {
                mode67EnemyBulletLeftScreen = true;
                break;
            }
        }
    }
    // Фильтруем пули врагов по границам экрана
    enemyBullets = enemyBullets.filter(b => b.y < canvas.height + 100 && b.x > -120 && b.x < canvas.width + 120);
    // Фильтруем бутылки по вертикали; b — объект бутылки
    bottles = bottles.filter(b => b.y < canvas.height);
    // Двигаем сердечки; h — объект сердечка
    hearts.forEach(h => {
        h.y += 2 * balDrop * frameMul * speedMul;
        h.x += Math.sin(h.y / 20) * 1.5 * balDrop;
    });
    // Фильтруем сердечки по вертикали; h — объект сердечка
    hearts = hearts.filter(h => h.y < canvas.height);
    // Двигаем бананы; b — объект банана
    bananaBonuses.forEach(b => {
        b.y += 2.2 * balDrop * frameMul * speedMul;
        b.x += Math.sin(b.y / 18) * 1.1 * balDrop;
    });
    // Фильтруем бананы по вертикали
    bananaBonuses = bananaBonuses.filter(b => b.y < canvas.height + 20);

    // Обновляем книги в режиме "Библиотека"
    if (gameMode === 'library') updateLibraryBooks(dt);

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

    // ЛОГИКА ПЕРЕХОДА ФАЗ (режим normal)
    if (gameMode === 'normal') {
        // Если идет интерактивный спавн фазы — создаём по одному врагу за 3 секунды
        if (normalPhaseSpawning) {
            normalPhaseSpawnTimer += dt;
            const total = Math.max(1, normalPhaseSpawnTotal || (ENEMY_ROWS * ENEMY_COLS));
            const interval = 3.0 / total;
            while (normalPhaseSpawnTimer >= interval && normalPhaseSpawnedCount < total) {
                normalPhaseSpawnTimer -= interval;
                spawnOneNormalEnemy(normalPhaseTarget, normalPhaseSpawnedCount);
                normalPhaseSpawnedCount++;
            }
            if (normalPhaseSpawnedCount >= total) {
                normalPhaseSpawning = false;
                normalPhase = normalPhaseTarget;
                // визуальный эффект запускается при убийстве последнего врага — не дублируем здесь
            }
        }
    }

    // ЛОГИКА БОССА (если не normal, либо normal и фазы завершены)
    if (gameMode !== 'survival' && gameMode !== '67' && gameMode !== 'mode67' && gameMode !== 'o4ko' && gameMode !== 'platforms' && gameMode !== 'library' && !boss && !bossDefeated && enemies.length === 0) {
        if (gameMode === 'normal') {
            // Если ещё не дошли до 4-й фазы — запускаем спавн следующей фазы
            if (normalPhase < 4 && !normalPhaseSpawning) {
                startNormalPhaseSpawn(normalPhase + 1);
            } else if (normalPhase >= 4 && !normalPhaseSpawning) {
                // Создаем босса-сосиску после уничтожения всех врагов четвёртой фазы
                const baseSize = canvas.height * 0.08;
                boss = {
                    x: canvas.width / 2,
                    y: -baseSize * 5,
                    w: baseSize * 5,
                    h: baseSize * 5,
                    dir: 1,
                    shootTimer: 0,
                    hp: 20,
                    maxHp: 20,
                    angle: 0,
                    angleSpeed: 0.04 + Math.random()*0.04,
                    centered: false
                };
                bossDefeated = false;
            }
        } else {
            // Создаем босса-сосиску после уничтожения всех врагов (не normal)
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
            boss.angle += boss.angleSpeed * frameMul;
            boss.x += Math.sin(boss.angle) * 2 * frameMul * (adaptiveCombat ? adaptiveScale : 1);
            // Движение по экрану
            boss.x += boss.dir * 1.2 * balMove * frameMul * speedMul;
            if (boss.x < 0 || boss.x + boss.w > canvas.width) {
                boss.dir *= -1;
            }
            // Стрельба в 3 раза чаще
            boss.shootTimer += dt;
            // Увеличиваем частоту стрельбы и слегка наводим пули на игрока
            if (Math.random() < 0.03 * balFire * frameMul && boss.shootTimer > 0.16) {
                boss.shootTimer = 0;
                if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
                    window.BHAudio.playEnemyShoot('lilac');
                }
                for (let i = 0; i < 3; i++) {
                    const emojiIdx = Math.floor(Math.random() * leafEmojis.length);
                    const bx = boss.x + boss.w / 2 + (i - 1) * 30;
                    const by = boss.y + boss.h;
                    const px = player.x + player.w / 2;
                    const py = player.y + player.h / 2;
                    const dx = px - bx;
                    const dy = py - by;
                    const dist = Math.max(1, Math.hypot(dx, dy));
                    const speed = 5.0 * balProj;
                    // Самонаведение: сильнее для пуль босса
                    const homing = 0.45;
                    const vx = (dx / dist) * speed * homing;
                    const vy = (dy / dist) * speed * 0.95;
                    const ebW = Math.max(8, Math.round(16 * speedMul));
                    const ebH = Math.max(12, Math.round(24 * speedMul));
                    enemyBullets.push({ x: bx, y: by, w: ebW, h: ebH, emoji: leafEmojis[emojiIdx], vx, vy });
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
                    platformRunIdleLilacSpawned = true;
                    platformRunIdleLilacSpawnCount += 1;
                }
            }
        }
    }

    // Обновляем состояние всех врагов; e — объект врага
    enemies.forEach(e => {
        if (!e.diving) {
            const base = 1.2 + survivalEnemySpeedIncrease;
            const speedMul = (typeof e.speedMul === 'number') ? e.speedMul : 1.0;
            e.x += e.dir * (base * speedMul * balMove) * frameMul * (adaptiveCombat ? adaptiveScale : 1);
            if (e.x < 0 || e.x + e.w > canvas.width) {
                e.dir *= -1;
                e.y += 20 * (adaptiveCombat ? adaptiveScale : 1);
            }
            // Вероятность пикирования зависит от фазы (для normal): фазы 1-2 => 0.001, иначе 0.002
            let diveChance = 0.002;
            if (gameMode === 'normal' && typeof e.phase === 'number') {
                if (e.phase === 1 || e.phase === 2) diveChance = 0.001;
            }
            if (Math.random() < diveChance * balFire * frameMul) {
                e.diving = true;
                e.targetX = player.x + player.w / 2;
            }
        } else {
            e.y += 4 * frameMul * (adaptiveCombat ? adaptiveScale : 1);
            const lerp = adaptiveCombat ? (1 - Math.pow(1 - 0.02, frameMul)) : 0.02;
            e.x += (e.targetX - e.x) * lerp;
            // Теперь враг летит чуть ниже игрока, чтобы мог столкнуться
            if (e.y > player.y + player.h * 0.5) {
                e.diving = false;
                e.y = ENEMY_START_Y;
            }
        }

        e.shootTimer += dt;
        const shootMul = (typeof e.shootMul === 'number') ? e.shootMul : (typeof e.shootMul === 'undefined' && typeof e.shootMul === 'undefined' ? 1.0 : 1.0);
        if (Math.random() < 0.004 * shootMul * balFire * frameMul && e.shootTimer > 0.9) {
            e.shootTimer = 0;
            if (window.BHAudio && typeof window.BHAudio.playEnemyShoot === 'function') {
                window.BHAudio.playEnemyShoot('lilac');
            }
            const bx = e.x + e.w / 2;
            const by = e.y + e.h;
            const px = player.x + player.w / 2;
            const py = player.y + player.h / 2;
            const dx = px - bx;
            const dy = py - by;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const speed = (4.0 + survivalBulletSpeedIncrease) * balProj;
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
                const ebW = Math.max(5, Math.round(8 * speedMul));
                const ebH = Math.max(8, Math.round(12 * speedMul));
                enemyBullets.push({ x: bx, y: by, w: ebW, h: ebH, emoji: leafEmojis[emojiIdx], vx, vy });
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
                if (gameMode === 'mode67') {
                    mode67RunBulletRuleBroken = true;
                }
                // Меньший взрыв при столкновении пуль
                const cx = (b.x + (eb.x + ew / 2)) / 2;
                const cy = (b.y + (eb.y + eh / 2)) / 2;
                explosions.push({ x: cx, y: cy, timer: 0, scale: 0.5 });
                bhPlaySfx('explosion_small', { volumeMul: 0.82 });
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
            const enemy67Hitbox = (typeof enemy67.getVisibleHitbox === 'function')
                ? enemy67.getVisibleHitbox()
                : {
                    x: enemy67.x,
                    y: enemy67.y,
                    w: enemy67.w,
                    h: enemy67.h,
                    cx: enemy67.x + enemy67.w * 0.5,
                    cy: enemy67.y + enemy67.h * 0.5
                };

            const insideVisibleRect = b.x > enemy67Hitbox.x && b.x < enemy67Hitbox.x + enemy67Hitbox.w && b.y > enemy67Hitbox.y && b.y < enemy67Hitbox.y + enemy67Hitbox.h;
            const insideOpaqueShape = insideVisibleRect && (
                (typeof enemy67.isOpaquePoint === 'function') ? enemy67.isOpaquePoint(b.x, b.y) : true
            );
            if (insideOpaqueShape) {
                // Бонусный выстрел Кузи и Дрона наносит 2 урона
                const damage = (b.isBonus && (player.type === 'kuzy' || player.type === 'dron')) ? 2 : 1;
                const enemy67PrevHp = enemy67.hp;
                enemy67.hp -= damage;
                bhPlaySfx('hit_boss', { volumeMul: 0.95, duck: 0.88 });
                if (gameMode === 'platforms' && lives === 1) {
                    const appliedDamageAtOneHp = Math.max(0, Math.min(damage, enemy67PrevHp));
                    platformRunDamageAtOneHp += appliedDamageAtOneHp;
                }
                
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
                // Маленький взрыв в точке попадания на видимой части спрайта 67.
                explosions.push({ x: b.x, y: b.y, timer: 0 });
                bhPlaySfx('explosion_small', { volumeMul: 0.86 });
                
                if (enemy67.hp <= 0) {
                    if (gameMode === 'platforms') {
                        platformRunBossKilledAtOneHp = (lives === 1);
                    }
                    if (gameMode === '67') {
                        const playerCenterX = player.x + player.w * 0.5;
                        mode67FinalBlowFromRight = playerCenterX > enemy67Hitbox.cx;
                        const maxEnemy67Size = Math.min(canvas.width, canvas.height) * 0.9;
                        if (enemy67.w >= maxEnemy67Size || enemy67.h >= maxEnemy67Size) {
                            mode67BossReachedMaxSize = true;
                        }
                    }
                    // Большой взрыв размером с врага
                    explosions.push({ 
                        x: enemy67Hitbox.cx, 
                        y: enemy67Hitbox.cy, 
                        timer: 0,
                        size: Math.max(enemy67Hitbox.w, enemy67Hitbox.h) * 0.8 // размер взрыва как размер врага
                    });
                    bhPlaySfx('explosion_big', { volumeMul: 1.0, duck: 0.72 });
                    
                    // В режиме платформ: взрываем всех врагов и пули врагов
                    if (gameMode === 'platforms' || gameMode === '67' || gameMode === 'mode67') {
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

        // Проверка попадания по боссу режима "Очко"
        if (bossO4ko && bossO4ko.hp > 0) {
            if (b.x > bossO4ko.x && b.x < bossO4ko.x + bossO4ko.w && b.y > bossO4ko.y && b.y < bossO4ko.y + bossO4ko.h) {
                // Для уровня "Очко" бонусные пули по боссу:
                // Кузя/Дрон = 3 урона, Макс = 1.5 урона.
                const isBonus = !!b.isBonus;
                let exactBonusDamage = null;
                if (isBonus && (player.type === 'kuzy' || player.type === 'dron')) {
                    exactBonusDamage = 3;
                } else if (isBonus && player.type === 'max') {
                    exactBonusDamage = 1.5;
                }
                let hitInfo;
                if (typeof exactBonusDamage === 'number') {
                    const vulnerable = (typeof bossO4ko.isVulnerable === 'function') ? bossO4ko.isVulnerable() : false;
                    bossO4ko.hp = Math.max(0, bossO4ko.hp - exactBonusDamage);
                    hitInfo = { damage: exactBonusDamage, vulnerable, killed: bossO4ko.hp <= 0 };
                } else {
                    hitInfo = bossO4ko.takeHit(1);
                }
                bullets.splice(bi, 1);
                score += 5;
                combo++;
                explosions.push({ x: b.x, y: b.y, timer: 0 });
                bhPlaySfx('hit_boss', { volumeMul: 0.95, duck: 0.88 });
                bhPlaySfx('explosion_small', { volumeMul: 0.86 });

                // Награды за серию попаданий по боссу.
                o4koHitStreak += 1;

                // Каждые 8 попаданий по боссу без урона игроку гарантированно даем пиво.
                if (o4koHitStreak > 0 && o4koHitStreak % 8 === 0) {
                    spawnO4koDrop('beer');
                }

                // Попадание в окно уязвимости: дополнительный счет +2.
                if (hitInfo.vulnerable) {
                    score += 2;
                    o4koVulnHitCount += 1;
                    // Каждые 20 попаданий в окно уязвимости гарантированно даем пиво.
                    if (o4koVulnHitCount > 0 && o4koVulnHitCount % 20 === 0) {
                        spawnO4koDrop('beer');
                    }
                }

                // Редкий банан за длинную серию без потери жизни.
                if (o4koHitStreak >= 15 && o4koHitStreak % 12 === 0 && Math.random() < 0.30) {
                    spawnO4koDrop('banana');
                }

                if (hitInfo.killed) {
                    bossDefeated = true;
                    score += 30; // Бонус за победу над боссом
                    combo++;
                    // Коричневый взрыв босса "Очко"
                    explosions.push({
                        x: bossO4ko.x + bossO4ko.w / 2,
                        y: bossO4ko.y + bossO4ko.h / 2,
                        timer: 0,
                        size: bossO4ko.w * 1.05,
                        style: 'brown',
                        duration: 0.85
                    });
                    bhPlaySfx('explosion_big', { volumeMul: 1.0, duck: 0.7 });
                    // Запускаем последовательность победы уровня "Очко":
                    // падение 3 бутылок, затем показ сообщения о завершении.
                    startO4koVictorySequence();
                    bossO4ko = null;
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
                    bhPlaySfx('hit_enemy', { volumeMul: 0.92 });
                    enemies.splice(ei, 1);
                    // Если это был последний враг фазы в режиме normal — показываем эффект и запускаем переход
                    if (gameMode === 'normal' && enemies.length === 0) {
                        // Небольшой, неяркий эффект на ~0.6 секунды
                        normalPhaseEffectTimer = 0.6;
                        if (normalPhase < 4 && !normalPhaseSpawning) {
                            startNormalPhaseSpawn(normalPhase + 1);
                        }
                    }
                    // Выживание: увеличиваем счетчик убийств и ускоряем игру
                    if (gameMode === 'survival') {
                        killCount++;
                        // Каждые 20 убийств увеличиваем число пуль (до 10 раз, максимум 1024)
                        if (killCount % 20 === 0 && survivalBulletMultiplier < 1024) {
                            survivalBulletMultiplier *= 1.2;
                        }
                        // Каждые 30 убийств увеличиваем скорость врагов и пуль (до 10 раз)
                        const survivalSpeedUpsCap = 10;
                        if (killCount % 30 === 0 && survivalSpeedUps < survivalSpeedUpsCap) {
                            survivalEnemySpeedIncrease += 1;
                            survivalBulletSpeedIncrease += 1;
                            survivalSpeedUps += 1;
                            if (
                                survivalSpeedUps >= survivalSpeedUpsCap
                                && typeof BHAchievements !== 'undefined'
                            ) {
                                // Achievement 2 (survival): grant immediately when max speed is reached.
                                BHAchievements.grant('survival_hardcore');
                            }
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
                        const size = (typeof getCombatPickupSize === 'function')
                            ? getCombatPickupSize('bottle')
                            : { w: 18, h: 36 };
                        bottles.push({ x: e.x, y: e.y, w: size.w, h: size.h });
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
                            bhPlaySfx('hit_enemy', { volumeMul: 0.88 });
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
                bhPlaySfx('hit_boss', { volumeMul: 0.94 });
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
                        bhPlaySfx('explosion_big', { volumeMul: 1.0, duck: 0.72 });
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
            if (window.BHGlobalAchievements && typeof window.BHGlobalAchievements.addBeerPickup === 'function') {
                window.BHGlobalAchievements.addBeerPickup(1);
            }
            if (gameMode === 'normal') {
                normalRunBeerCollected += 1;
            }
            if (gameMode === 'library') {
                libraryRunBeerPicked = true;
            }
            bottles.splice(bi, 1);
            bhPlaySfx('pickup_beer', { volumeMul: 0.95 });
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
            if (window.BHGlobalAchievements && typeof window.BHGlobalAchievements.addBonusPickup === 'function') {
                window.BHGlobalAchievements.addBonusPickup('heart', 1);
            }
            hearts.splice(hi, 1);
            bhPlaySfx('pickup_heart', { volumeMul: 0.95 });
        }
    });

    // Игрок подбирает банан-бонус (только режим "Очко")
    bananaBonuses.forEach((bn, bni) => {
        if (rect(bn, player)) {
            lives = Math.min(PLAYER_LIVES, lives + 1); // +1 жизнь
            bonusShots += 5; // +5 бонусных выстрелов
            score += 3;
            if (window.BHGlobalAchievements && typeof window.BHGlobalAchievements.addBonusPickup === 'function') {
                window.BHGlobalAchievements.addBonusPickup('banana', 1);
            }
            if (gameMode === 'o4ko') {
                o4koRunBananaCollectedCount += 1;
            }
            bananaBonuses.splice(bni, 1);
            bhPlaySfx('pickup_banana', { volumeMul: 0.95 });
        }
    });

    /**
     * Применяет урон по игроку и общие побочные эффекты.
     */
    const applyPlayerDamage = () => {
        lives--;
        runHeartsDamageTaken += 1;
        if (window.BHGlobalAchievements && typeof window.BHGlobalAchievements.addCampaignHpLoss === 'function') {
            window.BHGlobalAchievements.addCampaignHpLoss(gameMode, 1);
        }
        if (gameMode === 'normal') {
            normalRunDamageTaken += 1;
        }
        if (gameMode === 'mode67') {
            mode67RunDamageTaken += 1;
        }
        combo = 0;
        o4koHitStreak = 0;
        invuln = INVULN_TIME;

        if (gameMode === 'o4ko' && bossO4ko) {
            o4koLivesLost += 1;
            // Pity-heart: после 4 потерянных жизней за бой, только 1 раз за уровень.
            if (!o4koPityHeartUsed && o4koLivesLost >= 4) {
                spawnO4koDrop('heart');
                o4koPityHeartUsed = true;
            }
        }

        explosions.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, timer: 0 });
        speechBalloons.push({ x: player.x - player.w * 0.25, y: player.y + player.h * 0.25, timer: 0 });
        bhPlaySfx('player_hurt', { volumeMul: 1.0, duck: 0.75 });
        if (lives <= 0) {
            showGameOver();
        }
    };

    if (invuln <= 0) {
        // Урон от контакта с боссом "Очко" и его спец-действий.
        if (gameMode === 'o4ko' && bossO4ko && bossO4ko.hp > 0) {
            const bossRect = { x: bossO4ko.x, y: bossO4ko.y, w: bossO4ko.w, h: bossO4ko.h };
            if (playerHitTest(bossRect)) {
                applyPlayerDamage();
            }
            if (invuln <= 0 && bossO4ko.isDashDangerActive()) {
                if (playerHitTest(bossO4ko.getDashHitbox())) {
                    applyPlayerDamage();
                }
            }
            if (invuln <= 0 && bossO4ko.isTargetHitByGroundWave(player)) {
                applyPlayerDamage();
            }
        }

        // Пули врагов.
        for (let ei = enemyBullets.length - 1; ei >= 0 && invuln <= 0; ei--) {
            const eb = enemyBullets[ei];
            if (bossDefeated) continue; // после победы пули не вредят
            if (playerHitTest(eb)) {
                if (gameMode === 'mode67') {
                    mode67RunBulletRuleBroken = true;
                }
                enemyBullets.splice(ei, 1);
                applyPlayerDamage();
                break;
            }
        }

        // Контакт с обычными врагами.
        for (let i = 0; i < enemies.length && invuln <= 0; i++) {
            const e = enemies[i];
            if (playerHitTest({ x: e.x, y: e.y, w: e.w, h: e.h })) {
                applyPlayerDamage();
                break;
            }
        }
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
                bhPlaySfx('platform_ruby', { volumeMul: 0.92 });
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
            bhPlaySfx('platform_cup', { volumeMul: 1.0, duck: 0.82 });
            showLevelComplete();
        }
    }

    if (!hudEl) hudEl = document.getElementById('hud');
    if (hudEl) {
        const dirIcon = playerBulletDir === 'up' ? '↑' : (playerBulletDir === 'left' ? '←' : '→');
        const playerName = charNames[selectedChar] || selectedChar;
        const modeIndicator = altShootMode ? '<span style="color:orange">🔫ALT</span>' : '';
        if (lives !== lastHudLives) {
            const _prevLives = lastHudLives;
            cachedLivesStr = "❤️".repeat(lives);
            lastHudLives = lives;
            if (_prevLives !== -1 && hudEl) {
                hudEl.classList.remove('hud-heart-lose', 'hud-heart-gain');
                void hudEl.offsetWidth;
                hudEl.classList.add(lives < _prevLives ? 'hud-heart-lose' : 'hud-heart-gain');
                clearTimeout(hudHeartAnimTimeout);
                hudHeartAnimTimeout = setTimeout(() => hudEl.classList.remove('hud-heart-lose', 'hud-heart-gain'), 500);
            }
        }
        const o4koPhaseInfo = (gameMode === 'o4ko' && bossO4ko)
            ? `   Фаза: ${bossO4ko.getPhaseLabel()}`
            : '';
        const bonusClass = (bonusMode && bonusShots > 0) ? 'hud-bonus active' : 'hud-bonus';
        const bonusHtml = `<span class="${bonusClass}"><span>Бонус:</span><span class="hud-bonus-value">${Math.max(0, bonusShots)}</span></span>`;
        let hudHtml = '';
        hudHtml = `${playerName} | Жизни: <span class="hud-lives">${cachedLivesStr}</span><br>Очки: ${score}   Комбо: ${combo}   ${bonusHtml}   Пули: ${dirIcon} ${modeIndicator}${o4koPhaseInfo}`;
        if (typeof debugMode !== 'undefined' && debugMode) {
            hudHtml += `<br>DEBUG: Фаза ${normalPhase}   Врагов: ${enemies.length}`;
        }
        if (hudHtml !== lastHudHtml) {
            hudEl.innerHTML = hudHtml;
            lastHudHtml = hudHtml;
        }
    }
}


