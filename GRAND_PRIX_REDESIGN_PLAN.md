# Grand Prix Redesign Plan

## Product direction

The game should feel like an original, child-friendly arcade kart race rather than a static educational canvas. The math route remains important, but it must appear as a driving line-choice and reward loop instead of a worksheet overlay.

## Core changes

| Area | Current weakness | Redesign decision |
|---|---|---|
| Steering and drift | Drift is a toggle, so timing and release reward are unclear | Hold `Shift` to drift and release it for a tiered mini, super, or ultra boost |
| Tactical skill | No readable skill despite the request for kart-racing agency | Add `Star Dash`, charged by correct number gates and strong drift releases, activated by `Space` |
| Number gates | Distant labels do not read as driving targets | Turn each choice into a large glowing lane gate with an obvious correct reward and wrong-choice danger color |
| Player focus | The kart is small and covered by desktop touch controls | Enlarge player kart, hide touch controls on precision-pointer desktop, and keep a compact keyboard guide in an unobtrusive corner |
| HUD | Large header consumes the racing horizon | Replace with small split telemetry panels: position, lap/speed, objective, drift meter, and skill button |
| Speed feedback | Boost exists but is not legible as a reward | Add boost tier meter, screen vignette/lines, stronger particles, slight camera roll, and a Star Dash flash |
| Rivals | They feel parked at the lower edge | Enlarge projected rivals modestly and retain clear road-space separation from the player |

## Acceptance criteria

1. The player can identify rank, lap, speed, objective, drift tier, and Star Dash readiness without covering the road.
2. Desktop does not show the mobile touch tray over the player kart.
3. Correct gates are visibly larger and brighter than the current labels, and a correct hit fills a tactical reward.
4. Drift release produces a clearly tiered boost state that is visible in both HUD and scene.
5. Star Dash is readable, has a deliberate input, and cannot be repeatedly activated while empty.
6. The updated 1440×900 deterministic demo shows a large player kart, readable gates, racing telemetry, and no blank or stalled canvas.
7. Existing 1 through 9 games continue to pass regression tests.
