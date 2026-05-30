/**
 * =================================================================
 *   CHAOS-DROP — MAP: ZIGZAG CANYON (SURVIVAL CHAOS)
 * =================================================================
 * 동적 움직이는 협곡 벽, 창살 함정, 실드/부스터 아이템 등
 * 생존과 리스크 중심의 고난도 카오스 맵입니다.
 */

const ZC_SECTIONS = [
  { top: 600,  bot: 1080, narrowSide: 'left',  barSide: 'right', spawnY: 660  },
  { top: 1320, bot: 1800, narrowSide: 'right', barSide: 'left',  spawnY: 1380 },
  { top: 2020, bot: 2500, narrowSide: 'left',  barSide: 'right', spawnY: 2080 },
];

const ZC_BARS_PER_SEC = 3;
const ZC_BAR_Y_OFFSET = 110;
const ZC_BAR_SPACING = 135;
const ZC_BAR_SEC_OFF = 72;
const ZC_BAR_STAGGER = 18;

// ── 벽 프로파일 ──────────────────────────────────────────────
function zigzagCanyon_generateWallProfile() {
  wallProfile = [];
  wallProfile.push({ y: 0, lx: 0, rx: GAME_VWIDTH });
  
  for (let y = 50; y <= FUNNEL_TOP_Y; y += 25) {
    wallProfile.push({ y, lx: 0, rx: GAME_VWIDTH });
  }

  funnelLeftX = Math.round(210 * BOARD_XSCALE);
  funnelRightX = GAME_VWIDTH;
  wallProfile.push({ y: GOAL_Y, lx: FUNNEL_BOTTOM_X, rx: GAME_VWIDTH - FUNNEL_BOTTOM_X });
}

// ── 맵 초기화 ────────────────────────────────────────────────
function zigzagCanyon_init() {
  zigzagCanyon_generateWallProfile();

  pinballPegs       = [];
  pinballSpinners   = [];
  pinballBumpers    = [];
  pinballPortals    = [];
  pinballVortexes   = [];
  pinballLaunchPads = [];
  pinballSpeedPads  = [];
  pinballSpikeTraps = [];
  pinballItems      = [];

  pinballAccelLane = 0;

  // 초기에 한 번 벽을 모핑해두어 기믹 생성 위치 확보
  _zc_recoverTunnel(true);

  // 창살 생성
  ZC_SECTIONS.forEach((sec, si) => {
    const wallX = sec.barSide === 'right' ? GAME_VWIDTH : 0;
    const dirMult = sec.barSide === 'right' ? -1 : 1;
    for (let bi = 0; bi < ZC_BARS_PER_SEC; bi++) {
      const y = sec.top + ZC_BAR_Y_OFFSET + bi * ZC_BAR_SPACING;
      const timerOffset = si * ZC_BAR_SEC_OFF + bi * ZC_BAR_STAGGER;
      pinballSpikeTraps.push(new SpikeTrap(y, wallX, dirMult, sec.spawnY, timerOffset));
    }
  });

  // 창살 위치 피해서 핀 생성
  const barYSet = new Set(pinballSpikeTraps.map(b => Math.round(b.y)));
  for (let y = 150; y < FUNNEL_TOP_Y - 80; y += 88) {
    let skip = false;
    for (const by of barYSet) { if (Math.abs(y - by) < 32) { skip = true; break; } }
    if (skip) continue;
    
    const wBounds = getWallAtY(y);
    let lx = wBounds.lx + 28, rx = wBounds.rx - 28;
    
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



  pinballPegs = pinballPegs.filter(() => Math.random() > 0.10);

  // 아이템 생성
  const itemCount = Math.max(pinballBalls.length, 2);
  for (let i = 0; i < itemCount; i++) {
    const type = i % 2 === 0 ? 'shield' : 'booster';
    const fromLeft = Math.random() < 0.5;
    const item = type === 'shield' ? new ShieldItem(0, 0, 1.8) : new BoosterItem(0, 0, 1.8);
    item.vx = fromLeft ? 1.8 : -1.8;
    item.x = 20 + Math.random() * (GAME_VWIDTH - 40);
    item.y = 60 + Math.random() * (FUNNEL_TOP_Y - 120);
    pinballItems.push(item);
  }
}

// ── 맵 훅: 동적 벽면 물리 ────────────────────────────────────
function _zc_applyPhysics(ball) {
  // 엔진 코어의 wallProfile 기준 충돌로 완벽히 대체되므로 여기선 훅 비움
}

// ── 맵 훅: 동적 벽면 모핑 ────────────────────────────────────
function _zc_recoverTunnel(isInit = false) {
  const time = isInit ? 0 : performance.now() * 0.0015;
  const W = GAME_VWIDTH;
  const xs = v => v * BOARD_XSCALE;

  for (let i = 0; i < wallProfile.length; i++) {
    const wp = wallProfile[i];
    if (wp.y < 50 || wp.y > FUNNEL_TOP_Y) continue;

    // 하단부로 갈수록 좁아지고 진폭이 커지는 급류 효과
    const depthT = Math.min(1, Math.max(0, (wp.y - 1400) / 1200)); // 1400부터 2600까지 0 -> 1
    const easeDepth = depthT * depthT; // 하단부에서 급격히 변함
    
    // 폭은 210에서 극한으로 좁은 55(총 폭 110)까지 좁아짐
    const currentHalfWidth = xs(210) * (1 - easeDepth) + xs(55) * easeDepth;
    
    // 기본 완만한 S자 커브
    let sCurve = Math.sin(wp.y * 0.0035) * xs(120);
    
    // 하단부 급류 구간 전용 고주파 S자 커브(급격한 꺾임) 추가
    sCurve += Math.sin(wp.y * 0.016) * xs(200) * easeDepth;

    const bumpL = Math.sin(wp.y * 0.06) * 16 + Math.cos(wp.y * 0.11) * 11;
    const bumpR = Math.cos(wp.y * 0.05) * 16 + Math.sin(wp.y * 0.13) * 11;
    
    let dynamicL = 0;
    let dynamicR = 0;
    
    for (const sec of ZC_SECTIONS) {
      if (wp.y >= sec.top && wp.y <= sec.bot) {
        const falloff = Math.min(1, Math.min(wp.y - sec.top, sec.bot - wp.y) / 100);
        const cycle = (Math.sin(time + sec.top * 0.01) + 1) * 0.5;
        // 동적 압착은 현재 협곡 폭(currentHalfWidth)의 1.3배(65%)까지만 밀어냄
        const maxNarrow = currentHalfWidth * 1.3;
        const push = cycle * maxNarrow * falloff;
        if (sec.narrowSide === 'left') dynamicL = push;
        else dynamicR = push;
      }
    }
    
    const canyonCenter = W / 2 + sCurve;
    
    let targetLx = Math.max(0, canyonCenter - currentHalfWidth + bumpL + dynamicL);
    let targetRx = Math.min(W, canyonCenter + currentHalfWidth + bumpR - dynamicR);

    // 상단 입구 깔때기 (y: 50 ~ 300)
    if (wp.y < 300) {
      const entranceFunnel = Math.max(0, (300 - wp.y) / 250);
      const ease = entranceFunnel * entranceFunnel;
      targetLx = targetLx * (1 - ease) + 0 * ease;
      targetRx = targetRx * (1 - ease) + W * ease;
    }

    wp.lx = targetLx;
    wp.rx = targetRx;
    
    // 맵 끝단(FUNNEL_TOP_Y) 도달 시, 메인 엔진의 깔때기(funnel) 시작 좌표 동기화
    if (wp.y >= FUNNEL_TOP_Y - 5) {
      funnelLeftX = wp.lx;
      funnelRightX = wp.rx;
    }
  }
}

// ── 맵 훅: 상태 렌더링 ────────────────────────────────────
function _zc_drawLayer(ctx, visY0, visY1) {
  ZC_SECTIONS.forEach(sec => {
    if (visY1 < sec.top || visY0 > sec.bot) return;

    // 리스폰 존 가이드선
    if (visY1 >= sec.spawnY - 6 && visY0 <= sec.spawnY + 6) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 140, 0.45)';
      ctx.setLineDash([10, 7]);
      ctx.shadowBlur = 7;
      ctx.shadowColor = '#00ff8c';
      ctx.beginPath();
      ctx.moveTo(0, sec.spawnY);
      ctx.lineTo(GAME_VWIDTH, sec.spawnY);
      ctx.stroke();
      ctx.restore();
    }
  });

  // 실드/부스터 상태링 렌더링
  const glow = 0.55 + 0.45 * Math.cos(performance.now() * 0.005);
  pinballBalls.forEach(ball => {
    if (ball.isFinished) return;
    if (ball.y < visY0 - 30 || ball.y > visY1 + 30) return;
    let ringOffset = 0;
    if (ball.shieldActive) {
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
    if (ball.boosterActive) {
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

// ── 맵 레지스트리 등록 ────────────────────────────────────
MAPS['zigzag-canyon'] = {
  label:         '🏜 Zigzag Canyon',
  init:          zigzagCanyon_init,
  applyPhysics:  _zc_applyPhysics,
  drawLayer:     _zc_drawLayer,
  recoverTunnel: _zc_recoverTunnel,
  theme: {
    uiClass:      'theme-zigzag',
    bgClear:      '#180a04',
    bgFrom:       '#2a1208',
    bgTo:         '#0e0603',
    wallFill:     '#1c0e06',
    wallStroke:   'rgba(166,94,59,0.55)',
    wallGlow:     '#A65E3B',
    funnelStroke: 'rgba(140,75,47,0.55)',
    funnelColor:  '#8C4B2F',
    goalFill:     'rgba(199,134,90,0.10)',
    goalStroke:   '#C7865A',
    scanLine:     '#C7865A',
  },
};
