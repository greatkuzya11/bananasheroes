// Константы игры
export const FRAME_W = 256;
export const FRAME_H = 256;
export const WALK_START = 1;
export const WALK_END = 4;
export const SHOOT_FRAME = 5;

export const PLAYER_SPEED = 7;
export const PLAYER_SHOOT_COOLDOWN = 333;
export const PLAYER_SIZE_RATIO = 0.2;

export const ENEMY_ROWS = 3;
export const ENEMY_COLS = 7;
export const ENEMY_SIZE_RATIO = 0.1;
export const ENEMY_SPEED = 1.2;
export const ENEMY_DROP = 20;
export const ENEMY_DIVE_SPEED = 4;
export const ENEMY_DIVE_CHANCE = 0.002;
export const ENEMY_SHOOT_CHANCE = 0.005;
export const ENEMY_SHOOT_COOLDOWN = 1;

export const BOTTLE_DROP_CHANCE = 0.1;
export const BOTTLE_BONUS_SHOTS = 3;

export const INITIAL_LIVES = 5;
export const INITIAL_INVULN = 3;
export const HIT_INVULN = 2;

export const BACKGROUND_COLOR = "#a2c9e2";

export const CHARACTER_STATS = {
    dron: { radius: 14, speed: 9, color: "#66ccff" },
    max: { radius: 8, speed: 8, color: "#222" },
    kuzy: { radius: 18, speed: 5, color: "#333" }
};

export const BONUS_MULTIPLIER = 1.8;
export const BONUS_COLOR = "gold";