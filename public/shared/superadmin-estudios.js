(function(){
  if (!document.querySelector(".app")) return;
  var wrap = document.createElement("div");
  wrap.className = "panel corner-accent";
  wrap.style.marginBottom = "22px";
  wrap.innerHTML =
    "<h3>Jefe de estudios</h3>" +
    "<div class=\"panel-sub\">Cuenta solo de servidor. Ve estadísticas de refuerzos, rebajes, arrestos y sanciones (tipo, fundamento legal y motivos agrupados). No ve fichas ni listados de alumnos. <a href=\"/estudios.html\">Abrir panel de estadísticas</a>.</div>" +
    "<div id=\"jeLista\" class=\"hint\">Cargando…</div>" +
    "<div class=\"field-grid\" style=\"margin-top:12px;\">" +
      "<div class=\"field\"><label>Usuario</label><input id=\"jeDni\" type=\"text\" autocapitalize=\"characters\"></div>" +
      "<div class=\"field\"><label>Nombre</label><input id=\"jeNombre\" type=\"text\"></div>" +
      "<div class=\"field\"><label>Contraseña</label><input id=\"jePass\" type=\"text\" placeholder=\"Mínimo 6 caracteres\"></div>" +
    "</div>" +
    "<div class=\"form-actions\"><button class=\"btn primary\" type=\"button\" id=\"jeSave\">Dar de alta / actualizar</button> <span class=\"form-msg\" id=\"jeMsg\"></span></div>";
  var app = document.querySelector(".app");
  var after = app.querySelector(".panel");
  if (after && after.nextSibling) app.insertBefore(wrap, after.nextSibling);
  else app.appendChild(wrap);

  function cargar(){
    fetch("/api/estudios/jefes").then(function(r){ return r.ok ? r.json() : { jefes: [] }; }).then(function(d){
      var list = d.jefes || [];
      if (!list.length){
        document.getElementById("jeLista").textContent = "Todavía no hay jefe de estudios.";
        return;
      }
      document.getElementById("jeLista").innerHTML = list.map(function(j){
        return "<div>" + j.nombre + " (· " + j.dni + ") <button type='button' class='btn small ghost je-del' data-dni='" + j.dni + "'>Quitar</button></div>";
      }).join("");
      document.querySelectorAll(".je-del").forEach(function(btn){
        btn.onclick = function(){
          if (!confirm("¿Quitar a este jefe de estudios?")) return;
          fetch("/api/estudios/jefes/" + encodeURIComponent(btn.getAttribute("data-dni")), { method: "DELETE" })
            .then(function(){ cargar(); });
        };
      });
    });
  }
  document.getElementById("jeSave").onclick = function(){
    var msg = document.getElementById("jeMsg");
    fetch("/api/estudios/jefes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dni: document.getElementById("jeDni").value,
        nombre: document.getElementById("jeNombre").value,
        password: document.getElementById("jePass").value
      })
    }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
      .then(function(res){
        msg.textContent = res.ok ? "Guardado." : (res.d.error || "No se pudo guardar.");
        msg.className = "form-msg " + (res.ok ? "ok" : "error");
        if (res.ok) cargar();
      });
  };
  cargar();
})();
