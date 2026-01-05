import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { User, Building, X, UserPlus, ListChecks, Trash2 } from 'lucide-react';
import * as api from "../../services/empleadosAPI";
import { useNotification } from '../../Hooks/useNotification';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';

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

export function NewEmployeeModal({ isOpen, onClose, onSave }) {
  const notify = useNotification();
  const removeArea = (id) => {
    const numId = Number(id);
    setFormData(prev => ({
      ...prev,
      areas: (prev.areas || []).filter(aid => aid !== numId)
    }));
  }
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    domicilio: '',
    idZonaUocra: null,
    areas: [],
    inicioActividad: new Date().toISOString().split('T')[0], // Fecha actual
    estado: 'ACTIVO',
    sexo: 'M',
    gremio: null,
    idGremio: null,
    idCategoria: null,
    banco: '',
    cuil: '',
    cuenta: '',
    salary: '',
    bonoArea: 0,
    legajo: '' // Inicializar legajo vacío para que se calcule
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [areas, setAreas] = useState([]);
  const [selectedAreaToAdd, setSelectedAreaToAdd] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoriaNoEncontrada, setCategoriaNoEncontrada] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState({});
  const [selectedConceptToAdd, setSelectedConceptToAdd] = useState('');
  const [filteredCategorias, setFilteredCategorias] = useState([]);
  const [areasHabilitadas, setAreasHabilitadas] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [basicoCat11, setBasicoCat11] = useState(0);

  // Rango de categorías por gremio
  const LUZ_Y_FUERZA_IDS = Array.from({ length: 18 }, (_, i) => i + 1); // Luz y Fuerza usa los id de categoria 1-18

  // Funciones helper para categorías (deben estar antes de los useEffects)
  const getCatId = (c) => c?.id ?? c?.idCategoria ?? c?.categoriaId;
  const getCatNombre = (c) => c?.nombre ?? c?.nombreCategoria ?? c?.descripcion ?? c?.categoria ?? `Categoría ${getCatId(c)}`;
  const getCatBasico = (c) => c?.salarioBasico ?? c?.basico ?? c?.sueldoBasico ?? c?.monto ?? c?.salario ?? 0;

  // Normaliza strings para comparar sin importar mayúsculas, tildes, espacios, etc.
  const normalize = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const findCategoriaById = (id) => categorias.find(c => String(getCatId(c)) === String(id));

  // Función helper para obtener el tipo de concepto según el gremio
  const getTipoConcepto = (gremio) => {
    if (gremio === 'LUZ_Y_FUERZA') return 'CONCEPTO_LYF';
    if (gremio === 'UOCRA') return 'CONCEPTO_UOCRA';
    return 'BONIFICACION_FIJA'; // Fallback (no debería usarse con Convenio General)
  };

  // Load employees al montar
  useEffect(() => {
    const loadEmployees = async () => {
      const data = await api.getEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  // Auto-calcular legajo cuando el modal se abre o cambian los empleados
  useEffect(() => {
    if (!isOpen) return; // Solo calcular cuando el modal está abierto
    
    if (!employees || employees.length === 0) {
      setFormData(prev => ({ ...prev, legajo: 1 }));
      return;
    }
    const lastLegajo = Math.max(...employees.map(e => Number(e.legajo) || 0));
    setFormData(prev => {
      // Solo actualizar si el legajo no está establecido o es 0
      if (!prev.legajo || prev.legajo === 0) {
        return { ...prev, legajo: lastLegajo + 1 };
      }
      return prev;
    });
  }, [employees, isOpen]);
    
  useEffect(() => {
    setAreasHabilitadas(
      !!formData.gremio && formData.gremio !== "Convenio General"
    );
  }, [formData.gremio]);

  // Carga las áreas/zonas según el gremio seleccionado
  useEffect(() => {
    const loadAreasOrZonas = async () => {
      setAreas([]);
      setSelectedAreaToAdd('');
      if (!formData.gremio || formData.gremio === "Convenio General") return;

      try {
        let data = [];
        if (formData.gremio === "LUZ_Y_FUERZA") data = await api.getAreas();
        if (formData.gremio === "UOCRA") data = await api.getZonas();
        setAreas(data);
      } catch (err) {
        console.error("Error al cargar áreas o zonas:", err);
      }
    };
    loadAreasOrZonas();
  }, [formData.gremio]);

  // Carga las categorías al montar el componente
  useEffect(() => {
      const loadCategorias = async () => {
        try {
          const data = await api.getCategorias(); // hace el fetch con axios
          const ordenadas = data.sort((a, b) => a.idCategoria - b.idCategoria);
          setCategorias(ordenadas); // guarda las categorías ordenadas en el estado
        } catch (err) {
          notify.error("Error al cargar categorías");
        }
      };
      loadCategorias();
    }, []);

  // Carga los conceptos según el gremio seleccionado
  useEffect(() => {
    const loadConceptos = async () => {
      try {
        // Si no hay gremio seleccionado o es Convenio General, no cargar nada
        if (!formData.gremio || formData.gremio === 'Convenio General') {
          setConceptos([]);
          return;
        }

        let allConceptos = [];

        if (formData.gremio === 'LUZ_Y_FUERZA') {
          // Para Luz y Fuerza: cargar todos los conceptos requeridos
          const [
            conceptosLyF,
            titulosLyF,
            conceptosManualesLyF,
            horasExtrasLyF,
            descuentos,
            descuentosLyF
          ] = await Promise.all([
            api.getConceptosLyF().catch(() => []),
            api.getTitulosLyF().catch(() => []),
            api.getConceptosManualesLyF().catch(() => []),
            api.getHorasExtrasLyF().catch(() => []),
            api.getDescuentos().catch(() => []),
            api.getDescuentosLyF().catch(() => [])
          ]);

          // Mapear Conceptos LYF
          const mappedConceptosLyF = (conceptosLyF || []).map((concepto) => {
            const originalId = concepto.idConceptoLyF ?? concepto.idBonificacion ?? concepto.id;
            return {
              id: `BON_${originalId}`,
              originalId: originalId,
              nombre: concepto.nombre ?? concepto.descripcion,
              unidad: concepto.porcentaje ? '%' : 'monto',
              porcentaje: concepto.porcentaje ?? null,
              montoUnitario: concepto.montoUnitario ?? concepto.monto ?? null,
              tipo: 'CONCEPTO_LYF',
              isDescuento: false,
              baseCalculo: concepto.baseCalculo ?? concepto.base_calculo ?? null
            };
          });

          // Mapear Títulos LYF
          const mappedTitulosLyF = (titulosLyF || []).map((titulo) => {
            const originalId = titulo.idTituloLyF ?? titulo.id;
            return {
              id: `TIT_${originalId}`,
              originalId: originalId,
              nombre: titulo.nombre ?? titulo.descripcion,
              unidad: titulo.porcentaje ? '%' : 'monto',
              porcentaje: titulo.porcentaje ?? null,
              montoUnitario: titulo.montoUnitario ?? titulo.monto ?? null,
              tipo: 'CONCEPTO_LYF',
              isDescuento: false,
              baseCalculo: titulo.baseCalculo ?? titulo.base_calculo ?? null
            };
          });

          // Mapear Conceptos Manuales LYF
          const mappedConceptosManualesLyF = (conceptosManualesLyF || []).map((concepto) => {
            const originalId = concepto.idConceptosManualesLyF ?? concepto.id;
            return {
              id: `MAN_${originalId}`,
              originalId: originalId,
              nombre: concepto.nombre ?? concepto.descripcion,
              unidad: 'manual',
              porcentaje: null,
              montoUnitario: concepto.monto ?? concepto.valor ?? 0,
              tipo: 'CONCEPTO_MANUAL_LYF',
              isDescuento: false,
              cantidadFija: 1
            };
          });

          // Mapear Horas Extras LYF
          const mappedHorasExtras = (horasExtrasLyF || []).map((horaExtra) => {
            const originalId = horaExtra.idHoraExtra ?? horaExtra.id;
            return {
              id: `HE_${originalId}`,
              originalId: originalId,
              nombre: horaExtra.descripcion ?? horaExtra.codigo ?? horaExtra.nombre ?? (originalId === 1 ? 'Horas Extras Simples' : 'Horas Extras Dobles'),
              unidad: 'factor',
              porcentaje: null,
              factor: Number(horaExtra.factor) || (originalId === 1 ? 1.5 : 2),
              tipo: 'HORA_EXTRA_LYF',
              isDescuento: false
            };
          });

          // Mapear Descuentos generales
          const mappedDescuentos = (descuentos || []).map((descuento) => {
            const originalId = descuento.idDescuento ?? descuento.id;
            const baseCalculoDescuento = descuento?.baseCalculo ?? descuento?.base_calculo;
            const usaBaseCalculo = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto' || 
                                  baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
            return {
              id: `DESC_${originalId}`,
              originalId: originalId,
              nombre: descuento.nombre ?? descuento.descripcion,
              unidad: usaBaseCalculo ? '% (cantidad)' : (descuento.porcentaje ? '%' : 'monto'),
              porcentaje: usaBaseCalculo ? null : (descuento.porcentaje ?? null),
              montoUnitario: descuento.montoUnitario ?? descuento.monto ?? null,
              tipo: 'DESCUENTO',
              isDescuento: true,
              baseCalculo: baseCalculoDescuento || null
            };
          });
        
          // Mapear Descuentos LYF
          const mappedDescuentosLyF = (descuentosLyF || []).map((descuento) => {
            const originalId = descuento.idDescuentoLyF ?? descuento.idDescuento ?? descuento.id;
            const baseCalculoDescuento = descuento?.baseCalculo ?? descuento?.base_calculo;
            const usaBaseCalculo = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto' || 
                                  baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
            return {
              id: `DESC_LYF_${originalId}`,
              originalId: originalId,
              nombre: descuento.nombre ?? descuento.descripcion,
              unidad: usaBaseCalculo ? '% (cantidad)' : (descuento.porcentaje ? '%' : 'monto'),
              porcentaje: usaBaseCalculo ? null : (descuento.porcentaje ?? null),
              montoUnitario: descuento.montoUnitario ?? descuento.monto ?? null,
              tipo: 'DESCUENTO_LYF',
              isDescuento: true,
              baseCalculo: baseCalculoDescuento || null
            };
          });

          allConceptos = [
            ...mappedConceptosLyF,
            ...mappedTitulosLyF,
            ...mappedConceptosManualesLyF,
            ...mappedHorasExtras,
            ...mappedDescuentos,
            ...mappedDescuentosLyF
          ];

        } else if (formData.gremio === 'UOCRA') {
          bonificacionesData = await api.getConceptosUocra();
        }
        
        // Cargar horas extras LYF si es Luz y Fuerza
        let horasExtrasLyF = [];
        if (formData.gremio === 'LUZ_Y_FUERZA') {
          try {
            horasExtrasLyF = await api.getHorasExtrasLyF();
          } catch (error) {
            console.error('Error al cargar horas extras LYF:', error);
          }
        }
        
        // Cargar descuentos (sin filtrar por gremio, son generales)
        const descuentosData = await api.getDescuentos();
        
        // Mapear bonificaciones - usar prefijo 'BON_' para evitar conflictos de IDs
        const mappedBonificaciones = bonificacionesData.map((concepto) => {
          const originalId = concepto.idBonificacion ?? concepto.id;
          return {
              id: `BON_${originalId}`,
              originalId: originalId,
            nombre: concepto.nombre ?? concepto.descripcion,
            unidad: concepto.porcentaje ? '%' : 'monto',
            porcentaje: concepto.porcentaje ?? null,
            montoUnitario: concepto.montoUnitario ?? concepto.monto ?? null,
              tipo: 'CONCEPTO_UOCRA',
            isDescuento: false
          };
        });
        
          // Mapear Descuentos generales
          const mappedDescuentos = (descuentos || []).map((descuento) => {
          const originalId = descuento.idDescuento ?? descuento.id;
          return {
              id: `DESC_${originalId}`,
              originalId: originalId,
            nombre: descuento.nombre ?? descuento.descripcion,
            unidad: descuento.porcentaje ? '%' : 'monto',
            porcentaje: descuento.porcentaje ?? null,
            montoUnitario: descuento.montoUnitario ?? descuento.monto ?? null,
            tipo: 'DESCUENTO',
            isDescuento: true
          };
        });
        
        // Mapear horas extras LYF - usar prefijo 'HE_' para evitar conflictos de IDs
        const mappedHorasExtras = horasExtrasLyF.map((horaExtra) => {
          const originalId = horaExtra.idHoraExtra ?? horaExtra.id;
          return {
            id: `HE_${originalId}`, // Prefijo para horas extras
            originalId: originalId, // ID original para enviar al backend
            nombre: horaExtra.descripcion ?? horaExtra.codigo ?? (originalId === 1 ? 'Horas Extras Simples' : 'Horas Extras Dobles'),
            unidad: 'factor',
            porcentaje: null, // Las horas extras no usan porcentaje, usan factor
            factor: Number(horaExtra.factor) || (originalId === 1 ? 1.5 : 2),
            tipo: 'HORA_EXTRA_LYF',
            isDescuento: false
          };
        });
        
        // Combinar bonificaciones, descuentos y horas extras
        setConceptos([...mappedBonificaciones, ...mappedDescuentos, ...mappedHorasExtras]);
      } catch (error) {
        console.error('Error al cargar conceptos:', error);
        notify.error("Error al cargar conceptos");
        setConceptos([]);
      }
    };
    loadConceptos();
  }, [formData.gremio]);

  // Asignar automáticamente "Bonif Antigüedad" para Luz y Fuerza si tiene 1 año o más
  // También actualiza las unidades si cambia la fecha de ingreso
  useEffect(() => {
    // Solo para Luz y Fuerza
    if (formData.gremio !== 'LUZ_Y_FUERZA' || !formData.inicioActividad || conceptos.length === 0) {
      return;
    }

    // Buscar el concepto "Bonif Antigüedad" (puede tener variaciones en el nombre)
    const conceptoAntiguedad = conceptos.find(c => {
      const nombreNormalizado = normalize(c.nombre || '');
      return nombreNormalizado.includes('bonif antiguedad') || nombreNormalizado.includes('bonif antigüedad');
    });

    if (!conceptoAntiguedad) {
      return; // No existe el concepto de antigüedad en el catálogo
    }

    // Calcular años de antigüedad (solo años completos, sin meses)
    const añosAntiguedad = calculateAniosAntiguedad(formData.inicioActividad);

    // Verificar si ya está asignado
    const yaAsignado = conceptosSeleccionados[conceptoAntiguedad.id];
    
    if (yaAsignado) {
      // Si ya está asignado, actualizar las unidades con los años actuales
      const unidadesActuales = Number(yaAsignado.units) || 0;
      if (unidadesActuales !== añosAntiguedad && añosAntiguedad >= 1) {
        setConceptosSeleccionados(prev => ({
          ...prev,
          [conceptoAntiguedad.id]: { units: String(añosAntiguedad) }
        }));
      }
      return;
    }

    // Solo asignar si tiene 1 año o más y no está asignado
    if (añosAntiguedad >= 1) {
      setConceptosSeleccionados(prev => ({
        ...prev,
        [conceptoAntiguedad.id]: { units: String(añosAntiguedad) }
      }));
    }
  }, [formData.gremio, formData.inicioActividad, conceptos, conceptosSeleccionados]);

  // Actualiza el salario base cuando cambia la categoría seleccionada
  useEffect(() => {
    if (!categorias.length) return;
    // preferimos el id si ya está (por ej. usuario seleccionó algo)
    if (formData.idCategoria) {
      const cat = findCategoriaById(formData.idCategoria);
      if (cat) {
        // Si es UOCRA y hay zona seleccionada, calcular con el endpoint
        if (formData.gremio === 'UOCRA' && formData.zonaId) {
          const calculateSalary = async () => {
            try {
              const basicoData = await api.getBasicoByCatAndZona(formData.idCategoria, formData.zonaId);
              const basico = Number(basicoData?.basico ?? basicoData?.salarioBasico ?? basicoData?.monto ?? basicoData?.salario ?? 0);
              setFormData(prev => {
                const currentSalary = Number(prev.salary) || 0;
                if (currentSalary === basico && prev.categoria === getCatNombre(cat)) {
                  return prev;
                }
                return { ...prev, salary: String(basico), categoria: getCatNombre(cat) };
              });
            } catch (error) {
              notify.error("Error al obtener básico por zona y categoría");
              // Fallback al básico de la categoría
              const basico = Number(getCatBasico(cat)) || 0;
              setFormData(prev => {
                const currentSalary = Number(prev.salary) || 0;
                if (currentSalary === basico && prev.categoria === getCatNombre(cat)) {
                  return prev;
                }
                return { ...prev, salary: String(basico), categoria: getCatNombre(cat) };
              });
            }
          };
          calculateSalary();
        } else {
          // Para Luz y Fuerza o Convenio General, usar el básico de la categoría directamente
          const basico = Number(getCatBasico(cat)) || 0;
          setFormData(prev => {
            const currentSalary = Number(prev.salary) || 0;
            if (currentSalary === basico && prev.categoria === getCatNombre(cat)) {
              return prev;
            }
            return { ...prev, salary: String(basico), categoria: getCatNombre(cat) };
          });
        }
        setCategoriaNoEncontrada(false);
      }
      return;
    }
  }, [formData.idCategoria, formData.zonaId, formData.gremio, categorias]);

  // Cargar básico de categoría 11 para Luz y Fuerza (necesario para conceptos y bonos de área)
  useEffect(() => {
    const loadBasicoCat11 = async () => {
      if (formData.gremio !== 'LUZ_Y_FUERZA') {
        setBasicoCat11(0);
        return;
      }

      try {
        const categoria11 = await api.getCategoriaById(11);
        const basicoCat11Value = getCatBasico(categoria11);
        setBasicoCat11(basicoCat11Value || 0);
      } catch (error) {
        notify.error("Error al obtener categoría 11");
        setBasicoCat11(0);
      }
    };

    loadBasicoCat11();
  }, [formData.gremio]);

  // Calcula el bono de área cuando cambian las áreas (siempre usa categoría 11)
  useEffect(() => {
    const calculateBonoArea = async () => {
      // Solo calcular si es Luz y Fuerza y hay áreas seleccionadas
      if (formData.gremio !== 'LUZ_Y_FUERZA' || !formData.areas?.length) {
        setFormData(prev => ({ ...prev, bonoArea: 0 }));
        return;
      }

      try {
        // Usar el básico de categoría 11 ya cargado, o cargarlo si no está disponible
        let basicoCat11Value = basicoCat11;
        if (basicoCat11Value === 0) {
          const categoria11 = await api.getCategoriaById(11);
          basicoCat11Value = getCatBasico(categoria11);
          setBasicoCat11(basicoCat11Value || 0);
          if (!basicoCat11Value || basicoCat11Value === 0) {
            notify.warning("No se pudo obtener el básico de categoría 11");
            setFormData(prev => ({ ...prev, bonoArea: 0 }));
            return;
          }
        }

        // Calcular bonos para cada área usando siempre categoría 11
        const bonosPromises = formData.areas.map(async (areaId) => {
          try {
            // Usar categoría 11 para obtener el porcentaje (no la categoría del empleado)
            const porcentajeResponse = await api.getPorcentajeArea(Number(areaId), formData.idCategoria);
            // El porcentaje puede venir como número directo o como objeto con propiedad porcentaje
            const porcentajeNum = typeof porcentajeResponse === 'number' 
              ? porcentajeResponse 
              : Number(porcentajeResponse?.porcentaje ?? porcentajeResponse) || 0;
            // Calcular: (básico_cat11 * porcentaje) / 100
            return (basicoCat11Value * porcentajeNum) / 100;
          } catch (error) {
            notify.error(`Error al obtener porcentaje para área ${areas[areaId-1].nombre}`);
            return 0;
          }
        });

        const bonos = await Promise.all(bonosPromises);
        const bonoTotal = bonos.reduce((sum, bono) => sum + bono, 0);

        setFormData(prev => ({ ...prev, bonoArea: bonoTotal }));
      } catch (error) {
        notify.error("Error al calcular bono de área");
        setFormData(prev => ({ ...prev, bonoArea: 0 }));
      }
    };

    calculateBonoArea();
  }, [formData.areas, formData.gremio, basicoCat11]); // Removido formData.idCategoria de las dependencias

  // Calcula el salario básico cuando cambia la zona o categoría en UOCRA
  useEffect(() => {
    const calculateSalaryByZona = async () => {
      // Solo calcular si es UOCRA, hay categoría y zona seleccionadas
      if (formData.gremio !== 'UOCRA' || !formData.idCategoria || !formData.zonaId) {
        // Si es UOCRA pero falta zona o categoría, limpiar salario
        if (formData.gremio === 'UOCRA') {
          setFormData(prev => {
            if (prev.gremio === 'UOCRA' && (!prev.idCategoria || !prev.zonaId) && prev.salary) {
              return { ...prev, salary: '' };
            }
            return prev;
          });
        }
        return;
      }

      try {
        const basicoData = await api.getBasicoByCatAndZona(formData.idCategoria, formData.zonaId);
        const basico = Number(basicoData?.basico ?? basicoData?.salarioBasico ?? basicoData?.monto ?? basicoData?.salario ?? 0);
        
        setFormData(prev => {
          // Verificar que los valores todavía coinciden (para evitar actualizaciones obsoletas)
          if (prev.gremio === 'UOCRA' && prev.idCategoria === formData.idCategoria && prev.zonaId === formData.zonaId) {
            const currentSalary = Number(prev.salary) || 0;
            if (currentSalary === basico) return prev;
            return { ...prev, salary: String(basico) };
          }
          return prev;
        });
      } catch (error) {
        notify.error("Error al obtener básico por zona y categoría");
        // Si falla, usar el básico de la categoría como fallback
        const cat = findCategoriaById(formData.idCategoria);
        if (cat) {
          const basico = Number(getCatBasico(cat)) || 0;
          setFormData(prev => {
            if (prev.gremio === 'UOCRA' && prev.idCategoria === formData.idCategoria && prev.zonaId === formData.zonaId) {
              const currentSalary = Number(prev.salary) || 0;
              if (currentSalary === basico) return prev;
              return { ...prev, salary: String(basico) };
            }
            return prev;
          });
        }
      }
    };

    calculateSalaryByZona();
  }, [formData.zonaId, formData.gremio, formData.idCategoria, categorias]);

  useEffect(() => {
    if (!formData.gremio) {
      setFilteredCategorias([]);
      return;
    }

    if (formData.gremio === "LUZ_Y_FUERZA") {
      setFilteredCategorias(
        categorias.filter((c) => LUZ_Y_FUERZA_IDS.includes(c.idCategoria))
      );
    } else if (formData.gremio === "UOCRA") {
      setFilteredCategorias(
        categorias.filter((c) => !LUZ_Y_FUERZA_IDS.includes(c.idCategoria))
      );
    } else {
      setFilteredCategorias(categorias);
    }
  }, [formData.gremio, categorias]);
  
  // Agregar área seleccionada desde el select
  const addSelectedArea = () => {
    const id = Number(selectedAreaToAdd);
    if (!Number.isFinite(id)) return;
    setFormData(prev => {
      const curr = Array.isArray(prev.areas) ? prev.areas : [];

      if(formData.gremio === "UOCRA") {
        // En UOCRA, solo una zona permitida
        return { ...prev, zonaId: id };
      }

      if (curr.includes(id)) return prev;
      return { ...prev, areas: [...curr, id] };
    });
    setSelectedAreaToAdd('');
    if (errors?.areas) setErrors(prev => ({ ...prev, areas: '' }));
  };

  const handleAreaOrZonaSelect = (idSeleccionado) => {
    setSelectedAreaToAdd(idSeleccionado);

    if (formData.gremio === "UOCRA") {
      // Busca la zona seleccionada
      const zonaSeleccionada = areas.find((z) => z.idZona === parseInt(idSeleccionado));
      if (zonaSeleccionada) {
        // Actualiza las categorías según la zona
        setCategorias(zonaSeleccionada.categorias || []);
      } else {
        setCategorias([]);
      }
    }

    if (formData.gremio === "Luz y Fuerza") {
      // Solo limpia categorías si se cambia de área
      setCategorias([]);
    }
  };

  // Maneja el cambio de categoría y actualiza el salario base
  const handleCategoriaChange = async (id) => {
    const cat = findCategoriaById(Number(id)); // <-- convertir aquí
    if (!cat) {
      setFormData(prev => ({
        ...prev,
        idCategoria: Number(id),
        categoria: '',
        salary: ''
      }));
      if (errors?.categoria) setErrors(prev => ({ ...prev, categoria: '' }));
      return;
    }

    // Actualizar idCategoria y categoria
    // Si es UOCRA, el useEffect calculará el salario automáticamente cuando cambie idCategoria o zonaId
    setFormData(prev => {
      // Si no es UOCRA o no hay zona, calcular el básico directamente
      if (prev.gremio !== 'UOCRA' || !prev.zonaId) {
        const basico = Number(getCatBasico(cat)) || 0;
        return {
          ...prev,
          idCategoria: Number(id),
          categoria: getCatNombre(cat),
          salary: String(basico)
        };
      }
      // Si es UOCRA y hay zona, solo actualizar categoría y dejar que el useEffect calcule el salario
      return {
        ...prev,
        idCategoria: Number(id),
        categoria: getCatNombre(cat)
      };
    });
    if (errors?.categoria) setErrors(prev => ({ ...prev, categoria: '' }));
  };

  // Maneja el cambio en los campos del formulario
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpia el error del campo si existe
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Valida el formulario antes de enviarlo
  const validateForm = () => {
    const newErrors = {};

    if (!(formData.nombre?.trim())) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!(formData.apellido?.trim())) {
      newErrors.apellido = 'El apellido es requerido';
    }

    if (!(formData.cuil?.trim())) {
      newErrors.cuil = 'El CUIL es requerido';
    }

    if (!(formData.categoria?.trim()) && !formData.idCategoria) {
      newErrors.categoria = 'Debe asignar una categoría al empleado';
    }

    if (!(formData.gremioId)) {
      newErrors.gremio = 'Debe asignar un gremio al empleado';
    }

    if (formData.gremio === "UOCRA") {
      if (!formData.zonaId) {
        newErrors.areas = 'Debe asignar por lo menos una zona al empleado';
      }
    } else {
      if (!Array.isArray(formData.areas) || formData.areas.length === 0) {
        newErrors.areas = 'Debe asignar por lo menos un área al empleado';
      }
    }

    if (!(formData.inicioActividad?.trim())) {
      newErrors.inicioActividad = 'La fecha de ingreso de actividad es requerida';
    }

    if(formData.sexo && !['M', 'F'].includes(formData.sexo)) {
      newErrors.sexo = 'El sexo debe ser "M" o "F"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Función para crear el empleado (lógica separada para poder llamarla después de la confirmación)
  const createEmployee = async () => {
    setIsLoading(true);

    try {
      // Construir conceptosAsignados según el DTO
      const conceptosAsignados = [];
      
      // 1. Bonificaciones fijas, descuentos y horas extras (conceptos seleccionados)
      Object.keys(conceptosSeleccionados).forEach(conceptId => {
        // conceptId ahora puede ser 'BON_X', 'DESC_X' o 'HE_X'
        const concepto = conceptos.find(c => c.id === conceptId);
        const units = conceptosSeleccionados[conceptId]?.units;
        if (concepto && units && units > 0) {
          let tipoConcepto;
          if (concepto.isDescuento || concepto.tipo === 'DESCUENTO') {
            tipoConcepto = 'DESCUENTO';
          } else if (concepto.tipo === 'HORA_EXTRA_LYF') {
            tipoConcepto = 'HORA_EXTRA_LYF';
          } else if (concepto.tipo === 'CONCEPTO_UOCRA') {
            tipoConcepto = 'CONCEPTO_UOCRA';
          } else if (concepto.tipo === 'CONCEPTO_LYF') {
            tipoConcepto = 'CONCEPTO_LYF';
          } else {
            tipoConcepto = 'BONIFICACION_FIJA';
          }
          // Usar originalId para enviar al backend
          conceptosAsignados.push({
            idEmpleadoConcepto: null, // Nuevo concepto
            legajo: Number(formData.legajo),
            tipoConcepto: tipoConcepto,
            idReferencia: Number(concepto.originalId), // ID original sin prefijo
            unidades: Number(units) // Para CONCEPTO_MANUAL_LYF siempre será 1
          });
        }
      });

      // 2. Bonificaciones de área (para LUZ_Y_FUERZA)
      if (formData.gremio === 'LUZ_Y_FUERZA' && formData.areas && formData.areas.length > 0) {
        formData.areas.forEach(areaId => {
          conceptosAsignados.push({
            idEmpleadoConcepto: null,
            legajo: Number(formData.legajo),
            tipoConcepto: 'BONIFICACION_AREA',
            idReferencia: Number(areaId),
            unidades: 1 // Por defecto 1 unidad para área
          });
        });
      }

      // 3. Categoría-Zona (para UOCRA)
      if (formData.gremio === 'UOCRA' && formData.zonaId && formData.idCategoria) {
        conceptosAsignados.push({
          idEmpleadoConcepto: null,
          legajo: Number(formData.legajo),
          tipoConcepto: 'CATEGORIA_ZONA',
          idReferencia: Number(formData.zonaId), // o podría ser el idCategoria, dependiendo de la lógica del backend
          unidades: 1
        });
      }

      // Construir el payload según el DTO
      const payload = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        cuil: formData.cuil || null,
        inicioActividad: formData.inicioActividad ? new Date(formData.inicioActividad).toISOString().split('T')[0] : null,
        domicilio: formData.domicilio || null,
        banco: formData.banco || null,
        cuenta: formData.cuenta || null,
        idCategoria: formData.idCategoria ? Number(formData.idCategoria) : null,
        idAreas: formData.areas && formData.areas.length > 0 ? formData.areas.map(a => Number(a)) : null,
        sexo: formData.sexo || null,
        idGremio: formData.gremioId ? Number(formData.gremioId) : null,
        idZonaUocra: formData.zonaId ? Number(formData.zonaId) : null,
        estado: "ACTIVO",
        conceptosAsignados: conceptosAsignados.length > 0 ? conceptosAsignados : null
      };

      // Llama al callback onSave si está definido
      if (onSave) await onSave(payload, false);
      notify.success("Empleado creado correctamente");
      handleClose();

    } catch (err) {
      notify.error("Error al crear empleado");
    } finally {
      setIsLoading(false);
    }
  };

  // Maneja el envío del formulario para crear un nuevo empleado
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return; // valida antes de enviar

    // Mostrar diálogo de confirmación
    if (window.showConfirm) {
      const confirmed = await window.showConfirm({
        title: 'Registrar empleado',
        message: '¿Desea registrar empleado?',
        confirmText: 'Sí, registrar',
        cancelText: 'Cancelar',
        type: 'info',
        confirmButtonVariant: 'primary',
        cancelButtonVariant: 'secondary'
      });

      if (!confirmed) {
        return; // Si el usuario cancela, no hacer nada
      }
    }

    // Si confirma, proceder con la creación
    await createEmployee();
  };

  const GREMIOS = {
    'LUZ_Y_FUERZA': 1,
    'UOCRA': 2,
    'Convenio General': 0
  };

  const handleGremioChange = (value) => {
    setFormData(prev => ({
      ...prev,
      gremio: value,
      gremioId: GREMIOS[value] || null, // <-- asigna el id correcto
      idCategoria: null, // limpia categoría al cambiar gremio
      categoria: '', // limpia nombre de categoría
      salary: '', // limpia salario básico
      areas: [], // limpia áreas al cambiar gremio
      zonaId: null, // limpia zona al cambiar gremio
      bonoArea: 0, // limpia bono de área al cambiar gremio
    }));
    // Limpiar conceptos seleccionados al cambiar gremio
    setConceptosSeleccionados({});
    // Limpiar errores relacionados
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.categoria;
      delete newErrors.areas;
      return newErrors;
    });
  };

  // Maneja el cierre del modal y resetea el formulario
  const handleClose = () => {
    setFormData({
      nombre: '',
      apellido: '',
      domicilio: '',
      idAreas: [],
      inicioActividad: new Date().toISOString().split('T')[0],
      estado: 'ACTIVO',
      gremio: null,
      idGremio: null,
      idCategoria: null,
      idZona: null,
      banco: '',
      cuil: '',
      cuenta: '',
      sexo: 'M',
      salary: '',
      bonoArea: 0,
      legajo: '' // Resetear legajo para que se recalcule al abrir
    });
    setErrors({});
    setConceptosSeleccionados({});
    onClose();
  };

  // Función helper para identificar "Bonif Antigüedad" específicamente
  const isBonifAntiguedad = (nombreConcepto) => {
    const nombreNormalizado = normalize(nombreConcepto || '');
    return (
      nombreNormalizado.includes('bonif antiguedad') ||
      nombreNormalizado.includes('bonif antigüedad')
    );
  };

  // Función helper para identificar conceptos que se calculan sobre el total bruto
  // (excluye "Bonif Antigüedad" que tiene su propio cálculo)
  const isConceptoCalculadoSobreTotalBruto = (nombreConcepto) => {
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
  const isPersonalDeTurno = (nombreConcepto) => {
    const nombreNormalizado = normalize(nombreConcepto || '');
    return nombreNormalizado.includes('personal de turno') || nombreNormalizado.includes('personal turno');
  };

  // Calcula el total bruto (básico + bono área + bonificaciones, excluyendo conceptos especiales, horas extras y descuentos)
  const calcularTotalBruto = () => {
    const salarioBasico = Number(formData.salary) || 0;
    const bonoArea = formData.gremio === 'LUZ_Y_FUERZA' ? (Number(formData.bonoArea) || 0) : 0;
    
    const otrasBonificaciones = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
      const c = conceptos.find(cc => String(cc.id) === String(conceptId));
      if (!c) return sum;
      
      const cIsDescuento = c.isDescuento || c.tipo === 'DESCUENTO';
      if (cIsDescuento) return sum;
      if (c.tipo === 'HORA_EXTRA_LYF') return sum;
      
      // Excluir conceptos que se calculan sobre total bruto (para evitar dependencia circular)
      const cNombreNormalizado = normalize(c.nombre || '');
      if (isConceptoCalculadoSobreTotalBruto(c.nombre)) return sum;
      
      const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
      if (!u || u <= 0) return sum;
      
      // Calcular total de la bonificación (recursivo, pero sin incluir conceptos sobre total bruto)
      const total = calculateConceptTotal(c, u, null, true); // Pasar flag para evitar recursión infinita
      return sum + total;
    }, 0);
    
    return salarioBasico + bonoArea + otrasBonificaciones;
  };

  // Calcula el total de un concepto basado en el básico, porcentaje y unidades
  // Para descuentos, se calcula sobre el total de remuneraciones
  // Para HORA_EXTRA_LYF: se calcula usando valorHora * factor
  // Para Bonif Antigüedad: se calcula como (básico cat 11 + SUMA FIJA) * porcentaje * unidades
  const calculateConceptTotal = (concepto, units, totalRemuneraciones = null) => {
    if (!concepto || !units || units <= 0) return 0;
    
    const unidades = Number(units) || 0;
    const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';

    // Si es descuento, calcular sobre el total de remuneraciones
    if (isDescuento) {
      if (!concepto.porcentaje || !totalRemuneraciones || totalRemuneraciones <= 0) return 0;
      const porcentaje = Number(concepto.porcentaje) || 0;
      const montoUnitario = (totalRemuneraciones * porcentaje) / 100;
      return -(montoUnitario * unidades);
    }

    // Manejo especial para Bonif Antigüedad (solo para Luz y Fuerza)
    const nombreNormalizado = normalize(concepto.nombre || '');
    const isBonifAntiguedad = (nombreNormalizado.includes('bonif antiguedad') || nombreNormalizado.includes('bonif antigüedad')) 
      && formData.gremio === 'LUZ_Y_FUERZA';
    
    if (isBonifAntiguedad) {
      // Base = básico de categoría 11 + concepto "SUMA FIJA"
      if (basicoCat11 <= 0) return 0;
      
      // Buscar el concepto "SUMA FIJA"
      const conceptoSumaFija = conceptos.find(c => {
        const nombreSumaFija = normalize(c.nombre || '');
        return nombreSumaFija.includes('suma fija');
      });
      
      let sumaFija = 0;
      if (conceptoSumaFija) {
        // Si SUMA FIJA tiene montoUnitario, usarlo directamente
        if (conceptoSumaFija.montoUnitario) {
          sumaFija = Number(conceptoSumaFija.montoUnitario) || 0;
        } else if (conceptoSumaFija.porcentaje && basicoCat11 > 0) {
          // Si tiene porcentaje, calcular sobre básico cat 11
          sumaFija = (basicoCat11 * Number(conceptoSumaFija.porcentaje)) / 100;
        }
      }
      
      const baseCalculo = basicoCat11 + sumaFija;
      if (baseCalculo <= 0 || !concepto.porcentaje) return 0;
      
      const porcentaje = Number(concepto.porcentaje) || 0;
      // Fórmula: (básico cat 11 + SUMA FIJA) * porcentaje * unidades
      return (baseCalculo * porcentaje / 100) * unidades;
    }

    // Manejo especial para Horas Extras de Luz y Fuerza (HORA_EXTRA_LYF)
    if (concepto.tipo === 'HORA_EXTRA_LYF') {
      // Total bonificaciones = básico + bono de área + suma de otras bonificaciones seleccionadas (excluyendo descuentos y horas extras)
      const salarioBasico = Number(formData.salary) || 0;
      const bonoArea = formData.gremio === 'LUZ_Y_FUERZA' ? (Number(formData.bonoArea) || 0) : 0;

      const otherBonificaciones = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
        if (String(conceptId) === String(concepto.id)) return sum; // excluir el propio concepto
        const c = conceptos.find(c => String(c.id) === String(conceptId));
        if (!c) return sum;
        const cIsDescuento = c.isDescuento || c.tipo === 'DESCUENTO';
        if (cIsDescuento) return sum;
        if (c.tipo === 'HORA_EXTRA_LYF') return sum; // Excluir otras horas extras
        
        // Excluir Bonif Antigüedad del cálculo de horas extras
        const cNombreNormalizado = normalize(c.nombre || '');
        if (cNombreNormalizado.includes('bonif antiguedad') || cNombreNormalizado.includes('bonif antigüedad')) {
          return sum;
        }
        
        const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
        if (!u || u <= 0) return sum;

        // Para el resto, usar el cálculo estándar
        const total = calculateConceptTotal(c, u);
        return sum + total;
      }, 0);

      const totalRemunerativo = salarioBasico + bonoArea + otherBonificaciones;
      if (totalRemunerativo <= 0) return 0;

      // Calcular valor hora y usar el factor del catálogo
      const valorHora = totalRemunerativo / 156;
      const factor = Number(concepto.factor) || (concepto.originalId === 1 ? 1.5 : 2);
      const montoUnitario = valorHora * factor;
      return montoUnitario * unidades;
    }

    // Para conceptos con porcentaje (bonificaciones normales)
    if (!concepto.porcentaje) return 0;
    const porcentaje = Number(concepto.porcentaje) || 0;

    // Si no es Horas Extras, proceder con la lógica anterior
    let baseCalculo = 0;

    // Para Luz y Fuerza: CONCEPTO_LYF se calcula sobre categoría 11
    if (concepto.tipo === 'CONCEPTO_LYF' && !concepto.isDescuento) {
      // Verificar si el concepto tiene baseCalculo = 'BASICO_CATEGORIA_11' o no tiene campo
      const baseCalculoConcepto = concepto?.baseCalculo ?? concepto?.base_calculo;
      if (!baseCalculoConcepto || baseCalculoConcepto === 'BASICO_CATEGORIA_11' || baseCalculoConcepto === 'basico_categoria_11') {
      baseCalculo = basicoCat11;
      } else {
        // Si tiene otro valor (no debería llegar aquí si es TOTAL_BRUTO, pero por seguridad)
        baseCalculo = basicoCat11;
      }
    } else {
      // Para otros casos (CONCEPTO_UOCRA o si no hay básico de cat 11): usar el básico del empleado
      if (!formData.salary) return 0;
      baseCalculo = Number(formData.salary) || 0;
    }

    if (baseCalculo <= 0) return 0;
    const montoUnitario = (baseCalculo * porcentaje) / 100;
    return montoUnitario * unidades;
  };

  // Calcula el sueldo bruto (remuneraciones sin descuentos)
  const calculateSueldoBruto = () => {
    const salarioBasico = Number(formData.salary) || 0;
    const bonoArea = formData.gremio === 'LUZ_Y_FUERZA' ? (Number(formData.bonoArea) || 0) : 0;
    
    // Sumar todas las remuneraciones (básico + bono área + bonificaciones)
    const totalBonificaciones = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
      const concepto = conceptos.find(c => c.id === conceptId);
      if (!concepto) return sum;
      const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';
      if (isDescuento) return sum; // Los descuentos no se incluyen en el bruto
      
      const units = conceptosSeleccionados[conceptId]?.units ?? '';
      const unitsNum = Number(units);
      if (!unitsNum || unitsNum <= 0) return sum;
      
      // Calcular total de la bonificación
      const total = calculateConceptTotal(concepto, unitsNum, null, false);
      return sum + total;
    }, 0);
    
    return salarioBasico + bonoArea + totalBonificaciones;
  };
    
  // Calcula el total de descuentos
  const calculateTotalDescuentos = () => {
    const totalRemuneraciones = calculateSueldoBruto();
    
    // PASO 1: Calcular primero los descuentos que NO usan TOTAL_NETO
    let descuentosNoTotalNeto = 0;
    let descuentosConTotalNeto = 0;
    
    Object.keys(conceptosSeleccionados).forEach(conceptId => {
      const concepto = conceptos.find(c => c.id === conceptId);
      if (!concepto) return;
      const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';
      if (!isDescuento) return;
      
      const units = conceptosSeleccionados[conceptId]?.units ?? '';
      const unitsNum = Number(units);
      if (!unitsNum || unitsNum <= 0) return;
      
      const baseCalculoDescuento = concepto?.baseCalculo ?? concepto?.base_calculo;
      const usaTotalBruto = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto';
      const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
      
      if (usaTotalBruto) {
        // Descuento sobre TOTAL_BRUTO
        const cantidadComoPorcentaje = unitsNum;
        if (cantidadComoPorcentaje > 0 && totalRemuneraciones > 0) {
          descuentosNoTotalNeto += Math.abs(totalRemuneraciones * cantidadComoPorcentaje / 100);
        }
      } else if (!usaTotalNeto && concepto.porcentaje && totalRemuneraciones > 0) {
        // Comportamiento tradicional
        const montoUnitario = (totalRemuneraciones * concepto.porcentaje / 100);
        descuentosNoTotalNeto += Math.abs(montoUnitario * unitsNum);
      }
      // Si usa TOTAL_NETO, se calculará después
    });
    
    // PASO 2: Calcular neto preliminar (remuneraciones - descuentos que no usan TOTAL_NETO)
    const netoPreliminar = totalRemuneraciones - descuentosNoTotalNeto;
    
    // PASO 3: Calcular descuentos que usan TOTAL_NETO sobre el neto preliminar
    Object.keys(conceptosSeleccionados).forEach(conceptId => {
      const concepto = conceptos.find(c => c.id === conceptId);
      if (!concepto) return;
      const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';
      if (!isDescuento) return;
      
      const units = conceptosSeleccionados[conceptId]?.units ?? '';
      const unitsNum = Number(units);
      if (!unitsNum || unitsNum <= 0) return;
      
      const baseCalculoDescuento = concepto?.baseCalculo ?? concepto?.base_calculo;
      const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
      
      if (usaTotalNeto) {
        // Descuento sobre TOTAL_NETO (neto preliminar)
        const cantidadComoPorcentaje = unitsNum;
        if (cantidadComoPorcentaje > 0 && netoPreliminar > 0) {
          descuentosConTotalNeto += Math.abs(netoPreliminar * cantidadComoPorcentaje / 100);
        }
      }
    });
    
    return descuentosNoTotalNeto + descuentosConTotalNeto;
  };

  // Calcula el salario total estipulado inicial (neto)
  const calculateTotalSalary = () => {
    const sueldoBruto = calculateSueldoBruto();
    const totalDescuentos = calculateTotalDescuentos();
    return sueldoBruto - totalDescuentos;
  };

  // Maneja el toggle de selección de conceptos adicionales
  const handleConceptToggle = (conceptId) => {
    setConceptosSeleccionados((prev) => {
      const next = { ...prev };
      if (next[conceptId]) {
        delete next[conceptId];
      } else {
        next[conceptId] = { units: '1' }; // Iniciar con 1 unidad
      }
      return next;
    });
  };
  
  // Maneja el cambio en las unidades de un concepto seleccionado
  const handleUnitsChange = (conceptId, units) => {
    setConceptosSeleccionados((prev) => {
      return {
      ...prev,
        [conceptId]: { ...prev[conceptId] || {}, units }
      };
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Agregar Nuevo Empleado"
      size="medium"
      className="new-employee-modal"
    >
      <form onSubmit={handleSubmit} className="employee-form">
        {/* Información Personal */}
        <div className="form-section">
          <h3 className="section-title">
            <User className="title-icon" />
            Información Personal
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Legajo *</label>
              <input
                type="text"
                className="form-input"
                value={formData.legajo}
                readOnly
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label">CUIL *</label>
              <input
                type="text"
                className="form-input"
                value={formData.cuil}
                onChange={(e) => handleInputChange('cuil', e.target.value)}
                placeholder="20-12345678-9"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input
                type="text"
                className={`form-input ${errors.nombre ? 'error' : ''}`}
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                placeholder="Ingrese el nombre"
              />
              {errors.nombre && <span className="error-message">{errors.nombre}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Apellido *</label>
              <input
                type="text"
                className={`form-input ${errors.apellido ? 'error' : ''}`}
                value={formData.apellido}
                onChange={(e) => handleInputChange('apellido', e.target.value)}
                placeholder="Ingrese el apellido"
              />
              {errors.apellido && <span className="error-message">{errors.apellido}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Domicilio</label>
              <input
                type="text"
                className="form-input"
                value={formData.domicilio}
                onChange={(e) => handleInputChange('domicilio', e.target.value)}
                placeholder="Ingrese domicilio"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sexo</label>
              <select
                className="form-select"
                value={formData.sexo}
                onChange={(e) => handleInputChange('sexo', e.target.value)}
              >
                <option value="">Seleccione...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </div>
        </div>

        {/* Información Laboral */}
        <div className={'form-section'}>
          <h3 className={'section-title'}>
            <Building className={'title-icon'} />
            Información Laboral
          </h3>
          <div className={'form-grid'}>
            <div className="form-group">
              <label className="form-label">Gremio *</label>
              <select
                className={`form-select ${errors.gremio ? 'error' : ''}`}
                value={formData.gremio || ''}
                onChange={(e) => handleGremioChange(e.target.value)}
              >
                <option value="Convenio General">Convenio General</option>
                <option value="LUZ_Y_FUERZA">LUZ Y FUERZA</option>
                <option value="UOCRA">UOCRA</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Banco</label>
              <select
                className="form-select"
                value={formData.banco}
                onChange={(e) => handleInputChange('banco', e.target.value)}
              >
                <option value="Banco Nación">Banco Nación</option>
                <option value="Banco Provincia">Banco Provincia</option>
                <option value="Banco Santander">Banco Santander</option>
                <option value="Banco Galicia">Banco Galicia</option>
                <option value="BBVA">BBVA</option>
                <option value="Banco Macro">Banco Macro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Número de Cuenta</label>
              <input
                type="text"
                className="form-input"
                value={formData.cuenta}
                onChange={(e) => handleInputChange('cuenta', e.target.value)}
                placeholder="Ingrese el número de cuenta"
              />
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>Categoría *</label>
              <select
                className={`form-select ${errors.categoria ? 'error' : ''}`}
                value={formData.idCategoria || ''}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                disabled={!formData.gremio}
              >
                <option value="">Seleccionar categoría</option>
                {filteredCategorias.map((cat) => (
                  <option key={cat.idCategoria} value={cat.idCategoria}>
                    {getCatNombre(cat)}
                  </option>
                ))}
              </select>
              {errors.categoria && <span className="error-message">{errors.categoria}</span>}
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>Salario Básico *</label>
              <input
                type="text"
                className={`${'form-input'} ${errors.salary ? 'error' : ''}`}
                value={formData.salary ? formatCurrencyAR(formData.salary) : ''} 
                placeholder="—"
                disabled
                readOnly
                title="Este valor se establece por la categoría seleccionada"
              />
              {errors.salary && <span className="error-message">{errors.salary}</span>}
            </div>

            {/* Áreas o Zonas */}
            <div className="form-group">
              <label className="form-label">
                {formData.gremio === "UOCRA" ? "Zona" : "Área"}
              </label>

              {formData.gremio === "UOCRA" ? (
                // 🔹 Caso UOCRA: solo un select simple de zona (sin chips ni botones)
                <select
                  className="form-select"
                  value={formData.zonaId || ""}
                  onChange={(e) => {
                    const newZonaId = e.target.value ? Number(e.target.value) : null;
                    setFormData(prev => ({
                      ...prev,
                      zonaId: newZonaId,
                      // Si se deselecciona la zona, limpiar salario
                      salary: !newZonaId ? '' : prev.salary
                    }));
                  }}
                  disabled={!areasHabilitadas}
                >
                  <option value="">Seleccionar zona</option>
                  {areas.map((zona) => (
                    <option key={zona.idZona} value={zona.idZona}>
                      {zona.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                // 🔹 Caso general: múltiples áreas con chips y botón "+"
                <>
                  <div className="area-actions" style={{ display: "flex", gap: 8 }}>
                    <select
                      className="form-select"
                      value={selectedAreaToAdd}
                      onChange={(e) => handleAreaOrZonaSelect(e.target.value)}
                      disabled={!areasHabilitadas}
                    >
                      <option value="">Seleccionar área</option>
                      {areas
                        .filter((item) => !((formData.areas || []).includes(item.idArea)))
                        .map((item) => (
                          <option key={item.idArea} value={item.idArea}>
                            {item.nombre}
                          </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addSelectedArea}
                      disabled={
                        !selectedAreaToAdd ||
                        !areasHabilitadas ||
                        !formData.gremio ||
                        formData.gremio === "Convenio General"
                      }
                    >
                      +
                    </button>
                  </div>

                  {/* Chips de áreas seleccionadas debajo del desplegable */}
                  {(formData.areas || []).length > 0 && (
                    <div className="area-chips" style={{ marginTop: '8px' }}>
                      {(formData.areas || []).map((id, idx) => {
                        const ref = areas.find((a) => a.idArea === Number(id));
                        return (
                          <span key={idx} className="area-chip">
                            {ref ? ref.nombre : `Área #${id}`}
                            <button
                              type="button"
                              className="chip-remove"
                              onClick={() => removeArea(id)}
                              disabled={!areasHabilitadas}
                            >
                              –
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {errors?.areas && <span className="error-message">{errors.areas}</span>}
            </div>

            {formData.gremio === 'LUZ_Y_FUERZA' && (
              <div className={'form-group'}>
                <label className={'form-label'}>Bono de Área</label>
                <input
                  type="text"
                  className={'form-input'}
                  value={formData.bonoArea ? formatCurrencyAR(formData.bonoArea) : ''} 
                  placeholder="—"
                  disabled
                  readOnly
                  title="Este valor se calcula automáticamente según las áreas seleccionadas y el básico de categoría 11"
                />
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Fecha de Inicio de Actividad *</label>
              <input
                type="date"
                className={`form-input ${errors.inicioActividad ? 'error' : ''}`}
                value={formData.inicioActividad || ''}
                onChange={(e) => handleInputChange('inicioActividad', e.target.value)}
              />
              {errors.inicioActividad && <span className="error-message">{errors.inicioActividad}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Antigüedad</label>
              <input
                type="text"
                className="form-input"
                value={calculateAntiguedad(formData.inicioActividad)}
                readOnly
                disabled
                placeholder="—"
                title="Este valor se calcula automáticamente según la fecha de ingreso"
              />
            </div>
          </div>
        </div>
        {/* Conceptos Adicionales */}
        {/* Mostrar conceptos adicionales solo si hay gremio seleccionado (no Convenio General) */}
        {formData.gremio && formData.gremio !== "Convenio General" && (
          <div className="form-section conceptos-section">
            <h3 className="section-title">
              <ListChecks className="title-icon" />
              Conceptos Adicionales
            </h3>
            {conceptos.length === 0 ? (
              <p className="conceptos-empty-message">
                {formData.gremio === 'LUZ_Y_FUERZA' 
                  ? 'No hay conceptos disponibles para Luz y Fuerza' 
                  : formData.gremio === 'UOCRA'
                  ? 'No hay conceptos disponibles para UOCRA aún'
                  : 'No hay conceptos disponibles'}
              </p>
            ) : (
              <>
                {/* Selector para añadir conceptos uno a uno */}
                <div className="concept-add-row">
                  <select
                    className="form-select concept-select"
                    value={selectedConceptToAdd}
                    onChange={(e) => setSelectedConceptToAdd(e.target.value)}
                  >
                    <option value="">Agregar concepto...</option>
                    {conceptos
                      .filter(c => !conceptosSeleccionados[c.id])
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                          {c.tipo === 'HORA_EXTRA_LYF' && c.factor ? ` (Factor ${c.factor}x)` : ''}
                          {c.porcentaje && c.tipo !== 'HORA_EXTRA_LYF' ? ` (${c.porcentaje}%)` : ''}
                        </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm add-btn"
                    onClick={() => {
                      if (!selectedConceptToAdd) return;
                      const id = selectedConceptToAdd;
                      setConceptosSeleccionados(prev => ({ ...prev, [id]: { units: '1' } }));
                      setSelectedConceptToAdd('');
                    }}
                    disabled={!selectedConceptToAdd}
                    aria-label="Agregar concepto"
                  >
                    Agregar
                  </button>
                </div>

                {/* Tabla sólo con conceptos seleccionados */}
                <div className="conceptos-table">
                  <table className="conceptos-table-content">
                    <thead>
                      <tr>
                        <th style={{ width: '30%', textAlign: 'left' }}>Concepto</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>Porcentaje</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>Unidades</th>
                        <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(conceptosSeleccionados).map((conceptId) => {
                        const concepto = conceptos.find(c => String(c.id) === String(conceptId));
                        const units = conceptosSeleccionados[conceptId]?.units ?? '';
                        const isDescuento = concepto ? (concepto.isDescuento || concepto.tipo === 'DESCUENTO') : false;

                        const calcularTotalRemuneraciones = () => {
                          const salarioBasico = Number(formData.salary) || 0;
                          const bonoArea = formData.gremio === 'LUZ_Y_FUERZA' ? (Number(formData.bonoArea) || 0) : 0;
                          const totalBonificaciones = Object.keys(conceptosSeleccionados).reduce((sum, cid) => {
                            const c = conceptos.find(cc => String(cc.id) === String(cid));
                            if (!c || c.isDescuento || c.tipo === 'DESCUENTO') return sum;
                            const u = Number(conceptosSeleccionados[cid]?.units) || 0;
                            if (!u || u <= 0) return sum;
                            return sum + calculateConceptTotal(c, u);
                          }, 0);
                          return salarioBasico + bonoArea + totalBonificaciones;
                        };

                        const totalRemuneraciones = isDescuento ? calcularTotalRemuneraciones() : null;
                        const total = concepto && units && Number(units) > 0 ? calculateConceptTotal(concepto, Number(units), totalRemuneraciones) : 0;

                        return (
                          <tr key={conceptId} className={`${isDescuento ? 'descuento-row' : ''}`}>
                            <td style={{ textAlign: 'left' }}>
                              <span className="concepto-label">{concepto ? concepto.nombre : `Concepto ${conceptId}`}</span>
                            </td>
                            <td style={{ textAlign: 'center' }} className="porcentaje-cell">
                              {concepto && concepto.tipo === 'HORA_EXTRA_LYF' 
                                ? (concepto.factor ? `Factor ${concepto.factor}x` : '-')
                                : (concepto && concepto.porcentaje ? `${concepto.porcentaje}%` : '-')
                              }
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="text"
                                value={units}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Permitir solo números enteros (sin decimales)
                                  if (value === '' || /^\d+$/.test(value)) {
                                    handleUnitsChange(conceptId, value);
                                  }
                                }}
                                className="units-input-field"
                                placeholder="0"
                              />
                            </td>
                            <td style={{ textAlign: 'right' }} className={`total-cell ${isDescuento ? 'descuento-total' : ''}`}>{units && total !== 0 ? formatCurrencyAR(total) : '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button type="button" className="icon-btn delete-btn" onClick={() => setConceptosSeleccionados(prev => { const next = { ...prev }; delete next[conceptId]; return next; })} title="Quitar concepto" aria-label="Quitar concepto">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Resumen del Salario Total */}
        <div className="form-section salary-summary-section">
          <h3 className="salary-summary-title">Sueldo Estipulado Inicial</h3>
          <div className="salary-summary-details">
            <div className="salary-detail-item bruto">
              <span className="salary-detail-label">Sueldo Bruto</span>
              <span className="salary-detail-value">{formatCurrencyAR(calculateSueldoBruto())}</span>
            </div>
            <div className="salary-detail-item descuentos">
              <span className="salary-detail-label">Descuentos</span>
              <span className="salary-detail-value">{formatCurrencyAR(calculateTotalDescuentos())}</span>
            </div>
            <div className="salary-detail-item neto">
              <span className="salary-detail-label">Sueldo Neto</span>
              <span className="salary-detail-value">{formatCurrencyAR(calculateTotalSalary())}</span>
            </div>
          </div>
        </div>

        <ModalFooter>
          <button 
            type="button" 
            className="btn btn-cancel" 
            onClick={handleClose}
            disabled={isLoading}
            >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
            >
            <UserPlus className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Crear Empleado'}
          </button>
        </ModalFooter>
      </form>
      <ConfirmDialog />
    </Modal>
  );
}