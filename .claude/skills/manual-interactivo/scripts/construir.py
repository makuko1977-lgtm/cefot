#!/usr/bin/env python3
"""Monta el manual interactivo en un único HTML autocontenido.

Uso:  python3 construir.py <carpeta_capturas> [salida.html]

- Inserta public/shared/app.css (los estilos del servidor) en /*APPCSS*/.
- Inserta demos.json en /*DEMOS*/.
- Inserta cada imagen de los pasos como data: URI en /*IMAGENES*/.
"""
import base64, json, os, sys

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
            ruta = os.path.join(capturas, p["img"])
            tipo = "image/png" if ruta.endswith(".png") else "image/jpeg"
            imagenes[p["img"]] = "data:%s;base64,%s" % (tipo, base64.b64encode(open(ruta, "rb").read()).decode())
    for marca in ("/*APPCSS*/", "/*DEMOS*/", "/*IMAGENES*/"):
        if marca not in plantilla:
            sys.exit("Falta la marca %s en plantilla.html" % marca)
    html = (plantilla.replace("/*APPCSS*/", appcss)
                     .replace("/*DEMOS*/", json.dumps(demos, ensure_ascii=False))
                     .replace("/*IMAGENES*/", json.dumps(imagenes)))
    open(salida, "w", encoding="utf-8").write(html)
    mb = os.path.getsize(salida) / 1e6
    print("Escrito %s (%.1f MB, %d demos, %d imágenes)" % (salida, mb, len(demos), len(imagenes)))
    if mb > 15:
        print("AVISO: supera ~15 MB; un artifact admite 16 MB como máximo. Baja la calidad JPEG o divide el manual.")

if __name__ == "__main__":
    main()
