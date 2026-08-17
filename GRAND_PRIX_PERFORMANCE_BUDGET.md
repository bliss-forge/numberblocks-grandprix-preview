# Grand Prix Performance Budget

## Baseline

The isolated Chromium run uses a 1440×900 viewport, CPU Canvas 2D, GPU disabled, a real accelerate-and-drift input sequence, and 300 sampled animation frames. The v34 high-speed run reached 148 km/h with no page errors. Its mean frame time was 18.41 ms, p95 was 33.4 ms, and 17 of 300 frames exceeded 33.34 ms. The visible canvas occupied 1306×728.5 CSS pixels and about 0.95 million backing pixels at device scale factor 1. Retina displays can multiply that backing cost several times, so fixed device-pixel-ratio rendering is the primary low-spec risk.

## Performance contract

| Area | Budget | Reason |
|---|---:|---|
| Canvas backing store | 1.3 million pixels maximum | Keeps Retina and large-screen rendering bounded while retaining clear sprites and road lines. |
| Road perspective samples at high speed | 62 or fewer | The road remains visibly curved without redrawing 95 detailed slices per frame. |
| Lane marker quads | 15 or fewer | Preserves forward motion cadence with less path work. |
| Roadside depth markers | 14 or fewer total | Keeps parallax readable without excessive fills and transforms. |
| Continuous speed streaks | 14 or fewer | Retains speed feedback without turning every fast frame into a particle field. |
| Drift particles | 10 or fewer | Keeps a visible tire-slip trail while limiting blur and arc work. |
| Off-road particles | 10 or fewer | Communicates the penalty without persistent low-end frame spikes. |
| Gameplay simulation | Four AI racers only, no allocations in the core tick | Maintains current racing behaviour at negligible CPU cost. |

The optimisation must never remove the player kart, nearby rivals, correct/incorrect gate contrast, Starbox readability, or drift exit feedback. Quality reduction is applied first to backing resolution and distant decorative geometry, never to gameplay simulation or the tactical objects in the immediate driving corridor.

## v35 implementation rules

The canvas render scale is calculated from the CSS area, device pixel ratio, and the pixel budget rather than blindly using a two-times device ratio. High-speed road samples use a larger depth step. Distant curb and roadside geometry are reduced, and expensive glow/gradient work is reserved for objects that are large enough to matter visually. The high-speed streak, drift, and dust loops use fixed small caps. The result should improve the p95 frame time while preserving a legible compact pack and a strong corner apex.

## Acceptance criteria

The same 300-frame high-speed test must remain free of page errors and should improve the baseline p95 of 33.4 ms. The new scene must still show a player kart, at least two forward rivals in the deterministic corner view, a visible drift cue, curved road framing, and speed feedback at 140 km/h or above.

## v35 measured result

The same CPU-only 1440×900 high-speed input sequence completed without page errors after the v35 projection cache and rendering caps. At device scale factor 1, mean frame time was 18.07 ms, p95 was 33.3 ms, the worst frame was 33.4 ms, and 10 of 300 frames exceeded 33.34 ms. This improves on the v34 run, which had 17 frames over 33.34 ms and a 50 ms worst frame.

At device scale factor 2, the adaptive backing store used 1,249,995 pixels, which is within the 1.25 million-pixel contract instead of rendering the full four-times Retina surface. The no-GPU stress run completed without page errors. This validates the cost-control mechanism; the ordinary scale-1 high-speed run remains the primary comparison for motion smoothness.
