# Cinema Mode actors (Mixamo)

Put your two Mixamo characters here. Until these files exist, Cinema Mode
uses built-in stand-in actors.

The file names below are the defaults in `shots.json`; change them there if
you use other names.

| File | What to download from mixamo.com |
| --- | --- |
| `kemi.fbx` | The character, **FBX Binary, With Skin**, T-pose (or any animation) |
| `kemi_idle.fbx` | An idle animation (e.g. "Idle", "Breathing Idle") on the same character, FBX, **In Place** |
| `kemi_talk.fbx` | A talking animation (e.g. "Talking"), FBX, **In Place** |
| `tobi.fbx`, `tobi_idle.fbx`, `tobi_talk.fbx` | The same for the second actor |

Animation files can be exported **Without Skin** to keep them small. GLB/GLTF
files work too (convert in Blender); use `.glb` names in `shots.json`.

Mouths: if the model has a mouth/jaw morph target (`jawOpen`, `mouthOpen`,
`viseme_aa`) or a jaw bone, the voice drives that. Standard Mixamo
characters have neither, so a small mouth is drawn on the head bone instead;
nudge it with `"mouth": [x, y, z]` (metres, head-bone space) on the actor.

Mixamo's terms let you use the characters in your projects but not
redistribute the raw files, so keep this folder out of public repositories
if you are unsure (add `games/legends-road/actors/*.fbx` to `.gitignore`).
