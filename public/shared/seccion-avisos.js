/* Partes del pelotón pendientes de revisar la medida */
(function (){
  var MEDIDAS = ["Amonestación verbal", "Trabajo no superior a 5 horas", "Refuerzo", "Arresto", "Sin medida"];

  function escapeHtml(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c){
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  fetch("/api/admin/avisos").then(function (r){ return r.ok ? r.json() : null; }).then(function (d){
    if (!d || !d.total) return;
    var avisos = d.avisos || [];
    var box = document.createElement("div");
    box.id = "cefot-avisos";
    box.setAttribute("style",
      "position:sticky;top:0;z-index:70;background:#fcf1d6;border-bottom:1px solid #9c6a12;" +
      "padding:12px 16px;font-size:13.5px;");

    var rows = avisos.map(function (a, i){
      var quien = (a.createdBy && (a.createdBy.nombre || a.createdBy.dni)) || "pelotón";
      var alum = (a.alumnos || []).map(function (x){
        return (x.ape1 || "") + " " + (x.nombre || "") + " (№ " + x.numero + ")";
      }).join(", ") || "Alumno";
      var opts = MEDIDAS.map(function (m){
        return "<option" + (m === a.medida ? " selected" : "") + ">" + m + "</option>";
      }).join("");
      var arrestoConocido = !!(a.arrestoFechaIni && a.arrestoFechaFin);
      var trabajoConocido = !!a.trabajoFechaFin;

      return "<div class='cefot-aviso-row' data-idx='" + i + "' style='margin:8px 0;padding:8px 0;border-top:1px solid #e2d3a8;'>" +
        "<div style='display:flex;flex-wrap:wrap;gap:8px;align-items:center;'>" +
        "<div style='flex:1;min-width:220px;'><strong>Exp. " + (a.expediente || "—") + "</strong> · " +
        alum + "<br><span style='color:#5c6752'>Medida propuesta: " + (a.medida || "—") +
        " · por " + escapeHtml(quien) + "</span></div>" +
        "<select data-idx='" + i + "' class='cefot-medida'>" + opts + "</select>" +
        "<button type='button' class='btn small primary cefot-guardar-medida' data-idx='" + i + "'>Guardar medida</button>" +
        "<button type='button' class='btn small cefot-generar-refuerzo' data-idx='" + i + "' style='display:none;background:#2f6690;color:#fff;'>Generar refuerzo &rarr;</button>" +
        "</div>" +
        "<div class='cefot-extra cefot-extra-arresto' data-idx='" + i + "' style='display:none;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px;padding-left:4px;'>" +
        "<label style='display:flex;flex-direction:column;font-size:12px;color:#5c6752;'>Inicio arresto" +
        "<input type='date' class='cefot-arresto-ini' value='" + escapeHtml(a.arrestoFechaIni || "") + "'></label>" +
        "<label style='display:flex;flex-direction:column;font-size:12px;color:#5c6752;'>Fin arresto" +
        "<input type='date' class='cefot-arresto-fin' value='" + escapeHtml(a.arrestoFechaFin || "") + "'></label>" +
        "<label style='display:flex;align-items:center;gap:4px;font-size:12px;color:#5c6752;'>" +
        "<input type='checkbox' class='cefot-arresto-pendiente'" + (arrestoConocido ? "" : " checked") + "> Fecha pendiente de fijar</label>" +
        "</div>" +
        "<div class='cefot-extra cefot-extra-trabajo' data-idx='" + i + "' style='display:none;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px;padding-left:4px;'>" +
        "<label style='display:flex;flex-direction:column;font-size:12px;color:#5c6752;'>Fecha límite del trabajo" +
        "<input type='date' class='cefot-trabajo-fecha' value='" + escapeHtml(a.trabajoFechaFin || "") + "'></label>" +
        "<label style='display:flex;align-items:center;gap:4px;font-size:12px;color:#5c6752;'>" +
        "<input type='checkbox' class='cefot-trabajo-pendiente'" + (trabajoConocido ? "" : " checked") + "> Se fijará cuando se haga</label>" +
        "</div>" +
        "</div>";
    }).join("");

    box.innerHTML =
      "<strong>Partes de pelotón para revisar la medida</strong> " +
      "<span style='color:#5c6752'>(puedes dejarla o cambiarla)</span>" +
      rows +
      "<div style='margin-top:8px;'><button type='button' class='btn small' id='cefotAvisosOk'>Marcar todos como vistos</button></div>";
    document.body.insertBefore(box, document.body.firstChild);

    function extraFor(idx, tipo){ return box.querySelector(".cefot-extra-" + tipo + "[data-idx='" + idx + "']"); }
    function medidaSelect(idx){ return box.querySelector("select.cefot-medida[data-idx='" + idx + "']"); }

    function actualizarVisibilidad(idx){
      var medida = medidaSelect(idx).value;
      var arrestoBox = extraFor(idx, "arresto");
      var trabajoBox = extraFor(idx, "trabajo");
      var refuerzoBtn = box.querySelector(".cefot-generar-refuerzo[data-idx='" + idx + "']");
      arrestoBox.style.display = medida === "Arresto" ? "flex" : "none";
      trabajoBox.style.display = medida === "Trabajo no superior a 5 horas" ? "flex" : "none";
      refuerzoBtn.style.display = medida === "Refuerzo" ? "" : "none";
    }

    avisos.forEach(function (a, i){ actualizarVisibilidad(i); });
    box.querySelectorAll("select.cefot-medida").forEach(function (sel){
      sel.onchange = function (){ actualizarVisibilidad(sel.getAttribute("data-idx")); };
    });

    // La fecha se deshabilita mientras la casilla "pendiente" está marcada,
    // para que no quede una fecha a medio escribir que luego no se use.
    box.querySelectorAll(".cefot-arresto-pendiente").forEach(function (chk){
      var idx = chk.closest(".cefot-extra").getAttribute("data-idx");
      var box2 = extraFor(idx, "arresto");
      function sync(){
        box2.querySelector(".cefot-arresto-ini").disabled = chk.checked;
        box2.querySelector(".cefot-arresto-fin").disabled = chk.checked;
      }
      chk.onchange = sync;
      sync();
    });
    box.querySelectorAll(".cefot-trabajo-pendiente").forEach(function (chk){
      var idx = chk.closest(".cefot-extra").getAttribute("data-idx");
      var box2 = extraFor(idx, "trabajo");
      function sync(){ box2.querySelector(".cefot-trabajo-fecha").disabled = chk.checked; }
      chk.onchange = sync;
      sync();
    });

    function guardarMedida(idx){
      var a = avisos[idx];
      var medida = medidaSelect(idx).value;
      var payload = { medidaCorrectora: medida };
      if (medida === "Arresto"){
        var pendiente = extraFor(idx, "arresto").querySelector(".cefot-arresto-pendiente");
        if (!pendiente.checked){
          payload.arrestoFechaIni = extraFor(idx, "arresto").querySelector(".cefot-arresto-ini").value;
          payload.arrestoFechaFin = extraFor(idx, "arresto").querySelector(".cefot-arresto-fin").value;
        }
      }
      if (medida === "Trabajo no superior a 5 horas"){
        var pendienteT = extraFor(idx, "trabajo").querySelector(".cefot-trabajo-pendiente");
        if (!pendienteT.checked){
          payload.trabajoFechaFin = extraFor(idx, "trabajo").querySelector(".cefot-trabajo-fecha").value;
        }
      }
      return fetch("/api/sanciones/" + encodeURIComponent(a.sancionId) + "/medida", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r){ return r.json().then(function (d2){ return { ok: r.ok, d: d2 }; }); });
    }

    box.querySelectorAll(".cefot-guardar-medida").forEach(function (btn){
      btn.onclick = function (){
        var idx = btn.getAttribute("data-idx");
        guardarMedida(idx).then(function (res){
          btn.textContent = res.ok ? "Guardada" : (res.d.error || "Error");
        });
      };
    });

    box.querySelectorAll(".cefot-generar-refuerzo").forEach(function (btn){
      btn.onclick = function (){
        var idx = btn.getAttribute("data-idx");
        var a = avisos[idx];
        btn.disabled = true;
        guardarMedida(idx).then(function (res){
          btn.disabled = false;
          if (!res.ok){
            btn.textContent = res.d.error || "Error";
            return;
          }
          var guardarBtn = box.querySelector(".cefot-guardar-medida[data-idx='" + idx + "']");
          if (guardarBtn) guardarBtn.textContent = "Guardada";
          if (typeof window.cefotGenerarRefuerzoDesdeSancion === "function"){
            window.cefotGenerarRefuerzoDesdeSancion(a);
          }
        });
      };
    });

    document.getElementById("cefotAvisosOk").onclick = function (){
      fetch("/api/admin/avisos/leer", { method: "POST" }).then(function (){ box.remove(); });
    };
  }).catch(function (){});
})();
