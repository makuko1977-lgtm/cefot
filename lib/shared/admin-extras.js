/* Barra servidor + aislamiento por sección */
(function (){
  var pagina = (location.pathname || "").toLowerCase();
  if (pagina.indexOf("seccion3") === -1) return;
  var b = "display:inline-block;color:#fff;text-decoration:none;border:0;padding:8px 12px;" +
    "border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 6px 16px rgba(0,0,0,.18);cursor:pointer;";

  function pintarBarra(me){
    var esCapitan = !!(me && me.capitanCompania);
    if (esCapitan && !document.getElementById("cefot-capitan-top")){
      var top = document.createElement("div");
      top.id = "cefot-capitan-top";
      top.setAttribute("style",
        "position:sticky;top:0;z-index:99997;background:#2f6690;color:#fff;" +
        "padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;");
      top.innerHTML =
        "<span>Estás en una sección como capitán de compañía.</span>" +
        "<a href=\"/capitan.html\" style=\"color:#fff;font-weight:700;background:#1d4e72;padding:8px 14px;border-radius:8px;text-decoration:none;\">Volver a compañía</a>";
      document.body.insertBefore(top, document.body.firstChild);
    }
    if (!document.getElementById("cefot-extras-bar")){
      var bar = document.createElement("div");
      bar.id = "cefot-extras-bar";
      bar.setAttribute("style",
        "position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;gap:8px;flex-wrap:wrap;font-family:inherit;");
      var html = "";
      if (esCapitan) html += '<a href="/capitan.html" style="' + b + 'background:#2f6690;">Volver a compañía</a>';
      else html += '<a href="/usuarios.html" style="' + b + 'background:#2f6690;">Jefes de pelotón</a>';
      html +=
        '<button type="button" id="cefotSyncPull" style="' + b + 'background:#345c34;">Traer del servidor</button>' +
        '<button type="button" id="cefotLogout" style="' + b + 'background:#b23b30;">Cerrar sesión</button>';
      bar.innerHTML = html;
      document.body.appendChild(bar);
      document.getElementById("cefotLogout").onclick = function (){
        fetch("/api/auth/logout", { method: "POST" }).finally(function (){ location.href = "/login.html"; });
      };
    }
    var s = document.createElement("script");
    s.src = "/shared/sync-bidireccional.js";
    s.onload = function (){
      var pull = document.getElementById("cefotSyncPull");
      if (pull) pull.onclick = function (){ window.cefotSync && window.cefotSync.traer(); };
      if (window.cefotSync && me) window.cefotSync.activarSeccion(me, true);
    };
    document.body.appendChild(s);
    var t = document.createElement("script");
    t.src = "/shared/instructor-trabajo.js";
    document.body.appendChild(t);
    if (!esCapitan){
      var a = document.createElement("script");
      a.src = "/shared/seccion-avisos.js";
      document.body.appendChild(a);
    }
  }

  fetch("/api/auth/me").then(function (r){ return r.ok ? r.json() : null; }).then(function (me){
    pintarBarra(me);
  }).catch(function (){ pintarBarra(null); });
})();
