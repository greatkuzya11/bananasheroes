// ==== ОТРИСОВКА СИРЕНИ ====
/**
 * Создает кэшированный спрайт сирени на отдельном canvas.
 * @param {number} size - базовый размер объекта.
 * @param {Array} flowers - массив параметров цветков.
 * @returns {{canvas: HTMLCanvasElement, w: number, h: number}} готовый спрайт и его размеры.
 */
function buildLilacSprite(size, flowers) {
    const scale = 1.4;
    const w = Math.ceil(size * scale);
    const h = Math.ceil(size * scale);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cctx = c.getContext('2d');
    const cx = w / 2;
    const cy = h / 2;
    
    // Стебель
    cctx.save();
    cctx.strokeStyle = "#388e3c";
    cctx.lineWidth = size * 0.08;
    cctx.beginPath();
    cctx.moveTo(cx, cy + size * 0.1);
    cctx.lineTo(cx, cy + size * 0.6);
    cctx.stroke();

    // Веточки
    cctx.lineWidth = size * 0.04;
    for (let a = -0.7; a <= 0.7; a += 0.7) {
        cctx.beginPath();
        cctx.moveTo(cx, cy + size * 0.3);
        cctx.lineTo(cx + Math.sin(a) * size * 0.25, cy + size * 0.5);
        cctx.stroke();
    }

    // Гроздь сирени (кружки из массива flowers)
    for (const f of flowers) {
        cctx.beginPath();
        cctx.arc(cx + f.relX * size, cy + f.relY * size, f.rad * size * f.sizeK, 0, Math.PI * 2);
        cctx.fillStyle = f.color;
        cctx.globalAlpha = 0.85;
        cctx.fill();
    }
    cctx.globalAlpha = 1;
    cctx.restore();

    return { canvas: c, w, h };
}

/**
 * Рисует сирень с кэшированием на враге.
 * @param {object} e - объект врага с параметрами позиции и цветков.
 */
function drawLilacCached(e) {
    // Простое отсечение объектов вне экрана
    if (e.x + e.w < 0 || e.x > canvas.width || e.y + e.h < 0 || e.y > canvas.height) return;
    if (!e.lilacSprite) {
        const sprite = buildLilacSprite(e.w, e.flowers);
        e.lilacSprite = sprite.canvas;
        e.lilacSpriteW = sprite.w;
        e.lilacSpriteH = sprite.h;
    }
    const drawX = e.x + e.w / 2 - e.lilacSpriteW / 2;
    const drawY = e.y + e.h / 2 - e.lilacSpriteH / 2;
    ctx.drawImage(e.lilacSprite, drawX, drawY, e.lilacSpriteW, e.lilacSpriteH);
}

