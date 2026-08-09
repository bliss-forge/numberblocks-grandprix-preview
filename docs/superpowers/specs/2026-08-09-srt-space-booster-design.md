# SRT Space Booster Design

## Goal

Add a child-friendly SRT boost action. During ordinary driving, pressing Space raises
the train to exactly 500 km/h for five seconds. After the boost ends, the control has
a ten-second cooldown. Station approach, stopping, doors, boarding, and route-choice
Space actions must keep their existing behavior.

## Input Contract

- Space starts a boost only when the selected train ID is `srt`, the train is in
  `driving`, and it has not entered the current station approach zone.
- The boost starts only when no boost or cooldown is active.
- Repeated keydown events never restart or extend a boost.
- In the station approach zone, Space retains the existing early-stop or precision-stop
  behavior.
- Outside `driving`, Space retains the existing boarding, door, stopped, and branch
  behavior.
- The ordinary-driving horn action is replaced by the boost action.

## Timing and Speed

- Active duration: 5,000 ms.
- Cooldown duration: 10,000 ms, beginning only after the active duration ends.
- Minimum interval between successful activations: 15,000 ms.
- While active, speed is exactly 500 km/h regardless of Up or Down input.
- Elapsed time comes from the existing simulation tick rather than browser timers, so
  background-tab delays and frame-rate changes do not desynchronise state.
- Entering the station approach zone ends the boost immediately. Normal approach
  envelope and stopping rules then apply in the same tick.
- Cooldown time continues to elapse through stopping, boarding, and other phases.
- Starting a new route segment does not bypass an active cooldown.

## State and Events

The immutable SRT journey state gains two non-negative counters:

- `boostRemainingMs`
- `boostCooldownMs`

Space activation emits `boost-start`. Natural expiry emits `boost-end` and starts the
cooldown. Safety cancellation at the approach zone emits `boost-end` with a safety
reason. Cooldown completion emits `boost-ready`. A blocked Space press emits
`boost-unavailable` with the remaining cooldown.

The counters are reset when a new SRT journey is created. Existing saved or fixture
states that omit the fields are treated as zero.

## Presentation

- A compact HUD badge shows one of `BOOST 준비`, `BOOST 5…1`, or `충전 10…1`.
- The badge is visible in both cab and exterior views without covering the destination
  board, speedometer, doors, or mobile controls.
- During boost, the digital speed reads 500 and the analogue needle remains pinned at
  its maximum position.
- Active boost adds a restrained cyan glow and stronger speed-line treatment. Cooldown
  uses a neutral treatment. Reduced-motion mode removes animation while preserving
  the state text and colour contrast.
- Existing sound effects may be reused for start, end, and unavailable feedback. No
  new voice asset is required.

## Error and Safety Behaviour

- Boost cannot activate during station approach, stopping, correction, boarding,
  stopped, ready, or branch phases.
- Invalid, missing, negative, or non-finite counter values are normalised to zero.
- A large elapsed tick may consume the rest of the active duration but not skip the
  cooldown: cooldown starts at the active-expiry boundary and receives only the elapsed
  time remaining after that boundary.
- Completion, overrun correction, and existing finite-route guarantees remain intact.

## Testing

- Model tests cover activation, exact 5-second duration, exact 10-second cooldown,
  repeated Space, missing legacy counters, large elapsed ticks, station-zone safety
  cancellation, and preservation of all existing contextual Space actions.
- Scene tests cover HUD text/state, digital 500 display, needle cap, view parity, and
  reduced-motion styling.
- App contract tests cover key repeat prevention and boost event feedback.
- The full test suite and browser QA run at 1280×720 plus the existing mobile landscape
  viewport. Browser checks include no overflow, no console errors, and no obstruction
  of the stopping controls.

## Scope

This change applies only to the SRT driver game. It does not alter the KTX fallback
train, subway game, safety game, route distances, scoring, or station timing windows.
