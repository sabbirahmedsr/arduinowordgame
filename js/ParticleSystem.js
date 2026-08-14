/* *********************************************************
   Module 1.0.1 : Pure Explosive Particle System
   Description: Clean Sharp 360-Degree Outward Particle Burst
************************************************************/

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;

        // High velocity burst strictly outward in 360 degrees
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 15 + 6;

        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Micro spark sizes
        this.size = Math.random() * 3 + 2; 
        this.alpha = 1.0;
        this.decay = Math.random() * 0.05 + 0.04; 
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Decelerate smoothly without gravity drop
        this.vx *= 0.90; 
        this.vy *= 0.90;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        
        // Minimal subtle glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 2;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawnExplosion(x, y, color, count = 30) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }
}