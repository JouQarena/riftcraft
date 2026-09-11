// sounds.js - نظام الأصوات مع fallback Web Audio
const SOUND_FILES = {
  roll: ['sounds/roll.mp3', 'sounds/roll.wav'],
  pick: ['sounds/pick.mp3', 'sounds/pick.wav'],
  complete: ['sounds/complete.mp3', 'sounds/complete.wav'],
  replay: ['sounds/replay.mp3', 'sounds/replay.wav'],
  share: ['sounds/share.mp3', 'sounds/share.wav'],
  remove: ['sounds/remove.wav?nocache=20260911f']
};

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('riftcrafter_sound') !== 'off';
    this.audioContext = null;
    this.buffers = {};
    this.elements = {};
    
    // Preload audio elements
    Object.entries(SOUND_FILES).forEach(([name, files]) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 0.6;
      // Try first file
      audio.src = files[0];
      audio.addEventListener('error', () => {
        // fallback to second file
        if (files[1] && audio.src !== files[1]) {
          audio.src = files[1];
        }
      });
      this.elements[name] = audio;
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('riftcrafter_sound', this.enabled ? 'on' : 'off');
    return this.enabled;
  }

  async play(name, options = {}) {
    if (!this.enabled) return;
    
    const { volume = 0.6, loop = false } = options;
    const el = this.elements[name];
    if (!el) return;

    try {
      el.currentTime = 0;
      el.volume = volume;
      el.loop = loop;
      await el.play();
      return el;
    } catch (e) {
      // Autoplay blocked or file not found - fallback to Web Audio beep
      this.playFallback(name);
    }
  }

  stop(name) {
    const el = this.elements[name];
    if (el) {
      el.pause();
      el.currentTime = 0;
      el.loop = false;
    }
  }

  playFallback(name) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      const freqs = { roll: 400, pick: 800, complete: 600, replay: 300, share: 1000, remove: 300 };
      osc.frequency.setValueAtTime(freqs[name] || 500, now);
      if (name === 'roll') {
        osc.frequency.linearRampToValueAtTime(800, now + 0.8);
      } else if (name === 'complete') {
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.linearRampToValueAtTime(659, now + 0.2);
        osc.frequency.linearRampToValueAtTime(784, now + 0.4);
        osc.frequency.linearRampToValueAtTime(1046, now + 0.8);
      } else if (name === 'remove') {
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);
      }
      
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }
}

export const soundManager = new SoundManager();
