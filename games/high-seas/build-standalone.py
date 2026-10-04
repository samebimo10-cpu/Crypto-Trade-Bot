#!/usr/bin/env python3
"""Bundle High Seas into one self-contained HTML file.

Phones (and some file managers) open a downloaded .html file on its own, via a
content:// link, so the separate css/ and js/ files can't be found. The
standalone file has every stylesheet and script inlined and plays anywhere,
offline.  Usage:  python3 build-standalone.py   ->  high-seas-standalone.html
"""
import re
from pathlib import Path

here = Path(__file__).resolve().parent
html = (here / "index.html").read_text(encoding="utf-8")

def inline_css(m):
    return "<style>\n" + (here / m.group(1)).read_text(encoding="utf-8") + "\n</style>"

def inline_js(m):
    src = (here / m.group(1)).read_text(encoding="utf-8")
    assert "</script" not in src.lower(), m.group(1)
    return "<script>\n" + src + "\n</script>"

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
# the manifest, icon and service worker are separate files; the standalone build doesn't need them
html = re.sub(r'\s*<link rel="(manifest|icon)"[^>]*>', "", html)
html = re.sub(r"\s*<script>\s*// Cache everything.*?</script>", "", html, flags=re.S)
assert 'src="js/' not in html and 'href="css/' not in html
out = here / "high-seas-standalone.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out.name} ({out.stat().st_size // 1024} KB)")
