/**
 * =================================================================
 *   CHAOS-DROP NEON PINBALL SYSTEM - MAIN ORCHESTRATOR
 * =================================================================
 * 전역 상태 변수, 60FPS 메인 루프(animatePinball), 게임 시작/정지/리셋.
 * 물리·충돌·카메라·이펙트·UI·맵은 각 모듈 파일에서 담당합니다.
 */

// ── 전역 동적 상태 변수 ───────────────────────────────────────

let GAME_X_OFFSET = 415;

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
let pinballAccelLane = 0;
let speedPadRotateTimer = 300;

let pinballGameRunning = false;
let pinballConfettiParticles = [];
let pinballNearMissSparks = [];
let varChecking = false;
let varTimer = 0;
let varTriggered = false;
let currentRule = 'first';
let winCount = 2;
let specificRank = 3;
let wallProfile = [];
let funnelLeftX = 0;
let funnelRightX = GAME_VWIDTH;
let raceStartTime = 0;
let hasAnnouncedWinners = false;
let decisiveMomentActive = false;
let freezeModeEnabled = true;
let prevRankOrder = [];
let overtakeParticles = [];
let currentLeaderId = -1;
let crownFlashTimer = 0;

// ── 맵 레지스트리 딜리게이터 ──────────────────────────────────
// 각 맵 파일이 MAPS['id']에 훅을 등록합니다. (constants.js 에서 MAPS={} 선언)
let currentMapId = 'classic-chaos';

function _applyMapTheme() {
  Object.values(MAPS).forEach(m => { if (m.theme?.uiClass) document.body.classList.remove(m.theme.uiClass); });
  const cls = MAPS[currentMapId]?.theme?.uiClass;
  if (cls) document.body.classList.add(cls);
}

function switchMap(mapId) {
  if (MAPS[mapId]) { currentMapId = mapId; _applyMapTheme(); }
}

function applyMapZonePhysics(ball)        { MAPS[currentMapId]?.applyPhysics?.(ball); }
function drawCurrentMapLayer(ctx, v0, v1) { MAPS[currentMapId]?.drawLayer?.(ctx, v0, v1); }
function recoverCurrentMapIslandTunnel()  { MAPS[currentMapId]?.recoverTunnel?.(); }
function initPinballMap()                 { MAPS[currentMapId]?.init?.(); _applyMapTheme(); sortPegsForCollision(); }

// ── 메인 루프 ─────────────────────────────────────────────────

let lastTime = 0;

function animatePinball(currentTime) {
  pinballAnimId = requestAnimationFrame(animatePinball);

  const now = currentTime || performance.now();
  if (!lastTime) lastTime = now;
  const elapsed = now - lastTime;

  if (elapsed < FPS_INTERVAL) return;
  lastTime = now - (elapsed % FPS_INTERVAL);

  if (!pinballCanvas || !pinballCtx) return;
  const ctx = pinballCtx;
  const VW = GAME_VWIDTH;
  const VH = GAME_VHEIGHT;
  const CH = pinballCanvas.height;

  // VAR 슬로우모션 제어
  let shouldRunPhysics = true;
  if (varChecking) {
    varTimer--;
    shouldRunPhysics = (varTimer % 8 === 0);
    if (varTimer <= 0) {
      varChecking = false;
      checkWinningConditions();
    }
  }

  // A. 카메라
  const activeBalls = pinballBalls.filter(b => !b.isFinished);

  // 출구 근접 트리거: 선착순 1명 / 특정 1등은 거리 기반으로 발동
  if (pinballGameRunning && !exitZoomLeaderTriggered && activeBalls.length > 0) {
    if ((currentRule === 'first' && winCount === 1) || (currentRule === 'specific' && specificRank === 1)) {
      const _leader = activeBalls.reduce((a, b) => b.y > a.y ? b : a);
      if (_leader.y >= GOAL_Y - 100) {
        triggerExitZoom(9999); // 골인까지 고정
        exitZoomLeaderTriggered = true;
      }
    }
  }

  updateCamera(activeBalls, CH, VH);

  // B. 배경
  const _th = MAPS[currentMapId]?.theme || {};
  ctx.fillStyle = _th.bgClear || '#06070d';
  ctx.fillRect(0, 0, pinballCanvas.width, pinballCanvas.height);

  // C. 게임 영역 카메라 변환
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
  bgGrad.addColorStop(0, _th.bgFrom || '#10122e');
  bgGrad.addColorStop(1, _th.bgTo   || '#05060b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, visY0, VW, CH);

  // 가변 벽 드로잉
  if (wallProfile.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(0, visY0);
    wallProfile.forEach(v => { if (v.y >= visY0 - 50 && v.y <= visY1 + 50) ctx.lineTo(v.lx, v.y); });
    ctx.lineTo(0, visY1); ctx.closePath();
    ctx.fillStyle = _th.wallFill || '#07080f'; ctx.fill();

    ctx.beginPath();
    wallProfile.forEach((v, i) => { if (v.y >= visY0 - 50 && v.y <= visY1 + 50) { i === 0 || wallProfile[i-1]?.y < visY0 - 50 ? ctx.moveTo(v.lx, v.y) : ctx.lineTo(v.lx, v.y); } });
    ctx.strokeStyle = _th.wallStroke || 'rgba(0,240,255,0.5)'; ctx.lineWidth = 2;
    ctx.shadowBlur = 6 * QUALITY; ctx.shadowColor = _th.wallGlow || '#00f0ff'; ctx.stroke(); ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(VW, visY0);
    wallProfile.forEach(v => { if (v.y >= visY0 - 50 && v.y <= visY1 + 50) ctx.lineTo(v.rx, v.y); });
    ctx.lineTo(VW, visY1); ctx.closePath();
    ctx.fillStyle = _th.wallFill || '#07080f'; ctx.fill();

    ctx.beginPath();
    wallProfile.forEach((v, i) => { if (v.y >= visY0 - 50 && v.y <= visY1 + 50) { i === 0 || wallProfile[i-1]?.y < visY0 - 50 ? ctx.moveTo(v.rx, v.y) : ctx.lineTo(v.rx, v.y); } });
    ctx.strokeStyle = _th.wallStroke || 'rgba(0,240,255,0.5)'; ctx.lineWidth = 2;
    ctx.shadowBlur = 6 * QUALITY; ctx.shadowColor = _th.wallGlow || '#00f0ff'; ctx.stroke(); ctx.shadowBlur = 0;
  }

  // 깔때기 + 골인선
  ctx.save();
  ctx.strokeStyle = _th.funnelStroke || 'rgba(140,82,255,0.5)';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 8 * QUALITY;
  ctx.shadowColor = _th.funnelColor || '#8c52ff';
  ctx.beginPath();
  ctx.moveTo(funnelLeftX,  FUNNEL_TOP_Y);
  ctx.lineTo(FUNNEL_BOTTOM_X,      GOAL_Y);
  ctx.lineTo(FUNNEL_BOTTOM_X,      GOAL_Y + 40);
  ctx.moveTo(funnelRightX, FUNNEL_TOP_Y);
  ctx.lineTo(VW - FUNNEL_BOTTOM_X, GOAL_Y);
  ctx.lineTo(VW - FUNNEL_BOTTOM_X, GOAL_Y + 40);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = _th.goalFill   || 'rgba(0,240,255,0.07)';
  ctx.fillRect(FUNNEL_BOTTOM_X, GOAL_Y, VW - FUNNEL_BOTTOM_X * 2, 40);
  ctx.strokeStyle = _th.goalStroke || '#00f0ff';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 5 * QUALITY; ctx.shadowColor = _th.goalStroke || '#00f0ff';
  ctx.strokeRect(FUNNEL_BOTTOM_X, GOAL_Y, VW - FUNNEL_BOTTOM_X * 2, 40);
  ctx.restore();

  // 맵 고유 레이어 (터널, 섬 등) — maps/classic-chaos.js
  drawCurrentMapLayer(ctx, visY0, visY1);

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

  // 구슬 물리
  if (pinballGameRunning && shouldRunPhysics) {
    speedPadRotateTimer--;
    if (speedPadRotateTimer <= 0) {
      speedPadRotateTimer = 300;
      pinballSpeedPads.forEach(pad => pad.rotateClockwise());
      pinballLog("⚡ 가속 패드 방향 즉시 회전!");
    }

    // 맵 고유 섬 터널링 복구 — maps/classic-chaos.js
    recoverCurrentMapIslandTunnel();

    // E-1. 구슬 간 충돌
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

    // E-2. 장애물 충돌 — collision.js
    resolveObstacleCollisions();
  }

  // 구슬 업데이트 & 드로잉
  pinballBalls.forEach(ball => {
    if (shouldRunPhysics) ball.update();
    ball.draw(ctx);
  });

  // 역전 감지 및 왕관/역전 이펙트
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

  // 역전! 파티클 드로잉
  overtakeParticles = overtakeParticles.filter(p => {
    if (shouldRunPhysics) { p.x += p.vx; p.y += p.vy; p.vy *= 0.96; p.life--; }
    const t = p.life / p.maxLife;
    const _oa = t > 0.8 ? (1 - t) / 0.2 : t < 0.25 ? t / 0.25 : 1.0;
    ctx.save();
    ctx.globalAlpha = _oa;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 6 * QUALITY; ctx.shadowColor = p.color;
    ctx.font = 'bold 11px Outfit, Noto Sans KR, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('역전!', 0, 0);
    ctx.restore();
    return p.life > 0;
  });

  // 모드별 순위 인디케이터
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
        ctx.shadowBlur = 8 * QUALITY;
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
        ctx.shadowBlur = 3 * QUALITY;
        [[_cx - _cw/2, _cy + _ch*0.35, 2], [_cx, _cy, 2.5], [_cx + _cw/2, _cy + _ch*0.35, 2]].forEach(([px, py, pr]) => {
          ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
      };

      const _drawShield = (ball, fa) => {
        const _cx = ball.x, _cy = ball.y - ball.r - 24;
        const sw = 18, sh = 20;
        ctx.save();
        ctx.globalAlpha = fa;
        ctx.fillStyle = '#67e8f9';
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 8 * QUALITY;
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
        ctx.moveTo(_cx,     _cy + 3);       ctx.lineTo(_cx,     _cy + sh - 4);
        ctx.moveTo(_cx - 4, _cy + sh*0.42); ctx.lineTo(_cx + 4, _cy + sh*0.42);
        ctx.stroke();
        ctx.restore();
      };

      const _drawTarget = (ball, fa) => {
        const _cx = ball.x, _cy = ball.y - ball.r - 26;
        const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.06;
        const R = 9.5 * pulse;
        ctx.save();
        ctx.globalAlpha = fa;

        ctx.shadowColor = '#ff5a5a';
        ctx.shadowBlur = 6 * QUALITY;
        ctx.fillStyle = '#ff4d4d';
        ctx.beginPath();
        ctx.arc(_cx, _cy, R, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(_cx, _cy, R * 0.74, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = '#ff5a5a';
        ctx.shadowBlur = 3 * QUALITY;
        ctx.fillStyle = '#ff4d4d';
        ctx.beginPath();
        ctx.arc(_cx, _cy, R * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(_cx, _cy, R * 0.29, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = '#3aa0ff';
        ctx.shadowBlur = 6 * QUALITY;
        ctx.fillStyle = '#3aa0ff';
        ctx.beginPath();
        ctx.arc(_cx, _cy, R * 0.18, 0, Math.PI * 2);
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

  // Near Miss 스파크
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
      ctx.shadowBlur = 5 * QUALITY;
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

  // VAR 판독 오버레이
  if (varChecking) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 16, 32, 0.28)';
    ctx.fillRect(0, visY0, VW, CH);

    const scanY = visY0 + (Math.sin(Date.now() * 0.0035) * 0.5 + 0.5) * CH;
    ctx.strokeStyle = _th.scanLine || '#ff9900';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10 * QUALITY;
    ctx.shadowColor = _th.scanLine || '#ff9900';
    ctx.beginPath();
    ctx.moveTo(0, scanY); ctx.lineTo(VW, scanY);
    ctx.stroke();

    const blink = Math.floor(Date.now() / 120) % 2 === 0;
    ctx.font = 'bold 22px Outfit, Noto Sans KR, sans-serif';
    ctx.fillStyle = blink ? '#ff3366' : 'rgba(255,255,255,0.75)';
    ctx.shadowBlur = 8 * QUALITY;
    ctx.shadowColor = '#ff3366';
    ctx.textAlign = 'center';
    ctx.fillText('🔍 VAR PHOTO FINISH 판독 중...', VW / 2, visY0 + 130);
    ctx.restore();
  }

  ctx.restore();

  // H. HUD 진행 바
  const barX = GAME_X_OFFSET + GAME_VWIDTH + 10;
  const barH = pinballCanvas.height - 80;
  const barY = 40;

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(barX, barY, 6, barH);

  pinballBalls.forEach(ball => {
    const prog = Math.min(1, ball.y / GOAL_Y);
    const py = barY + prog * barH;
    ctx.fillStyle = ball.color;
    ctx.shadowBlur = 4 * QUALITY; ctx.shadowColor = ball.color;
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

// ── 정지 / 리셋 ───────────────────────────────────────────────

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
  speedPadRotateTimer = 300;
  resetCamera();
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

  if (typeof setControlsEnabled === 'function') {
    setControlsEnabled(true);
  }

  const term = document.getElementById('pinball-terminal');
  if (term) term.innerHTML = '<div>> Pinball system reset. Awaiting Quantum launch prompt...</div>';
}
