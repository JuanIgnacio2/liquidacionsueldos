import React from 'react';
import { Calculator, Plus, Clock, CheckCircle, Calendar, Play } from 'lucide-react';

export default function Liquidaciones() {
  return (
    <div className="dashboard">
      <div className="header">
        <div className="title-section">
          <h1>Liquidación de Sueldos</h1>
          <p>Procesamiento y gestión de nóminas</p>
        </div>
        <div className="actions">
          <button className="btn btn-outline">
            <Calculator className="w-4 h-4 mr-2" />
            Calcular Período
          </button>
          <button className="btn">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Liquidación
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="content">
            <div className="text">
              <h3>Total Este Mes</h3>
              <div className="value">$2.450.000</div>
              <p className="change">Nómina mensual</p>
            </div>
            <Calculator className="icon text-primary" />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <div className="text">
              <h3>Pendientes</h3>
              <div className="value">8</div>
              <p className="change">Por procesar</p>
            </div>
            <Clock className="icon text-warning" />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <div className="text">
              <h3>Completadas</h3>
              <div className="value">116</div>
              <p className="change">Este período</p>
            </div>
            <CheckCircle className="icon text-success" />
          </div>
        </div>
        
        <div className="stat-card">
          <div className="content">
            <div className="text">
              <h3>Próximo Pago</h3>
              <div className="value">18 Nov</div>
              <p className="change">Fecha límite</p>
            </div>
            <Calendar className="icon" style={{ color: '#3b82f6' }} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Play className="w-5 h-5 mr-2 text-primary" />
            Acciones Rápidas
          </h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn btn-outline">Procesar Nómina Quincenal</button>
            <button className="btn btn-outline">Generar Recibos</button>
            <button className="btn btn-outline">Exportar Reportes</button>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="chart-card">
        <div className="header">
          <h2>
            <Calculator className="icon" />
            Procesamiento de Liquidaciones
          </h2>
        </div>
        <div className="content">
          <div className="chart-placeholder">
            <Calculator className="icon" />
            <p className="title">Sección en desarrollo</p>
            <p className="subtitle">Esta funcionalidad estará disponible próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
