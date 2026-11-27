"""Converte a textura de cor do Mobi para WebP (as outras ficam PNG, sem perda)."""
from pathlib import Path
from PIL import Image

tex = Path(__file__).resolve().parents[2] / "src/modules/veiculos/mobi3d/tex"
Image.open(tex / "albedo.png").convert("RGB").save(tex / "albedo.webp", "WEBP", quality=90, method=6)
(tex / "albedo.png").unlink()
for name in ("orm.png", "fx.png"):
    Image.open(tex / name).save(tex / name, optimize=True)
print(*(f"{p.name} {p.stat().st_size // 1024} KB" for p in sorted(tex.iterdir())), sep="\n")
