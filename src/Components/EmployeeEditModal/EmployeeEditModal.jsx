import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { User, Building, DollarSign, Save, X, ListChecks } from 'lucide-react';
import * as api from "../../services/empleadosAPI";

// Función helper para formatear moneda en formato argentino ($100.000,00)
const formatCurrencyAR = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0,00';
  const numValue = Number(value);
  const absValue = Math.abs(numValue);
  const parts = absValue.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${integerPart},${parts[1]}`;
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
    idZona: null,
    bank: 'Banco Nación',
    inicioActividad: '',
    cuil: '',
    cbu: '',
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
  const [filteredCategorias, setFilteredCategorias] = useState([]);
  const [areasHabilitadas, setAreasHabilitadas] = useState(false);

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

  // Carga los conceptos (bonificaciones fijas y descuentos) desde la API
  useEffect(() => {
    const loadConceptos = async () => {
      try {
        // Cargar bonificaciones fijas filtradas por gremio
        const bonificacionesData = await api.getConceptos();
        let filteredBonificaciones = [];
        if (formData.gremio === 'LUZ_Y_FUERZA') {
          // Luz y Fuerza: IDs del 1 al 31
          filteredBonificaciones = bonificacionesData.filter(concepto => {
            const id = concepto.idBonificacion ?? concepto.id;
            return id >= 1 && id <= 31;
          });
        } else if (formData.gremio === 'UOCRA') {
          // UOCRA: IDs a partir del 32
          filteredBonificaciones = bonificacionesData.filter(concepto => {
            const id = concepto.idBonificacion ?? concepto.id;
            return id >= 32;
          });
        }
        
        // Cargar descuentos (sin filtrar por gremio, son generales)
        const descuentosData = await api.getDescuentos();
        
        // Mapear bonificaciones - usar prefijo 'BON_' para evitar conflictos de IDs
        const mappedBonificaciones = filteredBonificaciones.map((concepto) => {
          const originalId = concepto.idBonificacion ?? concepto.id;
          return {
            id: `BON_${originalId}`, // Prefijo para bonificaciones
            originalId: originalId, // ID original para enviar al backend
            nombre: concepto.nombre ?? concepto.descripcion,
            unidad: concepto.porcentaje ? '%' : 'monto',
            porcentaje: concepto.porcentaje ?? null,
            montoUnitario: concepto.montoUnitario ?? concepto.monto ?? null,
            tipo: 'BONIFICACION_FIJA',
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
        
        // Combinar bonificaciones y descuentos
        setConceptos([...mappedBonificaciones, ...mappedDescuentos]);
      } catch (error) {
        console.error('Error al cargar conceptos:', error);
        setConceptos([]);
      }
    };
    loadConceptos();
  }, [formData.gremio]);

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
                if (currentSalary === basico && prev.categoria === getCatNombre(cat)) {
                  return prev;
                }
                return { ...prev, salary: String(basico), categoria: getCatNombre(cat) };
              });
            } catch (error) {
              console.error('Error al obtener básico por zona y categoría:', error);
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

  // Calcula el bono de área cuando cambian las áreas (siempre usa categoría 11)
  useEffect(() => {
    const calculateBonoArea = async () => {
      // Solo calcular si es Luz y Fuerza y hay áreas seleccionadas
      if (formData.gremio !== 'LUZ_Y_FUERZA' || !formData.areas?.length) {
        setFormData(prev => ({ ...prev, bonoArea: 0 }));
        return;
      }

      try {
        // Obtener el básico de categoría 11
        const categoria11 = await api.getCategoriaById(11);
        // Usar getCatBasico para obtener el básico correctamente
        const basicoCat11 = getCatBasico(categoria11);

        if (!basicoCat11 || basicoCat11 === 0) {
          console.warn('No se pudo obtener el básico de categoría 11');
          setFormData(prev => ({ ...prev, bonoArea: 0 }));
          return;
        }

        // Calcular bonos para cada área usando siempre categoría 11
        const bonosPromises = formData.areas.map(async (areaId) => {
          try {
            // Usar categoría 11 para obtener el porcentaje (no la categoría del empleado)
            const porcentajeResponse = await api.getPorcentajeArea(Number(areaId), 11);
            // El porcentaje puede venir como número directo o como objeto con propiedad porcentaje
            const porcentajeNum = typeof porcentajeResponse === 'number' 
              ? porcentajeResponse 
              : Number(porcentajeResponse?.porcentaje ?? porcentajeResponse) || 0;
            // Calcular: (básico_cat11 * porcentaje) / 100
            return (basicoCat11 * porcentajeNum) / 100;
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

    calculateBonoArea();
  }, [formData.areas, formData.gremio]); // Removido formData.idCategoria de las dependencias

  // Calcula el salario básico cuando cambia la zona o categoría en UOCRA
  useEffect(() => {
    const calculateSalaryByZona = async () => {
      // Solo calcular si es UOCRA, hay categoría y zona seleccionadas
      if (formData.gremio !== 'UOCRA' || !formData.idCategoria || !formData.idZona) {
        // Si es UOCRA pero falta zona o categoría, limpiar salario
        if (formData.gremio === 'UOCRA') {
          setFormData(prev => {
            if (prev.gremio === 'UOCRA' && (!prev.idCategoria || !prev.idZona) && prev.salary) {
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
            if (currentSalary === basico) return prev;
            return { ...prev, salary: String(basico) };
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
              if (currentSalary === basico) return prev;
              return { ...prev, salary: String(basico) };
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
    if (employee) {
      // Mapear el gremio correctamente
      const gremioModal = mapGremioToModal(employee.gremioNombre || employee.gremio);
      const gremioId = GREMIOS[gremioModal] || null;
      
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
        cbu: employee.cbu || '',
        areas: Array.isArray(employee.idAreas) ? employee.idAreas : [],
        idZona: employee.idZona || null,
        bonoArea: employee.bonoArea ?? 0,
        sexo: employee.sexo || 'M',
      }));
      setErrors({});
    }
  }, [employee]);

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
        
        // Filtrar bonificaciones fijas y descuentos
        const conceptosAsignados = asignados.filter(
          asignado => asignado.tipoConcepto === 'BONIFICACION_FIJA' || asignado.tipoConcepto === 'DESCUENTO'
        );

        // Mapear a formato de conceptosSeleccionados: { conceptId: { units: 'X' } }
        // Usar prefijos 'BON_' o 'DESC_' para que coincidan con los IDs únicos
        const conceptosPrecargados = {};
        conceptosAsignados.forEach(asignado => {
          const originalId = Number(asignado.idReferencia);
          if (originalId && !isNaN(originalId)) {
            // Determinar el prefijo según el tipo de concepto
            const prefijo = asignado.tipoConcepto === 'DESCUENTO' ? 'DESC_' : 'BON_';
            const conceptId = `${prefijo}${originalId}`;
            conceptosPrecargados[conceptId] = {
              units: String(asignado.unidades || 1)
            };
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

    if (!formData.areas || formData.areas.length === 0) {
      newErrors.areas = 'Elegí al menos un área';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Construir conceptosAsignados según el DTO
      const conceptosAsignados = [];
      
      // 1. Bonificaciones fijas y descuentos (conceptos seleccionados)
      Object.keys(conceptosSeleccionados).forEach(conceptId => {
        // conceptId ahora puede ser 'BON_X' o 'DESC_X'
        const concepto = conceptos.find(c => c.id === conceptId);
        const units = conceptosSeleccionados[conceptId]?.units;
        if (concepto && units && units > 0) {
          const tipoConcepto = concepto.isDescuento || concepto.tipo === 'DESCUENTO' 
            ? 'DESCUENTO' 
            : 'BONIFICACION_FIJA';
          // Usar originalId para enviar al backend (sin prefijo)
          conceptosAsignados.push({
            idEmpleadoConcepto: null, // Nuevo concepto
            legajo: Number(formData.legajo),
            tipoConcepto: tipoConcepto,
            idReferencia: Number(concepto.originalId),
            unidades: Number(units)
          });
        }
      });

      // 2. Bonificaciones de área (para LUZ_Y_FUERZA)
      if (formData.gremio === 'LUZ_Y_FUERZA' && formData.areas && formData.areas.length > 0) {
        formData.areas.forEach(areaId => {
          conceptosAsignados.push({
            idEmpleadoConcepto: null,
            legajo: Number(formData.legajo),
            tipoConcepto: 'BONIFICACION_VARIABLE',
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
        idCategoria: formData.idCategoria ? Number(formData.idCategoria) : null,
        idAreas: formData.areas && formData.areas.length > 0 ? formData.areas.map(a => Number(a)) : null,
        sexo: formData.sexo || null,
        idGremio: formData.gremioId ? Number(formData.gremioId) : null,
        idZona: formData.idZona ? Number(formData.idZona) : null,
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

  // Calcula el total de un concepto basado en el básico, porcentaje y unidades
  const calculateConceptTotal = (concepto, units) => {
    if (!concepto || !units || units <= 0) return 0;
    if (!formData.salary || !concepto.porcentaje) return 0;
    
    const basico = Number(formData.salary) || 0;
    const porcentaje = Number(concepto.porcentaje) || 0;
    const unidades = Number(units) || 0;
    const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';
    
    // Total = (básico * porcentaje / 100) * unidades
    // Si es descuento, el total es negativo
    const montoUnitario = (basico * porcentaje) / 100;
    const total = montoUnitario * unidades;
    return isDescuento ? -total : total;
  };

  // Calcula el salario total estipulado inicial
  const calculateTotalSalary = () => {
    const salarioBasico = Number(formData.salary) || 0;
    const bonoArea = formData.gremio === 'LUZ_Y_FUERZA' ? (Number(formData.bonoArea) || 0) : 0;
    
    // Sumar todos los conceptos adicionales seleccionados (incluyendo descuentos que son negativos)
    const totalConceptos = Object.keys(conceptosSeleccionados).reduce((sum, conceptId) => {
      // conceptId ahora puede ser 'BON_X' o 'DESC_X' (string con prefijo)
      const concepto = conceptos.find(c => c.id === conceptId);
      if (!concepto) return sum;
      const units = conceptosSeleccionados[conceptId]?.units ?? '';
      const unitsNum = Number(units);
      if (!unitsNum || unitsNum <= 0) return sum;
      
      // Calcular total del concepto
      const total = calculateConceptTotal(concepto, unitsNum);
      
      // Los descuentos ya vienen negativos de calculateConceptTotal, así que se restan al sumar
      return sum + total;
    }, 0);
    
    return salarioBasico + bonoArea + totalConceptos;
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
    setConceptosSeleccionados((prev) => ({
      ...prev,
      [conceptId]: { ...prev[conceptId], units }
    }));
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
              <label className={'form-label'}>Fecha de Inicio de Actividad</label>
              <input
                type="date"
                className={`form-input ${errors.inicioActividad ? 'error' : ''}`}
                value={formData.inicioActividad || ''}
                onChange={(e) => handleInputChange('inicioActividad', e.target.value)}
              />
              {errors.inicioActividad && <span className="error-message">{errors.inicioActividad}</span>}
            </div>
          </div>
        </div>

        {/* Conceptos Adicionales */}
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
                  : 'No hay conceptos disponibles para UOCRA aún'}
              </p>
            ) : (
              <div className="conceptos-table">
                <table className="conceptos-table-content">
                  <thead>
                    <tr>
                      <th>Seleccionar</th>
                      <th>Concepto</th>
                      <th>Porcentaje</th>
                      <th>Unidades</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conceptos.map((concepto) => {
                      const isSelected = !!conceptosSeleccionados[concepto.id];
                      const units = conceptosSeleccionados[concepto.id]?.units ?? '';
                      const isDescuento = concepto.isDescuento || concepto.tipo === 'DESCUENTO';
                      
                      // Calcular total solo si está seleccionado y tiene unidades válidas
                      const total = isSelected && units && Number(units) > 0 
                        ? calculateConceptTotal(concepto, Number(units))
                        : 0;
                      
                      return (
                        <tr key={concepto.id} className={`${isSelected ? 'selected' : ''} ${isDescuento ? 'descuento-row' : ''}`}>
                          <td>
                            <input
                              type="checkbox"
                              id={`concepto-${concepto.id}`}
                              checked={isSelected}
                              onChange={() => handleConceptToggle(concepto.id)}
                            />
                          </td>
                          <td>
                            <label htmlFor={`concepto-${concepto.id}`} className="concepto-label">
                              {concepto.nombre}
                            </label>
                          </td>
                          <td className="porcentaje-cell">
                            {concepto.porcentaje ? `${concepto.porcentaje}%` : '-'}
                          </td>
                          <td>
                            <input
                              type="number"
                              id={`units-${concepto.id}`}
                              value={units}
                              onChange={(e) => handleUnitsChange(concepto.id, e.target.value)}
                              min="0"
                              step="1"
                              disabled={!isSelected}
                              className="units-input-field"
                            />
                          </td>
                          <td className={`total-cell ${isDescuento ? 'descuento-total' : ''}`}>
                            {isSelected && units && total !== 0 
                              ? formatCurrencyAR(total)
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
    </Modal>
  );
}
