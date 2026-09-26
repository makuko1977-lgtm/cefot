#!/usr/bin/env python3
"""Monta el manual interactivo en un único HTML autocontenido.

Uso:  python3 construir.py <carpeta_capturas> [salida.html]

- Inserta public/shared/app.css (los estilos del servidor) en /*APPCSS*/.
- Inserta demos.json en /*DEMOS*/.
- Inserta cada imagen de los pasos como data: URI en /*IMAGENES*/.
  Si está Pillow (pip install pillow), las convierte a WebP (calidad
  WEBP_CALIDAD, por defecto 75): ocupan ~50 % menos que el JPEG original.
  Sin Pillow se insertan los JPEG tal cual.
"""
import base64, io, json, os, sys
try:
    from PIL import Image
except ImportError:
    Image = None
CALIDAD = int(os.environ.get("WEBP_CALIDAD", "75"))

def data_uri(ruta):
    if Image is not None and CALIDAD > 0:
        b = io.BytesIO()
        Image.open(ruta).save(b, "WEBP", quality=CALIDAD, method=6)
        return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()
    tipo = "image/png" if ruta.endswith(".png") else "image/jpeg"
    return "data:%s;base64,%s" % (tipo, base64.b64encode(open(ruta, "rb").read()).decode())

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, "..", "..", "..", ".."))

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    capturas = sys.argv[1]
    salida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(capturas, "manual-interactivo.html")
    plantilla = open(os.path.join(AQUI, "plantilla.html"), encoding="utf-8").read()
    css = os.path.join(REPO, "public", "shared", "app.css")
    if not os.path.exists(css):  # fuera del repositorio: copia de respaldo
        css = os.path.join(AQUI, "app.css")
    appcss = open(css, encoding="utf-8").read()
    demos = json.load(open(os.path.join(capturas, "demos.json"), encoding="utf-8"))
    imagenes = {}
    for d in demos.values():
        for p in d["pasos"]:
            imagenes[p["img"]] = data_uri(os.path.join(capturas, p["img"]))
    for marca in ("/*APPCSS*/", "/*DEMOS*/", "/*IMAGENES*/"):
        if marca not in plantilla:
            sys.exit("Falta la marca %s en plantilla.html" % marca)
    html = (plantilla.replace("/*APPCSS*/", appcss)
                     .replace("/*DEMOS*/", json.dumps(demos, ensure_ascii=False))
                     .replace("/*IMAGENES*/", json.dumps(imagenes)))
    open(salida, "w", encoding="utf-8").write(html)
    mb = os.path.getsize(salida) / 1e6
    formato = ("WebP calidad %d" % CALIDAD) if (Image is not None and CALIDAD > 0) else "JPEG original"
    print("Escrito %s (%.1f MB, %d demos, %d imágenes, %s)" % (salida, mb, len(demos), len(imagenes), formato))
    if mb > 15:
        print("AVISO: supera ~15 MB; un artifact admite 16 MB como máximo. Baja la calidad JPEG o divide el manual.")

if __name__ == "__main__":
    main()
