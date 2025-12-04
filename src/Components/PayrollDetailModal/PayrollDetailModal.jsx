import React from 'react';
import { Printer, Download } from 'lucide-react';
import { Modal, ModalFooter } from '../../Components/Modal/Modal';
import './PayrollDetailModal.scss';

export default function PayrollDetailModal({
  isOpen,
  onClose,
  selectedPayroll,
  payrollDetails,
  loadingDetails,
  onPrint,
  onDownload,
  title = 'Recibo de Haberes'
}) {
  const remunerations = payrollDetails?.conceptos
    ?.filter(c => 
      c.tipoConcepto === 'CATEGORIA' || 
      c.tipoConcepto === 'CONCEPTO_LYF' || 
      c.tipoConcepto === 'CONCEPTO_UOCRA' ||
      c.tipoConcepto === 'BONIFICACION_AREA' ||
      c.tipoConcepto === 'DESCUENTO' ||
      c.tipoConcepto === 'CATEGORIA_ZONA'
    )
    .reduce((sum, c) => sum + (Number(c.total) || 0), 0) || 0;

  const deductions = payrollDetails?.conceptos
    ?.filter(c => c.tipoConcepto === 'DESCUENTO')
    .reduce((sum, c) => sum + Math.abs(Number(c.total) || 0), 0) || 0;

  const netAmount = payrollDetails?.total || payrollDetails?.total_neto || selectedPayroll?.total_neto || remunerations - deductions;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xlarge"
      className="payroll-detail-modal"
    >
      {loadingDetails ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Cargando detalles...</p>
        </div>
      ) : selectedPayroll && payrollDetails ? (
        <div className="payroll-receipt">
          {/* Header Section */}
          <div className="receipt-header-section">
            <div className="header-left">
              <div className="company-logo-box">
                <div className="logo-placeholder">Logo</div>
              </div>
            </div>
            <div className="header-center">
              <p className="company-name">Empleador: COOP. DE SERV. PUB. 25 DE MAYO LTDA.</p>
              <p className="company-address">Domicilio: Ramirez 367</p>
              <p className="company-cuit">CUIT Nº 30-54569238-0</p>
            </div>
            <div className="header-right">
              <h2 className="receipt-title">RECIBO DE HABERES</h2>
              <p className="receipt-number">DUPLICADO</p>
            </div>
          </div>

          {/* Employee Info Table */}
          <table className="info-table">
            <tbody>
              <tr>
                <td className="label">Apellido y Nombre</td>
                <td className="value">{selectedPayroll.apellidoEmpleado || ''} {selectedPayroll.nombreEmpleado || ''}</td>
                <td className="label">Legajo</td>
                <td className="value">{selectedPayroll.legajoEmpleado || '-'}</td>
                <td className="label">C.U.I.L.</td>
                <td className="value">{payrollDetails.cuil || '-'}</td>
              </tr>
            </tbody>
          </table>

          {/* Category and Department */}
          <table className="info-table">
            <tbody>
              <tr>
                <td className="label">Categoría</td>
                <td className="value">{payrollDetails.categoriaEmpleado || '-'}</td>
                <td className="label">División</td>
                <td className="value">{payrollDetails.division || '-'}</td>
              </tr>
              <tr>
                <td className="label">Subeditor</td>
                <td className="value">{payrollDetails.subeditor || '-'}</td>
                <td className="label">Departamento</td>
                <td className="value">{payrollDetails.departamento || '-'}</td>
              </tr>
            </tbody>
          </table>

          {/* Payment Period and Dates */}
          <table className="info-table dates-table">
            <tbody>
              <tr>
                <td className="label">Fecha Ingreso</td>
                <td className="value">{payrollDetails.fechaIngreso || '-'}</td>
                <td className="label">Sueldo</td>
                <td className="value">{selectedPayroll.sueldoBasico ? `$${Number(selectedPayroll.sueldoBasico).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-'}</td>
                <td className="label">Liquidación</td>
                <td className="value">{selectedPayroll.periodoPago || '-'}</td>
              </tr>
              <tr>
                <td className="label">Código</td>
                <td className="value">{payrollDetails.codigo || '-'}</td>
                <td className="label">Detalle</td>
                <td className="value">{payrollDetails.detalle || '-'}</td>
                <td className="label">Cantidad</td>
                <td className="value">{payrollDetails.cantidad || '-'}</td>
              </tr>
            </tbody>
          </table>

          {/* Concepts Table */}
          {payrollDetails.conceptos && payrollDetails.conceptos.length > 0 ? (
            <table className="concepts-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Detalle</th>
                  <th>Cantidad</th>
                  <th>Haberes</th>
                  <th>Deducciones</th>
                </tr>
              </thead>
              <tbody>
                {payrollDetails.conceptos.map((concepto, index) => {
                  const isRemuneration = 
                        concepto.tipoConcepto === 'CATEGORIA' || 
                        concepto.tipoConcepto === 'CONCEPTO_LYF' || 
                        concepto.tipoConcepto === 'CONCEPTO_UOCRA' ||
                        concepto.tipoConcepto === 'BONIFICACION_AREA' ||
                        concepto.tipoConcepto === 'CATEGORIA_ZONA'
                  const isDeduction = concepto.tipoConcepto === 'DESCUENTO';
                  const total = Number(concepto.total || 0);

                  return (
                    <tr key={index}>
                      <td className="code">{concepto.idReferencia || concepto.id || index + 1}</td>
                      <td className="detail">{concepto.nombre || `Concepto ${index + 1}`}</td>
                      <td className="quantity">{concepto.unidades || concepto.cantidad || 0}</td>
                      <td className="amount-haberes">
                        {isRemuneration && total > 0 ? total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                      </td>
                      <td className="amount-deductions">
                        {isDeduction && total < 0 ? Math.abs(total).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p>No se encontraron conceptos para esta liquidación.</p>
            </div>
          )}

          {/* Totals Section */}
          <table className="totals-table">
            <tbody>
              <tr>
                <td className="label">Lugar y Fecha de Pago</td>
                <td className="value">Bs. As. {selectedPayroll.fechaPago ? new Date(selectedPayroll.fechaPago).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR')}</td>
                <td className="label">Tot. Remun.</td>
                <td className="value">${remunerations.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td className="label"></td>
                <td className="value"></td>
                <td className="label">Tot. No Remun.</td>
                <td className="value">-</td>
              </tr>
              <tr>
                <td className="label"></td>
                <td className="value"></td>
                <td className="label">Deducciones</td>
                <td className="value">-${deductions.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Bank and Net Total */}
          <table className="bank-info-table">
            <tbody>
              <tr>
                <td className="label">Banco Acreditación</td>
                <td className="value">{payrollDetails.banco || '-'}</td>
                <td className="label">Cuenta</td>
                <td className="value">{payrollDetails.cuenta || '-'}</td>
                <td className="label">Total Neto</td>
                <td className="value total-neto">${netAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Amount in Words */}
          <div className="amount-words">
            <p className="label">Son Pesos:</p>
            <p className="words">{netAmount.toLocaleString('es-AR')} * * * *</p>
          </div>

          {/* Footer */}
          <div className="receipt-footer">
            <p className="disclaimer">
              El presente es duplicado del recibo original que obra en nuestro poder firmado por el empleado.
            </p>
            <div className="signature-area">
              <p>___________________</p>
              <p>Firma del Empleador</p>
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
