import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  FileText, 
  Calculator, 
  ChevronLeft, 
  ChevronRight,
  DollarSign
} from 'lucide-react';
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

  // El sidebar está expandido cuando no está colapsado
  const isExpanded = !collapsed;

  const handleToggle = () => {
    setCollapsed(!collapsed);
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