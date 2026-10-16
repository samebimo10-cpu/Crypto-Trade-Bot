# Cinema Mode voice lines

Put each actor's voice line here as `.mp3`, `.ogg` or `.wav`, using the names
in `shots.json` (`kemi_1.mp3`, `tobi_1.mp3`, `kemi_2.mp3`, `tobi_2.mp3` by
default). Each line's `at` is when it starts, in seconds from the first shot.

The loudness of each file opens and closes that actor's mouth. While a line
plays, the actor blends from the idle into the talk animation.

Missing files are replaced by a synthetic mumble of the line's `dur`
length, so the scene still plays.
