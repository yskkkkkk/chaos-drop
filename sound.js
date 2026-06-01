/**
 * =================================================================
 *   CHAOS-DROP — SOUND MANAGER
 * =================================================================
 * Web Audio API를 활용한 절차적 사운드(Procedural Audio) 시스템.
 * 타격감(충돌), UI 상호작용, 특수 이벤트(골인, 발사)의 청각적 피드백 제공.
 */

let audioCtx = null;
let masterGain = null;
let isMuted = false;
let isAudioInitialized = false;

// ── 1. 초기화 (사용자 제스처 기반) ──────────────────────
function initAudioContext() {
  if (isAudioInitialized) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return; // 미지원 브라우저 방어

  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5; // 기본 볼륨 50%
  masterGain.connect(audioCtx.destination);
  
  isAudioInitialized = true;
}

function toggleMute() {
  isMuted = !isMuted;
  if (masterGain) {
    masterGain.gain.value = isMuted ? 0 : 0.5;
  }
  return isMuted;
}

// ── 2. 절차적 신디사이저 공통 함수 ──────────────────────
// type: 'sine', 'square', 'sawtooth', 'triangle'
function playTone(freq, type, duration, vol = 1.0, slideFreq = null) {
  if (!isAudioInitialized || isMuted || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (slideFreq) {
    // 삐슝! 하는 슬라이드 효과 (피치 벤드)
    osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
  }

  // 볼륨 믹싱 (거리에 따른 감소나 강도에 따른 조절 적용)
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  // 자연스러운 페이드 아웃 (팝핑 노이즈 방지)
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ── 3. 게임플레이 이벤트 프리셋 ────────────────────────
const SoundSys = {
  // UI 클릭 (경쾌한 틱)
  playClick: () => playTone(800, 'sine', 0.05, 0.3),
  
  // 구슬과 일반 벽 충돌 (가벼운 목탁/유리 소리, 타격 속도 v에 비례)
  playBounce: (v) => {
    const vol = Math.min(1.0, Math.max(0.1, v / 20)) * 0.4;
    const freq = 400 + Math.random() * 200; 
    playTone(freq, 'triangle', 0.08, vol);
  },

  // 구슬 간 충돌 (높고 맑은 팅!)
  playBallHit: (v) => {
    const vol = Math.min(1.0, Math.max(0.1, v / 15)) * 0.5;
    playTone(1200 + Math.random() * 300, 'sine', 0.1, vol);
  },

  // 범퍼 타격 (오락실 스프링 소리)
  playBumper: () => {
    playTone(200, 'sawtooth', 0.2, 0.5, 600);
  },

  // 못(Peg) 타격 (실로폰 소리)
  playPeg: () => {
    playTone(900 + Math.random() * 200, 'sine', 0.1, 0.4);
  },

  // 아이템 획득 일반음
  playItem: () => {
    playTone(600, 'sine', 0.2, 0.4, 1000);
  },

  // 플리퍼 타격 (강한 기계음)
  playFlipper: () => {
    playTone(150, 'square', 0.15, 0.6, 50);
  },

  // 아이템 획득 (부스터)
  playBoost: () => {
    playTone(600, 'sine', 0.3, 0.4, 1200);
  },

  // 스프링 발사 (플런저 압축 및 릴리즈)
  playCharge: () => {
    playTone(100, 'sawtooth', 1.5, 0.2, 400);
  },
  playLaunch: () => {
    playTone(800, 'square', 0.4, 0.6, 100);
  },

  // 결승선 통과 (팡파르 아르페지오)
  playGoal: () => {
    if (isMuted || !isAudioInitialized) return;
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  }
};
