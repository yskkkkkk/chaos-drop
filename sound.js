/**
 * =================================================================
 *   CHAOS-DROP : SOUND SYSTEM (Procedural Web Audio API)
 * =================================================================
 */

let audioCtx = null;
let masterGain = null;
let isMuted = false;

// [Optimization] Audio Voice Limiter & Throttling
let activeVoices = 0;
const MAX_VOICES = 15;
let lastPlayTime = {
  peg: 0,
  bounce: 0,
  ballHit: 0,
  bumper: 0
};
const THROTTLE_MS = 32; // ~2 frames at 60fps

window.SoundSys = {
  // 브라우저 AudioContext 초기화 (사용자 첫 클릭 시 호출)
  init: () => {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(audioCtx.destination);
      // iOS: context가 suspended 상태로 생성될 수 있으므로 제스처 핸들러 내부에서 즉시 resume
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.");
    }
  },

  resume: () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  },

  toggleMute: () => {
    isMuted = !isMuted;
    if (masterGain) {
      masterGain.gain.value = isMuted ? 0 : 0.5;
    }
    return isMuted;
  },

  // 내부 유틸: 특정 주파수와 파형으로 소리 재생
  _playTone: (freq, type, duration, vol, freqDrop = 0) => {
    if (!audioCtx || isMuted) return;
    if (activeVoices >= MAX_VOICES) return; // Voice Limit
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      // 주파수 하강 효과 (Ex: 론치 스피드, 점프 등)
      if (freqDrop > 0) {
        osc.frequency.exponentialRampToValueAtTime(freqDrop, audioCtx.currentTime + duration);
      }

      // 볼륨 Envelope (Fade out)
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);

      activeVoices++;
      osc.onended = () => {
        activeVoices = Math.max(0, activeVoices - 1);
      };
    } catch (e) {}
  },

  // ---- 물리/충돌 이벤트 프리셋 ----

  playClick: () => {
    window.SoundSys._playTone(800, 'sine', 0.1, 0.2);
  },

  playBounce: (impact) => {
    const now = performance.now();
    if (now - lastPlayTime.bounce < THROTTLE_MS) return;
    lastPlayTime.bounce = now;

    // 충돌 강도(impact)에 비례해서 소리 크기와 톤 결정
    const vol = Math.min(0.6, impact * 0.05);
    const freq = 300 + Math.min(500, impact * 20);
    window.SoundSys._playTone(freq, 'triangle', 0.15, vol);
  },

  playBallHit: (impact) => {
    const now = performance.now();
    if (now - lastPlayTime.ballHit < THROTTLE_MS) return;
    lastPlayTime.ballHit = now;

    const vol = Math.min(0.5, impact * 0.08);
    window.SoundSys._playTone(1200, 'sine', 0.1, vol);
  },

  playCharge: () => {
    window.SoundSys._playTone(200, 'sawtooth', 0.8, 0.1, 600);
  },

  playLaunch: () => {
    window.SoundSys._playTone(150, 'square', 0.3, 0.3, 50);
  },

  playBumper: () => {
    const now = performance.now();
    if (now - lastPlayTime.bumper < THROTTLE_MS) return;
    lastPlayTime.bumper = now;

    window.SoundSys._playTone(200, 'sawtooth', 0.2, 0.5, 600);
  },

  playPeg: () => {
    const now = performance.now();
    if (now - lastPlayTime.peg < THROTTLE_MS) return;
    lastPlayTime.peg = now;

    window.SoundSys._playTone(900 + Math.random() * 200, 'sine', 0.1, 0.4);
  },

  playItem: () => {
    window.SoundSys._playTone(600, 'sine', 0.2, 0.4, 1000);
  },

  playGoal: () => {
    if (!audioCtx || isMuted) return;
    // 경쾌하고 짜릿한 아케이드 승리 효과음 (빰-빰-빰-빠밤!)
    const notes = [
      { f: 523.25, t: 0, d: 0.15 },    // C5
      { f: 659.25, t: 100, d: 0.15 },  // E5
      { f: 783.99, t: 200, d: 0.15 },  // G5
      { f: 1046.50, t: 350, d: 0.4 }   // C6 (조금 쉬고 길게)
    ];
    
    notes.forEach(note => {
      setTimeout(() => {
        window.SoundSys._playTone(note.f, 'sine', note.d, 0.4);
        window.SoundSys._playTone(note.f * 1.01, 'triangle', note.d, 0.2); // 약간의 화음(코러스) 추가
      }, note.t);
    });
  }
};
