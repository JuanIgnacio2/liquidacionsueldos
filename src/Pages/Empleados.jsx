import React from 'react';
import { Users, Search, Plus, Edit, Trash2, Mail, Phone, Calendar, Building, Eye, MoreHorizontal, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dropdown, DropdownItem } from '../Components/Dropdown/Dropdown';
import * as api from '../services/empleadosAPI'
import '../styles/components/_employees.scss';

export default function Empleados() {
  const [employees, setEmployees] = useState([]);
  const [areas,setAreas]=useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState([]);
  
  const loadEmployees = async () => {
    try {
        setLoading(true);
        const data = await api.getEmployees();
        setEmployees(data);
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
        employees.filter(
          (e) =>
            e.legajo.toString().includes(search) ||
            `${e.nombre} ${e.apellido}`.toLowerCase().includes(lower)
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
        await loadEmployees(); // Refresh list
        setModalOpen(false);
      } catch (err) {
        alert("Error al registrar empleado: " + err.message);
      }
  };

  const handleViewEmployee = (employee) => {
    //setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const handleEditEmployee = (employee) => {
    //setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Activo':
        return 'active';
      case 'DADO_DE_BAJA':
        return 'inactive';
      default:
        return 'active';
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
        <button className="add-employee-btn">
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
                key={employee.id}
                className="employee-item"
              >
                <div className="employee-grid">
                  <div className="employee-info">
                    <h3 className="employee-name">{`${employee.nombre} ${employee.apellido}`}</h3>
                    <p className="employee-email">Legajo: {employee.legajo}</p>
                  </div>
                  <div className="employee-position">
                    <p className="position-title">{employee.gremio === "LUZ_Y_FUERZA" ? "Luz y Fuerza" : employee.gremio}</p>
                    <p className="department">{employee.categoria}</p>
                  </div>
                  <div className="employee-salary">
                    <p className="salary-amount">
                      ${employee.legajo}
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
                  <Dropdown
                    trigger={
                      <button className="actions-trigger">
                        <MoreHorizontal className="actions-icon" />
                      </button>
                    }
                    align="right"
                  >
                    <DropdownItem
                      icon={Eye}
                      onClick={() => handleViewEmployee(employee)}
                    >
                      Ver
                    </DropdownItem>
                    <DropdownItem
                      icon={Edit}
                      onClick={() => handleEditEmployee(employee)}
                    >
                      Editar
                    </DropdownItem>
                  </Dropdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
