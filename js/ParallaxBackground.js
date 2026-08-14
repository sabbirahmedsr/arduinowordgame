/* *********************************************************
   Module 1.20.0 : Solid Mountain & Grid-Spaced Cloud Parallax Engine
   Description: Resolves mountain transparency issues by forcing full mountain 
   opacity (1.0) so clouds pass naturally behind peaks. Implements a segmented grid 
   spacing algorithm for cloud generation to ensure even distribution across the sky.
************************************************************/

class ParallaxBackground {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        // Ground Asset Setup
        this.groundImg = new Image();
        this.groundLoaded = false;
        
        // Preloaded Asset collections
        this.treeAssets = { bg: [], fg: [] };
        this.bushAssets = [];
        this.flowerAssets = [];
        this.mountainAssets = [];
        this.cloudAssets = [];
        this.config = null;

        // Unified Ground Elements Collection
        this.groundElements = []; 

        // Dynamic Cloud Objects Pool
        this.activeClouds = [];

        // Foreground Camera Overlay
        this.spawnedBottomOverlay = { flowers: [], bushes: [] };

        this.isConfigLoaded = false;
        this.pendingObstaclePositions = null;

        // Time tracking for floating noise
        this.lastTime = performance.now();
    }

    /**
     * Async initialization entry point
     */
    async init() {
        await this.loadEnvironmentConfig();
    }

    /**
     * Preloads all image resources
     */
    async loadEnvironmentConfig() {
        try {
            const response = await fetch('./data/environmentConfig.json');
            this.config = await response.json();

            // Ground Image Load
            this.groundImg.onload = () => { this.groundLoaded = true; };
            this.groundImg.src = this.config.groundImagePath || 'image/environment/ground/ground_v3.webp';

            const bgPromises = (this.config.bgTrees || []).map(src => this.loadImagePromise(src));
            const fgPromises = (this.config.fgTrees || []).map(src => this.loadImagePromise(src));
            const bushPromises = (this.config.bushes || []).map(src => this.loadImagePromise(src));
            const flowerPromises = (this.config.flowers || []).map(src => this.loadImagePromise(src));
            const mountainPromises = (this.config.mountains || []).map(src => this.loadImagePromise(src));
            const cloudPromises = (this.config.clouds || []).map(src => this.loadImagePromise(src));

            const [loadedBg, loadedFg, loadedBushes, loadedFlowers, loadedMountains, loadedClouds] = await Promise.all([
                Promise.all(bgPromises),
                Promise.all(fgPromises),
                Promise.all(bushPromises),
                Promise.all(flowerPromises),
                Promise.all(mountainPromises),
                Promise.all(cloudPromises)
            ]);

            this.treeAssets.bg = loadedBg.filter(img => img !== null);
            this.treeAssets.fg = loadedFg.filter(img => img !== null);
            this.bushAssets = loadedBushes.filter(img => img !== null);
            this.flowerAssets = loadedFlowers.filter(img => img !== null);
            this.mountainAssets = loadedMountains.filter(img => img !== null);
            this.cloudAssets = loadedClouds.filter(img => img !== null);

            this.initCloudSystem();

            this.isConfigLoaded = true;

            if (this.pendingObstaclePositions) {
                this.generateLevelTrees(this.pendingObstaclePositions);
            }
        } catch (error) {
            console.error("Failed to load environmentConfig.json:", error);
        }
    }

    loadImagePromise(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    getRandomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Segmented Grid Spacing system prevents clouds from clustering together
     */
    initCloudSystem() {
        if (this.cloudAssets.length === 0 || !this.config.cloudSettings) return;

        const conf = this.config.cloudSettings;
        const count = conf.count || 5;
        this.activeClouds = [];

        const totalWidth = this.canvas.width + 600; 
        const segmentWidth = totalWidth / count;

        for (let i = 0; i < count; i++) {
            const img = this.cloudAssets[Math.floor(Math.random() * this.cloudAssets.length)];
            const scale = this.getRandomRange(conf.minScale || 0.6, conf.maxScale || 1.1);
            
            // Grid slot placement with subtle random offset (jitter)
            const slotStartX = (i * segmentWidth) - 200;
            const jitterX = this.getRandomRange(0, segmentWidth * 0.4);

            this.activeClouds.push({
                img: img,
                x: slotStartX + jitterX,
                baseTopYRatio: this.getRandomRange(conf.minTopYRatio || 0.02, conf.maxTopYRatio || 0.18),
                scale: scale,
                driftSpeed: this.getRandomRange(conf.minSpeed || 12, conf.maxSpeed || 30),
                noisePhase: Math.random() * Math.PI * 2,
                noiseSpeed: this.getRandomRange(0.8, 1.8),
                opacity: this.getRandomRange(0.85, 1.0)
            });
        }
    }

    /**
     * Measures safe zone distance for dynamic tree clearings
     */
    getSafeZoneDistance(currentX, obstaclePositions, speed) {
        const screenCenter = this.canvas.width / 2;
        let minDistance = Infinity;

        for (let obsX of obstaclePositions) {
            const layerTargetX = (obsX * speed) + ((1 - speed) * screenCenter);
            const dist = Math.abs(currentX - layerTargetX);
            if (dist < minDistance) {
                minDistance = dist;
            }
        }
        return minDistance;
    }

    /**
     * Generates environment elements extending past the final letter step
     */
    generateLevelTrees(obstaclePositions) {
        this.pendingObstaclePositions = obstaclePositions;

        if (!this.isConfigLoaded || !obstaclePositions || obstaclePositions.length === 0) {
            return;
        }

        this.groundElements = [];
        this.spawnedBottomOverlay = { flowers: [], bushes: [] };

        const strictSafeRadius = 400; 
        const startX = 100;
        const lastObstacleX = obstaclePositions[obstaclePositions.length - 1];
        
        const endX = lastObstacleX + 3500;

        const treeConf = this.config.treeZone;
        const foliageConf = this.config.foliageZone;

        // =========================================
        // ১. ব্যাকগ্রাউন্ড ট্রি স্পনিং
        // =========================================
        if (this.treeAssets.bg.length > 0 && treeConf) {
            const settings = treeConf.bgTreeSettings;
            let currentX = startX;
            const baseGap = 200 / (settings.density || 1.0);

            while (currentX < endX) {
                if (this.getSafeZoneDistance(currentX, obstaclePositions, 1.0) < strictSafeRadius) {
                    currentX += 90;
                    continue;
                }

                const img = this.treeAssets.bg[Math.floor(Math.random() * this.treeAssets.bg.length)];
                const scale = this.getRandomRange(settings.minScale, settings.maxScale);
                const bottomRatio = this.getRandomRange(treeConf.bgZoneRatio.min, treeConf.bgZoneRatio.max);

                this.groundElements.push({
                    x: currentX,
                    img: img,
                    scale: scale,
                    bottomRatio: bottomRatio
                });

                currentX += baseGap + (Math.random() * 100);
            }
        }

        // =========================================
        // ২. ফোরগ্রাউন্ড ট্রি স্পনিং
        // =========================================
        if (this.treeAssets.fg.length > 0 && treeConf) {
            const settings = treeConf.fgTreeSettings;
            let currentX = startX + 120;
            const baseGap = 280 / (settings.density || 0.8);

            while (currentX < endX) {
                if (this.getSafeZoneDistance(currentX, obstaclePositions, 1.0) < strictSafeRadius) {
                    currentX += 90;
                    continue;
                }

                const img = this.treeAssets.fg[Math.floor(Math.random() * this.treeAssets.fg.length)];
                const scale = this.getRandomRange(settings.minScale, settings.maxScale);
                const bottomRatio = this.getRandomRange(treeConf.fgZoneRatio.min, treeConf.fgZoneRatio.max);

                this.groundElements.push({
                    x: currentX,
                    img: img,
                    scale: scale,
                    bottomRatio: bottomRatio
                });

                currentX += baseGap + (Math.random() * 120);
            }
        }

        // =========================================
        // ৩. বুশ ও ফ্লাওয়ার স্পনিং
        // =========================================
        if (foliageConf) {
            let currentX = startX + 40;
            const combinedDensity = (foliageConf.bushDensity || 1.2) + (foliageConf.flowerDensity || 0.5);
            const baseGap = 120 / combinedDensity;

            while (currentX < endX) {
                if (this.getSafeZoneDistance(currentX, obstaclePositions, 1.0) < strictSafeRadius) {
                    currentX += 80;
                    continue;
                }

                const isFlower = (this.flowerAssets.length > 0) && (Math.random() < (foliageConf.flowerDensity / combinedDensity));
                const pool = isFlower ? this.flowerAssets : this.bushAssets;

                if (pool.length > 0) {
                    const img = pool[Math.floor(Math.random() * pool.length)];
                    const scale = this.getRandomRange(foliageConf.minScale, foliageConf.maxScale);
                    const bottomRatio = this.getRandomRange(foliageConf.fullZoneRatio.min, foliageConf.fullZoneRatio.max);

                    this.groundElements.push({
                        x: currentX,
                        img: img,
                        scale: scale,
                        bottomRatio: bottomRatio
                    });
                }

                currentX += baseGap + (Math.random() * 80);
            }
        }

        // =========================================
        // ৪. PAINTER'S ALGORITHM DEPTH SORTING
        // =========================================
        this.groundElements.sort((a, b) => b.bottomRatio - a.bottomRatio);

        // =========================================
        // ৫. ক্যামেরা ফ্রন্ট ওভারলে
        // =========================================
        if (this.config.bottomOverlaySettings) {
            const settings = this.config.bottomOverlaySettings;
            let currentX = startX;

            const baseGap = 90;
            const combinedDensity = (settings.flowerDensity || 1.40) + (settings.bushDensity || 0.60);
            const effectiveGap = baseGap / combinedDensity;

            while (currentX < endX) {
                const isFlower = (this.flowerAssets.length > 0) && (Math.random() < (settings.flowerDensity / combinedDensity));
                const pool = isFlower ? this.flowerAssets : this.bushAssets;

                if (pool.length > 0) {
                    const img = pool[Math.floor(Math.random() * pool.length)];
                    const scale = this.getRandomRange(settings.minScale, settings.maxScale);
                    const opacity = this.getRandomRange(settings.minOpacity, settings.maxOpacity);
                    const yOffset = this.getRandomRange(settings.minYOffset || -15, settings.maxYOffset || 30);

                    const item = {
                        x: currentX,
                        img: img,
                        scale: scale,
                        opacity: opacity,
                        yOffset: yOffset
                    };

                    if (isFlower) {
                        this.spawnedBottomOverlay.flowers.push(item);
                    } else {
                        this.spawnedBottomOverlay.bushes.push(item);
                    }
                }

                currentX += effectiveGap + (Math.random() * (70 / combinedDensity));
            }
        }
    }

    drawSky() {
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.5);
        skyGrad.addColorStop(0, '#38bdf8');
        skyGrad.addColorStop(0.7, '#bae6fd');
        skyGrad.addColorStop(1, '#e0f2fe');
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Clouds with smooth floating sine-wave and wrapping without clustering
     */
    drawClouds(worldDistance, deltaTime) {
        if (this.activeClouds.length === 0 || !this.config.cloudSettings) return;

        const conf = this.config.cloudSettings;
        const parallaxFactor = conf.parallaxFactor || 0.08;
        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;
        const amplitude = conf.floatAmplitude || 6;
        const totalSpan = screenWidth + 600;

        this.activeClouds.forEach(cloud => {
            if (!cloud.img || !cloud.img.complete) return;

            // Idle wind drifting
            cloud.x += cloud.driftSpeed * deltaTime;

            // Floating Sine noise
            cloud.noisePhase += cloud.noiseSpeed * deltaTime;
            const sineYOffset = Math.sin(cloud.noisePhase) * amplitude;

            const screenX = (cloud.x - (worldDistance * parallaxFactor));

            // Infinite Horizontal Wrap with screen padding
            let wrappedX = screenX % totalSpan;
            if (wrappedX < -300) wrappedX += totalSpan;
            wrappedX -= 300;

            const drawWidth = cloud.img.width * cloud.scale;
            const drawHeight = cloud.img.height * cloud.scale;
            const drawY = (screenHeight * cloud.baseTopYRatio) + sineYOffset;

            this.ctx.save();
            this.ctx.globalAlpha = cloud.opacity;
            this.ctx.drawImage(cloud.img, wrappedX, drawY, drawWidth, drawHeight);
            this.ctx.restore();
        });
    }

    /**
     * Opaque Solid Mountain Renderer (Opacity 1.0 prevents cloud see-through)
     */
    drawMountains(worldDistance) {
        if (this.mountainAssets.length === 0 || !this.config.mountainSettings) return;

        const conf = this.config.mountainSettings;
        const speed = conf.speed || 0.20;
        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;

        const topY = screenHeight * (conf.topYRatio || 0.22);
        const mountainHeight = screenHeight * (conf.heightRatio || 0.32);

        this.mountainAssets.forEach((img, index) => {
            if (!img || !img.complete) return;

            const layerSpeed = speed * (1 + index * 0.15); 
            const scale = mountainHeight / img.height;
            const drawWidth = img.width * scale;

            const offsetX = (worldDistance * layerSpeed) % drawWidth;

            this.ctx.save();
            // Solid Opacity ensures clean occlusion over clouds
            this.ctx.globalAlpha = conf.opacity || 1.0; 

            for (let x = -drawWidth; x < screenWidth + drawWidth; x += drawWidth) {
                this.ctx.drawImage(
                    img,
                    x - offsetX,
                    topY,
                    drawWidth,
                    mountainHeight
                );
            }

            this.ctx.restore();
        });
    }

    /**
     * Unified Ground Track Renderer with Dynamic Visual Depth
     */
    drawGroundElements(worldDistance) {
        if (!this.isConfigLoaded || this.groundElements.length === 0) return;

        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;
        const speed = 1.0; 

        const depthVis = this.config.depthVisuals || { minBlur: 0, maxBlur: 2, minOpacity: 0.7, maxOpacity: 1.0 };
        const minZoneRatio = 0.3750;
        const maxZoneRatio = 0.5000;

        this.groundElements.forEach(item => {
            const img = item.img;
            if (!img || !img.complete) return;

            const screenX = item.x - (worldDistance * speed);

            if (screenX > -300 && screenX < screenWidth + 300) {
                const depthFactor = (item.bottomRatio - minZoneRatio) / (maxZoneRatio - minZoneRatio);
                const clampedFactor = Math.max(0, Math.min(1, depthFactor));

                const calculatedBlur = depthVis.minBlur + (depthVis.maxBlur - depthVis.minBlur) * clampedFactor;
                const calculatedOpacity = depthVis.maxOpacity - (depthVis.maxOpacity - depthVis.minOpacity) * clampedFactor;

                this.ctx.save();
                this.ctx.globalAlpha = calculatedOpacity;

                if (calculatedBlur > 0.1) {
                    this.ctx.filter = `blur(${calculatedBlur.toFixed(1)}px)`;
                }

                const drawWidth = img.width * item.scale;
                const drawHeight = img.height * item.scale;

                const drawX = screenX - (drawWidth / 2);
                const anchorY = screenHeight * (1.0 - item.bottomRatio);
                const drawY = anchorY - drawHeight;

                this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                this.ctx.restore();
            }
        });
    }

    /**
     * Continuous Camera Foreground Overlay Renderer
     */
    drawBottomOverlay(worldDistance) {
        if (!this.isConfigLoaded || !this.config.bottomOverlaySettings) return;

        const settings = this.config.bottomOverlaySettings;
        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;
        const speed = settings.speed || 1.30;

        const renderOrder = [this.spawnedBottomOverlay.flowers, this.spawnedBottomOverlay.bushes];

        renderOrder.forEach(itemList => {
            if (!itemList) return;

            itemList.forEach(item => {
                const img = item.img;
                if (!img || !img.complete) return;

                const screenX = item.x - (worldDistance * speed);

                if (screenX > -300 && screenX < screenWidth + 300) {
                    this.ctx.save();

                    const blurVal = settings.blur || 3;
                    const brightnessVal = settings.brightness || 0.65;
                    this.ctx.filter = `blur(${blurVal}px) brightness(${brightnessVal})`;
                    this.ctx.globalAlpha = item.opacity;

                    const drawWidth = img.width * item.scale;
                    const drawHeight = img.height * item.scale;

                    const drawX = screenX - (drawWidth / 2);
                    const drawY = (screenHeight + item.yOffset) - drawHeight;

                    this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                    this.ctx.restore();
                }
            });
        });
    }

    /**
     * Ground Texture Renderer occupying exactly 50% bottom height
     */
    drawGround(worldDistance) {
        if (!this.groundLoaded) return;

        const screenWidth = this.canvas.width;
        const screenHeight = this.canvas.height;

        const targetGroundHeight = screenHeight * 0.50; 
        const groundTopY = screenHeight - targetGroundHeight;

        const scale = targetGroundHeight / this.groundImg.height;
        const drawWidth = this.groundImg.width * scale;

        const offsetX = (worldDistance * 1.0) % drawWidth;

        for (let x = -drawWidth; x < screenWidth + drawWidth; x += drawWidth) {
            this.ctx.drawImage(
                this.groundImg,
                x - offsetX,
                groundTopY,
                drawWidth,
                targetGroundHeight
            );
        }
    }

    /**
     * Correct Layer Ordering Pipeline: Sky -> Clouds -> Mountains -> Ground -> Foliage -> Overlay
     */
    draw(worldDistance) {
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); 
        this.lastTime = now;

        // ১. আকাশ
        this.drawSky();

        // ২. মেঘ (পাহাড়ের পেছনে ভেসে বেড়াবে)
        this.drawClouds(worldDistance, deltaTime);

        // ৩. পাহাড় (Solid 1.0 Opacity - মেঘ স্বাভাবিকভাবে ঢাকবে)
        this.drawMountains(worldDistance);

        // ৪. মাটির রাস্তা
        this.groundLoaded && this.drawGround(worldDistance);

        // ৫. গাছ, ঝোপ ও ফুল (Depth Sorted)
        this.drawGroundElements(worldDistance);

        // ৬. ফ্রন্ট ক্যামেরা ওভারলে
        this.drawBottomOverlay(worldDistance);
    }
}