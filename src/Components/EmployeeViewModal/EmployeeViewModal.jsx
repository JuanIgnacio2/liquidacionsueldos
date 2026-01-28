import { useState, useEffect } from 'react';
import { Modal } from '../Modal/Modal';
import { User, DollarSign, Building, FileText, ListChecks, Edit } from 'lucide-react';
import * as api from "../../services/empleadosAPI";
import { sortConceptos, isDeduction } from '../../utils/conceptosUtils';
import EmployeePayrollHistoryModal from '../EmployeePayrollHistoryModal/EmployeePayrollHistoryModal';
import { useNotification } from '../../Hooks/useNotification';
import {
  roundTo2Decimals,
  calculateTotalRemunerativo,
  calculateHorasExtrasLyF,
  calculateDescuentos,
  calculateTotals,
  isBonifAntiguedad,
  isConceptoCalculadoSobreTotalBruto,
  isPersonalDeTurno
} from '../../utils/salaryCalculations';

// Función helper para formatear moneda en formato argentino ($100.000,00)
const formatCurrencyAR = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0,00';
  const numValue = Number(value);
  const absValue = Math.abs(numValue);
  const parts = absValue.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${integerPart},${parts[1]}`;
};


// Calcula la antigüedad del empleado en formato AA/MM (Años/Meses)
const calculateAntiguedad = (fechaIngreso) => {
  if (!fechaIngreso) return '—';
  
  try {
    const fechaIngresoDate = new Date(fechaIngreso);
    const fechaActual = new Date();
    
    if (Number.isNaN(fechaIngresoDate.getTime())) return '—';
    
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
    
    // Formatear con ceros a la izquierda
    const añosStr = String(años).padStart(2, '0');
    const mesesStr = String(meses).padStart(2, '0');
    
    return `${añosStr}/${mesesStr}`;
  } catch (error) {
    console.error('Error al calcular antigüedad:', error);
    return '—';
  }
};

export function EmployeeViewModal({ isOpen, onClose, employee, onLiquidarSueldo, onHistorialLiquidaciones, onEditEmployee }) {
  const [conceptosAsignados, setConceptosAsignados] = useState([]);
  const [loadingConceptos, setLoadingConceptos] = useState(false);
  const [zonas, setZonas] = useState([]);
  const [categoriaBasico, setCategoriaBasico] = useState(0);
  const [salarioBasico, setSalarioBasico] = useState(0);
  const [showPayrollHistoryModal, setShowPayrollHistoryModal] = useState(false);
  const [sueldoBruto, setSueldoBruto] = useState(0);
  const [totalDescuentos, setTotalDescuentos] = useState(0);
  const [sueldoNeto, setSueldoNeto] = useState(0);
  const { notify } = useNotification();

  useEffect(() => {
    const loadConceptosAsignados = async () => {
      if (!employee || !isOpen) return;

      setLoadingConceptos(true);
      try {
        // Cargar conceptos asignados del empleado
        const asignados = await api.getConceptosAsignados(employee.legajo);

        // Determinar el gremio del empleado
        let gremioNombre = '';
        if (employee.gremioNombre) {
          gremioNombre = employee.gremioNombre;
        } else if (employee.gremio) {
          gremioNombre = typeof employee.gremio === 'string' ? employee.gremio : (employee.gremio.nombre || '');
        }
        const gremioUpper = String(gremioNombre || '').toUpperCase();
        const isLuzYFuerza = gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA');
        const isUocra = gremioUpper === 'UOCRA';
        
        // Cargar catálogos necesarios según el gremio
        let bonificacionesFijas = [];
        let titulosLyF = [];
        if (isLuzYFuerza) {
          bonificacionesFijas = await api.getConceptosLyF();
          try {
            titulosLyF = await api.getTitulosLyF();
          } catch (error) {
            console.error('Error al cargar títulos LYF:', error);
          }
        } else if (isUocra) {
          bonificacionesFijas = await api.getConceptosUocra();
        }
        
        const descuentos = await api.getDescuentos();
        const areasData = await api.getAreas();
      
        // Cargar conceptos manuales LYF si es Luz y Fuerza
        let conceptosManualesLyF = [];
        if (isLuzYFuerza) {
          try {
            conceptosManualesLyF = await api.getConceptosManualesLyF();
          } catch (error) {
            console.error('Error al cargar conceptos manuales LYF:', error);
          }
        }
        
        // Cargar horas extras LYF si es Luz y Fuerza
        let horasExtrasLyF = [];
        if (isLuzYFuerza) {
          try {
            horasExtrasLyF = await api.getHorasExtrasLyF();
          } catch (error) {
            console.error('Error al cargar horas extras LYF:', error);
          }
        }

        let descuentosLyF = [];
        if (isLuzYFuerza) {
          try {
            descuentosLyF = await api.getDescuentosLyF();
          } catch (error) {
            console.error('Error al cargar descuentos LYF:', error);
          }
        }
        
        let descuentosUocra = [];
        if (isUocra) {
          try {
            descuentosUocra = await api.getDescuentosUocra();
          } catch (error) {
            console.error('Error al cargar descuentos UOCRA:', error);
          }
        }
        
        // Cargar zonas para UOCRA
        let zonasData = [];
        if (isUocra) {
          try {
            zonasData = await api.getZonas();
            setZonas(zonasData);
          } catch (error) {
            console.error('Error al cargar zonas:', error);
          }
        }

        // Obtener el básico de categoría 11 para cálculos
        let basicoCat11 = categoriaBasico;
        if (basicoCat11 === 0) {
          try {
            const cat11 = await api.getCategoriaById(11);
            basicoCat11 = cat11?.basico ?? cat11?.salarioBasico ?? cat11?.sueldoBasico ?? cat11?.monto ?? cat11?.salario ?? 0;
            setCategoriaBasico(Number(basicoCat11) || 0);
          } catch (error) {
            console.error('Error al obtener categoría 11:', error);
          }
        }

        // Obtener el salario básico del empleado según su gremio
        let basicoEmpleado = 0;
        try {
          const idZona = employee.idZona || employee.idZonaUocra;
          if (isUocra && employee.idCategoria && idZona) {
            // Para UOCRA: obtener básico por categoría y zona
            const basicoData = await api.getBasicoByCatAndZona(employee.idCategoria, idZona);
            basicoEmpleado = Number(basicoData?.basico ?? basicoData?.salarioBasico ?? basicoData?.monto ?? basicoData?.salario ?? 0);
          } else if (employee.idCategoria) {
            // Para Luz y Fuerza o Convenio General: obtener básico de la categoría
            const categoria = await api.getCategoriaById(employee.idCategoria);
            basicoEmpleado = Number(categoria?.basico ?? categoria?.salarioBasico ?? categoria?.sueldoBasico ?? categoria?.monto ?? categoria?.salario ?? 0);
          }
          setSalarioBasico(basicoEmpleado);
        } catch (error) {
          console.error('Error al obtener salario básico del empleado:', error);
          setSalarioBasico(0);
          basicoEmpleado = 0;
        }

        // Mapear los conceptos asignados (usando basicoEmpleado calculado arriba)
        const mappedConceptos = await Promise.all(
          asignados.map(async (asignado) => {
            let concepto = null;
            let area = null;
            let nombre = '';
            let porcentaje = null;
            let unidades = asignado.unidades || 1;
            let tipoConcepto = asignado.tipoConcepto;
            let isDescuento = false;
            // Manejar HORAS_EXTRAS_LYF
            if (asignado.tipoConcepto === 'HORA_EXTRA_LYF') {
              const horaExtra = horasExtrasLyF.find(he => 
                (he.idHoraExtra ?? he.id) === asignado.idReferencia
              );
              if (horaExtra) {
                nombre = horaExtra.descripcion ?? horaExtra.codigo ?? (asignado.idReferencia === 1 ? 'Horas Extras Simples' : 'Horas Extras Dobles');
                porcentaje = null; // Las horas extras no usan porcentaje, usan factor
              } else {
                // Fallback si no se encuentra en el catálogo
                nombre = asignado.idReferencia === 1 ? 'Horas Extras Simples' : 'Horas Extras Dobles';
                porcentaje = null;
              }
            } else if (asignado.tipoConcepto === 'TITULO_LYF') {
              concepto = titulosLyF.find(t => 
                (t.idTituloLyF ?? t.id) === asignado.idReferencia
              );
              if (concepto) {
                nombre = concepto.nombre ?? concepto.descripcion ?? '';
                porcentaje = concepto.porcentaje ?? null;
              }
            } else if (asignado.tipoConcepto === 'CONCEPTO_LYF' || 
                asignado.tipoConcepto === 'CONCEPTO_UOCRA') {
              concepto = bonificacionesFijas.find(b => 
                (b.idBonificacion ?? b.id) === asignado.idReferencia
              );
              if (concepto) {
                nombre = concepto.nombre ?? concepto.descripcion ?? '';
                porcentaje = concepto.porcentaje ?? null;
              }
            } else if (asignado.tipoConcepto === 'DESCUENTO') {
              concepto = descuentos.find(d => 
                (d.idDescuento ?? d.id) === asignado.idReferencia
              );
              if (concepto) {
                nombre = concepto.nombre ?? concepto.descripcion ?? '';
                porcentaje = concepto.porcentaje ?? null;
                isDescuento = true;
              }
            }
            else if (asignado.tipoConcepto === 'DESCUENTO_LYF') {
              concepto = descuentosLyF.find(d => 
                (d.idDescuentoLyF ?? d.idDescuento ?? d.id) === asignado.idReferencia
              );
              if (concepto) {
                nombre = concepto.nombre ?? concepto.descripcion ?? '';
                porcentaje = concepto.porcentaje ?? null;
                isDescuento = true;
              }
            } else if (asignado.tipoConcepto === 'DESCUENTO_UOCRA') {
              concepto = descuentosUocra.find(d => 
                (d.idDescuentoUocra ?? d.idDescuento ?? d.id) === asignado.idReferencia
              );
              if (concepto) {
                nombre = concepto.nombre ?? concepto.descripcion ?? '';
                porcentaje = concepto.porcentaje ?? null;
                isDescuento = true;
              }
            } else if (asignado.tipoConcepto === 'BONIFICACION_AREA') {
              // Buscar el área
              area = areasData.find(a => a.idArea === asignado.idReferencia);
              if (area) {
                nombre = area.nombre || `Área ${asignado.idReferencia}`;
                // Obtener porcentaje de área
                try {
                  const porcentajeResponse = await api.getPorcentajeArea(asignado.idReferencia, employee.idCategoria);
                  porcentaje = typeof porcentajeResponse === 'number' 
                    ? porcentajeResponse 
                    : Number(porcentajeResponse?.porcentaje ?? porcentajeResponse) || 0;
                } catch (error) {
                  console.error(`Error al obtener porcentaje para área ${asignado.idReferencia}:`, error);
                  porcentaje = 0;
                }
              }
            } else if (asignado.tipoConcepto === 'CATEGORIA_ZONA') {
              // CATEGORIA_ZONA es solo para cálculos de referencia en UOCRA, no se muestra ni se suma
              // Retornar null para que se filtre
              return null;
            } else if (asignado.tipoConcepto === 'CONCEPTO_MANUAL_LYF') {
              concepto = conceptosManualesLyF.find(cm => 
                (cm.idConceptosManualesLyF ?? cm.id) === asignado.idReferencia
              );
              if (concepto) {
                nombre = concepto.nombre ?? concepto.descripcion ?? '';
                porcentaje = null; // Los conceptos manuales LYF no usan porcentaje, usan monto fijo
              } else {
                // Fallback si no se encuentra en el catálogo
                nombre = asignado.nombre ?? asignado.descripcion ?? 'Concepto Manual LYF';
                porcentaje = null;
              }
            }

            if (!nombre && !concepto && !area && asignado.tipoConcepto !== 'HORA_EXTRA_LYF' && asignado.tipoConcepto !== 'CONCEPTO_MANUAL_LYF') return null;

            // Calcular total si hay porcentaje y básico
            // Para bonificaciones de área: calcular sobre el básico de categoría 11
            // Para conceptos CONCEPTO_LYF (Luz y Fuerza): 
            //   - Si baseCalculo === 'BASICO_CATEGORIA_11' o no tiene campo: calcular sobre categoría 11
            //   - Si baseCalculo === 'TOTAL_BRUTO': se calculará después sobre el total bruto
            // Para conceptos CONCEPTO_UOCRA: calcular sobre el salario básico del empleado
            // Para HORAS_EXTRAS_LYF: se calculará después usando la fórmula especial
            // Para descuentos: se calculará después sobre el total de remuneraciones
            // Para "Bonif Antigüedad": fórmula especial (basicoCat11 * 1.4) * porcentaje / 100 * unidades
            // Para otros conceptos especiales (Suplementos, ART): se calcularán después sobre el total bruto
            let total = 0;
            const esBonifAntiguedad = isBonifAntiguedad(nombre) && isLuzYFuerza;
            
            // Verificar si el concepto tiene baseCalculo = 'TOTAL_REMUNERATIVO' (reemplaza TOTAL_BRUTO)
            const baseCalculoConcepto = concepto?.baseCalculo ?? concepto?.base_calculo;
            const usaTotalRemunerativo = baseCalculoConcepto === 'TOTAL_REMUNERATIVO' || baseCalculoConcepto === 'total_remunerativo' || 
                                        baseCalculoConcepto === 'TOTAL_BRUTO' || baseCalculoConcepto === 'total_bruto'; // Compatibilidad hacia atrás
            
            // Detectar conceptos especiales por nombre (compatibilidad hacia atrás)
            const esConceptoEspecial = (isConceptoCalculadoSobreTotalBruto(nombre) || usaTotalRemunerativo) && isLuzYFuerza;
            
            if (asignado.tipoConcepto === 'HORA_EXTRA_LYF') {
              // Las horas extras se calcularán después, por ahora dejamos total en 0
              total = 0;
            } else if (asignado.tipoConcepto === 'CONCEPTO_MANUAL_LYF') {
              // Conceptos manuales LYF: usar monto fijo del concepto (siempre cantidad 1)
              const conceptoManual = conceptosManualesLyF.find(cm => 
                (cm.idConceptosManualesLyF ?? cm.id) === asignado.idReferencia
              );
              if (conceptoManual) {
                const montoFijo = Number(conceptoManual.monto ?? conceptoManual.valor ?? 0);
                total = montoFijo * 1; // Siempre cantidad 1
              }
            } else if (esBonifAntiguedad && porcentaje) {
              // "Bonif Antigüedad": (basicoCat11 * 1.4) * porcentaje / 100 * unidades
              if (basicoCat11 > 0) {
                const baseCalculo = roundTo2Decimals(basicoCat11 * 1.4);
                const montoUnitario = roundTo2Decimals((baseCalculo * porcentaje) / 100);
                total = roundTo2Decimals(montoUnitario * unidades);
              }
            } else if (porcentaje && !isDescuento && !esConceptoEspecial) {
              // No calcular conceptos especiales aquí, se recalcularán después sobre el total bruto
              let baseCalculo = 0;
              if (asignado.tipoConcepto === 'BONIFICACION_AREA') {
                // Bonificaciones de área se calculan sobre categoría 11
                baseCalculo = basicoCat11;
              } else if (asignado.tipoConcepto === 'CONCEPTO_LYF' || asignado.tipoConcepto === 'TITULO_LYF') {
                // Conceptos y títulos de Luz y Fuerza: verificar baseCalculo del concepto
                // Si baseCalculo === 'BASICO_CATEGORIA_11' o no tiene campo, usar básico cat 11
                if (!baseCalculoConcepto || baseCalculoConcepto === 'BASICO_CATEGORIA_11' || baseCalculoConcepto === 'basico_categoria_11') {
                  baseCalculo = basicoCat11;
                }
              } else if (asignado.tipoConcepto === 'CONCEPTO_UOCRA') {
                // Conceptos de UOCRA se calculan sobre el salario básico del empleado
                baseCalculo = basicoEmpleado;
              }
              
              if (baseCalculo > 0) {
                const montoUnitario = roundTo2Decimals((baseCalculo * porcentaje) / 100);
                total = roundTo2Decimals(montoUnitario * unidades);
              }
            }
            // Los descuentos y conceptos especiales (excepto Bonif Antigüedad) se calcularán después sobre el total de remuneraciones/total bruto

            return {
              id: asignado.idEmpleadoConcepto || asignado.idReferencia,
              tipoConcepto: tipoConcepto,
              nombre: nombre || 'Concepto desconocido',
              porcentaje: porcentaje,
              unidades: unidades,
              total: total,
              idReferencia: asignado.idReferencia,
              isDescuento: isDescuento,
              _esConceptoEspecial: esConceptoEspecial, // Flag para identificar y recalcular después (excluye Bonif Antigüedad)
              _esBonifAntiguedad: esBonifAntiguedad, // Flag para identificar Bonif Antigüedad
              isConceptoManualLyF: asignado.tipoConcepto === 'CONCEPTO_MANUAL_LYF', // Flag para conceptos manuales LYF
              _usaTotalRemunerativo: usaTotalRemunerativo // Flag para identificar conceptos que usan TOTAL_REMUNERATIVO
            };
          })
        );

        // Filtrar nulls primero para evitar errores en los cálculos
        let conceptosValidos = mappedConceptos.filter(Boolean);
        
        // Eliminar duplicados para UOCRA: si hay descuentos con el mismo idReferencia pero diferentes tipoConcepto (DESCUENTO vs DESCUENTO_UOCRA),
        // mantener solo el que tiene tipoConcepto DESCUENTO_UOCRA
        if (isUocra) {
          const seenDescuentos = new Map();
          const conceptosSinDuplicados = [];
          
          conceptosValidos.forEach(c => {
            if (c && (c.tipoConcepto === 'DESCUENTO' || c.tipoConcepto === 'DESCUENTO_UOCRA')) {
              const key = `${c.idReferencia}`;
              if (seenDescuentos.has(key)) {
                // Si ya existe, verificar cuál mantener
                const existing = seenDescuentos.get(key);
                if (existing.tipoConcepto === 'DESCUENTO' && c.tipoConcepto === 'DESCUENTO_UOCRA') {
                  // Reemplazar DESCUENTO con DESCUENTO_UOCRA
                  const index = conceptosSinDuplicados.findIndex(item => 
                    item.idReferencia === existing.idReferencia && 
                    (item.tipoConcepto === 'DESCUENTO' || item.tipoConcepto === 'DESCUENTO_UOCRA')
                  );
                  if (index !== -1) {
                    conceptosSinDuplicados[index] = c;
                    seenDescuentos.set(key, c);
                  }
                }
                // Si el existente es DESCUENTO_UOCRA o ambos son del mismo tipo, no agregar este
              } else {
                // Primera vez que vemos este idReferencia
                seenDescuentos.set(key, c);
                conceptosSinDuplicados.push(c);
              }
            } else {
              // No es un descuento, agregarlo directamente
              conceptosSinDuplicados.push(c);
            }
          });
          
          conceptosValidos = conceptosSinDuplicados;
        }

        // --- Calcular conceptos para Luz y Fuerza con el nuevo flujo ---
        if (isLuzYFuerza) {
          // PASO 1: Calcular TOTAL_REMUNERATIVO
          const totalRemunerativo = calculateTotalRemunerativo(
            conceptosValidos,
            basicoEmpleado,
            basicoCat11,
            bonificacionesFijas
          );

          // PASO 2: Calcular CONCEPTO_LYF con baseCalculo TOTAL_REMUNERATIVO sobre ese total
          conceptosValidos.forEach(concepto => {
            if (concepto && concepto.tipoConcepto === 'CONCEPTO_LYF' && concepto._usaTotalRemunerativo && concepto.porcentaje && totalRemunerativo > 0) {
              const montoUnitario = roundTo2Decimals((totalRemunerativo * concepto.porcentaje) / 100);
              concepto.total = roundTo2Decimals(montoUnitario * concepto.unidades);
            }
          });
          // PASO 3: Sumar CONCEPTOS_MANUALES_LYF (ya están calculados con monto fijo)
          // No hay nada que hacer aquí, ya están calculados en el mapeo inicial

          // PASO 4: Calcular HORA_EXTRA_LYF
          calculateHorasExtrasLyF(
            conceptosValidos,
            basicoEmpleado,
            basicoCat11,
            horasExtrasLyF,
            bonificacionesFijas
          );
        }

        // Calcular total bruto para UOCRA y otros gremios (Luz y Fuerza ya está calculado arriba)
        if (!isLuzYFuerza) {
          const totalBonificacionesArea = conceptosValidos
            .filter(c => c && c.tipoConcepto === 'BONIFICACION_AREA' && c.total > 0)
            .reduce((sum, c) => sum + c.total, 0);
          
          const totalConceptosLyF = conceptosValidos
            .filter(c => c && (c.tipoConcepto === 'CONCEPTO_LYF' || c.tipoConcepto === 'TITULO_LYF') && c.total > 0 && !c._esConceptoEspecial && !c._esBonifAntiguedad)
            .reduce((sum, c) => sum + c.total, 0);
          
          // Incluir conceptos UOCRA en el total bruto (excluir CATEGORIA_ZONA)
          const totalConceptosUocra = conceptosValidos
            .filter(c => c && c.tipoConcepto === 'CONCEPTO_UOCRA' && c.total > 0 && !c._esConceptoEspecial && c.tipoConcepto !== 'CATEGORIA_ZONA')
            .reduce((sum, c) => sum + c.total, 0);
          
          // Incluir "Bonif Antigüedad" en el total bruto (ya calculado con su fórmula especial)
          const totalBonifAntiguedad = conceptosValidos
            .filter(c => c && c._esBonifAntiguedad && c.total > 0 && c.tipoConcepto !== 'CATEGORIA_ZONA')
            .reduce((sum, c) => sum + c.total, 0);
          
          const totalHorasExtras = conceptosValidos
            .filter(c => c && c.tipoConcepto === 'HORA_EXTRA_LYF' && c.total > 0 && c.tipoConcepto !== 'CATEGORIA_ZONA')
            .reduce((sum, c) => sum + c.total, 0);
          
          const totalConceptosManualesLyF = conceptosValidos
            .filter(c => c && c.tipoConcepto === 'CONCEPTO_MANUAL_LYF' && c.total > 0 && c.tipoConcepto !== 'CATEGORIA_ZONA')
            .reduce((sum, c) => sum + c.total, 0);
          
          const totalBruto = basicoEmpleado + totalBonificacionesArea + totalConceptosLyF + totalConceptosUocra + totalHorasExtras + totalBonifAntiguedad + totalConceptosManualesLyF;

          // Recalcular conceptos especiales sobre el total bruto (solo para otros gremios, no Luz y Fuerza)
          conceptosValidos.forEach(concepto => {
            if (concepto && concepto._esConceptoEspecial && concepto.porcentaje && totalBruto > 0) {
              const montoUnitario = roundTo2Decimals((totalBruto * concepto.porcentaje) / 100);
              concepto.total = roundTo2Decimals(montoUnitario * concepto.unidades);
            }
          });
        }

        // Calcular total de remuneraciones usando la misma lógica que ProcessPayrollModal
        // Después de recalcular conceptos especiales, sumar todos los conceptos que no son descuentos
        let totalRemuneraciones = 0;
        if (isUocra) {
          // Para UOCRA, el básico no está en la lista, sumarlo por separado
          totalRemuneraciones = roundTo2Decimals(basicoEmpleado + 
            conceptosValidos
              .filter(c => c && c.tipoConcepto !== 'DESCUENTO' && c.tipoConcepto !== 'DESCUENTO_LYF' && c.tipoConcepto !== 'DESCUENTO_UOCRA' && c.tipoConcepto !== 'CATEGORIA_ZONA')
              .reduce((sum, c) => roundTo2Decimals(sum + (c.total || 0)), 0));
        } else {
          // Para Luz y Fuerza, el básico ya debería estar incluido en conceptosValidos como CATEGORIA
          // Pero como no se mapea, sumarlo por separado también
          totalRemuneraciones = roundTo2Decimals(basicoEmpleado + 
            conceptosValidos
              .filter(c => c && c.tipoConcepto !== 'DESCUENTO' && c.tipoConcepto !== 'DESCUENTO_LYF' && c.tipoConcepto !== 'DESCUENTO_UOCRA')
              .reduce((sum, c) => roundTo2Decimals(sum + (c.total || 0)), 0));
        }

        // Recalcular descuentos según baseCalculo o porcentaje tradicional
        calculateDescuentos(conceptosValidos, totalRemuneraciones, {
          descuentos,
          descuentosLyF,
          descuentosUocra
        });

        // Filtrar CATEGORIA_ZONA para UOCRA (no se muestra, solo es para cálculos de referencia)
        const conceptosParaMostrar = conceptosValidos.filter(c => 
          c && c.tipoConcepto !== 'CATEGORIA_ZONA'
        );
        
        // Establecer conceptos asignados (ya filtrados, sin CATEGORIA_ZONA)
        setConceptosAsignados(conceptosParaMostrar);
        
        // Calcular y guardar totales para el resumen usando la misma lógica que ProcessPayrollModal.calculateTotals
        const { sueldoBruto: sueldoBrutoCalculado, totalDescuentos: totalDescuentosCalculado, sueldoNeto: sueldoNetoCalculado } = 
          calculateTotals(conceptosParaMostrar, basicoEmpleado);
        
        // Guardar en estado para usar en el resumen
        setSueldoBruto(sueldoBrutoCalculado);
        setTotalDescuentos(totalDescuentosCalculado);
        setSueldoNeto(sueldoNetoCalculado);
      } catch (error) {
        notify.error('Error al cargar conceptos asignados:' + error.message);
        setConceptosAsignados([]);
      } finally {
        setLoadingConceptos(false);
      }
    };

    if (isOpen && employee) {
      loadConceptosAsignados();
    } else {
      setConceptosAsignados([]);
      setSalarioBasico(0);
      setSueldoBruto(0);
      setTotalDescuentos(0);
      setSueldoNeto(0);
    }
  }, [isOpen, employee]);

  if (!employee) return null;

  // Determinar el gremio del empleado para usar en el render
  let gremioNombre = '';
  if (employee.gremioNombre) {
    gremioNombre = employee.gremioNombre;
  } else if (employee.gremio) {
    gremioNombre = typeof employee.gremio === 'string' ? employee.gremio : (employee.gremio.nombre || '');
  }
  const gremioUpper = String(gremioNombre || '').toUpperCase();
  const isLuzYFuerza = gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA');
  const isUocra = gremioUpper === 'UOCRA';

  const getStatusClass = (status) => {
    switch (status) {
      case 'Activo':
        return 'active';
      case 'Inactivo':
        return 'inactive';
      default:
        return 'active';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalles del Empleado - ${employee.nombre} ${employee.apellido}`}
      size="medium"
      className={'employee-view-modal'}
    >
      <div className={'employee-details'}>
        {/* Información Personal */}
        <div className={'detail-section'}>
          <h3 className={'section-title'}>
            <User className={'title-icon'} />
            Información Personal
          </h3>
          <div className={'detail-grid'}>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Legajo</div>
              <div className={'detail-value'}>{employee.legajo || '12.345.678'}</div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Nombre Completo</div>
              <div className={'detail-value'}>{`${employee.nombre} ${employee.apellido}`}</div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Dirección</div>
              <div className={'detail-value'}>{`${employee.domicilio}` || 'S/N'}</div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Sexo</div>
              <div className={'detail-value'}>{employee.sexo === 'M' ? 'Masculino' : employee.sexo === 'F' ? 'Femenino' : (employee.sexo || '-')}</div>
            </div>
          </div>
        </div>

        {/* Información Laboral */}
          <div className={'detail-section'}>
          <h3 className={'section-title'}>
            <Building className={'title-icon'} />
            Información Laboral
          </h3>
          <div className={'detail-grid'}>
            <div className={'detail-item'}>
              <div className={'detail-label'}>
                {isLuzYFuerza ? 'Áreas' : isUocra ? 'Zona' : 'Áreas'}
              </div>
              <div className={'detail-value'}>
                {isLuzYFuerza && employee.nombreAreas 
                  ? (Array.isArray(employee.nombreAreas) ? employee.nombreAreas.join(', ') : employee.nombreAreas)
                  : isUocra && (employee.idZona || employee.idZonaUocra)
                  ? (() => {
                      const idZona = employee.idZona || employee.idZonaUocra;
                      const zona = zonas.find(z => z.idZona === idZona);
                      return zona ? zona.nombre : `Zona ${idZona}`;
                    })()
                  : employee.nombreAreas || '-'}
              </div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Fecha de Ingreso</div>
              <div className={'detail-value'}>{employee.inicioActividad}</div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Antigüedad</div>
              <div className={'detail-value'}>{calculateAntiguedad(employee.inicioActividad)}</div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Estado</div>
              <div className={`${'detail-value'} ${getStatusClass(employee.estado)}`}>
                {employee.estado === "ACTIVO" ? "Activo" : "Dado de baja"}
              </div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Convenio</div>
              <div className={'detail-value'}>
                {gremioUpper === "LUZ_Y_FUERZA" || (gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA')) 
                  ? "Luz y Fuerza" 
                  : gremioNombre || '-'}
              </div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Categoría</div>
              <div className={'detail-value'}>{employee.idCategoria || '1'}</div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Salario Básico</div>
              <div className={'detail-value'}>
                {salarioBasico > 0 ? formatCurrencyAR(salarioBasico) : '-'}
              </div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Banco</div>
              <div className={'detail-value'}>{employee.banco || 'Banco Nación'}</div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>Número de Cuenta</div>
              <div className={'detail-value'}>{employee.cuenta || '—'}</div>
            </div>
            <div className={'detail-item'}>
              <div className={'detail-label'}>CUIL</div>
              <div className={'detail-value'}>{employee.cuil || 'Sin Cuil'}</div>
            </div>
          </div>
        </div>

        {/* Conceptos Asignados */}
        {gremioNombre && gremioNombre !== "Convenio General" && (
          <div className="form-section conceptos-section">
            <h3 className="section-title">
              <ListChecks className="title-icon" />
              Conceptos Asignados
            </h3>
            {loadingConceptos ? (
              <p className="conceptos-empty-message">Cargando conceptos...</p>
            ) : conceptosAsignados.length === 0 ? (
              <p className="conceptos-empty-message">
                No hay conceptos asignados a este empleado
              </p>
            ) : (
              <div className="conceptos-table">
                <table className="conceptos-table-content" style={{ width: '100%', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50%', textAlign: 'left' }}>Concepto</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Porcentaje</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Unidades</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortConceptos(conceptosAsignados).map((concepto) => {
                        const isDescuento = isDeduction(concepto);
                      return (
                        <tr key={concepto.id} className={`selected ${isDescuento ? 'descuento-row' : ''}`}>
                          <td style={{ textAlign: 'left' }}>
                            <span className="concepto-label">
                              {concepto.nombre} {concepto.porcentaje ? `(${concepto.porcentaje}%)` : ''}
                            </span>
                          </td>
                          <td className="porcentaje-cell" style={{ textAlign: 'center' }}>
                            {concepto.isConceptoManualLyF
                              ? '-' // Conceptos manuales LYF no tienen porcentaje
                              : (concepto.porcentaje ? `${concepto.porcentaje}%` : '-')
                            }
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {concepto.unidades || '-'}
                          </td>
                          <td className={`total-cell ${isDescuento ? 'descuento-total' : ''}`} style={{ textAlign: 'right' }}>
                            {concepto.total && concepto.total !== 0
                              ? formatCurrencyAR(concepto.total)
                              : '-'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Resumen del Salario Total */}
        {conceptosAsignados.length > 0 && (
          <div className="form-section salary-summary-section">
            <h3 className="salary-summary-title">Sueldo Estipulado Inicial</h3>
            <div className="salary-summary-details">
              <div className="salary-detail-item bruto">
                <span className="salary-detail-label">Sueldo Bruto</span>
                <span className="salary-detail-value">{formatCurrencyAR(sueldoBruto)}</span>
              </div>
              <div className="salary-detail-item descuentos">
                <span className="salary-detail-label">Descuentos</span>
                <span className="salary-detail-value">{formatCurrencyAR(totalDescuentos)}</span>
              </div>
              <div className="salary-detail-item neto">
                <span className="salary-detail-label">Sueldo Neto</span>
                <span className="salary-detail-value">{formatCurrencyAR(sueldoNeto)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className={'action-buttons'}>
          <button
            className={`${'action-btn'} ${'primary'}`}
            onClick={() => {
              if (onEditEmployee) {
                onEditEmployee(employee);
              }
            }}
            disabled={String(employee.estado || '').toUpperCase() === 'DADO_DE_BAJA' || String(employee.estado || '').toUpperCase() !== 'ACTIVO'}
            title={String(employee.estado || '').toUpperCase() === 'DADO_DE_BAJA' || String(employee.estado || '').toUpperCase() !== 'ACTIVO' ? 'Empleado dado de baja - no puede editarse' : 'Editar empleado'}
          >
            <Edit className="btn-icon" />
            Editar Empleado
          </button>
          <button
            className={`${'action-btn'} ${'primary'}`}
            onClick={() => {
              if (onLiquidarSueldo) {
                onLiquidarSueldo(employee);
              }
            }}
            disabled={String(employee.estado || '').toUpperCase() === 'DADO_DE_BAJA' || String(employee.estado || '').toUpperCase() !== 'ACTIVO'}
            title={String(employee.estado || '').toUpperCase() === 'DADO_DE_BAJA' || String(employee.estado || '').toUpperCase() !== 'ACTIVO' ? 'Empleado dado de baja - no puede liquidarse' : 'Liquidar sueldo'}
          >
            <DollarSign className="btn-icon" />
            Liquidar Sueldo
          </button>
          <button 
            className={`${'action-btn'} ${'primary'}`}
            onClick={() => {
              setShowPayrollHistoryModal(true);
              if (onHistorialLiquidaciones) {
                onHistorialLiquidaciones(employee);
              }
            }}
          >
            <FileText className="btn-icon" />
            Historial de Liquidaciones
          </button>
        </div>
      </div>

      {/* Modal de Historial de Liquidaciones */}
      <EmployeePayrollHistoryModal
        isOpen={showPayrollHistoryModal}
        onClose={() => setShowPayrollHistoryModal(false)}
        employee={employee}
      />
    </Modal>
  );
}