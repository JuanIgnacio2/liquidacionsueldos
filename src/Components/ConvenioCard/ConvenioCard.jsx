import React, { useState } from 'react';
import { Eye, Edit, Upload, MapPin, Users, Calendar, Layers, FileText, Layers3Icon, Percent, List } from 'lucide-react';
import { Tooltip } from '../ToolTip/ToolTip';
import './ConvenioCard.scss';

export function ConvenioCard({ convenio, onView, onEdit, onUploadDocument }) {
  const [showDetails, setShowDetails] = useState(false);

  // Determinar si es una card especial (descuentos o conceptos generales)
  const isDescuentos = convenio.controller === 'descuentos';
  const isConceptosGenerales = convenio.controller === 'conceptos-generales';
  const isSpecialCard = isDescuentos || isConceptosGenerales;

  const isUocra = convenio.controller?.toUpperCase().includes('UOCRA');
  const isLuzYFuerza = convenio.controller?.toUpperCase().includes('LYF');
  
  // Determinar el icono según el tipo
  const getIcon = () => {
    if (isDescuentos) return Percent;
    if (isConceptosGenerales) return List;
    return FileText;
  };

  const IconComponent = getIcon();

  return (
    <div className="convenio-card" onClick={isSpecialCard ? () => onView && onView(convenio.controller) : undefined} style={isSpecialCard ? { cursor: 'pointer' } : {}}>
      <div className="convenio-header">
        <div className="convenio-title">
          <IconComponent className="convenio-icon" />
          <div className="title-content">
            <h3 className="convenio-name">{convenio.name}</h3>
          </div>
        </div>
        {!isSpecialCard && (
          <div className={`convenio-status ${convenio.status?.toLowerCase() || 'activo'}`}>
            {convenio.status || 'Activo'}
          </div>
        )}
      </div>

      {/* --- Resumen principal --- */}
      {isSpecialCard ? (
        <div className="convenio-description">
          <p>{convenio.description || 'Gestiona y visualiza la información'}</p>
        </div>
      ) : (
        <div className="convenio-summary">
          {/* Empleados */}
          <div className="summary-item">
            <Users className="summary-icon" />
            <div className="summary-content">
              <span className="summary-value">{convenio.employeeCount || 0}</span>
              <span className="summary-label">Empleados</span>
            </div>
          </div>

          {/* Categorías */}
          <div className="summary-item">
            <Layers className="summary-icon" />
            <div className="summary-content">
              <span className="summary-value">{convenio.categories || 0}</span>
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
      )}

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
      {!isSpecialCard && (
        <div className="convenio-actions">
          <div className="action-buttons">
            <Tooltip content="Ver convenio completo" position="top">
              <button
                className="action-btn view"
                onClick={(e) => {
                  e.stopPropagation();
                  onView && onView(convenio.controller);
                }}
              >
                <Eye className="action-icon" />
                <span>Ver convenio</span>
              </button>
            </Tooltip>
          </div>
        </div>
      )}
      {isSpecialCard && (
        <div className="convenio-actions">
          <div className="action-buttons">
            <span className="view-action-text">Ver {convenio.name.toLowerCase()} →</span>
          </div>
        </div>
      )}
    </div>
  );
}