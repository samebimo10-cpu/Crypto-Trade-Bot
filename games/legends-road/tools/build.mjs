// Builds games/legends-road/index.html from the modules in src/ (plain concatenation, no dependencies).
//   node games/legends-road/tools/build.mjs          write index.html
//   node games/legends-road/tools/build.mjs --check  fail if index.html is out of date or has a syntax error
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Order matters: head.html opens the page and the game script; z_main.js starts the loop and closes it.
const ORDER = [
  'head.html',      // markup, CSS, the opening of the game script
  'data.js',        // episodes, places, legends, cars, time-of-day presets
  'a_utils_art.js', // helpers and 2D art (Classic 2D mode and canvas textures)
  'd_art2.js',      // more 2D art: roadside kit, landmarks
  'b_signs.js',     // road signs
  'c_layers.js',    // 2D parallax layers
  'e_engine.js',    // track building, race logic, dialogue, HUD, sound, menus, save data
  'f_three.js',     // 3D renderer: world build, materials, sky, post-processing, cameras
  'g_cars.js',      // 3D car models (lofted bodies) and garage studio renders
  'h_life.js',      // pedestrians, cyclists, okadas, kekes, roadside kit, power lines, side streets
  'i_drive.js',     // inside-the-car view, mirror, wipers, brake lights, blood
  'm_music.js',     // synthesised car radio
  'n_cinema.js',    // Cinema Mode
  'z_main.js'       // main loop, input wiring, service worker
];
const html = ORDER.map(f => readFileSync(join(root, 'src', f), 'utf8')).join('');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
try { new Function(js); } catch (e) { console.error('Syntax error in game script:', e.message); process.exit(1); }
const out = join(root, 'index.html');
if (process.argv.includes('--check')) {
  if (readFileSync(out, 'utf8') !== html) { console.error('index.html is out of date: run node games/legends-road/tools/build.mjs'); process.exit(1); }
  console.log('index.html matches src/ (' + html.length + ' bytes)');
} else { writeFileSync(out, html); console.log('built index.html (' + html.length + ' bytes)'); }
