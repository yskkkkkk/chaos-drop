/**
 * =================================================================
 *   CHAOS-DROP — OBSTACLE ENTITY CLASSES
 * =================================================================
 * TeleportPortal, Spinner, SuperBumper, SlowVortex,
 * SpeedPad, LaunchPad, Peg
 */

class TeleportPortal {
  constructor(x1, y1, x2, y2, color, name) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.r = PORTAL_R;
    this.color = color;
    this.name = name;
    this.pulse = 0;
  }
  draw(ctx) {
    this.pulse += 0.05;
    const glow = this.r + Math.sin(this.pulse) * 3;

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(this.x1, this.y1, glow, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`▼ ${this.name} IN`, this.x1, this.y1 - this.r - 4);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffcc00';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(this.x2, this.y2, glow, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`▲ ${this.name} OUT`, this.x2, this.y2 - this.r - 4);
    ctx.restore();
  }
}

class Spinner {
  constructor(x, y, r, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.angle = Math.random() * Math.PI;
    this.angularVelocity = 0.02;
    this.color = color;
    this.bladeCount = 3;
  }
  update() {
    this.angle += this.angularVelocity;
    this.angularVelocity *= 0.985;
    if (Math.abs(this.angularVelocity) < 0.002) this.angularVelocity = 0.002;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    ctx.fill();

    ctx.shadowBlur = 8;
    for (let i = 0; i < this.bladeCount; i++) {
      const theta = (i * 2 * Math.PI) / this.bladeCount;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(theta) * this.r, Math.sin(theta) * this.r);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

class SuperBumper {
  constructor(x, y, r, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;
    this.pulse = 0;
  }
  trigger() { this.pulse = 1.0; }
  update() { this.pulse *= 0.9; }
  draw(ctx) {
    const radius = this.r + this.pulse * 5;
    let grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, radius);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, this.color);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    ctx.save();
    ctx.shadowBlur = this.pulse > 0.05 ? 8 + this.pulse * 10 : 4;
    ctx.shadowColor = this.color;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 + this.pulse * 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
}

class SlowVortex {
  constructor(x, y, r, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;
    this.pulse = 0;
  }
  draw(ctx) {
    this.pulse += 0.02;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 8]);
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
    ctx.stroke();

    ctx.translate(this.x, this.y);
    ctx.rotate(-this.pulse);
    ctx.strokeStyle = 'rgba(140, 82, 255, 0.25)';
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(this.r/2, this.r/2, Math.cos(i * Math.PI/2)*this.r*0.8, Math.sin(i * Math.PI/2)*this.r*0.8);
    }
    ctx.stroke();
    ctx.restore();
  }
}

class SpeedPad {
  constructor(x, y, w, h, direction = null) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    const dirs = ['up', 'down', 'left', 'right'];
    this.direction = direction || dirs[Math.floor(Math.random() * dirs.length)];

    if (this.direction === 'down') {
      this.color = '#00f0ff';
    } else if (this.direction === 'up') {
      this.color = '#ff3366';
    } else {
      this.color = '#ffcc00';
    }

    this.pulse = 0;
  }
  rotateClockwise() {
    const dirs = ['up', 'right', 'down', 'left'];
    const idx = dirs.indexOf(this.direction);
    this.direction = dirs[(idx + 1) % 4];

    if (this.direction === 'down') {
      this.color = '#00f0ff';
    } else if (this.direction === 'up') {
      this.color = '#ff3366';
    } else {
      this.color = '#ffcc00';
    }
  }
  draw(ctx) {
    this.pulse += 0.12;
    ctx.save();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.roundRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#fff';

    const speed = this.pulse % 1.0;

    if (this.direction === 'down') {
      const offset = speed * (this.h - 8);
      const ay = this.y - this.h/2 + 4 + offset;
      if (ay < this.y + this.h/2 - 4) {
        ctx.beginPath();
        ctx.moveTo(this.x - 6, ay - 4);
        ctx.lineTo(this.x, ay);
        ctx.lineTo(this.x + 6, ay - 4);
        ctx.stroke();
      }
    } else if (this.direction === 'up') {
      const offset = speed * (this.h - 8);
      const ay = this.y + this.h/2 - 4 - offset;
      if (ay > this.y - this.h/2 + 4) {
        ctx.beginPath();
        ctx.moveTo(this.x - 6, ay + 4);
        ctx.lineTo(this.x, ay);
        ctx.lineTo(this.x + 6, ay + 4);
        ctx.stroke();
      }
    } else if (this.direction === 'left') {
      const offset = speed * (this.w - 12);
      const ax = this.x + this.w/2 - 6 - offset;
      if (ax > this.x - this.w/2 + 6) {
        ctx.beginPath();
        ctx.moveTo(ax + 4, this.y - 6);
        ctx.lineTo(ax, this.y);
        ctx.lineTo(ax + 4, this.y + 6);
        ctx.stroke();
      }
    } else if (this.direction === 'right') {
      const offset = speed * (this.w - 12);
      const ax = this.x - this.w/2 + 6 + offset;
      if (ax < this.x + this.w/2 - 6) {
        ctx.beginPath();
        ctx.moveTo(ax - 4, this.y - 6);
        ctx.lineTo(ax, this.y);
        ctx.lineTo(ax - 4, this.y + 6);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

class LaunchPad {
  constructor(x, y, w, color, angle = 0, slideSpeed = 0.55, slideRange = 52) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.w = w;
    this.h = 12;
    this.color = color;
    this.pulse = 0;
    this.angle = angle;
    this.slideDir = 1;
    this.slideSpeed = slideSpeed;
    this.slideRange = slideRange;
  }
  trigger() { this.pulse = 1.0; }
  update() {
    this.pulse *= 0.88;
    if (this.color === '#ffea00') this.angle += 0.006;
    if (this.color === '#33ff57') {
      this.x += this.slideDir * this.slideSpeed;
      if (Math.abs(this.x - this.baseX) >= this.slideRange) this.slideDir *= -1;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowBlur = this.pulse > 0.05 ? 6 + this.pulse * 12 : 4;
    ctx.shadowColor = this.color;

    const grad = ctx.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.4, this.color);
    grad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(-this.w/2, 0, this.w, this.h + this.pulse * 5, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▲▲', 0, this.h - 1);
    ctx.restore();
  }
}

class Peg {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.pulse = 0;
  }
  trigger() { this.pulse = 1.0; }
  update() { this.pulse *= 0.88; }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
    if (this.pulse > 0.05) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + this.pulse * 0.6})`;
      ctx.shadowBlur = this.pulse * 12;
      ctx.shadowColor = '#00f0ff';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
  }
}
