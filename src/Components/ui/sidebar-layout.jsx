import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  FileText,
  Calculator,
  Menu,
  X,
  DollarSign
} from 'lucide-react';
import '../../styles/components/_sidebar.scss';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Empleados', href: '/empleados', icon: Users },
  { name: 'Convenios', href: '/convenios', icon: FileText },
  { name: 'Liquidaciones', href: '/liquidaciones', icon: Calculator },
];

export function SidebarLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="sidebar-layout">
      {/* Sidebar */}
      <div className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <DollarSign className="icon" />
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <h1>PayrollPro</h1>
                <p>Gestión de Sueldos</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`sidebar-toggle ${collapsed ? 'collapsed' : 'expanded'}`}
          >
            {collapsed ? (
              <Menu className="icon" />
            ) : (
              <X className="icon" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`sidebar-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                  >
                    <item.icon className="icon" />
                    {!collapsed && item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="sidebar-user">
          <div className={`sidebar-user-info ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-user-avatar">
              <span>JI</span>
            </div>
            {!collapsed && (
              <div className="sidebar-user-text">
                <p className="name">Juan Ignacio</p>
                <p className="role">Administrador</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`main-content ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
        {children}
      </div>
    </div>
  );
}