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
     * JSON ফাইল থেকে সরাসরি ওয়ার্ডস লোড করা
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
     * পরবর্তী শব্দে যাওয়া
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
        
        // গ্রাউন্ড Y পজিশন চওড়া ট্র্যাকের সাথে অ্যাডজাস্ট করা হলো
        this.groundY = this.canvas.height * 0.62; 
        
        this.hero.height = 100;
        this.hero.width = 75;
        // ক্যারেক্টারকে চওড়া ট্র্যাকের সামান্য ভেতরে সেট করা হলো
        this.hero.y = this.groundY - this.hero.height + 15; 
    }

    initLevel() {
        this.currentLetterIndex = 0;
        this.worldDistance = 0;
        this.isWaitingAtObstacle = false;
        this.targetObstacleDistance = this.travelDistancePerObstacle;

        // প্রতিটি লেটারের জন্য র্যান্ডম অবস্ট্যাকল টাইপ জেনারেট করা
        const obstacleTypes = ['gate', 'river', 'rock'];
        this.currentObstacles = [];
        for (let i = 0; i < this.currentWord.length; i++) {
            const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            this.currentObstacles.push({ type: randomType });
        }

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
                    this.nextWord(); // GameEngine এর ভেতরের nextWord মেথড কল হবে
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

            // অবস্ট্যাকল পজিশনিং রেফারেন্স
            const obstacleWidth = 120;
            const obstacleHeight = 130;
            const obstacleX = screenX - (obstacleWidth / 2);
            const obstacleY = this.groundY - obstacleHeight + 10;

            // 🌟 ১. অবস্ট্যাকল রেন্ডারিং (এখানে ভবিষ্যতে direct Image drawImage হবে)
            if (this.isWaitingAtObstacle) {
                // ইমেজ আসার আগ পর্যন্ত সাময়িক সফট ডেমো ইলিমেন্ট
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

            // 🌟 স্ট্যান্ড-আউট চ্যালেঞ্জ লেটার ব্যাজ (Vibrant Sunshine Pop Badge)
            if (this.isWaitingAtObstacle) {
                // ১. ব্যাজটিকে আরও বেশ খানিকটা ওপরে নীল আকাশের মাঝে তুলে দেওয়া হলো
                const badgeY = obstacleY - 140; 

                // ২. ব্যাজের রেডিয়াস আরও একটু বাড়ানো হলো
                const pulse = Math.sin(Date.now() / 150) * 6;
                const radius = 70 + pulse;

                // ৩. ড্রপ শ্যাডো ও উজ্জ্বল আউটডোর গ্লো (Golden Sunshine Glow)
                this.ctx.shadowColor = '#f59e0b';
                this.ctx.shadowBlur = 30;
                
                // ৪. ব্যাকগ্রাউন্ড: উজ্জ্বল গোল্ডেন/সাদা থ্রিডি সার্কেল (ডার্ক নয়, হাই কনট্রাস্ট!)
                const badgeGrad = this.ctx.createLinearGradient(0, badgeY - radius, 0, badgeY + radius);
                badgeGrad.addColorStop(0, '#ffffff');  // ওপরে ক্রিস্প হোয়াইট
                badgeGrad.addColorStop(0.3, '#fef08a'); // হালকা ইয়েলো
                badgeGrad.addColorStop(1, '#fde047');  // সানি ইয়োলো

                this.ctx.fillStyle = badgeGrad;
                this.ctx.strokeStyle = '#f59e0b'; // ওয়ার্ম অরেঞ্জ বর্ডার
                this.ctx.lineWidth = 7;

                this.ctx.beginPath();
                this.ctx.arc(screenX, badgeY, radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // 🖐️ ৫. ইনার রিং (3D Depth ফিল দেওয়ার জন্য)
                this.ctx.shadowBlur = 0;
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(screenX, badgeY, radius - 8, 0, Math.PI * 2);
                this.ctx.stroke();

                // 🔤 ৬. লেটার টেক্সট (বোল্ড অ্যান্ড ডার্ক চকোলেট/ব্রাউন - যেন সাদা/হলুদে ১০০০% স্পষ্ট ফুট ওঠে)
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

        // ১. ক্যারেক্টারের সেন্টার পিভট হিসাব করা
        const centerX = this.hero.x + (this.hero.width / 2);
        const centerY = this.hero.y + (this.hero.height / 2);

        // ২. ট্রান্সলেট ক্যানভাস
        this.ctx.translate(centerX, centerY);

        // 🏃‍♂️ ৩. অবস্ট্যাকলে না থামা পর্যন্ত প্লেয়ার সবসময় সামনের দিকে ১০ ডিগ্রি হেলে থাকবে
        if (!this.isWaitingAtObstacle) {
            const leanAngle = 10 * (Math.PI / 180); // ১০ ডিগ্রি
            this.ctx.rotate(leanAngle);
        }

        // ৪. ক্যারেক্টার আঁকা (সেন্টার পিভট হিসাব অনুযায়ী)
        const halfW = this.hero.width / 2;
        const halfH = this.hero.height / 2;

        // বডি (ব্লু ব্লক)
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillRect(-halfW, -halfH, this.hero.width, this.hero.height);

        // চোখ
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(-halfW + 32, -halfH + 14, 14, 14);
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(-halfW + 38, -halfH + 17, 6, 6);

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
        await this.loadLevelData(); // JSON ডাটা না আসা পর্যন্ত অপেক্ষা করবে
        this.initLevel();
        this.loop();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    window.gameEngine = game;
    game.start();
});