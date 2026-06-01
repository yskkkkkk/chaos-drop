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
  const gimmickToggle = document.getElementById('gimmick-mode-toggle');
  const mapSegBtns = document.querySelectorAll('.map-seg-btn');

  if (membersTA) membersTA.disabled = !enabled;
  if (btnShuffle) {
    btnShuffle.disabled = !enabled;
    btnShuffle.style.opacity = enabled ? '1.0' : '0.45';
    btnShuffle.style.pointerEvents = enabled ? 'auto' : 'none';
  }
  const btnLotto = document.getElementById('btn-lotto-preset');
  if (btnLotto) {
    btnLotto.disabled = !enabled;
    btnLotto.style.opacity = enabled ? '1.0' : '0.45';
    btnLotto.style.pointerEvents = enabled ? 'auto' : 'none';
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

  if (gimmickToggle) {
    gimmickToggle.disabled = !enabled;
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

  // ── Active Rule Indicator 갱신 및 표시 ──
  const indicator = document.getElementById('active-rule-indicator');
  const icon = document.getElementById('active-rule-icon');
  const title = document.getElementById('active-rule-title');
  const desc = document.getElementById('active-rule-desc');
  if (indicator && icon && title && desc) {
    if (currentRule === 'first') {
      icon.textContent = '👑';
      title.textContent = '선착순 생존';
      title.style.color = '#ff9900';
      desc.textContent = `가장 먼저 도착하는 ${winCount}명`;
    } else if (currentRule === 'last') {
      icon.textContent = '🛡️';
      title.textContent = '후착순 생존';
      title.style.color = '#33ff57';
      desc.textContent = `끝까지 살아남는 ${winCount}명`;
    } else if (currentRule === 'specific') {
      icon.textContent = '🎯';
      title.textContent = '특정 순위 단독';
      title.style.color = '#ff3366';
      desc.textContent = `정확히 ${specificRank}등으로 도착하는 1명`;
    }
    indicator.style.display = 'flex';
  }
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

  if (typeof SoundSys !== 'undefined') SoundSys.playCharge();

  setTimeout(() => {
    if (typeof SoundSys !== 'undefined') SoundSys.playLaunch();
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
  document.body.addEventListener('click', () => {
    if (typeof SoundSys !== 'undefined') SoundSys.init();
  }, { once: true });

  const soundBtn = document.getElementById('btn-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof SoundSys !== 'undefined') SoundSys.init();
      if (typeof SoundSys !== 'undefined') {
        const muted = SoundSys.toggleMute();
        soundBtn.textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
        soundBtn.className = muted ? 'badge sound-badge muted' : 'badge sound-badge active';
      }
    });
  }

  pinballCanvas = document.getElementById('pinball-canvas');
  if (pinballCanvas) {
    pinballCtx = pinballCanvas.getContext('2d');

    const resizeCanvas = () => {
      const _c = pinballCanvas.parentElement;
      
      // 모바일 기기(폭 768px 이하)일 경우 프레임(60FPS) 최우선을 위해 1x 고정, PC는 고해상도 배율 적용
      const dpr = isMobile() ? 1 : (window.devicePixelRatio || 1);
      
      // 물리적 픽셀 해상도
      pinballCanvas.width  = _c.clientWidth * dpr;
      pinballCanvas.height = _c.clientHeight * dpr;
      
      // CSS 논리적 크기
      pinballCanvas.style.width = _c.clientWidth + 'px';
      pinballCanvas.style.height = _c.clientHeight + 'px';
      
      // 컨텍스트 스케일링 (Crisp 렌더링)
      pinballCtx.scale(dpr, dpr);

      // 화면 중앙 정렬 오프셋 보정: 좌측 패널(415px)을 제외한 우측 여백의 중앙에 맵 배치
      if (isMobile()) {
        GAME_X_OFFSET = 0;
      } else {
        const remainingSpace = Math.max(0, _c.clientWidth - 415);
        GAME_X_OFFSET = 415 + Math.max(0, Math.round((remainingSpace - GAME_VWIDTH) / 2));
      }
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

  const membersTextarea = document.getElementById('pinball-members');
  if (membersTextarea) {
    membersTextarea.value = DEFAULT_MEMBERS;
    membersTextarea.addEventListener('input', () => {
      if (typeof SoundSys !== 'undefined') SoundSys.playClick();
      updatePreviewBalls();
      updateSpecificRankSelect();
    });
  }
  const gimmickToggle = document.getElementById('gimmick-mode-toggle');
  if (gimmickToggle) gimmickToggle.addEventListener('change', e => { gimmickEnabled = e.target.checked; });

  const btnShuffle = document.getElementById('btn-shuffle-members');
  if (btnShuffle) btnShuffle.addEventListener('click', () => {
    if (typeof SoundSys !== 'undefined') SoundSys.playClick();
    shuffleMembers();
  });

  const btnLotto = document.getElementById('btn-lotto-preset');
  if (btnLotto) btnLotto.addEventListener('click', () => {
    if (typeof SoundSys !== 'undefined') SoundSys.playClick();
    
    // 1부터 45까지 배열 생성 후 셔플
    const lottoNumbers = Array.from({length: 45}, (_, i) => String(i + 1));
    for (let i = lottoNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lottoNumbers[i], lottoNumbers[j]] = [lottoNumbers[j], lottoNumbers[i]];
    }
    
    const membersTA = document.getElementById('pinball-members');
    if (membersTA) membersTA.value = lottoNumbers.join(', ');
    
    const radioFirst = document.querySelector('input[name="pinball-rule"][value="first"]');
    if (radioFirst) radioFirst.checked = true;
    
    const winCountInput = document.getElementById('pinball-win-count');
    if (winCountInput) winCountInput.value = '6';
    
    updatePreviewBalls();
    updateSpecificRankSelect();
    pinballLog("Lotto 6/45 preset loaded!");
  });

  const btnLaunch = document.getElementById('btn-pinball-launch');
  if (btnLaunch) btnLaunch.addEventListener('click', () => {
    if (typeof SoundSys !== 'undefined') SoundSys.playClick();
    launchPinballRacing();
  });

  const btnReset = document.getElementById('btn-pinball-reset');
  if (btnReset) btnReset.addEventListener('click', () => {
    if (typeof SoundSys !== 'undefined') SoundSys.playClick();
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
      if (isMobile()) {
        const btnFloatHome = document.getElementById('btn-float-home');
        if (btnFloatHome) btnFloatHome.style.display = '';
      }
    });
  }

  const btnFloatHome = document.getElementById('btn-float-home');
  if (btnFloatHome) {
    btnFloatHome.addEventListener('click', () => {
      btnFloatHome.style.display = 'none';
      exitMobileGameMode();
      resetPinball();
      if (pinballAnimId === null) animatePinball();
    });
  }

  setControlsEnabled(true);
  updateSpecificRankSelect();
  initPinballMap();
  updatePreviewBalls();
  animatePinball();

  // ── 모바일 초기화 ─────────────────────────────────────────
  initMobileUI();

  // Freeze 툴팁: 패널 overflow 클리핑 우회 (position:fixed + JS 포지셔닝)
  const _fhint = document.querySelector('.freeze-hint');
  if (_fhint) {
    const _ftoast = _fhint.querySelector('.freeze-toast');
    document.body.appendChild(_ftoast); // CSS backdrop-filter에 의한 fixed 포지션 버그 회피
    
    const showToast = () => {
      const r = _fhint.getBoundingClientRect();
      _ftoast.style.top  = (r.top + r.height / 2 - 40) + 'px';
      _ftoast.style.left = isMobile()
        ? Math.max(8, r.left - 218) + 'px'
        : (r.right + 8) + 'px';
      _ftoast.style.opacity = '1';
    };
    const hideToast = () => { _ftoast.style.opacity = '0'; };

    _fhint.addEventListener('mouseenter', showToast);
    _fhint.addEventListener('mouseleave', hideToast);
    
    // 모바일 터치 지원 및 토글 동작
    _fhint.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_ftoast.style.opacity === '1') hideToast();
      else showToast();
    });

    // 영역 밖 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (!_fhint.contains(e.target)) hideToast();
    });
  }
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

  // 라이브 순위: 완주 순서 우선, 나머지는 y좌표(진행도) 내림차순
  const finished = pinballFinishedBalls;
  const active = (typeof pinballBalls !== 'undefined' ? pinballBalls : [])
    .filter(b => !b.isFinished)
    .sort((a, b) => b.y - a.y);
  const allRanked = [...finished, ...active];

  const medals = ['🥇', '🥈', '🥉'];
  const top3 = allRanked.slice(0, 3);
  miniLb.innerHTML = top3.length === 0
    ? '<div class="mobile-mini-lb-row" style="color:rgba(255,255,255,0.35);">대기 중...</div>'
    : top3.map((b, i) => {
        const dim = b.isFinished ? '' : 'opacity:0.72;';
        return '<div class="mobile-mini-lb-row" style="' + dim + '">' +
          '<span>' + medals[i] + '</span>' +
          '<span class="mobile-mini-dot" style="background:' + b.color + ';"></span>' +
          '<span>' + b.name + '</span>' +
          '</div>';
      }).join('') + '<div class="mobile-mini-lb-tap-hint">탭하여 순위 보기 ↗</div>';

  if (fullBody) {
    if (allRanked.length === 0) {
      fullBody.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:20px 0;">경주 대기 중...</div>';
    } else {
      const total = typeof pinballBalls !== 'undefined' ? pinballBalls.length : allRanked.length;
      fullBody.innerHTML = allRanked.map((b, idx) => {
        const rank = idx + 1;
        const isTop = (currentRule === 'first' && rank <= winCount)
                   || (currentRule === 'last' && rank > total - winCount)
                   || (currentRule === 'specific' && rank === specificRank);
        const timeStr = b.isFinished
          ? '<span style="color:var(--neon-blue);">' + b.duration + 's</span>'
          : '<span style="color:rgba(255,255,255,0.28);">진행중</span>';
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid rgba(255,255,255,0.05);">' +
          '<span style="font-weight:800;width:32px;color:' + (isTop ? 'var(--accent)' : '#9ca3af') + ';">#' + rank + '</span>' +
          '<span class="mobile-mini-dot" style="background:' + b.color + ';box-shadow:0 0 5px ' + b.color + ';width:9px;height:9px;"></span>' +
          '<span style="font-weight:700;flex:1;font-size:0.9rem;' + (b.isFinished ? '' : 'opacity:0.78;') + '">' + b.name + '</span>' +
          timeStr +
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
  const btnFloatHome = document.getElementById('btn-float-home');
  if (btnFloatHome) btnFloatHome.style.display = 'none';
}

function initMobileUI() {
  // 단일 페이지 설정화면 — step nav 미사용

  const miniLb = document.getElementById('mobile-mini-lb');
  const fullLb = document.getElementById('mobile-full-lb');
  if (miniLb && fullLb) {
    miniLb.addEventListener('click', () => {
      updateMobileMiniLB();
      fullLb.style.display = 'flex';
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
      exitMobileGameMode();
      resetPinball();
      if (pinballAnimId === null) animatePinball();
    });
  }
}
