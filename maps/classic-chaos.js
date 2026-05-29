/**
 * =================================================================
 *   CHAOS-DROP — MAP: CLASSIC CHAOS (Default)
 * =================================================================
 * 벽 프로파일 생성, 장애물 배치, Zone 2.5 터널 물리/렌더링,
 * 고체 섬 터널링 복구.
 *
 * MAPS['classic-chaos'] 에 등록. game.js 딜리게이터가 훅을 호출합니다.
 *   classicChaos_init()  ← initPinballMap() 경유
 */

// ── 벽 프로파일 생성 ─────────────────────────────────────────

function classicChaos_generateWallProfile() {
  wallProfile = [];
  wallProfile.push({ y: 0,   lx: 0, rx: GAME_VWIDTH });
  wallProfile.push({ y: 100, lx: 0, rx: GAME_VWIDTH });

  let y = 100;
  let lastLx = 0;
  let lastRx = GAME_VWIDTH;

  while (y < TUNNEL_TOP_Y) {
    const segH = 100 + Math.floor(Math.random() * 200);
    y = Math.min(y + segH, TUNNEL_TOP_Y);

    if (y === TUNNEL_TOP_Y) {
      lastLx = TUNNEL_LEFT_X;
      lastRx = TUNNEL_RIGHT_X;
    } else {
      const lx = Math.random() < 0.70 ? Math.round(10*BOARD_XSCALE) + Math.random() * Math.round(180*BOARD_XSCALE) : 0;
      const rx = GAME_VWIDTH - (Math.random() < 0.70 ? Math.round(10*BOARD_XSCALE) + Math.random() * Math.round(180*BOARD_XSCALE) : 0);
      const safeRx = Math.max(rx, lx + Math.round(300 * BOARD_XSCALE));
      lastLx = lx;
      lastRx = Math.min(safeRx, GAME_VWIDTH);
    }
    wallProfile.push({ y, lx: lastLx, rx: lastRx });
  }

  y = TUNNEL_BOTTOM_Y;
  lastLx = TUNNEL_LEFT_X;
  lastRx = TUNNEL_RIGHT_X;
  wallProfile.push({ y, lx: lastLx, rx: lastRx });

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
  wallProfile.push({ y: FUNNEL_TOP_Y, lx: funnelLeftX,              rx: funnelRightX });
  wallProfile.push({ y: GOAL_Y,       lx: FUNNEL_BOTTOM_X,          rx: GAME_VWIDTH - FUNNEL_BOTTOM_X });
}

// ── Zone 2.5 볼 물리 (ball.js 훅) ────────────────────────────

function _cc_applyPhysics(ball) {
  if (ball.y < TUNNEL_TOP_Y || ball.y > TUNNEL_BOTTOM_Y) return;

  const _I1C = TUNNEL_BARRIER1_X, _I1HW = Math.round(30 * BOARD_XSCALE);
  const _I2C = TUNNEL_BARRIER2_X, _I2HW = Math.round(30 * BOARD_XSCALE);
  // 육각형 다이아몬드 섬 1 충돌
  collideBallWithSegment(ball, _I1C,        1500, _I1C+_I1HW, 1530);
  collideBallWithSegment(ball, _I1C+_I1HW,  1530, _I1C+_I1HW, 1870);
  collideBallWithSegment(ball, _I1C+_I1HW,  1870, _I1C,       1900);
  collideBallWithSegment(ball, _I1C,        1900, _I1C-_I1HW, 1870);
  collideBallWithSegment(ball, _I1C-_I1HW,  1870, _I1C-_I1HW, 1530);
  collideBallWithSegment(ball, _I1C-_I1HW,  1530, _I1C,       1500);
  // 육각형 다이아몬드 섬 2 충돌
  collideBallWithSegment(ball, _I2C,        1500, _I2C+_I2HW, 1530);
  collideBallWithSegment(ball, _I2C+_I2HW,  1530, _I2C+_I2HW, 1870);
  collideBallWithSegment(ball, _I2C+_I2HW,  1870, _I2C,       1900);
  collideBallWithSegment(ball, _I2C,        1900, _I2C-_I2HW, 1870);
  collideBallWithSegment(ball, _I2C-_I2HW,  1870, _I2C-_I2HW, 1530);
  collideBallWithSegment(ball, _I2C-_I2HW,  1530, _I2C,       1500);

  // 3레인 가속/감속 물리
  let ballLane = 0;
  if (ball.x >= TUNNEL_BARRIER1_X && ball.x < TUNNEL_BARRIER2_X) {
    ballLane = 1;
  } else if (ball.x >= TUNNEL_BARRIER2_X) {
    ballLane = 2;
  }

  if (ballLane !== pinballAccelLane) {
    ball.vy *= TUNNEL_DECEL_MULT;
    ball.vx *= TUNNEL_DECEL_MULT;
    ball.vy = Math.max(1.5, ball.vy);
  } else {
    ball.vy += TUNNEL_BOOST_ACCEL;
    ball.vx *= 1.03;
    ball.vy *= 1.03;
    ball.superChargeTimer = Math.max(ball.superChargeTimer, 15);
  }
}

// ── Zone 2.5 터널 렌더링 (game.js animatePinball 훅) ──────────

function _cc_drawLayer(ctx, visY0, visY1) {
  if (visY1 < TUNNEL_TOP_Y || visY0 > TUNNEL_BOTTOM_Y) return;

  ctx.save();

  const tunnelH = TUNNEL_BOTTOM_Y - TUNNEL_TOP_Y;
  const tunnelW = TUNNEL_RIGHT_X - TUNNEL_LEFT_X;

  ctx.beginPath();
  ctx.rect(TUNNEL_LEFT_X, TUNNEL_TOP_Y, tunnelW, tunnelH);
  ctx.clip();

  const laneWidth = Math.round((TUNNEL_RIGHT_X - TUNNEL_LEFT_X - 2 * TUNNEL_BARRIER_W) / 3);
  const flowDownSpeed = (Date.now() / 20) % 80;
  const flowUpSpeed   = (Date.now() / 20) % 80;

  for (let laneIdx = 0; laneIdx < 3; laneIdx++) {
    const lx    = TUNNEL_LEFT_X + laneIdx * (laneWidth + TUNNEL_BARRIER_W);
    const cxVal = lx + laneWidth / 2;

    if (laneIdx !== pinballAccelLane) {
      ctx.fillStyle = 'rgba(255, 51, 102, 0.05)';
      ctx.fillRect(lx, TUNNEL_TOP_Y, laneWidth, tunnelH);

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
      ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.fillRect(lx, TUNNEL_TOP_Y, laneWidth, tunnelH);

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

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(TUNNEL_BARRIER1_X, TUNNEL_TOP_Y); ctx.lineTo(TUNNEL_BARRIER1_X, TUNNEL_BOTTOM_Y);
  ctx.moveTo(TUNNEL_BARRIER2_X, TUNNEL_TOP_Y); ctx.lineTo(TUNNEL_BARRIER2_X, TUNNEL_BOTTOM_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore(); // 클리핑 해제

  // 육각형 섬 렌더링
  ctx.save();
  ctx.fillStyle = '#07080f';
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#00f0ff';

  const _rI1C = TUNNEL_BARRIER1_X, _rHW1 = Math.round(30 * BOARD_XSCALE);
  const _rI2C = TUNNEL_BARRIER2_X, _rHW2 = Math.round(30 * BOARD_XSCALE);
  ctx.beginPath();
  ctx.moveTo(_rI1C, 1500); ctx.lineTo(_rI1C+_rHW1, 1530); ctx.lineTo(_rI1C+_rHW1, 1870);
  ctx.lineTo(_rI1C, 1900); ctx.lineTo(_rI1C-_rHW1, 1870); ctx.lineTo(_rI1C-_rHW1, 1530);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(_rI2C, 1500); ctx.lineTo(_rI2C+_rHW2, 1530); ctx.lineTo(_rI2C+_rHW2, 1870);
  ctx.lineTo(_rI2C, 1900); ctx.lineTo(_rI2C-_rHW2, 1870); ctx.lineTo(_rI2C-_rHW2, 1530);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.restore();
}

// ── 고체 섬 터널링 복구 (game.js animatePinball 훅) ───────────

function _cc_recoverTunnel() {
  pinballBalls.forEach(ball => {
    if (ball.isFinished) return;
    if (ball.y < 1500 || ball.y > 1900) return;

    [TUNNEL_BARRIER1_X, TUNNEL_BARRIER2_X].forEach(islandX => {
      let halfW = Math.round(30 * BOARD_XSCALE);
      if (ball.y < 1530)      halfW = ball.y - 1500;
      else if (ball.y > 1870) halfW = 1900 - ball.y;

      if (Math.abs(ball.x - islandX) < halfW) {
        if (ball.x < islandX) {
          ball.x = islandX - halfW - ball.r - 2;
          ball.vx = -Math.abs(ball.vx) - 2.5;
        } else {
          ball.x = islandX + halfW + ball.r + 2;
          ball.vx = Math.abs(ball.vx) + 2.5;
        }
        pinballLog(`🛡️ ${ball.name} 섬 내부 터널링 방지막 가동! 강제 사출.`);
      }
    });
  });
}

// ── 맵 초기화 ─────────────────────────────────────────────────

function classicChaos_init() {
  classicChaos_generateWallProfile();
  pinballPegs = [];
  pinballSpinners = [];
  pinballBumpers = [];
  pinballPortals = [];
  pinballVortexes = [];
  pinballLaunchPads = [];
  pinballSpeedPads = [];

  const W  = GAME_VWIDTH;
  const cx = W / 2;
  const xs = v => Math.round(v * BOARD_XSCALE); // x좌표 스케일 헬퍼

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

  let placedGimmicks = [];

  const clampToWall = (x, y, radius, margin = 14) => {
    let maxLx = -9999;
    let minRx = 9999;
    for (let testY = y - radius; testY <= y + radius; testY += 5) {
      const wall = getWallAtY(testY);
      if (wall.lx > maxLx) maxLx = wall.lx;
      if (wall.rx < minRx) minRx = wall.rx;
    }
    const minSafeX = maxLx + radius + margin;
    const maxSafeX = minRx - radius - margin;
    if (minSafeX >= maxSafeX) return (maxLx + minRx) / 2;
    return Math.max(minSafeX, Math.min(maxSafeX, x));
  };

  const checkOverlap = (x, y, r) => {
    for (const g of placedGimmicks) {
      if (Math.hypot(x - g.x, y - g.y) < r + g.r + 32) return true;
    }
    return false;
  };

  const tryPlaceGimmick = (yCenter, yRange, sizeR, xBase, xRange, creatorFunc) => {
    for (let attempt = 0; attempt < 25; attempt++) {
      const tempY = rjy(yCenter, yRange);
      const tempX = rjwall(xBase, xRange, tempY, sizeR + 15);
      const safeX = clampToWall(tempX, tempY, sizeR, 14);
      if (!checkOverlap(safeX, tempY, sizeR)) {
        creatorFunc(safeX, tempY);
        placedGimmicks.push({ x: safeX, y: tempY, r: sizeR });
        return true;
      }
    }
    return false;
  };

  pinballAccelLane = Math.floor(Math.random() * 3);

  // ── 1. 포탈 ──
  const portalAlphaInY  = rjy(720, 50);
  const portalAlphaOutY = Math.max(160, portalAlphaInY - (350 + Math.random() * 150));
  const paInX  = clampToWall(rj(xs(160), xs(70)), portalAlphaInY,  PORTAL_R, 20);
  const paOutX = clampToWall(rj(xs(660), xs(70)), portalAlphaOutY, PORTAL_R, 20);
  pinballPortals.push(new TeleportPortal(paInX, portalAlphaInY, paOutX, portalAlphaOutY, '#00f0ff', 'PORTAL-α'));

  const portalBetaInY  = rjy(2520, 60);
  const portalBetaOutY = Math.max(2050, portalBetaInY - (300 + Math.random() * 120));
  const pbInX  = clampToWall(rj(xs(220), xs(70)), portalBetaInY,  PORTAL_R, 20);
  const pbOutX = clampToWall(rj(xs(600), xs(70)), portalBetaOutY, PORTAL_R, 20);
  pinballPortals.push(new TeleportPortal(pbInX, portalBetaInY, pbOutX, portalBetaOutY, '#ff9900', 'PORTAL-β'));

  const pa = pinballPortals[0];
  placedGimmicks.push({ x: pa.x1, y: pa.y1, r: PORTAL_R });
  placedGimmicks.push({ x: pa.x2, y: pa.y2, r: PORTAL_R });
  const pb = pinballPortals[1];
  placedGimmicks.push({ x: pb.x1, y: pb.y1, r: PORTAL_R });
  placedGimmicks.push({ x: pb.x2, y: pb.y2, r: PORTAL_R });

  // ── 2. 슈퍼 범퍼 ──
  tryPlaceGimmick(1000, 40, xs(20), cx,        xs(80), (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, xs(20), '#ff9900')); });
  tryPlaceGimmick(1180, 40, xs(18), xs(185),   xs(60), (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, xs(18), '#00f0ff')); });
  tryPlaceGimmick(1180, 40, xs(18), xs(640),   xs(60), (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, xs(18), '#00f0ff')); });
  tryPlaceGimmick(1350, 45, xs(22), cx,        xs(80), (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, xs(22), '#8c52ff')); });
  tryPlaceGimmick(2120, 40, xs(18), xs(140),   xs(60), (x, y) => { pinballBumpers.push(new SuperBumper(x, y, xs(18), '#ff9900')); });
  tryPlaceGimmick(2120, 40, xs(18), xs(685),   xs(60), (x, y) => { pinballBumpers.push(new SuperBumper(x, y, xs(18), '#ff9900')); });
  tryPlaceGimmick(2350, 45, xs(22), cx,        xs(60), (x, y) => { pinballBumpers.push(new SuperBumper(x, y, xs(22), '#00f0ff')); });
  tryPlaceGimmick(2500, 40, xs(20), xs(280),   xs(60), (x, y) => { pinballBumpers.push(new SuperBumper(x, y, xs(20), '#8c52ff')); });
  tryPlaceGimmick(2500, 40, xs(20), xs(545),   xs(60), (x, y) => { pinballBumpers.push(new SuperBumper(x, y, xs(20), '#8c52ff')); });
  tryPlaceGimmick(2680, 30, xs(22), cx,        xs(60), (x, y) => { pinballBumpers.push(new SuperBumper(x, y, xs(22), '#ff9900')); });

  // ── 3. 스피너 ──
  tryPlaceGimmick(950,  30, xs(31), cx,        xs(80),  (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, xs(31), '#8c52ff')); });
  tryPlaceGimmick(1250, 40, xs(26), xs(140),   xs(60),  (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, xs(26), '#ff9900')); });
  tryPlaceGimmick(1250, 40, xs(26), xs(685),   xs(60),  (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, xs(26), '#ff9900')); });
  tryPlaceGimmick(1450, 30, xs(31), cx,        xs(80),  (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, xs(31), '#00f0ff')); });
  tryPlaceGimmick(1100, 120, xs(28), cx,       xs(200), (x, y) => { pinballSpinners.push(new Spinner(x, y, xs(28), '#8c52ff')); });
  tryPlaceGimmick(1380, 100, xs(28), cx,       xs(200), (x, y) => { pinballSpinners.push(new Spinner(x, y, xs(28), '#ffea00')); });
  tryPlaceGimmick(2050, 35, xs(24), xs(180),   xs(60),  (x, y) => { pinballSpinners.push(new Spinner(x, y, xs(24), '#8c52ff')); });
  tryPlaceGimmick(2050, 35, xs(24), xs(645),   xs(60),  (x, y) => { pinballSpinners.push(new Spinner(x, y, xs(24), '#8c52ff')); });
  tryPlaceGimmick(2250, 40, xs(29), cx,        xs(60),  (x, y) => { pinballSpinners.push(new Spinner(x, y, xs(29), '#ff9900')); });
  tryPlaceGimmick(2420, 40, xs(29), cx,        xs(60),  (x, y) => { pinballSpinners.push(new Spinner(x, y, xs(29), '#00f0ff')); });
  tryPlaceGimmick(2600, 40, xs(31), cx,        xs(60),  (x, y) => { pinballSpinners.push(new Spinner(x, y, xs(31), '#8c52ff')); });

  // ── 4. 와류 ──
  tryPlaceGimmick(1080, 40, xs(75), xs(290),   xs(60), (x, y) => { pinballVortexes.push(new SlowVortex(x, y, xs(75), '#8c52ff')); });
  tryPlaceGimmick(1300, 40, xs(75), xs(535),   xs(60), (x, y) => { pinballVortexes.push(new SlowVortex(x, y, xs(75), '#8c52ff')); });
  tryPlaceGimmick(2200, 40, xs(78), xs(240),   xs(60), (x, y) => { pinballVortexes.push(new SlowVortex(x, y, xs(78), '#8c52ff')); });
  tryPlaceGimmick(2480, 40, xs(78), xs(585),   xs(60), (x, y) => { pinballVortexes.push(new SlowVortex(x, y, xs(78), '#8c52ff')); });
  tryPlaceGimmick(2650, 40, xs(83), cx,        xs(60), (x, y) => { pinballVortexes.push(new SlowVortex(x, y, xs(83), '#8c52ff')); });

  // ── 5. 발사대 ──
  tryPlaceGimmick(1020, 30, xs(110)/2+15, cx,        xs(50), (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, xs(110), '#ff3366', randAngle())); });
  tryPlaceGimmick(1200, 40, xs(90)/2+15,  xs(190),   xs(50), (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, xs(90),  '#ffea00', randAngle())); });
  tryPlaceGimmick(1200, 40, xs(90)/2+15,  xs(635),   xs(50), (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, xs(90),  '#ffea00', randAngle())); });
  tryPlaceGimmick(1400, 40, xs(120)/2+15, cx,        xs(50), (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, xs(120), '#ff3366', randAngle())); });
  tryPlaceGimmick(2150, 35, xs(70)/2+15,  xs(170),   xs(50), (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, xs(70),  '#33ff57', randAngle())); });
  tryPlaceGimmick(2150, 35, xs(70)/2+15,  xs(655),   xs(50), (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, xs(70),  '#33ff57', randAngle())); });
  tryPlaceGimmick(2300, 40, xs(130)/2+15, cx,        xs(50), (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, xs(130), '#ff3366', randAngle())); });
  tryPlaceGimmick(2450, 40, xs(90)/2+15,  xs(250),   xs(50), (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, xs(90),  '#ffea00', randAngle())); });
  tryPlaceGimmick(2450, 40, xs(90)/2+15,  xs(575),   xs(50), (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, xs(90),  '#ffea00', randAngle())); });
  tryPlaceGimmick(2620, 35, xs(70)/2+15,  cx,        xs(50), (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, xs(70),  '#33ff57', randAngle())); });

  // ── 6. 깔때기 입구 역전 지대 ──
  pinballSpinners.push(new Spinner(cx, 2840, xs(29), '#00f0ff'));
  pinballBumpers.push(new SuperBumper(cx, 2950, xs(24), '#ff00ff'));
  placedGimmicks.push({ x: cx, y: 2840, r: xs(29) });
  placedGimmicks.push({ x: cx, y: 2950, r: xs(24) });

  const t1 = (2800 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx1 = funnelLeftX + t1 * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx1 = funnelRightX - t1 * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  const width1 = rx1 - lx1;
  pinballSpeedPads.push(new SpeedPad(lx1 + width1 * 0.28, 2800, xs(58), 24));
  pinballSpeedPads.push(new SpeedPad(lx1 + width1 * 0.72, 2800, xs(58), 24));

  const t2 = (2950 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx2 = funnelLeftX + t2 * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx2 = funnelRightX - t2 * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  const width2 = rx2 - lx2;
  pinballSpeedPads.push(new SpeedPad(lx2 + width2 * 0.28, 2950, xs(50), 24));
  pinballSpeedPads.push(new SpeedPad(lx2 + width2 * 0.72, 2950, xs(50), 24));

  const t_lp = (3060 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx_lp = funnelLeftX + t_lp * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx_lp = funnelRightX - t_lp * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  // 퍼널 실제 폭에 맞춰 출구 발판 크기 동적 조정: 각 통로 22px 이상 보장
  const _exitW   = rx_lp - lx_lp;
  const _minGap  = 22;
  let _lpWL = xs(66), _lpWR = xs(66), _lpWC = xs(106);
  if (_lpWL + _lpWC + _lpWR > _exitW - 2 * _minGap) {
    const _sc = Math.max(0.3, (_exitW - 2 * _minGap) / (_lpWL + _lpWC + _lpWR));
    _lpWL = Math.max(8, Math.round(_lpWL * _sc));
    _lpWR = Math.max(8, Math.round(_lpWR * _sc));
    _lpWC = Math.max(8, Math.round(_lpWC * _sc));
  }
  const _lpOff = Math.min(xs(25), Math.round(_exitW * 0.1));
  pinballLaunchPads.push(new LaunchPad(lx_lp + _lpOff, 3060, _lpWL, '#ffea00',  Math.PI * 0.12));
  pinballLaunchPads.push(new LaunchPad(rx_lp - _lpOff, 3060, _lpWR, '#ff3366', -Math.PI * 0.18));
  pinballLaunchPads.push(new LaunchPad(cx,              3050, _lpWC, '#33ff57', 0, 1.1, Math.round(_lpWC * 0.49)));

  // ── 7. 핀(Peg) 배치 ──
  const gapX = 28, gapY = 28;
  const pegStartY = 160;
  const pegEndY   = FUNNEL_TOP_Y - 60;
  const jitter = gapX * 0.55;

  for (let row = 0; pegStartY + row * gapY <= pegEndY; row++) {
    const baseY = pegStartY + row * gapY;
    if (baseY > 900 && baseY < 1900) continue;
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
      if (!skip) for (const ep of pinballPegs) {
        if (Math.abs(ep.y - y) > 29) continue;
        if (Math.hypot(x - ep.x, y - ep.y) < 29) { skip = true; break; }
      }

      if (!skip) pinballPegs.push(new Peg(x, y, 5));
    }
  }

  // 핀 10% 랜덤 제거 (배치 완료 후 실행)
  pinballPegs = pinballPegs.filter(() => Math.random() > 0.10);
}

// ── 맵 레지스트리 등록 ────────────────────────────────────
MAPS['classic-chaos'] = {
  label:         '🌀 Classic Chaos',
  init:          classicChaos_init,
  applyPhysics:  _cc_applyPhysics,
  drawLayer:     _cc_drawLayer,
  recoverTunnel: _cc_recoverTunnel,
  theme: {
    uiClass:      '',
    bgClear:      '#06070d',
    bgFrom:       '#10122e',
    bgTo:         '#05060b',
    wallFill:     '#07080f',
    wallStroke:   'rgba(0,240,255,0.5)',
    wallGlow:     '#00f0ff',
    funnelStroke: 'rgba(140,82,255,0.5)',
    funnelColor:  '#8c52ff',
    goalFill:     'rgba(0,240,255,0.07)',
    goalStroke:   '#00f0ff',
    scanLine:     '#ff9900',
  },
};
