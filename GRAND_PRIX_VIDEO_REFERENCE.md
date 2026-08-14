# Grand Prix Video Reference Principles

## Source and scope

This document records only abstract, reusable design principles from the user-provided racing gameplay video. It does not copy any named character, track, logo, item artwork, UI artwork, sound, or asset from that reference.

## Reusable principles

| Design area | Principle for this project |
|---|---|
| Chase camera | Keep the player kart prominent at the lower center while preserving a clear forward view of the next turn and route choice. Use subtle roll and forward-view widening during high-speed states. |
| Road depth | Use a strong vanishing point, quick movement of near roadside detail, and high-contrast curbs/markers to create speed in a 2D scene. |
| HUD hierarchy | Place persistent race data on outer edges. Do not cover the center road or the player kart. Highlight position changes and tactical state only when relevant. |
| Drift and boost | Make the charge state readable through a progressive meter, wheel sparks, a release state, exhaust flare, screen-edge speed lines, and a short camera response. |
| Rival clarity | Maintain distinctive color silhouettes and separated lanes. Preserve enough scale and spacing for opponents to read as an active pack rather than decorative objects. |
| Start and finish | Use an unambiguous countdown and a finish sequence that shifts attention to rank and celebration. A results view should explain performance clearly. |
| Tactical layer | Give one earned ability a concise visual identity, clear charge rule, deliberate activation, and a brief high-impact response. |

## Original application to Numberblocks Grand Prix

The game remains a 2D pastel Numberblocks race. The player drives number 4's purple kart through original Star Canyon scenery. Number gates act as route-choice boost lines; successful choices charge an original Star Dash skill. The new implementation must favor road clarity, distinct character karts, and child-readable feedback over realism or any visual imitation of the source video.
