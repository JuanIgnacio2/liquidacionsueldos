import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, DollarSign, Search, ArrowLeft, Eye } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/empleadosAPI';
import { useNotification } from '../Hooks/useNotification';
import PayrollDetailModal from '../Components/PayrollDetailModal/PayrollDetailModal';
import '../styles/components/_PlaceHolder.scss';
import '../styles/components/_liquidacion.scss';
import '../styles/components/_historialPagos.scss';

// Función helper para formatear moneda en formato argentino ($100.000,00)
const formatCurrencyAR = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0,00';
  const numValue = Number(value);
  const absValue = Math.abs(numValue);
  const parts = absValue.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${integerPart},${parts[1]}`;
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

// Normaliza strings para comparar sin importar mayúsculas, tildes, espacios, etc.
const normalize = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Convierte periodo 'YYYY-MM' o 'YYYY-MM-DD' a 'Mes de AAAA' en español
const formatPeriodToMonthYear = (period) => {
  if (!period) return '—';
  // Si ya contiene letras, devolver tal cual
  if (/[A-Za-zÀ-ÿ]/.test(period)) return period;
  // Aceptar formatos: 'YYYY-MM' o 'YYYY-MM-DD'
  const parts = String(period).split('-');
  if (parts.length >= 2) {
    const year = parts[0];
    const month = Number(parts[1]);
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const mName = months[Math.max(0, Math.min(11, month - 1))] || parts[1];
    return `${mName.charAt(0).toUpperCase() + mName.slice(1)} de ${year}`;
  }
  return period;
};

export default function HistorialPagos() {
  const notify = useNotification();
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState('');
  const [filterGremio, setFilterGremio] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadPagos();
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error al cargar empleados:', error);
      setEmployees([]);
    }
  };

  const loadPagos = async () => {
    try {
      setLoading(true);
      const data = await api.getPagos();
      setPagos(data || []);
    } catch (error) {
      setPagos([]);
    } finally {
      setLoading(false);
    }
  };

  // Normalizar el query de búsqueda (sin acentos, minúsculas)
  const normalizedQuery = normalize(query.trim());

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

  // Función para obtener el gremio de un pago basado en el empleado
  const getGremioFromPago = (pago) => {
    const legajo = pago.legajoEmpleado;
    const employee = employees.find(emp => emp.legajo === legajo || emp.legajo === Number(legajo));
    if (!employee) return '';
    
    const gremio = employee.gremioNombre || employee.gremio?.nombre || (typeof employee.gremio === 'string' ? employee.gremio : '');
    if (!gremio) return '';
    
    const gremioUpper = gremio.toUpperCase();
    if (gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA')) {
      return 'LUZ_Y_FUERZA';
    } else if (gremioUpper === 'UOCRA') {
      return 'UOCRA';
    }
    return 'Convenio General';
  };

  const filteredPagos = useMemo(() => {
    let filtered = pagos;

    // Filtrar por búsqueda de texto (normalizado, sin acentos)
    if (normalizedQuery) {
      filtered = filtered.filter((pago) => {
        return [
          pago.nombreEmpleado,
          pago.apellidoEmpleado,
          pago.legajoEmpleado,
          pago.cuil,
          pago.periodoPago
        ]
          .filter(Boolean)
          .some((field) => normalize(String(field)).includes(normalizedQuery));
      });
    }

    // Filtrar por gremio
    if (filterGremio) {
      filtered = filtered.filter((pago) => {
        const pagoGremio = getGremioFromPago(pago);
        return pagoGremio === filterGremio;
      });
    }

    // Filtrar por estado
    if (filterEstado) {
      filtered = filtered.filter((pago) => {
        const estado = pago.estado || 'Completada';
        const estadoNormalizado = estado.toLowerCase();
        if (filterEstado === 'Completada') {
          return estadoNormalizado === 'completada' || estadoNormalizado === 'completa';
        } else if (filterEstado === 'Pendiente') {
          return estadoNormalizado === 'pendiente' || estadoNormalizado === 'pendiente';
        }
        return true;
      });
    }

    // Ordenar por fecha más reciente (fechaPago, periodoPago o id descendente)
    filtered = filtered.sort((a, b) => {
      // Intentar usar fechaPago primero
      let fechaA = a.fechaPago ? new Date(a.fechaPago).getTime() : null;
      let fechaB = b.fechaPago ? new Date(b.fechaPago).getTime() : null;
      
      // Si no hay fechaPago, intentar usar periodoPago (formato YYYY-MM)
      if (!fechaA && a.periodoPago) {
        const periodoA = String(a.periodoPago).split('-');
        if (periodoA.length >= 2) {
          fechaA = new Date(parseInt(periodoA[0]), parseInt(periodoA[1]) - 1).getTime();
        }
      }
      if (!fechaB && b.periodoPago) {
        const periodoB = String(b.periodoPago).split('-');
        if (periodoB.length >= 2) {
          fechaB = new Date(parseInt(periodoB[0]), parseInt(periodoB[1]) - 1).getTime();
        }
      }
      
      // Si aún no hay fecha, usar id como fallback
      if (!fechaA) fechaA = a.id || 0;
      if (!fechaB) fechaB = b.id || 0;
      
      return fechaB - fechaA; // Más reciente primero
    });

    return filtered;
  }, [pagos, normalizedQuery, filterGremio, filterEstado, employees]);

  const totals = useMemo(() => {
    const totalPagos = pagos.length;
    const totalNeto = pagos.reduce((accumulator, pago) => accumulator + (Number(pago.total_neto) || 0), 0);
    return { totalPagos, totalNeto };
  }, [pagos]);

  const filteredTotals = useMemo(() => {
    const totalPagos = filteredPagos.length;
    const totalNeto = filteredPagos.reduce((accumulator, pago) => accumulator + (Number(pago.total_neto) || 0), 0);
    return { totalPagos, totalNeto };
  }, [filteredPagos]);

  const formatCurrency = (value) =>
    typeof value === 'number'
      ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : value;

  const handleViewDetails = async (liquidacion) => {
    setSelectedPayroll(liquidacion);
    setShowDetailModal(true);
    setLoadingDetails(true);
    setPayrollDetails(null);
    
    // Buscar el empleado correspondiente por legajo
    const legajo = liquidacion.legajoEmpleado;
    const employee = employees.find(emp => emp.legajo === legajo || emp.legajo === Number(legajo));
    setSelectedEmployee(employee || null);
  
    try {
      // Cargar detalles de la liquidación desde la API
      const detalle = await api.getDetallePago(liquidacion.id || liquidacion.idPago);
      setPayrollDetails(detalle);
    } catch (error) {
      notify.error('Error al cargar detalles de la liquidación');
      notify('No se pudieron cargar los detalles de la liquidación.');
    } finally {
      setLoadingDetails(false);
    }
   };

  // Generar HTML del recibo para imprimir/descargar
  const generateReceiptHTML = (payroll, details) => {
    if (!payroll || !details) return '';

    // Calcular totales
    const remunerations = details.conceptos
      ?.filter(c => 
        c.tipoConcepto === 'CATEGORIA' || 
        c.tipoConcepto === 'CONCEPTO_LYF' || 
        c.tipoConcepto === 'CONCEPTO_UOCRA' ||
        c.tipoConcepto === 'BONIFICACION_AREA' ||
        c.tipoConcepto === 'CATEGORIA_ZONA'
      )
      .reduce((sum, c) => sum + (Number(c.total) || 0), 0) || 0;

    const deductions = details.conceptos
      ?.filter(c => c.tipoConcepto === 'DESCUENTO')
      .reduce((sum, c) => sum + Math.abs(Number(c.total) || 0), 0) || 0;

    const netAmount = remunerations - deductions;

    // Datos del empleado
    const employeeName = `${payroll.apellidoEmpleado || ''}, ${payroll.nombreEmpleado || ''}`.trim() || '—';
    const employeeLegajo = payroll.legajoEmpleado || details.legajo || '—';
    const employeeCuil = details.cuil || payroll.cuil || '—';
    const employeeCategory = details.categoriaEmpleado || payroll.categoria || '—';
    const employeeIngreso = details.fechaIngreso || payroll.fechaIngreso || null;
    const periodo = formatPeriodToMonthYear(payroll.periodoPago || details.periodoPago);
    const remunerationAssigned = details.remuneracionAsignada || payroll.remuneracionAsignada || 0;
    const bank = details.banco || payroll.banco || 'Banco Nación';
    const cuenta = details.cuenta || payroll.cuenta || '—';

    // Generar filas de conceptos
    const conceptosRows = (details.conceptos || []).map((concepto, index) => {
      const isRemuneration = 
        concepto.tipoConcepto === 'CATEGORIA' || 
        concepto.tipoConcepto === 'CONCEPTO_LYF' || 
        concepto.tipoConcepto === 'CONCEPTO_UOCRA' ||
        concepto.tipoConcepto === 'BONIFICACION_AREA' ||
        concepto.tipoConcepto === 'CATEGORIA_ZONA';
      const isDeduction = concepto.tipoConcepto === 'DESCUENTO';
      const total = Number(concepto.total || 0);

      const remuneracion = isRemuneration && total > 0 ? formatCurrencyAR(total) : '';
      const descuento = isDeduction && total < 0 ? formatCurrencyAR(Math.abs(total)) : '';

      return `
        <tr>
          <td class="concept-code">${concepto.idReferencia || concepto.id || index + 1}</td>
          <td class="concept-name">${concepto.nombre || `Concepto ${index + 1}`}</td>
          <td class="concept-units">${concepto.unidades || concepto.cantidad || 0}</td>
          <td class="concept-remuneration">${remuneracion}</td>
          <td class="concept-deduction">${descuento}</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Sueldo - ${employeeName}</title>
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
      border: 1px solid #e5e7eb;
    }
    
    .receipt-net-row td {
      text-align: right;
      font-weight: bold;
      padding: 15px 10px;
      border-top: 2px solid #22c55e;
      border: 1px solid #e5e7eb;
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
    
    .amount-words-display {
      font-size: 12px;
      padding: 8px;
      border: 1px solid #e5e7eb;
      background: white;
      min-height: 30px;
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
        <span class="value">${employeeName}</span>
      </div>
      <div class="info-row">
        <span class="label">Legajo</span>
        <span class="value">${employeeLegajo}</span>
      </div>
      <div class="info-row">
        <span class="label">C.U.I.L.</span>
        <span class="value">${employeeCuil}</span>
      </div>
      <div class="info-row">
        <span class="label">Fecha Ingreso</span>
        <span class="value">${formatDateDDMMYYYY(employeeIngreso)}</span>
      </div>
      <div class="info-row">
        <span class="label">Categoría</span>
        <span class="value">${employeeCategory}</span>
      </div>
      <div class="info-row">
        <span class="label">Período</span>
        <span class="value">${periodo}</span>
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
        <span class="value">${bank}</span>
      </div>
      <div class="detail-item">
        <span class="label">Número de Cuenta</span>
        <span class="value">${cuenta}</span>
      </div>
    </div>
    
    <div class="amount-words-section">
      <label class="amount-words-label">SON PESOS:</label>
      <div class="amount-words-display">
        ${netAmount.toLocaleString('es-AR')} * * * *
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
  };

  // Generar HTML del recibo sin el DOCTYPE (solo contenido)
  const generateReceiptContentHTML = (payroll, details) => {
    if (!payroll || !details) return '';

    // Calcular totales
    const remunerations = details.conceptos
      ?.filter(c => 
        c.tipoConcepto === 'CATEGORIA' || 
        c.tipoConcepto === 'CONCEPTO_LYF' || 
        c.tipoConcepto === 'CONCEPTO_UOCRA' ||
        c.tipoConcepto === 'BONIFICACION_AREA' ||
        c.tipoConcepto === 'CATEGORIA_ZONA'
      )
      .reduce((sum, c) => sum + (Number(c.total) || 0), 0) || 0;

    const deductions = details.conceptos
      ?.filter(c => c.tipoConcepto === 'DESCUENTO')
      .reduce((sum, c) => sum + Math.abs(Number(c.total) || 0), 0) || 0;

    const netAmount = remunerations - deductions;

    // Datos del empleado
    const employeeName = `${payroll.apellidoEmpleado || ''}, ${payroll.nombreEmpleado || ''}`.trim() || '—';
    const employeeLegajo = payroll.legajoEmpleado || details.legajo || '—';
    const employeeCuil = details.cuil || payroll.cuil || '—';
    const employeeCategory = details.categoriaEmpleado || payroll.categoria || '—';
    const employeeIngreso = details.fechaIngreso || payroll.fechaIngreso || null;
    const periodo = formatPeriodToMonthYear(payroll.periodoPago || details.periodoPago);
    const remunerationAssigned = details.remuneracionAsignada || payroll.remuneracionAsignada || 0;
    const bank = details.banco || payroll.banco || 'Banco Nación';
    const cuenta = details.cuenta || payroll.cuenta || '—';

    // Generar filas de conceptos
    const conceptosRows = (details.conceptos || []).map((concepto, index) => {
      const isRemuneration = 
        concepto.tipoConcepto === 'CATEGORIA' || 
        concepto.tipoConcepto === 'CONCEPTO_LYF' || 
        concepto.tipoConcepto === 'CONCEPTO_UOCRA' ||
        concepto.tipoConcepto === 'BONIFICACION_AREA' ||
        concepto.tipoConcepto === 'CATEGORIA_ZONA';
      const isDeduction = concepto.tipoConcepto === 'DESCUENTO';
      const total = Number(concepto.total || 0);

      const remuneracion = isRemuneration && total > 0 ? formatCurrencyAR(total) : '';
      const descuento = isDeduction && total < 0 ? formatCurrencyAR(Math.abs(total)) : '';

      return `
        <tr>
          <td class="concept-code">${concepto.idReferencia || concepto.id || index + 1}</td>
          <td class="concept-name">${concepto.nombre || `Concepto ${index + 1}`}</td>
          <td class="concept-units">${concepto.unidades || concepto.cantidad || 0}</td>
          <td class="concept-remuneration">${remuneracion}</td>
          <td class="concept-deduction">${descuento}</td>
        </tr>
      `;
    }).join('');

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
            <span class="value" style="font-size: 12px;">${employeeName}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Legajo</span>
            <span class="value" style="font-size: 12px;">${employeeLegajo}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">C.U.I.L.</span>
            <span class="value" style="font-size: 12px;">${employeeCuil}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Fecha Ingreso</span>
            <span class="value" style="font-size: 12px;">${formatDateDDMMYYYY(employeeIngreso)}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Categoría</span>
            <span class="value" style="font-size: 12px;">${employeeCategory}</span>
          </div>
          <div class="info-row" style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
            <span class="label" style="font-weight: bold; font-size: 11px;">Período</span>
            <span class="value" style="font-size: 12px;">${periodo}</span>
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
            <span class="value" style="color: #333; font-size: 12px;">${bank}</span>
          </div>
          <div class="detail-item" style="display: flex; flex-direction: column; gap: 5px;">
            <span class="label" style="font-weight: 600; color: #666; font-size: 10px; text-transform: uppercase;">Número de Cuenta</span>
            <span class="value" style="color: #333; font-size: 12px;">${cuenta}</span>
          </div>
        </div>
        
        <div class="amount-words-section" style="margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <label class="amount-words-label" style="font-weight: bold; font-size: 11px; display: block; margin-bottom: 5px;">SON PESOS:</label>
          <div style="font-size: 12px; padding: 8px; border: 1px solid #e5e7eb; background: white; min-height: 30px;">${netAmount.toLocaleString('es-AR')} * * * *</div>
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

  const handlePrintPayroll = async (payroll) => {
    if (!payrollDetails) {
      notify.error('No hay detalles de liquidación disponibles para imprimir');
      return;
    }

    try {
      // Crear una ventana nueva con el HTML del recibo
      const printWindow = window.open('', '_blank');
      const htmlContent = generateReceiptHTML(payroll, payrollDetails);
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Esperar a que se cargue el contenido y luego imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } catch (error) {
      notify.error('Error al generar la impresión. Por favor, intente nuevamente.');
    }
  };

  const handleDownloadPayroll = async (payroll) => {
    if (!payrollDetails) {
      notify.error('No hay detalles de liquidación disponibles para descargar');
      return;
    }

    try {
      // Crear un elemento temporal para el contenido HTML
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.background = 'white';
      tempDiv.innerHTML = generateReceiptContentHTML(payroll, payrollDetails);
      document.body.appendChild(tempDiv);

      // Configuración para el PDF
      const periodoDisplay = formatPeriodToMonthYear(payroll.periodoPago || payrollDetails.periodoPago);
      const fileName = `recibo_${payroll.legajoEmpleado || payrollDetails.legajo || 'liquidacion'}_${periodoDisplay.replace(/\s+/g, '_')}.pdf`;

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
      notify.error('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  return (
    <div className="placeholder-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <button 
            className="back-button" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            Volver
          </button>
          <h1 className="title title-gradient animated-title">
            Historial de Pagos
          </h1>
          <p className="subtitle">
            Consulta el registro completo de liquidaciones realizadas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value primary">{totals.totalPagos}</div>
              <p className="stat-label">Liquidaciones</p>
            </div>
            <Calendar className="stat-icon primary" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value success">{formatCurrency(totals.totalNeto)}</div>
              <p className="stat-label">Total Neto</p>
            </div>
            <DollarSign className="stat-icon success" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content-history">
        <div className="card employees-list">
          <div className="card-header list-header">
            <h2 className="list-title section-title-effect">Listado de Pagos</h2>
            <p className="list-description">
              {totals.totalPagos} liquidación{totals.totalPagos !== 1 ? 'es' : ''} registrada{totals.totalPagos !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="card-content list-content">
            {/* Search Section */}
            <div className="search-section">
              <div className="search-filters-row">
                <div className="search-field-wrapper">
                  <label htmlFor="pago-search">Buscar pago</label>
                  <div className="search-field">
                    <Search className="search-icon" />
                    <input
                      id="pago-search"
                      type="search"
                      placeholder="Ingresá nombre, legajo o período"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </div>
                </div>
                
                <div className="filter-field-wrapper">
                  <label htmlFor="filter-gremio">Filtrar por gremio</label>
                  <select
                    id="filter-gremio"
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
                  <label htmlFor="filter-estado">Filtrar por estado</label>
                  <select
                    id="filter-estado"
                    className="filter-select"
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    <option value="Completada">Completada</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </div>
              </div>
              
              <div className="search-results-info">
                <span className="results-count">
                  Mostrando {filteredTotals.totalPagos} de {totals.totalPagos} liquidación{filteredTotals.totalPagos !== 1 ? 'es' : ''} — Neto{' '}
                  {formatCurrency(filteredTotals.totalNeto)}
                </span>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Cargando pagos...</p>
              </div>
            ) : filteredPagos.length > 0 ? (
              <div className="employee-list">
                {filteredPagos.map((pago) => (
                  <div
                    key={pago.id}
                    className="employee-item"
                  >
                    <div className="employee-grid">
                        <div className="employee-info">
                          <h3 className="employee-name">{`${pago.apellidoEmpleado || ''} ${pago.nombreEmpleado || ''}`}</h3>
                          <p className="employee-email">Legajo: {pago.legajoEmpleado || '-'}</p>
                        </div>
                        <div className="employee-position">
                          <p className="position-title">Período: {pago.periodoPago || '-'}</p>
                          <p className="department">
                            Fecha: {pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-AR') : '-'}
                          </p>
                        </div>
                        <div className="employee-salary">
                          <p className="salary-amount">
                            {formatCurrency(pago.total_neto || 0)}
                          </p>
                          <p className="hire-date">Total Neto</p>
                        </div>
                        <div className="employee-status">
                          <span className={`status-badge ${pago.estado?.toLowerCase() || 'completada'}`}>
                            {pago.estado ? pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1) : 'Completada'}
                          </span>
                        </div>
                      </div>
                      <div className="employee-actions">
                        <button
                          className="action-icon-button view-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(pago);
                          }}
                          title="Ver detalle"
                        >
                          <Eye className="action-icon" />
                        </button>
                      </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Search className="empty-icon" />
                <h3>Sin resultados</h3>
                <p>No se encontraron pagos que coincidan con tu búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <PayrollDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPayroll(null);
          setSelectedEmployee(null);
          setPayrollDetails(null);
        }}
        employees={employees}
        selectedEmployee={selectedEmployee}
        selectedPayroll={selectedPayroll}
        payrollDetails={payrollDetails}
        loadingDetails={loadingDetails}
        onPrint={handlePrintPayroll}
        onDownload={handleDownloadPayroll}
      />
    </div>
  );
}