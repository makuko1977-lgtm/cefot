/* Sincroniza el HTML local (localStorage) con el servidor de la sección.
   Solo funciona si esta página se abre en el mismo origen que el API
   (p. ej. https://cefot-vxs6.onrender.com/seccion3.html) y hay sesión
   de jefe de sección. */
(function (){
  var KEYS = {
    roster: "seccion3_roster_v1",
    rebajes: "seccion3_rebajes_v1",
    sanciones: "seccion3_sanciones_v1",
    refuerzos: "seccion3_refuerzos_v1",
    actividades: "seccion3_actividades_v1",
    expediente: "seccion3_expediente_counter_v1",
    lastBackup: "seccion3_last_backup_v1"
  };

  function parseJson(raw, fallback){
    try { return raw ? JSON.parse(raw) : fallback; }
    catch (e){ return fallback; }
  }
  function leerLocal(){
    var roster = parseJson(localStorage.getItem(KEYS.roster), { headers: [], rows: [], meta: null });
    return {
      tipo: "seccion3_backup",
      version: 2,
      origen: "html-local",
      exportadoEl: new Date().toISOString(),
      roster: roster,
      rebajes: parseJson(localStorage.getItem(KEYS.rebajes), []),
      sanciones: parseJson(localStorage.getItem(KEYS.sanciones), []),
      refuerzos: parseJson(localStorage.getItem(KEYS.refuerzos), []),
      actividades: parseJson(localStorage.getItem(KEYS.actividades), []),
      expedienteCounter: parseInt(localStorage.getItem(KEYS.expediente) || "0", 10) || 0
    };
  }
  function resumen(data){
    var nRoster = (data.roster && data.roster.rows && data.roster.rows.length) ||
      (Array.isArray(data.roster) ? data.roster.length : 0) || 0;
    return "Alumnos: " + nRoster +
      " \u00b7 Rebajes: " + ((data.rebajes || []).length) +
      " \u00b7 Sanciones: " + ((data.sanciones || []).length) +
      " \u00b7 Refuerzos: " + ((data.refuerzos || []).length) +
      " \u00b7 Actividades: " + ((data.actividades || []).length);
  }
  function escribirLocal(data){
    var roster = data.roster;
    if (Array.isArray(roster)){
      roster = {
        headers: ["NUMERO", "APE1", "APE2", "NOMBRE", "PELOTON", "SEXO", "UNIDAD", "DNI", "TELEFONO"],
        rows: roster,
        meta: { origen: "servidor" }
      };
    }
    localStorage.setItem(KEYS.roster, JSON.stringify(roster || { headers: [], rows: [] }));
    localStorage.setItem(KEYS.rebajes, JSON.stringify(data.rebajes || []));
    localStorage.setItem(KEYS.sanciones, JSON.stringify(data.sanciones || []));
    localStorage.setItem(KEYS.refuerzos, JSON.stringify(data.refuerzos || []));
    localStorage.setItem(KEYS.actividades, JSON.stringify(data.actividades || []));
    if (data.expedienteCounter != null){
      localStorage.setItem(KEYS.expediente, String(data.expedienteCounter));
    }
    localStorage.setItem(KEYS.lastBackup, new Date().toISOString());
  }

  function sesionJefe(){
    return fetch("/api/auth/me").then(function (r){
      if (!r.ok) return null;
      return r.json();
    }).then(function (me){
      if (!me) return null;
      if (me.tenant && me.tenant.role === "admin") return me;
      return null;
    }).catch(function (){ return null; });
  }

  function publicar(){
    var local = leerLocal();
    sesionJefe().then(function (me){
      if (!me){
        alert("Para publicar en el servidor entra primero en Modo servidor como jefe de sección (misma ventana) y vuelve aquí.");
        return;
      }
      var ok = confirm(
        "PUBLICAR en el servidor de \u00ab" + (me.tenant.nombre || me.tenant.id) + "\u00bb.\n\n" +
        "Esto SUSTITUYE los datos del servidor por los de este navegador.\n\n" +
        resumen(local) + "\n\n¿Continuar?"
      );
      if (!ok) return;
      return fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacion: "RESTAURAR", copia: local })
      }).then(function (r){ return r.json().then(function (d){ return { ok: r.ok, d: d }; }); })
        .then(function (res){
          if (!res.ok){
            alert(res.d.error || "No se pudo publicar.");
            return;
          }
          var r = res.d.restaurado || {};
          alert("Publicado en el servidor: " + r.roster + " alumnos, " +
            r.sanciones + " sanciones, " + r.rebajes + " rebajes, " + r.refuerzos + " refuerzos.");
        });
    }).catch(function (){
      alert("No hay conexión con el servidor. Abre esta página en la URL de Render, no como archivo local.");
    });
  }

  function traer(){
    sesionJefe().then(function (me){
      if (!me){
        alert("Para traer datos del servidor entra primero en Modo servidor como jefe de sección (misma ventana) y vuelve aquí.");
        return;
      }
      return fetch("/api/admin/backup").then(function (r){
        if (!r.ok) throw new Error("No se pudo leer el servidor");
        return r.json();
      }).then(function (remoto){
        var ok = confirm(
          "TRAER del servidor \u00ab" + (me.tenant.nombre || me.tenant.id) + "\u00bb.\n\n" +
          "Esto SUSTITUYE los datos de este navegador.\n\n" +
          resumen(remoto) + "\n\n¿Continuar?"
        );
        if (!ok) return;
        escribirLocal(remoto);
        alert("Datos del servidor cargados en este navegador. Se recarga la página.");
        location.reload();
      });
    }).catch(function (){
      alert("No hay conexión con el servidor. Abre esta página en la URL de Render, no como archivo local.");
    });
  }

  window.cefotSync = { publicar: publicar, traer: traer, leerLocal: leerLocal };
})();
