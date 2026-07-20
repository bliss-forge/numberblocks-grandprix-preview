const numbers = Object.fromEntries(
  Array.from({ length: 150 }, (_, index) => {
    const number = index + 1;
    return [
      `number-${number}`,
      {
        ko: `assets/audio/voice/ko/number-${number}.mp3`,
        en: `assets/audio/voice/en/number-${number}.mp3`
      }
    ];
  })
);

export const VOICE = Object.freeze({
  "prompt-count": { ko: "assets/audio/voice/ko/prompt-count.mp3" },
  "prompt-add": { ko: "assets/audio/voice/ko/prompt-add.mp3" },
  "prompt-sub": { ko: "assets/audio/voice/ko/prompt-sub.mp3" },
  "prompt-mul": { ko: "assets/audio/voice/ko/prompt-mul.mp3" },
  ...numbers,
  ...Object.fromEntries(
    Array.from({ length: 4 }, (_, index) => [
      `cheer-${index + 1}`,
      { ko: `assets/audio/voice/ko/cheer-${index + 1}.mp3` }
    ])
  ),
  ...Object.fromEntries(
    Array.from({ length: 3 }, (_, index) => [
      `retry-${index + 1}`,
      { ko: `assets/audio/voice/ko/retry-${index + 1}.mp3` }
    ])
  )
});
