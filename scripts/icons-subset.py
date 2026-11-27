"""
Makes public/icons/ti.woff2 and app/icons.css: only the Tabler icons the code can name, instead of all 6,000 (812 KB).

Run again after using a new icon:  python scripts/icons-subset.py <path to @tabler/icons-webfont/dist>
(needs fonttools and brotli: pip install fonttools brotli; get the font with npm pack @tabler/icons-webfont@3.35.0)
Any word in app/, components/ or lib/ that is an icon's name counts, so icons named in lists ("send", "brand-x") are kept.
An icon missing from the subset still works on the site: IconFallback loads the full set from the CDN.
"""
import os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont

dist = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css = open(os.path.join(dist, "tabler-icons.css"), encoding="utf-8").read()
names = dict(re.findall(r'\.ti-([a-z0-9-]+):before \{\s*content: "\\([0-9a-f]+)";', css))

# names the code builds from parts (`ti-device-${…}`), which no single word shows
words = {"device-mobile", "device-tablet", "device-laptop"}
for top in ("app", "components", "lib"):
    for d, _, files in os.walk(os.path.join(root, top)):
        for f in files:
            if f.endswith((".ts", ".tsx", ".css")) and f not in ("icons.css", "iconNames.ts"):
                for w in re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", open(os.path.join(d, f), encoding="utf-8").read()):
                    words.add(w)
                    if w.startswith("ti-"): words.add(w[3:])
used = sorted(w for w in words if w in names)

opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = []
opts.name_IDs = ["*"]
font = TTFont(os.path.join(dist, "fonts", "tabler-icons.ttf"))
s = subset.Subsetter(opts)
s.populate(unicodes=[int(names[n], 16) for n in used])
s.subset(font)
os.makedirs(os.path.join(root, "public", "icons"), exist_ok=True)
font.flavor = "woff2"
font.save(os.path.join(root, "public", "icons", "ti.woff2"))

out = ['/* Tabler Icons 3.35.0 (MIT, https://tabler.io), only the icons the code names. Made by scripts/icons-subset.py; do not edit. */',
       '@font-face { font-family: "tabler-icons"; font-style: normal; font-weight: 400; font-display: block; src: url("/icons/ti.woff2") format("woff2"); }',
       '.ti { font-family: "tabler-icons" !important; speak: none; font-style: normal; font-weight: normal; font-variant: normal; text-transform: none; line-height: 1; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }']
out += ['.ti-%s:before { content: "\\%s"; }' % (n, names[n]) for n in used]
open(os.path.join(root, "app", "icons.css"), "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
open(os.path.join(root, "lib", "iconNames.ts"), "w", encoding="utf-8", newline="\n").write(
    "// The icons in public/icons/ti.woff2 (made by scripts/icons-subset.py; do not edit). Anything else loads the full set.\n"
    "export const ICON_NAMES = " + repr(" ".join(used)).replace("'", '"') + ";\n")
print(len(used), "icons,", os.path.getsize(os.path.join(root, "public", "icons", "ti.woff2")), "bytes")
