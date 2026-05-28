/**
 * =================================================================
 *   CHAOS-DROP — MAP: ZIGZAG CANYON
 * =================================================================
 * 협곡이 좌/우 교대로 좁혀지며, 좁혀지지 않는 고정 벽에서
 * 창살이 주기적으로 튀어나옵니다.
 * 창살에 맞은 구슬은 해당 구간 상단으로 리스폰됩니다.
 *
 *   applyMapZonePhysics(ball)           ← ball.js 에서 호출
 *   drawCurrentMapLayer(ctx, v0, v1)    ← game.js animatePinball 에서 호출
 *   recoverCurrentMapIslandTunnel()     ← game.js animatePinball 에서 호출
 *   zigzagCanyon_init()                 ← game.js initPinballMap() 브리지에서 호출
 */

// ── 협곡 구조 상수 ────────────────────────────────────────
const ZC_NARROW = 210;                 // 좁혀지는 쪽 벽의 내측 X
const ZC_WIDE   = GAME_VWIDTH - ZC_NARROW;  // 605 — 반대쪽

// 각 협곡 구간 정의
// narrowSide: 좁아지는 벽  /  barSide: 창살이 튀어나오는 고정 벽
const ZC_SECTIONS = [
  { top: 600,  bot: 1080, narrowSide: 'left',  barSide: 'right', spawnY: 660  },
  { top: 1320, bot: 1800, narrowSide: 'right', barSide: 'left',  spawnY: 1380 },
  { top: 2020, bot: 2500, narrowSide: 'left',  barSide: 'right', spawnY: 2080 },
];

// ── 창살 파라미터 ─────────────────────────────────────────
const ZC_BARS_PER_SEC   = 3;    // 구간당 창살 개수
const ZC_BAR_Y_OFFSET   = 110;  // 구간 top으로부터 첫 창살까지
const ZC_BAR_SPACING    = 135;  // 창살 간 Y 간격
const ZC_BAR_MAX_LEN    = 220;  // 최대 돌출 길이 (px) — 좁혀진 공간의 ~36%
const ZC_BAR_SPEED      = 5;    // 돌출/수납 속도 (px/frame)
const ZC_BAR_HOLD       = 85;   // 최대 돌출 유지 프레임 (~1.4초)
const ZC_BAR_PAUSE      = 70;   // 수납 후 대기 프레임 (~1.2초)
const ZC_BAR_H          = 15;   // 창살 두께 (px)
const ZC_BAR_SEC_OFFSET = 72;   // 섹션 간 위상 차이 (구간들이 동시에 열리지 않도록)
const ZC_BAR_STAGGER    = 18;   // 같은 구간 창살 간 순차 지연

// ── 런타임 창살 상태 ──────────────────────────────────────
let _zcBars = [];

function _zcInitBars() {
  _zcBars = [];
  ZC_SECTIONS.forEach((sec, si) => {
    const wallX   = sec.barSide === 'right' ? GAME_VWIDTH : 0;
    const dirMult = sec.barSide === 'right' ? -1 : 1;  // right→왼쪽, left→오른쪽

    for (let bi = 0; bi < ZC_BARS_PER_SEC; bi++) {
      _zcBars.push({
        y:          sec.top + ZC_BAR_Y_OFFSET + bi * ZC_BAR_SPACING,
        wallX,
        dirMult,
        currentLen: 0,
        phase:      'paused',
        timer:      si * ZC_BAR_SEC_OFFSET + bi * ZC_BAR_STAGGER,
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
    } else { // retracting
      bar.currentLen = Math.max(bar.currentLen - ZC_BAR_SPEED, 0);
      if (bar.currentLen <= 0) { bar.phase = 'paused'; bar.timer = 0; }
    }
  });
}

// ── 벽 프로파일 ──────────────────────────────────────────
function zigzagCanyon_generateWallProfile() {
  wallProfile = [];

  // 입구: 전체 너비
  wallProfile.push({ y: 0,   lx: 0,         rx: GAME_VWIDTH });
  wallProfile.push({ y: 200, lx: 0,         rx: GAME_VWIDTH });

  // 구간 1 전환: 전체 → 왼쪽 좁힘
  wallProfile.push({ y: 450,                  lx: ZC_NARROW,    rx: GAME_VWIDTH });
  wallProfile.push({ y: ZC_SECTIONS[0].top,   lx: ZC_NARROW,    rx: GAME_VWIDTH });
  wallProfile.push({ y: ZC_SECTIONS[0].bot,   lx: ZC_NARROW,    rx: GAME_VWIDTH });

  // 구간 2: 오른쪽 좁힘 (창살 ← 왼쪽 고정 벽)
  wallProfile.push({ y: ZC_SECTIONS[1].top,   lx: 0,            rx: ZC_WIDE     });
  wallProfile.push({ y: ZC_SECTIONS[1].bot,   lx: 0,            rx: ZC_WIDE     });

  // 구간 3: 왼쪽 좁힘 (창살 ← 오른쪽 고정 벽)
  wallProfile.push({ y: ZC_SECTIONS[2].top,   lx: ZC_NARROW,    rx: GAME_VWIDTH });
  wallProfile.push({ y: ZC_SECTIONS[2].bot,   lx: ZC_NARROW,    rx: GAME_VWIDTH });

  // 깔때기
  funnelLeftX  = ZC_NARROW;
  funnelRightX = GAME_VWIDTH;
  wallProfile.push({ y: FUNNEL_TOP_Y, lx: funnelLeftX,      rx: funnelRightX });
  wallProfile.push({ y: GOAL_Y,       lx: FUNNEL_BOTTOM_X,  rx: GAME_VWIDTH - FUNNEL_BOTTOM_X });
}

// ── 맵 훅 1: 창살 충돌 + 리스폰 ──────────────────────────
function applyMapZonePhysics(ball) {
  if (ball.isFinished) return;
  if (ball._zcImmune > 0) { ball._zcImmune--; return; }

  for (const bar of _zcBars) {
    if (bar.currentLen < 8) continue;
    if (Math.abs(ball.y - bar.y) > ball.r + ZC_BAR_H * 0.5 + 2) continue;

    // 창살 AABB
    const bx1 = bar.dirMult === -1 ? bar.wallX - bar.currentLen : bar.wallX;
    const bx2 = bar.dirMult === -1 ? bar.wallX : bar.wallX + bar.currentLen;
    const by1 = bar.y - ZC_BAR_H * 0.5;
    const by2 = bar.y + ZC_BAR_H * 0.5;

    // 원-직사각형 최근접점 충돌
    const nearX = Math.max(bx1, Math.min(ball.x, bx2));
    const nearY = Math.max(by1, Math.min(ball.y, by2));
    const dx = ball.x - nearX, dy = ball.y - nearY;
    if (dx * dx + dy * dy < ball.r * ball.r) {
      // 소멸 이펙트
      spawnNearMissSparks(ball.x, ball.y, '#ff3300');

      // 리스폰
      const respawnX = GAME_VWIDTH * 0.5 + (Math.random() - 0.5) * 140;
      ball.x = respawnX;
      ball.y = bar.spawnY + (Math.random() - 0.5) * 20;
      ball.vx = (Math.random() - 0.5) * 2;
      ball.vy = 1.5;
      ball._zcImmune = 90;  // 90프레임 무적 (~1.5초)

      // 리스폰 이펙트
      spawnNearMissSparks(ball.x, ball.y, '#00ff99');
      pinballLog(`💀 ${ball.name} 창살 소멸 → 리스폰!`);
      return;
    }
  }
}

// ── 맵 훅 2: 창살/구간 렌더링 ────────────────────────────
function drawCurrentMapLayer(ctx, visY0, visY1) {
  // 구간 배경 틴트 (좁아지는 쪽 = 위험 표시)
  ZC_SECTIONS.forEach(sec => {
    if (visY1 < sec.top || visY0 > sec.bot) return;
    ctx.save();
    const dangerX = sec.narrowSide === 'left' ? 0 : ZC_WIDE;
    const dangerW = ZC_NARROW;
    ctx.fillStyle = 'rgba(255, 80, 30, 0.045)';
    ctx.fillRect(dangerX, sec.top, dangerW, sec.bot - sec.top);
    ctx.restore();
  });

  // 리스폰 존 표시선
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

    const x1 = bar.dirMult === -1 ? bar.wallX - bar.currentLen : bar.wallX;
    const x2 = bar.dirMult === -1 ? bar.wallX : bar.wallX + bar.currentLen;
    const danger = bar.currentLen / ZC_BAR_MAX_LEN;
    const gVal = Math.floor(180 * (1 - danger * 0.9));
    const barColor = `rgb(255, ${gVal}, 30)`;

    ctx.save();

    // 창살 본체
    ctx.fillStyle = barColor;
    ctx.shadowBlur = 8 + danger * 10;
    ctx.shadowColor = '#ff4400';
    ctx.fillRect(x1, bar.y - ZC_BAR_H * 0.5, x2 - x1, ZC_BAR_H);

    // 창살 끝 삼각형 포인트
    const tipX = bar.dirMult === -1 ? x1 : x2;
    const tipD = bar.dirMult;  // -1 or +1
    ctx.fillStyle = '#ff6600';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(tipX,               bar.y - ZC_BAR_H * 0.5);
    ctx.lineTo(tipX + tipD * (-12), bar.y);
    ctx.lineTo(tipX,               bar.y + ZC_BAR_H * 0.5);
    ctx.fill();

    ctx.restore();
  });
}

// ── 맵 훅 3: 창살 애니메이션 (매 프레임) ─────────────────
function recoverCurrentMapIslandTunnel() {
  _zcUpdateBars();
}

// ── 맵 초기화 ────────────────────────────────────────────
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

  // 창살 Y 집합 (핀 배치 시 해당 행 건너뜀)
  const barYSet = new Set(_zcBars.map(b => Math.round(b.y)));

  // ── 핀 격자 배치 ────────────────────────────────────────
  for (let y = 150; y < FUNNEL_TOP_Y - 80; y += 88) {
    let skip = false;
    for (const by of barYSet) { if (Math.abs(y - by) < 32) { skip = true; break; } }
    if (skip) continue;

    const wall = getWallAtY(y);
    const lx = wall.lx + 28;
    const rx = wall.rx - 28;
    if (rx - lx < 80) continue;

    const rowIndex = Math.round(y / 88);
    const offset = rowIndex % 2 === 0 ? 0 : 44;
    const cols = Math.floor((rx - lx - offset) / 82);
    for (let c = 0; c < cols; c++) {
      const x = lx + offset + c * 82 + 18;
      if (x < lx || x > rx) continue;
      pinballPegs.push(new Peg(x, y, 5));
    }
  }

  // ── 범퍼: 구간 전환 지점 (좁혀지지 않는 넓은 쪽 가운데) ─
  const midX = GAME_VWIDTH * 0.5;
  [
    // 구간 1 진입 전
    { x: midX - 130, y: ZC_SECTIONS[0].top - 100 },
    { x: midX,       y: ZC_SECTIONS[0].top - 100 },
    { x: midX + 130, y: ZC_SECTIONS[0].top - 100 },
    // 구간 1→2 사이 개방 구역
    { x: midX - 100, y: (ZC_SECTIONS[0].bot + ZC_SECTIONS[1].top) / 2 },
    { x: midX + 100, y: (ZC_SECTIONS[0].bot + ZC_SECTIONS[1].top) / 2 },
    // 구간 2→3 사이 개방 구역
    { x: midX - 100, y: (ZC_SECTIONS[1].bot + ZC_SECTIONS[2].top) / 2 },
    { x: midX + 100, y: (ZC_SECTIONS[1].bot + ZC_SECTIONS[2].top) / 2 },
  ].forEach(({ x, y }, i) => {
    const colors = ['#ff9900', '#ff3399', '#00ccff', '#ff6600', '#aa00ff', '#ff9900', '#00ccff'];
    pinballBumpers.push(new SuperBumper(x, y, 18, colors[i % colors.length]));
  });

  // ── 와류: 좁아지는 쪽(위험 레인)에 배치 — 양쪽 다 위험하게 ─
  ZC_SECTIONS.forEach(sec => {
    const narrowCX = sec.narrowSide === 'left'
      ? ZC_NARROW / 2
      : (ZC_WIDE + GAME_VWIDTH) / 2;
    const midY = (sec.top + sec.bot) / 2;
    pinballVortexes.push(new SlowVortex(narrowCX, midY, 32, '#0088ff'));
  });

  // ── 스피드 패드: 구간 사이 개방 구역에서 아래로 가속 ─────
  [
    { x: midX, y: ZC_SECTIONS[0].top - 260 },
    { x: midX, y: (ZC_SECTIONS[0].bot + ZC_SECTIONS[1].top) / 2 - 60 },
    { x: midX, y: (ZC_SECTIONS[1].bot + ZC_SECTIONS[2].top) / 2 - 60 },
  ].forEach(({ x, y }) => {
    pinballSpeedPads.push(new SpeedPad(x, y, 130, 14, 'down'));
  });

  // 10% 핀 랜덤 제거
  pinballPegs = pinballPegs.filter(() => Math.random() > 0.10);
}
