class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    // Explosion particles when clearing obstacle
    spawnExplosion(x, y, color, count = 30) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                size: Math.random() * 6 + 3,
                color: color,
                alpha: 1,
                decay: 0.025
            });
        }
    }

    // Speed boost trail particles behind hero
    spawnSpeedTrail(heroX, heroY, heroHeight) {
        this.particles.push({
            x: heroX - 5,
            y: heroY + heroHeight / 2 + (Math.random() - 0.5) * (heroHeight * 0.8),
            vx: -Math.random() * 8 - 4, // Fast backwards stream
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 4 + 2,
            color: '#38bdf8', // Speed cyan glow
            alpha: 0.8,
            decay: 0.05
        });
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}