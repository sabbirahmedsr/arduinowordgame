/* *********************************************************
   Module 1.0.3 : Particle System (O(1) Memory Optimized)
************************************************************/

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.sampleCanvas = document.createElement('canvas');
        this.sampleCanvas.width = 10;
        this.sampleCanvas.height = 10;
        this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    }

    clear() {
        this.particles.length = 0;
    }

    spawnExplosion(x, y, color = '#ff7700', count = 30) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;

            this.particles.push({
                type: 'circle',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                color: color,
                size: Math.random() * 6 + 3,
                alpha: 1,
                decay: Math.random() * 0.03 + 0.015,
                gravity: 0.2
            });
        }
    }

    spawnObstacleBurst(x, y, width, height, imageElement) {
        let sampleColors = ['#8B5A2B', '#5C4033', '#A0522D', '#D2B48C', '#4A5D23'];

        if (imageElement && imageElement.naturalWidth) {
            try {
                this.sampleCtx.drawImage(imageElement, 0, 0, 10, 10);
                const data = this.sampleCtx.getImageData(5, 5, 1, 1).data;
                sampleColors.push(`rgb(${data[0]}, ${data[1]}, ${data[2]})`);
            } catch (e) {}
        }

        for (let i = 0; i < 45; i++) {
            const spawnX = x - (width / 2) + (Math.random() * width);
            const spawnY = y + (Math.random() * height);
            const chosenColor = sampleColors[Math.floor(Math.random() * sampleColors.length)];
            this.spawnExplosion(spawnX, spawnY, chosenColor, 1);
        }
    }

    spawnSpeedLines(screenX, screenY, height) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                type: 'speedline',
                x: screenX + (Math.random() * 30),
                y: screenY + (Math.random() * height),
                length: Math.random() * 90 + 50,
                vx: -(Math.random() * 20 + 15),
                color: 'rgba(255, 255, 255, 0.95)',
                alpha: 0.9,
                thickness: Math.random() * 2.5 + 1,
                decay: 0.04
            });
        }
    }

    spawnVictorySparkle(x, y, width, height) {
        if (Math.random() < 0.5) {
            const colors = ['#ffffff', '#fde047', '#38bdf8', '#e0e7ff', '#f43f5e'];
            this.particles.push({
                type: 'glitter',
                x: x + (Math.random() * width),
                y: y + (Math.random() * height),
                size: Math.random() * 3.5 + 2,
                maxSize: Math.random() * 5 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: 0.03,
                rotation: Math.random() * Math.PI
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.type === 'circle') {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.alpha -= p.decay;
            } else if (p.type === 'speedline') {
                p.x += p.vx;
                p.alpha -= p.decay;
            } else if (p.type === 'glitter') {
                p.alpha -= p.decay;
                p.rotation += 0.05;
            }

            // O(1) Fast Swap-and-Pop Deletion
            if (p.alpha <= 0) {
                const lastIdx = this.particles.length - 1;
                this.particles[i] = this.particles[lastIdx];
                this.particles.pop();
            }
        }
    }

    drawGlitterStar(ctx, x, y, size, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.quadraticCurveTo(0, 0, size, 0);
        ctx.quadraticCurveTo(0, 0, 0, size);
        ctx.quadraticCurveTo(0, 0, -size, 0);
        ctx.quadraticCurveTo(0, 0, 0, -size);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    draw(ctx) {
        if (this.particles.length === 0) return;
        ctx.save();
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            ctx.globalAlpha = Math.max(0, p.alpha);

            if (p.type === 'circle') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'speedline') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.thickness;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.length, p.y);
                ctx.stroke();
            } else if (p.type === 'glitter') {
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                this.drawGlitterStar(ctx, p.x, p.y, p.size, p.rotation);
            }
        }
        ctx.restore();
    }
}