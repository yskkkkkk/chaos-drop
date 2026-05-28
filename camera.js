/**
 * =================================================================
 *   CHAOS-DROP NEON PINBALL SYSTEM - CAMERA MODULE
 * =================================================================
 * 카메라 상태 변수 및 프레임별 카메라 업데이트 로직을 담당합니다.
 * Multi-target framing + Focus Lock + Funnel Zoom 구현.
 */

// ── 카메라 상태 변수 ──────────────────────────────────────
let cameraY = 0;            // 뷰포트 종스크롤 카메라 Y좌표
let cameraZoom = 1.0;       // 현재 줌 배율 (damped)
let cameraZoomTarget = 1.0; // 목표 줌 배율
let camDramaTimer = 0;      // 드라마 컷 잔여 프레임
let camDramaTarget = null;  // 드라마 컷 포커스 구슬
let camFocusBall = null;    // Focus Lock: 현재 고정된 포커스 볼
let camFocusCooldown = 0;   // Focus Lock: 전환 쿨다운 (30프레임)

// 모든 카메라 상태를 초기값으로 리셋
function resetCamera() {
  cameraY = 0;
  cameraZoom = 1.0;
  cameraZoomTarget = 1.0;
  camDramaTimer = 0;
  camDramaTarget = null;
  camFocusBall = null;
  camFocusCooldown = 0;
}

// 프레임당 1회 호출: 카메라 위치 및 줌 업데이트
// activeBalls: 현재 플레이 중인 구슬 배열, CH: 캔버스 높이, VH: 가상 게임판 높이
function updateCamera(activeBalls, CH, VH) {
  if (activeBalls.length > 0 && pinballGameRunning) {

    // ── 드라마틱 카메라 시스템 ──────────────────────
    // ① 타이머 감소
    if (camDramaTimer > 0) { camDramaTimer--; if (camDramaTimer === 0) camDramaTarget = null; }

    const _camSorted = [...activeBalls].sort((a, b) => b.y - a.y);

    // ② 근접 경쟁 감지: 1·2위 간격 70px 이내 → 2위 구슬 0.8초 추적 (진짜 접전만)
    if (camDramaTimer === 0 && _camSorted.length >= 2) {
      if (_camSorted[0].y - _camSorted[1].y < 70) {
        camDramaTarget = _camSorted[1];
        camDramaTimer = 50;
      }
    }

    // ③ 확률적 꼴찌 컷: 0.1%/frame → 1.5초 꼴찌 추적
    if (camDramaTimer === 0 && Math.random() < 0.001) {
      camDramaTarget = _camSorted[_camSorted.length - 1];
      camDramaTimer = 90;
    }

    // ④ 파이널 존 진입 시 드라마 해제 후 리더 즉시 추적
    const _anyInFunnel = activeBalls.some(b => b.y > FUNNEL_TOP_Y);
    if (_anyInFunnel) { camDramaTimer = 0; camDramaTarget = null; }

    // ⑤ Multi-target framing: 모드별 카메라 철학으로 대상 공 배열 선택
    let _camTargets;
    if (camDramaTarget) {
      _camTargets = [camDramaTarget];               // 드라마 컷: 단일 공 집중
    } else if (_anyInFunnel) {
      _camTargets = [_camSorted[0]];                // 깔때기: 선두 단일 집중
    } else if (currentRule === 'first') {
      _camTargets = _camSorted.slice(0, Math.min(3, _camSorted.length)); // 상위 3명 경쟁
    } else if (currentRule === 'last') {
      // 탈락 위험권: 생존선(winCount) 주변 하위권 공 집중
      const _keepCount = winCount + 2;
      _camTargets = _camSorted.slice(Math.max(0, _camSorted.length - _keepCount));
      if (_camTargets.length === 0) _camTargets = [_camSorted[_camSorted.length - 1]];
    } else {
      // specific rank: 목표 순위 ±2 범위 공 집중
      const _tIdx = Math.min(specificRank - 1, _camSorted.length - 1);
      _camTargets = _camSorted.slice(Math.max(0, _tIdx - 2), Math.min(_camSorted.length, _tIdx + 3));
    }

    const _tMinY = Math.min(..._camTargets.map(b => b.y));
    const _tMaxY = Math.max(..._camTargets.map(b => b.y));
    const _tCenterY = (_tMinY + _tMaxY) / 2;
    const _spreadY = _tMaxY - _tMinY;

    // 파이널 존·드라마 컷에서는 고속 lerp 적용
    const _lerp = (_anyInFunnel || camDramaTarget) ? 0.12 : 0.05;
    const targetCY = _tCenterY - CH / 2;
    cameraY += (targetCY - cameraY) * _lerp;
    cameraY = Math.max(0, Math.min(cameraY, VH - CH));

    // ⑥ Zoom: funnel 1.05 우선, 그 외 spread 기반 미세 줌
    // spread 0(단일/접전) → 1.03, spread 400 → 1.00, 그 사이 선형 감소
    if (_anyInFunnel) {
      cameraZoomTarget = 1.05;
    } else {
      cameraZoomTarget = Math.max(1.0, Math.min(1.03, 1.03 - _spreadY * 0.0001));
    }
    cameraZoom += (cameraZoomTarget - cameraZoom) * 0.02;
  } else {
    // 공이 없을 때 zoom 복원
    cameraZoomTarget = 1.0;
    cameraZoom += (cameraZoomTarget - cameraZoom) * 0.02;
  }
}
