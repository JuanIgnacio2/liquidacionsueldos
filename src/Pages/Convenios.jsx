import React from 'react';
import { FileText, Search, Plus, Calendar, Users, AlertTriangle } from 'lucide-react';

export default function Convenios() {
  return (
    <div className="dashboard">
      <div className="header">
        <div className="title-section">
          <h1>Convenios Colectivos</h1>
          <p>Gestión de acuerdos salariales y condiciones laborales</p>
        </div>
        <button className="btn">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Convenio
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="content">
            <div className="text">
              <h3>Total Convenios</h3>
              <div className="value">15</div>
              <p className="change">Activos</p>
            </div>
            <FileText className="icon text-primary" />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <div className="text">
              <h3>Vigentes</h3>
              <div className="value">12</div>
              <p className="change">En curso</p>
            </div>
            <Calendar className="icon text-success" />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <div className="text">
              <h3>Por Renovar</h3>
              <div className="value">2</div>
              <p className="change">Próximos 90 días</p>
            </div>
            <AlertTriangle className="icon text-warning" />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <div className="text">
              <h3>Empleados Cubiertos</h3>
              <div className="value">128</div>
              <p className="change">Total</p>
            </div>
            <Users className="icon" style={{ color: '#3b82f6' }} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar convenios..." 
                className="input pl-10"
              />
            </div>
            <button className="btn btn-outline">Filtrar por Sector</button>
            <button className="btn btn-outline">Próximos a Vencer</button>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="chart-card">
        <div className="header">
          <h2>
            <FileText className="icon" />
            Lista de Convenios
          </h2>
        </div>
        <div className="content">
          <div className="chart-placeholder">
            <FileText className="icon" />
            <p className="title">Sección en desarrollo</p>
            <p className="subtitle">Esta funcionalidad estará disponible próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
