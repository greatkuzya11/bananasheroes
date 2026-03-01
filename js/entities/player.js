// ==== КЛАСС ИГРОКА ====
/**
 * Игрок: хранит состояние, управляет движением, прыжком и отрисовкой.
 */
class Player {
    /**
     * Создает игрока выбранного типа.
     * @param {string} type - идентификатор персонажа ('kuzy', 'max', 'dron').
     */
    constructor(type, spriteSystem) {
        this.spriteSystem = spriteSystem || type;
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
        // Стиль прыжка по персонажу: 'max' = баллистика как в режиме "Бегун", 'dron' = физика с мгновенным бустом, 'kuzy' = физика с плавным набором скорости
        this.jumpStyle = (type === 'max') ? 'max' : (type === 'dron') ? 'dron' : 'kuzy';
        this.jumpRampFactor = (type === 'kuzy') ? 4.0 : 6.0; // меньше = плавнее для 'kuzy'
        // Направление взгляда для зеркалирования спрайта: 'left' или 'right'
        this.facingDir = 'right';
        // Режим платформ: флаг стояния на платформе (для проверки прыжка)
        this.onPlatform = false;
        // Кэш alpha-масок для коллизий мяча/пуль по непрозрачной части спрайта.
        this.maskCache = new Map();
        // Эффективная ширина спрайта для коллизий: для Кузи сужена из-за прозрачных полей
        // Спрайты Кузи 900x900, но контент примерно 60% ширины (слева/справа ~20% прозрачных полей)
        this.effectiveW = (this.spriteSystem === 'kuzy') ? this.w * 0.6 : this.w;
        // PNG Sequences анимация для Кузи
        this.kAnim = 'idle';
        this.kFrame = 0;
        this.kTimer = 0;
        this.kDying = false;
        // PNG анимация для Макса
        this.mAnim = 'walk';
        this.mFrame = 0;
        this.mTimer = 0;
        this.mLcActive = false;   // пинг-понг при levelComplete
        this.mLcCyclesDone = 0;   // сколько циклов сыграно (5 = стоп)
        this.mLcDir = 1;          // 1 = вперёд, -1 = назад
    }
        /**
     * Обновляет движение, анимацию и стрельбу игрока.
     * @param {number} dt - прошедшее время кадра в секундах.
     */
    update(dt) {
        const nosokMoveMul = (gameMode === 'nosok') ? 1.5 : 1;
        const nosokJumpMul = (gameMode === 'nosok') ? 1.5 : 1;
        const adaptiveCombat = (typeof isMobileAdaptiveCombatMode === 'function') && isMobileAdaptiveCombatMode(gameMode);
        const adaptiveScale = adaptiveCombat && (typeof getMobileLandscapeAdaptiveScale === 'function')
            ? getMobileLandscapeAdaptiveScale()
            : 1;
        // В desktop сохраняем историческую "покадровую" скорость.
        // В mobile landscape для адаптируемых режимов переводим в dt + масштаб.
        const moveMul = adaptiveCombat ? (dt * 60 * adaptiveScale) : 1;
        // Альтернативный режим стрельбы: стрелки меняют направление
        if (altShootMode) {
            if (keys["ArrowLeft"]) {
                playerBulletDir = 'left';
                this.facingDir = 'left';
                this.x -= this.speed * nosokMoveMul * moveMul;
            }
            if (keys["ArrowRight"]) {
                playerBulletDir = 'right';
                this.facingDir = 'right';
                this.x += this.speed * nosokMoveMul * moveMul;
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
                this.x -= this.speed * nosokMoveMul * moveMul;
            }
            if (keys["ArrowRight"]) {
                this.x += this.speed * nosokMoveMul * moveMul;
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
                // Баллистический прыжок Макса (как в "Бегуне"):
                // фиксированная высота, ускоренная версия в "Носке" через nosokJumpMul.
                this.gravity = canvas.height * 2.45 * nosokJumpMul * nosokJumpMul;
                this.jumpHeight = Math.max(this.jumpMaxHeight, canvas.height * 0.28);
                this.vy = -Math.sqrt(2 * this.gravity * this.jumpHeight);
            } else {
                // физические стили: задаем гравитацию и стартовую скорость вверх по минимальной высоте
                this.gravity = 2 * this.jumpMaxHeight * nosokJumpMul * nosokJumpMul;
                const v0 = 2 * this.jumpMinHeight * nosokJumpMul;
                this.vy = -v0;
            }
            if (window.BHAudio) {
                window.BHAudio.play('player_jump', { volumeMul: 0.9 });
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
                // Баллистика без удержания: подъем/спуск считаются через vy + gravity.
                this.vy += this.gravity * dt;
                this.y += this.vy * dt;
                // В режиме платформ приземление обработается ниже через коллизию с платформами.
                if (gameMode !== 'platforms' && this.y >= this.jumpBaseY) {
                    this.y = this.jumpBaseY;
                    this.vy = 0;
                    this.isJumping = false;
                    this.jumpTimer = 0;
                    this.jumpHoldTimer = 0;
                    if (window.BHAudio) {
                        window.BHAudio.play('player_land', { volumeMul: 0.8 });
                    }
                }
            } else if (this.jumpStyle === 'dron') {
                // Физический прыжок с мгновенным бустом при удержании
                const half = this.jumpDuration / 2;
                if (this.jumpTimer <= half && keys["ArrowUp"]) {
                    this.jumpHoldTimer = Math.min(this.jumpHoldMax, this.jumpHoldTimer + dt);
                    const k = this.jumpHoldTimer / this.jumpHoldMax;
                    const desiredPeak = this.jumpMinHeight + (this.jumpMaxHeight - this.jumpMinHeight) * k;
                    const desiredV0 = 2 * desiredPeak * nosokJumpMul;
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
                    if (window.BHAudio) {
                        window.BHAudio.play('player_land', { volumeMul: 0.8 });
                    }
                }
            } else {
                // 'kuzy' — плавный набор скорости: постепенно приближаем vy к целевому
                const half = this.jumpDuration / 2;
                if (this.jumpTimer <= half && keys["ArrowUp"]) {
                    this.jumpHoldTimer = Math.min(this.jumpHoldMax, this.jumpHoldTimer + dt);
                    const k = this.jumpHoldTimer / this.jumpHoldMax;
                    const desiredPeak = this.jumpMinHeight + (this.jumpMaxHeight - this.jumpMinHeight) * k;
                    const desiredV0 = 2 * desiredPeak * nosokJumpMul;
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
                    if (window.BHAudio) {
                        window.BHAudio.play('player_land', { volumeMul: 0.8 });
                    }
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
                    const wasJumping = this.isJumping;
                    this.y = p.y - this.h + 30;
                    this.vy = 0;
                    this.isJumping = false;
                    this.jumpTimer = 0;
                    this.jumpHoldTimer = 0;
                    this.jumpBaseY = this.y;
                    this.onPlatform = true;
                    if (wasJumping && window.BHAudio) {
                        window.BHAudio.play('player_land', { volumeMul: 0.8 });
                    }
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
        // Обновляем анимацию по выбранной системе спрайтов (не в режиме runner — там своя логика)
        if (this.spriteSystem === 'kuzy' && gameMode !== 'runner') {
            const isMovingH = keys['ArrowLeft'] || keys['ArrowRight'];
            this._updateKuzyAnim(dt, null, false, isMovingH);
        }
        if (this.spriteSystem === 'max' && gameMode !== 'runner') {
            const isMovingH = keys['ArrowLeft'] || keys['ArrowRight'];
            this._updateMaxAnim(dt, isMovingH);
        }
    }

    /**
     * Обновляет покадровую анимацию PNG Sequences для персонажа Кузя.
     * @param {number} dt - время кадра
     * @param {boolean|null} forceInAir - явно задать «в воздухе», null = авто
     * @param {boolean} isRunning - true в режиме runner (бег вместо ходьбы)
     * @param {boolean} movingHoriz - игрок движется по горизонтали
     */
    _updateKuzyAnim(dt, forceInAir, isRunning, movingHoriz) {
        const isFallingPlatform = (gameMode === 'platforms') && !this.onPlatform && !this.isJumping;
        const inAir = (forceInAir !== null && forceInAir !== undefined)
            ? forceInAir
            : (this.isJumping || isFallingPlatform);

        let target;
        if (this.kDying) {
            target = 'dying';
        } else if (invuln > 0 && invuln < INVULN_TIME) {
            target = 'hurt';
        } else if (inAir && this.shooting) {
            target = 'throwAir';
        } else if (inAir) {
            // Падение вниз — используем fallDown, иначе jumpStart/jumpLoop
            const fallingDown = isFallingPlatform || (this.vy !== undefined && this.vy > 80);
            if (fallingDown) {
                target = 'fallDown';
            } else if (this.jumpTimer < 0.25) {
                target = 'jumpStart';
            } else {
                target = 'jumpLoop';
            }
        } else if (movingHoriz && this.shooting && isRunning) {
            target = 'runThrow';
        } else if (this.shooting) {
            target = 'throw';
        } else if (movingHoriz && isRunning) {
            target = 'run';
        } else if (movingHoriz) {
            target = 'walk';
        } else {
            target = 'idle';
        }

        if (target !== this.kAnim) {
            this.kAnim = target;
            this.kFrame = 0;
            this.kTimer = 0;
        }

        // Для ходьбы и бега более частая смена кадров, чтобы не было эффекта скольжения
        // Для стрельбы ускоряем в 5 раз, чтобы анимация успевала за пулями
        const fps = (this.kAnim === 'walk' || this.kAnim === 'run') ? 100
                  : (this.kAnim === 'throw' || this.kAnim === 'throwAir' || this.kAnim === 'runThrow') ? 30
                  : 12;
        this.kTimer += dt;
        if (this.kTimer >= 1 / fps) {
            this.kTimer -= 1 / fps;
            const def = kuzyAnimDefs[this.kAnim];
            const count = def ? def.count : 1;
            // Dying останавливается на последнем кадре
            if (this.kAnim === 'dying') {
                this.kFrame = Math.min(this.kFrame + 1, count - 1);
            } else {
                this.kFrame = (this.kFrame + 1) % count;
            }
        }
    }

    /**
     * Обновляет покадровую анимацию PNG для персонажа Макс.
     * @param {number} dt - время кадра
     * @param {boolean} movingHoriz - игрок движется по горизонтали
     */
    _updateMaxAnim(dt, movingHoriz) {
        if (this.mLcActive) {
            // Пинг-понг анимация levelComplete: 10fps, 5 циклов
            const fps = 10;
            this.mAnim = 'levelComplete';
            this.mTimer += dt;
            if (this.mTimer >= 1 / fps) {
                this.mTimer -= 1 / fps;
                this.mFrame += this.mLcDir;
                const len = maxAnims.levelComplete.length;
                if (this.mFrame >= len) {
                    this.mFrame = len - 2;
                    this.mLcDir = -1;
                } else if (this.mFrame < 0) {
                    this.mFrame = 1;
                    this.mLcDir = 1;
                    this.mLcCyclesDone++;
                    if (this.mLcCyclesDone >= 5) {
                        this.mLcActive = false;
                        this.mFrame = 0;
                    }
                }
            }
            return;
        }

        const inAir = this.isJumping || ((gameMode === 'platforms') && !this.onPlatform && !this.isJumping);
        let target;
        if (inAir && this.shooting) {
            target = 'shootOnJump';
        } else if (inAir) {
            target = 'jump';
        } else if (this.shooting && playerBulletDir === 'up') {
            target = 'shootUpStand'; // стрельба вверх стоя или в движении
        } else if (this.shooting && !movingHoriz) {
            target = 'shootOnStand'; // стрельба влево/вправо стоя на месте
        } else if (this.shooting) {
            target = 'shootOnWalk'; // стрельба влево/вправо в движении
        } else {
            target = 'walk'; // idle реализован первым кадром walk
        }

        if (target !== this.mAnim) {
            this.mAnim = target;
            this.mFrame = 0;
            this.mTimer = 0;
        }

        const fps = (this.mAnim === 'walk' || this.mAnim === 'shootOnWalk') ? 20 : 15;
        this.mTimer += dt;
        if (this.mTimer >= 1 / fps) {
            this.mTimer -= 1 / fps;
            const frames = maxAnims[this.mAnim];
            const count = frames ? frames.length : 1;
            if (!movingHoriz && this.mAnim === 'walk') {
                // Idle — стоим на первом кадре
                this.mFrame = 0;
            } else {
                this.mFrame = (this.mFrame + 1) % count;
            }
        }
    }

    /**
     * Возвращает параметры текущего кадра для alpha-коллизии.
     * @returns {{
     *   img:HTMLImageElement,
     *   direct:boolean,
     *   sx:number,
     *   sy:number,
     *   sw:number,
     *   sh:number
     * }|null}
     */
    getCollisionSpriteInfo() {
        // Кузя: используем текущий кадр PNG Sequences анимации
        if (this.spriteSystem === 'kuzy') {
            const frames = kuzyAnims[this.kAnim];
            if (!frames || !frames.length) return null;
            const img = frames[Math.min(this.kFrame, frames.length - 1)];
            if (!img || !img.complete || !img.naturalWidth) return null;
            return { img, direct: true, sx: 0, sy: 0, sw: 0, sh: 0 };
        }
        // Макс: используем текущий кадр PNG анимации
        if (this.spriteSystem === 'max') {
            const frames = maxAnims[this.mAnim];
            if (!frames || !frames.length) return null;
            const img = frames[Math.min(this.mFrame, frames.length - 1)];
            if (!img || !img.complete || !img.naturalWidth) return null;
            return { img, direct: true, sx: 0, sy: 0, sw: 0, sh: 0 };
        }
        const isFalling = (gameMode === 'platforms') && !this.onPlatform && !this.isJumping;
        let useShootFiles = false;
        let useShootUpFiles = false;
        let currentSprite = kuzyImg;
        let spriteIsReady = spriteReady;

        if ((this.isJumping || isFalling) && this.shooting) {
            if (playerBulletDir === 'up') {
                useShootUpFiles = true;
                spriteIsReady = (shootUpSpritesReady === 7);
            } else {
                currentSprite = kuzyJumpImg;
                spriteIsReady = jumpSpriteReady;
            }
        } else if ((this.isJumping || isFalling) && !this.shooting) {
            currentSprite = kuzyJumpImg;
            spriteIsReady = jumpSpriteReady;
        } else if (!this.isJumping && this.shooting) {
            if (playerBulletDir === 'up') {
                useShootUpFiles = true;
                spriteIsReady = (shootUpSpritesReady === 7);
            } else {
                useShootFiles = true;
                spriteIsReady = (shootSpritesReady === 5);
            }
        }

        if (!spriteIsReady) return null;

        if (useShootFiles) {
            const shootFrame = Math.min(this.frame, 4);
            return {
                img: kuzyShootImgs[shootFrame],
                direct: true,
                sx: 0,
                sy: 0,
                sw: 0,
                sh: 0
            };
        }

        if (useShootUpFiles) {
            let shootFrame = this.frame;
            if (this.isJumping || isFalling) {
                shootFrame = Math.max(5, Math.min(this.frame, 6));
            } else {
                shootFrame = Math.min(this.frame, 4);
            }
            return {
                img: kuzyShootUpImgs[shootFrame],
                direct: true,
                sx: 0,
                sy: 0,
                sw: 0,
                sh: 0
            };
        }

        return {
            img: currentSprite,
            direct: false,
            sx: this.frame * FRAME_W,
            sy: 0,
            sw: FRAME_W,
            sh: FRAME_H
        };
    }

    /**
     * Возвращает кэш alpha-маски текущего кадра (с учетом зеркалирования).
     * @returns {{data: Uint8ClampedArray, w: number, h: number}|null}
     */
    getCollisionMask() {
        const info = this.getCollisionSpriteInfo();
        if (!info || !info.img || !info.img.complete) return null;
        const flip = (this.facingDir === 'left') ? 'L' : 'R';
        const key = `${info.img.src}|${info.direct ? 'D' : `${info.sx}:${info.sy}:${info.sw}:${info.sh}`}|${flip}|${Math.round(this.w)}|${Math.round(this.h)}`;
        if (this.maskCache.has(key)) return this.maskCache.get(key);

        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(this.w));
        c.height = Math.max(1, Math.round(this.h));
        const cctx = c.getContext('2d');
        cctx.clearRect(0, 0, c.width, c.height);

        if (this.facingDir === 'left') {
            cctx.save();
            cctx.translate(c.width, 0);
            cctx.scale(-1, 1);
            if (info.direct) {
                cctx.drawImage(info.img, 0, 0, c.width, c.height);
            } else {
                cctx.drawImage(info.img, info.sx, info.sy, info.sw, info.sh, 0, 0, c.width, c.height);
            }
            cctx.restore();
        } else if (info.direct) {
            cctx.drawImage(info.img, 0, 0, c.width, c.height);
        } else {
            cctx.drawImage(info.img, info.sx, info.sy, info.sw, info.sh, 0, 0, c.width, c.height);
        }

        const id = cctx.getImageData(0, 0, c.width, c.height);
        const mask = { data: id.data, w: c.width, h: c.height };
        if (this.maskCache.size > 40) this.maskCache.clear();
        this.maskCache.set(key, mask);
        return mask;
    }

    /**
     * Проверяет непрозрачность пикселя спрайта игрока в мировой точке.
     * @param {number} wx - мировая координата X.
     * @param {number} wy - мировая координата Y.
     * @returns {boolean}
     */
    isOpaqueAtWorld(wx, wy) {
        if (wx < this.x || wy < this.y || wx >= this.x + this.w || wy >= this.y + this.h) return false;
        const mask = this.getCollisionMask();
        if (!mask) return false;
        const lx = Math.max(0, Math.min(mask.w - 1, Math.floor(wx - this.x)));
        const ly = Math.max(0, Math.min(mask.h - 1, Math.floor(wy - this.y)));
        const a = mask.data[(ly * mask.w + lx) * 4 + 3];
        return a > 24;
    }

    /**
     * Отрисовывает игрока на холсте canvas с учетом состояния.
     */
    draw() {
        // Кузя: отрисовка через PNG Sequences кадры
        if (this.spriteSystem === 'kuzy') {
            const frames = kuzyAnims[this.kAnim];
            if (!frames || !frames.length) return;
            const img = frames[Math.min(this.kFrame, frames.length - 1)];
            if (!img || !img.complete || !img.naturalWidth) return;
            // Спрайты PNG Sequences имеют прозрачное поле снизу (~11% высоты).
            // Сдвигаем отрисовку вниз, чтобы ноги совпадали с землёй/платформой.
            const PAD_BOTTOM = 99 / 900;
            const drawY = this.y + this.h * PAD_BOTTOM;
            ctx.save();
            if (this.facingDir === 'left') {
                ctx.translate(this.x + this.w, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, this.w, this.h);
            } else {
                ctx.drawImage(img, this.x, drawY, this.w, this.h);
            }
            ctx.restore();
            return;
        }
        // Макс: отрисовка через PNG анимации
        if (this.spriteSystem === 'max') {
            const frames = maxAnims[this.mAnim];
            if (!frames || !frames.length) return;
            const img = frames[Math.min(this.mFrame, frames.length - 1)];
            if (!img || !img.complete || !img.naturalWidth) return;
            ctx.save();
            if (this.facingDir === 'left') {
                ctx.translate(this.x + this.w, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, this.w, this.h);
            } else {
                ctx.drawImage(img, this.x, this.y, this.w, this.h);
            }
            ctx.restore();
            return;
        }
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

    /**
     * Запускает пинг-понг анимацию levelComplete для Макса.
     */
    triggerLevelComplete() {
        if (this.spriteSystem !== 'max') return;
        this.mLcActive = true;
        this.mLcCyclesDone = 0;
        this.mLcDir = 1;
        this.mFrame = 0;
        this.mAnim = 'levelComplete';
        this.mTimer = 0;
    }
}




