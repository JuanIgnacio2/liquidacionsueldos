import React, {useEffect, useState} from 'react';
import { Calculator, Plus, TrendingUp, Clock, History, Settings, Printer, Download, FileText, CalendarDays, User } from 'lucide-react';
import '../styles/components/_PlaceHolder.scss';
import '../styles/components/_liquidacion.scss';
import {ProcessPayrollModal} from '../Components/ProcessPayrollModal/ProcessPayrollModal';
import {Modal, ModalFooter } from '../Components/Modal/Modal';
import * as api from '../services/empleadosAPI'

export default function Liquidacion() {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollList, setPayrollList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  
  const loadPayrolls = async () => {
    try {
      const data = await api.getPagos();
      setLiquidaciones(data);
    } catch (error) {
      console.error('Error al cargar las liquidaciones:', error);
    }
  };
  
  const loadEmployees = async () => {
    try {
      const data = await api.getEmployees(); 
      const ordenados = data.sort((a, b) => a.legajo - b.legajo);
      setEmployees(ordenados);
    } catch (error) {
      console.error('Error al cargar los empleados:', error);
    }
  };
  
  useEffect(() => {
    loadEmployees();
    loadPayrolls();
  }, []);

  const handleViewDetails = (payroll) => {
    setSelectedPayroll(payroll);
    setShowDetailModal(true);
  };

  const handleProcessPayroll = (result) => {
    console.log('Procesamiento completado:', result);
    // Aquí puedes actualizar la lista con el nuevo resultado
  };

  const handlePrintPayroll = (payroll) => {
    console.log('Imprimiendo liquidación:', payroll.periodName);
    window.print();
  };

  const handleDownloadPayroll = (payroll) => {
    console.log('Descargando liquidación:', payroll.periodName);
    const link = document.createElement('a');
    link.href = `data:text/plain;charset=utf-8,Liquidación ${payroll.periodName}`;
    link.download = `liquidacion_${payroll.period}.txt`;
    link.click();
  };

  const filteredPayrolls = payrollList.filter(payroll => {
    const matchesSearch = payroll.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payroll.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payroll.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || payroll.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = payrollList.filter(p => p.status === 'Pendiente').length;
  const completedCount = payrollList.filter(p => p.status === 'Procesada').length;
  const totalMonthAmount = payrollList.reduce((sum, p) => sum + p.netSalary, 0);



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
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value warning">8</div>
              <p className="stat-label">Pendientes</p>
            </div>
            <Clock className="stat-icon warning" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value success">116</div>
              <p className="stat-label">Completadas</p>
            </div>
            <TrendingUp className="stat-icon success" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value primary">$2,847,500</div>
              <p className="stat-label">Total del Mes</p>
            </div>
            <Calculator className="stat-icon primary" />
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="main-content">
        <div className="card main-section">
          {liquidaciones.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <h3>Todavía no hay liquidaciones</h3>
              <p>Cuando se generen, aparecerán aquí.</p>
            </div>
            ) : (
            <div className="payroll-grid">
              {liquidaciones.map((liq) => (
                <div
                  key={liq.id}
                  className="payroll-card employee-payroll"
                  onClick={() => console.log(`Ver detalle de ${liq.id}`)}
                >
                  <div className="payroll-header">
                    <div className="payroll-period">
                      <CalendarDays className="period-icon" />
                      <span className="period-name">{liq.periodoPago}</span>
                    </div>
                    <span className={`payroll-status ${liq.estado}`}>
                      {liq.estado ? liq.estado.charAt(0).toUpperCase() + liq.estado.slice(1) : 'Completada'}
                    </span>
                  </div>

                  <div className="salary-breakdown">
                    <div className="salary-item total">
                      <span className="salary-label">Total</span>
                      <span className="salary-value">
                        ${(liq.total_neto ?? 0).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>

                  <div className="payroll-period-info">
                    <div className="period-detail">
                      <User className="period-icon" />
                      <span>
                        {liq.nombreEmpleado} {liq.apellidoEmpleado} - Legajo: {liq.legajoEmpleado}
                      </span>
                    </div>
                    <span className="payment-date">
                      Pago: {liq.fechaPago}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <button className="action-btn warning">
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

      {/* Payroll Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Liquidación - ${selectedPayroll?.employeeName}`}
        size="large"
      >
        {selectedPayroll && (
          <div className="employee-payroll-detail">
            <div className="employee-header">
              <div className="employee-info-detail">
                <h3>{selectedPayroll.employeeName}</h3>
                <p>{selectedPayroll.position} - {selectedPayroll.department}</p>
                <p>ID: {selectedPayroll.employeeId}</p>
              </div>
              <div className={`status-badge ${selectedPayroll.status.toLowerCase()}`}>
                {selectedPayroll.status}
              </div>
            </div>

            <div className="liquidation-breakdown">
              <div className="breakdown-section">
                <h4>Conceptos Remunerativos</h4>
                <div className="concept-list">
                  <div className="concept-item">
                    <span className="concept-name">Sueldo Básico</span>
                    <span className="concept-amount">${selectedPayroll.basicSalary.toLocaleString()}</span>
                  </div>
                  <div className="concept-item">
                    <span className="concept-name">Presentismo</span>
                    <span className="concept-amount">${(selectedPayroll.bonifications * 0.4).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                  </div>
                  <div className="concept-item">
                    <span className="concept-name">Antigüedad</span>
                    <span className="concept-amount">${(selectedPayroll.bonifications * 0.6).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                  </div>
                </div>
                <div className="section-total positive">
                  <span>Total Remunerativo:</span>
                  <span>${(selectedPayroll.basicSalary + selectedPayroll.bonifications).toLocaleString()}</span>
                </div>
              </div>

              <div className="breakdown-section">
                <h4>Descuentos</h4>
                <div className="concept-list">
                  <div className="concept-item">
                    <span className="concept-name">Jubilación (11%)</span>
                    <span className="concept-amount">-${Math.round(selectedPayroll.basicSalary * 0.11).toLocaleString()}</span>
                  </div>
                  <div className="concept-item">
                    <span className="concept-name">Obra Social (3%)</span>
                    <span className="concept-amount">-${Math.round(selectedPayroll.basicSalary * 0.03).toLocaleString()}</span>
                  </div>
                  <div className="concept-item">
                    <span className="concept-name">ANSSAL (3%)</span>
                    <span className="concept-amount">-${Math.round(selectedPayroll.basicSalary * 0.03).toLocaleString()}</span>
                  </div>
                </div>
                <div className="section-total negative">
                  <span>Total Descuentos:</span>
                  <span>-${selectedPayroll.deductions.toLocaleString()}</span>
                </div>
              </div>

              <div className="final-total">
                <span className="total-label">NETO A COBRAR:</span>
                <span className="total-amount">${selectedPayroll.netSalary.toLocaleString()}</span>
              </div>
            </div>

            <div className="liquidation-info">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Período:</span>
                  <span className="info-value">{selectedPayroll.periodName}</span>
                </div>
                {selectedPayroll.processedDate && (
                  <div className="info-item">
                    <span className="info-label">Fecha de Proceso:</span>
                    <span className="info-value">{new Date(selectedPayroll.processedDate).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
                {selectedPayroll.paymentDate && (
                  <div className="info-item">
                    <span className="info-label">Fecha de Pago:</span>
                    <span className="info-value">{new Date(selectedPayroll.paymentDate).toLocaleDateString('es-ES')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-actions">
              <button className="btn btn-primary" onClick={() => handlePrintPayroll(selectedPayroll)}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Recibo
              </button>
              <button className="btn btn-secondary" onClick={() => handleDownloadPayroll(selectedPayroll)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </button>
            </div>
          </div>
        )}
        
        <ModalFooter>
          <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
            Cerrar
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}