import * as api from './empleadosAPI';

// Calcula solo los años de antigüedad (número entero)
const calculateAniosAntiguedad = (fechaIngreso) => {
  if (!fechaIngreso) return 0;
  
  try {
    const fechaIngresoDate = new Date(fechaIngreso);
    const fechaActual = new Date();
    
    if (Number.isNaN(fechaIngresoDate.getTime())) return 0;
    
    // Calcular diferencia en años y meses
    let años = fechaActual.getFullYear() - fechaIngresoDate.getFullYear();
    let meses = fechaActual.getMonth() - fechaIngresoDate.getMonth();
    
    // Ajustar si el mes actual es menor que el mes de ingreso
    if (meses < 0) {
      años--;
      meses += 12;
    }
    
    // Ajustar si el día actual es menor que el día de ingreso (considerar mes completo)
    if (fechaActual.getDate() < fechaIngresoDate.getDate()) {
      meses--;
      if (meses < 0) {
        años--;
        meses += 12;
      }
    }
    
    return Math.max(0, años); // Retornar solo los años, mínimo 0
  } catch (error) {
    console.error('Error al calcular años de antigüedad:', error);
    return 0;
  }
};

// Normaliza strings para comparar sin importar mayúsculas, tildes, espacios, etc.
const normalize = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Determina qué concepto de "Suplemento antigüedad" debe asignarse según antigüedad y sexo
 * @param {number} añosAntiguedad - Años de antigüedad del empleado
 * @param {string} sexo - Sexo del empleado ('M' o 'F')
 * @returns {string|null} Nombre del concepto a asignar o null si no aplica
 */
const determinarSuplementoAntiguedad = (añosAntiguedad, sexo) => {
  if (añosAntiguedad < 10) {
    return null; // Menos de 10 años, no aplica
  }

  const sexoNormalizado = (sexo || '').toString().toUpperCase().trim();
  
  if (sexoNormalizado === 'M' || sexoNormalizado === 'MASCULINO') {
    // Masculino: entre 10 y 24, o más de 25
    if (añosAntiguedad >= 10 && añosAntiguedad <= 24) {
      return 'Suplemento Antigüedad entre 10 y 24';
    } else if (añosAntiguedad >= 25) {
      return 'Suplemento Antigüedad mas de 25';
    }
  } else if (sexoNormalizado === 'F' || sexoNormalizado === 'FEMENINO') {
    // Femenino: entre 10 a 21, o más de 22
    if (añosAntiguedad >= 10 && añosAntiguedad <= 21) {
      return 'Suplemento Antigüedad entre 10 a 21';
    } else if (añosAntiguedad >= 22) {
      return 'Suplemento Antigüedad mas de 22';
    }
  }
  
  return null;
};

/**
 * Actualiza automáticamente las unidades del concepto "Bonif Antigüedad" 
 * y asigna/actualiza los conceptos de "Suplemento antigüedad"
 * para todos los empleados activos de LUZ_Y_FUERZA cuando cumplen un año más.
 * 
 * La antigüedad se calcula dinámicamente y no se guarda, solo se actualiza
 * la cantidad (unidades) del concepto "Bonif Antigüedad" cuando los años completos cambian.
 * 
 * Para "Suplemento antigüedad", se asigna automáticamente el concepto correcto
 * según la antigüedad y el sexo del empleado.
 * 
 * @returns {Promise<{updated: number, errors: number}>} Número de empleados actualizados y errores
 */
export const actualizarAntiguedadAutomatica = async () => {
  try {
    // Obtener todos los empleados activos
    const empleados = await api.getEmployees();
    const empleadosActivos = empleados.filter(emp => 
      emp.estado === 'ACTIVO' || emp.status === 'Activo'
    );

    // Filtrar solo empleados de LUZ_Y_FUERZA
    const empleadosLyF = empleadosActivos.filter(emp => {
      const gremioNombre = emp.gremio?.nombre || emp.gremio || '';
      return normalize(gremioNombre).includes('luz') && normalize(gremioNombre).includes('fuerza');
    });

    if (empleadosLyF.length === 0) {
      console.log('No hay empleados de LUZ_Y_FUERZA para actualizar');
      return { updated: 0, errors: 0 };
    }

    let updated = 0;
    let errors = 0;

    // Procesar cada empleado
    for (const empleado of empleadosLyF) {
      try {
        // Calcular años de antigüedad actuales
        const añosAntiguedad = calculateAniosAntiguedad(empleado.inicioActividad);
        
        if (añosAntiguedad < 1) {
          // Si tiene menos de 1 año, no necesita el concepto
          continue;
        }

        // Obtener datos completos del empleado para tener el sexo
        const empleadoCompleto = await api.getEmpleadoByLegajo(empleado.legajo);
        const sexoEmpleado = empleadoCompleto.sexo || empleado.sexo;

        // Obtener conceptos asignados del empleado
        const conceptosAsignadosRaw = await api.getConceptosAsignados(empleado.legajo);
        
        // Filtrar solo conceptos de tipo CONCEPTO_LYF (y otros tipos relevantes)
        const conceptosAsignados = conceptosAsignadosRaw.filter(
          asignado => asignado.tipoConcepto === 'CONCEPTO_LYF' || 
                      asignado.tipoConcepto === 'CONCEPTO_UOCRA' || 
                      asignado.tipoConcepto === 'DESCUENTO' ||
                      asignado.tipoConcepto === 'HORA_EXTRA_LYF'
        );
        
        // Obtener catálogo de conceptos LyF
        const conceptosLyF = await api.getConceptosLyF();
        
        let necesitaActualizacion = false;
        let mensajeActualizacion = '';

        // 1. Procesar "Bonif Antigüedad"
        const conceptoBonifAntiguedad = conceptosLyF.find(c => {
          const nombreNormalizado = normalize(c.nombre || c.descripcion || '');
          return nombreNormalizado.includes('bonif antiguedad') || 
                 nombreNormalizado.includes('bonif antigüedad');
        });
        
        const conceptoAntiguedad = conceptoBonifAntiguedad ? conceptosAsignados.find(asignado => {
          return asignado.tipoConcepto === 'CONCEPTO_LYF' && 
                 Number(asignado.idReferencia) === Number(conceptoBonifAntiguedad.idBonificacion || conceptoBonifAntiguedad.id);
        }) : null;

        if (conceptoAntiguedad) {
          const unidadesActuales = Number(conceptoAntiguedad.unidades) || 0;
          if (unidadesActuales !== añosAntiguedad) {
            necesitaActualizacion = true;
            mensajeActualizacion += `Bonif Antigüedad: ${unidadesActuales} → ${añosAntiguedad} años. `;
          }
        }

        // 2. Procesar "Suplemento antigüedad"
        const suplementoRequerido = determinarSuplementoAntiguedad(añosAntiguedad, sexoEmpleado);
        
        // Buscar todos los conceptos de suplemento antigüedad en el catálogo
        const conceptosSuplemento = conceptosLyF.filter(c => {
          const nombreNormalizado = normalize(c.nombre || c.descripcion || '');
          return nombreNormalizado.includes('suplemento antiguedad') || 
                 nombreNormalizado.includes('suplemento antigüedad');
        });

        // Buscar qué suplementos tiene asignados actualmente
        const suplementosAsignados = conceptosAsignados.filter(asignado => {
          if (asignado.tipoConcepto !== 'CONCEPTO_LYF') return false;
          return conceptosSuplemento.some(sup => 
            Number(asignado.idReferencia) === Number(sup.idBonificacion || sup.id)
          );
        });

        // Determinar qué concepto de suplemento debería tener
        let conceptoSuplementoCorrecto = null;
        if (suplementoRequerido) {
          const requeridoNormalizado = normalize(suplementoRequerido);
          // Extraer la parte clave del nombre (ej: "entre 10 y 24", "mas de 25")
          const partesClave = requeridoNormalizado
            .replace('suplemento antiguedad', '')
            .trim()
            .split(/\s+/)
            .filter(p => p.length > 0);
          
          conceptoSuplementoCorrecto = conceptosSuplemento.find(c => {
            const nombreNormalizado = normalize(c.nombre || c.descripcion || '');
            // Verificar que el nombre normalizado contenga todas las partes clave
            return partesClave.every(parte => nombreNormalizado.includes(parte));
          });
        }

        // Verificar si necesita actualizar suplementos
        // Siempre verificar si tiene el suplemento correcto Y si tiene suplementos incorrectos
        const suplementoCorrectoAsignado = conceptoSuplementoCorrecto ? suplementosAsignados.some(asignado => 
          Number(asignado.idReferencia) === Number(conceptoSuplementoCorrecto.idBonificacion || conceptoSuplementoCorrecto.id)
        ) : false;

        // Verificar si tiene suplementos incorrectos (diferentes al requerido)
        const tieneSuplementosIncorrectos = suplementosAsignados.some(asignado => {
          if (!conceptoSuplementoCorrecto) return true; // Si no debería tener ninguno, cualquier suplemento es incorrecto
          return Number(asignado.idReferencia) !== Number(conceptoSuplementoCorrecto.idBonificacion || conceptoSuplementoCorrecto.id);
        });

        if (suplementoRequerido) {
          // Debe tener un suplemento
          if (!suplementoCorrectoAsignado || tieneSuplementosIncorrectos) {
            necesitaActualizacion = true;
            if (suplementosAsignados.length > 0) {
              mensajeActualizacion += `Suplemento antigüedad: reemplazado por "${suplementoRequerido}". `;
            } else {
              mensajeActualizacion += `Suplemento antigüedad: asignado "${suplementoRequerido}". `;
            }
          }
        } else if (suplementosAsignados.length > 0) {
          // No debería tener suplemento pero lo tiene, removerlo
          necesitaActualizacion = true;
          mensajeActualizacion += `Suplemento antigüedad: removido (antigüedad < 10 años). `;
        }

        // Si no necesita actualización, continuar con el siguiente empleado
        if (!necesitaActualizacion) {
          continue;
        }

        // Construir lista de conceptos para actualizar
        // IMPORTANTE: Siempre mantener "Bonif Antigüedad", solo excluir suplementos
        const conceptosParaActualizar = conceptosAsignadosRaw.map(asignado => {
          // Si es el concepto de Bonif Antigüedad, actualizar las unidades pero SIEMPRE mantenerlo
          const esBonifAntiguedad = conceptoBonifAntiguedad && asignado.tipoConcepto === 'CONCEPTO_LYF' && 
                                    Number(asignado.idReferencia) === Number(conceptoBonifAntiguedad.idBonificacion || conceptoBonifAntiguedad.id);
          
          // Si es un suplemento antigüedad, excluirlo (lo manejaremos después)
          // Esto asegura que se quiten TODOS los suplementos antiguos antes de agregar el correcto
          const esSuplemento = asignado.tipoConcepto === 'CONCEPTO_LYF' && 
                               conceptosSuplemento.some(sup => 
                                 Number(asignado.idReferencia) === Number(sup.idBonificacion || sup.id)
                               );
          
          if (esSuplemento) {
            return null; // Excluir TODOS los suplementos (se agregará el correcto después si corresponde)
          }
          
          // Mantener todos los demás conceptos, incluyendo "Bonif Antigüedad"
          return {
            idEmpleadoConcepto: asignado.idEmpleadoConcepto || null,
            legajo: Number(empleado.legajo),
            tipoConcepto: asignado.tipoConcepto,
            idReferencia: Number(asignado.idReferencia),
            unidades: esBonifAntiguedad ? añosAntiguedad : (Number(asignado.unidades) || 1)
          };
        }).filter(c => c !== null); // Remover nulls (suplementos excluidos)

        // Agregar el suplemento correcto si corresponde
        if (conceptoSuplementoCorrecto) {
          conceptosParaActualizar.push({
            idEmpleadoConcepto: null, // Nuevo concepto o reemplazo
            legajo: Number(empleado.legajo),
            tipoConcepto: 'CONCEPTO_LYF',
            idReferencia: Number(conceptoSuplementoCorrecto.idBonificacion || conceptoSuplementoCorrecto.id),
            unidades: 1 // Siempre 1 unidad
          });
        }
        
        // También incluir otros tipos de conceptos (áreas, categoría-zona, etc.)
        const otrosConceptos = conceptosAsignadosRaw.filter(
          a => a.tipoConcepto === 'BONIFICACION_AREA' || a.tipoConcepto === 'CATEGORIA_ZONA'
        );
        otrosConceptos.forEach(concepto => {
          // Verificar que no esté ya incluido
          const yaIncluido = conceptosParaActualizar.some(
            c => c.tipoConcepto === concepto.tipoConcepto && 
                 c.idReferencia === Number(concepto.idReferencia)
          );
          if (!yaIncluido) {
            conceptosParaActualizar.push({
              idEmpleadoConcepto: concepto.idEmpleadoConcepto || null,
              legajo: Number(empleado.legajo),
              tipoConcepto: concepto.tipoConcepto,
              idReferencia: Number(concepto.idReferencia),
              unidades: Number(concepto.unidades) || 1
            });
          }
        });
        
        // Construir payload para actualizar
        const payload = {
          legajo: Number(empleado.legajo),
          nombre: empleadoCompleto.nombre || empleado.nombre,
          apellido: empleadoCompleto.apellido || empleado.apellido,
          cuil: empleadoCompleto.cuil || empleado.cuil || null,
          inicioActividad: empleadoCompleto.inicioActividad || empleado.inicioActividad 
            ? new Date(empleadoCompleto.inicioActividad || empleado.inicioActividad).toISOString().split('T')[0] 
            : null,
          domicilio: empleadoCompleto.domicilio || empleado.domicilio || null,
          banco: empleadoCompleto.banco || empleado.banco || null,
          cuenta: empleadoCompleto.cuenta || empleado.cuenta || null,
          idCategoria: empleadoCompleto.idCategoria || empleado.idCategoria ? Number(empleadoCompleto.idCategoria || empleado.idCategoria) : null,
          idAreas: empleadoCompleto.areas || empleado.areas 
            ? (Array.isArray(empleadoCompleto.areas || empleado.areas) 
                ? (empleadoCompleto.areas || empleado.areas).map(a => Number(a.id || a))
                : [Number(empleadoCompleto.areas || empleado.areas)])
            : null,
          sexo: empleadoCompleto.sexo || empleado.sexo || null,
          idGremio: empleadoCompleto.idGremio || empleado.idGremio ? Number(empleadoCompleto.idGremio || empleado.idGremio) : null,
          idZonaUocra: empleadoCompleto.idZonaUocra || empleado.idZonaUocra ? Number(empleadoCompleto.idZonaUocra || empleado.idZonaUocra) : null,
          estado: 'ACTIVO',
          conceptosAsignados: conceptosParaActualizar
        };

        // Actualizar el empleado
        await api.updateEmployee(empleado.legajo, payload);
        updated++;
        
        console.log(`Empleado ${empleado.legajo} (${empleado.nombre} ${empleado.apellido}): ${mensajeActualizacion.trim()}`);
      } catch (error) {
        console.error(`Error al actualizar empleado ${empleado.legajo}:`, error);
        errors++;
      }
    }

    return { updated, errors };
  } catch (error) {
    console.error('Error en actualizarAntiguedadAutomatica:', error);
    return { updated: 0, errors: 1 };
  }
};

