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
