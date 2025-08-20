import React from 'react';
import { FileText, Plus, Settings } from 'lucide-react';
import '../styles/components/_PlaceHolder.scss';

export default function Convenios() {
  return (
    <div className="placeholder-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="title title-gradient animated-title">
            Gestión de Convenios
          </h1>
          <p className="subtitle">
            Administra los convenios colectivos de trabajo y sus escalas salariales
          </p>
        </div>
        <button className="add-btn">
          <Plus className="btn-icon" />
          Nuevo Convenio
        </button>
      </div>

      {/* Placeholder Content */}
      <div className="main-content">
        <div className="card main-section">
          <div className="card-header section-header">
            <h2 className="section-title section-title-effect">
              <FileText className="title-icon" />
              Convenios Activos
            </h2>
            <p className="section-description">
              Lista de todos los convenios colectivos vigentes
            </p>
          </div>
          <div className="card-content">
            <div className="placeholder-content">
              <FileText className="placeholder-icon" />
              <h3 className="placeholder-title">Página en Desarrollo</h3>
              <p className="placeholder-description">
                Esta sección estará disponible próximamente. Aquí podrás gestionar todos los convenios colectivos de trabajo.
              </p>
              <p className="placeholder-note">
                Continúa desarrollando la aplicación para completar esta funcionalidad.
              </p>
            </div>
          </div>
        </div>

        <div className="card sidebar-section">
          <div className="card-header section-header">
            <h2 className="section-title section-title-effect">
              <Settings className="title-icon" />
              Configuración
            </h2>
            <p className="section-description">
              Próximas funcionalidades
            </p>
          </div>
          <div className="card-content">
            <div className="features-list">
              <div className="feature-item">
                <h4 className="feature-title">Escalas Salariales</h4>
                <p className="feature-description">Gestión de escalas por convenio</p>
              </div>
              <div className="feature-item">
                <h4 className="feature-title">Categorías</h4>
                <p className="feature-description">Administrar categorías laborales</p>
              </div>
              <div className="feature-item">
                <h4 className="feature-title">Actualizaciones</h4>
                <p className="feature-description">Historial de cambios en convenios</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}