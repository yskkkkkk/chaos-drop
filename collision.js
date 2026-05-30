/**
 * =================================================================
 *   CHAOS-DROP — COLLISION MODULE
 * =================================================================
 * 벽 보간 유틸, 선분-원 충돌 헬퍼, 장애물 충돌 해소 루프
 */

// 맵 초기화 후 1회 호출 — 핀은 정적 장애물이므로 Y 기준 정렬 유지
function sortPegsForCollision() {
  pinballPegs.sort((a, b) => a.y - b.y);
}

// pinballPegs[idx].y >= targetY 인 첫 번째 인덱스 (이진 탐색)
function _pegLowerBound(targetY) {
  let lo = 0, hi = pinballPegs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pinballPegs[mid].y < targetY) lo = mid + 1;
    else hi = mid;
  }
  return lo;
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

    ball.x = closestX + nx * ball.r;
    ball.y = closestY + ny * ball.r;

    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= (1 + ball.restitution) * vn * nx;
      ball.vy -= (1 + ball.restitution) * vn * ny;
      ball.vx += nx * 0.15;
      ball.vy += ny * 0.15;
    }
  }
}

function resolveObstacleCollisions() {
  const _dbSorted = pinballBalls.filter(b => !b.isFinished).sort((a, b) => b.y - a.y);
  const _dbCut = Math.max(1, Math.ceil(_dbSorted.length * 0.3));
  const _leaderSet = new Set(_dbSorted.slice(0, _dbCut).map(b => b.id));

  pinballBalls.forEach(ball => {
    if (ball.isFinished) return;
    const by = ball.y;

    const _ballSpeed = Math.hypot(ball.vx, ball.vy);
    const _pegStart = _pegLowerBound(by - 60);
    for (let _pi = _pegStart; _pi < pinballPegs.length && pinballPegs[_pi].y <= by + 60; _pi++) {
      const peg = pinballPegs[_pi];

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
          if (spin.angularVelocity > 0.25) spin.angularVelocity = 0.25;
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
          ball.vx = (ball.vx - 3.5*dot*nx) + (Math.random()-0.5)*6 + nx * 4.5;
          ball.vy = (ball.vy - 3.5*dot*ny) + ny * 4.5;
          const _bspd = Math.hypot(ball.vx, ball.vy);
          if (_bspd > 14) { ball.vx = ball.vx / _bspd * 14; ball.vy = ball.vy / _bspd * 14; }
          bump.trigger();
        }
      }
    }

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

        const isBottomGreen = lp.color === '#33ff57' && lp.y > 3000;
        const bounceFactor = isBottomGreen ? (0.5 + Math.random() * 1.0) : 1.0;
        const speed = Math.max(8, Math.hypot(ball.vx, ball.vy) * 1.1 + 7) * bounceFactor;

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

    for (const vort of pinballVortexes) {
      if (Math.hypot(ball.x - vort.x, ball.y - vort.y) < vort.r + ball.r) {
        const _vMult = _leaderSet.has(ball.id) ? 1.8 : 1.0;
        ball.vy -= ball.gravity * 0.425;
        ball.vx *= (1 - 0.03 * _vMult);
        ball.vy *= (1 - 0.03 * _vMult);
      }
    }

    if (ball.y > GAME_VHEIGHT * 0.80) {
      const _decelT = Math.min(1, (ball.y - GAME_VHEIGHT * 0.80) / (GOAL_Y - GAME_VHEIGHT * 0.80));
      ball.vx *= (1 - _decelT * 0.10);
      ball.vy *= (1 - _decelT * 0.10);
    }

    if (_leaderSet.has(ball.id)) {
      ball.vx *= 0.992;
      ball.vy *= 0.992;
    }

    for (const pad of pinballSpeedPads) {
      if (Math.abs(ball.x - pad.x) < pad.w/2 + ball.r &&
          Math.abs(ball.y - pad.y) < pad.h/2 + ball.r) {

        if (pad.direction === 'down') {
          ball.vy += 0.48;
          ball.vx *= 1.01;
        } else if (pad.direction === 'up') {
          ball.vy -= 0.38;
        } else if (pad.direction === 'left') {
          ball.vx -= 0.45;
        } else if (pad.direction === 'right') {
          ball.vx += 0.45;
        }

        ball.superChargeTimer = Math.max(ball.superChargeTimer, 20);
      }
    }

    for (const item of pinballItems) {
      if (item.state !== 'active') continue;
      const dx = ball.x - item.x, dy = ball.y - item.y;
      if (dx * dx + dy * dy < (ball.r + item.r) * (ball.r + item.r)) {
        item.collect();
        spawnNearMissSparks(item.x, item.y, item.type === 'shield' ? '#00ccff' : '#ffaa00');
        if (item.type === 'shield') {
          ball.shieldTimer = 600;
          ball.shieldActive = true;
          if (typeof pinballLog === 'function') pinballLog(`🛡 ${ball.name} 실드 획득! (10초)`);
        } else {
          if (!ball.boosterActive) {
            ball.vx *= 1.5;
            ball.vy *= 1.5;
          }
          ball.boosterTimer = 300;
          ball.boosterActive = true;
          if (typeof pinballLog === 'function') pinballLog(`⚡ ${ball.name} 부스터 획득! (5초)`);
        }
      }
    }

    if (ball.immuneTimer > 0) { ball.immuneTimer--; }
    else {
      for (const bar of pinballSpikeTraps) {
        if (bar.currentLen < 8) continue;
        if (Math.abs(ball.y - bar.y) > ball.r + bar.h * 0.5 + 2) continue;

        const wBounds = getWallAtY(bar.y);
        const dynamicWallX = bar.dirMult === -1 ? wBounds.rx : wBounds.lx;
        const bx1 = bar.dirMult === -1 ? dynamicWallX - bar.currentLen : dynamicWallX;
        const bx2 = bar.dirMult === -1 ? dynamicWallX : dynamicWallX + bar.currentLen;
        const by1 = bar.y - bar.h * 0.5;
        const by2 = bar.y + bar.h * 0.5;

        const nearX = Math.max(bx1, Math.min(ball.x, bx2));
        const nearY = Math.max(by1, Math.min(ball.y, by2));
        const dx = ball.x - nearX, dy = ball.y - nearY;

        if (dx * dx + dy * dy < ball.r * ball.r) {
          if (ball.shieldActive) {
            ball.shieldActive = false;
            ball.shieldTimer = 0;
            ball.immuneTimer = 60;
            spawnNearMissSparks(ball.x, ball.y, '#00ccff');
            if (typeof pinballLog === 'function') pinballLog(`🛡 ${ball.name} 실드 방어!`);
          } else {
            spawnNearMissSparks(ball.x, ball.y, '#ff3300');
            ball.x = GAME_VWIDTH * 0.5 + (Math.random() - 0.5) * 140;
            ball.y = bar.spawnY + (Math.random() - 0.5) * 20;
            ball.vx = (Math.random() - 0.5) * 1;
            ball.vy = 0.2;
            ball.immuneTimer = 40;
            spawnNearMissSparks(ball.x, ball.y, '#00ff99');
            if (typeof pinballLog === 'function') pinballLog(`💀 ${ball.name} 창살 소멸 → 리스폰!`);
          }
          break;
        }
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
