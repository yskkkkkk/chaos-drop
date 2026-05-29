/**
 * =================================================================
 *   CHAOS-DROP — EFFECTS MODULE
 * =================================================================
 * Near Miss 스파크, 컨페티 파티클 생성/정지
 */

function spawnNearMissSparks(x, y, color) {
  const sparkColors = [color, '#ffffff', '#ff9900', '#ff3366'];
  for (let i = 0; i < Math.max(4, Math.floor(18 * QUALITY)); i++) {
    pinballNearMissSparks.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2.5,
      r: Math.random() * 2.2 + 1.5,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      gravity: 0.08,
      life: 40 + Math.floor(Math.random() * 15),
      maxLife: 55
    });
  }
}

function triggerPinballConfetti() {
  stopPinballConfetti();
  const colors = ['#ff9900', '#8c52ff', '#00f0ff', '#ffcc00', '#ffffff'];
  pinballConfettiParticles = [];
  for (let i = 0; i < Math.max(20, Math.floor(120 * QUALITY)); i++) {
    pinballConfettiParticles.push({
      x: GAME_VWIDTH / 2 + (Math.random() - 0.5) * 400,
      y: GOAL_Y - 10,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 15 - 8,
      r: Math.random() * 5 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.28,
      friction: 0.98,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.15
    });
  }
}

function stopPinballConfetti() {
  pinballConfettiParticles = [];
}
