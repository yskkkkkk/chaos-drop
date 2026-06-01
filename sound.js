/**
 * =================================================================
 *   CHAOS-DROP : SOUND SYSTEM (Procedural Web Audio API)
 * =================================================================
 */

let audioCtx = null;
let masterGain = null;
let isMuted = false;

window.SoundSys = {
  // 브라우저 AudioContext 초기화 (사용자 첫 클릭 시 호출)
  init: () => {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.5; // 기본 볼륨
      masterGain.connect(audioCtx.destination);
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
    } catch (e) {}
  },

  // ---- 물리/충돌 이벤트 프리셋 ----

  playClick: () => {
    window.SoundSys._playTone(800, 'sine', 0.1, 0.2);
  },

  playBounce: (impact) => {
    // 충돌 강도(impact)에 비례해서 소리 크기와 톤 결정
    const vol = Math.min(0.6, impact * 0.05);
    const freq = 300 + Math.min(500, impact * 20);
    window.SoundSys._playTone(freq, 'triangle', 0.15, vol);
  },

  playBallHit: (impact) => {
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
    window.SoundSys._playTone(200, 'sawtooth', 0.2, 0.5, 600);
  },

  playPeg: () => {
    window.SoundSys._playTone(900 + Math.random() * 200, 'sine', 0.1, 0.4);
  },

  playItem: () => {
    window.SoundSys._playTone(600, 'sine', 0.2, 0.4, 1000);
  },

  playGoal: () => {
    // 목표 통과 시 팡파르 느낌 (빠른 아르페지오)
    if (!audioCtx || isMuted) return;
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => window.SoundSys._playTone(freq, 'square', 0.2, 0.2), i * 100);
    });
  }
};
