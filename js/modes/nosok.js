// ==== РЕЖИМ "НОСОК" ====

/**
 * Форматирует миллисекунды в строку `MM:SS.cc`.
 * @param {number} ms - длительность в миллисекундах.
 * @returns {string}
 */
function formatNosokTime(ms) {
    const total = Math.max(0, Math.floor(ms));
    const centis = Math.floor((total % 1000) / 10);
    const sec = Math.floor(total / 1000) % 60;
    const min = Math.floor(total / 60000);
    const mm = String(min).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    const cc = String(centis).padStart(2, '0');
    return `${mm}:${ss}.${cc}`;
}

/**
 * Возвращает ключ хранения лучшего времени режима "Носок".
 * @returns {string}
 */
function getNosokBestTimeKey() {
    return 'bh_bestTime_' + (selectedChar || 'kuzy') + '_nosok';
}

/**
 * Сбрасывает runtime-состояние уровня "Носок".
 */
function resetNosokLevelState() {
    nosokBall = null;
    nosokGoalSensor = null;
    nosokCrossbar = null;
    nosokGoals = 0;
    nosokTargetGoals = 10;
    nosokElapsedTime = 0;
    nosokFinalTimeMs = 0;
    nosokGoalPauseTimer = 0;
    nosokGoalFlashTimer = 0;
    nosokGoalRespawnPending = false;
    nosokGoalConfettiTimer = 0;
    nosokGoalConfetti = [];
    nosokDropTimer = 0;
    nosokNextDropTime = 10 + Math.random() * 5;
    nosokIceTimer = 0;
    nosokNextIceTime = 14 + Math.random() * 3;
    nosokDynamiteTimer = 0;
    nosokNextDynamiteTime = 16 + Math.random() * 5;
    nosokSpecialBonuses = [];
    bossNosok = null;
}

/**
 * Создает мяч и сбрасывает его сверху поля.
 * @param {boolean} afterGoal - true, если спавн после гола.
 */
function spawnNosokBall(afterGoal = false) {
    const r = Math.max(18, Math.round(Math.min(canvas.width, canvas.height) * 0.035));
    nosokBall = {
        x: canvas.width * (0.46 + Math.random() * 0.08),
        y: -r * 2,
        lastX: canvas.width * 0.5,
        lastY: -r * 2,
        r,
        vx: (Math.random() - 0.5) * canvas.width * 0.08,
        vy: afterGoal ? canvas.height * 0.02 : 0,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2.5,
        noOwnGoalTimer: 0
    };
}

/**
 * Настраивает ворота в виде буквы "Г":
 * - вертикальная стойка-сенсор (не блокирует)
 * - верхняя перекладина (блокирует мяч)
 */
function setupNosokGoal() {
    const groundY = canvas.height - 20;
    const postW = Math.max(12, Math.round(canvas.width * 0.012));
    const goalH = Math.max(Math.round(canvas.height * 0.42), Math.round(player.h * 2.9));
    // Укорачиваем глубину ворот на 2/3 (оставляем ~1/3 от прежней).
    const crossbarW = Math.max(56, Math.round(canvas.width * 0.08));
    // Зеркальная "Г": вертикальная стойка слева, перекладина уходит вправо.
    // Прижимаем перекладину к правому краю экрана.
    const goalX = Math.max(8, Math.round(canvas.width - (crossbarW + postW)));
    const goalTopY = groundY - goalH;
    nosokGoalSensor = new Platform(
        goalX,
        goalTopY,
        postW,
        goalH,
        null,
        0,
        0,
        null,
        true,
        { solid: false, platformType: 'goalPipe', isGoalSensor: true }
    );
    nosokCrossbar = new Platform(
        goalX,
        goalTopY - postW,
        crossbarW + postW,
        postW,
        null,
        0,
        0,
        null,
        true,
        { solid: true, platformType: 'goalPipe', isGoalSensor: false }
    );
}

/**
 * Инициализирует уровень "Носок".
 */
function initNosokLevel() {
    resetNosokLevelState();
    setupNosokGoal();
    spawnNosokBall(false);
    bossNosok = new BossNosok();
    nosokElapsedTime = 0;
    nosokFinalTimeMs = 0;
}

/**
 * Возвращает случайное число в диапазоне.
 * @param {number} min - минимум.
 * @param {number} max - максимум.
 * @returns {number}
 */
function nosokRand(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Спавнит порцию конфетти для сигнала гола.
 * @param {number} count - количество частиц.
 */
function spawnNosokGoalConfetti(count) {
    const total = Math.max(1, Math.floor(count || 1));
    for (let i = 0; i < total; i++) {
        const spawnX = canvas.width * (0.08 + Math.random() * 0.84);
        nosokGoalConfetti.push({
            x: spawnX,
            y: -18 - Math.random() * 30,
            vx: nosokRand(-canvas.width * 0.06, canvas.width * 0.06),
            vy: nosokRand(canvas.height * 0.28, canvas.height * 0.48),
            g: canvas.height * nosokRand(0.34, 0.54),
            size: nosokRand(5, 11),
            rot: Math.random() * Math.PI * 2,
            vrot: nosokRand(-8.4, 8.4),
            timer: 0,
            life: nosokRand(1.05, 1.9),
            color: [
                '#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#f72585', '#f4a261', '#90be6d'
            ][Math.floor(Math.random() * 7)]
        });
    }
}

/**
 * Спавнит бонусы сверху экрана в режиме "Носок".
 * @param {'beer'|'heart'|'ice'|'dynamite'|'random'} type - тип бонуса.
 */
function spawnNosokDrop(type = 'random') {
    let actual = type;
    if (actual === 'random') {
        actual = (Math.random() < 0.70) ? 'beer' : 'heart';
    }

    if (actual === 'beer') {
        const w = 36;
        const h = 36;
        bottles.push({
            x: 12 + Math.random() * Math.max(1, canvas.width - w - 24),
            y: -h - 10,
            w,
            h,
            fromTop: true
        });
        return;
    }
    if (actual === 'heart') {
        const w = 40;
        const h = 40;
        hearts.push({
            x: 12 + Math.random() * Math.max(1, canvas.width - w - 24),
            y: -h - 10,
            w,
            h,
            fromTop: true
        });
        return;
    }

    const w = 44;
    const h = 44;
    nosokSpecialBonuses.push({
        type: actual,
        x: 12 + Math.random() * Math.max(1, canvas.width - w - 24),
        y: -h - 10,
        w,
        h,
        vy: 2.1,
        driftSeed: Math.random() * 200
    });
}

/**
 * Обновляет таймеры дропа бонусов для режима "Носок".
 * @param {number} dt - время кадра.
 */
function updateNosokDropTimers(dt) {
    nosokDropTimer += dt;
    if (nosokDropTimer >= nosokNextDropTime) {
        nosokDropTimer = 0;
        nosokNextDropTime = nosokRand(10, 15);
        spawnNosokDrop('random');
    }

    nosokIceTimer += dt;
    if (nosokIceTimer >= nosokNextIceTime) {
        nosokIceTimer = 0;
        nosokNextIceTime = nosokRand(13.5, 16.5);
        spawnNosokDrop('ice');
    }

    nosokDynamiteTimer += dt;
    if (nosokDynamiteTimer >= nosokNextDynamiteTime) {
        nosokDynamiteTimer = 0;
        nosokNextDynamiteTime = nosokRand(16, 22);
        spawnNosokDrop('dynamite');
    }
}

/**
 * Отражает круг от прямоугольника и возвращает факт столкновения.
 * @param {{x:number,y:number,r:number,vx:number,vy:number}} ball - мяч.
 * @param {{x:number,y:number,w:number,h:number}} rectObj - прямоугольник.
 * @param {number} bounce - коэффициент упругости.
 * @returns {boolean}
 */
function resolveBallVsRect(ball, rectObj, bounce = 0.82) {
    const closestX = Math.max(rectObj.x, Math.min(ball.x, rectObj.x + rectObj.w));
    const closestY = Math.max(rectObj.y, Math.min(ball.y, rectObj.y + rectObj.h));
    let dx = ball.x - closestX;
    let dy = ball.y - closestY;
    let dist = Math.hypot(dx, dy);

    if (dist >= ball.r) return false;
    if (dist < 0.0001) {
        dx = 0;
        dy = -1;
        dist = 1;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = ball.r - dist;
    ball.x += nx * penetration;
    ball.y += ny * penetration;

    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) {
        ball.vx = ball.vx - (1 + bounce) * dot * nx;
        ball.vy = ball.vy - (1 + bounce) * dot * ny;
    }
    return true;
}

/**
 * Проверяет контакт круга с непрозрачной частью спрайта.
 * @param {{x:number,y:number,r:number}} ball - мяч.
 * @param {{x:number,y:number,w:number,h:number,isOpaqueAtWorld?:Function}} actor - объект со спрайтом.
 * @returns {{hit:boolean,nx:number,ny:number,penetration:number}}
 */
function getCircleSpriteContact(ball, actor) {
    const closestX = Math.max(actor.x, Math.min(ball.x, actor.x + actor.w));
    const closestY = Math.max(actor.y, Math.min(ball.y, actor.y + actor.h));
    let dx = ball.x - closestX;
    let dy = ball.y - closestY;
    let dist = Math.hypot(dx, dy);
    if (dist >= ball.r) return { hit: false, nx: 0, ny: 0, penetration: 0 };

    if (dist < 0.0001) {
        dx = (ball.x >= actor.x + actor.w * 0.5) ? 1 : -1;
        dy = 0;
        dist = 1;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = ball.r - dist;

    if (typeof actor.isOpaqueAtWorld === 'function') {
        const px = ball.x - nx * ball.r * 0.92;
        const py = ball.y - ny * ball.r * 0.92;
        const tx = -ny;
        const ty = nx;
        const p1 = actor.isOpaqueAtWorld(px, py);
        const p2 = actor.isOpaqueAtWorld(px + tx * ball.r * 0.22, py + ty * ball.r * 0.22);
        const p3 = actor.isOpaqueAtWorld(px - tx * ball.r * 0.22, py - ty * ball.r * 0.22);
        if (!(p1 || p2 || p3)) return { hit: false, nx: 0, ny: 0, penetration: 0 };
    }

    return { hit: true, nx, ny, penetration };
}

/**
 * Добавляет импульс мячу после попадания пули.
 * @param {{x:number,y:number,vx:number,vy:number,isBonus:boolean,playerType:string,dir:string,r:number}} bullet - пуля игрока.
 * @param {number|undefined} forceNx - нормаль контакта по X (если известна).
 * @param {number|undefined} forceNy - нормаль контакта по Y (если известна).
 */
function applyBulletImpulseToNosokBall(bullet, forceNx, forceNy) {
    if (!nosokBall) return;
    let strength = canvas.width * 0.66;
    if (bullet.isBonus) strength = canvas.width * 0.94;
    if (bullet.isBonus && bullet.playerType === 'max') strength = canvas.width * 1.10;

    let dx = forceNx;
    let dy = forceNy;
    if (typeof dx !== 'number' || typeof dy !== 'number') {
        dx = 0;
        dy = 0;
        if (typeof bullet.vx === 'number' || typeof bullet.vy === 'number') {
            dx = bullet.vx || 0;
            dy = bullet.vy || 0;
        } else if (bullet.dir === 'up') {
            dy = -1;
        } else if (bullet.dir === 'left') {
            dx = -1;
        } else {
            dx = 1;
        }
    }

    const groundY = canvas.height - 20 - Math.max(10, Math.round(player.h * 0.12));
    const grounded = nosokBall.y + nosokBall.r >= groundY - 2;
    const minLift = bullet.isBonus ? -0.52 : -0.44;
    if (grounded && dy > minLift) {
        dy = minLift;
        // Небольшой вынос по оси X, чтобы не получался "вертикальный столб".
        if (Math.abs(dx) < 0.12) dx = (bullet.dir === 'left') ? -0.16 : 0.16;
    } else if (grounded && dy > -0.24 && bullet.dir === 'up') {
        dy = -0.48;
    }

    if (bullet.dir === 'up' && dy > -0.34) {
        dy = -0.34;
    }

    if (bullet.isBonus) {
        dy -= 0.08;
    }

    if (bullet.playerType === 'dron') {
        strength *= 1.10;
    } else if (bullet.playerType === 'kuzy') {
        strength *= 1.12;
    }

    if (bullet.playerType === 'max' && bullet.isBonus) {
        strength *= 1.08;
    } else if (bullet.playerType === 'max') {
        strength *= 1.02;
    }

    if (bullet.playerType === 'kuzy' && bullet.isBonus) {
        strength *= 1.06;
    } else {
        strength *= 1.0;
    }

    const len = Math.max(0.0001, Math.hypot(dx, dy));
    dx /= len;
    dy /= len;

    const beforeSpeed = Math.hypot(nosokBall.vx, nosokBall.vy);
    nosokBall.vx += dx * strength;
    nosokBall.vy += dy * strength;
    nosokBall.spin += (Math.random() < 0.5 ? -1 : 1) * nosokRand(4.6, 8.8) + dx * nosokRand(1.4, 2.8);

    const maxSpeed = canvas.width * 0.96;
    const minGain = bullet.isBonus ? canvas.width * 0.17 : canvas.width * 0.12;
    let speed = Math.hypot(nosokBall.vx, nosokBall.vy);
    const targetSpeed = Math.min(maxSpeed, beforeSpeed + minGain);
    if (speed < targetSpeed) {
        if (speed < 0.0001) {
            nosokBall.vx = dx * targetSpeed;
            nosokBall.vy = dy * targetSpeed;
            speed = targetSpeed;
        } else {
            const k = targetSpeed / speed;
            nosokBall.vx *= k;
            nosokBall.vy *= k;
            speed = targetSpeed;
        }
    }

    if (speed > maxSpeed) {
        const k = maxSpeed / speed;
        nosokBall.vx *= k;
        nosokBall.vy *= k;
    }
}

/**
 * Проверяет пересечение отрезка и круга, возвращает нормаль столкновения.
 * @param {number} x1 - начало отрезка X.
 * @param {number} y1 - начало отрезка Y.
 * @param {number} x2 - конец отрезка X.
 * @param {number} y2 - конец отрезка Y.
 * @param {number} cx - центр круга X.
 * @param {number} cy - центр круга Y.
 * @param {number} r - радиус круга.
 * @returns {{hit:boolean,nx:number,ny:number}}
 */
function segmentCircleHit(x1, y1, x2, y2, cx, cy, r) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const l2 = vx * vx + vy * vy;
    let t = 0;
    if (l2 > 0.00001) {
        t = ((cx - x1) * vx + (cy - y1) * vy) / l2;
    }
    t = Math.max(0, Math.min(1, t));
    const px = x1 + vx * t;
    const py = y1 + vy * t;
    const dx = cx - px;
    const dy = cy - py;
    const d2 = dx * dx + dy * dy;
    if (d2 > r * r) return { hit: false, nx: 0, ny: 0 };
    const d = Math.max(0.0001, Math.sqrt(d2));
    return { hit: true, nx: dx / d, ny: dy / d };
}

/**
 * Применяет урон игроку в режиме "Носок".
 */
function applyNosokPlayerDamage() {
    if (invuln > 0) return;
    lives--;
    combo = 0;
    invuln = INVULN_TIME;
    explosions.push({ x: player.x + player.w * 0.5, y: player.y + player.h * 0.5, timer: 0 });
    speechBalloons.push({ x: player.x - player.w * 0.25, y: player.y + player.h * 0.22, timer: 0 });
    if (window.BHAudio) {
        window.BHAudio.play('player_hurt', { volumeMul: 1.0, duck: 0.74 });
    }
    if (lives <= 0) {
        showGameOver();
    }
}

/**
 * Обновляет физику и коллизии мяча в режиме "Носок".
 * @param {number} dt - время кадра.
 */
function updateNosokBall(dt) {
    if (!nosokBall) return;

    if (nosokGoalPauseTimer > 0) {
        nosokGoalPauseTimer = Math.max(0, nosokGoalPauseTimer - dt);
        if (nosokGoalPauseTimer <= 0 && nosokGoalRespawnPending && nosokGoals < nosokTargetGoals) {
            nosokGoalRespawnPending = false;
            spawnNosokBall(true);
        }
    }

    const ball = nosokBall;
    const gravity = canvas.height * 1.45;
    // В режиме "Носок" мяч держим немного выше земли, чтобы по нему удобнее попадать.
    const groundY = canvas.height - 20 - Math.max(10, Math.round(player.h * 0.12));
    if (typeof ball.noOwnGoalTimer === 'number' && ball.noOwnGoalTimer > 0) {
        ball.noOwnGoalTimer = Math.max(0, ball.noOwnGoalTimer - dt);
    } else if (typeof ball.noOwnGoalTimer !== 'number') {
        ball.noOwnGoalTimer = 0;
    }

    ball.lastX = ball.x;
    ball.lastY = ball.y;
    ball.vy += gravity * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.angle += ball.spin * dt;
    // Постоянное заметное вращение мяча без затухания.
    const minSpin = 4.2;
    if (Math.abs(ball.spin) < minSpin) {
        const spinSign = (ball.spin !== 0) ? Math.sign(ball.spin) : ((ball.vx !== 0) ? Math.sign(ball.vx) : 1);
        ball.spin = spinSign * minSpin;
    }

    if (ball.x - ball.r < 0) {
        ball.x = ball.r;
        ball.vx = Math.max(Math.abs(ball.vx), canvas.width * 0.12);
        ball.spin = Math.max(Math.abs(ball.spin), minSpin) * Math.sign(ball.vx);
    }
    if (ball.x + ball.r > canvas.width) {
        ball.x = canvas.width - ball.r;
        ball.vx = -Math.max(Math.abs(ball.vx), canvas.width * 0.12);
        ball.spin = -Math.max(Math.abs(ball.spin), minSpin);
        nosokGoalFlashTimer = Math.max(nosokGoalFlashTimer, 0.12);
    }
    if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.vy = Math.max(Math.abs(ball.vy), canvas.height * 0.12);
    }
    if (ball.y + ball.r > groundY) {
        ball.y = groundY - ball.r;
        // Мяч всегда подпрыгивает, но мягче.
        ball.vy = -Math.max(Math.abs(ball.vy) * 0.84, canvas.height * 0.14);
        if (Math.abs(ball.vx) < canvas.width * 0.07) {
            ball.vx = (ball.vx >= 0 ? 1 : -1) * canvas.width * 0.07;
        }
        ball.spin += (ball.vx / Math.max(1, canvas.width)) * 6;
    }

    if (nosokCrossbar) {
        const hitCross = resolveBallVsRect(ball, nosokCrossbar, 0.88);
        if (hitCross) {
            ball.vx = -Math.max(Math.abs(ball.vx), canvas.width * 0.28);
        }
    }

    const moveDir = (keys["ArrowRight"] ? 1 : 0) - (keys["ArrowLeft"] ? 1 : 0);
    const playerVy = (typeof player.vy === 'number') ? player.vy : 0;
    const playerPushX = moveDir * player.speed * 36;
    const playerPushY = (player.isJumping ? -canvas.height * 0.11 : 0) + playerVy * 0.45;
    let playerHit = false;
    let bossHit = false;
    let bossForcedClearance = false;
    const playerContact = getCircleSpriteContact(ball, player);
    if (playerContact.hit) {
        playerHit = true;
        ball.x += playerContact.nx * playerContact.penetration;
        ball.y += playerContact.ny * playerContact.penetration;
        const relVx = ball.vx - playerPushX * 0.14;
        const relVy = ball.vy - playerPushY * 0.14;
        const dot = relVx * playerContact.nx + relVy * playerContact.ny;
        if (dot < 0) {
            const bounce = 1.04;
            ball.vx = relVx - (1 + bounce) * dot * playerContact.nx;
            ball.vy = relVy - (1 + bounce) * dot * playerContact.ny;
        }
        const strikePower = 1 + Math.min(0.55, Math.abs(playerPushX) / Math.max(1, canvas.width * 0.25));
        ball.vx += playerPushX * 0.24 + playerContact.nx * canvas.width * 0.032 * strikePower;
        ball.vy += playerPushY * 0.26 + playerContact.ny * canvas.height * 0.02 * strikePower;
        if (playerContact.ny < -0.12 && ball.vy > -canvas.height * 0.12) {
            ball.vy = -canvas.height * 0.12;
        }
        ball.spin += (playerContact.nx * ball.vy - playerContact.ny * ball.vx) * 0.0007;
        // Удар головой: расширенная зона, чтобы срабатывало стабильно.
        const withinHeadX = ball.x >= player.x + player.w * 0.08 && ball.x <= player.x + player.w * 0.92;
        const comingFromAbove = ball.lastY <= player.y + player.h * 0.46;
        const isHeadZone = withinHeadX && ball.y <= player.y + player.h * 0.50 && (playerContact.ny < -0.08 || comingFromAbove);
        if (isHeadZone) {
            const incomingDown = Math.max(0, ball.vy);
            const jumpUpBoost = (playerVy < -canvas.height * 0.03) ? Math.abs(playerVy) * 0.60 : 0;
            const headerVy = Math.max(canvas.height * 0.22, incomingDown * 1.02 + jumpUpBoost + canvas.height * 0.05);
            ball.vy = -headerVy;

            const minSide = canvas.width * 0.08;
            const side = Math.max(minSide, Math.abs(ball.vx) * 1.05);
            if (moveDir !== 0) {
                ball.vx = moveDir * side;
            } else if (Math.abs(ball.vx) < minSide) {
                const dirFromHead = (ball.x < player.x + player.w * 0.5) ? -1 : 1;
                ball.vx = dirFromHead * minSide;
            }
            ball.spin += (moveDir !== 0 ? moveDir : ((ball.x < player.x + player.w * 0.5) ? -1 : 1)) * 0.45;
        }

        // Жесткий прыжковый контакт: в прыжке мяч должен "улетать" как от удара.
        const stompFromTop = playerVy > canvas.height * 0.06 && (player.y + player.h * 0.72) <= ball.y;
        const jumpContact = player.isJumping && !isHeadZone;
        if (stompFromTop && !isHeadZone) {
            const hardStomp = Math.max(canvas.height * 0.38, Math.abs(ball.vy) * 0.95 + playerVy * 1.30);
            ball.vy = -hardStomp;
            ball.vx += moveDir * canvas.width * 0.06 + playerContact.nx * canvas.width * 0.03;
            ball.spin += (moveDir !== 0 ? moveDir : Math.sign(playerContact.nx || 1)) * 1.0;
        } else if (jumpContact) {
            const jumpHitVy = Math.max(canvas.height * 0.24, Math.abs(ball.vy) * 0.70 + Math.abs(playerVy) * 0.80);
            if (playerContact.ny <= 0.25) {
                ball.vy = -jumpHitVy;
            }
            ball.vx += moveDir * canvas.width * 0.05 + playerContact.nx * canvas.width * 0.045;
            ball.spin += (moveDir !== 0 ? moveDir : Math.sign(playerContact.nx || 1)) * 0.8;
        }
    }

    if (bossNosok) {
        const bossContact = getCircleSpriteContact(ball, bossNosok);
        if (bossContact.hit) {
            bossHit = true;
            ball.x += bossContact.nx * bossContact.penetration;
            ball.y += bossContact.ny * bossContact.penetration;
            const relVx = ball.vx - bossNosok.vx;
            const relVy = ball.vy - bossNosok.vy;
            const dot = relVx * bossContact.nx + relVy * bossContact.ny;
            if (dot < 0) {
                const bounce = 0.9;
                ball.vx = relVx - (1 + bounce) * dot * bossContact.nx + bossNosok.vx * 0.38;
                ball.vy = relVy - (1 + bounce) * dot * bossContact.ny + bossNosok.vy * 0.2;
            }
            ball.spin += (bossContact.nx * ball.vy - bossContact.ny * ball.vx) * 0.0008;

            // Вратарский клиренс: босс у ворот не должен забивать себе гол головой.
            if (nosokGoalSensor && nosokCrossbar) {
                const keeperNearGoal = (bossNosok.x + bossNosok.w) >= (nosokGoalSensor.x - bossNosok.w * 0.2);
                const bossHeadHit = bossContact.ny < -0.08 && ball.y <= bossNosok.y + bossNosok.h * 0.58;
                if (keeperNearGoal && bossHeadHit) {
                    const overBarY = nosokCrossbar.y - ball.r - 2;
                    if (ball.y > overBarY) ball.y = overBarY;
                    if (ball.x < nosokGoalSensor.x + ball.r * 0.7) {
                        ball.x = nosokGoalSensor.x + ball.r * 0.7;
                    }
                    ball.vx = Math.max(Math.abs(ball.vx), canvas.width * 0.13); // в сторону края, через перекладину
                    ball.vy = -Math.max(Math.abs(ball.vy), canvas.height * 0.18);
                    ball.spin += 0.9;
                    ball.noOwnGoalTimer = Math.max(ball.noOwnGoalTimer || 0, 0.55);
                    bossForcedClearance = true;
                }
            }
        }
    }

    // Антизажим: если мяч прижат к краю экрана игроком/боссом, выталкиваем вверх и в поле.
    const nearLeftWall = ball.x - ball.r <= 2;
    const nearRightWall = ball.x + ball.r >= canvas.width - 2;
    if ((nearLeftWall || nearRightWall) && (playerHit || bossHit)) {
        ball.vy = -Math.max(canvas.height * 0.24, Math.abs(ball.vy));
        if (nearLeftWall) {
            ball.vx = Math.max(canvas.width * 0.16, Math.abs(ball.vx));
        } else {
            ball.vx = -Math.max(canvas.width * 0.16, Math.abs(ball.vx));
        }
    }

    // Антизажим у босса: если мяч "залип" рядом с боссом, даем подскок.
    if (bossHit && Math.abs(ball.vx) < canvas.width * 0.05 && Math.abs(ball.vy) < canvas.height * 0.09) {
        ball.vy = -Math.max(canvas.height * 0.22, Math.abs(ball.vy) + canvas.height * 0.08);
        if (bossNosok) {
            const bossCx = bossNosok.x + bossNosok.w * 0.5;
            ball.vx += (ball.x < bossCx ? -1 : 1) * canvas.width * 0.1;
        }
    }

    const minBallSpeed = canvas.width * 0.09;
    let ballSpeed = Math.hypot(ball.vx, ball.vy);
    if (ballSpeed < minBallSpeed) {
        if (ballSpeed < 0.0001) {
            ball.vx = (Math.random() < 0.5 ? -1 : 1) * minBallSpeed * 0.75;
            ball.vy = -minBallSpeed * 0.75;
        } else {
            const kMin = minBallSpeed / ballSpeed;
            ball.vx *= kMin;
            ball.vy *= kMin;
        }
    }

    const maxBallSpeed = canvas.width * 0.86;
    ballSpeed = Math.hypot(ball.vx, ball.vy);
    if (ballSpeed > maxBallSpeed) {
        const k = maxBallSpeed / Math.max(0.0001, ballSpeed);
        ball.vx *= k;
        ball.vy *= k;
    }

    // Финальный анти-ролл: после всех коллизий мяч у пола не должен "катиться".
    const nearGround = ball.y + ball.r >= groundY - 1;
    if (nearGround) {
        ball.y = groundY - ball.r;
        const minUp = canvas.height * 0.13;
        if (ball.vy > -minUp) {
            ball.vy = -minUp;
        }
        if (Math.abs(ball.vx) < canvas.width * 0.06) {
            ball.vx = (ball.vx >= 0 ? 1 : -1) * canvas.width * 0.06;
        }
    }

    if (nosokGoalSensor) {
        const crossed = (ball.lastX + ball.r < nosokGoalSensor.x) && (ball.x + ball.r >= nosokGoalSensor.x);
        const withinY = (ball.y > nosokGoalSensor.y + ball.r * 0.2) && (ball.y < nosokGoalSensor.y + nosokGoalSensor.h - ball.r * 0.2);
        if (crossed && withinY && nosokGoalPauseTimer <= 0 && !nosokGoalRespawnPending && nosokGoals < nosokTargetGoals && !levelCompleteShown) {
            // Блокировка автогола после клиренса головой у ворот.
            if ((ball.noOwnGoalTimer || 0) > 0 || bossForcedClearance) {
                ball.x = nosokGoalSensor.x + nosokGoalSensor.w + ball.r * 0.8;
                if (nosokCrossbar) {
                    ball.y = Math.min(ball.y, nosokCrossbar.y - ball.r - 1);
                }
                ball.vx = Math.max(Math.abs(ball.vx), canvas.width * 0.12);
                ball.vy = -Math.max(Math.abs(ball.vy), canvas.height * 0.10);
                ball.noOwnGoalTimer = Math.max(ball.noOwnGoalTimer || 0, 0.15);
                return;
            }
            nosokGoals = Math.min(nosokTargetGoals, nosokGoals + 1);
            nosokGoalFlashTimer = 0.9;
            nosokGoalConfettiTimer = 2.0;
            spawnNosokGoalConfetti(44);
            if (window.BHAudio) {
                window.BHAudio.play('goal_horn', { volumeMul: 0.98, duck: 0.7 });
                window.BHAudio.play('goal_applause', { volumeMul: 0.9 });
            }

            // После гола мяч не "замораживается": продолжает двигаться до респавна.
            ball.x = nosokGoalSensor.x + nosokGoalSensor.w + ball.r * 1.05;
            ball.vx = Math.max(Math.abs(ball.vx), canvas.width * 0.14);
            ball.vy = -Math.max(Math.abs(ball.vy), canvas.height * 0.09);
            ball.spin += nosokRand(1.8, 3.6);

            if (nosokGoals >= nosokTargetGoals && !levelCompleteShown) {
                // Финал матча: останавливаем таймер и превращаем босса в "говно" в рендере.
                nosokFinalTimeMs = Math.max(1, Math.round(nosokElapsedTime * 1000));
                nosokGoalPauseTimer = 0;
                nosokGoalRespawnPending = false;
                enemyBullets = enemyBullets.filter(b => !(b.nosokSock || b.nosokFish));
                levelCompleteShown = true;
                bossDefeated = true;
                showLevelComplete();
            } else {
                nosokGoalPauseTimer = 1.0;
                nosokGoalRespawnPending = true;
            }
        }
    }
}

/**
 * Обновляет пули игрока для режима "Носок":
 * пули взаимодействуют с мячом и могут уничтожать пули босса-носка.
 * @param {number} dt - время кадра.
 */
function updateNosokPlayerBullets(dt) {
    const perf = window.BHBulletPerf;
    const rotationEnabled = perf ? perf.bulletRotationEnabled() : true;
    bullets.forEach(b => {
        b.prevX = b.x;
        b.prevY = b.y;
        if (typeof b.vx === 'number' && typeof b.vy === 'number') {
            b.x += b.vx;
            b.y += b.vy;
        } else {
            b.y -= b.speed;
        }
        if (rotationEnabled && b.playerType === 'dron' && typeof b.rotation === 'number') {
            b.rotation += 0.3;
        }
        if (b.playerType === 'max') {
            if (b.isBonus && rotationEnabled && typeof b.rotation === 'number') {
                b.rotation += 0.3;
            } else if (!b.isBonus) {
                b.swayAge = (b.swayAge || 0) + 0.15;
            }
        }
    });

    // Пули игрока могут сбивать все пули босса-носка (обычный носок и тухлая рыба).
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        const bFromX = (typeof b.prevX === 'number') ? b.prevX : b.x;
        const bFromY = (typeof b.prevY === 'number') ? b.prevY : b.y;
        const bulletBaseR = Math.max(8, (b.hitRadius || (b.r * 2) || 10) * 0.58);
        let exploded = false;
        for (let ei = enemyBullets.length - 1; ei >= 0; ei--) {
            const eb = enemyBullets[ei];
            if (!eb || (!eb.nosokSock && !eb.nosokFish)) continue;
            const ew = eb.w || 28;
            const eh = eb.h || 28;
            const ex = eb.x + ew * 0.5;
            const ey = eb.y + eh * 0.5;
            const enemyR = Math.max(8, Math.max(ew, eh) * 0.36);
            const hit = segmentCircleHit(
                bFromX,
                bFromY,
                b.x,
                b.y,
                ex,
                ey,
                bulletBaseR + enemyR
            );
            if (!hit.hit) continue;

            explosions.push({ x: ex, y: ey, timer: 0, scale: eb.nosokFish ? 0.9 : 0.72 });
            enemyBullets.splice(ei, 1);
            bullets.splice(bi, 1);
            score += 1;
            if (window.BHAudio) {
                window.BHAudio.play('explosion_small', { volumeMul: 0.82 });
            }
            exploded = true;
            break;
        }
        if (exploded) continue;
    }

    if (nosokBall) {
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            const b = bullets[bi];
            const br = b.hitRadius || (b.r * 2);
            const hitR = nosokBall.r + Math.max(10, br * 0.84);
            const hit = segmentCircleHit(
                (typeof b.prevX === 'number') ? b.prevX : b.x,
                (typeof b.prevY === 'number') ? b.prevY : b.y,
                b.x,
                b.y,
                nosokBall.x,
                nosokBall.y,
                hitR
            );
            if (hit.hit) {
                applyBulletImpulseToNosokBall(b, hit.nx, hit.ny);
                explosions.push({ x: b.x, y: b.y, timer: 0, scale: 0.55 });
                bullets.splice(bi, 1);
                score += 1;
                if (window.BHAudio) {
                    window.BHAudio.play('hit_enemy', { volumeMul: 0.8 });
                }
            }
        }
    }

    bullets = bullets.filter(b => b.x >= -140 && b.x <= canvas.width + 140 && b.y >= -140 && b.y <= canvas.height + 140);
}

/**
 * Обновляет вражеские снаряды босса-носка.
 * @param {number} dt - время кадра.
 */
function updateNosokEnemyBullets(dt) {
    if (!enemyBullets || enemyBullets.length === 0) return;

    for (let i = 0; i < enemyBullets.length; i++) {
        const eb = enemyBullets[i];
        const isNosokSock = !!eb.nosokSock;
        const isNosokFish = !!eb.nosokFish;
        if (!isNosokSock && !isNosokFish) continue;
        eb.age = (eb.age || 0) + dt;
        const bw = eb.w || 28;
        const bh = eb.h || 28;
        const centerX = eb.x + bw * 0.5;
        const centerY = eb.y + bh * 0.5;
        const tx = player.x + player.w * 0.5;
        const ty = player.y + player.h * 0.44;
        const dx = tx - centerX;
        const dy = ty - centerY;
        const d = Math.max(1, Math.hypot(dx, dy));
        const nx = dx / d;
        const ny = dy / d;

        const homingScale = (eb.age < 0.35) ? (isNosokFish ? 0.72 : 0.55) : 1.0;
        const homingPower = isNosokFish ? canvas.width * 0.074 : canvas.width * 0.055;
        eb.vx += nx * (eb.homing || 0.35) * homingScale * dt * homingPower;
        eb.vy += (eb.gravity || canvas.height * 0.95) * dt;
        if (eb.curveAmp) {
            const curveWave = Math.sin((eb.age || 0) * (eb.curveFreq || 5.2) + (eb.curvePhase || 0));
            eb.vx += curveWave * eb.curveAmp * dt;
        }
        const minForward = canvas.width * (isNosokFish ? 0.24 : 0.16);
        if (Math.abs(eb.vx) < minForward) {
            eb.vx += Math.sign(nx || eb.vx || 1) * canvas.width * (isNosokFish ? 0.04 : 0.022) * dt;
        }
        eb.x += eb.vx * dt;
        eb.y += eb.vy * dt;
        eb.rotation = (typeof eb.rotation === 'number' ? eb.rotation : 0) + (eb.rotationSpeed || 0) * dt;

        eb.fumeTimer = (eb.fumeTimer || 0) + dt;
        if (!Array.isArray(eb.fumePuffs)) eb.fumePuffs = [];
        if (eb.fumeTimer >= (isNosokFish ? 0.045 : 0.055)) {
            eb.fumeTimer = 0;
            eb.fumePuffs.push({
                x: eb.x + bw * 0.5,
                y: eb.y + bh * 0.5,
                r: isNosokFish ? nosokRand(10, 18) : nosokRand(9, 16),
                life: isNosokFish ? nosokRand(0.45, 0.8) : nosokRand(0.4, 0.72),
                timer: 0,
                alpha: isNosokFish ? nosokRand(0.76, 0.96) : nosokRand(0.72, 0.94),
                vx: isNosokFish ? nosokRand(-22, 22) : nosokRand(-18, 18),
                vy: isNosokFish ? nosokRand(-58, -18) : nosokRand(-52, -18),
                colorCore: isNosokFish
                    ? ((Math.random() < 0.5) ? 'rgba(62,56,34,1)' : 'rgba(54,62,32,1)')
                    : ((Math.random() < 0.5) ? 'rgba(66,63,44,0.98)' : 'rgba(52,57,34,0.98)'),
                colorMid: isNosokFish
                    ? ((Math.random() < 0.5) ? 'rgba(109,132,58,0.7)' : 'rgba(95,88,52,0.68)')
                    : ((Math.random() < 0.5) ? 'rgba(92,109,49,0.62)' : 'rgba(84,78,48,0.6)'),
                colorEdge: isNosokFish
                    ? ((Math.random() < 0.5) ? 'rgba(20,24,14,0)' : 'rgba(16,18,12,0)')
                    : ((Math.random() < 0.5) ? 'rgba(24,28,18,0)' : 'rgba(19,22,14,0)')
            });
        }
        eb.fumePuffs = eb.fumePuffs.filter(p => {
            p.timer += dt;
            p.r += dt * (isNosokFish ? 31 : 27);
            p.x += (p.vx || 0) * dt;
            p.y += (p.vy || -18) * dt;
            return p.timer < p.life;
        });

        if (nosokBall) {
            const cx = eb.x + (eb.w || 28) * 0.5;
            const cy = eb.y + (eb.h || 28) * 0.5;
            const bd = Math.hypot(nosokBall.x - cx, nosokBall.y - cy);
            if (bd <= nosokBall.r + Math.max(14, (eb.w || 28) * 0.45)) {
                const damp = isNosokFish ? 0.9 : 0.93;
                nosokBall.vx *= damp;
                nosokBall.vy *= damp;
            }
        }

        if (invuln <= 0) {
            const cx = eb.x + (eb.w || 28) * 0.5;
            const cy = eb.y + (eb.h || 28) * 0.5;
            const contact = getCircleSpriteContact({ x: cx, y: cy, r: Math.max(8, (eb.w || 28) * 0.32) }, player);
            if (contact.hit) {
                enemyBullets.splice(i, 1);
                i--;
                applyNosokPlayerDamage();
                continue;
            }
        }
    }

    enemyBullets = enemyBullets.filter(b => {
        if (!b.nosokSock && !b.nosokFish) return true;
        const w = b.w || 28;
        const h = b.h || 28;
        const pad = b.nosokFish ? 360 : 220;
        return (b.x + w > -pad && b.x < canvas.width + pad && b.y + h > -pad && b.y < canvas.height + pad);
    });
}

/**
 * Не дает игроку и боссу пересекать друг друга в режиме "Носок".
 */
function resolveNosokPlayerBossOverlap() {
    if (!bossNosok) return;
    const ax1 = player.x;
    const ay1 = player.y;
    const ax2 = player.x + player.w;
    const ay2 = player.y + player.h;
    const bx1 = bossNosok.x;
    const by1 = bossNosok.y;
    const bx2 = bossNosok.x + bossNosok.w;
    const by2 = bossNosok.y + bossNosok.h;

    const overlapX = Math.min(ax2, bx2) - Math.max(ax1, bx1);
    const overlapY = Math.min(ay2, by2) - Math.max(ay1, by1);
    if (overlapX <= 0 || overlapY <= 0) return;

    const probeX = (Math.max(ax1, bx1) + Math.min(ax2, bx2)) * 0.5;
    const probeY = (Math.max(ay1, by1) + Math.min(ay2, by2)) * 0.5;
    const playerOpaque = (typeof player.isOpaqueAtWorld === 'function') ? player.isOpaqueAtWorld(probeX, probeY) : true;
    const bossOpaque = (typeof bossNosok.isOpaqueAtWorld === 'function') ? bossNosok.isOpaqueAtWorld(probeX, probeY) : true;
    if (!(playerOpaque && bossOpaque)) return;

    const playerCenter = player.x + player.w * 0.5;
    const bossCenter = bossNosok.x + bossNosok.w * 0.5;
    if (playerCenter < bossCenter) {
        player.x -= overlapX + 1;
    } else {
        player.x += overlapX + 1;
    }
    player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
}

/**
 * Обновляет бонусы и их подбор в режиме "Носок".
 * @param {number} dt - время кадра.
 */
function updateNosokDrops(dt) {
    bottles.forEach(b => {
        b.y += 2;
        b.x += Math.sin((b.y + (b.waveSeed || 0)) / 20) * 1.5;
    });
    hearts.forEach(h => {
        h.y += 2;
        h.x += Math.sin((h.y + (h.waveSeed || 0)) / 20) * 1.5;
    });
    nosokSpecialBonuses.forEach(p => {
        p.y += p.vy;
        p.x += Math.sin((p.y + p.driftSeed) / 22) * 1.3;
    });

    bottles = bottles.filter(b => b.y < canvas.height + 40);
    hearts = hearts.filter(h => h.y < canvas.height + 40);
    nosokSpecialBonuses = nosokSpecialBonuses.filter(p => p.y < canvas.height + 60);

    for (let i = bottles.length - 1; i >= 0; i--) {
        if (rect(bottles[i], player)) {
            bonusShots += BONUS_SHOTS_PER_BOTTLE;
            bottles.splice(i, 1);
            if (window.BHAudio) {
                window.BHAudio.play('pickup_beer', { volumeMul: 0.95 });
            }
        }
    }
    for (let i = hearts.length - 1; i >= 0; i--) {
        if (rect(hearts[i], player)) {
            if (lives < PLAYER_LIVES) lives++;
            else bonusShots += 5;
            hearts.splice(i, 1);
            if (window.BHAudio) {
                window.BHAudio.play('pickup_heart', { volumeMul: 0.95 });
            }
        }
    }
    for (let i = nosokSpecialBonuses.length - 1; i >= 0; i--) {
        const p = nosokSpecialBonuses[i];
        if (!rect(p, player)) continue;
        if (p.type === 'ice' && bossNosok) {
            bossNosok.freeze(5);
            if (window.BHAudio) {
                window.BHAudio.play('pickup_ice', { volumeMul: 0.95 });
            }
            speechBalloons.push({
                x: bossNosok.x + bossNosok.w * 0.5,
                y: bossNosok.y - bossNosok.h * 0.12,
                timer: 0,
                duration: 1.1,
                text: 'Бррр!',
                type: 'buk',
                scale: 0.6
            });
        } else if (p.type === 'dynamite' && bossNosok) {
            bossNosok.applyDynamiteBlast();
            if (window.BHAudio) {
                window.BHAudio.play('pickup_dynamite', { volumeMul: 0.95, duck: 0.78 });
            }
        }
        nosokSpecialBonuses.splice(i, 1);
    }
}

/**
 * Обновляет и очищает визуальные эффекты.
 * @param {number} dt - время кадра.
 */
function updateNosokEffects(dt) {
    speechBalloons = speechBalloons.filter(sb => {
        sb.timer += dt;
        const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
        return sb.timer < dur;
    });
    explosions = explosions.filter(ex => {
        ex.timer += dt;
        const dur = (typeof ex.duration === 'number') ? ex.duration : 0.5;
        return ex.timer < dur;
    });
    nosokGoalFlashTimer = Math.max(0, nosokGoalFlashTimer - dt);

    if (nosokGoalConfettiTimer > 0) {
        nosokGoalConfettiTimer = Math.max(0, nosokGoalConfettiTimer - dt);
        const spawnCount = Math.floor(dt * 95) + ((Math.random() < 0.45) ? 1 : 0);
        if (spawnCount > 0) spawnNosokGoalConfetti(spawnCount);
    }
    nosokGoalConfetti = nosokGoalConfetti.filter(c => {
        c.timer += dt;
        c.vy += c.g * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.vrot * dt;
        return c.timer < c.life && c.y < canvas.height + 36;
    });
}

/**
 * Обновляет HUD режима "Носок".
 */
function updateNosokHud() {
    if (!hudEl) hudEl = document.getElementById('hud');
    if (!hudEl) return;

    const dirIcon = playerBulletDir === 'up' ? '↑' : (playerBulletDir === 'left' ? '←' : '→');
    const playerName = charNames[selectedChar] || selectedChar;
    const modeIndicator = altShootMode ? '<span style="color:orange">🔫ALT</span>' : '';
    if (lives !== lastHudLives) {
        cachedLivesStr = "❤️".repeat(lives);
        lastHudLives = lives;
    }
    const timerStr = formatNosokTime(Math.round(nosokElapsedTime * 1000));
    const bonusClass = (bonusMode && bonusShots > 0) ? 'hud-bonus active' : 'hud-bonus';
    const bonusHtml = `<span class="${bonusClass}"><span>Бонус:</span><span class="hud-bonus-value">${Math.max(0, bonusShots)}</span></span>`;
    let hudHtml = '';
    const shownGoals = Math.min(nosokTargetGoals, nosokGoals);
    hudHtml = `${playerName} | Жизни: ${cachedLivesStr}<br>Голы: ${shownGoals}/${nosokTargetGoals}   Время: ${timerStr}   ${bonusHtml}   Пули: ${dirIcon} ${modeIndicator}`;
    if (hudHtml !== lastHudHtml) {
        hudEl.innerHTML = hudHtml;
        lastHudHtml = hudHtml;
    }
}

/**
 * Полное обновление режима "Носок".
 * @param {number} dt - время кадра.
 */
function updateNosokMode(dt) {
    if (!nosokBall || !bossNosok || !nosokGoalSensor || !nosokCrossbar) {
        initNosokLevel();
    }

    if (invuln > 0) invuln -= dt;
    if (nosokGoals < nosokTargetGoals) {
        nosokElapsedTime += dt;
    }

    player.update(dt);
    if (bossNosok && nosokGoals < nosokTargetGoals) {
        bossNosok.update(dt, nosokBall);
    }

    updateNosokDropTimers(dt);
    updateNosokPlayerBullets(dt);
    updateNosokEnemyBullets(dt);
    updateNosokBall(dt);
    updateNosokDrops(dt);
    resolveNosokPlayerBossOverlap();
    updateNosokEffects(dt);
    updateNosokHud();
}

