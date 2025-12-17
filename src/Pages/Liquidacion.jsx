import React, {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Plus, TrendingUp, Clock, History, Settings, Printer, Download, FileText, DollarSign, User, Eye, CheckCircle, Search, ChevronDown, Users } from 'lucide-react';
import {ProcessPayrollModal} from '../Components/ProcessPayrollModal/ProcessPayrollModal';
import {Modal, ModalFooter } from '../Components/Modal/Modal';
import { useNotification } from '../Hooks/useNotification';
import '../styles/components/_PlaceHolder.scss';
import '../styles/components/_liquidacion.scss';
import * as api from '../services/empleadosAPI'
import { Button } from '../Components/ui/button';
import { StatCard } from '../Components/ui/StatCard';
import { LoadingSpinner } from '../Components/ui/LoadingSpinner';

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
  const [amountInWords, setAmountInWords] = useState('');
  const [loading, setLoading] = useState(true);
  
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
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        loadEmployees(),
        loadPayrolls(),
        loadDashboardStats()
      ]);
      setLoading(false);
    };
    loadAll();
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

  // Calcular estadísticas desde liquidaciones
  const pendingCount = liquidaciones.filter(liq => {
    const estado = (liq.estado || '').toLowerCase();
    return estado === 'pendiente' || estado === 'p';
  }).length;
  
  const completedCount = liquidaciones.filter(liq => {
    const estado = (liq.estado || '').toLowerCase();
    // Usar la misma lógica que en la lista: si no es pendiente, es procesada/completada
    const isPendiente = estado === 'pendiente' || estado === 'p';
    return !isPendiente;
  }).length;
  
  const totalMonthAmount = liquidaciones.reduce((sum, liq) => {
    return sum + (Number(liq.total_neto) || 0);
  }, 0);

  // Filtrar liquidaciones según búsqueda y estado
  const filteredLiquidaciones = liquidaciones.filter(liq => {
    const matchesSearch = !searchTerm || 
      `${liq.nombreEmpleado || ''} ${liq.apellidoEmpleado || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (liq.legajoEmpleado || '').toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'Todos' || 
      (statusFilter === 'Pendientes' && ((liq.estado || '').toLowerCase() === 'pendiente' || (liq.estado || '').toLowerCase() === 'p')) ||
      (statusFilter === 'Procesadas' && ((liq.estado || '').toLowerCase() === 'procesada' || (liq.estado || '').toLowerCase() === 'completada'));
    
    return matchesSearch && matchesStatus;
  });

  const statsList = [
    {
      title: 'Pendientes',
      value: pendingCount,
      icon: Clock,
      colorClass: 'warning'
    },
    {
      title: 'Completadas',
      value: completedCount,
      icon: null,
      colorClass: 'primary'
    },
    {
      title: 'Total del Mes',
      value: `$${totalMonthAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      colorClass: 'success'
    }
  ];

  if (loading) {
    return (
      <div className="placeholder-page">
        <div className="page-header">
          <div className="header-content">
            <h1 className="title title-gradient animated-title">
              Liquidación de Sueldos
            </h1>
          </div>
        </div>
        <LoadingSpinner message="Cargando liquidaciones..." size="lg" className="list-loading" />
      </div>
    );
  }

  return (
    <div className="placeholder-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="title title-gradient animated-title">
            Liquidación de Sueldos
          </h1>
        </div>
        <Button 
          variant="primary"
          icon={Plus}
          iconPosition="left"
          onClick={() => setShowProcessModal(true)}
        >
          Nueva Liquidación
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="stats-overview">
        {statsList.map((s, index) => (
          <StatCard
            key={s.title}
            title={s.title}
            value={s.value}
            colorClass={s.colorClass}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-container">
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por empleado, cargo o departamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-controls">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Pendientes">Pendientes</option>
            <option value="Procesadas">Procesadas</option>
          </select>
          <ChevronDown className="filter-arrow" />
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="card liquidaciones-table-container">
          <div className="card-header list-header">
            <h2 className="list-title section-title-effect">Liquidaciones Recientes</h2>
            <p className="list-description">
              Historial de liquidaciones procesadas
            </p>
          </div>
          <div className="card-content">
            {filteredLiquidaciones.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-icon" />
                <h3>Todavía no hay liquidaciones</h3>
                <p>Cuando se generen, aparecerán aquí.</p>
              </div>
            ) : (
              <table className="liquidaciones-table">
                <thead>
                  <tr>
                    <th>EMPLEADO</th>
                    <th>PERÍODO</th>
                    <th>NETO</th>
                    <th>ESTADO</th>
                    <th>FECHA PAGO</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLiquidaciones.map((liq) => {
                    const estado = (liq.estado || '').toLowerCase();
                    const isPendiente = estado === 'pendiente' || estado === 'p';
                    const isProcesada = estado === 'procesada' || estado === 'completada' || estado === 'completado' || estado === 'procesado';
                    
                    return (
                      <tr key={liq.id || `${liq.legajoEmpleado}-${liq.periodoPago}`} className="liquidacion-row">
                        <td className="employee-cell">
                          <div className="employee-info-table">
                            <Users className="employee-icon-table" />
                            <div className="employee-details-table">
                              <div className="employee-name-table">
                                {`${liq.nombreEmpleado || ''} ${liq.apellidoEmpleado || ''}`}
                              </div>
                              <div className="employee-position-table">
                                {employees.find(emp => emp.legajo === liq.legajoEmpleado)?.categoriaNombre || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="period-cell">
                          {liq.periodoPago || '-'}
                        </td>
                        <td className="neto-cell">
                          <span className="neto-amount">
                            ${(liq.total_neto ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="status-cell">
                          <span className={`status-badge ${isPendiente ? 'pendiente' : isProcesada ? 'procesada' : 'completada'}`}>
                            {isPendiente ? 'PENDIENTE' : isProcesada ? 'PROCESADA' : 'PROCESADA'}
                          </span>
                        </td>
                        <td className="date-cell">
                          {isPendiente ? 'Pendiente' : (liq.fechaPago ? new Date(liq.fechaPago).toLocaleDateString('es-AR') : '-')}
                        </td>
                        <td className="actions-cell">
                          <div className="table-actions">
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
                            <button
                              className="action-icon-button print-action"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintPayroll(liq);
                              }}
                              title="Imprimir"
                            >
                              <Printer className="action-icon" />
                            </button>
                            <button
                              className="action-icon-button download-action"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPayroll(liq);
                              }}
                              title="Descargar"
                            >
                              <Download className="action-icon" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              <Button variant="primary" icon={FileText} iconPosition="left" fullWidth onClick={() => setShowProcessModal(true)}>
                Procesar Liquidación
              </Button>
              <Button variant="primary" icon={TrendingUp} iconPosition="left" fullWidth onClick={() => navigate('/reportes')}>
                Estadísticas
              </Button>
              <Button variant="primary" icon={History} iconPosition="left" fullWidth onClick={() => navigate('/historial-pagos')}>
                Historial
              </Button>
              <Button variant="primary" icon={Settings} iconPosition="left" fullWidth>
                Configuración
              </Button>
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