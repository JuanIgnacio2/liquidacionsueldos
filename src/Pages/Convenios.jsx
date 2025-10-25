import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MapPin, Settings, Download, TrendingUp, Users, Calculator, Upload } from 'lucide-react';
import { ConvenioCard } from '../Components/ConvenioCard/ConvenioCard.jsx';
import { Modal, ModalFooter } from '../Components/Modal/Modal.jsx';
import '../styles/components/_convenios.scss';
import * as api from '../services/empleadosAPI';

export default function Convenios() {
  const navigate = useNavigate();
  const [convenios, setConvenios] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedConvenio, setSelectedConvenio] = useState(null);

  const normalizeConvenios = (rows) =>
    rows.map((c,i) => ({
      id: i + 1,
      name: c.nombreConvenio,
      sector: c.nombreConvenio,
      description: c.descripcion,
      employeeCount: c.empleadosActivos,
      categories: c.cantidadCategorias,
      cantAreas: c.cantidadAreas,
      cantZonas: c.cantidadZonas,
      controller: c.controller,
      status: 'Activo',
    }));
  
  useEffect(() => {
  const loadConvenios = async () => {
    try {
      const response = await api.getConvenios();
      setConvenios(normalizeConvenios(response));
    } catch (err) {
      console.error("Error cargando convenios:", err);
    }
  };

  loadConvenios();
}, []);

  const handleViewConvenio = (controller) => {
    navigate(`/convenios/${controller}`);
  };

  const handleEditConvenio = (convenio) => {
    setSelectedConvenio(convenio);
    setShowEditModal(true);
  };

  const handleUploadDocument = (convenio) => {
    setSelectedConvenio(convenio);
    setShowUploadModal(true);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && selectedConvenio) {
      const newDocument = {
        name: file.name,
        uploadDate: new Date().toISOString().split('T')[0]
      };

      setConvenios(prev => 
        prev.map(conv => 
          conv.id === selectedConvenio.id 
            ? { ...conv, documents: [...conv.documents, newDocument] }
            : conv
        )
      );

      if (window.showNotification) {
        window.showNotification(`Documento "${file.name}" subido exitosamente`, 'success');
      }

      setShowUploadModal(false);
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowUploadModal(false);
    setSelectedConvenio(null);
  };

  const totalEmpleados = convenios.reduce((total, conv) => total + conv.employeeCount || 0, 0);
  const totalCategorias = convenios.reduce((total, conv) => total + conv.categories || 0, 0);

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
      </div>

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value success">{convenios.length}</div>
              <p className="stat-label">Convenios Activos</p>
            </div>
            <FileText className="stat-icon success" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value primary">
                {totalEmpleados}
              </div>
              <p className="stat-label">Total Empleados</p>
            </div>
            <Users className="stat-icon primary" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value warning">
                {totalCategorias}
              </div>
              <p className="stat-label">Total Categorías</p>
            </div>
            <Calculator className="stat-icon warning" />
          </div>
        </div>
      </div>

      {/* Convenios Cards */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title section-title-effect">
            <FileText className="title-icon" />
            Convenios Activos
          </h2>
          <p className="card-description">
            Gestiona los convenios colectivos vigentes
          </p>
        </div>
        <div className="card-content">
          <div className="convenios-grid">
            {convenios.map((convenio) => (
              <ConvenioCard
                key={convenio.controller}
                convenio={convenio}
                onView={handleViewConvenio}
                onEdit={handleEditConvenio}
                onUploadDocument={handleUploadDocument}
              />
            ))}
          </div>
        </div>
      </div>

      {/* View Convenio Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={closeModals}
        title={`Convenio - ${selectedConvenio?.name}`}
        size="large"
      >
        {selectedConvenio && (
          <div className="convenio-view-content">
            <div className="view-grid">
              <div className="view-section">
                <h3>Información General</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Sector:</span>
                    <span className="info-value">{selectedConvenio.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Empleados activos:</span>
                    <span className="info-value">
                      {selectedConvenio.employeeCount}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Categorías:</span>
                    <span className="info-value">{selectedConvenio.categoriesCount}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Descripción:</span>
                    <span className="info-value">
                      {selectedConvenio.description || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <ModalFooter>
          <button className="btn btn-secondary" onClick={closeModals}>
            Cerrar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleEditConvenio(selectedConvenio)}
          >
            Editar Convenio
          </button>
        </ModalFooter>
      </Modal>

      {/* Edit Convenio Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={closeModals}
        title={`Editar Convenio - ${selectedConvenio?.name ?? ""}`}
        size="large"
      >
        <div className="edit-form-placeholder">
          <p>Formulario de edición de convenio en desarrollo...</p>
        </div>
        
        <ModalFooter>
          <button className="btn btn-secondary" onClick={closeModals}>
            Cancelar
          </button>
          <button className="btn btn-primary">
            Guardar Cambios
          </button>
        </ModalFooter>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={closeModals}
        title={`Subir Documento - ${selectedConvenio?.name ?? ""}`}
        size="medium"
      >
        <div className="upload-content">
          <div className="upload-area">
            <Upload className="upload-icon" />
            <h3>Seleccionar archivo</h3>
            <p>Arrastra un archivo aquí o haz clic para seleccionar</p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="file-input"
            />
          </div>
          
          <div className="file-types">
            <p><strong>Tipos de archivo permitidos:</strong></p>
            <ul>
              <li>PDF (.pdf)</li>
              <li>Word (.doc, .docx)</li>
            </ul>
          </div>
        </div>
        
        <ModalFooter>
          <button className="btn btn-secondary" onClick={closeModals}>
            Cancelar
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}