import React from 'react';
import { Search, Plus, Edit, Eye, Filter, DollarSign, UserX, UserCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EmployeeViewModal } from '../Components/EmployeeViewModal/EmployeeViewModal.jsx';
import { NewEmployeeModal } from '../Components/NewEmployeeModal/NewEmployeeModal.jsx';
import { EmployeeEditModal } from '../Components/EmployeeEditModal/EmployeeEditModal.jsx';
import { Tooltip } from '../Components/ToolTip/ToolTip';
import * as api from '../services/empleadosAPI'
import '../styles/components/_employees.scss';

export default function Empleados() {
  const [employees, setEmployees] = useState([]);
  const [areas,setAreas]=useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [employeeList, setEmployeeList] = useState(employees);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConceptsModal, setShowConceptsModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
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
      setFiltered(
          employees.filter((e) =>
          e.legajo?.toString().includes(search) ||
          `${e.nombre} ${e.apellido}`.toLowerCase().includes(lower) ||
          e.gremioNombre?.toLowerCase().includes(lower) ||
          e.categoriaNombre?.toLowerCase().includes(lower)
        )
      );
  }, [search, employees]);
  
  const handleSaveEmployee = async (dto, isEdit) => {
      try {
        if (isEdit) {
          await api.updateEmployee(dto.legajo, dto);
        } else {
          await api.createEmployee(dto);
        }
        await loadEmployees(); // Refrescar lista
        setModalOpen(false);
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
    //setSelectedEmployee(employee);
    setModalOpen(true);
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
    setSelectedEmployee(null);
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

  return (
    <div className="empleados">
      {/* Header */}
      <div className="empleados-header">
        <div className="header-content">
          <h1 className="title title-gradient animated-title">
            Gestión de Empleados
          </h1>
          <p className="subtitle">
            Administra la información y datos de todos los empleados
          </p>
        </div>
        <button className="add-employee-btn" onClick={() => setShowNewEmployeeModal(true)}>
          <Plus className="btn-icon" />
          Nuevo Empleado
        </button>
      </div>

      {/* Stats Summary */}
      <div className="stats-overview">
        <div className="card stat-card">
          <div className="stat-value success">{employees.length}</div>
          <p className="stat-label">Total Empleados</p>
        </div>
        <div className="card stat-card">
          <div className="stat-value primary">
            {employees.filter(emp => emp.estado === 'ACTIVO').length}
          </div>
          <p className="stat-label">Empleados Activos</p>
        </div>
        <div className="card stat-card">
          <div className="stat-value warning">
            {employees.filter(emp => emp.estado === 'DADO_DE_BAJA').length}
          </div>
          <p className="stat-label">Dados de baja</p>
        </div>
        <div className="card stat-card">
          <div className="stat-value default">{areas.length} </div>
          <p className="stat-label">Areas</p>
        </div>
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
          <div className="filter-controls">
            <button className="filter-btn">
              <Filter className="filter-icon" />
              Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="card employees-list">
        <div className="card-header list-header">
          <h2 className="list-title section-title-effect">Lista de Empleados</h2>
          <p className="list-description">
            {filtered.length} empleados encontrados
          </p>
        </div>
        <div className="card-content list-content">
          <div className="employee-list">
            {filtered.map((employee) => (
              <div
                key={employee.legajo ?? `${employee.nombre}-${employee.apellido}`}
                className="employee-item"
              >
                <div className="employee-grid">
                  <div className="employee-info">
                    <h3 className="employee-name">{`${employee.nombre} ${employee.apellido}`}</h3>
                    <p className="employee-email">Legajo: {employee.legajo}</p>
                  </div>
                  <div className="employee-position">
                    <p className="position-title">
                      {employee.gremioNombre === "LUZ_Y_FUERZA" ? "Luz y Fuerza" : (employee.gremioNombre || "-")}
                    </p>
                    <p className="department">{employee.categoriaNombre || "-"}</p>
                  </div>
                  <div className="employee-salary">
                    <p className="salary-amount">
                      {employee.gremio?.nombre === "UOCRA" ? (
                        employee.nombreZona || "-"
                      ) : Array.isArray(employee.nombreAreas) ? (
                        employee.nombreAreas.join(", ")
                      ) : (
                        employee.nombreAreas || "-"
                      )}
                    </p>
                    <p className="hire-date">Ingreso: {employee.inicioActividad}</p>
                  </div>
                  <div className="employee-status">
                    <span className={`status-badge ${getStatusClass(employee.estado)}`}>
                      {employee.estado === "ACTIVO" ? "Activo" : "Dado de baja"}
                    </span>
                  </div>
                </div>
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
            ))}
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
        //onConceptos={handleConceptos}
        //onLiquidarSueldo={handleLiquidarSueldo}
        //onHistorialLiquidaciones={handleHistorialLiquidaciones}
      />
    </div>
  );
}
