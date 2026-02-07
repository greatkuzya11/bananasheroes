// ==== КЛАСС ВРАГА 67 ====
/**
 * Враг 67: декоративный противник с анимацией и покачиванием.
 */
class Enemy67 {
    /**
     * Создает врага 67 в зависимости от режима игры.
     * @param {number} playerX - начальная X позиция игрока (для ориентира).
     * @param {number} playerY - начальная Y позиция игрока (для ориентира).
     * @param {boolean} platformMode - true для режима платформ.
     */
    constructor(playerX, playerY, platformMode = false) {
        // Размер: высота = 1/2 экрана, но в режиме платформ больше (в 2.25 раза)
        this.h = platformMode ? (canvas.height * 0.3375) : (canvas.height * 0.5);
        this.w = this.h; // квадратный спрайт
        // Позиция: почти с правого угла или на платформе
        this.x = platformMode ? (bossPlatform.x + (bossPlatform.w - this.w) / 2) : (canvas.width - this.w - 20);
        this.y = platformMode ? (bossPlatform.y - this.h * 0.92) : (canvas.height - this.h - 20);
        // Анимация: 2 кадра, 0.3 сек на кадр
        this.frame = 0;
        this.timer = 0;
        this.animInterval = 0.3;
        // Покачивание: сохраняем базовую позицию
        this.baseX = this.x;
        this.baseY = this.y;
        this.swayTime = 0;
        // Амплитуда и скорость покачивания
        this.swayAmplitudeX = platformMode ? 5 : 15; // меньше в режиме платформ
        this.swayAmplitudeY = platformMode ? 0 : 10; // не качается по вертикали на платформе
        this.swaySpeedX = 1.2;
        this.swaySpeedY = 1.5;
        // Здоровье (HP) и атака
        this.hp = platformMode ? 40 : 20; // 40 попаданий в режиме платформ
        this.attackTimer = 0; // начинаем с 0
        this.attackDelay = platformMode ? 0 : 5.0; // в режиме 67 ждем 5 сек, на платформе сразу
        this.shootTimer = 0;
        this.shootInterval = 0.8; // в 3 раза быстрее сирени (~1 сек)
        this.bulletEmojis = ['🪳', '🧨', '7️⃣', '6️⃣', '💩'];
        // Движение к игроку
        this.moveSpeed = platformMode ? 0 : 50; // не движется в режиме платформ
        this.sizeIncreaseTimer = 0; // таймер для увеличения размера каждую секунду
        this.platformMode = platformMode; // флаг режима платформ
    }
    /**
     * Обновляет анимацию, позицию и стрельбу врага.
     * @param {number} dt - прошедшее время кадра в секундах.
     */
    update(dt) {
        // Анимация кадров
        this.timer += dt;
        if (this.timer >= this.animInterval) {
            this.frame = (this.frame + 1) % 2; // 0 -> 1 -> 0 -> 1...
            this.timer = 0;
        }
        
        // Атака
        this.attackTimer += dt;
        if (this.attackTimer >= this.attackDelay) {
            // В режиме платформ не увеличиваем размер
            if (!this.platformMode) {
                // После начала атаки увеличиваем размер каждую секунду на 5%
                this.sizeIncreaseTimer += dt;
                if (this.sizeIncreaseTimer >= 1.0) {
                    // Проверяем, не достиг ли размер 90% от экрана
                    const maxSize = Math.min(canvas.width, canvas.height) * 0.9;
                    if (this.w < maxSize && this.h < maxSize) {
                        // Каждую секунду увеличиваем размер на 5%
                        this.w *= 1.05;
                        this.h *= 1.05;
                    }
                    this.sizeIncreaseTimer = 0;
                }
            }
            
            // Движение к игроку (только не в режиме платформ)
            if (!this.platformMode) {
                const dx = player.x + player.w / 2 - (this.baseX + this.w / 2);
                const dy = player.y + player.h / 2 - (this.baseY + this.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 5) { // двигаемся только если не слишком близко
                    this.baseX += (dx / dist) * this.moveSpeed * dt;
                    this.baseY += (dy / dist) * this.moveSpeed * dt;
                }
                
                // Ограничиваем позицию в границах экрана
                this.baseX = Math.max(0, Math.min(canvas.width - this.w, this.baseX));
                this.baseY = Math.max(0, Math.min(canvas.height - this.h, this.baseY));
            } else if (bossPlatform) {
                // В режиме платформ держимся над платформой (с смещением вниз на 1/10 размера)
                this.baseX = bossPlatform.x + (bossPlatform.w - this.w) / 2;
                this.baseY = bossPlatform.y - this.h * 0.88; // чуть ниже, чтобы не висеть слишком высоко
            }
            
            // Стрельба
            this.shootTimer += dt;
            if (this.shootTimer >= this.shootInterval) {
                this.shoot();
                this.shootTimer = 0;
            }
        }
        
        // Покачивание относительно базовой позиции (с меньшей амплитудой чтобы не выходить за границы)
        this.swayTime += dt;
        const swayX = Math.sin(this.swayTime * this.swaySpeedX) * this.swayAmplitudeX;
        const swayY = Math.sin(this.swayTime * this.swaySpeedY) * this.swayAmplitudeY;
        
        // Применяем покачивание и проверяем границы
        this.x = Math.max(0, Math.min(canvas.width - this.w, this.baseX + swayX));
        this.y = Math.max(0, Math.min(canvas.height - this.h, this.baseY + swayY));
    }
    /**
     * Выпускает пулю врага 67 в сторону игрока.
     */
    shoot() {
        // Выбираем случайное эмодзи для пули
        const emoji = this.bulletEmojis[Math.floor(Math.random() * this.bulletEmojis.length)];
        // Пуля появляется из случайной части врага
        const offsetX = this.w * (0.2 + Math.random() * 0.6);
        const offsetY = this.h * (0.2 + Math.random() * 0.6);
        const bx = this.x + offsetX;
        const by = this.y + offsetY;
        
        // Наводим на игрока
        const dx = player.x + player.w / 2 - bx;
        const dy = player.y + player.h / 2 - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 10; // в 5 раз медленнее начальной скорости (350/5=70)
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        
        enemyBullets.push({ x: bx, y: by, w: 16, h: 24, emoji, vx, vy });
    }
    /**
     * Отрисовывает врага 67 на canvas.
     */
    draw() {
        if (!enemy67SpriteReady) return;
        ctx.drawImage(
            enemy67Img,
            this.frame * FRAME_67_W, // исходный X: 0 или 326
            0,                         // исходный Y
            FRAME_67_W,               // ширина источника: 326
            FRAME_67_H,               // высота источника: 326
            this.x,                   // X назначения
            this.y,                   // Y назначения
            this.w,                   // ширина назначения
            this.h                    // высота назначения
        );
    }
}



