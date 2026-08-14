# Grand Prix Visual Audit

## Captured state

- Source: `?demo=grandprix` at 1440×900 on 2026-08-14.
- The player kart is visible and the 2D pastel track renders successfully.
- The start state has a large fixed top HUD and a bottom-center control tray.

## Primary issues observed

1. The player kart is small relative to the wide road and the road surface dominates the screen, reducing the sense of speed and driving agency.
2. The HUD is too tall and reads like a static website header rather than in-race telemetry. It competes with the horizon and removes vertical space from the track.
3. The bottom control tray overlays the player kart and rivals. It blocks race-critical spatial information on desktop and is visually too similar to generic buttons.
4. Rival karts at the lower edge look parked rather than racing because their scale, longitudinal spacing, and lane placement do not create a readable pack.
5. Number gates are small, distant labels. They do not look like collectible boost targets or create a clear risk-reward line choice.
6. The screenshot has no visible drift charge, boost meter, skill icon, speed vignette, or opponent interaction feedback, so the core arcade loop is not legible at a glance.
7. The road is attractive but is too broad and visually flat near the player. Camera motion, roadside parallax, curb contrast, and depth cues must be strengthened.

## Redesign acceptance criteria

- Make the player kart a primary focal point, with unobstructed road space and clear proximity to rivals.
- Separate desktop keyboard guidance from mobile touch controls; do not overlay an always-visible mobile control tray on desktop.
- Add an explicit drift/boost energy readout and a single readable tactical skill with a cooldown.
- Turn number gates into large, lane-specific luminous boost gates with an immediate success or mistake response.
- Improve pack readability, speed sensation, and finish presentation while preserving the existing 2D pastel Numberblocks art direction.

## V2 capture findings

- The split dark telemetry panels restore the horizon and the gate line as the primary visual focus.
- The larger player kart is now clearly legible and sits above the lower road edge.
- The new green BOOST LINE and red SPIN OUT gates make the number choice immediately understandable.
- The desktop guide is compact and does not cover the player.
- The screenshot environment still renders the touch tray at desktop width because its media emulation does not expose a hover-capable pointer. Replace the hover-only rule with a width-based desktop rule so the actual desktop layout cannot retain the tray.
- The visible pack has better character scale but still benefits from removing the desktop touch tray to expose more rival road space.

## Responsive validation findings

The desktop capture now meets the principal view-space goal: the player kart, pack, lane gates, and compact telemetry remain readable without the touch tray. The mobile capture confirms that the larger kart and gates still read correctly, but the six-button control row overflows at the right edge. The mobile controls will be changed to an explicit two-row three-column grid with steering in the first row and brake, drift, and Dash actions in the second row. On mobile, the compact top HUD should prioritize driver, rank, and lap while the Dash action stays in the bottom control grid.

The player camera correction successfully separates the kart from the mobile action panel. However, the capture still shows that the race canvas is wider than the visual viewport under this emulator, so percentage-based control widths remain clipped. The final control rule must use viewport-width constraints rather than the canvas percentage to guarantee a three-column grid inside the visible mobile area.

## Interaction validation

A real Chromium interaction run completed without page errors. Holding W, Left, and Shift produced the `MINI` drift tier and a visible 27 percent drift meter. Releasing Shift set the boost state and increased the Dash meter from 0 to 12 percent. The interaction capture shows the compact HUD, colored gate choices, visible rival pack, drift particles, and an unobstructed desktop road. The Star Dash model itself is additionally covered by the model test: it requires full charge, starts its active duration, applies boost, and suppresses contact penalties while active.
