import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Calculator, TrendingUp, DollarSign, Clock } from 'lucide-react';
import '../styles/components/_dashboard.scss';
import * as api from '../services/empleadosAPI'
import { ProcessPayrollModal } from '../Components/ProcessPayrollModal/ProcessPayrollModal';
import { NewEmployeeModal } from '../Components/NewEmployeeModal/NewEmployeeModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeEmployees, setActiveEmployees] = useState();
  const [gremiosCount, setGremiosCount] = useState();
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  const countActiveEmployees = async () => {
    try {
      const count = await api.getCountActiveEmployees();
      setActiveEmployees(count);
    } catch (error) {
      console.error('Error al obtener el conteo de empleados activos:', error);
    }
  };

  const countGremios = async () => {
    try {
      const count = await api.countConvenios();
      setGremiosCount(count);
    } catch (error) {
      console.error('Error al obtener el conteo de gremios:', error);
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
    countActiveEmployees();
    countGremios();
    loadEmployees();
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

  const handleProcessPayroll = (result) => {
    console.log('Procesamiento completado:', result);
    // Puedes agregar lógica adicional aquí si es necesario
    countActiveEmployees(); // Refrescar conteo
  };

  const handleSaveEmployee = async (dto, isEdit) => {
    try {
      if (isEdit) {
        await api.updateEmployee(dto.legajo, dto);
      } else {
        await api.createEmployee(dto);
      }
      await loadEmployees(); // Refrescar lista
      await countActiveEmployees(); // Refrescar conteo
      setShowNewEmployeeModal(false);
    } catch (err) {
      alert("Error al registrar empleado: " + err.message);
    }
  };

  const stats = [
    {
      title: 'Total Empleados Activos',
      value: dashboardStats?.cantidadEmpleados ?? activeEmployees ?? 'Cargando...',
      icon: Users,
      colorClass: 'success',
    },
    {
      title: 'Liquidaciones Pendientes',
      value: dashboardStats?.cantidadLiquidacionesPendientes ?? 'Cargando...',
      icon: Clock,
      colorClass: 'warning',
    },
    {
      title: 'Liquidaciones Procesadas',
      value: dashboardStats?.cantidadLiquidacionesHechas ?? 'Cargando...',
      icon: TrendingUp,
      colorClass: 'primary',
    },
    {
      title: 'Total Neto',
      value: dashboardStats?.totalNetoMes ? `$${Number(dashboardStats.totalNetoMes).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Cargando...',
      icon: DollarSign,
      colorClass: 'primary',
    },
    {
      title: 'Total Bruto',
      value: dashboardStats?.totalBrutoMes ? `$${Number(dashboardStats.totalBrutoMes).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Cargando...',
      icon: DollarSign,
      colorClass: 'primary',
    }
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Nueva liquidación procesada',
      employee: 'María González',
      time: 'hace 2 horas',
      amount: '$45,000'
    },
    {
      id: 2,
      action: 'Empleado agregado',
      employee: 'Carlos Rodríguez',
      time: 'hace 4 horas',
      amount: null
    },
    {
      id: 3,
      action: 'Convenio actualizado',
      employee: 'Convenio Metalúrgico',
      time: 'hace 1 día',
      amount: null
    },
    {
      id: 4,
      action: 'Liquidación completada',
      employee: 'Ana Martínez',
      time: 'hace 1 día',
      amount: '$52,300'
    }
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="title title-gradient animated-title">
          Dashboard de Gestión de Sueldos
        </h1>
        <p className="subtitle">
          Resumen de la actividad y métricas principales del sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-overview">
        {stats.map((stat) => {
          return (
            <div key={stat.title} className="card stat-card">
              <div className={`stat-value ${stat.colorClass}`}>
                {stat.value}
              </div>
              <p className="stat-label">{stat.title}</p>
            </div>
          );
        })}
      </div>

      <div className="main-grid">
        {/* Recent Activity */}
        <div className="card activity-section">
          <div className="card-header">
            <h2 className="card-title section-title-effect">Actividad Reciente</h2>
            <p className="card-description">
              Últimas acciones realizadas en el sistema
            </p>
          </div>
          <div className="card-content">
            <div className="activity-list">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className="activity-item"
                >
                  <div className="activity-info">
                    <p className="activity-action">{activity.action}</p>
                    <p className="activity-employee">
                      {activity.employee}
                    </p>
                  </div>
                  <div className="activity-details">
                    {activity.amount && (
                      <p className="activity-amount">
                        {activity.amount}
                      </p>
                    )}
                    <p className="activity-time">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card quick-actions">
          <div className="card-header">
            <h2 className="card-title section-title-effect">Acciones Rápidas</h2>
            <p className="card-description">
              Operaciones más utilizadas
            </p>
          </div>
          <div className="card-content">
            <div className="actions-list">
              <button 
                className="action-btn primary"
                onClick={() => setShowProcessModal(true)}
              >
                <span>Nueva Liquidación</span>
                <Calculator className="action-icon" />
              </button>
              <button 
                className="action-btn success"
                onClick={() => setShowNewEmployeeModal(true)}
              >
                <span>Agregar Empleado</span>
                <Users className="action-icon" />
              </button>
              <button className="action-btn warning"
                onClick={() => navigate('/reportes')}>
                <span>Resumenes</span>
                <TrendingUp className="action-icon" />
              </button>
              <button 
                className="action-btn secondary"
                onClick={() => navigate('/convenios')}
              >
                <span>Gestionar Convenios</span>
                <FileText className="action-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ProcessPayrollModal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        onProcess={handleProcessPayroll}
        employees={employees}
      />
      <NewEmployeeModal
        isOpen={showNewEmployeeModal}
        onClose={() => setShowNewEmployeeModal(false)}
        onSave={handleSaveEmployee}
      />
    </div>
  );
}