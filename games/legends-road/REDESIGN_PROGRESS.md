# Legends Road — redesign progress

Tracks the work against `REDESIGN_SPEC.md`. See `REDESIGN_AUDIT.md` for the
baseline. Each entry lists what changed, how it was tested and what is left.

Test setup: Playwright, headless Chromium, SwiftShader (software WebGL), at
375×812 (phone, touch), 768×1024 (tablet, touch) and 1366×768 (desktop).
Software rendering is far slower than a real GPU, so frame rates are not
meaningful. Draw-call and triangle counts are, though they vary ±20% with
what is on screen at the sampled moment.

## Phase 1 — audit and stability ✅ (first pass)

- [x] Audit written (`REDESIGN_AUDIT.md`), with baseline screenshots, per-frame
  cost and a feature inventory.
- [x] **Source code now in the repository.** The 14 modules are in `src/`,
  built by `tools/build.mjs` into a byte-identical `index.html`. A new CI
  workflow (`legends-road-check.yml`) fails if `index.html` is out of date or
  the script has a syntax error.
- [x] Primary flow tested at all three sizes: title → episodes, garage and
  spin → race → pause and resume → finish → story → standings → reload. No
  console errors.
- [x] **Crowd and two-wheeler cost cut.** Limbs went from 112 to 60
  triangles, heads from 336 to 160, and wheel spokes changed from capsules to
  thin boxes.

  | Model | Before | After |
  | --- | --- | --- |
  | Visible pedestrians | 151k triangles | 91k |
  | Okada | 13.4k | 6.4k |
  | Keke | 13.1k | 8.6k |

- [x] **Shadow pass on 3D Fast.** Scenery receives shadows but no longer casts
  them. Cars keep their contact shadows.
  - 3D Fast per frame: about 390 → 320 draw calls, and about 510k → 360k
    triangles.
  - 3D High is unchanged in quality.

## Phase 3 — car presentation 🔶 (geometry pass done)

- [x] **Real wheel arches.** The body's lower edge now rises in a circle (1.2 ×
  tyre radius) over each axle, with extra loft sections there so the arch is
  smooth. Before, the skirt ran at 30–38 cm along the whole car and hid most
  of each tyre.
- [x] **Dark arch liners.** Double-sided tubs over each wheel, so you can't see
  into the body through the arch.
- [x] **Lower, believable ride heights.**

  | Car | Lowered by |
  | --- | --- |
  | Saloon, executive | 10 cm |
  | Estate, hatch | 9 cm |
  | Minivan | 7 cm |
  | Mid-size SUV | 4 cm |
  | 4x4, pickup, bus | unchanged (high clearance is correct) |

- [x] **Headlights.** A dark housing, a lens strip and two projector lamps
  instead of a flat white block.
- [x] **Rear.** Wrap-around tail-lamp sides, reflectors and twin exhaust tips on
  the saloons, hatch, estate and minivan.
- [x] **Brake lights.** No longer blown out to near-white: 7× → 3.4× emissive
  when braking or stopped, 1.4× → 1.3× when driving.
- [x] **Tested.**
  - Studio renders of all 8 everyday cars from the three-quarter, side and
    front views, plus rear renders.
  - Chase-camera race views on desktop (High) and phone (Fast).
  - Each car is now about 8k triangles (was 6.2–7.2k).
  - Wheels sit on the ground and steer as before (wheel code unchanged).
- [ ] Garage orbit preview (drag to rotate, zoom), replacing the static
  renders.
- [ ] Cosmetic customisation (paint finish, rims, tint) with Apply, Cancel and
  Reset, charging currency once.
- [ ] Optional: softer body creases and a sculpted bonnet. The loft has 9
  points per section; more would raise the triangle count.

## Phase 4 — city art direction 🔶 (architecture pass done, applies to all Nigerian cities)

- [x] **Three façade variants per style instead of one.**
  - Stucco houses: arched windows; louvred shutters with security bars; wide
    aluminium sliders with a coloured balcony band.
  - Offices: glass grid; concrete fins; ribbon windows.
  - Towers: blue, teal or bronze glass.
- [x] **Street fronts on road-facing buildings** within 38 m of the road:
  - Shopfronts with dark glazing and a frame.
  - Coloured awnings.
  - Sign boards with 16 original fictional business names from one shared
    atlas texture: one draw call, and readable rather than pseudo-text.
- [x] **Upper floors and roofs:**
  - Balconies with railings.
  - Wall-mounted AC units.
  - Black and blue rooftop water tanks (common across Nigerian cities).
  - Set-back upper storeys on some office towers.
- [x] **Distant buildings stay plain boxes** (no street-front detail beyond
  38 m).
- [x] **Tested.** Side-on Cinema Mode shots at Ikeja and race views in Lagos.
  No errors.
- [ ] A visual brief per city (the spec's city template).
- [ ] Varied building footprints (L-shapes, courtyards) and roof profiles.
- [ ] Landmark and skyline layer for each city.

## Lighting ✅

- [x] **Daytime contrast restored.**
  - Daytime fog now starts at about 48% of the view distance (was 30%) and
    ends at 130% (was 102%).
  - Rain keeps the close haze. Night is unchanged.
  - Less flat hemisphere fill (1.35 → 1.15), so the sun side and shadows
    read. Exposure is slightly lower (0.82 → 0.78).
- [x] **Contact darkening.** Every building sits in a soft dark ground band:
  one shared texture, merged per chunk, about one extra draw call per chunk,
  no shadow cost.
- [x] **3D Medium tier** between High and Fast. The Graphics button now cycles
  High → Medium → Fast → Classic 2D.

  | Setting | High | Medium | Fast |
  | --- | --- | --- | --- |
  | Pixel ratio cap | 2 | 1.5 | 1.5 |
  | MSAA | on | on | off |
  | Shadow map | 2048, 70 m | 1536, 58 m | 1024, 45 m |
  | View distance | 480 segments | 400 | 320 |
  | Scenery casts shadows | yes | yes | no |
  | Pedestrians | 70 | 50 | 34 |
  | Tree cards | 7 | 5 | 4 |
  | Mirror refresh | every 2nd frame | 3rd | 4th |

## Phase 2 — HUD ✅

- [x] **Smaller countdown and "GO!".** About 84–114 px instead of 160–240 px,
  slightly transparent and moved up, so it no longer covers the road ahead.
  The finish banner went from 110 to 80 px.
- [x] **Smaller minimap.**
  - Phones in portrait: 24% of the width (was 30%).
  - Desktop: 22% of the short side (was 27%).
- [x] **Rival name labels no longer overlap.** The nearest rival's label is
  drawn first, and any label that would overlap it is skipped.
- [x] **One results screen after every finish.** It shows the headline, place
  and time, a reward breakdown, the objective, reputation and story, car
  damage with a repair button, and unlocks.
  - **Next** is the main action. Garage, Legend's story, Standings and Race
    again sit beside it.
  - The legend's passport page and standings are still there, one tap away.
- [x] **One objective line** under the progress bar, with a tick when the
  objective is currently met.

## Phase 3/6 — garage workshop, upgrades and repairs ✅

- [x] **Live turntable preview** of the selected car.
  - Uses the existing studio renderer, so no new WebGL context is created.
  - Drag to rotate, with pitch limited to 0.04–0.62 rad.
  - Scroll, pinch or the +/− keys to zoom, limited to 1.05–2.6 car lengths.
  - Arrow keys turn it. It turns slowly when idle, and stays still when
    Reduce motion is on.
  - In Classic 2D, a painted 2D car is shown instead.
- [x] **Customisation**, with a live preview:

  | Option | Choices |
  | --- | --- |
  | Paint | 7 colours |
  | Finish | Factory gloss, metallic, satin matte (separate physical materials) |
  | Wheels | Silver, black, gold |
  | Window tint | Factory, light, limo |

  - **Apply** charges only for the options that changed, once. It is
    disabled once nothing differs, so a double tap cannot charge twice.
  - **Cancel** reverts for free. Leaving the garage without applying also
    discards the preview.
  - **Reset to factory** needs a second tap, is free and is not refunded.
  - Saved in `save.custom[carId]`. The race car is rebuilt when its look
    changes.
- [x] **Upgrades.** Engine (+2% top speed per level), turbo (+4%
  acceleration), tyres and suspension (+4% grip), nitro tank (+6%
  duration). Three levels each at $12M, $22M and $36M.
  - The effect of each level is written on the button.
  - A 0.7 s lock means a double tap buys one level, not two.
  - Saved in `save.upg[carId]` and applied through `effectiveCar()` at the
    start of a race.
- [x] **Staged damage and repairs.** Hard knocks (impact above 35% of top
  speed) are counted during the race.
  - Every two knocks add one damage level, up to 3.
  - Level 1 adds scuff decals, ray-cast onto the real body so they sit on
    any shape.
  - Level 2 adds more scuffs and cracked, dim headlights. Level 3 adds more
    scuffs.
  - Damage is **cosmetic** and the game says so. It never silently changes
    handling.
  - A repair costs $6M per level, from the results screen or the Repair tab.
    Its guard means it charges once.

## Phase 5 — race objectives ✅

- [x] One objective per episode, from six types:

  | Type | What it asks |
  | --- | --- |
  | Tokens | Collect 40% of the fortune on the route |
  | Duel | Beat a named couple |
  | Clean | No more than one hard knock and no strikes |
  | Time | Within 4% of the fastest rival's expected time |
  | Top 3 | Finish on the podium |
  | Win | Finish first |

- [x] Shown as a toast when the race starts and as a single HUD line.
  Judged at the finish.
- [x] A $10M bonus when met, shown on the results screen. Missing the
  objective never blocks unlocking the next episode.

## Phase 7 — rivals and story ✅

- [x] **Driving styles.**

  | Couple | Style |
  | --- | --- |
  | Okafors | Aggressive: they move into your lane when just ahead of you |
  | Laurents | Fast starters (+7% in the first quarter, −3% late) |
  | Sharmas | Late surge (−5% early, +8% in the last 30%) |
  | Chens, Müllers | Steady |

  The standings table names each couple's style.
- [x] **Reputation** (`save.rep`) and **relationships** (`save.rel`).
  - Reputation: +3 for a win, +1 for a podium, +2 for an objective, −2 per
    road-safety strike.
  - Choices also add reputation.
- [x] **Two story choices**, made once and saved in `save.flags`:
  - **Before Yenagoa:** help the broken-down Okafors (−$10M) or drive on.
    The consequence comes in **Asaba**:
    - If you helped: they repay $15M once, say so in the intro dialogue and
      give way on the road (*friendly* style).
    - If you drove on: they are aggressive and 3% faster, with a taunt.
    - The results screen notes which happened.
  - **Before Kano:** give a reporter an interview or decline.
    - Accept: $5M and +4 reputation, then +$8M from new customers in A
      Coruña, with a line from Tobi.
    - Decline: a 1.3× nitro tank for the Kano race.
- [x] The help option is disabled with an explanation if you cannot afford
  it.

## Phase 8 — sound, accessibility, final QA ✅

- [x] **Separate volume** for Music, Effects and City sounds, each with its
  own gain node under the master. The sliders are in a "Sound mix and
  accessibility" panel on the title screen and in the pause menu. Settings
  are saved.
- [x] **City ambience**, all synthesised:
  - A low city rumble with occasional horns in cities.
  - Surf near water.
  - Insect chirps on country nights.
- [x] **Tyre squeal** when steering hard at speed or off the road.
- [x] **Interface sounds** for confirm, purchase, error and option ticks.
- [x] **Reduce motion** toggle, on top of the system setting. It turns off
  camera shake, motion blur, nitro speed lines, the long wheel spin and the
  turntable's idle rotation.
- [x] **Restart and Quit** in the pause menu need a second tap within 3 s.
- [x] **One-time landscape tip** for phones held upright. Portrait still
  works.
- [x] **City briefs** for all twelve episodes in `CITY_BRIEFS.md`, separating
  what is built from what is still to build.

## Still open (honest list)

- Building footprints beyond boxes (L-shapes, courtyards) and a skyline layer
  along each route.
- Softer car body creases and a sculpted bonnet.
- Real recorded city audio. Everything is synthesised so the game stays
  offline and small.
- Frame rates on real phones are untested. The tests run on a software
  renderer.
- The Mixamo actors in Cinema Mode are still untested with real FBX files.

## Changed files (pass 1)

| File | Change |
| --- | --- |
| `src/*` (new) | Game source modules, moved into the repo from the developer's machine |
| `src/z_main.js` (new) | Main-loop tail of the old `e_engine.js`, split out so the build is a plain concatenation |
| `tools/build.mjs` (new) | Build and `--check` script |
| `.github/workflows/legends-road-check.yml` (new) | CI build check |
| `src/g_cars.js` | Wheel arches, liners, ride heights, headlights, rear detail |
| `src/f_three.js` | Liner material; façade variants; street fronts; sign atlas; set-backs; scenery shadow casting on Fast |
| `src/h_life.js` | Lower-cost limbs, heads and spokes |
| `src/i_drive.js` | Brake-light intensity |
| `index.html` | Rebuilt |
| `REDESIGN_SPEC.md`, `REDESIGN_AUDIT.md`, `REDESIGN_PROGRESS.md` (new) | Spec, audit, this file |
