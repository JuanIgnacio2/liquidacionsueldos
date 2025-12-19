import React, { useState, useEffect } from 'react';
import { Printer, Download } from 'lucide-react';
import { Modal, ModalFooter } from '../Modal/Modal';
import './PayrollDetailModal.scss';

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

export default function PayrollDetailModal({
  isOpen,
  onClose,
  selectedPayroll,
  selectedEmployee,
  payrollDetails,
  loadingDetails,
  onPrint,
  onDownload,
  title = 'Vista Previa del Recibo'
}) {
  // Calcular totales
  const calculateTotals = () => {
    if (!payrollDetails?.conceptos) {
      return { remunerations: 0, deductions: 0, netAmount: 0 };
    }

    const remunerations = payrollDetails.conceptos
      .filter(c => 
        c.tipoConcepto === 'CATEGORIA' || 
        c.tipoConcepto === 'CONCEPTO_LYF' || 
        c.tipoConcepto === 'CONCEPTO_UOCRA' ||
        c.tipoConcepto === 'BONIFICACION_AREA' ||
        c.tipoConcepto === 'CATEGORIA_ZONA'
      )
      .reduce((sum, c) => sum + (Number(c.total) || 0), 0);

    const deductions = payrollDetails.conceptos
      .filter(c => c.tipoConcepto === 'DESCUENTO')
      .reduce((sum, c) => sum + Math.abs(Number(c.total) || 0), 0);

    const netAmount = remunerations - deductions;

    return { remunerations, deductions, netAmount };
  };

  const { remunerations, deductions, netAmount } = calculateTotals();

  // Obtener datos del empleado
  const employeeName = `${selectedPayroll?.apellidoEmpleado || ''}, ${selectedPayroll?.nombreEmpleado || ''}`.trim();
  const employeeLegajo = selectedPayroll?.legajoEmpleado || payrollDetails?.legajo || '—';
  const employeeCuil = payrollDetails?.cuil || selectedPayroll?.cuil || '—';
  const employeeCategory = payrollDetails?.categoriaEmpleado || selectedPayroll?.categoria || '—';
  const employeeIngreso = payrollDetails?.fechaIngreso || selectedPayroll?.fechaIngreso || null;
  const periodo = formatPeriodToMonthYear(selectedPayroll?.periodoPago || payrollDetails?.periodoPago);
  const remunerationAssigned = payrollDetails?.remuneracionAsignada || selectedPayroll?.remuneracionAsignada || 0;
  const bank = payrollDetails?.banco || selectedPayroll?.banco || 'Banco Nación';
  const account = payrollDetails?.cuenta || payrollDetails?.cbu || selectedPayroll?.cbu || '—';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="large"
      className="process-payroll-modal"
    >
      {loadingDetails ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Cargando detalles...</p>
        </div>
      ) : selectedPayroll && payrollDetails ? (
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
                <span className="value">{employeeName || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Legajo</span>
                <span className="value">{employeeLegajo}</span>
              </div>
              <div className="info-row">
                <span className="label">C.U.I.L.</span>
                <span className="value">{employeeCuil}</span>
              </div>
              <div className="info-row">
                <span className="label">Fecha Ingreso</span>
                <span className="value">{formatDateDDMMYYYY(employeeIngreso)}</span>
              </div>
              <div className="info-row">
                <span className="label">Categoría</span>
                <span className="value">{employeeCategory}</span>
              </div>
              <div className="info-row">
                <span className="label">Período</span>
                <span className="value">{periodo}</span>
              </div>
              <div className="info-row">
                <span className="label">Remuneración asignada</span>
                <span className="value">{formatCurrencyAR(remunerationAssigned)}</span>
              </div>
            </div>

            {/* TABLA DE CONCEPTOS */}
            {payrollDetails.conceptos && payrollDetails.conceptos.length > 0 ? (
              <table className="concepts-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Código</th>
                    <th style={{ width: '40%' }}>Concepto</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Unidades</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Remuneraciones</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Descuentos</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollDetails.conceptos.map((concepto, index) => {
                    const isRemuneration = 
                      concepto.tipoConcepto === 'CATEGORIA' || 
                      concepto.tipoConcepto === 'CONCEPTO_LYF' || 
                      concepto.tipoConcepto === 'CONCEPTO_UOCRA' ||
                      concepto.tipoConcepto === 'BONIFICACION_AREA' ||
                      concepto.tipoConcepto === 'CATEGORIA_ZONA';
                    const isDeduction = concepto.tipoConcepto === 'DESCUENTO';
                    const total = Number(concepto.total || 0);

                    return (
                      <tr key={index}>
                        <td className="concept-code">{concepto.idReferencia || concepto.id || index + 1}</td>
                        <td className="concept-name">{concepto.nombre || `Concepto ${index + 1}`}</td>
                        <td className="concept-units">{concepto.unidades || concepto.cantidad || 0}</td>
                        <td className="concept-remuneration">
                          {isRemuneration && total > 0 ? formatCurrencyAR(total) : ''}
                        </td>
                        <td className="concept-deduction">
                          {isDeduction && total < 0 ? formatCurrencyAR(Math.abs(total)) : ''}
                        </td>
                      </tr>
                    );
                  })}
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
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>No se encontraron conceptos para esta liquidación.</p>
              </div>
            )}

            {/* DETALLES DE PAGO */}
            <div className="payment-details">
              <div className="detail-item">
                <span className="label">Banco Acreditación</span>
                <span className="value">{bank}</span>
              </div>
              <div className="detail-item">
                <span className="label">Cuenta</span>
                <span className="value">{account}</span>
              </div>
            </div>

            {/* SON PESOS */}
            <div className="amount-words-section">
              <label className="amount-words-label">SON PESOS:</label>
              <div className="amount-words-display">
                {netAmount.toLocaleString('es-AR')} * * * *
              </div>
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
      ) : null}

      <ModalFooter>
        <button className="btn btn-secondary" onClick={onClose}>
          Cerrar
        </button>
        {selectedPayroll && (
          <>
            <button className="btn btn-success" onClick={() => onPrint && onPrint(selectedPayroll)}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
            <button className="btn btn-primary" onClick={() => onDownload && onDownload(selectedPayroll)}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
