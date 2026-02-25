// ==== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====
/**
 * Проверяет пересечение двух прямоугольников по их координатам и размерам.
 * @param {{x:number, y:number, w:number, h:number}} a - первый прямоугольник.
 * @param {{x:number, y:number, w:number, h:number}} b - второй прямоугольник.
 * @returns {boolean} true, если прямоугольники пересекаются.
 */
function rect(a, b) {
    return a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;
}

/**
 * Проверяет столкновение хитбокса с игроком (AABB + попиксельная alpha-маска).
 * Быстрый AABB-преджект; при перекрытии сэмплирует несколько точек через
 * player.isOpaqueAtWorld(), чтобы не считать попадание по прозрачной части спрайта.
 * @param {{x:number, y:number, w:number, h:number}} hitbox
 * @returns {boolean}
 */
function playerHitTest(hitbox) {
    if (!rect(hitbox, player)) return false;
    // Пиксельная проверка: берём несколько точек внутри перекрытия
    const ox1 = Math.max(hitbox.x, player.x);
    const oy1 = Math.max(hitbox.y, player.y);
    const ox2 = Math.min(hitbox.x + hitbox.w, player.x + player.w);
    const oy2 = Math.min(hitbox.y + hitbox.h, player.y + player.h);
    const cx = (ox1 + ox2) / 2;
    const cy = (oy1 + oy2) / 2;
    const qx = (ox2 - ox1) / 4;
    const qy = (oy2 - oy1) / 4;
    // Центр + 4 точки вблизи краёв перекрытия
    return player.isOpaqueAtWorld(cx,        cy       ) ||
           player.isOpaqueAtWorld(cx - qx,   cy - qy  ) ||
           player.isOpaqueAtWorld(cx + qx,   cy - qy  ) ||
           player.isOpaqueAtWorld(cx - qx,   cy + qy  ) ||
           player.isOpaqueAtWorld(cx + qx,   cy + qy  );
}
