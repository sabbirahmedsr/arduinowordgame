/* *********************************************************
   Module 1.0.0 : Core Game Engine
   Description: Coordinates game state, inputs, level data loading,
   hero movement, obstacle badges, and parallax background rendering.
************************************************************/

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.ui = new UIController();
        this.particles = new ParticleSystem();
        this.parallax = new ParallaxBackground(this.canvas, this.ctx);

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

        this.hero = { x: 150, y: 0, width: 55, height: 75, speed: GameConfig.heroSpeed };

        this.handleResize();
        this.bindEvents();
    }

    /**
     * JSON ফাইল থেকে সরাসরি ওয়ার্ডস লোড করা
     */
    async loadLevelData() {
        try {
            const response = await fetch('./data/levelData.json');
            const data = await response.json();
            this.words = data.words || ["CAT"];
        } catch (error) {
            console.error("Failed to load levelData.json:", error);
            this.words = ["CAT", "DOG", "SUN"]; // Fallback words
        }
        this.currentWord = this.words[this.currentWordIndex];
    }

    /**
     * পরবর্তী শব্দে যাওয়া
     */
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
        
        // গ্রাউন্ড Y পজিশন চওড়া ট্র্যাকের সাথে অ্যাডজাস্ট করা হলো
        this.groundY = this.canvas.height * 0.62; 
        
        this.hero.height = 100;
        this.hero.width = 75;
        // ক্যারেক্টারকে চওড়া ট্র্যাকের সামান্য ভেতরে সেট করা হলো
        this.hero.y = this.groundY - this.hero.height + 15; 
    }

    initLevel() {
        this.currentLetterIndex = 0;
        this.worldDistance = 0;
        this.isWaitingAtObstacle = false;
        this.targetObstacleDistance = this.travelDistancePerObstacle;

        // ১. লেভেলের প্রতিটি লেটারের World X পজিশন বের করা
        const obstaclePositions = [];
        for (let i = 0; i < this.currentWord.length; i++) {
            const obsWorldX = ((i + 1) * this.travelDistancePerObstacle) + (this.canvas.width / 2);
            obstaclePositions.push(obsWorldX);
        }

        // ২. প্যারালাক্স ব্যাকগ্রাউন্ডকে জিরো-স্পন ডেনসিটি জোনে গাছ স্পন করতে বলা
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
            this.particles.spawnSpeedTrail(this.hero.x, this.hero.y, this.hero.height);

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

            const obstacleWidth = 120;
            const obstacleHeight = 130;
            const obstacleY = this.groundY - obstacleHeight + 10;

            // ১. অবস্ট্যাকল ইলিমেন্ট
            if (this.isWaitingAtObstacle) {
                this.ctx.shadowColor = '#facc15';
                this.ctx.shadowBlur = 20;
                this.ctx.fillStyle = '#3b82f6'; 
                this.ctx.beginPath();
                this.ctx.arc(screenX, obstacleY + 60, 50, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#64748b';
                this.ctx.beginPath();
                this.ctx.arc(screenX, obstacleY + 60, 50, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // ২. স্ট্যান্ড-আউট চ্যালেঞ্জ লেটার ব্যাজ
            if (this.isWaitingAtObstacle) {
                const badgeY = obstacleY - 140; 
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
        this.hero.y = this.groundY - this.hero.height;

        this.ctx.save();

        const centerX = this.hero.x + (this.hero.width / 2);
        const centerY = this.hero.y + (this.hero.height / 2);

        this.ctx.translate(centerX, centerY);

        if (!this.isWaitingAtObstacle) {
            const leanAngle = 10 * (Math.PI / 180);
            this.ctx.rotate(leanAngle);
        }

        const halfW = this.hero.width / 2;
        const halfH = this.hero.height / 2;

        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillRect(-halfW, -halfH, this.hero.width, this.hero.height);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-halfW + 32, -halfH + 14, 14, 14);
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(-halfW + 38, -halfH + 17, 6, 6);

        this.ctx.restore();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // worldDistance পাস করা হচ্ছে
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
        await this.loadLevelData();
        await this.parallax.init(); // প্যারালাক্স কনফিগ পুরোপুরি লোড হওয়া নিশ্চিতকরণ
        this.initLevel();
        this.loop();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    window.gameEngine = game;
    game.start();
});