/**
 * =================================================================
 *   CHAOS-DROP NEON PINBALL SYSTEM - PHYSICS MODULE
 * =================================================================
 * 벽 프로파일 생성, 충돌 헬퍼, 장애물 충돌 해소 루프를 담당합니다.
 */

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

// E-2. 장애물 충돌 해소 루프 (핀/스피너/범퍼/발사대/포탈/와류/가속패드/벽)
// animatePinball에서 shouldRunPhysics가 true일 때만 호출
function resolveObstacleCollisions() {
  // 선두 디버프 순위 세트 산출 (상위 30%)
  const _dbSorted = pinballBalls.filter(b => !b.isFinished).sort((a, b) => b.y - a.y);
  const _dbCut = Math.max(1, Math.ceil(_dbSorted.length * 0.3));
  const _leaderSet = new Set(_dbSorted.slice(0, _dbCut).map(b => b.id));

  pinballBalls.forEach(ball => {
    if (ball.isFinished) return;
    const by = ball.y;

    const _ballSpeed = Math.hypot(ball.vx, ball.vy);
    for (const peg of pinballPegs) {
      if (peg.y < by - 60 || peg.y > by + 60) continue;

      // 서브스텝: speed > 14 시 이동 중간 위치도 검사하여 터널링 방지
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
