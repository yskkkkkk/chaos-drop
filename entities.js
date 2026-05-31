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
    }
    ctx.fill();
  }
}

class SpikeTrap {
  constructor(y, wallX, dirMult, spawnY, timerOffset = 0) {
    this.y = y;
    this.dirMult = dirMult; // 1 (left wall -> right), -1 (right wall -> left)
    this.spawnY = spawnY;
    this.currentLen = 0;
    this.phase = 'paused';
    this.timer = timerOffset;
    this.maxLen = Math.round(220 * (typeof BOARD_XSCALE !== 'undefined' ? BOARD_XSCALE : 1));
    this.speed = 5;
    this.pauseDuration = 70;
    this.holdDuration = 85;
    this.h = 15;
  }
  update() {
    this.timer++;
    if (this.phase === 'paused') {
      if (this.timer >= this.pauseDuration) { this.phase = 'extending'; this.timer = 0; }
    } else if (this.phase === 'extending') {
      this.currentLen = Math.min(this.currentLen + this.speed, this.maxLen);
      if (this.currentLen >= this.maxLen) { this.phase = 'holding'; this.timer = 0; }
    } else if (this.phase === 'holding') {
      if (this.timer >= this.holdDuration) { this.phase = 'retracting'; this.timer = 0; }
    } else {
      this.currentLen = Math.max(this.currentLen - this.speed, 0);
      if (this.currentLen <= 0) { this.phase = 'paused'; this.timer = 0; }
    }
  }
  draw(ctx) {
    if (this.currentLen < 1) return;
    
    // 동적 벽면 표면 위치 추적
    const wBounds = getWallAtY(this.y);
    const dynamicWallX = this.dirMult === -1 ? wBounds.rx : wBounds.lx;

    const x1 = this.dirMult === -1 ? dynamicWallX - this.currentLen : dynamicWallX;
    const x2 = this.dirMult === -1 ? dynamicWallX : dynamicWallX + this.currentLen;
    const danger = this.currentLen / this.maxLen;
    const gVal = Math.floor(180 * (1 - danger * 0.9));

    ctx.save();
    ctx.fillStyle = `rgb(255,${gVal},30)`;
    ctx.shadowBlur = 8 + danger * 10;
    ctx.shadowColor = '#ff4400';
    ctx.fillRect(x1, this.y - this.h * 0.5, x2 - x1, this.h);
    
    const tipX = this.dirMult === -1 ? x1 : x2;
    const tipD = this.dirMult === -1 ? -1 : 1;
    ctx.fillStyle = '#ff6600';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(tipX, this.y - this.h * 0.5);
    ctx.lineTo(tipX + tipD * 12, this.y);
    ctx.lineTo(tipX, this.y + this.h * 0.5);
    ctx.fill();
    ctx.restore();
  }
}

class ItemBase {
  constructor(x, y, vx, type) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.type = type; // 'shield' or 'booster'
    this.r = BALL_R + 3;
    this.angle = Math.random() * Math.PI * 2;
    this.state = 'active'; // 'active' or 'pending'
    this.respawnTimer = 0;
    this.respawnDuration = 180; // 3 seconds
    this.rotSpeed = 0.028;
    this.pulse = 0;
  }
  update() {
    this.pulse += 0.055;
    if (this.state === 'pending') {
      if (--this.respawnTimer <= 0) {
        this.state = 'active';
        this.x = (this.vx > 0) ? -this.r - 5 : GAME_VWIDTH + this.r + 5;
        this.y = 60 + Math.random() * (FUNNEL_TOP_Y - 120);
      }
      return;
    }
    this.x += this.vx;
    this.angle += this.rotSpeed;
    if (this.x < -this.r - 25 || this.x > GAME_VWIDTH + this.r + 25) {
      this.collect(); // Just recycle it
    }
  }
  collect() {
    this.state = 'pending';
    this.respawnTimer = this.respawnDuration;
  }
  draw(ctx) {
    if (this.state !== 'active') return;
    const glow = 0.55 + 0.45 * Math.cos(this.pulse);
    const isShield = this.type === 'shield';
    const col = isShield ? '#00ccff' : '#ffaa00';
    const gcol = isShield ? '#0088ff' : '#ff6600';

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.shadowBlur = 8 + glow * 9;
    ctx.shadowColor = gcol;

    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = col;
    if (isShield) {
      const r = this.r * 0.52;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.75, -r * 0.4);
      ctx.lineTo(r * 0.75, r * 0.3);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.75, r * 0.3);
      ctx.lineTo(-r * 0.75, -r * 0.4);
      ctx.closePath();
      ctx.fill();
    } else {
      const s = this.r * 0.42;
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s);
      ctx.lineTo(-s * 0.1, 0);
      ctx.lineTo(s * 0.4, 0);
      ctx.lineTo(-s * 0.3, s);
      ctx.lineTo(s * 0.1, 0);
      ctx.lineTo(-s * 0.4, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

class ShieldItem extends ItemBase { constructor(x, y, vx) { super(x, y, vx, 'shield'); } }
class BoosterItem extends ItemBase { constructor(x, y, vx) { super(x, y, vx, 'booster'); } }

class AutoFlipper {
  constructor(x, y, length, isLeft, restAngleDeg, activeAngleDeg, periodMs) {
    this.x = x;
    this.y = y;
    this.length = length;
    this.isLeft = isLeft;
    this.restAngle = restAngleDeg * Math.PI / 180;
    this.activeAngle = activeAngleDeg * Math.PI / 180;
    this.period = periodMs;
    this.angle = this.restAngle;
    this.prevAngle = this.angle;
    this.angularVelocity = 0;
  }

  update(time) {
    this.prevAngle = this.angle;
    const cycle = time % this.period;
    const progress = cycle / this.period;
    let target = this.restAngle;
    if (progress < 0.15) { // 빠른 타격 (swing up)
      target = this.restAngle + (this.activeAngle - this.restAngle) * (progress / 0.15);
    } else if (progress < 0.35) { // 타격 유지 (hold)
      target = this.activeAngle;
    } else { // 서서히 복귀 (swing down)
      target = this.activeAngle + (this.restAngle - this.activeAngle) * ((progress - 0.35) / 0.65);
    }
    this.angle = target;
    this.angularVelocity = this.angle - this.prevAngle; 
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#222';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.isLeft ? this.length : -this.length, 0);
    ctx.stroke();
    
    ctx.lineWidth = 10;
    ctx.strokeStyle = this.isLeft ? '#ff0055' : '#0055ff'; // 좌측은 핑크, 우측은 블루
    ctx.stroke();
    ctx.restore();
  }

  collide(ball) {
    const L = this.isLeft ? this.length : -this.length;
    const endX = this.x + L * Math.cos(this.angle);
    const endY = this.y + L * Math.sin(this.angle);
    
    const dx = endX - this.x;
    const dy = endY - this.y;
    const lenSq = dx*dx + dy*dy;
    if (lenSq === 0) return;
    
    let t = ((ball.x - this.x)*dx + (ball.y - this.y)*dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const nearX = this.x + t * dx;
    const nearY = this.y + t * dy;
    
    const distSq = (ball.x - nearX)**2 + (ball.y - nearY)**2;
    const hitRadius = ball.r + 8; // 플리퍼 두께 고려
    
    if (distSq < hitRadius**2) {
      const dist = Math.sqrt(distSq) || 0.01;
      const overlap = hitRadius - dist;
      let nx = (ball.x - nearX) / dist;
      let ny = (ball.y - nearY) / dist;
      
      ball.x += nx * overlap;
      ball.y += ny * overlap;
      
      const rDist = t * this.length;
      // 각속도(라디안/프레임)를 초당/프레임당 속도로 변환하여 선속도 계산
      const pointVx = -rDist * this.angularVelocity * Math.sin(this.angle) * 1.5;
      const pointVy = rDist * this.angularVelocity * Math.cos(this.angle) * 1.5;
      
      const relVx = ball.vx - pointVx;
      const relVy = ball.vy - pointVy;
      
      const dot = relVx * nx + relVy * ny;
      if (dot < 0) {
        const restitution = 0.8;
        ball.vx -= (1 + restitution) * dot * nx;
        ball.vy -= (1 + restitution) * dot * ny;
        
        // 플리퍼가 강하게 치고 올라올 때 추가 반발력 (강스매시)
        if (Math.abs(this.angularVelocity) > 0.05) {
           const kick = Math.abs(this.angularVelocity) * 60;
           ball.vx += nx * kick;
           ball.vy += ny * kick;
           
           if (typeof spawnNearMissSparks === 'function') {
             spawnNearMissSparks(ball.x, ball.y, this.isLeft ? '#ff0055' : '#0055ff');
           }
        }
      }
    }
  }
}

class StaticWall {
  constructor(x1, y1, x2, y2, color='#00ffff', thickness=4, glow=8, bounciness=0.6) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    this.thickness = thickness;
    this.glow = glow;
    this.bounciness = bounciness;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    this.len = Math.hypot(dx, dy);
    // 방향 벡터 (nx, ny)는 선분에서 수직인 노멀 벡터 중 하나
    this.nx = -dy / this.len;
    this.ny = dx / this.len;
  }

  draw(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.thickness;
    ctx.strokeStyle = this.color;
    ctx.shadowBlur = this.glow;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
    
    // 이너 라인(화이트 톤)으로 네온관 느낌 강조
    if (this.thickness > 3) {
      ctx.lineWidth = this.thickness * 0.4;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
    ctx.restore();
  }

  collide(ball) {
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    if (this.len === 0) return;
    
    let t = ((ball.x - this.x1)*dx + (ball.y - this.y1)*dy) / (this.len * this.len);
    t = Math.max(0, Math.min(1, t));
    
    const nearX = this.x1 + t * dx;
    const nearY = this.y1 + t * dy;
    
    const distSq = (ball.x - nearX)**2 + (ball.y - nearY)**2;
    const hitRadius = ball.r + this.thickness / 2;
    
    if (distSq < hitRadius**2 && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = hitRadius - dist;
      
      // 노멀 벡터
      let nx = (ball.x - nearX) / dist;
      let ny = (ball.y - nearY) / dist;
      
      // 밀어내기 (Penetration resolution)
      ball.x += nx * overlap;
      ball.y += ny * overlap;
      
      // 속도 반사
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        // 반발계수(restitution) 적용
        const restitution = Math.max(0.2, Math.min(1.5, ball.restitution * this.bounciness * 1.5));
        ball.vx -= (1 + restitution) * dot * nx;
        ball.vy -= (1 + restitution) * dot * ny;
        
        // 아주 약간의 덤 스피드
        if (Math.hypot(ball.vx, ball.vy) < 2) {
           ball.vx += nx * 2;
           ball.vy += ny * 2;
        }
      }
    }
  }
}
