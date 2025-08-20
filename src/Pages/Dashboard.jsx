import { Users, FileText, Calculator, TrendingUp, DollarSign, Clock } from 'lucide-react';
import '../styles/components/_dashboard.scss';

export default function Dashboard() {
  const stats = [
    {
      title: 'Total Empleados',
      value: '124',
      change: '+12%',
      icon: Users,
      trend: 'up'
    },
    {
      title: 'Liquidaciones Pendientes',
      value: '8',
      change: '-3',
      icon: Clock,
      trend: 'down'
    },
    {
      title: 'Monto Total Mensual',
      value: '$2,847,500',
      change: '+8.2%',
      icon: DollarSign,
      trend: 'up'
    },
    {
      title: 'Convenios Activos',
      value: '15',
      change: '+2',
      icon: FileText,
      trend: 'up'
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
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="card stat-card">
              <div className="stat-header">
                <h3 className="stat-title">
                  {stat.title}
                </h3>
                <Icon className="stat-icon" />
              </div>
              <div className="stat-content">
                <div className="stat-value">{stat.value}</div>
                <p className={`stat-change ${stat.trend === 'up' ? 'positive' : 'negative'}`}>
                  {stat.change} desde el mes pasado
                </p>
              </div>
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
              <button className="action-btn primary">
                <span>Nueva Liquidación</span>
                <Calculator className="action-icon" />
              </button>
              <button className="action-btn success">
                <span>Agregar Empleado</span>
                <Users className="action-icon" />
              </button>
              <button className="action-btn warning">
                <span>Ver Reportes</span>
                <TrendingUp className="action-icon" />
              </button>
              <button className="action-btn secondary">
                <span>Gestionar Convenios</span>
                <FileText className="action-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}