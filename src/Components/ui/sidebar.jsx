import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  FileText, 
  Calculator, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../Hooks/useNotification';
import '../../styles/components/_sidebar.scss';

const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    title: 'Empleados',
    href: '/empleados',
    icon: Users,
  },
  {
    title: 'Convenios',
    href: '/convenios',
    icon: FileText,
  },
  {
    title: 'Liquidación',
    href: '/liquidacion',
    icon: Calculator,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true); // Inicia colapsado
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const notify = useNotification();

  // El sidebar está expandido cuando no está colapsado
  const isExpanded = !collapsed;

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    logout();
    notify.success('Sesión cerrada exitosamente');
    navigate('/login');
  };

  return (
    <div 
      className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}
    >
      {/* Header */}
      <div className={`sidebar-header ${!isExpanded ? 'collapsed' : ''}`}>
        <div className="header-content">
          {isExpanded && (
            <div className="brand">
              <DollarSign className="brand-icon" />
              <h1 className="brand-text">Liq. Sueldos</h1>
            </div>
          )}
          {!isExpanded && (
            <DollarSign className="brand-icon" />
          )}
          <button
            onClick={handleToggle}
            className="toggle-btn"
            title={isExpanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
          >
            {isExpanded ? (
              <ChevronLeft className="toggle-icon" />
            ) : (
              <ChevronRight className="toggle-icon" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.href} className="nav-item">
                <Link
                  to={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  title={!isExpanded ? item.title : undefined}
                >
                  <Icon className="nav-icon" />
                  {isExpanded && (
                    <span className="nav-text">{item.title}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="sidebar-logout">
        <button
          onClick={handleLogout}
          className={`logout-btn ${!isExpanded ? 'collapsed' : ''}`}
          title={!isExpanded ? 'Cerrar sesión' : undefined}
        >
          <LogOut className="logout-icon" />
          {isExpanded && <span className="logout-text">Cerrar Sesión</span>}
        </button>
        {isExpanded && user && (
          <div className="user-info">
            <p className="user-name">{user.username || user.name || 'Usuario'}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`sidebar-footer ${!isExpanded ? 'collapsed' : ''}`}>
        {isExpanded ? (
          <div className="footer-content">
            <p>Gestión de Sueldos</p>
            <p className="version">v1.0.0</p>
          </div>
        ) : (
          <div className="footer-content">
            <span className="version">v1.0</span>
          </div>
        )}
      </div>
    </div>
  );
}