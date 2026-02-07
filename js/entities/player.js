// ==== КЛАСС ИГРОКА ====
/**
 * Игрок: хранит состояние, управляет движением, прыжком и отрисовкой.
 */
class Player {
    /**
     * Создает игрока выбранного типа.
     * @param {string} type - идентификатор персонажа ('kuzy', 'max', 'dron').
     */
    constructor(type) {
        this.type = type;
        this.w = canvas.height * 0.2;
        this.h = this.w;
        this.x = canvas.width / 2 - this.w / 2;
        this.y = canvas.height - this.h - 20;
        this.speed = PLAYER_SPEED;
        this.lastShot = 0;
        this.frame = 0;
        this.timer = 0;
        this.shootTimer = 0;
        // Состояние прыжка
        this.isJumping = false;
        this.jumpTimer = 0;
        this.jumpDuration = 2.0; // целевое общее время вверх+вниз (для ощущения прыжка)
        this.jumpBaseY = this.y;
        this.vy = 0; // вертикальная скорость (пкс/с), положительное значение = вниз
        this.gravity = 0; // будет задана при старте прыжка для физических стилей
        // Параметры прыжка с переменной высотой
        this.jumpMinHeight = 0.6 * this.h;
        this.jumpMaxHeight = 1.5 * this.h;
        this.jumpHoldTimer = 0;
        this.jumpHoldMax = 0.6; // секунды удержания для увеличения высоты при подъеме
        // Стиль прыжка по персонажу: 'max' = линейный, 'dron' = физика с мгновенным бустом, 'kuzy' = физика с плавным набором скорости
        this.jumpStyle = (type === 'max') ? 'max' : (type === 'dron') ? 'dron' : 'kuzy';
        this.jumpRampFactor = (type === 'kuzy') ? 4.0 : 6.0; // меньше = плавнее для 'kuzy'
        // Направление взгляда для зеркалирования спрайта: 'left' или 'right'
        this.facingDir = 'right';
        // Режим платформ: флаг стояния на платформе (для проверки прыжка)
        this.onPlatform = false;
    }
        /**
     * Обновляет движение, анимацию и стрельбу игрока.
     * @param {number} dt - прошедшее время кадра в секундах.
     */
    update(dt) {
        // Альтернативный режим стрельбы: стрелки меняют направление
        if (altShootMode) {
            if (keys["ArrowLeft"]) {
                playerBulletDir = 'left';
                this.facingDir = 'left';
                this.x -= this.speed;
            }
            if (keys["ArrowRight"]) {
                playerBulletDir = 'right';
                this.facingDir = 'right';
                this.x += this.speed;
            }
            // Клавиша ArrowDown стреляет вверх в альтернативном режиме
            if (keys["ArrowDown"]) {
                playerBulletDir = 'up';
            } else if (!keys["ArrowLeft"] && !keys["ArrowRight"]) {
                // Если клавиша вниз отпущена и игрок не двигается, стреляем по направлению взгляда
                playerBulletDir = this.facingDir;
            }
        } else {
            // Обычный режим: только горизонтальное движение
            if (keys["ArrowLeft"]) {
                this.x -= this.speed;
            }
            if (keys["ArrowRight"]) {
                this.x += this.speed;
            }
        }
        this.x = Math.max(10, Math.min(canvas.width - this.w - 10, this.x));

        // Старт прыжка (только если игрок уже не прыгает)
        // В режиме платформ можно прыгать только стоя на платформе
        const canJump = (gameMode === 'platforms') ? this.onPlatform : true;
        if (keys["ArrowUp"] && !this.isJumping && canJump) {
            this.isJumping = true;
            this.jumpTimer = 0;
            this.jumpBaseY = this.y;
            this.jumpHoldTimer = 0;
            // пересчитываем минимальную/максимальную высоту по текущему размеру
            this.jumpMinHeight = 0.6 * this.h;
            this.jumpMaxHeight = 1.5 * this.h;
            if (this.jumpStyle === 'max') {
                // линейный прыжок фиксированной высоты (без зарядки)
                this.jumpHeight = this.jumpMaxHeight;
                // Устанавливаем отрицательное vy чтобы логика платформ знала что Max прыгает вверх
                this.vy = -1;
            } else {
                // физические стили: задаем гравитацию и стартовую скорость вверх по минимальной высоте
                this.gravity = 2 * this.jumpMaxHeight;
                const v0 = 2 * this.jumpMinHeight;
                this.vy = -v0;
            }
        }

        // Логика стрельбы
        // В альтернативном режиме при удержании клавиши ArrowDown (стрельба вверх) стреляем автоматически
        const autoShootUp = altShootMode && keys["ArrowDown"] && playerBulletDir === 'up';
        if ((keys[" "] || autoShootUp) && performance.now() - this.lastShot > 333) {
            this.lastShot = performance.now();
            shootPlayerBullet(this);
        }
        
        // Выключаем режим стрельбы, если клавиша не нажата
        if (!keys[" "] && !autoShootUp) {
            this.shooting = false;
        }

        // Считаем прыжок движением для целей анимации
        const moving = keys["ArrowLeft"] || keys["ArrowRight"] || this.isJumping;
        
        // В режиме платформ: если не на платформе и не прыгаем = падаем
        const isFalling = (gameMode === 'platforms') && !this.onPlatform && !this.isJumping;

        // Логика анимации в зависимости от состояния
        if ((this.isJumping || isFalling) && this.shooting) {
            // Прыжок/падение со стрельбой
            if (playerBulletDir === 'up') {
                // Стрельба вверх в прыжке/падении: кадры 5-6 из img/shoot/up
                this.timer += dt;
                if (this.timer > 0.12) {
                    this.frame++;
                    if (this.frame < 5 || this.frame > 6) this.frame = 5; // циклируем 5-6
                    this.timer = 0;
                }
            } else {
                // Стрельба влево/вправо в прыжке/падении: кадры 4-5 из kuzy_jump.png
                this.timer += dt;
                if (this.timer > 0.12) {
                    this.frame++;
                    if (this.frame < 4 || this.frame > 5) this.frame = 4; // циклируем 4-5
                    this.timer = 0;
                }
            }
        } else if ((this.isJumping || isFalling) && !this.shooting) {
            // Прыжок/падение без стрельбы: кадры 0-3 из kuzy_jump.png
            this.timer += dt;
            if (this.timer > 0.12) {
                this.frame++;
                if (this.frame > 3) this.frame = 0; // циклируем 0-3
                this.timer = 0;
            }
        } else if (!this.isJumping && this.shooting) {
            // Стрельба без прыжка: кадры 0-4 из отдельных файлов
            this.timer += dt;
            if (this.timer > 0.12) {
                this.frame++;
                if (this.frame > 4) this.frame = 0; // циклируем 0-4 (5 кадров)
                this.timer = 0;
            }
        } else if (moving) {
            // Обычная ходьба: кадры из kuzy.png
            this.timer += dt;
            if (this.timer > 0.12) {
                this.frame++;
                if (this.frame > WALK_END) this.frame = WALK_START;
                this.timer = 0;
            }
        } else {
            this.frame = 0;
        }

        // Обновляем вертикальное движение при прыжке согласно стилю
        if (this.isJumping) {
            this.jumpTimer += dt;
            if (this.jumpStyle === 'max') {
                // Линейный подъем и спуск за jumpDuration, фиксированная вершина
                const half = this.jumpDuration / 2;
                if (this.jumpTimer <= half) {
                    const t = this.jumpTimer / half;
                    this.y = this.jumpBaseY - this.jumpHeight * t;
                } else if (this.jumpTimer <= this.jumpDuration) {
                    const t = (this.jumpTimer - half) / half;
                    this.y = this.jumpBaseY - this.jumpHeight * (1 - t);
                    // Устанавливаем положительное vy по мере падения чтобы коллизия сработала
                    this.vy = t * 2; // от 0 к 2
                } else {
                    this.isJumping = false;
                    this.jumpTimer = 0;
                    this.y = this.jumpBaseY;
                    this.vy = 1; // Положительное значение для коллизии с платформой
                }
            } else if (this.jumpStyle === 'dron') {
                // Физический прыжок с мгновенным бустом при удержании
                const half = this.jumpDuration / 2;
                if (this.jumpTimer <= half && keys["ArrowUp"]) {
                    this.jumpHoldTimer = Math.min(this.jumpHoldMax, this.jumpHoldTimer + dt);
                    const k = this.jumpHoldTimer / this.jumpHoldMax;
                    const desiredPeak = this.jumpMinHeight + (this.jumpMaxHeight - this.jumpMinHeight) * k;
                    const desiredV0 = 2 * desiredPeak;
                    if (-this.vy < desiredV0) this.vy = -desiredV0;
                }
                this.vy += this.gravity * dt;
                this.y += this.vy * dt;
                // В режиме платформ приземление обработается ниже через коллизию с платформами
                if (gameMode !== 'platforms' && this.y >= this.jumpBaseY) {
                    this.y = this.jumpBaseY;
                    this.vy = 0;
                    this.isJumping = false;
                    this.jumpTimer = 0;
                    this.jumpHoldTimer = 0;
                }
            } else {
                // 'kuzy' — плавный набор скорости: постепенно приближаем vy к целевому
                const half = this.jumpDuration / 2;
                if (this.jumpTimer <= half && keys["ArrowUp"]) {
                    this.jumpHoldTimer = Math.min(this.jumpHoldMax, this.jumpHoldTimer + dt);
                    const k = this.jumpHoldTimer / this.jumpHoldMax;
                    const desiredPeak = this.jumpMinHeight + (this.jumpMaxHeight - this.jumpMinHeight) * k;
                    const desiredV0 = 2 * desiredPeak;
                    const desiredVy = -desiredV0;
                    // Плавно приближаем vy к целевому
                    this.vy += (desiredVy - this.vy) * Math.min(1, this.jumpRampFactor * dt);
                }
                this.vy += this.gravity * dt;
                this.y += this.vy * dt;
                // В режиме платформ приземление обработается ниже через коллизию с платформами
                if (gameMode !== 'platforms' && this.y >= this.jumpBaseY) {
                    this.y = this.jumpBaseY;
                    this.vy = 0;
                    this.isJumping = false;
                    this.jumpTimer = 0;
                    this.jumpHoldTimer = 0;
                }
            }
        }
        
        // Физика в режиме платформ
        if (gameMode === 'platforms') {
            // Проверяем, стоим ли мы на платформе
            let onPlatform = false;
            let currentPlatform = null;
            
            // Проверяем каждую платформу; p — объект платформы
            platforms.forEach(p => {
                // Проверка по вертикали - стоим ли на платформе по высоте
                if (this.y + this.h >= p.y + 25 && this.y + this.h <= p.y + 35) {
                    // Проверяем, находится ли ЦЕНТР игрока над платформой
                    const playerCenterX = this.x + this.w / 2;
                    const platformLeftEdge = p.x;
                    const platformRightEdge = p.x + p.w;
                    
                    if (playerCenterX >= platformLeftEdge && playerCenterX <= platformRightEdge) {
                        onPlatform = true;
                        currentPlatform = p;
                        this.onPlatform = true; // Сохраняем для проверки прыжка
                    }
                }
            });
            
            // Применяем гравитацию только если НЕ на платформе
            if (!onPlatform) {
                // В воздухе - если не прыгаем, применяем гравитацию падения
                if (!this.isJumping) {
                    this.vy += 800 * dt;
                    this.y += this.vy * dt;
                }
                // Если прыгаем, то логика прыжков выше уже обработала физику
                // Сбрасываем onPlatform только если не в воздухе и не прыгаем
                if (!this.isJumping) {
                    this.onPlatform = false;
                }
            } else if (currentPlatform) {
                // Игрок стоит на платформе
                if (!this.isJumping) {
                    // Только корректируем позицию если не прыгаем
                    this.y = currentPlatform.y - this.h + 30;
                    this.vy = 0;
                    this.jumpBaseY = this.y; // Обновляем базовую позицию для следующего прыжка
                }
                // Двигаем игрока вместе с платформой по горизонтали
                if (currentPlatform.movePattern === 'horizontal') {
                    const platformDeltaX = currentPlatform.x - currentPlatform.prevX;
                    this.x += platformDeltaX;
                }
            }
            
            // Проверка столкновения с платформами при падении
            // Проверяем каждую платформу для приземления; p — объект платформы
            platforms.forEach(p => {
                // Проверяем центр игрока для приземления
                const playerCenterX = this.x + this.w / 2;
                const platformLeftEdge = p.x;
                const platformRightEdge = p.x + p.w;
                
                // Игрок падает сверху на платформу (центр должен быть над платформой)
                if (this.vy >= 0 && 
                    playerCenterX >= platformLeftEdge && 
                    playerCenterX <= platformRightEdge &&
                    this.y + this.h >= p.y && 
                    this.y + this.h <= p.y + 40) {
                    this.y = p.y - this.h + 30;
                    this.vy = 0;
                    this.isJumping = false;
                    this.jumpTimer = 0;
                    this.jumpHoldTimer = 0;
                    this.jumpBaseY = this.y;
                    this.onPlatform = true;
                }
            });
            
            // Проверка выхода за нижнюю границу (телепорт на homePlatform с потерей жизни)
            if (this.y > canvas.height) {
                lives--;
                combo = 0;
                if (lives <= 0) {
                    showGameOver();
                } else {
                    // Телепорт на homePlatform в центр
                    if (homePlatform) {
                        this.x = homePlatform.x + (homePlatform.w - this.w) / 2;
                        this.y = homePlatform.y - this.h;
                    } else {
                    // Запасной вариант, если нет homePlatform
                        this.x = canvas.width / 2 - this.w / 2;
                        this.y = canvas.height / 2;
                    }
                    this.vy = 0;
                    this.isJumping = false;
                    invuln = INVULN_TIME;
                }
            }
        }
    }
    /**
     * Отрисовывает спрайт игрока на canvas
     */
    /**
     * Отрисовывает игрока на холсте canvas с учетом состояния.
     */
    draw() {
        // В режиме платформ: если не на платформе и не прыгаем = падаем
        const isFalling = (gameMode === 'platforms') && !this.onPlatform && !this.isJumping;
        
        // Определяем какой спрайт использовать
        let useShootFiles = false; // флаг для использования отдельных файлов стрельбы
        let useShootUpFiles = false; // флаг для использования отдельных файлов стрельбы вверх
        let currentSprite = kuzyImg;
        let spriteIsReady = spriteReady;
        
        if ((this.isJumping || isFalling) && this.shooting) {
            // Прыжок/падение со стрельбой
            if (playerBulletDir === 'up') {
                // Стрельба вверх в прыжке/падении - используем отдельные файлы 5-6
                useShootUpFiles = true;
                spriteIsReady = (shootUpSpritesReady === 7);
            } else {
                // Стрельба влево/вправо в прыжке/падении
                currentSprite = kuzyJumpImg;
                spriteIsReady = jumpSpriteReady;
            }
        } else if ((this.isJumping || isFalling) && !this.shooting) {
            // Прыжок/падение без стрельбы
            currentSprite = kuzyJumpImg;
            spriteIsReady = jumpSpriteReady;
        } else if (!this.isJumping && this.shooting) {
            // Стрельба без прыжка
            if (playerBulletDir === 'up') {
                // Стрельба вверх - используем отдельные файлы 0-4
                useShootUpFiles = true;
                spriteIsReady = (shootUpSpritesReady === 7);
            } else {
                // Стрельба влево/вправо - используем отдельные файлы
                useShootFiles = true;
                spriteIsReady = (shootSpritesReady === 5);
            }
        }
        // Иначе используется обычный спрайт ходьбы (kuzyImg)
        
        if (!spriteIsReady) return;
        
        ctx.save();
        
        // Отзеркаливаем спрайт если игрок смотрит влево
        if (this.facingDir === 'left') {
            // Переворачиваем по горизонтали
            ctx.translate(this.x + this.w, this.y);
            ctx.scale(-1, 1);
            
            if (useShootFiles) {
                // Используем отдельный файл по индексу кадра
                const shootFrame = Math.min(this.frame, 4); // ограничиваем 0-4
                ctx.drawImage(
                    kuzyShootImgs[shootFrame],
                    0,
                    0,
                    this.w,
                    this.h
                );
            } else if (useShootUpFiles) {
                // Стрельба вверх (не зеркалится)
                // Если в прыжке/падении - кадры 5-6, иначе 0-4
                let shootFrame = this.frame;
                if (this.isJumping || isFalling) {
                    shootFrame = Math.max(5, Math.min(this.frame, 6)); // ограничиваем 5-6
                } else {
                    shootFrame = Math.min(this.frame, 4); // ограничиваем 0-4
                }
                ctx.drawImage(
                    kuzyShootUpImgs[shootFrame],
                    0,
                    0,
                    this.w,
                    this.h
                );
            } else {
                ctx.drawImage(
                    currentSprite,
                    this.frame * FRAME_W,
                    0,
                    FRAME_W,
                    FRAME_H,
                    0,
                    0,
                    this.w,
                    this.h
                );
            }
        } else {
            // Обычное отображение (вправо или вверх)
            if (useShootFiles) {
                // Используем отдельный файл по индексу кадра
                const shootFrame = Math.min(this.frame, 4); // ограничиваем 0-4
                ctx.drawImage(
                    kuzyShootImgs[shootFrame],
                    this.x,
                    this.y,
                    this.w,
                    this.h
                );
            } else if (useShootUpFiles) {
                // Стрельба вверх
                // Если в прыжке/падении - кадры 5-6, иначе 0-4
                let shootFrame = this.frame;
                if (this.isJumping || isFalling) {
                    shootFrame = Math.max(5, Math.min(this.frame, 6)); // ограничиваем 5-6
                } else {
                    shootFrame = Math.min(this.frame, 4); // ограничиваем 0-4
                }
                ctx.drawImage(
                    kuzyShootUpImgs[shootFrame],
                    this.x,
                    this.y,
                    this.w,
                    this.h
                );
            } else {
                ctx.drawImage(
                    currentSprite,
                    this.frame * FRAME_W,
                    0,
                    FRAME_W,
                    FRAME_H,
                    this.x,
                    this.y,
                    this.w,
                    this.h
                );
            }
        }
        
        ctx.restore();
    }
}




