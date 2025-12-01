import React, {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Plus, TrendingUp, Clock, History, Settings, Printer, Download, FileText, DollarSign, User, Eye, CheckCircle } from 'lucide-react';
import {ProcessPayrollModal} from '../Components/ProcessPayrollModal/ProcessPayrollModal';
import {Modal, ModalFooter } from '../Components/Modal/Modal';
import { useNotification } from '../Hooks/useNotification';
import '../styles/components/_PlaceHolder.scss';
import '../styles/components/_liquidacion.scss';
import * as api from '../services/empleadosAPI'

export default function Liquidacion() {
  const notify = useNotification();
  const navigate = useNavigate();
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [payrollList, setPayrollList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [dashboardStats, setDashboardStats] = useState(null);
  
  const loadPayrolls = async () => {
    try {
      const data = await api.getUltimosPagos();
      setLiquidaciones(data);
    } catch (error) {
      notify.error('Error al cargar las liquidaciones');
    }
  };
  
  const loadEmployees = async () => {
    try {
      const data = await api.getEmployees(); 
      const ordenados = data.sort((a, b) => a.legajo - b.legajo);
      setEmployees(ordenados);
    } catch (error) {
      notify.error('Error al cargar los empleados');
    }
  };
  
  useEffect(() => {
    loadEmployees();
    loadPayrolls();
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setDashboardStats(data || null);
    } catch (error) {
      console.error('Error al cargar estadísticas del dashboard:', error);
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
      notify.error('Error al cargar detalles de la liquidación');
      notify('No se pudieron cargar los detalles de la liquidación.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleProcessPayroll = (result) => {
    notify('Procesamiento completado:', result);
    // Actualizar la lista de liquidaciones después de procesar
    loadPayrolls();
  };

  const handlePrintPayroll = (payroll) => {
    notify('Imprimiendo liquidación:', payroll.periodName);
    window.print();
  };

  const handleDownloadPayroll = (payroll) => {
    notify('Descargando liquidación:', payroll.periodName);
    const link = document.createElement('a');
    link.href = `data:text/plain;charset=utf-8,Liquidación ${payroll.periodName}`;
    link.download = `liquidacion_${payroll.period}.txt`;
    link.click();
  };

  const pendingCount = payrollList.filter(p => p.status === 'Pendiente').length;
  const completedCount = payrollList.filter(p => p.status === 'Procesada').length;
  const totalMonthAmount = payrollList.reduce((sum, p) => sum + p.netSalary, 0);

  const statsList = [
    {
      title: 'Total Bruto Mes',
      value: dashboardStats?.totalBrutoMes ? `$${Number(dashboardStats.totalBrutoMes).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
      icon: Calculator,
      colorClass: 'primary'
    },
    {
      title: 'Total Neto Mes',
      value: dashboardStats?.totalNetoMes ? `$${Number(dashboardStats.totalNetoMes).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
      icon: DollarSign,
      colorClass: 'success'
    },
    {
      title: 'Cantidad Empleados',
      value: dashboardStats?.cantidadEmpleados ?? '—',
      icon: User,
      colorClass: 'primary'
    },
    {
      title: 'Liquidaciones Hechas',
      value: dashboardStats?.cantidadLiquidacionesHechas ?? '—',
      icon: TrendingUp,
      colorClass: 'success'
    },
    {
      title: 'Liquidaciones Pendientes',
      value: dashboardStats?.cantidadLiquidacionesPendientes ?? '—',
      icon: Clock,
      colorClass: 'warning'
    }
  ];

  return (
    <div className="placeholder-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="title title-gradient animated-title">
            Liquidación de Sueldos
          </h1>
          <p className="subtitle">
            Procesa y gestiona las liquidaciones de sueldos de los empleados
          </p>
        </div>
        <button className="add-btn" onClick={() => setShowProcessModal(true)}>
          <Plus className="btn-icon" />
          Nueva Liquidación
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statsList.map((s) => (
          <div key={s.title} className="card stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <div className={`stat-value ${s.colorClass}`}>{s.value}</div>
                <p className="stat-label">{s.title}</p>
              </div>
              <s.icon className={`stat-icon ${s.colorClass}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Content */}
      <div className="main-content">
        <div className="card employees-list">
          <div className="card-header list-header">
            <h2 className="list-title section-title-effect">Lista de Liquidaciones</h2>
            <p className="list-description">
              {liquidaciones.length} liquidación{liquidaciones.length !== 1 ? 'es' : ''} encontrada{liquidaciones.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="card-content list-content">
            {liquidaciones.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-icon" />
                <h3>Todavía no hay liquidaciones</h3>
                <p>Cuando se generen, aparecerán aquí.</p>
              </div>
            ) : (
              <div className="employee-list">
                {liquidaciones.map((liq) => (
                  <div
                    key={liq.id}
                    className="employee-item"
                  >
                    <div className="employee-grid">
                      <div className="employee-info">
                        <h3 className="employee-name">{`${liq.nombreEmpleado || ''} ${liq.apellidoEmpleado || ''}`}</h3>
                        <p className="employee-email">Legajo: {liq.legajoEmpleado || '-'}</p>
                      </div>
                      <div className="employee-position">
                        <p className="position-title">Período: {liq.periodoPago || '-'}</p>
                        <p className="department">Fecha Pago: {liq.fechaPago ? new Date(liq.fechaPago).toLocaleDateString('es-AR') : '-'}</p>
                      </div>
                      <div className="employee-salary">
                        <p className="salary-amount">
                          ${(liq.total_neto ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="hire-date">Total Neto</p>
                      </div>
                      <div className="employee-status">
                        <span className={`status-badge ${liq.estado?.toLowerCase() || 'completada'}`}>
                          {liq.estado ? liq.estado.charAt(0).toUpperCase() + liq.estado.slice(1) : 'Completada'}
                        </span>
                      </div>
                    </div>
                    <div className="employee-actions">
                      <button
                        className="action-icon-button view-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(liq);
                        }}
                        title="Ver detalle"
                      >
                        <Eye className="action-icon" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card quick-actions">
          <div className="card-header">
            <h2 className="card-title section-title-effect">Acciones Rápidas</h2>
            <p className="card-description">
              Próximas funcionalidades
            </p>
          </div>
          <div className="card-content">
            <div className="actions-list">
              <button className="action-btn primary" onClick={() => setShowProcessModal(true)}>
                <span>Procesar Liquidación</span>
                <Calculator className="action-icon" />
              </button>
              <button className="action-btn success">
                <span>Generar Reportes</span>
                <TrendingUp className="action-icon" />
              </button>
              <button className="action-btn warning" onClick={() => navigate('/historial-pagos')}>
                <span>Historial</span>
                <History className="action-icon" />
              </button>
              <button className="action-btn secondary">
                <span>Configuración</span>
                <Settings className="action-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modals */}
      <ProcessPayrollModal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        onProcess={handleProcessPayroll}
        employees={employees}
      />

      {/* Payroll Detail Modal - Formato Recibo */}
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
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Cargando detalles...</p>
          </div>
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
                      <span>C</span>
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
                        <div className="amount-words">
                          <span>SON PESOS: {netAmount.toLocaleString('es-AR')} * * * *</span>
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
          <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
            Cerrar
          </button>
          {selectedPayroll && (
            <>
              <button className="btn btn-success" onClick={() => handlePrintPayroll(selectedPayroll)}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </button>
              <button className="btn btn-primary" onClick={() => handleDownloadPayroll(selectedPayroll)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </button>
            </>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}