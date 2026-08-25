// Firma táctil (ratón, lápiz o dedo) y generación del documento
// "Amonestaciones Verbales" en PDF. Se usa tanto desde admin.html como
// desde instructor.html. Requiere que pdf-lib (variable global PDFLib)
// esté cargado antes que este script.
(function (global){
  "use strict";

  // ---------------- pizarra de firma táctil ----------------
  // Pointer Events unifica ratón, lápiz óptico y dedo, así que funciona
  // igual en un PC que en el móvil/tablet del alumno.
  function attachFirmaPad(canvas){
    var ctx = canvas.getContext("2d");
    var drawing = false;
    var hasStroke = false;
    var last = null;

    function resize(){
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return; // el modal aún no es visible
      var ratio = window.devicePixelRatio || 1;
      var prevData = hasStroke ? canvas.toDataURL("image/png") : null;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#12201a";
      if (prevData){
        var img = new Image();
        img.onload = function(){ ctx.drawImage(img, 0, 0, rect.width, rect.height); };
        img.src = prevData;
      }
    }

    function posFromEvent(e){
      var rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function start(e){
      drawing = true;
      hasStroke = true;
      last = posFromEvent(e);
      if (canvas.setPointerCapture){ try { canvas.setPointerCapture(e.pointerId); } catch (err){} }
      e.preventDefault();
    }
    function move(e){
      if (!drawing) return;
      var p = posFromEvent(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      e.preventDefault();
    }
    function end(){
      drawing = false;
      last = null;
    }

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointerleave", end);
    canvas.addEventListener("pointercancel", end);
    // Evita que el navegador interprete el trazo como gesto de scroll/zoom.
    canvas.style.touchAction = "none";

    return {
      resize: resize,
      clear: function(){
        var rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width || canvas.width, rect.height || canvas.height);
        hasStroke = false;
      },
      isEmpty: function(){ return !hasStroke; },
      toPngDataUrl: function(){ return canvas.toDataURL("image/png"); }
    };
  }

  // ---------------- utilidades ----------------
  function formatDateEs(iso){
    if (!iso) return "";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function wrapText(font, text, size, maxWidth){
    var words = String(text || "").split(/\s+/).filter(Boolean);
    var lines = [];
    var current = "";
    words.forEach(function (w){
      var test = current ? current + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current){
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  // ---------------- fundamento legal (catálogo de faltas) ----------------
  // admin.html mantiene su propia copia local de FALTA_CATALOG/apartadoLetra
  // (variables globales sueltas), mientras que instructor.html usa el
  // módulo compartido window.CEFOT2_CATALOG; se prueban ambas rutas para
  // que este fichero funcione igual desde cualquiera de las dos páginas.
  function resolveFaltaCatalog(){
    if (global.CEFOT2_CATALOG && global.CEFOT2_CATALOG.FALTA_CATALOG) return global.CEFOT2_CATALOG.FALTA_CATALOG;
    if (global.FALTA_CATALOG) return global.FALTA_CATALOG;
    return null;
  }

  function resolveApartadoLetra(index){
    if (global.CEFOT2_CATALOG && typeof global.CEFOT2_CATALOG.apartadoLetra === "function"){
      return global.CEFOT2_CATALOG.apartadoLetra(index);
    }
    // Copia local de la misma fórmula de shared/catalog.js (0 -> a, 1 -> b, ... 25 -> z, 26 -> aa ...)
    var s = "", i = index + 1;
    while (i > 0){
      var rem = (i - 1) % 26;
      s = String.fromCharCode(97 + rem) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  // Texto del fundamento legal elegido, con su letra de apartado delante
  // ("a) El pequeño retraso..."), igual que aparece en el desplegable del
  // formulario de sanciones.
  function fundamentoConLetra(record){
    if (!record || !record.fundamento) return "";
    var catalogo = resolveFaltaCatalog();
    var lista = (catalogo && record.tipoFalta) ? (catalogo[record.tipoFalta] || []) : [];
    var idx = lista.indexOf(record.fundamento);
    var letra = idx >= 0 ? resolveApartadoLetra(idx) : null;
    return (letra ? (letra + ") ") : "") + record.fundamento;
  }

  // Construye las líneas del recuadro MOTIVO del documento: el fundamento
  // legal elegido en el parte (con su letra de apartado) y, debajo, la
  // descripción libre de los hechos — cada uno con su propia etiqueta.
  function buildMotivoLines(font, record, maxWidth, size){
    var lines = [];
    var fundamentoTexto = fundamentoConLetra(record);
    if (fundamentoTexto){
      lines = lines.concat(wrapText(font, "Fundamento legal: " + fundamentoTexto, size, maxWidth));
    }
    var descripcionTexto = record && record.motivo ? String(record.motivo) : "";
    if (descripcionTexto){
      if (lines.length) lines.push("");
      lines = lines.concat(wrapText(font, "Descripción de los hechos: " + descripcionTexto, size, maxWidth));
    }
    return lines.length ? lines : [""];
  }

  function dataUrlToBytes(dataUrl){
    var base64 = dataUrl.split(",")[1] || "";
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

    function slug(s){
    return String(s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function nombreArchivoAmonestacion(record, alumno){
    var fecha = record.fecha ? formatDateEs(record.fecha).split("/").join("-") : "SIN_FECHA";
    return "AMONESTACION_VERBAL_" + slug(alumno.numero) + "_" + fecha + ".pdf";
  }

  function descargarBytes(bytes, filename){
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }

  // ---------------- generación del PDF ----------------
  // record: la sanción (fecha, motivo, profEmpleo, profNombre, profApellidos...)
  // alumno: {numero, ape1, ape2, nombre}
  // firmaPngDataUrl: dataURL "data:image/png;base64,..." o null si aún no ha firmado
  async function generarAmonestacionPDF(record, alumno, firmaPngDataUrl){
    if (typeof PDFLib === "undefined"){
      throw new Error("No se pudo cargar la librería de PDF (pdf-lib).");
    }
    var pdfDoc = await PDFLib.PDFDocument.create();
    var pageW = 595.28, pageH = 841.89; // A4
    var page = pdfDoc.addPage([pageW, pageH]);
    var fontReg = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    var fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    var fontBoldItalic = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBoldOblique);
    var ink = PDFLib.rgb(0.08, 0.08, 0.08);
    var borderColor = PDFLib.rgb(0.15, 0.17, 0.16);
    var cellBg = PDFLib.rgb(0.953, 0.961, 0.957);
    var titleBg = PDFLib.rgb(0.996, 0.976, 0.769);

    var tableW = 460;
    var left = (pageW - tableW) / 2;
    var labelW = 175;
    var valueW = tableW - labelW;
    var y = pageH - 140;

    // ---- título ----
    var title = "Amonestaciones Verbales.";
    var titleSize = 17;
    var titleBoxH = titleSize + 18;
    var titleW = fontBoldItalic.widthOfTextAtSize(title, titleSize);
    page.drawRectangle({ x: left, y: y - titleBoxH, width: tableW, height: titleBoxH, color: titleBg });
    var titleX = left + (tableW - titleW) / 2;
    var titleBaseline = y - titleBoxH / 2 - titleSize / 2 + 3;
    page.drawText(title, { x: titleX, y: titleBaseline, size: titleSize, font: fontBoldItalic, color: ink });
    page.drawLine({ start: { x: titleX, y: titleBaseline - 3 }, end: { x: titleX + titleW, y: titleBaseline - 3 }, thickness: 1, color: ink });
    y -= titleBoxH + 28;

    // ---- filas de la tabla ----
    function drawRow(height, cells){
      page.drawRectangle({ x: left, y: y - height, width: tableW, height: height, color: cellBg, borderColor: borderColor, borderWidth: 1 });
      var runningX = left;
      cells.forEach(function (c, i){
        if (i > 0){
          page.drawLine({ start: { x: runningX, y: y }, end: { x: runningX, y: y - height }, thickness: 1, color: borderColor });
        }
        runningX += c.w;
      });
      var cx = left;
      cells.forEach(function (c){
        var size = c.size || 10.5;
        var font = c.bold ? fontBold : fontReg;
        var lines = c.lines || [c.text || ""];
        var lineH = size + 3.5;
        var totalH = lineH * lines.length;
        var ty = y - (height - totalH) / 2 - size + 2;
        lines.forEach(function (line, li){
          var tw = font.widthOfTextAtSize(line, size);
          var tx = c.align === "right" ? (cx + c.w - tw - 10) : (cx + 10);
          page.drawText(line, { x: tx, y: ty - li * lineH, size: size, font: font, color: ink });
        });
        cx += c.w;
      });
      y -= height;
    }

    drawRow(30, [
      { w: labelW, text: "CEFOT. 2", bold: true, size: 12 },
      { w: valueW, text: "BAL./3ª CÍA.", bold: true, size: 12, align: "right" }
    ]);

    function simpleRow(label, value){
      drawRow(30, [
        { w: labelW, text: label, bold: true },
        { w: valueW, text: value || "" }
      ]);
    }

    simpleRow("Nº PROTOCOLO", String((alumno && alumno.numero) || ""));
    simpleRow("APELLIDOS", [alumno && alumno.ape1, alumno && alumno.ape2].filter(Boolean).join(" "));
    simpleRow("NOMBRE", (alumno && alumno.nombre) || "");

    var motivoLines = buildMotivoLines(fontReg, record, valueW - 20, 10.5);
    var motivoHeight = Math.max(30, motivoLines.length * 13.5 + 14);
    drawRow(motivoHeight, [
      { w: labelW, text: "MOTIVO", bold: true },
      { w: valueW, lines: motivoLines }
    ]);

    var autoridadNombre = [record.profNombre, record.profApellidos].filter(Boolean).join(" ");
    var autoridad = [record.profEmpleo, autoridadNombre].filter(Boolean).join(" ");
    simpleRow("AUTORIDAD", autoridad);
    simpleRow("FECHA", formatDateEs(record.fecha));

    // ---- firma ----
    var firmaHeight = 110;
    page.drawRectangle({ x: left, y: y - firmaHeight, width: tableW, height: firmaHeight, color: PDFLib.rgb(1, 1, 1), borderColor: borderColor, borderWidth: 1 });
    if (firmaPngDataUrl){
      var pngBytes = dataUrlToBytes(firmaPngDataUrl);
      var img = await pdfDoc.embedPng(pngBytes);
      var maxW = tableW - 40, maxH = firmaHeight - 34;
      var scale = Math.min(maxW / img.width, maxH / img.height, 1);
      var iw = img.width * scale, ih = img.height * scale;
      page.drawImage(img, { x: left + (tableW - iw) / 2, y: y - firmaHeight + 26, width: iw, height: ih });
    }
    var firmaLabel = "(FIRMA DEL ALUMNO)";
    var flSize = 10;
    var flW = fontBold.widthOfTextAtSize(firmaLabel, flSize);
    page.drawText(firmaLabel, { x: left + (tableW - flW) / 2, y: y - firmaHeight + 10, size: flSize, font: fontBold, color: ink });
    y -= firmaHeight;

    return await pdfDoc.save();
  }

  global.CEFOT2_AMONESTACION = {
    attachFirmaPad: attachFirmaPad,
    generarAmonestacionPDF: generarAmonestacionPDF,
    nombreArchivoAmonestacion: nombreArchivoAmonestacion,
    descargarBytes: descargarBytes,
    formatDateEs: formatDateEs
  };
})(window);
