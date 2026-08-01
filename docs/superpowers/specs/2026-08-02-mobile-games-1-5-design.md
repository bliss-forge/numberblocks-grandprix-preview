# Mobile Games 1–5 Design

**Date:** 2026-08-02  
**Status:** Approved — use the recommended layouts without further questions

## Goal

Make the home screen and games 1–5 comfortable to play on a portrait phone without changing game rules, audio, character assets, difficulty ranges, scoring, or the Number 6 subway game.

The primary viewport is `390×844`. The layout must remain usable from `360×640` through `430×932`. Landscape phones only need a safe, unclipped fallback; portrait is the polished experience.

## Scope

### Included

- Mobile home presentation for cards 1–5.
- Counting (`count`), addition (`add`), subtraction (`sub`), and multiplication (`mul`) mobile layouts.
- Safety route (`safety`) mobile layout and touch-control placement.
- Mobile safe-area handling, minimum touch targets, focus visibility, overflow prevention, and browser verification.

### Excluded

- The Number 6 subway game screen, its state, art, and controls.
- Math problem generation, difficulty limits, answer evaluation, score, audio, and transitions.
- Safety-route map generation, movement rules, camera algorithm, traffic, obstacles, and guidance logic.
- Character images and the approved 1–150 scaling system.
- A broad desktop redesign.

The Number 6 home card remains present and selectable. It may participate in the shared responsive home grid so it stays reachable, but it receives no game-screen redesign or targeted visual treatment in this work.

## Approved Direction

The design uses an **always-visible control layout**. Children must never need to discover a hidden keypad, open a drawer, or switch modes before they can answer or move.

- Home: portrait scrolling is allowed.
- Games 1–5: the active game stays within one portrait viewport.
- Math: problem, stage, answer, and keypad remain visible together.
- Safety route: mission, map, and directional controls remain visible together.
- Every touch control is at least `48×48px` at the primary viewport and never below `44×44px` at the minimum viewport.

## Home Layout

At `640px` and below, the home becomes a normal vertical document instead of a clipped one-screen composition.

1. Keep the logo and difficulty selector compact at the top.
2. Present cards 1–4 as a two-column grid.
3. Let card 5 span both columns so the adventure mode is visually distinct and has a larger touch area.
4. Keep all card artwork contained; titles and subtitles must wrap inside the card rather than outside the viewport.
5. Preserve the existing Number 6 card and shortcut without changing its game behavior.
6. Avoid horizontal scrolling and partial off-screen cards at `360px`, `390px`, and `430px` widths.

Home may scroll vertically, and the creator credit must remain in the document flow or otherwise avoid covering the last card.

## Games 1–4: Shared Math Shell

Counting, addition, subtraction, and multiplication use one mobile shell so the child learns a single screen structure.

### Vertical regions

1. **Compact HUD:** home, stars, and sound controls respect the top safe area.
2. **Problem prompt:** one or two short lines, centered and never overlapping the HUD.
3. **Flexible stage:** receives all remaining height and clips visual overflow at the scene boundary, not at the character body.
4. **Answer dock:** compact but always visible between stage and keypad.
5. **Numeric keypad:** fixed as the final grid row and padded by the bottom safe area.

The game shell uses `100dvh` with `100svh`/`100vh` fallback behavior so mobile browser chrome does not hide controls. It must not depend on page scrolling.

### Numeric keypad

- Keep the existing digits and delete behavior; do not add a submit step.
- Use three columns with consistent gaps.
- Digits 1–9 occupy the first three rows.
- Delete occupies the lower-left cell.
- Zero spans the two remaining lower cells for a larger target.
- Buttons provide visible pressed and keyboard-focus states.
- The keypad must not cover the answer dock or stage.

### Stage variations

- `count`: keep both counting-friend slots visible and preserve the count hint.
- `add`, `sub`, `mul`: keep both operand slots, operator, and equation label inside the stage.
- Celebration: keep the result character and completed equation visible without invading the answer or keypad regions.
- Large Numberblock characters retain the existing number, shape, scene, and viewport scaling calculations.

At `360×640`, the layout may reduce decorative padding, shadows, and stage trim before it reduces touch targets or hides required controls.

## Game 5: Safety Route

The safety route keeps its existing `5×5` mobile camera and player-centred behavior.

1. Use the full game viewport below the compact HUD and problem prompt.
2. Keep the mission and collected-friend strip visible in a compact top row.
3. Allocate the remaining space to the map viewport.
4. Pin the existing four-button directional pad to the lower-right map corner with bottom/right safe-area padding.
5. Keep each direction button at least `48×48px` at `390×844` and `44×44px` at `360×640`.
6. Maintain sufficient contrast while allowing the map immediately behind the pad to remain understandable.
7. Keep the minimap and target guidance clear of the directional pad and mission row.

No movement, collision, signal, camera, bus, SRT, obstacle, or route-generation logic changes are part of this design.

## Technical Structure

Use a dedicated `mobile-games.css` loaded after `styles.css`.

- Scope home rules to `body[data-state="home"]` and mobile media queries.
- Scope math rules to `body[data-mode="count"]`, `add`, `sub`, and `mul`.
- Scope route rules to `body[data-mode="safety"]`.
- Do not add selectors for `body[data-mode="subway"]`.
- Prefer CSS changes; HTML changes are limited to loading the stylesheet unless a semantic accessibility fix is required.
- JavaScript and game models remain unchanged unless browser verification proves a viewport-state bug that CSS cannot solve.

This separation reduces conflicts with simultaneous Claude work and makes the Number 6 exclusion mechanically reviewable.

## Accessibility and Interaction

- No control relies on hover.
- All interactive elements retain a visible `:focus-visible` state.
- Required text stays readable without zooming.
- Controls respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Reduced-motion preferences continue to disable nonessential movement.
- The DOM order remains logical: problem → stage → answer → keypad.
- Decorative changes do not alter current ARIA labels or live regions.

## Verification

### Automated contracts

- The dedicated stylesheet is loaded after `styles.css`.
- Mobile home uses two columns, card 5 spans both, and horizontal overflow is prevented.
- Math modes use a viewport-height shell and an always-visible three-column keypad.
- Touch targets meet the `48px` primary and `44px` minimum requirements.
- Safety mode keeps the directional pad inside the map with safe-area offsets.
- No selector in the new stylesheet targets `data-mode="subway"`.

### Browser matrix

Capture and inspect these portrait viewports:

- `360×640`: minimum supported phone.
- `390×844`: primary target.
- `430×932`: large phone.

At `390×844`, verify home plus all five modes. For math modes, inspect both question and celebration states. For safety mode, inspect the starting map and directional controls. At all three sizes verify:

- no horizontal scroll;
- no clipped required control or text;
- no overlap between HUD, prompt, stage, answer, keypad, map, and direction pad;
- all expected images load;
- no console or page errors.

Also check one landscape phone viewport for safe fallback behavior, then run the complete test suite.

## Success Criteria

- A child can open and play games 1–5 using only visible touch controls.
- Home is scrollable but never horizontally clipped.
- Each game fits within one portrait viewport.
- The primary gameplay content remains larger than the controls while every target stays easy to tap.
- Desktop behavior and the Number 6 subway game continue to pass their existing tests unchanged.
