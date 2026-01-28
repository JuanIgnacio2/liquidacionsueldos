/**
 * Utilidades para cálculos de salarios y conceptos
 * 
 * Este módulo contiene funciones para calcular conceptos, descuentos y totales
 * de manera consistente en todos los componentes.
 */

// Función helper para redondear a 2 decimales
export const roundTo2Decimals = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.round(Number(value) * 100) / 100;
};

// Función helper para normalizar strings
const normalize = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Función helper para identificar "Bonif Antigüedad" específicamente
export const isBonifAntiguedad = (nombreConcepto) => {
  const nombreNormalizado = normalize(nombreConcepto || '');
  return (
    nombreNormalizado.includes('bonif antiguedad') ||
    nombreNormalizado.includes('bonif antigüedad')
  );
};

// Función helper para identificar conceptos que se calculan sobre el total bruto
export const isConceptoCalculadoSobreTotalBruto = (nombreConcepto) => {
  const nombreNormalizado = normalize(nombreConcepto || '');
  return (
    nombreNormalizado.includes('suplemento antiguedad') ||
    nombreNormalizado.includes('suplemento antigüedad') ||
    nombreNormalizado.includes('art 50') ||
    nombreNormalizado.includes('art 69') ||
    nombreNormalizado.includes('art 70') ||
    nombreNormalizado.includes('art 72')
  );
};

// Función helper para identificar "Personal de turno" (usa totalRemunerativo directamente, no valorHora)
export const isPersonalDeTurno = (nombreConcepto) => {
  const nombreNormalizado = normalize(nombreConcepto || '');
  return nombreNormalizado.includes('personal de turno') || nombreNormalizado.includes('personal turno');
};

/**
 * Calcula el total de un concepto individual basado en su tipo y configuración
 * @param {Object} concepto - El concepto a calcular
 * @param {number} unidades - Unidades del concepto
 * @param {Object} options - Opciones de cálculo
 * @param {number} options.basicoCat11 - Básico de categoría 11
 * @param {number} options.basicoEmpleado - Básico del empleado
 * @param {boolean} options.isLuzYFuerza - Si es Luz y Fuerza
 * @param {number} options.totalRemunerativo - Total remunerativo (para conceptos que lo usan)
 * @param {number} options.totalRemuneraciones - Total de remuneraciones (para descuentos)
 * @param {Object} options.catalogos - Catálogos necesarios (descuentos, horasExtras, etc.)
 * @returns {number} - Total calculado del concepto
 */
export const calculateConceptTotal = (concepto, unidades, options = {}) => {
  if (!concepto || !unidades || unidades <= 0) return 0;

  const {
    basicoCat11 = 0,
    basicoEmpleado = 0,
    isLuzYFuerza = false,
    totalRemunerativo = 0,
    totalRemuneraciones = 0,
    catalogos = {}
  } = options;

  const unidadesNum = Number(unidades) || 0;
  const isDescuento = concepto.isDescuento || 
    concepto.tipo === 'DESCUENTO' || 
    concepto.tipo === 'DESCUENTO_LYF' || 
    concepto.tipo === 'DESCUENTO_UOCRA' ||
    concepto.tipoConcepto === 'DESCUENTO' ||
    concepto.tipoConcepto === 'DESCUENTO_LYF' ||
    concepto.tipoConcepto === 'DESCUENTO_UOCRA';

  // Si es CONCEPTO_MANUAL_LYF, usar monto del concepto
  if (concepto.tipo === 'CONCEPTO_MANUAL_LYF' || concepto.tipoConcepto === 'CONCEPTO_MANUAL_LYF') {
    const montoManual = Number(concepto.montoUnitario ?? concepto.monto ?? concepto.valor ?? 0);
    return roundTo2Decimals(montoManual * unidadesNum);
  }

  // Manejo especial para "Bonif Antigüedad" (Luz y Fuerza)
  if (isBonifAntiguedad(concepto.nombre) && isLuzYFuerza) {
    if (basicoCat11 <= 0 || !concepto.porcentaje) return 0;
    const porcentaje = Number(concepto.porcentaje) || 0;
    const baseCalculo = roundTo2Decimals(basicoCat11 * 1.4);
    const montoUnitario = roundTo2Decimals((baseCalculo * porcentaje) / 100);
    return roundTo2Decimals(montoUnitario * unidadesNum);
  }

  // Verificar si el concepto tiene baseCalculo = 'TOTAL_REMUNERATIVO'
  const baseCalculoConcepto = concepto?.baseCalculo ?? concepto?.base_calculo;
  const usaTotalRemunerativo = baseCalculoConcepto === 'TOTAL_REMUNERATIVO' || 
    baseCalculoConcepto === 'total_remunerativo';

  // Para conceptos con TOTAL_REMUNERATIVO
  if (usaTotalRemunerativo && totalRemunerativo > 0 && concepto.porcentaje) {
    const porcentaje = Number(concepto.porcentaje) || 0;
    const montoUnitario = roundTo2Decimals((totalRemunerativo * porcentaje) / 100);
    return roundTo2Decimals(montoUnitario * unidadesNum);
  }

  // Para conceptos con porcentaje (bonificaciones normales)
  if (!concepto.porcentaje) return 0;
  const porcentaje = Number(concepto.porcentaje) || 0;

  // Lógica por defecto según el tipo
  let baseCalculo = 0;
  const tipoConcepto = concepto.tipoConcepto || concepto.tipo;
  
  if (isLuzYFuerza && !isDescuento) {
    // Para Luz y Fuerza: CONCEPTO_LYF y TITULO_LYF se calculan sobre categoría 11 por defecto
    if (tipoConcepto === 'CONCEPTO_LYF' || tipoConcepto === 'TITULO_LYF') {
      if (!baseCalculoConcepto || baseCalculoConcepto === 'BASICO_CATEGORIA_11' || baseCalculoConcepto === 'basico_categoria_11') {
        baseCalculo = basicoCat11;
      }
    } else if (tipoConcepto === 'BONIFICACION_AREA') {
      baseCalculo = basicoCat11;
    }
  } else if (tipoConcepto === 'CONCEPTO_UOCRA') {
    baseCalculo = basicoEmpleado;
  } else {
    baseCalculo = basicoEmpleado;
  }

  if (baseCalculo <= 0) return 0;
  const montoUnitario = roundTo2Decimals((baseCalculo * porcentaje) / 100);
  return roundTo2Decimals(montoUnitario * unidadesNum);
};

/**
 * Calcula el TOTAL_REMUNERATIVO para Luz y Fuerza
 * @param {Array} conceptosValidos - Array de conceptos válidos
 * @param {number} basicoEmpleado - Básico del empleado
 * @param {number} basicoCat11 - Básico de categoría 11
 * @param {Object} bonificacionesFijas - Catálogo de bonificaciones fijas
 * @returns {number} - Total remunerativo calculado
 */
export const calculateTotalRemunerativo = (conceptosValidos, basicoEmpleado, basicoCat11, bonificacionesFijas = []) => {
  const totalBonificacionesArea = roundTo2Decimals(conceptosValidos
    .filter(c => c && c.tipoConcepto === 'BONIFICACION_AREA' && c.total > 0)
    .reduce((sum, c) => roundTo2Decimals(sum + c.total), 0));

  const totalTitulosLyF = roundTo2Decimals(conceptosValidos
    .filter(c => c && c.tipoConcepto === 'TITULO_LYF' && c.total > 0)
    .reduce((sum, c) => roundTo2Decimals(sum + c.total), 0));

  const totalConceptosLyFCat11 = roundTo2Decimals(conceptosValidos
    .filter(c => {
      if (!c || c.tipoConcepto !== 'CONCEPTO_LYF' || c.total <= 0) return false;
      const concepto = bonificacionesFijas.find(b => (b.idBonificacion ?? b.id) === c.idReferencia);
      const baseCalculoConcepto = concepto?.baseCalculo ?? concepto?.base_calculo;
      return !baseCalculoConcepto || 
             baseCalculoConcepto === 'BASICO_CATEGORIA_11' || 
             baseCalculoConcepto === 'basico_categoria_11';
    })
    .reduce((sum, c) => roundTo2Decimals(sum + c.total), 0));
  return roundTo2Decimals(basicoEmpleado + totalBonificacionesArea + totalTitulosLyF + totalConceptosLyFCat11);
};

/**
 * Calcula horas extras de Luz y Fuerza
 * @param {Array} conceptosValidos - Array de conceptos válidos
 * @param {number} basicoEmpleado - Básico del empleado
 * @param {number} basicoCat11 - Básico de categoría 11
 * @param {Object} horasExtrasLyF - Catálogo de horas extras
 * @param {Object} bonificacionesFijas - Catálogo de bonificaciones fijas
 * @returns {Array} - Array de conceptos con horas extras calculadas
 */
export const calculateHorasExtrasLyF = (
  conceptosValidos,
  basicoEmpleado,
  basicoCat11,
  horasExtrasLyF = [],
  bonificacionesFijas = []
) => {
  // Calcular total antes de horas extras
  const totalAntesHorasExtras = roundTo2Decimals(basicoEmpleado + 
    conceptosValidos
      .filter(c => c && 
        (c.tipoConcepto === 'BONIFICACION_AREA' || 
         c.tipoConcepto === 'CONCEPTO_LYF' || 
         c.tipoConcepto === 'TITULO_LYF' ||
         c.tipoConcepto === 'CONCEPTO_MANUAL_LYF') &&
        c.tipoConcepto !== 'HORA_EXTRA_LYF')
      .reduce((sum, c) => roundTo2Decimals(sum + (c.total || 0)), 0));
  // Separar horas extras en "Personal de Turno" y el resto
  const horasExtrasPersonalTurno = conceptosValidos.filter(c => 
    c && c.tipoConcepto === 'HORA_EXTRA_LYF' && isPersonalDeTurno(c.nombre)
  );
  const horasExtrasResto = conceptosValidos.filter(c => 
    c && c.tipoConcepto === 'HORA_EXTRA_LYF' && !isPersonalDeTurno(c.nombre)
  );

  // Calcular primero "Personal de Turno"
  horasExtrasPersonalTurno.forEach((c) => {
    if (c) {
      const horaExtra = horasExtrasLyF.find(he => 
        (he.idHoraExtra ?? he.id) === c.idReferencia
      );
      const factor = horaExtra 
        ? (Number(horaExtra.factor) || 1.5)
        : 1.5;
      const montoBase = roundTo2Decimals(totalAntesHorasExtras * factor);
      c.total = roundTo2Decimals(montoBase * (Number(c.unidades) || 1));
    }
  });

  // Sumar "Personal de Turno" al total
  const totalPersonalTurno = roundTo2Decimals(horasExtrasPersonalTurno.reduce((sum, c) => roundTo2Decimals(sum + (c.total || 0)), 0));
  const totalConPersonalTurno = roundTo2Decimals(totalAntesHorasExtras + totalPersonalTurno);
  // Calcular el resto de horas extras usando el nuevo total
  horasExtrasResto.forEach((c) => {
    if (c) {
      const horaExtra = horasExtrasLyF.find(he => 
        (he.idHoraExtra ?? he.id) === c.idReferencia
      );
      const factor = horaExtra 
        ? (Number(horaExtra.factor) || (c.idReferencia === 1 ? 1.5 : 2))
        : (c.idReferencia === 1 ? 1.5 : 2);
      const valorHoraActualizado = roundTo2Decimals(totalConPersonalTurno / 156);
      const montoUnitario = roundTo2Decimals(valorHoraActualizado * factor);
      c.total = roundTo2Decimals(montoUnitario * (Number(c.unidades) || 1));
    }
  });

  return conceptosValidos;
};

/**
 * Calcula descuentos usando la lógica de tres pasos
 * @param {Array} conceptosValidos - Array de conceptos válidos
 * @param {number} totalRemuneraciones - Total de remuneraciones
 * @param {Object} catalogos - Catálogos de descuentos
 * @returns {Array} - Array de conceptos con descuentos calculados
 */
export const calculateDescuentos = (conceptosValidos, totalRemuneraciones, catalogos = {}) => {
  const { descuentos = [], descuentosLyF = [], descuentosUocra = [] } = catalogos;

  // PASO 1: Calcular primero los descuentos que NO usan TOTAL_NETO
  conceptosValidos.forEach(concepto => {
    if (concepto && (concepto.tipoConcepto === 'DESCUENTO' || concepto.tipoConcepto === 'DESCUENTO_LYF' || concepto.tipoConcepto === 'DESCUENTO_UOCRA')) {
      // DESCUENTO_LYF y DESCUENTO_UOCRA: siempre usan totalRemuneraciones como base y porcentaje del catálogo
      if (concepto.tipoConcepto === 'DESCUENTO_LYF' || concepto.tipoConcepto === 'DESCUENTO_UOCRA') {
        if (totalRemuneraciones > 0) {
          let porcentajeDescuento = 0;
          if (concepto.tipoConcepto === 'DESCUENTO_LYF') {
            const descuentoLyF = descuentosLyF.find(d => (d.idDescuentoLyF ?? d.idDescuento ?? d.id) === concepto.idReferencia);
            porcentajeDescuento = Number(descuentoLyF?.porcentaje ?? concepto.porcentaje ?? 0);
          } else if (concepto.tipoConcepto === 'DESCUENTO_UOCRA') {
            const descuentoUocra = descuentosUocra.find(d => (d.idDescuentoUocra ?? d.idDescuento ?? d.id) === concepto.idReferencia);
            porcentajeDescuento = Number(descuentoUocra?.porcentaje ?? concepto.porcentaje ?? 0);
          }
          if (porcentajeDescuento > 0) {
            const montoUnitario = roundTo2Decimals((totalRemuneraciones * porcentajeDescuento) / 100);
            concepto.total = -roundTo2Decimals(montoUnitario * (Number(concepto.unidades) || 1));
          }
        }
      } 
      // DESCUENTO: verificar baseCalculo solo para este tipo
      else if (concepto.tipoConcepto === 'DESCUENTO') {
        const descuento = descuentos.find(d => (d.idDescuento ?? d.id) === concepto.idReferencia);
        const baseCalculoDescuento = descuento?.baseCalculo ?? descuento?.base_calculo;
        const usaTotalBruto = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto';
        const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
        
        // Solo calcular los que NO usan TOTAL_NETO en este paso
        if (usaTotalBruto && totalRemuneraciones > 0) {
          const cantidadComoPorcentaje = Number(concepto.porcentaje) || 0;
          concepto.total = -roundTo2Decimals(totalRemuneraciones * cantidadComoPorcentaje / 100);
        } else if (!usaTotalNeto && concepto.porcentaje && totalRemuneraciones > 0) {
          // Comportamiento tradicional
          const montoUnitario = roundTo2Decimals((totalRemuneraciones * concepto.porcentaje) / 100);
          concepto.total = -roundTo2Decimals(montoUnitario * (Number(concepto.unidades) || 1));
        }
      }
    }
  });

  // PASO 2: Calcular neto preliminar
  const descuentosNoTotalNeto = roundTo2Decimals(conceptosValidos
    .filter(c => {
      if (!c || (c.tipoConcepto !== 'DESCUENTO' && c.tipoConcepto !== 'DESCUENTO_LYF' && c.tipoConcepto !== 'DESCUENTO_UOCRA')) return false;
      if (c.tipoConcepto === 'DESCUENTO_LYF' || c.tipoConcepto === 'DESCUENTO_UOCRA') {
        return true;
      }
      if (c.tipoConcepto === 'DESCUENTO') {
        const descuento = descuentos.find(d => (d.idDescuento ?? d.id) === c.idReferencia);
        const baseCalculoDescuento = descuento?.baseCalculo ?? descuento?.base_calculo;
        const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
        return !usaTotalNeto;
      }
      return false;
    })
    .reduce((sum, c) => roundTo2Decimals(sum + Math.abs(c.total || 0)), 0));
  
  const netoPreliminar = roundTo2Decimals(totalRemuneraciones - descuentosNoTotalNeto);

  // PASO 3: Calcular descuentos que usan TOTAL_NETO sobre el neto preliminar
  conceptosValidos.forEach(concepto => {
    if (concepto && concepto.tipoConcepto === 'DESCUENTO') {
      const descuento = descuentos.find(d => (d.idDescuento ?? d.id) === concepto.idReferencia);
      const baseCalculoDescuento = descuento?.baseCalculo ?? descuento?.base_calculo;
      const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
      
      if (usaTotalNeto && netoPreliminar > 0) {
        const nombreDescuento = (descuento?.nombre ?? descuento?.descripcion ?? concepto.nombre ?? '').toLowerCase();
        const esCuotaAlimentaria = nombreDescuento.includes('cuota') && nombreDescuento.includes('alimentaria');
        
        if (esCuotaAlimentaria) {
          const cantidadComoPorcentaje = Number(concepto.unidades) || 0;
          if (cantidadComoPorcentaje > 0) {
            concepto.total = -roundTo2Decimals(netoPreliminar * cantidadComoPorcentaje / 100);
          }
        } else {
          const porcentajeDescuento = Number(descuento?.porcentaje ?? concepto.porcentaje ?? 0);
          if (porcentajeDescuento > 0) {
            const montoUnitario = roundTo2Decimals((netoPreliminar * porcentajeDescuento) / 100);
            concepto.total = -roundTo2Decimals(montoUnitario * (Number(concepto.unidades) || 1));
          }
        }
      }
    }
  });

  return conceptosValidos;
};

/**
 * Calcula los totales finales (bruto, descuentos, neto)
 * @param {Array} conceptosParaMostrar - Array de conceptos para mostrar
 * @param {number} basicoEmpleado - Básico del empleado
 * @returns {Object} - Objeto con sueldoBruto, totalDescuentos, sueldoNeto
 */
export const calculateTotals = (conceptosParaMostrar, basicoEmpleado) => {
  const sueldoBruto = roundTo2Decimals(basicoEmpleado + conceptosParaMostrar
    .filter(c => 
      c.tipoConcepto === 'BONIFICACION_AREA' || 
      c.tipoConcepto === 'CONCEPTO_LYF' || 
      c.tipoConcepto === 'CONCEPTO_UOCRA' || 
      c.tipoConcepto === 'TITULO_LYF' ||
      c.tipoConcepto === 'CONCEPTO_MANUAL_LYF' ||
      c.tipoConcepto === 'HORA_EXTRA_LYF'
    )
    .reduce((sum, c) => roundTo2Decimals(sum + (c.total || 0)), 0));

  const totalDescuentos = roundTo2Decimals(conceptosParaMostrar
    .filter(c => 
      c.tipoConcepto === 'DESCUENTO' || 
      c.tipoConcepto === 'DESCUENTO_LYF' || 
      c.tipoConcepto === 'DESCUENTO_UOCRA'
    )
    .reduce((sum, c) => roundTo2Decimals(sum + Math.abs(c.total || 0)), 0));

  const sueldoNeto = roundTo2Decimals(sueldoBruto - totalDescuentos);

  return { sueldoBruto, totalDescuentos, sueldoNeto };
};

/**
 * Calcula el TOTAL_REMUNERATIVO desde conceptosSeleccionados (formato de NewEmployeeModal/EmployeeEditModal)
 * @param {Object} conceptosSeleccionados - Objeto con conceptos seleccionados { conceptId: { units: 'X' } }
 * @param {Array} conceptos - Array de conceptos del catálogo
 * @param {number} basicoEmpleado - Básico del empleado
 * @param {number} bonoArea - Bono de área
 * @param {number} basicoCat11 - Básico de categoría 11
 * @returns {number} - Total remunerativo calculado
 */
export const calculateTotalRemunerativoFromSeleccionados = (
  conceptosSeleccionados,
  conceptos,
  basicoEmpleado,
  bonoArea,
  basicoCat11,
  conceptoIdExcluir = null // ID del concepto a excluir (para evitar recursión)
) => {
  // Sumar títulos (TITULO_LYF)
  const totalTitulos = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
    if (String(conceptId) === String(conceptoIdExcluir)) return sum;
    const c = conceptos.find(cc => String(cc.id) === String(conceptId));
    if (!c || c.tipo !== 'TITULO_LYF') return sum;
    const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
    if (!u || u <= 0) return sum;
    if (basicoCat11 > 0 && c.porcentaje) {
      const montoUnitario = roundTo2Decimals((basicoCat11 * c.porcentaje) / 100);
      return roundTo2Decimals(sum + roundTo2Decimals(montoUnitario * u));
    }
    return sum;
  }, 0);

  // Sumar CONCEPTO_LYF con BASICO_CATEGORIA_11 (excluir los que usan TOTAL_REMUNERATIVO y el concepto excluido)
  // IMPORTANTE: Incluir "Bonif Antigüedad" que se calcula sobre basicoCat11 * 1.4
  const totalConceptosLyFCat11 = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
    if (String(conceptId) === String(conceptoIdExcluir)) return sum;
    const c = conceptos.find(cc => String(cc.id) === String(conceptId));
    if (!c || c.tipo !== 'CONCEPTO_LYF' || c.isDescuento) return sum;
    const cBaseCalculo = c?.baseCalculo ?? c?.base_calculo;
    const cUsaTotalRemunerativo = cBaseCalculo === 'TOTAL_REMUNERATIVO' || cBaseCalculo === 'total_remunerativo' ||
                                  cBaseCalculo === 'TOTAL_BRUTO' || cBaseCalculo === 'total_bruto';
    if (cUsaTotalRemunerativo) return sum; // Excluir los que usan TOTAL_REMUNERATIVO
    const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
    if (!u || u <= 0) return sum;
    
    // Manejo especial para "Bonif Antigüedad" que se calcula sobre basicoCat11 * 1.4
    if (isBonifAntiguedad(c.nombre)) {
      if (basicoCat11 > 0 && c.porcentaje) {
        const baseCalculo = roundTo2Decimals(basicoCat11 * 1.4);
        const montoUnitario = roundTo2Decimals((baseCalculo * c.porcentaje) / 100);
        return roundTo2Decimals(sum + roundTo2Decimals(montoUnitario * u));
      }
      return sum;
    }
    
    // Para otros CONCEPTO_LYF con BASICO_CATEGORIA_11
    if (basicoCat11 > 0 && c.porcentaje) {
      const montoUnitario = roundTo2Decimals((basicoCat11 * c.porcentaje) / 100);
      return roundTo2Decimals(sum + roundTo2Decimals(montoUnitario * u));
    }
    return sum;
  }, 0);

  return roundTo2Decimals(basicoEmpleado + bonoArea + totalTitulos + totalConceptosLyFCat11);
};

/**
 * Calcula el total antes de horas extras desde conceptosSeleccionados
 * @param {Object} conceptosSeleccionados - Objeto con conceptos seleccionados
 * @param {Array} conceptos - Array de conceptos del catálogo
 * @param {number} basicoEmpleado - Básico del empleado
 * @param {number} bonoArea - Bono de área
 * @param {number} basicoCat11 - Básico de categoría 11
 * @param {string} conceptoIdExcluir - ID del concepto a excluir (para evitar recursión)
 * @returns {number} - Total antes de horas extras
 */
export const calculateTotalAntesHorasExtrasFromSeleccionados = (
  conceptosSeleccionados,
  conceptos,
  basicoEmpleado,
  bonoArea,
  basicoCat11,
  conceptoIdExcluir = null,
  calculateConceptTotalFn = null // Función opcional para calcular totales ya calculados
) => {
  // Si tenemos una función para calcular totales, usarla para obtener totales ya calculados
  // Esto es útil cuando los conceptos con TOTAL_REMUNERATIVO ya fueron calculados
  if (calculateConceptTotalFn) {
    let totalAntesHorasExtras = roundTo2Decimals(basicoEmpleado + bonoArea);
    
    // Sumar todos los conceptos excepto HORA_EXTRA_LYF y el concepto excluido
    Object.keys(conceptosSeleccionados).forEach(conceptId => {
      if (String(conceptId) === String(conceptoIdExcluir)) return;
      const c = conceptos.find(cc => String(cc.id) === String(conceptId));
      if (!c) return;
      if (c.tipo === 'HORA_EXTRA_LYF') return;
      if (c.isDescuento || c.tipo === 'DESCUENTO' || c.tipo === 'DESCUENTO_LYF' || c.tipo === 'DESCUENTO_UOCRA') return;
      
      const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
      if (u > 0) {
        const total = calculateConceptTotalFn(c, u, null, false);
        totalAntesHorasExtras = roundTo2Decimals(totalAntesHorasExtras + total);
      }
    });
    
    return totalAntesHorasExtras;
  }
  
  // Si no hay función, calcular desde cero (comportamiento original)
  // Sumar títulos (TITULO_LYF)
  const totalTitulos = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
    if (String(conceptId) === String(conceptoIdExcluir)) return sum;
    const c = conceptos.find(cc => String(cc.id) === String(conceptId));
    if (!c || c.tipo !== 'TITULO_LYF') return sum;
    const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
    if (!u || u <= 0) return sum;
    if (basicoCat11 > 0 && c.porcentaje) {
      const montoUnitario = roundTo2Decimals((basicoCat11 * c.porcentaje) / 100);
      return roundTo2Decimals(sum + roundTo2Decimals(montoUnitario * u));
    }
    return sum;
  }, 0);

  // Sumar CONCEPTO_LYF con BASICO_CATEGORIA_11
  // IMPORTANTE: Incluir "Bonif Antigüedad" que se calcula sobre basicoCat11 * 1.4
  const totalConceptosLyFCat11 = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
    if (String(conceptId) === String(conceptoIdExcluir)) return sum;
    const c = conceptos.find(cc => String(cc.id) === String(conceptId));
    if (!c || c.tipo !== 'CONCEPTO_LYF' || c.isDescuento) return sum;
    const cBaseCalculo = c?.baseCalculo ?? c?.base_calculo;
    const cUsaTotalRemunerativo = cBaseCalculo === 'TOTAL_REMUNERATIVO' || cBaseCalculo === 'total_remunerativo' ||
                                  cBaseCalculo === 'TOTAL_BRUTO' || cBaseCalculo === 'total_bruto';
    if (cUsaTotalRemunerativo) return sum;
    const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
    if (!u || u <= 0) return sum;
    
    // Manejo especial para "Bonif Antigüedad" que se calcula sobre basicoCat11 * 1.4
    if (isBonifAntiguedad(c.nombre)) {
      if (basicoCat11 > 0 && c.porcentaje) {
        const baseCalculo = roundTo2Decimals(basicoCat11 * 1.4);
        const montoUnitario = roundTo2Decimals((baseCalculo * c.porcentaje) / 100);
        return roundTo2Decimals(sum + roundTo2Decimals(montoUnitario * u));
      }
      return sum;
    }
    
    // Para otros CONCEPTO_LYF con BASICO_CATEGORIA_11
    if (basicoCat11 > 0 && c.porcentaje) {
      const montoUnitario = roundTo2Decimals((basicoCat11 * c.porcentaje) / 100);
      return roundTo2Decimals(sum + roundTo2Decimals(montoUnitario * u));
    }
    return sum;
  }, 0);

  // Calcular TOTAL_REMUNERATIVO para conceptos que lo usan (sin incluir conceptos con TOTAL_REMUNERATIVO)
  // Esto debe ser igual al cálculo en calculateTotalRemunerativoFromSeleccionados
  // IMPORTANTE: Usar la misma función para garantizar consistencia
  // Cuando se calcula HORA_EXTRA_LYF, NO excluir ningún concepto del TOTAL_REMUNERATIVO base
  // (solo se excluyen conceptos con TOTAL_REMUNERATIVO del cálculo del TOTAL_REMUNERATIVO, no del concepto excluido)
  const totalRemunerativoParaConceptos = calculateTotalRemunerativoFromSeleccionados(
    conceptosSeleccionados,
    conceptos,
    basicoEmpleado,
    bonoArea,
    basicoCat11,
    null // NO excluir ningún concepto del TOTAL_REMUNERATIVO base cuando se calcula HORA_EXTRA_LYF
  );
  
  // Sumar CONCEPTO_LYF con TOTAL_REMUNERATIVO
  // Todos los conceptos con TOTAL_REMUNERATIVO se calculan sobre el mismo TOTAL_REMUNERATIVO base
  // (sin incluir otros conceptos con TOTAL_REMUNERATIVO, para evitar recursión)
  // Esto es consistente con EmployeeViewModal.jsx donde todos se calculan sobre el mismo total
  const totalConceptosLyFTotalRemunerativo = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
    if (String(conceptId) === String(conceptoIdExcluir)) return sum;
    const c = conceptos.find(cc => String(cc.id) === String(conceptId));
    if (!c || c.tipo !== 'CONCEPTO_LYF' || c.isDescuento) return sum;
    const cBaseCalculo = c?.baseCalculo ?? c?.base_calculo;
    const cUsaTotalRemunerativo = cBaseCalculo === 'TOTAL_REMUNERATIVO' || cBaseCalculo === 'total_remunerativo' ||
                                  cBaseCalculo === 'TOTAL_BRUTO' || cBaseCalculo === 'total_bruto';
    if (!cUsaTotalRemunerativo) return sum;
    const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
    if (!u || u <= 0 || !c.porcentaje || totalRemunerativoParaConceptos <= 0) return sum;
    // Calcular sobre el TOTAL_REMUNERATIVO base (sin incluir otros conceptos con TOTAL_REMUNERATIVO)
    // Esto es igual a como se calcula en EmployeeViewModal.jsx
    const montoUnitario = roundTo2Decimals((totalRemunerativoParaConceptos * c.porcentaje) / 100);
    return roundTo2Decimals(sum + roundTo2Decimals(montoUnitario * u));
  }, 0);

  // Sumar CONCEPTOS_MANUALES_LYF
  const totalConceptosManuales = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
    if (String(conceptId) === String(conceptoIdExcluir)) return sum;
    const c = conceptos.find(cc => String(cc.id) === String(conceptId));
    if (!c || c.tipo !== 'CONCEPTO_MANUAL_LYF') return sum;
    const montoManual = Number(c.montoUnitario) || 0;
    return roundTo2Decimals(sum + roundTo2Decimals(montoManual * 1)); // Siempre cantidad 1
  }, 0);

  return roundTo2Decimals(basicoEmpleado + bonoArea + totalTitulos + totalConceptosLyFCat11 + totalConceptosLyFTotalRemunerativo + totalConceptosManuales);
};

/**
 * Calcula el total de un concepto desde conceptosSeleccionados (para NewEmployeeModal/EmployeeEditModal)
 * @param {Object} concepto - El concepto del catálogo
 * @param {number} unidades - Unidades del concepto
 * @param {Object} options - Opciones de cálculo
 * @param {Object} options.conceptosSeleccionados - Objeto con conceptos seleccionados
 * @param {Array} options.conceptos - Array de conceptos del catálogo
 * @param {number} options.basicoCat11 - Básico de categoría 11
 * @param {number} options.basicoEmpleado - Básico del empleado
 * @param {number} options.bonoArea - Bono de área
 * @param {boolean} options.isLuzYFuerza - Si es Luz y Fuerza
 * @param {number} options.totalRemuneraciones - Total de remuneraciones (para descuentos)
 * @param {Function} options.calculateSueldoBruto - Función para calcular sueldo bruto (para descuentos)
 * @returns {number} - Total calculado del concepto
 */
export const calculateConceptTotalFromSeleccionados = (concepto, unidades, options = {}) => {
  if (!concepto || !unidades || unidades <= 0) return 0;

  const {
    conceptosSeleccionados = {},
    conceptos = [],
    basicoCat11 = 0,
    basicoEmpleado = 0,
    bonoArea = 0,
    isLuzYFuerza = false,
    totalRemuneraciones = null,
    calculateSueldoBruto = null,
    skipTotalBruto = false
  } = options;

  const unidadesNum = Number(unidades) || 0;
  const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO' || concepto.tipo === 'DESCUENTO_LYF' || concepto.tipo === 'DESCUENTO_UOCRA';

  // Si es CONCEPTO_MANUAL_LYF, usar monto del concepto
  if (concepto.tipo === 'CONCEPTO_MANUAL_LYF') {
    const montoManual = Number(concepto.montoUnitario) || 0;
    return roundTo2Decimals(montoManual * unidadesNum);
  }

  // Si es descuento, calcular según baseCalculo o porcentaje tradicional
  if (isDescuento) {
    // DESCUENTO_LYF y DESCUENTO_UOCRA: siempre usan totalRemuneraciones como base y porcentaje del catálogo
    if (concepto.tipo === 'DESCUENTO_LYF' || concepto.tipo === 'DESCUENTO_UOCRA') {
      const totalRem = totalRemuneraciones || (calculateSueldoBruto ? calculateSueldoBruto() : 0);
      if (!totalRem || totalRem <= 0) return 0;
      const porcentajeDescuento = Number(concepto.porcentaje) || 0;
      if (porcentajeDescuento > 0) {
        const montoUnitario = roundTo2Decimals((totalRem * porcentajeDescuento) / 100);
        return -roundTo2Decimals(montoUnitario * (Number(unidadesNum) || 1));
      }
      return 0;
    }
    
    // DESCUENTO: verificar baseCalculo solo para este tipo
    if (concepto.tipo === 'DESCUENTO') {
      const baseCalculoDescuento = concepto?.baseCalculo ?? concepto?.base_calculo;
      const usaTotalBruto = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto';
      const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
      
      if (usaTotalBruto) {
        const totalRem = totalRemuneraciones || (calculateSueldoBruto ? calculateSueldoBruto() : 0);
        if (totalRem > 0) {
          const porcentajeDescuento = Number(concepto.porcentaje) || 0;
          if (porcentajeDescuento > 0) {
            return -roundTo2Decimals(totalRem * porcentajeDescuento / 100);
          }
        }
      } else if (usaTotalNeto) {
        // TOTAL_NETO: calcular neto preliminar
        const totalRem = totalRemuneraciones || (calculateSueldoBruto ? calculateSueldoBruto() : 0);
        
        // Calcular descuentos que NO usan TOTAL_NETO
        const descuentosNoTotalNeto = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
          if (String(conceptId) === String(concepto.id)) return sum; // Excluir el concepto actual
          const c = conceptos.find(cc => String(cc.id) === String(conceptId));
          if (!c) return sum;
          const cIsDescuento = c.isDescuento || c.tipo === 'DESCUENTO' || c.tipo === 'DESCUENTO_LYF' || c.tipo === 'DESCUENTO_UOCRA';
          if (!cIsDescuento) return sum;
          
          // DESCUENTO_LYF y DESCUENTO_UOCRA siempre se incluyen (no usan TOTAL_NETO)
          if (c.tipo === 'DESCUENTO_LYF' || c.tipo === 'DESCUENTO_UOCRA') {
            const cUnits = conceptosSeleccionados[conceptId]?.units ?? '';
            const cUnitsNum = Number(cUnits);
            if (cUnitsNum > 0 && c.porcentaje && totalRem > 0) {
              const montoUnitario = roundTo2Decimals((totalRem * c.porcentaje / 100));
              return roundTo2Decimals(sum + Math.abs(montoUnitario * (cUnitsNum || 1)));
            }
            return sum;
          }
          
          // Para DESCUENTO, verificar si usa TOTAL_NETO
          if (c.tipo === 'DESCUENTO') {
            const cBaseCalculo = c?.baseCalculo ?? c?.base_calculo;
            const cUsaTotalNeto = cBaseCalculo === 'TOTAL_NETO' || cBaseCalculo === 'total_neto';
            if (cUsaTotalNeto) return sum; // Excluir los que usan TOTAL_NETO
            
            const cUnits = conceptosSeleccionados[conceptId]?.units ?? '';
            const cUnitsNum = Number(cUnits);
            if (!cUnitsNum || cUnitsNum <= 0) return sum;
            
            const cUsaTotalBruto = cBaseCalculo === 'TOTAL_BRUTO' || cBaseCalculo === 'total_bruto';
            if (cUsaTotalBruto) {
              const porcentajeDesc = Number(c.porcentaje) || 0;
              if (porcentajeDesc > 0 && totalRem > 0) {
                return roundTo2Decimals(sum + Math.abs(roundTo2Decimals(totalRem * porcentajeDesc / 100)));
              }
            } else if (c.porcentaje && totalRem > 0) {
              const montoUnitario = roundTo2Decimals((totalRem * c.porcentaje / 100));
              return roundTo2Decimals(sum + Math.abs(montoUnitario * (cUnitsNum || 1)));
            }
          }
          return sum;
        }, 0);
        
        const netoPreliminar = roundTo2Decimals(totalRem - descuentosNoTotalNeto);
        if (netoPreliminar <= 0) return 0;
        
        // Verificar si es "Cuota Alimentaria"
        const nombreDescuento = (concepto.nombre || '').toLowerCase();
        const esCuotaAlimentaria = nombreDescuento.includes('cuota') && nombreDescuento.includes('alimentaria');
        
        if (esCuotaAlimentaria) {
          const cantidadComoPorcentaje = Number(unidadesNum) || 0;
          if (cantidadComoPorcentaje > 0) {
            return -roundTo2Decimals(netoPreliminar * cantidadComoPorcentaje / 100);
          }
        } else {
          const porcentajeDescuento = Number(concepto.porcentaje) || 0;
          if (porcentajeDescuento > 0) {
            const montoUnitario = roundTo2Decimals((netoPreliminar * porcentajeDescuento) / 100);
            return -roundTo2Decimals(montoUnitario * (Number(unidadesNum) || 1));
          }
        }
      } else {
        // Comportamiento tradicional
        const totalRem = totalRemuneraciones || (calculateSueldoBruto ? calculateSueldoBruto() : 0);
        if (!concepto.porcentaje || !totalRem || totalRem <= 0) return 0;
        const porcentaje = Number(concepto.porcentaje) || 0;
        const montoUnitario = roundTo2Decimals((totalRem * porcentaje) / 100);
        return -roundTo2Decimals(montoUnitario * (Number(unidadesNum) || 1));
      }
    }
    return 0;
  }

  // Manejo especial para "Bonif Antigüedad" (Luz y Fuerza)
  if (isBonifAntiguedad(concepto.nombre) && isLuzYFuerza) {
    if (basicoCat11 <= 0 || !concepto.porcentaje) return 0;
    const porcentaje = Number(concepto.porcentaje) || 0;
    const baseCalculo = roundTo2Decimals(basicoCat11 * 1.4);
    const montoUnitario = roundTo2Decimals((baseCalculo * porcentaje) / 100);
    return roundTo2Decimals(montoUnitario * unidadesNum);
  }
  
  // Verificar si el concepto tiene baseCalculo = 'TOTAL_REMUNERATIVO'
  const baseCalculoConcepto = concepto?.baseCalculo ?? concepto?.base_calculo;
  const usaTotalRemunerativo = baseCalculoConcepto === 'TOTAL_REMUNERATIVO' || baseCalculoConcepto === 'total_remunerativo' || 
                               baseCalculoConcepto === 'TOTAL_BRUTO' || baseCalculoConcepto === 'total_bruto';
  
  // Detectar conceptos especiales por nombre o por campo baseCalculo
  const isConceptoEspecial = (isConceptoCalculadoSobreTotalBruto(concepto.nombre) || usaTotalRemunerativo) && isLuzYFuerza;
  
  if (isConceptoEspecial && !skipTotalBruto) {
    // Excluir el concepto actual del cálculo de TOTAL_REMUNERATIVO para evitar recursión
    const totalRemunerativo = calculateTotalRemunerativoFromSeleccionados(
      conceptosSeleccionados,
      conceptos,
      basicoEmpleado,
      bonoArea,
      basicoCat11,
      concepto.id // Excluir este concepto del cálculo
    );
    if (totalRemunerativo <= 0 || !concepto.porcentaje) return 0;
    const porcentaje = Number(concepto.porcentaje) || 0;
    const montoUnitario = roundTo2Decimals((totalRemunerativo * porcentaje) / 100);
    return roundTo2Decimals(montoUnitario * unidadesNum);
  }

  // Manejo especial para Horas Extras de Luz y Fuerza (HORA_EXTRA_LYF)
  if (concepto.tipo === 'HORA_EXTRA_LYF') {
    // Calcular total antes de horas extras usando la misma lógica que EmployeeViewModal
    // Esto incluye: básico + bono área + títulos + conceptos con BASICO_CATEGORIA_11 + conceptos con TOTAL_REMUNERATIVO + conceptos manuales
    const totalAntesHorasExtras = calculateTotalAntesHorasExtrasFromSeleccionados(
      conceptosSeleccionados,
      conceptos,
      basicoEmpleado,
      bonoArea,
      basicoCat11,
      concepto.id
    );
    if (totalAntesHorasExtras <= 0) return 0;

    const factor = Number(concepto.factor) || (concepto.originalId === 1 ? 1.5 : 2);
    
    // Separar "Personal de Turno" del resto
    if (isPersonalDeTurno(concepto.nombre)) {
      const montoBase = roundTo2Decimals(totalAntesHorasExtras * factor);
      return roundTo2Decimals(montoBase * unidadesNum);
    } else {
      // Para otras horas extras: primero calcular "Personal de Turno" si existe, sumarlo, y luego calcular valor hora
      let totalConPersonalTurno = totalAntesHorasExtras;
      
      const personalTurnoConcepto = conceptos.find(c => 
        c.tipo === 'HORA_EXTRA_LYF' && isPersonalDeTurno(c.nombre)
      );
      
      if (personalTurnoConcepto) {
        const personalTurnoId = String(personalTurnoConcepto.id);
        const personalTurnoUnits = Number(conceptosSeleccionados[personalTurnoId]?.units) || 0;
        if (personalTurnoUnits > 0) {
          const personalTurnoFactor = Number(personalTurnoConcepto.factor) || 1.5;
          const totalPersonalTurno = roundTo2Decimals(totalAntesHorasExtras * personalTurnoFactor * personalTurnoUnits);
          totalConPersonalTurno = roundTo2Decimals(totalAntesHorasExtras + totalPersonalTurno);
        }
      }
      
      const valorHora = roundTo2Decimals(totalConPersonalTurno / 156);
      const montoUnitario = roundTo2Decimals(valorHora * factor);
      return roundTo2Decimals(montoUnitario * unidadesNum);
    }
  }

  // Para conceptos con porcentaje (bonificaciones normales)
  if (!concepto.porcentaje) return 0;
  const porcentaje = Number(concepto.porcentaje) || 0;

  let baseCalculo = 0;
  if (isLuzYFuerza && !isDescuento) {
    // Para Luz y Fuerza: CONCEPTO_LYF y TITULO_LYF se calculan sobre categoría 11
    if (concepto.tipo === 'CONCEPTO_LYF' || concepto.tipo === 'TITULO_LYF') {
      if (!baseCalculoConcepto || baseCalculoConcepto === 'BASICO_CATEGORIA_11' || baseCalculoConcepto === 'basico_categoria_11') {
        baseCalculo = basicoCat11;
      } else {
        baseCalculo = basicoCat11;
      }
    }
  } else {
    baseCalculo = basicoEmpleado;
  }

  if (baseCalculo <= 0) return 0;
  const montoUnitario = roundTo2Decimals((baseCalculo * porcentaje) / 100);
  return roundTo2Decimals(montoUnitario * unidadesNum);
};

/**
 * Calcula el total de descuentos desde conceptosSeleccionados (para NewEmployeeModal/EmployeeEditModal)
 * @param {Object} conceptosSeleccionados - Objeto con conceptos seleccionados
 * @param {Array} conceptos - Array de conceptos del catálogo
 * @param {number} totalRemuneraciones - Total de remuneraciones
 * @returns {number} - Total de descuentos calculado
 */
export const calculateTotalDescuentosFromSeleccionados = (
  conceptosSeleccionados,
  conceptos,
  totalRemuneraciones
) => {
  // PASO 1: Calcular primero los descuentos que NO usan TOTAL_NETO
  let descuentosNoTotalNeto = 0;
  
  Object.keys(conceptosSeleccionados).forEach(conceptId => {
    const concepto = conceptos.find(c => c.id === conceptId);
    if (!concepto) return;
    const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO' || concepto.tipo === 'DESCUENTO_LYF' || concepto.tipo === 'DESCUENTO_UOCRA';
    if (!isDescuento) return;
    
    const units = conceptosSeleccionados[conceptId]?.units ?? '';
    const unitsNum = Number(units);
    if (!unitsNum || unitsNum <= 0) return;
    
    // DESCUENTO_LYF y DESCUENTO_UOCRA: siempre usan porcentaje del catálogo sobre totalRemuneraciones
    if (concepto.tipo === 'DESCUENTO_LYF' || concepto.tipo === 'DESCUENTO_UOCRA') {
      if (concepto.porcentaje && totalRemuneraciones > 0) {
        const montoUnitario = roundTo2Decimals((totalRemuneraciones * concepto.porcentaje / 100));
        descuentosNoTotalNeto = roundTo2Decimals(descuentosNoTotalNeto + Math.abs(montoUnitario * (unitsNum || 1)));
      }
    } 
    // DESCUENTO: verificar baseCalculo solo para este tipo
    else if (concepto.tipo === 'DESCUENTO') {
      const baseCalculoDescuento = concepto?.baseCalculo ?? concepto?.base_calculo;
      const usaTotalBruto = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto';
      const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
      
      if (usaTotalBruto && totalRemuneraciones > 0) {
        const porcentajeDescuento = Number(concepto.porcentaje) || 0;
        if (porcentajeDescuento > 0) {
          descuentosNoTotalNeto = roundTo2Decimals(descuentosNoTotalNeto + Math.abs(roundTo2Decimals(totalRemuneraciones * porcentajeDescuento / 100)));
        }
      } else if (!usaTotalNeto && concepto.porcentaje && totalRemuneraciones > 0) {
        // Comportamiento tradicional
        const montoUnitario = roundTo2Decimals((totalRemuneraciones * concepto.porcentaje / 100));
        descuentosNoTotalNeto = roundTo2Decimals(descuentosNoTotalNeto + Math.abs(montoUnitario * (unitsNum || 1)));
      }
      // Si usa TOTAL_NETO, se calculará después
    }
  });
  
  // PASO 2: Calcular neto preliminar
  const netoPreliminar = roundTo2Decimals(totalRemuneraciones - descuentosNoTotalNeto);
  
  // PASO 3: Calcular descuentos que usan TOTAL_NETO sobre el neto preliminar
  let descuentosConTotalNeto = 0;
  Object.keys(conceptosSeleccionados).forEach(conceptId => {
    const concepto = conceptos.find(c => c.id === conceptId);
    if (!concepto) return;
    if (concepto.tipo !== 'DESCUENTO') return; // Solo DESCUENTO puede usar TOTAL_NETO
    
    const units = conceptosSeleccionados[conceptId]?.units ?? '';
    const unitsNum = Number(units);
    if (!unitsNum || unitsNum <= 0) return;
    
    const baseCalculoDescuento = concepto?.baseCalculo ?? concepto?.base_calculo;
    const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
    
    if (usaTotalNeto && netoPreliminar > 0) {
      const nombreDescuento = (concepto.nombre || '').toLowerCase();
      const esCuotaAlimentaria = nombreDescuento.includes('cuota') && nombreDescuento.includes('alimentaria');
      
      if (esCuotaAlimentaria) {
        const cantidadComoPorcentaje = unitsNum;
        if (cantidadComoPorcentaje > 0) {
          descuentosConTotalNeto = roundTo2Decimals(descuentosConTotalNeto + Math.abs(roundTo2Decimals(netoPreliminar * cantidadComoPorcentaje / 100)));
        }
      } else {
        const porcentajeDescuento = Number(concepto.porcentaje) || 0;
        if (porcentajeDescuento > 0) {
          const montoUnitario = roundTo2Decimals((netoPreliminar * porcentajeDescuento) / 100);
          descuentosConTotalNeto = roundTo2Decimals(descuentosConTotalNeto + Math.abs(montoUnitario * (unitsNum || 1)));
        }
      }
    }
  });
  
  return roundTo2Decimals(descuentosNoTotalNeto + descuentosConTotalNeto);
};

