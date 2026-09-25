/* Sincroniza el HTML local (localStorage) con el servidor de ESTA sección. */
(function (){
  var BASE = {
    roster: "seccion3_roster_v1",
    rebajes: "seccion3_rebajes_v1",
    sanciones: "seccion3_sanciones_v1",
    refuerzos: "seccion3_refuerzos_v1",
    actividades: "seccion3_actividades_v1",
    expediente: "seccion3_expediente_counter_v1",
    lastBackup: "seccion3_last_backup_v1"
  };
  var ACTIVE = "cefot_tenant_activo";

  function parseJson(raw, fallback){
    try { return raw ? JSON.parse(raw) : fallback; }
    catch (e){ return fallback; }
  }
  function leerLocal(){
    var roster = parseJson(localStorage.getItem(BASE.roster), { headers: [], rows: [], meta: null });
    return {
      tipo: "seccion3_backup",
      version: 2,
      origen: "html-local",
      exportadoEl: new Date().toISOString(),
      roster: roster,
      rebajes: parseJson(localStorage.getItem(BASE.rebajes), []),
      sanciones: parseJson(localStorage.getItem(BASE.sanciones), []),
      refuerzos: parseJson(localStorage.getItem(BASE.refuerzos), []),
      actividades: parseJson(localStorage.getItem(BASE.actividades), []),
      expedienteCounter: parseInt(localStorage.getItem(BASE.expediente) || "0", 10) || 0
    };
  }
  function resumen(data){
    var nRoster = (data.roster && data.roster.rows && data.roster.rows.length) ||
      (Array.isArray(data.roster) ? data.roster.length : 0) || 0;
    return "Alumnos: " + nRoster +
      " · Rebajes: " + ((data.rebajes || []).length) +
      " · Sanciones: " + ((data.sanciones || []).length) +
      " · Refuerzos: " + ((data.refuerzos || []).length);
  }
  function escribirLocal(data){
    var roster = data.roster;
    if (Array.isArray(roster)){
      // El servidor guarda cada alumno con claves en minúscula (numero,
      // ape1...), pero seccion3.html lee cada fila por el nombre de su
      // cabecera (NUMERO, APE1...). Se copian los campos con la clave en
      // mayúscula, conservando el resto (foto, adjuntos...) tal cual.
      var CAMPOS = ["NUMERO", "APE1", "APE2", "NOMBRE", "PELOTON", "SEXO", "UNIDAD", "DNI", "TELEFONO"];
      var filas = roster.map(function (al){
        var fila = {};
        Object.keys(al || {}).forEach(function (k){ fila[k] = al[k]; });
        CAMPOS.forEach(function (h){
          var v = al ? al[h.toLowerCase()] : undefined;
          if (v != null) fila[h] = v;
        });
        return fila;
      });
      roster = {
        headers: CAMPOS,
        rows: filas,
        meta: { origen: "servidor", fileName: "servidor", sheetName: "roster", loadedAt: new Date().toISOString(), count: filas.length }
      };
    }
    localStorage.setItem(BASE.roster, JSON.stringify(roster || { headers: [], rows: [] }));
    localStorage.setItem(BASE.rebajes, JSON.stringify(data.rebajes || []));
    localStorage.setItem(BASE.sanciones, JSON.stringify(data.sanciones || []));
    localStorage.setItem(BASE.refuerzos, JSON.stringify(data.refuerzos || []));
    localStorage.setItem(BASE.actividades, JSON.stringify(data.actividades || []));
    if (data.expedienteCounter != null){
      localStorage.setItem(BASE.expediente, String(data.expedienteCounter));
    }
    localStorage.setItem(BASE.lastBackup, new Date().toISOString());
  }
  function vaciarLocal(){
    escribirLocal({
      roster: { headers: [], rows: [], meta: { origen: "vacio" } },
      rebajes: [], sanciones: [], refuerzos: [], actividades: [], expedienteCounter: 0
    });
  }
  function guardarCopiaTenant(tid){
    if (!tid) return;
    localStorage.setItem("cefot_ns_" + tid, JSON.stringify(leerLocal()));
  }
  function restaurarCopiaTenant(tid){
    var raw = localStorage.getItem("cefot_ns_" + tid);
    if (!raw) return false;
    escribirLocal(parseJson(raw, null) || { roster: { rows: [] } });
    return true;
  }

  function sesionTenant(){
    return fetch("/api/auth/me").then(function (r){ return r.ok ? r.json() : null; })
      .then(function (me){
        if (me && me.tenant) return me;
        return null;
      }).catch(function (){ return null; });
  }

  function aplicarCabecera(me){
    if (!me || !me.tenant) return;
    var cia = me.tenant.compania;
    var sec = me.tenant.seccion;
    var titulos = document.querySelectorAll("h1, .brand h1, #brandTitle");
    titulos.forEach(function (el){
      if (el && /SEC/i.test(el.textContent || "")){
        el.textContent = "CEFOT-2 · BAL/" + cia + "ª CÍA · SECCIÓN " + sec;
      }
    });
    var marks = document.querySelectorAll(".mark, #brandMark");
    marks.forEach(function (el){
      if (el && String(el.textContent).indexOf("S") === 0) el.textContent = "S·" + sec;
    });
    document.title = cia + "ª CÍA · SECCIÓN " + sec + " · Gestión";
  }

  function activarSeccion(me, recargar){
    if (!me || !me.tenant) return Promise.resolve();
    var tid = String(me.tenant.id || (me.tenant.compania + "-" + me.tenant.seccion));
    var previo = sessionStorage.getItem(ACTIVE);
    aplicarCabecera(me);
    if (previo === tid) return Promise.resolve();
    if (previo) guardarCopiaTenant(previo);
    sessionStorage.setItem(ACTIVE, tid);
    return fetch("/api/admin/backup").then(function (r){
      if (!r.ok) throw new Error("backup");
      return r.json();
    }).then(function (remoto){
      escribirLocal(remoto);
      guardarCopiaTenant(tid);
      if (recargar !== false) location.reload();
    }).catch(function (){
      if (!restaurarCopiaTenant(tid)) vaciarLocal();
      if (recargar !== false) location.reload();
    });
  }

  // Desactivada: publicar() sustituía TODOS los datos del servidor por los
  // del navegador (el endpoint POST /api/admin/backup además ni siquiera
  // existe en el servidor actual). Sustituir es justo lo contrario de lo
  // que se pidió para el flujo de copias por email, que añade sin borrar.
  // Se deja la función para no romper quien la llame, pero avisa y no hace
  // ninguna petición.
  function publicar(){
    alert(
      "Esta función está desactivada para evitar sustituir por error todos los datos del servidor.\n\n" +
      "Para llevar datos de este navegador al servidor (o al revés) sin perder nada de lo que ya hay " +
      "en el destino, usa el envío por correo con fusión aditiva desde el panel del jefe de sección."
    );
  }

  function traer(){
    sesionTenant().then(function (me){
      if (!me){ alert("No hay sesión de sección."); return; }
      return fetch("/api/admin/backup").then(function (r){ return r.json(); }).then(function (remoto){
        if (!confirm("TRAER de «" + (me.tenant.nombre || me.tenant.id) + "».\n\n" + resumen(remoto) + "\n\n¿Continuar?")) return;
        escribirLocal(remoto);
        guardarCopiaTenant(me.tenant.id);
        sessionStorage.setItem(ACTIVE, String(me.tenant.id));
        location.reload();
      });
    });
  }

  window.cefotSync = {
    publicar: publicar,
    traer: traer,
    leerLocal: leerLocal,
    activarSeccion: activarSeccion,
    aplicarCabecera: aplicarCabecera
  };
})();
