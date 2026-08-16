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

## Video-informed iteration

The next iteration prioritizes the following original implementation goals.

| Goal | Concrete acceptance criterion |
|---|---|
| Camera speed response | Higher speed and Star Dash widen the forward road view slightly without changing the 2D art style or hiding the kart. |
| Start skill | A successful launch window during the countdown produces a short, clearly labeled Start Spark boost. |
| Tactical interaction | Star Dash has a visible overtake behavior against nearby racers, not only a speed value and contact protection. |
| HUD clarity | The race edges show rank, lap, speed, learning objective, drift tier, Dash charge, and a compact route progress indicator without covering the driving line. |
| Rival feedback | Overtakes are readable through small rank-change callouts and a pack that keeps distinct colored kart silhouettes. |
| Road energy | Near-road curb cadence, roadside depth, and boost-state screen treatment make forward motion easier to perceive in still and moving views. |
| Finish reward | The end state acknowledges the final rank and the completed number target as one coherent racing result. |

## Competitive finish iteration

| Loop element | Original Numberblocks Grand Prix design |
|---|---|
| Rear pressure | When a rival approaches from behind on a similar lane, show a compact colored warning near the lower road edge. It is information, not an attack item. |
| Rank transition | Track the last rank in the model. A gain shows `UP!` and a loss shows `CHASE!` briefly without blocking the driving line. |
| Dash pass | Keep Star Dash's physical overtake and pair it with rank transition feedback when it changes position. |
| Finish reward | Replace plain final text with a small results card: place, route completion `4 → 10`, completed laps, and a short child-friendly rank line. |
| Celebration | Use original star confetti, checker ribbon, and a kart spotlight. Keep the scene 2D pastel and avoid any branded podium or copied race presentation. |

## Star Dash information hierarchy

| Element | Rule |
|---|---|
| Dash energy core | The Dash chip contains a small circular energy core with a fill ring. The numeric percentage stays available but secondary. |
| Ready state | At 100%, the core changes to a bright star state and shows `SPACE` as the immediate action cue. |
| Active state | During Star Dash, the chip reads `DASHING` and the core pulses without adding a separate center overlay. |
| Learning gates | Correct green number gates retain their number value and add a subtle original star crown; red decoys remain visually quieter and only state `NOT THIS`. |
| Route continuity | The same warm star accent connects the completed route meter, correct gate, and Dash core, turning arithmetic choices into a visible racing reward loop. |

## Race sound and timing feedback

| Race event | Existing safe feedback |
|---|---|
| Grid ready | Start the already available synthesized engine at zero speed. Do not play a win jingle. |
| Start Spark | Use a short bright `bell` on successful timing and let the engine pitch rise with the boost. |
| Drift start | Use one soft `pop` only on the initial press. Drift release uses `key` for mini, `bell` for super, and `jingle` for ultra. |
| Correct number gate | Use `bell`; wrong gate uses `wrong`. |
| Star Dash | Use `jingle` on a full Dash and a softer `key` for the actual pass. |
| Contact and rank loss | Use `wrong` once when impact starts; a rank gain uses `bell`. |
| Finish | Stop the engine before the existing `win` celebration. |
| Continuous feel | Feed current kart speed into the existing WebAudio engine loop every frame. The engine is stopped by the home transition and finale state. |

## Pack and corner response rules

| Element | Rule |
|---|---|
| Rival pack choice | If a racer approaches another racer within a short forward gap, it chooses one of two bounded side offsets based on its number and phase, rather than overlapping the same lane. |
| Player pressure | When the player is close ahead, the nearest trailing rival shifts to an open side line before contact range. This makes the rear-pressure alert correspond to a visible kart. |
| Passing lane | A racer slightly behind the player aims for a nearby free line, but never leaves the safe road band. Its lane target eases rather than snaps. |
| Corner look-ahead | The camera shifts a small amount toward the curve direction calculated ahead of the kart. Higher speed strengthens the look-ahead but stays inside the existing road framing. |
| Drift apex | While a sufficiently fast drift is held, apply a tiny camera roll and a small lateral view counter-shift. It makes the road feel like it rotates under the kart without moving HUD elements. |
| Safety | All offsets are capped under the existing world edge, keep 2D perspective, and cannot create obstacle-like blocking behavior. |

## Item lane and depth-response iteration

The next race layer adds a single original tactical object without turning the road into an obstacle field. A glowing **Starbox** appears at a small number of fixed, clearly projected lane positions on every lap. Driving through a box only grants one held item at a time: the **Starburst**, a friendly star-comet projectile. It may be launched with `E` or the ITEM button only when an opponent is ahead. The projectile has a short, legible flight line, finds the nearest forward rival, and applies a brief spin and speed loss. It never targets a racer behind the player, cannot affect the player, and does not hide the driving line.

| Area | Rule | Player-facing result |
|---|---|---|
| Starbox placement | Five boxes are placed away from the number gates, with one active collection per box per lap and a generous lane capture width. | The player can choose a tactical line without confusing arithmetic gates. |
| Held item | A kart holds at most one Starburst. Collecting another box while loaded leaves the existing item unchanged. | The item state is understandable at a glance. |
| Starburst target | The nearest rival 5 to 165 course units ahead is selected. A short-lived star comet follows that target and then delivers one soft spin. | The attack reads as a forward racing action rather than an unavoidable hazard. |
| Attack fairness | Launching without a forward target preserves the held item. A hit cannot cause a lap skip or an off-road teleport. | The mechanic creates a passing chance without invalidating driving skill. |
| Input | `E` launches the held Starburst. `Space` remains reserved for the charged Star Dash. | The two tactical inputs stay distinct. |
| Sound | Box collection uses `pop`, launch uses `jingle`, and the rival impact uses `wrong` once. | New feedback remains consistent with the existing safe synthesized palette. |

The handling revision introduces a smoothed steering response instead of directly turning lateral velocity from a binary key state. The kart now eases into steering, has more stable high-speed grip, retains deliberate drift slide, and applies a small counter-steer recovery when the key is released. Braking remains strong, while the physical visual lean follows the smoothed input rather than snapping with each keypress.

The depth revision remains strictly 2D canvas art. It widens the high-speed road field subtly, increases near-road expansion, layers curved curb bands and roadside star markers, gives projected boxes and karts grounded shadows, and adds restrained forward motion streaks only at speed. The camera roll stays below the HUD and the player kart remains inside the lower central safe zone.

## Kart-feel rebuild: compact pack and committed corners

The next iteration changes the race from an education-first lane slide into an original, child-friendly arcade kart loop. The Numberblocks, star route, and 2D pastel artwork remain, but the opening must feel like joining a rolling pack rather than being shown a worksheet. The first driving decision is a broad opening corner with a visible inside line. The arithmetic gates stay after that opening commitment and work as high-risk boost lines, not the primary starting composition.

| Loop | New rule | Intended feel |
|---|---|---|
| Rolling start pack | The player starts in fifth, close behind a staggered group that occupies a compact forward corridor. Rival rendering receives a camera-depth offset so racers ahead visibly sit on the road in front of the player rather than forming a parked bottom row. | Immediate chase and overtake intent. |
| Turn commitment | Steering builds a visible yaw and lateral load. At high speed, an ordinary turn loses momentum, while holding Drift during a real turn keeps a controlled slip, builds charge in proportion to speed and steer, and provides a decisive exit boost. | The player must set up, hold, and release through a corner. |
| Draft and slingshot | Sitting in the wake of a nearby forward rival produces a brief draft state. Moving out of the wake converts it into a small passing burst, while an AI leader can choose a defensive line. | Drafting and line choice become a repeatable passing tool. |
| AI race craft | Rivals choose inside, neutral, or defensive targets based on nearby racers, current curve direction, and the player’s approach. They remain bounded inside the road and avoid opaque obstruction. | The pack contests a corner instead of weaving decoratively. |
| Camera response | The 2D chase camera lowers its horizon, narrows toward a forward apex, and strengthens side-road parallax at speed. Near curve direction shifts the view before the turn; a drift adds controlled roll and shoulder compression. | The player perceives forward momentum and corner entry before turning. |
| Road readability | High-speed curb segments, apex chevrons, and larger passing silhouettes are projected with depth. The HUD stays compact while the road and nearby karts own the frame. | Movement reads from the scene rather than from numbers alone. |
| Items | Starbox remains a single fair held item, but a target lock is only offered when a forward rival is within an active passing band. A successful hit opens a short visible passing window, not a passive speed subtraction. | The attack changes the race decision at the moment it is used. |

The acceptance test for this rebuild is behavioural as well as visual. In the first twelve seconds, the player must see a compact pack, one clear inside or outside line, and a first-corner drift opportunity. A sustained fast turn must show yaw, sparks, road lean, and a stronger exit than a non-drift turn. A rival directly ahead must create an observable draft or defensive response. At desktop 1440×900, the player kart remains clearly visible, yet at least two opponents appear in the forward road space rather than at the bottom edge.
