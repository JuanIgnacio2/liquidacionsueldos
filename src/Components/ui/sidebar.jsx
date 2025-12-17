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
import { useAuth } from '../../context/AuthContext';
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
  {
    title: 'Configuración',
    href: '/configuracion',
    icon: Settings,
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState('');
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    if (window?.showNotification) {
      window.showNotification('Sesión cerrada correctamente', 'success', 3000);
    }
    navigate('/login');
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
      {/* Header */}
      <div className={`sidebar-header ${collapsed ? 'collapsed' : ''}`}>
        <div className="header-content">
          {!collapsed && (
            <div className="brand">
              <DollarSign className="brand-icon" />
              <h1 className="brand-text">Liq. Sueldos</h1>
            </div>
          )}
          {collapsed && (
            <DollarSign className="brand-icon" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="toggle-btn"
          >
            {collapsed ? (
              <ChevronRight className="toggle-icon" />
            ) : (
              <ChevronLeft className="toggle-icon" />
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
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className="nav-icon" />
                  {!collapsed && (
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
          className="logout-btn"
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut className="logout-icon" />
          {!collapsed && <span className="logout-text">Cerrar Sesión</span>}
        </button>
      </div>

      {/* Footer */}
      <div className={`sidebar-footer ${collapsed ? 'collapsed' : ''}`}>
        {!collapsed ? (
          <div className="footer-content">
            {userName && (
              <p className="user-name">{userName}</p>
            )}
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