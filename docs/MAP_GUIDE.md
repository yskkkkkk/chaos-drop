# CHAOS-DROP — 신규 맵 추가 가이드

## 개요

맵 파일 하나(`maps/your-map.js`)를 추가하고 두 곳만 수정하면 새 맵이 동작합니다.

---

## 1. 파일 생성

```
maps/
  neon.js   ← 기존 기본 맵
  your-map.js        ← 신규 맵 (새로 만들 파일)
```

---

## 2. 필수 구현 훅 4개 및 레지스트리 등록

각 함수는 게임 엔진이 런타임에 동적으로 호출하는 **훅(hook)** 입니다. 
여러 맵이 동시에 로드되므로 함수 이름이 충돌하지 않도록 고유한 접두사(예: `_yourMapName_`)를 붙여 작성하고, 파일 하단에서 **`MAPS['your-map-id']` 객체에 등록**해야 합니다.

### 2-1. `applyPhysics(ball)` — 맵 고유 구역 물리

공이 맵 고유 특수 구역(터널, 장벽, 레인 등)에 들어갔을 때 적용할 물리를 작성합니다. `ball.js` → `RacingBall.update()` 에서 매 프레임 호출됩니다.

```js
function _yourMapName_applyPhysics(ball) {
  // 특수 구역이 없으면 빈 함수로 두거나 훅 등록 시 생략 가능합니다
  if (ball.y < MY_ZONE_TOP || ball.y > MY_ZONE_BOTTOM) return;

  // collideBallWithSegment: collision.js 제공 선분-원 충돌 헬퍼
  collideBallWithSegment(ball, x1, y1, x2, y2);

  // 레인 가속/감속 예시
  ball.vy += 0.5;
}
```

**파라미터** | 설명
--- | ---
`ball` | 현재 처리 중인 `RacingBall` 인스턴스

---

### 2-2. `drawLayer(ctx, visY0, visY1)` — 맵 고유 배경 렌더링

`game.js` → `animatePinball()` 루프에서 깔때기/골인선 다음에 호출됩니다.  
터널 배경, 섬, 구역 표시 등 **이 맵에만 있는 시각 요소**를 여기서 그립니다.

```js
function _yourMapName_drawLayer(ctx, visY0, visY1) {
  // 뷰포트 밖이면 스킵 (성능 최적화)
  if (visY1 < MY_ZONE_TOP || visY0 > MY_ZONE_BOTTOM) return;

  ctx.save();
  // ... canvas 드로잉 ...
  ctx.restore();
}
```

**파라미터** | 설명
--- | ---
`ctx` | `CanvasRenderingContext2D`
`visY0` | 현재 카메라 상단 Y (= `cameraY`)
`visY1` | 현재 카메라 하단 Y (= `cameraY + canvas.height`)

> ctx는 이미 `translate(GAME_X_OFFSET, -cameraY)` 변환이 적용된 상태입니다.  
> 가상 좌표계(0 ~ GAME_VWIDTH × 0 ~ GAME_VHEIGHT)로 그리면 됩니다.

---

### 2-3. `recoverTunnel()` — 터널링 복구

`game.js` → `animatePinball()` 물리 블록에서 매 프레임 호출됩니다.  
공이 고체 장벽 내부로 통과(터널링)했을 때 강제로 사출하는 복구 로직입니다.  
섬/장벽이 없는 맵이라면 빈 함수로 두거나 훅 등록 시 생략 가능합니다.

```js
function _yourMapName_recoverTunnel() {
  pinballBalls.forEach(ball => {
    if (ball.isFinished) return;
    // 장벽 침범 감지 → 강제 사출
    if (Math.abs(ball.x - ISLAND_CX) < halfW) {
      ball.x = ISLAND_CX + halfW + ball.r + 2;
      ball.vx = Math.abs(ball.vx) + 2.5;
    }
  });
}
```

---

### 2-4. `init()` — 맵 초기화

장애물 배치, 벽 프로파일 생성, 가속 레인 설정 등 **맵 선택 및 시작 시 1회** 실행됩니다.  
`game.js`의 `initPinballMap()`이 이 함수를 호출합니다.

```js
function yourMapName_init() {
  // 벽 프로파일 생성 (필수)
  yourMapName_generateWallProfile();

  // 장애물 배열 초기화 (필수)
  pinballPegs = [];
  pinballSpinners = [];
  pinballBumpers = [];
  pinballPortals = [];
  pinballVortexes = [];
  pinballLaunchPads = [];
  pinballSpeedPads = [];

  // 장애물 배치
  pinballPegs.push(new Peg(x, y, 5));
  pinballBumpers.push(new SuperBumper(x, y, 20, '#ff9900'));
  // ...

  // 핀 랜덤 제거 (선택, 권장)
  pinballPegs = pinballPegs.filter(() => Math.random() > 0.10);
}
```

---

### 2-5. 맵 레지스트리 등록 (중요)

파일 최하단에 다음 형식으로 글로벌 `MAPS` 객체에 맵 정보를 등록해야 엔진이 인식할 수 있습니다.

```js
MAPS['your-map-id'] = {
  label:         '🏝️ 맵 표시 이름',
  init:          yourMapName_init,
  applyPhysics:  _yourMapName_applyPhysics, // (선택)
  drawLayer:     _yourMapName_drawLayer,     // (선택)
  recoverTunnel: _yourMapName_recoverTunnel, // (선택)
  theme: {
    uiClass:      'theme-your-map',          // body에 지정할 CSS 클래스
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
```

---

## 3. game.js 수정 — 필요 없음

맵 레지스트리 자동화가 되어 있어 `game.js`는 수정할 필요가 없습니다. `game.js` 내의 `switchMap` 기능이 등록된 `MAPS['your-map-id']`를 찾아 필요한 훅을 자동으로 대리 실행합니다.

---

## 4. index.html 수정 — script 태그 및 맵 버튼 추가

### 4-1. script 태그 추가
`maps/neon.js` 태그 아래에 새 맵 스크립트를 로드하도록 추가합니다.

```html
<script src="maps/neon.js?v=1.1.0"></script>
<script src="maps/your-map.js?v=1.1.0"></script>  <!-- 추가 -->
```

### 4-2. UI 선택 버튼 추가
`index.html` 내의 `.map-segment` 컨테이너에 새 맵으로 전환하기 위한 버튼을 추가합니다. 버튼의 `data-map` 속성값은 레지스트리에 등록한 `your-map-id`와 정확히 일치해야 합니다.

```html
<div class="map-segment" role="tablist" aria-label="맵 선택">
  <button type="button" class="map-seg-btn active" data-map="neon" role="tab" aria-selected="true">🌀 Neon</button>
  <button type="button" class="map-seg-btn" data-map="canyon" role="tab" aria-selected="false">⛰️ Canyon</button>
  <button type="button" class="map-seg-btn" data-map="your-map-id" role="tab" aria-selected="false">🏝️ Your Map</button> <!-- 추가 -->
</div>
```

---

## 5. 사용 가능한 전역 변수 (game.js 선언)

### 게임 상태
| 변수 | 타입 | 설명 |
|---|---|---|
| `pinballBalls` | `RacingBall[]` | 전체 구슬 배열 |
| `pinballGameRunning` | `boolean` | 레이스 진행 중 여부 |
| `pinballAccelLane` | `number` | 가속 레인 인덱스 (0·1·2) |
| `wallProfile` | `{y,lx,rx}[]` | 가변 벽 프로파일 |
| `funnelLeftX` / `funnelRightX` | `number` | 깔때기 시작 X 좌표 |
| `freezeModeEnabled` | `boolean` | Freeze Mode 활성 여부 |

### 장애물 배열 (init에서 채워야 함)
| 변수 | 담는 클래스 |
|---|---|
| `pinballPegs` | `Peg` |
| `pinballSpinners` | `Spinner` |
| `pinballBumpers` | `SuperBumper` |
| `pinballPortals` | `TeleportPortal` |
| `pinballVortexes` | `SlowVortex` |
| `pinballLaunchPads` | `LaunchPad` |
| `pinballSpeedPads` | `SpeedPad` |

### 카메라 (camera.js 선언)
| 변수 | 설명 |
|---|---|
| `cameraY` | 카메라 Y 스크롤 값 |
| `camDramaTarget` | 드라마 줌인 대상 구슬 (`null` 가능) |
| `camDramaTimer` | 드라마 지속 프레임 수 |

---

## 6. 사용 가능한 유틸 함수

| 함수 | 파일 | 설명 |
|---|---|---|
| `getWallAtY(y)` | collision.js | Y좌표의 `{lx, rx}` 벽 경계 반환 |
| `collideBallWithSegment(ball, x1,y1, x2,y2)` | collision.js | 선분-원 충돌 반사 처리 |
| `pinballLog(msg)` | ui.js | 터미널 로그 출력 |
| `spawnNearMissSparks(x, y, color)` | effects.js | Near Miss 스파크 생성 |

---

## 7. 사용 가능한 장애물 클래스 (entities.js)

```js
new Peg(x, y, radius)
new Spinner(x, y, bladeRadius, color)
new SuperBumper(x, y, radius, color)
new SlowVortex(x, y, radius, color)
new SpeedPad(x, y, width, height, direction?)  // direction: 'up'|'down'|'left'|'right'
new LaunchPad(x, y, width, color, angle?, slideSpeed?, slideRange?)
new TeleportPortal(x1, y1, x2, y2, color, name)
```

---

## 8. 게임판 주요 상수 (constants.js)

| 상수 | 데스크탑 | 모바일 | 설명 |
|---|---|---|---|
| `BOARD_XSCALE` | `1.0` | `screen.width / 825` | 모바일 물리 보드 폭 스케일 계수 |
| `GAME_VWIDTH` | `825` | `round(825 × BOARD_XSCALE)` | 가상 보드 가로 (모바일에서는 화면 폭) |
| `GAME_VHEIGHT` | `3200` | `3200` | 가상 보드 세로 (고정) |
| `FUNNEL_TOP_Y` | `2720` | `2720` | 깔때기 시작 Y |
| `GOAL_Y` | `3120` | `3120` | 골인선 Y |
| `FUNNEL_BOTTOM_X` | `311` | `round(311 × xs)` | 깔때기 하단 좌측 제한 X |
| `TUNNEL_TOP_Y` | `1500` | `1500` | Neon Chaos 터널 시작 Y |
| `TUNNEL_BOTTOM_Y` | `1900` | `1900` | Neon Chaos 터널 종료 Y |

> Y 좌표 관련 상수(GOAL_Y, FUNNEL_TOP_Y 등)는 스케일하지 않습니다.  
> `TUNNEL_*` 상수들은 Neon Chaos 맵 전용입니다.  
> 신규 맵에서 다른 Zone을 만들려면 맵 파일 내에 별도 상수를 선언하세요.

---

## 9. 모바일 보드폭 스케일링 규칙 (필수)

모바일에서는 가상 물리 공간이 화면 폭에 맞춰 축소됩니다.  
새 맵 파일에서 **X 좌표에 하드코딩된 픽셀값**은 반드시 `BOARD_XSCALE`을 곱해야 합니다.

### 9-1. 기본 원칙

```
Y 좌표  →  스케일 없음 (보드 세로는 항상 3200px 고정)
X 좌표  →  BOARD_XSCALE 적용 필수
```

### 9-2. `xs()` 헬퍼 — 신규 맵 파일 내 선언 패턴

각 맵의 init 함수 상단에 헬퍼를 선언합니다:

```js
function myNewMap_init() {
  const W  = GAME_VWIDTH;        // 이미 스케일된 값
  const cx = W / 2;              // 보드 중앙 X
  const xs = v => Math.round(v * BOARD_XSCALE); // x 스케일 헬퍼

  // ✅ 올바른 사용
  const MY_WALL_NARROW = xs(200);        // 200px → 모바일 비례 축소
  const lx = xs(30) + Math.random() * xs(150);

  // ✅ 이미 스케일된 상수 — 그대로 사용
  const tunnelCX = (TUNNEL_LEFT_X + TUNNEL_RIGHT_X) / 2;

  // ❌ 잘못된 사용
  const MY_WALL_NARROW = 200;            // 모바일에서 잘못된 위치
}
```

### 9-3. 자동으로 스케일되는 것 (별도 작업 불필요)

| 항목 | 이유 |
|---|---|
| `GAME_VWIDTH` | constants.js에서 이미 스케일됨 |
| `FUNNEL_BOTTOM_X` | constants.js에서 이미 스케일됨 |
| `TUNNEL_LEFT/RIGHT_X`, `TUNNEL_BARRIER1/2_X` | constants.js에서 이미 스케일됨 |
| 벽 프로파일 `rx = GAME_VWIDTH - (...)` | GAME_VWIDTH가 스케일되므로 자동 |
| 공 시작 X (`spacing = GAME_VWIDTH / (n+1)`) | GAME_VWIDTH 기반 → 자동 |
| 깔때기 speed-pad / launch-pad X | `funnelLeftX`, `funnelRightX` 기반 → 자동 |

### 9-4. 직접 `xs()` 로 감싸야 하는 것

| 항목 | 예시 |
|---|---|
| 맵 파일에서 새로 선언하는 x 전용 상수 | `const MY_NARROW = xs(210)` |
| 벽 생성 랜덤 오프셋 | `xs(10) + Math.random() * xs(180)` |
| 최소 통로 폭 | `lx + xs(300)` |
| 충돌 섬의 좌우 꼭짓점 x | `xs(295), xs(355)` (또는 `B1C ± xs(30)`) |
| 터널 레인폭 하드코딩 | `xs(115)` 또는 도출식 권장 |
| `tryPlaceGimmick` x 기준값 | `tryPlaceGimmick(y, yr, r, xs(185), xs(60), ...)` |

### 9-5. 데스크탑 영향 없음 확인

`BOARD_XSCALE = 1.0` (데스크탑)이므로:

```js
xs(300) === Math.round(300 * 1.0) === 300  // 완전히 동일
```

기존 데스크탑 렌더링·물리는 변경되지 않습니다.

---

## 10. 최소 템플릿

```js
/**
 * maps/my-new-map.js — My New Map
 */

// ── 맵 전용 x 상수 (BOARD_XSCALE 필수 적용) ──────────────────
// Y 관련 상수는 스케일 없이 선언합니다
const MY_ZONE_TOP    = 800;
const MY_ZONE_BOTTOM = 1200;
const MY_WALL_NARROW = Math.round(180 * BOARD_XSCALE); // ← xs() 대신 직접 표기도 무방

function myNewMap_generateWallProfile() {
  wallProfile = [];
  wallProfile.push({ y: 0,      lx: 0, rx: GAME_VWIDTH });
  wallProfile.push({ y: GOAL_Y, lx: FUNNEL_BOTTOM_X, rx: GAME_VWIDTH - FUNNEL_BOTTOM_X });
  funnelLeftX  = 0;
  funnelRightX = GAME_VWIDTH;
}

function applyMapZonePhysics(ball) {
  // 특수 구역 없음
}

function drawCurrentMapLayer(ctx, visY0, visY1) {
  // 맵 고유 배경 없음
}

function recoverCurrentMapIslandTunnel() {
  // 고체 섬 없음
}

function myNewMap_init() {
  myNewMap_generateWallProfile();

  const W  = GAME_VWIDTH;          // 이미 스케일된 보드 폭
  const cx = W / 2;                // 보드 중앙 X
  const xs = v => Math.round(v * BOARD_XSCALE); // x 스케일 헬퍼

  pinballPegs = [];
  pinballSpinners = [];
  pinballBumpers = [];
  pinballPortals = [];
  pinballVortexes = [];
  pinballLaunchPads = [];
  pinballSpeedPads = [];

  pinballAccelLane = 0;

  // 장애물 배치 — x 좌표는 항상 xs() 또는 cx 사용
  pinballBumpers.push(new SuperBumper(cx,       500, 20, '#ff9900')); // 중앙
  pinballBumpers.push(new SuperBumper(xs(180),  700, 18, '#00f0ff')); // 좌측
  pinballBumpers.push(new SuperBumper(xs(645),  700, 18, '#00f0ff')); // 우측

  pinballPegs = pinballPegs.filter(() => Math.random() > 0.10);
}
```

---

## 11. 현재 등록된 공식 맵 목록 및 특징

### 11-1. Map 1: Neon Chaos (`neon.js`)
- **컨셉**: 중앙 집중형 함정과 직선 주로를 중심으로 구성된 기본 맵
- **특징**:
  - `SlowVortex` (느려지는 블랙홀 함정) 사용
  - 중앙에 커다란 고체 장벽(Island Tunnel) 존재
  - 좌/우 좁은 우회로(터널) 존재

### 11-2. Map 2: Zigzag Canyon (`canyon.js`)
- **컨셉**: 울퉁불퉁한 바위 협곡과 거센 강물을 타고 내려오는 래프팅
- **특징**:
  - 기존의 보이지 않는 직선 물리벽(`wallProfile`) 자체를 S자 커브와 고주파 노이즈로 변형시켜, 네온 이펙트 렌더러가 거친 협곡 바위 지형을 그리도록 만듦 (`_zc_recoverTunnel` 후킹).
  - 벽면이 다가와서 구슬을 밀어낼 때 즉사시키지 않고 통통 튕겨내며 중앙으로 몰아넣음.
  - 최하단 4구간에는 역류 물길 타이머가 엇갈려 작동하며, 위로 치솟는 물결 효과와 함께 구슬을 상단으로 튕겨냄 (`_zc_applyPhysics` vy 감소).
  - 직선형 깔때기와 결승선을 숨기고 노이즈가 들어간 자연스러운 지그재그 피니시 라인을 사용.
  - 위험/예외 요소 방지: 협곡 폭이 극도로 좁아져도 화면 밖(0 이하 또는 GAME_VWIDTH 이상)으로 벽면 좌표가 나가지 않도록 `Math.max(0)`, `Math.min(W)` 안전장치(Clamping)가 완벽히 적용되어 구슬 탈출 위험이 없음.
