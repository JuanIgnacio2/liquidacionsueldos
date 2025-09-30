import React, { useState } from 'react';
import { Eye, Edit, Upload, Download, Users, Calendar, DollarSign, FileText } from 'lucide-react';
import { Tooltip } from '../ToolTip/ToolTip';
import './ConvenioCard.scss';

export function ConvenioCard({ convenio, onView, onEdit, onUploadDocument }) {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  return (
    <div className="convenio-card">
      <div className="convenio-header">
        <div className="convenio-title">
          <FileText className="convenio-icon" />
          <div className="title-content">
            <h3 className="convenio-name">{convenio.name}</h3>
            <span className="convenio-sector">{convenio.sector}</span>
          </div>
        </div>
        <div className={`convenio-status ${convenio.status.toLowerCase()}`}>
          {convenio.status}
        </div>
      </div>

      <div className="convenio-summary">
        <div className="summary-item">
          <Users className="summary-icon" />
          <div className="summary-content">
            <span className="summary-value">{convenio.employeeCount}</span>
            <span className="summary-label">Empleados</span>
          </div>
        </div>
        
        <div className="summary-item">
          <DollarSign className="summary-icon" />
          <div className="summary-content">
            <span className="summary-value">{formatCurrency(convenio.basicSalary)}</span>
            <span className="summary-label">Básico</span>
          </div>
        </div>

        <div className="summary-item">
          <Calendar className="summary-icon" />
          <div className="summary-content">
            <span className="summary-value">{formatDate(convenio.lastUpdate)}</span>
            <span className="summary-label">Última actualización</span>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="convenio-details">
          <div className="details-grid">
            <div className="detail-group">
              <h4>Información General</h4>
              <div className="detail-item">
                <span className="detail-label">Vigencia:</span>
                <span className="detail-value">{formatDate(convenio.startDate)} - {formatDate(convenio.endDate)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Rama de actividad:</span>
                <span className="detail-value">{convenio.activityBranch}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Ámbito:</span>
                <span className="detail-value">{convenio.scope}</span>
              </div>
            </div>

            <div className="detail-group">
              <h4>Escalas Salariales</h4>
              {convenio.salaryScales.map((scale, index) => (
                <div key={index} className="scale-item">
                  <span className="scale-category">{scale.category}</span>
                  <span className="scale-amount">{formatCurrency(scale.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="convenio-documents">
            <h4>Documentos</h4>
            <div className="documents-list">
              {convenio.documents.map((doc, index) => (
                <div key={index} className="document-item">
                  <FileText className="document-icon" />
                  <span className="document-name">{doc.name}</span>
                  <span className="document-date">{formatDate(doc.uploadDate)}</span>
                  <button className="document-download" title="Descargar">
                    <Download className="download-icon" />
                  </button>
                </div>
              ))}
              
              <button 
                className="upload-document-btn"
                onClick={() => onUploadDocument && onUploadDocument(convenio)}
              >
                <Upload className="upload-icon" />
                <span>Subir documento</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="convenio-actions">
        <button 
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Ocultar detalles' : 'Ver detalles'}
        </button>

        <div className="action-buttons">
          <Tooltip content="Ver convenio completo" position="top">
            <button 
              className="action-btn view"
              onClick={() => onView && onView(convenio)}
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

          <Tooltip content="Subir documento" position="top">
            <button 
              className="action-btn upload"
              onClick={() => onUploadDocument && onUploadDocument(convenio)}
            >
              <Upload className="action-icon" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}