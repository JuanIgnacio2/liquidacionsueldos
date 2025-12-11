import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, DollarSign, Search, Users, ArrowLeft, Eye, CheckCircle, Printer, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/empleadosAPI';
import '../styles/components/_PlaceHolder.scss';
import '../styles/components/_liquidacion.scss';
import '../styles/components/_historialPagos.scss';
import { LoadingSpinner } from '../Components/ui/LoadingSpinner';
import { Modal, ModalFooter } from '../Components/Modal/Modal';
import { Button } from '../Components/ui/button';

export default function HistorialPagos() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // States for Detail Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [amountInWords, setAmountInWords] = useState('');

  useEffect(() => {
    loadPagos();
  }, []);

  const loadPagos = async () => {
    try {
      setLoading(true);
      const data = await api.getPagos();
      setPagos(data || []);
    } catch (error) {
      console.error('Error al cargar los pagos:', error);
      setPagos([]);
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Error al cargar detalles de la liquidación', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrintPayroll = (payroll) => {
    window.print();
  };

  const handleDownloadPayroll = (payroll) => {
    const link = document.createElement('a');
    link.href = `data:text/plain;charset=utf-8,Liquidación ${payroll.periodoPago}`;
    link.download = `liquidacion_${payroll.periodoPago}.txt`;
    link.click();
  };

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPagos = useMemo(() => {
    if (!normalizedQuery) {
      return pagos;
    }

    return pagos.filter((pago) => {
      return [
        pago.nombreEmpleado,
        pago.apellidoEmpleado,
        pago.legajoEmpleado,
        pago.cuil,
        pago.periodoPago
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(normalizedQuery));
    });
  }, [pagos, normalizedQuery]);

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
            </div>
            <Calendar className="stat-icon primary" />
          </div>
          <div className="stat-footer">
            <span className="stat-label">Liquidaciones Totales</span>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value success">{formatCurrency(totals.totalNeto)}</div>
            </div>
            <DollarSign className="stat-icon success" />
          </div>
          <div className="stat-footer">
            <span className="stat-label">Total Neto Acumulado</span>
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
            <div className="search-section" style={{ marginBottom: '1.5rem' }}>
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
              <span className="results-count">
                Mostrando {filteredTotals.totalPagos} de {totals.totalPagos} liquidaciones — Neto{' '}
                {formatCurrency(filteredTotals.totalNeto)}
              </span>
            </div>

            {/* Content */}
            {loading ? (
              <LoadingSpinner message="Cargando pagos..." size="md" className="list-loading" />
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
                      <div className="employee-actions">
                        <button
                          className="action-icon-button view-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(pago);
                          }}
                          title="Ver detalle de liquidación"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Eye size={20} className="text-green-600" />
                        </button>
                      </div>
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

      {/* Payroll Detail Modal - Reused from Liquidacion.jsx */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPayroll(null);
          setPayrollDetails(null);
        }}
        title={`Detalle de Liquidación`}
        size="large"
        className="process-payroll-modal"
      >
        {loadingDetails ? (
          <LoadingSpinner message="Cargando detalles..." size="md" className="table-loading" />
        ) : selectedPayroll && payrollDetails && (
          <div className="receipt-preview">
            <div className="receipt-container">
              <div className="receipt-stamp">
                <CheckCircle className="stamp-icon" />
                <span>RECIBO GENERADO</span>
              </div>

              <div className="receipt-header">
                <div className="company-info">
                  <div className="company-logo">
                    <div className="logo-circle">
                      <img src="/logo192.png" alt="Logo Empresa" className="logo-image" />
                    </div>
                  </div>
                  <div className="company-details">
                    <h3>COOP.SERV.PUB.25 DE MAYO LTDA.</h3>
                    <p>Domicilio: RAMIREZ 367 - CUIT: 30-54569238-0</p>
                    <div className="company-accent"></div>
                  </div>
                </div>
              </div>

              <div className="receipt-employee-info">
                <div className="employee-data">
                  <div className="data-row">
                    <span className="label">APELLIDO Y NOMBRE:</span>
                    <span className="value">{selectedPayroll.nombreEmpleado || ''} {selectedPayroll.apellidoEmpleado || ''}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">PERÍODO DE PAGO:</span>
                    <span className="value">{selectedPayroll.periodoPago || payrollDetails.periodoPago || '-'}</span>
                  </div>
                </div>
                <div className="employee-meta">
                  <div className="meta-item">
                    <span className="label">LEGAJO:</span>
                    <span className="value">{selectedPayroll.legajoEmpleado || '-'}</span>
                  </div>
                  {payrollDetails.categoriaEmpleado && (
                    <div className="meta-item">
                      <span className="label">CATEGORÍA:</span>
                      <span className="value">{payrollDetails.categoriaEmpleado}</span>
                    </div>
                  )}
                </div>
              </div>

              {payrollDetails.conceptos && payrollDetails.conceptos.length > 0 ? (
                <>
                  <div className="receipt-concepts">
                    <div className="concepts-header">
                      <span>CONCEPTO</span>
                      <span>UNIDADES</span>
                      <span>REMUNERACIONES</span>
                      <span>DESCUENTOS</span>
                    </div>

                    {payrollDetails.conceptos.map((concepto, index) => {
                      const isRemuneration =
                        concepto.tipoConcepto === 'CATEGORIA' ||
                        concepto.tipoConcepto === 'BONIFICACION_VARIABLE' ||
                        concepto.tipoConcepto === 'BONIFICACION_FIJA' ||
                        concepto.tipoConcepto === 'CATEGORIA_ZONA';
                      const isDeduction = concepto.tipoConcepto === 'DESCUENTO';
                      const total = Number(concepto.total || 0);
                      const unidades = concepto.unidades || concepto.cantidad || 0;

                      return (
                        <div key={index} className="concept-line">
                          <span className="concept-code">{concepto.idReferencia || concepto.id || index + 1}</span>
                          <span className="concept-name">{concepto.nombre || `Concepto ${index + 1}`}</span>
                          <span className="concept-units">{unidades}</span>
                          <span className="concept-remuneration">
                            {isRemuneration && total > 0 ? total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                          </span>
                          <span className="concept-deduction">
                            {isDeduction && total < 0 ? Math.abs(total).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    const remunerations = payrollDetails.conceptos
                      .filter(c =>
                        c.tipoConcepto === 'CATEGORIA' ||
                        c.tipoConcepto === 'BONIFICACION_VARIABLE' ||
                        c.tipoConcepto === 'BONIFICACION_FIJA' ||
                        c.tipoConcepto === 'CATEGORIA_ZONA'
                      )
                      .reduce((sum, c) => sum + (Number(c.total) || 0), 0);

                    const deductions = payrollDetails.conceptos
                      .filter(c => c.tipoConcepto === 'DESCUENTO')
                      .reduce((sum, c) => sum + Math.abs(Number(c.total) || 0), 0);

                    const netAmount = (payrollDetails.total || payrollDetails.total_neto || selectedPayroll.total_neto || remunerations - deductions);

                    return (
                      <div className="receipt-totals">
                        <div className="total-breakdown">
                          <div className="breakdown-line">
                            <span>Total Remuneraciones:</span>
                            <span className="amount-positive">+${remunerations.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="breakdown-line">
                            <span>Total Descuentos:</span>
                            <span className="amount-negative">-${deductions.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="total-line">
                          <span>TOTAL NETO:</span>
                          <span className="final-amount">${netAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <div className="amount-indicator"></div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="receipt-footer">
                    <div className="payment-info">
                      <span>LUGAR Y FECHA DE PAGO: HASENKAMP - {
                        selectedPayroll.fechaPago || payrollDetails.fechaPago
                          ? new Date(selectedPayroll.fechaPago || payrollDetails.fechaPago).toLocaleDateString('es-AR')
                          : new Date().toLocaleDateString('es-AR')
                      }</span>
                    </div>
                    {(() => {
                      return (
                        <div className="amount-words-section">
                          <label className="amount-words-label">SON PESOS:</label>
                          <input
                            type="text"
                            className="amount-words-input"
                            value={amountInWords}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                              setAmountInWords(value);
                            }}
                            placeholder="Escriba el monto en palabras..."
                          />
                        </div>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p>No se encontraron detalles de conceptos para esta liquidación.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Cerrar
          </Button>
          {selectedPayroll && (
            <>
              <Button variant="success" icon={Printer} iconPosition="left" onClick={() => handlePrintPayroll(selectedPayroll)}>
                Imprimir
              </Button>
              <Button variant="primary" icon={Download} iconPosition="left" onClick={() => handleDownloadPayroll(selectedPayroll)}>
                Descargar
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
