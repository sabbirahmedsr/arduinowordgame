/* *********************************************************
   Module 1.0.0 : Core Game Engine
   Description: Optimized Engine with Arc Motion and Obstacle Burst
************************************************************/

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.ui = new UIController();
        this.particles = new ParticleSystem();
        this.assets = new AssetManager();
        this.parallax = new ParallaxBackground(this.canvas, this.ctx, this.assets);
        this.wordItem = new WordItem();

        this.serial = new SerialController(
            (letter) => this.handleLetterInput(letter),
            (rawData, decimalVal, mappedLetter) => this.ui.updateSerialHUD(rawData, decimalVal, mappedLetter)
        );

        this.words = [];
        this.currentWordIndex = 0;
        this.currentWord = "";

        this.currentLetterIndex = 0;
        this.worldDistance = 0;
        this.isWaitingAtObstacle = false;
        this.isTransitioning = false;
        this.fadeAlpha = 0;

        this.levelObstacleImages = [];
        this.hero = { x: 0, y: 0, width: 190, height: 270, speed: GameConfig.heroSpeed };

        this.handleResize();
        this.bindEvents();
    }

    setupWordData() {
        this.words = this.assets.config?.words || [
            { "word": "CAT", "image": "words/cat.png" }
        ];

        const firstWord = this.words[this.currentWordIndex];
        this.currentWord = (typeof firstWord === 'object') ? firstWord.word : firstWord;
    }

    nextWord() {
        if (this.words.length > 0) {
            this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
            const nextItem = this.words[this.currentWordIndex];
            this.currentWord = (typeof nextItem === 'object') ? nextItem.word : nextItem;
        }
    }

    handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.travelDistancePerObstacle = this.canvas.width * GameConfig.travelDistanceMultiplier;
        
        this.groundY = this.canvas.height * 0.7; 
        this.hero.height = 270;
        this.hero.width = 190;
        this.hero.y = this.groundY - this.hero.height + 15; 

        const quarterScreenWidth = this.canvas.width * 0.25;
        this.hero.x = quarterScreenWidth - this.hero.width;
    }

    initLevel() {
        // Clear lingering particles from previous level transition
        if (this.particles) {
            this.particles.clear();
        }
        
        this.currentLetterIndex = 0;
        this.worldDistance = 0;
        this.isWaitingAtObstacle = false;
        this.isTransitioning = false;
        this.targetObstacleDistance = this.travelDistancePerObstacle;

        const currentWordData = this.words[this.currentWordIndex];
        const relativePath = (typeof currentWordData === 'object') ? currentWordData.image : null;
        
        this.wordItem.setImage(relativePath ? this.assets.get(relativePath) : null);

        const availableObstacles = this.assets.config?.environment?.obstacle || [];
        this.levelObstacleImages = [];
        let previousIndex = -1;

        for (let i = 0; i < this.currentWord.length; i++) {
            if (availableObstacles.length === 0) break;

            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * availableObstacles.length);
            } while (randomIndex === previousIndex && availableObstacles.length > 1);

            previousIndex = randomIndex;
            this.levelObstacleImages.push(availableObstacles[randomIndex]);
        }

        const obstaclePositions = [];
        for (let i = 0; i < this.currentWord.length; i++) {
            const obsWorldX = ((i + 1) * this.travelDistancePerObstacle) + (this.canvas.width / 2);
            obstaclePositions.push(obsWorldX);
        }

        this.parallax.generateLevelTrees(obstaclePositions);
        this.ui.setupWordDisplay(this.currentWord);
    }

    bindEvents() {
        window.addEventListener('resize', () => this.handleResize());

        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                this.toggleSerialConnection();
                return;
            }

            if (GameConfig.allowKeyboardInput) {
                this.handleLetterInput(e.key.toUpperCase());
            }
        });

        const connectBtn = document.getElementById('connect-serial-btn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.toggleSerialConnection());
        }
    }

    async toggleSerialConnection() {
        if (this.serial.isConnected) {
            await this.serial.disconnect();
            this.ui.setSerialConnectedStatus(false);
        } else {
            const success = await this.serial.connect();
            if (success) {
                this.ui.setSerialConnectedStatus(true);
            }
        }
    }

    handleLetterInput(inputLetter) {
        if (!this.isWaitingAtObstacle || this.isTransitioning) return;

        const targetLetter = this.currentWord[this.currentLetterIndex];
        if (inputLetter === targetLetter) {
            this.handleCorrectInput();
        }
    }

    handleCorrectInput() {
        const obstacleWorldX = this.targetObstacleDistance + (this.canvas.width / 2);
        const screenX = obstacleWorldX - this.worldDistance;
        const badgeY = this.canvas.height * 0.30;

        // Badge Burst Effects
        this.particles.spawnExplosion(screenX, badgeY, '#ffffff', 25);
        this.particles.spawnExplosion(screenX, badgeY, '#ff4500', 35);
        this.particles.spawnExplosion(screenX, badgeY, '#ffd700', 25);

        // Dynamic Obstacle Burst Effect
        const currentObstaclePath = this.levelObstacleImages[this.currentLetterIndex];
        const obstacleImg = currentObstaclePath ? this.assets.get(currentObstaclePath) : null;
        this.particles.spawnObstacleBurst(screenX, this.groundY - 140, 140, 155, obstacleImg);

        this.ui.revealLetter(this.currentLetterIndex);

        this.isWaitingAtObstacle = false;
        this.currentLetterIndex++;
        this.targetObstacleDistance += this.travelDistancePerObstacle;

        // Calculate Next Obstacle World Position + Offset
        const nextObstacleWorldX = this.targetObstacleDistance + (this.canvas.width / 2);
        const offsetFromObstacle = 350;
        const nextWordItemWorldX = this.targetObstacleDistance + (this.canvas.width * 0.75);

        // Trigger Horizontal Speed Dash
        this.wordItem.triggerDash(nextWordItemWorldX);

        if (this.currentLetterIndex >= this.currentWord.length) {
            this.triggerAutoTransition();
        }
    }

    triggerAutoTransition() {
        this.isTransitioning = true;

        // 1. First trigger UI and Word Image center animations
        this.ui.triggerColorfulVictory(this.currentWord, () => {
            
            // 2. Breathing time: Wait while UI hint & Word Image are centered on screen
            const breathingDelay = 1500; // 1.2 seconds breathing time (adjust if needed)

            setTimeout(() => {
                // 3. Fade Out transition starts after the pause
                this.startFadeTransition(() => {
                    this.nextWord();
                    this.initLevel();
                });
            }, breathingDelay);

        });
    }

    startFadeTransition(onMidpointCallback) {
        let alpha = 0;
        const fadeInterval = setInterval(() => {
            alpha += 0.05;
            this.fadeAlpha = alpha;

            if (alpha >= 1) {
                clearInterval(fadeInterval);
                onMidpointCallback();
                
                const fadeInInterval = setInterval(() => {
                    alpha -= 0.05;
                    this.fadeAlpha = Math.max(0, alpha);
                    if (alpha <= 0) {
                        clearInterval(fadeInInterval);
                    }
                }, 30);
            }
        }, 30);
    }

    update() {
        if (!this.isWaitingAtObstacle && !this.isTransitioning) {
            this.worldDistance += this.hero.speed;

            if (this.worldDistance >= this.targetObstacleDistance) {
                this.isWaitingAtObstacle = true;
            }
        }

        const quarterScreenWidth = this.canvas.width * 0.25;
        this.hero.x = quarterScreenWidth - this.hero.width;

        this.particles.update();
    }

    drawObstacle() {
        if (this.currentLetterIndex >= this.currentWord.length) return;

        const requiredLetter = this.currentWord[this.currentLetterIndex];
        const obstacleWorldX = this.targetObstacleDistance + (this.canvas.width / 2);
        const screenX = obstacleWorldX - this.worldDistance;

        if (screenX > -200 && screenX < this.canvas.width + 200) {
            this.ctx.save();

            const currentObstaclePath = this.levelObstacleImages[this.currentLetterIndex];
            const obstacleImg = currentObstaclePath ? this.assets.get(currentObstaclePath) : null;

            let targetHeight = 155; 
            let targetWidth = 140;

            if (obstacleImg && obstacleImg.naturalHeight !== 0) {
                const aspectRatio = obstacleImg.naturalWidth / obstacleImg.naturalHeight;
                targetWidth = targetHeight * aspectRatio;
            }

            const obstacleY = this.groundY - targetHeight + 12;

            if (obstacleImg) {
                if (this.isWaitingAtObstacle) {
                    this.ctx.shadowColor = '#facc15';
                    this.ctx.shadowBlur = 20;
                }
                this.ctx.drawImage(
                    obstacleImg,
                    screenX - (targetWidth / 2),
                    obstacleY,
                    targetWidth,
                    targetHeight
                );
            }

            if (this.isWaitingAtObstacle) {
                const badgeY = this.canvas.height * 0.30; 
                const pulse = Math.sin(Date.now() / 150) * 6;
                const radius = 70 + pulse;

                this.ctx.shadowColor = '#f59e0b';
                this.ctx.shadowBlur = 30;
                
                const badgeGrad = this.ctx.createLinearGradient(0, badgeY - radius, 0, badgeY + radius);
                badgeGrad.addColorStop(0, '#ffffff');  
                badgeGrad.addColorStop(0.3, '#fef08a'); 
                badgeGrad.addColorStop(1, '#fde047');  

                this.ctx.fillStyle = badgeGrad;
                this.ctx.strokeStyle = '#f59e0b'; 
                this.ctx.lineWidth = 7;

                this.ctx.beginPath();
                this.ctx.arc(screenX, badgeY, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.shadowBlur = 0;
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(screenX, badgeY, radius - 8, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.fillStyle = '#78350f'; 
                this.ctx.font = '900 78px "Arial Black", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(requiredLetter, screenX, badgeY + 4);
            }

            this.ctx.restore();
        }
    }

    drawHero() {
        const playerConfig = this.assets.config?.player;
        let heroPath;
        let stateKey = 'idle';

        if (this.isTransitioning) {
            heroPath = playerConfig?.happy || playerConfig?.idle;
            stateKey = 'happy';
        } else if (this.isWaitingAtObstacle) {
            heroPath = playerConfig?.idle;
            stateKey = 'idle';
        } else {
            heroPath = playerConfig?.running;
            stateKey = 'running';
        }

        const img = heroPath ? this.assets.get(heroPath) : null;

        this.ctx.save();

        if (img && img.naturalHeight !== 0) {
            // Fetch state scale factor from JSON resources (default to 1.0)
            const scale = playerConfig?.scales?.[stateKey] || 1.0;

            // Calculate scaled dimensions
            const renderHeight = this.hero.height * scale;
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            const renderWidth = renderHeight * aspectRatio;

            // Keep player feet locked on the ground surface
            const renderY = (this.groundY + 15) - renderHeight;

            this.ctx.drawImage(img, this.hero.x, renderY, renderWidth, renderHeight);
        }

        this.ctx.restore();
    }

    drawFadeOverlay() {
        if (this.fadeAlpha > 0) {
            this.ctx.save();
            this.ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.parallax.draw(this.worldDistance);
        this.drawObstacle();

        // Render Word Item via WordItem instance with Particle System reference
        this.wordItem.draw(this.ctx, {
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            groundY: this.groundY,
            worldDistance: this.worldDistance,
            targetObstacleDistance: this.targetObstacleDistance,
            isTransitioning: this.isTransitioning,
            particles: this.particles
        });

        this.drawHero();
        this.particles.draw(this.ctx);
        this.drawFadeOverlay();
    }

    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    async start() {
        await this.assets.loadResources('./data/resources.json');
        this.setupWordData();
        await this.parallax.init();
        this.initLevel();
        this.loop();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    window.gameEngine = game;
    game.start();
});