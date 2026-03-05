// ==== БОНУСНЫЙ ФИНАЛЬНЫЙ УРОВЕНЬ ====

// Кадры прапора (как в уровне "Бегун").
const bonusPraporFrames = [];
let bonusPraporFramesReady = 0;
for (let i = 1; i <= 7; i++) {
    const img = new Image();
    img.onload = () => { bonusPraporFramesReady++; };
    img.src = `img/dron/d${i}.png`;
    bonusPraporFrames.push(img);
}

// Кадры Кузи (как в уровне "Ловлю").
const bonusKuzyFrames = [];
let bonusKuzyFramesReady = 0;
for (let i = 1; i <= 6; i++) {
    const img = new Image();
    img.onload = () => { bonusKuzyFramesReady++; };
    img.src = `img/kuzya/${i}.png`;
    bonusKuzyFrames.push(img);
}

// Статичный Max.
const bonusMaxStandImg = new Image();
let bonusMaxStandReady = false;
bonusMaxStandImg.onload = () => { bonusMaxStandReady = true; };
bonusMaxStandImg.src = 'img/max-stand.png';

const BONUS_PRAPOR_LINES = ['Я тебя сука убью!', 'Уважай мою девственность!'];
const BONUS_MAX_LINES = ['Хуй!', 'Хули Водка Чесаться??'];
const BONUS_KUZY_LINES = ['2хуй!!', 'Твои проблемы!'];
// Соотношения размеров персонажей по референсу heroes.png:
// Кузя (центр) — база, Прапор (слева) больше, Max (справа) меньше.
const BONUS_REF_SCALE = Object.freeze({
    praporToKuzy: 1.16,
    maxToKuzy: 0.92
});

let bonusGroundY = 0;
let bonusInvisiblePlatform = null;
let bonusBeerDecor = [];

let bonusPrapor = null;
let bonusPraporSpeech = null;

let bonusMaxNpc = null;
let bonusMaxSpeech = null;

let bonusKuzy = null;
let bonusKuzySpawnTimer = 0;

let bonusLastW = 0;
let bonusLastH = 0;

function bonusRand(min, max) {
    return min + Math.random() * (max - min);
}

function bonusPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function bonusShuffle2(arr) {
    if (!arr || arr.length < 2) return (arr || []).slice();
    return Math.random() < 0.5 ? [arr[0], arr[1]] : [arr[1], arr[0]];
}

function bonusGetKuzyBaseW() {
    if (player && Number.isFinite(player.w) && player.w > 0) {
        // Ровно как в "Ловлю".
        return player.w * 0.6375;
    }
    // fallback (player.w в игре по умолчанию = 20% высоты canvas).
    return canvas.height * 0.2 * 0.6375;
}

function bonusGetKuzyReferenceHeight() {
    const dims = getBonusKuzyDims({
        baseW: bonusGetKuzyBaseW(),
        state: 'landed',
        animFrame: 0,
        caughtFrame: 0
    });
    return Math.max(72, Math.round(dims.h));
}

/**
 * Те же пропорции и выбор кадров, что в уровне "Ловлю".
 * @param {{baseW:number,state:string,animFrame:number,caughtFrame:number}} ch
 * @returns {{w:number,h:number,sprite:HTMLImageElement|null}}
 */
function getBonusKuzyDims(ch) {
    let imgIdx = -1;
    if (ch.state === 'peek') imgIdx = 5;
    else if (ch.state === 'falling') imgIdx = ch.animFrame === 0 ? 3 : 2;
    else if (ch.state === 'caught') imgIdx = ch.caughtFrame === 0 ? 1 : 0;
    else if (ch.state === 'speak') imgIdx = 0;
    else if (ch.state === 'landed') imgIdx = 4;

    const sprite = (imgIdx >= 0 && imgIdx < bonusKuzyFrames.length) ? bonusKuzyFrames[imgIdx] : null;
    let drawW = ch.baseW;
    if (ch.state === 'peek') drawW = ch.baseW / 1.5;
    if (ch.state === 'falling') drawW = ch.baseW * 1.5;
    if (ch.state === 'caught' && ch.caughtFrame === 0) drawW = ch.baseW * 1.5;
    if (ch.state === 'caught' && ch.caughtFrame === 1) drawW = ch.baseW * 0.8;
    if (ch.state === 'speak') drawW = ch.baseW * 0.8;
    if (ch.state === 'landed') drawW = ch.baseW * 1.5;

    let drawH = drawW;
    if (sprite && sprite.complete && sprite.width > 0 && sprite.height > 0) {
        drawH = drawW * (sprite.height / sprite.width);
    }
    return { w: drawW, h: drawH, sprite };
}

function resetBonusLevelState() {
    bonusGroundY = 0;
    bonusInvisiblePlatform = null;
    bonusBeerDecor = [];

    bonusPrapor = null;
    bonusPraporSpeech = null;

    bonusMaxNpc = null;
    bonusMaxSpeech = null;

    bonusKuzy = null;
    bonusKuzySpawnTimer = 0;

    bonusLastW = 0;
    bonusLastH = 0;
}

function buildBonusSpeechCycle(lines, cycleDuration = 10, showDuration = 2) {
    return {
        lines: (lines || []).slice(0, 2),
        cycleDuration,
        showDuration,
        timer: 0,
        nextEventIdx: 0,
        events: [],
        activeText: '',
        activeTimer: 0
    };
}

function scheduleBonusSpeechCycle(cycle) {
    if (!cycle || !cycle.lines || cycle.lines.length < 2) return;
    const ordered = bonusShuffle2(cycle.lines);
    const t1 = bonusRand(0.7, 3.6);
    const t2min = Math.max(t1 + cycle.showDuration + 0.45, 4.5);
    const t2max = Math.max(t2min + 0.2, cycle.cycleDuration - cycle.showDuration - 0.25);
    const t2 = bonusRand(t2min, t2max);
    cycle.events = [
        { t: t1, text: ordered[0] },
        { t: t2, text: ordered[1] }
    ];
    cycle.nextEventIdx = 0;
    cycle.activeText = '';
    cycle.activeTimer = 0;
    cycle.timer = 0;
}

function updateBonusSpeechCycle(cycle, dt) {
    if (!cycle) return;
    cycle.timer += dt;
    while (cycle.nextEventIdx < cycle.events.length && cycle.timer >= cycle.events[cycle.nextEventIdx].t) {
        cycle.activeText = cycle.events[cycle.nextEventIdx].text;
        cycle.activeTimer = cycle.showDuration;
        cycle.nextEventIdx++;
    }
    if (cycle.activeTimer > 0) {
        cycle.activeTimer = Math.max(0, cycle.activeTimer - dt);
        if (cycle.activeTimer <= 0) cycle.activeText = '';
    }
    if (cycle.timer >= cycle.cycleDuration) scheduleBonusSpeechCycle(cycle);
}

function buildBonusBottlesAndPlatform() {
    const baseH = Math.max(72, Math.round(canvas.height * 0.11)) * 2;
    const centerY = canvas.height * 0.51;
    const layout = [];
    for (let i = 0; i < 3; i++) {
        const img = o4koVictoryBeerImgs[i] || null;
        let h = baseH;
        let w = Math.round(h * 0.62);
        if (img && img.complete && img.width > 0 && img.height > 0) {
            w = Math.max(24, Math.round(h * (img.width / img.height)));
        }
        layout.push({ img, w, h });
    }

    const widest = layout.reduce((m, b) => Math.max(m, b.w), 0);
    const gap = Math.max(14, Math.round(widest * 0.28));
    const totalW = layout.reduce((sum, b) => sum + b.w, 0) + gap * (layout.length - 1);
    let curX = canvas.width * 0.5 - totalW * 0.5;

    bonusBeerDecor = [];
    for (let i = 0; i < layout.length; i++) {
        const item = layout[i];
        bonusBeerDecor.push({
            x: curX,
            y: centerY - item.h * 0.5,
            w: item.w,
            h: item.h,
            img: item.img
        });
        curX += item.w + gap;
    }

    // Невидимая платформа на высоте бутылок.
    const bottomY = centerY + baseH * 0.5;
    bonusInvisiblePlatform = {
        x: 0,
        y: bottomY,
        w: canvas.width,
        h: Math.max(8, Math.round(canvas.height * 0.014))
    };
}

function bonusGetPraporSurfaceY(surface, p) {
    const sY = (surface === 'platform') ? bonusInvisiblePlatform.y : bonusGroundY;
    return sY - p.h + p.footOffset;
}

function initBonusPrapor() {
    const targetH = Math.max(72, Math.round(bonusGetKuzyReferenceHeight() * BONUS_REF_SCALE.praporToKuzy));
    let targetW = Math.round(targetH * 0.82);
    const frame0 = bonusPraporFrames[0];
    if (frame0 && frame0.complete && frame0.width > 0 && frame0.height > 0) {
        targetW = Math.max(28, Math.round(targetH * (frame0.width / frame0.height)));
    }
    bonusPrapor = {
        x: Math.max(0, canvas.width * 0.74 - targetW * 0.5),
        y: 0,
        w: targetW,
        h: targetH,
        footOffset: Math.max(16, Math.round(canvas.height * 0.028)),
        speed: canvas.width * 0.24,
        dir: (Math.random() < 0.5 ? -1 : 1),
        vx: 0,
        vy: 0,
        gravity: canvas.height * 2.8,
        onGround: true,
        surface: 'ground',
        targetSurface: 'ground',
        jumpCooldown: bonusRand(0.7, 1.4),
        frame: 0,
        frameDir: 1,
        animTimer: 0
    };
    bonusPrapor.y = bonusGetPraporSurfaceY('ground', bonusPrapor);
}

function initBonusMaxNpc() {
    const baseH = Math.max(72, Math.round(bonusGetKuzyReferenceHeight() * BONUS_REF_SCALE.maxToKuzy));
    let w = Math.round(baseH * 0.74);
    if (bonusMaxStandReady && bonusMaxStandImg.width > 0 && bonusMaxStandImg.height > 0) {
        w = Math.max(24, Math.round(baseH * (bonusMaxStandImg.width / bonusMaxStandImg.height)));
    }
    const centerX = canvas.width * (2 / 3 + 1 / 6); // середина правой трети
    const y = canvas.height * 0.8 - baseH;          // 20% от низа
    bonusMaxNpc = {
        x: centerX - w * 0.5,
        y,
        w,
        h: baseH
    };
}

function initBonusLevel() {
    resetBonusLevelState();
    bonusLastW = canvas.width;
    bonusLastH = canvas.height;
    bonusGroundY = canvas.height - Math.max(12, Math.round(canvas.height * 0.03));

    buildBonusBottlesAndPlatform();
    initBonusPrapor();
    initBonusMaxNpc();

    bonusPraporSpeech = buildBonusSpeechCycle(BONUS_PRAPOR_LINES, 10, 2);
    bonusMaxSpeech = buildBonusSpeechCycle(BONUS_MAX_LINES, 10, 2);
    scheduleBonusSpeechCycle(bonusPraporSpeech);
    scheduleBonusSpeechCycle(bonusMaxSpeech);

    bonusKuzy = null;
    bonusKuzySpawnTimer = bonusRand(1.5, 3.5);
}

function onBonusResize(prevW, prevH) {
    if (gameMode !== 'bonus') return;
    const relPraporX = bonusPrapor ? (bonusPrapor.x / Math.max(1, prevW || bonusLastW || canvas.width)) : 0.72;
    const relKuzyX = bonusKuzy ? (bonusKuzy.x / Math.max(1, prevW || bonusLastW || canvas.width)) : 0.12;
    const relKuzyY = bonusKuzy ? (bonusKuzy.y / Math.max(1, prevH || bonusLastH || canvas.height)) : 0.2;

    bonusLastW = canvas.width;
    bonusLastH = canvas.height;
    bonusGroundY = canvas.height - Math.max(12, Math.round(canvas.height * 0.03));
    buildBonusBottlesAndPlatform();
    initBonusMaxNpc();

    if (bonusPrapor) {
        const oldDir = bonusPrapor.dir;
        const oldSurface = bonusPrapor.surface;
        initBonusPrapor();
        bonusPrapor.dir = oldDir;
        bonusPrapor.surface = oldSurface;
        bonusPrapor.x = Math.max(0, Math.min(canvas.width - bonusPrapor.w, relPraporX * canvas.width));
        bonusPrapor.y = bonusGetPraporSurfaceY(bonusPrapor.surface, bonusPrapor);
    }

    if (bonusKuzy) {
        const saved = {
            state: bonusKuzy.state,
            stateTimer: bonusKuzy.stateTimer,
            animFrame: bonusKuzy.animFrame,
            caughtFrame: bonusKuzy.caughtFrame,
            caughtTimer: bonusKuzy.caughtTimer,
            speechText: bonusKuzy.speechText,
            speakTimer: bonusKuzy.speakTimer,
            mirrored: bonusKuzy.mirrored
        };
        spawnBonusKuzy(true);
        bonusKuzy.x = Math.max(0, Math.min(canvas.width - bonusGetKuzyDims(bonusKuzy).w, relKuzyX * canvas.width));
        bonusKuzy.y = Math.max(-canvas.height, Math.min(bonusGroundY, relKuzyY * canvas.height));
        Object.assign(bonusKuzy, saved);
        const dims = getBonusKuzyDims(bonusKuzy);
        if (bonusKuzy.state === 'caught' || bonusKuzy.state === 'speak') {
            bonusKuzy.y = bonusGroundY - dims.h;
        }
    }
}

function bonusTryPraporJump(p) {
    if (!p || !p.onGround) return;
    const fromGround = p.surface === 'ground';
    const wantPlatform = fromGround ? (Math.random() < 0.62) : (Math.random() < 0.38);
    const targetSurface = wantPlatform ? 'platform' : 'ground';
    const targetY = bonusGetPraporSurfaceY(targetSurface, p);
    const flightT = bonusRand(0.62, 0.94);
    p.vy = (targetY - p.y - 0.5 * p.gravity * flightT * flightT) / flightT;
    p.onGround = false;
    p.targetSurface = targetSurface;
    p.surface = 'air';
    p.vx = p.dir * p.speed * bonusRand(0.93, 1.07);
}

function updateBonusPrapor(dt) {
    const p = bonusPrapor;
    if (!p) return;

    p.jumpCooldown -= dt;
    if (p.onGround) {
        p.vx = p.dir * p.speed;
        if (p.jumpCooldown <= 0) {
            bonusTryPraporJump(p);
            p.jumpCooldown = bonusRand(0.85, 1.7);
        }
    }

    p.x += p.vx * dt;
    if (p.x <= 0) {
        p.x = 0;
        p.dir = 1;
        if (p.onGround && Math.random() < 0.45) bonusTryPraporJump(p);
    } else if (p.x + p.w >= canvas.width) {
        p.x = canvas.width - p.w;
        p.dir = -1;
        if (p.onGround && Math.random() < 0.45) bonusTryPraporJump(p);
    }

    const prevBottom = p.y + p.h - p.footOffset;
    if (!p.onGround) {
        p.vy += p.gravity * dt;
        p.y += p.vy * dt;
        const nextBottom = p.y + p.h - p.footOffset;
        const platTop = bonusInvisiblePlatform.y;

        if (p.vy >= 0 && prevBottom < platTop - 0.5 && nextBottom >= platTop) {
            p.y = bonusGetPraporSurfaceY('platform', p);
            p.vy = 0;
            p.onGround = true;
            p.surface = 'platform';
            p.targetSurface = 'platform';
        }

        if (p.y + p.h - p.footOffset >= bonusGroundY) {
            p.y = bonusGetPraporSurfaceY('ground', p);
            p.vy = 0;
            p.onGround = true;
            p.surface = 'ground';
            p.targetSurface = 'ground';
        }
    } else {
        p.y = bonusGetPraporSurfaceY(p.surface === 'platform' ? 'platform' : 'ground', p);
    }

    p.animTimer += dt;
    const interval = p.onGround ? 0.09 : 0.12;
    if (p.animTimer >= interval) {
        p.animTimer = 0;
        p.frame += p.frameDir;
        const maxFrame = Math.max(0, bonusPraporFrames.length - 1);
        if (p.frame >= maxFrame) {
            p.frame = maxFrame;
            p.frameDir = -1;
        } else if (p.frame <= 0) {
            p.frame = 0;
            p.frameDir = 1;
        }
    }
}

function spawnBonusKuzy(keepTimer = false) {
    const baseW = bonusGetKuzyBaseW();
    const spawnXMin = canvas.width * 0.05;
    const spawnXMax = canvas.width * 0.30; // левая половина с отступом справа 2/10
    const spawnYMin = -baseW * 0.5;
    const spawnYMax = canvas.height * 0.4 - baseW;

    bonusKuzy = {
        x: bonusRand(spawnXMin, Math.max(spawnXMin + 1, spawnXMax)),
        y: bonusRand(spawnYMin, Math.max(spawnYMin + 1, spawnYMax)),
        baseW,
        mirrored: Math.random() < 0.5,
        state: 'peek',
        stateTimer: 0,
        peekDuration: 0.3 + Math.random() * 0.3,
        fallSpeed: canvas.height * 0.30,
        vx: 0,
        vy: 0,
        swayTimer: Math.random() * 100,
        swayAmplitude: canvas.width * 0.04,
        swaySpeed: 2 + Math.random() * 2,
        animFrame: 0,
        animTimer: 0,
        caughtFrame: 0,
        caughtTimer: 0,
        speechText: bonusPick(BONUS_KUZY_LINES),
        speakTimer: 0
    };

    if (!keepTimer) {
        bonusKuzySpawnTimer = bonusRand(3.2, 5.8);
    }
}

function updateBonusKuzy(dt) {
    if (!bonusKuzy) {
        bonusKuzySpawnTimer -= dt;
        if (bonusKuzySpawnTimer <= 0) spawnBonusKuzy();
        return;
    }

    const k = bonusKuzy;
    k.stateTimer += dt;
    const dims = getBonusKuzyDims(k);

    if (k.state === 'peek') {
        if (k.stateTimer >= k.peekDuration) {
            k.state = 'falling';
            k.stateTimer = 0;
            k.animFrame = 0;
            k.animTimer = 0;

            const driftDir = Math.random() < 0.5 ? -1 : 1;
            const angleDeg = 15 + Math.random() * (35 - 15);
            const angleRad = angleDeg * Math.PI / 180;
            k.vy = k.fallSpeed;
            k.vx = Math.tan(angleRad) * k.fallSpeed * driftDir * (0.6 + Math.random() * 0.4);
        }
        return;
    }

    if (k.state === 'falling') {
        k.animTimer += dt;
        if (k.animTimer >= 0.15) {
            k.animTimer = 0;
            k.animFrame = (k.animFrame === 0) ? 1 : 0;
        }

        k.swayTimer += dt * k.swaySpeed;
        const swayOffset = Math.sin(k.swayTimer) * k.swayAmplitude;

        const maxVx = Math.tan(45 * Math.PI / 180) * k.fallSpeed;
        k.vx = Math.max(-maxVx, Math.min(maxVx, k.vx));

        k.x += k.vx * dt + swayOffset * dt;
        k.y += k.vy * dt;

        k.x = Math.max(5, Math.min(canvas.width - dims.w - 5, k.x));

        if (k.y + dims.h >= bonusGroundY) {
            k.y = bonusGroundY - dims.h;
            k.state = 'caught';
            k.stateTimer = 0;
            k.caughtFrame = 0;
            k.caughtTimer = 0;
        }
        return;
    }

    if (k.state === 'caught') {
        k.caughtTimer += dt;
        if (k.caughtFrame === 0 && k.caughtTimer >= 0.3) {
            k.caughtFrame = 1;
            k.caughtTimer = 0;
            const newDims = getBonusKuzyDims(k);
            k.y = bonusGroundY - newDims.h;
        }
        if (k.caughtFrame === 1 && k.caughtTimer >= 0.2) {
            k.state = 'speak';
            k.speakTimer = 2.0;
        }
        return;
    }

    if (k.state === 'speak') {
        k.speakTimer = Math.max(0, k.speakTimer - dt);
        if (k.speakTimer <= 0) bonusKuzy = null;
    }
}

function updateBonusMode(dt) {
    if (canvas.width !== bonusLastW || canvas.height !== bonusLastH) {
        onBonusResize(bonusLastW, bonusLastH);
    }

    updateBonusPrapor(dt);
    updateBonusKuzy(dt);
    updateBonusSpeechCycle(bonusPraporSpeech, dt);
    updateBonusSpeechCycle(bonusMaxSpeech, dt);

    if (hudEl) {
        const bonusHud = 'Бонусный уровень | Выход: меню паузы (Esc)';
        if (bonusHud !== lastHudHtml) {
            hudEl.innerText = bonusHud;
            lastHudHtml = bonusHud;
        }
    }
}

function drawBonusTitle() {
    const topY = Math.max(28, canvas.height * 0.06);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `900 ${Math.max(20, Math.round(canvas.height * 0.045))}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 8;
    ctx.fillText('Пошел на хуй с прохождением', canvas.width * 0.5, topY);

    const titleY = topY + Math.max(30, canvas.height * 0.055);
    const grad = ctx.createLinearGradient(0, titleY - 30, 0, titleY + 10);
    grad.addColorStop(0, '#fff4c2');
    grad.addColorStop(0.18, '#ffec80');
    grad.addColorStop(0.38, '#ffd700');
    grad.addColorStop(0.58, '#ffa500');
    grad.addColorStop(0.78, '#ff6a00');
    grad.addColorStop(1, '#ff4500');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255, 120, 0, 0.65)';
    ctx.shadowBlur = 14;
    ctx.font = `900 ${Math.max(28, Math.round(canvas.height * 0.065))}px Arial`;
    ctx.fillText('🍌 Bananas Heroes 🍺', canvas.width * 0.5, titleY);

    ctx.restore();
}

function drawBonusBottles() {
    for (let i = 0; i < bonusBeerDecor.length; i++) {
        const b = bonusBeerDecor[i];
        if (b.img && b.img.complete) {
            ctx.drawImage(b.img, b.x, b.y, b.w, b.h);
        } else {
            ctx.save();
            ctx.font = `${Math.max(24, b.h)}px serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('🍺', b.x, b.y);
            ctx.restore();
        }
    }
}

function drawBonusPrapor() {
    const p = bonusPrapor;
    if (!p) return;
    const img = bonusPraporFrames[p.frame % bonusPraporFrames.length];

    const shadowY = (p.surface === 'platform' && p.onGround) ? bonusInvisiblePlatform.y : bonusGroundY;
    const shadowDist = Math.max(0, shadowY - (p.y + p.h - p.footOffset));
    const shadowScale = Math.max(0.18, 1 - shadowDist / (canvas.height * 0.55));
    ctx.save();
    ctx.globalAlpha = 0.22 * shadowScale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(
        p.x + p.w * 0.5,
        shadowY + 3,
        p.w * 0.34 * shadowScale,
        Math.max(3, p.h * 0.08 * shadowScale),
        0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        if (p.dir > 0) {
            ctx.translate(p.x + p.w, p.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, p.w, p.h);
        } else {
            ctx.drawImage(img, p.x, p.y, p.w, p.h);
        }
        ctx.restore();
    } else {
        ctx.save();
        ctx.font = `${Math.round(p.h)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏃', p.x + p.w * 0.5, p.y + p.h * 0.5);
        ctx.restore();
    }
}

function drawBonusKuzy() {
    const k = bonusKuzy;
    if (!k) return;
    const dims = getBonusKuzyDims(k);

    if (dims.sprite && dims.sprite.complete) {
        ctx.save();
        if (k.mirrored) {
            ctx.translate(k.x + dims.w, k.y);
            ctx.scale(-1, 1);
            ctx.drawImage(dims.sprite, 0, 0, dims.w, dims.h);
        } else {
            ctx.drawImage(dims.sprite, k.x, k.y, dims.w, dims.h);
        }
        ctx.restore();
    } else {
        ctx.save();
        ctx.font = `${Math.round(dims.h)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧍', k.x + dims.w * 0.5, k.y + dims.h * 0.5);
        ctx.restore();
    }
}

function drawBonusMaxNpc() {
    const m = bonusMaxNpc;
    if (!m) return;
    if (bonusMaxStandReady && bonusMaxStandImg.complete) {
        ctx.drawImage(bonusMaxStandImg, m.x, m.y, m.w, m.h);
    } else {
        ctx.save();
        ctx.font = `${Math.round(m.h)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧍', m.x + m.w * 0.5, m.y + m.h * 0.5);
        ctx.restore();
    }
}

function drawBonusSpeechBubbleAt(cx, cy, text, showDuration, timeLeft, scale = 1) {
    if (!text || timeLeft <= 0) return;
    if (typeof drawSpeechBalloonAdaptive !== 'function') return;
    drawSpeechBalloonAdaptive({
        x: cx,
        y: cy,
        timer: Math.max(0, showDuration - timeLeft),
        duration: showDuration,
        text,
        type: 'buk',
        scale
    }, 'bonus');
}

function drawBonusMode() {
    if (bgReady) {
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#6ea357';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawBonusBottles();
    drawBonusPrapor();
    drawBonusKuzy();
    drawBonusMaxNpc();
    drawBonusTitle();

    if (bonusPrapor && bonusPraporSpeech && bonusPraporSpeech.activeText && bonusPraporSpeech.activeTimer > 0) {
        drawBonusSpeechBubbleAt(
            bonusPrapor.x + bonusPrapor.w * 0.5,
            bonusPrapor.y - Math.max(18, bonusPrapor.h * 0.22),
            bonusPraporSpeech.activeText,
            bonusPraporSpeech.showDuration,
            bonusPraporSpeech.activeTimer,
            0.82
        );
    }

    if (bonusKuzy && bonusKuzy.state === 'speak' && bonusKuzy.speakTimer > 0) {
        const dims = getBonusKuzyDims(bonusKuzy);
        drawBonusSpeechBubbleAt(
            bonusKuzy.x + dims.w * 0.5,
            bonusKuzy.y - Math.max(16, dims.h * 0.20),
            bonusKuzy.speechText,
            2,
            bonusKuzy.speakTimer,
            0.78
        );
    }

    if (bonusMaxNpc && bonusMaxSpeech && bonusMaxSpeech.activeText && bonusMaxSpeech.activeTimer > 0) {
        drawBonusSpeechBubbleAt(
            bonusMaxNpc.x + bonusMaxNpc.w * 0.5,
            bonusMaxNpc.y - Math.max(18, bonusMaxNpc.h * 0.2),
            bonusMaxSpeech.activeText,
            bonusMaxSpeech.showDuration,
            bonusMaxSpeech.activeTimer,
            0.82
        );
    }

    if (window.BHBulletPerf && window.BHBulletPerf.isEnabled()) {
        window.BHBulletPerf.drawOverlay(ctx, 0);
    }
}
