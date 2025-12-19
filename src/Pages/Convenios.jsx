import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, Calculator, Upload } from 'lucide-react';
import { ConvenioCard } from '../Components/ConvenioCard/ConvenioCard.jsx';
import { Modal, ModalFooter } from '../Components/Modal/Modal.jsx';
import {LoadingSpinner} from '../Components/ui/LoadingSpinner';
import {useNotification} from '../Hooks/useNotification';
import { StatsGrid } from '../Components/ui/card';
import '../styles/components/_convenios.scss';
import * as api from '../services/empleadosAPI';

export default function Convenios() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [convenios, setConvenios] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedConvenio, setSelectedConvenio] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
      const response = await api.getConvenios();
      setConvenios(normalizeConvenios(response));
    } catch (err) {
      notify.error("Error cargando convenios:", err);
    }
    finally {
      setLoading(false);
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

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowUploadModal(false);
    setSelectedConvenio(null);
  };

  const totalEmpleados = convenios.reduce((total, conv) => total + conv.employeeCount || 0, 0);
  const totalCategorias = convenios.reduce((total, conv) => total + conv.categories || 0, 0);

    const stats = [
  { icon: FileText, value: convenios.length, label: 'Convenios Activos', colorClass: 'success' },
  { icon: Users, value: totalEmpleados, label: 'Empleados Activos', colorClass: 'success' },
  { icon: Calculator, value: totalCategorias, label: 'Total de Categorías', colorClass: 'warning' },
  ];

  if (loading) {
    return (
      <div className="placeholder-page convenios">
        <div className="page-header">
          <div className="header-content">
            <h1 className="title title-gradient animated-title">
              Gestión de Convenios
            </h1>
            <p className="subtitle">Administra los convenios colectivos de trabajo y sus escalas salariales</p>
          </div>
        </div>
        <LoadingSpinner message="Cargando convenios..." size="lg" className="list-loading" />
      </div>
    );
  }

  return (
    <div className="placeholder-page convenios">
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
      <StatsGrid
        className="stats-overview"
        stats={stats.map(s => ({
          icon: s.icon,
          value: s.value,
          label: s.label,
          colorClass: s.colorClass
        }))}
      />

      {/* Convenios Cards */}
      <div className="conveniosContainer">
        <div className="convenios-header">
          <h2 className="convenios-title section-title-effect">
            <FileText className="title-icon" />
            Convenios Activos
          </h2>
          <p className="convenios-description">
            Gestiona los convenios colectivos vigentes
          </p>
        </div>
        <div className="convenios-content">
          <div className="convenios-grid">
            {convenios.map((convenio) => (
              <ConvenioCard
                key={convenio.controller}
                convenio={convenio}
                onView={handleViewConvenio}
                onEdit={handleEditConvenio}
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
    </div>
  );
}