/**
 * =================================================================
 *   CHAOS-DROP — MAP: ZIGZAG CANYON
 * =================================================================
 * 협곡이 좌/우 교대로 좁혀지며, 고정 벽에서 창살이 주기적으로 튀어나옵니다.
 * 창살에 맞은 구슬은 해당 구간 상단으로 리스폰됩니다.
 * 떠다니는 실드/부스터 아이템을 먹으면 1회 창살 방어 또는 5초 가속됩니다.
 */

// ── 협곡 구조 상수 ────────────────────────────────────────
const ZC_NARROW = 210;
const ZC_WIDE   = GAME_VWIDTH - ZC_NARROW;  // 615

const ZC_SECTIONS = [
  { top: 600,  bot: 1080, narrowSide: 'left',  barSide: 'right', spawnY: 660  },
  { top: 1320, bot: 1800, narrowSide: 'right', barSide: 'left',  spawnY: 1380 },
  { top: 2020, bot: 2500, narrowSide: 'left',  barSide: 'right', spawnY: 2080 },
];

// ── 창살 파라미터 ─────────────────────────────────────────
const ZC_BARS_PER_SEC  = 3;
const ZC_BAR_Y_OFFSET  = 110;
const ZC_BAR_SPACING   = 135;
const ZC_BAR_MAX_LEN   = 220;
const ZC_BAR_SPEED     = 5;
const ZC_BAR_HOLD      = 85;
const ZC_BAR_PAUSE     = 70;
const ZC_BAR_H         = 15;
const ZC_BAR_SEC_OFF   = 72;
const ZC_BAR_STAGGER   = 18;

// ── 아이템 파라미터 ───────────────────────────────────────
const ZC_ITEM_R         = BALL_R + 3;   // 12px
const ZC_ITEM_SPEED     = 1.8;          // px/frame 가로 이동
const ZC_ITEM_RESPAWN   = 180;          // 3초 대기 후 재생성
const ZC_ITEM_ROT       = 0.028;        // 회전 속도 (rad/frame)
const ZC_SHIELD_FRAMES  = 600;          // 실드 지속 10초
const ZC_BOOSTER_FRAMES = 300;          // 부스터 지속 5초

// ── 런타임 상태 ──────────────────────────────────────────
let _zcBars  = [];
let _zcItems = [];
let _zcPulse = 0;

// ─────────────────────────────────────────────────────────
//  창살 로직
// ─────────────────────────────────────────────────────────
function _zcInitBars() {
  _zcBars = [];
  ZC_SECTIONS.forEach((sec, si) => {
    const wallX   = sec.barSide === 'right' ? GAME_VWIDTH : 0;
    const dirMult = sec.barSide === 'right' ? -1 : 1;
    for (let bi = 0; bi < ZC_BARS_PER_SEC; bi++) {
      _zcBars.push({
        y:          sec.top + ZC_BAR_Y_OFFSET + bi * ZC_BAR_SPACING,
        wallX, dirMult,
        currentLen: 0,
        phase:      'paused',
        timer:      si * ZC_BAR_SEC_OFF + bi * ZC_BAR_STAGGER,
        spawnY:     sec.spawnY,
      });
    }
  });
}

function _zcUpdateBars() {
  _zcBars.forEach(bar => {
    bar.timer++;
    if (bar.phase === 'paused') {
      if (bar.timer >= ZC_BAR_PAUSE) { bar.phase = 'extending'; bar.timer = 0; }
    } else if (bar.phase === 'extending') {
      bar.currentLen = Math.min(bar.currentLen + ZC_BAR_SPEED, ZC_BAR_MAX_LEN);
      if (bar.currentLen >= ZC_BAR_MAX_LEN) { bar.phase = 'holding'; bar.timer = 0; }
    } else if (bar.phase === 'holding') {
      if (bar.timer >= ZC_BAR_HOLD) { bar.phase = 'retracting'; bar.timer = 0; }
    } else {
      bar.currentLen = Math.max(bar.currentLen - ZC_BAR_SPEED, 0);
      if (bar.currentLen <= 0) { bar.phase = 'paused'; bar.timer = 0; }
    }
  });
}

// ─────────────────────────────────────────────────────────
//  아이템 로직
// ─────────────────────────────────────────────────────────
function _zcMakeItem(type) {
  const fromLeft = Math.random() < 0.5;
  return {
    x:     fromLeft ? -ZC_ITEM_R - 5 : GAME_VWIDTH + ZC_ITEM_R + 5,
    y:     60 + Math.random() * (FUNNEL_TOP_Y - 120),
    vx:    fromLeft ? ZC_ITEM_SPEED : -ZC_ITEM_SPEED,
    type,
    angle: Math.random() * Math.PI * 2,
    state: 'active',
    respawnTimer: 0,
  };
}

function _zcInitItems(count) {
  _zcItems = [];
  for (let i = 0; i < count; i++) {
    const type = i % 2 === 0 ? 'shield' : 'booster';
    const item = _zcMakeItem(type);
    // 첫 시작: 보드 안 랜덤 X에서 시작 (바로 보이도록)
    item.x = ZC_ITEM_R + 10 + Math.random() * (GAME_VWIDTH - ZC_ITEM_R * 2 - 20);
    _zcItems.push(item);
  }
}

function _zcUpdateItems() {
  _zcPulse += 0.055;
  _zcItems.forEach(item => {
    if (item.state === 'pending') {
      if (--item.respawnTimer <= 0) {
        const fresh = _zcMakeItem(item.type);
        Object.assign(item, fresh);
      }
      return;
    }
    item.x     += item.vx;
    item.angle += ZC_ITEM_ROT;
    // 화면 바깥으로 나가면 pending
    if (item.x < -ZC_ITEM_R - 25 || item.x > GAME_VWIDTH + ZC_ITEM_R + 25) {
      item.state = 'pending';
      item.respawnTimer = ZC_ITEM_RESPAWN;
    }
  });
}

function _zcCollectItem(ball, item) {
  item.state = 'pending';
  item.respawnTimer = ZC_ITEM_RESPAWN;
  spawnNearMissSparks(item.x, item.y, item.type === 'shield' ? '#00ccff' : '#ffaa00');

  if (item.type === 'shield') {
    ball._zcShieldTimer  = ZC_SHIELD_FRAMES;
    ball._zcShieldActive = true;
    pinballLog(`🛡 ${ball.name} 실드 획득! (10초)`);
  } else {
    if (!ball._zcBoosterActive) {
      // 최초 획득: 즉시 1.5배 속도
      ball._zcOrigFriction = ball.friction;
      ball.friction        = 0.9995;
      ball.vx *= 1.5;
      ball.vy *= 1.5;
      ball._zcBoosterActive = true;
    }
    // 중복 수집: 속도 재배율 없이 타이머만 갱신
    ball._zcBoosterTimer = ZC_BOOSTER_FRAMES;
    pinballLog(`⚡ ${ball.name} 부스터 ${ball._zcBoosterActive ? '갱신' : '획득'}! (5초)`);
  }
}

// ─────────────────────────────────────────────────────────
//  벽 프로파일
// ─────────────────────────────────────────────────────────
function zigzagCanyon_generateWallProfile() {
  wallProfile = [];
  wallProfile.push({ y: 0,                      lx: 0,         rx: GAME_VWIDTH });
  wallProfile.push({ y: 200,                    lx: 0,         rx: GAME_VWIDTH });
  wallProfile.push({ y: 450,                    lx: ZC_NARROW, rx: GAME_VWIDTH });
  wallProfile.push({ y: ZC_SECTIONS[0].top,     lx: ZC_NARROW, rx: GAME_VWIDTH });
  wallProfile.push({ y: ZC_SECTIONS[0].bot,     lx: ZC_NARROW, rx: GAME_VWIDTH });
  wallProfile.push({ y: ZC_SECTIONS[1].top,     lx: 0,         rx: ZC_WIDE     });
  wallProfile.push({ y: ZC_SECTIONS[1].bot,     lx: 0,         rx: ZC_WIDE     });
  wallProfile.push({ y: ZC_SECTIONS[2].top,     lx: ZC_NARROW, rx: GAME_VWIDTH });
  wallProfile.push({ y: ZC_SECTIONS[2].bot,     lx: ZC_NARROW, rx: GAME_VWIDTH });
  funnelLeftX  = ZC_NARROW;
  funnelRightX = GAME_VWIDTH;
  wallProfile.push({ y: FUNNEL_TOP_Y, lx: funnelLeftX,      rx: funnelRightX });
  wallProfile.push({ y: GOAL_Y,       lx: FUNNEL_BOTTOM_X,  rx: GAME_VWIDTH - FUNNEL_BOTTOM_X });
}

// ─────────────────────────────────────────────────────────
//  맵 훅 1: 창살 충돌 + 아이템 수집 + 타이머
// ─────────────────────────────────────────────────────────
function _zc_applyPhysics(ball) {
  if (ball.isFinished) return;

  // 부스터 타이머 tick
  if (ball._zcBoosterTimer > 0) {
    ball._zcBoosterTimer--;
    if (ball._zcBoosterTimer <= 0 && ball._zcBoosterActive) {
      ball._zcBoosterActive = false;
      ball.friction = ball._zcOrigFriction || BALL_FRICTION_BASE;
    }
  }

  // 실드 타이머 tick
  if (ball._zcShieldTimer > 0) {
    ball._zcShieldTimer--;
    if (ball._zcShieldTimer <= 0) ball._zcShieldActive = false;
  }

  // 아이템 수집 체크
  for (const item of _zcItems) {
    if (item.state !== 'active') continue;
    const dx = ball.x - item.x, dy = ball.y - item.y;
    if (dx * dx + dy * dy < (ball.r + ZC_ITEM_R) * (ball.r + ZC_ITEM_R)) {
      _zcCollectItem(ball, item);
      break;
    }
  }

  // 창살 무적 중이면 충돌 생략
  if (ball._zcImmune > 0) { ball._zcImmune--; return; }

  // 창살 충돌
  for (const bar of _zcBars) {
    if (bar.currentLen < 8) continue;
    if (Math.abs(ball.y - bar.y) > ball.r + ZC_BAR_H * 0.5 + 2) continue;

    const bx1 = bar.dirMult === -1 ? bar.wallX - bar.currentLen : bar.wallX;
    const bx2 = bar.dirMult === -1 ? bar.wallX : bar.wallX + bar.currentLen;
    const by1 = bar.y - ZC_BAR_H * 0.5;
    const by2 = bar.y + ZC_BAR_H * 0.5;

    const nearX = Math.max(bx1, Math.min(ball.x, bx2));
    const nearY = Math.max(by1, Math.min(ball.y, by2));
    const dx = ball.x - nearX, dy = ball.y - nearY;

    if (dx * dx + dy * dy < ball.r * ball.r) {
      if (ball._zcShieldActive) {
        // 실드 방어
        ball._zcShieldActive = false;
        ball._zcShieldTimer  = 0;
        ball._zcImmune       = 60;
        spawnNearMissSparks(ball.x, ball.y, '#00ccff');
        pinballLog(`🛡 ${ball.name} 실드 방어!`);
        return;
      }

      // 소멸 → 리스폰
      spawnNearMissSparks(ball.x, ball.y, '#ff3300');
      ball.x = GAME_VWIDTH * 0.5 + (Math.random() - 0.5) * 140;
      ball.y = bar.spawnY + (Math.random() - 0.5) * 20;
      ball.vx = (Math.random() - 0.5) * 2;
      ball.vy = 1.5;
      ball._zcImmune = 90;
      // 리스폰 시 부스터/실드 유지 (아이템 효과는 소멸 후에도 지속)
      spawnNearMissSparks(ball.x, ball.y, '#00ff99');
      pinballLog(`💀 ${ball.name} 창살 소멸 → 리스폰!`);
      return;
    }
  }
}

// ─────────────────────────────────────────────────────────
//  맵 훅 2: 창살·아이템·상태링 렌더링
// ─────────────────────────────────────────────────────────
function _zc_drawLayer(ctx, visY0, visY1) {
  // 구간 배경 틴트 (좁아지는 위험 쪽)
  ZC_SECTIONS.forEach(sec => {
    if (visY1 < sec.top || visY0 > sec.bot) return;
    ctx.save();
    const dangerX = sec.narrowSide === 'left' ? 0 : ZC_WIDE;
    ctx.fillStyle = 'rgba(255, 80, 30, 0.045)';
    ctx.fillRect(dangerX, sec.top, ZC_NARROW, sec.bot - sec.top);
    ctx.restore();
  });

  // 리스폰 존 점선
  ZC_SECTIONS.forEach(sec => {
    if (visY1 < sec.spawnY - 6 || visY0 > sec.spawnY + 6) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 140, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 7]);
    ctx.shadowBlur = 7;
    ctx.shadowColor = '#00ff8c';
    ctx.beginPath();
    ctx.moveTo(0, sec.spawnY);
    ctx.lineTo(GAME_VWIDTH, sec.spawnY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  // 창살 렌더링
  _zcBars.forEach(bar => {
    if (bar.currentLen < 1) return;
    if (bar.y < visY0 - 30 || bar.y > visY1 + 30) return;
    const x1      = bar.dirMult === -1 ? bar.wallX - bar.currentLen : bar.wallX;
    const x2      = bar.dirMult === -1 ? bar.wallX : bar.wallX + bar.currentLen;
    const danger  = bar.currentLen / ZC_BAR_MAX_LEN;
    const gVal    = Math.floor(180 * (1 - danger * 0.9));
    ctx.save();
    ctx.fillStyle  = `rgb(255,${gVal},30)`;
    ctx.shadowBlur = 8 + danger * 10;
    ctx.shadowColor = '#ff4400';
    ctx.fillRect(x1, bar.y - ZC_BAR_H * 0.5, x2 - x1, ZC_BAR_H);
    // 끝 포인트
    const tipX = bar.dirMult === -1 ? x1 : x2;
    const tipD = bar.dirMult === -1 ? -1 : 1;
    ctx.fillStyle = '#ff6600';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(tipX,             bar.y - ZC_BAR_H * 0.5);
    ctx.lineTo(tipX + tipD * 12, bar.y);
    ctx.lineTo(tipX,             bar.y + ZC_BAR_H * 0.5);
    ctx.fill();
    ctx.restore();
  });

  // 아이템 렌더링
  const glow = 0.55 + 0.45 * Math.cos(_zcPulse);
  _zcItems.forEach(item => {
    if (item.state !== 'active') return;
    if (item.y < visY0 - ZC_ITEM_R * 2 || item.y > visY1 + ZC_ITEM_R * 2) return;
    const isShield = item.type === 'shield';
    const col  = isShield ? '#00ccff' : '#ffaa00';
    const gcol = isShield ? '#0088ff' : '#ff6600';

    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    ctx.shadowBlur  = 8 + glow * 9;
    ctx.shadowColor = gcol;

    // 외곽 원
    ctx.strokeStyle = col;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, ZC_ITEM_R, 0, Math.PI * 2);
    ctx.stroke();

    // 내부 심볼
    ctx.fillStyle = col;
    if (isShield) {
      // 방패 모양 (간단한 pentagon)
      const r = ZC_ITEM_R * 0.52;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo( r * 0.75, -r * 0.4);
      ctx.lineTo( r * 0.75,  r * 0.3);
      ctx.lineTo(0,           r);
      ctx.lineTo(-r * 0.75,  r * 0.3);
      ctx.lineTo(-r * 0.75, -r * 0.4);
      ctx.closePath();
      ctx.fill();
    } else {
      // 번개 모양
      const s = ZC_ITEM_R * 0.42;
      ctx.beginPath();
      ctx.moveTo( s * 0.3, -s);
      ctx.lineTo(-s * 0.1,  0);
      ctx.lineTo( s * 0.4,  0);
      ctx.lineTo(-s * 0.3,  s);
      ctx.lineTo( s * 0.1,  0);
      ctx.lineTo(-s * 0.4,  0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });

  // 실드/부스터 상태링 (공 주변 글로우, balls 레이어 직전에 미리 그림)
  pinballBalls.forEach(ball => {
    if (ball.isFinished) return;
    if (ball.y < visY0 - 30 || ball.y > visY1 + 30) return;
    let ringOffset = 0;
    if (ball._zcShieldActive) {
      ctx.save();
      ctx.strokeStyle = `rgba(0,200,255,${0.55 + glow * 0.35})`;
      ctx.lineWidth   = 2.5;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#00ccff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ringOffset = 5;
    }
    if (ball._zcBoosterActive) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,170,0,${0.55 + glow * 0.35})`;
      ctx.lineWidth   = 2.5;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#ffaa00';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r + 5 + ringOffset, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });
}

// ─────────────────────────────────────────────────────────
//  맵 훅 3: 창살·아이템 매 프레임 업데이트
// ─────────────────────────────────────────────────────────
function _zc_recoverTunnel() {
  _zcUpdateBars();
  _zcUpdateItems();
}

// ─────────────────────────────────────────────────────────
//  맵 초기화
// ─────────────────────────────────────────────────────────
function zigzagCanyon_init() {
  zigzagCanyon_generateWallProfile();
  _zcInitBars();

  pinballPegs       = [];
  pinballSpinners   = [];
  pinballBumpers    = [];
  pinballPortals    = [];
  pinballVortexes   = [];
  pinballLaunchPads = [];
  pinballSpeedPads  = [];

  pinballAccelLane = 0;

  // 창살 Y 집합 (해당 행 핀 생략)
  const barYSet = new Set(_zcBars.map(b => Math.round(b.y)));

  // 핀 격자 배치
  for (let y = 150; y < FUNNEL_TOP_Y - 80; y += 88) {
    let skip = false;
    for (const by of barYSet) { if (Math.abs(y - by) < 32) { skip = true; break; } }
    if (skip) continue;
    const wall = getWallAtY(y);
    const lx = wall.lx + 28, rx = wall.rx - 28;
    if (rx - lx < 80) continue;
    const rowIndex = Math.round(y / 88);
    const offset   = rowIndex % 2 === 0 ? 0 : 44;
    const cols     = Math.floor((rx - lx - offset) / 82);
    for (let c = 0; c < cols; c++) {
      const x = lx + offset + c * 82 + 18;
      if (x < lx || x > rx) continue;
      pinballPegs.push(new Peg(x, y, 5));
    }
  }

  // 범퍼: 구간 전환 지점
  const midX = GAME_VWIDTH * 0.5;
  [
    { x: midX - 130, y: ZC_SECTIONS[0].top - 100 },
    { x: midX,       y: ZC_SECTIONS[0].top - 100 },
    { x: midX + 130, y: ZC_SECTIONS[0].top - 100 },
    { x: midX - 100, y: (ZC_SECTIONS[0].bot + ZC_SECTIONS[1].top) / 2 },
    { x: midX + 100, y: (ZC_SECTIONS[0].bot + ZC_SECTIONS[1].top) / 2 },
    { x: midX - 100, y: (ZC_SECTIONS[1].bot + ZC_SECTIONS[2].top) / 2 },
    { x: midX + 100, y: (ZC_SECTIONS[1].bot + ZC_SECTIONS[2].top) / 2 },
  ].forEach(({ x, y }, i) => {
    const colors = ['#ff9900', '#ff3399', '#00ccff', '#ff6600', '#aa00ff', '#ff9900', '#00ccff'];
    pinballBumpers.push(new SuperBumper(x, y, 18, colors[i % colors.length]));
  });

  // 와류: 좁아지는 쪽 중앙 (위험 레인 진입 패널티)
  ZC_SECTIONS.forEach(sec => {
    const narrowCX = sec.narrowSide === 'left'
      ? ZC_NARROW / 2
      : (ZC_WIDE + GAME_VWIDTH) / 2;
    pinballVortexes.push(new SlowVortex(narrowCX, (sec.top + sec.bot) / 2, 32, '#0088ff'));
  });

  // 스피드 패드: 구간 사이 개방 구역 (아래로 가속)
  [
    { x: midX, y: ZC_SECTIONS[0].top - 260 },
    { x: midX, y: (ZC_SECTIONS[0].bot + ZC_SECTIONS[1].top) / 2 - 60 },
    { x: midX, y: (ZC_SECTIONS[1].bot + ZC_SECTIONS[2].top) / 2 - 60 },
  ].forEach(({ x, y }) => {
    pinballSpeedPads.push(new SpeedPad(x, y, 130, 14, 'down'));
  });

  // 10% 핀 랜덤 제거
  pinballPegs = pinballPegs.filter(() => Math.random() > 0.10);

  // 아이템 초기화: 인원수만큼
  _zcInitItems(Math.max(pinballBalls.length, 2));
}

// ── 맵 레지스트리 등록 ────────────────────────────────────
MAPS['zigzag-canyon'] = {
  label:         '🏜 Zigzag Canyon',
  init:          zigzagCanyon_init,
  applyPhysics:  _zc_applyPhysics,
  drawLayer:     _zc_drawLayer,
  recoverTunnel: _zc_recoverTunnel,
};
