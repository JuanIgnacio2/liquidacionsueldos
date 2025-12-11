import React from 'react';
import { Search, Plus, Edit, Eye, Filter, DollarSign, UserX, UserCheck, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { EmployeeViewModal } from '../Components/EmployeeViewModal/EmployeeViewModal.jsx';
import { NewEmployeeModal } from '../Components/NewEmployeeModal/NewEmployeeModal.jsx';
import { EmployeeEditModal } from '../Components/EmployeeEditModal/EmployeeEditModal.jsx';
import { ProcessPayrollModal } from '../Components/ProcessPayrollModal/ProcessPayrollModal';
import { Tooltip } from '../Components/ToolTip/ToolTip';
import * as api from '../services/empleadosAPI'
import '../styles/components/_employees.scss';
import { Button } from '../Components/ui/button';
import { StatCard } from '../Components/ui/StatCard';
import { LoadingSpinner } from '../Components/ui/LoadingSpinner';

export default function Empleados() {
  const [employees, setEmployees] = useState([]);
  const [areas,setAreas]=useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [employeeList, setEmployeeList] = useState(employees);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConceptsModal, setShowConceptsModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [showProcessPayrollModal, setShowProcessPayrollModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeForPayroll, setEmployeeForPayroll] = useState(null);
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [filterGremio, setFilterGremio] = useState('TODOS');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);
  
  const normalizeEmployees = (rows) =>
  rows.map(e => ({
    ...e,
    gremioId: e.gremio?.idGremio ?? null,
    gremioNombre: e.gremio?.nombre ?? (typeof e.gremio === 'string' ? e.gremio : ""),
    categoriaId: e.categoria?.id ?? e.categoria?.idCategoria ?? null,
    categoriaNombre: e.categoria?.nombre ?? (typeof e.categoria === 'string' ? e.categoria : ""),
  }));

  const loadEmployees = async () => {
    try {
        setLoading(true);
        const data = await api.getEmployees();
        const norm = normalizeEmployees(data);
        const ordenados = norm.sort((a, b) => a.legajo - b.legajo);
        setEmployees(ordenados);
        setError("");
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const loadAreas = async () => {
    try {
        const data = await api.getAreas();
        setAreas(data);
    } catch (err) {
        console.error("Error loading areas:", err);
    }
  };
  
  useEffect(() => {
      loadEmployees();
      loadAreas();
  }, []);
  
  useEffect(() => {
      const lower = search.toLowerCase();
      let result = employees.filter((e) => {
        // Filtro de búsqueda por texto
        const matchesSearch = 
          !search ||
          e.legajo?.toString().includes(search) ||
          `${e.nombre} ${e.apellido}`.toLowerCase().includes(lower) ||
          e.gremioNombre?.toLowerCase().includes(lower) ||
          e.categoriaNombre?.toLowerCase().includes(lower);
        
        // Filtro por estado
        const matchesEstado = 
          filterEstado === 'TODOS' || 
          (filterEstado === 'ACTIVO' && e.estado === 'ACTIVO') ||
          (filterEstado === 'DADO_DE_BAJA' && e.estado === 'DADO_DE_BAJA');
        
        // Filtro por gremio
        const gremioName = e.gremioNombre || e.gremio?.nombre || '';
        const matchesGremio = 
          filterGremio === 'TODOS' ||
          (filterGremio === 'LUZ_Y_FUERZA' && (gremioName === 'LUZ_Y_FUERZA' || gremioName?.toUpperCase() === 'LUZ_Y_FUERZA')) ||
          (filterGremio === 'UOCRA' && gremioName === 'UOCRA') ||
          (filterGremio === 'CONVENIO_GENERAL' && (gremioName === 'Convenio General' || gremioName === '' || !gremioName));
        
        return matchesSearch && matchesEstado && matchesGremio;
      });
      setFiltered(result);
  }, [search, employees, filterEstado, filterGremio]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);
  
  const handleSaveEmployee = async (dto, isEdit) => {
      try {
        if (isEdit) {
          await api.updateEmployee(dto.legajo, dto);
        } else {
          await api.createEmployee(dto);
        }
        await loadEmployees(); // Refrescar lista
      } catch (err) {
        alert("Error al registrar empleado: " + err.message);
      }
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleLiquidarSueldo = (employee) => {
    setEmployeeForPayroll(employee);
    setShowProcessPayrollModal(true);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'ACTIVO':
        return 'active';
      case 'DADO_DE_BAJA':
        return 'inactive';
      default:
        return 'active';
    }
  };

  const handleStateEmployee = async (employee) => {
    if (employee.estado === 'DADO_DE_BAJA') {
      if (window.confirm(`¿Está seguro de que desea dar de alta a ${`${employee.nombre} ${employee.apellido}`}?`)) {
        api.updateStateEmployee(employee.legajo);
        window.showNotification?.(`Empleado ${employee.nombre} ${employee.apellido} dado de alta`, 'info');
        await loadEmployees(); // Refrescar lista
      }}
    if (employee.estado === 'ACTIVO') {
        if (window.confirm(`¿Está seguro de que desea dar de baja a ${`${employee.nombre} ${employee.apellido}`}?`)) {
            api.updateStateEmployee(employee.legajo);
            window.showNotification?.(`Empleado ${employee.nombre} ${employee.apellido} dado de baja`, 'info');
            await loadEmployees(); // Refrescar lista
          }
    }
    loadEmployees();
  }

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowConceptsModal(false);
    setShowNewEmployeeModal(false);
    setShowProcessPayrollModal(false);
    setSelectedEmployee(null);
    setEmployeeForPayroll(null);
  };

  const handleProcessPayroll = (result) => {
    loadEmployees(); // Refrescar lista si es necesario
  };

  const formatDate = (d) => {
    try {
      if (!d) return "-";
      const parsed = new Date(d);
      if (Number.isNaN(parsed.getTime())) return String(d);
      return parsed.toLocaleDateString('es-AR');
    } catch {
      return String(d);
    }
  };

  // Si está cargando, mostrar solo el header y el spinner bloqueando toda la vista
  if (loading) {
    return (
      <div className="empleados">
        <div className="empleados-header">
          <div className="header-content">
            <h1 className="title title-gradient animated-title">
              Gestión de Empleados
            </h1>
          </div>
        </div>
        <LoadingSpinner message="Cargando empleados..." size="lg" className="list-loading" />
      </div>
    );
  }

  return (
    <div className="empleados">
      {/* Header */}
      <div className="empleados-header">
        <div className="header-content">
          <h1 className="title title-gradient animated-title">
            Gestión de Empleados
          </h1>
        </div>
        <Button 
          variant="primary"
          icon={Plus}
          iconPosition="left"
          onClick={() => setShowNewEmployeeModal(true)}
        >
          Nuevo Empleado
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="stats-overview">
        <StatCard
          title="Total Empleados"
          value={employees.length}
          colorClass="success"
          delay={0}
        />
        <StatCard
          title="Empleados Activos"
          value={employees.filter(emp => emp.estado === 'ACTIVO').length}
          colorClass="primary"
          delay={0.1}
        />
        <StatCard
          title="Dados de baja"
          value={employees.filter(emp => emp.estado === 'DADO_DE_BAJA').length}
          colorClass="warning"
          delay={0.2}
        />
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="filters-content">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Buscar empleados por nombre, cargo o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input search-input"
            />
          </div>
          <div className="filter-controls" ref={filterDropdownRef}>
            <button 
              className={`filter-btn ${(filterEstado !== 'TODOS' || filterGremio !== 'TODOS') ? 'active' : ''}`}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter className="filter-icon" />
              Filtros
              {(filterEstado !== 'TODOS' || filterGremio !== 'TODOS') && (
                <span className="filter-badge">
                  {[filterEstado !== 'TODOS' ? '1' : '', filterGremio !== 'TODOS' ? '1' : ''].filter(Boolean).length}
                </span>
              )}
            </button>
            
            {showFilterDropdown && (
              <div className="filter-dropdown">
                <div className="filter-dropdown-header">
                  <h3>Filtros</h3>
                  <button 
                    className="close-dropdown-btn"
                    onClick={() => setShowFilterDropdown(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="filter-group">
                  <label className="filter-label">Estado</label>
                  <div className="filter-options">
                    <button
                      className={`filter-option ${filterEstado === 'TODOS' ? 'active' : ''}`}
                      onClick={() => setFilterEstado('TODOS')}
                    >
                      Todos
                    </button>
                    <button
                      className={`filter-option ${filterEstado === 'ACTIVO' ? 'active' : ''}`}
                      onClick={() => setFilterEstado('ACTIVO')}
                    >
                      Activos
                    </button>
                    <button
                      className={`filter-option ${filterEstado === 'DADO_DE_BAJA' ? 'active' : ''}`}
                      onClick={() => setFilterEstado('DADO_DE_BAJA')}
                    >
                      Dados de baja
                    </button>
                  </div>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Gremio</label>
                  <div className="filter-options">
                    <button
                      className={`filter-option ${filterGremio === 'TODOS' ? 'active' : ''}`}
                      onClick={() => setFilterGremio('TODOS')}
                    >
                      Todos
                    </button>
                    <button
                      className={`filter-option ${filterGremio === 'LUZ_Y_FUERZA' ? 'active' : ''}`}
                      onClick={() => setFilterGremio('LUZ_Y_FUERZA')}
                    >
                      Luz y Fuerza
                    </button>
                    <button
                      className={`filter-option ${filterGremio === 'UOCRA' ? 'active' : ''}`}
                      onClick={() => setFilterGremio('UOCRA')}
                    >
                      UOCRA
                    </button>
                    <button
                      className={`filter-option ${filterGremio === 'CONVENIO_GENERAL' ? 'active' : ''}`}
                      onClick={() => setFilterGremio('CONVENIO_GENERAL')}
                    >
                      Convenio General
                    </button>
                  </div>
                </div>

                {(filterEstado !== 'TODOS' || filterGremio !== 'TODOS') && (
                  <div className="filter-actions">
                    <button
                      className="clear-filters-btn"
                      onClick={() => {
                        setFilterEstado('TODOS');
                        setFilterGremio('TODOS');
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="card employees-section">
        <div className="card-header employees-header">
          <h2 className="card-title section-title-effect">Lista de Empleados</h2>
        </div>
        <div className="card-content employees-content">
          <div className="employees-table">
            {error ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
                <p>Error: {error}</p>
              </div>
            ) : (
            <div className="employees-list">
              {filtered.map((employee) => (
                <div 
                  key={employee.legajo ?? `${employee.nombre}-${employee.apellido}`}
                  className="employees-item"
                >
                  <div className="employees-col employee-col">
                    <div className="employee-info">
                      <div className="employee-details">
                        <span className="employee-name">{`${employee.apellido?.toUpperCase() || ''} ${employee.nombre?.toUpperCase() || ''}`}</span>
                      </div>
                    </div>
                  </div>
                  <div className="employees-col legajo-col">
                    <span className="employee-legajo">
                      Legajo: #{employee.legajo}
                    </span>
                    <span className="convenio-separator"> • </span>
                    <span className="convenio-name">
                      {employee.gremioNombre === "LUZ_Y_FUERZA" ? "Luz y Fuerza" : (employee.gremioNombre || "-")}
                    </span>
                  </div>
                  <div className="employees-col status-col">
                    <span className={`status-badge ${getStatusClass(employee.estado)}`}>
                      {employee.estado === "ACTIVO" ? "Activo" : "Dado de baja"}
                    </span>
                  </div>
                  <div className="employees-col action-col">
                    <div className="employee-actions">
                      <Tooltip content="Ver detalles del empleado" position="top">
                        <button
                          className="action-icon-button view-action"
                          onClick={() => handleViewEmployee(employee)}
                        >
                          <Eye className="action-icon" />
                        </button>
                      </Tooltip>

                      <Tooltip content="Editar empleado" position="top">
                        <button
                          className="action-icon-button edit-action"
                          onClick={() => handleEditEmployee(employee)}
                          disabled={employee.estado !== 'ACTIVO'}
                        >
                          <Edit className="action-icon" />
                        </button>
                      </Tooltip>

                      <Tooltip content="Liquidar sueldo" position="top">
                        <button
                          className="action-icon-button liquidate-action"
                          onClick={() => handleLiquidarSueldo(employee)}
                          disabled={employee.estado !== 'ACTIVO'}
                        >
                          <DollarSign className="action-icon" />
                        </button>
                      </Tooltip>

                      {employee.estado === 'ACTIVO' ? (
                        <Tooltip content="Dar de baja empleado" position="top">
                          <button
                            className="action-icon-button deactivate-action"
                            onClick={() => handleStateEmployee(employee)}
                          >
                            <UserX className="action-icon" />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Dar de alta empleado" position="top">
                          <button
                            className="action-icon-button activate-action"
                            onClick={() => handleStateEmployee(employee)}
                          >
                            <UserCheck className="action-icon" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      </div>
      {/* Modales */}
      <NewEmployeeModal
        isOpen={showNewEmployeeModal}
        onClose={closeModals}
        onSave={handleSaveEmployee}
      />
      <EmployeeEditModal
        isOpen={showEditModal}
        onClose={closeModals}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />
      <EmployeeViewModal
        isOpen={showViewModal}
        onClose={closeModals}
        employee={selectedEmployee}
      />
      <ProcessPayrollModal
        isOpen={showProcessPayrollModal}
        onClose={closeModals}
        onProcess={handleProcessPayroll}
        employees={employees}
        initialEmployee={employeeForPayroll}
      />
    </div>
  );
}