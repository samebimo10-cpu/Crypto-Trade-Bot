# StoryWord: Crown of the Confluence

A story + word puzzle game you can play offline. It's a saga of mystery, romance, death and
joy that moves from **Jos (Plateau State)**, **Kano**, **Lagos**, **Bayelsa** and **Port
Harcourt** to **London**, **Switzerland** and **the Caribbean**.

> Four houses. One crown. Every secret is a weapon.

When Chief Gideon Okoro dies in Port Harcourt, four letters sealed in red wax go out across
Nigeria. You choose whose story to follow:

| | Character | House | Home |
|---|---|---|---|
| ⭐ | **Nabyen Dalyop** (key character) | House of the Rock | Jos, Plateau State |
| | Tari Ebiowei | House of the Creeks | Yenagoa, Bayelsa State |
| | Hadiza Lawan | House of the Walls | Kano |
| | Kolade Balogun | House of the Lagoon | Lagos |

Each house has its own first chapter. After that the four stories join up: a funeral in
Port Harcourt, a murder in London, a vault and a deadly mountain pass in Switzerland, and
the vote for the crown in Tobago. The choices you make carry through every chapter. You
can fall in love, betray your friends, or send someone down the mountain who never comes
back.

## Play offline

There are three ways to play.

- **One file, no internet.** Open `offline/StoryWord.html` in any browser on a phone or
  computer. The whole game is inside that one file, so you can share it over WhatsApp,
  AirDrop, a USB stick or email.
- **Install it as an app.** Serve the folder with `npm start` and open it once. Then use
  *Add to Home Screen*. After that it works with no connection.
- **Development.** Run `npm start`, then open http://localhost:8080.

### If it won't open on a phone

The offline file runs on Android Chrome 61+ and iOS Safari 11+ (iPhone 5s and newer). If
the game can't start, it shows a help screen instead of hanging on "Loading…".

- **"Loading…" that never goes away means the file is being previewed, not run.**
  WhatsApp, Gmail, Files and file-manager previews show HTML without running it. After a
  few seconds the page explains this itself.
- **Android:** tap ⋮ → *Open with* → **Chrome**.
- **iPhone:** iOS only previews HTML files saved on the phone, so use the web link
  instead:
  https://raw.githack.com/samebimo10-cpu/Crypto-Trade-Bot/ccr-9622801a-sxd12y/storyword/offline/StoryWord.html
- **Update the browser** if the help screen still appears.
- **Use the file, not the claude.ai link.** The artifact link is private to its owner.

### Development

```sh
cd storyword
npm install        # once: installs esbuild, used by the offline build
npm start          # local server on port 8080
npm test           # engine, content, story-path and build tests
npm run validate   # check content after editing
npm run build      # regenerate offline/StoryWord.html (commit it)
npm run words -- suggest SECRET    # words a set of letters can spell
npm run words -- fill              # add every real word to each puzzle's bonus list
```

## What's in it

- **The mystic thread.** The saga opens in a dream before it opens in a mansion. A woman
  in white stands on a black river and tells Nabyen that *someone has always been
  watching you*.
  - From then on, notes signed **W.** with a single red rose turn up where they shouldn't:
    on her rocks in Jos, in her funeral wreath, on a London bridge. Answer them or burn
    them, and the Watcher's notes change.
  - **Nana Rinji's diary** carries a family curse ("the women of our line see the river
    before a death") and a prophecy about a broken coral necklace.
  - A blind dyer in Kano and a kola-seller in Lagos see the same river. Le Berger leaves
    white lilies.
  - Who W. is stays hidden until London.
  - Each chapter opens on a title card with an epigraph. A new *mystic* cue (choir,
    distant bells, a kora that never resolves) plays with whispers and chimes, and rose
    petals fall over the dream river.

The game is built around relational tension and high-stakes trade-offs, with word puzzles
reframed as decoding.

- **Your heart.** Three axes move with every choice: **Desire**, **Control**, and
  **Loyalty ↔ Luxury**. Choice cards are tagged with the axis they push (Desire, Control,
  Loyalty, Luxury or Leverage) and marked when they're high risk.
- **Hearts and rivals.** Tari, Kolade, Hadiza and Nabyen each have **intimacy** and
  **tension** with you. Their status changes as those move: *Unspoken Desire*, *Dangerous
  Alliance*, *Rival Intellect*, *Slow Burn*, *Dangerous Passion*, *Open Enemy*. Some
  choices stay **locked** until the relationship is ready, for example "Requires tension
  50+ with Kolade".
- **Leverage ("pillow talk").** Hidden words in puzzles uncover secrets, and each secret
  can be played once in a later conversation. You can use one to corner Kolade, soften
  the widow, break Elise, or win someone's trust. A leverage choice only appears while
  you hold the secret. 🗝 shows what you're carrying.
- **Tension puzzles.** Each puzzle is an intercepted message, a confession, a veiled
  threat or a coded ledger. Solving it decodes the note.
- **Confessions and keepsakes.** You collect voice notes, letters and mementos, such as
  Oliver's last voicemail, the blackened spoon, and Gideon's unsent message to Kaneng.
- **Noir and jewel tones.** The palette is midnight, garnet, emerald and gold. Scenes have
  candlelight embers, river mist and gold dust, and the vignette tightens like a heartbeat
  in tense moments.
- **A full cinematic score and sound effects, generated in code.** Everything is
  synthesised with the Web Audio API, with no audio files, so it plays offline.
  - **Nine cues:** title, romance, tension, danger, night, sorrow, triumph, calm and
    mystic.
    They're built from taiko-style drums, a talking drum, string ostinatos, brass swells,
    a choir and kora-like plucked strings.
  - **Ambience:** rain, storm, wind, waves, crickets and fire, chosen by location.
  - **26 sound effects,** including whispers, chimes, thunder, gunshots, breaking glass, a heartbeat, text
    buzzes, letters, and stings for deaths, reveals and romance. Taps, choices, correct
    words, secrets and keepsakes all have their own sounds.
  - Sound is on by default and starts on the first tap; ♪ toggles it. The mix is voiced
    above 200 Hz so phone speakers carry it, and it plays even with the iPhone silent
    switch on.
- **The story.**
  - A hidden mastermind, *Le Berger* (the shepherd), is seeded through every chapter
    and unmasked in Tobago, with a gun on the beach.
  - A night in Montreux before the bank: romance, and a stranger with a syringe at the
    door.
  - Danger in every house's chapter: Nabyen's market stall burned, Tari's boat
    ambushed, poisoned kunu for Hadiza, a gunman's warning for Kolade.
  - A slashed portrait at the funeral.

- **9 endings:**
  - *Dangerous Power Couple*, *Rivalry Turned Passion* and *Solitary Empress*
  - *Where the Rivers Meet* (wedding), *The Crown of the Confluence* and *Four Rivers,
    One Sea*
  - *Ashes on the Water*, *The Price of Gold*, and the secret *Seventh Seal*
- **Still here from before:**
  - four playable houses and Nabyen as the key character
  - deaths on the Alpine pass
  - 25 animated locations, including the dream river and animated portraits, now with *intimate* and *defiant*
    expressions
  - Daily Word, rewinding to any decision, and saving on the device

## 18+ Pass

There's optional mature content: steamier nights that fade to black, darker and more
violent choices, and two extra endings (*Blood Crown* and *The Seducer*). It's locked
behind a password.

- **Encrypted, not hidden.** The 18+ content ships only as ciphertext
  (`content/plus.enc.json`, AES-256-GCM). Nothing in the game file or this repository
  reveals it without a secret.
- **Setup code, then your password.** The owner gets a one-time setup code. Entering it
  in *Your story → 18+ Pass* (with an 18+ confirmation) unlocks the content once and sets
  a personal password. The device keeps only a password-encrypted copy of the key,
  derived with PBKDF2 at 250k iterations.
- **Locks itself.** The unlocked content lives in memory only, so reopening the game
  locks it again. *Lock now* locks it immediately.
- **Editing it.** To change the content, run
  `STORYWORD_PLUS_KEY=<setup code> node tools/plus.js open`. Edit
  `content-plus/plus.json` (git ignores it), then run `node tools/plus.js seal
  content-plus/plus.json` and `npm run build`. With `STORYWORD_PLUS_KEY` set, `npm test`
  also validates the 18+ story.

## How it's built

```
storyword/
├── index.html, styles.css, sw.js, manifest.webmanifest, icon.svg
├── offline/StoryWord.html     single-file offline build (generated by tools/build.js)
├── src/
│   ├── main.js                screens, input, scene layer
│   ├── ui/portrait.js         animated SVG characters
│   ├── ui/scenes.js           animated SVG locations
│   └── engine/                pure logic, unit-tested in Node
│       ├── story.js           scenes, choices, conditions, POV, chapters carrying over
│       ├── puzzle.js          word validation, hints, stars
│       ├── progress.js        profile, rewards, Daily Word, save and load
│       └── validate.js        content checks
├── content/                   everything a writer edits
│   ├── story.json             saga manifest: chapter order, POV chapters, secrets
│   ├── chapters/*.json        prologue, c1_<pov>, c2_funeral … c5_caribbean
│   ├── puzzles.json, daily.json, characters.json
└── tools/                     serve, build, validate, words, format-content
    └── data/common-words.txt  ~11k vetted common English words
```

### Writing content

Chapters are JSON, so you can add new ones without touching code. These are the main
features available:

- **Choosing a character.** `"pov": "nabyen"` on a choice sets the player's character.
  Chapters in `story.json` can be limited to one character with
  `"if": {"pov": "tari"}`.
- **Conditions** go on lines, choices, routes, outcomes and reflections:
  - `flags`, `anyFlags`, `notFlags`
  - `min` and `max` stat bounds
  - `pov` and `notPov`
  - `count: {of: [...], min: n}`
- **Scene flags.** A scene can set flags just by being reached, using
  `"setFlags": ["dead_tari"]`. Deaths and endings work this way.
- **The player's name in text.** `{pov}` in story text is replaced with the name of the
  character you're playing. Lines spoken by that character are labelled "(you)".
- **Sound.** Scenes take `music` (`title`, `romance`, `tension`, `danger`, `night`,
  `sorrow`, `triumph`, `calm` or `mystic`) and an optional `ambience`. Lines and choices take
  `sfx`. The validator rejects unknown names.
- **Romance and intrigue.**
  - `rel: {kolade: {intimacy: 10, tension: 5}}` on a choice shifts the relationship.
  - `gate: {if: {...}, label: "..."}` shows the choice but locks it until the condition
    holds.
  - `leverage: "s_spoon"` shows the choice only while you hold that secret, and spends it.
  - `tag` and `risk` label the card. `keepsake` awards a voice note, letter or memento.
  - Puzzles take `frame` and `decoded`. A scene can set `tension: true`.
- **Speakers.**
  - `letter` shows a wax-sealed letter, `phone` a text message and `narrator`
    narration.
  - `note` shows a handwritten note. Set `"flower": "rose"` or `"lily"` on the line.
  - `diary` shows a parchment diary page and `river` shows a ghostly whisper.
- **Epigraphs.** `"epigraph": {"text": "...", "source": "..."}` on a chapter shows it on
  that chapter's title card.
- **Checking.** `npm run validate` catches:
  - broken links and unreachable scenes
  - unknown speakers
  - scene art that doesn't exist
  - secrets that aren't defined
  - real words a puzzle doesn't accept yet (run `npm run words -- fill`)
