import React, { useState, useEffect, useRef } from 'react';
import { Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Modal, ModalFooter } from '../Modal/Modal';
import * as api from '../../services/empleadosAPI';
import { sortConceptos, isRemuneration, isDeduction } from '../../utils/conceptosUtils';
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

export default function PayrollDetailModal({
  isOpen,
  onClose,
  selectedPayroll,
  selectedEmployee,
  payrollDetails,
  loadingDetails,
  title = 'Vista Previa del Recibo'
}) {
  const [conceptosCatalog, setConceptosCatalog] = useState({
    bonificacionesLyF: [],
    bonificacionesUocra: [],
    descuentos: [],
    horasExtrasLyF: [],
    areas: []
  });
  const [amountInWords, setAmountInWords] = useState('');
  const receiptRef = useRef(null);

  const createPrintableReceipt = () => {
    const source = receiptRef.current;
    if (!source) return null;

    const clone = source.cloneNode(true);
    clone.querySelectorAll('input').forEach((input) => {
      const text = document.createElement('div');
      text.className = 'amount-words-input';
      text.textContent = input.value;
      input.replaceWith(text);
    });

    const preview = document.createElement('div');
    preview.className = 'receipt-preview';
    preview.appendChild(clone);
    return preview;
  };

  // Imprime solo el recibo dentro de márgenes físicos de 8 mm.
  const handlePrint = () => {
    const clone = createPrintableReceipt();
    if (!clone) return;

    const headStyles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    ).map((node) => node.outerHTML).join('\n');

    const printStyles = `
      @page { size: A4 portrait; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff !important; }
      body { width: 210mm; height: 297mm; box-sizing: border-box; padding: 8mm; overflow: hidden; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-preview .receipt-container {
        max-width: none !important; width: 100% !important; margin: 0 !important;
        padding: 0 !important; box-shadow: none !important; border-radius: 0 !important;
        animation: none !important; transform: none !important; opacity: 1 !important;
      }
      .receipt-container table, .receipt-container tr, .receipt-footer, .payment-details,
      .amount-words-section { break-inside: avoid; page-break-inside: avoid; }
      .amount-words-input { padding: 0.5rem; border: 1px solid #ccc; text-transform: uppercase; }
      .receipt-container { font-size: 11px !important; }
      .receipt-container .receipt-header-wrapper { margin-bottom: 0.6rem !important; padding-bottom: 0.6rem !important; }
      .receipt-container .logo-box { width: 70px !important; height: 70px !important; }
      .receipt-container .employee-info-section,
      .receipt-container .payment-details,
      .receipt-container .amount-words-section { margin-bottom: 0.6rem !important; padding: 0.5rem !important; gap: 0.4rem !important; }
      .receipt-container .concepts-table { margin-bottom: 0.6rem !important; }
      .receipt-container .concepts-table td, .receipt-container .concepts-table th { padding: 0.25rem 0.5rem !important; }
      .receipt-container .receipt-footer { padding-top: 0.6rem !important; gap: 0.5rem !important; }
      .receipt-container .signature-section { margin-top: 1rem !important; }
      .receipt-container .amount-words-input { padding: 0.3rem !important; min-height: 0 !important; }
    `;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;visibility:hidden;';
    iframe.onload = () => {
      const win = iframe.contentWindow;
      const preview = win.document.querySelector('.receipt-preview');
      const pageHeight = (281 / 25.4) * 96;
      const pageWidth = (194 / 25.4) * 96;
      const content = preview?.querySelector('.receipt-container');
      if (content) {
        const bounds = content.getBoundingClientRect();
        const scale = Math.min(1, pageWidth / bounds.width, pageHeight / bounds.height);
        preview.style.zoom = String(Math.floor(scale * 1000) / 1000);
      }
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 1000);
    };
    iframe.srcdoc = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Recibo</title>${headStyles}<style>${printStyles}</style></head><body>${clone.outerHTML}</body></html>`;
    document.body.appendChild(iframe);
  };

  const handleDownload = async () => {
    const receipt = receiptRef.current;
    if (!receipt) return;

    const employeeLegajo = selectedEmployee?.legajo || selectedPayroll?.legajoEmpleado || payrollDetails?.legajo || 'liquidacion';
    const period = String(selectedPayroll?.periodoPago || payrollDetails?.periodoPago || 'recibo').replace(/[^\w-]/g, '_');

    try {
      const canvas = await html2canvas(receipt, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      if (!canvas.width || !canvas.height) throw new Error('La captura del recibo está vacía');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 8;
      const maxWidth = 210 - margin * 2;
      const maxHeight = 297 - margin * 2;
      const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const imageWidth = canvas.width * ratio;
      const imageHeight = canvas.height * ratio;
      const x = (210 - imageWidth) / 2;
      const y = (297 - imageHeight) / 2;

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', x, y, imageWidth, imageHeight);
      pdf.save(`recibo_${employeeLegajo}_${period}.pdf`);
    } catch (error) {
      console.error('Error al generar el PDF del recibo:', error);
      window.alert('No se pudo generar el PDF del recibo. Intente nuevamente.');
    }
  };

  // Cargar catálogos de conceptos cuando se abre el modal
  useEffect(() => {
    const loadCatalogos = async () => {
      if (!isOpen || !payrollDetails) return;
      try {
        // Determinar el gremio del empleado (priorizar selectedEmployee)
        let gremioNombre = '';
        if (selectedEmployee) {
          gremioNombre = selectedEmployee.gremioNombre || 
                        (selectedEmployee.gremio?.nombre) || 
                        (typeof selectedEmployee.gremio === 'string' ? selectedEmployee.gremio : '');
        } else {
          gremioNombre = payrollDetails.gremioNombre || 
                        selectedPayroll?.gremioNombre || 
                        (payrollDetails.gremio?.nombre) ||
                        (selectedPayroll?.gremio?.nombre) || '';
        }
        
        const gremioUpper = gremioNombre.toUpperCase();
        const isLuzYFuerza = gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA');
        const isUocra = gremioUpper === 'UOCRA';

        const [bonificacionesLyF, bonificacionesUocra, descuentos, horasExtrasLyF, areas] = await Promise.all([
          isLuzYFuerza ? api.getConceptosLyF() : Promise.resolve([]),
          isUocra ? api.getConceptosUocra() : Promise.resolve([]),
          api.getDescuentos(),
          isLuzYFuerza ? api.getHorasExtrasLyF() : Promise.resolve([]),
          api.getAreas()
        ]);

        const newCatalog = {
          bonificacionesLyF: bonificacionesLyF || [],
          bonificacionesUocra: bonificacionesUocra || [],
          descuentos: descuentos || [],
          horasExtrasLyF: horasExtrasLyF || [],
          areas: areas || []
        };
        setConceptosCatalog(newCatalog);
      } catch (error) {
        console.error('Error al cargar catálogos:', error);
      }
    };

    loadCatalogos();
  }, [isOpen, payrollDetails, selectedPayroll, selectedEmployee]);

  // Calcular totales
  const calculateTotals = () => {
    if (!payrollDetails?.conceptos) {
      return { remunerations: 0, deductions: 0, netAmount: 0 };
    }

    const deductions = payrollDetails.conceptos
      .filter(isDeduction)
      .reduce((sum, c) => sum + Math.abs(Number(c.total) || 0), 0);

    // El neto guardado por el backend es el valor de referencia (el mismo que muestra la lista)
    const netBackend = Number(payrollDetails.total_neto ?? payrollDetails.totalNeto ?? selectedPayroll?.total_neto);
    if (Number.isFinite(netBackend)) {
      return { remunerations: netBackend + deductions, deductions, netAmount: netBackend };
    }

    const remunerations = payrollDetails.conceptos
      .filter(isRemuneration)
      .reduce((sum, c) => sum + (Number(c.total) || 0), 0);

    return { remunerations, deductions, netAmount: remunerations - deductions };
  };

  const { remunerations, deductions, netAmount } = calculateTotals();

  // Calcular remuneración asignada si no viene en los datos
  const calculateRemunerationAssigned = () => {
    // Si viene en los datos, usarla directamente
    if (payrollDetails?.remuneracionAsignada || selectedPayroll?.remuneracionAsignada) {
      return payrollDetails?.remuneracionAsignada || selectedPayroll?.remuneracionAsignada || 0;
    }
    
    // Si no viene, calcularla: básico + bonos de área
    if (!payrollDetails?.conceptos) return 0;
    
    // Buscar el básico (CATEGORIA o CATEGORIA_ZONA)
    const basico = payrollDetails.conceptos
      .filter(c => c.tipoConcepto === 'CATEGORIA' || c.tipoConcepto === 'CATEGORIA_ZONA')
      .reduce((sum, c) => sum + (Number(c.total) || 0), 0);
    
    return basico;
  };

  // Generar automáticamente el monto en palabras cuando cambia el netAmount
  useEffect(() => {
    if (isOpen && payrollDetails && netAmount > 0) {
      const expectedWords = (numberToWords(netAmount) + ' pesos').toUpperCase();
      setAmountInWords(expectedWords);
    } else if (!isOpen || !payrollDetails || netAmount <= 0) {
      setAmountInWords('');
    }
  }, [isOpen, payrollDetails, netAmount]);

  // Obtener datos del empleado (formato igual a ProcessPayrollModal)
  // Priorizar selectedEmployee si está disponible, luego payrollDetails, luego selectedPayroll
  const employeeName = selectedEmployee 
    ? `${selectedEmployee.apellido || ''}, ${selectedEmployee.nombre || ''}`.trim() || '—'
    : `${selectedPayroll?.apellidoEmpleado || payrollDetails?.apellido || ''}, ${selectedPayroll?.nombreEmpleado || payrollDetails?.nombre || ''}`.trim() || '—';
  const employeeLegajo = selectedEmployee?.legajo || selectedPayroll?.legajoEmpleado || payrollDetails?.legajo || '—';
  const employeeCuil = selectedEmployee?.cuil || payrollDetails?.cuil || selectedPayroll?.cuil || '—';
  const employeeCategory = selectedEmployee?.categoria || selectedEmployee?.categoriaNombre || payrollDetails?.categoriaEmpleado || selectedPayroll?.categoria || payrollDetails?.categoria || '—';
  const employeeIngreso = selectedEmployee?.inicioActividad || payrollDetails?.fechaIngreso || selectedPayroll?.fechaIngreso || payrollDetails?.inicioActividad || null;
  const employeeAntiguedad = calculateAntiguedad(employeeIngreso);
  const periodo = formatPeriodToMonthYear(selectedPayroll?.periodoPago || payrollDetails?.periodoPago);
  const remunerationAssigned = calculateRemunerationAssigned();
  const bank = selectedEmployee?.banco || payrollDetails?.banco || selectedPayroll?.banco || 'Banco Nación';
  const cuenta = selectedEmployee?.cuenta || payrollDetails?.cuenta || selectedPayroll?.cuenta || '—';

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
          <div className="receipt-container" ref={receiptRef}>
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
                <span className="value">{employeeName}</span>
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
                <span className="label">Antigüedad</span>
                <span className="value">{employeeAntiguedad}</span>
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
                    <th style={{ width: 'auto' }}>Concepto</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Unidades</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Remuneraciones</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Descuentos</th>
                </tr>
              </thead>
              <tbody>
                  {sortConceptos(
                    payrollDetails.conceptos.filter(concepto => concepto.tipoConcepto !== 'CATEGORIA_ZONA')
                  ).map((concepto, index) => {
                      const isRemunerationConcept = isRemuneration(concepto);
                      const isDeductionConcept = isDeduction(concepto);
                  const total = Number(concepto.total || 0);
                      
                      // Para descuentos, el total puede venir negativo o positivo, siempre mostrar el valor absoluto
                      const descuentoAmount = isDeductionConcept ? Math.abs(total) : 0;
                      const remuneracionAmount = isRemunerationConcept && total > 0 ? total : 0;

                  return (
                    <tr key={index}>
                          <td className="concept-name">{concepto.nombre || concepto.nombreConcepto}</td>
                          <td className="concept-units">{concepto.unidades || concepto.cantidad || 0}</td>
                          <td className="concept-remuneration">
                            {remuneracionAmount > 0 ? formatCurrencyAR(remuneracionAmount) : ''}
                      </td>
                          <td className="concept-deduction">
                            {descuentoAmount > 0 ? formatCurrencyAR(descuentoAmount) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
                <tfoot>
                  <tr className="receipt-totals-row">
                    <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem 0.75rem' }}>
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
                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold', padding: '1rem 0.75rem', borderTop: '2px solid #22c55e' }}>
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

            {/* LUGAR Y FECHA DE PAGO */}
            <div className="payment-details">
              <div className="detail-item">
                <span className="label">Lugar y fecha de pago</span>
                <span className="value">
                  Hasenkamp, {selectedPayroll?.fechaPago || payrollDetails?.fechaPago 
                    ? formatDateDDMMYYYY(selectedPayroll?.fechaPago || payrollDetails?.fechaPago) 
                    : '—'}
                </span>
              </div>
            </div>

            {/* DETALLES DE PAGO */}
            <div className="payment-details">
              <div className="detail-item">
                <span className="label">Banco Acreditación</span>
                <span className="value">{bank}</span>
              </div>
              <div className="detail-item">
                <span className="label">Número de Cuenta</span>
                <span className="value">{cuenta}</span>
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
                style={{ width: '100%', textTransform: 'uppercase' }}
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
      ) : null}

      <ModalFooter>
        <button className="btn btn-secondary" onClick={onClose}>
          Cerrar
        </button>
        {selectedPayroll && (
          <>
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
