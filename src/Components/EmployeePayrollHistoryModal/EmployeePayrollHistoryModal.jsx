import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { Eye, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import * as api from '../../services/empleadosAPI';
import { useNotification } from '../../Hooks/useNotification';
import PayrollDetailModal from '../PayrollDetailModal/PayrollDetailModal';
import '../EmployeePayrollHistoryModal/EmployeePayrollHistoryModal.scss';

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

export default function EmployeePayrollHistoryModal({ isOpen, onClose, employee }) {
  const notify = useNotification();
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterYear, setFilterYear] = useState('');
  const [sortBy, setSortBy] = useState('fecha'); // 'fecha' o 'periodo'
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Cargar pagos del empleado
  useEffect(() => {
    const loadPagos = async () => {
      if (!isOpen || !employee) return;

      setLoading(true);
      try {
        const data = await api.getPagosByEmpleado(employee.legajo);
        setPagos(data || []);
      } catch (error) {
        notify.error('Error al cargar el historial de liquidaciones');
        setPagos([]);
      } finally {
        setLoading(false);
      }
    };

    loadPagos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employee?.legajo]);

  // Obtener años únicos de los pagos
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    pagos.forEach(pago => {
      if (pago.fechaPago) {
        const year = new Date(pago.fechaPago).getFullYear();
        yearsSet.add(year);
      } else if (pago.periodoPago) {
        const parts = String(pago.periodoPago).split('-');
        if (parts.length >= 1) {
          yearsSet.add(parseInt(parts[0], 10));
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // Más reciente primero
  }, [pagos]);

  // Filtrar y ordenar pagos
  const filteredAndSortedPagos = useMemo(() => {
    let filtered = pagos;

    // Filtrar por año
    if (filterYear) {
      filtered = filtered.filter((pago) => {
        if (pago.fechaPago) {
          const year = new Date(pago.fechaPago).getFullYear();
          return year === parseInt(filterYear, 10);
        } else if (pago.periodoPago) {
          const parts = String(pago.periodoPago).split('-');
          if (parts.length >= 1) {
            return parseInt(parts[0], 10) === parseInt(filterYear, 10);
          }
        }
        return false;
      });
    }

    // Ordenar
    filtered = filtered.sort((a, b) => {
      if (sortBy === 'fecha') {
        // Ordenar por fecha de pago (más reciente primero)
        let fechaA = a.fechaPago ? new Date(a.fechaPago).getTime() : null;
        let fechaB = b.fechaPago ? new Date(b.fechaPago).getTime() : null;
        
        // Si no hay fechaPago, usar id como fallback
        if (!fechaA) fechaA = a.id || 0;
        if (!fechaB) fechaB = b.id || 0;
        
        return fechaB - fechaA; // Más reciente primero
      } else if (sortBy === 'periodo') {
        // Ordenar por periodo de pago (más reciente primero)
        let periodoA = null;
        let periodoB = null;
        
        if (a.periodoPago) {
          const partsA = String(a.periodoPago).split('-');
          if (partsA.length >= 2) {
            periodoA = new Date(parseInt(partsA[0]), parseInt(partsA[1]) - 1).getTime();
          }
        }
        
        if (b.periodoPago) {
          const partsB = String(b.periodoPago).split('-');
          if (partsB.length >= 2) {
            periodoB = new Date(parseInt(partsB[0]), parseInt(partsB[1]) - 1).getTime();
          }
        }
        
        // Si no hay periodo, usar id como fallback
        if (!periodoA) periodoA = a.id || 0;
        if (!periodoB) periodoB = b.id || 0;
        
        return periodoB - periodoA; // Más reciente primero
      }
      
      return 0;
    });

    return filtered;
  }, [pagos, filterYear, sortBy]);

  // Calcular totales
  const totals = useMemo(() => {
    const totalPagos = filteredAndSortedPagos.length;
    const totalNeto = filteredAndSortedPagos.reduce((accumulator, pago) => accumulator + (Number(pago.total_neto) || 0), 0);
    return { totalPagos, totalNeto };
  }, [filteredAndSortedPagos]);

  // Ver detalles de un pago
  const handleViewDetails = async (liquidacion) => {
    setSelectedPayroll(liquidacion);
    setShowDetailModal(true);
    setLoadingDetails(true);
    setPayrollDetails(null);

    try {
      // Cargar detalles de la liquidación desde la API
      const detalle = await api.getDetallePago(liquidacion.id || liquidacion.idPago);
      setPayrollDetails(detalle);
    } catch (error) {
      notify.error('Error al cargar detalles de la liquidación');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Generar HTML del recibo para imprimir/descargar (similar a HistorialPagos.jsx)
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', 'Helvetica', sans-serif; font-size: 12px; color: #333; background: white; padding: 20px; line-height: 1.4; }
    .receipt-container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; }
    .receipt-header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333; }
    .company-logo { width: 100px; height: 100px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; background: white; padding: 5px; }
    .logo-image { width: 100%; height: 100%; object-fit: contain; }
    .company-info { flex: 1; margin-left: 15px; }
    .company-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
    .company-detail { font-size: 11px; line-height: 1.4; }
    .company-detail.highlight { font-weight: 600; }
    .receipt-title { text-align: right; font-weight: bold; font-size: 14px; color: #22c55e; }
    .title-main { display: block; margin-bottom: 5px; }
    .title-number { display: block; font-size: 12px; color: #666; font-weight: normal; }
    .employee-info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; }
    .info-row { display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center; }
    .info-row .label { font-weight: bold; font-size: 11px; }
    .info-row .value { font-size: 12px; }
    .concepts-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    .concepts-table thead { background: #22c55e; color: white; }
    .concepts-table th { padding: 10px; text-align: left; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.2); }
    .concepts-table th:last-child { text-align: right; }
    .concepts-table tbody tr { border-bottom: 1px solid #e5e7eb; }
    .concepts-table tbody tr:nth-child(even) { background: #f9fafb; }
    .concepts-table td { padding: 8px 10px; border: 1px solid #e5e7eb; }
    .concept-code { font-weight: 600; text-align: center; width: 60px; }
    .concept-units { text-align: center; width: 70px; }
    .concept-remuneration { text-align: right; width: 120px; color: #22c55e; font-weight: 600; }
    .concept-deduction { text-align: right; width: 120px; color: #ef4444; font-weight: 600; }
    .receipt-totals-row td { text-align: right; font-weight: bold; padding: 15px 10px; }
    .receipt-net-row td { text-align: right; font-weight: bold; padding: 15px 10px; border-top: 2px solid #22c55e; font-size: 13px; }
    .receipt-net-amount { color: #22c55e; font-size: 14px; }
    .payment-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 11px; }
    .detail-item { display: flex; flex-direction: column; gap: 5px; }
    .detail-item .label { font-weight: 600; color: #666; font-size: 10px; text-transform: uppercase; }
    .detail-item .value { color: #333; font-size: 12px; }
    .amount-words-section { margin-bottom: 20px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; }
    .amount-words-label { font-weight: bold; font-size: 11px; display: block; margin-bottom: 5px; }
    .amount-words-display { font-size: 12px; padding: 8px; border: 1px solid #e5e7eb; background: white; min-height: 30px; }
    .receipt-footer { padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 10px; color: #666; }
    .footer-text { font-style: italic; margin-bottom: 20px; }
    .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
    .signature-block { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .signature-block .line { width: 150px; height: 1px; background: #333; margin-top: 40px; }
    .signature-block .label { font-size: 10px; font-weight: 600; text-transform: uppercase; }
    @media print { body { padding: 0; } .receipt-container { padding: 15px; } }
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
          <td colspan="3" style="text-align: right; font-weight: bold; padding: 15px 10px">TOTALES:</td>
          <td class="receipt-total-remuneration" style="text-align: right; font-weight: bold; padding: 15px 10px">${formatCurrencyAR(remunerations)}</td>
          <td class="receipt-total-deduction" style="text-align: right; font-weight: bold; padding: 15px 10px">${formatCurrencyAR(deductions)}</td>
        </tr>
        <tr class="receipt-net-row">
          <td colspan="4" style="text-align: right; font-weight: bold; padding: 15px 10px; border-top: 2px solid #22c55e">TOTAL NETO A COBRAR:</td>
          <td class="receipt-net-amount" style="text-align: right; font-weight: bold; padding: 15px 10px; font-size: 14px; color: #22c55e; border-top: 2px solid #22c55e">${formatCurrencyAR(netAmount)}</td>
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
      <div class="amount-words-display">${netAmount.toLocaleString('es-AR')} * * * *</div>
    </div>
    <div class="receipt-footer">
      <p class="footer-text">El presente es duplicado del recibo original que obra en nuestro poder. Firmado por el empleado.</p>
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

  const handlePrintPayroll = async (payroll) => {
    if (!payrollDetails) {
      notify.error('No hay detalles de liquidación disponibles para imprimir');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      const htmlContent = generateReceiptHTML(payroll, payrollDetails);
      printWindow.document.write(htmlContent);
      printWindow.document.close();
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
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.background = 'white';
      tempDiv.innerHTML = generateReceiptHTML(payroll, payrollDetails);
      document.body.appendChild(tempDiv);

      const periodoDisplay = formatPeriodToMonthYear(payroll.periodoPago || payrollDetails.periodoPago);
      const fileName = `recibo_${payroll.legajoEmpleado || payrollDetails.legajo || 'liquidacion'}_${periodoDisplay.replace(/\s+/g, '_')}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(tempDiv).save();
      document.body.removeChild(tempDiv);
      notify.success('Recibo descargado en PDF correctamente');
    } catch (error) {
      notify.error('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  const handleGoToHistorial = () => {
    onClose();
    navigate('/historial-pagos');
  };

  if (!employee) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Historial de Liquidaciones - ${employee.nombre} ${employee.apellido}`}
        size="large"
        className="employee-payroll-history-modal"
      >
        <div className="payroll-history-content">
          {/* Filtros y ordenamiento */}
          <div className="filters-section">
            <div className="filter-group">
              <label htmlFor="filter-year">Filtrar por año:</label>
              <select
                id="filter-year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="filter-select"
              >
                <option value="">Todos los años</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="sort-by">Ordenar por:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="fecha">Fecha más reciente</option>
                <option value="periodo">Período más reciente</option>
              </select>
            </div>
          </div>

          {/* Resumen */}
          <div className="summary-section">
            <div className="summary-item">
              <span className="summary-label">Total de liquidaciones:</span>
              <span className="summary-value">{totals.totalPagos}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total neto:</span>
              <span className="summary-value">{formatCurrencyAR(totals.totalNeto)}</span>
            </div>
          </div>

          {/* Lista de pagos */}
          {loading ? (
            <div className="loading-state">
              <p>Cargando liquidaciones...</p>
            </div>
          ) : filteredAndSortedPagos.length > 0 ? (
            <div className="payroll-list">
              {filteredAndSortedPagos.map((pago) => (
                <div key={pago.id} className="payroll-card">
                  <div className="payroll-grid">
                    <div className="payroll-info">
                      <h4 className="payroll-period">{formatPeriodToMonthYear(pago.periodoPago)}</h4>
                      <p className="payroll-date">
                        <Calendar className="detail-icon" size={14} />
                        {pago.fechaPago ? formatDateDDMMYYYY(pago.fechaPago) : '—'}
                      </p>
                    </div>
                    <div className="payroll-amount">
                      <p className="amount-value">{formatCurrencyAR(pago.total_neto || 0)}</p>
                      <p className="amount-label">Total Neto</p>
                    </div>
                  </div>
                  <div className="payroll-actions">
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
              <Calendar className="empty-icon" size={48} />
              <h3>Sin liquidaciones</h3>
              <p>No se encontraron liquidaciones para este empleado.</p>
            </div>
          )}
        </div>

        <ModalFooter>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleGoToHistorial}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Ver Historial Completo
          </button>
        </ModalFooter>
      </Modal>

      {/* Modal de detalles */}
      <PayrollDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPayroll(null);
          setPayrollDetails(null);
        }}
        selectedPayroll={selectedPayroll}
        selectedEmployee={employee}
        payrollDetails={payrollDetails}
        loadingDetails={loadingDetails}
        onPrint={() => handlePrintPayroll(selectedPayroll)}
        onDownload={() => handleDownloadPayroll(selectedPayroll)}
      />
    </>
  );
}

