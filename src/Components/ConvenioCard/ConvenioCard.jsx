import React, { useState } from 'react';
import { Eye, Edit, Upload, MapPin, Users, Calendar, Layers, FileText, Layers3Icon } from 'lucide-react';
import { Tooltip } from '../ToolTip/ToolTip';
import './ConvenioCard.scss';

export function ConvenioCard({ convenio, onView, onEdit, onUploadDocument }) {
  const [showDetails, setShowDetails] = useState(false);

  const isUocra = convenio.controller.toUpperCase().includes('UOCRA');
  const isLuzYFuerza = convenio.controller.toUpperCase().includes('LYF');
  
  return (
    <div className="convenio-card">
      <div className="convenio-header">
        <div className="convenio-title">
          <FileText className="convenio-icon" />
          <div className="title-content">
            <h3 className="convenio-name">{convenio.name}</h3>
          </div>
        </div>
        <div className={`convenio-status ${convenio.status.toLowerCase()}`}>
          {convenio.status}
        </div>
      </div>

      {/* --- Resumen principal --- */}
      <div className="convenio-summary">
        {/* Empleados */}
        <div className="summary-item">
          <Users className="summary-icon" />
          <div className="summary-content">
            <span className="summary-value">{convenio.employeeCount}</span>
            <span className="summary-label">Empleados</span>
          </div>
        </div>

        {/* Categorías */}
        <div className="summary-item">
          <Layers className="summary-icon" />
          <div className="summary-content">
            <span className="convenio-status">{convenio.categories}</span>
            <span className="summary-label">Categorías</span>
          </div>
        </div>

        {/* Zonas o Áreas */}
        {(isUocra || isLuzYFuerza) && (
          <div className="summary-item">
            <MapPin className="summary-icon" />
            <div className="summary-content">
              <span className="summary-value">
                {isUocra
                  ? convenio.cantZonas ?? 0
                  : convenio.cantAreas ?? 0}
              </span>
              <span className="summary-label">
                {isUocra ? "Total Zonas" : "Total Áreas"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* --- Detalles (colapsable) --- */}
      {showDetails && (
        <div className="convenio-details">
          <div className="details-grid">
            <div className="detail-group">
              <h4>Información General</h4>
              <div className="detail-item">
                <span className="detail-value">
                  {convenio.description || "Sin descripción"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Acciones --- */}
      <div className="convenio-actions">
        <button
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Ocultar detalles" : "Ver detalles"}
        </button>

        <div className="action-buttons">
          <Tooltip content="Ver convenio completo" position="top">
            <button
              className="action-btn view"
              onClick={() => onView(convenio.controller)}
            >
              <Eye className="action-icon" />
            </button>
          </Tooltip>

          <Tooltip content="Editar convenio" position="top">
            <button
              className="action-btn edit"
              onClick={() => onEdit && onEdit(convenio)}
            >
              <Edit className="action-icon" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}