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
  const [recentActivities, setRecentActivities] = useState([]);

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
    const loadAll = async () => {
      await Promise.all([
        countActiveEmployees(),
        countGremios(),
        loadEmployees(),
        loadDashboardStats(),
        loadRecentActivities()
      ]);
    };
    loadAll();
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

  const loadRecentActivities = async () => {
    try {
      const liquidaciones = await api.getUltimosPagos();
      // Tomar solo las últimas 5
      const ultimas5 = (liquidaciones || []).slice(0, 5);
      
      // Formatear las actividades
      const actividades = ultimas5.map((liq) => {
        const nombreCompleto = `${liq.nombreEmpleado || ''} ${liq.apellidoEmpleado || ''}`.trim() || 'Empleado';
        const monto = liq.total_neto ? `$${Number(liq.total_neto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null;
        
        // Calcular tiempo relativo
        let tiempoRelativo = 'hace un momento';
        if (liq.fechaCreacion || liq.fecha || liq.createdAt) {
          const fecha = new Date(liq.fechaCreacion || liq.fecha || liq.createdAt);
          const ahora = new Date();
          const diffMs = ahora - fecha;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          
          if (diffMins < 1) {
            tiempoRelativo = 'hace un momento';
          } else if (diffMins < 60) {
            tiempoRelativo = `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
          } else if (diffHours < 24) {
            tiempoRelativo = `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
          } else if (diffDays < 7) {
            tiempoRelativo = `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
          } else {
            const diffWeeks = Math.floor(diffDays / 7);
            tiempoRelativo = `hace ${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'}`;
          }
        }
        
        return {
          id: liq.id || liq.idLiquidacion || liq.idPago,
          action: 'Liquidación procesada',
          employee: nombreCompleto,
          time: tiempoRelativo,
          amount: monto
        };
      });
      
      setRecentActivities(actividades);
    } catch (error) {
      console.error('Error al cargar actividades recientes:', error);
      setRecentActivities([]);
    }
  };

  const handleProcessPayroll = (result) => {
    console.log('Procesamiento completado:', result);
    // Refrescar datos después de procesar una liquidación
    countActiveEmployees(); // Refrescar conteo
    loadRecentActivities(); // Refrescar actividades recientes
    loadDashboardStats(); // Refrescar estadísticas
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
      await loadRecentActivities(); // Refrescar actividades (aunque no se muestren empleados agregados, por si acaso)
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
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
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
                  ))
                ) : (
                  <div className="activity-empty">
                    <p>No hay actividades recientes</p>
                  </div>
                )}
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