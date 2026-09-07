/* Fecha límite cuando la medida es trabajo ≤ 5 horas (instructor). */
(function (){
  var medida = document.getElementById("sanMedidaInput");
  if (!medida || document.getElementById("sanTrabajoFechaFin")) return;

  var wrap = document.createElement("div");
  wrap.className = "field hidden";
  wrap.id = "sanTrabajoWrap";
  wrap.style.gridColumn = "1/-1";
  wrap.innerHTML =
    '<label for="sanTrabajoFechaFin">Fecha límite del trabajo</label>' +
    '<input type="date" id="sanTrabajoFechaFin">' +
    '<div class="hint">Obligatoria si la medida es «Trabajo no superior a 5 horas».</div>';
  medida.closest(".field").insertAdjacentElement("afterend", wrap);

  function sync(){
    var on = medida.value === "Trabajo no superior a 5 horas";
    wrap.classList.toggle("hidden", !on);
  }
  medida.addEventListener("change", sync);
  sync();

  var origFetch = window.fetch;
  window.fetch = function (url, opts){
    try {
      var u = String(url || "");
      if (u.indexOf("/api/sanciones") !== -1 && opts && opts.method && String(opts.method).toUpperCase() === "POST" && opts.body){
        var data = typeof opts.body === "string" ? JSON.parse(opts.body) : opts.body;
        if (data && data.medidaCorrectora === "Trabajo no superior a 5 horas"){
          var fecha = document.getElementById("sanTrabajoFechaFin");
          data.trabajoFechaFin = fecha ? fecha.value : data.trabajoFechaFin;
          opts = Object.assign({}, opts, { body: JSON.stringify(data) });
        }
      }
    } catch (err) {}
    return origFetch.call(this, url, opts);
  };
})();
