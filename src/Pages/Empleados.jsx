import React from "react";
import { Search, Plus, Edit, Eye, Filter, DollarSign, UserX, Users, Layers, XCircle, UserCheck, CheckCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { EmployeeViewModal } from "../Components/EmployeeViewModal/EmployeeViewModal.jsx";
import { NewEmployeeModal } from "../Components/NewEmployeeModal/NewEmployeeModal.jsx";
import { EmployeeEditModal } from "../Components/EmployeeEditModal/EmployeeEditModal.jsx";
import { ProcessPayrollModal } from "../Components/ProcessPayrollModal/ProcessPayrollModal";
import { StatsGrid, Card, CardContent, } from "../Components/ui/card";
import {useNotification} from '../Hooks/useNotification';
import { useConfirm } from '../Hooks/useConfirm';
import { Tooltip } from "../Components/ToolTip/ToolTip";
import { LoadingSpinner } from "../Components/ui/LoadingSpinner";
import * as api from "../services/empleadosAPI";
import "../styles/components/_employees.scss";

export default function Empleados() {
  const notify = useNotification();
  const confirm = useConfirm();
  const [employees, setEmployees] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConceptsModal, setShowConceptsModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [showProcessPayrollModal, setShowProcessPayrollModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeForPayroll, setEmployeeForPayroll] = useState(null);
  const [filterEstado, setFilterEstado] = useState("TODOS");
  const [filterGremio, setFilterGremio] = useState("TODOS");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef(null);
  
  // Estados de paginación
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalActivos, setTotalActivos] = useState(0);
  const [totalBaja, setTotalBaja] = useState(0);
  const [allEmployeesForModal, setAllEmployeesForModal] = useState([]);

  const normalizeEmployees = (rows) =>
    rows.map((e) => ({
      ...e,
      gremioId: e.gremio?.idGremio ?? null,
      gremioNombre:
        e.gremio?.nombre ?? (typeof e.gremio === "string" ? e.gremio : ""),
      categoriaId: e.categoria?.id ?? e.categoria?.idCategoria ?? null,
      categoriaNombre:
        e.categoria?.nombre ??
        (typeof e.categoria === "string" ? e.categoria : ""),
    }));

  // Mapear filtro de gremio del frontend al formato del backend
  const mapGremioToBackend = (gremio) => {
    if (gremio === "TODOS") return null;
    if (gremio === "LUZ_Y_FUERZA") return "LUZ_Y_FUERZA";
    if (gremio === "UOCRA") return "UOCRA";
    if (gremio === "CONVENIO_GENERAL") return "Convenio General";
    return null;
  };

  // Mapear filtro de estado del frontend al formato del backend
  const mapEstadoToBackend = (estado) => {
    if (estado === "TODOS") return null;
    if (estado === "ACTIVO") return "ACTIVO";
    if (estado === "DADO_DE_BAJA") return "DADO_DE_BAJA";
    return null;
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const gremioParam = mapGremioToBackend(filterGremio);
      const estadoParam = mapEstadoToBackend(filterEstado);
      const searchParam = search.trim() || null;
      
      const response = await api.getEmployeesPaginated(
        page,
        size,
        gremioParam,
        estadoParam,
        searchParam
      );
      
      // Manejar diferentes formatos de respuesta
      let employeesData = [];
      let totalPagesValue = 0;
      let totalElementsValue = 0;
      
      if (Array.isArray(response)) {
        // Si la respuesta es directamente un array (formato antiguo)
        employeesData = response;
        totalPagesValue = 1;
        totalElementsValue = response.length;
      } else if (response.content) {
        // Formato Page<T> de Spring
        employeesData = response.content;
        totalPagesValue = response.totalPages || 0;
        totalElementsValue = response.totalElements || response.content.length;
      } else {
        // Fallback: tratar como array
        employeesData = response || [];
        totalPagesValue = 1;
        totalElementsValue = employeesData.length;
      }
      
      const norm = normalizeEmployees(employeesData);
      setEmployees(norm);
      setTotalPages(totalPagesValue);
      setTotalElements(totalElementsValue);
      setError("");
    } catch (err) {
      setError(err.message);
      notify.error("Error al cargar empleados: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas totales (sin filtros)
  const loadStats = async () => {
    try {
      // Cargar todos los empleados para contar activos y bajas
      // Nota: Esto podría optimizarse si el backend proporciona un endpoint de estadísticas
      const allResponse = await api.getEmployeesPaginated(0, 10, null, null, null);
      const allEmployees = allResponse.content || allResponse || [];
      setTotalActivos(allEmployees.filter(e => e.estado === "ACTIVO").length);
      setTotalBaja(allEmployees.filter(e => e.estado === "DADO_DE_BAJA").length);
    } catch (err) {
      notify.error("Error al cargar estadísticas:", err);
      // Si falla, intentar usar el endpoint sin paginación como fallback
      try {
        const allEmployees = await api.getEmployees();
        setTotalActivos(allEmployees.filter(e => e.estado === "ACTIVO").length);
        setTotalBaja(allEmployees.filter(e => e.estado === "DADO_DE_BAJA").length);
      } catch (fallbackErr) {
        notify.error("Error al cargar estadísticas (fallback):", fallbackErr);
      }
    }
  };

  const loadAreas = async () => {
    try {
      const data = await api.getAreas();
      setAreas(data);
    } catch (err) {
      notify.error("No se pudieron cargar las areas asignadas a los empleados", err);
    }
  };

  useEffect(() => {
    loadAreas();
    loadStats();
  }, []);

  // Cargar empleados cuando cambian los filtros, búsqueda o paginación
  useEffect(() => {
    loadEmployees();
  }, [page, size, filterEstado, filterGremio, search]);

  // Resetear a página 0 cuando cambian los filtros o búsqueda
  useEffect(() => {
    if (page !== 0) {
      setPage(0);
    }
  }, [filterEstado, filterGremio, search]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setShowFilterDropdown(false);
      }
    };

    if (showFilterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterDropdown]);

  const handleSaveEmployee = async (dto, isEdit) => {
    try {
      const usuario = "ADMIN";

      if (isEdit) {
        await api.updateEmployee(dto.legajo, dto);
        // Registrar actividad de edición
        await api.registrarActividad({
          usuario,
          accion: "EDITAR",
          descripcion: `Se modificó el empleado ${dto.nombre} ${dto.apellido}`,
          referenciaTipo: "EDIT_EMPLEADO",
          referenciaId: dto.legajo,
        });
      } else {
        const response = await api.createEmployee(dto);
        // Registrar actividad de alta
        await api.registrarActividad({
          usuario,
          accion: "CREAR",
          descripcion: `Se creó el empleado ${dto.nombre} ${dto.apellido}`,
          referenciaTipo: "ALTA_EMPLEADO",
          referenciaId: response.legajo || dto.legajo,
        });
      }
      await loadEmployees(); // Refrescar lista
    } catch (err) {
      notify.error("Error al registrar empleado: " + err.message);
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

  const handleLiquidarSueldo = async (employee) => {
    setEmployeeForPayroll(employee);
    // Cargar todos los empleados para el modal de liquidación
    try {
      const response = await api.getEmployeesPaginated(0, 10000, null, null, null);
      const allEmployees = normalizeEmployees(response.content || response || []);
      setAllEmployeesForModal(allEmployees);
    } catch (err) {
      // Si falla, intentar con el endpoint sin paginación
      try {
        const allEmployees = await api.getEmployees();
        const norm = normalizeEmployees(allEmployees);
        setAllEmployeesForModal(norm);
      } catch (fallbackErr) {
        notify.error("Error al cargar empleados para liquidación");
        return;
      }
    }
    setShowProcessPayrollModal(true);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "ACTIVO":
        return "active";
      case "DADO_DE_BAJA":
        return "inactive";
      default:
        return "active";
    }
  };

  const handleStateEmployee = async (employee) => {
    const usuario = localStorage.getItem("usuario") || "Sistema";
    const nombreCompleto = `${employee.nombre} ${employee.apellido}`;

    if (employee.estado === "DADO_DE_BAJA") {
      // Dar de alta
      const result = await confirm({
        title: 'Dar de alta empleado',
        message: `¿Está seguro de que desea dar de alta a ${nombreCompleto}?`,
        confirmText: 'Dar de alta',
        cancelText: 'Cancelar',
        type: 'success',
        confirmButtonVariant: 'success',
        cancelButtonVariant: 'secondary'
      });

      if (result) {
        try {
          await api.updateStateEmployee(employee.legajo);
          await api.registrarActividad({
            usuario,
            accion: "REACTIVAR",
            descripcion: `Se reactivó el empleado ${nombreCompleto}`,
            referenciaTipo: "EDIT_EMPLEADO",
            referenciaId: employee.legajo,
          });
          if (window?.showNotification) {
            window.showNotification(
              `Empleado ${nombreCompleto} dado de alta exitosamente`,
              "success",
              3000
            );
          }
          await loadEmployees(); // Refrescar lista
        } catch (error) {
          notify.error("Error al dar de alta el empleado: " + error.message);
        }
      }
    } else if (employee.estado === "ACTIVO") {
      // Dar de baja
      const result = await confirm({
        title: 'Dar de baja empleado',
        message: `¿Está seguro de que desea dar de baja a ${nombreCompleto}? Esta acción cambiará el estado del empleado.`,
        confirmText: 'Dar de baja',
        cancelText: 'Cancelar',
        type: 'danger',
        confirmButtonVariant: 'danger',
        cancelButtonVariant: 'secondary'
      });

      if (result) {
        try {
          await api.updateStateEmployee(employee.legajo);
          await api.registrarActividad({
            usuario,
            accion: "BAJA",
            descripcion: `Se dio de baja el empleado ${nombreCompleto}`,
            referenciaTipo: "BAJA_EMPLEADO",
            referenciaId: employee.legajo,
          });
          if (window?.showNotification) {
            window.showNotification(
              `Empleado ${nombreCompleto} dado de baja exitosamente`,
              "warning",
              3000
            );
          }
          await loadEmployees(); // Refrescar lista
        } catch (error) {
          notify.error("Error al dar de baja el empleado: " + error.message);
        }
      }
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowConceptsModal(false);
    setShowNewEmployeeModal(false);
    setShowProcessPayrollModal(false);
    setSelectedEmployee(null);
    setEmployeeForPayroll(null);
    loadEmployees();
  };

  const closeViewModal = () => {
    setShowViewModal(false);
  };

  const handleProcessPayroll = (result) => {
    loadEmployees(); // Refrescar lista si es necesario
  };

  const statsData = [
    {
      icon: Users,
      value: totalElements,
      label: "Total Empleados",
      colorClass: "success",
    },
    {
      icon: CheckCircle,
      value: totalActivos,
      label: "Empleados Activos",
      colorClass: "success",
    },
    {
      icon: XCircle,
      value: totalBaja,
      label: "Dados de baja",
      colorClass: "warning",
    }
  ];

  if (loading) {
    return (
      <div className="empleados">
        <div className="empleados-header">
          <div className="header-content">
            <h1 className="title title-gradient animated-title">
              Gestión de Empleados
            </h1>
            <p className="subtitle">
              Administra la información y datos de todos los empleados
            </p>
          </div>
        </div>
        <LoadingSpinner
          message="Cargando lista de empleados..."
          size="lg"
          className="list-loading"
        />
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
          <p className="subtitle">
            Administra la información y datos de todos los empleados
          </p>
        </div>
        <button
          className="add-employee-btn"
          onClick={() => setShowNewEmployeeModal(true)}
        >
          <Plus className="btn-icon" />
          Nuevo Empleado
        </button>
      </div>

      {/* Stats Summary */}
      <StatsGrid
        className="stats-overview"
        stats={statsData.map(s => ({
          icon: s.icon,
          value: s.value,
          label: s.label,
          colorClass: s.colorClass
        }))}
      />

      {/* Filters */}
      <Card className="filters-card">
        <CardContent className="filters-content">
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
              className={`filter-btn ${
                filterEstado !== "TODOS" || filterGremio !== "TODOS"
                  ? "active"
                  : ""
              }`}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter className="filter-icon" />
              Filtros
              {(filterEstado !== "TODOS" || filterGremio !== "TODOS") && (
                <span className="filter-badge">
                  {
                    [
                      filterEstado !== "TODOS" ? "1" : "",
                      filterGremio !== "TODOS" ? "1" : "",
                    ].filter(Boolean).length
                  }
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
                      className={`filter-option ${
                        filterEstado === "TODOS" ? "active" : ""
                      }`}
                      onClick={() => setFilterEstado("TODOS")}
                    >
                      Todos
                    </button>
                    <button
                      className={`filter-option ${
                        filterEstado === "ACTIVO" ? "active" : ""
                      }`}
                      onClick={() => setFilterEstado("ACTIVO")}
                    >
                      Activos
                    </button>
                    <button
                      className={`filter-option ${
                        filterEstado === "DADO_DE_BAJA" ? "active" : ""
                      }`}
                      onClick={() => setFilterEstado("DADO_DE_BAJA")}
                    >
                      Dados de baja
                    </button>
                  </div>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Gremio</label>
                  <div className="filter-options">
                    <button
                      className={`filter-option ${
                        filterGremio === "TODOS" ? "active" : ""
                      }`}
                      onClick={() => setFilterGremio("TODOS")}
                    >
                      Todos
                    </button>
                    <button
                      className={`filter-option ${
                        filterGremio === "LUZ_Y_FUERZA" ? "active" : ""
                      }`}
                      onClick={() => setFilterGremio("LUZ_Y_FUERZA")}
                    >
                      Luz y Fuerza
                    </button>
                    <button
                      className={`filter-option ${
                        filterGremio === "UOCRA" ? "active" : ""
                      }`}
                      onClick={() => setFilterGremio("UOCRA")}
                    >
                      UOCRA
                    </button>
                    <button
                      className={`filter-option ${
                        filterGremio === "CONVENIO_GENERAL" ? "active" : ""
                      }`}
                      onClick={() => setFilterGremio("CONVENIO_GENERAL")}
                    >
                      Convenio General
                    </button>
                  </div>
                </div>

                {(filterEstado !== "TODOS" || filterGremio !== "TODOS") && (
                  <div className="filter-actions">
                    <button
                      className="clear-filters-btn"
                      onClick={() => {
                        setFilterEstado("TODOS");
                        setFilterGremio("TODOS");
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <div className="card employees-list">
        <div className="card-header list-header">
          <h2 className="list-title section-title-effect">
            Lista de Empleados
          </h2>
          <p className="list-description">
            {totalElements} empleados encontrados
            {totalPages > 1 && ` (Página ${page + 1} de ${totalPages})`}
          </p>
        </div>
        <div className="card-content list-content">
          <div className="employee-list">
            {employees.length === 0 && !loading ? (
              <div className="empty-state">
                <p>No se encontraron empleados con los filtros seleccionados.</p>
              </div>
            ) : (
              employees.map((employee) => (
              <div
                key={
                  employee.legajo ?? `${employee.nombre}-${employee.apellido}`
                }
                className="employee-item"
              >
                <div className="employee-grid">
                  <div className="employee-info">
                    <h3 className="employee-name">{`${employee.nombre} ${employee.apellido}`}</h3>
                    <p className="employee-email">Legajo: {employee.legajo}</p>
                  </div>
                  <div className="employee-position">
                    <p className="position-title">
                      {employee.gremioNombre === "LUZ_Y_FUERZA"
                        ? "Luz y Fuerza"
                        : employee.gremioNombre || "-"}
                    </p>
                    <p className="department">
                      {employee.categoriaNombre || "-"}
                    </p>
                  </div>
                  <div className="employee-salary">
                    <p className="salary-amount">
                      {employee.gremio?.nombre === "UOCRA"
                        ? employee.nombreZona || "-"
                        : Array.isArray(employee.nombreAreas)
                        ? employee.nombreAreas.join(", ")
                        : employee.nombreAreas || "-"}
                    </p>
                    <p className="hire-date">
                      Ingreso: {employee.inicioActividad}
                    </p>
                  </div>
                  <div className="employee-status">
                    <span
                      className={`status-badge ${getStatusClass(
                        employee.estado
                      )}`}
                    >
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
                      disabled={employee.estado !== "ACTIVO"}
                    >
                      <Edit className="action-icon" />
                    </button>
                  </Tooltip>

                  <Tooltip content="Liquidar sueldo" position="top">
                    <button
                      className="action-icon-button liquidate-action"
                      onClick={() => handleLiquidarSueldo(employee)}
                      disabled={employee.estado !== "ACTIVO"}
                    >
                      <DollarSign className="action-icon" />
                    </button>
                  </Tooltip>

                  {employee.estado === "ACTIVO" ? (
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
              ))
            )}
          </div>
          
          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                <span>
                  Mostrando {employees.length > 0 ? page * size + 1 : 0} - {Math.min((page + 1) * size, totalElements)} de {totalElements}
                </span>
                <select
                  className="pagination-size-select"
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                  }}
                >
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  title="Primera página"
                >
                  <ChevronLeft className="pagination-icon" />
                  <ChevronLeft className="pagination-icon" />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  title="Página anterior"
                >
                  <ChevronLeft className="pagination-icon" />
                </button>
                <div className="pagination-page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 2) {
                      pageNum = i;
                    } else if (page > totalPages - 3) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-page-btn ${page === pageNum ? 'active' : ''}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="pagination-btn"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  title="Página siguiente"
                >
                  <ChevronRight className="pagination-icon" />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  title="Última página"
                >
                  <ChevronRight className="pagination-icon" />
                  <ChevronRight className="pagination-icon" />
                </button>
              </div>
            </div>
          )}
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
        onClose={closeViewModal}
        employee={selectedEmployee}
        onEditEmployee={(employee) => {
          handleEditEmployee(employee);
          closeViewModal();
        }}
        onLiquidarSueldo={(employee) => {
          handleLiquidarSueldo(employee);
          closeViewModal();
        }}
      />
      <ProcessPayrollModal
        isOpen={showProcessPayrollModal}
        onClose={closeModals}
        onProcess={handleProcessPayroll}
        employees={allEmployeesForModal}
        initialEmployee={employeeForPayroll}
      />
    </div>
  );
}