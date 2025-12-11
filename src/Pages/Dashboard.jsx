import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Calculator, TrendingUp, DollarSign, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import '../styles/components/_dashboard.scss';
import * as api from '../services/empleadosAPI'
import { ProcessPayrollModal } from '../Components/ProcessPayrollModal/ProcessPayrollModal';
import { NewEmployeeModal } from '../Components/NewEmployeeModal/NewEmployeeModal';
import { Button } from '../Components/ui/button';
import { StatCard } from '../Components/ui/StatCard';
import { LoadingSpinner } from '../Components/ui/LoadingSpinner';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeEmployees, setActiveEmployees] = useState();
  const [gremiosCount, setGremiosCount] = useState();
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
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
      title: 'Monto Total Mensual Bruto',
      value: dashboardStats?.totalBrutoMes ? `$${Number(dashboardStats.totalBrutoMes).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Cargando...',
      icon: DollarSign,
      colorClass: 'primary',
    },
    {
      title: 'Monto Total Mensual Neto',
      value: dashboardStats?.totalNetoMes ? `$${Number(dashboardStats.totalNetoMes).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Cargando...',
      icon: DollarSign,
      colorClass: 'primary',
    },
    {
      title: 'Liquidaciones Pendientes',
      value: dashboardStats?.cantidadLiquidacionesPendientes ?? 'Cargando...',
      icon: Clock,
      colorClass: 'warning',
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

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1 className="title title-gradient animated-title">
            Gestión de Sueldos
          </h1>
        </div>
        <LoadingSpinner message="Cargando dashboard..." size="lg" className="list-loading" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="title title-gradient animated-title">
          Gestión de Sueldos
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="stats-overview">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            colorClass={stat.colorClass}
            delay={index * 0.1}
          />
        ))}
      </div>

      <div className="main-grid">
        {/* Recent Activity */}
        <div className="card activity-section">
          <div className="card-header activity-header">
            <h2 className="card-title section-title-effect">Actividad Reciente</h2>
            <p className="card-description">
              Últimas acciones realizadas en el sistema
            </p>
          </div>
          <div className="card-content activity-content">
            <div className="activity-table">
              <div className="activity-table-header">
                <div className="activity-col-header">Acción</div>
                <div className="activity-col-header">Empleado</div>
                <div className="activity-col-header">Monto</div>
                <div className="activity-col-header">Tiempo</div>
              </div>
              <div className="activity-list">
                {recentActivities.map((activity) => (
                  <div 
                    key={activity.id}
                    className="activity-item"
                  >
                    <div className="activity-col action-col">
                      <span className="activity-action">{activity.action}</span>
                    </div>
                    <div className="activity-col employee-col">
                      <span className="activity-employee">{activity.employee}</span>
                    </div>
                    <div className="activity-col amount-col">
                      <span className="activity-amount">{activity.amount || '-'}</span>
                    </div>
                    <div className="activity-col time-col">
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card quick-actions">
          <div className="card-header quick-actions-header">
            <h2 className="card-title section-title-effect">Acciones Rápidas</h2>
          </div>
          <div className="card-content">
            <div className="actions-list">
              <Button 
                variant="primary"
                icon={Calculator}
                iconPosition="left"
                fullWidth
                onClick={() => setShowProcessModal(true)}
              >
                Nueva Liquidación
              </Button>
              <Button 
                variant="primary"
                icon={Users}
                iconPosition="left"
                fullWidth
                onClick={() => setShowNewEmployeeModal(true)}
              >
                Agregar Empleado
              </Button>
              <Button 
                variant="primary"
                icon={TrendingUp}
                iconPosition="left"
                fullWidth
                onClick={() => navigate('/reportes')}
              >
                Estadísticas
              </Button>
              <Button 
                variant="primary"
                icon={FileText}
                iconPosition="left"
                fullWidth
                onClick={() => navigate('/convenios')}
              >
                Gestionar Convenios
              </Button>
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