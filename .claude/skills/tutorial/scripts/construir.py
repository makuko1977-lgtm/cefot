#!/usr/bin/env python3
"""Monta el manual interactivo a partir de las capturas.

Uso:
  python3 construir.py <carpeta_capturas> [salida.html]
      Un único HTML autocontenido (estilos e imágenes incrustados), para
      publicarlo como artifact.

  python3 construir.py <carpeta_capturas> --app
      Versión para la propia aplicación: escribe public/manual.html (usa
      /shared/app.css del servidor) y copia las imágenes a public/manual/.
      Queda en https://cefot.up.railway.app/manual.html al desplegar.
"""
import base64, glob, json, os, shutil, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, "..", "..", "..", ".."))
MARCAS = ("/*APPCSS*/", "/*DEMOS*/", "/*IMAGENES*/")


def leer_css():
    css = os.path.join(REPO, "public", "shared", "app.css")
    if not os.path.exists(css):  # fuera del repositorio: copia de respaldo
        css = os.path.join(AQUI, "app.css")
    return open(css, encoding="utf-8").read()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    capturas = sys.argv[1]
    modo_app = "--app" in sys.argv[2:]
    plantilla = open(os.path.join(AQUI, "plantilla.html"), encoding="utf-8").read()
    for marca in MARCAS:
        if marca not in plantilla:
            sys.exit("Falta la marca %s en plantilla.html" % marca)
    demos = json.load(open(os.path.join(capturas, "demos.json"), encoding="utf-8"))
    archivos = [p["img"] for d in demos.values() for p in d["pasos"]]

    if modo_app:
        destino = os.path.join(REPO, "public", "manual")
        os.makedirs(destino, exist_ok=True)
        for viejo in glob.glob(os.path.join(destino, "*.jpg")) + glob.glob(os.path.join(destino, "*.png")):
            if os.path.basename(viejo) not in archivos:
                os.remove(viejo)
        for a in archivos:
            shutil.copyfile(os.path.join(capturas, a), os.path.join(destino, a))
        imagenes = {a: "manual/" + a for a in archivos}
        cuerpo = (plantilla.replace("/*APPCSS*/", "")
                           .replace("/*DEMOS*/", json.dumps(demos, ensure_ascii=False))
                           .replace("/*IMAGENES*/", json.dumps(imagenes)))
        cuerpo = cuerpo.replace("<style>", '<link rel="stylesheet" href="/shared/app.css">\n<style>', 1)
        cuerpo = cuerpo.replace('<div class="app">', '</head>\n<body>\n<div class="app">', 1)
        html = ('<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
                '<link rel="icon" href="/shared/icon.svg" type="image/svg+xml">\n'
                + cuerpo + '\n</body>\n</html>\n')
        salida = os.path.join(REPO, "public", "manual.html")
        open(salida, "w", encoding="utf-8").write(html)
        total = sum(os.path.getsize(os.path.join(destino, a)) for a in archivos) / 1e6
        print("Escrito %s y %d imágenes en %s (%.1f MB)" % (salida, len(archivos), destino, total))
        return

    salida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(capturas, "manual-interactivo.html")
    imagenes = {}
    for a in archivos:
        ruta = os.path.join(capturas, a)
        tipo = "image/png" if ruta.endswith(".png") else "image/jpeg"
        imagenes[a] = "data:%s;base64,%s" % (tipo, base64.b64encode(open(ruta, "rb").read()).decode())
    html = (plantilla.replace("/*APPCSS*/", leer_css())
                     .replace("/*DEMOS*/", json.dumps(demos, ensure_ascii=False))
                     .replace("/*IMAGENES*/", json.dumps(imagenes)))
    open(salida, "w", encoding="utf-8").write(html)
    mb = os.path.getsize(salida) / 1e6
    print("Escrito %s (%.1f MB, %d demos, %d imágenes)" % (salida, mb, len(demos), len(imagenes)))
    if mb > 15:
        print("AVISO: supera ~15 MB; un artifact admite 16 MB como máximo. Baja la calidad JPEG o divide el manual.")


if __name__ == "__main__":
    main()
