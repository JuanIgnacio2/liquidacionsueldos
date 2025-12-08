import { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Eye, Edit, DollarSign, FileText, UserX } from 'lucide-react';
import * as api from '../../services/empleadosAPI';
import { Dropdown, DropdownItem } from '../../Components/Dropdown/Dropdown';
import { EmployeeViewModal } from '../../Components/EmployeeViewModal.jsx';
import { EmployeeEditModal } from '../../Components/EmployeeEditModal.jsx';
import { EmployeeConceptsModal } from '../../Components/EmployeeConceptsModal.jsx';
import { NewEmployeeModal } from '../../Components/NewEmployeeModal.jsx';
import { Tooltip } from '../../Components/Tooltip/Tooltip.jsx';
import './Employees.scss';

const employees = [
  {
    id: 1,
    name: 'María González',
    position: 'Desarrolladora Senior',
    department: 'IT',
    salary: 85000,
    status: 'Activo',
    hireDate: '2022-03-15',
    email: 'maria.gonzalez@empresa.com'
  },
  {
    id: 2,
    name: 'Carlos Rodríguez',
    position: 'Analista de Marketing',
    department: 'Marketing',
    salary: 65000,
    status: 'Activo',
    hireDate: '2023-01-10',
    email: 'carlos.rodriguez@empresa.com'
  },
  {
    id: 3,
    name: 'Ana Martínez',
    position: 'Gerente de Ventas',
    department: 'Ventas',
    salary: 95000,
    status: 'Activo',
    hireDate: '2021-08-22',
    email: 'ana.martinez@empresa.com'
  },
  {
    id: 4,
    name: 'Luis Pérez',
    position: 'Contador',
    department: 'Finanzas',
    salary: 70000,
    status: 'Licencia',
    hireDate: '2020-11-05',
    email: 'luis.perez@empresa.com'
  },
  {
    id: 5,
    name: 'Patricia Silva',
    position: 'Diseñadora UX',
    department: 'IT',
    salary: 75000,
    status: 'Activo',
    hireDate: '2022-06-18',
    email: 'patricia.silva@empresa.com'
  }
];

export default function Empleados() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedConvenio, setSelectedConvenio] = useState('Todos');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConceptsModal, setShowConceptsModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [employeeList, setEmployeeList] = useState(employees);

  /*const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [search, setSearch] = useState ('');
  const [filtered, setFiltered] = useState('');

  const loadEmployees = async () => {
      try {
          setLoading(true);
          const data = await api.getEmployees();
          setEmployees(data);
          setError('');
      } catch(err){
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {loadEmployees();}, []);

  useEffect(() =>{
      const lower = search.toLowerCase();
      setFiltered(
          employees.filter(e=>
              e.legajo.toString().includes(search) ||
          `${e.nombre} ${e.apellido}`.toLowerCase().includes(lower)
          )
      );
  },[search, employees]);

  const handleSave = async (dto, isEdit) => {
      try{
          if(isEdit){
              await api.updateEmployee(dto.legajo, dto);
          }
          else{
              await api.createEmployee(dto);
          }
          await api.getEmployees();
          setModalOpen(false);
      }catch(err){
          alert('Error al registrar empleado: ' + err.message);
      }
  };*/

  const departments = ['Todos', ...Array.from(new Set(employeeList.map(emp => emp.department)))];
  const statuses = ['Todos', 'Activo', 'Inactivo', 'Licencia'];
  const convenios = ['Todos', ...Array.from(new Set(employeeList.map(emp => emp.convenio || 'Convenio General')))];

  const filteredEmployees = employeeList.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'Todos' || employee.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'Todos' || employee.status === selectedStatus;
    const matchesConvenio = selectedConvenio === 'Todos' || (employee.convenio || 'Convenio General') === selectedConvenio;

    return matchesSearch && matchesDepartment && matchesStatus && matchesConvenio;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'Activo':
        return 'active';
      case 'Inactivo':
        return 'inactive';
      case 'Licencia':
        return 'license';
      default:
        return 'active';
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
    console.log('Liquidar sueldo para:', employee.name);
    // Aquí podrías redirigir a la página de liquidación o abrir otro modal
  };

  const handleConceptos = (employee) => {
    setSelectedEmployee(employee);
    setShowConceptsModal(true);
  };

  const handleHistorialLiquidaciones = (employee) => {
    console.log('Ver historial de liquidaciones para:', employee.name);
    setShowViewModal(false);
    // Aquí podrías abrir un modal con el historial o redirigir
  };

  const handleSaveEmployee = (updatedEmployee) => {
    setEmployeeList(prev =>
      prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp)
    );
    if (window.showNotification) {
      window.showNotification(`Empleado ${updatedEmployee.name} actualizado exitosamente`, 'success');
    }
    console.log('Empleado actualizado:', updatedEmployee);
  };

  const handleNewEmployee = (newEmployee) => {
    setEmployeeList(prev => [...prev, newEmployee]);
    if (window.showNotification) {
      window.showNotification(`Empleado ${newEmployee.name} agregado exitosamente`, 'success');
    }
    console.log('Nuevo empleado agregado:', newEmployee);
  };

  const handleDeactivateEmployee = (employee) => {
    if (window.confirm(`¿Está seguro de que desea dar de baja a ${employee.name}?`)) {
      setEmployeeList(prev =>
        prev.map(emp =>
          emp.id === employee.id
            ? { ...emp, status: 'Inactivo' }
            : emp
        )
      );
      if (window.showNotification) {
        window.showNotification(`Empleado ${employee.name} dado de baja`, 'info');
      }
      console.log('Empleado dado de baja:', employee.name);
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowConceptsModal(false);
    setShowNewEmployeeModal(false);
    setSelectedEmployee(null);
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
        <div className='button-group'>
        <button className="add-employee-btn" >
          <FileText className="btn-icon" />
          Exportar Lista
        </button>
        <button className="add-employee-btn" onClick={() => setShowNewEmployeeModal(true)}>
          <Plus className="btn-icon" />
          Nuevo Empleado
        </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-overview">
        <div className="card stat-card">
          <div className="stat-value success">{employees.length}</div>
          <p className="stat-label">Total Empleados</p>
        </div>
        <div className="card stat-card">
          <div className="stat-value primary">
            {employees.filter(emp => emp.status === 'Activo').length}
          </div>
          <p className="stat-label">Empleados Activos</p>
        </div>
        <div className="card stat-card">
          <div className="stat-value warning">
            {employees.filter(emp => emp.status === 'Licencia').length}
          </div>
          <p className="stat-label">En Licencia</p>
        </div>
        <div className="card stat-card">
          <div className="stat-value default">{departments.length - 1}</div>
          <p className="stat-label">Departamentos</p>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input search-input"
            />
          </div>
          <div className="filter-controls">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="department-select"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
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
            {filteredEmployees.length} empleados encontrados
          </p>
        </div>
        <div className="card-content list-content">
          <div className="employee-list">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className="employee-item"
              >
                <div className="employee-grid">
                  <div className="employee-info">
                    <h3 className="employee-name">{employee.name}</h3>
                    <p className="employee-email">{employee.email}</p>
                  </div>
                  <div className="employee-position">
                    <p className="position-title">{employee.position}</p>
                    <p className="department">{employee.department}</p>
                  </div>
                  <div className="employee-salary">
                    <p className="salary-amount">
                      ${employee.salary.toLocaleString()}
                    </p>
                    <p className="hire-date">Ingreso: {employee.hireDate}</p>
                  </div>
                  <div className="employee-status">
                    <span className={`status-badge ${getStatusClass(employee.status)}`}>
                      {employee.status}
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
                    >
                      <Edit className="action-icon" />
                    </button>
                  </Tooltip>

                  <Tooltip content="Liquidar sueldo" position="top">
                    <button
                      className="action-icon-button liquidate-action"
                      onClick={() => handleLiquidarSueldo(employee)}
                    >
                      <DollarSign className="action-icon" />
                    </button>
                  </Tooltip>

                  {employee.status === 'Activo' && (
                    <Tooltip content="Dar de baja empleado" position="top">
                      <button
                        className="action-icon-button deactivate-action"
                        onClick={() => handleDeactivateEmployee(employee)}
                      >
                        <UserX className="action-icon" />
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
        onSave={handleNewEmployee}
      />

      <EmployeeViewModal
        isOpen={showViewModal}
        onClose={closeModals}
        employee={selectedEmployee}
        onConceptos={handleConceptos}
        onLiquidarSueldo={handleLiquidarSueldo}
        onHistorialLiquidaciones={handleHistorialLiquidaciones}
      />

      <EmployeeEditModal
        isOpen={showEditModal}
        onClose={closeModals}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />

      <EmployeeConceptsModal
        isOpen={showConceptsModal}
        onClose={closeModals}
        employee={selectedEmployee}
        onSave={handleSaveEmployee}
      />
    </div>
  );
}
