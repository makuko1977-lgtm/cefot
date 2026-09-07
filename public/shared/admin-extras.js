/* Botones de copia / modo servidor en admin.html y seccion3.html */
(function (){
  if (document.getElementById("cefot-extras-bar")) return;
  var bar = document.createElement("div");
  bar.id = "cefot-extras-bar";
  bar.setAttribute("style",
    "position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;gap:8px;flex-wrap:wrap;font-family:inherit;");
  var estilo = "display:inline-block;background:#1f7a3d;color:#fff;text-decoration:none;padding:8px 12px;" +
    "border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 6px 16px rgba(0,0,0,.18);";
  var estilo2 = estilo.replace("#1f7a3d", "#345c34");
  var pagina = (location.pathname || "").toLowerCase();
  if (pagina.indexOf("seccion3") !== -1){
    bar.innerHTML =
      '<a href="/login.html" style="' + estilo + '">Modo servidor</a>' +
      '<a href="/copia.html" style="' + estilo2 + '">Copia en servidor</a>';
  } else {
    bar.innerHTML =
      '<a href="/copia.html" style="' + estilo + '">Copia de seguridad</a>';
  }
  document.body.appendChild(bar);
})();
