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

const DEFAULT_VOICE_TIMEOUT_MS = 12_000;

export class AudioManager {
  constructor({
    createAudio = src => new Audio(src),
    storage,
    audioContextFactory = () =>
      new (window.AudioContext || window.webkitAudioContext)(),
    logger = console,
    setTimer = (callback, delay) => setTimeout(callback, delay),
    clearTimer = timer => clearTimeout(timer),
    voiceTimeoutMs = DEFAULT_VOICE_TIMEOUT_MS
  } = {}) {
    this.createAudio = createAudio;
    this.audioContextFactory = audioContextFactory;
    this.logger = logger;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.voiceTimeoutMs = voiceTimeoutMs;
    this.context = null;
    this.epoch = 0;
    this.current = null;
    this.voicePlaying = false;
    this.warned = new Set();
    this.muted = false;

    try {
      this.storage = storage === undefined ? globalThis.localStorage : storage;
      this.muted =
        this.storage?.getItem("numberblocks-muted") === "true";
    } catch (error) {
      this.storage = storage ?? null;
      this.warnOnce("storage:get", error);
    }
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
      let watchdog = null;
      const playback = {
        audio,
        finish: () => {
          if (finished) return;
          finished = true;
          if (watchdog !== null) {
            this.clearTimer(watchdog);
            watchdog = null;
          }
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
      watchdog = this.setTimer(() => {
        if (finished) return;
        this.warnOnce(src, new Error("Voice playback timed out"));
        try {
          audio.pause();
        } catch (error) {
          this.warnOnce(src, error);
        } finally {
          playback.finish();
        }
      }, this.voiceTimeoutMs);

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

  async playPrompt(key) {
    const epoch = this.epoch;
    const entry = VOICE[key];
    await this.playFile(entry?.ko, epoch);
    if (entry?.en) await this.playFile(entry.en, epoch);
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

    if (!this.context) {
      try {
        this.context = this.audioContextFactory();
        if (!this.context) throw new Error("AudioContext unavailable");
      } catch (error) {
        this.context = null;
        this.warnOnce("sfx:context", error);
        return;
      }
    }

    try {
      if (
        this.context.state === "suspended" &&
        typeof this.context.resume === "function"
      ) {
        try {
          const resumeResult = this.context.resume();
          Promise.resolve(resumeResult).catch(error => {
            this.warnOnce("sfx:resume", error);
          });
        } catch (error) {
          this.warnOnce("sfx:resume", error);
        }
      }

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
    } catch (error) {
      this.warnOnce(`sfx:${name}`, error);
    }
  }

  toggleMuted() {
    this.muted = !this.muted;
    if (this.muted) this.cancel();
    try {
      this.storage?.setItem("numberblocks-muted", String(this.muted));
    } catch (error) {
      this.warnOnce("storage:set", error);
    }
    return this.muted;
  }
}
