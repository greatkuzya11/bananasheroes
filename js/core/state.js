// Глобальное изменяемое состояние игры
let canvas = null;
let ctx = null;

let keys = {};
let bullets = [];
let enemyBullets = [];
let enemies = [];
let bottles = [];
let hearts = [];
let platforms = [];

let player = null;
let boss = null;
let enemy67 = null;
let bossO4ko = null;

let bossDefeated = false;
let score = 0;
let combo = 0;
let lives = PLAYER_LIVES;
let invuln = INVULN_TIME;
let bonusShots = 0;
let bonusMode = false;

let playerBulletDir = 'up';
let dirSwitchHeld = false;
let altShootMode = false;
let ctrlHeld = false;

let gameMode = 'normal';
let selectedChar = 'kuzy';

let homePlatform = null;
let bossPlatform = null;
let platform67HitCount = 0;
let platformPlayerLastX = 0;
let platformInactivityTimer = 0;
let platformRuby = null;
let platformCup = null;

let killCount = 0;
let survivalEnemySpeedIncrease = 0;
let survivalBulletSpeedIncrease = 0;
let survivalSpeedUps = 0;
let survivalBulletMultiplier = 1;
let survivalWaveSpawning = false;

let speechBalloons = [];
let explosions = [];

let running = false;
let paused = false;
let levelCompleteShown = false;
let gameOverShown = false;
let last = 0;

let hudEl = null;
let lastHudHtml = '';
let lastHudLives = -1;
let cachedLivesStr = '';

let bukinTablet = null;
let modes = null;
