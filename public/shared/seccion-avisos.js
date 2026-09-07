/* Partes del pelotón pendientes de revisar la medida */
(function (){
  var MEDIDAS = ["Amonestación verbal", "Trabajo no superior a 5 horas", "Refuerzo", "Arresto", "Sin medida"];

  fetch("/api/admin/avisos").then(function (r){ return r.ok ? r.json() : null; }).then(function (d){
    if (!d || !d.total) return;
    var box = document.createElement("div");
    box.id = "cefot-avisos";
    box.setAttribute("style",
      "position:sticky;top:0;z-index:99998;background:#fcf1d6;border-bottom:1px solid #9c6a12;" +
      "padding:12px 16px;font-size:13.5px;");
    var rows = (d.avisos || []).map(function (a){
      var quien = (a.createdBy && (a.createdBy.nombre || a.createdBy.dni)) || "pelotón";
      var alum = (a.alumnos || []).map(function (x){
        return (x.ape1 || "") + " " + (x.nombre || "") + " (№ " + x.numero + ")";
      }).join(", ") || "Alumno";
      var opts = MEDIDAS.map(function (m){
        return "<option" + (m === a.medida ? " selected" : "") + ">" + m + "</option>";
      }).join("");
      return "<div style='display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;padding:8px 0;border-top:1px solid #e2d3a8;'>" +
        "<div style='flex:1;min-width:220px;'><strong>Exp. " + (a.expediente || "—") + "</strong> · " +
        alum + "<br><span style='color:#5c6752'>Medida propuesta: " + (a.medida || "—") +
        " · por " + quien + "</span></div>" +
        "<select data-id='" + (a.sancionId || "") + "' class='cefot-medida'>" + opts + "</select>" +
        "<button type='button' class='btn small primary cefot-guardar-medida' data-id='" + (a.sancionId || "") + "'>Guardar medida</button>" +
        "</div>";
    }).join("");
    box.innerHTML =
      "<strong>Partes de pelotón para revisar la medida</strong> " +
      "<span style='color:#5c6752'>(puedes dejarla o cambiarla)</span>" +
      rows +
      "<div style='margin-top:8px;'><button type='button' class='btn small' id='cefotAvisosOk'>Marcar todos como vistos</button></div>";
    document.body.insertBefore(box, document.body.firstChild);
    box.querySelectorAll(".cefot-guardar-medida").forEach(function (btn){
      btn.onclick = function (){
        var id = btn.getAttribute("data-id");
        if (!id) return;
        var sel = box.querySelector("select.cefot-medida[data-id='" + id + "']");
        fetch("/api/sanciones/" + encodeURIComponent(id) + "/medida", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ medidaCorrectora: sel.value })
        }).then(function (r){ return r.json().then(function (d2){ return { ok: r.ok, d: d2 }; }); })
          .then(function (res){
            btn.textContent = res.ok ? "Guardada" : (res.d.error || "Error");
          });
      };
    });
    document.getElementById("cefotAvisosOk").onclick = function (){
      fetch("/api/admin/avisos/leer", { method: "POST" }).then(function (){ box.remove(); });
    };
  }).catch(function (){});
})();
