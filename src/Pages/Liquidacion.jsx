import React, {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Plus, TrendingUp, Clock, History, Settings, FileText, DollarSign, Eye } from 'lucide-react';
import {ProcessPayrollModal} from '../Components/ProcessPayrollModal/ProcessPayrollModal';
import PayrollDetailModal from '../Components/PayrollDetailModal/PayrollDetailModal';
import { StatsGrid } from '../Components/ui/card';
import {LoadingSpinner} from '../Components/ui/LoadingSpinner';
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
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
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
    loadEmployees();
    loadPayrolls();
    loadDashboardStats();
    setLoading(false);
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

  const statsList = [
    {
      label: 'Total Bruto Mes',
      value: dashboardStats?.totalBrutoMes ? `$${Number(dashboardStats.totalBrutoMes).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
      icon: DollarSign,
      colorClass: 'primary'
    },
    {
      label: 'Liquidaciones Hechas',
      value: dashboardStats?.cantidadLiquidacionesHechas ?? '—',
      icon: TrendingUp,
      colorClass: 'success'
    },
    {
      label: 'Liquidaciones Pendientes',
      value: dashboardStats?.cantidadLiquidacionesPendientes ?? '—',
      icon: Clock,
      colorClass: 'warning'
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
            <p className="subtitle">
              Procesa y gestiona las liquidaciones de sueldos de los empleados
            </p>
          </div>
        </div>
        <LoadingSpinner
          message="Cargando lista de empleados..."
          size="lg"
          className="list-loading"
        />
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
      <StatsGrid
        className="stats-overview"
        stats={statsList.map(s => ({
          icon: s.icon,
          value: s.value,
          label: s.label,
          colorClass: s.colorClass
        }))}
      />

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
        onClose={() => {
          setShowProcessModal(false);
          loadPayrolls();}}
        onProcess={handleProcessPayroll}
        employees={employees}
      />

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