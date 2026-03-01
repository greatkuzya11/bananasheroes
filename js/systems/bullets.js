// ==== ЛОГИКА ПУЛЬ ====
/**
 * Создает пулю игрока с учетом выбранного персонажа и режима стрельбы.
 * @param {Player} p - объект игрока, который стреляет.
 */
function shootPlayerBullet(p) {
    let r = 8, speed = 8, color = "#222";
    p.shooting = true;
    p.shootTimer = 0;
    p.frame = SHOOT_FRAME;

    let emoji;
    switch (p.type) {
        case "dron":
            r = 14; speed = 9; color = "#66ccff";
            emoji = '🌀';
            break;
        case "max":
            r = 10; speed = 11; color = "#222";
            emoji = '💩';
            break;
        case "kuzy":
            r = 18; speed = 6; color = "#333";
            emoji = '💦';
            break;
    }

    let isBonus = false;
    if (bonusMode && bonusShots > 0) {
        r *= 1.8;
        speed *= 1.8;
        color = "gold";
        bonusShots--;
        isBonus = true;
        // Если это был последний бонусный выстрел, автоматически возвращаемся к основному оружию
        if (bonusShots <= 0) {
            bonusShots = 0;
            bonusMode = false;
        }
    }
    // Точные радиусы пуль Макса: не бонусная 10, бонусная 12
    if (p.type === 'max') r = isBonus ? 12 : 10;
    if (window.BHAudio && typeof window.BHAudio.playPlayerShoot === 'function') {
        window.BHAudio.playPlayerShoot(p.type, isBonus);
    }

    // Определяем стартовую позицию и скорость по направлению стрельбы
    let bx = p.x + p.w / 2;
    let by = p.y;
    let vx = 0, vy = 0;
    if (playerBulletDir === 'up') {
        bx = p.x + p.w / 2;
        by = p.y;
        vx = 0; vy = -speed;
    } else if (playerBulletDir === 'left') {
        bx = p.x; by = p.y + p.h / 2; vx = -speed; vy = 0;
    } else { // направление 'right'
        bx = p.x + p.w; by = p.y + p.h / 2; vx = speed; vy = 0;
    }

    // Бонусный выстрел Макса выпускает 3 пули с разными углами
    if (isBonus && p.type === 'max') {
        const angleSpread = 15 * Math.PI / 180; // 15 градусов в радианах
        const angles = [-angleSpread, 0, angleSpread]; // -15°, 0°, +15°
        
        // Для каждого угла рассчитываем отдельную пулю; angle — угол отклонения
        angles.forEach(angle => {
            let vx_angled, vy_angled;
            if (playerBulletDir === 'up') {
                // Для направления вверх: применяем угол относительно вертикали
                vx_angled = speed * Math.sin(angle);
                vy_angled = -speed * Math.cos(angle);
            } else if (playerBulletDir === 'left') {
                // Для направления влево: применяем угол относительно горизонтали
                vx_angled = -speed * Math.cos(angle);
                vy_angled = -speed * Math.sin(angle);
            } else { // направление 'right'
                // Для направления вправо: применяем угол относительно горизонтали
                vx_angled = speed * Math.cos(angle);
                vy_angled = speed * Math.sin(angle);
            }
            bullets.push({ x: bx, y: by, r, speed, color, vx: vx_angled, vy: vy_angled, emoji, dir: playerBulletDir, isBonus, rotation: 0, playerType: p.type, hitRadius: r * 2 });
        });
    } else {
        const bulletImg = (p.type === 'max' && !isBonus) ? maxBulletImg : undefined;
        bullets.push({ x: bx, y: by, r, speed, color, vx, vy, emoji, dir: playerBulletDir, isBonus, rotation: 0, swayAge: 0, playerType: p.type, hitRadius: r * 2, img: bulletImg });
    }
}


