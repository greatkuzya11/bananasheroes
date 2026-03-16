// ==== ОТРИСОВКА ИГРЫ ====
/**
 * Отрисовывает текущий кадр игры на canvas.
 */
/**
 * Returns speech bubble UI scale for mobile landscape mode.
 * Desktop keeps scale=1 (no visual change).
 * @param {string} mode - current game mode.
 * @returns {number}
 */
function getSpeechUiScale(mode) {
    const isMobileMode = (typeof isMobileAdaptiveCombatMode === 'function')
        && isMobileAdaptiveCombatMode(mode);
    if (!isMobileMode) return 1;
    const rawScale = (typeof getMobileLandscapeAdaptiveScale === 'function')
        ? getMobileLandscapeAdaptiveScale(mode)
        : 1;
    return Math.max(0.72, Math.min(1.00, rawScale * 1.25));
}

/**
 * Shared speech bubble renderer for character/player lines.
 * @param {{x:number,y:number,timer:number,duration?:number,text?:string,type?:string,scale?:number}} sb
 * @param {string} mode
 */
function drawSpeechBalloonAdaptive(sb, mode) {
    ctx.save();
    const dur = (typeof sb.duration === 'number') ? sb.duration : SPEECH_BALLOON_DURATION;
    ctx.globalAlpha = Math.max(0, 1 - sb.timer / dur);
    const text = (typeof sb.text === 'string') ? sb.text : 'Сука';

    const uiScale = getSpeechUiScale(mode);
    const baseScale = uiScale * (sb.scale || 1);

    if (sb.type === 'buk') {
        let fontSize = Math.max(14, 36 * baseScale);
        ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
        const maxWidth = canvas.width * (uiScale < 1 ? 0.60 : 0.50);
        let textWidth = ctx.measureText(text).width;
        while (textWidth > maxWidth && fontSize > 10) {
            fontSize -= Math.max(1, 2 * uiScale);
            ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
            textWidth = ctx.measureText(text).width;
        }

        const paddingX = Math.max(8, 18 * baseScale);
        const paddingY = Math.max(6, 10 * baseScale);
        const boxW = Math.ceil(textWidth + paddingX * 2);
        const boxH = Math.ceil(fontSize + paddingY * 2);
        const left = sb.x - boxW / 2;
        const top = sb.y - boxH / 2;
        const r = Math.min(14 * baseScale, boxH / 2);

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

        const tailW = Math.min(28 * baseScale, boxW * 0.28);
        const tailX = sb.x;
        const tailY = top + boxH;
        ctx.moveTo(tailX - tailW / 2, tailY);
        ctx.lineTo(tailX, tailY + Math.max(8, 18 * baseScale));
        ctx.lineTo(tailX + tailW / 2, tailY);

        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = Math.max(2, 3 * uiScale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#222';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize}px Comic Sans MS, Arial`;
        ctx.fillText(text, sb.x, sb.y - Math.max(1, 2 * uiScale));
    } else {
        const rx = Math.max(42, 70 * baseScale);
        const ry = Math.max(24, 40 * baseScale);
        const tailRx = Math.max(10, 18 * baseScale);
        const tailRy = Math.max(7, 12 * baseScale);
        const tailDx = Math.max(20, 40 * baseScale);
        const tailDy = Math.max(6, 10 * baseScale);

        ctx.beginPath();
        ctx.ellipse(sb.x, sb.y, rx, ry, Math.PI * 0.05, 0, Math.PI * 2);
        ctx.moveTo(sb.x + tailDx, sb.y + tailDy);
        ctx.ellipse(sb.x + tailDx, sb.y + tailDy, tailRx, tailRy, Math.PI * 0.1, 0, Math.PI * 2);
        ctx.moveTo(sb.x - tailDx, sb.y + tailDy);
        ctx.ellipse(sb.x - tailDx, sb.y + tailDy, tailRx, tailRy, Math.PI * 0.1, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = Math.max(2, 3 * uiScale);
        ctx.fill();
        ctx.stroke();

        ctx.font = `bold ${Math.max(16, Math.round(32 * baseScale))}px Comic Sans MS, Arial`;
        ctx.fillStyle = '#222';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, sb.x, sb.y);
    }

    ctx.restore();
}

window.drawSpeechBalloonAdaptive = drawSpeechBalloonAdaptive;
function draw() {
    // Отдельная отрисовка уровней "Ловлю"/"Поймал".
    if (gameMode === 'lovlyu' || gameMode === 'poimal') {
        drawLovlyuMode();
        return;
    }

    // Отдельная отрисовка уровня "Бегун".
    if (gameMode === 'runner') {
        drawRunnerMode();
        return;
    }

    // Отдельная отрисовка бонусного финального уровня.
    if (gameMode === 'bonus') {
        drawBonusMode();
        return;
    }

    // Отдельная отрисовка обучающего уровня.
    if (gameMode === 'tutorial') {
        drawTutorialMode();
        return;
    }

    // Рисуем адаптивный фон
    if (bgReady) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#a2c9e2"; // Нежно голубой фон
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Ворота "нАсок": сетка, штанги, перекладина рисуются позже (после игрока и мяча)

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

    /**
     * Рисует стилизованную полосу HP босса с заметной подписью.
     * @param {string} label Подпись босса над полосой.
     * @param {number} hp Текущее здоровье босса.
     * @param {number} maxHp Максимальное здоровье босса.
     * @param {number} barY Вертикальная позиция полосы.
     */
    function drawStyledBossHpBar(label, hp, maxHp, barY) {
        const safeMaxHp = Math.max(1, Number(maxHp) || 1);
        const safeHp = Math.max(0, Number(hp) || 0);
        const hpRatio = Math.max(0, Math.min(1, safeHp / safeMaxHp));
        const barW = Math.max(220, canvas.width * 0.34);
        const barH = 16;
        const barX = (canvas.width - barW) * 0.5;

        ctx.save();

        // Подпись в стиле активного бонуса HUD: золотой цвет + тень.
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = '900 15px Arial';
        ctx.fillStyle = '#ffd54f';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 4;
        ctx.fillText(label, barX + barW / 2, barY - 8);

        // Полоса HP в стиле босса "Очко".
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Текущее здоровье по центру полосы.
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 2;
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(`${Math.ceil(safeHp)}/${Math.ceil(safeMaxHp)}`, barX + barW / 2, barY + barH / 2);

        ctx.restore();
    }

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

    // Рисуем книги в режиме "Библиотека"
    if (gameMode === 'library') drawLibraryBooks();

    // Визуальный эффект при смене фазы в режиме normal (радиальный всплеск)
    if (gameMode === 'normal' && typeof normalPhaseEffectTimer !== 'undefined' && normalPhaseEffectTimer > 0) {
        const t = Math.max(0, Math.min(1, normalPhaseEffectTimer / 0.6));
        const osc = 0.5 + 0.5 * Math.sin(performance.now() * 0.02);
        const alpha = 0.35 * t * osc; // less bright
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cx = canvas.width * 0.5;
        const cy = canvas.height * 0.35;
        const maxR = Math.max(canvas.width, canvas.height) * 0.6;
        const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
        g.addColorStop(0, `rgba(255,230,180,${alpha})`);
        g.addColorStop(0.5, `rgba(255,200,140,${0.28 * t})`);
        g.addColorStop(1, `rgba(255,200,140,0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    if (perf && perf.isEnabled()) perf.beforeBulletDraw();
    // Рисуем все пули игрока; b — объект пули
    bullets.forEach(b => {
        // Макс не-бонусная пуля: PNG с горизонтальным покачиванием
        if (b.playerType === 'max' && !b.isBonus && b.img && b.img.complete && b.img.naturalWidth) {
            const size = Math.max(16, b.r * 2);
            const swayX = Math.sin((b.swayAge || 0) * 3) * 3;
            ctx.drawImage(b.img, b.x - size / 2 + swayX, b.y - size / 2, size, size);
        } else if (b.emoji) {
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
    }); // end bullets.forEach
    if (perf && perf.isEnabled()) perf.afterBulletDraw();

    // Отрисовываем пули врагов с их индивидуальным эмодзи-листиком
    // Рисуем пули врагов; b — объект пули врага
    enemyBullets.forEach(b => {
        const isO4koPoop = !!b.o4koPoop;
        const isNosokSock = !!b.nosokSock;
        const isNosokFish = !!b.nosokFish;
        const isNosokStink = isNosokSock || isNosokFish;
        const w = b.w || 24;
        const h = b.h || 24;
        const cx = b.x + w / 2;
        const cy = b.y + h / 2;
        const angle = (typeof b.rotation === 'number') ? b.rotation : 0;

        if (isNosokStink && Array.isArray(b.fumePuffs)) {
            b.fumePuffs.forEach(p => {
                const lifeK = 1 - (p.timer / Math.max(0.001, p.life));
                ctx.save();
                ctx.globalAlpha = Math.max(0, lifeK * (p.alpha || 0.82));
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowBlur = 12 * lifeK;
                ctx.shadowColor = 'rgba(36,46,18,0.55)';
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                g.addColorStop(0, p.colorCore || 'rgba(66,63,44,0.98)');
                g.addColorStop(0.56, p.colorMid || 'rgba(92,109,49,0.62)');
                g.addColorStop(1, p.colorEdge || 'rgba(19,22,14,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        if (b.img && b.img.complete) {
            if ((isO4koPoop || isNosokStink) && typeof b.rotation === 'number') {
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
        const emoji = isNosokSock ? "🧦" : (isNosokFish ? "🐟" : (b.emoji || "🍃"));
        const size = (isO4koPoop || isNosokStink) ? Math.max(w, h) : (b.h || 12) * 2.4;
        const bulletImg = getEmojiBitmap ? getEmojiBitmap(emoji) : null;
        if (renderMode === 'png' && bulletImg) {
            if ((isO4koPoop || isNosokStink) && typeof b.rotation === 'number') {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle);
                ctx.drawImage(bulletImg, -size / 2, -size / 2, size, size);
                ctx.restore();
            } else {
                ctx.drawImage(bulletImg, b.x, b.y, size, size);
            }
        } else {
            if ((isO4koPoop || isNosokStink) && typeof b.rotation === 'number') {
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

    // Рисуем спец-бонусы уровня "нАсок": лед и динамит.
    nosokSpecialBonuses.forEach(b => {
        const size = b.h || 44;
        if (b.type === 'ice' && iceCubeImg && iceCubeImg.complete) {
            ctx.drawImage(iceCubeImg, b.x, b.y, size, size);
            return;
        }
        if (b.type === 'dynamite' && dynamiteImg && dynamiteImg.complete) {
            ctx.drawImage(dynamiteImg, b.x, b.y, size, size);
            return;
        }
        const fallback = b.type === 'ice' ? "🧊" : "🧨";
        const img = getEmojiBitmap ? getEmojiBitmap(fallback) : null;
        if (renderMode === 'png' && img) {
            ctx.drawImage(img, b.x, b.y, size, size);
        } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(fallback, b.x, b.y);
        }
    });

    // Рисуем врагов сирень только в режимах, где они предусмотрены сценарием.
    const lilacAllowed = (gameMode === 'normal' || gameMode === 'survival' || gameMode === 'platforms');
    if (lilacAllowed) {
        enemies.forEach(e => {
            drawLilacCached(e);
        });
    }

    // Отрисовываем врага 67
    if (enemy67) {
        enemy67.draw();
        const e67label = (gameMode === 'platforms') ? 'Босс: Телепузик (платформы)' : (gameMode === 'mode67' ? 'Босс: Враг 67' : 'Босс: Телепузик');
        drawStyledBossHpBar(e67label, enemy67.hp, enemy67.maxHp || (gameMode === 'platforms' ? 76 : 67), 24);
    } else if (typeof Enemy67 !== 'undefined' && typeof Enemy67.hideGifOverlay === 'function') {
        Enemy67.hideGifOverlay();
    }
    // Отрисовываем босса режима "Очко"
    if (bossO4ko) {
        bossO4ko.draw();
        drawStyledBossHpBar('Босс: Очко', bossO4ko.hp, bossO4ko.maxHp, 24);
    }

    // Отрисовываем босса уровня "нАсок".
    if (bossNosok) {
        if (gameMode === 'nosok' && nosokGoals >= nosokTargetGoals) {
            const w = Math.max(36, bossNosok.w * 0.88);
            const h = Math.max(30, bossNosok.h * 0.78);
            const x = bossNosok.x + bossNosok.w * 0.5 - w * 0.5;
            const y = bossNosok.y + bossNosok.h * 0.5 - h * 0.45;
            const cx = x + w * 0.5;
            const topY = y + h * 0.18;
            const img = (o4koPoopImgs && o4koPoopImgs[0]) ? o4koPoopImgs[0] : null;
            if (img && img.complete) {
                ctx.save();
                ctx.translate(x + w * 0.5, y + h * 0.5);
                ctx.rotate(Math.sin(performance.now() * 0.004) * 0.08);
                ctx.drawImage(img, -w * 0.5, -h * 0.5, w, h);
                ctx.restore();
            } else {
                ctx.save();
                ctx.font = `${Math.max(36, h)}px serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("💩", x + w * 0.5, y + h * 0.5);
                ctx.restore();
            }

            // Плотная темная вонь вверх от "говна": базовое облако + верхние шлейфы.
            const now = performance.now() * 0.001;

            // Тяжелое облако у основания.
            for (let i = 0; i < 5; i++) {
                const sway = Math.sin(now * (1.7 + i * 0.23) + i * 1.9);
                const bx = cx + sway * (w * 0.08 + i * 1.1);
                const by = topY + h * (0.08 + i * 0.02);
                const br = h * (0.12 + i * 0.028);
                const ba = 0.2 + 0.07 * (1 + sway);

                ctx.save();
                ctx.globalAlpha = Math.min(0.62, ba);
                ctx.shadowBlur = 14;
                ctx.shadowColor = 'rgba(20,24,12,0.7)';
                const gb = ctx.createRadialGradient(bx, by, 0, bx, by, br);
                gb.addColorStop(0, 'rgba(48,58,26,0.96)');
                gb.addColorStop(0.5, 'rgba(66,78,35,0.7)');
                gb.addColorStop(1, 'rgba(16,20,10,0)');
                ctx.fillStyle = gb;
                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Верхние шлейфы.
            for (let i = 0; i < 12; i++) {
                const period = 1.35 + i * 0.08;
                const phase = (now + i * 0.22) % period;
                const t = phase / period;
                const rise = h * (0.16 + t * 1.55);
                const sx = cx + Math.sin(now * 2.5 + i * 1.35) * (w * 0.11 + i * 1.35);
                const sy = topY - rise;
                const r = (h * 0.064 + i * 0.54) * (0.78 + t * 1.08);
                const alpha = Math.max(0, 0.64 * (1 - t));

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(18,22,12,0.65)';
                const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
                g.addColorStop(0, 'rgba(56,66,30,0.94)');
                g.addColorStop(0.52, 'rgba(86,104,46,0.62)');
                g.addColorStop(1, 'rgba(14,18,10,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        } else {
            bossNosok.draw();
        }
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
        ctx.restore();

        drawStyledBossHpBar('Босс: Сосиска', boss.hp, boss.maxHp || 11, 24);
    }

    // Рисуем футбольный мяч режима "нАсок" (между игроком и штангами — мяч внутри ворот).
    if ((gameMode === 'nosok' || gameMode === 'stepan') && nosokBall) {
        ctx.save();
        ctx.translate(nosokBall.x, nosokBall.y);
        ctx.rotate(nosokBall.angle || 0);
        const d = nosokBall.r * 2;
        if (soccerBallImg && soccerBallImg.complete) {
            ctx.drawImage(soccerBallImg, -nosokBall.r, -nosokBall.r, d, d);
        } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, nosokBall.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }

    // Сетка, штанги и перекладина ворот поверх игрока и мяча — перекрывают оба объекта.
    if ((gameMode === 'nosok' || gameMode === 'stepan') && nosokGoalSensor && nosokCrossbar) {
        // Сетка
        const netX = nosokGoalSensor.x + nosokGoalSensor.w;
        const netY = nosokCrossbar.y + nosokCrossbar.h;
        const netW = Math.max(0, canvas.width - netX);
        const netH = Math.max(0, (canvas.height - 20) - netY);
        if (netW > 0 && netH > 0) {
            ctx.save();
            if (goalNetReady && goalNetImg.complete) {
                const pattern = ctx.createPattern(goalNetImg, 'repeat');
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(netX, netY, netW, netH);
                } else {
                    ctx.globalAlpha = 0.28;
                    ctx.fillStyle = '#d9e2ec';
                    ctx.fillRect(netX, netY, netW, netH);
                }
            } else {
                // Временный фолбек до появления PNG-сетки.
                ctx.globalAlpha = 0.22;
                ctx.strokeStyle = '#d9e2ec';
                ctx.lineWidth = 1;
                const step = Math.max(10, Math.round(canvas.width * 0.012));
                for (let x = netX; x <= netX + netW; x += step) {
                    ctx.beginPath();
                    ctx.moveTo(x, netY);
                    ctx.lineTo(x, netY + netH);
                    ctx.stroke();
                }
                for (let y = netY; y <= netY + netH; y += step) {
                    ctx.beginPath();
                    ctx.moveTo(netX, y);
                    ctx.lineTo(netX + netW, y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
        // Штанги и перекладина
        nosokGoalSensor.draw();
        nosokCrossbar.draw();
        if (nosokGoalFlashTimer > 0) {
            const flash = 0.18 + 0.2 * Math.sin(performance.now() * 0.03);
            ctx.save();
            ctx.globalAlpha = Math.max(0, flash);
            ctx.fillStyle = '#eaff9d';
            ctx.fillRect(nosokGoalSensor.x, nosokGoalSensor.y, nosokGoalSensor.w, nosokGoalSensor.h);
            ctx.fillRect(nosokCrossbar.x, nosokCrossbar.y, nosokCrossbar.w, nosokCrossbar.h);
            ctx.restore();
        }
    }

    // Сигнализация гола: конфетти сыпется сверху ~2 секунды.
    if ((gameMode === 'nosok' || gameMode === 'stepan') && Array.isArray(nosokGoalConfetti) && nosokGoalConfetti.length > 0) {
        nosokGoalConfetti.forEach(c => {
            const k = 1 - (c.timer / Math.max(0.001, c.life));
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rot || 0);
            ctx.globalAlpha = Math.max(0.12, k);
            ctx.fillStyle = c.color || '#ffd166';
            if (c.size > 8 && Math.random() < 0.3) {
                ctx.fillRect(-c.size * 0.5, -c.size * 0.16, c.size, c.size * 0.32);
            } else {
                ctx.fillRect(-c.size * 0.5, -c.size * 0.5, c.size, c.size);
            }
            ctx.restore();
        });
    }

    // Пульсирующая надпись "ГОЛ" на время конфетти-сигнала.
    if ((gameMode === 'nosok' || gameMode === 'stepan') && (nosokGoalConfettiTimer > 0 || (Array.isArray(nosokGoalConfetti) && nosokGoalConfetti.length > 0))) {
        const now = performance.now() * 0.001;
        const total = 2.0;
        const k = Math.max(0, Math.min(1, nosokGoalConfettiTimer / total));
        const envelope = Math.sin((1 - k) * Math.PI); // плавное появление/затухание
        const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(now * 12));
        const alpha = Math.max(0.15, envelope * pulse);
        const scale = 1 + 0.08 * Math.sin(now * 9.5);

        ctx.save();
        ctx.translate(canvas.width * 0.5, Math.max(80, canvas.height * 0.17));
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.round(Math.max(48, canvas.width * 0.085))}px Arial`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(26,32,44,0.85)';
        ctx.shadowBlur = 16;
        ctx.shadowColor = 'rgba(255,214,79,0.7)';
        ctx.strokeText('ГОЛ', 0, 0);
        const g = ctx.createLinearGradient(0, -42, 0, 42);
        g.addColorStop(0, '#fff8e1');
        g.addColorStop(0.45, '#ffd54f');
        g.addColorStop(1, '#ff8f00');
        ctx.fillStyle = g;
        ctx.fillText('ГОЛ', 0, 0);
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
        drawSpeechBalloonAdaptive(sb, gameMode);
    });
    if (gameMode === 'nosok' || gameMode === 'stepan') {
        // Верхнее табло режима "нАсок": голы и таймер.
        const timerStr = formatNosokTime(Math.round(nosokElapsedTime * 1000));
        const panelW = Math.max(250, canvas.width * 0.32);
        const panelH = 54;
        const panelX = (canvas.width - panelW) * 0.5;
        const panelY = 8;
        ctx.save();
        ctx.fillStyle = 'rgba(15,23,42,0.64)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isStepan = gameMode === 'stepan';
        const shownGoals = isStepan
            ? Math.max(0, Math.floor(nosokGoals))
            : Math.min(nosokTargetGoals, nosokGoals);
        const panelText = isStepan
            ? `Голы: ${shownGoals}`
            : `Голы: ${shownGoals}/${nosokTargetGoals}   Время: ${timerStr}`;
        ctx.fillText(panelText, panelX + panelW / 2, panelY + panelH / 2);
        ctx.restore();
    }

    // (рубин и кубок теперь рисуются перед игроком)
    
    if (perf && perf.isEnabled()) perf.drawOverlay(ctx, bullets.length);
}



