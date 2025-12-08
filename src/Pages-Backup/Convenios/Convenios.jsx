import React, { useState } from 'react';
import { FileText, Plus, Settings, Download, TrendingUp, Users, Calculator, Upload } from 'lucide-react';
import { ConvenioCard } from '../../Components/ConvenioCard/ConvenioCard.jsx';
import { Modal, ModalFooter } from '../../Components/Modal/Modal.jsx';
import './Convenios.scss';
import { useNavigate } from 'react-router-dom';

// Mock data for convenios
const conveniosData = [
  {
    id: 1,
    name: 'Luz y Fuerza',
    sector: 'Energía Eléctrica',
    status: 'Activo',
    employeeCount: 45,
    basicSalary: 285000,
    lastUpdate: '2024-01-15',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    activityBranch: 'Servicios Eléctricos',
    scope: 'Nacional',
    salaryScales: [
      { category: 'Especialista A', amount: 350000 },
      { category: 'Especialista B', amount: 320000 },
      { category: 'Técnico A', amount: 285000 },
      { category: 'Técnico B', amount: 250000 },
      { category: 'Operario A', amount: 220000 },
      { category: 'Operario B', amount: 195000 }
    ],
    documents: [
      { name: 'Convenio Colectivo 2024.pdf', uploadDate: '2024-01-15' },
      { name: 'Escalas Salariales.pdf', uploadDate: '2024-01-20' },
      { name: 'Anexo Condiciones Laborales.pdf', uploadDate: '2024-02-01' }
    ]
  },
  {
    id: 2,
    name: 'UOCRA',
    sector: 'Construcción',
    status: 'Activo',
    employeeCount: 79,
    basicSalary: 260000,
    lastUpdate: '2024-02-01',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    activityBranch: 'Industria de la Construcción',
    scope: 'Nacional',
    salaryScales: [
      { category: 'Maestro Mayor', amount: 380000 },
      { category: 'Capataz General', amount: 340000 },
      { category: 'Oficial Especializado', amount: 300000 },
      { category: 'Oficial', amount: 260000 },
      { category: 'Medio Oficial', amount: 230000 },
      { category: 'Ayudante', amount: 200000 }
    ],
    documents: [
      { name: 'CCT UOCRA 2024.pdf', uploadDate: '2024-02-01' },
      { name: 'Escalas Construcción.pdf', uploadDate: '2024-02-05' },
      { name: 'Seguridad y Higiene.pdf', uploadDate: '2024-02-10' }
    ]
  }
];

export default function Convenios() {
  const navigate = useNavigate();
  const [convenios, setConvenios] = useState(conveniosData);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedConvenio, setSelectedConvenio] = useState(null);

  const handleViewConvenio = (convenio) => {
    navigate(`/convenios/${convenio.id}`);
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
                {convenios.reduce((total, conv) => total + conv.employeeCount, 0)}
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
                ${Math.round(convenios.reduce((total, conv) => total + conv.basicSalary, 0) / convenios.length).toLocaleString()}
              </div>
              <p className="stat-label">Salario Promedio</p>
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
                key={convenio.id}
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
                    <span className="info-value">{selectedConvenio.sector}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Estado:</span>
                    <span className={`info-value status ${selectedConvenio.status.toLowerCase()}`}>
                      {selectedConvenio.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Empleados afectados:</span>
                    <span className="info-value">{selectedConvenio.employeeCount}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Vigencia:</span>
                    <span className="info-value">
                      {new Date(selectedConvenio.startDate).toLocaleDateString('es-ES')} - 
                      {new Date(selectedConvenio.endDate).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="view-section">
                <h3>Escalas Salariales</h3>
                <div className="scales-list">
                  {selectedConvenio.salaryScales.map((scale, index) => (
                    <div key={index} className="scale-item">
                      <span className="scale-category">{scale.category}</span>
                      <span className="scale-amount">
                        ${scale.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
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
        title={`Editar Convenio - ${selectedConvenio?.name}`}
        size="large"
      >
        <div className="edit-form-placeholder">
          <p>Formulario de edición de convenio en desarrollo...</p>
          <p>Aquí podrás modificar escalas salariales, vigencia, y otros parámetros del convenio.</p>
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
        title={`Subir Documento - ${selectedConvenio?.name}`}
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
