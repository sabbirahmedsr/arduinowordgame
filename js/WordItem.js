/* *********************************************************
   Module 1.1.0 : Word Item Controller
   Description: World space dynamic anchoring where the image's 
                left edge always locks to 3/4th (75%) of the screen.
************************************************************/

class WordItem {
    constructor() {
        this.image = null;
        this.width = 200;
        this.height = 200;

        this.worldX = null;
        this.startWorldX = null;
        this.targetWorldX = null;

        this.isDashing = false;
        this.dashProgress = 1;
        this.dashDuration = 700;
        this.dashStartTime = 0;

        this.currentScreenX = null;
        this.currentScreenY = null;
    }

    setImage(img) {
        this.image = img;
        this.worldX = null;
        this.startWorldX = null;
        this.targetWorldX = null;
        this.isDashing = false;
        this.dashProgress = 1;
    }

    triggerDash(newTargetWorldX) {
        this.startWorldX = (this.worldX !== null) ? this.worldX : newTargetWorldX;
        this.targetWorldX = newTargetWorldX;
        this.isDashing = true;
        this.dashProgress = 0;
        this.dashStartTime = performance.now();
    }

    draw(ctx, config) {
        if (!this.image) return;

        const {
            canvasWidth,
            canvasHeight,
            groundY,
            worldDistance,
            targetObstacleDistance,
            isTransitioning,
            particles
        } = config;

        if (this.image.naturalHeight !== 0) {
            const aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
            this.width = this.height * aspectRatio;
        }

        ctx.save();

        let renderScreenX = 0;
        let renderScreenY = 0;

        if (isTransitioning) {
            // GLORIFIED CENTER VICTORY STATE
            const centerScreenX = (canvasWidth / 2) - (this.width / 2);
            const centerScreenY = (canvasHeight * 0.58) - (this.height / 2);

            if (this.currentScreenX === null) {
                this.currentScreenX = this.worldX - worldDistance;
                this.currentScreenY = groundY - this.height + 10;
            }

            this.currentScreenX += (centerScreenX - this.currentScreenX) * 0.12;
            this.currentScreenY += (centerScreenY - this.currentScreenY) * 0.12;

            renderScreenX = this.currentScreenX;
            renderScreenY = this.currentScreenY;

            const pulse = Math.sin(Date.now() / 150) * 10;

            // Outer Sky-Blue Glow
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 40 + pulse;
            ctx.drawImage(this.image, renderScreenX, renderScreenY, this.width, this.height);

            // Inner Bright Golden Core
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 20 + pulse / 2;

            // Spawn Tiny Star Glitter Sparkles
            if (particles && particles.spawnVictorySparkle) {
                particles.spawnVictorySparkle(renderScreenX - 20, renderScreenY - 20, this.width + 40, this.height + 40);
            }

        } else {
            // Anchor image left edge strictly to 3/4th (75%) of the screen viewport
            const defaultWorldX = targetObstacleDistance + (canvasWidth * 0.75);

            if (this.worldX === null) {
                this.worldX = defaultWorldX;
                this.targetWorldX = defaultWorldX;
                this.startWorldX = defaultWorldX;
            }

            if (this.isDashing) {
                const elapsed = performance.now() - this.dashStartTime;
                this.dashProgress = Math.min(elapsed / this.dashDuration, 1);

                const easeProgress = 1 - Math.pow(1 - this.dashProgress, 3);
                this.worldX = this.startWorldX + (this.targetWorldX - this.startWorldX) * easeProgress;

                renderScreenX = this.worldX - worldDistance;
                renderScreenY = groundY - this.height + 10;

                // Spawn speed lines aligned with the image front during dash
                if (particles && particles.spawnSpeedLines && this.dashProgress < 0.85) {
                    const speedLineX = Math.min(renderScreenX + this.width, canvasWidth - 50);
                    particles.spawnSpeedLines(speedLineX, renderScreenY, this.height);
                }

                if (this.dashProgress >= 1) {
                    this.isDashing = false;
                    this.worldX = this.targetWorldX;
                }
            } else {
                renderScreenX = this.worldX - worldDistance;
                renderScreenY = groundY - this.height + 10;
            }

            this.currentScreenX = renderScreenX;
            this.currentScreenY = renderScreenY;
        }

        if (renderScreenX > -400 && renderScreenX < canvasWidth + 400) {
            ctx.drawImage(this.image, renderScreenX, renderScreenY, this.width, this.height);
        }

        ctx.restore();
    }
}