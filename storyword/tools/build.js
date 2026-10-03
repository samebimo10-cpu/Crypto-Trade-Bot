#!/usr/bin/env node
// Build the whole game into ONE self-contained HTML file that plays offline:
// no server, no internet, no install. Copy it to a phone or laptop and open it.
//
//   node tools/build.js            writes offline/StoryWord.html
//   node tools/build.js --check    exits 1 if offline/StoryWord.html is stale
//
// It inlines the stylesheet, bundles the ES modules (they only use the plain
// `import ... from './x.js'` / `export function|const` forms), and embeds all
// content JSON as window.STORYWORD_CONTENT.
//
// The script and stylesheet are then compiled down with esbuild so the file
// also runs on older phones (Android Chrome 61+, iOS Safari 11+), with small
// fallbacks for the few newer built-ins the game uses. If anything still fails,
// the page shows how to open it instead of hanging on "Loading…".
import { transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT = join(root, 'offline', 'StoryWord.html');

async function bundle(entry) {
  const order = [];
  const seen = new Set();
  const sources = new Map();
  async function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const code = await readFile(file, 'utf8');
    sources.set(file, code);
    for (const m of code.matchAll(/^import [^'"]+ from '(\.[^']+)';$/gm)) {
      await visit(resolve(dirname(file), m[1]));
    }
    order.push(file);
  }
  await visit(entry);

  const key = (f) => relative(root, f);
  return order
    .map((file) => {
      const exported = [];
      let code = sources.get(file);
      code = code.replace(/^import \* as (\w+) from '(\.[^']+)';$/gm, (_, name, p) => `const ${name} = __mod[${JSON.stringify(key(resolve(dirname(file), p)))}];`);
      code = code.replace(/^import \{([^}]+)\} from '(\.[^']+)';$/gm, (_, names, p) => `const {${names}} = __mod[${JSON.stringify(key(resolve(dirname(file), p)))}];`);
      code = code.replace(/^export (async function|function|const|let) (\w+)/gm, (_, kind, name) => {
        exported.push(name);
        return `${kind} ${name}`;
      });
      if (/^\s*(import|export)\s/m.test(code)) throw new Error(`${key(file)}: unsupported import/export form`);
      return `__mod[${JSON.stringify(key(file))}] = (() => {\n${code}\nreturn { ${exported.join(', ')} };\n})();`;
    })
    .join('\n');
}

async function content() {
  const read = async (f) => JSON.parse(await readFile(join(root, 'content', f), 'utf8'));
  const story = await read('story.json');
  const files = ['story.json', 'characters.json', 'puzzles.json', 'daily.json', ...story.chapters.map((c) => c.file)];
  const out = {};
  for (const f of files) out[f] = await read(f);
  out['plus.enc.json'] = await read('plus.enc.json').catch(() => undefined);
  if (!out['plus.enc.json']) delete out['plus.enc.json'];
  return out;
}

// Oldest browsers the offline file supports. Script syntax is lowered to
// ES2017 (what Chrome 61+ and iOS Safari 11+ run); CSS uses browser targets.
export const JS_TARGET = 'es2017';
export const CSS_TARGETS = ['chrome61', 'safari11', 'firefox60', 'edge79'];

// Fallbacks for built-ins newer than TARGETS. Everything the game clones is
// plain JSON data, so a JSON round-trip is an exact structuredClone here.
const POLYFILLS = `(function () {
  var g = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window;
  g.globalThis = g;
  if (!g.structuredClone) g.structuredClone = function (v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); };
  if (!Object.fromEntries) Object.fromEntries = function (it) { var o = {}; Array.from(it).forEach(function (e) { o[e[0]] = e[1]; }); return o; };
  if (!Array.prototype.flat) Object.defineProperty(Array.prototype, 'flat', { configurable: true, writable: true, value: function (d) { d = d === undefined ? 1 : d; return d < 1 ? this.slice() : this.reduce(function (a, v) { return a.concat(Array.isArray(v) ? v.flat(d - 1) : v); }, []); } });
  if (!Array.prototype.flatMap) Object.defineProperty(Array.prototype, 'flatMap', { configurable: true, writable: true, value: function (f, t) { return this.map(f, t).flat(); } });
  if (!Array.prototype.findLast) Object.defineProperty(Array.prototype, 'findLast', { configurable: true, writable: true, value: function (f, t) { for (var i = this.length - 1; i >= 0; i--) if (f.call(t, this[i], i, this)) return this[i]; } });
})();`;

// Shown in place of "Loading…" when the game can't start in this browser.
const FALLBACK = `(function () {
  function fail(detail) {
    if (window.STORYWORD_STARTED) return;
    window.STORYWORD_STARTED = true;
    var app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '<main class="screen center boot-fail"><h2>StoryWord couldn\\u2019t start here</h2>' +
      '<p>This browser or file viewer can\\u2019t run the game. Try one of these:</p>' +
      '<ol><li>Save the file to your phone, then open it with <b>Chrome</b> (Android) or <b>Safari</b> (iPhone), not WhatsApp or a file preview.</li>' +
      '<li>Update Chrome / Safari, or your phone\\u2019s software, and try again.</li>' +
      '<li>On iPhone: open the file in <b>Files</b>, tap Share \\u2192 open in Safari.</li></ol>' +
      '<p class="muted"><small>' + String(detail || '').replace(/[<>&]/g, '') + '</small></p></main>';
  }
  window.addEventListener('error', function (e) { fail(e && e.message); });
  window.addEventListener('unhandledrejection', function (e) { fail(e && e.reason && e.reason.message); });
  setTimeout(function () { fail('Timed out while loading.'); }, 8000);
})();`;

export async function build() {
  const rawCss = await readFile(join(root, 'styles.css'), 'utf8');
  const icon = await readFile(join(root, 'icon.svg'), 'utf8');
  const modern = await bundle(join(root, 'src', 'main.js'));
  const wrapped = `"use strict";\n(() => {\nconst __mod = {};\n${modern}\n})();\n`;
  const js = (await transform(wrapped, { loader: 'js', target: JS_TARGET, charset: 'utf8', legalComments: 'none' })).code;
  const css = (await transform(rawCss, { loader: 'css', target: CSS_TARGETS, charset: 'utf8' })).code;
  const data = JSON.stringify(await content()).replace(/</g, '\\u003c');
  const iconUri = `data:image/svg+xml,${encodeURIComponent(icon)}`;
  return `<!doctype html>
<!-- StoryWord: Crown of the Confluence. Single-file offline build: open this file in any browser. Generated by tools/build.js; do not edit. -->
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#2a0f3a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<title>StoryWord</title>
<link rel="icon" href="${iconUri}" />
<link rel="apple-touch-icon" href="${iconUri}" />
<style>
${css}
</style>
</head>
<body data-scene="none">
<div id="scene" aria-hidden="true"></div>
<div id="fx" aria-hidden="true"></div>
<div id="app" aria-live="polite"><main class="screen center"><p class="muted">Loading…</p></main></div>
<noscript><main class="screen center boot-fail"><h2>StoryWord needs JavaScript</h2><p>This viewer won't run the game. Save the file, then open it with Chrome (Android) or Safari (iPhone).</p></main></noscript>
<div id="toasts" aria-live="polite"></div>
<script>
window.STORYWORD_CONTENT = ${data};
</script>
<script>
${FALLBACK}
${POLYFILLS}
</script>
<script>
${js}
</script>
</body>
</html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = await build();
  if (process.argv.includes('--check')) {
    const current = await readFile(OUTPUT, 'utf8').catch(() => '');
    if (current !== html) {
      console.error('✗ offline/StoryWord.html is out of date. Run: npm run build');
      process.exit(1);
    }
    console.log('✓ offline build is up to date');
  } else {
    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, html);
    console.log(`✓ wrote ${relative(process.cwd(), OUTPUT)} (${(html.length / 1024).toFixed(0)} KB)`);
  }
}
