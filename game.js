/**
 * =================================================================
 *   CHAOS-DROP NEON PINBALL SYSTEM - GAME ENGINE
 * =================================================================
 * 이 파일은 2D 리얼타임 물리 연산, 충돌 반응, 카메라 멀티프레이밍, 
 * 그리고 60FPS 하드웨어 프레임 동기화 락을 포함한 핵심 게임 로직을 담당합니다.
 */

// ── [전역 동적 상태 변수군] ────────────────────────────────
let GAME_X_OFFSET = 415;  // 캔버스 가로 내 핀볼 영역 오프셋 (창 크기에 따라 동적 재계산)
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
let pinballSpeedPads = [];
let pinballFinishedBalls = [];
let pinballAccelLane = 0;      // Zone 2.5의 가속 레인 인덱스 (0: 좌, 1: 중, 2: 우, 감속 2개 & 가속 1개 룰렛)
let speedPadRotateTimer = 300; // 가속 패드 시계방향 즉시 회전 타이머 (5초 = 300프레임)


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

// ── 클래스 정의 ──────────────────────────────

// 포탈 정의 클래스 (단방향: 아래 입구 -> 위 출구)
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
    
    // 입구 (x1, y1) - 아래쪽 입구
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

    // 입구 이름 태그 표시 (P-4: ctx 상태 오염 방지)
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`▼ ${this.name} IN`, this.x1, this.y1 - this.r - 4);
    ctx.restore();

    // 출구 (x2, y2) - 위쪽 출구 (금색 테두리)
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

// 회전 스피너 클래스
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

// 네온 탄성 범퍼 클래스
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

// 중력 지연 와류 영역
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

// 가속 패드 클래스 (Speed Pad)
class SpeedPad {
  constructor(x, y, w, h, direction = null) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    
    // 매번 초기화할 때마다 상하좌우(up, down, left, right) 중 랜덤 선택
    const dirs = ['up', 'down', 'left', 'right'];
    this.direction = direction || dirs[Math.floor(Math.random() * dirs.length)];
    
    // 방향별 대표 네온 컬러 매핑
    if (this.direction === 'down') {
      this.color = '#00f0ff'; // 일렉트릭 시안
    } else if (this.direction === 'up') {
      this.color = '#ff3366'; // 핫핑크/레드
    } else {
      this.color = '#ffcc00'; // 골드 (left, right)
    }
    
    this.pulse = 0;
  }
  rotateClockwise() {
    const dirs = ['up', 'right', 'down', 'left'];
    const idx = dirs.indexOf(this.direction);
    this.direction = dirs[(idx + 1) % 4];
    
    // 방향별 대표 네온 컬러 재매핑
    if (this.direction === 'down') {
      this.color = '#00f0ff'; // 일렉트릭 시안
    } else if (this.direction === 'up') {
      this.color = '#ff3366'; // 핫핑크/레드
    } else {
      this.color = '#ffcc00'; // 골드 (left, right)
    }
  }
  draw(ctx) {
    this.pulse += 0.12;
    ctx.save();
    
    // 패드 배경 및 테두리 네온 효과
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.roundRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h, 4);
    ctx.fill();
    ctx.stroke();
    
    // 흐르는 화살표 연출 (방향별 렌더링)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#fff';
    
    const speed = this.pulse % 1.0;
    
    if (this.direction === 'down') {
      // 아래로 흐름
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
      // 위로 흐름
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
      // 왼쪽으로 흐름
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
      // 오른쪽으로 흐름
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

// 상향 발사대 클래스
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

// 핀(장애물) 클래스
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

// 레이싱 구슬 클래스
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
    // 1. 저항 랜덤 계수: 0.991 ~ 0.996
    this.friction = BALL_FRICTION_BASE + Math.random() * BALL_FRICTION_RANGE;
    this.restitution = BALL_RESTITUTION; // 탄성 반사 상향 보강
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

    // 13. 골인 이후에도 바닥에서 끈적하게 미끄러지고 부딪치며 순서 섞이게 하기
    if (this.isFinished) {
      this.vy += this.gravity;
      this.vx *= 0.955; // 바닥 얼음 미끄러짐 (관성 슬라이딩)
      this.vy *= 0.955;

      this.x += this.vx;
      this.y += this.vy;

      const floorY = GOAL_Y + 38;
      if (this.y + this.r >= floorY) {
        this.y = floorY - this.r;
        this.vy = -Math.abs(this.vy) * 0.15; // 가볍게 튕김
        this.vx += (Math.random() - 0.5) * 0.12; // 미세 진동
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

    // Near Miss 무중력 호버링 / 좌우 부르르 물리 효과 주입
    if (this.nearMissTimer > 0) {
      this.nearMissTimer--;
      this.vy += this.gravity * 0.15; // 중력 15%로 격감 (무중력감)
      this.vy *= 0.85;                // 극단적 마찰 감속 (잠깐 정지 느낌)
      this.vx += Math.sin(this.nearMissTimer * 0.8) * 1.5; // 좌우 부르르 셰이킹

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

    // 최저 속도 슬립 감속 (속도 극소화 시 더 끈적하게 덤핑)
    const speed = Math.hypot(this.vx, this.vy);
    if (speed < 0.25 && speed > 0) {
      this.vx *= 0.90;
      this.vy *= 0.90;
    }

    this.x += this.vx;
    this.y += this.vy;

    // 3. 최대 속도는 17까지 (폭주 시 최대 25로 해제)
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

    // ── Zone 2.5 레인터널 특화 물리 및 충돌 연산 ───────────────────
    if (this.y >= TUNNEL_TOP_Y && this.y <= TUNNEL_BOTTOM_Y) {
      // 1. 육각형 다이아몬드 섬 1 충돌 물리 (대칭형 꼭짓점 6개, 60px 폭 확장)
      // 상단(325, 1500) ➡️ 우상(355, 1530) ➡️ 우하(355, 1870) ➡️ 하단(325, 1900) ➡️ 좌하(295, 1870) ➡️ 좌상(295, 1530)
      collideBallWithSegment(this, 325, 1500, 355, 1530);
      collideBallWithSegment(this, 355, 1530, 355, 1870);
      collideBallWithSegment(this, 355, 1870, 325, 1900);
      collideBallWithSegment(this, 325, 1900, 295, 1870);
      collideBallWithSegment(this, 295, 1870, 295, 1530);
      collideBallWithSegment(this, 295, 1530, 325, 1500);

      // 2. 육각형 다이아몬드 섬 2 충돌 물리 (대칭형 꼭짓점 6개, 60px 폭 확장)
      // 상단(500, 1500) ➡️ 우상(530, 1530) ➡️ 우하(530, 1870) ➡️ 하단(500, 1900) ➡️ 좌하(470, 1870) ➡️ 좌상(470, 1530)
      collideBallWithSegment(this, 500, 1500, 530, 1530);
      collideBallWithSegment(this, 530, 1530, 530, 1870);
      collideBallWithSegment(this, 530, 1870, 500, 1900);
      collideBallWithSegment(this, 500, 1900, 470, 1870);
      collideBallWithSegment(this, 470, 1870, 470, 1530);
      collideBallWithSegment(this, 470, 1530, 500, 1500);

      // 3. 3레인 가속 및 감속 물리 처리 (러시안 룰렛)
      let ballLane = 0;
      if (this.x < TUNNEL_BARRIER1_X) {
        ballLane = 0;
      } else if (this.x >= TUNNEL_BARRIER1_X && this.x < TUNNEL_BARRIER2_X) {
        ballLane = 1;
      } else {
        ballLane = 2;
      }

      if (ballLane !== pinballAccelLane) {
        // 감속 레인 효과 (0.5배 완화 제동 - 2개 레인)
        this.vy *= TUNNEL_DECEL_MULT;
        this.vx *= TUNNEL_DECEL_MULT;
        this.vy = Math.max(1.5, this.vy); // 멈춤 방지 최소 낙하 전진 보장
      } else {
        // 가속 레인 효과 (2배 쾌속 추진 - 1개 레인)
        this.vy += TUNNEL_BOOST_ACCEL;
        this.vx *= 1.03;
        this.vy *= 1.03;
        this.superChargeTimer = Math.max(this.superChargeTimer, 15); // 잔상 가속 연출 프레임
      }
    }

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

    // ❄️ Freeze Zone: 하단 30% 전체, 극저속 or 극고속 공 랜덤 발동
    if (freezeModeEnabled && !this.isFinished && this.nearMissTimer === 0 && this.nearMissCooldown === 0) {
      if (this.y >= GAME_VHEIGHT * 0.70) {
        const _spd = Math.hypot(this.vx, this.vy);
        const _slow = _spd < 2.0;   // 거의 멈춘 공
        const _fast = _spd > 9.0;  // 폭주 중인 공
        const _chance = _slow ? 0.010 : _fast ? 0.020 : 0;
        if (_chance > 0 && Math.random() < _chance) {
          this.nearMissTimer = NEAR_MISS_DURATION;
          this.nearMissCooldown = NEAR_MISS_COOLDOWN; // 4초 쿨다운
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

    // SLOW 표시: 와류 원 안 + 저속 + Freeze! 미노출 상태일 때만 공 안에 작게
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

// Near Miss 탈출 튕김 시 흩뿌릴 네온 불꽃 스파크 생성 함수
function spawnNearMissSparks(x, y, color) {
  const sparkColors = [color, '#ffffff', '#ff9900', '#ff3366'];
  for (let i = 0; i < 18; i++) {
    pinballNearMissSparks.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2.5, // 아래로 분사되듯 흩뿌려짐
      r: Math.random() * 2.2 + 1.5,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      gravity: 0.08,
      life: 40 + Math.floor(Math.random() * 15),
      maxLife: 55
    });
  }
}

// ── 맵 및 가변 벽 보간 함수들 ────────────────

function generateWallProfile() {
  wallProfile = [];
  wallProfile.push({ y: 0,          lx: 0, rx: GAME_VWIDTH });
  wallProfile.push({ y: 100,        lx: 0, rx: GAME_VWIDTH });

  let y = 100;
  let lastLx = 0;
  let lastRx = GAME_VWIDTH;

  // 1단계: 100 ~ 1500 (TUNNEL_TOP_Y) 구간 무작위 세그먼트 생성
  while (y < TUNNEL_TOP_Y) {
    const segH = 100 + Math.floor(Math.random() * 200);
    y = Math.min(y + segH, TUNNEL_TOP_Y);

    if (y === TUNNEL_TOP_Y) {
      lastLx = TUNNEL_LEFT_X;
      lastRx = TUNNEL_RIGHT_X;
    } else {
      const lx = Math.random() < 0.70 ? 10 + Math.random() * 180 : 0;
      const rx = GAME_VWIDTH - (Math.random() < 0.70 ? 10 + Math.random() * 180 : 0);
      const safeRx = Math.max(rx, lx + 300);
      lastLx = lx;
      lastRx = Math.min(safeRx, GAME_VWIDTH);
    }
    wallProfile.push({ y, lx: lastLx, rx: lastRx });
  }

  // 2단계: 1500 ~ 2000 (TUNNEL_BOTTOM_Y) 터널 고정 구간 생성
  y = TUNNEL_BOTTOM_Y;
  lastLx = TUNNEL_LEFT_X;
  lastRx = TUNNEL_RIGHT_X;
  wallProfile.push({ y, lx: lastLx, rx: lastRx });

  // 3단계: 2000 ~ 2570 (FUNNEL_TOP_Y - 150) 구간 무작위 세그먼트 생성
  const wallEndLimit = FUNNEL_TOP_Y - 150;
  while (y < wallEndLimit) {
    const segH = 100 + Math.floor(Math.random() * 200);
    y = Math.min(y + segH, wallEndLimit);

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
  wallProfile.push({ y: GOAL_Y,       lx: FUNNEL_BOTTOM_X,  rx: GAME_VWIDTH - FUNNEL_BOTTOM_X });
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

// 다각형 섬 장벽 선분-원 물리 충돌 헬퍼 함수
function collideBallWithSegment(ball, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return;

  let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  const dist = Math.hypot(ball.x - closestX, ball.y - closestY);
  if (dist < ball.r) {
    let nx = ball.x - closestX;
    let ny = ball.y - closestY;
    let nLen = Math.hypot(nx, ny);
    if (nLen === 0) {
      nx = 0; ny = -1; nLen = 1;
    } else {
      nx /= nLen;
      ny /= nLen;
    }

    // 침입 밖으로 안전 이격 밀어내기
    ball.x = closestX + nx * ball.r;
    ball.y = closestY + ny * ball.r;

    // 탄성 반사 속도 벡터 적용
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= (1 + ball.restitution) * vn * nx;
      ball.vy -= (1 + ball.restitution) * vn * ny;
      // 구슬 탈출 추진력 보조
      ball.vx += nx * 0.15;
      ball.vy += ny * 0.15;
    }
  }
}


function initPinballMap() {
  generateWallProfile();
  pinballPegs = [];
  pinballSpinners = [];
  pinballBumpers = [];
  pinballPortals = [];
  pinballVortexes = [];
  pinballLaunchPads = [];
  pinballSpeedPads = [];

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
  const randAngle = () => (Math.random() - 0.5) * (Math.PI * 0.45); // Random angle between -40.5 and +40.5 deg
  
  // ── 기믹 겹침 및 벽 침범 방지 배치 시스템 ──────────────────────────
  let placedGimmicks = []; // { x, y, r }

  // 1. 가변 벽면 스캐닝 X 좌표 클램퍼 (기믹의 세로 면적 전체가 가벽 바깥이나 경계선에 겹치지 않도록 방어)
  const clampToWall = (x, y, radius, margin = 14) => {
    let maxLx = -9999;
    let minRx = 9999;
    
    // 기믹의 세로 슬라이스 범위 [y - radius, y + radius] 전체 훑기
    for (let testY = y - radius; testY <= y + radius; testY += 5) {
      const wall = getWallAtY(testY);
      if (wall.lx > maxLx) maxLx = wall.lx;
      if (wall.rx < minRx) minRx = wall.rx;
    }
    
    const minSafeX = maxLx + radius + margin;
    const maxSafeX = minRx - radius - margin;
    
    if (minSafeX >= maxSafeX) {
      return (maxLx + minRx) / 2; // 가변 벽 사이가 너무 좁은 경우 가운데 정중앙 배치
    }
    return Math.max(minSafeX, Math.min(maxSafeX, x));
  };

  // 2. 장애물간 겹침 확인 (반경의 합 + 32px 구슬 안전통로 여유폭 확보)
  const checkOverlap = (x, y, r) => {
    for (const g of placedGimmicks) {
      const dist = Math.hypot(x - g.x, y - g.y);
      const minSafeDist = r + g.r + 32; // 두 장애물 반경의 합 + 구슬 통과폭 32px
      if (dist < minSafeDist) return true;
    }
    return false;
  };

  // 3. 지터 25회 시도를 통해 최적의 안전 구역을 탐색하여 기믹을 삽입하는 코어 탐색기
  const tryPlaceGimmick = (yCenter, yRange, sizeR, xBase, xRange, creatorFunc) => {
    for (let attempt = 0; attempt < 25; attempt++) {
      const tempY = rjy(yCenter, yRange);
      const tempX = rjwall(xBase, xRange, tempY, sizeR + 15);
      const safeX = clampToWall(tempX, tempY, sizeR, 14);
      
      if (!checkOverlap(safeX, tempY, sizeR)) {
        creatorFunc(safeX, tempY);
        placedGimmicks.push({ x: safeX, y: tempY, r: sizeR });
        return true; // 성공적으로 안전 배치 완료!
      }
    }
    return false; // 안전 공간 탐색 실패 시 건너뜀 (겹침 원천 방지)
  };

  // Zone 2.5를 위한 가속 레인 무작위 지정 (0: 좌, 1: 중, 2: 우, 감속 2개 & 가속 1개 룰렛)
  pinballAccelLane = Math.floor(Math.random() * 3);

  // ── 1. 포탈 생성 (각 구역별 격리 배치) ─────
  // Portal-α: Zone 1 (Y: 160 ~ 900) 내부 배치 및 역주행 유도
  const portalAlphaInY = rjy(720, 50);
  const portalAlphaOutY = Math.max(160, portalAlphaInY - (350 + Math.random() * 150)); 
  const paInX  = clampToWall(rj(160, 70), portalAlphaInY, PORTAL_R, 20);
  const paOutX = clampToWall(rj(660, 70), portalAlphaOutY, PORTAL_R, 20);
  pinballPortals.push(new TeleportPortal(paInX, portalAlphaInY, paOutX, portalAlphaOutY, '#00f0ff', 'PORTAL-α'));

  // Portal-β: Zone 3 (Y: 2000 ~ 2720) 내부 배치 및 역주행 유도
  const portalBetaInY = rjy(2520, 60);
  const portalBetaOutY = Math.max(2050, portalBetaInY - (300 + Math.random() * 120)); 
  const pbInX  = clampToWall(rj(220, 70), portalBetaInY, PORTAL_R, 20);
  const pbOutX = clampToWall(rj(600, 70), portalBetaOutY, PORTAL_R, 20);
  pinballPortals.push(new TeleportPortal(pbInX, portalBetaInY, pbOutX, portalBetaOutY, '#ff9900', 'PORTAL-β'));

  // 포탈 입출구를 충돌 컬링 맵에 등록하여 겹침 사전 차단
  const pa = pinballPortals[0];
  placedGimmicks.push({ x: pa.x1, y: pa.y1, r: PORTAL_R });
  placedGimmicks.push({ x: pa.x2, y: pa.y2, r: PORTAL_R });
  const pb = pinballPortals[1];
  placedGimmicks.push({ x: pb.x1, y: pb.y1, r: PORTAL_R });
  placedGimmicks.push({ x: pb.x2, y: pb.y2, r: PORTAL_R });

  // ── 2. 슈퍼 범퍼 배치 ──
  // Zone 2 (피지컬 - 핀 없음) 범퍼 4개
  tryPlaceGimmick(1000, 40, 20, cx, 80, (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, 20, '#ff9900')); });
  tryPlaceGimmick(1180, 40, 18, 185, 60, (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, 18, '#00f0ff')); });
  tryPlaceGimmick(1180, 40, 18, 640, 60, (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, 18, '#00f0ff')); });
  tryPlaceGimmick(1350, 45, 22, cx, 80, (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, 22, '#8c52ff')); });
  // Zone 3 (고전 복합) 범퍼 6개
  tryPlaceGimmick(2120, 40, 18, 140, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 18, '#ff9900')); });
  tryPlaceGimmick(2120, 40, 18, 685, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 18, '#ff9900')); });
  tryPlaceGimmick(2350, 45, 22, cx, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 22, '#00f0ff')); });
  tryPlaceGimmick(2500, 40, 20, 280, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 20, '#8c52ff')); });
  tryPlaceGimmick(2500, 40, 20, 545, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 20, '#8c52ff')); });
  tryPlaceGimmick(2680, 30, 22, cx, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 22, '#ff9900')); });

  // ── 3. 스피너 배치 ──
  // Zone 2 (피지컬 - 핀 없음) 스피너 4개 (날개 길이 20% 확대 적용)
  tryPlaceGimmick(950, 30, 31, cx, 80, (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, 31, '#8c52ff')); });
  tryPlaceGimmick(1250, 40, 26, 140, 60, (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, 26, '#ff9900')); });
  tryPlaceGimmick(1250, 40, 26, 685, 60, (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, 26, '#ff9900')); });
  tryPlaceGimmick(1450, 30, 31, cx, 80, (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, 31, '#00f0ff')); });
  
  // Zone 2 무작위 날개 대형 스피너 2개 추가 배치 (20% 확대 사양인 28 적용)
  tryPlaceGimmick(1100, 120, 28, cx, 200, (x, y) => { pinballSpinners.push(new Spinner(x, y, 28, '#8c52ff')); });
  tryPlaceGimmick(1380, 100, 28, cx, 200, (x, y) => { pinballSpinners.push(new Spinner(x, y, 28, '#ffea00')); });

  // Zone 3 (고전 복합) 스피너 5개 (날개 길이 10% 확대 적용)
  tryPlaceGimmick(2050, 35, 24, 180, 60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 24, '#8c52ff')); });
  tryPlaceGimmick(2050, 35, 24, 645, 60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 24, '#8c52ff')); });
  tryPlaceGimmick(2250, 40, 29, cx, 60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 29, '#ff9900')); });
  tryPlaceGimmick(2420, 40, 29, cx, 60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 29, '#00f0ff')); });
  tryPlaceGimmick(2600, 40, 31, cx, 60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 31, '#8c52ff')); });

  // ── 4. 와류 존 배치 ──
  // Zone 2 (피지컬 - 핀 없음) 와류 2개
  tryPlaceGimmick(1080, 40, 75, 290, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 75, '#8c52ff')); });
  tryPlaceGimmick(1300, 40, 75, 535, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 75, '#8c52ff')); });
  // Zone 3 (고전 복합) 와류 3개
  tryPlaceGimmick(2200, 40, 78, 240, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 78, '#8c52ff')); });
  tryPlaceGimmick(2480, 40, 78, 585, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 78, '#8c52ff')); });
  tryPlaceGimmick(2650, 40, 83, cx, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 83, '#8c52ff')); });

  // ── 5. 상향 발사대 배치 ──
  // Zone 2 (피지컬 - 핀 없음) 발사대 4개
  tryPlaceGimmick(1020, 30, 110/2 + 15, cx, 50, (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, 110, '#ff3366', randAngle())); });
  tryPlaceGimmick(1200, 40, 90/2 + 15, 190, 50, (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, 90,  '#ffea00', randAngle())); });
  tryPlaceGimmick(1200, 40, 90/2 + 15, 635, 50, (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, 90,  '#ffea00', randAngle())); });
  tryPlaceGimmick(1400, 40, 120/2 + 15, cx, 50, (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, 120, '#ff3366', randAngle())); });
  // Zone 3 (고전 복합) 발사대 6개
  tryPlaceGimmick(2150, 35, 70/2 + 15, 170, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 70,  '#33ff57', randAngle())); });
  tryPlaceGimmick(2150, 35, 70/2 + 15, 655, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 70,  '#33ff57', randAngle())); });
  tryPlaceGimmick(2300, 40, 130/2 + 15, cx, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 130, '#ff3366', randAngle())); });
  tryPlaceGimmick(2450, 40, 90/2 + 15, 250, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 90,  '#ffea00', randAngle())); });
  tryPlaceGimmick(2450, 40, 90/2 + 15, 575, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 90,  '#ffea00', randAngle())); });
  tryPlaceGimmick(2620, 35, 70/2 + 15, cx, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 70,  '#33ff57', randAngle())); });

  // ── 6. 깔때기 입구 극적 역전 지대 (Reversal Zone) ──
  // A. 중앙 분산 장치들 (하늘색 스피너 & 핑크 대형 탄성 범퍼)
  pinballSpinners.push(new Spinner(412.5, 2840, 29, '#00f0ff')); 
  pinballBumpers.push(new SuperBumper(412.5, 2950, 24, '#ff00ff')); 
  placedGimmicks.push({ x: 412.5, y: 2840, r: 29 });
  placedGimmicks.push({ x: 412.5, y: 2950, r: 24 });

  // B. 깔때기 지그재그 교차 특수 패드 배치
  // ① 상부 깔때기 레이어 (Y = 2800)
  const t1 = (2800 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx1 = funnelLeftX + t1 * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx1 = funnelRightX - t1 * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  const width1 = rx1 - lx1;
  pinballSpeedPads.push(new SpeedPad(lx1 + width1 * 0.28, 2800, 58, 24));
  pinballSpeedPads.push(new SpeedPad(lx1 + width1 * 0.72, 2800, 58, 24));

  // ② 하부 깔때기 레이어 (Y = 2950)
  const t2 = (2950 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx2 = funnelLeftX + t2 * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx2 = funnelRightX - t2 * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  const width2 = rx2 - lx2;
  pinballSpeedPads.push(new SpeedPad(lx2 + width2 * 0.28, 2950, 50, 24));
  pinballSpeedPads.push(new SpeedPad(lx2 + width2 * 0.72, 2950, 50, 24));

  // C. 깔때기 슬로프 밀착형 대각선 런치패드 2개 (슬로프 경계 Y: 3060 지점에서의 좌우 X 동적 연산)
  const t_lp = (3060 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx_lp = funnelLeftX + t_lp * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx_lp = funnelRightX - t_lp * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  pinballLaunchPads.push(new LaunchPad(lx_lp + 25, 3060, 66, '#ffea00', Math.PI * 0.12)); // 노란색 대각선 런치패드 (5% 축소)
  pinballLaunchPads.push(new LaunchPad(rx_lp - 25, 3060, 66, '#ff3366', -Math.PI * 0.18)); // 빨간색 대각선 런치패드 (5% 축소)
  pinballLaunchPads.push(new LaunchPad(cx, 3050, 106, '#33ff57', 0, 1.1, 52)); // 초록 중앙 좌우이동 발사대 (5% 추가 축소: 112 -> 106)


  // ── 7. 핀(Peg) 랜덤 배치 ── (구역별 필터링 전격 적용)
  const gapX = 28;
  const gapY = 28;
  const pegStartY = 160;
  const pegEndY   = FUNNEL_TOP_Y - 60;
  const jitter = gapX * 0.55;

  for (let row = 0; pegStartY + row * gapY <= pegEndY; row++) {
    const baseY = pegStartY + row * gapY;
    if (baseY > 900 && baseY < 1900) continue; // 2구간 및 2.5구간 (900~1900)의 모든 핀 생성 루프 격리 스킵
    const rowT = (baseY - pegStartY) / (pegEndY - pegStartY);
    const rowSkipRate = 0.28 - 0.18 * rowT;
    const isOdd = row % 2 === 1;
    const baseOffsetX = isOdd ? gapX / 2 : 0;

    for (let col = 0; ; col++) {
      const bx = baseOffsetX + col * gapX;
      if (bx > W) break;

      if (Math.random() < rowSkipRate) continue;

      const x = bx + (Math.random() - 0.5) * jitter;
      const y = baseY + (Math.random() - 0.5) * gapY * 0.45;

      const wBounds = getWallAtY(y);
      if (x < wBounds.lx + 24 || x > wBounds.rx - 24) continue;

      let skip = false;
      for (const p of pinballPortals) {
        if (Math.hypot(x - p.x1, y - p.y1) < p.r + 24 ||
            Math.hypot(x - p.x2, y - p.y2) < p.r + 24) { skip = true; break; }
      }
      if (!skip) for (const b of pinballBumpers) {
        if (Math.hypot(x - b.x, y - b.y) < b.r + 30) { skip = true; break; }
      }
      if (!skip) for (const s of pinballSpinners) {
        if (Math.hypot(x - s.x, y - s.y) < s.r + 32) { skip = true; break; }
      }
      if (!skip) for (const v of pinballVortexes) {
        if (Math.hypot(x - v.x, y - v.y) < v.r + 20) { skip = true; break; }
      }
      if (!skip) for (const lp of pinballLaunchPads) {
        if (x > lp.x - lp.w/2 - 15 && x < lp.x + lp.w/2 + 15 && Math.abs(y - lp.y) < 32) { skip = true; break; }
      }

      if (!skip) {
        for (const ep of pinballPegs) {
          if (Math.abs(ep.y - y) > 29) continue;
          if (Math.hypot(x - ep.x, y - ep.y) < 29) { skip = true; break; }
        }
      }
      if (!skip) pinballPegs.push(new Peg(x, y, 5));
    }
  }
}

// 핀 10% 랜덤 제거
pinballPegs = pinballPegs.filter(() => Math.random() > 0.10);

// ── 완주 및 당첨 판독기 ──────────────────

function registerFinishedBall(ball) {
  if (pinballFinishedBalls.some(b => b.id === ball.id)) return;

  const duration = ((Date.now() - raceStartTime) / 1000).toFixed(2);
  const finishedCount = pinballFinishedBalls.length;

  // 14. 사진 판독 (Photo Finish / VAR) 도입: 깻잎 한 장 차이 동시 골인
  let triggerVAR = false;
  if (!varTriggered && finishedCount > 0) {
    const prevBall = pinballFinishedBalls[finishedCount - 1];
    const timeDiff = parseFloat(duration) - parseFloat(prevBall.duration);

    // 이전 구슬과 골인 시점 시간차가 0.05초(50ms) 이하인 초근접 상황 검출
    if (Math.abs(timeDiff) <= 0.05) {
      if (currentRule === 'first' && finishedCount < winCount) {
        triggerVAR = true;
      } else if (currentRule === 'specific' && finishedCount === specificRank - 1) {
        triggerVAR = true;
      } else if (currentRule === 'last' && finishedCount === pinballBalls.length - winCount - 1) {
        triggerVAR = true;
      }
    }
  }

  pinballFinishedBalls.push({
    id: ball.id,
    name: ball.name,
    color: ball.color,
    duration: duration
  });

  // 골인선 통과 시 관성을 살려서 굴러가도록 살짝 밀어줌 (안착 가이드 충격)
  ball.vy = Math.max(1.2, ball.vy * 0.7); 
  ball.vx = ball.vx * 0.8 + (Math.random() - 0.5) * 1.5;

  renderLeaderboard();

  if (triggerVAR) {
    varChecking = true;
    varTriggered = true;
    varTimer = 140; // 약 2.3초간 슬로우모션 판독 진행
    camDramaTarget = ball; // 골인 구슬에 밀착 줌인 고정
    camDramaTimer = 145;
    pinballLog("🔍 PHOTO FINISH! INITIATING ULTRA VAR SCAN...");
  } else {
    checkWinningConditions();
  }

  if (pinballFinishedBalls.length >= pinballBalls.length) {
    pinballGameRunning = false;
    pinballLog("ALL RUNNERS FINISHED! Race Complete.");
    const btnLaunch = document.getElementById('btn-pinball-launch');
    if (btnLaunch) { btnLaunch.disabled = false; btnLaunch.style.opacity = '1'; }
  }
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;

  if (pinballFinishedBalls.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:rgba(255,255,255,0.2); padding: 20px 0;">구슬 경주 대기 중...</td></tr>`;
    return;
  }

  let html = '';
  pinballFinishedBalls.forEach((b, idx) => {
    const rank = idx + 1;
    const totalForRank = pinballBalls.length;
    const isTop = (currentRule === 'first' && rank <= winCount)
               || (currentRule === 'last' && rank > totalForRank - winCount);
    const rankClass = isTop ? 'leaderboard-rank top-rank' : 'leaderboard-rank';
    
    html += `
      <tr>
        <td class="${rankClass}">#${rank}</td>
        <td style="display:flex; align-items:center; gap:6px; font-weight:700;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${b.color}; box-shadow:0 0 6px ${b.color};"></span>
          ${b.name}
        </td>
        <td style="text-align:right; font-family:'Courier New', monospace; color:var(--neon-blue); font-weight:600;">${b.duration}s</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

function checkWinningConditions() {
  if (hasAnnouncedWinners) return;
  if (varChecking) return; // VAR 판독 중에는 우승 발표 유예

  const totalMembers = pinballBalls.length;
  const finishedCount = pinballFinishedBalls.length;

  let winnerList = [];
  let isConditionMet = false;

  if (currentRule === 'first') {
    if (finishedCount >= winCount) {
      winnerList = pinballFinishedBalls.slice(0, winCount);
      isConditionMet = true;
    }
  } else if (currentRule === 'last') {
    // n-m명이 먼저 들어온 순간 종료 → 아직 안 들어온 m명이 당첨
    if (finishedCount >= totalMembers - winCount) {
      winnerList = pinballBalls.filter(b => !b.isFinished);
      isConditionMet = true;
    }
  } else if (currentRule === 'specific') {
    if (finishedCount >= specificRank) {
      winnerList = [pinballFinishedBalls[specificRank - 1]];
      isConditionMet = true;
    }
  }

  if (isConditionMet) {
    hasAnnouncedWinners = true;
    pinballLog("ATTENTION MAP DECIDED! CALCULATING WINNERS...");
    
    setTimeout(() => {
      triggerPinballConfetti();
      showWinningPopup(winnerList);
    }, 800);
  }
}

function showWinningPopup(winners) {
  const modal = document.getElementById('pinball-result-modal');
  const textEl = document.getElementById('pinball-winner-text');
  const badgeEl = document.getElementById('modal-rule-title');
  
  if (!modal || !textEl || !badgeEl) return;

  const names = winners.map(w => w.name).join(', ');
  textEl.innerText = names;

  if (currentRule === 'first') {
    badgeEl.innerText = `선착순 ${winCount}명 당첨!`;
    badgeEl.style.color = 'var(--aws-orange)';
  } else if (currentRule === 'last') {
    badgeEl.innerText = `후착순(꼴찌) ${winCount}명 당첨!`;
    badgeEl.style.color = '#8c52ff';
  } else {
    badgeEl.innerText = `단독 ${specificRank}순위 당첨!`;
    badgeEl.style.color = '#00f0ff';
  }

  modal.style.display = 'block';
  pinballLog(`WINNERS ANNOUNCED: ${names}`);
}

// ── 런처 및 60FPS 루프 ───────────────────

function updatePreviewBalls() {
  if (pinballGameRunning) return;
  const ta = document.getElementById('pinball-members');
  if (!ta) return;
  const members = ta.value.split(',').map(n => n.trim()).filter(n => n.length > 0);
  pinballBalls = [];
  
  const btnShuffle = document.getElementById('btn-shuffle-members');
  if (btnShuffle) {
    btnShuffle.innerText = `순서섞기 (${members.length}명)`;
  }
  
  if (members.length === 0) return;
  const spacing = GAME_VWIDTH / (members.length + 1);
  members.forEach((name, idx) => {
    pinballBalls.push(new RacingBall(idx, name, spacing * (idx + 1), 40, COLOR_SPECTRUM[idx % COLOR_SPECTRUM.length]));
  });
}

function updateSpecificRankSelect() {
  const ta  = document.getElementById('pinball-members');
  const sel = document.getElementById('pinball-specific-rank');
  if (!ta || !sel) return;
  const names = ta.value.split(',').map(n => n.trim()).filter(n => n.length > 0);
  const count = Math.max(names.length, 1);

  const winInput = document.getElementById('pinball-win-count');
  if (winInput) {
    winInput.max = count;
    if (parseInt(winInput.value) > count) winInput.value = count;
  }

  const prev  = parseInt(sel.value) || 1;
  sel.innerHTML = '';
  names.forEach((_, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = `${i + 1}번째 골인자`;
    if (i + 1 === prev) opt.selected = true;
    sel.appendChild(opt);
  });

  updatePreviewBalls();
}

function shuffleMembers() {
  const ta = document.getElementById('pinball-members');
  if (!ta) return;
  const names = ta.value.split(',').map(n => n.trim()).filter(n => n.length > 0);
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  ta.value = names.join(', ');
  updateSpecificRankSelect();
}

function pinballLog(msg) {
  const term = document.getElementById('pinball-terminal');
  if (!term) return;
  term.innerHTML += `<div>> ${msg}</div>`;
  // P-2: 로그 최대 20줄 유지 (DOM 비대화 방지)
  const _logEntries = term.querySelectorAll('div');
  if (_logEntries.length > 20) {
    for (let _i = 0; _i < _logEntries.length - 20; _i++) _logEntries[_i].remove();
  }
  term.scrollTop = term.scrollHeight;
}

function launchPinballRacing() {
  if (pinballGameRunning) return;

  const membersTextarea = document.getElementById('pinball-members');
  if (!membersTextarea) return;

  const members = membersTextarea.value.split(',')
                                       .map(name => name.trim())
                                       .filter(name => name.length > 0);

  if (members.length === 0) {
    alert("최소 한 명 이상의 팀원 이름을 입력해주세요!");
    return;
  }

  updateSpecificRankSelect();

  const ruleRadio = document.querySelector('input[name="pinball-rule"]:checked');
  currentRule = ruleRadio ? ruleRadio.value : 'first';
  winCount = Math.max(1, parseInt(document.getElementById('pinball-win-count').value) || 1);
  specificRank = Math.max(1, parseInt(document.getElementById('pinball-specific-rank').value) || 1);

  if ((currentRule === 'first' || currentRule === 'last') && winCount > members.length) {
    alert(`당첨 인원수(${winCount}명)가 팀원 수(${members.length}명)보다 많습니다!`);
    return;
  }

  if (currentRule === 'specific' && specificRank > members.length) {
    alert(`골인 순번(${specificRank}위)이 참가 팀원 수(${members.length}명)보다 큽니다! 순번을 낮추거나 인원을 늘려주세요.`);
    return;
  }

  pinballLog("Warming up quantum gravity engines...");
  pinballLog(`LAUNCHING BALL RACE FOR ${members.length} RUNNERS!`);
  
  pinballFinishedBalls = [];
  pinballBalls = [];
  hasAnnouncedWinners = false;
  renderLeaderboard();

  const modal = document.getElementById('pinball-result-modal');
  if (modal) modal.style.display = 'none';

  stopPinballConfetti();

  cameraY = 0;
  cameraZoom = 1.0;
  cameraZoomTarget = 1.0;

  const spacing = GAME_VWIDTH / (members.length + 1);

  members.forEach((name, idx) => {
    const x = spacing * (idx + 1);
    const y = 40;
    const color = COLOR_SPECTRUM[idx % COLOR_SPECTRUM.length];
    pinballBalls.push(new RacingBall(idx, name, x, y, color));
  });

  const btnLaunchEl = document.getElementById('btn-pinball-launch');
  if (btnLaunchEl) { btnLaunchEl.disabled = true; btnLaunchEl.style.opacity = '0.45'; }

  setTimeout(() => {
    raceStartTime = Date.now();
    pinballGameRunning = true;

    varChecking = false;
    varTriggered = false;
    speedPadRotateTimer = 300; // 가속 패드 회전 주기 리셋
    prevRankOrder = [];
    overtakeParticles = [];
    pinballNearMissSparks = [];
    currentLeaderId = -1;
    crownFlashTimer = 0;
    decisiveMomentActive = false;

    pinballBalls.forEach(b => {
      const _t = b.x / GAME_VWIDTH;         // 0(좌끝) ~ 1(우끝) 위치 비율
      const _centerPull = (0.5 - _t) * 9;   // 중앙 방향 편향 (끝 공은 ±4.5px)
      const _jitter = (Math.random() - 0.5) * 2.5; // 살짝 랜덤 ±1.25px
      b.vx = _centerPull + _jitter;
      b.vy = -Math.random() * 8.5 - 3.5;    // 상향 대포알 분출
    });

    pinballLog("RACE IN PROGRESS. QUANTUM ENTANGLEMENT ESTABLISHED.");
  }, 900);
}

let lastTime = 0;

function animatePinball(currentTime) {
  pinballAnimId = requestAnimationFrame(animatePinball);
  
  const now = currentTime || performance.now();
  if (!lastTime) lastTime = now;
  const elapsed = now - lastTime;
  
  if (elapsed < FPS_INTERVAL) {
    return; // 60FPS 주기가 아직 흐르지 않았으면 프레임을 건너뜁니다.
  }
  lastTime = now - (elapsed % FPS_INTERVAL);

  if (!pinballCanvas || !pinballCtx) return;
  const ctx = pinballCtx;
  const VW = GAME_VWIDTH;
  const VH = GAME_VHEIGHT;
  const CH = pinballCanvas ? pinballCanvas.height : 720; // B-2/I-5: 동적 캔버스 높이 캐싱

  // VAR 슬로우모션 프레임 레이트 팽창 제어
  let shouldRunPhysics = true;
  if (varChecking) {
    varTimer--;
    shouldRunPhysics = (varTimer % 8 === 0); // 8프레임에 1프레임만 물리 전진 (초정밀 슬로우 비디오)
    if (varTimer <= 0) {
      varChecking = false;
      checkWinningConditions(); // 판독 최종 종료 즉시 당첨 확정
    }
  }

  // A. 카메라 스크롤
  const activeBalls = pinballBalls.filter(b => !b.isFinished);
  if (activeBalls.length > 0 && pinballGameRunning) {

    // ── 드라마틱 카메라 시스템 ──────────────────────
    // ① 타이머 감소
    if (camDramaTimer > 0) { camDramaTimer--; if (camDramaTimer === 0) camDramaTarget = null; }

    const _camSorted = [...activeBalls].sort((a, b) => b.y - a.y);

    // ② 근접 경쟁 감지: 1·2위 간격 70px 이내 → 2위 구슬 0.8초 추적 (진짜 접전만)
    if (camDramaTimer === 0 && _camSorted.length >= 2) {
      if (_camSorted[0].y - _camSorted[1].y < 70) {
        camDramaTarget = _camSorted[1];
        camDramaTimer = 50;
      }
    }

    // ③ 확률적 꼴찌 컷: 0.1%/frame → 1.5초 꼴찌 추적
    if (camDramaTimer === 0 && Math.random() < 0.001) {
      camDramaTarget = _camSorted[_camSorted.length - 1];
      camDramaTimer = 90;
    }

    // ④ 파이널 존 진입 시 드라마 해제 후 리더 즉시 추적
    const _anyInFunnel = activeBalls.some(b => b.y > FUNNEL_TOP_Y);
    if (_anyInFunnel) { camDramaTimer = 0; camDramaTarget = null; }

    // ⑤ Multi-target framing: 모드별 카메라 철학으로 대상 공 배열 선택
    let _camTargets;
    if (camDramaTarget) {
      _camTargets = [camDramaTarget];               // 드라마 컷: 단일 공 집중
    } else if (_anyInFunnel) {
      _camTargets = [_camSorted[0]];                // 깔때기: 선두 단일 집중
    } else if (currentRule === 'first') {
      _camTargets = _camSorted.slice(0, Math.min(3, _camSorted.length)); // 상위 3명 경쟁
    } else if (currentRule === 'last') {
      // 탈락 위험권: 생존선(winCount) 주변 하위권 공 집중
      const _keepCount = winCount + 2;
      _camTargets = _camSorted.slice(Math.max(0, _camSorted.length - _keepCount));
      if (_camTargets.length === 0) _camTargets = [_camSorted[_camSorted.length - 1]];
    } else {
      // specific rank: 목표 순위 ±2 범위 공 집중
      const _tIdx = Math.min(specificRank - 1, _camSorted.length - 1);
      _camTargets = _camSorted.slice(Math.max(0, _tIdx - 2), Math.min(_camSorted.length, _tIdx + 3));
    }

    const _tMinY = Math.min(..._camTargets.map(b => b.y));
    const _tMaxY = Math.max(..._camTargets.map(b => b.y));
    const _tCenterY = (_tMinY + _tMaxY) / 2;
    const _spreadY = _tMaxY - _tMinY;

    // 파이널 존·드라마 컷에서는 고속 lerp 적용
    const _lerp = (_anyInFunnel || camDramaTarget) ? 0.12 : 0.05;
    const targetCY = _tCenterY - CH / 2;
    cameraY += (targetCY - cameraY) * _lerp;
    cameraY = Math.max(0, Math.min(cameraY, VH - CH));

    // ⑥ Zoom: funnel 1.05 우선, 그 외 spread 기반 미세 줌
    // spread 0(단일/접전) → 1.03, spread 400 → 1.00, 그 사이 선형 감소
    if (_anyInFunnel) {
      cameraZoomTarget = 1.05;
    } else {
      cameraZoomTarget = Math.max(1.0, Math.min(1.03, 1.03 - _spreadY * 0.0001));
    }
    cameraZoom += (cameraZoomTarget - cameraZoom) * 0.02;
  } else {
    // 공이 없을 때 zoom 복원
    cameraZoomTarget = 1.0;
    cameraZoom += (cameraZoomTarget - cameraZoom) * 0.02;
  }

  // B. 배경
  ctx.fillStyle = '#06070d';
  ctx.fillRect(0, 0, pinballCanvas.width, pinballCanvas.height);

  // C. 게임 영역 카메라 변환 적용 (zoom은 실제 게임판 가로 중앙 기준 확대)
  ctx.save();
  const _zoomCX = GAME_X_OFFSET + GAME_VWIDTH / 2;
  const _zoomCY = CH / 2;
  ctx.translate(_zoomCX, _zoomCY);
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-_zoomCX, -_zoomCY);
  ctx.translate(GAME_X_OFFSET, -cameraY);

  const visY0 = cameraY;
  const visY1 = cameraY + CH; // B-2: 동적 화면 높이 기반 컬링 범위
  let bgGrad = ctx.createRadialGradient(VW/2, visY0+CH/2, 60, VW/2, visY0+CH/2, 520);
  bgGrad.addColorStop(0, '#10122e');
  bgGrad.addColorStop(1, '#05060b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, visY0, VW, CH);

  // 가변 벽 그리기
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

  // 깔때기 + 골인선
  ctx.save();
  ctx.strokeStyle = 'rgba(140,82,255,0.5)';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#8c52ff';
  ctx.beginPath();
  ctx.moveTo(funnelLeftX,  FUNNEL_TOP_Y);
  ctx.lineTo(FUNNEL_BOTTOM_X,          GOAL_Y);
  ctx.lineTo(FUNNEL_BOTTOM_X,          GOAL_Y + 40);
  ctx.moveTo(funnelRightX, FUNNEL_TOP_Y);
  ctx.lineTo(VW - FUNNEL_BOTTOM_X,     GOAL_Y);
  ctx.lineTo(VW - FUNNEL_BOTTOM_X,     GOAL_Y + 40);
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = 'rgba(0,240,255,0.07)';
  ctx.fillRect(FUNNEL_BOTTOM_X, GOAL_Y, VW - FUNNEL_BOTTOM_X * 2, 40);
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 5; ctx.shadowColor = '#00f0ff';
  ctx.strokeRect(FUNNEL_BOTTOM_X, GOAL_Y, VW - FUNNEL_BOTTOM_X * 2, 40);
  ctx.restore();

  // ── Zone 2.5 레인터널 3레인 및 수직 장벽 렌더링 ───────────────────
  if (visY1 >= TUNNEL_TOP_Y && visY0 <= TUNNEL_BOTTOM_Y) {
    ctx.save();

    const tunnelH = TUNNEL_BOTTOM_Y - TUNNEL_TOP_Y;
    const tunnelW = TUNNEL_RIGHT_X - TUNNEL_LEFT_X;
    
    // 가벽 바깥으로 렌더링이 삐져나가지 않게 클리핑 영역 설정
    ctx.beginPath();
    ctx.rect(TUNNEL_LEFT_X, TUNNEL_TOP_Y, tunnelW, tunnelH);
    ctx.clip();

    // A. 3개 레인 배경 및 흐르는 화살표 애니메이션 그리기 (가속: 하늘색/▼, 감속: 빨간색/▲)
    const laneWidth = 115; // 3개 레인 폭 115px 완벽 동등 분할
    const flowDownSpeed = (Date.now() / 20) % 80;
    const flowUpSpeed = (Date.now() / 20) % 80;

    for (let laneIdx = 0; laneIdx < 3; laneIdx++) {
      // 레인 0은 180, 레인 1은 355 (180 + 115 + 60), 레인 2는 530 (355 + 115 + 60)
      const lx = TUNNEL_LEFT_X + laneIdx * (laneWidth + TUNNEL_BARRIER_W);
      const cxVal = lx + laneWidth / 2;

      // 1. 레인별 배경색 및 스크롤 연출 분리
      if (laneIdx !== pinballAccelLane) {
        // 감속 레인: 은은한 빨간색 네온 배경 (2개 레인)
        ctx.fillStyle = 'rgba(255, 51, 102, 0.05)';
        ctx.fillRect(lx, TUNNEL_TOP_Y, laneWidth, tunnelH);

        // 위로 거꾸로 역행하여 흐르는 빨간색 화살표 ▲ 렌더링 (제동 연출)
        ctx.fillStyle = 'rgba(255, 51, 102, 0.18)';
        ctx.font = 'bold 15px Outfit, sans-serif';
        ctx.textAlign = 'center';
        
        for (let ly = TUNNEL_BOTTOM_Y - flowUpSpeed; ly > TUNNEL_TOP_Y - 40; ly -= 80) {
          if (ly >= TUNNEL_TOP_Y && ly <= TUNNEL_BOTTOM_Y) {
            ctx.fillText('▲', cxVal, ly);
            ctx.fillText('▲', cxVal, ly + 25);
          }
        }
      } else {
        // 가속 레인: 은은한 하늘색 네온 배경
        ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.fillRect(lx, TUNNEL_TOP_Y, laneWidth, tunnelH);

        // 아래로 쾌속 스크롤되는 하늘색 화살표 ▼ 렌더링 (추진 연출)
        ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
        ctx.font = 'bold 15px Outfit, sans-serif';
        ctx.textAlign = 'center';

        for (let ly = TUNNEL_TOP_Y + flowDownSpeed - 80; ly < TUNNEL_BOTTOM_Y + 40; ly += 80) {
          if (ly >= TUNNEL_TOP_Y && ly <= TUNNEL_BOTTOM_Y) {
            ctx.fillText('▼', cxVal, ly);
            ctx.fillText('▼', cxVal, ly - 25);
          }
        }
      }
    }

    // 2. 3개 레인 경계 가이드 점선 그리기 (고체 섬 중앙 점선)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(TUNNEL_BARRIER1_X, TUNNEL_TOP_Y); ctx.lineTo(TUNNEL_BARRIER1_X, TUNNEL_BOTTOM_Y);
    ctx.moveTo(TUNNEL_BARRIER2_X, TUNNEL_TOP_Y); ctx.lineTo(TUNNEL_BARRIER2_X, TUNNEL_BOTTOM_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore(); // 클리핑 영역 해제

    // B. 2개의 육각형 다이아몬드 고체 장벽 섬(Island) 렌더링 (외부 맵 가벽 스타일 100% 일체화)
    ctx.save();
    ctx.fillStyle = '#07080f'; // 가벽 내부와 동일한 색상 채우기
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)'; // 가벽 외곽선과 동일한 시안 네온 블루
    ctx.lineWidth = 2; // 가벽 외곽 두께와 동일
    ctx.shadowBlur = 6; // 가벽 네온 발광도 동일
    ctx.shadowColor = '#00f0ff'; // 시안 발광 색상 동일

    // 1. 섬 1 렌더링 (대칭형 육각형 다이아몬드 지형, 60px 폭 확장)
    ctx.beginPath();
    ctx.moveTo(325, 1500); // 상단 뾰족
    ctx.lineTo(355, 1530); // 우상 각진 점
    ctx.lineTo(355, 1870); // 우하 각진 점
    ctx.lineTo(325, 1900); // 하단 뾰족
    ctx.lineTo(295, 1870); // 좌하 각진 점
    ctx.lineTo(295, 1530); // 좌상 각진 점
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. 섬 2 렌더링 (대칭형 육각형 다이아몬드 지형, 60px 폭 확장)
    ctx.beginPath();
    ctx.moveTo(500, 1500); // 상단 뾰족
    ctx.lineTo(530, 1530); // 우상 각진 점
    ctx.lineTo(530, 1870); // 우하 각진 점
    ctx.lineTo(500, 1900); // 하단 뾰족
    ctx.lineTo(470, 1870); // 좌하 각진 점
    ctx.lineTo(470, 1530); // 좌상 각진 점
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 구간 구분선
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let gy = 500; gy < VH; gy += 500) {
    ctx.beginPath();
    ctx.moveTo(0, gy); ctx.lineTo(VW, gy);
    ctx.stroke();
  }

  // 기믹 드로잉
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
  pinballSpeedPads.forEach(pad => {
    if (pad.y + pad.h/2 > visY0 - margin && pad.y - pad.h/2 < visY1 + margin) pad.draw(ctx);
  });

  // 구슬 물리 연산
  if (pinballGameRunning && shouldRunPhysics) {
    // 최하단 가속 패드 회전 주기 타이머 (5초 = 300 프레임)
    speedPadRotateTimer--;
    if (speedPadRotateTimer <= 0) {
      speedPadRotateTimer = 300;
      pinballSpeedPads.forEach(pad => pad.rotateClockwise());
      pinballLog("⚡ 가속 패드 방향 즉시 회전!");
    }

    // 고체 섬 내부 뚫림(터널링) 예외 복구 및 자동 사출 핸들러
    pinballBalls.forEach(ball => {
      if (ball.isFinished) return;
      if (ball.y >= 1500 && ball.y <= 1900) {
        [325, 500].forEach(islandX => {
          // Y좌표에 따른 육각형 섬의 정확한 수학적 반폭(halfW) 계산 (최대 30px)
          let halfW = 30;
          if (ball.y < 1530) {
            halfW = ball.y - 1500;
          } else if (ball.y > 1870) {
            halfW = 1900 - ball.y;
          }
          
          // 구슬 중심이 섬 내부로 침범했는지 정밀 검사
          if (Math.abs(ball.x - islandX) < halfW) {
            // 섬 중심 기준 좌우 판정하여 즉시 바깥 통로로 강제 사출
            if (ball.x < islandX) {
              ball.x = islandX - halfW - ball.r - 2;
              ball.vx = -Math.abs(ball.vx) - 2.5; // 왼쪽 통로로 추진 사출
            } else {
              ball.x = islandX + halfW + ball.r + 2;
              ball.vx = Math.abs(ball.vx) + 2.5;  // 오른쪽 통로로 추진 사출
            }
            pinballLog(`🛡️ ${ball.name} 섬 내부 터널링 방지막 가동! 강제 사출.`);
          }
        });
      }
    });

    // E-1. 구슬 간 충돌 (구슬간 튕김 및 밀어냄 1.3배 대폭 강화, 완주 구슬도 바닥에서 들이받기 가능)
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
            // 밀어내는 척력 복원 강도 상향
            b1.x -= nx*ov*0.52; b1.y -= ny*ov*0.52;
            b2.x += nx*ov*0.52; b2.y += ny*ov*0.52;
            const rv = (b1.vx-b2.vx)*nx + (b1.vy-b2.vy)*ny;
            if (rv > 0) {
              // 충돌 튕김력을 b1.restitution과 가중치를 더해 대폭 강화 (충돌 카오스)
              const imp = rv * (1.1 + b1.restitution * 1.5) * 0.65;
              b1.vx -= nx*imp * 1.15; b1.vy -= ny*imp * 1.15;
              b2.vx += nx*imp * 1.15; b2.vy += ny*imp * 1.15;
            }
          }
        }
      }
    }

    // ── 선두 디버프 순위 세트 산출 (상위 30%) ──────────────
    const _dbSorted = pinballBalls.filter(b => !b.isFinished).sort((a, b) => b.y - a.y);
    const _dbCut = Math.max(1, Math.ceil(_dbSorted.length * 0.3));
    const _leaderSet = new Set(_dbSorted.slice(0, _dbCut).map(b => b.id));

    // E-2. 장애물 충돌
    pinballBalls.forEach(ball => {
      if (ball.isFinished) return;
      const by = ball.y;

      const _ballSpeed = Math.hypot(ball.vx, ball.vy);
      for (const peg of pinballPegs) {
        if (peg.y < by - 60 || peg.y > by + 60) continue;

        // 서브스텝: speed > 14 시 이동 중간 위치도 검사하여 터널링 방지
        // 중간 위치가 충돌권 내부면 해당 좌표로 충돌 해석
        let _cx = ball.x, _cy = ball.y;
        if (_ballSpeed > 14) {
          const _mx = ball.x - ball.vx * 0.5;
          const _my = ball.y - ball.vy * 0.5;
          const _minD = ball.r + peg.r;
          if ((_mx-peg.x)*(_mx-peg.x) + (_my-peg.y)*(_my-peg.y) < _minD*_minD) {
            _cx = _mx; _cy = _my;
          }
        }

        const dx = _cx - peg.x, dy = _cy - peg.y;
        const distSq = dx*dx + dy*dy;
        const minD = ball.r + peg.r;
        if (distSq < minD*minD && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const nx = dx/dist, ny = dy/dist;
          ball.x = peg.x + nx*minD;
          ball.y = peg.y + ny*minD;
          const dot = ball.vx*nx + ball.vy*ny;
          if (dot < 0) {
            // 선두 디버프: 핀 충돌 에너지 흡수 20% 강화 (0.88 → 0.80)
            const _pegAbsorb = _leaderSet.has(ball.id) ? 0.80 : 0.88;
            ball.vx = (ball.vx - (1+ball.restitution)*dot*nx) * _pegAbsorb;
            ball.vy = (ball.vy - (1+ball.restitution)*dot*ny) * _pegAbsorb;
            peg.trigger();
          }
        }
      }

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
            if (spin.angularVelocity > 0.25) spin.angularVelocity = 0.25; // P-3: 무한 누적 방지 상한 클램핑
          }
        }
      }

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
            // B-1/I-4: 초탄성 반사(3.5x) + 법선 방향 체력 (물리 대칭) + 터널링 방지 클램핑
            ball.vx = (ball.vx - 3.5*dot*nx) + (Math.random()-0.5)*6 + nx * 4.5;
            ball.vy = (ball.vy - 3.5*dot*ny) + ny * 4.5;
            const _bspd = Math.hypot(ball.vx, ball.vy);
            if (_bspd > 14) { ball.vx = ball.vx / _bspd * 14; ball.vy = ball.vy / _bspd * 14; }
            bump.trigger();
          }
        }
      }

      for (const lp of pinballLaunchPads) {
        // 로컬 좌표계 변환을 통한 회전된 발사대 충돌 검사
        const dx = ball.x - lp.x;
        const dy = ball.y - lp.y;
        const cos = Math.cos(-lp.angle);
        const sin = Math.sin(-lp.angle);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;

        // 로컬 좌표 기준 속도 Y 성분 (발사대 표면으로 다가오는지 여부)
        const localVy = ball.vx * sin + ball.vy * cos;

        const _isYellow = lp.color === '#ffea00';
        // 노란판: 양면 충돌 (|localVy| > 0.1), 나머지: 단방향 (localVy > 0)
        const _hitDir = _isYellow ? Math.abs(localVy) > 0.1 : localVy > 0;

        if (_hitDir &&
            lx >= -lp.w/2 - ball.r && lx <= lp.w/2 + ball.r &&
            ly + ball.r >= 0 && ly - ball.r <= lp.h) {

          lp.trigger();

          // 가장 밑의 초록색 판 (y > 3000)인 경우 매 튕길 때마다 최소 50% ~ 최대 150% 가변 탄성률 적용
          const isBottomGreen = lp.color === '#33ff57' && lp.y > 3000;
          const bounceFactor = isBottomGreen ? (0.5 + Math.random() * 1.0) : 1.0;
          const speed = Math.max(8, Math.hypot(ball.vx, ball.vy) * 1.1 + 7) * bounceFactor;
          
          let _nx = Math.sin(lp.angle);
          let _ny = -Math.cos(lp.angle);
          // 노란판: 항상 위쪽으로 발사 (ny > 0이면 법선 반전)
          if (_isYellow && _ny > 0) { _nx = -_nx; _ny = -_ny; }

          ball.vx = _nx * speed + (Math.random() - 0.5) * 2;
          ball.vy = _ny * speed + (Math.random() - 0.5) * 1;

          // 충돌 면에서 밀어내기 (윗면 맞으면 위로, 아랫면 맞으면 아래로)
          const newLocalY = localVy > 0 ? -ball.r - 2 : lp.h + ball.r + 2;
          const cosA = Math.cos(lp.angle);
          const sinA = Math.sin(lp.angle);
          ball.x = lp.x + (lx * cosA - newLocalY * sinA);
          ball.y = lp.y + (lx * sinA + newLocalY * cosA);
        }
      }

      for (const port of pinballPortals) {
        if (ball.portalCooldown > 0) continue;
        if (Math.hypot(ball.x - port.x1, ball.y - port.y1) < ball.r + port.r * 0.7) {
          ball.x = port.x2;
          ball.y = port.y2 + 25;
          ball.vy = -(Math.abs(ball.vy) * 0.4 + 1.5); // I-1: 포탈 출구 위쪽으로 발사
          ball.vx *= 0.5;
          ball.portalCooldown = 50;
          pinballLog(`${ball.name} → ${port.name}!`);
        }
      }

      for (const vort of pinballVortexes) {
        if (Math.hypot(ball.x - vort.x, ball.y - vort.y) < vort.r + ball.r) {
          // 선두 디버프: 와류 감속 1.8배 강화
          const _vMult = _leaderSet.has(ball.id) ? 1.8 : 1.0;
          ball.vy -= ball.gravity * 0.425;
          ball.vx *= (1 - 0.03 * _vMult);
          ball.vy *= (1 - 0.03 * _vMult);
        }
      }

      // ── 마지막 20% 완만 감속 구간 (Y > 2560) ─────────────────
      if (ball.y > GAME_VHEIGHT * 0.80) {
        const _decelT = Math.min(1, (ball.y - GAME_VHEIGHT * 0.80) / (GOAL_Y - GAME_VHEIGHT * 0.80));
        ball.vx *= (1 - _decelT * 0.10);
        ball.vy *= (1 - _decelT * 0.10);
      }

      // ── 선두 디버프: 추가 마찰 (0.8%/frame) ─────────────────────
      if (_leaderSet.has(ball.id)) {
        ball.vx *= 0.992;
        ball.vy *= 0.992;
      }

      // 특수 패드(가속 패드) 충돌 체크 및 방향별 4종 물리 효과 적용
      for (const pad of pinballSpeedPads) {
        if (Math.abs(ball.x - pad.x) < pad.w/2 + ball.r &&
            Math.abs(ball.y - pad.y) < pad.h/2 + ball.r) {
          
          if (pad.direction === 'down') {
            ball.vy += 0.48; // 아래로 급가속
            ball.vx *= 1.01;
          } else if (pad.direction === 'up') {
            ball.vy -= 0.38; // 위로 밀어올림 (지연 효과)
          } else if (pad.direction === 'left') {
            ball.vx -= 0.45; // 왼쪽 수평 추진
          } else if (pad.direction === 'right') {
            ball.vx += 0.45; // 오른쪽 수평 추진
          }
          
          ball.superChargeTimer = Math.max(ball.superChargeTimer, 20); // 가속 광원 파티클 효과 활성화
        }
      }

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

  // 구슬 업데이트 & 드로잉
  pinballBalls.forEach(ball => {
    if (shouldRunPhysics) ball.update();
    ball.draw(ctx);
  });

  // ── 런서 역전 감지 및 왕관/역전 이펙트 ─────────────────
  if (pinballGameRunning && shouldRunPhysics) {
    const _aSort = [...pinballBalls.filter(b => !b.isFinished)].sort((a, b) => b.y - a.y);
    if (_aSort.length >= 2) {
      const _curOrd = _aSort.map(b => b.id);
      // 역전 감지 (길이 같을 때만 = 완주 이벤트 프레임 제외)
      if (prevRankOrder.length === _curOrd.length) {
        _aSort.forEach((ball, i) => {
          if (ball.overtakeCooldown > 0) { ball.overtakeCooldown--; return; }
          const _pi = prevRankOrder.indexOf(ball.id);
          if (_pi > i) { // 순위 상승 = 역전!
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
      // 1위 변경 감지 → 왕관 플래시
      const _lid = _aSort[0].id;
      if (_lid !== currentLeaderId) { currentLeaderId = _lid; crownFlashTimer = 22; }
    }
    if (crownFlashTimer > 0) crownFlashTimer--;
  }

  // 역전! 사선 텍스트 파티클 드로잉
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

  // 🏅 모드별 순위 인디케이터 (왕관/방패/과녁)
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
        // 둥근 방패 실루엣
        ctx.beginPath();
        ctx.moveTo(_cx, _cy);
        ctx.quadraticCurveTo(_cx + sw/2,    _cy + sh*0.18, _cx + sw*0.42, _cy + sh*0.58);
        ctx.quadraticCurveTo(_cx + sw*0.28,  _cy + sh*0.92, _cx,          _cy + sh);
        ctx.quadraticCurveTo(_cx - sw*0.28,  _cy + sh*0.92, _cx - sw*0.42, _cy + sh*0.58);
        ctx.quadraticCurveTo(_cx - sw/2,    _cy + sh*0.18, _cx,          _cy);
        ctx.closePath();
        ctx.fill();
        // 내부 십자 문양
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
        // 바깥 회전 arc (lock-on)
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(_cx, _cy, 9, t, t + Math.PI * 0.8);
        ctx.stroke();
        // 안쪽 반대 방향 회전 arc
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(_cx, _cy, 5.5, -t * 1.2, -t * 1.2 + Math.PI * 0.7);
        ctx.stroke();
        // 중앙 점
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(_cx, _cy, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      if (currentRule === 'first') {
        // 선착순: 이미 들어간 공이 winCount 자리 중 일부 차지 → 남은 자리만큼만 왕관
        const _crownsLeft = Math.max(0, winCount - pinballFinishedBalls.length);
        _indSorted.slice(0, Math.min(_crownsLeft, _indSorted.length)).forEach((ball, ri) => {
          const _fa = (ri === 0 && crownFlashTimer > 0)
            ? 0.5 + 0.5 * Math.abs(Math.sin(crownFlashTimer * 0.45)) : 1.0;
          _drawCrown(ball, _fa);
        });
      } else if (currentRule === 'last') {
        // 후착순: 꼴찌 winCount명에게 방패
        _indSorted.slice(Math.max(0, _indSorted.length - winCount)).forEach(ball => {
          _drawShield(ball, 1.0);
        });
      } else {
        // 특정순위: 완주자 수를 제외한 필드 내 순위로 과녁 위치 산출
        const _tgtIdx = specificRank - 1 - pinballFinishedBalls.length;
        if (_tgtIdx >= 0 && _tgtIdx < _indSorted.length) {
          _drawTarget(_indSorted[_tgtIdx], 1.0);
        }
      }
    }
  }

  // Near Miss 네온 스파크 업데이트 및 드로잉
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

  // 컨페티
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

  // VAR 판독 중일 때의 비주얼 이펙트 (반투명 오버레이, 레이저 스캔라인, 안내 텍스트)
  if (varChecking) {
    ctx.save();
    // 1. 청회색 반투명 오버레이
    ctx.fillStyle = 'rgba(8, 16, 32, 0.28)';
    ctx.fillRect(0, visY0, VW, CH);

    // 2. 오르내리는 레이저 스캔라인
    const scanY = visY0 + (Math.sin(Date.now() * 0.0035) * 0.5 + 0.5) * CH;
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff9900';
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(VW, scanY);
    ctx.stroke();

    // 3. 사진 판독중 안내 네온 텍스트
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

  // H. HUD
  const barX = GAME_X_OFFSET + GAME_VWIDTH + 10;
  const barH = window.innerHeight - 80;
  const barY = 40;
  
  // HUD 드로잉 영역 패널에 고정
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
  speedPadRotateTimer = 300; // 가속 패드 회전 주기 리셋
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

// ── 초기 시작 로드 및 리스너 연동 ──────────

window.addEventListener('DOMContentLoaded', () => {
  pinballCanvas = document.getElementById('pinball-canvas');
  if (pinballCanvas) {
    pinballCtx = pinballCanvas.getContext('2d');
    
    // 캔버스 실제 창 크기에 동적 매칭 (풀화면 반응형)
    const resizeCanvas = () => {
      pinballCanvas.width = window.innerWidth;
      pinballCanvas.height = window.innerHeight;
      // 패널 우측(410px) ~ 화면 끝 사이에서 게임 영역 중앙 정렬
      // 최소 415 보장 (패널 겹침 방지)
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

  const membersTA = document.getElementById('pinball-members');
  if (membersTA) {
    membersTA.value = DEFAULT_MEMBERS;
    membersTA.addEventListener('input', updateSpecificRankSelect);
  }

  const freezeToggle = document.getElementById('freeze-mode-toggle');
  if (freezeToggle) freezeToggle.addEventListener('change', e => { freezeModeEnabled = e.target.checked; });

  const btnShuffle = document.getElementById('btn-shuffle-members');
  if (btnShuffle) btnShuffle.addEventListener('click', shuffleMembers);

  const btnLaunch = document.getElementById('btn-pinball-launch');
  if (btnLaunch) btnLaunch.addEventListener('click', launchPinballRacing);

  const btnReset = document.getElementById('btn-pinball-reset');
  if (btnReset) btnReset.addEventListener('click', () => {
    resetPinball();
    // 리셋 후 애니메이션 루프 재시작 (stopPinball이 루프를 죽이므로 반드시 재구동)
    if (pinballAnimId === null) animatePinball();
  });

  const btnModalClose = document.getElementById('btn-modal-close');
  if (btnModalClose) {
    btnModalClose.addEventListener('click', () => {
      const modal = document.getElementById('pinball-result-modal');
      if (modal) modal.style.display = 'none';
    });
  }

  // 초기 기동
  updateSpecificRankSelect();
  initPinballMap();
  updatePreviewBalls();
  animatePinball();
});
