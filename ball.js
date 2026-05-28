/**
 * =================================================================
 *   CHAOS-DROP — RACING BALL CLASS
 * =================================================================
 * 물리 업데이트, Freeze Mode, 드로잉.
 * Zone 2.5 터널 물리는 applyMapZonePhysics(ball) 훅으로 위임 →
 * maps/classic-chaos.js 가 이 함수를 정의합니다.
 */

class RacingBall {
  constructor(id, name, x, y, color) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = BALL_R;
    this.color = color;
    this.gravity = BALL_GRAVITY;
    this.friction = BALL_FRICTION_BASE + Math.random() * BALL_FRICTION_RANGE;
    this.restitution = BALL_RESTITUTION;
    this.isFinished = false;
    this.finishTime = 0;
    this.portalCooldown = 0;

    this.nearMissTimer = 0;
    this.nearMissCooldown = 0;
    this.superChargeTimer = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.angularVelocity = 0;
    this.overtakeCooldown = 0;
  }

  update() {
    if (!pinballGameRunning) return;

    if (this.isFinished) {
      this.vy += this.gravity;
      this.vx *= 0.955;
      this.vy *= 0.955;

      this.x += this.vx;
      this.y += this.vy;

      const floorY = GOAL_Y + 38;
      if (this.y + this.r >= floorY) {
        this.y = floorY - this.r;
        this.vy = -Math.abs(this.vy) * 0.15;
        this.vx += (Math.random() - 0.5) * 0.12;
      }

      if (this.x - this.r < FUNNEL_BOTTOM_X) {
        this.x = FUNNEL_BOTTOM_X + this.r;
        this.vx = Math.abs(this.vx) * this.restitution + 0.1;
      } else if (this.x + this.r > GAME_VWIDTH - FUNNEL_BOTTOM_X) {
        this.x = GAME_VWIDTH - FUNNEL_BOTTOM_X - this.r;
        this.vx = -Math.abs(this.vx) * this.restitution - 0.1;
      }
      return;
    }

    if (this.portalCooldown > 0) this.portalCooldown--;
    if (this.nearMissCooldown > 0) this.nearMissCooldown--;
    if (this.superChargeTimer > 0) this.superChargeTimer--;

    if (this.nearMissTimer > 0) {
      this.nearMissTimer--;
      this.vy += this.gravity * 0.15;
      this.vy *= 0.85;
      this.vx += Math.sin(this.nearMissTimer * 0.8) * 1.5;

      if (this.nearMissTimer === 0) {
        this.vy = -4.5 - Math.random() * 2.5;
        this.vx = (Math.random() - 0.5) * 6.5;
        this.superChargeTimer = 65;
        spawnNearMissSparks(this.x, this.y, this.color);
        pinballLog(`${this.name} REBOUNDS! Escape Velocity Active.`);
      }
    } else {
      this.vy += this.gravity;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed < 0.25 && speed > 0) {
      this.vx *= 0.90;
      this.vy *= 0.90;
    }

    this.x += this.vx;
    this.y += this.vy;

    const curMaxSpeed = this.superChargeTimer > 0 ? MAX_SPEED_BOOST : MAX_SPEED_NORMAL;
    if (speed > curMaxSpeed) {
      this.vx = (this.vx / speed) * curMaxSpeed;
      this.vy = (this.vy / speed) * curMaxSpeed;
    }

    const _w = getWallAtY(this.y);
    if (this.x - this.r < _w.lx) {
      this.x = _w.lx + this.r;
      this.vx = Math.abs(this.vx) * this.restitution + 0.3;
    } else if (this.x + this.r > _w.rx) {
      this.x = _w.rx - this.r;
      this.vx = -Math.abs(this.vx) * this.restitution - 0.3;
    }

    if (this.y - this.r < 0) {
      this.y = this.r;
      this.vy = Math.abs(this.vy) * this.restitution;
    }

    // 맵별 Zone 물리 처리 (maps/classic-chaos.js → applyMapZonePhysics)
    if (typeof applyMapZonePhysics === 'function') applyMapZonePhysics(this);

    if (this.y >= FUNNEL_TOP_Y && this.y <= GOAL_Y) {
      const t = (this.y - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
      const lx = funnelLeftX + t * (FUNNEL_BOTTOM_X - funnelLeftX);
      const rx = funnelRightX - t * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
      if (this.x - this.r < lx) {
        this.x = lx + this.r;
        this.vx = Math.abs(this.vx) * 1.1 + 1.5;
      }
      if (this.x + this.r > rx) {
        this.x = rx - this.r;
        this.vx = -Math.abs(this.vx) * 1.1 - 1.5;
      }
    }

    // Freeze Zone: 하단 30%, 극저속 or 극고속 공 랜덤 발동
    if (freezeModeEnabled && !this.isFinished && this.nearMissTimer === 0 && this.nearMissCooldown === 0) {
      if (this.y >= GAME_VHEIGHT * 0.70) {
        const _spd = Math.hypot(this.vx, this.vy);
        const _slow = _spd < 2.0;
        const _fast = _spd > 9.0;
        const _chance = _slow ? 0.010 : _fast ? 0.020 : 0;
        if (_chance > 0 && Math.random() < _chance) {
          this.nearMissTimer = NEAR_MISS_DURATION;
          this.nearMissCooldown = NEAR_MISS_COOLDOWN;
          camDramaTarget = this;
          camDramaTimer = 65;
          pinballLog(`${this.name} FREEZE! ${_slow ? 'Too slow...' : 'Too fast!'}`);
        }
      }
    }

    if (this.y + this.r >= GOAL_Y) {
      this.isFinished = true;
      this.finishTime = Date.now();
      registerFinishedBall(this);
    }
  }

  draw(ctx) {
    if (this.superChargeTimer > 0) {
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.r * 1.3;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.globalAlpha = (this.superChargeTimer / 65) * 0.45;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 1.8, this.y - this.vy * 1.8);
      ctx.stroke();
      ctx.restore();
    }

    if (this.nearMissTimer > 0) {
      const wavePhase = (NEAR_MISS_DURATION - this.nearMissTimer) / NEAR_MISS_DURATION;
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 1 - wavePhase;

      ctx.strokeStyle = '#ff9900';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff9900';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + wavePhase * 35, 0, Math.PI * 2);
      ctx.stroke();

      if (wavePhase > 0.3) {
        ctx.strokeStyle = '#8c52ff';
        ctx.shadowColor = '#8c52ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + (wavePhase - 0.3) * 35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.shadowBlur = this.nearMissTimer > 0 ? 12 : 6;
    ctx.shadowColor = this.color;

    let grad = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, this.r);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, this.color);
    grad.addColorStop(1, 'rgba(0,0,0,0.6)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const cos = Math.cos(this.angle) * (this.r * 0.75);
    const sin = Math.sin(this.angle) * (this.r * 0.75);
    ctx.moveTo(this.x - cos, this.y - sin);
    ctx.lineTo(this.x + cos, this.y + sin);
    ctx.moveTo(this.x + sin, this.y - cos);
    ctx.lineTo(this.x - sin, this.y + cos);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    if (this.nearMissTimer > 0) {
      const blink = Math.floor(Date.now() / 90) % 2 === 0;
      ctx.fillStyle = blink ? '#00f0ff' : '#ffffff';
      ctx.shadowBlur = blink ? 8 : 4;
      ctx.shadowColor = '#00f0ff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❄ Freeze!', this.x, this.y - this.r - 18);
      ctx.font = 'bold 13px Outfit, sans-serif';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = 'bold 10px Outfit, sans-serif';
      ctx.textAlign = 'center';
    }
    ctx.fillText(this.name, this.x, this.y - this.r - 4);
    ctx.restore();

    const _inVortex = pinballVortexes.some(v => Math.hypot(this.x - v.x, this.y - v.y) < v.r);
    if (this.nearMissTimer === 0 && !this.isFinished && _inVortex && Math.hypot(this.vx, this.vy) < 2.0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 7px Outfit, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.shadowBlur = 2;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.fillText('SLOW', this.x, this.y + 2);
      ctx.restore();
    }

    this.angularVelocity = (this.vx * 0.05) + (this.nearMissTimer > 0 ? 0.65 : 0);
    this.angle += this.angularVelocity;
  }
}
