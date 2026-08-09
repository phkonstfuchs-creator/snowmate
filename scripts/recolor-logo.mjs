/* Generates public/logo-print.png from public/logo.png: reduces the
   original to the screen-print spot colours of the design tokens.
   Re-run when the logo or the palette changes:
     node scripts/recolor-logo.mjs
   Requires Python 3 with Pillow. */
import { execFileSync } from "node:child_process";

const PY = `
import colorsys
from PIL import Image, ImageFilter

im = Image.open("public/logo.png").convert("RGBA")
alpha = im.getchannel("A")
rgb = im.convert("RGB").filter(ImageFilter.MedianFilter(size=3))

def hx(x): x=x.lstrip("#"); return tuple(int(x[i:i+2],16) for i in (0,2,4))
INK, PAPER, PAPER2 = hx("1c1815"), hx("f2eadb"), hx("dccbb0")
RUST, OCHRE, PINE  = hx("a83f1b"), hx("d9962b"), hx("2a5647")
SKY, SKY_L         = hx("3e6e8e"), hx("a9c6d6")

def classify(r, g, b):
    hh, ll, ss = colorsys.rgb_to_hls(r/255, g/255, b/255)
    hdeg = hh * 360
    if ll < 0.22:               return INK
    if ll > 0.74 and ss < 0.50: return PAPER
    if ss < 0.14:               return PAPER2 if ll > 0.46 else INK
    if hdeg < 20 or hdeg >= 340:return RUST
    if hdeg < 50:               return OCHRE
    if 60 <= hdeg < 160:        return PINE
    if 160 <= hdeg < 265:       return SKY if ll < 0.58 else SKY_L
    return RUST

out = Image.new("RGBA", im.size)
sp, op, ap = rgb.load(), out.load(), alpha.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        a = ap[x, y]
        if a < 24:
            op[x, y] = (0, 0, 0, 0); continue
        op[x, y] = (*classify(*sp[x, y]), 255 if a > 150 else a)
out.save("public/logo-print.png")

bg = Image.new("RGBA", out.size, (242, 234, 219, 255))
bg.alpha_composite(out)
bg.convert("RGB").resize((180, 180), Image.LANCZOS).save("app/icon.png")
print("public/logo-print.png und app/icon.png neu erzeugt")
`;
execFileSync("python3", ["-c", PY], { stdio: "inherit" });
