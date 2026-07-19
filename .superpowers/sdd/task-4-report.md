# Task 4 — Audio queue and soft sound effects

## Contract and scope

- Implemented only `.superpowers/sdd/task-4-brief.md`.
- Added the build-time voice manifest and a dependency-injected runtime `AudioManager`.
- Removed the old inline browser `speechSynthesis` fallback and the old marimba, glide, noise-click, and `sfx` implementations and call sites from `index.html`.
- Did not wire the new manager into gameplay; Task 5 owns that integration.
- Did not modify character sprites or voice MP3 assets.

## TDD evidence

The audio-manager test was created before either production module existed.

```text
node --test tests/audio-manager.test.mjs
```

- RED result: exit 1 with `ERR_MODULE_NOT_FOUND` for `src/audio-manager.mjs`.
- The first GREEN run passed 10 tests.

A later cancellation-hardening test was also observed failing before its fix:

```text
node --test --test-name-pattern='pause가 예외' tests/audio-manager.test.mjs
```

- RED result: 1 failure because `pause failed` escaped from `cancel()`.
- GREEN result after catching and warning once: 1 passing, 0 failing.

## Implementation

### Voice manifest

- `src/audio-manifest.mjs` exports frozen `VOICE` entries for:
  - 3 Korean prompts
  - 10 Korean and British-English number pairs
  - 4 Korean cheers
  - 3 Korean retries

### AudioManager

- `playVoice(key, language)` plays a single manifest entry.
- `playAnswer(number)` waits for Korean `onended` before starting British English.
- Every voice playback Promise settles on `onended`, `onerror`, rejected/thrown `play()`, or `cancel()`.
- `cancel()` increments an epoch before stopping playback, so an already-resolved Korean step cannot continue into English after cancellation.
- `cancel()` also settles safely when `pause()` itself throws.
- Playback warnings are deduplicated by source.
- Muting is restored from and persisted to `numberblocks-muted`; muting cancels current playback and skips voice/SFX creation.
- `playSfx()` implements the `key`, `pop`, `win`, and `wrong` presets with 80 ms note spacing, 5 ms attack, exponential release, and 0.55 gain ducking while voice is active.

## Verification evidence

Final verification commands:

```text
node --test tests/audio-manager.test.mjs
npm test
git diff --check
node -e '<compile extracted inline script with new Function>'
rg -n 'speechSynthesis|SpeechSynthesisUtterance|\bmarimba\b|\bglide\b|\bblockClick\b|\bNUMBER_NOTES\b|\bsfx\b|\bsayAnswer\b|\bsay\(' index.html
```

- Focused audio tests: 11 passing, 0 failing.
- Full suite: 17 passing, 0 failing.
- `git diff --check`: exit 0 with no findings.
- Extracted inline script syntax compilation: `inline script syntax: ok`.
- Manifest/filesystem check: `voice manifest paths: 30/30 present`.
- Legacy reference search: no matches.

## Concerns and handoff

- `index.html` is intentionally silent between this commit and Task 5: all legacy audio calls were removed so there is no browser-TTS fallback or undefined legacy function, but the new module is not imported yet.
- Task 5 must instantiate and wire `AudioManager` from a module script, connect prompts/answers/retries/SFX, expose mute UI state, and call `cancel()` on navigation/problem changes.
- Browser autoplay policy still requires Task 5 to make the first AudioContext/audio use from a user gesture.
