/**
 * =================================================================
 *   CHAOS-DROP — SHARED PURE UTILITIES
 * =================================================================
 * DOM/Canvas 의존이 없는 순수 함수 모음.
 * 브라우저에서는 전역 함수로, Node 테스트(node --test)에서는
 * module.exports로 동작합니다.
 */

// ── 입력 제한 상수 ────────────────────────────────────────────
const MEMBER_NAME_MAX_LEN = 30;   // input maxlength와 동일 (paste 경로 방어)
const MEMBER_COUNT_MAX    = 200;  // 물리 연산(O(N^2) 충돌) 보호 상한

// ── HTML 이스케이프 (XSS 방어) ────────────────────────────────
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ── 참가자 이름 CSV 파싱 + 검증 ──────────────────────────────
// existingCount: 현재 등록된 인원수 (합산하여 상한 검사)
function sanitizeMemberNames(csv, existingCount = 0) {
  const room = Math.max(0, MEMBER_COUNT_MAX - existingCount);
  return String(csv)
    .split(/[,\n\r]+/)
    .map(n => n.trim().slice(0, MEMBER_NAME_MAX_LEN))
    .filter(n => n.length > 0)
    .slice(0, room);
}

// ── 벽 프로파일 보간 (이진 탐색) ──────────────────────────────
// profile은 y 오름차순 정렬을 전제로 합니다 (각 맵의 generateWallProfile이 보장).
function interpolateWallAtY(profile, y, fullWidth) {
  if (!profile || profile.length === 0) return { lx: 0, rx: fullWidth };
  if (y <= profile[0].y) return { lx: profile[0].lx, rx: profile[0].rx };
  const last = profile[profile.length - 1];
  if (y >= last.y) return { lx: last.lx, rx: last.rx };

  // profile[i].y <= y < profile[i+1].y 인 i를 이진 탐색
  let lo = 0, hi = profile.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (profile[mid].y <= y) lo = mid;
    else hi = mid;
  }

  const v0 = profile[lo], v1 = profile[hi];
  const t = (y - v0.y) / (v1.y - v0.y);
  return {
    lx: v0.lx + t * (v1.lx - v0.lx),
    rx: v0.rx + t * (v1.rx - v0.rx)
  };
}

// ── Node(node --test) 환경 내보내기 ───────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    sanitizeMemberNames,
    interpolateWallAtY,
    MEMBER_NAME_MAX_LEN,
    MEMBER_COUNT_MAX,
  };
}
