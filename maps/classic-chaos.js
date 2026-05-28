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
      const lx = Math.random() < 0.70 ? 10 + Math.random() * 180 : 0;
      const rx = GAME_VWIDTH - (Math.random() < 0.70 ? 10 + Math.random() * 180 : 0);
      const safeRx = Math.max(rx, lx + 300);
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

  // 육각형 다이아몬드 섬 1 충돌
  collideBallWithSegment(ball, 325, 1500, 355, 1530);
  collideBallWithSegment(ball, 355, 1530, 355, 1870);
  collideBallWithSegment(ball, 355, 1870, 325, 1900);
  collideBallWithSegment(ball, 325, 1900, 295, 1870);
  collideBallWithSegment(ball, 295, 1870, 295, 1530);
  collideBallWithSegment(ball, 295, 1530, 325, 1500);

  // 육각형 다이아몬드 섬 2 충돌
  collideBallWithSegment(ball, 500, 1500, 530, 1530);
  collideBallWithSegment(ball, 530, 1530, 530, 1870);
  collideBallWithSegment(ball, 530, 1870, 500, 1900);
  collideBallWithSegment(ball, 500, 1900, 470, 1870);
  collideBallWithSegment(ball, 470, 1870, 470, 1530);
  collideBallWithSegment(ball, 470, 1530, 500, 1500);

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

  const laneWidth = 115;
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

  ctx.beginPath();
  ctx.moveTo(325, 1500); ctx.lineTo(355, 1530); ctx.lineTo(355, 1870);
  ctx.lineTo(325, 1900); ctx.lineTo(295, 1870); ctx.lineTo(295, 1530);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(500, 1500); ctx.lineTo(530, 1530); ctx.lineTo(530, 1870);
  ctx.lineTo(500, 1900); ctx.lineTo(470, 1870); ctx.lineTo(470, 1530);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ── 고체 섬 터널링 복구 (game.js animatePinball 훅) ───────────

function _cc_recoverTunnel() {
  pinballBalls.forEach(ball => {
    if (ball.isFinished) return;
    if (ball.y < 1500 || ball.y > 1900) return;

    [325, 500].forEach(islandX => {
      let halfW = 30;
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
  const paInX  = clampToWall(rj(160, 70), portalAlphaInY,  PORTAL_R, 20);
  const paOutX = clampToWall(rj(660, 70), portalAlphaOutY, PORTAL_R, 20);
  pinballPortals.push(new TeleportPortal(paInX, portalAlphaInY, paOutX, portalAlphaOutY, '#00f0ff', 'PORTAL-α'));

  const portalBetaInY  = rjy(2520, 60);
  const portalBetaOutY = Math.max(2050, portalBetaInY - (300 + Math.random() * 120));
  const pbInX  = clampToWall(rj(220, 70), portalBetaInY,  PORTAL_R, 20);
  const pbOutX = clampToWall(rj(600, 70), portalBetaOutY, PORTAL_R, 20);
  pinballPortals.push(new TeleportPortal(pbInX, portalBetaInY, pbOutX, portalBetaOutY, '#ff9900', 'PORTAL-β'));

  const pa = pinballPortals[0];
  placedGimmicks.push({ x: pa.x1, y: pa.y1, r: PORTAL_R });
  placedGimmicks.push({ x: pa.x2, y: pa.y2, r: PORTAL_R });
  const pb = pinballPortals[1];
  placedGimmicks.push({ x: pb.x1, y: pb.y1, r: PORTAL_R });
  placedGimmicks.push({ x: pb.x2, y: pb.y2, r: PORTAL_R });

  // ── 2. 슈퍼 범퍼 ──
  tryPlaceGimmick(1000, 40, 20, cx,  80, (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, 20, '#ff9900')); });
  tryPlaceGimmick(1180, 40, 18, 185, 60, (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, 18, '#00f0ff')); });
  tryPlaceGimmick(1180, 40, 18, 640, 60, (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, 18, '#00f0ff')); });
  tryPlaceGimmick(1350, 45, 22, cx,  80, (x, y) => { if(gkeep(y)) pinballBumpers.push(new SuperBumper(x, y, 22, '#8c52ff')); });
  tryPlaceGimmick(2120, 40, 18, 140, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 18, '#ff9900')); });
  tryPlaceGimmick(2120, 40, 18, 685, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 18, '#ff9900')); });
  tryPlaceGimmick(2350, 45, 22, cx,  60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 22, '#00f0ff')); });
  tryPlaceGimmick(2500, 40, 20, 280, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 20, '#8c52ff')); });
  tryPlaceGimmick(2500, 40, 20, 545, 60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 20, '#8c52ff')); });
  tryPlaceGimmick(2680, 30, 22, cx,  60, (x, y) => { pinballBumpers.push(new SuperBumper(x, y, 22, '#ff9900')); });

  // ── 3. 스피너 ──
  tryPlaceGimmick(950,  30, 31, cx,  80, (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, 31, '#8c52ff')); });
  tryPlaceGimmick(1250, 40, 26, 140, 60, (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, 26, '#ff9900')); });
  tryPlaceGimmick(1250, 40, 26, 685, 60, (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, 26, '#ff9900')); });
  tryPlaceGimmick(1450, 30, 31, cx,  80, (x, y) => { if(gkeep(y)) pinballSpinners.push(new Spinner(x, y, 31, '#00f0ff')); });
  tryPlaceGimmick(1100, 120, 28, cx, 200, (x, y) => { pinballSpinners.push(new Spinner(x, y, 28, '#8c52ff')); });
  tryPlaceGimmick(1380, 100, 28, cx, 200, (x, y) => { pinballSpinners.push(new Spinner(x, y, 28, '#ffea00')); });
  tryPlaceGimmick(2050, 35, 24, 180, 60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 24, '#8c52ff')); });
  tryPlaceGimmick(2050, 35, 24, 645, 60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 24, '#8c52ff')); });
  tryPlaceGimmick(2250, 40, 29, cx,  60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 29, '#ff9900')); });
  tryPlaceGimmick(2420, 40, 29, cx,  60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 29, '#00f0ff')); });
  tryPlaceGimmick(2600, 40, 31, cx,  60, (x, y) => { pinballSpinners.push(new Spinner(x, y, 31, '#8c52ff')); });

  // ── 4. 와류 ──
  tryPlaceGimmick(1080, 40, 75, 290, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 75, '#8c52ff')); });
  tryPlaceGimmick(1300, 40, 75, 535, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 75, '#8c52ff')); });
  tryPlaceGimmick(2200, 40, 78, 240, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 78, '#8c52ff')); });
  tryPlaceGimmick(2480, 40, 78, 585, 60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 78, '#8c52ff')); });
  tryPlaceGimmick(2650, 40, 83, cx,  60, (x, y) => { pinballVortexes.push(new SlowVortex(x, y, 83, '#8c52ff')); });

  // ── 5. 발사대 ──
  tryPlaceGimmick(1020, 30, 110/2+15, cx,  50, (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, 110, '#ff3366', randAngle())); });
  tryPlaceGimmick(1200, 40, 90/2+15,  190, 50, (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, 90,  '#ffea00', randAngle())); });
  tryPlaceGimmick(1200, 40, 90/2+15,  635, 50, (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, 90,  '#ffea00', randAngle())); });
  tryPlaceGimmick(1400, 40, 120/2+15, cx,  50, (x, y) => { if(gkeep(y)) pinballLaunchPads.push(new LaunchPad(x, y, 120, '#ff3366', randAngle())); });
  tryPlaceGimmick(2150, 35, 70/2+15,  170, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 70,  '#33ff57', randAngle())); });
  tryPlaceGimmick(2150, 35, 70/2+15,  655, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 70,  '#33ff57', randAngle())); });
  tryPlaceGimmick(2300, 40, 130/2+15, cx,  50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 130, '#ff3366', randAngle())); });
  tryPlaceGimmick(2450, 40, 90/2+15,  250, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 90,  '#ffea00', randAngle())); });
  tryPlaceGimmick(2450, 40, 90/2+15,  575, 50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 90,  '#ffea00', randAngle())); });
  tryPlaceGimmick(2620, 35, 70/2+15,  cx,  50, (x, y) => { pinballLaunchPads.push(new LaunchPad(x, y, 70,  '#33ff57', randAngle())); });

  // ── 6. 깔때기 입구 역전 지대 ──
  pinballSpinners.push(new Spinner(412.5, 2840, 29, '#00f0ff'));
  pinballBumpers.push(new SuperBumper(412.5, 2950, 24, '#ff00ff'));
  placedGimmicks.push({ x: 412.5, y: 2840, r: 29 });
  placedGimmicks.push({ x: 412.5, y: 2950, r: 24 });

  const t1 = (2800 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx1 = funnelLeftX + t1 * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx1 = funnelRightX - t1 * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  const width1 = rx1 - lx1;
  pinballSpeedPads.push(new SpeedPad(lx1 + width1 * 0.28, 2800, 58, 24));
  pinballSpeedPads.push(new SpeedPad(lx1 + width1 * 0.72, 2800, 58, 24));

  const t2 = (2950 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx2 = funnelLeftX + t2 * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx2 = funnelRightX - t2 * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  const width2 = rx2 - lx2;
  pinballSpeedPads.push(new SpeedPad(lx2 + width2 * 0.28, 2950, 50, 24));
  pinballSpeedPads.push(new SpeedPad(lx2 + width2 * 0.72, 2950, 50, 24));

  const t_lp = (3060 - FUNNEL_TOP_Y) / (GOAL_Y - FUNNEL_TOP_Y);
  const lx_lp = funnelLeftX + t_lp * (FUNNEL_BOTTOM_X - funnelLeftX);
  const rx_lp = funnelRightX - t_lp * (funnelRightX - (GAME_VWIDTH - FUNNEL_BOTTOM_X));
  pinballLaunchPads.push(new LaunchPad(lx_lp + 25,  3060, 66,  '#ffea00',  Math.PI * 0.12));
  pinballLaunchPads.push(new LaunchPad(rx_lp - 25,  3060, 66,  '#ff3366', -Math.PI * 0.18));
  pinballLaunchPads.push(new LaunchPad(cx,           3050, 106, '#33ff57', 0, 1.1, 52));

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
