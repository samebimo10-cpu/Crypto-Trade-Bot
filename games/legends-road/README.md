# Legends Road

An offline road racer across eight historic places. Each leg ends at a finish
line where you meet a famous person whose fortune began there, with a short
history of the place and their story.

| Leg | Place | History | Person |
| --- | --- | --- | --- |
| 1 | Kano, Nigeria | Trans-Saharan trade city, ancient walls, Kofar Mata dye pits | Aliko Dangote |
| 2 | A Coruña, Spain | Tower of Hercules, the oldest Roman lighthouse still in use | Amancio Ortega |
| 3 | Paris, France | Eiffel Tower (1889), Haussmann's boulevards | Bernard Arnault |
| 4 | Mumbai, India | Seven islands, Gateway of India (1924) | Mukesh Ambani |
| 5 | Hong Kong | Victoria Harbour, the Peak Tram (1888) | Li Ka-shing |
| 6 | Omaha, USA | Start of the Union Pacific transcontinental railroad | Warren Buffett |
| 7 | Seattle, USA | Klondike Gold Rush gateway, Space Needle (1962) | Bill Gates |
| 8 | Starbase, USA | Battle of Palmito Ranch (1865), Starship launch site | Elon Musk |

## Play

Open `index.html` in any modern browser. Everything (cars, buildings,
landmarks, skies, weather and sound) is drawn and synthesised in code, so the
game needs no network connection and no installation.

To install it as an app that works offline, serve the folder over HTTP (for
example `python3 -m http.server` from this folder) and use the browser's
"Install" or "Add to Home Screen" option. The service worker caches the game
on first load.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer | Left / Right arrows, A / D | Left and right buttons, or swipe |
| Accelerate | Up arrow, W | Automatic |
| Brake | Down arrow, S | Brake button |
| Nitro | Space or Shift | Nitro button |
| Pause | P or Esc | II button |
| Sound on/off | M | SND button |

Collect gold coins to build your fortune and blue canisters to refill nitro.
Off-road driving slows you down, and roadside objects stop you. Finishing a leg
unlocks the next one; progress is saved in the browser.

Add `?autodrive` to the URL to let the car drive itself (demo mode).

The stories are short summaries of public biographies. Fortunes and rankings
change often.
