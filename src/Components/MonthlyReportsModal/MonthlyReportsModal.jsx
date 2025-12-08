import React, { useState } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { Calendar, Download, Eye, BarChart3, Users, DollarSign, TrendingUp, FileText } from 'lucide-react';

const monthlyReports = [
  {
    id: 1,
    month: '2024-01',
    monthName: 'Enero 2024',
    totalEmployees: 124,
    totalLiquidations: 124,
    totalAmount: 15847300,
    averageSalary: 127800,
    status: 'Completado'
  },
  {
    id: 2,
    month: '2023-12',
    monthName: 'Diciembre 2023',
    totalEmployees: 122,
    totalLiquidations: 122,
    totalAmount: 18956400,
    averageSalary: 155300,
    status: 'Completado'
  },
  {
    id: 3,
    month: '2023-11',
    monthName: 'Noviembre 2023',
    totalEmployees: 120,
    totalLiquidations: 120,
    totalAmount: 14567200,
    averageSalary: 121400,
    status: 'Completado'
  },
  {
    id: 4,
    month: '2023-10',
    monthName: 'Octubre 2023',
    totalEmployees: 118,
    totalLiquidations: 118,
    totalAmount: 14234800,
    averageSalary: 120600,
    status: 'Completado'
  }
];

export function MonthlyReportsModal({ isOpen, onClose }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowDetails(true);
  };

  const handleDownloadReport = (report) => {
    console.log('Descargando reporte:', report.monthName);
    const link = document.createElement('a');
    link.href = `data:text/plain;charset=utf-8,Reporte Mensual ${report.monthName}`;
    link.download = `reporte_${report.month}.pdf`;
    link.click();
  };

  const handlePrintReport = (report) => {
    console.log('Imprimiendo reporte:', report.monthName);
    window.print();
  };

  const resetModal = () => {
    setSelectedReport(null);
    setShowDetails(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetModal}
      title="Reportes Mensuales de Liquidación"
      size="large"
      className="monthly-reports-modal"
    >
      {!showDetails ? (
        <div className="reports-list">
          <div className="reports-header">
            <h3>Seleccionar Período</h3>
            <p>Elija el mes para ver el reporte detallado de liquidaciones</p>
          </div>

          <div className="reports-grid">
            {monthlyReports.map((report) => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <div className="report-period">
                    <Calendar className="period-icon" />
                    <span className="period-name">{report.monthName}</span>
                  </div>
                  <div className={`report-status ${report.status.toLowerCase()}`}>
                    {report.status}
                  </div>
                </div>

                <div className="report-metrics">
                  <div className="metric-item">
                    <Users className="metric-icon" />
                    <div className="metric-content">
                      <span className="metric-value">{report.totalEmployees}</span>
                      <span className="metric-label">Empleados</span>
                    </div>
                  </div>

                  <div className="metric-item">
                    <FileText className="metric-icon" />
                    <div className="metric-content">
                      <span className="metric-value">{report.totalLiquidations}</span>
                      <span className="metric-label">Liquidaciones</span>
                    </div>
                  </div>

                  <div className="metric-item">
                    <DollarSign className="metric-icon" />
                    <div className="metric-content">
                      <span className="metric-value">${(report.totalAmount / 1000000).toFixed(1)}M</span>
                      <span className="metric-label">Total Pagado</span>
                    </div>
                  </div>

                  <div className="metric-item">
                    <TrendingUp className="metric-icon" />
                    <div className="metric-content">
                      <span className="metric-value">${(report.averageSalary / 1000).toFixed(0)}K</span>
                      <span className="metric-label">Promedio</span>
                    </div>
                  </div>
                </div>

                <div className="report-actions">
                  <button 
                    className="report-btn view"
                    onClick={() => handleViewReport(report)}
                  >
                    <Eye className="btn-icon" />
                    Ver Detalle
                  </button>
                  <button 
                    className="report-btn download"
                    onClick={() => handleDownloadReport(report)}
                  >
                    <Download className="btn-icon" />
                    Descargar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="report-details">
          <div className="detail-header">
            <button 
              className="back-btn" 
              onClick={() => setShowDetails(false)}
            >
              ← Volver a la lista
            </button>
            <h3>Reporte Detallado - {selectedReport.monthName}</h3>
          </div>

          <div className="detail-summary">
            <div className="summary-card">
              <div className="summary-icon">
                <Users className="icon" />
              </div>
              <div className="summary-content">
                <span className="summary-title">Total Empleados</span>
                <span className="summary-value">{selectedReport.totalEmployees}</span>
                <span className="summary-subtitle">Procesados exitosamente</span>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">
                <DollarSign className="icon" />
              </div>
              <div className="summary-content">
                <span className="summary-title">Monto Total</span>
                <span className="summary-value">${selectedReport.totalAmount.toLocaleString()}</span>
                <span className="summary-subtitle">Pagado en el período</span>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon">
                <BarChart3 className="icon" />
              </div>
              <div className="summary-content">
                <span className="summary-title">Salario Promedio</span>
                <span className="summary-value">${selectedReport.averageSalary.toLocaleString()}</span>
                <span className="summary-subtitle">Por empleado</span>
              </div>
            </div>
          </div>

          <div className="detail-breakdown">
            <h4>Desglose por Departamento</h4>
            <div className="breakdown-table">
              <div className="table-header">
                <span>Departamento</span>
                <span>Empleados</span>
                <span>Total Pagado</span>
                <span>Promedio</span>
              </div>
              <div className="table-row">
                <span>IT</span>
                <span>35</span>
                <span>$4,250,000</span>
                <span>$121,429</span>
              </div>
              <div className="table-row">
                <span>Marketing</span>
                <span>18</span>
                <span>$1,890,000</span>
                <span>$105,000</span>
              </div>
              <div className="table-row">
                <span>Ventas</span>
                <span>25</span>
                <span>$3,125,000</span>
                <span>$125,000</span>
              </div>
              <div className="table-row">
                <span>Finanzas</span>
                <span>22</span>
                <span>$2,640,000</span>
                <span>$120,000</span>
              </div>
              <div className="table-row">
                <span>RRHH</span>
                <span>12</span>
                <span>$1,320,000</span>
                <span>$110,000</span>
              </div>
              <div className="table-row">
                <span>Operaciones</span>
                <span>12</span>
                <span>$2,622,300</span>
                <span>$218,525</span>
              </div>
            </div>
          </div>

          <div className="detail-actions">
            <button 
              className="btn btn-primary"
              onClick={() => handlePrintReport(selectedReport)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Imprimir Reporte
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => handleDownloadReport(selectedReport)}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </button>
          </div>
        </div>
      )}

      <ModalFooter>
        <button className="btn btn-secondary" onClick={resetModal}>
          Cerrar
        </button>
      </ModalFooter>
    </Modal>
  );
}