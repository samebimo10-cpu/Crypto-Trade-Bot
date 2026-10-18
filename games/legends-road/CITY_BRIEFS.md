# Legends Road — city briefs

Art-direction briefs for the twelve episodes, following the city template in
`REDESIGN_SPEC.md` (section 6). Each brief separates what is **in the game
now** from what is **still to build**, so nothing here claims more than the
code does.

Shared rules for every city:

- Business names are original and fictional (see `SHOP_NAMES` in
  `src/f_three.js`). No real brands, badges or trademarks.
- Buildings come from the shared kit: stucco houses, offices, glass towers,
  colonial, Haussmann, adobe, cottages, barns, hangars. Each has façade
  variants, and road-facing buildings within 38 m get street fronts.
- Distant buildings stay plain boxes. Street-front detail is near the road
  only.
- Performance budget, per frame on 3D Medium:
  - About 350 draw calls.
  - About 600k triangles, including the shadow pass.
  - Fast stays under about 330 draw calls.

## 1. Lagos — dense, energetic and unpredictable

**Purpose:** Season opener. The Adeyemis' home city.

**Landmarks:**
- Lekki–Ikoyi Link Bridge (the finish).
- Third Mainland Bridge water crossing.
- Ikeja commercial streets.

**Architecture:**
- Stucco family houses and offices with shopfronts, awnings and signs.
- Blue, teal and bronze glass towers.
- Kiosks, stalls and compounds.

**Vegetation and terrain:** Palms, bush and a flat lagoon edge.

**Light and weather:** Warm morning. Humid haze far off, and contrast kept
near the road.

**Roads:**
- Dual carriageway with a median.
- Bridges over water.
- Danfo minibuses, okadas and kekes.

**Colours:** Concrete neutrals, with saturated shop colours as accents.

**Audio:** City rumble, car horns and surf on the bridges.

**Still to build:**
- A skyline reveal at the bridge.
- A busy junction set piece.

## 2. Port Harcourt — the Garden City

**Purpose:** The Okafors' home ground. The objective is a duel with them.

**Landmarks:**
- Port cranes.
- The waterfront.
- Garden City roundabouts.

**Architecture:** Low-rise stucco, offices, fuel stations and building frames.

**Vegetation and terrain:** Palms and broad-leaf trees.

**Light and weather:** Overcast tropical sky.

**Roads:** Urban arterial with danfo traffic.

**Colours:** Green, with harbour steel greys.

**Audio:** City rumble and car horns.

**Still to build:** Cranes along the route, not only at the finish.

## 3. Yenagoa — creeks and mangroves

**Purpose:** The roadside choice: help the Okafors or drive on.

**Landmarks:**
- Oil derrick.
- Creek bridges.
- Tombia junction.

**Architecture:** Low stucco houses, kiosks and building frames.

**Vegetation and terrain:** Palms, swamp bush and water close to the road.

**Light and weather:** Heavy tropical cloud.

**Roads:** Narrow two-lane with many bridges.

**Colours:** Blue-green water and rust.

**Audio:** Surf over the water.

**Still to build:** Mangrove vegetation cards.

## 4. Asaba — on the bend of the Niger

**Purpose:** The consequence episode: the Okafors repay you or come for you.

**Landmarks:**
- The Niger Bridge.
- Nnebisi Road.
- The stadium.

**Architecture:** Stucco and colonial buildings, fuel stations.

**Vegetation and terrain:** River plain and palms.

**Light and weather:** Daylight with broken cloud.

**Roads:** The river bridge crossing.

**Colours:** River brown and warm stone.

**Audio:** City rumble, and surf on the bridge.

**Still to build:** Nothing yet.

## 5. Kano — over a thousand years of trade

**Purpose:** Time trial, after the reporter's offer.

**Landmarks:**
- The city gate.
- Adobe compounds.
- Baobabs.

**Architecture:** Adobe with crenellations.

**Vegetation and terrain:**
- Acacia, baobab and dry bush.
- Flat Sahel.

**Light and weather:** Harmattan haze. Dust in the air.

**Roads:** Long, straight and fast.

**Colours:** Ochre, earth red and pale sky.

**Audio:** Quiet open-country ambience.

**Still to build:** The Kurmi market as a set piece.

## 6. A Coruña — Galician coast

**Landmarks:**
- Tower of Hercules.
- Hórreos.
- The Atlantic shore.

**Architecture:** White cottages and hórreo granaries.

**Vegetation and terrain:** Pine and rolling green.

**Light and weather:** Cool Atlantic light.

**Roads:** A winding coastal road.

**Colours:** Granite grey and sea green.

**Audio:** Surf.

## 7. Paris — La Belle Époque

**Purpose:** Duel with the Laurents.

**Landmarks:**
- The Eiffel Tower.
- Haussmann avenues.
- Lamp-lined boulevards.

**Architecture:** Haussmann blocks.

**Vegetation and terrain:** Rows of poplars.

**Light and weather:** Autumn, with falling leaves.

**Roads:** Boulevards.

**Colours:** Cream stone and slate.

**Audio:** City rumble.

## 8. Mumbai — Gateway of India

**Landmarks:**
- The Gateway of India.
- Colonial frontages.
- The bay.

**Architecture:** Colonial buildings.

**Vegetation and terrain:** Palms.

**Light and weather:** Humid sunset.

**Roads:** A coastal drive.

**Colours:** Sandstone and sea blue.

**Audio:** City rumble and surf.

## 9. Hong Kong — Victoria Harbour

**Purpose:** Clean-driving objective in dense, bright streets.

**Landmarks:**
- The harbour tower.
- Neon signs.
- Glass towers.

**Architecture:** Glass towers in three glass colours.

**Light and weather:** Night, with neon.

**Roads:** Dense urban streets.

**Colours:** Neon magenta and cyan on dark.

**Audio:** City rumble.

## 10. Omaha — Gateway to the West

**Purpose:** Time trial across the plains.

**Landmarks:**
- The steam locomotive.
- Barns and silos.
- Wheat fields.

**Vegetation and terrain:** Prairie.

**Light and weather:** Big sky, daylight.

**Roads:** Long, straight and rural.

**Colours:** Wheat gold and barn red.

**Audio:** Open-country ambience; insects at night.

## 11. Seattle — Gold Rush gateway

**Purpose:** Duel with the Sharmas.

**Landmarks:**
- The Space Needle.
- Craftsman houses.
- Pine hills.

**Light and weather:** Rain.

**Roads:** Hilly streets.

**Colours:** Evergreen and slate.

**Audio:** City rumble.

## 12. Starbase — the finale

**Purpose:** Win the episode.

**Landmarks:**
- The Starship launch at the finish.
- Hangars.
- Dunes.

**Vegetation and terrain:** Dune grass and the Gulf shore.

**Light and weather:** Clear night; the launch lights up the finish.

**Roads:** A flat coastal approach.

**Colours:** Night blue, with stainless steel and launch light.

**Audio:** Surf.

## Still to build in every city

- Building footprints beyond boxes (L-shapes, courtyards).
- A landmark and skyline layer seen along the route, not only at the finish.
- Recorded or sampled city audio. All audio is synthesised now, so the game
  works offline with no audio files.
