/* Barra servidor en seccion3.html */
(function (){
  if (document.getElementById("cefot-extras-bar")) return;
  var bar = document.createElement("div");
  bar.id = "cefot-extras-bar";
  bar.setAttribute("style",
    "position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;gap:8px;flex-wrap:wrap;font-family:inherit;");
  var b = "display:inline-block;color:#fff;text-decoration:none;border:0;padding:8px 12px;" +
    "border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 6px 16px rgba(0,0,0,.18);cursor:pointer;";
  var pagina = (location.pathname || "").toLowerCase();
  if (pagina.indexOf("seccion3") === -1) return;
  bar.innerHTML =
    '<a href="/usuarios.html" style="' + b + 'background:#2f6690;">Jefes de pelotón</a>' +
    '<a href="/login.html" style="' + b + 'background:#1f7a3d;">Modo servidor</a>' +
    '<button type="button" id="cefotSyncPull" style="' + b + 'background:#345c34;">Traer del servidor</button>' +
    '<button type="button" id="cefotSyncPush" style="' + b + 'background:#8a5f1c;">Publicar en servidor</button>' +
    '<button type="button" id="cefotLogout" style="' + b + 'background:#b23b30;">Cerrar sesión</button>';
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
})();
