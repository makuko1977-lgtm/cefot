// Catálogo de faltas y utilidades compartidas entre el panel de
// administración, la página de instructor y el servidor (para validar).
// Módulo UMD: funciona con <script src="..."> (window.CEFOT2_CATALOG) y
// con require() en Node (module.exports).
(function (root, factory){
  var mod = factory();
  if (typeof module === "object" && module.exports){
    module.exports = mod;
  } else {
    root.CEFOT2_CATALOG = mod;
  }
})(typeof self !== "undefined" ? self : this, function (){

  var FALTA_CATALOG = {
    LEVE: [
      "El pequeño retraso injustificado a clase o a alguna actividad docente programada.",
      "Las que supongan no seguir las actividades académicas con diligencia y aprovechamiento.",
      "No estar atento durante el desarrollo de la actividad docente, la realización de otras actividades ajenas a la concreta actividad académica que se esté desarrollando, las faltas de atención o distracción, las faltas de interés, el molestar o distraer al resto de los compañeros.",
      "No aplicarse con diligencia y aprovechamiento en las tareas de investigación que les correspondan.",
      "No dedicarse a la formación que reciban en el centro docente militar y a realizar el trabajo intelectual y físico que se espera del alumno.",
      "No atender las orientaciones de los profesores y tutores respecto de su aprendizaje y de las normas de funcionamiento y comportamiento en clase.",
      "No participar activamente en las clases teóricas y prácticas, en la instrucción y adiestramiento y en las demás actividades (escolares o extraescolares) orientadas a su formación.",
      "No tomar parte en las actividades escolares de transmisión, adquisición y comprobación de los saberes, conocimientos, aptitudes y habilidades profesionales, así como el no procurar que éstas se realicen de la forma más adecuada y con arreglo a las instrucciones recibidas.",
      "No cooperar debidamente en la formación de sus compañeros, empleando incluso, en su caso, el ascendiente derivado de su antigüedad o experiencia.",
      "No cuidar o no usar debidamente los bienes, equipos, material, instalaciones o el recinto del centro y de las unidades, buques, centros y organismos que colaboren en la formación.",
      "Alterar de forma leve el orden en las aulas, laboratorios y otras áreas destinadas a la enseñanza, al estudio, la investigación o la instrucción.",
      "La utilización de vocabulario soez, vulgar o inadecuado.",
      "La realización de actos o manifestaciones de leve desconsideración hacia el profesor o los condiscípulos en los lugares en los que se desarrolle o cumpla la labor académica (escolar o extraescolar).",
      "El faltar levemente a la verdad en la dación de novedades.",
      "Plagiar total o parcialmente un trabajo, exposición, tarea o actividad académica encomendada.",
      "No presentación de los trabajos, exposiciones, tareas o actividades académicas encargadas o su no presentación en plazo, así como la presentación de estos sin el suficiente trabajo investigador, búsqueda documental o sin cumplir los demás requisitos y condiciones establecidos por el profesor o profesores.",
      "Replicar de forma injustificada y descortés a los profesores.",
      "Realizar manifestaciones de disgusto o desagrado o el adoptar o mostrar cualquier comportamiento o actitud descortés.",
      "No cooperar con los responsables, profesores y demás personal del centro, al logro de la mayor calidad y eficacia de la enseñanza.",
      "No participar de forma activa y responsable en las reuniones de los órganos para los que haya sido elegido.",
      "Las leves faltas de compostura o el pequeño descuido en la policía o aseo personal.",
      "Incurrir en demora en el exacto cumplimiento de las correcciones académicas impuestas.",
      "Cualesquiera otras que, en relación con su condición de alumnos, se deriven de este Régimen del Alumnado, constituyan infracción de un deber académico o de las normas de régimen interior del centro."
    ],
    GRAVE: [
      "El retraso prolongado o la ausencia injustificada a clase o a alguna actividad docente programada.",
      "La realización de novatadas o el trato desconsiderado con otros alumnos de cursos inferiores, siempre y cuando, por su entidad y circunstancias, no pudiera ser objeto de responsabilidad disciplinaria o penal.",
      "Llevar a cabo actuaciones relacionadas con el fraude de exámenes y controles o utilizar o cooperar en el uso de procedimientos fraudulentos en las pruebas de evaluación.",
      "Adulterar cualquier documento oficial, documento de asistencia, correcciones de pruebas o de trabajos de investigación.",
      "Incumplimiento de las correcciones impuestas junto a la amonestación verbal por la comisión de infracciones académica leve.",
      "La realización de actos o manifestaciones de grave o manifiesta desconsideración hacia el profesor en los lugares en los que se desarrolle o cumpla la labor académica (escolar o extraescolar).",
      "La contumacia o reiteración en la comisión de infracciones académicas leves."
    ]
  };

  // Opciones fijas de medida correctora (ampliable: solo hay que añadir
  // elementos a esta lista).
  var MEDIDA_OPTIONS = ["Amonestación verbal", "Trabajo no superior a 5 horas", "Refuerzo", "Arresto", "Sin medida"];

  function apartadoLetra(index){
    // 0 -> a, 1 -> b, ... 25 -> z, 26 -> aa ...
    var s = "";
    index = index + 1;
    while (index > 0){
      var rem = (index - 1) % 26;
      s = String.fromCharCode(97 + rem) + s;
      index = Math.floor((index - 1) / 26);
    }
    return s;
  }

  return {
    FALTA_CATALOG: FALTA_CATALOG,
    MEDIDA_OPTIONS: MEDIDA_OPTIONS,
    apartadoLetra: apartadoLetra
  };
});
