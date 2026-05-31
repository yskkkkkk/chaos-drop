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

const ZC_FLUSH_SECTIONS = [
  { top: 2160, bot: 2400, baseTimer: 300, currentTimer: Math.random() * 300, activeTime: 0, jitter: 0 },
  { top: 2400, bot: 2640, baseTimer: 270, currentTimer: Math.random() * 270, activeTime: 0, jitter: 0 },
  { top: 2640, bot: 2880, baseTimer: 240, currentTimer: Math.random() * 240, activeTime: 0, jitter: 0 },
  { top: 2880, bot: 3120, baseTimer: 210, currentTimer: Math.random() * 210, activeTime: 0, jitter: 0 },
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
  
  for (let y = 50; y <= GOAL_Y; y += 25) {
    wallProfile.push({ y, lx: 0, rx: GAME_VWIDTH });
  }
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
  if (ball.shieldActive || !gimmickEnabled) return; // 무적이거나 기믹이 꺼져있으면 역류 무시

  ZC_FLUSH_SECTIONS.forEach(sec => {
    if (sec.activeTime > 0 && ball.y >= sec.top && ball.y <= sec.bot) {
      ball.vy -= 0.65; // 위쪽으로 강한 역류 힘
      if (ball.vy < -6) ball.vy = -6; // 최고 상승 속도 제한
      
      const wBounds = getWallAtY(ball.y);
      const cx = (wBounds.lx + wBounds.rx) / 2;
      ball.vx += (cx - ball.x) * 0.01; // 역류 시 벽에 끼지 않도록 중앙으로 밀어줌
      
      if (Math.random() < 0.1) spawnNearMissSparks(ball.x, ball.y, '#00c8ff');
    }
  });
}

// ── 맵 훅: 동적 벽면 모핑 ────────────────────────────────────
function _zc_recoverTunnel(isInit = false) {
  const time = isInit ? 0 : performance.now() * 0.0015;
  const W = GAME_VWIDTH;
  const xs = v => v * BOARD_XSCALE;

  for (let i = 0; i < wallProfile.length; i++) {
    const wp = wallProfile[i];
    if (wp.y < 50) continue;

    // 하단부로 갈수록 좁아지고 진폭이 커지는 급류 효과
    const depthT = Math.min(1, Math.max(0, (wp.y - 1200) / 960)); // 1200부터 2160까지 0 -> 1
    const easeDepth = depthT * depthT; // 하단부에서 급격히 변함
    
    // 폭은 210에서 극한으로 좁은 55(총 폭 110)까지 좁아짐
    let currentHalfWidth = xs(210) * (1 - easeDepth) + xs(55) * easeDepth;
    
    // 기본 완만한 S자 커브
    let sCurve = Math.sin(wp.y * 0.0035) * xs(120);
    
    // 하단부 4구간(240px 단위)에 완벽하게 일치하는 고주파 S자 커브 추가
    // (wp.y = 3120, 2880, 2640, 2400, 2160에서 정확히 중앙을 교차함)
    sCurve += Math.sin((3120 - wp.y) * (Math.PI / 240)) * xs(200) * easeDepth;

    // 골인 지점(GOAL_Y) 부근에서 중앙으로 부드럽게 정렬시켜 결승선과 맞춤
    if (wp.y > GOAL_Y - 250) {
      const alignT = Math.min(1, Math.max(0, (wp.y - (GOAL_Y - 250)) / 250));
      sCurve *= (1 - alignT);
      const goalHalfWidth = (W / 2) - FUNNEL_BOTTOM_X;
      currentHalfWidth = currentHalfWidth * (1 - alignT) + goalHalfWidth * alignT;
    }

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
    
    // 맵 끝단 깔때기 직선 보이지 않게 치움
    if (wp.y >= FUNNEL_TOP_Y - 5) {
      funnelLeftX = -999;
      funnelRightX = 9999;
    }
  }
}

// ── 맵 훅: 상태 렌더링 ────────────────────────────────────
function _zc_drawLayer(ctx, visY0, visY1) {
  // 게임 시작 전(미리보기 모드)에도 역류 이펙트가 작동하도록 렌더링 루프에서 타이머 갱신
  ZC_FLUSH_SECTIONS.forEach(sec => {
    if (sec.activeTime > 0) sec.activeTime--;
    else {
      sec.currentTimer++;
      if (sec.currentTimer >= sec.baseTimer + sec.jitter) {
        sec.currentTimer = 0;
        sec.jitter = Math.floor(Math.random() * 60 - 30);
        sec.activeTime = 90;
      }
    }
  });

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

  // 역류 물결 이펙트 (Upstream Flush) 렌더링 - 기믹 켜져있을 때만
  if (gimmickEnabled) {
    ZC_FLUSH_SECTIONS.forEach(sec => {
      if (visY1 < sec.top || visY0 > sec.bot) return;
      
      const isActive = sec.activeTime > 0;
      const alpha = isActive ? Math.min(1, sec.activeTime / 15) : 0.05;
      const color = isActive ? 'rgba(0, 200, 255' : 'rgba(0, 100, 150';
      
      ctx.save();
      ctx.lineWidth = isActive ? 3 : 1;
      ctx.shadowBlur = isActive ? 12 : 0;
      ctx.shadowColor = '#00c8ff';
      
      const time = performance.now();
      const speed = isActive ? 20 : 4;
      const offset = (time * speed * 0.05) % (sec.bot - sec.top);
      
      const isMobileEnv = typeof BOARD_XSCALE !== 'undefined' && BOARD_XSCALE < 1.0;
      const waveCount = isMobileEnv ? 3 : 6;
      const waveStep = isMobileEnv ? 30 : 15;
      const particleCount = isMobileEnv ? 8 : 15;
      
      // 강물을 가로지르는 리얼한 물결(Wave) 선 렌더링
      for (let i = 0; i < waveCount; i++) {
        const yPos = sec.bot - (offset + i * (60 * (6/waveCount))) % (sec.bot - sec.top);
        if (yPos >= sec.top && yPos <= sec.bot) {
          const wBounds = getWallAtY(yPos);
          const width = wBounds.rx - wBounds.lx;
          
          ctx.beginPath();
          ctx.strokeStyle = `${color}, ${alpha})`;
          ctx.moveTo(wBounds.lx, yPos);
          
          for(let x = wBounds.lx; x <= wBounds.rx; x += waveStep) {
             const t = (x - wBounds.lx) / width;
             // 시간에 따라 출렁이는 잔물결(Wave) + 거슬러 올라가는 형태의 아치(Arch)
             const wave = Math.sin(t * Math.PI * 4 + time * 0.01) * 12;
             const arch = Math.sin(t * Math.PI) * -30; // 위로 볼록하게 굽어짐
             ctx.lineTo(x, yPos + wave + arch);
          }
          // 끝점까지 닫아주기 (waveStep 때문에 끝이 비는 현상 방지)
          if ((wBounds.rx - wBounds.lx) % waveStep !== 0) {
             const wave = Math.sin(1 * Math.PI * 4 + time * 0.01) * 12;
             ctx.lineTo(wBounds.rx, yPos + wave - 30);
          }
          ctx.stroke();
        }
      }
      
      // 급류 활성화 시 물보라(거품) 파티클 효과 추가
      if (isActive) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        for(let p = 0; p < particleCount; p++) {
           const pOffset = (time * speed * 0.08 + p * 43) % (sec.bot - sec.top);
           const py = sec.bot - pOffset;
           if (py >= sec.top && py <= sec.bot) {
              const wBounds = getWallAtY(py);
              // 좌우로 무작위하게 요동치며 솟구치는 파티클
              const px = wBounds.lx + (Math.sin(p * 99 + time * 0.005) * 0.4 + 0.5) * (wBounds.rx - wBounds.lx);
              ctx.moveTo(px, py);
              ctx.arc(px, py, Math.random() * 2 + 1, 0, Math.PI * 2);
           }
        }
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // 거친 노이즈 텍스쳐의 결승선 (고정된 지그재그)
  if (visY1 >= GOAL_Y - 50 && visY0 <= GOAL_Y + 50) {
    ctx.save();
    ctx.beginPath();
    const wBounds = getWallAtY(GOAL_Y);
    ctx.moveTo(wBounds.lx, GOAL_Y);
    for(let x = wBounds.lx; x <= wBounds.rx; x += 15) {
       // Math.random() 대신 x좌표 기반 삼각함수를 사용하여 프레임마다 변하지 않는 고정된 거친 질감 생성
       const staticNoise = Math.sin(x * 0.4) * 7 + Math.cos(x * 0.9) * 5;
       ctx.lineTo(x, GOAL_Y + staticNoise);
    }
    ctx.lineTo(wBounds.rx, GOAL_Y);
    ctx.strokeStyle = 'rgba(255, 115, 0, 0.8)';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff6600';
    ctx.stroke();
    ctx.restore();
  }

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
    bgFrom:       '#2a1005',
    bgTo:         '#0f0502',
    wallFill:     '#1c0e06',
    wallStroke:   'rgba(255,115,0,0.6)',
    wallGlow:     '#ff6600',
    funnelStroke: 'transparent',
    funnelColor:  'transparent',
    goalFill:     'transparent',
    goalStroke:   'transparent',
    scanLine:     '#ffaa00',
  },
};
