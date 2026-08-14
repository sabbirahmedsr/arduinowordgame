class ParallaxBackground {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    draw(worldDistance) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const groundY = height * 0.62;
        const roadHeight = height - groundY;

        // ☀️ ১. উজ্জ্বল সুন্দর নীল আকাশ (Day Light Sky)
        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, groundY);
        skyGrad.addColorStop(0, '#38bdf8');   // ব্রাইট স্কাই ব্লু
        skyGrad.addColorStop(0.7, '#bae6fd'); // সফট আকাশি
        skyGrad.addColorStop(1, '#e0f2fe');   // ওয়াটার ব্লু টিন্ট
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, width, height);

        // ☀️ ২. সুন্দর ছোট মিষ্টি সূর্য (Cute Little Sun)
        this.ctx.save();
        this.ctx.fillStyle = '#fde047';
        this.ctx.beginPath();
        this.ctx.arc(width * 0.88, height * 0.15, 32, 0, Math.PI * 2); // সাইজ ছোট করা হয়েছে
        this.ctx.fill();
        // সূর্যের হালকা চারপাশের গ্লো
        this.ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
        this.ctx.beginPath();
        this.ctx.arc(width * 0.88, height * 0.15, 45, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // ☁️ ৩. কার্টুনিশ মেঘ (Background Clouds)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const cloudOffset = (worldDistance * 0.05) % (width + 400);
        this.drawCloud(width * 0.2 - cloudOffset, height * 0.18, 40);
        this.drawCloud(width * 0.6 - cloudOffset, height * 0.12, 50);
        this.drawCloud(width * 1.1 - cloudOffset, height * 0.22, 35);

        // ⛰️ ৪. দূরের সবুজ পাহাড় (Far Green Mountains - Speed 0.1)
        this.ctx.fillStyle = '#86efac'; // সফট পেস্টেল গ্রিন
        const mountOffset = (worldDistance * 0.1) % 700;
        for (let x = -700; x < width + 700; x += 350) {
            this.ctx.beginPath();
            this.ctx.moveTo(x - mountOffset, groundY);
            this.ctx.lineTo(x + 175 - mountOffset, groundY - 200);
            this.ctx.lineTo(x + 350 - mountOffset, groundY);
            this.ctx.fill();
        }

        // 🌳 ৫. কাছের ঘন সবুজ বন (Vibrant Forest Bushes - Speed 0.4)
        this.ctx.fillStyle = '#22c55e'; // উজ্জ্বল ফরেস্ট গ্রিন
        const bushOffset = (worldDistance * 0.4) % 400;
        for (let x = -400; x < width + 400; x += 200) {
            this.ctx.beginPath();
            this.ctx.arc(x + 100 - bushOffset, groundY, 75, Math.PI, 0, false);
            this.ctx.fill();
        }

        // 🛣️ ৬. প্রাকৃতিক মাটির চওড়া পথ (Thick Dirt Road with Grass Top)
        const roadGrad = this.ctx.createLinearGradient(0, groundY, 0, height);
        roadGrad.addColorStop(0, '#ca8a04'); // মাটির বাদামী টোন
        roadGrad.addColorStop(1, '#854d0e'); // ডার্ক আর্থ টোন
        this.ctx.fillStyle = roadGrad;
        this.ctx.fillRect(0, groundY, width, roadHeight);

        // মোটা উজ্জ্বল সবুজ ঘাসের বর্ডার (Thick Top Grass Layer)
        this.ctx.fillStyle = '#4ade80';
        this.ctx.fillRect(0, groundY - 6, width, 16);

        // ঘাসের টেক্সচার পেটার্ন (Small Grass Patches)
        this.ctx.fillStyle = '#16a34a';
        const grassOffset = (worldDistance * 1.0) % 80;
        for (let x = -80; x < width + 80; x += 80) {
            this.ctx.fillRect(x - grassOffset, groundY + 10, 40, 6);
        }
    }

    // হেলপার ফাংশন: মেঘ আঁকার জন্য
    drawCloud(x, y, size) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.7, y - size * 0.2, size * 0.8, 0, Math.PI * 2);
        this.ctx.arc(x + size * 1.4, y, size * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
    }
}