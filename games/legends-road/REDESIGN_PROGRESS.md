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

## Lighting — next

- [ ] Restore daytime contrast: the distance haze is too strong, which shows
  most on bridges and open water. Tune fog and exposure per time of day.
- [ ] Ground contact darkening at building bases and kerbs.
- [ ] A 3D Medium quality tier between High and Fast.

## Later phases (not started)

- [ ] Phase 2: compact HUD.
  - A smaller start banner.
  - A smaller minimap on phones.
  - Rival name labels that don't overlap.
  - A single results scene with Next and Garage actions.
- [ ] Phase 5: race objectives (rival duel, clean-driving, time trial).
- [ ] Phase 6: repairs and upgrades; check purchases and rewards happen once
  and persist.
- [ ] Phase 7: rival identities and story choices with a later consequence.
- [ ] Phase 8: separate music, effects and ambience volume; city ambience;
  final QA.

## Changed files (this pass)

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
