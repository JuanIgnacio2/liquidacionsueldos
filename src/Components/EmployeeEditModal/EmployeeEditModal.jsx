import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { User, Building, DollarSign, Save, X, ListChecks, Trash2 } from 'lucide-react';
import * as api from "../../services/empleadosAPI";
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

export function EmployeeEditModal({ isOpen, onClose, employee, onSave }) {
  // ---------- Estado del formulario ----------
  const [formData, setFormData] = useState({
    legajo: '',
    nombre: '',
    apellido: '',
    domicilio: '',
    areas: [],
    status: 'Activo',
    gremio: 'Convenio General',
    categoria: '',
    idCategoria: null,
    gremioId: null,
    idZonaUocra: null,
    bank: 'Banco Nación',
    inicioActividad: '',
    cuil: '',
    cuenta: '',
    salary: '',
    bonoArea: 0,
    sexo: 'M'
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
  const [basicoCat11, setBasicoCat11] = useState(0);

  // Rango de categorías por gremio
  const LUZ_Y_FUERZA_IDS = Array.from({ length: 18 }, (_, i) => i + 1);

  // Funciones helper para categorías (deben estar antes de los useEffects)
  const getCatId = (c) => c?.id ?? c?.idCategoria ?? c?.categoriaId;
  const getCatNombre = (c) => c?.nombre ?? c?.descripcion ?? c?.categoria ?? `Categoría ${getCatId(c)}`;
  const getCatBasico = (c) => c?.salarioBasico ?? c?.basico ?? c?.sueldoBasico ?? c?.monto ?? c?.salario ?? 0;

  // Normaliza strings para comparar sin importar mayúsculas, tildes, espacios, etc.
  const normalize = (s) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  
  // Compara dos strings normalizados
  const sameName = (a, b) => normalize(a) === normalize(b);

  const findCategoriaById = (id) => categorias.find(c => String(getCatId(c)) === String(id));
  const findCategoriaByName = (name) => 
    categorias.find(c => sameName(getCatNombre(c), name));

  // Función para mapear el gremio del empleado al formato del modal
  const mapGremioToModal = (gremio) => {
    if (!gremio) return 'Convenio General';
    
    // Puede venir como string directamente
    if (typeof gremio === 'string') {
      const upper = gremio.toUpperCase();
      if (upper.includes('LUZ') && upper.includes('FUERZA')) return 'LUZ_Y_FUERZA';
      if (upper === 'UOCRA') return 'UOCRA';
      return 'Convenio General';
    }
    
    // Puede venir como objeto con propiedad nombre
    if (gremio.nombre) {
      const upper = gremio.nombre.toUpperCase();
      if (upper.includes('LUZ') && upper.includes('FUERZA')) return 'LUZ_Y_FUERZA';
      if (upper === 'UOCRA') return 'UOCRA';
      return 'Convenio General';
    }
    
    return 'Convenio General';
  };

  const GREMIOS = {
    'LUZ_Y_FUERZA': 1,
    'UOCRA': 2,
    'Convenio General': 0
  };

  // Función helper para obtener el tipo de concepto según el gremio
  const getTipoConcepto = (gremio) => {
    if (gremio === 'LUZ_Y_FUERZA') return 'CONCEPTO_LYF';
    if (gremio === 'UOCRA') return 'CONCEPTO_UOCRA';
    return 'BONIFICACION_FIJA'; // Fallback (no debería usarse con Convenio General)
  };

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

  // ---------- Catálogo de categorías ----------
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const data = await api.getCategorias(); // hace el fetch con axios
        const ordenadas = data.sort((a, b) => a.idCategoria - b.idCategoria);
        setCategorias(ordenadas); // guarda las categorías ordenadas en el estado
      } catch (err) {
        console.error("Error loading categories:", err);
      }
    };
    loadCategorias();
  }, []);

  // Carga los conceptos (bonificaciones fijas, descuentos y conceptos generales) desde la API
  useEffect(() => {
    const loadConceptos = async () => {
      try {
        // Cargar conceptos generales siempre (no dependen del gremio)
        let conceptosGeneralesData = [];
        try {
          conceptosGeneralesData = await api.getConceptosGenerales();
        } catch (error) {
          console.error('Error al cargar conceptos generales:', error);
        }

        // Solo cargar conceptos específicos del gremio si hay un gremio seleccionado y no es Convenio General
        if (!formData.gremio || formData.gremio === 'Convenio General') {
          // Solo conceptos generales si no hay gremio
          const mappedConceptosGenerales = conceptosGeneralesData.map((concepto) => {
            const originalId = concepto.idConceptoGeneral ?? concepto.id;
            return {
              id: `GEN_${originalId}`, // Prefijo para conceptos generales
              originalId: originalId, // ID original para enviar al backend
              nombre: concepto.nombre ?? concepto.descripcion,
              unidad: 'manual', // Monto manual
              porcentaje: null,
              montoUnitario: null, // Se establece manualmente
              tipo: 'CONCEPTO_GENERAL',
              isDescuento: false,
              cantidadFija: 1 // Siempre cantidad 1
            };
          });
          setConceptos(mappedConceptosGenerales);
          return;
        }

        // Cargar bonificaciones fijas según el gremio
        let bonificacionesData = [];
        if (formData.gremio === 'LUZ_Y_FUERZA') {
          bonificacionesData = await api.getConceptosLyF();
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
            id: `BON_${originalId}`, // Prefijo para bonificaciones
            originalId: originalId, // ID original para enviar al backend
            nombre: concepto.nombre ?? concepto.descripcion,
            unidad: concepto.porcentaje ? '%' : 'monto',
            porcentaje: concepto.porcentaje ?? null,
            montoUnitario: concepto.montoUnitario ?? concepto.monto ?? null,
            tipo: getTipoConcepto(formData.gremio),
            isDescuento: false
          };
        });
        
        // Mapear descuentos - usar prefijo 'DESC_' para evitar conflictos de IDs
        const mappedDescuentos = descuentosData.map((descuento) => {
          const originalId = descuento.idDescuento ?? descuento.id;
          return {
            id: `DESC_${originalId}`, // Prefijo para descuentos
            originalId: originalId, // ID original para enviar al backend
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
        setConceptos([]);
      }
    };
    loadConceptos();
  }, [formData.gremio]);

  // Determina qué concepto de "Suplemento antigüedad" debe asignarse según antigüedad y sexo
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

  // Asignar automáticamente "Suplemento antigüedad" para Luz y Fuerza según antigüedad y sexo
  useEffect(() => {
    // Solo para Luz y Fuerza
    if (formData.gremio !== 'LUZ_Y_FUERZA' || !formData.inicioActividad || conceptos.length === 0) {
      return;
    }

    // Calcular años de antigüedad (solo años completos, sin meses)
    const añosAntiguedad = calculateAniosAntiguedad(formData.inicioActividad);
    
    // Determinar qué suplemento debería tener
    const suplementoRequerido = determinarSuplementoAntiguedad(añosAntiguedad, formData.sexo);

    // Buscar todos los conceptos de suplemento antigüedad en el catálogo
    const conceptosSuplemento = conceptos.filter(c => {
      const nombreNormalizado = normalize(c.nombre || '');
      return nombreNormalizado.includes('suplemento antiguedad') || 
             nombreNormalizado.includes('suplemento antigüedad');
    });

    // Buscar qué suplementos tiene asignados actualmente
    const suplementosAsignados = Object.keys(conceptosSeleccionados).filter(conceptId => {
      const concepto = conceptos.find(c => String(c.id) === String(conceptId));
      if (!concepto) return false;
      const nombreNormalizado = normalize(concepto.nombre || '');
      return nombreNormalizado.includes('suplemento antiguedad') || 
             nombreNormalizado.includes('suplemento antigüedad');
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
        const nombreNormalizado = normalize(c.nombre || '');
        // Verificar que el nombre normalizado contenga todas las partes clave
        return partesClave.every(parte => nombreNormalizado.includes(parte));
      });
    }

    // Verificar si tiene el suplemento correcto asignado
    const suplementoCorrectoAsignado = conceptoSuplementoCorrecto 
      ? suplementosAsignados.includes(String(conceptoSuplementoCorrecto.id))
      : false;

    // Verificar si tiene suplementos incorrectos
    const tieneSuplementosIncorrectos = suplementosAsignados.some(conceptId => {
      if (!conceptoSuplementoCorrecto) return true; // Si no debería tener ninguno, cualquier suplemento es incorrecto
      return String(conceptId) !== String(conceptoSuplementoCorrecto.id);
    });

    // Si necesita actualización
    if (suplementoRequerido && (!suplementoCorrectoAsignado || tieneSuplementosIncorrectos)) {
      setConceptosSeleccionados(prev => {
        const next = { ...prev };
        
        // Quitar todos los suplementos antiguos
        suplementosAsignados.forEach(conceptId => {
          delete next[conceptId];
        });
        
        // Agregar el suplemento correcto con 1 unidad
        if (conceptoSuplementoCorrecto) {
          next[conceptoSuplementoCorrecto.id] = { units: '1' };
        }
        
        return next;
      });
    } else if (!suplementoRequerido && suplementosAsignados.length > 0) {
      // Si no debería tener suplemento pero lo tiene, removerlo
      setConceptosSeleccionados(prev => {
        const next = { ...prev };
        suplementosAsignados.forEach(conceptId => {
          delete next[conceptId];
        });
        return next;
      });
    }
  }, [formData.gremio, formData.inicioActividad, formData.sexo, conceptos, conceptosSeleccionados]);

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

  // ---------- Manejo de categoría y salario básico ----------
  useEffect(() => {
    if (!categorias.length) return;

    // preferimos el id si ya está (por ej. usuario seleccionó algo)
    if (formData.idCategoria) {
      const cat = findCategoriaById(formData.idCategoria);
      if (cat) {
        // Si es UOCRA y hay zona seleccionada, calcular con el endpoint
        if (formData.gremio === 'UOCRA' && formData.idZona) {
          const calculateSalary = async () => {
            try {
              const basicoData = await api.getBasicoByCatAndZona(formData.idCategoria, formData.idZona);
              const basico = Number(basicoData?.basico ?? basicoData?.salarioBasico ?? basicoData?.monto ?? basicoData?.salario ?? 0);
              setFormData(prev => {
                const currentSalary = Number(prev.salary) || 0;
                // Actualizar si el salario está vacío o si el básico es diferente
                if (!prev.salary || currentSalary !== basico || prev.categoria !== getCatNombre(cat)) {
                  return { ...prev, salary: String(basico), categoria: getCatNombre(cat) };
                }
                return prev;
              });
            } catch (error) {
              console.error('Error al obtener básico por zona y categoría:', error);
              // Fallback al básico de la categoría
              const basico = Number(getCatBasico(cat)) || 0;
              setFormData(prev => {
                const currentSalary = Number(prev.salary) || 0;
                // Actualizar si el salario está vacío o si el básico es diferente
                if (!prev.salary || currentSalary !== basico || prev.categoria !== getCatNombre(cat)) {
                  return { ...prev, salary: String(basico), categoria: getCatNombre(cat) };
                }
                return prev;
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

    // si no hay id, intentamos matchear por nombre que vino en employee
    const name = formData.categoria || employee?.categoria || employee?.nombreCategoria;
    if (!name) return;

    const match = findCategoriaByName(name);
    if (match) {
      // Si es UOCRA y hay zona seleccionada, calcular con el endpoint
      if (formData.gremio === 'UOCRA' && formData.idZona) {
        const calculateSalary = async () => {
          try {
            const basicoData = await api.getBasicoByCatAndZona(getCatId(match), formData.idZona);
            const basico = Number(basicoData?.basico ?? basicoData?.salarioBasico ?? basicoData?.monto ?? basicoData?.salario ?? 0);
            setFormData(prev => ({
              ...prev,
              idCategoria: getCatId(match),
              categoria: getCatNombre(match),
              salary: String(basico),
            }));
          } catch (error) {
            console.error('Error al obtener básico por zona y categoría:', error);
            // Fallback al básico de la categoría
            const basico = Number(getCatBasico(match)) || 0;
            setFormData(prev => ({
              ...prev,
              idCategoria: getCatId(match),
              categoria: getCatNombre(match),
              salary: String(basico),
            }));
          }
        };
        calculateSalary();
      } else {
        // Para Luz y Fuerza o Convenio General, usar el básico de la categoría directamente
        const basico = Number(getCatBasico(match)) || 0;
        setFormData(prev => ({
          ...prev,
          idCategoria: getCatId(match),
          categoria: getCatNombre(match),
          salary: String(basico),
        }));
      }
      setCategoriaNoEncontrada(false);
    } else {
      setCategoriaNoEncontrada(true);
    }
  }, [categorias, formData.idCategoria, formData.categoria, formData.idZona, formData.gremio, employee?.categoria]);

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
        console.error('Error al obtener categoría 11:', error);
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
            console.warn('No se pudo obtener el básico de categoría 11');
            setFormData(prev => ({ ...prev, bonoArea: 0 }));
            return;
          }
        }

        // Calcular bonos para cada área usando el porcentaje de la categoría del empleado y el básico de categoría 11
        const bonosPromises = formData.areas.map(async (areaId) => {
          try {
            // Usar la categoría del empleado para obtener el porcentaje de área
            const porcentajeResponse = await api.getPorcentajeArea(Number(areaId), formData.idCategoria);
            // El porcentaje puede venir como número directo o como objeto con propiedad porcentaje
            const porcentajeNum = typeof porcentajeResponse === 'number' 
              ? porcentajeResponse 
              : Number(porcentajeResponse?.porcentaje ?? porcentajeResponse) || 0;
            // Calcular: (básico_cat11 * porcentaje) / 100
            return (basicoCat11Value * porcentajeNum) / 100;
          } catch (error) {
            console.error(`Error al obtener porcentaje para área ${areaId}:`, error);
            return 0;
          }
        });

        const bonos = await Promise.all(bonosPromises);
        const bonoTotal = bonos.reduce((sum, bono) => sum + bono, 0);

        setFormData(prev => ({ ...prev, bonoArea: bonoTotal }));
      } catch (error) {
        console.error('Error al calcular bono de área:', error);
        setFormData(prev => ({ ...prev, bonoArea: 0 }));
      }
    };

    // Solo calcular si el modal está abierto y hay datos válidos
    if (isOpen) {
      calculateBonoArea();
    }
  }, [formData.areas, formData.gremio, basicoCat11, isOpen]); // Agregado isOpen para recalcular al abrir

  // Calcula el salario básico cuando cambia la zona o categoría en UOCRA
  useEffect(() => {
    const calculateSalaryByZona = async () => {
      // Solo calcular si es UOCRA, hay categoría y zona seleccionadas
      if (formData.gremio !== 'UOCRA' || !formData.idCategoria || !formData.idZona) {
        // Si es UOCRA pero falta zona o categoría, limpiar salario solo si ya tenía un valor
        if (formData.gremio === 'UOCRA' && (!formData.idCategoria || !formData.idZona)) {
          setFormData(prev => {
            // Solo limpiar si había un salario previo y ahora falta zona o categoría
            if (prev.salary && (!prev.idCategoria || !prev.idZona)) {
              return { ...prev, salary: '' };
            }
            return prev;
          });
        }
        return;
      }

      try {
        const basicoData = await api.getBasicoByCatAndZona(formData.idCategoria, formData.idZona);
        const basico = Number(basicoData?.basico ?? basicoData?.salarioBasico ?? basicoData?.monto ?? basicoData?.salario ?? 0);
        
        setFormData(prev => {
          // Verificar que los valores todavía coinciden (para evitar actualizaciones obsoletas)
          if (prev.gremio === 'UOCRA' && prev.idCategoria === formData.idCategoria && prev.idZona === formData.idZona) {
            const currentSalary = Number(prev.salary) || 0;
            // Actualizar siempre si el básico es diferente o si el salario está vacío
            if (currentSalary !== basico || !prev.salary) {
              return { ...prev, salary: String(basico) };
            }
            return prev;
          }
          return prev;
        });
      } catch (error) {
        console.error('Error al obtener básico por zona y categoría:', error);
        // Si falla, usar el básico de la categoría como fallback
        const cat = findCategoriaById(formData.idCategoria);
        if (cat) {
          const basico = Number(getCatBasico(cat)) || 0;
          setFormData(prev => {
            if (prev.gremio === 'UOCRA' && prev.idCategoria === formData.idCategoria && prev.idZona === formData.idZona) {
              const currentSalary = Number(prev.salary) || 0;
              // Actualizar siempre si el básico es diferente o si el salario está vacío
              if (currentSalary !== basico || !prev.salary) {
                return { ...prev, salary: String(basico) };
              }
              return prev;
            }
            return prev;
          });
        } else {
          // Si no se encuentra la categoría, limpiar el salario
          setFormData(prev => {
            if (prev.gremio === 'UOCRA' && prev.idCategoria === formData.idCategoria && prev.idZona === formData.idZona) {
              return { ...prev, salary: '' };
            }
            return prev;
          });
        }
      }
    };

    calculateSalaryByZona();
  }, [formData.idZona, formData.gremio, formData.idCategoria, categorias]);

  const handleCategoriaChange = async (id) => {
    const cat = findCategoriaById(Number(id));
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
    // Si es UOCRA, el useEffect calculará el salario automáticamente cuando cambie idCategoria o idZona
    setFormData(prev => {
      // Si no es UOCRA o no hay zona, calcular el básico directamente
      if (prev.gremio !== 'UOCRA' || !prev.idZona) {
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

  // ---------- Precarga de datos al editar ----------
  useEffect(() => {
    if (employee && isOpen) {
      // Mapear el gremio correctamente
      const gremioModal = mapGremioToModal(employee.gremioNombre || employee.gremio);
      const gremioId = GREMIOS[gremioModal] || null;
      const idZona = employee.idZona || employee.idZonaUocra || null;
      
      setFormData(prev => ({
        ...prev,
        legajo: employee.legajo ?? '',
        nombre: employee.nombre || '',
        apellido: employee.apellido || '',
        domicilio: employee.domicilio || '',
        status: employee.estado === 'ACTIVO' ? 'Activo' : 'Inactivo',
        gremio: gremioModal,
        gremioId: gremioId,
        categoria: employee.categoriaNombre || employee.categoria || '',
        idCategoria: employee.idCategoria || employee.categoriaId || null,
        bank: employee.banco || 'Banco Nación',
        inicioActividad: employee.inicioActividad 
          ? (employee.inicioActividad.includes('T') 
              ? employee.inicioActividad.split('T')[0] 
              : employee.inicioActividad)
          : '',
        cuil: employee.cuil || '',
        salary: employee.salary ?? '',
        cuenta: employee.cuenta || '',
        areas: Array.isArray(employee.idAreas) ? employee.idAreas : [],
        idZona: idZona,
        bonoArea: 0, // Inicializar en 0 para que se recalcule
        sexo: employee.sexo || 'M',
      }));
      setErrors({});
    }
  }, [employee, isOpen]);

  // Cargar conceptos asignados del empleado cuando se abre el modal o cambia el empleado/gremio
  useEffect(() => {
    const loadConceptosAsignados = async () => {
      // Solo cargar si hay empleado, el modal está abierto, hay legajo y hay gremio seleccionado
      if (!employee || !isOpen || !employee.legajo || !formData.gremio || formData.gremio === 'Convenio General') {
        // Si no se cumplen las condiciones, limpiar conceptos seleccionados
        if (!employee || !isOpen) {
          setConceptosSeleccionados({});
        }
        return;
      }

      try {
        // Cargar conceptos asignados del empleado
        const asignados = await api.getConceptosAsignados(employee.legajo);
        
        // Cargar catálogos necesarios para mapear correctamente
        let bonificacionesFijas = [];
        let descuentosData = [];
        let horasExtrasLyF = [];
        
        if (formData.gremio === 'LUZ_Y_FUERZA') {
          bonificacionesFijas = await api.getConceptosLyF();
          horasExtrasLyF = await api.getHorasExtrasLyF();
        } else if (formData.gremio === 'UOCRA') {
          bonificacionesFijas = await api.getConceptosUocra();
        }
        descuentosData = await api.getDescuentos();
        
        // Filtrar bonificaciones fijas, descuentos y horas extras (incluyendo CONCEPTO_LYF, CONCEPTO_UOCRA, HORA_EXTRA_LYF y HORA_EXTRA_LYF)
        const conceptosAsignados = asignados.filter(
          asignado => asignado.tipoConcepto === 'CONCEPTO_LYF' || 
                      asignado.tipoConcepto === 'CONCEPTO_UOCRA' || 
                      asignado.tipoConcepto === 'DESCUENTO' ||
                      asignado.tipoConcepto === 'HORA_EXTRA_LYF'
        );

        // Mapear a formato de conceptosSeleccionados: { conceptId: { units: 'X' } }
        // Usar prefijos 'BON_', 'DESC_' o 'HE_' para que coincidan con los IDs únicos
        const conceptosPrecargados = {};
        conceptosAsignados.forEach(asignado => {
          const originalId = Number(asignado.idReferencia);
          if (originalId && !isNaN(originalId)) {
            // Determinar el prefijo según el tipo de concepto
            let prefijo = 'BON_';
            if (asignado.tipoConcepto === 'DESCUENTO') {
              prefijo = 'DESC_';
            } else if (asignado.tipoConcepto === 'HORA_EXTRA_LYF') {
              prefijo = 'HE_';
            }
            const conceptId = `${prefijo}${originalId}`;
            
            // Verificar que el concepto existe en el catálogo actual
            let conceptoExiste = false;
            if (prefijo === 'HE_') {
              conceptoExiste = horasExtrasLyF.some(he => (he.idHoraExtra ?? he.id) === originalId);
            } else if (prefijo === 'DESC_') {
              conceptoExiste = descuentosData.some(d => (d.idDescuento ?? d.id) === originalId);
            } else {
              conceptoExiste = bonificacionesFijas.some(b => (b.idBonificacion ?? b.id) === originalId);
            }
            
            // Solo agregar si el concepto existe en el catálogo actual
            if (conceptoExiste) {
              conceptosPrecargados[conceptId] = {
                units: String(asignado.unidades || 1)
              };
            }
          }
        });

        setConceptosSeleccionados(conceptosPrecargados);
      } catch (error) {
        console.error('Error al cargar conceptos asignados:', error);
        setConceptosSeleccionados({});
      }
    };

    loadConceptosAsignados();
  }, [employee, isOpen, formData.gremio]);

  // ---------- Helpers generales ----------
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validación según el gremio
    if (formData.gremio === 'LUZ_Y_FUERZA') {
      // Para Luz y Fuerza: validar que haya al menos un área
      if (!formData.areas || formData.areas.length === 0) {
        newErrors.areas = 'Elegí al menos un área';
      }
    } else if (formData.gremio === 'UOCRA') {
      // Para UOCRA: validar que haya una zona seleccionada
      if (!formData.idZona) {
        newErrors.areas = 'Elegí una zona';
      }
    }
    // Para Convenio General no se requiere validación de áreas/zonas

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Función para guardar el empleado (lógica separada para poder llamarla después de la confirmación)
  const saveEmployee = async () => {
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
          } else {
            tipoConcepto = getTipoConcepto(formData.gremio);
          }
          // Usar originalId para enviar al backend (sin prefijo)
          conceptosAsignados.push({
            idEmpleadoConcepto: null, // Nuevo concepto
            legajo: Number(formData.legajo),
            tipoConcepto: tipoConcepto,
            idReferencia: Number(concepto.originalId),
            unidades: Number(units) // Para CONCEPTO_GENERAL siempre será 1
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
      if (formData.gremio === 'UOCRA' && formData.idZona && formData.idCategoria) {
        conceptosAsignados.push({
          idEmpleadoConcepto: null,
          legajo: Number(formData.legajo),
          tipoConcepto: 'CATEGORIA_ZONA',
          idReferencia: formData.idZona, // o podría ser el idCategoria, dependiendo de la lógica del backend
          unidades: 1
        });
      }
      
      // Construir el payload según el DTO
      const payload = {
        legajo: Number(formData.legajo),
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        cuil: formData.cuil || null,
        inicioActividad: formData.inicioActividad ? new Date(formData.inicioActividad).toISOString().split('T')[0] : null,
        domicilio: formData.domicilio || null,
        banco: formData.bank || null,
        cuenta: formData.cuenta || null,
        idCategoria: formData.idCategoria ? Number(formData.idCategoria) : null,
        idAreas: formData.areas && formData.areas.length > 0 ? formData.areas.map(a => Number(a)) : null,
        sexo: formData.sexo || null,
        idGremio: formData.gremioId ? Number(formData.gremioId) : null,
        idZonaUocra: formData.idZona ? Number(formData.idZona) : null,
        estado: formData.status === 'Activo' ? 'ACTIVO' : 'DADO_DE_BAJA',
        conceptosAsignados: conceptosAsignados.length > 0 ? conceptosAsignados : null
      };

      onSave && onSave(payload, true);
      onClose();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Mostrar diálogo de confirmación
    if (window.showConfirm) {
      const confirmed = await window.showConfirm({
        title: 'Modificar empleado',
        message: '¿Está seguro de modificar los datos del empleado?',
        confirmText: 'Sí, modificar',
        cancelText: 'Cancelar',
        type: 'warning',
        confirmButtonVariant: 'primary',
        cancelButtonVariant: 'secondary'
      });

      if (!confirmed) {
        return; // Si el usuario cancela, no hacer nada
      }
    }

    // Si confirma, proceder con el guardado
    await saveEmployee();
  };

  if (!employee) return null;

  // ---------- Áreas: chips + desplegable de disponibles ----------
  const removeArea = (id) => {
    setFormData(prev => ({ ...prev, areas: (prev.areas || []).filter(v => v !== id) }));
    if (errors && errors.areas) setErrors(prev => ({ ...prev, areas: '' }));
  };

  const addSelectedArea = () => {
    const id = Number(selectedAreaToAdd);
    if (!Number.isFinite(id)) return;
    setFormData(prev => {
      const curr = Array.isArray(prev.areas) ? prev.areas : [];

      if(formData.gremio === "UOCRA") {
        // En UOCRA, solo una zona permitida
        return { ...prev, idZona: id };
      }

      if (curr.includes(id)) return prev;
      return { ...prev, areas: [...curr, id] };
    });
    setSelectedAreaToAdd('');
    if (errors?.areas) setErrors(prev => ({ ...prev, areas: '' }));
  };

  const selectedSet = new Set((formData.areas || []).map(Number));
  const availableAreas = areas.filter(a => {
    if (formData.gremio === "UOCRA") {
      return !(formData.idZona && a.idZona === formData.idZona);
    }
    return !selectedSet.has(a.idArea || a.id);
  });

  // Función helper para identificar conceptos que se calculan sobre el total bruto
  const isConceptoCalculadoSobreTotalBruto = (nombreConcepto) => {
    const nombreNormalizado = normalize(nombreConcepto || '');
    return (
      nombreNormalizado.includes('bonif antiguedad') ||
      nombreNormalizado.includes('bonif antigüedad') ||
      nombreNormalizado.includes('suplemento antiguedad') ||
      nombreNormalizado.includes('suplemento antigüedad') ||
      nombreNormalizado.includes('art 50') ||
      nombreNormalizado.includes('art 69') ||
      nombreNormalizado.includes('art 70') ||
      nombreNormalizado.includes('art 72')
    );
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
  const calculateConceptTotal = (concepto, units, totalRemuneraciones = null) => {
    if (!concepto || !units || units <= 0) return 0;
    
    const unidades = Number(units) || 0;
    const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';

    // Si es CONCEPTO_GENERAL, usar monto manual (montoUnitario)
    if (concepto.tipo === 'CONCEPTO_GENERAL') {
      const montoManual = Number(conceptosSeleccionados[concepto.id]?.montoManual) || 0;
      return montoManual * unidades; // Siempre cantidad 1, pero por si acaso
    }

    // Si es descuento, calcular sobre el total de remuneraciones
    if (isDescuento) {
      if (!concepto.porcentaje || !totalRemuneraciones || totalRemuneraciones <= 0) return 0;
      const porcentaje = Number(concepto.porcentaje) || 0;
      const montoUnitario = (totalRemuneraciones * porcentaje) / 100;
      return -(montoUnitario * unidades);
    }

    // Manejo especial para Horas Extras de Luz y Fuerza (HORA_EXTRA_LYF)
    if (concepto.tipo === 'HORA_EXTRA_LYF') {
      const salarioBasico = Number(formData.salary) || 0;
      const bonoArea = formData.gremio === 'LUZ_Y_FUERZA' ? (Number(formData.bonoArea) || 0) : 0;

      // Calcular total remunerativo (básico + bono área + otras bonificaciones, sin horas extras ni descuentos)
      const otherBonificaciones = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
        if (String(conceptId) === String(concepto.id)) return sum; // excluir el propio concepto
        const c = conceptos.find(c => String(c.id) === String(conceptId));
        if (!c) return sum;
        const cIsDescuento = c.isDescuento || c.tipo === 'DESCUENTO';
        if (cIsDescuento) return sum;
        if (c.tipo === 'HORA_EXTRA_LYF') return sum; // Excluir otras horas extras
        const u = Number(conceptosSeleccionados[conceptId]?.units) || 0;
        if (!u || u <= 0) return sum;
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

    // Lógica por defecto
    let baseCalculo = 0;
    if (formData.gremio === 'LUZ_Y_FUERZA' && !concepto.isDescuento) {
      baseCalculo = basicoCat11;
    } else {
      if (!formData.salary) return 0;
      baseCalculo = Number(formData.salary) || 0;
    }
    
    if (baseCalculo <= 0) return 0;
    const montoUnitario = (baseCalculo * porcentaje) / 100;
    return montoUnitario * unidades;
  };

  // Calcula el salario total estipulado inicial
  const calculateTotalSalary = () => {
    const salarioBasico = Number(formData.salary) || 0;
    const bonoArea = formData.gremio === 'LUZ_Y_FUERZA' ? (Number(formData.bonoArea) || 0) : 0;
    
    // Primero sumar todas las remuneraciones (básico + bono área + bonificaciones)
    const totalBonificaciones = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
      const concepto = conceptos.find(c => c.id === conceptId);
      if (!concepto) return sum;
      const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';
      if (isDescuento) return sum; // Los descuentos se calculan después
      
      const units = conceptosSeleccionados[conceptId]?.units ?? '';
      const unitsNum = Number(units);
      if (!unitsNum || unitsNum <= 0) return sum;
      
      // Calcular total de la bonificación sobre el básico
      const total = calculateConceptTotal(concepto, unitsNum, null, false);
      return sum + total;
    }, 0);
    
    // Total de remuneraciones
    const totalRemuneraciones = salarioBasico + bonoArea + totalBonificaciones;
    
    // Luego calcular descuentos sobre el total de remuneraciones
    const totalDescuentos = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
      const concepto = conceptos.find(c => c.id === conceptId);
      if (!concepto) return sum;
      const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';
      if (!isDescuento) return sum; // Solo procesar descuentos
      
      const units = conceptosSeleccionados[conceptId]?.units ?? '';
      const unitsNum = Number(units);
      if (!unitsNum || unitsNum <= 0) return sum;
      
      // Calcular descuento sobre el total de remuneraciones
      const descuento = calculateConceptTotal(concepto, unitsNum, totalRemuneraciones);
      return sum + Math.abs(descuento); // Sumar el valor absoluto porque ya viene negativo
    }, 0);
    
    // Retornar: remuneraciones - descuentos
    return totalRemuneraciones - totalDescuentos;
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
  // Para conceptos generales, también puede recibir montoManual
  const handleUnitsChange = (conceptId, units, montoManual = null) => {
    setConceptosSeleccionados((prev) => {
      const updated = { ...prev[conceptId] || {}, units };
      if (montoManual !== null) {
        updated.montoManual = montoManual;
      }
      return {
        ...prev,
        [conceptId]: updated
      };
    });
  };

  // Maneja el cambio de gremio y limpia campos relacionados
  const handleGremioChange = (value) => {
    setFormData(prev => ({
      ...prev,
      gremio: value,
      gremioId: GREMIOS[value] || null,
      idCategoria: null,
      categoria: '',
      salary: '',
      areas: [],
      zonaId: null,
      bonoArea: 0,
    }));
    setConceptosSeleccionados({});
    // Limpiar errores relacionados
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.categoria;
      delete newErrors.areas;
      return newErrors;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Empleado - ${employee.nombre} ${employee.apellido}`}
      size="medium"
      className={'employee-edit-modal'}
    >

      <form onSubmit={handleSubmit} className={"employee-form"}>
        {/* Información Personal */}
        <div className={'form-section'}>
          <h3 className={'section-title'}>
            <User className={'title-icon'} />
            Información Personal
          </h3>
          <div className={'form-grid'}>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input
                type="text"
                className={`form-input ${errors.nombre ? "error" : ""}`}
                value={formData.nombre}
                onChange={(e) => handleInputChange("nombre", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Apellido *</label>
              <input
                type="text"
                className={`form-input ${errors.apellido ? "error" : ""}`}
                value={formData.apellido}
                onChange={(e) => handleInputChange("apellido", e.target.value)}
              />
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>Dirección</label>
              <input
                type="text"
                className={'form-input'}
                value={formData.domicilio}
                onChange={(e) => handleInputChange('domicilio', e.target.value)}
                placeholder="Dirección completa"
              />
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>CUIL</label>
              <input
                type="text"
                className={'form-input'}
                value={formData.cuil}
                onChange={(e) => handleInputChange('cuil', e.target.value)}
                placeholder="20-12345678-9"
              />
            </div>
            <div className={'form-group'}>
              <label className={'form-label'}>Sexo</label>
              <select
                className={'form-select'}
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
          <div className={'form-group'}>
            <label className={'form-label'}>Gremio</label>
              <select
                className={'form-select'}
                value={formData.gremio}
                onChange={(e) => handleGremioChange(e.target.value)}
              >
                <option value="Convenio General">Convenio General</option>
                <option value="LUZ_Y_FUERZA">Luz y Fuerza</option>
                <option value="UOCRA">UOCRA</option>
              </select>
            </div>

            {/* Áreas o Zonas */}
            <div className={'form-group'}>
              <label className={'form-label'}>
                {formData.gremio === "UOCRA" ? "Zona" : "Área"} *
              </label>

              {formData.gremio === "UOCRA" ? (
                // 🔹 Caso UOCRA: solo un select simple de zona (sin chips ni botones)
                <select
                  className="form-select"
                  value={formData.idZona || ""}
                  onChange={(e) => {
                    const newZonaId = e.target.value ? Number(e.target.value) : null;
                    setFormData(prev => ({
                      ...prev,
                      idZona: newZonaId,
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
                  <div className='area-actions' style={{ display: "flex", gap: 8 }}>
                    <select
                      className={`form-select ${errors && errors.areas ? 'error' : ''}`}
                      value={selectedAreaToAdd}
                      onChange={(e) => setSelectedAreaToAdd(e.target.value)}
                      disabled={!areasHabilitadas}
                    >
                      <option value="">Seleccionar área disponible</option>
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
                      disabled={!selectedAreaToAdd || !areasHabilitadas}
                      title="Agregar área seleccionada"
                    >
                      +
                    </button>
                  </div>

                  {/* Chips de áreas asignadas debajo del desplegable */}
                  {(formData.areas || []).length > 0 && (
                    <div className='area-chips' style={{ marginTop: '8px' }}>
                      {(formData.areas || []).map((id, idx) => {
                        const ref = areas.find(a => a.idArea === Number(id));
                        const nombre = ref
                          ? ref.nombre
                          : (employee?.nombreAreas?.[idx] ?? `Área #${id}`);
                        return (
                          <span key={`${id}-${idx}`} className="area-chip">
                            {nombre}
                            <button
                              type="button"
                              className="chip-remove"
                              onClick={() => removeArea(id)}
                              disabled={!areasHabilitadas}
                              aria-label={`Quitar ${nombre}`}
                              title="Quitar área"
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


              {errors && errors.areas && (
                <span className={'error-message'}>{errors.areas}</span>
              )}
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>Estado</label>
              <select
                className={'form-select'}
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
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

            

            <div className={'form-group'}>
              <label className={'form-label'}>Categoría</label>
              <select
                className={'form-select'}
                value={formData.idCategoria ?? ''}
                onChange={(e) => handleCategoriaChange(Number(e.target.value))}
                disabled={!formData.gremio}
              >
                <option value="">Seleccionar categoría</option>
                {filteredCategorias.map((c) => {
                  const id = getCatId(c);
                  const label = getCatNombre(c);
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {/* Aviso si el nombre del empleado no matcheó con el catálogo */}
              {categoriaNoEncontrada && formData.categoria && (
                <small className="hint">
                  No se encontró la categoría “{formData.categoria}” en el catálogo. Elegí una de la lista.
                </small>
              )}
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>Banco</label>
              <select
                className={'form-select'}
                value={formData.bank}
                onChange={(e) => handleInputChange('bank', e.target.value)}
              >
                <option value="Banco Nación">Banco Nación</option>
                <option value="Banco Provincia">Banco Provincia</option>
                <option value="Banco Santander">Banco Santander</option>
                <option value="Banco Galicia">Banco Galicia</option>
                <option value="BBVA">BBVA</option>
                <option value="Banco Macro">Banco Macro</option>
              </select>
            </div>
            <div className={'form-group'}>
              <label className={'form-label'}>Número de Cuenta</label>
              <input
                type="text"
                className={'form-input'}
                value={formData.cuenta}
                onChange={(e) => handleInputChange('cuenta', e.target.value)}
                placeholder="Ingrese el número de cuenta"
              />
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>Fecha de Inicio de Actividad</label>
              <input
                type="date"
                className={`form-input ${errors.inicioActividad ? 'error' : ''}`}
                value={formData.inicioActividad || ''}
                onChange={(e) => handleInputChange('inicioActividad', e.target.value)}
              />
              {errors.inicioActividad && <span className="error-message">{errors.inicioActividad}</span>}
            </div>
            <div className={'form-group'}>
              <label className={'form-label'}>Antigüedad</label>
              <input
                type="text"
                className={'form-input'}
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
        {/* Mostrar conceptos adicionales si hay gremio seleccionado (no Convenio General) o si hay conceptos generales */}
        {((formData.gremio && formData.gremio !== "Convenio General") || conceptos.some(c => c.tipo === 'CONCEPTO_GENERAL')) && (
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
                <div className="concept-add-row" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
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

                <div className="conceptos-table">
                  <table className="conceptos-table-content" style={{ width: '100%', tableLayout: 'auto' }}>
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
                            <td>
                              <span className="concepto-label">{concepto ? concepto.nombre : `Concepto ${conceptId}`}</span>
                            </td>
                            <td className="porcentaje-cell">
                              {concepto && concepto.tipo === 'HORA_EXTRA_LYF' 
                                ? (concepto.factor ? `Factor ${concepto.factor}x` : '-')
                                : (concepto && concepto.porcentaje ? `${concepto.porcentaje}%` : '-')
                              }
                            </td>
                            <td>
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
                            <td className={`total-cell ${isDescuento ? 'descuento-total' : ''}`}>{units && total !== 0 ? formatCurrencyAR(total) : '-'}</td>
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
          <div className="salary-summary">
            <label className="salary-summary-label">Salario Estipulado Inicial</label>
            <div className="salary-summary-total">
              {formatCurrencyAR(calculateTotalSalary())}
            </div>
          </div>
        </div>
      </form>

      <ModalFooter>
        <button 
          type="button" 
          className={`${'btn'} ${'btn-cancel'}`}
          onClick={onClose}
          disabled={isLoading}
        >
          <X className={'close-icon'} />
          Cancelar
        </button>
        <button 
          type="submit" 
          className={`${'btn'} ${'btn-primary'}`}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          <Save className={'save-icon'} />
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </ModalFooter>
      <ConfirmDialog />
    </Modal>
  );
}
