import React, { useEffect, useState, useRef } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { Search, Users, Download, Printer, Plus, X, CheckCircle, User, Calendar, Badge, Clock, Star, Edit, Trash2 } from 'lucide-react';
import * as api from '../../services/empleadosAPI';
import { useNotification } from '../../Hooks/useNotification';
import { useConfirm } from '../../Hooks/useConfirm';
import './ProcessPayrollModal.scss';

// Función helper para formatear moneda en formato argentino ($100.000,00)
const formatCurrencyAR = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0,00';
  const numValue = Number(value);
  const absValue = Math.abs(numValue);
  const parts = absValue.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${integerPart},${parts[1]}`;
};

export function ProcessPayrollModal({ isOpen, onClose, onProcess, employees, initialEmployee = null }) {
  const notify = useNotification();
  const confirmAction = useConfirm();
  const [currentStep, setCurrentStep] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGremio, setFilterGremio] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollData, setPayrollData] = useState({});
  const [concepts, setConcepts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  // Catalogs / dropdown state
  const [catalogBonificaciones, setCatalogBonificaciones] = useState([]);
  const [selectedCatalogConcept, setSelectedCatalogConcept] = useState('');
  const [basicoCat11State, setBasicoCat11State] = useState(0);
  // Estados para edición en línea
  const [editingAmountId, setEditingAmountId] = useState(null);
  const [editingAmountValue, setEditingAmountValue] = useState('');
  const [basicSalary, setBasicSalary] = useState(0);
  const [descuentosData, setDescuentosData] = useState([]);
  const [horasExtrasLyFData, setHorasExtrasLyFData] = useState([]);
  const [titulosLyFData, setTitulosLyFData] = useState([]);
  const [conceptosManualesLyFData, setConceptosManualesLyFData] = useState([]);
  const [descuentosLyFData, setDescuentosLyFData] = useState([]);
  const [descuentosUocraData, setDescuentosUocraData] = useState([]);
  const [remunerationAssigned, setRemunerationAssigned] = useState(0);
  const uidCounter = useRef(1);
  const [periodo, setPeriodo] = useState(
    new Date().toISOString().slice(0,7)
  );
  const [processedLegajos, setProcessedLegajos] = useState(new Set()); // Set de legajos procesados en el mes actual

  // Función para formatear el nombre del gremio
  const formatGremioNombre = (gremioNombre) => {
    if (!gremioNombre) return '';
    const upper = gremioNombre.toUpperCase();
    if (upper === 'LUZ_Y_FUERZA' || upper.includes('LUZ') && upper.includes('FUERZA')) {
      return 'Luz y Fuerza';
    }
    return gremioNombre;
  };

  // Formatea fecha ISO a dd/mm/yyyy
  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
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

  // Normaliza strings para comparar sin importar mayúsculas, tildes, espacios, etc.
  const normalize = (s) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Función helper para identificar "Personal de turno" (usa totalRemunerativo directamente, no valorHora)
  const isPersonalDeTurno = (nombreConcepto) => {
    const nombreNormalizado = normalize(nombreConcepto || '');
    return nombreNormalizado.includes('personal de turno') || nombreNormalizado.includes('personal turno');
  };

  // Normaliza el período a formato YYYY-MM (asegura que el mes tenga dos dígitos)
  const normalizePeriod = (period) => {
    if (!period) return period;
    if (typeof period !== 'string') return period;
    
    // Si ya tiene formato YYYY-MM-DD, extraer solo YYYY-MM
    const parts = period.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const month = String(parts[1]).padStart(2, '0');
      return `${year}-${month}`;
    }
    return period;
  };

  // Convierte periodo 'YYYY-MM' o 'YYYY-MM-DD' a 'Mes de AAAA' en español
  // Si tiene formato 'YYYY-MM-DD' y el día es 1 o 16, se considera quincena
  const formatPeriodToMonthYear = (period) => {
    if (!period) return '—';
    // Si ya contiene letras, devolver tal cual
    if (/[A-Za-zÀ-ÿ]/.test(period)) return period;
    // Aceptar formatos: 'YYYY-MM' o 'YYYY-MM-DD'
    const parts = String(period).split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const month = Number(parts[1]);
      const day = parts.length >= 3 ? Number(parts[2]) : null;
      const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const mName = months[Math.max(0, Math.min(11, month - 1))] || parts[1];
      
      // Si tiene día y es 1 o 16, mostrar quincena
      if (day !== null && (day === 1 || day === 16)) {
        const quincenaText = day === 1 ? 'Primera quincena' : 'Segunda quincena';
        return `${quincenaText} de ${mName.charAt(0).toUpperCase() + mName.slice(1)} de ${year}`;
      }
      
      return `${mName.charAt(0).toUpperCase() + mName.slice(1)} de ${year}`;
    }
    return period;
  };

  // Convierte un número a palabras en español
  const numberToWords = (num) => {
    if (num === 0 || num === null || num === undefined || isNaN(num)) return 'cero';
    
    const numStr = Math.abs(num).toFixed(2);
    const [integerPart, decimalPart] = numStr.split('.');
    
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    
    const convertGroup = (group) => {
      const n = parseInt(group, 10);
      if (n === 0) return '';
      if (n < 10) return unidades[n];
      if (n < 20) return especiales[n - 10];
      if (n < 100) {
        const decena = Math.floor(n / 10);
        const unidad = n % 10;
        if (unidad === 0) return decenas[decena];
        if (decena === 1) return 'dieci' + unidades[unidad];
        if (decena === 2) return 'veinti' + unidades[unidad];
        return decenas[decena] + ' y ' + unidades[unidad];
      }
      if (n === 100) return 'cien';
      if (n < 1000) {
        const centena = Math.floor(n / 100);
        const resto = n % 100;
        if (resto === 0) return centenas[centena];
        return centenas[centena] + ' ' + convertGroup(String(resto).padStart(2, '0'));
      }
      return '';
    };
    
    const convertInteger = (str) => {
      const padded = str.padStart(9, '0');
      const millones = padded.substring(0, 3);
      const miles = padded.substring(3, 6);
      const unidades = padded.substring(6, 9);
      
      let result = '';
      
      if (parseInt(millones, 10) > 0) {
        if (parseInt(millones, 10) === 1) {
          result += 'un millón ';
        } else {
          result += convertGroup(millones) + ' millones ';
        }
      }
      
      if (parseInt(miles, 10) > 0) {
        if (parseInt(miles, 10) === 1) {
          result += 'mil ';
        } else {
          result += convertGroup(miles) + ' mil ';
        }
      }
      
      if (parseInt(unidades, 10) > 0) {
        result += convertGroup(unidades);
      }
      
      return result.trim();
    };
    
    let words = convertInteger(integerPart);
    
    // Si no hay parte entera, usar "cero"
    if (!words) words = 'cero';
    
    // Convertir centavos
    const centavos = parseInt(decimalPart, 10);
    if (centavos > 0) {
      words += ' con ' + convertGroup(String(centavos).padStart(2, '0')) + ' centavos';
    }
    
    // Capitalizar primera letra
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  const calcTotal = (lista) =>
    lista.reduce(
    (s, c) => s + (c.tipo === 'DESCUENTO' ? -c.total : c.total),
    0
  );

  // Función auxiliar para recalcular conceptos especiales (disponible en todo el componente)
  const recalcularConceptosEspeciales = (items, isUocra = false, basicoValue = 0) => {
    // Calcular total bruto (básico + bono área + bonificaciones normales + horas extras, excluyendo conceptos especiales y descuentos)
    let totalBruto = 0;
    if (isUocra) {
      // Para UOCRA, el básico no está en la lista, sumarlo por separado
      totalBruto = basicoValue + 
        items
          .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'CATEGORIA_ZONA' && !c._esConceptoEspecial)
          .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);
    } else {
      // Para Luz y Fuerza, el básico ya está en la lista como 'CATEGORIA', sumar todo excepto descuentos y conceptos especiales
      totalBruto = items
        .filter(c => c.tipo !== 'DESCUENTO' && !c._esConceptoEspecial)
        .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);
    }

    return items.map(item => {
      if (item._esConceptoEspecial && item.porcentaje && totalBruto > 0) {
        const montoUnitario = (totalBruto * item.porcentaje / 100);
        return {
          ...item,
          montoUnitario: Number(montoUnitario) || 0,
          total: (Number(montoUnitario) || 0) * (Number(item.cantidad) || 1),
          _esConceptoEspecial: undefined // Remover flag después de calcular
        };
      }
      return item;
    });
  };

  // Seleccionar empleado
  const handleSelectEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setConceptos([]); // Limpiamos la tabla anterior

    try {
      const gremio = employee.gremio?.nombre?.toUpperCase() ?? '';
      let basicoValue = 0;
      let basico = null;

      if (gremio.includes('UOCRA')) {
        // 🔸 Obtener básico por categoría y zona
        const categoriaZona = await api.getBasicoByCatAndZona(employee.idCategoria, employee.idZonaUocra);
        basicoValue = categoriaZona.basico;
        setBasicSalary(basicoValue);
        basico = {
          uid: uidCounter.current++,
          id: categoriaZona.id,
          tipo: 'CATEGORIA_ZONA',
          nombre: `Básico - ${categoriaZona.zona}`,
          montoUnitario: basicoValue,
          cantidad: 1,
          total: basicoValue ?? 0,
        };
      } else {
        // 🔸 Luz y Fuerza (básico por categoría)
        const categoria = await api.getCategoriaById(employee.idCategoria);
        basicoValue = categoria.basico;
        setBasicSalary(basicoValue);
        basico = {
          id: employee.idCategoria,
          tipo: 'CATEGORIA',
          nombre: `Básico`,
          montoUnitario: basicoValue,
          cantidad: 1,
          total: basicoValue ?? 0,
        };
      }

      /* Bonificaciones de área (solo para Luz y Fuerza) */
      let bonosDeAreas = [];
      if (gremio.includes('LUZ')) {
        const areas = (employee.idAreas || []).map((id, index) => ({
          idArea: id,
          nombre: employee.nombreAreas?.[index] ?? 'Área',
        }));

        const categoria_11 = await api.getCategoriaById(11);
        bonosDeAreas = await Promise.all(
          areas.map(async (area) => {
            // El porcentaje se obtiene usando categoría 11 (no la categoría del empleado)
            const porcentaje = await api.getPorcentajeArea(area.idArea, employee.idCategoria);
            const bonoImporte = (categoria_11.basico * Number(porcentaje)) / 100;
                return {
                  uid: uidCounter.current++,
                  id: area.idArea,
                  tipo: 'BONIFICACION_AREA',
                  nombre: `${area.nombre}`,
                  montoUnitario: bonoImporte,
                  cantidad: 1,
                  total: bonoImporte ?? 0,
                };
          })
        );
      }

      // Remuneración asignada = básico de la categoría + suma de bonos de área
      const sumBonosAreas = bonosDeAreas.reduce((s, b) => s + (b.total || 0), 0);
      const assignedRemuneration = (basicoValue || 0) + sumBonosAreas;
      setRemunerationAssigned(assignedRemuneration);

      /* Conceptos precargados en base de datos */
      const conceptosAsignados = await api.getConceptosAsignados(employee.legajo);
      
      // Cargar conceptos según el gremio del empleado
      const gremioUpper = gremio;
      const isLuzYFuerza = gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA');
      const isUocra = gremioUpper.includes('UOCRA');
      
      if (isLuzYFuerza) {
        // Para Luz y Fuerza: cargar todos los conceptos requeridos
        [
          bonificacionesFijas,
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
      } else if (isUocra) {
        // Para UOCRA: cargar conceptos requeridos
        [
          bonificacionesFijas,
          descuentos,
          descuentosUocra
        ] = await Promise.all([
          api.getConceptosUocra().catch(() => []),
          api.getDescuentos().catch(() => []),
          api.getDescuentosUocra().catch(() => [])
        ]);
      } else {
        // Convenio General: no cargar conceptos específicos
        bonificacionesFijas = [];
        descuentos = [];
      }
      
      const descuentos = await api.getDescuentos();
      setDescuentosData(descuentos); // Guardar descuentos para uso posterior
      setCatalogBonificaciones(bonificacionesFijas || []); // guardar catálogo para el dropdown

      // Obtener básico de categoría 11 para Luz y Fuerza
      let basicoCat11 = 0;
      if (isLuzYFuerza) {
        try {
          const cat11 = await api.getCategoriaById(11);
          basicoCat11 = cat11?.basico ?? cat11?.salarioBasico ?? cat11?.sueldoBasico ?? cat11?.monto ?? cat11?.salario ?? 0;
          setBasicoCat11State(basicoCat11);
        } catch (error) {
          notify.error(error);
        }
      } else {
        setBasicoCat11State(0);
      }

      // Separar bonificaciones, horas extras y descuentos
      // Filtrar horas extras para procesarlas después
      const horasExtrasAsignadas = conceptosAsignados
        .filter(asignado => asignado.tipoConcepto === 'HORA_EXTRA_LYF');

      // Buscar conceptos en todos los catálogos disponibles
      const buscarConceptoEnCatalogos = (idReferencia, tipoConcepto) => {
        if (tipoConcepto === 'CONCEPTO_LYF' || tipoConcepto === 'CONCEPTO_UOCRA') {
          // Buscar en conceptos LYF, títulos LYF o conceptos UOCRA
          if (isLuzYFuerza) {
            const conceptoLyF = bonificacionesFijas.find(b => (b.idConceptoLyF ?? b.idBonificacion ?? b.id) === idReferencia);
            if (conceptoLyF) return conceptoLyF;
            const tituloLyF = titulosLyF.find(t => (t.idTituloLyF ?? t.id) === idReferencia);
            if (tituloLyF) return tituloLyF;
          } else if (isUocra) {
            const conceptoUocra = bonificacionesFijas.find(b => (b.idBonificacion ?? b.id) === idReferencia);
            if (conceptoUocra) return conceptoUocra;
          }
        } else if (tipoConcepto === 'TITULO_LYF') {
          // Buscar específicamente en títulos LYF
          return titulosLyF.find(t => (t.idTituloLyF ?? t.id) === idReferencia);
        } else if (tipoConcepto === 'CONCEPTO_MANUAL_LYF') {
          return conceptosManualesLyF.find(cm => (cm.idConceptosManualesLyF ?? cm.idConceptoManualLyF ?? cm.id) === idReferencia);
        }
        return null;
      };

      const bonificacionesMapped = conceptosAsignados
        .filter(asignado => (asignado.tipoConcepto === 'CONCEPTO_LYF' || asignado.tipoConcepto === 'CONCEPTO_UOCRA' || asignado.tipoConcepto === 'TITULO_LYF' || asignado.tipoConcepto === 'CONCEPTO_MANUAL_LYF') && asignado.tipoConcepto !== 'HORA_EXTRA_LYF')
        .map((asignado) => {
          // Manejar conceptos manuales LYF
          if (asignado.tipoConcepto === 'CONCEPTO_MANUAL_LYF') {
            const conceptoManual = conceptosManualesLyF.find(cm => (cm.idConceptosManualesLyF ?? cm.idConceptoManualLyF ?? cm.id) === asignado.idReferencia);
            if (!conceptoManual) return null;
            
            const montoFijo = Number(conceptoManual.monto ?? conceptoManual.valor ?? 0);
            const unidades = 1; // Siempre cantidad 1 para conceptos manuales LYF
            
            return {
              uid: uidCounter.current++,
              id: asignado.idReferencia,
              tipo: 'CONCEPTO_MANUAL_LYF',
              nombre: conceptoManual.nombre ?? conceptoManual.descripcion ?? 'Concepto Manual',
              porcentaje: null, // No tiene porcentaje, mostrar "-"
              montoUnitario: montoFijo,
              cantidad: unidades,
              total: montoFijo * unidades, // Monto del backend * cantidad (1)
            };
          }
          
          const concepto = buscarConceptoEnCatalogos(asignado.idReferencia, asignado.tipoConcepto);

          // Para Luz y Fuerza (CONCEPTO_LYF): calcular sobre categoría 11
          // Para UOCRA (CONCEPTO_UOCRA): calcular sobre el básico del empleado
          let baseCalculo = basicoValue;
          if ((asignado.tipoConcepto === 'CONCEPTO_LYF' || asignado.tipoConcepto === 'TITULO_LYF') && isLuzYFuerza) {
            // Si el concepto tiene baseCalculo === 'BASICO_CATEGORIA_11' o no tiene el campo, usar básico cat 11
            const baseCalculoConcepto = concepto?.baseCalculo ?? concepto?.base_calculo;
            if (!baseCalculoConcepto || baseCalculoConcepto === 'BASICO_CATEGORIA_11' || baseCalculoConcepto === 'basico_categoria_11') {
            baseCalculo = basicoCat11;
            }
          }

          // Si no encontramos el concepto en el catálogo, usar datos del asignado como fallback
          if (!concepto) {
            const porcentajeAsignado = asignado.porcentaje ?? asignado.porcentajeBonificacion ?? null;
            const nombreAsignado = asignado.nombre ?? asignado.descripcion ?? 'Concepto';
            let montoUnitario = 0;

            if (porcentajeAsignado != null) {
              montoUnitario = (baseCalculo * porcentajeAsignado / 100);
            } else {
              // Si no hay porcentaje, intentar usar un monto directo en el registro asignado
              montoUnitario = asignado.montoUnitario ?? asignado.monto ?? 0;
            }

              return {
                uid: uidCounter.current++,
                id: asignado.idReferencia,
                tipo: asignado.tipoConcepto,
                nombre: nombreAsignado,
                montoUnitario: Number(montoUnitario) || 0,
                porcentaje: porcentajeAsignado != null ? Number(porcentajeAsignado) : null,
                cantidad: Number(asignado.unidades) || 1,
                total: (Number(montoUnitario) || 0) * (Number(asignado.unidades) || 1),
              };
          }

          // Si no encontramos el concepto en el catálogo, usar datos del asignado como fallback
          if (!concepto) {
            const porcentajeAsignado = asignado.porcentaje ?? asignado.porcentajeBonificacion ?? null;
            const nombreAsignado = asignado.nombre ?? asignado.descripcion ?? 'Concepto';
            let montoUnitario = 0;

            if (porcentajeAsignado != null) {
              montoUnitario = (baseCalculo * porcentajeAsignado / 100);
            } else {
              // Si no hay porcentaje, intentar usar un monto directo en el registro asignado
              montoUnitario = asignado.montoUnitario ?? asignado.monto ?? 0;
            }

              return {
                uid: uidCounter.current++,
                id: asignado.idReferencia,
                tipo: asignado.tipoConcepto,
                nombre: nombreAsignado,
                montoUnitario: Number(montoUnitario) || 0,
                porcentaje: porcentajeAsignado != null ? Number(porcentajeAsignado) : null,
                cantidad: Number(asignado.unidades) || 1,
                total: (Number(montoUnitario) || 0) * (Number(asignado.unidades) || 1),
              };
          }

          const montoUnitario = (baseCalculo * concepto.porcentaje / 100);

          return {
            uid: uidCounter.current++,
            id: asignado.idReferencia,
            tipo: asignado.tipoConcepto,
            nombre: concepto.nombre ?? concepto.descripcion ?? 'Concepto',
            montoUnitario: Number(montoUnitario) || 0,
            porcentaje: concepto.porcentaje != null ? Number(concepto.porcentaje) : null,
            cantidad: Number(asignado.unidades) || 1,
            total: (Number(montoUnitario) || 0) * (Number(asignado.unidades) || 1),
          };
        })
        .filter(Boolean);

      if (isUocra) console.debug('ProcessPayrollModal - UOCRA bonificacionesMapped:', bonificacionesMapped);

      // Calcular total de remuneraciones (básico + bonos de área + bonificaciones)
      const totalRemuneraciones = basicoValue + 
        bonosDeAreas.reduce((sum, b) => sum + (b.total || 0), 0) +
        bonificacionesMapped.reduce((sum, b) => sum + (b.total || 0), 0);

      // Descuentos iniciales (solo guardar estructura, se recalcularán después de Horas Extras)
      const descuentosMapped = conceptosAsignados
        .filter(asignado => 
          asignado.tipoConcepto === 'DESCUENTO' || 
          asignado.tipoConcepto === 'DESCUENTO_LYF' || 
          asignado.tipoConcepto === 'DESCUENTO_UOCRA'
        )
        .map((asignado) => {
          let concepto = null;
          let tipoDescuento = asignado.tipoConcepto;
          
          // Buscar en el catálogo correspondiente según el tipo
          if (asignado.tipoConcepto === 'DESCUENTO_LYF') {
            concepto = descuentosLyF.find(d => 
              (d.idDescuentoLyF ?? d.idDescuento ?? d.id) === asignado.idReferencia
            );
          } else if (asignado.tipoConcepto === 'DESCUENTO_UOCRA') {
            concepto = descuentosUocra.find(d => 
              (d.idDescuentoUocra ?? d.idDescuento ?? d.id) === asignado.idReferencia
            );
          } else {
            concepto = descuentos.find(d => 
            (d.idDescuento ?? d.id) === asignado.idReferencia
          );
          }

          if (!concepto) return null;

          // Guardar estructura, montoUnitario se calculará después de aplicar Horas Extras
          return {
            uid: uidCounter.current++,
            id: asignado.idReferencia,
            tipo: tipoDescuento, // Mantener el tipo específico (DESCUENTO, DESCUENTO_LYF, DESCUENTO_UOCRA)
            nombre: concepto.nombre ?? concepto.descripcion ?? 'Concepto',
            montoUnitario: Number(montoUnitario) || 0,
            porcentaje: Number(concepto.porcentaje) || 0, // Guardar porcentaje para recalcular
            cantidad: Number(asignado.unidades) || 1,
            total: -(Number(montoUnitario) || 0) * (Number(asignado.unidades) || 1), // Negativo porque es descuento
          };
        })
        .filter(Boolean);

      /* Lista final de conceptos (sin horas extras todavía) */
      // Para UOCRA, no incluir el concepto básico en la lista
      const listaSinHoras = isUocra 
        ? [...bonificacionesMapped, ...descuentosMapped]
        : [basico, ...bonosDeAreas, ...bonificacionesMapped, ...descuentosMapped];

      // Aplicar cálculo especial de Horas Extras para Luz y Fuerza
      const applyHorasExtras = (items) => {
        if (!isLuzYFuerza) return items;
        const salarioBasico = basicoValue || 0;
        const bonoAreaSum = items.filter(i => i.tipo === 'BONIFICACION_AREA').reduce((s, i) => s + (i.total || 0), 0);

        return items.map(item => {
          if (item.tipo === 'CONCEPTO_LYF' && (item.nombre === 'Horas Extras Simples' || item.nombre === 'Horas Extras Dobles')) {
            const unidades = Number(item.cantidad) || 1;

            // Calcular sumatoria de otras bonificaciones (excluye descuentos, la propia fila y otras Horas Extras)
            const otherBonificaciones = items.reduce((sum, other) => {
              if (other === item) return sum;
              if (other.tipo === 'DESCUENTO' || other.tipo === 'CATEGORIA_ZONA') return sum;
              // Excluir otras Horas Extras para evitar dependencia circular entre ambas
              if (other.tipo === 'CONCEPTO_LYF' && (other.nombre === 'Horas Extras Simples' || other.nombre === 'Horas Extras Dobles')) return sum;

              return sum + (other.total || ((other.montoUnitario || 0) * (other.cantidad || 1)));
            }, 0);

            const totalBonificaciones = salarioBasico + bonoAreaSum + otherBonificaciones;
            if (totalBonificaciones <= 0) return { ...item, montoUnitario: 0, total: 0 };

            const factor = item.nombre === 'Horas Extras Simples' ? 1.5 : 2;
            const montoUnitario = ((totalBonificaciones / 156) * factor) * ((Number(item.porcentaje || 0)) / 100);
            return { ...item, montoUnitario, total: montoUnitario * unidades };
          }

          return item;
        });
      };

      const listaConHoras = applyHorasExtras(lista);

      setTotal(calcTotal(listaConHoras));
      setConceptos(listaConHoras);
      setCurrentStep('payroll');
    } catch (error) {
      notify.error('No se pudo obtener el sueldo básico del empleado. Por favor, intente nuevamente.');
    }
  };

  // Cargar liquidaciones del mes actual para mostrar estado
  useEffect(() => {
    const loadCurrentMonthLiquidaciones = async () => {
      if (!isOpen) return;
      
      try {
        const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
        const liquidaciones = await api.getLiquidacionesByPeriodo(currentPeriod);
        console.log(liquidaciones);
        // Extraer legajos únicos de las liquidaciones
        const legajosSet = new Set();
        if (Array.isArray(liquidaciones)) {
          liquidaciones.forEach(liquidacion => {
            if (liquidacion.legajo) {
              legajosSet.add(Number(liquidacion.legajo));
            }
          });
        }
        
        setProcessedLegajos(legajosSet);
      } catch (error) {
        console.error('Error al cargar liquidaciones del mes actual:', error);
        // En caso de error, dejar el set vacío
        setProcessedLegajos(new Set());
      }
    };

    loadCurrentMonthLiquidaciones();
  }, [isOpen]);

  // Seleccionar empleado inicial cuando el modal se abre con un empleado preseleccionado
  useEffect(() => {
    if (isOpen && initialEmployee) {
      // Solo seleccionar si el empleado inicial es diferente al seleccionado actualmente
      if (!selectedEmployee || selectedEmployee.legajo !== initialEmployee.legajo) {
        handleSelectEmployee(initialEmployee);
      }
    } else if (!isOpen) {
      // Reset cuando el modal se cierra
      setCurrentStep('search');
      setSearchTerm('');
      setFilterGremio('');
      setFilterEstado('');
      setSelectedEmployee(null);
      setConceptos([]);
      setTotal(0);
      setBasicSalary(0);
      setDescuentosData([]);
      setProcessedLegajos(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialEmployee]);

  // Actualizar cantidad de un concepto
  const handleQtyChange = (conceptUid, nuevaCantidad) => {
    const cantidad = Number(nuevaCantidad) || 0;

    // 1) Clonar y actualizar la cantidad del concepto modificado, asegurar números y totales
    let nuevos = conceptos.map(concept => {
      const cloned = { ...concept, cantidad: Number(concept.cantidad) || 1, montoUnitario: Number(concept.montoUnitario) || 0 };
      if (cloned.uid === conceptUid) {
        // Si es descuento, total negativo
        if (cloned.tipo === 'DESCUENTO') {
          cloned.cantidad = cantidad;
          cloned.total = -(cloned.montoUnitario || 0) * cloned.cantidad;
          return cloned;
        }
        cloned.cantidad = cantidad;
        cloned.total = (cloned.montoUnitario || 0) * cloned.cantidad;
        return cloned;
      }
      // Para los demás, asegurar total consistente (unidad * cantidad) salvo Horas Extras que se recalculan después
      if (cloned.tipo === 'CONCEPTO_LYF' && (cloned.nombre === 'Horas Extras Simples' || cloned.nombre === 'Horas Extras Dobles')) {
        return cloned; // dejar para recalcular más abajo
      }
      cloned.total = (cloned.montoUnitario || 0) * (cloned.cantidad || 1);
      return cloned;
    });

    // 2) Aplicar recálculo especial de Horas Extras (si corresponde)
    const applyHorasExtrasNow = (items) => {
      const isLuz = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA');
      if (!isLuz) return items;
      const salarioBasico = basicSalary || 0;
      const bonoAreaSum = items.filter(i => i.tipo === 'BONIFICACION_AREA').reduce((s, i) => s + (i.total || 0), 0);

      return items.map(item => {
        if (item.tipo === 'CONCEPTO_LYF' && (item.nombre === 'Horas Extras Simples' || item.nombre === 'Horas Extras Dobles')) {
          const unidades = Number(item.cantidad) || 1;

          // Sumar otras bonificaciones (excluye descuentos, la propia fila y otras Horas Extras)
          const otherBonificaciones = items.reduce((sum, other) => {
            if (other === item) return sum;
            if (other.tipo === 'DESCUENTO' || other.tipo === 'CATEGORIA_ZONA') return sum;
            // Excluir otras Horas Extras para evitar dependencia circular
            if (other.tipo === 'CONCEPTO_LYF' && (other.nombre === 'Horas Extras Simples' || other.nombre === 'Horas Extras Dobles')) return sum;

            return sum + (other.total || ((other.montoUnitario || 0) * (other.cantidad || 1)));
          }, 0);

          const totalBonificaciones = salarioBasico + bonoAreaSum + otherBonificaciones;
          if (totalBonificaciones <= 0) return { ...item, montoUnitario: 0, total: 0 };

          const factor = item.nombre === 'Horas Extras Simples' ? 1.5 : 2;
          const montoUnitario = ((totalBonificaciones / 156) * factor) * ((Number(item.porcentaje || 0)) / 100);
          return { ...item, montoUnitario, total: montoUnitario * unidades };
        }

        return item;
      });
    };

    nuevos = applyHorasExtrasNow(nuevos);

    // 3) Recalcular descuentos basados en el nuevo total de remuneraciones
    const basicoEmpleado = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') ? basicSalary : 0;
    const totalRemuneraciones = basicoEmpleado + nuevos
      .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'CATEGORIA_ZONA')
      .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);

    const nuevosConDescuentos = nuevos.map(concept => {
      if (concept.tipo === 'DESCUENTO') {
        if (concept.porcentaje && totalRemuneraciones > 0) {
          const montoUnitario = (totalRemuneraciones * concept.porcentaje / 100);
          const cantidadActual = concept.uid === conceptUid ? cantidad : concept.cantidad;
          return { ...concept, montoUnitario: Number(montoUnitario) || 0, total: -(Number(montoUnitario) || 0) * (Number(cantidadActual) || 1) };
        }
        // Mantener tal cual si no hay porcentaje
        return { ...concept, montoUnitario: Number(concept.montoUnitario) || 0, total: Number(concept.total) || 0 };
      }
      return { ...concept, montoUnitario: Number(concept.montoUnitario) || 0, cantidad: Number(concept.cantidad) || 1, total: (Number(concept.montoUnitario) || 0) * (Number(concept.cantidad) || 1) };
    });

    setConceptos(nuevosConDescuentos);
    setTotal(calcTotal(nuevosConDescuentos));
    
    // Recalcular asistencia si es UOCRA (usar setTimeout para asegurar que el estado se actualice)
    setTimeout(() => {
      const gremioNombre = selectedEmployee?.gremio?.nombre?.toUpperCase() || '';
      if (gremioNombre === 'UOCRA') {
        const horasNormales = nuevosConDescuentos.find(c => {
          const nombreUpper = (c.nombre || '').toUpperCase();
          return nombreUpper.includes('HS.NORMALES') || nombreUpper.includes('HORAS NORMALES');
        });
        
        const horasExtras = nuevosConDescuentos.find(c => {
          const nombreUpper = (c.nombre || '').toUpperCase();
          return nombreUpper.includes('HORAS EXTRAS') && !nombreUpper.includes('DOBLES');
        });
        
        const horasExtrasDobles = nuevosConDescuentos.find(c => {
          const nombreUpper = (c.nombre || '').toUpperCase();
          return nombreUpper.includes('HORAS EXTRAS DOBLES');
        });
        
        const asistencia = nuevosConDescuentos.find(c => {
          const nombreUpper = (c.nombre || '').toUpperCase();
          return nombreUpper.includes('ASISTENCIA');
        });
        
        if (asistencia && (horasNormales || horasExtras || horasExtrasDobles)) {
          const cantidadHorasNormales = Number(horasNormales?.cantidad || 0);
          const cantidadHorasExtras = Number(horasExtras?.cantidad || 0);
          const cantidadHorasExtrasDobles = Number(horasExtrasDobles?.cantidad || 0);
          const sumaAsistencia = cantidadHorasNormales + cantidadHorasExtras + cantidadHorasExtrasDobles;
          
          if (asistencia.cantidad !== sumaAsistencia) {
            const listaConAsistencia = nuevosConDescuentos.map(c => {
              if (c.uid === asistencia.uid) {
                return { ...c, cantidad: sumaAsistencia, total: (c.montoUnitario || 0) * sumaAsistencia };
              }
              return c;
            });
            
            setConceptos(listaConAsistencia);
            setTotal(calcTotal(listaConAsistencia));
          }
        }
      }
    }, 0);
  };
  const handleAddConcepto = () => {
    setModalOpen(true);
  };

  const handleConfirmConeptos = (nuevos) => {
    const withUids = nuevos.map(n => n.uid ? n : { ...n, uid: uidCounter.current++ });
    const lista = [...conceptos, ...withUids];
    setConceptos(lista);
    setTotal(calcTotal(lista));
  };

  // Filtrar empleados por búsqueda
  const filteredEmployees = employees
    .filter(emp => {
      // Excluir empleados que no estén activos
      const estado = (emp.estado || '').toString().toUpperCase();
      return estado === 'ACTIVO';
    })
    .filter(emp =>
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.legajo.toString().includes(searchTerm) ||
      emp.apellido.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Actualizar concepto
  const updateConcept = (uid, field, value) => {
    setConceptos(prev => prev.map(concept => {
      if (concept.uid === uid) {
        const updated = { ...concept, [field]: value };
        // Auto-calculate amount if units or unitValue change
        if (field === 'units' || field === 'unitValue') {
          updated.amount = (updated.units || 0) * (updated.unitValue || 0);
        }
        return updated;
      }
      return concept;
    }));
  };

  // Eliminar concepto
  const removeConcept = (uid) => {
    setConceptos(prev => prev.filter(concept => concept.uid !== uid));
  };

  // Iniciar edición del monto (soporta remuneraciones y descuentos)
  const startEditAmount = (concept) => {
    // Preferir montoUnitario, si no existe usar valor absoluto del total
    const initial = concept.montoUnitario ?? Math.abs(concept.total ?? 0);
    setEditingAmountId(concept.uid);
    setEditingAmountValue(String(initial));
  };

  const cancelEditAmount = () => {
    setEditingAmountId(null);
    setEditingAmountValue('');
  };

  const saveEditAmount = (concept) => {
    const value = parseFloat(editingAmountValue) || 0;
    let nuevos = conceptos.map(c => {
      if (c.uid === concept.uid) {
        if (c.tipo === 'DESCUENTO') {
          const cantidad = c.cantidad || 1;
          return { ...c, montoUnitario: value, total: -(value * cantidad) };
        }
        const cantidad = c.cantidad || 1;
        return { ...c, montoUnitario: value, total: (value * cantidad) };
      }
      return c;
    });

    // Aplicar Horas Extras recalculadas si corresponde
    const isLuz = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA');
    if (isLuz) {
      const salarioBasico = basicSalary || 0;
      const bonoAreaSum = nuevos.filter(i => i.tipo === 'BONIFICACION_AREA').reduce((s, i) => s + (i.total || 0), 0);
      nuevos = nuevos.map(item => {
        if (item.tipo === 'CONCEPTO_LYF' && (item.nombre === 'Horas Extras Simples' || item.nombre === 'Horas Extras Dobles')) {
          const unidades = Number(item.cantidad) || 1;
          const otherBonificaciones = nuevos.reduce((sum, other) => {
            if (other === item) return sum;
            if (other.tipo === 'DESCUENTO' || other.tipo === 'CATEGORIA_ZONA') return sum;
            // Excluir otras Horas Extras para evitar dependencia circular entre ambas
            if (other.tipo === 'CONCEPTO_LYF' && (other.nombre === 'Horas Extras Simples' || other.nombre === 'Horas Extras Dobles')) return sum;
            return sum + (other.total || ((other.montoUnitario || 0) * (other.cantidad || 1)));
          }, 0);

          const totalBonificaciones = salarioBasico + bonoAreaSum + otherBonificaciones;
          if (totalBonificaciones <= 0) return { ...item, montoUnitario: 0, total: 0 };

          const factor = item.nombre === 'Horas Extras Simples' ? 1.5 : 2;
          const montoUnitario = ((totalBonificaciones / 156) * factor) * ((Number(item.porcentaje || 0)) / 100);
          return { ...item, montoUnitario, total: montoUnitario * unidades };
        }
        return item;
      });
    }

    setConceptos(nuevos);
    setTotal(calcTotal(nuevos));
    cancelEditAmount();
  };

  // Confirmar eliminación con diálogo
  const confirmDelete = async (uid) => {
    const concepto = conceptos.find(c => c.uid === uid);
    const nombreConcepto = concepto?.nombre || 'este concepto';
    
    const result = await confirmAction({
      title: 'Eliminar Concepto',
      message: `¿Está seguro de eliminar "${nombreConcepto}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      confirmButtonVariant: 'danger',
      cancelButtonVariant: 'secondary'
    });

    if (result) {
      removeConcept(uid);
      const nuevos = conceptos.filter(c => c.uid !== uid);
      setTotal(calcTotal(nuevos));
    }
  };

  // Calcular totales
  const calculateTotals = () => {
    // Incluir el básico del empleado si es UOCRA (no está en conceptos)
    const basicoEmpleado = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') ? basicSalary : 0;
    
    const remunerations = basicoEmpleado + conceptos
      .filter(c => 
        c.tipo === 'CATEGORIA' || 
        c.tipo === 'BONIFICACION_AREA' || 
        c.tipo === 'CONCEPTO_LYF' || 
        c.tipo === 'CONCEPTO_UOCRA' || 
        c.tipo === 'TITULO_LYF' ||
        c.tipo === 'CONCEPTO_MANUAL_LYF' ||
        c.tipo === 'HORA_EXTRA_LYF' || 
        c.tipo === 'AGUINALDO' || 
        c.tipo === 'VACACIONES'
      )
      .reduce((sum, c) => sum + (c.total || 0), 0);

    const deductions = conceptos.filter(c => 
      c.tipo === 'DESCUENTO' || 
      c.tipo === 'DESCUENTO_LYF' || 
      c.tipo === 'DESCUENTO_UOCRA'
    )
      .reduce((sum, c) => sum + Math.abs(c.total || 0), 0);

    const netAmount = remunerations - deductions;

    return { remunerations, deductions, netAmount };
  };

  // Generar automáticamente el monto en palabras cuando cambia el netAmount
  useEffect(() => {
    if ((currentStep === 'preview' || currentStep === 'payroll') && selectedEmployee) {
      const { netAmount } = calculateTotals();
      if (netAmount > 0) {
        const expectedWords = (numberToWords(netAmount) + ' pesos').toUpperCase();
        // Regenerar automáticamente cuando cambian los conceptos
        // El usuario puede editar manualmente después si lo desea
        setAmountInWords(expectedWords);
      } else if (netAmount <= 0) {
        setAmountInWords('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptos, basicSalary, selectedEmployee, currentStep]);

  // LIQUIDAR SUELDO Y GENERAR RECIBO
  const generatePayroll = async () => {
    if (!selectedEmployee) return;
    
    // Confirmar antes de generar la liquidación
    const result = await confirmAction({
      title: 'Generar Liquidación',
      message: `¿Está seguro de generar la liquidación para ${selectedEmployee.nombre} ${selectedEmployee.apellido} del período ${formatPeriodToMonthYear(periodo)}?`,
      confirmText: 'Generar Recibo',
      cancelText: 'Cancelar',
      type: 'warning',
      confirmButtonVariant: 'primary',
      cancelButtonVariant: 'secondary'
    });

    if (!result) return; // Usuario canceló
    
    setIsProcessing(true);

    try {
    const payload = {
      legajo: selectedEmployee.legajo,
          aguinaldoNumero: aguinaldoNumero,
          anio: aguinaldoAnio,
        };

        const result = await api.liquidarAguinaldo(payload);
        const usuario = localStorage.getItem('usuario') || 'Sistema';
        
        setPayrollData({
          ...payrollData,
          periodDisplay: `Aguinaldo ${aguinaldoNumero} - ${aguinaldoAnio}`,
          totalNeto: result.total_neto || aguinaldoCalculo.totalNeto
        });

        // Registrar actividad de liquidación (manejar errores de forma independiente para no afectar el flujo principal)
        try {
          await api.registrarActividad({
            usuario,
            accion: 'Liquidación procesada',
            descripcion: `Se liquidó el aguinaldo ${aguinaldoNumero} del año ${aguinaldoAnio} del empleado ${selectedEmployee.nombre} ${selectedEmployee.apellido}`,
            referenciaTipo: 'LIQUIDAR',
            referenciaId: result.idPago || result.id || result.idLiquidacion || selectedEmployee.legajo
          });
        } catch (actividadError) {
          // Si falla el registro de actividad, solo loguear el error pero no afectar el flujo principal
          console.warn('Error al registrar actividad de liquidación:', actividadError);
        }

        notify.success(`Aguinaldo ${aguinaldoNumero} del año ${aguinaldoAnio} liquidado exitosamente`);
        setCurrentStep('preview');
        // Notificar al componente padre para actualizar la lista
        if (onProcess) {
          onProcess(result);
        }
      } catch (error) {
        notify.error(error);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Si es vacaciones, usar la lógica de vacaciones
    if (liquidacionType === 'vacaciones') {
      if (!vacacionesCalculo) {
        notify.error('Debe calcular las vacaciones primero');
        return;
      }
      
      // Confirmar antes de liquidar vacaciones
      const result = await confirmAction({
        title: 'Liquidar Vacaciones',
        message: `¿Está seguro de liquidar el bono de vacaciones del año ${anioVacaciones} para ${selectedEmployee.nombre} ${selectedEmployee.apellido}?`,
        confirmText: 'Liquidar Vacaciones',
        cancelText: 'Cancelar',
        type: 'warning',
        confirmButtonVariant: 'primary',
        cancelButtonVariant: 'secondary'
      });

      if (!result) return;
      
      setIsProcessing(true);

      try {
          const payload = {
          legajo: selectedEmployee.legajo,
          anioVacaciones: parseInt(anioVacaciones, 10),
        };

        const result = await api.liquidarVacaciones(payload);
        const usuario = localStorage.getItem('usuario') || 'Sistema';
        
        const montoVacaciones = vacacionesCalculo.vacaciones || vacacionesCalculo.totalVacaciones || vacacionesCalculo.monto || 0;
        
        setPayrollData({
          ...payrollData,
          periodDisplay: `Vacaciones - ${anioVacaciones}`,
          totalNeto: result.total_neto || montoVacaciones
        });

        // Registrar actividad de liquidación (manejar errores de forma independiente para no afectar el flujo principal)
        try {
          await api.registrarActividad({
            usuario,
            accion: 'Liquidación procesada',
            descripcion: `Se liquidó el bono de vacaciones del año ${anioVacaciones} del empleado ${selectedEmployee.nombre} ${selectedEmployee.apellido}`,
            referenciaTipo: 'LIQUIDAR',
            referenciaId: result.idPago || result.id || result.idLiquidacion || selectedEmployee.legajo
          });
        } catch (actividadError) {
          // Si falla el registro de actividad, solo loguear el error pero no afectar el flujo principal
          console.warn('Error al registrar actividad de liquidación:', actividadError);
        }

        notify.success(`Bono de vacaciones del año ${anioVacaciones} liquidado exitosamente`);
        setCurrentStep('preview');
        // Notificar al componente padre para actualizar la lista
        if (onProcess) {
          onProcess(result);
        }
      } catch (error) {
        notify.error(error);
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    // Lógica normal de liquidación de sueldo
    // Formatear período para el mensaje de confirmación y para enviar
    // Normalizar el período a formato YYYY-MM
    const periodoFormateado = normalizePeriod(periodo);
    
    let periodoDisplay = periodoFormateado;
    if (selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA')) {
      const day = quincena === 1 ? '01' : '16';
      periodoDisplay = `${periodoFormateado}-${day}`;
    }

    // Confirmar antes de generar la liquidación
    const result = await confirmAction({
      title: 'Generar Liquidación',
      message: `¿Está seguro de generar la liquidación para ${selectedEmployee.nombre} ${selectedEmployee.apellido} del período ${formatPeriodToMonthYear(periodoDisplay)}?`,
      confirmText: 'Generar Recibo',
      cancelText: 'Cancelar',
      type: 'warning',
      confirmButtonVariant: 'primary',
      cancelButtonVariant: 'secondary'
    });

    if (!result) return; // Usuario canceló
    
    setIsProcessing(true);

    // Usar el período ya formateado para construir el payload
    
    let periodoPago = periodoFormateado;
    if (selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA')) {
      // Para UOCRA: formato YYYY-MM-DD donde DD es 01 (primera quincena) o 16 (segunda quincena)
      const day = quincena === 1 ? '01' : '16';
      periodoPago = `${periodoFormateado}-${day}`;
    }

    // Obtener fecha actual en formato YYYY-MM-DD para fechaLiquidacion
    const fechaActual = new Date();
    const fechaLiquidacion = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`;
    
    const payload = {
        legajo: selectedEmployee.legajo,
        periodoPago: periodoPago,
        fechaLiquidacion: fechaLiquidacion, // Fecha actual de liquidación
      conceptos: conceptos.map((c) => ({
        tipoConcepto: c.tipo,
        idReferencia: c.id,
        unidades: c.cantidad,
      })),
    };
    
    // Agregar fechaPago: si tiene valor se envía, si no se envía null explícitamente
    payload.fechaPago = (fechaPago && fechaPago.trim() !== '') ? fechaPago : null;

    try {
      const result = await api.guardarLiquidacion(payload);
      
      // Validar que la respuesta sea válida (pero no lanzar error si solo faltan algunos campos)
      if (!result) {
        console.warn('La respuesta del servidor está vacía, pero la liquidación puede haberse completado');
      }
      
      const usuario = localStorage.getItem('usuario') || 'Sistema';
      
      // Usar valores de la respuesta o valores calculados como fallback
      const periodDisplayValue = result?.periodoPago || periodoPago || periodo;
      const totalNetoValue = result?.total_neto ?? (result?.totalNeto ?? netAmount);
      
      setPayrollData({
        ...payrollData,
        periodDisplay: periodDisplayValue,
        totalNeto: totalNetoValue
      });

      // Registrar actividad de liquidación (manejar errores de forma independiente para no afectar el flujo principal)
      try {
      await api.registrarActividad({
        usuario,
        accion: 'Liquidación procesada',
        descripcion: `Se liquidó el sueldo del empleado ${selectedEmployee.nombre} ${selectedEmployee.apellido} para el período ${periodo}`,
          referenciaTipo: 'LIQUIDAR',
          referenciaId: result.idPago || result.id || result.idLiquidacion || selectedEmployee.legajo
      });
      } catch (actividadError) {
        // Si falla el registro de actividad, solo loguear el error pero no afectar el flujo principal
        console.warn('Error al registrar actividad de liquidación:', actividadError);
      }

      // Notificación de éxito
      notify.success(`Liquidación realizada exitosamente para el período ${periodo}`);
      
      // Actualizar el estado de legajos procesados
      setProcessedLegajos(prev => new Set([...prev, Number(selectedEmployee.legajo)]));
      
      setCurrentStep('preview');
    } catch (error) {
      notify.error('Error al liquidar sueldo:', error);
      
      // Actualizar el estado de la liquidación (pendiente si no hay fechaPago, completada si hay)
      const estadoLiquidacion = fechaPago && fechaPago.trim() !== '' ? 'completada' : 'pendiente';
      setLiquidacionesEstado(prev => {
        const nuevo = new Map(prev);
        nuevo.set(legajoNum, {
          estado: estadoLiquidacion,
          fechaPago: fechaPago && fechaPago.trim() !== '' ? fechaPago : null
        });
        return nuevo;
      });
      
      setCurrentStep('preview');
      
      // Notificar al componente padre para actualizar la lista
      if (onProcess) {
        onProcess(result);
      }
    } catch (error) {
      // Solo mostrar error si realmente es un error de la API
      // Manejar error 409 (período ya liquidado)
      if (error.response?.status === 409) {
        notify.error(
          `El período ${periodo} ya está liquidado para este empleado. Por favor, seleccione otro período.`,
          8000 // Duración más larga para mensajes importantes
        );
      } else {
        // Para otros errores, el interceptor de axios ya mostrará la notificación
        // Solo loguear aquí para debugging
        console.error('Error al liquidar sueldo:', error);
      }
    } finally {
      setIsProcessing(false);
    }
  };


  // Generar HTML completo del recibo
  const generateReceiptHTML = () => {
    const periodoDisplay = formatPeriodToMonthYear(payrollData.periodDisplay || periodo);
    const fechaActual = new Date().toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    // Calcular totales para el recibo
    const { remunerations, deductions, netAmount } = calculateTotals();
    
    // Generar texto en palabras automáticamente si no está definido
    const amountWordsText = (amountInWords || (netAmount > 0 ? numberToWords(netAmount) + ' pesos' : '—')).toUpperCase();

    // Generar filas de conceptos
    const conceptosRows = conceptos.map(concept => {
      const remuneracion = (concept.tipo === 'CATEGORIA' ||
        concept.tipo === 'BONIFICACION_AREA' ||
        concept.tipo === 'CONCEPTO_LYF' ||
        concept.tipo === 'CONCEPTO_UOCRA') && concept.total > 0
        ? formatCurrencyAR(concept.total)
        : '';
      
      const descuento = concept.tipo === 'DESCUENTO' && concept.total < 0
        ? formatCurrencyAR(Math.abs(concept.total))
        : '';

      return `
        <tr>
          <td class="concept-code">${concept.id || '—'}</td>
          <td class="concept-name">${concept.nombre}</td>
          <td class="concept-units">${concept.cantidad || 1}</td>
          <td class="concept-remuneration">${remuneracion}</td>
          <td class="concept-deduction">${descuento}</td>
        </tr>
      `;
    }).join('');

    // Agregar básico para UOCRA si corresponde
    const basicoUocraRow = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') && basicSalary > 0
      ? `
        <tr>
          <td class="concept-code">—</td>
          <td class="concept-name">Básico</td>
          <td class="concept-units">1</td>
          <td class="concept-remuneration">${formatCurrencyAR(basicSalary)}</td>
          <td class="concept-deduction"></td>
        </tr>
      `
      : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Sueldo - ${selectedEmployee?.nombre} ${selectedEmployee?.apellido}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 12px;
      color: #333;
      background: white;
      padding: 20px;
      line-height: 1.4;
    }
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 20px;
    }
    
    .receipt-header-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }
    
    .company-logo {
      width: 100px;
      height: 100px;
      border: 2px solid #333;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      padding: 5px;
    }
    
    .logo-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .company-info {
      flex: 1;
      margin-left: 15px;
    }
    
    .company-name {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .company-detail {
      font-size: 11px;
      line-height: 1.4;
    }
    
    .company-detail.highlight {
      font-weight: 600;
    }
    
    .receipt-title {
      text-align: right;
      font-weight: bold;
      font-size: 14px;
      color: #22c55e;
    }
    
    .title-main {
      display: block;
      margin-bottom: 5px;
    }
    
    .title-number {
      display: block;
      font-size: 12px;
      color: #666;
      font-weight: normal;
    }
    
    .employee-info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
      padding: 15px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    
    .info-row {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 10px;
      align-items: center;
    }
    
    .info-row .label {
      font-weight: bold;
      font-size: 11px;
    }
    
    .info-row .value {
      font-size: 12px;
    }
    
    .concepts-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    
    .concepts-table thead {
      background: #22c55e;
      color: white;
    }
    
    .concepts-table th {
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .concepts-table th:last-child {
      text-align: right;
    }
    
    .concepts-table tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }
    
    .concepts-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .concepts-table td {
      padding: 8px 10px;
      border: 1px solid #e5e7eb;
    }
    
    .concept-code {
      font-weight: 600;
      text-align: center;
      width: 60px;
    }
    
    .concept-units {
      text-align: center;
      width: 70px;
    }
    
    .concept-remuneration {
      text-align: right;
      width: 120px;
      color: #22c55e;
      font-weight: 600;
    }
    
    .concept-deduction {
      text-align: right;
      width: 120px;
      color: #ef4444;
      font-weight: 600;
    }
    
    .receipt-totals-row td {
      text-align: right;
      font-weight: bold;
      padding: 15px 10px;
    }
    
    .receipt-net-row td {
      text-align: right;
      font-weight: bold;
      padding: 15px 10px;
      border-top: 2px solid #22c55e;
      font-size: 13px;
    }
    
    .receipt-net-amount {
      color: #22c55e;
      font-size: 14px;
    }
    
    .payment-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      font-size: 11px;
    }
    
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .detail-item .label {
      font-weight: 600;
      color: #666;
      font-size: 10px;
      text-transform: uppercase;
    }
    
    .detail-item .value {
      color: #333;
      font-size: 12px;
    }
    
    .amount-words-section {
      margin-bottom: 20px;
      padding: 15px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }
    
    .amount-words-label {
      font-weight: bold;
      font-size: 11px;
      display: block;
      margin-bottom: 5px;
    }
    
    .amount-words-input {
      width: 100%;
      font-size: 12px;
      padding: 8px;
      border: 1px solid #e5e7eb;
      background: white;
    }
    
    .receipt-footer {
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    
    .footer-text {
      font-style: italic;
      margin-bottom: 20px;
    }
    
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 30px;
    }
    
    .signature-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    
    .signature-block .line {
      width: 150px;
      height: 1px;
      background: #333;
      margin-top: 40px;
    }
    
    .signature-block .label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .receipt-container {
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header-wrapper">
      <div class="company-logo">
        <img src="/logo192.png" alt="Logo Empresa" class="logo-image" onerror="this.style.display='none'">
      </div>
      
      <div class="company-info">
        <div class="company-name">COOP. DE SERV. PUB. 25 DE MAYO LTDA</div>
        <div class="company-detail">Domicilio: Ramirez 367</div>
        <div class="company-detail highlight">C.U.I.T.: 30-54569238-0</div>
      </div>
      
      <div class="receipt-title">
        <span class="title-main">RECIBO DE HABERES</span>
        <span class="title-number">Ley nº 20.744</span>
      </div>
    </div>
    
    <div class="employee-info-section">
      <div class="info-row">
        <span class="label">Apellido y Nombre</span>
        <span class="value">${selectedEmployee?.apellido || ''}, ${selectedEmployee?.nombre || ''}</span>
      </div>
      <div class="info-row">
        <span class="label">Legajo</span>
        <span class="value">${selectedEmployee?.legajo || '—'}</span>
      </div>
      <div class="info-row">
        <span class="label">C.U.I.L.</span>
        <span class="value">${selectedEmployee?.cuil || '—'}</span>
      </div>
      <div class="info-row">
        <span class="label">Fecha Ingreso</span>
        <span class="value">${formatDateDDMMYYYY(selectedEmployee?.inicioActividad)}</span>
      </div>
      <div class="info-row">
        <span class="label">Categoría</span>
        <span class="value">${selectedEmployee?.categoria || selectedEmployee?.category || '—'}</span>
      </div>
      <div class="info-row">
        <span class="label">Período</span>
        <span class="value">${periodoDisplay}</span>
      </div>
      <div class="info-row">
        <span class="label">Remuneración asignada</span>
        <span class="value">${formatCurrencyAR(remunerationAssigned)}</span>
      </div>
    </div>
    
    <table class="concepts-table">
      <thead>
        <tr>
          <th style="width: 60px">Código</th>
          <th style="width: 40%">Concepto</th>
          <th style="width: 70px; text-align: center">Unidades</th>
          <th style="width: 120px; text-align: right">Remuneraciones</th>
          <th style="width: 120px; text-align: right">Descuentos</th>
        </tr>
      </thead>
      <tbody>
        ${conceptosRows}
        ${basicoUocraRow}
      </tbody>
      <tfoot>
        <tr class="receipt-totals-row">
          <td colspan="3" style="text-align: right; font-weight: bold; padding: 15px 10px">
            TOTALES:
          </td>
          <td class="receipt-total-remuneration" style="text-align: right; font-weight: bold; padding: 15px 10px">
            ${formatCurrencyAR(remunerations)}
          </td>
          <td class="receipt-total-deduction" style="text-align: right; font-weight: bold; padding: 15px 10px">
            ${formatCurrencyAR(deductions)}
          </td>
        </tr>
        <tr class="receipt-net-row">
          <td colspan="4" style="text-align: right; font-weight: bold; padding: 15px 10px; border-top: 2px solid #22c55e">
            TOTAL NETO A COBRAR:
          </td>
          <td class="receipt-net-amount" style="text-align: right; font-weight: bold; padding: 15px 10px; font-size: 14px; color: #22c55e; border-top: 2px solid #22c55e">
            ${formatCurrencyAR(netAmount)}
          </td>
        </tr>
      </tfoot>
    </table>
    
    <div class="payment-details">
      <div class="detail-item">
        <span class="label">Banco Acreditación</span>
        <span class="value">${selectedEmployee?.banco || 'Banco Nación'}</span>
      </div>
      <div class="detail-item">
        <span class="label">Cuenta</span>
        <span class="value">${selectedEmployee?.cbu || '—'}</span>
      </div>
    </div>
    
    <div class="amount-words-section">
      <label class="amount-words-label">SON PESOS:</label>
      <div style="font-size: 12px; padding: 8px; border: 1px solid #e5e7eb; background: white; min-height: 30px;">
        ${amountWordsText}
      </div>
    </div>
    
    <div class="receipt-footer">
      <p class="footer-text">
        El presente es duplicado del recibo original que obra en nuestro poder. Firmado por el empleado.
      </p>
      <div class="signature-section">
        <div class="signature-block">
          <div class="line"></div>
          <span class="label">Firma del Empleador</span>
        </div>
        <div class="signature-block">
          <div class="line"></div>
          <span class="label">Firma del Empleado</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return html;
  };

  // Imprimir recibo
  const handlePrint = () => {
    // Crear una ventana nueva con el HTML del recibo
    const printWindow = window.open('', '_blank');
    const htmlContent = generateReceiptHTML();
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Esperar a que se cargue el contenido y luego imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Cerrar la ventana después de un tiempo (opcional)
        // setTimeout(() => printWindow.close(), 1000);
      }, 250);
    };
  };

  // Generar HTML del recibo sin el DOCTYPE y etiquetas html/head/body (solo el contenido)
  const generateReceiptContentHTML = () => {
    const periodoDisplay = formatPeriodToMonthYear(payrollData.periodDisplay || periodo);
    const fechaActual = new Date().toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    // Calcular totales para el recibo
    const { remunerations, deductions, netAmount } = calculateTotals();
    
    // Generar texto en palabras automáticamente si no está definido
    const amountWordsText = (amountInWords || (netAmount > 0 ? numberToWords(netAmount) + ' pesos' : '—')).toUpperCase();

    // Generar filas de conceptos
    const conceptosRows = conceptos.map(concept => {
      const remuneracion = (concept.tipo === 'CATEGORIA' ||
        concept.tipo === 'BONIFICACION_AREA' ||
        concept.tipo === 'CONCEPTO_LYF' ||
        concept.tipo === 'CONCEPTO_UOCRA') && concept.total > 0
        ? formatCurrencyAR(concept.total)
        : '';
      
      const descuento = concept.tipo === 'DESCUENTO' && concept.total < 0
        ? formatCurrencyAR(Math.abs(concept.total))
        : '';

      return `
        <tr>
          <td class="concept-code">${concept.id || '—'}</td>
          <td class="concept-name">${concept.nombre}</td>
          <td class="concept-units">${concept.cantidad || 1}</td>
          <td class="concept-remuneration">${remuneracion}</td>
          <td class="concept-deduction">${descuento}</td>
        </tr>
      `;
    }).join('');

    // Agregar básico para UOCRA si corresponde
    const basicoUocraRow = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') && basicSalary > 0
      ? `
        <tr>
          <td class="concept-code">—</td>
          <td class="concept-name">Básico</td>
          <td class="concept-units">1</td>
          <td class="concept-remuneration">${formatCurrencyAR(basicSalary)}</td>
          <td class="concept-deduction"></td>
        </tr>
      `
      : '';

    // Retornar solo el contenido del recibo con estilos inline
    return `
      <div class="receipt-container" style="max-width: 800px; margin: 0 auto; background: white; padding: 20px; font-family: 'Arial', 'Helvetica', sans-serif; font-size: 12px; color: #333; line-height: 1.4;">
        <div class="receipt-header-wrapper" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333;">
          <div class="company-logo" style="width: 100px; height: 100px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; background: white; padding: 5px;">
            <img src="/logo192.png" alt="Logo Empresa" class="logo-image" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'">
          </div>
          
          <div class="company-info" style="flex: 1; margin-left: 15px;">
            <div class="company-name" style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">COOP. DE SERV. PUB. 25 DE MAYO LTDA</div>
            <div class="company-detail" style="font-size: 11px; line-height: 1.4;">Domicilio: Ramirez 367</div>
            <div class="company-detail highlight" style="font-size: 11px; line-height: 1.4; font-weight: 600;">C.U.I.T.: 30-54569238-0</div>
          </div>
          
          <div class="receipt-title" style="text-align: right; font-weight: bold; font-size: 14px; color: #22c55e;">
            <span class="title-main" style="display: block; margin-bottom: 5px;">RECIBO DE HABERES</span>
            <span class="title-number" style="display: block; font-size: 12px; color: #666; font-weight: normal;">Ley nº 20.744</span>
          </div>
        </div>
        
        <div class="employee-info-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Apellido y Nombre</span>
            <span class="value" style="font-size: 12px;">${selectedEmployee?.apellido || ''}, ${selectedEmployee?.nombre || ''}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Legajo</span>
            <span class="value" style="font-size: 12px;">${selectedEmployee?.legajo || '—'}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">C.U.I.L.</span>
            <span class="value" style="font-size: 12px;">${selectedEmployee?.cuil || '—'}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Fecha Ingreso</span>
            <span class="value" style="font-size: 12px;">${formatDateDDMMYYYY(selectedEmployee?.inicioActividad)}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Categoría</span>
            <span class="value" style="font-size: 12px;">${selectedEmployee?.categoria || selectedEmployee?.category || '—'}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Período</span>
            <span class="value" style="font-size: 12px;">${periodoDisplay}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Remuneración asignada</span>
            <span class="value" style="font-size: 12px;">${formatCurrencyAR(remunerationAssigned)}</span>
          </div>
        </div>
        
        <table class="concepts-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
          <thead style="background: #22c55e; color: white;">
            <tr>
              <th style="width: 60px; padding: 10px; text-align: left; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2);">Código</th>
              <th style="width: 40%; padding: 10px; text-align: left; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2);">Concepto</th>
              <th style="width: 70px; padding: 10px; text-align: center; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2);">Unidades</th>
              <th style="width: 120px; padding: 10px; text-align: right; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2);">Remuneraciones</th>
              <th style="width: 120px; padding: 10px; text-align: right; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2);">Descuentos</th>
            </tr>
          </thead>
          <tbody>
            ${conceptosRows}
            ${basicoUocraRow}
          </tbody>
          <tfoot>
            <tr class="receipt-totals-row">
              <td colspan="3" style="text-align: right; font-weight: bold; padding: 15px 10px; border: 1px solid #e5e7eb;">TOTALES:</td>
              <td class="receipt-total-remuneration" style="text-align: right; font-weight: bold; padding: 15px 10px; border: 1px solid #e5e7eb; color: #22c55e;">${formatCurrencyAR(remunerations)}</td>
              <td class="receipt-total-deduction" style="text-align: right; font-weight: bold; padding: 15px 10px; border: 1px solid #e5e7eb; color: #ef4444;">${formatCurrencyAR(deductions)}</td>
            </tr>
            <tr class="receipt-net-row">
              <td colspan="4" style="text-align: right; font-weight: bold; padding: 15px 10px; border-top: 2px solid #22c55e; border: 1px solid #e5e7eb; font-size: 13px;">TOTAL NETO A COBRAR:</td>
              <td class="receipt-net-amount" style="text-align: right; font-weight: bold; padding: 15px 10px; font-size: 14px; color: #22c55e; border-top: 2px solid #22c55e; border: 1px solid #e5e7eb;">${formatCurrencyAR(netAmount)}</td>
            </tr>
          </tfoot>
        </table>
        
        <div class="payment-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 11px;">
          <div class="detail-item" style="display: flex; flex-direction: column; gap: 5px;">
            <span class="label" style="font-weight: 600; color: #666; font-size: 10px; text-transform: uppercase;">Banco Acreditación</span>
            <span class="value" style="color: #333; font-size: 12px;">${selectedEmployee?.banco || 'Banco Nación'}</span>
          </div>
          <div class="detail-item" style="display: flex; flex-direction: column; gap: 5px;">
            <span class="label" style="font-weight: 600; color: #666; font-size: 10px; text-transform: uppercase;">Cuenta</span>
            <span class="value" style="color: #333; font-size: 12px;">${selectedEmployee?.cbu || '—'}</span>
          </div>
        </div>
        
        <div class="amount-words-section" style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <label class="amount-words-label" style="font-weight: bold; font-size: 11px; display: block; margin-bottom: 5px;">SON PESOS:</label>
          <div style="font-size: 12px; padding: 8px; border: 1px solid #e5e7eb; background: white; min-height: 30px;">${amountWordsText}</div>
        </div>
        
        <div class="receipt-footer" style="padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 10px; color: #666;">
          <p class="footer-text" style="font-style: italic; margin-bottom: 20px;">
            El presente es duplicado del recibo original que obra en nuestro poder. Firmado por el empleado.
          </p>
          <div class="signature-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
            <div class="signature-block" style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <div class="line" style="width: 150px; height: 1px; background: #333; margin-top: 40px;"></div>
              <span class="label" style="font-size: 10px; font-weight: 600; text-transform: uppercase;">Firma del Empleador</span>
            </div>
            <div class="signature-block" style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <div class="line" style="width: 150px; height: 1px; background: #333; margin-top: 40px;"></div>
              <span class="label" style="font-size: 10px; font-weight: 600; text-transform: uppercase;">Firma del Empleado</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Descargar recibo como PDF
  const handleDownload = async () => {
    try {
      setIsProcessing(true);
      
      // Crear un elemento temporal para el contenido HTML
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.background = 'white';
      tempDiv.innerHTML = generateReceiptContentHTML();
      document.body.appendChild(tempDiv);

      // Configuración para el PDF
      const periodoDisplay = formatPeriodToMonthYear(payrollData.periodDisplay || periodo);
      const fileName = `recibo_${selectedEmployee?.legajo}_${periodoDisplay.replace(/\s+/g, '_')}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Generar y descargar el PDF
      await html2pdf().set(opt).from(tempDiv).save();
      
      // Limpiar el elemento temporal
      document.body.removeChild(tempDiv);
      
      notify.success('Recibo descargado en PDF correctamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      notify.error('Error al generar el PDF. Por favor, intente nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Resetear modal
  const resetModal = () => {
    setCurrentStep('search');
    setSearchTerm('');
    setFilterGremio('');
    setFilterEstado('');
    setSelectedEmployee(null);
    setPayrollData({});
    setConcepts([]);
    setIsProcessing(false);
    onClose();
  };

  const { remunerations, deductions, netAmount } = calculateTotals();

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetModal}
      title={
        currentStep === 'search' ? 'Seleccionar Empleado' :
        currentStep === 'payroll' ? `Liquidación - ${selectedEmployee?.nombre}` :
        'Vista Previa del Recibo'
      }
      size={currentStep === 'preview' ? 'large' : 'medium'}
      className="process-payroll-modal"
    >
      {/* STEP 1: EMPLOYEE SEARCH */}
      {currentStep === 'search' && (
        <div className="employee-search">
          <div className="search-section">
            <div className="search-filters-container">
              <div className="search-field-wrapper">
                <label htmlFor="employee-search">Buscar empleado</label>
              <div className="search-input-container">
                <Search className="search-icon" />
                <input
                    id="employee-search"
                  type="text"
                  placeholder="Buscar por nombre o legajo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                  </div>
              </div>

              <div className="filter-field-wrapper">
                <label htmlFor="filter-gremio-modal">Filtrar por gremio</label>
                <select
                  id="filter-gremio-modal"
                  className="filter-select"
                  value={filterGremio}
                  onChange={(e) => setFilterGremio(e.target.value)}
                >
                  <option value="">Todos los gremios</option>
                  {gremiosDisponibles.map((gremio) => (
                    <option key={gremio} value={gremio}>
                      {gremio === 'LUZ_Y_FUERZA' ? 'Luz y Fuerza' : gremio}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-field-wrapper">
                <label htmlFor="filter-estado-modal">Filtrar por estado</label>
                <select
                  id="filter-estado-modal"
                  className="filter-select"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="Completada">Completada</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="No realizada">No realizada</option>
                </select>
              </div>
            </div>

            <div className="search-results-info">
              <span className="results-count">
                {filteredEmployees.length} empleado{filteredEmployees.length !== 1 ? 's' : ''} encontrado{filteredEmployees.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="employees-list">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map(employee => (
                  <div key={employee.legajo} className="employee-card" onClick={() => handleSelectEmployee(employee)}>
                    <div className="employee-card-accent"></div>
                    <div className="employee-info">
                      <div className="employee-main">
                        <div className="employee-details">
                          <h4 className="employee-name">{`${employee.nombre} ${employee.apellido}`}</h4>
                          <div className="employee-badges">
                            <span className="badge legajo-badge">#{employee.legajo}</span>
                            <span className="badge category-badge">{employee.categoria}</span>
                            <span className="badge convenio-badge">{formatGremioNombre(employee.gremio.nombre)}</span>
                          </div>
                          <p className="employee-meta">
                            <Clock className="meta-icon" />
                            Ingreso: {employee.inicioActividad}
                          </p>
                        </div>
                      </div>
                      <div className="employee-salary">
                        {processedLegajos.has(Number(employee.legajo)) ? (
                          <span className="salary-label status-processed">
                            <CheckCircle className="status-icon" />
                            Procesada
                          </span>
                        ) : (
                          <span className="salary-label status-pending">
                            <Clock className="status-icon" />
                            Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">
                  <Users className="no-results-icon" />
                  <p>No se encontraron empleados</p>
                  <span className="no-results-hint">Intenta con otro término de búsqueda</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PAYROLL FORM */}
      {currentStep === 'payroll' && selectedEmployee && (
        <div className="payroll-form">
          <div className="employee-header">
            <div className="employee-summary">
              <div className="employee-avatar-small">
                <User className="avatar-icon" />
                <div className="status-dot-small"></div>
              </div>
              <div className="summary-details">
                <h4>{selectedEmployee.nombre}</h4>
                <div className="summary-badges">
                  <span className="badge">#{selectedEmployee.legajo}</span>
                  <span className="badge">{selectedEmployee.categoria}</span>
                  <span className="badge">{formatGremioNombre(selectedEmployee.gremio.nombre)}</span>
                </div>
                {basicSalary > 0 && (
                  <div className="salary-info">
                    <span>Sueldo Básico: </span>
                    <strong>{formatCurrencyAR(basicSalary)}</strong>
                  </div>
                )}
              </div>
            </div>
            {liquidacionType === 'normal' && (
            <div className="period-info">
              <Calendar className="period-icon" />
              <div className="period-details">
                <div className="period-inputs-wrapper">
                  <div className="periodo-liquidacion-wrapper">
                    <label htmlFor="periodo-liquidacion" className="periodo-liquidacion-label">
                      Período de liquidación
                    </label>
                    {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') ? (
                      <div className="period-inputs-row">
                        <select
                          id="periodo-anio"
                          value={periodoAnio}
                          onChange={(e) => setPeriodoAnio(Number(e.target.value))}
                          className="period-select"
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - 2 + i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                        <select
                          id="periodo-mes"
                          value={periodoMes}
                          onChange={(e) => setPeriodoMes(e.target.value)}
                          className="period-select"
                        >
                          <option value="01">Enero</option>
                          <option value="02">Febrero</option>
                          <option value="03">Marzo</option>
                          <option value="04">Abril</option>
                          <option value="05">Mayo</option>
                          <option value="06">Junio</option>
                          <option value="07">Julio</option>
                          <option value="08">Agosto</option>
                          <option value="09">Septiembre</option>
                          <option value="10">Octubre</option>
                          <option value="11">Noviembre</option>
                          <option value="12">Diciembre</option>
                        </select>
                        <select
                          value={quincena}
                          onChange={(e) => setQuincena(Number(e.target.value))}
                          className="period-select"
                        >
                          <option value={1}>Primera quincena</option>
                          <option value={2}>Segunda quincena</option>
                        </select>
                      </div>
                    ) : (
                      <div className="period-inputs-row">
                        <select
                          id="periodo-anio"
                          value={periodoAnio}
                          onChange={(e) => setPeriodoAnio(Number(e.target.value))}
                          className="period-select"
                        >
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - 2 + i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                        <select
                          id="periodo-mes"
                          value={periodoMes}
                          onChange={(e) => setPeriodoMes(e.target.value)}
                          className="period-select"
                        >
                          <option value="01">Enero</option>
                          <option value="02">Febrero</option>
                          <option value="03">Marzo</option>
                          <option value="04">Abril</option>
                          <option value="05">Mayo</option>
                          <option value="06">Junio</option>
                          <option value="07">Julio</option>
                          <option value="08">Agosto</option>
                          <option value="09">Septiembre</option>
                          <option value="10">Octubre</option>
                          <option value="11">Noviembre</option>
                          <option value="12">Diciembre</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <span className="period-status">En proceso</span>
                </div>
                <div className="fecha-pago-wrapper">
                  <label htmlFor="fecha-pago" className="fecha-pago-label">
                    Fecha de pago (opcional)
                  </label>
                  <input
                    id="fecha-pago"
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="fecha-pago-input"
                    placeholder="Dejar vacío para marcar como pendiente"
                  />
                  <p className="fecha-pago-hint">
                    Si no se especifica, la liquidación quedará como pendiente
                  </p>
                </div>
              </div>
            </div>
            )}
          </div>

          {liquidacionType === 'normal' && (
          <div className="concepts-section">
            <div className="section-header">
              <div className="header-left">
                <h3>Conceptos de Liquidación</h3>
                <div className="concepts-counter">
                  <Badge className="counter-icon" />
                  <span>{conceptos.length} conceptos</span>
                </div>
              </div>

              <div className="concept-add-row">
                <select
                  className="form-select concept-select"
                  value={selectedCatalogConcept}
                  onChange={(e) => setSelectedCatalogConcept(e.target.value)}
                >
                  <option value="">Agregar desde catálogo...</option>
                  {catalogBonificaciones.map((c) => {
                    const id = c.idBonificacion ?? c.id;
                    const label = `${c.nombre ?? c.descripcion}${c.porcentaje ? ` (${c.porcentaje}%)` : ''}`;
                    // Excluir si ya existe en la lista de conceptos
                    const exists = conceptos.some(ct => ct.id === id && (ct.tipo === 'CONCEPTO_LYF' || ct.tipo === 'CONCEPTO_UOCRA' || ct.tipo === 'BONIFICACION_AREA' || ct.tipo === 'CONCEPTO'));
                    if (exists) return null;
                    return <option key={`BON_${id}`} value={`BON_${id}`}>{label}</option>;
                  })}

                  {descuentosData.map((d) => {
                    const id = d.idDescuento ?? d.id;
                    const exists = conceptos.some(ct => ct.id === id && ct.tipo === 'DESCUENTO');
                    if (exists) return null;
                    return <option key={`DESC_${id}`} value={`DESC_${id}`}>{`${d.nombre ?? d.descripcion} (Desc ${d.porcentaje}%)`}</option>;
                  })}
                </select>

                <button
                  type="button"
                  className="btn btn-primary btn-sm add-btn"
                  onClick={() => {
                    if (!selectedCatalogConcept) return;
                    // Añadir concepto seleccionado del catálogo
                    const [pref, rawId] = selectedCatalogConcept.split('_');
                    const idNum = Number(rawId);

                    // Evitar duplicados defensivamente
                    if (conceptos.some(c => c.id === idNum && ((pref === 'BON' && c.tipo !== 'DESCUENTO') || (pref === 'DESC' && c.tipo === 'DESCUENTO')) )) {
                      notify.error('El concepto ya está agregado');
                      setSelectedCatalogConcept('');
                      return;
                    }

                    if (pref === 'BON') {
                      const raw = catalogBonificaciones.find(b => (b.idBonificacion ?? b.id) === idNum);
                      if (!raw) {
                        notify.error('Concepto no encontrado en el catálogo');
                        setSelectedCatalogConcept('');
                        return;
                      }

                      // Determinar base para el cálculo
                      const isLuz = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA');
                      const isUocra = selectedEmployee?.gremio?.nombre?.toUpperCase() === 'UOCRA';

                      // Elegir la base de cálculo: preferir básico según gremio, si no está disponible usar remuneración asignada como fallback
                      let base = (isUocra ? basicSalary : (basicoCat11State || basicSalary)) || remunerationAssigned || 0;

                      // Si el concepto tiene porcentaje, calcular; si tiene montoUnitario usarlo
                      let montoUnitario = 0;
                      if (raw.porcentaje) {
                        montoUnitario = (Number(base || 0) * Number(raw.porcentaje || 0)) / 100;
                      } else if (raw.montoUnitario || raw.monto) {
                        montoUnitario = Number(raw.montoUnitario ?? raw.monto ?? 0);
                      }

                      const nuevo = {
                        uid: uidCounter.current++,
                        id: idNum,
                        tipo: isLuz ? 'CONCEPTO_LYF' : isUocra ? 'CONCEPTO_UOCRA' : 'BONIFICACION_FIJA',
                        nombre: raw.nombre ?? raw.descripcion ?? 'Concepto',
                        porcentaje: raw.porcentaje != null ? Number(raw.porcentaje) : null,
                        montoUnitario: Number(montoUnitario) || 0,
                        cantidad: 1,
                        total: (Number(montoUnitario) || 0) * 1
                      };

                      const next = [...conceptos, nuevo];
                      setConceptos(next);
                      setTotal(calcTotal(next));
                      setSelectedCatalogConcept('');
                      notify.success('Concepto agregado');
                      return;
                    }

                    if (pref === 'DESC') {
                      const raw = descuentosData.find(d => (d.idDescuento ?? d.id) === idNum);
                      if (!raw) {
                        notify.error('Descuento no encontrado en el catálogo');
                        setSelectedCatalogConcept('');
                        return;
                      }

                      // Calcular montoUnitario sobre las remuneraciones actuales
                      const remuneracionesActuales = basicSalary + conceptos
                        .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'CATEGORIA_ZONA')
                        .reduce((s, c) => s + (c.total || 0), 0);

                      const montoUnitario = (remuneracionesActuales * (Number(raw.porcentaje || 0))) / 100;

                      const nuevo = {
                        uid: uidCounter.current++,
                        id: idNum,
                        tipo: 'DESCUENTO',
                        nombre: raw.nombre ?? raw.descripcion ?? 'Descuento',
                        porcentaje: Number(raw.porcentaje || 0),
                        montoUnitario: Number(montoUnitario) || 0,
                        cantidad: 1,
                        total: -(Number(montoUnitario) || 0) * 1
                      };

                      const next = [...conceptos, nuevo];
                      setConceptos(next);
                      setTotal(calcTotal(next));
                      setSelectedCatalogConcept('');
                      notify.success('Descuento agregado');
                      return;
                    }

                  }}
                  disabled={!selectedCatalogConcept}
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="concepts-table">
              <div className="table-header">
                <span>Concepto</span>
                <span>Unidades</span>
                <span>Remuneraciones</span>
                <span>Descuentos</span>
                <span>Acciones</span>
              </div>

              {conceptos.map(concept => (
                <div key={concept.uid} className="concept-row">
                  <div className="concept-cell">
                    {concept.isManual ? (
                      <input
                        type="text"
                        value={concept.nombre}
                        onChange={(e) => updateConcept(concept.uid, 'name', e.target.value)}
                        className="concept-input"
                        placeholder="Nombre del concepto"
                      />
                    ) : (
                      <span>
                        {concept.nombre} 
                        {concept.tipo === 'CONCEPTO_MANUAL_LYF' 
                          ? ' (-)' 
                          : concept.porcentaje ? `(${concept.porcentaje}%)` : ''
                        }
                      </span>
                    )}
                  </div>

                  <div className="concept-cell">
                    {canEditQuantity(concept) ? (
                    <input
                      type="text"
                      value={concept.cantidad}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Permitir números con decimales (0.1, 0.01, etc.)
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          handleQtyChange(concept.uid, parseFloat(value) || 0);
                        }
                      }}
                      className="concept-input small"
                      placeholder="0"
                    />
                    ) : (
                      <span className="concept-quantity-disabled" title="La cantidad no es editable para este concepto">
                        {concept.cantidad || 1}
                      </span>
                    )}
                  </div>

                  <div className="concept-cell">
                    {(concept.tipo === 'CATEGORIA' ||
                      concept.tipo === 'BONIFICACION_AREA' ||
                      concept.tipo === 'CONCEPTO_LYF' ||
                      concept.tipo === 'CONCEPTO_UOCRA') && (
                      <div className="amount-editable-wrapper">
                        {editingAmountId === concept.uid ? (
                          <div className="amount-edit-controls">
                            <input
                              type="text"
                              value={editingAmountValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permitir números con decimales (0.01, etc.)
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setEditingAmountValue(value);
                                }
                              }}
                              className="concept-input small"
                              placeholder="0.00"
                            />
                            <button className="btn-accept" onClick={() => saveEditAmount(concept)} title="Aceptar">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button className="btn-cancel" onClick={cancelEditAmount} title="Cancelar">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="amount-editable" onMouseDown={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span className="amount positive">{formatCurrencyAR(concept.total || ((concept.montoUnitario || 0) * (concept.cantidad || 1)))}</span>
                            </div>
                            <Edit className="edit-icon" onClick={() => startEditAmount(concept)} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="concept-cell">
                    {concept.tipo === 'DESCUENTO' && (
                      <div className="amount-editable-wrapper">
                        {editingAmountId === concept.uid ? (
                          <div className="amount-edit-controls">
                            <input
                              type="text"
                              value={editingAmountValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permitir números con decimales (0.01, etc.)
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  setEditingAmountValue(value);
                                }
                              }}
                              className="concept-input small"
                              placeholder="0.00"
                            />
                            <button className="btn-accept" onClick={() => saveEditAmount(concept)} title="Aceptar">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button className="btn-cancel" onClick={cancelEditAmount} title="Cancelar">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="amount-editable" onMouseDown={(e) => e.stopPropagation()}>
                            <span className="amount negative">{formatCurrencyAR(Math.abs(concept.total || 0))}</span>
                            <Edit className="edit-icon" onClick={() => startEditAmount(concept)} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="concept-cell">
                    <div className="concept-actions">
                      {concept.isManual && (
                        <select
                          value={concept.tipo}
                          onChange={(e) => updateConcept(concept.uid, 'type', e.target.value)}
                          className="type-select"
                        >
                          <option value="remuneration">Remuneración</option>
                          <option value="deduction">Descuento</option>
                        </select>
                      )}

                      <button className="remove-btn" onClick={() => confirmDelete(concept.uid)} title="Eliminar concepto">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="totals-summary">
              <div className="total-item">
                <span>Total Remuneraciones:</span>
                <span className="amount positive">{formatCurrencyAR(remunerations)}</span>
              </div>
              <div className="total-item">
                <span>Total Descuentos:</span>
                <span className="amount negative">{formatCurrencyAR(deductions)}</span>
              </div>
              <div className="total-item final">
                <span>NETO A COBRAR:</span>
                <span className="amount final">{formatCurrencyAR(netAmount)}</span>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* STEP 3: RECEIPT PREVIEW */}
      {currentStep === 'preview' && selectedEmployee && (
        <div className="receipt-preview">
          <div className="receipt-container">
            {/* ENCABEZADO DEL RECIBO */}
            <div className="receipt-header-wrapper">
              <div className="company-logo">
                <div className="logo-box">
                  <img src="/logo192.png" alt="Logo Empresa" className="logo-image" />
                </div>
              </div>

              <div className="company-info">
                <div className="company-name">COOP. DE SERV. PUB. 25 DE MAYO LTDA</div>
                <div className="company-detail">Domicilio: Ramirez 367</div>
                <div className="company-detail highlight">C.U.I.T.: 30-54569238-0</div>
              </div>

              <div className="receipt-title">
                <span className="title-main">RECIBO DE HABERES</span>
                <span className="title-number">Ley nº 20.744</span>
              </div>
            </div>

            {/* INFORMACIÓN DEL EMPLEADO */}
            <div className="employee-info-section">
              <div className="info-row">
                <span className="label">Apellido y Nombre</span>
                <span className="value">{selectedEmployee.apellido}, {selectedEmployee.nombre}</span>
              </div>
              <div className="info-row">
                <span className="label">Legajo</span>
                <span className="value">{selectedEmployee.legajo}</span>
              </div>
              <div className="info-row">
                <span className="label">C.U.I.L.</span>
                <span className="value">{selectedEmployee.cuil || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Fecha Ingreso</span>
                <span className="value">{formatDateDDMMYYYY(selectedEmployee.inicioActividad)}</span>
              </div>
              <div className="info-row">
                <span className="label">Antigüedad</span>
                <span className="value">{calculateAntiguedad(selectedEmployee.inicioActividad)}</span>
              </div>
              <div className="info-row">
                <span className="label">Categoría</span>
                <span className="value">{selectedEmployee.categoria || selectedEmployee.category || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Período</span>
                <span className="value">{formatPeriodToMonthYear(payrollData.periodDisplay || periodo)}</span>
              </div>
              <div className="info-row">
                <span className="label">Remuneración asignada</span>
                <span className="value">{formatCurrencyAR(remunerationAssigned)}</span>
              </div>
            </div>

            {/* TABLA DE CONCEPTOS */}
            <table className="concepts-table">
              <thead>
                <tr>
                  <th className="th-code">Código</th>
                  <th className="th-concept">Concepto</th>
                  <th className="th-units">Unidades</th>
                  <th className="th-remuneration">Remuneraciones</th>
                  <th className="th-deduction">Descuentos</th>
                </tr>
              </thead>
              <tbody>
                {conceptos.map(concept => (
                  <tr key={concept.uid}>
                    <td className="concept-code">{concept.id}</td>
                    <td className="concept-name">{concept.nombre}</td>
                    <td className="concept-units">{concept.cantidad}</td>
                    <td className="concept-remuneration">
                      {(concept.tipo === 'CATEGORIA' ||
                        concept.tipo === 'BONIFICACION_AREA' ||
                        concept.tipo === 'CONCEPTO_LYF' ||
                        concept.tipo === 'CONCEPTO_UOCRA' ||
                        concept.tipo === 'TITULO_LYF' ||
                        concept.tipo === 'CONCEPTO_MANUAL_LYF' ||
                        concept.tipo === 'HORA_EXTRA_LYF' ||
                        concept.tipo === 'AGUINALDO' ||
                        concept.tipo === 'VACACIONES') && concept.total > 0
                        ? formatCurrencyAR(concept.total)
                        : ''}
                    </td>
                    <td className="concept-deduction">
                      {(concept.tipo === 'DESCUENTO' || 
                        concept.tipo === 'DESCUENTO_LYF' || 
                        concept.tipo === 'DESCUENTO_UOCRA') && concept.total < 0
                        ? formatCurrencyAR(Math.abs(concept.total))
                        : ''}
                    </td>
                  </tr>
                ))}
                {/* Mostrar básico para UOCRA en el recibo */}
                {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') && basicSalary > 0 && (
                  <tr>
                    <td className="concept-code">—</td>
                    <td className="concept-name">Básico</td>
                    <td className="concept-units">1</td>
                    <td className="concept-remuneration">{formatCurrencyAR(basicSalary)}</td>
                    <td className="concept-deduction"></td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="receipt-totals-row">
                  <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem 0.75rem' }}>
                    TOTALES:
                  </td>
                  <td className="receipt-total-remuneration" style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem 0.75rem' }}>
                    {formatCurrencyAR(remunerations)}
                  </td>
                  <td className="receipt-total-deduction" style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem 0.75rem' }}>
                    {formatCurrencyAR(deductions)}
                  </td>
                </tr>
                <tr className="receipt-net-row">
                  <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem 0.75rem', borderTop: '2px solid #22c55e' }}>
                    TOTAL NETO A COBRAR:
                  </td>
                  <td className="receipt-net-amount" style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem 0.75rem', fontSize: '1.1rem', color: '#22c55e', borderTop: '2px solid #22c55e' }}>
                    {formatCurrencyAR(netAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* DETALLES DE PAGO */}
            <div className="payment-details">
              <div className="detail-item">
                <span className="label">Banco Acreditación</span>
                <span className="value">{selectedEmployee.banco || 'Banco Nación'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Número de Cuenta</span>
                <span className="value">{selectedEmployee.cuenta || '—'}</span>
              </div>
            </div>

            {/* SON PESOS */}
            <div className="amount-words-section">
              <label className="amount-words-label">SON PESOS:</label>
              <input
                type="text"
                className="amount-words-input"
                value={amountInWords}
                onChange={(e) => {
                  // Solo permite letras, espacios y caracteres especiales comunes en español
                  const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                  setAmountInWords(value);
                }}
                placeholder="Escriba el monto en palabras..."
              />
            </div>

            {/* PIE DEL RECIBO */}
            <div className="receipt-footer">
              <p className="footer-text">
                El presente es duplicado del recibo original que obra en nuestro poder. Firmado por el empleado.
              </p>
              <div className="signature-section">
                <div className="signature-block">
                  <div className="line"></div>
                  <span className="label">Firma del Empleador</span>
                </div>
                <div className="signature-block">
                  <div className="line"></div>
                  <span className="label">Firma del Empleado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

      <ModalFooter>
        {currentStep === 'search' && (
          <button className="btn btn-secondary" onClick={resetModal}>
            Cancelar
          </button>
        )}

        {currentStep === 'payroll' && (
          <>
            <button className="btn btn-secondary" onClick={() => setCurrentStep('search')}>
              Volver
            </button>
            {liquidacionType === 'aguinaldo' ? (
              <button 
                className="btn btn-primary" 
                onClick={generatePayroll} 
                disabled={isProcessing || !aguinaldoCalculo}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isProcessing ? 'Liquidando...' : 'Liquidar Aguinaldo'}
              </button>
            ) : liquidacionType === 'vacaciones' ? (
              <button 
                className="btn btn-primary" 
                onClick={generatePayroll} 
                disabled={isProcessing || !vacacionesCalculo}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isProcessing ? 'Liquidando...' : 'Liquidar Vacaciones'}
              </button>
            ) : (
            <button className="btn btn-primary" onClick={generatePayroll} disabled={isProcessing}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Generar Recibo
            </button>
            )}
          </>
        )}

        {currentStep === 'preview' && (
          <>
            <button className="btn btn-secondary" onClick={() => setCurrentStep('payroll')}>
              Editar
            </button>
            <button className="btn btn-success" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
            <button className="btn btn-primary" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}