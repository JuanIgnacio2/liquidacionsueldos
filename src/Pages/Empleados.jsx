import React from "react";
import { Search, Plus, Edit, Eye, Filter, DollarSign, UserX, Users, Layers, XCircle, UserCheck, CheckCircle, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { EmployeeViewModal } from "../Components/EmployeeViewModal/EmployeeViewModal.jsx";
import { NewEmployeeModal } from "../Components/NewEmployeeModal/NewEmployeeModal.jsx";
import { EmployeeEditModal } from "../Components/EmployeeEditModal/EmployeeEditModal.jsx";
import { ProcessPayrollModal } from "../Components/ProcessPayrollModal/ProcessPayrollModal";
import { StatsGrid, Card, CardContent, } from "../Components/ui/card";
import {useNotification} from '../Hooks/useNotification';
import { Tooltip } from "../Components/ToolTip/ToolTip";
import { LoadingSpinner } from "../Components/ui/LoadingSpinner";
import * as api from "../services/empleadosAPI";
import "../styles/components/_employees.scss";

export default function Empleados() {
  const notify = useNotification();
  const [employees, setEmployees] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
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
      notify.error("No se pudieron cargar las areas asignadas a los empleados", err);
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
        filterEstado === "TODOS" ||
        (filterEstado === "ACTIVO" && e.estado === "ACTIVO") ||
        (filterEstado === "DADO_DE_BAJA" && e.estado === "DADO_DE_BAJA");

      // Filtro por gremio
      const gremioName = e.gremioNombre || e.gremio?.nombre || "";
      const matchesGremio =
        filterGremio === "TODOS" ||
        (filterGremio === "LUZ_Y_FUERZA" &&
          (gremioName === "LUZ_Y_FUERZA" ||
            gremioName?.toUpperCase() === "LUZ_Y_FUERZA")) ||
        (filterGremio === "UOCRA" && gremioName === "UOCRA") ||
        (filterGremio === "CONVENIO_GENERAL" &&
          (gremioName === "Convenio General" ||
            gremioName === "" ||
            !gremioName));

      return matchesSearch && matchesEstado && matchesGremio;
    });
    setFiltered(result);
  }, [search, employees, filterEstado, filterGremio]);

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

  const handleLiquidarSueldo = (employee) => {
    setEmployeeForPayroll(employee);
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

    if (employee.estado === "DADO_DE_BAJA") {
      if (
        window.confirm(
          `¿Está seguro de que desea dar de alta a ${`${employee.nombre} ${employee.apellido}`}?`
        )
      ) {
        await api.updateStateEmployee(employee.legajo);
        await api.registrarActividad({
          usuario,
          accion: "REACTIVAR",
          descripcion: `Se reactivó el empleado ${employee.nombre} ${employee.apellido}`,
          referenciaTipo: "EDIT_EMPLEADO",
          referenciaId: employee.legajo,
        });
        window.showNotification?.(
          `Empleado ${employee.nombre} ${employee.apellido} dado de alta`,
          "info"
        );
        await loadEmployees(); // Refrescar lista
      }
    }
    if (employee.estado === "ACTIVO") {
      if (
        window.confirm(
          `¿Está seguro de que desea dar de baja a ${`${employee.nombre} ${employee.apellido}`}?`
        )
      ) {
        await api.updateStateEmployee(employee.legajo);
        await api.registrarActividad({
          usuario,
          accion: "BAJA",
          descripcion: `Se dio de baja el empleado ${employee.nombre} ${employee.apellido}`,
          referenciaTipo: "BAJA_EMPLEADO",
          referenciaId: employee.legajo,
        });
        window.showNotification?.(
          `Empleado ${employee.nombre} ${employee.apellido} dado de baja`,
          "info"
        );
        await loadEmployees(); // Refrescar lista
      }
    }
    loadEmployees();
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
      value: employees.length,
      label: "Total Empleados",
      colorClass: "success",
    },
    {
      icon: CheckCircle,
      value: employees.filter((emp) => emp.estado === "ACTIVO").length,
      label: "Empleados Activos",
      colorClass: "success",
    },
    {
      icon: XCircle,
      value: employees.filter((emp) => emp.estado === "DADO_DE_BAJA").length,
      label: "Dados de baja",
      colorClass: "warning",
    },
    {
      icon: Layers,
      value: areas.length,
      label: "Áreas",
      colorClass: "text-yellow-500",
    },
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
      <StatsGrid stats={statsData} className="stats-overview" />

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
            {filtered.length} empleados encontrados
          </p>
        </div>
        <div className="card-content list-content">
          <div className="employee-list">
            {filtered.map((employee) => (
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
        employees={employees}
        initialEmployee={employeeForPayroll}
      />
    </div>
  );
}
