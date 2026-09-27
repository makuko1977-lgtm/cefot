#!/usr/bin/env python3
"""Monta el manual interactivo a partir de las capturas.

Uso:
  python3 construir.py <carpeta_capturas> --app
      Versión de la propia aplicación: escribe public/manual.html (enlaza
      /shared/app.css del servidor) y guarda las imágenes en public/manual/
      (borra las que sobren). Queda en https://cefot.up.railway.app/manual.html
      al desplegar.

  python3 construir.py <carpeta_capturas> [salida.html]
      Un único HTML autocontenido (estilos e imágenes incrustados), para
      publicarlo como artifact.

Si está Pillow (pip install pillow), las imágenes se convierten a WebP
(calidad WEBP_CALIDAD, por defecto 75): ocupan ~50 % menos que el JPEG
original. Sin Pillow se usan los JPEG tal cual.
"""
import base64, glob, io, json, os, shutil, sys
try:
    from PIL import Image
except ImportError:
    Image = None
CALIDAD = int(os.environ.get("WEBP_CALIDAD", "75"))
WEBP = Image is not None and CALIDAD > 0

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AQUI, "..", "..", "..", ".."))
MARCAS = ("/*APPCSS*/", "/*DEMOS*/", "/*IMAGENES*/")


def leer_css():
    css = os.path.join(REPO, "public", "shared", "app.css")
    if not os.path.exists(css):  # fuera del repositorio: copia de respaldo
        css = os.path.join(AQUI, "app.css")
    return open(css, encoding="utf-8").read()


def bytes_imagen(ruta):
    """Devuelve (bytes, extensión, tipo MIME) de la imagen, en WebP si se puede."""
    if WEBP:
        b = io.BytesIO()
        Image.open(ruta).save(b, "WEBP", quality=CALIDAD, method=6)
        return b.getvalue(), ".webp", "image/webp"
    ext = os.path.splitext(ruta)[1]
    return open(ruta, "rb").read(), ext, ("image/png" if ext == ".png" else "image/jpeg")


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
    formato = ("WebP calidad %d" % CALIDAD) if WEBP else "JPEG original"

    if modo_app:
        destino = os.path.join(REPO, "public", "manual")
        os.makedirs(destino, exist_ok=True)
        imagenes, nuevos, total = {}, set(), 0
        for a in archivos:
            datos, ext, _ = bytes_imagen(os.path.join(capturas, a))
            nombre = os.path.splitext(a)[0] + ext
            open(os.path.join(destino, nombre), "wb").write(datos)
            imagenes[a] = "manual/" + nombre
            nuevos.add(nombre)
            total += len(datos)
        for viejo in glob.glob(os.path.join(destino, "*")):
            if os.path.basename(viejo) not in nuevos:
                os.remove(viejo)
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
        print("Escrito %s y %d imágenes en %s (%.1f MB, %d demos, %s)"
              % (salida, len(archivos), destino, total / 1e6, len(demos), formato))
        return

    salida = sys.argv[2] if len(sys.argv) > 2 else os.path.join(capturas, "manual-interactivo.html")
    imagenes = {}
    for a in archivos:
        datos, _, tipo = bytes_imagen(os.path.join(capturas, a))
        imagenes[a] = "data:%s;base64,%s" % (tipo, base64.b64encode(datos).decode())
    html = (plantilla.replace("/*APPCSS*/", leer_css())
                     .replace("/*DEMOS*/", json.dumps(demos, ensure_ascii=False))
                     .replace("/*IMAGENES*/", json.dumps(imagenes)))
    open(salida, "w", encoding="utf-8").write(html)
    mb = os.path.getsize(salida) / 1e6
    print("Escrito %s (%.1f MB, %d demos, %d imágenes, %s)" % (salida, mb, len(demos), len(imagenes), formato))
    if mb > 15:
        print("AVISO: supera ~15 MB; un artifact admite 16 MB como máximo. Baja WEBP_CALIDAD o divide el manual.")


if __name__ == "__main__":
    main()
