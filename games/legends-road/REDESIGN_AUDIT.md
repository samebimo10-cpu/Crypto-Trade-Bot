# Legends Road — redesign audit

Audit of the game as it stood at commit `16c4376` (after PR #6), against
`REDESIGN_SPEC.md`. Everything here was checked in the code or in a
running build (headless Chromium, SwiftShader software WebGL), not
assumed.

## 1. Architecture

| Item | Finding |
| --- | --- |
| Location | `games/legends-road/` inside the `Crypto-Trade-Bot` repository. The repository root is an unrelated Python trading system; its `AUDIT.md`, `SPEC.md` etc. do not concern the game. |
| Language | Plain JavaScript (ES2020) in one `'use strict'` IIFE, HTML and CSS. No framework, no bundler, no npm dependencies. |
| Renderer | **True 3D**: three.js r147 (vendored, `vendor/three.min.js`, MIT). WebGL renderer with ACES tone mapping, PCF soft shadows, a PMREM environment map built from the sky, and a custom HDR post-processing chain (MSAA, bloom, grading, radial speed blur, vignette). A separate 2D canvas layer draws the HUD. |
| Fallback | "Classic 2D": the original pseudo-3D canvas renderer (segment road, sprites). Used automatically when WebGL fails. |
| Game model | The race logic is still the pseudo-3D segment model (`segments[]`, `SEG`=200 units, player `position`/`playerX`). The 3D world is built from that track: each segment maps to 1.1 m of centreline (`poseAt`). Collisions, coins, rivals and traffic live in segment space. |
| Entry point | `index.html` is a **build output**: `src/*` concatenated by `tools/build.mjs`. |
| Source (fixed in this audit) | The 14 source modules were **not in the repository**; only the 420 KB built file was committed, so nobody else could maintain the game. They are now in `src/`, with `tools/build.mjs` (produces a byte-identical `index.html`) and a CI check (`.github/workflows/legends-road-check.yml`) that fails if `index.html` drifts from `src/`. |
| Build / test | `node games/legends-road/tools/build.mjs` (write) or `--check`. There is no unit-test suite; testing is with Playwright scripts in a browser. |
| Deploy | GitHub Pages via `.github/workflows/legends-road-pages.yml` on pushes to `main`. A PWA: `manifest.webmanifest`, `sw.js` (cache-first shell; network-first for `shots.json`, `actors/`, `voice/`). |
| Save | `localStorage['legends-road.v2']`: unlocked episodes, bank, owned cars, selected car, best results, season results, spins, perks, settings (graphics, brightness, sound, music, station, view, blood, time/weather). |

### Source modules (`src/`, in build order)

| File | Responsibility |
| --- | --- |
| `head.html` | Markup, CSS, opening of the game script |
| `data.js` | 12 episodes (route coordinates, places, legends, scripts, themes), cars, time-of-day presets |
| `a_utils_art.js`, `d_art2.js`, `b_signs.js`, `c_layers.js` | Helpers and Classic 2D art, signs, parallax |
| `e_engine.js` | Track building, physics, rivals/traffic, dialogue, HUD, sound effects, menus, garage, spin, standings, save |
| `f_three.js` | 3D world build (roads, terrain, buildings, trees, landmarks), materials, sky, lights, post-processing, cameras |
| `g_cars.js` | Lofted 3D car bodies (`VEH`), wheels, garage studio renders |
| `h_life.js` | Pedestrians/cyclists (instanced), okada/keke models, roadside kit, power lines, side streets |
| `i_drive.js` | Inside-the-car view, live mirror, wipers, brake lights, blood |
| `m_music.js` | Synthesised car radio (5 stations) |
| `n_cinema.js` | Cinema Mode (shot list, actors, lip movement, CCapture recording) |
| `z_main.js` | Main loop, input wiring, service worker registration |

## 2. Assets and licences

All visuals are **generated in code**: geometry, canvas textures (asphalt, facades, foliage, signs), sky and clouds. There are no image, model or audio files apart from the icons.

| Asset | Source | Licence |
| --- | --- | --- |
| three.js r147 + FBX/GLTF loaders + fflate | npm `three@0.147.0` | MIT (`vendor/LICENSE-three.txt`) |
| CCapture.js 1.1.0 | npm `ccapture.js@1.1.0` | MIT (`vendor/LICENSE-ccapture.txt`) |
| Icons | Drawn for the project | Project |
| Music, sound effects | Synthesised live with Web Audio | Project |
| Fonts | Google Fonts (Big Shoulders Display, Spectral), optional | OFL |
| Mixamo actors, voice lines | Not included; user-supplied (`actors/`, `voice/`) | Mixamo terms |

There is no texture compression pipeline because there are no texture files; canvas textures are generated at 256–1024 px.

## 3. Feature inventory and recommended action

| Feature | State | Action |
| --- | --- | --- |
| 12 episodes, story intro/outro, legend story page | Works | Keep |
| Street-map routes from real coordinates, minimap, full map | Works | Keep; shrink minimap on phones (Phase 2) |
| Shortcuts | Works | Keep |
| 3D renderer (High/Fast) and Classic 2D | Works | **Improve** (cars, cities, lighting, performance); add a Medium tier |
| Post-processing (bloom, grade, blur, vignette) | Works | Keep; make it quality-dependent |
| Time of day and weather (morning/midday/sunset/night × clear/cloudy/rain) | Works (visual only, handling unchanged) | Keep; communicate that rain is visual only |
| Garage: 8 everyday + 13 concept cars, buy with fortune | Works; previews are static renders | **Improve**: orbit preview, customisation with Apply/Cancel/Reset (Phase 3/6) |
| Lucky spin | Works; charges once even when double-tapped | Keep as optional, not the main progression |
| Couples championship, standings, next episode | Works | Keep; simplify results hierarchy (Phase 2) |
| Rivals | Five couples, named, coloured | **Improve** identity: distinct driving styles (Phase 7) |
| Traffic, oncoming traffic, danfo buses, okadas, kekes | Works | Keep; reduce cost on Low |
| Pedestrians, cyclists, crossings, road-safety penalties, blood toggle | Works | Keep; **reduce triangle cost** (Phase 1) |
| Horn, brake lights | Works | Keep |
| Inside-the-car view with live mirror, wipers | Works | Keep |
| Car radio (5 synthesised stations) | Works | Keep; add volume sliders (Phase 8) |
| Cinema Mode with recording | Works (Mixamo FBX untested) | Keep |
| PWA install, offline play, rotation | Works on GitHub Pages | Keep |
| Steering assist, brightness, sound and music toggles | Works | Keep |
| Story choices / consequences | **Missing** | Add (Phase 7) |
| Car damage, repairs, upgrades, cosmetics | **Missing** | Add after car visuals (Phases 3, 6) |
| Race objective variety | Point-to-point race only | Add a small set (Phase 5) |

No feature is proposed for removal.

## 4. Baseline test results

Playwright, headless Chromium with SwiftShader (software WebGL, so frame rates are not representative; triangle and draw-call counts are).

| Check | 375×812 phone (touch, 3D Fast) | 768×1024 tablet (touch, 3D Fast) | 1366×768 desktop (3D High) |
| --- | --- | --- | --- |
| Loads, no console errors | ✓ | ✓ | ✓ |
| Horizontal overflow | none | none | none |
| Episodes, Garage, Lucky spin open and close | ✓ | ✓ | ✓ |
| Spin charged once on double tap | ✓ (1 → 0) | ✓ | ✓ |
| Race starts, pause, resume | ✓ | ✓ | ✓ |
| Finish → story → standings → next episode | ✓ | ✓ | ✓ |
| Progress persists after reload | ✓ | (not reached in run) | ✓ |

### Rendering cost (Lagos, 400 segments into the race)

| Measure | 3D High | 3D Fast |
| --- | --- | --- |
| Draw calls per frame (all passes, incl. shadows and post) | ~414 | ~335 |
| Triangles per frame (all passes) | ~874k | ~544k |
| World build time (software renderer; real GPUs are faster but it is CPU-bound JS) | 24 s | 10–15 s |
| Visible geometry (Fast): road chunks / pedestrians / cars | 228k / **151k** / 21k triangles | |
| Car model | 6–7k triangles each | |
| Okada / keke model | **13k** triangles each (more than a car) | |

## 5. Main problems, in priority order

### Visual (the three biggest weaknesses)

1. **Cars look like boxes on stubs.**
   - The lofted body skirt drops to 0.30–0.38 m all the way along, with no wheel arches, so only the bottom of each tyre shows.
   - From the chase camera the player's car is a flat slab with rectangular tail lamps.
   - Lights, grilles and handles are flat boxes.
   - The garage shows static, distant studio renders.
   - The paint material is good (clear-coat physical paint plus an environment map); the **geometry** is the weakness.
2. **Cities repeat one façade.**
   - Each building style has a single 512 px canvas texture (for example the arched "stucco" window grid) used on every building of that style.
   - Buildings are plain boxes with a roof slab, so streets read as copies.
   - Missing: ground-floor shopfronts, balconies, setbacks, rooftop clutter and per-building window layouts.
   - Glass towers are one identical blue grid.
3. **Flat lighting.**
   - Hemisphere and sun with heavy distance haze give low-contrast, washed-out daytime scenes.
   - There is no ambient occlusion or contact darkening where buildings, kerbs and trees meet the ground.
   - Shadows are short-range only.

### HUD and UI

- A large "GO!" and "EPISODE · DEPARTURE" banner, overlapping rival name labels (e.g. "CH SHARMA") and a large minimap on phones compete with the road.
- The results flow is a long passport page followed by a standings page; the spec asks for one concise results scene.

### Performance risks

- Pedestrians are about 151k triangles because of high-segment capsule limbs. Okadas and kekes cost about 13k each. Both are drawn again in the shadow pass.
- About 17 meshes per road chunk, times 7–8 visible chunks, plus the shadow pass, gives 300–400 draw calls.
- The world build is synchronous and takes several seconds on slow CPUs (there is no loading indicator beyond the intro fly-in).
- Only two 3D quality tiers (High, Fast).

### Mobile limitations

- Layouts fit at 375, 768 and 1366 px.
- Portrait racing works but shows less road. Landscape is better; this is not documented in the game.
- Touch buttons sit over the lower road corners. The minimap takes about 30% of the width in portrait.

### Broken or untested

- Nothing was found broken in the primary flow.
- Untested: real Mixamo FBX actors in Cinema Mode; real-device frame rates.

### Blocked or constrained by the technology

- **Real recorded audio and photographic textures** are not available offline in this repository. Visuals stay procedural (canvas textures and generated geometry). This is a deliberate choice for offline play and small download size.
- **Physically based vehicle simulation**: the handling model is arcade, in segment space. The spec's "arcade over half-realism" applies.
- **Mesh-deforming damage**: the cars are merged meshes; staged damage would be decals and part swaps.

## 6. Implementation plan (priority order)

1. **Phase 1, stability and performance foundation** (this pass): source in the repo with a build check ✓. Cut crowd and two-wheeler triangle cost. Add per-frame stats to the test scripts.
2. **Phase 3, car presentation** (this pass): real wheel arches and lower ride height so the tyres show, dark arch liners, better tyre sidewalls, sculpted lamp lenses instead of flat boxes, and a stronger contact shadow. Keep every car's scale.
3. **Phase 4, Lagos architecture**:
   - Several façade variants per style.
   - Building massing with setbacks, balconies, shopfront bands with awnings and fictional signs, and rooftop tanks and AC units.
   - Distant buildings kept simple.
   - Then apply the same pattern to the other cities.
4. **Lighting pass**: per-time-of-day exposure and fog tuning to restore contrast, a ground contact darkening band at building bases, and a Medium quality tier.
5. **Phase 2, HUD and UI hierarchy**: smaller start banner and minimap on phones, de-overlapped rival labels, and a single results scene with Next and Garage actions.
6. **Garage orbit preview, then cosmetics** (paint, rims, tint) with Apply, Cancel and Reset, and currency charged once.
7. **Phase 5**: race objectives (rival duel, clean-driving, time trial) reusing the existing race.
8. **Phase 6 and Phase 7**: repairs and upgrades; story choices with explicit state and one demonstrable later consequence.
9. **Phase 8**: audio sliders, city ambience, final QA.
