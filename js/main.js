document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    function resize(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.75;
    }
    window.addEventListener('resize', resize);
    resize();

    let keys = {};
    let bullets = [];
    let enemyBullets = [];
    let enemies = [];
    let bottles = [];
    let player;

    let score = 0;
    let combo = 0;
    let lives = 5;
    let invuln = 3;
    let bonusShots = 0;
    let bonusMode = false;

    // ===== KUZY SPRITE =====
    const kuzyImg = new Image();
    let spriteReady = false;

    kuzyImg.onload = () => spriteReady = true;
    kuzyImg.src = "img/kuzy.png";

    const FRAME_W = 256;
    const FRAME_H = 256;

    const WALK_START = 1;
    const WALK_END = 4;
    const SHOOT_FRAME = 5;

    // ---------- PLAYER ----------
    class Player{
        constructor(type){
            this.type = type;
            this.w = canvas.height * 0.2;
            this.h = this.w;
            this.x = canvas.width/2 - this.w/2;
            this.y = canvas.height - this.h - 20;
            this.speed = 7;
            this.lastShot = 0;
            this.frame = 0;
            this.timer = 0;
            this.shooting = false;
            this.shootTimer = 0;
        }
        update(){
            if(keys["ArrowLeft"]) this.x -= this.speed;
            if(keys["ArrowRight"]) this.x += this.speed;
            this.x = Math.max(10, Math.min(canvas.width-this.w-10, this.x));

            if(keys[" "] && performance.now()-this.lastShot>333){
                this.lastShot = performance.now();
                shootPlayerBullet(this);
            }

            let moving = false;

            if(keys["ArrowLeft"] || keys["ArrowRight"]){
                moving = true;
            }

            if(this.shooting){
                this.shootTimer += 0.016;
                if(this.shootTimer > 0.15){
                    this.shooting = false;
                    this.frame = 0;
                }
            }
            else if(moving){
                this.timer += 0.016;
                if(this.timer > 0.12){
                    this.frame++;
                    if(this.frame > WALK_END) this.frame = WALK_START;
                    this.timer = 0;
                }
            }
            else{
                this.frame = 0;
            }
        }
        draw(){
            if(!spriteReady) return;

            ctx.drawImage(
                kuzyImg,
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

    // ---------- BULLETS ----------
    function shootPlayerBullet(p){
        let r = 8, speed = 8, color="#222";

        if(p.type==="dron"){ r=14; speed=9; color="#66ccff"; }
        if(p.type==="max"){ r=8; speed=8; color="#222"; }
        if(p.type==="kuzy"){ r=18; speed=5; color="#333"; }

        if(bonusMode && bonusShots>0){
            r *= 1.8;
            speed *= 1.8;
            color = "gold";
            bonusShots--;
        }

        bullets.push({x:p.x+p.w/2,y:p.y,r,speed,color});
    }

    // ---------- ENEMIES ----------
    function spawnEnemies(){
        enemies=[];
        for(let r=0;r<3;r++){
            for(let c=0;c<7;c++){
                enemies.push({
                    x:100+c*120,
                    y:60+r*100,
                    w:canvas.height*0.1,
                    h:canvas.height*0.1,
                    dir:1,
                    diving:false,
                    targetX:0,
                    shootTimer:0
                });
            }
        }
    }

    function drawLilac(x,y,size){
        for(let i=0;i<6;i++){
            ctx.fillStyle = ["#b57edc","#c084fc","#a855f7"][i%3];
            ctx.beginPath();
            ctx.arc(x + Math.cos(i)*size*0.3, y + Math.sin(i)*size*0.3, size*0.25, 0, Math.PI*2);
            ctx.fill();
        }
    }

    // ---------- HELPERS ----------
    function rect(a,b){
        return a.x < b.x+b.w &&
            a.x+a.w > b.x &&
            a.y < b.y+b.h &&
            a.y+a.h > b.y;
    }

    // ---------- GAME LOOP ----------
    function update(dt){
        if(invuln>0) invuln-=dt;

        player.update(dt);

        bullets.forEach(b=>b.y-=b.speed);
        enemyBullets.forEach(b=>b.y+=4);
        bottles.forEach(b=>{
            b.y+=2;
            b.x += Math.sin(b.y/20)*1.5;
        });

        bullets = bullets.filter(b=>b.y>0);
        enemyBullets = enemyBullets.filter(b=>b.y<canvas.height);
        bottles = bottles.filter(b=>b.y<canvas.height);

        enemies.forEach(e=>{
            if(!e.diving){
                e.x += e.dir*1.2;
                if(e.x<0 || e.x+e.w>canvas.width){
                    e.dir*=-1;
                    e.y+=20;
                }
                if(Math.random()<0.002){
                    e.diving=true;
                    e.targetX = player.x + player.w/2;
                }
            } else {
                e.y+=4;
                e.x += (e.targetX-e.x)*0.02;
                if(e.y > player.y - e.h){
                    e.diving=false;
                    e.y=60;
                }
            }

            e.shootTimer+=dt;

            // Рандомная стрельба врагов с вероятностью 1/3
            if(Math.random() < 0.005 && e.shootTimer > 1){  
                e.shootTimer = 0;
                enemyBullets.push({x:e.x + e.w / 2, y:e.y + e.h, w:8, h:12});
            }
        });

        // hits
        bullets.forEach((b,bi)=>{
            enemies.forEach((e,ei)=>{
                if(b.x>e.x && b.x<e.x+e.w &&
                   b.y>e.y && b.y<e.y+e.h){
                    enemies.splice(ei,1);
                    bullets.splice(bi,1);
                    score++;
                    combo++;
                    if(Math.random()<0.1){
                        bottles.push({x:e.x,y:e.y,w:18,h:36});
                    }
                }
            });
        });

        bottles.forEach((b,bi)=>{
            if(rect(b,player)){
                bonusShots += 3;
                bottles.splice(bi,1);
            }
        });

        enemyBullets.forEach((eb,ei)=>{
            if(rect(eb,player) && invuln<=0){
                lives--;
                combo=0;
                invuln=2;
                enemyBullets.splice(ei,1);
            }
        });

        document.getElementById('hud').innerText =
            `Жизни: ${"❤️".repeat(lives)}   Очки: ${score}   Комбо: ${combo}   Бонус: ${bonusShots}`;
    }

    function draw(){
        ctx.fillStyle = "#a2c9e2";  // Нежно голубой фон
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        player.draw();

        bullets.forEach(b=>{
            ctx.fillStyle=b.color;
            ctx.beginPath();
            ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
            ctx.fill();
        });

        enemyBullets.forEach(b=>{
            ctx.fillStyle="green";
            ctx.fillRect(b.x,b.y,b.w,b.h);
        });

        bottles.forEach(b=>{
            ctx.fillStyle="#6b3e26";
            ctx.fillRect(b.x,b.y,b.w,b.h);
            ctx.fillStyle="#eee";
            ctx.fillRect(b.x+4,b.y+6,6,10);
        });

        enemies.forEach(e=>{
            drawLilac(e.x+e.w/2, e.y+e.h/2, e.w);
        });
    }

    let last=0;
    function loop(ts){
        const dt=(ts-last)/1000;
        last=ts;

        update(dt);
        draw();
        requestAnimationFrame(loop);
    }

    document.addEventListener('keydown',e=>{
        keys[e.key]=true;
        if(e.key==="Shift") bonusMode=!bonusMode;
    });
    document.addEventListener('keyup',e=>keys[e.key]=false);

    // MENU
    const chars = document.querySelectorAll('.char');
    const modes = document.getElementById('modes');

    let selectedChar = "kuzy";

    chars.forEach(c=>{
        c.onclick=()=>{
            selectedChar = c.dataset.char;
            modes.style.display = 'block'; // Открыть выбор режима после выбора персонажа
        };
    });

    document.querySelectorAll('.mode').forEach(m=>{
        m.onclick=()=>{
            document.getElementById('menu').style.display = 'none';
            document.getElementById('game').style.display = 'block';
            player = new Player(selectedChar);
            spawnEnemies();
            requestAnimationFrame(loop);
        };
    });
});
