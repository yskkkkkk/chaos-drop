/**
 * =================================================================
 *   CHAOS-DROP — RACE MANAGER
 * =================================================================
 * 완주 등록, 리더보드 렌더링, 당첨 판정, 결과 팝업
 */

function registerFinishedBall(ball) {
  if (pinballFinishedBalls.some(b => b.id === ball.id)) return;

  const duration = ((Date.now() - raceStartTime) / 1000).toFixed(2);
  const finishedCount = pinballFinishedBalls.length;

  let triggerVAR = false;
  if (!varTriggered && finishedCount > 0) {
    const prevBall = pinballFinishedBalls[finishedCount - 1];
    const timeDiff = parseFloat(duration) - parseFloat(prevBall.duration);

    if (Math.abs(timeDiff) <= 0.05) {
      if (currentRule === 'first' && finishedCount < winCount) {
        triggerVAR = true;
      } else if (currentRule === 'specific' && finishedCount === specificRank - 1) {
        triggerVAR = true;
      } else if (currentRule === 'last' && finishedCount === pinballBalls.length - winCount - 1) {
        triggerVAR = true;
      }
    }
  }

  pinballFinishedBalls.push({
    id: ball.id,
    name: ball.name,
    color: ball.color,
    duration: duration,
    isFinished: true
  });

  ball.finishRank = finishedCount + 1;

  // 출구 줌인 트리거
  const _newCount = pinballFinishedBalls.length;
  if (currentRule === 'first' && winCount === 1) {
    if (_newCount === 1) exitZoomTimer = 0; // 당첨자 골인 → 고정 줌 해제
  } else if (currentRule === 'first' && winCount > 1) {
    if (_newCount >= Math.ceil(winCount / 2) && _newCount <= winCount) {
      triggerExitZoom();
    }
  } else if (currentRule === 'last') {
    const _remaining = pinballBalls.filter(b => !b.isFinished).length;
    if (_remaining <= winCount * 2) {
      triggerExitZoom();
    }
  } else if (currentRule === 'specific') {
    if (specificRank === 1 && _newCount === 1) {
      exitZoomTimer = 0; // n=1: 당첨자 골인 → 고정 줌 해제
    } else if (specificRank > 1 && (_newCount === specificRank - 1 || _newCount === specificRank)) {
      triggerExitZoom();
    }
  }

  ball.vy = Math.max(1.2, ball.vy * 0.7);
  ball.vx = ball.vx * 0.8 + (Math.random() - 0.5) * 1.5;

  renderLeaderboard();

  if (triggerVAR) {
    varChecking = true;
    varTriggered = true;
    varTimer = 140;
    camDramaTarget = ball;
    camDramaTimer = 145;
    pinballLog("PHOTO FINISH! INITIATING ULTRA VAR SCAN...");
  } else {
    checkWinningConditions();
  }

  if (pinballFinishedBalls.length >= pinballBalls.length) {
    pinballGameRunning = false;
    pinballLog("ALL RUNNERS FINISHED! Race Complete.");
    const btnLaunch = document.getElementById('btn-pinball-launch');
    if (btnLaunch) { btnLaunch.disabled = false; btnLaunch.style.opacity = '1'; }
    if (typeof updatePcHud === 'function') updatePcHud();
  }
}

function renderLeaderboard() {
  if (typeof updateMobileMiniLB === 'function') updateMobileMiniLB();
  if (typeof updatePcHud === 'function') updatePcHud();
}

function checkWinningConditions() {
  if (hasAnnouncedWinners) return;
  if (varChecking) return;

  const totalMembers = pinballBalls.length;
  const finishedCount = pinballFinishedBalls.length;

  let winnerList = [];
  let isConditionMet = false;

  if (currentRule === 'first') {
    if (finishedCount >= winCount) {
      winnerList = pinballFinishedBalls.slice(0, winCount);
      isConditionMet = true;
    }
  } else if (currentRule === 'last') {
    if (finishedCount >= totalMembers - winCount) {
      winnerList = pinballBalls.filter(b => !b.isFinished);
      isConditionMet = true;
    }
  } else if (currentRule === 'specific') {
    if (finishedCount >= specificRank) {
      winnerList = [pinballFinishedBalls[specificRank - 1]];
      isConditionMet = true;
    }
  }

  if (isConditionMet) {
    hasAnnouncedWinners = true;
    pinballLog("ATTENTION MAP DECIDED! CALCULATING WINNERS...");

    setTimeout(() => {
      triggerPinballConfetti();
      showWinningPopup(winnerList);
    }, 800);
  }
}

function showWinningPopup(winners) {
  const modal = document.getElementById('pinball-result-modal');
  const textEl = document.getElementById('pinball-winner-text');
  const badgeEl = document.getElementById('modal-rule-title');
  const iconEl = document.getElementById('modal-icon');
  const subtextEl = document.getElementById('modal-subtext');

  if (!modal || !textEl || !badgeEl) return;

  const names = winners.map(w => w.name).join(', ');
  textEl.innerText = names;

  // 로또 모드 판별: 전체 45명, 이름 1~45, 선착순 룰, 당첨자 6명일 때만
  const isLottoGame = pinballBalls.length === 45 && pinballBalls.every(b => {
    const n = parseInt(b.name);
    return !isNaN(n) && String(n) === b.name.trim() && n >= 1 && n <= 45;
  });

  if (isLottoGame && currentRule === 'first' && winCount === 6) {
    if (iconEl) iconEl.innerHTML = '<i data-lucide="coins" style="width: 4rem; height: 4rem; color: #ff9900;"></i>';
    badgeEl.innerText = '행운번호';
    badgeEl.style.color = '#ff9900';
    if (subtextEl) subtextEl.style.display = 'none'; // "축하합니다!" 문구 숨김
  } else {
    if (iconEl) iconEl.innerHTML = '<i data-lucide="trophy" style="width: 4rem; height: 4rem; color: var(--accent);"></i>';
    if (subtextEl) {
      subtextEl.style.display = 'block';
      subtextEl.innerText = '축하합니다!';
    }
    if (currentRule === 'first') {
      badgeEl.innerText = `선착순 ${winCount}명 당첨!`;
      badgeEl.style.color = 'var(--accent)';
    } else if (currentRule === 'last') {
      badgeEl.innerText = `후착순(꼴찌) ${winCount}명 당첨!`;
      badgeEl.style.color = '#8c52ff';
    } else {
      badgeEl.innerText = `단독 ${specificRank}순위 당첨!`;
      badgeEl.style.color = '#00f0ff';
    }
  }
  if (typeof lucide !== 'undefined') lucide.createIcons({root: modal});
  modal.style.display = 'block';
  pinballLog(`WINNERS ANNOUNCED: ${names}`);
}
