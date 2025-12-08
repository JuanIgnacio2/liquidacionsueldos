import React, { useState } from 'react';
import { Calculator, Plus, TrendingUp, Clock, History, Settings, Search, FileText, Users, Printer, Download, Eye, Calendar } from 'lucide-react';
import '../../PlaceHolder.scss';
import './Liquidacion.scss'
import { ProcessPayrollModal } from '../../Components/ProcessPayrollModal/ProcessPayrollModal';
import { Modal, ModalFooter } from '../../Components/Modal/Modal';
import '../../Components/ProcessPayrollModal/ProcessPayrollModal.scss';
import { useNavigate } from 'react-router-dom';

// Mock data for recent individual payrolls
const recentPayrolls = [
  {
    id: 1,
    employeeName: 'María González',
    employeeId: 1001,
    position: 'Desarrolladora Senior',
    department: 'IT',
    period: '2024-01',
    periodName: 'Enero 2024',
    basicSalary: 85000,
    bonifications: 12750,
    deductions: 18700,
    netSalary: 79050,
    status: 'Procesada',
    processedDate: '2024-02-01',
    paymentDate: '2024-02-05'
  },
  {
    id: 2,
    employeeName: 'Carlos Rodríguez',
    employeeId: 1002,
    position: 'Analista de Marketing',
    department: 'Marketing',
    period: '2024-01',
    periodName: 'Enero 2024',
    basicSalary: 65000,
    bonifications: 6500,
    deductions: 14300,
    netSalary: 57200,
    status: 'Procesada',
    processedDate: '2024-02-01',
    paymentDate: '2024-02-05'
  },
  {
    id: 3,
    employeeName: 'Ana Martínez',
    employeeId: 1003,
    position: 'Gerente de Ventas',
    department: 'Ventas',
    period: '2024-01',
    periodName: 'Enero 2024',
    basicSalary: 95000,
    bonifications: 19000,
    deductions: 20900,
    netSalary: 93100,
    status: 'Procesada',
    processedDate: '2024-02-01',
    paymentDate: '2024-02-05'
  },
  {
    id: 4,
    employeeName: 'Luis Pérez',
    employeeId: 1004,
    position: 'Contador',
    department: 'Finanzas',
    period: '2024-01',
    periodName: 'Enero 2024',
    basicSalary: 70000,
    bonifications: 7000,
    deductions: 15400,
    netSalary: 61600,
    status: 'Pendiente',
    processedDate: null,
    paymentDate: null
  },
  {
    id: 5,
    employeeName: 'Patricia Silva',
    employeeId: 1005,
    position: 'Diseñadora UX',
    department: 'IT',
    period: '2024-01',
    periodName: 'Enero 2024',
    basicSalary: 75000,
    bonifications: 11250,
    deductions: 16500,
    netSalary: 69750,
    status: 'Procesada',
    processedDate: '2024-02-01',
    paymentDate: '2024-02-05'
  }
];

export default function Liquidacion() {
  const navigate = useNavigate();
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollList, setPayrollList] = useState(recentPayrolls);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

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

  const handleViewHistorial = () => {
    navigate('/liquidacion-historial');
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
      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="card-content">
          <div className="search-filter-container">
            <div className="search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por empleado, cargo o departamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input search-input"
              />
            </div>
            <div className="filter-controls">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Procesada">Procesadas</option>
                <option value="Pendiente">Pendientes</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="main-content">
      {/* Recent Payrolls */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title section-title-effect">
            <FileText className="title-icon" />
            Liquidaciones Recientes
          </h2>
          <p className="card-description">
            Historial de liquidaciones procesadas
          </p>
        </div>
        <div className="card-content">
          {filteredPayrolls.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <h3>No se encontraron liquidaciones</h3>
              <p>
                {searchTerm || statusFilter !== 'Todos'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'No hay liquidaciones registradas aún'
                }
              </p>
            </div>
          ) : (
            <div className="payroll-grid">
              {filteredPayrolls.map((payroll) => (
                <div key={payroll.id} className="payroll-card employee-payroll compact">
                  <div className="compact-payroll-header">
                    <div className="compact-employee">
                      <Users className="employee-icon" />
                      <div className="employee-details">
                        <span className="employee-name">{payroll.employeeName}</span>
                        <span className="payroll-period">{payroll.periodName}</span>
                      </div>
                    </div>
                    <div className={`payroll-status ${payroll.status.toLowerCase()}`}>
                      {payroll.status}
                    </div>
                  </div>

                  <div className="compact-payroll-body">
                    <div className="net-amount">
                      <span className="label">Neto</span>
                      <span className="value">${payroll.netSalary.toLocaleString()}</span>
                    </div>
                    <div className="payment-summary">
                      <Calendar className="period-icon" />
                      <div className="payment-details">
                        <span className="label">Pago</span>
                        <span className="value">
                          {payroll.paymentDate
                            ? new Date(payroll.paymentDate).toLocaleDateString('es-ES')
                            : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="payroll-actions">
                    <button
                      className="action-btn view"
                      onClick={() => handleViewDetails(payroll)}
                      title="Ver detalles"
                    >
                      <Eye className="action-icon" />
                    </button>
                    <button
                      className="action-btn print"
                      onClick={() => handlePrintPayroll(payroll)}
                      title="Imprimir recibo"
                    >
                      <Printer className="action-icon" />
                    </button>
                    <button
                      className="action-btn download"
                      onClick={() => handleDownloadPayroll(payroll)}
                      title="Descargar recibo"
                    >
                      <Download className="action-icon" />
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
              <button className="action-btn primary">
                <span>Procesar Liquidación</span>
                <Calculator className="action-icon" />
              </button>
              <button className="action-btn success">
                <span>Generar Reportes</span>
                <TrendingUp className="action-icon" />
              </button>
              <button className="action-btn warning" onClick={handleViewHistorial}>
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
