/**
 * Utilidades para trabajar con conceptos
 * 
 * Este archivo exporta funciones helper para ordenar y clasificar conceptos
 */

/**
 * Determina si un concepto es una remuneración
 * @param {Object} concepto - El concepto a evaluar
 * @param {string} concepto.tipoConcepto - Tipo del concepto (para conceptos del backend)
 * @param {string} concepto.tipo - Tipo del concepto (para conceptos del frontend)
 * @returns {boolean} - true si es una remuneración, false en caso contrario
 */
export const isRemuneration = (concepto) => {
  const tipo = concepto.tipoConcepto || concepto.tipo;
  return (
    tipo === 'CATEGORIA' ||
    tipo === 'CONCEPTO_LYF' ||
    tipo === 'CONCEPTO_UOCRA' ||
    tipo === 'TITULO_LYF' ||
    tipo === 'CONCEPTO_MANUAL_LYF' ||
    tipo === 'BONIFICACION_AREA' ||
    tipo === 'HORA_EXTRA_LYF' ||
    tipo === 'AGUINALDO' ||
    tipo === 'VACACIONES' ||
    tipo === 'CATEGORIA_ZONA'
  );
};

/**
 * Determina si un concepto es un descuento
 * @param {Object} concepto - El concepto a evaluar
 * @param {string} concepto.tipoConcepto - Tipo del concepto (para conceptos del backend)
 * @param {string} concepto.tipo - Tipo del concepto (para conceptos del frontend)
 * @param {boolean} concepto.isDescuento - Flag que indica si es descuento (para algunos casos)
 * @returns {boolean} - true si es un descuento, false en caso contrario
 */
export const isDeduction = (concepto) => {
  const tipo = concepto.tipoConcepto || concepto.tipo;
  return (
    tipo === 'DESCUENTO' ||
    tipo === 'DESCUENTO_LYF' ||
    tipo === 'DESCUENTO_UOCRA' ||
    concepto.isDescuento === true
  );
};

/**
 * Ordena un array de conceptos: primero remuneraciones, luego descuentos
 * Dentro de cada grupo mantiene el orden original
 * @param {Array} conceptos - Array de conceptos a ordenar
 * @returns {Array} - Array de conceptos ordenados
 */
export const sortConceptos = (conceptos) => {
  if (!Array.isArray(conceptos)) {
    return [];
  }

  return [...conceptos].sort((a, b) => {
    const aIsRemuneration = isRemuneration(a);
    const aIsDeduction = isDeduction(a);
    const bIsRemuneration = isRemuneration(b);
    const bIsDeduction = isDeduction(b);

    // Remuneraciones primero (retornar -1), descuentos después (retornar 1)
    if (aIsRemuneration && bIsDeduction) return -1;
    if (aIsDeduction && bIsRemuneration) return 1;
    
    // Si ambos son del mismo tipo, mantener orden original
    return 0;
  });
};

