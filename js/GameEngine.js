/* *********************************************************
   Module 1.0.0 : Core Game Engine
   Description: Coordinates game state, inputs, level data loading,
   scaled hero movement without speed particles, obstacle badges 
   positioned at 30% screen height, dynamic asset loading, and 
   aspect-ratio preserved rendering.
************************************************************/

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.ui = new UIController();
        this.particles = new ParticleSystem();
        this.parallax = new ParallaxBackground(this.canvas, this.ctx);
        
        this.assets = new AssetManager();

        this.serial = new SerialController(
            (letter) => this.handleLetterInput(letter),
            (rawData, decimalVal, mappedLetter) => this.ui.updateSerialHUD(rawData, decimalVal, mappedLetter)
        );

        // Word & Level Data State
        this.words = [];
        this.currentWordIndex = 0;
        this.currentWord = "";

        this.currentLetterIndex = 0;
        this.worldDistance = 0;
        this.isWaitingAtObstacle = false;

        this.levelObstacleImages = [];

        // Enlarged Hero initial bounds
        this.hero = { x: 150, y: 0, width: 190, height: 270, speed: GameConfig.heroSpeed };

        this.handleResize();
        this.bindEvents();
    }

    async loadLevelData() {
        try {
            const response = await fetch('./data/levelData.json');
            const data = await response.json();
            this.words = data.words || ["CAT"];
        } catch (error) {
            console.error("Failed to load levelData.json:", error);
            this.words = ["CAT", "DOG", "SUN"];
        }
        this.currentWord = this.words[this.currentWordIndex];
    }

    nextWord() {
        if (this.words.length > 0) {
            this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
            this.currentWord = this.words[this.currentWordIndex];
        }
    }

    handleResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.travelDistancePerObstacle = this.canvas.width * GameConfig.travelDistanceMultiplier;
        
        this.groundY = this.canvas.height * 0.7; 
        
        // Hero dimensions resized for higher visibility
        this.hero.height = 270;
        this.hero.width = 190;
        this.hero.y = this.groundY - this.hero.height + 15; 
    }

    initLevel() {
        this.currentLetterIndex = 0;
        this.worldDistance = 0;
        this.isWaitingAtObstacle = false;
        this.targetObstacleDistance = this.travelDistancePerObstacle;

        // 1. Fetch obstacle list dynamically from resources.json
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

        // 2. Calculate World X positions for obstacles
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
        if (!this.isWaitingAtObstacle) return;

        const targetLetter = this.currentWord[this.currentLetterIndex];
        if (inputLetter === targetLetter) {
            this.handleCorrectInput();
        }
    }

    handleCorrectInput() {
        this.particles.spawnExplosion(this.canvas.width / 2, this.hero.y, '#38bdf8', 35);
        this.ui.revealLetter(this.currentLetterIndex);

        this.isWaitingAtObstacle = false;
        this.currentLetterIndex++;
        this.targetObstacleDistance += this.travelDistancePerObstacle;

        if (this.currentLetterIndex >= this.currentWord.length) {
            setTimeout(() => {
                this.ui.showCompletionPopup(this.currentWord, () => {
                    this.nextWord();
                    this.initLevel();
                });
            }, 600);
        }
    }

    update() {
        if (!this.isWaitingAtObstacle) {
            this.worldDistance += this.hero.speed;

            if (this.worldDistance >= this.targetObstacleDistance) {
                this.isWaitingAtObstacle = true;
            }
        }

        this.particles.update();
    }

    drawObstacle() {
        if (this.currentLetterIndex >= this.currentWord.length) return;

        const requiredLetter = this.currentWord[this.currentLetterIndex];
        const obstacleWorldX = this.targetObstacleDistance + (this.canvas.width / 2);
        const screenX = obstacleWorldX - this.worldDistance;

        if (screenX > -200 && screenX < this.canvas.width + 200) {
            this.ctx.save();

            // Retrieve loaded image from AssetManager
            const currentObstaclePath = this.levelObstacleImages[this.currentLetterIndex];
            const obstacleImg = currentObstaclePath ? this.assets.get(currentObstaclePath) : null;

            let targetHeight = 155; 
            let targetWidth = 140;

            // Dynamic aspect ratio calculation to prevent stretching
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

            // Challenge Letter Badge centered at ~30% from top of screen
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
        const heroPath = this.isWaitingAtObstacle ? playerConfig?.idle : playerConfig?.running;
        const img = heroPath ? this.assets.get(heroPath) : null;

        // Scaled hero height and width
        let targetHeight = 270;
        let targetWidth = 190;

        if (img && img.naturalHeight !== 0) {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            targetWidth = targetHeight * aspectRatio;
        }

        this.hero.width = targetWidth;
        this.hero.height = targetHeight;
        this.hero.y = this.groundY - targetHeight + 15;

        this.ctx.save();

        if (img) {
            this.ctx.drawImage(img, this.hero.x, this.hero.y, targetWidth, targetHeight);
        }

        this.ctx.restore();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.parallax.draw(this.worldDistance);

        this.drawObstacle();
        this.drawHero();
        this.particles.draw(this.ctx);
    }

    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    async start() {
        await this.assets.loadResources('./data/resources.json');
        await this.loadLevelData();
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