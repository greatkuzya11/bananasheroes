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

    const perf = window.BHBulletPerf;
    const renderMode = perf ? perf.bulletRenderMode() : 'emoji';
    const rotationEnabled = perf ? perf.bulletRotationEnabled() : true;
    const getEmojiBitmap = perf ? perf.getEmojiBitmap : null;

    // Финальные бутылки победы в уровне "Очко":
    // рисуем в фоновом слое, чтобы не перекрывать игрока и его пули.
    o4koVictoryBeers.forEach(b => {
        if (b.img && b.img.complete) {
            ctx.drawImage(b.img, b.x, b.y, b.w, b.h);
            return;
        }
        // Фолбек, если картинка не загрузилась.
        const emoji = "🍺";
        const size = b.h || 72;
        const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, b.x, b.y, b.w || size, b.h || size);
        } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(emoji, b.x, b.y);
        }
    });
    
    // Визуальная индикация неуязвимости (мигание)
    if (invuln > 0) {
        const blinkSpeed = 16; // 16 миганий в секунду
        if (Math.floor(invuln * blinkSpeed) % 2 === 0) {
            ctx.globalAlpha = 0.3; // Полупрозрачный
        }
    }
    
    player.draw();
    ctx.globalAlpha = 1; // Восстановить прозрачность

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
        const isO4koPoop = !!b.o4koPoop;
        const w = b.w || 24;
        const h = b.h || 24;
        const cx = b.x + w / 2;
        const cy = b.y + h / 2;
        const angle = (typeof b.rotation === 'number') ? b.rotation : 0;

        if (b.img && b.img.complete) {
            if (isO4koPoop && typeof b.rotation === 'number') {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle);
                ctx.drawImage(b.img, -w / 2, -h / 2, w, h);
                ctx.restore();
            } else {
                ctx.drawImage(b.img, b.x, b.y, w, h);
            }
            return;
        }
        const emoji = b.emoji || "🍃";
        const size = isO4koPoop ? Math.max(w, h) : (b.h || 12) * 2.4;
        const bulletImg = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && bulletImg) {
            if (isO4koPoop && typeof b.rotation === 'number') {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle);
                ctx.drawImage(bulletImg, -size / 2, -size / 2, size, size);
                ctx.restore();
            } else {
                ctx.drawImage(bulletImg, b.x, b.y, size, size);
            }
        } else {
            if (isO4koPoop && typeof b.rotation === 'number') {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle);
                ctx.font = `${size}px serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(emoji, 0, 0);
                ctx.restore();
            } else {
                ctx.font = `${size}px serif`;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.fillText(emoji, b.x, b.y);
            }
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

    // Рисуем редкие бананы (только режим "Очко")
    bananaBonuses.forEach(b => {
        const size = b.h || 40;
        if (bananaBonusReady && bananaBonusImg.complete) {
            ctx.drawImage(bananaBonusImg, b.x, b.y, size, size);
        } else {
            const img = getEmojiBitmap ? getEmojiBitmap("🍌") : null;
            if (renderMode === 'png' && img) {
                ctx.drawImage(img, b.x, b.y, size, size);
            } else {
                ctx.font = `${size}px serif`;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.fillText("🍌", b.x, b.y);
            }
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
    // Отрисовываем босса режима "Очко"
    if (bossO4ko) {
        bossO4ko.draw();
        // Красная полоса HP босса "Очко"
        const hpRatio = Math.max(0, Math.min(1, bossO4ko.hp / Math.max(1, bossO4ko.maxHp)));
        const barW = Math.max(220, canvas.width * 0.34);
        const barH = 16;
        const barX = (canvas.width - barW) * 0.5;
        const barY = 16;

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`Очко HP: ${bossO4ko.hp}/${bossO4ko.maxHp}`, barX + barW / 2, barY - 2);
        ctx.restore();
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

        const dur = (typeof ex.duration === 'number') ? ex.duration : 0.5;
        const t = Math.min(1, ex.timer / Math.max(0.0001, dur));
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = Math.max(0, 1 - t);

        if (ex.style === 'brown') {
            // Коричневый взрыв для смерти босса "Очко".
            const r = size * 0.5;
            const g = ctx.createRadialGradient(ex.x, ex.y, r * 0.12, ex.x, ex.y, r);
            g.addColorStop(0, 'rgba(255, 214, 153, 0.95)');
            g.addColorStop(0.35, 'rgba(164, 93, 45, 0.85)');
            g.addColorStop(1, 'rgba(67, 37, 18, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(110, 60, 28, ${Math.max(0, 0.85 - t)})`;
            ctx.lineWidth = Math.max(2, r * 0.08);
            ctx.beginPath();
            ctx.arc(ex.x, ex.y, Math.max(6, r * (0.55 + 0.35 * t)), 0, Math.PI * 2);
            ctx.stroke();
        } else {
            const emoji = "💥";
            const img = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
            if (renderMode === 'png' && img) {
                ctx.drawImage(img, ex.x - size / 2, ex.y - size / 2, size, size);
            } else {
                ctx.font = `${size}px serif`;
                ctx.fillText(emoji, ex.x, ex.y);
            }
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



