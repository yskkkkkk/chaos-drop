/**
 * MAP 3: Classic Pinball (Space Cadet homage)
 *
 * The classic map uses its own wall geometry instead of the generated neon
 * canyon. Coordinates are in the same virtual board space as the other maps.
 */

const CLASSIC_LAUNCH_FRAMES = 90;
const CLASSIC_LAUNCH_X = () => GAME_VWIDTH - Math.round(36 * BOARD_XSCALE);
const CLASSIC_LANE_LEFT_X = () => GAME_VWIDTH - Math.round(78 * BOARD_XSCALE);
const CLASSIC_LANE_RIGHT_X = () => GAME_VWIDTH - Math.round(8 * BOARD_XSCALE);

function classicAddWall(x1, y1, x2, y2, color, thickness = 10, bounce = 0.7) {
  pinballStaticWalls.push(new StaticWall(x1, y1, x2, y2, color, thickness, 0, bounce));
}

function classicAddCurve(startX, startY, cpX, cpY, endX, endY, segments, color, thickness = 10, bounce = 0.7) {
  let prevX = startX;
  let prevY = startY;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const inv = 1 - t;
    const x = inv * inv * startX + 2 * inv * t * cpX + t * t * endX;
    const y = inv * inv * startY + 2 * inv * t * cpY + t * t * endY;
    classicAddWall(prevX, prevY, x, y, color, thickness, bounce);
    prevX = x;
    prevY = y;
  }
}

function classic_generateWallProfile() {
  wallProfile = [];
  for (let y = 0; y <= GOAL_Y + 100; y += 25) {
    wallProfile.push({ y, lx: 0, rx: GAME_VWIDTH });
  }
  funnelLeftX = 0;
  funnelRightX = GAME_VWIDTH;
}

function classic_init() {
  classic_generateWallProfile();

  pinballPegs = [];
  pinballBumpers = [];
  pinballFlippers = [];
  pinballItems = [];
  pinballSpinners = [];
  pinballLaunchPads = [];
  pinballSpeedPads = [];
  pinballSpikeTraps = [];
  pinballVortexes = [];
  pinballPortals = [];
  pinballStaticWalls = [];

  const W = GAME_VWIDTH;
  const laneL = CLASSIC_LANE_LEFT_X();
  const laneR = CLASSIC_LANE_RIGHT_X();
  const launchX = CLASSIC_LAUNCH_X();
  const flipperY = GOAL_Y - 145;

  const metal = '#aeb4bf';
  const darkMetal = '#5a6472';
  const rubber = '#a91f2d';
  const plastic = '#70448c';
  const rail = '#d6d9df';

  // Outer cabinet and right launcher tube.
  classicAddWall(10, 380, 10, flipperY - 40, metal, 12, 0.6);
  classicAddWall(W - 10, 180, W - 10, GOAL_Y + 35, metal, 12, 0.6);
  classicAddWall(laneL, 380, laneL, GOAL_Y + 25, rail, 10, 0.55);
  classicAddWall(laneR, 190, laneR, GOAL_Y + 45, rail, 10, 0.55);

  // Top arch sends launched balls across the table and down the left side.
  classicAddCurve(laneL, 380, laneL, 70, W * 0.54, 62, 18, metal, 11, 0.62);
  classicAddCurve(W * 0.54, 62, 70, 65, 48, 390, 20, metal, 11, 0.62);
  classicAddCurve(laneR, 190, laneR, 18, W * 0.55, 16, 18, darkMetal, 8, 0.5);
  classicAddCurve(W * 0.55, 16, 35, 24, 20, 380, 20, darkMetal, 8, 0.5);

  // Purple Space Cadet style ramp area.
  classicAddWall(55, 760, 205, 475, plastic, 14, 0.55);
  classicAddCurve(205, 475, 318, 250, 112, 210, 14, plastic, 14, 0.55);
  classicAddCurve(112, 210, 20, 205, 60, 430, 10, plastic, 14, 0.55);
  classicAddWall(150, 850, 290, 530, plastic, 12, 0.55);
  classicAddCurve(290, 530, 420, 275, 155, 320, 16, plastic, 12, 0.55);
  pinballSpeedPads.push(new SpeedPad(110, 790, 78, 22, 'up'));

  // Classic tri-color bumper cluster.
  const bumperX = W * 0.53;
  pinballBumpers.push(new SuperBumper(bumperX, 420, 38, '#1f6fff'));
  pinballBumpers.push(new SuperBumper(bumperX - 88, 545, 38, '#ffd43b'));
  pinballBumpers.push(new SuperBumper(bumperX + 88, 545, 38, '#e03131'));
  pinballBumpers.push(new SuperBumper(W - 202, 310, 27, '#f0f3f8'));
  pinballBumpers.push(new SuperBumper(W - 150, 395, 27, '#f0f3f8'));

  // Inlane/outlane guides and slingshots around the lower drop zone.
  classicAddWall(80, flipperY - 250, 160, flipperY - 95, metal, 10, 0.65);
  classicAddWall(160, flipperY - 95, 260, flipperY - 28, rubber, 13, 1.15);
  classicAddWall(36, flipperY - 260, 70, flipperY - 30, metal, 9, 0.55);
  classicAddWall(70, flipperY - 30, 165, flipperY + 35, metal, 9, 0.55);

  classicAddWall(W - 165, flipperY - 250, W - 245, flipperY - 95, metal, 10, 0.65);
  classicAddWall(W - 245, flipperY - 95, W - 345, flipperY - 28, rubber, 13, 1.15);
  classicAddWall(laneL - 10, flipperY - 260, laneL - 44, flipperY - 30, metal, 9, 0.55);
  classicAddWall(laneL - 44, flipperY - 30, W - 168, flipperY + 35, metal, 9, 0.55);

  pinballFlippers.push(new AutoFlipper(270, flipperY + 12, 138, true, 12, -30, 1500));
  pinballFlippers.push(new AutoFlipper(W - 270, flipperY + 12, 138, false, 168, 210, 1500));

  pinballSpinners.push(new Spinner(bumperX, 750, 45, '#ffffff', true));
  
  for (let i = 0; i < 5; i++) {
    const isShield = Math.random() < 0.3;
    const ix = 50 + Math.random() * (W - 150);
    const iy = 750 + Math.random() * (GOAL_Y - 900);
    if (isShield) {
      pinballItems.push(new ShieldItem(ix, iy, 0));
    } else {
      pinballItems.push(new BoosterItem(ix, iy, 0));
    }
  }
}

function classic_customPreviewSpawn(idx, total) {
  const spacing = Math.min(32, Math.max(20, 280 / Math.max(1, total)));
  return {
    x: CLASSIC_LAUNCH_X() + (idx % 2 === 0 ? -4 : 4),
    y: GOAL_Y - 55 - (total - 1 - idx) * spacing
  };
}

function classic_customLaunch(balls) {
  const startY = GOAL_Y - 55;
  balls.forEach((ball, idx) => {
    ball.x = CLASSIC_LAUNCH_X() + (idx % 2 === 0 ? -3 : 3);
    ball.y = startY - idx * 26;
    ball.vx = 0;
    ball.vy = 0;
    ball.isLaunching = false;
  });
  return CLASSIC_LAUNCH_FRAMES;
}

function classic_drawLayer(ctx, visY0, visY1) {
  const W = GAME_VWIDTH;
  const laneL = CLASSIC_LANE_LEFT_X();
  const launchX = CLASSIC_LAUNCH_X();
  const flipperY = GOAL_Y - 145;

  ctx.save();
  ctx.fillStyle = '#050710';
  ctx.fillRect(0, visY0, W, visY1 - visY0);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (let i = 0; i < 90; i++) {
    const x = (i * 73 + 19) % W;
    const y = (i * 191 + 37) % GAME_VHEIGHT;
    if (y >= visY0 && y <= visY1) ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }

  ctx.fillStyle = '#10182d';
  ctx.fillRect(24, 130, W - 58, GOAL_Y - 80);

  ctx.fillStyle = '#302049';
  ctx.beginPath();
  ctx.moveTo(62, 765);
  ctx.lineTo(208, 480);
  ctx.quadraticCurveTo(322, 250, 114, 212);
  ctx.quadraticCurveTo(25, 205, 62, 430);
  ctx.lineTo(152, 850);
  ctx.quadraticCurveTo(420, 280, 158, 322);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7d1d28';
  ctx.beginPath();
  ctx.moveTo(96, flipperY - 230);
  ctx.lineTo(160, flipperY - 95);
  ctx.lineTo(254, flipperY - 30);
  ctx.lineTo(196, flipperY - 15);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(W - 196, flipperY - 230);
  ctx.lineTo(W - 244, flipperY - 95);
  ctx.lineTo(W - 338, flipperY - 30);
  ctx.lineTo(W - 284, flipperY - 15);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#141922';
  ctx.fillRect(laneL + 8, visY0, W - laneL - 20, visY1 - visY0);

  const charging = pinballLaunchState === 1;
  const progress = charging ? 1 - pinballLaunchTimer / CLASSIC_LAUNCH_FRAMES : 0;
  const pullDown = progress * 112;
  const springTop = GOAL_Y + 36 + pullDown;
  const springBottom = GOAL_Y + 205;

  if (visY1 > GOAL_Y - 120) {
    ctx.strokeStyle = '#8b929c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(launchX, springBottom);
    for (let y = springBottom; y >= springTop; y -= 10) {
      const zig = Math.floor((springBottom - y) / 10) % 2 === 0 ? -11 : 11;
      ctx.lineTo(launchX + zig, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#9b1c1c';
    ctx.fillRect(launchX - 22, springTop - 18, 44, 18);
    ctx.fillStyle = '#d6d9df';
    ctx.fillRect(launchX - 6, springBottom, 12, 120);
  }

  ctx.restore();
}

MAPS['classic'] = {
  label: 'Classic',
  cameraStartY: Math.max(0, GOAL_Y - 650),
  init: classic_init,
  customPreviewSpawn: classic_customPreviewSpawn,
  customLaunch: classic_customLaunch,
  drawLayer: classic_drawLayer,
  theme: {
    uiClass: 'theme-classic',
    bgClear: '#050710',
    bgFrom: '#050710',
    bgTo: '#030408',
    wallFill: '#050710',
    wallStroke: 'transparent',
    wallGlow: 'transparent',
    funnelStroke: 'transparent',
    funnelColor: 'transparent',
    goalFill: 'rgba(12, 14, 20, 0.75)',
    goalStroke: '#333b46',
    scanLine: '#d6d9df',
  },
};
