/* Aviso de partes nuevos para el jefe de sección */
(function (){
  fetch("/api/admin/avisos").then(function (r){ return r.ok ? r.json() : null; }).then(function (d){
    if (!d || !d.total) return;
    var box = document.createElement("div");
    box.id = "cefot-avisos";
    box.setAttribute("style",
      "position:sticky;top:0;z-index:99998;background:#fcf1d6;border-bottom:1px solid #9c6a12;" +
      "padding:10px 16px;font-size:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;");
    var n = d.total;
    box.innerHTML =
      "<strong>" + n + " parte" + (n === 1 ? "" : "s") + " nuevo" + (n === 1 ? "" : "s") +
      " de pelotón</strong> (cualquier medida). Revísalos en Sanciones." +
      " <button type='button' class='btn small' id='cefotAvisosOk'>Marcar como vistos</button>";
    document.body.insertBefore(box, document.body.firstChild);
    document.getElementById("cefotAvisosOk").onclick = function (){
      fetch("/api/admin/avisos/leer", { method: "POST" }).then(function (){ box.remove(); });
    };
  }).catch(function (){});
})();
