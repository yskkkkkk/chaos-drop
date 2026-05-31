/**
 * physics.js — 이 파일은 모듈 분리로 대체되었습니다.
 *
 * 기존 내용이 이동된 위치:
 *   spawnNearMissSparks     → effects.js
/**
 * physics.js — 이 파일은 모듈 분리로 대체되었습니다.
 *
 * 기존 내용이 이동된 위치:
 *   spawnNearMissSparks     → effects.js
 *   generateWallProfile     (맵 전용 벽 생성) -> maps/neon.js  (neon_generateWallProfile)
 *   getWallAtY              → collision.js
 *   collideBallWithSegment  → collision.js
 *   resolveObstacleCollisions → collision.js
 */

function applyPinballPhysics(ball) {
  const dt = 1;

  if (ball.isLaunching) {
    if (ball.vy >= 0) ball.isLaunching = false;
  }

  const gravity = ball.isLaunching ? 0 : 0.6;
  ball.vy += gravity;

  const terminalVelocity = ball.isLaunching ? 70 : 38;
  const horizontalLimit = ball.isLaunching ? 15 : 25;
  ball.vy = Math.min(ball.vy, terminalVelocity);
  ball.vx = Math.max(-horizontalLimit, Math.min(horizontalLimit, ball.vx));

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  
  if (ball.vx > 0) {
    ball.vx -= 0.02;
    if (ball.vx < 0) ball.vx = 0;
  } else if (ball.vx < 0) {
    ball.vx += 0.02;
    if (ball.vx > 0) ball.vx = 0;
  }
}
