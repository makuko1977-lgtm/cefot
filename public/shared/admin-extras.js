/* Barra de copia y sync en admin.html y seccion3.html */
(function (){
  if (document.getElementById("cefot-extras-bar")) return;
  var bar = document.createElement("div");
  bar.id = "cefot-extras-bar";
  bar.setAttribute("style",
    "position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;gap:8px;flex-wrap:wrap;font-family:inherit;");
  var b = "display:inline-block;color:#fff;text-decoration:none;border:0;padding:8px 12px;" +
    "border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 6px 16px rgba(0,0,0,.18);cursor:pointer;";
  var pagina = (location.pathname || "").toLowerCase();
  if (pagina.indexOf("seccion3") !== -1){
    bar.innerHTML =
      '<a href="/login.html" style="' + b + 'background:#1f7a3d;">Modo servidor</a>' +
      '<button type="button" id="cefotSyncPull" style="' + b + 'background:#345c34;">Traer del servidor</button>' +
      '<button type="button" id="cefotSyncPush" style="' + b + 'background:#8a5f1c;">Publicar en servidor</button>';
    document.body.appendChild(bar);
    var s = document.createElement("script");
    s.src = "/shared/sync-bidireccional.js";
    s.onload = function (){
      var pull = document.getElementById("cefotSyncPull");
      var push = document.getElementById("cefotSyncPush");
      if (pull) pull.onclick = function (){ window.cefotSync && window.cefotSync.traer(); };
      if (push) push.onclick = function (){ window.cefotSync && window.cefotSync.publicar(); };
    };
    document.body.appendChild(s);
  } else {
    bar.innerHTML =
      '<a href="/copia.html" style="' + b + 'background:#1f7a3d;">Copia / sync</a>';
    document.body.appendChild(bar);
  }
})();
