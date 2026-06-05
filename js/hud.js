/**
 * =================================================================
 *   CHAOS-DROP — PC IN-GAME HUD
 * =================================================================
 * 데스크탑에서 경주가 시작되면 좌측 세팅 패널을 치우고,
 * 꼭 필요한 정보만 가볍게 띄운다.
 *   ① 당첨 조건(목표)  ② 실시간 순위  ③ 정지(종료)  ④ 음소거
 * 모바일에서는 동작하지 않는다 (기존 모바일 오버레이 사용).
 */

// ── 게임 모드 진입 / 종료 ────────────────────────────────────
function enterPcGameMode() {
  if (typeof isMobile === 'function' && isMobile()) return;
  document.body.classList.add('pc-game-active');
  setHudGoal();
  updatePcHud();
  syncSoundButtons(isSoundMuted());
}

function exitPcGameMode() {
  document.body.classList.remove('pc-game-active');
  hideQuitConfirm();
}

// ── 당첨 조건(목표) 텍스트 자동 생성 ─────────────────────────
function setHudGoal() {
  const icon = document.getElementById('hud-goal-icon');
  const text = document.getElementById('hud-goal-text');
  if (!icon || !text) return;

  if (currentRule === 'first') {
    icon.textContent = '👑';
    text.textContent = `선착순 ${winCount}명 당첨`;
  } else if (currentRule === 'last') {
    icon.textContent = '🛡️';
    text.textContent = `후착순 ${winCount}명 당첨`;
  } else if (currentRule === 'specific') {
    icon.textContent = '🎯';
    text.textContent = `${specificRank}등 단독 당첨`;
  }
}

// ── 실시간 순위 렌더 (당첨 인원수만큼 노출) ──────────────────
function updatePcHud() {
  if (!document.body.classList.contains('pc-game-active')) return;

  setHudGoal();

  // 정지 버튼 라벨: 결과 모달이 떴거나 경주가 끝났으면 '처음으로'
  const quitBtn = document.getElementById('hud-btn-quit');
  const modal = document.getElementById('pinball-result-modal');
  const isGameFinished = !pinballGameRunning || (modal && modal.style.display === 'block');
  
  if (quitBtn) {
    quitBtn.innerHTML = !isGameFinished
      ? '<span>⏹</span> 정지'
      : '<span>🏠</span> 처음으로';
    quitBtn.classList.toggle('hud-icon-btn--home', isGameFinished);
  }

  const list = document.getElementById('hud-board-list');
  if (!list) return;

  const balls = (typeof pinballBalls !== 'undefined' && pinballBalls) ? pinballBalls : [];
  const total = balls.length;

  // 완주자 우선 + 진행 중(진행도=y 내림차순)
  const finished = (typeof pinballFinishedBalls !== 'undefined') ? pinballFinishedBalls : [];
  const active = balls.filter(b => !b.isFinished).sort((a, b) => b.y - a.y);
  const allRanked = [...finished, ...active];

  // 룰에 따른 랭킹 필터링 최적화
  let rows = [];
  if (currentRule === 'first') {
    // 1. 선착순: 앞쪽 N명 집중 노출
    const showN = Math.min(total, Math.max(winCount, 3));
    rows = allRanked.slice(0, showN);
  } else if (currentRule === 'last') {
    // 2. 후착순: 뒤쪽 N명(꼴찌 그룹) 집중 노출
    const showN = Math.min(total, Math.max(winCount, 3));
    rows = allRanked.slice(Math.max(0, total - showN), total);
  } else if (currentRule === 'specific') {
    // 3. 특정순위: 목표 등수 기준 앞 2명, 타겟, 뒤 2명 노출
    const targetIdx = specificRank - 1;
    const startIdx = Math.max(0, targetIdx - 2);
    const endIdx = Math.min(total, targetIdx + 3);
    rows = allRanked.slice(startIdx, endIdx);
  }

  if (rows.length === 0) {
    list.innerHTML = '<li class="hud-row hud-row--empty">대기 중...</li>';
    return;
  }

  list.innerHTML = rows.map((b, idx) => {
    const rank = idx + 1;
    const isTop = (currentRule === 'first'    && rank <= winCount)
               || (currentRule === 'last'     && rank > total - winCount)
               || (currentRule === 'specific' && rank === specificRank);

    const timeStr = b.isFinished
      ? `<span class="hud-row-time">${b.duration}s</span>`
      : `<span class="hud-row-time hud-row-time--live">진행중</span>`;

    return `<li class="hud-row${isTop ? ' is-top' : ''}${b.isFinished ? ' finished' : ' progress'}">
        <span class="hud-row-rank">${rank}</span>
        <span class="hud-row-dot" style="background:${b.color}; color:${b.color};"></span>
        <span class="hud-row-name">${escapeHudText(b.name)}</span>
        ${timeStr}
      </li>`;
  }).join('');
}

function escapeHudText(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ── 사운드(음소거) — 기존 SoundSys / 패널 버튼과 동기화 ──────
function isSoundMuted() {
  const panelBtn = document.getElementById('btn-sound-toggle');
  return !!(panelBtn && panelBtn.classList.contains('muted'));
}

function syncSoundButtons(muted) {
  const panelBtn = document.getElementById('btn-sound-toggle');
  if (panelBtn) {
    panelBtn.textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
    panelBtn.className = muted ? 'badge sound-badge muted' : 'badge sound-badge active';
  }
  const hudBtn = document.getElementById('hud-btn-mute');
  if (hudBtn) {
    hudBtn.textContent = muted ? '🔇' : '🔊';
    hudBtn.classList.toggle('muted', muted);
    hudBtn.setAttribute('title', muted ? '음소거 해제' : '음소거');
  }
}
// 다른 모듈(ui.js)에서도 호출 가능하게 노출
window.syncSoundButtons = syncSoundButtons;

// ── 종료 확인 다이얼로그 ─────────────────────────────────────
function showQuitConfirm() {
  const dlg = document.getElementById('hud-quit-confirm');
  if (dlg) dlg.classList.add('open');
}
function hideQuitConfirm() {
  const dlg = document.getElementById('hud-quit-confirm');
  if (dlg) dlg.classList.remove('open');
}
function performPcQuit() {
  hideQuitConfirm();
  if (typeof SoundSys !== 'undefined') SoundSys.playClick();
  exitPcGameMode();
  if (typeof exitMobileGameMode === 'function') exitMobileGameMode();
  if (typeof resetPinball === 'function') resetPinball();
  if (typeof pinballAnimId !== 'undefined' && pinballAnimId === null
      && typeof animatePinball === 'function') animatePinball();
}

// ── 이벤트 바인딩 ────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {

  // ④ 음소거 버튼
  const muteBtn = document.getElementById('hud-btn-mute');
  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof SoundSys !== 'undefined') {
        SoundSys.init();
        const muted = SoundSys.toggleMute();
        syncSoundButtons(muted);
      }
    });
  }

  // ③ 정지(종료) 버튼 — 경주 중에는 확인창, 완료 후에는 바로 복귀
  const quitBtn = document.getElementById('hud-btn-quit');
  if (quitBtn) {
    quitBtn.addEventListener('click', () => {
      const modal = document.getElementById('pinball-result-modal');
      const isGameFinished = !pinballGameRunning || (modal && modal.style.display === 'block');
      if (!isGameFinished) {
        showQuitConfirm();
      } else {
        performPcQuit();
      }
    });
  }

  // 종료 확인창 버튼
  const cancelBtn = document.getElementById('hud-confirm-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', hideQuitConfirm);
  const okBtn = document.getElementById('hud-confirm-ok');
  if (okBtn) okBtn.addEventListener('click', performPcQuit);
  const dlg = document.getElementById('hud-quit-confirm');
  if (dlg) {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) hideQuitConfirm(); });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideQuitConfirm();
  });

  });
});
