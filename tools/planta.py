# planta vista de cima: python3 tools/planta.py /tmp/audit/<id>.json saida.png
import json, sys
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); hx, hz = d['size']; S = 12
W, H = int(2 * hx * S) + 40, int(2 * hz * S) + 40
im = Image.new('RGB', (W, H), (40, 60, 40)); dr = ImageDraw.Draw(im, 'RGBA')
X = lambda x: 20 + (x + hx) * S; Z = lambda z: 20 + (z + hz) * S
def col(top):
    t = max(0, min(1, top / 10)); return (int(90 + 165 * t), int(80 + 60 * (1 - t)), int(200 - 150 * t), 255)
for s in sorted(d['solids'], key=lambda s: s[4]):
    x0, y0, z0, x1, y1, z1, r = s
    if x1 - x0 > 2 * hx: continue
    c = col(y1) if not r else (240, 240, 120, 255)
    dr.rectangle([X(x0), Z(z0), X(x1), Z(z1)], fill=c, outline=(0, 0, 0, 120))
for x, y, z, roof in d['nodes']:
    c = (255, 255, 255, 160) if y < 1 else (80, 255, 255, 200) if y < 4.5 else (255, 80, 255, 220)
    r = 2 if not roof else 3
    dr.ellipse([X(x) - r, Z(z) - r, X(x) + r, Z(z) + r], fill=c if not roof else None, outline=c)
for x, y, z in d['zones']: dr.ellipse([X(x) - 4 * S, Z(z) - 4 * S, X(x) + 4 * S, Z(z) + 4 * S], outline=(255, 200, 0, 90))
for x, y, z in d['spawns']: dr.rectangle([X(x) - 5, Z(z) - 5, X(x) + 5, Z(z) + 5], fill=(255, 40, 40, 255))
if d.get('worst'): x, z, r = d['worst']; dr.ellipse([X(x) - r * S, Z(z) - r * S, X(x) + r * S, Z(z) + r * S], outline=(255, 0, 0, 255), width=2)
for i in range(-int(hx // 10) * 10, int(hx) + 1, 10): dr.line([X(i), 0, X(i), 12], fill=(255, 255, 255, 200)); dr.text((X(i) + 2, 0), str(i), fill=(255, 255, 255))
for i in range(-int(hz // 10) * 10, int(hz) + 1, 10): dr.line([0, Z(i), 12, Z(i)], fill=(255, 255, 255, 200)); dr.text((0, Z(i) + 2), str(i), fill=(255, 255, 255))
im.save(sys.argv[2])
