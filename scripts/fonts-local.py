"""
Serves the site's Google fonts from its own address: public/fonts/*.woff2 and app/fonts.css, same family names.

Run again to change fonts:  python scripts/fonts-local.py <css saved from fonts.googleapis.com/css2?... with a Chrome user agent>
Only the latin and latin-ext parts are kept (the site's writing; Bangla comes from the system's fonts).
A browser only downloads a face the page actually uses, so a theme gets just its own fonts.
"""
import os, re, sys, urllib.request

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css = open(sys.argv[1], encoding="utf-8").read()
out_dir = os.path.join(root, "public", "fonts")
os.makedirs(out_dir, exist_ok=True)
blocks = re.findall(r"/\* ([a-z-]+) \*/\s*(@font-face \{.*?\})", css, re.S)
files, out = {}, ["/* The site's fonts, served from its own address (SIL Open Font License). Made by scripts/fonts-local.py; do not edit. */"]
for subset, block in blocks:
    if subset not in ("latin", "latin-ext"):
        continue
    url = re.search(r"url\((https://[^)]+)\)", block).group(1)
    fam = re.search(r"font-family: '([^']+)'", block).group(1)
    if url not in files:
        name = "%s-%s-%d.woff2" % (fam.lower().replace(" ", "-"), subset, len([f for f in files.values() if f.startswith(fam.lower().replace(" ", "-") + "-" + subset)]))
        urllib.request.urlretrieve(url, os.path.join(out_dir, name))
        files[url] = name
    out.append(re.sub(r"\s+", " ", block.replace(url, "/fonts/" + files[url])))
open(os.path.join(root, "app", "fonts.css"), "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
print(len(out) - 1, "faces,", len(files), "files,", sum(os.path.getsize(os.path.join(out_dir, f)) for f in files.values()), "bytes")
