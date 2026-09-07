/* Barra servidor en seccion3.html */
(function (){
  var pagina = (location.pathname || "").toLowerCase();
  if (pagina.indexOf("seccion3") === -1) return;
  var b = "display:inline-block;color:#fff;text-decoration:none;border:0;padding:8px 12px;" +
    "border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 6px 16px rgba(0,0,0,.18);cursor:pointer;";

  function pintarBarra(esCapitan){
    if (document.getElementById("cefot-extras-bar")) return;
    var bar = document.createElement("div");
    bar.id = "cefot-extras-bar";
    bar.setAttribute("style",
      "position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;gap:8px;flex-wrap:wrap;font-family:inherit;");
    var html = "";
    if (esCapitan){
      html += '<a href="/capitan.html" style="' + b + 'background:#2f6690;">Volver a compañía</a>';
    } else {
      html += '<a href="/usuarios.html" style="' + b + 'background:#2f6690;">Jefes de pelotón</a>';
    }
    html +=
      '<a href="/login.html" style="' + b + 'background:#1f7a3d;">Modo servidor</a>' +
      '<button type="button" id="cefotSyncPull" style="' + b + 'background:#345c34;">Traer del servidor</button>' +
      '<button type="button" id="cefotSyncPush" style="' + b + 'background:#8a5f1c;">Publicar en servidor</button>' +
      '<button type="button" id="cefotLogout" style="' + b + 'background:#b23b30;">Cerrar sesión</button>';
    bar.innerHTML = html;
    document.body.appendChild(bar);
    document.getElementById("cefotLogout").onclick = function (){
      fetch("/api/auth/logout", { method: "POST" }).finally(function (){
        location.href = "/login.html";
      });
    };
    var s = document.createElement("script");
    s.src = "/shared/sync-bidireccional.js";
    s.onload = function (){
      var pull = document.getElementById("cefotSyncPull");
      var push = document.getElementById("cefotSyncPush");
      if (pull) pull.onclick = function (){ window.cefotSync && window.cefotSync.traer(); };
      if (push) push.onclick = function (){ window.cefotSync && window.cefotSync.publicar(); };
    };
    document.body.appendChild(s);
    var t = document.createElement("script");
    t.src = "/shared/instructor-trabajo.js";
    document.body.appendChild(t);
    var a = document.createElement("script");
    a.src = "/shared/seccion-avisos.js";
    document.body.appendChild(a);
  }

  fetch("/api/auth/me").then(function (r){ return r.ok ? r.json() : null; }).then(function (me){
    pintarBarra(!!(me && me.capitanCompania));
  }).catch(function (){ pintarBarra(false); });
})();
