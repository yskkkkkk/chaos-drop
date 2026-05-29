# CHAOS-DROP — 신규 맵 추가 가이드

## 개요

맵 파일 하나(`maps/your-map.js`)를 추가하고 두 곳만 수정하면 새 맵이 동작합니다.

---

## 1. 파일 생성

```
maps/
  classic-chaos.js   ← 기존 기본 맵
  your-map.js        ← 신규 맵 (새로 만들 파일)
```

---

## 2. 필수 구현 함수 4개

각 함수는 게임 엔진이 호출하는 **훅(hook)** 입니다.  
함수 이름은 반드시 아래와 동일해야 합니다.

### 2-1. `applyMapZonePhysics(ball)` — 맵 고유 구역 물리

`ball.js` → `RacingBall.update()` 에서 매 프레임 호출됩니다.  
공이 맵 고유 특수 구역(터널, 장벽, 레인 등)에 들어갔을 때 적용할 물리를 작성합니다.

```js
function applyMapZonePhysics(ball) {
  // 특수 구역이 없으면 빈 함수로 두어도 됩니다
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

### 2-2. `drawCurrentMapLayer(ctx, visY0, visY1)` — 맵 고유 배경 렌더링

`game.js` → `animatePinball()` 루프에서 깔때기/골인선 다음에 호출됩니다.  
터널 배경, 섬, 구역 표시 등 **이 맵에만 있는 시각 요소**를 여기서 그립니다.

```js
function drawCurrentMapLayer(ctx, visY0, visY1) {
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

### 2-3. `recoverCurrentMapIslandTunnel()` — 터널링 복구

`game.js` → `animatePinball()` 물리 블록에서 매 프레임 호출됩니다.  
공이 고체 장벽 내부로 통과(터널링)했을 때 강제로 사출하는 복구 로직입니다.  
섬/장벽이 없는 맵이라면 빈 함수를 두면 됩니다.

```js
function recoverCurrentMapIslandTunnel() {
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

### 2-4. `yourMapName_init()` — 맵 초기화

장애물 배치, 벽 프로파일 생성, 가속 레인 설정 등 **맵 시작 시 1회** 실행됩니다.  
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

## 3. game.js 수정 — 맵 브리지 교체

`game.js` 51번째 줄 `initPinballMap()` 브리지를 새 맵 init으로 변경합니다.

```js
// game.js
function initPinballMap() { yourMapName_init(); }  // ← 함수명 변경
```

---

## 4. index.html 수정 — script 태그 추가

`maps/classic-chaos.js` 태그 아래에 새 맵 태그를 추가합니다.

```html
<script src="maps/classic-chaos.js?v=1.1.0"></script>
<script src="maps/your-map.js?v=1.1.0"></script>  <!-- 추가 -->
```

> **주의**: 함수 이름(`applyMapZonePhysics`, `drawCurrentMapLayer`, `recoverCurrentMapIslandTunnel`)이  
> 두 맵에 동시에 선언되면 **나중에 로드된 파일의 함수가 앞선 것을 덮어씁니다**.  
> 현재 아키텍처는 단일 활성 맵을 전제합니다.  
> 맵 전환 기능이 필요해지면 `let currentMap = null` 변수 패턴으로 교체하면 됩니다.

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

| 상수 | 값 | 설명 |
|---|---|---|
| `GAME_VWIDTH` | 825 | 가상 보드 가로 |
| `GAME_VHEIGHT` | 3200 | 가상 보드 세로 |
| `FUNNEL_TOP_Y` | 2720 | 깔때기 시작 Y |
| `GOAL_Y` | 3120 | 골인선 Y |
| `TUNNEL_TOP_Y` | 1500 | Classic Chaos 터널 시작 Y |
| `TUNNEL_BOTTOM_Y` | 1900 | Classic Chaos 터널 종료 Y |

> `TUNNEL_*` 상수들은 Classic Chaos 맵 전용입니다.  
> 신규 맵에서 다른 Zone을 만들려면 맵 파일 내에 별도 상수를 선언하세요.

---

## 9. 최소 템플릿

```js
/**
 * maps/my-new-map.js — My New Map
 */

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
  pinballPegs = [];
  pinballSpinners = [];
  pinballBumpers = [];
  pinballPortals = [];
  pinballVortexes = [];
  pinballLaunchPads = [];
  pinballSpeedPads = [];

  pinballAccelLane = 0; // 가속 레인 없으면 0으로 고정

  // 장애물 배치
  // ...

  pinballPegs = pinballPegs.filter(() => Math.random() > 0.10);
}
```
