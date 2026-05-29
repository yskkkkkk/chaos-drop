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

function updateStepperButtons() {
  const winInput = document.getElementById('pinball-win-count');
  const btnMinus = document.getElementById('btn-win-minus');
  const btnPlus = document.getElementById('btn-win-plus');

  if (!winInput || !btnMinus || !btnPlus) return;

  const min = parseInt(winInput.min) || 1;
  const max = parseInt(winInput.max) || 99;
  const val = parseInt(winInput.value) || min;

  btnMinus.classList.toggle('is-hidden', val <= min);
  btnPlus.classList.toggle('is-hidden', val >= max);
}

function updateRuleLabels() {
  const winInput = document.getElementById('pinball-win-count');
  const specRankSelect = document.getElementById('pinball-specific-rank');
  const lblFirst = document.getElementById('lbl-first-desc');
  const lblLast = document.getElementById('lbl-last-desc');
  const lblSpecific = document.getElementById('lbl-specific-desc');

  if (!winInput || !specRankSelect) return;

  const currentWinCount = winInput.value || 2;
  const currentSpecificRank = specRankSelect.value || 1;

  if (lblFirst) lblFirst.textContent = `(${currentWinCount}명까지)`;
  if (lblLast) lblLast.textContent = `(${currentWinCount}명까지)`;
  if (lblSpecific) lblSpecific.textContent = `(${currentSpecificRank}등 단독)`;

  updateStepperButtons();
}

function setControlsEnabled(enabled) {
  const membersTA = document.getElementById('pinball-members');
  const btnShuffle = document.getElementById('btn-shuffle-members');
  const ruleRadios = document.querySelectorAll('input[name="pinball-rule"]');
  const winCountInput = document.getElementById('pinball-win-count');
  const btnMinus = document.getElementById('btn-win-minus');
  const btnPlus = document.getElementById('btn-win-plus');
  const specRankSelect = document.getElementById('pinball-specific-rank');
  const freezeToggle = document.getElementById('freeze-mode-toggle');
  const mapSegBtns = document.querySelectorAll('.map-seg-btn');

  if (membersTA) membersTA.disabled = !enabled;
  if (btnShuffle) {
    btnShuffle.disabled = !enabled;
    btnShuffle.style.opacity = enabled ? '1.0' : '0.45';
    btnShuffle.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  ruleRadios.forEach(radio => {
    radio.disabled = !enabled;
    radio.parentElement.style.opacity = enabled ? '1.0' : '0.5';
    radio.parentElement.style.pointerEvents = enabled ? 'auto' : 'none';
  });

  if (winCountInput) {
    if (!enabled) {
      winCountInput.disabled = true;
      winCountInput.style.cursor = 'not-allowed';
      winCountInput.style.opacity = '0.4';
    } else {
      const rule = document.querySelector('input[name="pinball-rule"]:checked')?.value;
      const isSpecific = rule === 'specific';
      winCountInput.disabled = isSpecific;
      winCountInput.style.cursor = isSpecific ? 'not-allowed' : 'text';
      winCountInput.style.opacity = isSpecific ? '0.5' : '1.0';
      const lblWinCount = document.getElementById('lbl-win-count');
      if (lblWinCount) lblWinCount.style.color = isSpecific ? 'rgba(255,255,255,0.4)' : 'var(--accent)';
    }
  }

  const stepper = document.querySelector('.number-stepper');
  if (stepper) {
    stepper.style.opacity = enabled ? '1.0' : '0.5';
    stepper.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  if (btnMinus) btnMinus.disabled = !enabled;
  if (btnPlus) btnPlus.disabled = !enabled;

  if (specRankSelect) {
    if (!enabled) {
      specRankSelect.disabled = true;
      specRankSelect.style.cursor = 'not-allowed';
      specRankSelect.style.opacity = '0.4';
    } else {
      const rule = document.querySelector('input[name="pinball-rule"]:checked')?.value;
      const isSpecific = rule === 'specific';
      specRankSelect.disabled = !isSpecific;
      specRankSelect.style.cursor = isSpecific ? 'pointer' : 'not-allowed';
      specRankSelect.style.opacity = isSpecific ? '1.0' : '0.5';
      const lblSpecificRank = document.getElementById('lbl-specific-rank');
      if (lblSpecificRank) lblSpecificRank.style.color = isSpecific ? 'var(--accent)' : 'rgba(255,255,255,0.4)';
    }
  }

  if (freezeToggle) {
    freezeToggle.disabled = !enabled;
    const toggleRow = document.querySelector('.panel-toggle-row');
    if (toggleRow) {
      toggleRow.style.opacity = enabled ? '1.0' : '0.5';
      toggleRow.style.pointerEvents = enabled ? 'auto' : 'none';
    }
  }

  mapSegBtns.forEach(btn => {
    if (!btn.classList.contains('locked')) {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1.0' : '0.5';
      btn.style.pointerEvents = enabled ? 'auto' : 'none';
    }
  });
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
  updateRuleLabels();
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

  // 경주 중 옵션 변경 불가능하도록 컨트롤 잠금
  setControlsEnabled(false);

  setTimeout(() => {
    raceStartTime = Date.now();
    pinballGameRunning = true;
    enterMobileGameMode();

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
      pinballCanvas.width  = _c.clientWidth;
      pinballCanvas.height = _c.clientHeight;
      GAME_X_OFFSET = isMobile() ? 0 : Math.max(415, Math.round((_c.clientWidth - 415) / 2));
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    pinballCanvas.addEventListener('wheel', (e) => {
      if (!pinballGameRunning) {
        e.preventDefault();
        cameraY = Math.max(0, Math.min(cameraY + e.deltaY * 0.7, GAME_VHEIGHT - pinballCanvas.height));
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

  if (winCountInput) {
    winCountInput.addEventListener('input', updateRuleLabels);
    winCountInput.addEventListener('change', () => {
      const min = parseInt(winCountInput.min) || 1;
      const max = parseInt(winCountInput.max) || 99;
      let val = parseInt(winCountInput.value);
      if (isNaN(val) || val < min) {
        winCountInput.value = min;
      } else if (val > max) {
        winCountInput.value = max;
      }
      winCountInput.dispatchEvent(new Event('input'));
    });
  }
  if (specRankSelect) {
    specRankSelect.addEventListener('change', updateRuleLabels);
  }

  const btnMinus = document.getElementById('btn-win-minus');
  const btnPlus = document.getElementById('btn-win-plus');

  if (btnMinus && btnPlus && winCountInput) {
    btnMinus.addEventListener('click', () => {
      const min = parseInt(winCountInput.min) || 1;
      let val = parseInt(winCountInput.value) || min;
      if (val > min) {
        winCountInput.value = val - 1;
        winCountInput.dispatchEvent(new Event('input'));
      }
    });

    btnPlus.addEventListener('click', () => {
      const max = parseInt(winCountInput.max) || 99;
      let val = parseInt(winCountInput.value) || 1;
      if (val < max) {
        winCountInput.value = val + 1;
        winCountInput.dispatchEvent(new Event('input'));
      }
    });
  }

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
    exitMobileGameMode();
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

  setControlsEnabled(true);
  updateSpecificRankSelect();
  initPinballMap();
  updatePreviewBalls();
  animatePinball();

  // ── 모바일 초기화 ─────────────────────────────────────────
  initMobileUI();
});

// ── 모바일 UI 함수 ──────────────────────────────────────────

function isMobile() { return window.innerWidth <= 768; }

function setMobileStep(n) {
  const panel = document.querySelector('.pinball-control-panel');
  const indicator = document.querySelector('.mobile-step-indicator');
  const btnPrev = document.getElementById('btn-mobile-prev');
  const btnNext = document.getElementById('btn-mobile-next');
  if (!panel) return;
  panel.classList.remove('ms-1', 'ms-2');
  panel.classList.add('ms-' + n);
  if (indicator) indicator.textContent = n + ' / 2';
  if (btnPrev) btnPrev.style.visibility = n === 1 ? 'hidden' : 'visible';
  if (btnNext) btnNext.style.display = n === 2 ? 'none' : '';
}

function updateMobileMiniLB() {
  if (!isMobile()) return;
  const miniLb = document.getElementById('mobile-mini-lb');
  const fullBody = document.getElementById('mobile-full-lb-body');
  if (!miniLb) return;

  const medals = ['🥇', '🥈', '🥉'];
  const top3 = pinballFinishedBalls.slice(0, 3);
  miniLb.innerHTML = top3.length === 0
    ? '<div class="mobile-mini-lb-row" style="color:rgba(255,255,255,0.35);font-size:0.72rem;">대기 중...</div>'
    : top3.map((b, i) => '<div class="mobile-mini-lb-row">' +
        '<span>' + medals[i] + '</span>' +
        '<span class="mobile-mini-dot" style="background:' + b.color + ';"></span>' +
        '<span>' + b.name + '</span>' +
        '</div>').join('');

  if (fullBody) {
    if (pinballFinishedBalls.length === 0) {
      fullBody.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:20px 0;">아직 완주자가 없습니다.</div>';
    } else {
      const total = pinballBalls.length;
      fullBody.innerHTML = pinballFinishedBalls.map((b, idx) => {
        const rank = idx + 1;
        const isTop = (currentRule === 'first' && rank <= winCount)
                   || (currentRule === 'last' && rank > total - winCount)
                   || (currentRule === 'specific' && rank === specificRank);
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid rgba(255,255,255,0.04);">' +
          '<span style="font-weight:800;width:30px;color:' + (isTop ? 'var(--accent)' : '#9ca3af') + ';">#' + rank + '</span>' +
          '<span class="mobile-mini-dot" style="background:' + b.color + ';box-shadow:0 0 4px ' + b.color + ';width:8px;height:8px;"></span>' +
          '<span style="font-weight:700;flex:1;font-size:0.85rem;">' + b.name + '</span>' +
          '<span style="font-family:\'Courier New\',monospace;font-size:0.78rem;color:var(--neon-blue);">' + b.duration + 's</span>' +
          '</div>';
      }).join('');
    }
  }
}

function enterMobileGameMode() {
  if (!isMobile()) return;
  document.body.classList.add('mobile-game-active');
  updateMobileMiniLB();
}

function exitMobileGameMode() {
  document.body.classList.remove('mobile-game-active');
  const fullLb = document.getElementById('mobile-full-lb');
  if (fullLb) fullLb.style.display = 'none';
  setMobileStep(1);
}

function initMobileUI() {
  // 패널에 초기 step 1 클래스 설정 (desktop에서는 무해)
  setMobileStep(1);

  const btnNext = document.getElementById('btn-mobile-next');
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const ta = document.getElementById('pinball-members');
      const members = ta ? ta.value.split(',').map(n => n.trim()).filter(n => n.length > 0) : [];
      if (members.length < 2) {
        alert('최소 2명 이상 입력해주세요.');
        return;
      }
      setMobileStep(2);
    });
  }

  const btnPrev = document.getElementById('btn-mobile-prev');
  if (btnPrev) btnPrev.addEventListener('click', () => setMobileStep(1));

  const miniLb = document.getElementById('mobile-mini-lb');
  const fullLb = document.getElementById('mobile-full-lb');
  if (miniLb && fullLb) {
    miniLb.addEventListener('click', () => {
      updateMobileMiniLB();
      fullLb.style.display = 'block';
    });
  }

  const btnCloseFull = document.getElementById('btn-mobile-close-full');
  if (btnCloseFull && fullLb) {
    btnCloseFull.addEventListener('click', e => {
      e.stopPropagation();
      fullLb.style.display = 'none';
    });
  }

  const btnMobileReset = document.getElementById('btn-mobile-reset');
  if (btnMobileReset) {
    btnMobileReset.addEventListener('click', () => {
      if (confirm('설정으로 되돌아 갑니다.')) {
        exitMobileGameMode();
        resetPinball();
        if (pinballAnimId === null) animatePinball();
      }
    });
  }
}
