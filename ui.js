/**
 * =================================================================
 *   CHAOS-DROP — UI MODULE
 * =================================================================
 * 터미널 로그, 미리보기 공, 순위 셀렉트, 셔플, 레이스 발사,
 * DOM 이벤트 리스너 등록 및 초기 기동
 */

function pinballLog(msg) {
  const term = document.getElementById('pinball-terminal');
  if (!term) return;
  const el = document.createElement('div');
  el.textContent = `> ${msg}`;
  term.appendChild(el);
  if (term.children.length > 20) term.firstChild.remove();
  term.scrollTop = term.scrollHeight;
}

function updatePreviewBalls() {
  if (pinballGameRunning) return;
  const ta = document.getElementById('pinball-members');
  if (!ta) return;
  const members = ta.value.split(',').map(n => n.trim()).filter(n => n.length > 0);
  pinballBalls = [];

  const cnt = document.getElementById('member-count');
  if (cnt) cnt.textContent = `${members.length}명`;

  if (members.length === 0) return;
  const spacing = GAME_VWIDTH / (members.length + 1);
  members.forEach((name, idx) => {
    pinballBalls.push(new RacingBall(idx, name, spacing * (idx + 1), 40, COLOR_SPECTRUM[idx % COLOR_SPECTRUM.length]));
  });
  renderLeaderboard();
}

function updateSpecificRankSelect() {
  const ta  = document.getElementById('pinball-members');
  const sel = document.getElementById('pinball-specific-rank');
  if (!ta || !sel) return;
  const names = ta.value.split(',').map(n => n.trim()).filter(n => n.length > 0);
  const count = Math.max(names.length, 1);

  const winInput = document.getElementById('pinball-win-count');
  if (winInput) {
    winInput.max = count;
    if (parseInt(winInput.value) > count) winInput.value = count;
  }

  const prev = parseInt(sel.value) || 1;
  sel.innerHTML = '';
  names.forEach((_, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = `${i + 1}번째 골인자`;
    if (i + 1 === prev) opt.selected = true;
    sel.appendChild(opt);
  });

  updatePreviewBalls();
}

function shuffleMembers() {
  const ta = document.getElementById('pinball-members');
  if (!ta) return;
  const names = ta.value.split(',').map(n => n.trim()).filter(n => n.length > 0);
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  ta.value = names.join(', ');
  updateSpecificRankSelect();
}

function launchPinballRacing() {
  if (pinballGameRunning) return;

  const membersTextarea = document.getElementById('pinball-members');
  if (!membersTextarea) return;

  const members = membersTextarea.value.split(',')
                                       .map(name => name.trim())
                                       .filter(name => name.length > 0);

  if (members.length === 0) {
    alert("최소 한 명 이상의 팀원 이름을 입력해주세요!");
    return;
  }

  updateSpecificRankSelect();

  const ruleRadio = document.querySelector('input[name="pinball-rule"]:checked');
  currentRule = ruleRadio ? ruleRadio.value : 'first';
  winCount = Math.max(1, parseInt(document.getElementById('pinball-win-count').value) || 1);
  specificRank = Math.max(1, parseInt(document.getElementById('pinball-specific-rank').value) || 1);

  if ((currentRule === 'first' || currentRule === 'last') && winCount > members.length) {
    alert(`당첨 인원수(${winCount}명)가 팀원 수(${members.length}명)보다 많습니다!`);
    return;
  }

  if (currentRule === 'specific' && specificRank > members.length) {
    alert(`골인 순번(${specificRank}위)이 참가 팀원 수(${members.length}명)보다 큽니다! 순번을 낮추거나 인원을 늘려주세요.`);
    return;
  }

  pinballLog("Warming up quantum gravity engines...");
  pinballLog(`LAUNCHING BALL RACE FOR ${members.length} RUNNERS!`);

  pinballFinishedBalls = [];
  pinballBalls = [];
  hasAnnouncedWinners = false;
  renderLeaderboard();

  const modal = document.getElementById('pinball-result-modal');
  if (modal) modal.style.display = 'none';

  stopPinballConfetti();
  resetCamera();

  const spacing = GAME_VWIDTH / (members.length + 1);

  members.forEach((name, idx) => {
    const x = spacing * (idx + 1);
    const y = 40;
    const color = COLOR_SPECTRUM[idx % COLOR_SPECTRUM.length];
    pinballBalls.push(new RacingBall(idx, name, x, y, color));
  });

  const btnLaunchEl = document.getElementById('btn-pinball-launch');
  if (btnLaunchEl) { btnLaunchEl.disabled = true; btnLaunchEl.style.opacity = '0.45'; }

  setTimeout(() => {
    raceStartTime = Date.now();
    pinballGameRunning = true;

    varChecking = false;
    varTriggered = false;
    speedPadRotateTimer = 300;
    prevRankOrder = [];
    overtakeParticles = [];
    pinballNearMissSparks = [];
    currentLeaderId = -1;
    crownFlashTimer = 0;
    decisiveMomentActive = false;

    pinballBalls.forEach(b => {
      const _t = b.x / GAME_VWIDTH;
      const _centerPull = (0.5 - _t) * 9;
      const _jitter = (Math.random() - 0.5) * 2.5;
      b.vx = _centerPull + _jitter;
      b.vy = -Math.random() * 8.5 - 3.5;
    });

    pinballLog("RACE IN PROGRESS. QUANTUM ENTANGLEMENT ESTABLISHED.");
  }, 900);
}

// ── DOM 이벤트 리스너 등록 및 초기 기동 ──────────────────────

window.addEventListener('DOMContentLoaded', () => {
  pinballCanvas = document.getElementById('pinball-canvas');
  if (pinballCanvas) {
    pinballCtx = pinballCanvas.getContext('2d');

    const resizeCanvas = () => {
      const _c = pinballCanvas.parentElement;
      const _vw = _c.clientWidth;
      const _vh = _c.clientHeight;
      const _isCompact = _vw <= 700;
      const _panelReserve = _isCompact ? 0 : PANEL_MIN_OFFSET;
      const _hudReserve = (_vw - _panelReserve) >= GAME_VWIDTH + 28 ? 28 : 0;
      const _availableGameWidth = Math.max(280, _vw - _panelReserve - _hudReserve);

      pinballCanvas.width  = _vw;
      pinballCanvas.height = _vh;
      GAME_RENDER_SCALE = Math.min(1, _availableGameWidth / GAME_VWIDTH);
      GAME_VIEWPORT_HEIGHT = Math.max(360, _vh / GAME_RENDER_SCALE);
      SHOW_PROGRESS_HUD = _hudReserve > 0 && GAME_RENDER_SCALE >= 0.82;
      GAME_X_OFFSET = Math.max(0, Math.round(_panelReserve + (_availableGameWidth - GAME_VWIDTH * GAME_RENDER_SCALE) / 2));
      cameraY = Math.max(0, Math.min(cameraY, GAME_VHEIGHT - GAME_VIEWPORT_HEIGHT));
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    pinballCanvas.addEventListener('wheel', (e) => {
      if (!pinballGameRunning) {
        e.preventDefault();
        cameraY = Math.max(0, Math.min(cameraY + e.deltaY * 0.7, GAME_VHEIGHT - GAME_VIEWPORT_HEIGHT));
      }
    }, { passive: false });
  }

  const ruleRadios = document.querySelectorAll('input[name="pinball-rule"]');
  const winCountInput = document.getElementById('pinball-win-count');
  const specRankSelect = document.getElementById('pinball-specific-rank');
  const lblWinCount = document.getElementById('lbl-win-count');
  const lblSpecificRank = document.getElementById('lbl-specific-rank');

  ruleRadios.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.value === 'specific') {
        winCountInput.disabled = true;
        winCountInput.style.cursor = 'not-allowed';
        winCountInput.style.opacity = '0.5';
        if (lblWinCount) lblWinCount.style.color = 'rgba(255,255,255,0.4)';

        specRankSelect.disabled = false;
        specRankSelect.style.cursor = 'pointer';
        specRankSelect.style.opacity = '1.0';
        if (lblSpecificRank) lblSpecificRank.style.color = 'var(--accent)';
      } else {
        winCountInput.disabled = false;
        winCountInput.style.cursor = 'text';
        winCountInput.style.opacity = '1.0';
        if (lblWinCount) lblWinCount.style.color = 'var(--accent)';

        specRankSelect.disabled = true;
        specRankSelect.style.cursor = 'not-allowed';
        specRankSelect.style.opacity = '0.5';
        if (lblSpecificRank) lblSpecificRank.style.color = 'rgba(255,255,255,0.4)';
      }
    });
  });

  const membersTA = document.getElementById('pinball-members');
  if (membersTA) {
    membersTA.value = DEFAULT_MEMBERS;
    membersTA.addEventListener('input', updateSpecificRankSelect);
  }

  const freezeToggle = document.getElementById('freeze-mode-toggle');
  if (freezeToggle) freezeToggle.addEventListener('change', e => { freezeModeEnabled = e.target.checked; });

  const btnShuffle = document.getElementById('btn-shuffle-members');
  if (btnShuffle) btnShuffle.addEventListener('click', shuffleMembers);

  const btnLaunch = document.getElementById('btn-pinball-launch');
  if (btnLaunch) btnLaunch.addEventListener('click', launchPinballRacing);

  const btnReset = document.getElementById('btn-pinball-reset');
  if (btnReset) btnReset.addEventListener('click', () => {
    resetPinball();
    if (pinballAnimId === null) animatePinball();
  });

  const mapSegBtns = document.querySelectorAll('.map-seg-btn');
  mapSegBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('locked') || btn.classList.contains('active')) return;
      const nextId = btn.dataset.map;
      if (!MAPS[nextId]) return;

      mapSegBtns.forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });

      switchMap(nextId);
      resetPinball();
      if (pinballAnimId === null) animatePinball();
      pinballLog(`🗺 맵 전환 → ${MAPS[nextId]?.label}`);
    });
  });

  const btnModalClose = document.getElementById('btn-modal-close');
  if (btnModalClose) {
    btnModalClose.addEventListener('click', () => {
      const modal = document.getElementById('pinball-result-modal');
      if (modal) modal.style.display = 'none';
    });
  }

  updateSpecificRankSelect();
  initPinballMap();
  updatePreviewBalls();
  animatePinball();
});
