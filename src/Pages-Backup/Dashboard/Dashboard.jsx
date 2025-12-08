import React from 'react';
import {
  Users,
  Calculator,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import Header from '../../Components/Header/Header';
import styles from './Dashboard.module.scss';

function Dashboard() {
  const stats = [
    {
      title: 'Empleados Activos',
      value: '124',
      change: '+12 este mes',
      icon: Users,
      color: 'text-primary'
    },
    {
      title: 'Liquidaciones Pendientes',
      value: '8',
      change: 'Vencen en 3 días',
      icon: Calculator,
      color: 'text-warning'
    },
    {
      title: 'Convenios Vigentes',
      value: '15',
      change: '2 por renovar',
      icon: FileText,
      color: 'text-primary'
    },
    {
      title: 'Total Nómina Mensual',
      value: '$2.450.000',
      change: '+5.2% vs mes anterior',
      icon: DollarSign,
      color: 'text-success'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'liquidation',
      title: 'Liquidación procesada - María González',
      time: 'Hace 2 horas',
      status: 'completed',
      amount: '$89.500'
    },
    {
      id: 2,
      type: 'employee',
      title: 'Nuevo empleado registrado - Carlos Ruiz',
      time: 'Hace 4 horas',
      status: 'pending',
      department: 'Ventas'
    },
    {
      id: 3,
      type: 'agreement',
      title: 'Convenio actualizado - Empleados Administrativos',
      time: 'Hace 1 día',
      status: 'completed',
      change: '+3% aumento salarial'
    },
    {
      id: 4,
      type: 'liquidation',
      title: 'Liquidación pendiente - Juan Pérez',
      time: 'Hace 2 días',
      status: 'warning',
      amount: '$125.000'
    }
  ];

  const upcomingTasks = [
    {
      id: 1,
      title: 'Procesamiento de nómina quincenal',
      date: '15 Nov 2024',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Renovación convenio sector construcción',
      date: '20 Nov 2024',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Revisión aumentos salariales Q4',
      date: '25 Nov 2024',
      priority: 'low'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-success" />;
      case 'pending':
        return <Clock className="text-warning" />;
      case 'warning':
        return <AlertCircle className="text-danger" />;
      default:
        return <Clock className="icon" style={{color:'#3b82f6'}}/>;
    }
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      high: 'badge-error',
      medium: 'badge-warning',
      low: 'badge'
    };

    const labels = {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja'
    };

    return(
      <span className={`badge ${variants[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <div className="title-section">
          <h1>Dashboard</h1>
          <p>Resumen de actividad del sistema de gestión de sueldos</p>
        </div>
        <div className="actions">
          <button className="btn btn-outline">
            <Calendar className="w-4 h-4 mr-2" />
            Generar Reporte
          </button>
          <button className="btn">
            <TrendingUp className="w-4 h-4 mr-2" />
            Procesar Nómina
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="content">
              <div className="text">
                <h3>{stat.title}</h3>
                <div className="value">{stat.value}</div>
                <p className="change">{stat.change}</p>
              </div>
              <stat.icon className={`icon ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="content-grid">
        {/* Recent Activity */}
        <div className="activity-card">
          <div className="header">
            <h2>
              <Clock className="icon" />
              Actividad Reciente
            </h2>
          </div>
          <div className="content">
            <div className="activity-list space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="status-icon">
                    {getStatusIcon(activity.status)}
                  </div>
                  <div className="content">
                    <p className="title">
                      {activity.title}
                    </p>
                    <div className="meta">
                      <p className="time">{activity.time}</p>
                      {activity.amount && (
                        <span className="badge badge-outline">
                          {activity.amount}
                        </span>
                      )}
                      {activity.department && (
                        <span className="badge">
                          {activity.department}
                        </span>
                      )}
                      {activity.change && (
                        <span className="badge badge-outline text-success">
                          {activity.change}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="tasks-card">
          <div className="header">
            <h2>
              <Calendar className="icon" />
              Próximas Tareas
            </h2>
          </div>
          <div className="content">
            <div className="tasks-list space-y-4">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-content">
                    <p className="title">
                      {task.title}
                    </p>
                    <p className="date">{task.date}</p>
                  </div>
                  <div className="priority">
                    {getPriorityBadge(task.priority)}
                  </div>
                </div>
              ))}
              <div className="view-all">
                <button className="btn btn-outline w-full">
                  Ver Todas las Tareas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Overview Chart Placeholder */}
      <div className="chart-card">
        <div className="header">
          <h2>
            <TrendingUp className="icon" />
            Resumen Mensual de Nómina
          </h2>
        </div>
        <div className="content">
          <div className="chart-placeholder">
            <TrendingUp className="icon" />
            <p className="title">Gráfico de tendencias mensuales</p>
            <p className="subtitle">Aquí se mostraría el análisis de datos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;