# High Seas — A Voyage in the Age of Sail

An open-world sailing, trading, treasure-hunting and naval-combat game that runs
entirely in the browser and **entirely offline**. There are no downloads, CDNs,
fonts or image files: the graphics, music and sound are all generated in code.

## How to play

Open `index.html` in any modern browser (Chrome, Edge, Firefox or Safari). It
works straight from disk (`file://`) with no server and no internet connection.

To install it as an app that keeps working offline, serve the folder once over
HTTP, for example with `python3 -m http.server` run in this folder, and open
`http://localhost:8000`. A service worker caches every file, and the browser
offers to install it from the address bar.

## Game modes

**New Voyage (campaign).** You choose a captain, a ship's name and a flag to sail
under: British, Spanish, French, Dutch, Portuguese or Pirate. You start with a
sloop in the Caribbean, and the rest of the world is open to you:

- **63 real historical ports.** They include London, Amsterdam, Lisbon, Cádiz,
  Venice, Constantinople, Alexandria, Cape Town, Zanzibar, Muscat, Bombay,
  Calcutta, Batavia, Canton, Nagasaki, Edo, Sydney, Honolulu, Havana,
  Port Royal, Cartagena, Rio de Janeiro, Boston and New York. Each port has a
  nation, an architectural style, goods it produces and goods it wants.
- **Trade.** Prices react to supply and demand, and to how much you buy and
  sell. Contraband pays well but has to go through smugglers.
- **Coast guards.** Revenue cutters hail you for inspection. You can heave to,
  bribe the officer, run for it, or run out the guns. Contraband found in your
  hold is confiscated and you are fined.
- **Pirates, navies and merchantmen.** Each sails with its own AI. Pirates hunt
  merchants, warships hunt pirates, and anyone you provoke hunts you.
- **Reputation.** Your standing with each nation affects whether its harbours
  open to you and whether its forts fire on you. **Notoriety** above 55 sets
  every navy after you; above 60 the Brethren of the Coast treat you as one of
  their own. A Royal Pardon can be bought from a governor.
- **Treasure.** Maps come from tavern rogues, from captured pirate captains and
  from bottles drifting in the sea. Sail to the ✕ and press **L** to send a
  landing party ashore to dig. Some maps you buy are forgeries.
- **Exploration.** There are 32 uncharted islands to discover and name on your
  chart.
- **Commissions.** Governors post bounties on named pirate captains. Pirate
  lords post raids on Spanish treasure galleons. Harbour masters offer cargo
  contracts with deadlines.
- **Ship's business.** You manage provisions (the crew starves without them),
  hire hands in the tavern, repair, refit (copper sheathing, long guns,
  live-oak planking, gunlocks), and buy any of 12 vessels from sloop to
  First-Rate Man-o'-War. You can also take a prize as your flagship.
- **Weather and sea.** Prevailing winds follow real latitude bands: the
  north-east and south-east trade winds, the doldrums, the horse latitudes,
  the westerlies and the Roaring Forties. Storms are more likely in the
  hurricane belt and the typhoon seas. Days and nights pass with lantern-lit
  ships, sweeping lighthouses and rain. A bell rings at every change of watch.

**Naval Battle.** Choose a man-of-war and fight a squadron. The ships available
are the Revenue Cutter, Brig-of-War, Corvette, Frigate, 74-gun Ship of the
Line, First-Rate, Steam Ironclad (with turrets) and Torpedo-Boat Destroyer. You
also pick your colours and the enemy's, the size of the enemy squadron and of
your own, the battle site (Trafalgar, the Spanish Main, Malacca, the Cape and
more), the weather (light airs to full gale) and the time of day (including
night actions).

## Controls

| Key | Action |
| --- | --- |
| A / D or ← → | Helm to larboard (port) / starboard |
| W / S or ↑ ↓ | Make / shorten sail (steamers: engine telegraph) |
| X | Rudder amidships |
| Q / E / Space | Fire the larboard / starboard / both broadsides |
| 1 / 2 / 3 | Round shot (hull) / chain shot (sails) / grapeshot (crew) |
| Mouse + click, F | Aim and fire turrets, launch a torpedo (steamers) |
| B | Grapple and board |
| G | Hail the nearest ship |
| Enter | Drop anchor in harbour |
| L | Landing party: dig for treasure |
| M | Sea chart |
| C | Captain's log |
| [ / ] | Slow down / speed up time (only when no enemies are near) |
| Wheel, + / − | Zoom |
| Esc / P, H, N, V | Pause, help, music on/off, voices on/off |

On touch screens, on-screen controls appear automatically.

## Seamanship notes

A square-rigged ship can't sail closer than about 50° to the wind. Point higher
and you will be **in irons**, dead in the water. Fore-and-aft rigs (sloops,
schooners, cutters) can point higher. A broad reach or a beam reach is fastest.
To make ground to windward, **tack**. Ships make **leeway**, drifting slowly
downwind. Carrying full sail in a gale will split your canvas. Running onto a
shoal damages the hull. Reload speed depends on having enough crew to man the
guns.

## The talking characters

Every captain, governor, harbour master, merchant, shipwright, tavern keeper and
old salt has a procedurally drawn portrait that blinks and moves its lips as it
speaks. Their lines are read aloud with your operating system's built-in
text-to-speech voices, which also work offline. Press **V** to turn the voices
off.

## Code layout

| File | Contents |
| --- | --- |
| `js/data.js` | Coastlines, ports, goods, vessels, nations, names, battle sites |
| `js/engine.js` | Projection, math, seeded RNG, input |
| `js/world.js` | Coastline refinement, raster land mask, isles, terrain, ocean, ports, flags |
| `js/ship.js` | Sailing physics (points of sail, leeway, grounding), gunnery, damage, rendering |
| `js/combat.js` | Shot, shells, torpedoes, smoke, splashes, splinters, wakes |
| `js/ai.js` | AI captains: cruise, patrol, pursue, flee, tack, avoid land, hail |
| `js/people.js` | Captains, portraits, dialogue, voices |
| `js/ui.js` | Menus, port screens, sea chart, captain's log, HUD |
| `js/game.js` | Game loop, campaign rules, economy, missions, save/load, lighting |
| `js/audio.js` | Synthesised sea, wind, cannon and a sea shanty |

Saves are kept in the browser's local storage. The game saves automatically
whenever you enter a port.
