# Expansion final-fix report

## Status

PASS. Results 1 through 150 now use the character celebration path, arithmetic celebrations retain the completed equation, subtraction prompts play Korean followed by British English, and browser QA confirms an unclipped 150 result on desktop plus an overlap-free subtraction result on mobile.

## Root causes

- `celebrationView()` still used the former `<= 100` cutoff even though the catalog and generated character assets extend through 150.
- `renderCelebration()` replaced the stage with only the successful result image. The completed equation existed only in the image-error/result-board fallback.
- The subtraction prompt manifest had only Korean and `playPromptCue()` used the single-language `playVoice()` path.
- The existing celebrating shape selector had higher effective specificity than the first result-wrapper image cap, allowing the tall 150 asset to extend beyond the stage.

## RED evidence

Each behavior was first expressed as a failing focused test.

```text
node --test --test-name-pattern='1~150 정답 캐릭터' tests/app-behavior.test.mjs
```

Result: exit 1, 0 passed, 1 failed. `celebrationView()` returned `result-board` for 150 instead of `number`.

```text
node --test --test-name-pattern='실제로 출제되는|세기 결과 표현' tests/app-behavior.test.mjs
node --test --test-name-pattern='정답 캐릭터 결과' tests/app-contract.test.mjs
node --test --test-name-pattern='정답 캐릭터와 완성된 식' tests/responsive-layout.test.mjs
```

Results: exit 1 with 0/2, 0/1, and 0/1 passing respectively. The pure presentation helper, equation wrapper, and responsive result layout did not yet exist.

```text
node --test --test-name-pattern='뺄셈 문제 음성은|뺄셈 문제 안내는|기존 문제 안내는|뺄셈 한국어 안내' tests/app-behavior.test.mjs tests/audio-manager.test.mjs
node --test tests/voice-assets.test.mjs
```

Results: exit 1, 0/4 and 0/2 passing. The English manifest entry, bilingual prompt queue, MP3, and generator text were absent.

```text
node --test --test-name-pattern='오른쪽 아래' tests/app-contract.test.mjs
```

Result: exit 1, 0/1 passing. The stylesheet cache key still referenced the previous CSS revision.

Browser inspection then exposed the selector-specificity/clipping regression. A state-scoped celebration selector was added under a failing responsive contract, and the final cap was tightened under another failing contract from `min(30vh, 220px)` to `min(27vh, 195px)` before the final browser pass.

The optional 101–150 invariant test passed immediately because the existing expansion catalog already satisfies the exact one-row cap, palette bands, lower-middle centered face, and every-fifth single-eye rules.

## GREEN implementation

- `celebrationView()` routes every integer answer from 1 through 150 to the number-character view.
- New pure `celebrationPresentation(problem)` supplies the view, character number, and completed arithmetic equation. Count mode intentionally returns no equation.
- `renderCelebration()` consumes that presentation in a responsive `.celebration-result` wrapper and retains the existing image-error fallback to `resultBoard(problem)`.
- Celebration CSS reserves a fixed equation row and caps the character inside the remaining stage space. State-scoped desktop, mobile, and short-height selectors prevent existing shape rules from overriding those caps.
- `AudioManager.playPrompt()` captures one cancellation epoch and plays Korean, then optional English, through the existing guarded `playFile()` path. Existing cancellation, watchdog, mute, and voice/SFX ducking behavior remains shared.
- The subtraction manifest now points to both Korean and British English files, while prompts without English continue to play Korean only.
- The stylesheet cache key was advanced to `20260720-result-equation`.

Focused GREEN:

```text
node --test tests/app-behavior.test.mjs tests/app-contract.test.mjs tests/responsive-layout.test.mjs tests/audio-manager.test.mjs
```

Result: exit 0, 62 passed, 0 failed.

```text
node --test tests/voice-assets.test.mjs
```

Result: exit 0, 2 passed, 0 failed.

## Voice asset generation and audit

Only the new British English subtraction prompt was requested from Edge TTS:

```text
uv run --offline --with edge-tts==7.2.8 python scripts/generate_voice_pack.py
```

The generator skipped every existing asset and produced only:

```text
assets/audio/voice/en/prompt-sub.mp3
```

Generation source:

```text
Voice: en-GB-SoniaNeural
Text: What do you get when you take the smaller number away from the larger number?
Rate: -4%
Pitch: +0Hz
```

New file audit:

```text
SHA-256: e99ec0265641039c1412310f812ed8c605ec90d63582e327b9664c6c9f53dec2
Format: MPEG ADTS layer III v2, 48 kbps, 24 kHz, mono
Size: 26,928 bytes
```

Existing tracked audio preservation audit:

```text
mismatch=0; count=0; while read -r mode blob stage filename; do count=$((count + 1)); actual=$(/usr/bin/git hash-object "$filename"); if [ "$actual" != "$blob" ]; then echo "CHANGED $filename"; mismatch=$((mismatch + 1)); fi; done < <(/usr/bin/git ls-files -s assets/audio); echo "tracked_audio_checked=$count mismatches=$mismatch"
```

Result: `tracked_audio_checked=311 mismatches=0`. No pre-existing tracked audio blob changed.

## Browser QA

The bundled gstack browser binary reported `NEEDS_SETUP`, so the already-installed Playwright 1.59.1 and cached Chromium were used against a local static server. The QA harness replaced browser `Audio` with a recorder so playback order could be asserted without audible output.

```text
node .superpowers/sdd/expansion-final-fix-artifacts/qa.mjs
```

Result: exit 0. Console errors: 0. Page errors: 0. Request failures: 0.

Subtraction prompt calls were exactly:

```text
assets/audio/voice/ko/prompt-sub.mp3
assets/audio/voice/en/prompt-sub.mp3
```

Desktop subtraction, 1280×720:

```text
Result appeared: 815 ms after answer input
Stage:   x=115..1165, y=166.359..544.484
Image:   x=573.610..711.458, y=205.449..406.941, 137.848×201.492
Equation:x=473.953..806.047, y=459.891..515.891
Text:    38 − 6 = 32
```

- Character and wrapper inside stage: yes.
- Character/equation overlap: no.
- Stage/answer overlap: no.
- Broken-image fallback text: exact `38 − 6 = 32`.

Desktop result 150, 1280×720:

```text
Result appeared: 823 ms after answer input
Stage:   x=115..1165, y=166.359..544.484
Image:   x=560.267..726.028, y=167.088..409.171, 165.761×242.083
Equation:x=437.438..842.547, y=459.891..515.891
Text:    149 + 1 = 150
Natural image: 1024×1536, complete=true
```

- This is after the application's 480 ms celebration delay; the result remained visible and completely inside the stage.
- Character/equation overlap: no.
- Stage/answer overlap: no.

Mobile subtraction, 390×844:

```text
Stage:    x=11.703..378.297, y=135..515
Image:    x=137.467..256.557, y=211.662..386.106, 119.090×174.444
Equation: x=102.484..287.516, y=470.797..502
Answer:   y=523..604
Keypad:   y=612..828
Text:     38 − 6 = 32
```

- Character and wrapper inside stage: yes.
- Character/equation, stage/answer, and answer/keypad overlaps: none.

Screenshots:

- `.superpowers/sdd/expansion-final-fix-artifacts/subtraction-result-1280x720.png`
- `.superpowers/sdd/expansion-final-fix-artifacts/celebration-150-1280x720.png`
- `.superpowers/sdd/expansion-final-fix-artifacts/subtraction-result-390x844.png`

All three screenshots were visually inspected. The result characters and complete equations are legible, fully visible, and separated from the answer controls.

## Full verification

```text
npm test
git diff --check
node --check src/app-behavior.mjs
node --check src/app.mjs
node --check src/audio-manager.mjs
node --check src/audio-manifest.mjs
python3 -c "compile(open('scripts/generate_voice_pack.py', encoding='utf-8').read(), 'scripts/generate_voice_pack.py', 'exec')"
```

- `npm test`: exit 0, 103 passed, 0 failed, 0 skipped.
- All static/syntax checks: exit 0.

## Files

- Modified: `index.html`
- Modified: `scripts/generate_voice_pack.py`
- Modified: `src/app-behavior.mjs`
- Modified: `src/app.mjs`
- Modified: `src/audio-manager.mjs`
- Modified: `src/audio-manifest.mjs`
- Modified: `styles.css`
- Modified: focused behavior, contract, audio, responsive, asset, and catalog tests
- Added: `assets/audio/voice/en/prompt-sub.mp3`
- Added report/screenshots: `.superpowers/sdd/expansion-final-fix-report.md`, `.superpowers/sdd/expansion-final-fix-artifacts/*.png`

## Self-review

- Equation formatting uses the shared `operatorFor()` implementation, avoiding a second operator mapping.
- The presentation helper is pure and covered with a deterministic subtraction problem that the game model can actually generate.
- Count mode preserves its simpler character-only celebration.
- The successful image path and broken-image fallback both show the same completed equation for arithmetic modes.
- `playPrompt()` uses the same epoch for both languages, so cancellation between Korean and English prevents the second file from starting.
- SFX ducking is preserved because the prompt begins before `pop` is scheduled, exactly as covered by the behavior test.
- The 150 browser check uses the real 1024×1536 character asset and verifies its complete rendered geometry, not only DOM presence.
- Changes are limited to final-review findings, focused regressions, one new voice asset, cache busting, and verification artifacts.

## Concerns

No known functional concerns. Browser QA records the exact audio source sequence but does not assess perceived voice quality through speakers; the generated MP3's format, size, manifest path, and source text are independently covered by automated checks.
