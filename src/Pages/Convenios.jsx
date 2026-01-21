import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users } from 'lucide-react';
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
  const [employees, setEmployees] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
  
  // Normalizar empleados para obtener gremioNombre
  const normalizeEmployees = (rows) =>
    rows.map((e) => ({
      ...e,
      gremioNombre:
        e.gremio?.nombre ?? (typeof e.gremio === "string" ? e.gremio : ""),
    }));

  // Contar empleados activos por gremio
  const getEmployeeCountByGremio = (employeesList, controller) => {
    if (!employeesList || employeesList.length === 0) return 0;
    
    const controllerUpper = controller?.toUpperCase() ?? '';
    
    return employeesList.filter(emp => {
      if (emp.estado !== 'ACTIVO') return false;
      
      const gremioNombre = emp.gremioNombre || emp.gremio?.nombre || '';
      const gremioUpper = gremioNombre.toUpperCase();
      
      if (controllerUpper === 'LYF' || controllerUpper === 'LUZ_Y_FUERZA') {
        return gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA');
      } else if (controllerUpper === 'UOCRA') {
        return gremioUpper === 'UOCRA';
      }
      
      return false;
    }).length;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar convenios y empleados en paralelo
        const [conveniosResponse, employeesResponse] = await Promise.all([
          api.getConvenios(),
          api.getEmployees()
        ]);
        
        const normalizedEmployees = normalizeEmployees(employeesResponse);
        setEmployees(normalizedEmployees);
        
        // Normalizar convenios y actualizar con conteo real de empleados
        const normalizedConvenios = normalizeConvenios(conveniosResponse);
        
        // Actualizar employeeCount con el conteo real por gremio
        const conveniosWithEmployeeCount = normalizedConvenios.map(conv => {
          let employeeCount = 0;
          if (conv.controller === 'lyf') {
            employeeCount = getEmployeeCountByGremio(normalizedEmployees, 'LYF');
          } else if (conv.controller === 'uocra') {
            employeeCount = getEmployeeCountByGremio(normalizedEmployees, 'UOCRA');
          }
          
          return {
            ...conv,
            employeeCount: employeeCount
          };
        });
        
        setConvenios(conveniosWithEmployeeCount);
      } catch (err) {
        notify.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleViewConvenio = (controller) => {
    navigate(`/convenios/${controller}`);
  };

  const handleEditConvenio = (convenio) => {
    setSelectedConvenio(convenio);
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setSelectedConvenio(null);
  };

  const handleViewDescuentos = () => {
    navigate('/convenios/descuentos');
  };

  const handleViewConceptosGenerales = () => {
    navigate('/convenios/conceptos-generales');
  };

  // Contar empleados de cada gremio para las estadísticas
  const getEmployeeCountByController = (controller) => {
    return getEmployeeCountByGremio(employees, controller);
  };

    const stats = [
  { icon: FileText, value: convenios.length, label: 'Convenios Activos', colorClass: 'success' },
  { icon: Users, value: getEmployeeCountByController('LYF'), label: 'Empleados de Luz y Fuerza', colorClass: 'success' },
  { icon: Users, value: getEmployeeCountByController('UOCRA'), label: 'Empleados de UOCRA', colorClass: 'success' },
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

      {/* Cards de Selección: Descuentos y Conceptos Generales */}
      <div className="conveniosContainer">
        <div className="convenios-header">
          <h2 className="convenios-title section-title-effect">
            <FileText className="title-icon" />
            Gestión de Conceptos
          </h2>
          <p className="convenios-description">
            Administra descuentos y conceptos generales del sistema
          </p>
        </div>
        <div className="convenios-content">
          <div className="convenios-grid">
            {/* Card de Descuentos */}
            <ConvenioCard
              convenio={{
                name: 'Descuentos',
                description: 'Ver y gestionar los descuentos disponibles y sus porcentajes',
                controller: 'descuentos',
                status: 'Activo'
              }}
              onView={handleViewDescuentos}
            />

            {/* Card de Conceptos Generales */}
            <ConvenioCard
              convenio={{
                name: 'Conceptos Generales',
                description: 'Crear y editar conceptos generales del sistema',
                controller: 'conceptos-generales',
                status: 'Activo'
              }}
              onView={handleViewConceptosGenerales}
            />
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