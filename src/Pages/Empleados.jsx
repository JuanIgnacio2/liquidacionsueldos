import React from 'react';
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, Calendar, Building } from 'lucide-react';

export default function Empleados() {
  const employees = [
    {
      id: 1,
      name: 'María González',
      position: 'Gerente de Ventas',
      department: 'Ventas',
      email: 'maria.gonzalez@empresa.com',
      phone: '+54 11 1234-5678',
      startDate: '2022-03-15',
      salary: '$150.000',
      status: 'active'
    },
    {
      id: 2,
      name: 'Carlos Ruiz',
      position: 'Desarrollador Senior',
      department: 'Tecnología',
      email: 'carlos.ruiz@empresa.com',
      phone: '+54 11 2345-6789',
      startDate: '2023-01-10',
      salary: '$120.000',
      status: 'active'
    },
    {
      id: 3,
      name: 'Ana López',
      position: 'Contadora',
      department: 'Administración',
      email: 'ana.lopez@empresa.com',
      phone: '+54 11 3456-7890',
      startDate: '2021-08-20',
      salary: '$95.000',
      status: 'active'
    },
    {
      id: 4,
      name: 'Juan Pérez',
      position: 'Analista Marketing',
      department: 'Marketing',
      email: 'juan.perez@empresa.com',
      phone: '+54 11 4567-8901',
      startDate: '2023-06-01',
      salary: '$85.000',
      status: 'vacation'
    },
    {
      id: 5,
      name: 'Sofia Martín',
      position: 'Diseñadora UX',
      department: 'Diseño',
      email: 'sofia.martin@empresa.com',
      phone: '+54 11 5678-9012',
      startDate: '2022-11-30',
      salary: '$110.000',
      status: 'active'
    }
  ];

  const getStatusBadge = (status) => {
    const labels = {
      active: 'Activo',
      vacation: 'Vacaciones',
      inactive: 'Inactivo'
    };
    
    return (
      <span className={`badge status-badge ${status}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="employees">
      {/* Header */}
      <div className="header">
        <div className="title-section">
          <h1>Empleados</h1>
          <p>Gestión del personal de la empresa</p>
        </div>
        <button className="btn">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Empleado
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="content">
            <Users className="icon text-primary" />
            <div className="text">
              <p className="label">Total Empleados</p>
              <p className="value">124</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <Calendar className="icon text-success" />
            <div className="text">
              <p className="label">Activos</p>
              <p className="value">118</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <Building className="icon text-warning" />
            <div className="text">
              <p className="label">Departamentos</p>
              <p className="value">8</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <Plus className="icon" style={{ color: '#3b82f6' }} />
            <div className="text">
              <p className="label">Nuevos (Este Mes)</p>
              <p className="value">6</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="content">
          <div className="search-input-container">
            <Search className="search-icon" />
            <input 
              type="text"
              placeholder="Buscar empleados..." 
              className="search-input"
            />
          </div>
          <div className="filter-actions">
            <button className="btn btn-outline">Filtrar</button>
            <button className="btn btn-outline">Exportar</button>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="employees-list">
        <div className="header">
          <h2>
            <Users className="icon" />
            Lista de Empleados
          </h2>
        </div>
        <div className="content">
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="employee-item">
                <div className="employee-header">
                  <div className="employee-info">
                    <div className="avatar">
                      <span>
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="details">
                      <h3>{employee.name}</h3>
                      <p>{employee.position}</p>
                      <div className="meta">
                        <span className="meta-item">
                          <Building className="icon" />
                          {employee.department}
                        </span>
                        <span className="meta-item">
                          <Calendar className="icon" />
                          Desde {new Date(employee.startDate).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="employee-actions">
                    <div className="salary-info">
                      <p className="amount">{employee.salary}</p>
                      <p className="label">Salario mensual</p>
                    </div>
                    
                    <div className="status">
                      {getStatusBadge(employee.status)}
                    </div>
                    
                    <div className="actions">
                      <button className="btn">
                        <Edit className="icon" />
                      </button>
                      <button className="btn">
                        <Mail className="icon" />
                      </button>
                      <button className="btn delete">
                        <Trash2 className="icon" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="employee-contact">
                  <div className="contact-info">
                    <span className="contact-item">
                      <Mail className="icon" />
                      {employee.email}
                    </span>
                    <span className="contact-item">
                      <Phone className="icon" />
                      {employee.phone}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
