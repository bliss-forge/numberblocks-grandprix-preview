# Task 5 — Color Block Studio UI and app integration

## Contract and scope

- Replaced the legacy inline-CSS/inline-JavaScript page with an accessible static
  shell in `index.html`, a dedicated `styles.css`, and `src/app.mjs`.
- Integrated `createProblem`, `applyDigit`, `NUMBERBLOCKS`, and `AudioManager`.
- Kept the approved PNG and MP3 assets and the voice generator unchanged.
- Added no runtime dependency, remote font, CDN, or network request.

## TDD evidence

`tests/app-contract.test.mjs` was added before the production files were changed.

```text
node --test tests/app-contract.test.mjs
```

RED:

- 3 tests failed, 0 passed.
- The failures specifically reported the missing `styles.css` link, missing
  `mute-btn`, and zero `.mode-card` elements.

GREEN after implementation:

- 3 tests passed, 0 failed.

Final full suite:

```text
npm test
```

- 27 tests passed, 0 failed.

## Implementation

### Static shell and visual system

- The home screen uses the approved One, Three, and Four sprites as the three
  primary mode illustrations, with visible keyboard badges.
- The world is a layered broadcast-storybook set: paper-cut clouds, sun rays,
  rolling grass, small flowers, and red stage curtains.
- Controls use opaque warm paper, crisp white borders, and press-depth shadows,
  with no glass cards or purple-gradient styling.
- The game screen preserves a strict prompt → character/stage → answer hierarchy.
- The local font stack favors rounded Korean display faces when installed and
  falls back to platform Korean fonts; there is no font download.
- Motion is limited to entrance, answer input, retry shake, and celebration.
  `prefers-reduced-motion` collapses those transitions.

### App behavior

- `body[data-state]` is kept at `home`, `playing`, or `celebrating`, and
  `body[data-mode]` tracks `count`, `add`, or `mul`.
- `event.key` handles both top-row and numpad digits. `Escape` always returns home.
- Input is accepted only in `playing`, so celebration locks duplicate answers.
- A cancellable timer registry and `AudioManager.cancel()` stop pending visual and
  audio work on home navigation and new problems.
- New problems play a gentle pop and Korean prompt. Correct answers play the win
  cue, then the manifest-backed Korean → British English number queue.
- Wrong answers clear the buffer, play a soft retry, and force animation reflow so
  the shake visibly restarts on repeated attempts.
- The mute control keeps an accessible label and `aria-pressed`, is available on
  the home screen, and restores its persisted state on reload.
- Missing or rejected audio remains non-blocking through `AudioManager`.
- Dynamic Korean copy was changed from awkward particle combinations such as
  `1 더하기 1는?` to `1 더하기 1! 답은 얼마일까요?`.

## Browser QA evidence

The app was served locally at `127.0.0.1:4173` and tested through the connected
Chrome browser. No browser tooling or package was installed.

### 1280 × 720 viewport

- DOM viewport reported exactly `1280 × 720`; document overflow was also
  `1280 × 720`.
- All three home cards were in the viewport, with overlap areas `[0, 0]`.
- All three home sprite images decoded successfully.
- Key `1` entered count mode. The observed problem used answer `3`.
- Prompt, stage, answer dock, and character were all inside the viewport.
- Prompt/stage, stage/answer, and character/answer overlap areas were all `0`.
- Two consecutive wrong `9` presses both restored `.wrong` on the character and
  answer box, kept the game in `playing`, and showed the gentle retry message.
- Correct `3` changed state to `celebrating`, showed the numeric answer, incremented
  the star, and applied the character celebration class.
- A separate immediate post-correct check confirmed a further digit did not alter
  the celebrating state, answer, or star count.
- `Escape` returned to `home`, cleared `data-mode`, and hid the game region.
- Mode `2` rendered two character images and a plus operator.
- Mode `3` rendered the multiplication grid with the exact row, column, and total
  block counts.

### Mute persistence

- Clicking the unique `소리 끄기` button changed `aria-pressed` to `true` and the
  label to `소리 켜기`.
- The state remained muted in add mode, after returning home, and after a full
  browser reload.

### 1440 × 900 viewport

- DOM viewport and document overflow both reported exactly `1440 × 900`.
- All three home cards remained inside the viewport with no overlap.
- In add mode, both characters, prompt, stage, and answer dock remained inside the
  viewport.
- Character/character, prompt/stage, and stage/answer overlap areas were all `0`.
- All rendered images decoded successfully.

### Console and resource evidence

- App-origin console errors filtered to `127.0.0.1:4173`: `[]`.
- Chrome itself emitted unrelated `chrome-extension://...` errors; none originated
  from the app.
- Server evidence showed HTTP 200 for the page, CSS, all app modules, all ten
  character sprites, Korean prompt/retry files, and Korean/English answer files.
- The first pass requested a missing default favicon. A local data favicon was
  added, so the finished shell no longer causes that request.

Screenshots:

- `/tmp/numberblocks-task5-qa/home-1280x720.png`
- `/tmp/numberblocks-task5-qa/count-1280x720.png`
- `/tmp/numberblocks-task5-qa/home-1440x900.png`
- `/tmp/numberblocks-task5-qa/add-1440x900.png`

The 1440 captures are exactly 1440 × 900. The Chrome capture surface returned the
1280 screenshots as 1280 × 694 even though browser-side `innerWidth/innerHeight`
and all layout checks reported 1280 × 720; the exact 720-height validation therefore
uses the recorded DOM rectangles rather than screenshot pixels.

## Final verification

```text
node --test tests/app-contract.test.mjs
node --check src/app.mjs
node --check src/game-model.mjs
node --check src/audio-manager.mjs
node --check src/audio-manifest.mjs
npm test
git diff --check
rg -n 'speechSynthesis|SpeechSynthesisUtterance|https?://|@import|<style' \
  index.html styles.css src/app.mjs
git status --short -- assets scripts requirements-voice.txt
node -e "<import game-model, audio-manager, and audio-manifest>"
```

- Focused contract tests: 3 passing, 0 failing.
- Full suite: 27 passing, 0 failing.
- JavaScript syntax checks: clean.
- Runtime module imports: clean.
- Whitespace check: clean.
- Legacy browser TTS, inline style, and remote-resource scan: no matches.
- Approved character/audio assets and voice generator: unchanged.

## Visual self-review

- The sprites are the clearest focal point on both the home cards and stage.
- The red curtains and paper-set landscape make the experience feel like a small
  preschool broadcast rather than a generic web dashboard.
- Card colors distinguish the three modes without competing with character colors.
- The 1280 × 720 layout intentionally removes the optional eyebrow line and reduces
  sprite/card height, while preserving faces, labels, and answer controls.
- The 1440 × 900 layout adds breathing room and larger hero characters without
  changing the interaction hierarchy.
- Focus rings, visible keyboard guidance, semantic regions, live answer/status text,
  and persistent mute state keep the keyboard-first flow understandable without
  audio.

## Concerns and handoff

- The browser screenshot API's 1280-height discrepancy is a capture-surface issue,
  not a DOM overflow; exact rectangle checks passed at the requested viewport.
- Audio sequence and cancellation are covered by the existing focused unit tests and
  by successful MP3 requests during browser QA. Automated browser audio-quality
  judgment is out of scope; the user already approved the generated sample voices.

## Review-finding fixes

All Task 5 review findings were addressed without changing PNG, MP3, the voice
generator, or voice requirements.

### TDD RED

Added `tests/app-behavior.test.mjs` before production changes, covering the actual
app cue helpers with a real `AudioManager`, transient entrance-class cleanup, and
the dynamic Korean problem copy.

```text
node --test tests/app-behavior.test.mjs
```

- Exit code: 1.
- `ERR_MODULE_NOT_FOUND` for the deliberately absent `src/app-behavior.mjs`.
- 1 test file failed, proving the new application behavior did not yet exist.

### TDD GREEN

```text
node --test tests/app-behavior.test.mjs
```

- 4 tests passed, 0 failed.
- Prompt voice begins synchronously before `pop`; the observed first ramp was
  `0.06 * 0.55` while `voicePlaying` was true.
- Retry voice begins synchronously before `wrong`; the observed first ramp was
  `0.04 * 0.55` while `voicePlaying` was true.
- `.enter` is removed exactly once on the first `animationend`.
- Add/multiply copy is exactly `A 더하기 B의 답은 얼마일까요?` and
  `A 곱하기 B의 답은 얼마일까요?`.

`src/app.mjs` now uses these tested helpers directly. Neither voice call is awaited
or deferred, so playback and `AudioContext` work remain inside the initiating click
or key event. Character creation registers entrance cleanup before any retry class
can be applied, preventing `.wrong` removal from exposing `.enter` again.

### Full verification after review fixes

```text
npm test
node --check src/app.mjs
node --check src/app-behavior.mjs
node --check src/game-model.mjs
node --check src/audio-manager.mjs
node --check src/audio-manifest.mjs
node -e "Promise.all([import('./src/game-model.mjs'), import('./src/audio-manager.mjs'), import('./src/audio-manifest.mjs'), import('./src/app-behavior.mjs')]).then(() => console.log('module imports ok'))"
git diff --check
rg -n 'speechSynthesis|SpeechSynthesisUtterance|https?://|@import|<style' \
  index.html styles.css src/app.mjs src/app-behavior.mjs
git status --short -- assets scripts requirements-voice.txt
```

- Full suite: 31 passed, 0 failed.
- All syntax and runtime import checks passed.
- `git diff --check` passed.
- Legacy browser TTS, inline style, and remote-resource scan returned no matches.
- Character/audio assets, generator scripts, and `requirements-voice.txt` remained
  unchanged.

### Browser smoke after review fixes

Reloaded the already-running local app at `127.0.0.1:4173` through the connected
browser and exercised the production UI:

- Add mode rendered `1 더하기 2의 답은 얼마일까요?`.
- Both character `.enter` classes naturally reached zero after 700 ms.
- Entering wrong answer `9`, then waiting through the retry animation, left
  `.character.enter` at zero, `.character.wrong` at zero, reset the answer to `?`,
  kept state `playing`, and showed the gentle retry message.
- Multiply mode rendered `3 곱하기 2의 답은 얼마일까요?`.
- App-origin browser warnings/errors: `[]`.
