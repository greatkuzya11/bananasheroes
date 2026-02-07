// ==== ОТРИСОВКА ИГРЫ ====
/**
 * Отрисовывает текущий кадр игры на canvas.
 */
function draw() {
    // Рисуем адаптивный фон
    if (bgReady) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#a2c9e2"; // Нежно голубой фон
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Рисуем платформы в режиме платформ
    if (gameMode === 'platforms') {
        // Рисуем каждую платформу; p — объект платформы
        platforms.forEach(p => p.draw());
    }

    // Рисуем табличку Букин позади игрока (если есть)
    if (bukinTablet) {
        if (bukinImgReady && bukinImg.width > 0) {
            const curW = bukinTablet.desiredW;
            const curH = curW * (bukinImg.height / bukinImg.width);
            const drawX = bukinTablet.cx - curW / 2;
            const drawY = bukinTablet.cy - curH / 2;
            ctx.save();
            ctx.drawImage(bukinImg, drawX, drawY, curW, curH);
            ctx.restore();
        } else {
            // Пока картинка не загружена — рисуем серый прямоугольник
            const curW = bukinTablet.desiredW;
            const curH = boss ? boss.h / 3 : curW;
            const drawX = bukinTablet.cx - curW / 2;
            const drawY = bukinTablet.cy - curH / 2;
            ctx.save();
            ctx.fillStyle = '#888';
            ctx.fillRect(drawX, drawY, curW, curH);
            ctx.restore();
        }
    }

    // Режим платформ: рисуем рубин и кубок ПЕРЕД игроком (фон)
    if (gameMode === 'platforms' && platformRuby) {
        const rubyImg = platformRuby.stage === 1 ? rubyImg1 : rubyImg2;
        const rubyReady = platformRuby.stage === 1 ? ruby1Ready : ruby2Ready;
        if (rubyReady && rubyImg && rubyImg.complete) {
            ctx.drawImage(rubyImg, platformRuby.x, platformRuby.y, platformRuby.w, platformRuby.h);
        }
    }
    if (gameMode === 'platforms' && platformCup) {
        if (cupImgReady && cupImg && cupImg.complete) {
            ctx.drawImage(cupImg, platformCup.x, platformCup.y, platformCup.w, platformCup.h);
        }
    }
    
    // Визуальная индикация неуязвимости (мигание)
    if (invuln > 0) {
        const blinkSpeed = 16; // 16 миганий в секунду
        if (Math.floor(invuln * blinkSpeed) % 2 === 0) {
            ctx.globalAlpha = 0.3; // Полупрозрачный
        }
    }
    
    player.draw();
    ctx.globalAlpha = 1; // Восстановить прозрачность

    const perf = window.BHBulletPerf;
    const renderMode = perf ? perf.bulletRenderMode() : 'emoji';
    const rotationEnabled = perf ? perf.bulletRotationEnabled() : true;
    const getEmojiBitmap = perf ? perf.getEmojiBitmap : null;
    if (perf && perf.isEnabled()) perf.beforeBulletDraw();
    // Рисуем все пули игрока; b — объект пули
    bullets.forEach(b => {
        if (b.emoji) {
            ctx.save();
            const size = Math.max(16, b.r * 2);
            // Поворачиваем по направлению полета пули
            let angle = 0;
            if (b.dir === 'up') angle = -Math.PI / 2;
            else if (b.dir === 'left') angle = Math.PI;
            else angle = 0; // направление вправо
            
            ctx.translate(b.x, b.y);
            ctx.rotate(angle);
            
            // Дополнительное вращение для пули Дрона/Макса
            if (rotationEnabled && b.playerType === 'dron' && typeof b.rotation === 'number') {
                ctx.rotate(b.rotation);
            }
            if (rotationEnabled && b.playerType === 'max' && typeof b.rotation === 'number') {
                ctx.rotate(b.rotation);
            }
            
            const bulletBitmap = getEmojiBitmap ? getEmojiBitmap(b.emoji) : null;
            if (renderMode === 'png' && bulletBitmap) {
                ctx.drawImage(bulletBitmap, -size / 2, -size / 2, size, size);
            } else {
                ctx.font = `${size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(b.emoji, 0, 0);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    if (perf && perf.isEnabled()) perf.afterBulletDraw();

    // Отрисовываем пули врагов с их индивидуальным эмодзи-листиком
    // Рисуем пули врагов; b — объект пули врага
    enemyBullets.forEach(b => {
        const emoji = b.emoji || "🍃";
        const size = (b.h || 12) * 2.4;
        const bulletImg = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && bulletImg) {
            ctx.drawImage(bulletImg, b.x, b.y, size, size);
        } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(emoji, b.x, b.y);
        }
    });

    // Рисуем бонусные бутылки; b — объект бутылки
    bottles.forEach(b => {
        const emoji = "🍺";
        const size = b.h || 36;
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, b.x, b.y, size, size);
        } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(emoji, b.x, b.y);
        }
    });

    // Рисуем сердечки; h — объект сердечка
    hearts.forEach(h => {
        const emoji = "❤️";
        const size = h.h || 30;
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, h.x, h.y, size, size);
        } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(emoji, h.x, h.y);
        }
    });

    // Рисуем врагов сирень; e — объект врага
    enemies.forEach(e => {
        drawLilacCached(e);
    });

    // Отрисовываем врага 67
    if (enemy67) {
        enemy67.draw();
    }

    // Рисуем босса-сосиску
    if (boss) {
        ctx.save();
        const bossEmoji = "🌭";
        ctx.globalAlpha = 1;
        ctx.font = `${boss.h}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(bossEmoji, boss.x + boss.w / 2, boss.y + boss.h / 2);
        // Полоса HP
        ctx.fillStyle = "#fff";
        ctx.fillRect(boss.x, boss.y - 18, boss.w, 12);
        ctx.fillStyle = "#e53935";
        ctx.fillRect(boss.x, boss.y - 18, boss.w * (boss.hp / 11), 12);
        ctx.strokeStyle = "#222";
        ctx.strokeRect(boss.x, boss.y - 18, boss.w, 12);
        ctx.restore();
    }

    // Рисуем взрывы
    // Рисуем взрывы; ex — объект взрыва
    explosions.forEach(ex => {
        ctx.save();
        const scale = ex.scale || 1;
        // Если указан размер, используем его, иначе стандартный
        const baseSize = ex.size || 60;
        const size = (baseSize + ex.timer * baseSize) * scale;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 1 - ex.timer * 2;
        const emoji = "💥";
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, ex.x - size / 2, ex.y - size / 2, size, size);
        } else {
            ctx.font = `${size}px serif`;
            ctx.fillText(emoji, ex.x, ex.y);
        }
        ctx.restore();
    });

    // Рисуем облачки с текстом
    // Рисуем облачки с текстом; sb — объект облачка
    speechBalloons.forEach(sb => {
        ctx.save();
        const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
        ctx.globalAlpha = Math.max(0, 1 - sb.timer / dur);
        const text = (typeof sb.text === 'string') ? sb.text : 'Сука';

        if (sb.type === 'buk') {
            // Адаптивный прямоугольный пузырь с хвостиком (другой стиль)
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

            // Скругленный прямоугольник
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

            // Хвостик направлен вниз к игроку
            const tailW = Math.min(28, boxW * 0.28);
            const tailX = sb.x; // центрируем хвостик по sb.x
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

            // Текст
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
            ctx.fillText(text, sb.x, sb.y - 2);

        } else {
            // Исходный овальный стиль "Сука", но используем sb.text при наличии
            // Размеры фиксированы для этого стиля
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
            // Текст
            ctx.font = 'bold 32px Comic Sans MS, Arial';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, sb.x, sb.y);
        }

        ctx.restore();
    });

    // (рубин и кубок теперь рисуются перед игроком)
    
    if (perf && perf.isEnabled()) perf.drawOverlay(ctx, bullets.length);
}



