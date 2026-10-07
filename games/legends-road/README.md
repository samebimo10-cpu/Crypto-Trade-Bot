# Legends Road

**Season One: The Fortune Trail.** An offline racing series in ten episodes.
Kemi and Tobi Adeyemi, a Lagos couple, race five rival couples across ten
cities to win the Fortune Trail and save Tobi's late father's garage. Each
episode opens with a cinematic fly-in, the couple talk to each other as you drive,
and every finish line tells the story of a famous person whose fortune began
in that city.

| Ep | City | Map | Legend |
| --- | --- | --- | --- |
| 1 | Lagos, Nigeria | Street map: Ikeja, Third Mainland Bridge, Lagos Island, Ikoyi, Lekki–Ikoyi Link Bridge, Victoria Island, Eko Atlantic | Mike Adenuga |
| 2 | Port Harcourt, Nigeria | Street map: Rumuokoro, Pleasure Park, Trans-Amadi, Isaac Boro Park, Mile 1, the port | Folorunso Alakija |
| 3 | Kano, Nigeria | Route map | Aliko Dangote |
| 4 | A Coruña, Spain | Route map | Amancio Ortega |
| 5 | Paris, France | Street map: Arc de Triomphe to the Eiffel Tower along the Seine | Bernard Arnault |
| 6 | Mumbai, India | Route map | Mukesh Ambani |
| 7 | Hong Kong | Route map | Li Ka-shing |
| 8 | Omaha, USA | Route map | Warren Buffett |
| 9 | Seattle, USA | Route map | Bill Gates |
| 10 | Starbase, USA | Route map, with a night rocket launch at the finish | Elon Musk |

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

## Features

- **Minimap** in the top-right corner, with your position, the rivals and the
  next real place. Press **N** or tap the minimap for the full map with every
  place described.
- **Shortcuts.** Two per episode, placed where the road bends back on itself.
  A green sign and Tobi announce each one. Steer into the blue-marked lane and
  stay in it to cut across.
- **Garage.** Thirteen original 3D car designs (coupe-crossover, city cube,
  crossover, delivery van, compact SUV, shuttle pod, fastback sedan, family
  SUV, boxy off-roader, red fastback, full-size pickup, three-row SUV and a
  mid-engine roadster), shown in a studio line-up and three-quarter studio
  shots. Each has its own top speed, acceleration, handling and nitro.
  Fortune you collect on the road pays for them. Rivals and traffic drive
  the same models.
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

Collect gold coins to build your fortune and blue canisters to refill nitro.
Off-road driving slows you down, and roadside objects stop you. Finishing an
episode unlocks the next one; progress is saved in the browser.

Add `?autodrive` to the URL to let the car drive itself (demo mode).

The stories are short summaries of public biographies. Fortunes and rankings
change often.
