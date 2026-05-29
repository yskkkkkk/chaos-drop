/**
 * =================================================================
 *   CHAOS-DROP — CAMERA MODULE
 * =================================================================
 * 카메라 상태 변수 및 프레임별 카메라 업데이트 로직을 담당합니다.
 *
 * ── 출구 줌인 시스템 (Exit Zoom) ─────────────────────────────
 *
 * 공통 조건
 *   - 레이스 시작 후 10초 이상 경과한 경우에만 발동
 *   - 발동 시 GOAL_Y 기준 2배 줌인 + 카메라 Y 스냅, 4초간 유지
 *   - 유지 중 VAR·Near-miss 드라마 컷은 억제됨
 *   - 완주자 발생마다 재발동 가능 (타이머 리셋)
 *
 * 모드별 발동 규칙
 *   선착순 (winCount = 1)
 *     리더 구슬이 GOAL_Y 100px 이내 진입 시 1회 발동 (거리 기반, game.js)
 *
 *   선착순 (winCount ≥ 2)
 *     완주자 수가 ceil(winCount/2) 이상이 되는 시점부터
 *     이후 매 완주자 발생마다 재발동 (race.js)
 *
 *   후착순
 *     미완주 인원이 winCount×2 이하가 되는 순간부터
 *     이후 매 완주자 발생마다 재발동 (race.js)
 *
 *   특정 n등 (n = 1)
 *     선착순 1명과 동일 — 리더가 GOAL_Y 100px 이내 진입 시 (game.js)
 *
 *   특정 n등 (n ≥ 2)
 *     n-1등 완주 시점에 1회 발동 (race.js)
 * ─────────────────────────────────────────────────────────────
 */

// ── 카메라 상태 변수 ──────────────────────────────────────
let cameraY = 0;            // 뷰포트 종스크롤 카메라 Y좌표
let cameraZoom = 1.0;       // 현재 줌 배율
let cameraZoomTarget = 1.0; // 목표 줌 배율 (스프링 목표)
let cameraZoomVel = 0;      // 줌 스프링 속도 (단일 연속 시스템)
let camDramaTimer = 0;      // 드라마 컷 잔여 프레임 (VAR·Near-miss 전용)
let camDramaTarget = null;  // 드라마 컷 포커스 구슬
let camFocusBall = null;    // (예약)
let camFocusCooldown = 0;   // (예약)
let exitZoomTimer = 0;           // 출구 줌인 잔여 프레임 (240 = 4초 @ 60fps)
let exitZoomLeaderTriggered = false; // 거리 기반 트리거 중복 방지

function resetCamera() {
  cameraY = 0;
  cameraZoom = 1.0;
  cameraZoomTarget = 1.0;
  cameraZoomVel = 0;
  camDramaTimer = 0;
  camDramaTarget = null;
  camFocusBall = null;
  camFocusCooldown = 0;
  exitZoomTimer = 0;
  exitZoomLeaderTriggered = false;
}

// 출구 줌인 발동 — 게임 시작 10초 이후부터 유효
function triggerExitZoom() {
  if (Date.now() - raceStartTime < 10000) return;
  exitZoomTimer = 240;
}

// 프레임당 1회 호출: 카메라 위치 및 줌 업데이트
function updateCamera(activeBalls, CH, VH) {
  if (activeBalls.length > 0 && pinballGameRunning) {

    // 출구 줌인 타이머 감소
    if (exitZoomTimer > 0) exitZoomTimer--;

    // VAR·Near-miss 드라마 컷 타이머
    if (camDramaTimer > 0) { camDramaTimer--; if (camDramaTimer === 0) camDramaTarget = null; }

    const _camSorted = [...activeBalls].sort((a, b) => b.y - a.y);
    const _anyInFunnel = activeBalls.some(b => b.y > FUNNEL_TOP_Y);
    if (_anyInFunnel) { camDramaTimer = 0; camDramaTarget = null; }

    // Multi-target framing: 모드별 카메라 대상 공 배열
    let _camTargets;
    if (camDramaTarget) {
      _camTargets = [camDramaTarget];
    } else if (_anyInFunnel) {
      _camTargets = [_camSorted[0]];
    } else if (currentRule === 'first') {
      _camTargets = _camSorted.slice(0, Math.min(3, _camSorted.length));
    } else if (currentRule === 'last') {
      const _keepCount = winCount + 2;
      _camTargets = _camSorted.slice(Math.max(0, _camSorted.length - _keepCount));
      if (_camTargets.length === 0) _camTargets = [_camSorted[_camSorted.length - 1]];
    } else {
      const _tIdx = Math.min(specificRank - 1, _camSorted.length - 1);
      _camTargets = _camSorted.slice(Math.max(0, _tIdx - 2), Math.min(_camSorted.length, _tIdx + 3));
    }

    const _tMinY = Math.min(..._camTargets.map(b => b.y));
    const _tMaxY = Math.max(..._camTargets.map(b => b.y));
    const _tCenterY = (_tMinY + _tMaxY) / 2;
    const _spreadY = _tMaxY - _tMinY;

    // ── 줌: 단일 스프링 (k=0.007, d=0.85) ──────────────────
    // target만 상태에 따라 바뀌고, 스프링은 연속으로 동작.
    // 줌인·줌아웃 모두 같은 물리 — 경계에서 속도 점프 없음.
    if (exitZoomTimer > 0) {
      cameraZoomTarget = 2.0;
    } else if (_anyInFunnel) {
      cameraZoomTarget = 1.05;
    } else {
      cameraZoomTarget = Math.max(1.0, Math.min(1.03, 1.03 - _spreadY * 0.0001));
    }
    cameraZoomVel += (cameraZoomTarget - cameraZoom) * 0.007;
    cameraZoomVel *= 0.85;
    cameraZoomVel = Math.max(-0.08, Math.min(0.08, cameraZoomVel));
    cameraZoom += cameraZoomVel;
    cameraZoom = Math.max(1.0, cameraZoom);

    // ── 카메라 Y ─────────────────────────────────────────────
    const _goalCamY = Math.max(0, GOAL_Y - CH * 0.7);
    const _ballCamY = Math.max(0, Math.min(_tCenterY - CH / 2, VH - CH));

    if (exitZoomTimer > 0) {
      // 줌인 중: GOAL_Y로 빠르게 스냅
      cameraY += (_goalCamY - cameraY) * 0.08;
    } else if (cameraZoom > 1.1) {
      // 줌아웃 중: zoom 비율에 따라 GOAL_Y → 공 위치로 블렌딩
      // zoom=2.0 → t=1(GOAL_Y), zoom=1.1 → t=0(공 위치)
      const _t = Math.max(0, (cameraZoom - 1.1) / (2.0 - 1.1));
      const _blendedCamY = _goalCamY * _t + _ballCamY * (1 - _t);
      cameraY += (_blendedCamY - cameraY) * 0.05;
    } else {
      // 정상 추적
      const _lerp = (_anyInFunnel || camDramaTarget) ? 0.12 : 0.05;
      cameraY += (_ballCamY - cameraY) * _lerp;
    }

  } else {
    // 공 없음: 1.0으로 스프링 복귀
    cameraZoomTarget = 1.0;
    cameraZoomVel += (cameraZoomTarget - cameraZoom) * 0.007;
    cameraZoomVel *= 0.85;
    cameraZoom += cameraZoomVel;
    cameraZoom = Math.max(1.0, cameraZoom);
  }
}
