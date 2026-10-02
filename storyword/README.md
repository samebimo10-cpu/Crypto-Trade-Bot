# StoryWord

A mobile story + word puzzle game. You follow a story, make choices that
shift how people see you, and solve short word puzzles to move it forward.

> Read → Choose → Solve → Influence → Reward → Continue Story

This is the MVP: **Season 1 "The Message", Chapter 1 "Come Home"**, playable
in a mobile browser. It has no dependencies and no build step.

## Run it

```sh
cd storyword
npm start          # http://localhost:8080 (PORT=… to change)
npm test           # engine + content tests (node:test)
npm run validate   # check content files after editing them
```

To try it on a phone, open `http://<your-computer's-LAN-IP>:8080` on the same
network. The game fetches its content as JSON, so it has to be served over
HTTP. Opening `index.html` as a file won't work.

## What's in the MVP

| Spec requirement | What's here |
|---|---|
| 1 chapter, 5–10 scenes | 12 scene nodes; each playthrough visits 10 |
| 8–12 choices | 9 decisions per playthrough, 29 options in total |
| 5–8 characters | Maya, Jun, Rosa, Eli, Daniel, Mr. Hale, and the unknown sender |
| 3–5 word puzzles | 4 (TRAIN, LATE, HEART, SECRET), plus 3 rotating Daily Word puzzles |
| 1 meaningful consequence | What you tell Eli about Maya sends the chapter to one of three branches (`s7_fallout` / `s7_tracks` / `s7_kept`), which converge at `s8_night` and lead to one of three outcomes |
| Save progress | `localStorage`, saved after every action, including partly solved puzzles |
| Relationship variables | Trust, Affection and Reputation (0–100). They stay hidden while you play and are shown on the results and profile screens |
| Word validation | Required words complete the puzzle. Bonus words are accepted and rewarded |
| Hints | First letter → remove letters you don't need → reveal the word |
| Basic rewards | ⭐ stars, 🪙 coins, 📸 memories, 🔥 word streak |
| Screens | Home, Story, Choice, Puzzle, Results, Profile, plus Memories and Daily Word |

Some of the design rules and how they show up:

- **Choices are never labelled good or bad.** No stat numbers appear when you
  choose. Some choices show a single ambiguous line, such as "Eli believed you."
- **Earlier choices change later scenes.** Telling Jun about the message means
  Rosa and Daniel already know about it. Telling Eli means Daniel turns up
  with a bruise. Every path changes the last message you receive.
- **Replay a scene to see another choice.** The results screen lists every
  decision you made, and you can rewind to any of them.
- **Hints are limited but you earn them back by playing.** You start with 3.
  You get +1 for each solved puzzle and +1 for every 3 bonus words, so you can
  always earn a hint without paying.
- **Secret words.** Some puzzles hide bonus words that unlock story secrets
  (STEAL, RESET). There is also one secret you can find through a choice.
  These are meant to feed the Secret Ending in later chapters.

## Layout

```
storyword/
├── index.html, styles.css      shell and styling (light and dark, reduced motion)
├── src/
│   ├── main.js                 screens and input; connects the engines to the DOM
│   ├── ui/portrait.js          SVG character portraits with 6 moods (no art assets)
│   └── engine/                 pure logic, no DOM, unit-tested in Node
│       ├── story.js            scenes, phases, conditions, branching, checkpoints
│       ├── puzzle.js           word validation, hints, stars
│       ├── progress.js         profile, rewards, streaks, Daily Word, save and load
│       └── validate.js         content checks
├── content/                    everything a writer edits
│   ├── story.json              season manifest (chapters, totals)
│   ├── chapters/ch1.json       scenes, choices, outcomes, secrets, memories
│   ├── puzzles.json            chapter puzzles
│   ├── characters.json         names and portrait looks
│   └── daily.json              Daily Word entries (one per day, rotating)
├── tools/                      serve.js, validate-content.js, format-content.js
└── tests/engine.test.js
```

## Writing content

You add a new chapter by editing JSON, not code:

1. Write `content/chapters/chN.json` (copy `ch1.json` as a template).
2. Add `{ "id": N, "file": "chapters/chN.json" }` to `story.json`.
3. Add its puzzles to `puzzles.json`.
4. Run `npm run validate`. It reports broken scene links, unreachable scenes,
   unknown speakers or puzzles, and words that can't be spelled from the
   puzzle's letters.

### Scenes

A scene plays its phases in this order, and skips any phase it has no content
for:

```
lines → choice → response (the chosen option's lines) → puzzle → next
```

```jsonc
{
  "id": "s4_harbor",
  "background": "harbor",              // a .bg-* class in styles.css
  "memory": "m_harbor",                // optional: unlocks when the scene is shown
  "lines": [
    {"speaker": "eli", "mood": "angry", "text": "Stay away from my sister."},
    {"speaker": "narrator", "if": {"flags": ["told_jun"]}, "text": "Only shown if…"}
  ],
  "prompt": "Eli wants to know what Maya told you.",
  "choices": [
    {
      "id": "c_tell_eli",
      "text": "She got a message. Someone's threatening her.",
      "effects": {"trust": 10, "affection": -10},
      "setFlags": ["told_eli"],
      "echo": "Maya asked you not to.",  // optional: shown as a short toast
      "response": [{"speaker": "eli", "text": "Threatening her? Who?"}],
      "next": "s5_x"                     // optional: overrides the scene's next
    }
  ],
  "puzzle": "p_secret",                 // optional
  "next": [                             // a scene id, or routes checked in order
    {"if": {"flags": ["told_eli"]}, "to": "s7_fallout"},
    {"to": "s7_kept"}                    // the last route must have no condition
  ]
}
```

- **Conditions** (`if`) can use `flags`, `anyFlags`, `notFlags`, and
  `min` / `max` stat bounds. You can put one on lines, choices, routes,
  outcomes and reflections.
- **Moods** are `neutral`, `smile`, `sad`, `angry`, `surprised` and `worried`.
- `"next": null` ends the chapter. The results screen then shows the first
  matching `outcomes` entry and every matching `reflections` line.
- A flag whose id matches a key in the chapter's `secrets` counts as a secret
  discovered.

### Puzzles

```jsonc
{
  "id": "p_heart",
  "prompt": "Something still beats under all this silence.",
  "hint": "Something connected to love.",
  "letters": ["H", "E", "A", "R", "T"],
  "requiredWords": ["HEART", "HEAR", "HEAT"],  // find all of these to finish
  "bonusWords": ["EARTH", "RATE", "..."],      // also accepted and rewarded
  "secrets": [{"word": "EARTH", "id": "s_x"}],  // optional; the word must be listed above
  "reward": {"coins": 3},
  "minLength": 3
}
```

There is no dictionary. The game only accepts words listed in the puzzle.
That keeps each puzzle on theme, but it means `bonusWords` needs to cover the
real words players are likely to try. Run `node tools/format-content.js` to
tidy the JSON after editing.

## Not built yet

These are left out on purpose, following the spec's build order:

- sound
- monetization
- cosmetics and spending coins (coins are earned but there's nothing to buy yet)
- chapters 2–10 and the endings
- any server or account system
