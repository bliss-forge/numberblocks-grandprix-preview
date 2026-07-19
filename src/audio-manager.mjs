import { VOICE } from "./audio-manifest.mjs";

const SFX = Object.freeze({
  key: { notes: [659.25], duration: 0.07, gain: 0.035, wave: "sine" },
  pop: {
    notes: [392.0, 523.25],
    duration: 0.12,
    gain: 0.06,
    wave: "triangle"
  },
  win: {
    notes: [523.25, 659.25, 783.99, 1046.5],
    duration: 0.22,
    gain: 0.08,
    wave: "sine"
  },
  wrong: {
    notes: [440.0, 392.0],
    duration: 0.16,
    gain: 0.04,
    wave: "sine"
  }
});

export class AudioManager {
  constructor({
    createAudio = src => new Audio(src),
    storage = globalThis.localStorage,
    audioContextFactory = () =>
      new (window.AudioContext || window.webkitAudioContext)(),
    logger = console
  } = {}) {
    this.createAudio = createAudio;
    this.storage = storage;
    this.audioContextFactory = audioContextFactory;
    this.logger = logger;
    this.context = null;
    this.muted = storage?.getItem("numberblocks-muted") === "true";
    this.epoch = 0;
    this.current = null;
    this.voicePlaying = false;
    this.warned = new Set();
  }

  warnOnce(src, error) {
    if (this.warned.has(src)) return;
    this.warned.add(src);
    this.logger.warn(`Audio skipped: ${src}`, error);
  }

  playFile(src, epoch = this.epoch) {
    if (this.muted || !src || epoch !== this.epoch) return Promise.resolve();

    return new Promise(resolve => {
      let audio;
      try {
        audio = this.createAudio(src);
      } catch (error) {
        this.warnOnce(src, error);
        resolve();
        return;
      }

      let finished = false;
      const playback = {
        audio,
        finish: () => {
          if (finished) return;
          finished = true;
          audio.onended = null;
          audio.onerror = null;
          if (this.current === playback) {
            this.current = null;
            this.voicePlaying = false;
          }
          resolve();
        }
      };

      this.current = playback;
      this.voicePlaying = true;
      audio.volume = 0.88;
      audio.onended = playback.finish;
      audio.onerror = error => {
        this.warnOnce(src, error);
        playback.finish();
      };

      let playResult;
      try {
        playResult = audio.play();
      } catch (error) {
        this.warnOnce(src, error);
        playback.finish();
        return;
      }
      Promise.resolve(playResult).catch(error => {
        this.warnOnce(src, error);
        playback.finish();
      });
    });
  }

  async playVoice(key, language = "ko") {
    const epoch = this.epoch;
    await this.playFile(VOICE[key]?.[language], epoch);
  }

  async playAnswer(number) {
    const epoch = this.epoch;
    const entry = VOICE[`number-${number}`];
    await this.playFile(entry?.ko, epoch);
    await this.playFile(entry?.en, epoch);
  }

  cancel() {
    this.epoch += 1;
    const playback = this.current;
    if (!playback) return;

    try {
      playback.audio.pause();
    } catch (error) {
      this.warnOnce(playback.audio.src, error);
    } finally {
      playback.finish();
      if (this.current === playback) this.current = null;
    }
  }

  playSfx(name) {
    const preset = SFX[name];
    if (this.muted || !preset) return;

    this.context ??= this.audioContextFactory();
    const now = this.context.currentTime;
    const ducking = this.voicePlaying ? 0.55 : 1;

    preset.notes.forEach((frequency, index) => {
      const start = now + index * 0.08;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();

      oscillator.type = preset.wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        preset.gain * ducking,
        start + 0.005
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + preset.duration
      );
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + preset.duration + 0.02);
    });
  }

  toggleMuted() {
    this.muted = !this.muted;
    if (this.muted) this.cancel();
    this.storage?.setItem("numberblocks-muted", String(this.muted));
    return this.muted;
  }
}
