// ==== КЛАСС ПЛАТФОРМЫ ====
/**
 * Платформа: статичная или движущаяся поверхность в режиме платформ.
 */
class Platform {
    /**
     * Создает платформу с заданными параметрами движения и отображения.
     * @param {number} x - позиция по X.
     * @param {number} y - позиция по Y.
     * @param {number} w - ширина платформы.
     * @param {number} h - высота платформы.
     * @param {('horizontal'|'vertical'|null)} movePattern - тип движения.
     * @param {number} speed - скорость движения.
     * @param {number} range - амплитуда движения.
     * @param {string|null} imageSrc - путь к текстуре платформы.
     * @param {boolean} visible - нужно ли рисовать платформу.
     */
    constructor(x, y, w, h, movePattern = null, speed = 50, range = 200, imageSrc = null, visible = true) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.movePattern = movePattern; // null, 'horizontal', 'vertical' (тип движения)
        this.moveTimer = 0;
        this.startX = x;
        this.startY = y;
        this.speed = speed;
        this.range = range;
        this.prevX = x; // Для отслеживания движения
        this.visible = visible; // Видимость платформы
        
        // Загрузка картинки если указана
        if (imageSrc) {
            this.image = new Image();
            this.image.src = imageSrc;
        } else {
            this.image = null;
        }
    }
    /**
     * Обновляет положение платформы согласно шаблону движения.
     * @param {number} dt - прошедшее время кадра в секундах.
     */
    update(dt) {
        this.prevX = this.x; // Сохраняем предыдущую позицию
        
        if (this.movePattern === 'horizontal') {
            this.moveTimer += dt * this.speed / this.range;
            this.x = this.startX + Math.sin(this.moveTimer) * this.range;
        } else if (this.movePattern === 'vertical') {
            this.moveTimer += dt * this.speed / this.range;
            this.y = this.startY + Math.sin(this.moveTimer) * this.range;
        }
    }
    /**
     * Отрисовывает платформу на canvas.
     */
    draw() {
        // Не рисуем, если платформа невидима
        if (!this.visible) return;
        
        // Если есть загруженная картинка
        if (this.image && this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
        } else {
            // Запасной вариант — рисуем платформу с текстурой дерева
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
            
            // Добавляем эмодзи-текстуру
            const emojiSize = Math.min(this.h * 0.8, 20);
            ctx.font = `${emojiSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const numEmojis = Math.floor(this.w / (emojiSize * 1.5));
            const perf = window.BHBulletPerf;
            const renderMode = perf ? perf.bulletRenderMode() : 'emoji';
            const getEmojiBitmap = perf ? perf.getEmojiBitmap : null;
            const woodImg = getEmojiBitmap ? getEmojiBitmap('🪵') : null;
            for (let i = 0; i < numEmojis; i++) {
                const ex = this.x + (i + 0.5) * (this.w / numEmojis);
                if (renderMode === 'png' && woodImg) {
                    ctx.drawImage(woodImg, ex - emojiSize / 2, this.y + this.h / 2 - emojiSize / 2, emojiSize, emojiSize);
                } else {
                    ctx.fillText('🪵', ex, this.y + this.h / 2);
                }
            }
        }
    }
}


