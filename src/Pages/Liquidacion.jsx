import React from 'react';
import { Calculator, Plus, TrendingUp, Clock, History, Settings } from 'lucide-react';
import '../styles/components/_PlaceHolder.scss';
import '../styles/components/_liquidacion.scss'

export default function Liquidacion() {
  return (
    <div className="placeholder-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="title title-gradient animated-title">
            Liquidación de Sueldos
          </h1>
          <p className="subtitle">
            Procesa y gestiona las liquidaciones de sueldos de los empleados
          </p>
        </div>
        <button className="add-btn">
          <Plus className="btn-icon" />
          Nueva Liquidación
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value warning">8</div>
              <p className="stat-label">Pendientes</p>
            </div>
            <Clock className="stat-icon warning" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value success">116</div>
              <p className="stat-label">Completadas</p>
            </div>
            <TrendingUp className="stat-icon success" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value primary">$2,847,500</div>
              <p className="stat-label">Total del Mes</p>
            </div>
            <Calculator className="stat-icon primary" />
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="main-content">
        <div className="card main-section">
          <div className="card-header section-header">
            <h2 className="section-title section-title-effect">
              <Calculator className="title-icon" />
              Liquidaciones Recientes
            </h2>
            <p className="section-description">
              Historial de liquidaciones procesadas
            </p>
          </div>
          <div className="card-content">
            <div className="placeholder-content">
              <Calculator className="placeholder-icon" />
              <h3 className="placeholder-title">Página en Desarrollo</h3>
              <p className="placeholder-description">
                Esta sección estará disponible próximamente. Aquí podrás procesar y gestionar todas las liquidaciones de sueldos.
              </p>
              <p className="placeholder-note">
                Continúa desarrollando la aplicación para completar esta funcionalidad.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card quick-actions">
          <div className="card-header">
            <h2 className="card-title section-title-effect">Acciones Rápidas</h2>
            <p className="card-description">
              Próximas funcionalidades
            </p>
          </div>
          <div className="card-content">
            <div className="actions-list">
              <button className="action-btn primary">
                <span>Procesar Liquidación</span>
                <Calculator className="action-icon" />
              </button>
              <button className="action-btn success">
                <span>Generar Reportes</span>
                <TrendingUp className="action-icon" />
              </button>
              <button className="action-btn warning">
                <span>Historial</span>
                <History className="action-icon" />
              </button>
              <button className="action-btn secondary">
                <span>Configuración</span>
                <Settings className="action-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}