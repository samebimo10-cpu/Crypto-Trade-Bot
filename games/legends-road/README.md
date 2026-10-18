# Legends Road

**Season One: The Fortune Trail.** An offline racing series in twelve episodes.
Kemi and Tobi Adeyemi, a Lagos couple, race five rival couples across twelve
cities to win the Fortune Trail and save Tobi's late father's garage. Each
episode opens with a cinematic fly-in, the couple talk to each other as you drive,
and every finish line tells the story of a famous person whose fortune began
in that city.

| Ep | City | Map | Legend |
| --- | --- | --- | --- |
| 1 | Lagos, Nigeria | Street map: Ikeja, Third Mainland Bridge, Lagos Island, Ikoyi, Lekki–Ikoyi Link Bridge, Victoria Island, Eko Atlantic | Mike Adenuga |
| 2 | Port Harcourt, Nigeria | Street map: Rumuokoro, Pleasure Park, Trans-Amadi, Isaac Boro Park, Mile 1, the port | Folorunso Alakija |
| 3 | Yenagoa, Bayelsa State, Nigeria | Street map: Igbogene, Tombia Junction, Okaka, Epie Creek, Ekeki, Swali Market, Oxbow Lake, Peace Park | Oloibiri Well No. 1 (Nigeria's first commercial oil find, 1956) |
| 4 | Asaba, Delta State, Nigeria | Street map: across the River Niger from Onitsha, Head Bridge, Nnebisi Road, Stephen Keshi Stadium, Summit Road, Okpanam Road, Asaba Airport | Tony Elumelu |
| 5 | Kano, Nigeria | Route map | Aliko Dangote |
| 6 | A Coruña, Spain | Route map | Amancio Ortega |
| 7 | Paris, France | Street map: Arc de Triomphe to the Eiffel Tower along the Seine | Bernard Arnault |
| 8 | Mumbai, India | Route map | Mukesh Ambani |
| 9 | Hong Kong | Route map | Li Ka-shing |
| 10 | Omaha, USA | Route map | Warren Buffett |
| 11 | Seattle, USA | Route map | Bill Gates |
| 12 | Starbase, USA | Route map, with a night rocket launch at the finish | Elon Musk |

"Street map" episodes are built from real coordinates: the length of each leg
and the angle of each turn come from the map. The maps are stylised (offline,
with no map tiles), so treat positions as approximate. The couples are
fictional.

## 3D graphics

The race is drawn as a real 3D world with [three.js](https://threejs.org)
(MIT licence, bundled in `vendor/` so it works offline):

- Roads, kerbs, pavements, terrain, bridges and water built from each
  episode's track, with asphalt, lane paint, grass, sand and concrete
  textures generated in code (no image downloads).
- Buildings at real scale with window facades for each city: glass offices
  in Lagos, Haussmann blocks in Paris, mud-brick houses in Kano, neon towers
  in Hong Kong. Windows light up at night.
- Palms, pines, poplars, baobabs and acacias, plus grass, bushes and stones
  in the countryside.
- Car models with clear-coat paint, glass reflections and spinning wheels;
  Lagos traffic includes yellow danfo buses.
- Sun shadows, fog, a sky for each city, night street lamps and headlights,
  and 3D landmarks (Eiffel Tower, Lekki–Ikoyi Link Bridge pylon, Space
  Needle, Starship on its launch tower, and more).
- A racing-game finish on the picture: bloom on bright skies and lights,
  colour grading, motion blur at the screen edges at high speed, and a soft
  vignette (needs WebGL 2; older devices get the plain image).
- Motorway details on open roads: steel guardrails, overhead sign gantries
  naming the next real place, and concrete overpasses.
- Tyre smoke when braking hard or cornering at speed, dust when off-road,
  and the current gear next to the speed.
- Port Harcourt and Lagos are dual carriageways like the real cities: a
  grass median with clipped hedges, palms, monuments and twin-arm street
  lights, oncoming traffic on the far side, painted kerbs (blue and white in
  Port Harcourt, multicoloured at junctions) and zebra crossings. Port
  Harcourt adds twin flyovers with service roads underneath, low-rise houses
  with corrugated metal roofs and rooftop water tanks, and a glass tower
  with a split, angled crown.
- Nigerian street life in Lagos, Port Harcourt, Yenagoa, Asaba and Kano:
  pedestrians walking the pavements, cyclists, okadas (motorbike taxis, with
  passengers), kekes (tricycles), roadside kiosks, umbrella market stalls,
  walled compounds with gates, unfinished concrete frames, fuel stations,
  and concrete power poles with sagging wires.
- Side streets at junctions, lined with houses and traffic lights, like a
  normal city grid.
- Yenagoa has an oil derrick with a wellhead at the finish; Asaba starts on
  the steel-truss Niger Bridge from Onitsha.
- A camera that sweeps down from the sky at the start of each episode and
  circles the car at the finish.

Use **Brightness** (title screen or pause menu) to make the picture lighter or darker.
Use **Graphics** on the title screen to switch between *3D · High*
(shadows, full detail), *3D · Fast* (for phones) and *Classic 2D*. Phones
start on *3D · Fast*. If a device cannot run WebGL, the game falls back to
Classic 2D automatically.

The scenery is generated in code rather than built from photos or modelled
assets, so it reads as a stylised, realistic-looking world rather than a
photographic one.

## Time of day and weather

On the episode map, pick **Time** (story default, morning, midday, sunset or
night) and **Weather** (story default, clear, cloudy or rain) before you
start. Night lights the street lamps, windows and headlights; rain adds
falling rain, a wet, reflective road and spray from the tyres.

## Car radio: Afrobeats and heavy bass

The game plays its own original music, made live in code (no recordings,
so it works offline). There are five stations with heavy bass, a
side-chain pump on every kick, and a bass harmonic so it still thumps on
phone speakers:

| Station | Style | Tempo |
| --- | --- | --- |
| Afro Wave 99.3 | Afrobeats: 3-3-2 rim pattern, rolling 808, chord stabs, marimba hook | 104 BPM |
| Lagos Groove 97.1 | Amapiano: log drum, shakers, jazzy keys | 112 BPM |
| Creek Radio 94.5 | Afro-house: four-on-the-floor, congas, offbeat bass | 122 BPM |
| Road FM 101.5 | Highlife: bell pattern, walking bass, guitar arpeggios | 118 BPM |
| Bass FM 88.8 | Afro-trap: half-time beat, long gliding 808s, hat rolls | 140 BPM |

Press **R** or tap **FM** to change station; the station shows on the car's
centre screen in the inside view. Turn music on or off with **Music** on
the title screen or in the pause menu. The station names are fictional.

## Cinema Mode (press C)

Cinema Mode turns the game into a film set. You can open it from a race
(press **C**, or use **Cinema mode** in the pause menu) or from the title
screen. Press **C** or **Esc** to leave.

- **Clean picture:** the HUD, touch controls and subtitles are hidden, and
  the race freezes.
- **Shot list:** the camera plays the shots in [`shots.json`](shots.json) in
  order, with hard cuts between them.
  - Each shot has a `pos`, `lookAt`, `fov`, `duration` and `move`.
  - Moves: `static`, `dolly`, `crane`, `track`, `push`, `pull`, `pan`,
    `zoom`, `orbit` or `handheld`. Moves that travel take their end values
    from `to`.
  - Coordinates are metres in the set's own frame: x toward the road, y up,
    z along the road.
  - `?shots=other.json` in the address loads a different list.
- **Street spot:** `spot` picks a named place on the current route (e.g.
  `"place": "Ikoyi"`) and which side of the road. If that place isn't on the
  episode, the set goes a little ahead of your car.
- **Two actors** stand there and face each other.
  - **Your own Mixamo characters:** put FBX or GLB files in
    [`actors/`](actors/README.md), with idle and talking animations. They
    are scaled to each actor's `height`, and blend from idle to talk while
    their line plays.
  - **Without those files**, built-in stand-in actors are used, so the mode
    works straight away.
- **Lip movement from loudness:** each actor's mouth opens and closes with
  the loudness of their voice line (`lines` in `shots.json`, files in
  [`voice/`](voice/README.md)).
  - It uses a mouth or jaw morph target or a jaw bone if the model has one.
    Otherwise it draws a small mouth on the head bone.
  - Missing voice files are replaced by a synthetic mumble.
- **A closed set:** pedestrians and cars stay out of a 10-metre circle
  around the actors. People turn back at the edge, traffic stops and queues,
  and nobody spawns inside it.
- **Recording (K, or the Record button):** the sequence is recorded frame by
  frame with [CCapture.js](https://github.com/spite/ccapture.js) (MIT,
  bundled in `vendor/`).
  - **Video:** 1920×1080 at a locked 30 fps, with the game's clock stepped
    exactly 1/30 s per frame. It downloads as `legends-road-cinema.webm` in
    Chrome or Edge, or as a TAR of PNG frames in other browsers.
  - **Dialogue:** CCapture records pictures only, so the voice lines also
    download as `legends-road-cinema-dialogue.wav` on the same timeline.
    Join the two with:

    ```
    ffmpeg -i legends-road-cinema.webm -i legends-road-cinema-dialogue.wav -c:v copy -c:a libopus -shortest legends-road-cinema-final.webm
    ```

- **Rendering speed:** recording runs as fast as your graphics card can
  draw 1080p frames, so it can be slower than real time.

## Road safety

People walk, cross and ride on these streets, and hitting one has consequences:

- **Pedestrians sometimes cross the road** at a few of the zebra crossings,
  and now and then away from them in Nigerian cities. Like real people,
  they wait at the kerb while your car is close and only step out when
  you are far away or have passed. Rivals and traffic stop for them too,
  so they are not an obstacle aimed at you alone. Tobi or Kemi warns you
  when someone is crossing ahead.
- **Horn** (H, or the Horn button on a phone): people crossing ahead hurry
  to the side, and slow traffic in your lane moves over.
- **Hit a pedestrian, a cyclist, an okada or a keke** and the car stops dead.
  The person goes down (they get up again after a few seconds) and the
  police hold you at the roadside for 5 seconds while the rivals drive
  past, with flashing police lights and a siren.
- **Blood effects:** a splash of blood on the road where the person fell,
  and on the windscreen in the inside view, which the wipers clear. Turn
  them off with **Blood effects** in the pause menu.
- **Fines** come out of the fortune you have collected: $15M for a
  pedestrian, $10M for a cyclist or okada rider, $8M for a keke. Your
  fortune can go below zero, and the story screen shows what you paid.
- **Three strikes** in one episode and the police suspend your licence:
  the race ends and the episode restarts.
- The Lucky spin shield protects the car, not people, so it does not cover
  these hits.

In *Classic 2D* there are no people on the pavements, but okadas and kekes
still count.

## Inside or outside the car

Press **V** (or tap **OUT/IN** at the top right) to switch between the
chase camera behind the car and the driver's seat. Inside you get:

- A modern luxury-car dashboard: one curved glass screen across the whole
  dash, with the driver display (speed and power dials, gear, distance to
  go) behind the wheel, a centre display (search bar, radio with fictional
  stations, phone, climate) and a passenger display with a clock.
- Round turbine air vents, glowing ambient light lines along the dash and
  doors, and a centre console with wood trim.
- A two-spoke steering wheel with touch pads that turns with your
  steering. The executive saloon, luxury
  SUV, estate and 4x4 have a light leather interior with pink ambient
  light; the other cars are dark with blue light. No maker badges.
- A live rear-view mirror showing the road behind.
- Wipers that run in the rain, with rain drops building up on the glass
  between sweeps.
- A little engine vibration and head tilt in bends.

Outside, your car shows bright brake lights when you brake or stop.

## People, okadas and kekes

Pedestrians have rounded bodies, faces, hair and shoes, and vary in
height. Women wear wrappers, some with a *gele* head tie, and some street
hawkers carry a basin of goods on their heads. Cyclists ride real-looking
bicycles with spoked wheels. Okadas are modelled on the common commuter
motorbike (spoked wheels, fork, tank, long seat, exhaust, mirrors) with a
rider, often in a helmet, and usually a passenger. Kekes (keke napep) have
the rounded nose with a single front wheel, a canvas roof with rolled-up
side curtains, open sides, a spare wheel on the back, a driver at the
handlebar and one to three passengers on the rear bench.

## Features

- **Minimap** in the top-right corner, with your position, the rivals and the
  next real place. Press **N** or tap the minimap for the full map with every
  place described.
- **Shortcuts.** Up to three per episode, placed where the road bends back on itself.
  A green sign and Tobi announce each one. Steer into the blue-marked lane and
  stay in it to cut across.
- **Garage.** *Everyday cars* modelled on the body styles you see on real
  roads: a family saloon, a city hatchback, a seven-seat people carrier, a
  square-backed estate, an executive saloon with a tall chrome grille, a
  mid-size luxury SUV, a double-cab pickup and a full-size 4x4. They have
  real-car details (headlight clusters, grilles, door lines and handles,
  pillars, roof rails) but no maker badges or names. The original
  *Concept collection* (thirteen designs) is still there too. Each car has
  its own top speed, acceleration, handling and nitro, and fortune you
  collect on the road pays for them. Rivals and traffic drive the everyday
  cars, plus minibuses, okadas and kekes on Nigerian roads.
- **Steering assist** (on by default, toggle on the title or pause screen).
  It cuts drift in bends and eases the car back onto the road.
- **Lucky spin.** Earn one spin per finished episode (two for a win): cash,
  a new car, or a perk for the next race (bigger nitro tank, a shield against
  one crash, or a head start).
- **Couples championship.** 25-18-15-12-10-8 points per race, with season
  standings after every episode.

## Play

On a computer, open `index.html` in any modern browser. Everything (cars,
buildings, landmarks, skies, weather and sound) is drawn and synthesised in
code, so the game needs no network connection.

## Install on a phone and play offline

**Play and install:** https://samebimo10-cpu.github.io/Crypto-Trade-Bot/
**Source:** https://github.com/samebimo10-cpu/Crypto-Trade-Bot/tree/main/games/legends-road

Open the link on your phone and press **Install on phone** on the title
screen. On Android (Chrome) this opens the normal install prompt; on
iPhone it shows how to use Share > Add to Home Screen. Once installed the
game opens from its own icon, full screen, and plays with no connection.


Phones will not run a game from a downloaded HTML file, and they only offer
"Install" for a page served over HTTPS. So the game has to be hosted once;
after the first visit it is cached on the phone and works with no connection.

1. In the repository on GitHub, open **Settings > Pages** and set **Source** to
   **GitHub Actions** (one time only).
2. Merge this folder into `main`. The workflow
   `.github/workflows/legends-road-pages.yml` publishes it to
   `https://<user>.github.io/<repo>/`. You can also run it by hand from the
   **Actions** tab.
3. Open that address on the phone once, while online, and wait for the title
   screen.
   - **Android (Chrome):** menu > **Install app** (or **Add to Home screen**).
   - **iPhone (Safari):** Share > **Add to Home Screen**.
4. Launch it from the home-screen icon. It now works in airplane mode.

To test locally on a computer: run `python3 -m http.server` in this folder and
open `http://localhost:8000`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | Left / Right arrows, A / D | Left and right buttons, or swipe |
| Accelerate | Up arrow, W | Automatic |
| Brake | Down arrow, S | Brake button |
| Nitro | Space or Shift | Nitro button |
| Full map | N | Tap the minimap |
| Skip intro | Enter or Esc | Skip button |
| Pause | P or Esc | II button |
| Sound on/off | M | SND button |
| Horn | H | Horn button |
| Change radio station | R | FM button |
| Inside / outside view | V | OUT / IN button |
| Cinema Mode on/off | C | Pause menu: Cinema mode |
| Record (in Cinema Mode) | K | Record button |
| Replay the scene (in Cinema Mode) | Space | Replay button |

Collect gold coins to build your fortune and blue canisters to refill nitro.
Off-road driving slows you down, and roadside objects stop you. Finishing an
episode unlocks the next one; progress is saved in the browser.

Add `?autodrive` to the URL to let the car drive itself (demo mode).

The stories are short summaries of public biographies. Fortunes and rankings
change often.

## Developing

The game's source is in `src/` (one module per area: data, engine, 3D
renderer, cars, street life, inside view, radio, Cinema Mode, main loop).
`index.html` is built from it:

```
node games/legends-road/tools/build.mjs          # rebuild index.html
node games/legends-road/tools/build.mjs --check  # CI: fails if index.html is stale
```

Edit files in `src/`, never `index.html` directly. `REDESIGN_AUDIT.md` and
`REDESIGN_PROGRESS.md` track the visual and gameplay redesign against
`REDESIGN_SPEC.md`.
