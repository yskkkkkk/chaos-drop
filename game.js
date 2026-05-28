/**
 * =================================================================
 *   CHAOS-DROP NEON PINBALL SYSTEM - GAME ENGINE
 * =================================================================
 * 이 파일은 2D 리얼타임 물리 연산, 충돌 반응, 카메라 멀티프레이밍, 
 * 그리고 60FPS 하드웨어 프레임 동기화 락을 포함한 핵심 게임 로직을 담당합니다.
 */

// ── [전역 동적 상태 상태 변수군] ────────────────────────────────
let cameraY = 0;            // 뷰포트 종스크롤 카메라 Y좌표
let cameraZoom = 1.0;       // 현재 줌 배율 (damped)
let cameraZoomTarget = 1.0; // 목표 줌 배율

let pinballCanvas, pinballCtx;
let pinballAnimId = null;
let pinballBalls = [];
let pinballPegs = [];
let pinballSpinners = [];
let pinballBumpers = [];
let pinballPortals = [];
let pinballVortexes = [];
let pinballLaunchPads = [];
let pinballFinishedBalls = [];

let pinballGameRunning = false;
let pinballConfettiParticles = [];
let pinballNearMissSparks = [];
let varChecking = false;
let varTimer = 0;
let varTriggered = false; // VAR Photo Finish가 이번 레이스에서 실행되었는지 플래그
let currentRule = 'first';
let winCount = 2;
let specificRank = 3;
let wallProfile = [];
let funnelLeftX = 0;
let funnelRightX = GAME_VWIDTH;
let raceStartTime = 0;
let hasAnnouncedWinners = false;
let camDramaTimer = 0;      // 드라마 컷 잔여 프레임
let camDramaTarget = null;  // 드라마 컷 포커스 구슬
let camFocusBall = null;    // Focus Lock: 현재 고정된 포커스 볼
let camFocusCooldown = 0;   // Focus Lock: 전환 쿨다운 (30프레임)
let decisiveMomentActive = false; // 결승 순간 진입 여부 (첫 프레임 스냅용)
let freezeModeEnabled = true; // ❄️ Freeze Mode 활성화 여부
let prevRankOrder = [];     // 역전 감지용 이전 프레임 순위 배열
let overtakeParticles = []; // 역전! 텍스트 파티클
let currentLeaderId = -1;  // 현재 선두 구슬 ID
let crownFlashTimer = 0;   // 왕관 교체 플래시 타이머


// ── 1. 게임 엔티티 클래스군 정의 (Classes) ───────────────────────

// 1) 포탈 클래스 (단방향: 아래 IN -> 위 OUT)
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
    
    // 입구 (x1, y1)
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

    // 출구 (x2, y2)
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

// 2) 회전 스피너 클래스
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

// 3) 네온 초탄성 범퍼 클래스
class SuperBumper {
  constructor(x, y, r, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;
    this.pulse = 0;
  }
  trigger() {
    this.pulse = 1.0;
  }
  update() {
    this.pulse *= 0.9;
  }
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

// 4) 중력 지연 와류 영역 클래스
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
    for(let i = 0; i < 4; i++) {
      ctx.moveTo(0,0);
      ctx.quadraticCurveTo(this.r/2, this.r/2, Math.cos(i * Math.PI/2)*this.r*0.8, Math.sin(i * Math.PI/2)*this.r*0.8);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// 5) 상향 발사대 클래스
class LaunchPad {
  constructor(x, y, w, color, angle = 0, slideSpeed = 0.55, slideRange = 52) {
    this.x = x;
    this.y = y;
    this.baseX = x;   // 초록판 좌우 이동 기준점
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
    // 노란판: 천천히 360° 회전
    if (this.color === '#ffea00') this.angle += 0.006;
    // 초록판: 좌우 왕복 이동
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

// 6) 핀(장애물) 클래스
class Peg {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.pulse = 0;
  }
  trigger() {
    this.pulse = 1.0;
  }
  update() {
    this.pulse *= 0.88;
  }
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

// 7) 레이싱 구슬 클래스
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

    // Near Miss 및 카오스 전용 개별 속성
    this.nearMissTimer = 0;
    this.nearMissCooldown = 0;
    this.superChargeTimer = 0; // 충돌 폭주 연출용 프레임 타이머
    this.angle = Math.random() * Math.PI * 2;
    this.angularVelocity = 0;
    this.overtakeCooldown = 0;  // 역전 이펙트 재발동 방지
  }
  update() {
    if (!pinballGameRunning) return;

    // 골인 이후 바닥에서의 관성 미끄러짐 효과
    if (this.isFinished) {
      this.vy += this.gravity;
      this.vx *= 0.955;
      this.vy *= 0.955;

      this.x += this.vx;
      this.y += this.vy;

      const floorY = GOAL_Y + 38;
      if (this.y + this.r >= floorY) {
        this.y = floorY - this.r;
        this.vy = -Math.abs(this.vy) * 0.15; // 가볍게 튕김
        this.vx += (Math.random() - 0.5) * 0.12; // 미세 진동
      }

      if (this.x - this.r < 300) {
        this.x = 300 + this.r;
        this.vx = Math.abs(this.vx) * this.restitution + 0.1;
      } else if (this.x + this.r > GAME_VWIDTH - 300) {
        this.x = GAME_VWIDTH - 300 - this.r;
        this.vx = -Math.abs(this.vx) * this.restitution - 0.1;
      }
      return;
    }

    if (this.portalCooldown > 0) this.portalCooldown--;
    if (this.nearMissCooldown > 0) this.nearMissCooldown--;
    if (this.superChargeTimer > 0) this.superChargeTimer--;

    // Near Miss 무중력 호버링 / 좌우 부르르 물리 효과
    if (this.nearMissTimer > 0) {
      this.nearMissTimer--;
      this.vy += this.gravity * 0.15; // 중력 15%로 격감 (무중력감)
      this.vy *= 0.85;                // 마찰 감속
      this.vx += Math.sin(this.nearMissTimer * 0.8) * 1.5; // 좌우 셰이킹

      if (this.nearMissTimer === 0) {
        this.vy = -4.5 - Math.random() * 2.5; // 위로 강하게 튕김
        this.vx = (Math.random() - 0.5) * 6.5;
        this.superChargeTimer = 65; // 폭주 상태 활성화
        spawnNearMissSparks(this.x, this.y, this.color);
        pinballLog(`${this.name} REBOUNDS! Escape Velocity Active.`);
      }
    } else {
      this.vy += this.gravity;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;

    // 최저 속도 덤핑
    const speed = Math.hypot(this.vx, this.vy);
    if (speed < 0.25 && speed > 0) {
      this.vx *= 0.90;
      this.vy *= 0.90;
    }

    this.x += this.vx;
    this.y += this.vy;

    // 최대 속도 클램핑 (폭주 시 최대 BOOST 적용)
    const curMaxSpeed = this.superChargeTimer > 0 ? MAX_SPEED_BOOST : MAX_SPEED_NORMAL;
    if (speed > curMaxSpeed) {
      this.vx = (this.vx / speed) * curMaxSpeed;
      this.vy = (this.vy / speed) * curMaxSpeed;
    }

    // 외벽 충돌 처리
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

    // 깔때기 가변 채널 한계 검사
    if (this.y >= FUNNEL_TOP_Y && this.y <= GOAL_Y) {
      const t = (this.y - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
      const lx = funnelLeftX + t * (300 - funnelLeftX);
      const rx = funnelRightX - t * (funnelRightX - (GAME_VWIDTH - 300));
      if (this.x - this.r < lx) {
        this.x = lx + this.r;
        this.vx = Math.abs(this.vx) * 1.1 + 1.5;
      }
      if (this.x + this.r > rx) {
        this.x = rx - this.r;
        this.vx = -Math.abs(this.vx) * 1.1 - 1.5;
      }
    }

    // ❄️ Freeze Zone: 하단 30% 영역 확률적 프리즈
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

    // 결승선 골인 판정
    if (this.y + this.r >= GOAL_Y) {
      this.isFinished = true;
      this.finishTime = Date.now();
      registerFinishedBall(this);
    }
  }
  draw(ctx) {
    // 폭주 잔상 꼬리 효과
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

    // Near Miss 무중력 파동 드로잉
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

    // 십자형 네온 굴림 데칼 회전 시각화
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

    // 상단 구슬 이름표
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

    // SLOW 표시 (와류 속 저속 구슬용)
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

    // 데칼 회전각 업데이트
    this.angularVelocity = (this.vx * 0.05) + (this.nearMissTimer > 0 ? 0.65 : 0);
    this.angle += this.angularVelocity;
  }
}

// 스파크 파티클 생성기
function spawnNearMissSparks(x, y, color) {
  const sparkColors = [color, '#ffffff', '#ff9900', '#ff3366'];
  for (let i = 0; i < 18; i++) {
    pinballNearMissSparks.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2.5,
      r: Math.random() * 2.2 + 1.5,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      gravity: 0.08,
      life: 40 + Math.floor(Math.random() * 15),
      maxLife: 55
    });
  }
}


// ── 2. 가변 맵 지형 벽 프로필 보간 ────────────────────────────────

function generateWallProfile() {
  wallProfile = [];
  wallProfile.push({ y: 0,          lx: 0, rx: GAME_VWIDTH });
  wallProfile.push({ y: 100,        lx: 0, rx: GAME_VWIDTH });

  let y = 100;
  let lastLx = 0;
  let lastRx = GAME_VWIDTH;
  while (y < FUNNEL_TOP_Y - 150) {
    const segH = 100 + Math.floor(Math.random() * 200);
    y = Math.min(y + segH, FUNNEL_TOP_Y - 150);

    const lx = Math.random() < 0.70 ? 10 + Math.random() * 180 : 0;
    const rx = GAME_VWIDTH - (Math.random() < 0.70 ? 10 + Math.random() * 180 : 0);
    const safeRx = Math.max(rx, lx + 300);
    lastLx = lx;
    lastRx = Math.min(safeRx, GAME_VWIDTH);
    wallProfile.push({ y, lx: lastLx, rx: lastRx });
  }

  funnelLeftX = lastLx;
  funnelRightX = lastRx;
  wallProfile.push({ y: FUNNEL_TOP_Y, lx: funnelLeftX,  rx: funnelRightX });
  wallProfile.push({ y: GOAL_Y,       lx: 300,          rx: GAME_VWIDTH - 300 });
}

function getWallAtY(y) {
  for (let i = 0; i < wallProfile.length - 1; i++) {
    const v0 = wallProfile[i], v1 = wallProfile[i + 1];
    if (y >= v0.y && y <= v1.y) {
      const t = (y - v0.y) / (v1.y - v0.y);
      return {
        lx: v0.lx + t * (v1.lx - v0.lx),
        rx: v0.rx + t * (v1.rx - v0.rx)
      };
    }
  }
  return { lx: 0, rx: GAME_VWIDTH };
}


// ── 3. 맵 초기화 및 구성 배치 (Obstacle Map Generator) ─────────────

function initPinballMap() {
  generateWallProfile();
  pinballPegs = [];
  pinballSpinners = [];
  pinballBumpers = [];
  pinballPortals = [];
  pinballVortexes = [];
  pinballLaunchPads = [];

  const W  = GAME_VWIDTH;
  const cx = W / 2;

  const rj = (v, range, lo = 40, hi = W - 40) =>
    Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * 2 * range));
  const rjy = (v, range) =>
    Math.max(100, Math.min(FUNNEL_TOP_Y - 80, v + (Math.random() - 0.5) * 2 * range));
  const rjwall = (v, range, y, margin = 55) => {
    const ww = getWallAtY(y);
    const lo = Math.max(margin, ww.lx + margin);
    const hi = Math.min(W - margin, ww.rx - margin);
    if (lo >= hi) return (lo + hi) / 2;
    return Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * 2 * range));
  };
  const gkeep = (y) => Math.random() < (0.80 + 0.20 * Math.min(1, y / FUNNEL_TOP_Y));
  const randAngle = () => (Math.random() - 0.5) * (Math.PI * 0.45);

  // 1) 포탈 배치 (단방향 IN Y > OUT Y, 세로 간격 500px 이하 제한)
  const portalAlphaInY = rjy(750, 40);
  const portalAlphaOutY = portalAlphaInY - (250 + Math.random() * 200);
  pinballPortals.push(new TeleportPortal(rj(160,70), portalAlphaInY, rj(660,70), portalAlphaOutY, '#00f0ff', 'PORTAL-α'));

  const portalBetaInY = rjy(1850, 40);
  const portalBetaOutY = portalBetaInY - (250 + Math.random() * 200);
  pinballPortals.push(new TeleportPortal(rj(220,70), portalBetaInY, rj(600,70), portalBetaOutY, '#ff9900', 'PORTAL-β'));

  // 2) 네온 탄성 범퍼 배치 (12개)
  { let y=rjy(380,50);  if(gkeep(y)) pinballBumpers.push(new SuperBumper(rjwall(cx,60,y,55),  y, 20, '#ff9900')); }
  { let y=rjy(620,50);  if(gkeep(y)) pinballBumpers.push(new SuperBumper(rjwall(185,60,y,50), y, 18, '#00f0ff')); }
  { let y=rjy(620,50);  if(gkeep(y)) pinballBumpers.push(new SuperBumper(rjwall(640,60,y,50), y, 18, '#00f0ff')); }
  { let y=rjy(960,50);  if(gkeep(y)) pinballBumpers.push(new SuperBumper(rjwall(cx,60,y,55),  y, 22, '#8c52ff')); }
  { let y=rjy(1280,50); if(gkeep(y)) pinballBumpers.push(new SuperBumper(rjwall(140,60,y,50), y, 18, '#ff9900')); }
  { let y=rjy(1280,50); if(gkeep(y)) pinballBumpers.push(new SuperBumper(rjwall(685,60,y,50), y, 18, '#ff9900')); }
  { let y=rjy(1650,50); if(gkeep(y)) pinballBumpers.push(new SuperBumper(rjwall(cx,60,y,55),  y, 22, '#00f0ff')); }
  { let y=rjy(2080,50); pinballBumpers.push(new SuperBumper(rjwall(280,60,y,50), y, 20, '#8c52ff')); }
  { let y=rjy(2080,50); pinballBumpers.push(new SuperBumper(rjwall(545,60,y,50), y, 20, '#8c52ff')); }
  { let y=rjy(2480,50); pinballBumpers.push(new SuperBumper(rjwall(cx,60,y,55),  y, 22, '#ff9900')); }
  { let y=rjy(2780,50); pinballBumpers.push(new SuperBumper(rjwall(200,60,y,50), y, 18, '#00f0ff')); }
  { let y=rjy(2780,50); pinballBumpers.push(new SuperBumper(rjwall(625,60,y,50), y, 18, '#00f0ff')); }

  // 3) 스피너 배치 (9개)
  { let y=rjy(240,40);  if(gkeep(y)) pinballSpinners.push(new Spinner(rjwall(cx,60,y,60),  y, 26, '#8c52ff')); }
  { let y=rjy(730,50);  if(gkeep(y)) pinballSpinners.push(new Spinner(rjwall(140,60,y,55), y, 22, '#ff9900')); }
  { let y=rjy(730,50);  if(gkeep(y)) pinballSpinners.push(new Spinner(rjwall(685,60,y,55), y, 22, '#ff9900')); }
  { let y=rjy(1120,50); if(gkeep(y)) pinballSpinners.push(new Spinner(rjwall(cx,60,y,60),  y, 26, '#00f0ff')); }
  { let y=rjy(1520,50); if(gkeep(y)) pinballSpinners.push(new Spinner(rjwall(180,60,y,55), y, 22, '#8c52ff')); }
  { let y=rjy(1520,50); if(gkeep(y)) pinballSpinners.push(new Spinner(rjwall(645,60,y,55), y, 22, '#8c52ff')); }
  { let y=rjy(1980,50); pinballSpinners.push(new Spinner(rjwall(cx,60,y,60),  y, 26, '#ff9900')); }
  { let y=rjy(2380,50); pinballSpinners.push(new Spinner(rjwall(cx,60,y,60),  y, 26, '#00f0ff')); }
  { let y=rjy(2750,50); pinballSpinners.push(new Spinner(rjwall(cx,60,y,60),  y, 28, '#8c52ff')); }

  // 4) 와류 영역 배치 (5개)
  { let y=rjy(820,50);  pinballVortexes.push(new SlowVortex(rjwall(290,60,y,90), y, 75, '#8c52ff')); }
  { let y=rjy(820,50);  pinballVortexes.push(new SlowVortex(rjwall(535,60,y,90), y, 75, '#8c52ff')); }
  { let y=rjy(1900,50); pinballVortexes.push(new SlowVortex(rjwall(240,60,y,90), y, 78, '#8c52ff')); }
  { let y=rjy(1900,50); pinballVortexes.push(new SlowVortex(rjwall(585,60,y,90), y, 78, '#8c52ff')); }
  { let y=rjy(2620,50); pinballVortexes.push(new SlowVortex(rjwall(cx,60,y,90),  y, 83, '#8c52ff')); }

  // 5) 상향 발사대 배치 (12개)
  { let y=rjy(480,50);  if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(rjwall(cx,50,y,80),  y, 110, '#ff3366', randAngle())); }
  { let y=rjy(780,50);  if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(rjwall(190,50,y,75), y, 90,  '#ffea00', randAngle())); }
  { let y=rjy(780,50);  if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(rjwall(635,50,y,75), y, 90,  '#ffea00', randAngle())); }
  { let y=rjy(1100,50); if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(rjwall(cx,50,y,80),  y, 120, '#ff3366', randAngle())); }
  { let y=rjy(1480,50); if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(rjwall(170,50,y,75), y, 70,  '#33ff57', randAngle())); }
  { let y=rjy(1480,50); if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(rjwall(655,50,y,75), y, 70,  '#33ff57', randAngle())); }
  { let y=rjy(1760,50); pinballLaunchPads.push(new LaunchPad(rjwall(cx,50,y,80),  y, 130, '#ff3366', randAngle())); }
  { let y=rjy(2150,50); pinballLaunchPads.push(new LaunchPad(rjwall(250,50,y,75), y, 90,  '#ffea00', randAngle())); }
  { let y=rjy(2150,50); pinballLaunchPads.push(new LaunchPad(rjwall(575,50,y,75), y, 90,  '#ffea00', randAngle())); }
  { let y=rjy(2500,50); pinballLaunchPads.push(new LaunchPad(rjwall(cx,50,y,80),  y, 70,  '#33ff57', randAngle())); }
  { let y=rjy(2850,50); pinballLaunchPads.push(new LaunchPad(rjwall(300,50,y,75), y, 90,  '#ffea00', randAngle())); }
  { let y=rjy(2850,50); pinballLaunchPads.push(new LaunchPad(rjwall(525,50,y,75), y, 90,  '#ffea00', randAngle())); }

  // 6) 깔때기 입구 극적 역전 지대 (Reversal Zone)
  pinballSpinners.push(new Spinner(412.5, 2840, 26, '#00f0ff'));
  pinballBumpers.push(new SuperBumper(412.5, 2950, 24, '#ff00ff'));

  // 깔때기 경사면 런치패드
  const t_lp = (3060 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx_lp = funnelLeftX + t_lp * (300 - funnelLeftX);
  const rx_lp = funnelRightX - t_lp * (funnelRightX - (GAME_VWIDTH - 300));
  pinballLaunchPads.push(new LaunchPad(lx_lp + 25, 3060, 70, '#ffea00', Math.PI * 0.12));
  pinballLaunchPads.push(new LaunchPad(rx_lp - 25, 3060, 70, '#ff3366', -Math.PI * 0.18));
  pinballLaunchPads.push(new LaunchPad(cx, 3050, 140, '#33ff57', 0, 1.1, 52));

  // 7) 핀(Peg) 그리드 형태 랜덤 배치
  const gapX = 28;
  const gapY = 28;
  const pegStartY = 160;
  const pegEndY   = FUNNEL_TOP_Y - 60;
  const jitter = gapX * 0.55;

  for (let row = 0; pegStartY + row * gapY <= pegEndY; row++) {
    const baseY = pegStartY + row * gapY;
    const w = getWallAtY(baseY);
    const startX = w.lx + 45;
    const endX   = w.rx - 45;
    
    // 포탈/기믹 근접 스킵 컬링
    const skipList = [];
    pinballBumpers.forEach(b => { if(Math.abs(b.y - baseY) < 55) skipList.push({x: b.x, r: b.r + 32}); });
    pinballSpinners.forEach(s => { if(Math.abs(s.y - baseY) < 50) skipList.push({x: s.x, r: s.r + 28}); });
    pinballVortexes.forEach(v => { if(Math.abs(v.y - baseY) < 95) skipList.push({x: v.x, r: v.r + 30}); });
    pinballLaunchPads.forEach(lp => { if(Math.abs(lp.y - baseY) < 40) skipList.push({x: lp.x, r: lp.w/2 + 25}); });
    pinballPortals.forEach(p => {
      if(Math.abs(p.y1 - baseY) < 42) skipList.push({x: p.x1, r: p.r + 30});
      if(Math.abs(p.y2 - baseY) < 42) skipList.push({x: p.x2, r: p.r + 30});
    });

    const isEven = row % 2 === 0;
    const rowOffset = isEven ? gapX / 2 : 0;

    for (let x = startX + rowOffset; x <= endX; x += gapX) {
      let isOverlap = false;
      for (const skip of skipList) {
        if (Math.abs(x - skip.x) < skip.r) { isOverlap = true; break; }
      }
      if (isOverlap) continue;

      // 82% 밀도로 핀 배치
      if (Math.random() < 0.82) {
        const px = x + (Math.random() - 0.5) * jitter;
        const py = baseY + (Math.random() - 0.5) * 8;
        pinballPegs.push(new Peg(px, py, 3.2));
      }
    }
  }
}


// ── 4. 게임 판정 및 비즈니스 로직 (Referee & Logging & Finishers) ──

function registerFinishedBall(ball) {
  if (pinballFinishedBalls.some(b => b.id === ball.id)) return;
  pinballFinishedBalls.push(ball);
  
  const elapsedSec = ((ball.finishTime - raceStartTime) / 1000).toFixed(3);
  pinballLog(`🏁 [GOAL] #${pinballFinishedBalls.length} : ${ball.name} (${elapsedSec}초)`);

  renderLeaderboard();

  // 특정 룰/당첨인원수 매칭 확인
  if (currentRule === 'first' && pinballFinishedBalls.length === winCount) {
    checkWinningConditions();
  } else if (currentRule === 'last' && pinballFinishedBalls.length === pinballBalls.length) {
    checkWinningConditions();
  } else if (currentRule === 'specific' && pinballFinishedBalls.length === specificRank) {
    checkWinningConditions();
  } else if (pinballFinishedBalls.length === pinballBalls.length) {
    checkWinningConditions(); // 최후의 안전장치
  }
}

function renderLeaderboard() {
  const body = document.getElementById('leaderboard-body');
  if (!body) return;
  body.innerHTML = '';

  const rows = [];
  
  // 1) 완주 구슬들 리스트업
  pinballFinishedBalls.forEach((b, idx) => {
    const elapsed = ((b.finishTime - raceStartTime) / 1000).toFixed(2);
    rows.push({ rank: idx + 1, name: b.name, record: `${elapsed}초` });
  });

  // 2) 미완주 구슬들은 현재 Y축 깊이 기준으로 역순 정렬 표기 (실시간 중계)
  if (pinballGameRunning) {
    const active = pinballBalls.filter(b => !b.isFinished).sort((a, b) => b.y - a.y);
    active.forEach(b => {
      rows.push({ rank: '-', name: b.name, record: '달리는 중...' });
    });
  }

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="3" style="text-align:center; color:rgba(255,255,255,0.2); padding: 20px 0;">구슬 경주 대기 중...</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement('tr');
    const isTop = r.rank === 1 || r.rank === 2 || r.rank === 3;
    const rankClass = isTop ? 'leaderboard-rank top-rank' : 'leaderboard-rank';
    
    tr.innerHTML = `
      <td class="${rankClass}">${r.rank}</td>
      <td>${r.name}</td>
      <td style="text-align:right; font-variant-numeric:tabular-nums; font-weight:600;">${r.record}</td>
    `;
    body.appendChild(tr);
  });
}

function checkWinningConditions() {
  if (hasAnnouncedWinners) return;

  // 당첨 구슬 판정
  let winners = [];
  if (currentRule === 'first') {
    winners = pinballFinishedBalls.slice(0, winCount);
  } else if (currentRule === 'last') {
    winners = pinballFinishedBalls.slice(pinballFinishedBalls.length - winCount);
  } else if (currentRule === 'specific') {
    winners = [pinballFinishedBalls[specificRank - 1]];
  }

  winners = winners.filter(Boolean);

  if (winners.length > 0) {
    hasAnnouncedWinners = true;
    
    // 골인 연출 활성화
    triggerPinballConfetti();
    showWinningPopup(winners);
    
    const winNames = winners.map(w => w.name).join(", ");
    pinballLog(`🏆 [RACE COMPLETED] 당첨자: ${winNames}`);
    
    const btnLaunch = document.getElementById('btn-pinball-launch');
    if (btnLaunch) { btnLaunch.disabled = true; btnLaunch.style.opacity = '0.3'; }
  }
}

function showWinningPopup(winners) {
  const modal = document.getElementById('pinball-result-modal');
  const wText = document.getElementById('pinball-winner-text');
  const wTitle = document.getElementById('modal-rule-title');
  if (!modal || !wText) return;

  const names = winners.map(w => w.name).join(", ");
  wText.innerText = names;

  if (currentRule === 'first') wTitle.innerText = '선착순 당첨! (1등 커피 획득)';
  else if (currentRule === 'last')  wTitle.innerText = '🛡️ 벌칙 후착 당첨! (꼴찌 벌칙 수행)';
  else wTitle.innerText = `🎯 지정 순번 당첨! (${specificRank}번째 골인)`;

  modal.style.display = 'block';
}

function updatePreviewBalls() {
  const input = document.getElementById('pinball-members');
  if (!input) return;
  const list = input.value.split(',').map(n => n.trim()).filter(Boolean);
  
  const span = document.getElementById('btn-shuffle-members');
  if (span) {
    span.innerText = `순서섞기 (${list.length}명)`;
  }
}

function updateSpecificRankSelect() {
  const select = document.getElementById('pinball-specific-rank');
  const input = document.getElementById('pinball-members');
  if (!select || !input) return;

  const list = input.value.split(',').map(n => n.trim()).filter(Boolean);
  const len = list.length;
  select.innerHTML = '';
  
  for (let i = 1; i <= len; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = `${i}번째 골인자`;
    if (i === 3) opt.selected = true;
    select.appendChild(opt);
  }
}

function shuffleMembers() {
  const input = document.getElementById('pinball-members');
  if (!input) return;
  const arr = input.value.split(',').map(n => n.trim()).filter(Boolean);
  
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  input.value = arr.join(', ');
  pinballLog("Shuffle: 구슬 참전 탑승 순서 교환 완료.");
}

function pinballLog(msg) {
  const term = document.getElementById('pinball-terminal');
  if (!term) return;
  
  const div = document.createElement('div');
  div.innerText = `> ${msg}`;
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
}


// ── 5. 레이스 발사 기동 연출 (Launch Action) ─────────────────────

function launchPinballRacing() {
  if (pinballGameRunning) return;

  const input = document.getElementById('pinball-members');
  if (!input) return;
  const members = input.value.split(',').map(n => n.trim()).filter(Boolean);

  if (members.length === 0) {
    alert('경주에 참여할 팀원 명단을 1명 이상 입력해 주세요!');
    return;
  }

  // 룰 동기화
  const ruleVal = document.querySelector('input[name="pinball-rule"]:checked').value;
  currentRule = ruleVal;
  winCount = parseInt(document.getElementById('pinball-win-count').value) || 2;
  specificRank = parseInt(document.getElementById('pinball-specific-rank').value) || 3;

  pinballFinishedBalls = [];
  pinballBalls = [];
  hasAnnouncedWinners = false;
  camDramaTimer = 0;
  camDramaTarget = null;
  camFocusBall = null;
  camFocusCooldown = 0;
  cameraZoom = 1.0;
  cameraZoomTarget = 1.0;
  prevRankOrder = [];
  overtakeParticles = [];
  pinballNearMissSparks = [];
  currentLeaderId = -1;
  crownFlashTimer = 0;
  decisiveMomentActive = false;

  const btnShuffle = document.getElementById('btn-shuffle-members');
  if (btnShuffle) btnShuffle.disabled = true;

  // 구슬 인스턴스 생성
  const spacing = GAME_VWIDTH / (members.length + 1);
  
  members.forEach((name, idx) => {
    const color = COLOR_SPECTRUM[idx % COLOR_SPECTRUM.length];
    const rx = spacing * (idx + 1) + (Math.random() - 0.5) * 12;
    const ry = 42 + (Math.random() - 0.5) * 18;
    pinballBalls.push(new RacingBall(idx, name, rx, ry, color));
  });

  renderLeaderboard();

  // 대포 발사 대기 연출
  pinballLog("Charging Quantum thruster cannons...");
  let count = 3;
  
  const timer = setInterval(() => {
    if (count > 0) {
      pinballLog(`Launch countdown: ${count}...`);
      count--;
    } else {
      clearInterval(timer);
      
      pinballGameRunning = true;
      raceStartTime = Date.now();
      
      // 상향 대포 추진 발사
      pinballBalls.forEach(b => {
        const _t = b.x / GAME_VWIDTH;
        const _centerPull = (0.5 - _t) * 9;
        const _jitter = (Math.random() - 0.5) * 2.5;
        b.vx = _centerPull + _jitter;
        b.vy = -Math.random() * 8.5 - 3.5;
      });

      pinballLog("RACE IN PROGRESS. QUANTUM ENTANGLEMENT ESTABLISHED.");
    }
  }, 900);
}


// ── 6. 고품격 60FPS 애니메이션 드로잉 및 물리 프레임 루프 ───────────

let lastTime = 0;

function animatePinball(currentTime) {
  pinballAnimId = requestAnimationFrame(animatePinball);
  
  const now = currentTime || performance.now();
  if (!lastTime) lastTime = now;
  const elapsed = now - lastTime;
  
  // 60FPS 주기 강제 홀딩 장치
  if (elapsed < FPS_INTERVAL) {
    return;
  }
  lastTime = now - (elapsed % FPS_INTERVAL);

  if (!pinballCanvas || !pinballCtx) return;
  const ctx = pinballCtx;
  const VW = GAME_VWIDTH;
  const VH = GAME_VHEIGHT;
  const CH = pinballCanvas.height;

  // VAR 슬로우모션 연산 제어
  let shouldRunPhysics = true;
  if (varChecking) {
    varTimer--;
    shouldRunPhysics = (varTimer % 8 === 0);
    if (varTimer <= 0) {
      varChecking = false;
      checkWinningConditions();
    }
  }

  // A. 카메라 스크롤 & 줌 바인딩
  const activeBalls = pinballBalls.filter(b => !b.isFinished);
  if (activeBalls.length > 0 && pinballGameRunning) {
    // ① 타이머 감소
    if (camDramaTimer > 0) { camDramaTimer--; if (camDramaTimer === 0) camDramaTarget = null; }

    const _camSorted = [...activeBalls].sort((a, b) => b.y - a.y);

    // ② 근접 추월 경쟁 VAR 컷 감지 (70px 접전)
    if (camDramaTimer === 0 && _camSorted.length >= 2) {
      if (_camSorted[0].y - _camSorted[1].y < 70) {
        camDramaTarget = _camSorted[1];
        camDramaTimer = 50;
      }
    }

    // ③ 꼴찌 역전 컷
    if (camDramaTimer === 0 && Math.random() < 0.001) {
      camDramaTarget = _camSorted[_camSorted.length - 1];
      camDramaTimer = 90;
    }

    // ④ 파이널 존 해제
    const _anyInFunnel = activeBalls.some(b => b.y > FUNNEL_TOP_Y);
    if (_anyInFunnel) { camDramaTimer = 0; camDramaTarget = null; }

    // ⑤ Multi-target framing 연산
    let _camTargets;
    if (camDramaTarget) {
      _camTargets = [camDramaTarget];
    } else if (_anyInFunnel) {
      _camTargets = [_camSorted[0]];
    } else if (currentRule === 'first') {
      _camTargets = _camSorted.slice(0, Math.min(3, _camSorted.length));
    } else if (currentRule === 'last') {
      const _keepCount = winCount + 2;
      _camTargets = _camSorted.slice(Math.max(0, _camSorted.length - _keepCount));
      if (_camTargets.length === 0) _camTargets = [_camSorted[_camSorted.length - 1]];
    } else {
      const _tIdx = Math.min(specificRank - 1, _camSorted.length - 1);
      _camTargets = _camSorted.slice(Math.max(0, _tIdx - 2), Math.min(_camSorted.length, _tIdx + 3));
    }

    const _tMinY = Math.min(..._camTargets.map(b => b.y));
    const _tMaxY = Math.max(..._camTargets.map(b => b.y));
    const _tCenterY = (_tMinY + _tMaxY) / 2;
    const _spreadY = _tMaxY - _tMinY;

    const _lerp = (_anyInFunnel || camDramaTarget) ? 0.12 : 0.05;
    const targetCY = _tCenterY - CH / 2;
    cameraY += (targetCY - cameraY) * _lerp;
    cameraY = Math.max(0, Math.min(cameraY, VH - CH));

    // ⑥ 줌 크기 제한 조율 (가로 흔들림 방지 피벗 설계)
    if (_anyInFunnel) {
      cameraZoomTarget = 1.05;
    } else {
      cameraZoomTarget = Math.max(1.0, Math.min(1.03, 1.03 - _spreadY * 0.0001));
    }
    cameraZoom += (cameraZoomTarget - cameraZoom) * 0.02;
  } else {
    cameraZoomTarget = 1.0;
    cameraZoom += (cameraZoomTarget - cameraZoom) * 0.02;
  }

  // B. 배경
  ctx.fillStyle = '#06070d';
  ctx.fillRect(0, 0, pinballCanvas.width, pinballCanvas.height);

  // C. 카메라 행렬 및 줌 피벗 얼라인먼트 (버그 픽스 정밀 배치)
  ctx.save();
  const _zoomCX = GAME_X_OFFSET + GAME_VWIDTH / 2;
  const _zoomCY = CH / 2;
  ctx.translate(_zoomCX, _zoomCY);
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-_zoomCX, -_zoomCY);
  ctx.translate(GAME_X_OFFSET, -cameraY);

  const visY0 = cameraY;
  const visY1 = cameraY + CH;
  
  let bgGrad = ctx.createRadialGradient(VW/2, visY0+CH/2, 60, VW/2, visY0+CH/2, 520);
  bgGrad.addColorStop(0, '#10122e');
  bgGrad.addColorStop(1, '#05060b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, visY0, VW, CH);

  // 가변 사이드월 렌더링
  if (wallProfile.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(0, visY0);
    wallProfile.forEach(v => { if (v.y >= visY0 - 50 && v.y <= visY1 + 50) ctx.lineTo(v.lx, v.y); });
    ctx.lineTo(0, visY1); ctx.closePath();
    ctx.fillStyle = '#07080f'; ctx.fill();
    
    ctx.beginPath();
    wallProfile.forEach((v, i) => { if (v.y >= visY0 - 50 && v.y <= visY1 + 50) { i === 0 || wallProfile[i-1]?.y < visY0 - 50 ? ctx.moveTo(v.lx, v.y) : ctx.lineTo(v.lx, v.y); } });
    ctx.strokeStyle = 'rgba(0,240,255,0.5)'; ctx.lineWidth = 2;
    ctx.shadowBlur = 6; ctx.shadowColor = '#00f0ff'; ctx.stroke(); ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(VW, visY0);
    wallProfile.forEach(v => { if (v.y >= visY0 - 50 && v.y <= visY1 + 50) ctx.lineTo(v.rx, v.y); });
    ctx.lineTo(VW, visY1); ctx.closePath();
    ctx.fillStyle = '#07080f'; ctx.fill();
    
    ctx.beginPath();
    wallProfile.forEach((v, i) => { if (v.y >= visY0 - 50 && v.y <= visY1 + 50) { i === 0 || wallProfile[i-1]?.y < visY0 - 50 ? ctx.moveTo(v.rx, v.y) : ctx.lineTo(v.rx, v.y); } });
    ctx.strokeStyle = 'rgba(0,240,255,0.5)'; ctx.lineWidth = 2;
    ctx.shadowBlur = 6; ctx.shadowColor = '#00f0ff'; ctx.stroke(); ctx.shadowBlur = 0;
  }

  // 깔때기 가변 관문 드로잉
  ctx.save();
  ctx.strokeStyle = 'rgba(140,82,255,0.5)';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#8c52ff';
  ctx.beginPath();
  ctx.moveTo(funnelLeftX,  FUNNEL_TOP_Y);
  ctx.lineTo(300,          GOAL_Y);
  ctx.lineTo(300,          GOAL_Y + 40);
  ctx.moveTo(funnelRightX, FUNNEL_TOP_Y);
  ctx.lineTo(VW - 300,     GOAL_Y);
  ctx.lineTo(VW - 300,     GOAL_Y + 40);
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = 'rgba(0,240,255,0.07)';
  ctx.fillRect(300, GOAL_Y, VW - 600, 40);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 5; ctx.shadowColor = '#00f0ff';
  ctx.strokeRect(300, GOAL_Y, VW - 600, 40);
  ctx.restore();

  // 구간 보조 구분 사선
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let gy = 500; gy < VH; gy += 500) {
    ctx.beginPath();
    ctx.moveTo(0, gy); ctx.lineTo(VW, gy);
    ctx.stroke();
  }

  // 기믹 드로잉 및 개별 물리 업데이트
  const margin = 80;
  pinballVortexes.forEach(v => {
    if (v.y + v.r > visY0 - margin && v.y - v.r < visY1 + margin) v.draw(ctx);
  });
  pinballPortals.forEach(p => {
    const vis1 = p.y1 > visY0 - margin && p.y1 < visY1 + margin;
    const vis2 = p.y2 > visY0 - margin && p.y2 < visY1 + margin;
    if (vis1 || vis2) p.draw(ctx);
  });
  pinballBumpers.forEach(b => {
    b.update();
    if (b.y + b.r > visY0 - margin && b.y - b.r < visY1 + margin) b.draw(ctx);
  });
  pinballSpinners.forEach(s => {
    s.update();
    if (s.y + s.r > visY0 - margin && s.y - s.r < visY1 + margin) s.draw(ctx);
  });
  pinballPegs.forEach(p => {
    if (p.y + p.r > visY0 - 20 && p.y - p.r < visY1 + 20) {
      p.update();
      p.draw(ctx);
    }
  });
  pinballLaunchPads.forEach(lp => {
    lp.update();
    if (lp.y + lp.h > visY0 - margin && lp.y < visY1 + margin) lp.draw(ctx);
  });

  // 구슬 간 충돌 연산
  if (pinballGameRunning && shouldRunPhysics) {
    for (let _iter = 0; _iter < 2; _iter++) {
      for (let i = 0; i < pinballBalls.length; i++) {
        const b1 = pinballBalls[i];
        for (let j = i + 1; j < pinballBalls.length; j++) {
          const b2 = pinballBalls[j];
          const dx = b2.x - b1.x, dy = b2.y - b1.y;
          const distSq = dx*dx + dy*dy;
          const minD = b1.r + b2.r;
          if (distSq < minD*minD && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const nx = dx/dist, ny = dy/dist;
            const ov = minD - dist;
            b1.x -= nx*ov*0.52; b1.y -= ny*ov*0.52;
            b2.x += nx*ov*0.52; b2.y += ny*ov*0.52;
            const rv = (b1.vx-b2.vx)*nx + (b1.vy-b2.vy)*ny;
            if (rv > 0) {
              const imp = rv * (1.1 + b1.restitution * 1.5) * 0.65;
              b1.vx -= nx*imp * 1.15; b1.vy -= ny*imp * 1.15;
              b2.vx += nx*imp * 1.15; b2.vy += ny*imp * 1.15;
            }
          }
        }
      }
    }
  }

  // 선두 버프/디버프 연산군 산출
  const _dbSorted = pinballBalls.filter(b => !b.isFinished).sort((a, b) => b.y - a.y);
  const _dbCut = Math.max(1, Math.ceil(_dbSorted.length * 0.3));
  const _leaderSet = new Set(_dbSorted.slice(0, _dbCut).map(b => b.id));

  // 기믹별 정적 물리 마찰 및 튕김
  if (pinballGameRunning && shouldRunPhysics) {
    pinballBalls.forEach(ball => {
      if (ball.isFinished) return;
      const by = ball.y;

      // 핀 충돌 검사
      for (const peg of pinballPegs) {
        if (peg.y < by - 60 || peg.y > by + 60) continue;
        const dx = ball.x - peg.x, dy = ball.y - peg.y;
        const distSq = dx*dx + dy*dy;
        const minD = ball.r + peg.r;
        if (distSq < minD*minD && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx/dist, ny = dy/dist;
          ball.x = peg.x + nx*minD;
          ball.y = peg.y + ny*minD;
          const dot = ball.vx*nx + ball.vy*ny;
          if (dot < 0) {
            const _pegAbsorb = _leaderSet.has(ball.id) ? 0.80 : 0.88;
            ball.vx = (ball.vx - (1+ball.restitution)*dot*nx) * _pegAbsorb;
            ball.vy = (ball.vy - (1+ball.restitution)*dot*ny) * _pegAbsorb;
            peg.trigger();
          }
        }
      }

      // 회전 스피너 충돌
      for (const spin of pinballSpinners) {
        const dx = ball.x - spin.x, dy = ball.y - spin.y;
        const distSq = dx*dx + dy*dy;
        const minD = ball.r + spin.r;
        if (distSq < minD*minD && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx/dist, ny = dy/dist;
          ball.x = spin.x + nx*minD;
          ball.y = spin.y + ny*minD;
          const dot = ball.vx*nx + ball.vy*ny;
          if (dot < 0) {
            const tangent = spin.angularVelocity * spin.r;
            ball.vx = (ball.vx - 1.3*dot*nx) + (-ny)*tangent*1.5;
            ball.vy = (ball.vy - 1.3*dot*ny) + ( nx)*tangent*1.5;
            spin.angularVelocity += (Math.abs(ball.vy) + 0.15) * 0.18;
            if (spin.angularVelocity > 0.25) spin.angularVelocity = 0.25;
          }
        }
      }

      // 네온 범퍼 충돌
      for (const bump of pinballBumpers) {
        const dx = ball.x - bump.x, dy = ball.y - bump.y;
        const distSq = dx*dx + dy*dy;
        const minD = ball.r + bump.r;
        if (distSq < minD*minD && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx/dist, ny = dy/dist;
          ball.x = bump.x + nx*minD;
          ball.y = bump.y + ny*minD;
          const dot = ball.vx*nx + ball.vy*ny;
          if (dot < 0) {
            ball.vx = (ball.vx - 3.5*dot*nx) + (Math.random()-0.5)*6 + nx * 4.5;
            ball.vy = (ball.vy - 3.5*dot*ny) + ny * 4.5;
            const _bspd = Math.hypot(ball.vx, ball.vy);
            if (_bspd > 14) { ball.vx = ball.vx / _bspd * 14; ball.vy = ball.vy / _bspd * 14; }
            bump.trigger();
          }
        }
      }

      // 상향 발사대 충돌 (회전 각도 정밀 판정)
      for (const lp of pinballLaunchPads) {
        const dx = ball.x - lp.x;
        const dy = ball.y - lp.y;
        const cos = Math.cos(-lp.angle);
        const sin = Math.sin(-lp.angle);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        const localVy = ball.vx * sin + ball.vy * cos;

        const _isYellow = lp.color === '#ffea00';
        const _hitDir = _isYellow ? Math.abs(localVy) > 0.1 : localVy > 0;

        if (_hitDir &&
            lx >= -lp.w/2 - ball.r && lx <= lp.w/2 + ball.r &&
            ly + ball.r >= 0 && ly - ball.r <= lp.h) {

          lp.trigger();

          const speed = Math.max(8, Math.hypot(ball.vx, ball.vy) * 1.1 + 7);
          let _nx = Math.sin(lp.angle);
          let _ny = -Math.cos(lp.angle);
          if (_isYellow && _ny > 0) { _nx = -_nx; _ny = -_ny; }

          ball.vx = _nx * speed + (Math.random() - 0.5) * 2;
          ball.vy = _ny * speed + (Math.random() - 0.5) * 1;

          const newLocalY = localVy > 0 ? -ball.r - 2 : lp.h + ball.r + 2;
          const cosA = Math.cos(lp.angle);
          const sinA = Math.sin(lp.angle);
          ball.x = lp.x + (lx * cosA - newLocalY * sinA);
          ball.y = lp.y + (lx * sinA + newLocalY * cosA);
        }
      }

      // 텔레포트 포탈 충돌
      for (const port of pinballPortals) {
        if (ball.portalCooldown > 0) continue;
        if (Math.hypot(ball.x - port.x1, ball.y - port.y1) < ball.r + port.r * 0.7) {
          ball.x = port.x2;
          ball.y = port.y2 + 25;
          ball.vy = -(Math.abs(ball.vy) * 0.4 + 1.5);
          ball.vx *= 0.5;
          ball.portalCooldown = 50;
          pinballLog(`${ball.name} → ${port.name}!`);
        }
      }

      // 와류 마찰 감속
      for (const vort of pinballVortexes) {
        if (Math.hypot(ball.x - vort.x, ball.y - vort.y) < vort.r + ball.r) {
          const _vMult = _leaderSet.has(ball.id) ? 1.8 : 1.0;
          ball.vy -= ball.gravity * 0.425;
          ball.vx *= (1 - 0.03 * _vMult);
          ball.vy *= (1 - 0.03 * _vMult);
        }
      }

      // 하단 20% 완만 감속 (피니시 존 점진 연출)
      if (ball.y > GAME_VHEIGHT * 0.80) {
        const _decelT = Math.min(1, (ball.y - GAME_VHEIGHT * 0.80) / (GOAL_Y - GAME_VHEIGHT * 0.80));
        ball.vx *= (1 - _decelT * 0.10);
        ball.vy *= (1 - _decelT * 0.10);
      }

      // 선두 디버프 저항 마찰
      if (_leaderSet.has(ball.id)) {
        ball.vx *= 0.992;
        ball.vy *= 0.992;
      }

      // 외벽 반사 보정
      const _fw = getWallAtY(ball.y);
      if (ball.x - ball.r < _fw.lx) {
        ball.x = _fw.lx + ball.r;
        if (ball.vx < 0) ball.vx = Math.abs(ball.vx) * ball.restitution + 0.3;
      } else if (ball.x + ball.r > _fw.rx) {
        ball.x = _fw.rx - ball.r;
        if (ball.vx > 0) ball.vx = -Math.abs(ball.vx) * ball.restitution - 0.3;
      }
    });
  }

  // 구슬 위치 업데이트 & 드로잉
  pinballBalls.forEach(ball => {
    if (shouldRunPhysics) ball.update();
    ball.draw(ctx);
  });

  // 역전 감지 및 왕관/이펙트
  if (pinballGameRunning && shouldRunPhysics) {
    const _aSort = [...pinballBalls.filter(b => !b.isFinished)].sort((a, b) => b.y - a.y);
    if (_aSort.length >= 2) {
      const _curOrd = _aSort.map(b => b.id);
      if (prevRankOrder.length === _curOrd.length) {
        _aSort.forEach((ball, i) => {
          if (ball.overtakeCooldown > 0) { ball.overtakeCooldown--; return; }
          const _pi = prevRankOrder.indexOf(ball.id);
          if (_pi > i) {
            ball.overtakeCooldown = 200;
            overtakeParticles.push({
              x: ball.x + ball.r + 4, y: ball.y - ball.r + 2,
              vx: 0.5 + Math.random() * 0.4, vy: -0.9 - Math.random() * 0.4,
              color: ball.color, life: 48, maxLife: 48, angle: -0.22
            });
          }
        });
      }
      prevRankOrder = _curOrd;
      const _lid = _aSort[0].id;
      if (_lid !== currentLeaderId) { currentLeaderId = _lid; crownFlashTimer = 22; }
    }
    if (crownFlashTimer > 0) crownFlashTimer--;
  }

  // 역전 사선 파티클 연산
  overtakeParticles = overtakeParticles.filter(p => {
    if (shouldRunPhysics) { p.x += p.vx; p.y += p.vy; p.vy *= 0.96; p.life--; }
    const t = p.life / p.maxLife;
    const _oa = t > 0.8 ? (1 - t) / 0.2 : t < 0.25 ? t / 0.25 : 1.0;
    ctx.save();
    ctx.globalAlpha = _oa;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 6; ctx.shadowColor = p.color;
    ctx.font = 'bold 11px Outfit, Noto Sans KR, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('역전!', 0, 0);
    ctx.restore();
    return p.life > 0;
  });

  // 모드별 인디케이터 드로잉 (왕관 / 방패 / 과녁)
  if (pinballGameRunning) {
    const _indActive = pinballBalls.filter(b => !b.isFinished);
    if (_indActive.length > 0) {
      const _indSorted = [..._indActive].sort((a, b) => b.y - a.y);

      const _drawCrown = (ball, fa) => {
        const _cx = ball.x, _cy = ball.y - ball.r - 20;
        const _cw = 20, _ch = 12;
        ctx.save();
        ctx.globalAlpha = fa;
        ctx.fillStyle = '#ffe500';
        ctx.shadowColor = '#ffe500';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(_cx - _cw/2, _cy + _ch);
        ctx.lineTo(_cx - _cw/2, _cy + _ch * 0.35);
        ctx.lineTo(_cx - _cw/6, _cy + _ch * 0.65);
        ctx.lineTo(_cx,         _cy);
        ctx.lineTo(_cx + _cw/6, _cy + _ch * 0.65);
        ctx.lineTo(_cx + _cw/2, _cy + _ch * 0.35);
        ctx.lineTo(_cx + _cw/2, _cy + _ch);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 3;
        [[_cx - _cw/2, _cy + _ch*0.35, 2], [_cx, _cy, 2.5], [_cx + _cw/2, _cy + _ch*0.35, 2]].forEach(([px, py, pr]) => {
          ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
      };

      const _drawShield = (ball, fa) => {
        const _cx = ball.x;
        const _cy = ball.y - ball.r - 24;
        const sw = 18, sh = 20;
        ctx.save();
        ctx.globalAlpha = fa;
        ctx.fillStyle = '#67e8f9';
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(_cx, _cy);
        ctx.quadraticCurveTo(_cx + sw/2,    _cy + sh*0.18, _cx + sw*0.42, _cy + sh*0.58);
        ctx.quadraticCurveTo(_cx + sw*0.28,  _cy + sh*0.92, _cx,          _cy + sh);
        ctx.quadraticCurveTo(_cx - sw*0.28,  _cy + sh*0.92, _cx - sw*0.42, _cy + sh*0.58);
        ctx.quadraticCurveTo(_cx - sw/2,    _cy + sh*0.18, _cx,          _cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(_cx,     _cy + 3);           ctx.lineTo(_cx,     _cy + sh - 4);
        ctx.moveTo(_cx - 4, _cy + sh*0.42);     ctx.lineTo(_cx + 4, _cy + sh*0.42);
        ctx.stroke();
        ctx.restore();
      };

      const _drawTarget = (ball, fa) => {
        const _cx = ball.x;
        const _cy = ball.y - ball.r - 26;
        const t = performance.now() * 0.002;
        ctx.save();
        ctx.globalAlpha = fa;
        ctx.strokeStyle = '#c084ff';
        ctx.fillStyle = '#c084ff';
        ctx.shadowColor = '#c084ff';
        ctx.lineWidth = 1.8;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(_cx, _cy, 9, t, t + Math.PI * 0.8);
        ctx.stroke();
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(_cx, _cy, 5.5, -t * 1.2, -t * 1.2 + Math.PI * 0.7);
        ctx.stroke();
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(_cx, _cy, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      if (currentRule === 'first') {
        const _crownsLeft = Math.max(0, winCount - pinballFinishedBalls.length);
        _indSorted.slice(0, Math.min(_crownsLeft, _indSorted.length)).forEach((ball, ri) => {
          const _fa = (ri === 0 && crownFlashTimer > 0)
            ? 0.5 + 0.5 * Math.abs(Math.sin(crownFlashTimer * 0.45)) : 1.0;
          _drawCrown(ball, _fa);
        });
      } else if (currentRule === 'last') {
        _indSorted.slice(Math.max(0, _indSorted.length - winCount)).forEach(ball => {
          _drawShield(ball, 1.0);
        });
      } else {
        const _tgtIdx = specificRank - 1 - pinballFinishedBalls.length;
        if (_tgtIdx >= 0 && _tgtIdx < _indSorted.length) {
          _drawTarget(_indSorted[_tgtIdx], 1.0);
        }
      }
    }
  }

  // Near Miss 파괴 스파크 파티클
  if (pinballNearMissSparks.length > 0) {
    pinballNearMissSparks.forEach(s => {
      if (shouldRunPhysics) {
        s.vy += s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.life--;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (s.life / s.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = s.color;
      ctx.globalAlpha = s.life / s.maxLife;
      ctx.fill();
      ctx.restore();
    });
    pinballNearMissSparks = pinballNearMissSparks.filter(s => s.life > 0);
  }

  // 당첨 축하 컨페티 파티클
  if (pinballConfettiParticles.length > 0) {
    pinballConfettiParticles.forEach(p => {
      p.vy += p.gravity; p.vx *= p.friction; p.vy *= p.friction;
      p.x += p.vx; p.y += p.vy; p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 0;
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r);
      ctx.restore();
    });
    pinballConfettiParticles = pinballConfettiParticles.filter(p => p.y < GOAL_Y + 500);
  }

  // VAR 판독 오버레이 효과
  if (varChecking) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 16, 32, 0.28)';
    ctx.fillRect(0, visY0, VW, CH);

    const scanY = visY0 + (Math.sin(Date.now() * 0.0035) * 0.5 + 0.5) * CH;
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff9900';
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(VW, scanY);
    ctx.stroke();

    const blink = Math.floor(Date.now() / 120) % 2 === 0;
    ctx.font = 'bold 22px Outfit, Noto Sans KR, sans-serif';
    ctx.fillStyle = blink ? '#ff3366' : 'rgba(255,255,255,0.75)';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff3366';
    ctx.textAlign = 'center';
    ctx.fillText('🔍 VAR PHOTO FINISH 판독 중...', VW / 2, visY0 + 130);
    ctx.restore();
  }

  ctx.restore();

  // H. 우측 HUD 미니맵 구현
  const barX = GAME_X_OFFSET + GAME_VWIDTH + 10;
  const barH = window.innerHeight - 80;
  const barY = 40;
  
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(barX, barY, 6, barH);
  
  pinballBalls.forEach(ball => {
    const prog = Math.min(1, ball.y / GOAL_Y);
    const py = barY + prog * barH;
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 4; ctx.shadowColor = ball.color;
    ctx.beginPath();
    ctx.arc(barX + 3, py, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  const vpTop = barY + (cameraY / GAME_VHEIGHT) * barH;
  const vpHt  = (720 / GAME_VHEIGHT) * barH;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, vpTop, 6, vpHt);

  if (!pinballGameRunning && pinballBalls.length > 0) {
    ctx.save();
    ctx.font = '13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillText('↕ 마우스 휠로 맵 미리보기', GAME_X_OFFSET + GAME_VWIDTH / 2, pinballCanvas.height - 24);
    ctx.restore();
  }
}

function stopPinball() {
  if (pinballAnimId !== null) {
    cancelAnimationFrame(pinballAnimId);
    pinballAnimId = null;
  }
  pinballGameRunning = false;
  stopPinballConfetti();
}

function resetPinball() {
  stopPinball();
  pinballFinishedBalls = [];
  pinballBalls = [];
  hasAnnouncedWinners = false;
  pinballGameRunning = false;
  camDramaTimer = 0;
  camDramaTarget = null;
  camFocusBall = null;
  camFocusCooldown = 0;
  cameraZoom = 1.0;
  cameraZoomTarget = 1.0;
  prevRankOrder = [];
  overtakeParticles = [];
  pinballNearMissSparks = [];
  currentLeaderId = -1;
  crownFlashTimer = 0;
  decisiveMomentActive = false;
  renderLeaderboard();
  initPinballMap();
  updatePreviewBalls();

  const modal = document.getElementById('pinball-result-modal');
  if (modal) modal.style.display = 'none';

  const btnLaunchReset = document.getElementById('btn-pinball-launch');
  if (btnLaunchReset) { btnLaunchReset.disabled = false; btnLaunchReset.style.opacity = '1'; }

  cameraY = 0;

  const term = document.getElementById('pinball-terminal');
  if (term) term.innerHTML = '<div>> Pinball system reset. Awaiting Quantum launch prompt...</div>';
}

function triggerPinballConfetti() {
  stopPinballConfetti();
  const colors = ['#ff9900', '#8c52ff', '#00f0ff', '#ffcc00', '#ffffff'];
  pinballConfettiParticles = [];
  for (let i = 0; i < 120; i++) {
    pinballConfettiParticles.push({
      x: GAME_VWIDTH / 2 + (Math.random() - 0.5) * 400,
      y: GOAL_Y - 10,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 15 - 8,
      r: Math.random() * 5 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.28,
      friction: 0.98,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.15
    });
  }
}

function stopPinballConfetti() {
  pinballConfettiParticles = [];
}


// ── 7. 초기 DOM 생명주기 리스너 및 브라우저 이벤트 바인딩 ──────────

window.addEventListener('DOMContentLoaded', () => {
  pinballCanvas = document.getElementById('pinball-canvas');
  if (pinballCanvas) {
    pinballCtx = pinballCanvas.getContext('2d');
    
    // 캔버스 창 해상도 비율 동적 조절
    const resizeCanvas = () => {
      pinballCanvas.width = window.innerWidth;
      pinballCanvas.height = window.innerHeight;
      GAME_X_OFFSET = Math.max(415, Math.round((window.innerWidth - 415) / 2));
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    pinballCanvas.addEventListener('wheel', (e) => {
      if (!pinballGameRunning) {
        e.preventDefault();
        cameraY = Math.max(0, Math.min(cameraY + e.deltaY * 0.7, GAME_VHEIGHT - window.innerHeight));
      }
    }, { passive: false });
  }

  // UI 구성 요소 상태 제어
  const ruleRadios = document.querySelectorAll('input[name="pinball-rule"]');
  const winCountInput = document.getElementById('pinball-win-count');
  const specRankSelect = document.getElementById('pinball-specific-rank');
  const lblWinCount = document.getElementById('lbl-win-count');
  const lblSpecificRank = document.getElementById('lbl-specific-rank');

  ruleRadios.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.value === 'specific') {
        winCountInput.disabled = true;
        winCountInput.style.cursor = 'not-allowed';
        winCountInput.style.opacity = '0.35';
        if (lblWinCount) lblWinCount.style.color = 'rgba(255,255,255,0.25)';

        specRankSelect.disabled = false;
        specRankSelect.style.cursor = 'pointer';
        specRankSelect.style.opacity = '1.0';
        if (lblSpecificRank) lblSpecificRank.style.color = 'var(--aws-orange)';
      } else {
        winCountInput.disabled = false;
        winCountInput.style.cursor = 'text';
        winCountInput.style.opacity = '1.0';
        if (lblWinCount) lblWinCount.style.color = 'var(--aws-orange)';

        specRankSelect.disabled = true;
        specRankSelect.style.cursor = 'not-allowed';
        specRankSelect.style.opacity = '0.35';
        if (lblSpecificRank) lblSpecificRank.style.color = 'rgba(255,255,255,0.25)';
      }
    });
  });

  const btnShuffle = document.getElementById('btn-shuffle-members');
  if (btnShuffle) btnShuffle.addEventListener('click', shuffleMembers);

  const btnLaunch = document.getElementById('btn-pinball-launch');
  if (btnLaunch) btnLaunch.addEventListener('click', launchPinballRacing);

  const btnReset = document.getElementById('btn-pinball-reset');
  if (btnReset) btnReset.addEventListener('click', () => {
    resetPinball();
    if (pinballAnimId === null) animatePinball();
  });

  const btnModalClose = document.getElementById('btn-modal-close');
  if (btnModalClose) {
    btnModalClose.addEventListener('click', () => {
      const modal = document.getElementById('pinball-result-modal');
      if (modal) modal.style.display = 'none';
    });
  }

  // 초기 팀원 텍스트 박스 실시간 갱신 모니터
  const membersTextarea = document.getElementById('pinball-members');
  if (membersTextarea) {
    membersTextarea.value = DEFAULT_MEMBERS;
    membersTextarea.addEventListener('input', () => {
      updatePreviewBalls();
      updateSpecificRankSelect();
    });
  }

  // 초기 맵 및 리더보드 구성
  updateSpecificRankSelect();
  initPinballMap();
  updatePreviewBalls();
  animatePinball();
});
