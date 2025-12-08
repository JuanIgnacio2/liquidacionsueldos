import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { Search, Users, Download, Printer, Plus, X, CheckCircle, User, Calendar, Badge, Clock, Star, Edit, Trash2 } from 'lucide-react';
import * as api from '../../services/empleadosAPI';
import { useNotification } from '../../Hooks/useNotification';
import { useConfirm } from '../../Hooks/useConfirm';
import { sortConceptos } from '../../utils/conceptosUtils';
import html2pdf from 'html2pdf.js';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  // Estados para edición en línea y confirmación de borrado
  const [editingAmountId, setEditingAmountId] = useState(null);
  const [editingAmountValue, setEditingAmountValue] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [basicSalary, setBasicSalary] = useState(0);
  const [descuentosData, setDescuentosData] = useState([]);
  const [horasExtrasLyFData, setHorasExtrasLyFData] = useState([]);
  const [titulosLyFData, setTitulosLyFData] = useState([]);
  const [conceptosManualesLyFData, setConceptosManualesLyFData] = useState([]);
  const [descuentosLyFData, setDescuentosLyFData] = useState([]);
  const [descuentosUocraData, setDescuentosUocraData] = useState([]);
  const [remunerationAssigned, setRemunerationAssigned] = useState(0);
  const [amountInWords, setAmountInWords] = useState('');
  const uidCounter = useRef(1);
  // Normalizar el período inicial a formato YYYY-MM
  const getInitialPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [periodo, setPeriodo] = useState(getInitialPeriod());
  const [quincena, setQuincena] = useState(1); // 1 = primera quincena, 2 = segunda quincena
  const [fechaPago, setFechaPago] = useState(''); // Fecha de pago opcional
  // Estados para selector de período (año y mes separados)
  const currentDate = new Date();
  const [periodoAnio, setPeriodoAnio] = useState(currentDate.getFullYear());
  const [periodoMes, setPeriodoMes] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [processedLegajos, setProcessedLegajos] = useState(new Set()); // Set de legajos procesados en el mes actual
  const [liquidacionesEstado, setLiquidacionesEstado] = useState(new Map()); // Map<legajo, {estado: 'completada'|'pendiente', fechaPago: string|null}>
  // Estados para aguinaldo
  const [liquidacionType, setLiquidacionType] = useState('normal'); // 'normal', 'aguinaldo' o 'vacaciones'
  const [aguinaldoNumero, setAguinaldoNumero] = useState(1); // 1 o 2
  const [aguinaldoAnio, setAguinaldoAnio] = useState(new Date().getFullYear());
  const [aguinaldoCalculo, setAguinaldoCalculo] = useState(null);
  // Estados para vacaciones
  const [anioVacaciones, setAnioVacaciones] = useState(new Date().getFullYear());
  const [vacacionesCalculo, setVacacionesCalculo] = useState(null);

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
      
      let bonificacionesFijas = [];
      let descuentos = [];
      let horasExtrasLyF = [];
      let titulosLyF = [];
      let conceptosManualesLyF = [];
      let descuentosLyF = [];
      let descuentosUocra = [];
      
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
      
      // Guardar catálogos para uso posterior
      setDescuentosData(descuentos);
      setCatalogBonificaciones(bonificacionesFijas || []);
      setHorasExtrasLyFData(horasExtrasLyF || []);
      setTitulosLyFData(titulosLyF || []);
      setConceptosManualesLyFData(conceptosManualesLyF || []);
      setDescuentosLyFData(descuentosLyF || []);
      setDescuentosUocraData(descuentosUocra || []);

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

          // Detectar conceptos que se calculan sobre el total bruto
          const nombreConcepto = concepto?.nombre ?? concepto?.descripcion ?? asignado.nombre ?? asignado.descripcion ?? 'Concepto';
          const nombreNormalizado = normalize(nombreConcepto);
          
          // Verificar si el concepto tiene baseCalculo = 'TOTAL_BRUTO' (nuevo campo)
          const baseCalculoConcepto = concepto?.baseCalculo ?? concepto?.base_calculo;
          const usaTotalBruto = baseCalculoConcepto === 'TOTAL_BRUTO' || baseCalculoConcepto === 'total_bruto';
          
          // Detectar conceptos especiales por nombre (compatibilidad hacia atrás)
          const isConceptoEspecial = (
            nombreNormalizado.includes('suplemento antiguedad') ||
            nombreNormalizado.includes('suplemento antigüedad') ||
            nombreNormalizado.includes('art 50') ||
            nombreNormalizado.includes('art 69') ||
            nombreNormalizado.includes('art 70') ||
            nombreNormalizado.includes('art 72')
          ) && isLuzYFuerza;

          const isBonifAntiguedad = nombreNormalizado.includes('bonif antiguedad') || nombreNormalizado.includes('bonif antigüedad') && isLuzYFuerza;

          if (isBonifAntiguedad) {

            const porcentaje = concepto?.porcentaje ?? asignado.porcentaje ?? asignado.porcentajeBonificacion ?? 0;
            const unidades = Number(asignado.unidades) || 1;
            const montoUnitario = basicoCat11 * 1.4 * (Number(porcentaje) || 0) / 100;
            const total = montoUnitario * unidades;

            return {
              uid: uidCounter.current++,
              id: asignado.idReferencia,
              tipo: asignado.tipoConcepto,
              nombre: nombreConcepto,
              porcentaje: Number(porcentaje) || null,
              montoUnitario: montoUnitario,
              cantidad: unidades,
              total: total,
            };
          }
          
          // Si es un concepto que usa TOTAL_BRUTO o es concepto especial por nombre, guardar estructura pero calcular después
          if (usaTotalBruto || isConceptoEspecial) {
            const porcentaje = concepto?.porcentaje ?? asignado.porcentaje ?? asignado.porcentajeBonificacion ?? 0;
            const unidades = Number(asignado.unidades) || 1;
            
            // Guardar estructura, se recalculará después con el total bruto
            return {
              uid: uidCounter.current++,
              id: asignado.idReferencia,
              tipo: asignado.tipoConcepto,
              nombre: nombreConcepto,
              montoUnitario: 0, // Se calculará después
              porcentaje: Number(porcentaje) || null,
              cantidad: unidades,
              total: 0, // Se calculará después
              _esConceptoEspecial: true, // Flag para identificar y recalcular después
            };
          }

          // Para Luz y Fuerza (CONCEPTO_LYF y TITULO_LYF): 
          // - Si baseCalculo === 'BASICO_CATEGORIA_11' o no tiene campo: calcular sobre categoría 11
          // - Si baseCalculo === 'TOTAL_BRUTO': ya se manejó arriba
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
          // Incluir baseCalculo si existe en el catálogo
          const baseCalculoDescuento = concepto?.baseCalculo ?? concepto?.base_calculo;
          return {
            uid: uidCounter.current++,
            id: asignado.idReferencia,
            tipo: tipoDescuento, // Mantener el tipo específico (DESCUENTO, DESCUENTO_LYF, DESCUENTO_UOCRA)
            nombre: concepto.nombre ?? concepto.descripcion ?? 'Concepto',
            montoUnitario: 0, // Se calculará después
            porcentaje: Number(concepto.porcentaje) || 0, // Guardar porcentaje para recalcular (si no usa baseCalculo)
            cantidad: Number(asignado.unidades) || 1,
            total: 0, // Se calculará después
            baseCalculo: baseCalculoDescuento || null, // Guardar baseCalculo del catálogo
          };
        })
        .filter(Boolean);

      /* Lista final de conceptos (sin horas extras todavía) */
      // Para UOCRA, no incluir el concepto básico en la lista
      const listaSinHoras = isUocra 
        ? [...bonificacionesMapped, ...descuentosMapped]
        : [basico, ...bonosDeAreas, ...bonificacionesMapped, ...descuentosMapped];

      // Calcular horas extras DESPUÉS de todas las bonificaciones
      const calcularHorasExtras = (items) => {
        if (!isLuzYFuerza || horasExtrasAsignadas.length === 0) return [];

        // Calcular total remunerativo (básico + bonificaciones, sin horas extras, descuentos ni conceptos especiales)
        const totalRemunerativo = items
          .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'HORA_EXTRA_LYF' && !c._esConceptoEspecial)
          .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);

        // Calcular valor hora
        const valorHora = totalRemunerativo / 156;

        // Mapear horas extras asignadas
        return horasExtrasAsignadas.map((asignado) => {
          const horaExtra = horasExtrasLyF.find(he => 
            (he.idHoraExtra ?? he.id) === asignado.idReferencia
          );

          const nombreConcepto = horaExtra 
            ? (horaExtra.descripcion ?? horaExtra.codigo ?? (asignado.idReferencia === 1 ? 'Horas Extras Simples' : 'Horas Extras Dobles'))
            : (asignado.nombre ?? asignado.descripcion ?? (asignado.idReferencia === 1 ? 'Horas Extras Simples' : 'Horas Extras Dobles'));
          
          const factor = horaExtra 
            ? (Number(horaExtra.factor) || (asignado.idReferencia === 1 ? 1.5 : 2))
            : (asignado.idReferencia === 1 ? 1.5 : 2);
          const unidades = Number(asignado.unidades) || 1;

          // Para "Personal de turno": usar totalRemunerativo directamente, no valorHora
          let montoUnitario;
          if (isPersonalDeTurno(nombreConcepto)) {
            montoUnitario = totalRemunerativo * factor;
          } else {
            montoUnitario = valorHora * factor;
          }
          
          const total = montoUnitario * unidades;

          if (!horaExtra) {
            // Fallback si no se encuentra en el catálogo
            return {
              uid: uidCounter.current++,
              id: asignado.idReferencia,
              tipo: 'HORA_EXTRA_LYF',
              nombre: nombreConcepto,
              montoUnitario: Number(montoUnitario) || 0,
              factor: factor,
              cantidad: unidades,
              total: Number(total) || 0,
            };
          }

          return {
            uid: uidCounter.current++,
            id: horaExtra.idHoraExtra ?? horaExtra.id ?? asignado.idReferencia,
            tipo: 'HORA_EXTRA_LYF',
            nombre: nombreConcepto,
            montoUnitario: Number(montoUnitario) || 0,
            factor: Number(factor),
            cantidad: unidades,
            total: Number(total) || 0,
          };
        });
      };

      const horasExtrasMapped = calcularHorasExtras(listaSinHoras);
      const listaConHoras = [...listaSinHoras, ...horasExtrasMapped];

      // Recalcular conceptos especiales usando la función auxiliar
      const listaConConceptosEspeciales = recalcularConceptosEspeciales(listaConHoras, isUocra, basicoValue);

      // Recalcular descuentos DESPUÉS de aplicar Horas Extras y conceptos especiales con el total correcto de remuneraciones
      const recalcularDescuentos = (items) => {
        // Calcular total de remuneraciones (incluyendo horas extras)
        // Para UOCRA: basicoValue no está en la lista, así que lo sumamos
        // Para Luz y Fuerza: el básico está en la lista como 'CATEGORIA', así que solo sumamos de la lista
        let totalRemuneraciones = 0;
        if (isUocra) {
          // Para UOCRA, el básico no está en la lista, sumarlo por separado
          totalRemuneraciones = basicoValue + 
            items
              .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA' && c.tipo !== 'CATEGORIA_ZONA')
              .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);
        } else {
          // Para Luz y Fuerza, el básico ya está en la lista como 'CATEGORIA', sumar todo excepto descuentos
          totalRemuneraciones = items
            .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA')
            .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);
        }

        let listaActual = items.map(item => ({ ...item })); // Clonar para no mutar el original
        
        // PASO 1: Calcular primero los descuentos que NO usan TOTAL_NETO (TOTAL_BRUTO o porcentaje tradicional)
        listaActual = listaActual.map(item => {
          if (item.tipo === 'DESCUENTO' || item.tipo === 'DESCUENTO_LYF' || item.tipo === 'DESCUENTO_UOCRA') {
            const baseCalculoDescuento = item.baseCalculo ?? item.base_calculo;
            const usaTotalBruto = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto';
            const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
            
            // Solo calcular los que NO usan TOTAL_NETO en este paso
            if (usaTotalBruto) {
              // Usar cantidad como porcentaje sobre TOTAL_BRUTO
              const cantidadComoPorcentaje = Number(item.cantidad) || 0;
              if (cantidadComoPorcentaje > 0 && totalRemuneraciones > 0) {
                const nuevoTotal = -(totalRemuneraciones * cantidadComoPorcentaje / 100);
                return {
                  ...item,
                  montoUnitario: Math.abs(nuevoTotal),
                  total: nuevoTotal
                };
              }
            } else if (!usaTotalNeto && item.porcentaje && totalRemuneraciones > 0) {
              // Comportamiento tradicional: usar porcentaje del catálogo
              const montoUnitario = (totalRemuneraciones * item.porcentaje / 100);
              const nuevoTotal = -(montoUnitario * (Number(item.cantidad) || 1));
              return {
                ...item,
                montoUnitario: Number(montoUnitario) || 0,
                total: nuevoTotal
              };
            }
            // Si usa TOTAL_NETO, dejarlo para el siguiente paso
          }
          return item;
        });
        
        // PASO 2: Calcular neto preliminar (remuneraciones - descuentos que no usan TOTAL_NETO)
        const descuentosNoTotalNeto = listaActual
          .filter(c => {
            if (c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA') return false;
            const baseCalculoDescuento = c.baseCalculo ?? c.base_calculo;
            const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
            return !usaTotalNeto; // Solo los que NO usan TOTAL_NETO
          })
          .reduce((sum, c) => sum + Math.abs(c.total || 0), 0);
        const netoPreliminar = totalRemuneraciones - descuentosNoTotalNeto;
        
        // PASO 3: Calcular descuentos que usan TOTAL_NETO sobre el neto preliminar
        listaActual = listaActual.map(item => {
          if (item.tipo === 'DESCUENTO' || item.tipo === 'DESCUENTO_LYF' || item.tipo === 'DESCUENTO_UOCRA') {
            const baseCalculoDescuento = item.baseCalculo ?? item.base_calculo;
            const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
            
            if (usaTotalNeto) {
              // Usar cantidad como porcentaje sobre el neto preliminar
              const cantidadComoPorcentaje = Number(item.cantidad) || 0;
              if (cantidadComoPorcentaje > 0 && netoPreliminar > 0) {
                const nuevoTotal = -(netoPreliminar * cantidadComoPorcentaje / 100);
                return {
                  ...item,
                  montoUnitario: Math.abs(nuevoTotal),
                  total: nuevoTotal
                };
              }
            }
          }
          return item;
        });
        
        return listaActual;
      };

      const listaFinal = recalcularDescuentos(listaConConceptosEspeciales);

      // Calcular asistencia inicial si es UOCRA usando la función helper
      const listaConAsistencia = calculateAsistencia(listaFinal, employee);

      setTotal(calcTotal(listaConAsistencia));
      setConceptos(listaConAsistencia);
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
        const liquidaciones = await api.getPagosByPeriodo(currentPeriod);
        // Extraer legajos únicos de las liquidaciones y su estado
        const legajosSet = new Set();
        const estadoMap = new Map();
        
        if (Array.isArray(liquidaciones)) {
          liquidaciones.forEach(liquidacion => {
            const legajo = liquidacion.legajo || liquidacion.legajoEmpleado;
            if (legajo) {
              const legajoNum = Number(legajo);
              legajosSet.add(legajoNum);
              
              // Determinar estado: si tiene fechaPago es completada, si no es pendiente
              const fechaPago = liquidacion.fechaPago;
              const estado = liquidacion.estado?.toLowerCase() || (fechaPago ? 'completada' : 'pendiente');
              
              estadoMap.set(legajoNum, {
                estado: estado,
                fechaPago: fechaPago || null
              });
            }
          });
        }
        
        setProcessedLegajos(legajosSet);
        setLiquidacionesEstado(estadoMap);
      } catch (error) {
        console.error('Error al cargar liquidaciones del mes actual:', error);
        // En caso de error, dejar el set vacío
        setProcessedLegajos(new Set());
        setLiquidacionesEstado(new Map());
      }
    };

    loadCurrentMonthLiquidaciones();
  }, [isOpen]);

  // Sincronizar periodoAnio y periodoMes con periodo cuando cambia periodo
  useEffect(() => {
    if (periodo && periodo.includes('-')) {
      const [anio, mes] = periodo.split('-');
      if (anio && mes) {
        setPeriodoAnio(Number(anio));
        setPeriodoMes(mes);
      }
    }
  }, [periodo]);

  // Actualizar periodo cuando cambian periodoAnio o periodoMes
  useEffect(() => {
    if (periodoAnio && periodoMes) {
      const nuevoPeriodo = `${periodoAnio}-${periodoMes}`;
      if (nuevoPeriodo !== periodo) {
        setPeriodo(nuevoPeriodo);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoAnio, periodoMes]);

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
      setLiquidacionesEstado(new Map());
      setQuincena(1);
      setLiquidacionType('normal');
      setAguinaldoNumero(1);
      setAguinaldoAnio(new Date().getFullYear());
      setAguinaldoCalculo(null);
      setAnioVacaciones(new Date().getFullYear());
      setVacacionesCalculo(null);
      // Reset período
      const initialPeriod = getInitialPeriod();
      setPeriodo(initialPeriod);
      const [anio, mes] = initialPeriod.split('-');
      if (anio && mes) {
        setPeriodoAnio(Number(anio));
        setPeriodoMes(mes);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialEmployee]);

  // Determinar si un concepto puede tener cantidad editable
  const canEditQuantity = (concept) => {
    // Conceptos manuales LYF siempre tienen cantidad 1 (no editables)
    if (concept.tipo === 'CONCEPTO_MANUAL_LYF') {
      return false;
    }
    // Aguinaldo no es editable
    if (concept.tipo === 'AGUINALDO') {
      return false;
    }
    
    const gremioNombre = selectedEmployee?.gremio?.nombre?.toUpperCase() || '';
    const isLuzYFuerza = gremioNombre.includes('LUZ') && gremioNombre.includes('FUERZA');
    const isUocra = gremioNombre === 'UOCRA';
    
    // Para Luz y Fuerza: solo HORA_EXTRA_LYF con id 1 (simples) o 2 (dobles)
    if (isLuzYFuerza) {
      if (concept.tipo === 'HORA_EXTRA_LYF' && (concept.id === 1 || concept.id === 2)) {
        return true;
      }
      return false;
    }
    
    // Para UOCRA: Hs. Normales, Horas Extras, Horas Extras Dobles (asistencia se calcula automáticamente)
    if (isUocra) {
      const nombreUpper = (concept.nombre || '').toUpperCase();
      // Identificar conceptos de horas por nombre
      if (nombreUpper.includes('HS.NORMALES') || 
          nombreUpper.includes('HORAS NORMALES') ||
          nombreUpper.includes('HORAS EXTRAS DOBLES') ||
          nombreUpper.includes('HORAS EXTRAS') && !nombreUpper.includes('DOBLES')) {
        return true;
      }
      // Asistencia NO es editable (se calcula automáticamente)
      if (nombreUpper.includes('ASISTENCIA')) {
        return false;
      }
      return false;
    }
    
    // Para otros gremios: no editable
    return false;
  };

  // Calcular asistencia automáticamente para UOCRA
  // Acepta una lista de conceptos y retorna la lista actualizada con la asistencia calculada
  const calculateAsistencia = (listaConceptos, empleado = selectedEmployee) => {
    const gremioNombre = empleado?.gremio?.nombre?.toUpperCase() || '';
    const isUocra = gremioNombre === 'UOCRA';
    
    if (!isUocra) return listaConceptos;
    
    // Buscar conceptos de horas
    const horasNormales = listaConceptos.find(c => {
      const nombreUpper = (c.nombre || '').toUpperCase();
      return nombreUpper.includes('HS.NORMALES') || nombreUpper.includes('HORAS NORMALES');
    });
    
    const horasExtras = listaConceptos.find(c => {
      const nombreUpper = (c.nombre || '').toUpperCase();
      return nombreUpper.includes('HORAS EXTRAS') && !nombreUpper.includes('DOBLES');
    });
    
    const horasExtrasDobles = listaConceptos.find(c => {
      const nombreUpper = (c.nombre || '').toUpperCase();
      return nombreUpper.includes('HORAS EXTRAS DOBLES');
    });
    
    // Buscar concepto de asistencia
    const asistencia = listaConceptos.find(c => {
      const nombreUpper = (c.nombre || '').toUpperCase();
      return nombreUpper.includes('ASISTENCIA');
    });
    
    if (asistencia && (horasNormales || horasExtras || horasExtrasDobles)) {
      // Calcular suma de las tres horas
      const cantidadHorasNormales = Number(horasNormales?.cantidad || 0);
      const cantidadHorasExtras = Number(horasExtras?.cantidad || 0);
      const cantidadHorasExtrasDobles = Number(horasExtrasDobles?.cantidad || 0);
      const sumaAsistencia = cantidadHorasNormales + cantidadHorasExtras + cantidadHorasExtrasDobles;
      
      // Actualizar cantidad de asistencia
      return listaConceptos.map(c => {
        if (c.uid === asistencia.uid) {
          return { ...c, cantidad: sumaAsistencia, total: (c.montoUnitario || 0) * sumaAsistencia };
        }
        return c;
      });
    }
    
    return listaConceptos;
  };

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
      if (cloned.tipo === 'HORA_EXTRA_LYF') {
        return cloned; // dejar para recalcular más abajo
      }
      cloned.total = (cloned.montoUnitario || 0) * (cloned.cantidad || 1);
      return cloned;
    });

    // 2) Recalcular Horas Extras (si corresponde)
    const recalcularHorasExtras = (items) => {
      const isLuz = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA');
      if (!isLuz) return items;

      // Calcular total remunerativo (sin horas extras ni descuentos)
      const totalRemunerativo = items
        .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA' && c.tipo !== 'HORA_EXTRA_LYF' && c.tipo !== 'CATEGORIA_ZONA')
        .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0) + basicSalary;

      // Calcular valor hora
      const valorHora = totalRemunerativo / 156;

      return items.map(item => {
        if (item.tipo === 'HORA_EXTRA_LYF') {
          const unidades = Number(item.cantidad) || 1;
          const factor = Number(item.factor) || (item.id === 1 ? 1.5 : 2);
          
          // Para "Personal de turno": usar totalRemunerativo directamente, no valorHora
          let montoUnitario;
          if (isPersonalDeTurno(item.nombre)) {
            montoUnitario = totalRemunerativo * factor;
          } else {
            montoUnitario = valorHora * factor;
          }
          
          return { ...item, montoUnitario: Number(montoUnitario) || 0, total: (Number(montoUnitario) || 0) * unidades };
        }
        return item;
      });
    };

    nuevos = recalcularHorasExtras(nuevos);

    // 3) Recalcular descuentos basados en el nuevo total de remuneraciones (incluyendo horas extras)
    const basicoEmpleado = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') ? basicSalary : 0;
    const totalRemuneraciones = basicoEmpleado + nuevos
      .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA' && c.tipo !== 'CATEGORIA_ZONA')
      .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);

    // PASO 1: Calcular primero los descuentos que NO usan TOTAL_NETO
    let listaActual = nuevos.map(concept => {
      if (concept.tipo === 'DESCUENTO' || concept.tipo === 'DESCUENTO_LYF' || concept.tipo === 'DESCUENTO_UOCRA') {
        const baseCalculoDescuento = concept.baseCalculo ?? concept.base_calculo;
        const usaTotalBruto = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto';
        const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
        
        // Solo calcular los que NO usan TOTAL_NETO en este paso
        if (usaTotalBruto) {
          const cantidadActual = concept.uid === conceptUid ? cantidad : concept.cantidad;
          const cantidadComoPorcentaje = Number(cantidadActual) || 0;
          if (cantidadComoPorcentaje > 0 && totalRemuneraciones > 0) {
            const nuevoTotal = -(totalRemuneraciones * cantidadComoPorcentaje / 100);
            return { ...concept, montoUnitario: Math.abs(nuevoTotal), total: nuevoTotal };
          }
        } else if (!usaTotalNeto && concept.porcentaje && totalRemuneraciones > 0) {
          // Comportamiento tradicional
          const montoUnitario = (totalRemuneraciones * concept.porcentaje / 100);
          const cantidadActual = concept.uid === conceptUid ? cantidad : concept.cantidad;
          const nuevoTotal = -(montoUnitario * (Number(cantidadActual) || 1));
          return { ...concept, montoUnitario: Number(montoUnitario) || 0, total: nuevoTotal };
        }
        // Si usa TOTAL_NETO, dejarlo para el siguiente paso
      }
      return { ...concept, montoUnitario: Number(concept.montoUnitario) || 0, cantidad: Number(concept.cantidad) || 1, total: (Number(concept.montoUnitario) || 0) * (Number(concept.cantidad) || 1) };
    });
    
    // PASO 2: Calcular neto preliminar (remuneraciones - descuentos que no usan TOTAL_NETO)
    const descuentosNoTotalNeto = listaActual
      .filter(c => {
        if (c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA') return false;
        const baseCalculoDescuento = c.baseCalculo ?? c.base_calculo;
        const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
        return !usaTotalNeto;
      })
      .reduce((sum, c) => sum + Math.abs(c.total || 0), 0);
    const netoPreliminar = totalRemuneraciones - descuentosNoTotalNeto;
    
    // PASO 3: Calcular descuentos que usan TOTAL_NETO sobre el neto preliminar
    const nuevosConDescuentos = listaActual.map(concept => {
      if (concept.tipo === 'DESCUENTO' || concept.tipo === 'DESCUENTO_LYF' || concept.tipo === 'DESCUENTO_UOCRA') {
        const baseCalculoDescuento = concept.baseCalculo ?? concept.base_calculo;
        const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';
        
        if (usaTotalNeto) {
          const cantidadActual = concept.uid === conceptUid ? cantidad : concept.cantidad;
          const cantidadComoPorcentaje = Number(cantidadActual) || 0;
          if (cantidadComoPorcentaje > 0 && netoPreliminar > 0) {
            const nuevoTotal = -(netoPreliminar * cantidadComoPorcentaje / 100);
            return { ...concept, montoUnitario: Math.abs(nuevoTotal), total: nuevoTotal };
          }
        }
      }
      return concept;
    });

    // Calcular asistencia si es UOCRA
    const listaConAsistencia = calculateAsistencia(nuevosConDescuentos);
    
    setConceptos(listaConAsistencia);
    setTotal(calcTotal(listaConAsistencia));
  };

  // Obtener gremios únicos de los empleados
  const gremiosDisponibles = useMemo(() => {
    const gremiosSet = new Set();
    employees.forEach(emp => {
      const gremio = emp.gremioNombre || emp.gremio?.nombre || (typeof emp.gremio === 'string' ? emp.gremio : '');
      if (gremio) {
        const gremioUpper = gremio.toUpperCase();
        if (gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA')) {
          gremiosSet.add('LUZ_Y_FUERZA');
        } else if (gremioUpper === 'UOCRA') {
          gremiosSet.add('UOCRA');
        } else {
          gremiosSet.add('Convenio General');
        }
      }
    });
    return Array.from(gremiosSet).sort();
  }, [employees]);

  // Función para obtener el gremio normalizado de un empleado
  const getGremioFromEmployee = (emp) => {
    const gremio = emp.gremioNombre || emp.gremio?.nombre || (typeof emp.gremio === 'string' ? emp.gremio : '');
    if (!gremio) return '';
    
    const gremioUpper = gremio.toUpperCase();
    if (gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA')) {
      return 'LUZ_Y_FUERZA';
    } else if (gremioUpper === 'UOCRA') {
      return 'UOCRA';
    }
    return 'Convenio General';
  };

  // Función para obtener el estado de procesamiento de un empleado
  const getEstadoProcesamiento = (emp) => {
    const legajo = Number(emp.legajo);
    
    // Si tiene liquidación en el mes actual
    if (processedLegajos.has(legajo)) {
      const liquidacionInfo = liquidacionesEstado.get(legajo);
      if (liquidacionInfo) {
        // Si tiene fechaPago o estado es 'completada', es completada
        if (liquidacionInfo.estado === 'completada' || liquidacionInfo.fechaPago) {
          return 'Completada';
        }
        // Si no tiene fechaPago y estado es 'pendiente', es pendiente
        return 'Pendiente';
      }
      // Fallback: si está en el set pero no hay info, asumir completada
      return 'Completada';
    }
    
    // Si no tiene liquidación para el mes actual
    return 'No realizada';
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
  const updateConcept = (id, field, value) => {
    setConceptos(prev => prev.map(concept => {
      if (concept.id === id) {
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
  const removeConcept = (id) => {
    setConceptos(prev => prev.filter(concept => concept.id !== id));
  };

  // Iniciar edición del monto (soporta remuneraciones y descuentos)
  const startEditAmount = (concept) => {
    // Preferir montoUnitario, si no existe usar valor absoluto del total
    const initial = concept.montoUnitario ?? Math.abs(concept.total ?? 0);
    setEditingAmountId(concept.id);
    setEditingAmountValue(String(initial));
  };

  const cancelEditAmount = () => {
    setEditingAmountId(null);
    setEditingAmountValue('');
  };

  const saveEditAmount = (concept) => {
    const value = parseFloat(editingAmountValue) || 0;
    const nuevos = conceptos.map(c => {
      if (c.id === concept.id) {
        if (c.tipo === 'DESCUENTO') {
          const cantidad = c.cantidad || 1;
          return { ...c, montoUnitario: value, total: -(value * cantidad) };
        }
        const cantidad = c.cantidad || 1;
        return { ...c, montoUnitario: value, total: (value * cantidad) };
      }
      return c;
    });
    setConceptos(nuevos);
    setTotal(calcTotal(nuevos));
    cancelEditAmount();
  };

  // Confirmar eliminación
  const confirmDelete = (id) => {
    setDeletingId(id);
  };

  const acceptDelete = (id) => {
    removeConcept(id);
    if (deletingId === id) setDeletingId(null);
    const nuevos = conceptos.filter(c => c.id !== id);
    setTotal(calcTotal(nuevos));
  };

  const cancelDelete = () => setDeletingId(null);

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

  // Calcular aguinaldo (preview antes de liquidar)
  const calcularAguinaldo = async () => {
    if (!selectedEmployee) return;
    
    setIsProcessing(true);
    try {
      const calculo = await api.calcularAguinaldo(selectedEmployee.legajo, aguinaldoNumero, aguinaldoAnio);
      setAguinaldoCalculo(calculo);
      
      // Crear un solo concepto "Sueldo Anual Complementario (aguinaldo)" con el monto de aguinaldo
      const montoAguinaldo = calculo.aguinaldo || 0;
      
      // Concepto único de aguinaldo (remuneración) - solo el SAC
      const conceptoAguinaldo = {
        uid: uidCounter.current++,
        id: 'AGUINALDO',
        tipo: 'AGUINALDO',
        nombre: 'Sueldo Anual Complementario (aguinaldo)',
        montoUnitario: montoAguinaldo,
        cantidad: 1,
        total: montoAguinaldo,
      };
      
      // Solo el concepto de SAC, sin descuentos ni otros conceptos
      setConceptos([conceptoAguinaldo]);
      setTotal(montoAguinaldo);
      notify.success('Cálculo de aguinaldo realizado correctamente');
    } catch (error) {
      notify.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular vacaciones (preview antes de liquidar)
  const calcularVacaciones = async () => {
    if (!selectedEmployee) return;
    
    setIsProcessing(true);
    try {
      const calculo = await api.calcularVacaciones(selectedEmployee.legajo, parseInt(anioVacaciones, 10));
      setVacacionesCalculo(calculo);
      // Crear concepto de vacaciones con el monto calculado
      const montoVacaciones = calculo.baseCalculo || calculo.vacaciones || calculo.totalVacaciones || calculo.monto || 0;
      
      // Concepto único de vacaciones (remuneración)
      const conceptoVacaciones = {
        uid: uidCounter.current++,
        id: 'VACACIONES',
        tipo: 'VACACIONES',
        nombre: 'Bono de Vacaciones',
        montoUnitario: montoVacaciones,
        cantidad: 1,
        total: montoVacaciones,
      };
      
      // Solo el concepto de vacaciones, sin descuentos ni otros conceptos
      setConceptos([conceptoVacaciones]);
      setTotal(montoVacaciones);
      notify.success('Cálculo de vacaciones realizado correctamente');
    } catch (error) {
      notify.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // LIQUIDAR SUELDO Y GENERAR RECIBO
  const generatePayroll = async () => {
    if (!selectedEmployee) return;
    
    // Si es aguinaldo, usar la lógica de aguinaldo
    if (liquidacionType === 'aguinaldo') {
      if (!aguinaldoCalculo) {
        notify.error('Debe calcular el aguinaldo primero');
        return;
      }
      
      // Confirmar antes de liquidar aguinaldo
      const result = await confirmAction({
        title: 'Liquidar Aguinaldo',
        message: `¿Está seguro de liquidar el aguinaldo ${aguinaldoNumero} del año ${aguinaldoAnio} para ${selectedEmployee.nombre} ${selectedEmployee.apellido}?`,
        confirmText: 'Liquidar Aguinaldo',
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
      const legajoNum = Number(selectedEmployee.legajo);
      setProcessedLegajos(prev => new Set([...prev, legajoNum]));
      
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

    // Calcular totales para el recibo
    const { remunerations, deductions, netAmount } = calculateTotals();
    
    // Generar texto en palabras automáticamente si no está definido
    const amountWordsText = (amountInWords || (netAmount > 0 ? numberToWords(netAmount) + ' pesos' : '—')).toUpperCase();

     // Generar filas de conceptos (excluir CATEGORIA_ZONA, solo se usa como base de cálculo)
     const conceptosRows = conceptos
       .filter(concept => concept.tipo !== 'CATEGORIA_ZONA')
       .map(concept => {
       const remuneracion = (concept.tipo === 'CATEGORIA' ||
         concept.tipo === 'BONIFICACION_AREA' ||
         concept.tipo === 'CONCEPTO_LYF' ||
         concept.tipo === 'CONCEPTO_UOCRA' ||
         concept.tipo === 'TITULO_LYF' ||
         concept.tipo === 'CONCEPTO_MANUAL_LYF' ||
         concept.tipo === 'HORA_EXTRA_LYF' ||
         concept.tipo === 'AGUINALDO' ||
         concept.tipo === 'VACACIONES') && concept.total > 0
         ? formatCurrencyAR(concept.total)
         : '';
      
      const descuento = (concept.tipo === 'DESCUENTO' || 
        concept.tipo === 'DESCUENTO_LYF' || 
        concept.tipo === 'DESCUENTO_UOCRA') && concept.total < 0
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
        <span class="label">Número de Cuenta</span>
        <span class="value">${selectedEmployee?.cuenta || '—'}</span>
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

    // Calcular totales para el recibo
    const { remunerations, deductions, netAmount } = calculateTotals();
    
    // Generar texto en palabras automáticamente si no está definido
    const amountWordsText = (amountInWords || (netAmount > 0 ? numberToWords(netAmount) + ' pesos' : '—')).toUpperCase();

     // Generar filas de conceptos (excluir CATEGORIA_ZONA, solo se usa como base de cálculo)
     const conceptosRows = conceptos
       .filter(concept => concept.tipo !== 'CATEGORIA_ZONA')
       .map(concept => {
       const remuneracion = (concept.tipo === 'CATEGORIA' ||
         concept.tipo === 'BONIFICACION_AREA' ||
         concept.tipo === 'CONCEPTO_LYF' ||
         concept.tipo === 'CONCEPTO_UOCRA' ||
         concept.tipo === 'TITULO_LYF' ||
         concept.tipo === 'CONCEPTO_MANUAL_LYF' ||
         concept.tipo === 'HORA_EXTRA_LYF' ||
         concept.tipo === 'AGUINALDO' ||
         concept.tipo === 'VACACIONES') && concept.total > 0
         ? formatCurrencyAR(concept.total)
         : '';
      
      const descuento = (concept.tipo === 'DESCUENTO' || 
        concept.tipo === 'DESCUENTO_LYF' || 
        concept.tipo === 'DESCUENTO_UOCRA') && concept.total < 0
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
            <span class="label" style="font-weight: 600; color: #666; font-size: 10px; text-transform: uppercase;">Número de Cuenta</span>
            <span class="value" style="color: #333; font-size: 12px;">${selectedEmployee?.cuenta || '—'}</span>
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
                        {(() => {
                          const estado = getEstadoProcesamiento(employee);
                          if (estado === 'Completada') {
                            return (
                              <span className="salary-label status-processed">
                                <CheckCircle className="status-icon" />
                                Completada
                        </span>
                            );
                          } else if (estado === 'Pendiente') {
                            return (
                              <span className="salary-label status-pending">
                                <Clock className="status-icon" />
                                Pendiente
                              </span>
                            );
                          } else {
                            // No realizada
                            return (
                              <span className="salary-label status-not-done">
                                <Clock className="status-icon" />
                                No realizada
                              </span>
                            );
                          }
                        })()}
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
          {/* Selector de tipo de liquidación */}
          <div className="liquidation-type-selector">
            <label>
              Tipo de Liquidación
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="liquidacionType"
                  value="normal"
                  checked={liquidacionType === 'normal'}
                  onChange={(e) => {
                    setLiquidacionType(e.target.value);
                    setAguinaldoCalculo(null);
                    setVacacionesCalculo(null);
                    setConceptos([]);
                    setTotal(0);
                  }}
                />
                <span>Liquidación Normal</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="liquidacionType"
                  value="aguinaldo"
                  checked={liquidacionType === 'aguinaldo'}
                  onChange={(e) => {
                    setLiquidacionType(e.target.value);
                    setAguinaldoCalculo(null);
                    setVacacionesCalculo(null);
                    setConceptos([]);
                    setTotal(0);
                  }}
                />
                <span>Aguinaldo</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="liquidacionType"
                  value="vacaciones"
                  checked={liquidacionType === 'vacaciones'}
                  onChange={(e) => {
                    setLiquidacionType(e.target.value);
                    setAguinaldoCalculo(null);
                    setVacacionesCalculo(null);
                    setConceptos([]);
                    setTotal(0);
                  }}
                />
                <span>Vacaciones</span>
              </label>
            </div>
          </div>

          {/* Campos de aguinaldo */}
          {liquidacionType === 'aguinaldo' && (
            <div className="aguinaldo-section">
              <div className="aguinaldo-fields">
                <div className="field-group">
                  <label>
                    Aguinaldo Número
                  </label>
                  <select
                    value={aguinaldoNumero}
                    onChange={(e) => {
                      setAguinaldoNumero(Number(e.target.value));
                      setAguinaldoCalculo(null);
                      setConceptos([]);
                      setTotal(0);
                    }}
                  >
                    <option value={1}>Primer Aguinaldo</option>
                    <option value={2}>Segundo Aguinaldo</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>
                    Año
                  </label>
                  <input
                    type="number"
                    value={aguinaldoAnio}
                    onChange={(e) => {
                      setAguinaldoAnio(Number(e.target.value));
                      setAguinaldoCalculo(null);
                      setConceptos([]);
                      setTotal(0);
                    }}
                    min="2000"
                    max="2100"
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-full-width"
                onClick={calcularAguinaldo}
                disabled={isProcessing}
              >
                {isProcessing ? 'Calculando...' : 'Calcular Aguinaldo'}
              </button>
              {aguinaldoCalculo && (
                <div className="aguinaldo-result">
                  <div className="result-row">
                    <span className="result-label">Aguinaldo:</span>
                    <span className="result-value">{formatCurrencyAR(aguinaldoCalculo.aguinaldo || 0)}</span>
                  </div>
                  <div className="result-row result-divider">
                    <span className="result-label">Total Aguinaldo:</span>
                    <span className="result-value">{formatCurrencyAR(aguinaldoCalculo.totalAguinaldo || aguinaldoCalculo.aguinaldo || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Campos de vacaciones */}
          {liquidacionType === 'vacaciones' && (
            <div className="vacaciones-section">
              <div className="vacaciones-field">
                <label>
                  Año
                </label>
                <input
                  type="number"
                  value={anioVacaciones}
                  onChange={(e) => {
                    setAnioVacaciones(parseInt(e.target.value, 10) || new Date().getFullYear());
                    setVacacionesCalculo(null);
                    setConceptos([]);
                    setTotal(0);
                  }}
                  min="2000"
                  max="2100"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-full-width"
                onClick={calcularVacaciones}
                disabled={isProcessing}
              >
                {isProcessing ? 'Calculando...' : 'Calcular Vacaciones'}
              </button>
              {vacacionesCalculo && (
                <div className="vacaciones-result">
                  <div className="result-row">
                    <span className="result-label">Bono de Vacaciones:</span>
                    <span className="result-value">{formatCurrencyAR(vacacionesCalculo.baseCalculo || vacacionesCalculo.vacaciones || vacacionesCalculo.totalVacaciones || vacacionesCalculo.monto || 0)}</span>
                  </div>
                  {vacacionesCalculo.diasVacaciones && (
                    <div className="result-divider">
                      <span className="result-label">Días de Vacaciones:</span>
                      <span className="result-value">{vacacionesCalculo.diasVacaciones}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                  {/* Conceptos LYF */}
                  {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA') && catalogBonificaciones.map((c) => {
                    const id = c.idConceptoLyF ?? c.idBonificacion ?? c.id;
                    const label = `${c.nombre ?? c.descripcion}${c.porcentaje ? ` (${c.porcentaje}%)` : ''}`;
                    const exists = conceptos.some(ct => ct.id === id && (ct.tipo === 'CONCEPTO_LYF' || ct.tipo === 'CONCEPTO_UOCRA'));
                    if (exists) return null;
                    return <option key={`BON_${id}`} value={`BON_${id}`}>{label}</option>;
                  })}
                  
                  {/* Conceptos UOCRA */}
                  {selectedEmployee?.gremio?.nombre?.toUpperCase() === 'UOCRA' && catalogBonificaciones.map((c) => {
                    const id = c.idBonificacion ?? c.id;
                    const label = `${c.nombre ?? c.descripcion}${c.porcentaje ? ` (${c.porcentaje}%)` : ''}`;
                    const exists = conceptos.some(ct => ct.id === id && (ct.tipo === 'CONCEPTO_UOCRA' || ct.tipo === 'CONCEPTO_LYF'));
                    if (exists) return null;
                    return <option key={`BON_${id}`} value={`BON_${id}`}>{label}</option>;
                  })}

                  {/* Títulos LYF */}
                  {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && titulosLyFData.map((t) => {
                    const id = t.idTituloLyF ?? t.id;
                    const exists = conceptos.some(ct => ct.id === id && ct.tipo === 'CONCEPTO_LYF');
                    if (exists) return null;
                    return <option key={`TIT_${id}`} value={`TIT_${id}`}>{`${t.nombre ?? t.descripcion}${t.porcentaje ? ` (${t.porcentaje}%)` : ''}`}</option>;
                  })}

                  {/* Conceptos Manuales LYF */}
                  {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA') && conceptosManualesLyFData.map((cm) => {
                    const id = cm.idConceptosManualesLyF ?? cm.idConceptoManualLyF ?? cm.id;
                    const exists = conceptos.some(ct => ct.id === id && ct.tipo === 'CONCEPTO_MANUAL_LYF');
                    if (exists) return null;
                    const monto = Number(cm.monto ?? cm.valor ?? 0);
                    return <option key={`MAN_${id}`} value={`MAN_${id}`}>{`${cm.nombre ?? cm.descripcion} (Monto: ${formatCurrencyAR(monto)})`}</option>;
                  })}

                  {/* Descuentos generales */}
                  {descuentosData.map((d) => {
                    const id = d.idDescuento ?? d.id;
                    const exists = conceptos.some(ct => ct.id === id && ct.tipo === 'DESCUENTO');
                    if (exists) return null;
                    return <option key={`DESC_${id}`} value={`DESC_${id}`}>{`${d.nombre ?? d.descripcion} (Desc ${d.porcentaje}%)`}</option>;
                  })}

                  {/* Descuentos LYF */}
                  {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA') && descuentosLyFData.map((d) => {
                    const id = d.idDescuentoLyF ?? d.idDescuento ?? d.id;
                    const exists = conceptos.some(ct => ct.id === id && (ct.tipo === 'DESCUENTO' || ct.tipo === 'DESCUENTO_LYF'));
                    if (exists) return null;
                    return <option key={`DESC_LYF_${id}`} value={`DESC_LYF_${id}`}>{`${d.nombre ?? d.descripcion} (Desc ${d.porcentaje}%)`}</option>;
                  })}

                  {/* Descuentos UOCRA */}
                  {selectedEmployee?.gremio?.nombre?.toUpperCase() === 'UOCRA' && descuentosUocraData.map((d) => {
                    const id = d.idDescuentoUocra ?? d.idDescuento ?? d.id;
                    const exists = conceptos.some(ct => ct.id === id && (ct.tipo === 'DESCUENTO' || ct.tipo === 'DESCUENTO_UOCRA'));
                    if (exists) return null;
                    return <option key={`DESC_UOCRA_${id}`} value={`DESC_UOCRA_${id}`}>{`${d.nombre ?? d.descripcion} (Desc ${d.porcentaje}%)`}</option>;
                  })}

                  {/* Horas Extras LYF solo para Luz y Fuerza */}
                  {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA') && horasExtrasLyFData.map((he) => {
                    const id = he.idHoraExtra ?? he.id;
                    const exists = conceptos.some(ct => ct.id === id && ct.tipo === 'HORA_EXTRA_LYF');
                    if (exists) return null;
                    const factor = Number(he.factor) || (id === 1 ? 1.5 : 2);
                    return <option key={`HE_${id}`} value={`HE_${id}`}>{`${he.descripcion ?? he.codigo ?? (id === 1 ? 'Horas Extras Simples' : 'Horas Extras Dobles')} (Factor ${factor}x)`}</option>;
                  })}

                </select>

                <button
                  type="button"
                  className="btn btn-primary btn-sm add-btn"
                  onClick={() => {
                    if (!selectedCatalogConcept) return;
                    // Añadir concepto seleccionado del catálogo
                    const parts = selectedCatalogConcept.split('_');
                    const pref = parts[0];
                    const rawId = parts.length > 2 ? parts.slice(1).join('_') : parts[1]; // Manejar DESC_LYF_X o DESC_UOCRA_X
                    const idNum = Number(rawId);

                    // Evitar duplicados defensivamente
                    const isDuplicate = conceptos.some(c => {
                      if (pref === 'BON' || pref === 'TIT') {
                        return c.id === idNum && (c.tipo === 'CONCEPTO_LYF' || c.tipo === 'CONCEPTO_UOCRA');
                      } else if (pref === 'MAN') {
                        return c.id === idNum && c.tipo === 'CONCEPTO_MANUAL_LYF';
                      } else if (pref === 'DESC') {
                        // Verificar según el prefijo completo
                        if (selectedCatalogConcept.startsWith('DESC_LYF_')) {
                          return c.id === idNum && (c.tipo === 'DESCUENTO' || c.tipo === 'DESCUENTO_LYF');
                        } else if (selectedCatalogConcept.startsWith('DESC_UOCRA_')) {
                          return c.id === idNum && (c.tipo === 'DESCUENTO' || c.tipo === 'DESCUENTO_UOCRA');
                        } else {
                          return c.id === idNum && (c.tipo === 'DESCUENTO' || c.tipo === 'DESCUENTO_LYF' || c.tipo === 'DESCUENTO_UOCRA');
                        }
                      } else if (pref === 'HE') {
                        return c.id === idNum && c.tipo === 'HORA_EXTRA_LYF';
                      }
                      return false;
                    });
                    
                    if (isDuplicate) {
                      notify.error('El concepto ya está agregado');
                      setSelectedCatalogConcept('');
                      return;
                    }

                    if (pref === 'BON') {
                      const raw = catalogBonificaciones.find(b => (b.idConceptoLyF ?? b.idBonificacion ?? b.id) === idNum);
                      if (!raw) {
                        notify.error('Concepto no encontrado en el catálogo');
                        setSelectedCatalogConcept('');
                        return;
                      }

                      // Determinar base para el cálculo
                      const isLuz = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('LUZ') && selectedEmployee?.gremio?.nombre?.toUpperCase().includes('FUERZA');
                      const isUocra = selectedEmployee?.gremio?.nombre?.toUpperCase() === 'UOCRA';

                      // Verificar si el concepto usa TOTAL_BRUTO
                      const baseCalculoConcepto = raw?.baseCalculo ?? raw?.base_calculo;
                      const usaTotalBruto = baseCalculoConcepto === 'TOTAL_BRUTO' || baseCalculoConcepto === 'total_bruto';

                      // Si usa TOTAL_BRUTO, crear como concepto especial para calcular después
                      if (usaTotalBruto && isLuz) {
                        const nuevo = {
                          uid: uidCounter.current++,
                          id: idNum,
                          tipo: 'CONCEPTO_LYF',
                          nombre: raw.nombre ?? raw.descripcion ?? 'Concepto',
                          porcentaje: raw.porcentaje != null ? Number(raw.porcentaje) : null,
                          montoUnitario: 0, // Se calculará después
                          cantidad: 1,
                          total: 0, // Se calculará después
                          _esConceptoEspecial: true // Flag para identificar y recalcular después
                        };

                        const next = [...conceptos, nuevo];
                        // Recalcular conceptos especiales después de agregar
                        const isUocra = selectedEmployee?.gremio?.nombre?.toUpperCase() === 'UOCRA';
                        const listaConConceptosEspeciales = recalcularConceptosEspeciales(next, isUocra, basicSalary || remunerationAssigned || 0);
                        // Calcular asistencia si es UOCRA
                        const listaConAsistencia = calculateAsistencia(listaConConceptosEspeciales);
                        setConceptos(listaConAsistencia);
                        setTotal(calcTotal(listaConAsistencia));
                        setSelectedCatalogConcept('');
                        notify.success('Concepto agregado');
                        return;
                      }

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
                      // Calcular asistencia si es UOCRA
                      const listaConAsistencia = calculateAsistencia(next);
                      setConceptos(listaConAsistencia);
                      setTotal(calcTotal(listaConAsistencia));
                      setSelectedCatalogConcept('');
                      notify.success('Concepto agregado');
                      return;
                    }

                    if (pref === 'TIT') {
                      const raw = titulosLyFData.find(t => (t.idTituloLyF ?? t.id) === idNum);
                      if (!raw) {
                        notify.error('Título no encontrado en el catálogo');
                        setSelectedCatalogConcept('');
                        return;
                      }

                      // Verificar si el título usa TOTAL_BRUTO
                      const baseCalculoConcepto = raw?.baseCalculo ?? raw?.base_calculo;
                      const usaTotalBruto = baseCalculoConcepto === 'TOTAL_BRUTO' || baseCalculoConcepto === 'total_bruto';

                      // Si usa TOTAL_BRUTO, crear como concepto especial para calcular después
                      if (usaTotalBruto) {
                        const nuevo = {
                          uid: uidCounter.current++,
                          id: idNum,
                          tipo: 'TITULO_LYF',
                          nombre: raw.nombre ?? raw.descripcion ?? 'Título',
                          porcentaje: raw.porcentaje != null ? Number(raw.porcentaje) : null,
                          montoUnitario: 0, // Se calculará después
                          cantidad: 1,
                          total: 0, // Se calculará después
                          _esConceptoEspecial: true // Flag para identificar y recalcular después
                        };

                        const next = [...conceptos, nuevo];
                        // Recalcular conceptos especiales después de agregar
                        const isUocra = selectedEmployee?.gremio?.nombre?.toUpperCase() === 'UOCRA';
                        const listaConConceptosEspeciales = recalcularConceptosEspeciales(next, isUocra, basicSalary || remunerationAssigned || 0);
                        // Calcular asistencia si es UOCRA
                        const listaConAsistencia = calculateAsistencia(listaConConceptosEspeciales);
                        setConceptos(listaConAsistencia);
                        setTotal(calcTotal(listaConAsistencia));
                        setSelectedCatalogConcept('');
                        notify.success('Título agregado');
                        return;
                      }

                      // Determinar base para el cálculo (usar básico cat 11 para títulos LYF)
                      const base = basicoCat11State || basicSalary || remunerationAssigned || 0;

                      // Si el título tiene porcentaje, calcular; si tiene montoUnitario usarlo
                      let montoUnitario = 0;
                      if (raw.porcentaje) {
                        montoUnitario = (Number(base || 0) * Number(raw.porcentaje || 0)) / 100;
                      } else if (raw.montoUnitario || raw.monto) {
                        montoUnitario = Number(raw.montoUnitario ?? raw.monto ?? 0);
                      }

                      const nuevo = {
                        uid: uidCounter.current++,
                        id: idNum,
                        tipo: 'TITULO_LYF',
                        nombre: raw.nombre ?? raw.descripcion ?? 'Título',
                        porcentaje: raw.porcentaje != null ? Number(raw.porcentaje) : null,
                        montoUnitario: Number(montoUnitario) || 0,
                        cantidad: 1,
                        total: (Number(montoUnitario) || 0) * 1
                      };

                      const next = [...conceptos, nuevo];
                      // Calcular asistencia si es UOCRA
                      const listaConAsistencia = calculateAsistencia(next);
                      setConceptos(listaConAsistencia);
                      setTotal(calcTotal(listaConAsistencia));
                      setSelectedCatalogConcept('');
                      notify.success('Título agregado');
                      return;
                    }

                    if (pref === 'MAN') {
                      const raw = conceptosManualesLyFData.find(cm => (cm.idConceptosManualesLyF ?? cm.idConceptoManualLyF ?? cm.id) === idNum);
                      if (!raw) {
                        notify.error('Concepto manual no encontrado en el catálogo');
                        setSelectedCatalogConcept('');
                        return;
                      }

                      // Conceptos manuales LYF: usar monto fijo del concepto
                      const montoFijo = Number(raw.monto ?? raw.valor ?? 0);

                      const nuevo = {
                        uid: uidCounter.current++,
                        id: idNum,
                        tipo: 'CONCEPTO_MANUAL_LYF',
                        nombre: raw.nombre ?? raw.descripcion ?? 'Concepto Manual',
                        porcentaje: null, // No tiene porcentaje, mostrar "-"
                        montoUnitario: montoFijo,
                        cantidad: 1, // Siempre cantidad 1
                        total: montoFijo * 1 // Monto del backend * cantidad (1)
                      };

                      const next = [...conceptos, nuevo];
                      // Calcular asistencia si es UOCRA
                      const listaConAsistencia = calculateAsistencia(next);
                      setConceptos(listaConAsistencia);
                      setTotal(calcTotal(listaConAsistencia));
                      setSelectedCatalogConcept('');
                      notify.success('Concepto manual agregado');
                      return;
                    }

                    if (pref === 'DESC') {
                      // Determinar qué catálogo de descuentos usar según el prefijo completo
                      let raw = null;
                      
                      if (selectedCatalogConcept.startsWith('DESC_LYF_')) {
                        raw = descuentosLyFData.find(d => (d.idDescuentoLyF ?? d.idDescuento ?? d.id) === idNum);
                      } else if (selectedCatalogConcept.startsWith('DESC_UOCRA_')) {
                        raw = descuentosUocraData.find(d => (d.idDescuentoUocra ?? d.idDescuento ?? d.id) === idNum);
                      } else {
                        raw = descuentosData.find(d => (d.idDescuento ?? d.id) === idNum);
                      }
                      
                      if (!raw) {
                        notify.error('Descuento no encontrado en el catálogo');
                        setSelectedCatalogConcept('');
                        return;
                      }

                      // Verificar si el descuento tiene baseCalculo
                      const baseCalculoDescuento = raw?.baseCalculo ?? raw?.base_calculo;
                      const usaTotalBruto = baseCalculoDescuento === 'TOTAL_BRUTO' || baseCalculoDescuento === 'total_bruto';
                      const usaTotalNeto = baseCalculoDescuento === 'TOTAL_NETO' || baseCalculoDescuento === 'total_neto';

                      // Determinar el tipo de descuento según el prefijo
                      let tipoDescuento = 'DESCUENTO';
                      if (selectedCatalogConcept.startsWith('DESC_LYF_')) {
                        tipoDescuento = 'DESCUENTO_LYF';
                      } else if (selectedCatalogConcept.startsWith('DESC_UOCRA_')) {
                        tipoDescuento = 'DESCUENTO_UOCRA';
                      }

                      let montoUnitario = 0;
                      let cantidad = 1;

                      if (usaTotalBruto || usaTotalNeto) {
                        // Si usa baseCalculo, la cantidad se usará como porcentaje
                        // Por defecto, cantidad = 1 (se puede editar después)
                        cantidad = 1;
                        montoUnitario = 0; // Se calculará después en recalcularDescuentos
                      } else {
                        // Comportamiento tradicional: calcular sobre remuneraciones actuales
                        const remuneracionesActuales = basicSalary + conceptos
                          .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA' && c.tipo !== 'CATEGORIA_ZONA')
                          .reduce((s, c) => s + (c.total || 0), 0);
                        montoUnitario = (remuneracionesActuales * (Number(raw.porcentaje || 0))) / 100;
                      }

                      const nuevo = {
                        uid: uidCounter.current++,
                        id: idNum,
                        tipo: tipoDescuento,
                        nombre: raw.nombre ?? raw.descripcion ?? 'Descuento',
                        porcentaje: usaTotalBruto || usaTotalNeto ? null : Number(raw.porcentaje || 0),
                        montoUnitario: Number(montoUnitario) || 0,
                        cantidad: cantidad,
                        total: -(Number(montoUnitario) || 0) * cantidad,
                        baseCalculo: baseCalculoDescuento || null
                      };

                      const next = [...conceptos, nuevo];
                      // Si usa baseCalculo, recalcular descuentos para obtener el monto correcto
                      if (usaTotalBruto || usaTotalNeto) {
                        const isUocra = selectedEmployee?.gremio?.nombre?.toUpperCase() === 'UOCRA';
                        const basicoValue = isUocra ? basicSalary : 0;
                        // Recalcular descuentos con la nueva lista
                        const recalcularDescuentos = (items) => {
                          let totalRemuneraciones = 0;
                          if (isUocra) {
                            totalRemuneraciones = basicoValue + 
                              items
                                .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA' && c.tipo !== 'CATEGORIA_ZONA')
                                .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);
                          } else {
                            totalRemuneraciones = items
                              .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA')
                              .reduce((sum, c) => sum + (c.total || ((c.montoUnitario || 0) * (c.cantidad || 1))), 0);
                          }
                          
                          let listaActual = items.map(item => ({ ...item })); // Clonar
                          
                          // PASO 1: Calcular primero los descuentos que NO usan TOTAL_NETO
                          listaActual = listaActual.map(item => {
                            if (item.tipo === 'DESCUENTO' || item.tipo === 'DESCUENTO_LYF' || item.tipo === 'DESCUENTO_UOCRA') {
                              const baseCalculoItem = item.baseCalculo ?? item.base_calculo;
                              const usaTotalBrutoItem = baseCalculoItem === 'TOTAL_BRUTO' || baseCalculoItem === 'total_bruto';
                              const usaTotalNetoItem = baseCalculoItem === 'TOTAL_NETO' || baseCalculoItem === 'total_neto';
                              
                              // Solo calcular los que NO usan TOTAL_NETO en este paso
                              if (usaTotalBrutoItem) {
                                const cantidadComoPorcentaje = Number(item.cantidad) || 0;
                                if (cantidadComoPorcentaje > 0 && totalRemuneraciones > 0) {
                                  const nuevoTotal = -(totalRemuneraciones * cantidadComoPorcentaje / 100);
                                  return {
                                    ...item,
                                    montoUnitario: Math.abs(nuevoTotal),
                                    total: nuevoTotal
                                  };
                                }
                              } else if (!usaTotalNetoItem && item.porcentaje && totalRemuneraciones > 0) {
                                const montoUnitario = (totalRemuneraciones * item.porcentaje / 100);
                                const nuevoTotal = -(montoUnitario * (Number(item.cantidad) || 1));
                                return {
                                  ...item,
                                  montoUnitario: Number(montoUnitario) || 0,
                                  total: nuevoTotal
                                };
                              }
                              // Si usa TOTAL_NETO, dejarlo para el siguiente paso
                            }
                            return item;
                          });
                          
                          // PASO 2: Calcular neto preliminar (remuneraciones - descuentos que no usan TOTAL_NETO)
                          const descuentosNoTotalNeto = listaActual
                            .filter(c => {
                              if (c.tipo !== 'DESCUENTO' && c.tipo !== 'DESCUENTO_LYF' && c.tipo !== 'DESCUENTO_UOCRA') return false;
                              const baseCalculoItem = c.baseCalculo ?? c.base_calculo;
                              const usaTotalNetoItem = baseCalculoItem === 'TOTAL_NETO' || baseCalculoItem === 'total_neto';
                              return !usaTotalNetoItem;
                            })
                            .reduce((sum, c) => sum + Math.abs(c.total || 0), 0);
                          const netoPreliminar = totalRemuneraciones - descuentosNoTotalNeto;
                          
                          // PASO 3: Calcular descuentos que usan TOTAL_NETO sobre el neto preliminar
                          listaActual = listaActual.map(item => {
                            if (item.tipo === 'DESCUENTO' || item.tipo === 'DESCUENTO_LYF' || item.tipo === 'DESCUENTO_UOCRA') {
                              const baseCalculoItem = item.baseCalculo ?? item.base_calculo;
                              const usaTotalNetoItem = baseCalculoItem === 'TOTAL_NETO' || baseCalculoItem === 'total_neto';
                              
                              if (usaTotalNetoItem) {
                                const cantidadComoPorcentaje = Number(item.cantidad) || 0;
                                if (cantidadComoPorcentaje > 0 && netoPreliminar > 0) {
                                  const nuevoTotal = -(netoPreliminar * cantidadComoPorcentaje / 100);
                                  return {
                                    ...item,
                                    montoUnitario: Math.abs(nuevoTotal),
                                    total: nuevoTotal
                                  };
                                }
                              }
                            }
                            return item;
                          });
                          
                          return listaActual;
                        };
                        const listaConDescuentos = recalcularDescuentos(next);
                        // Calcular asistencia si es UOCRA
                        const listaConAsistencia = calculateAsistencia(listaConDescuentos);
                        setConceptos(listaConAsistencia);
                        setTotal(calcTotal(listaConAsistencia));
                      } else {
                        // Calcular asistencia si es UOCRA
                        const listaConAsistencia = calculateAsistencia(next);
                        setConceptos(listaConAsistencia);
                        setTotal(calcTotal(listaConAsistencia));
                      }
                      setSelectedCatalogConcept('');
                      notify.success('Descuento agregado');
                      return;
                    }

                    if (pref === 'HE') {
                      const raw = horasExtrasLyFData.find(he => (he.idHoraExtra ?? he.id) === idNum);
                      if (!raw) {
                        notify.error('Hora extra no encontrada en el catálogo');
                        setSelectedCatalogConcept('');
                        return;
                      }

                      // Calcular total remunerativo actual (sin horas extras ni descuentos)
                      const totalRemunerativo = basicSalary + conceptos
                        .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'HORA_EXTRA_LYF' && c.tipo !== 'CATEGORIA_ZONA')
                        .reduce((s, c) => s + (c.total || 0), 0);

                      // Calcular valor hora
                      const valorHora = totalRemunerativo / 156;

                      // Calcular monto unitario usando el factor (1 = simples 1.5x, 2 = dobles 2x)
                      const factor = Number(raw.factor) || (idNum === 1 ? 1.5 : 2);
                      const nombreConcepto = raw.descripcion ?? raw.codigo ?? (idNum === 1 ? 'Horas Extras Simples' : 'Horas Extras Dobles');
                      
                      // Para "Personal de turno": usar totalRemunerativo directamente, no valorHora
                      let montoUnitario;
                      if (isPersonalDeTurno(nombreConcepto)) {
                        montoUnitario = totalRemunerativo * factor;
                      } else {
                        montoUnitario = valorHora * factor;
                      }

                      const nuevo = {
                        uid: uidCounter.current++,
                        id: idNum,
                        tipo: 'HORA_EXTRA_LYF',
                        nombre: nombreConcepto,
                        montoUnitario: Number(montoUnitario) || 0,
                        factor: Number(factor),
                        cantidad: 1,
                        total: (Number(montoUnitario) || 0) * 1
                      };

                      const next = [...conceptos, nuevo];
                      // Calcular asistencia si es UOCRA
                      const listaConAsistencia = calculateAsistencia(next);
                      setConceptos(listaConAsistencia);
                      setTotal(calcTotal(listaConAsistencia));
                      setSelectedCatalogConcept('');
                      notify.success('Hora extra agregada');
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

              {conceptos
                .filter(concept => concept.tipo !== 'CATEGORIA_ZONA')
                .map(concept => (
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
                        {editingAmountId === concept.id ? (
                          <div className="amount-edit-controls">
                            <input
                              type="number"
                              value={editingAmountValue}
                              onChange={(e) => setEditingAmountValue(e.target.value)}
                              className="concept-input small"
                              step="0.01"
                              min="0"
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
                            <span className="amount positive">{formatCurrencyAR(concept.montoUnitario || 0)}</span>
                            <Edit className="edit-icon" onClick={() => startEditAmount(concept)} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="concept-cell">
                    {concept.tipo === 'DESCUENTO' && (
                      <div className="amount-editable-wrapper">
                        {editingAmountId === concept.id ? (
                          <div className="amount-edit-controls">
                            <input
                              type="number"
                              value={editingAmountValue}
                              onChange={(e) => setEditingAmountValue(e.target.value)}
                              className="concept-input small"
                              step="0.01"
                              min="0"
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
                          onChange={(e) => updateConcept(concept.id, 'type', e.target.value)}
                          className="type-select"
                        >
                          <option value="remuneration">Remuneración</option>
                          <option value="deduction">Descuento</option>
                        </select>
                      )}

                      {deletingId === concept.id ? (
                        <>
                          <button className="btn-accept" onClick={() => acceptDelete(concept.id)} title="Confirmar borrado">
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button className="btn-cancel" onClick={cancelDelete} title="Cancelar">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button className="remove-btn" onClick={() => confirmDelete(concept.id)} title="Eliminar concepto">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                        <button className="remove-btn" onClick={() => confirmDelete(concept.uid)} title="Eliminar concepto">
                          <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Fila para añadir nuevo concepto */}
              <div className="concept-row add-row">
                <div className="concept-cell">—</div>
                <div className="concept-cell">&nbsp;</div>
                <div className="concept-cell">&nbsp;</div>
                <div className="concept-cell">&nbsp;</div>
                <div className="concept-cell">&nbsp;</div>
                <div className="concept-cell">
                  <div className="concept-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleAddConcepto} title="Agregar concepto">
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
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
                {sortConceptos(
                  conceptos.filter(concept => concept.tipo !== 'CATEGORIA_ZONA')
                ).map(concept => (
                  <tr key={concept.id}>
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
                  <td colSpan="3">
                    TOTALES:
                  </td>
                  <td className="receipt-total-remuneration">
                    {formatCurrencyAR(remunerations)}
                  </td>
                  <td className="receipt-total-deduction">
                    {formatCurrencyAR(deductions)}
                  </td>
                </tr>
                <tr className="receipt-net-row">
                  <td colSpan="4">
                    TOTAL NETO A COBRAR:
                  </td>
                  <td className="receipt-net-amount">
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
                value={amountInWords || (netAmount > 0 ? numberToWords(netAmount) + ' pesos' : '')}
                onChange={(e) => {
                  // Solo permite letras, espacios y caracteres especiales comunes en español
                  const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                  // Convertir a mayúsculas
                  setAmountInWords(value.toUpperCase());
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