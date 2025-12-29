import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, FileText, Calculator, DollarSign, Clock, Eye, TrendingUp } from "lucide-react";
import { ProcessPayrollModal } from "../Components/ProcessPayrollModal/ProcessPayrollModal";
import { NewEmployeeModal } from "../Components/NewEmployeeModal/NewEmployeeModal";
import { EmployeeViewModal } from "../Components/EmployeeViewModal/EmployeeViewModal";
import PayrollDetailModal from "../Components/PayrollDetailModal/PayrollDetailModal";
import { Modal, ModalFooter } from "../Components/Modal/Modal";
import {useNotification} from '../Hooks/useNotification';
import { LoadingSpinner } from "../Components/ui/LoadingSpinner";
import { StatsGrid } from "../Components/ui/card";
import "../styles/components/_dashboard.scss";
import * as api from "../services/empleadosAPI";

export default function Dashboard() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [activeEmployees, setActiveEmployees] = useState();
  const [gremiosCount, setGremiosCount] = useState();
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loading, setLoading] = useState(true);
  // Estados para modales de detalles
  const [showEmployeeViewModal, setShowEmployeeViewModal] = useState(false);
  const [showPayrollDetailModal, setShowPayrollDetailModal] = useState(false);
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState(null);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [selectedEmployeeForPayroll, setSelectedEmployeeForPayroll] = useState(null);
  const [payrollDetails, setPayrollDetails] = useState(null);
  const [loadingPayrollDetails, setLoadingPayrollDetails] = useState(false);

  const countActiveEmployees = async () => {
    try {
      const count = await api.getCountActiveEmployees();
      setActiveEmployees(count);
    } catch (error) {
      notify.error("Error al obtener el conteo de empleados activos", error);
    }
  };

  const countGremios = async () => {
    try {
      const count = await api.countConvenios();
      setGremiosCount(count);
    } catch (error) {
      notify.error("Error al obtener el conteo de gremios", error);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await api.getEmployees();
      const ordenados = data.sort((a, b) => a.legajo - b.legajo);
      setEmployees(ordenados);
    } catch (error) {
      notify.error("Error al cargar los empleados", error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setDashboardStats(data || null);
    } catch (error) {
      notify.error("Error al cargar estadísticas del dashboard");
    }
  };

  const loadActividades = async () => {
    setLoadingActivities(true);
    try {
      const data = await api.getActividadesRecientes();
      setActividades(Array.isArray(data) ? data : []);
    } catch (error) {
      notify.error("Error al cargar actividades recientes");
      setActividades([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
      setLoading(true);
      await Promise.all([
      countActiveEmployees(),
      countGremios(),
      loadEmployees(),
      loadDashboardStats(),
      loadActividades(),
      ]);
      } catch (error) {
        notify.error("Error al cargar datos del dashboard");
      }
      finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Helper para formatear tipo de referencia
  const getReferenciaLabel = (referenciaTipo) => {
    const labels = {
      ALTA_EMPLEADO: "Empleado agregado",
      BAJA_EMPLEADO: "Empleado dado de baja",
      EDIT_EMPLEADO: "Empleado editado",
      PAGO: "Liquidación procesada",
      EDIT_CONVENIO: "Convenio actualizado",
    };
    return labels[referenciaTipo] || referenciaTipo || "Acción";
  };

  // Helper para formatear fecha
  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora - date;
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 60)
      return `hace ${minutos} minuto${minutos !== 1 ? "s" : ""}`;
    if (horas < 24) return `hace ${horas} hora${horas !== 1 ? "s" : ""}`;
    if (dias < 7) return `hace ${dias} día${dias !== 1 ? "s" : ""}`;

    return date.toLocaleDateString("es-AR");
  };

  // Manejar clic en detalles de actividad
  const handleViewActivityDetails = async (activity) => {
    const { referenciaTipo, referenciaId } = activity;

    // Cerrar el modal de actividades si está abierto
    setShowActivitiesModal(false);

    try {
      switch (referenciaTipo) {
        case 'ALTA_EMPLEADO':
        case 'BAJA_EMPLEADO':
        case 'EDIT_EMPLEADO': {
          // referenciaId es el legajo del empleado
          const legajo = referenciaId;
          const employee = employees.find(emp => emp.legajo === legajo || emp.legajo === Number(legajo));
          
          if (employee) {
            setSelectedEmployeeForView(employee);
            setShowEmployeeViewModal(true);
          } else {
            // Si no está en la lista, obtenerlo de la API
            try {
              const employeeData = await api.getEmpleadoByLegajo(legajo);
              setSelectedEmployeeForView(employeeData);
              setShowEmployeeViewModal(true);
            } catch (error) {
              notify.error('No se pudo cargar la información del empleado');
            }
          }
          break;
        }
        case 'PAGO': {
          // referenciaId es el ID del pago
          setShowPayrollDetailModal(true);
          setLoadingPayrollDetails(true);
          setPayrollDetails(null);
          setSelectedPayroll(null);
          setSelectedEmployeeForPayroll(null);

          try {
            // Obtener detalles del pago
            const detalle = await api.getDetallePago(referenciaId);
            setPayrollDetails(detalle);
            
            // Buscar el empleado correspondiente por legajo
            const legajo = detalle.legajo || detalle.legajoEmpleado;
            if (legajo) {
              const employee = employees.find(emp => emp.legajo === legajo || emp.legajo === Number(legajo));
              if (employee) {
                setSelectedEmployeeForPayroll(employee);
              } else {
                // Si no está en la lista, obtenerlo de la API
                try {
                  const employeeData = await api.getEmpleadoByLegajo(legajo);
                  setSelectedEmployeeForPayroll(employeeData);
                } catch (error) {
                  console.error('Error al obtener empleado:', error);
                }
              }
            }
            
            // Crear objeto selectedPayroll con la información disponible
            setSelectedPayroll({
              id: referenciaId,
              legajoEmpleado: detalle.legajo || detalle.legajoEmpleado,
              nombreEmpleado: detalle.nombre,
              apellidoEmpleado: detalle.apellido,
              periodoPago: detalle.periodoPago,
              total_neto: detalle.total_neto || detalle.totalNeto
            });
          } catch (error) {
            notify.error('No se pudo cargar la información de la liquidación');
          } finally {
            setLoadingPayrollDetails(false);
          }
          break;
        }
        case 'EDIT_CONVENIO': {
          // referenciaId puede ser un número (1 = lyf, 2 = uocra) o el controller string
          // Mapear número a controller si es necesario
          let controller = referenciaId;
          if (typeof referenciaId === 'number' || (typeof referenciaId === 'string' && /^\d+$/.test(referenciaId))) {
            const numId = Number(referenciaId);
            controller = numId === 1 ? 'lyf' : (numId === 2 ? 'uocra' : referenciaId);
          }
          // Navegar a la página de detalle del convenio
          navigate(`/convenios/${controller}`);
          break;
        }
        default:
          notify.log('Tipo de actividad no soportado para ver detalles');
      }
    } catch (error) {
      notify.error('Error al cargar los detalles de la actividad');
    }
  };

  const handleProcessPayroll = (result) => {
    notify.log("Procesamiento completado");
    // Puedes agregar lógica adicional aquí si es necesario
    countActiveEmployees(); // Refrescar conteo
  };

  const handleSaveEmployee = async (dto, isEdit) => {
    try {
      if (isEdit) {
        await api.updateEmployee(dto.legajo, dto);
      } else {
        await api.createEmployee(dto);
      }
      await loadEmployees(); // Refrescar lista
      await countActiveEmployees(); // Refrescar conteo
      setShowNewEmployeeModal(false);
    } catch (err) {
      notify("Error al registrar empleado");
    }
  };

  const stats = [
    {
      title: "Empleados Activos",
      value:
        dashboardStats?.cantidadEmpleados ?? activeEmployees ?? "Cargando...",
      icon: Users,
      colorClass: "success",
    },
    {
      title: "Liquidaciones Pendientes",
      value: dashboardStats?.cantidadLiquidacionesPendientes ?? "Cargando...",
      icon: Clock,
      colorClass: "warning",
    },
    {
      title: "Total Bruto",
      value: dashboardStats?.totalBrutoMes
        ? `$${Number(dashboardStats.totalBrutoMes).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : "Cargando...",
      icon: DollarSign,
      colorClass: "primary",
    }
  ];

  // Obtener las últimas 4 actividades
  const recentActivities = actividades.slice(0, 4);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="title title-gradient animated-title">
              Dashboard de Gestión de Sueldos
            </h1>
            <p className="subtitle">
              Resumen de la actividad y métricas principales del sistema
            </p>
          </div>
        </div>
        <LoadingSpinner
          message="Cargando..."
          size="lg"
          className="list-loading"
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="title title-gradient animated-title">
          Dashboard de Gestión de Sueldos
        </h1>
        <p className="subtitle">
          Resumen de la actividad y métricas principales del sistema
        </p>
      </div>

      {/* Stats Cards */}
      <StatsGrid
        className="stats-overview"
        stats={stats.map(s => ({
          icon: s.icon,
          value: s.value,
          label: s.title,
          colorClass: s.colorClass
        }))}
      />

      <div className="main-grid">
        {/* Recent Activity */}
        <div className="card activity-section">
          <div className="card-header">
            <h2 className="card-title section-title-effect">
              Actividad Reciente
            </h2>
            <p className="card-description">
              Últimas acciones realizadas en el sistema
            </p>
          </div>
          <div className="card-content">
            {loadingActivities ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#6b7280",
                }}
              >
                <p>Cargando actividades...</p>
              </div>
            ) : recentActivities.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#6b7280",
                }}
              >
                <p>No hay actividades recientes</p>
              </div>
            ) : (
              <>
                <div className="activity-list">
                  {recentActivities.map((activity, index) => (
                    <div key={activity.id || index} className="activity-item">
                      <div className="activity-info">
                        <p className="activity-action">
                          {getReferenciaLabel(activity.referenciaTipo)}
                        </p>
                        <p className="activity-employee">
                          {activity.descripcion || "Sin descripción"}
                        </p>
                        {activity.usuario && (
                          <p className="activity-user" style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginTop: '0.25rem'
                          }}>
                            Realizado por: {activity.usuario}
                          </p>
                        )}
                      </div>
                      <div className="activity-details">
                        <p className="activity-time">
                          {formatFecha(activity.fecha)}
                        </p>
                        {(activity.referenciaTipo === 'ALTA_EMPLEADO' || 
                          activity.referenciaTipo === 'BAJA_EMPLEADO' || 
                          activity.referenciaTipo === 'EDIT_EMPLEADO' ||
                          activity.referenciaTipo === 'PAGO' ||
                          activity.referenciaTipo === 'EDIT_CONVENIO') && (
                          <button
                            className="activity-view-btn"
                            onClick={() => handleViewActivityDetails(activity)}
                            title="Ver detalles"
                            style={{
                              marginLeft: '0.5rem',
                              padding: '0.25rem',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#22c55e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {actividades.length > 4 && (
                  <div
                    style={{
                      marginTop: "1rem",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      className="view-all-activities-btn"
                      onClick={() => setShowActivitiesModal(true)}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#22c55e",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Eye size={16} />
                      Ver todas las actividades
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card quick-actions">
          <div className="card-header">
            <h2 className="card-title section-title-effect">
              Acciones Rápidas
            </h2>
            <p className="card-description">Operaciones más utilizadas</p>
          </div>
          <div className="card-content">
            <div className="actions-list">
              <button
                className="action-btn primary"
                onClick={() => setShowProcessModal(true)}
              >
                <span>Nueva Liquidación</span>
                <Calculator className="action-icon" />
              </button>
              <button
                className="action-btn success"
                onClick={() => setShowNewEmployeeModal(true)}
              >
                <span>Agregar Empleado</span>
                <Users className="action-icon" />
              </button>
              <button
                className="action-btn warning"
                onClick={() => navigate("/reportes")}
              >
                <span>Resumenes</span>
                <TrendingUp className="action-icon" />
              </button>
              <button
                className="action-btn secondary"
                onClick={() => navigate("/convenios")}
              >
                <span>Gestionar Convenios</span>
                <FileText className="action-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ProcessPayrollModal
        isOpen={showProcessModal}
        onClose={() => {
          setShowProcessModal(false);
          setSelectedEmployeeForView(null);
        }}
        onProcess={handleProcessPayroll}
        employees={employees}
        initialEmployee={selectedEmployeeForView}
      />
      <NewEmployeeModal
        isOpen={showNewEmployeeModal}
        onClose={() => setShowNewEmployeeModal(false)}
        onSave={handleSaveEmployee}
      />

      {/* Modal de Vista de Empleado */}
      <EmployeeViewModal
        isOpen={showEmployeeViewModal}
        onClose={() => {
          setShowEmployeeViewModal(false);
          setSelectedEmployeeForView(null);
        }}
        employee={selectedEmployeeForView}
        onEditEmployee={(employee) => {
          // Navegar a la página de empleados para editar
          navigate('/empleados');
        }}
        onLiquidarSueldo={(employee) => {
          setSelectedEmployeeForView(employee);
          setShowEmployeeViewModal(false);
          setShowProcessModal(true);
        }}
      />

      {/* Modal de Detalle de Liquidación */}
      <PayrollDetailModal
        isOpen={showPayrollDetailModal}
        onClose={() => {
          setShowPayrollDetailModal(false);
          setSelectedPayroll(null);
          setSelectedEmployeeForPayroll(null);
          setPayrollDetails(null);
        }}
        selectedPayroll={selectedPayroll}
        selectedEmployee={selectedEmployeeForPayroll}
        payrollDetails={payrollDetails}
        loadingDetails={loadingPayrollDetails}
        onPrint={() => {
          // Implementar impresión si es necesario
          notify.log('Función de impresión no implementada');
        }}
        onDownload={() => {
          // Implementar descarga si es necesario
          notify.log('Función de descarga no implementada');
        }}
      />

      {/* Modal Actividades Completas */}
      <Modal
        isOpen={showActivitiesModal}
        onClose={() => {
          setShowActivitiesModal(false);
          // Resetear filtros y paginación al cerrar
          setPage(0);
          setFilterUsuario('');
          setFilterFechaDesde('');
          setFilterFechaHasta('');
          setFilterTipo('');
        }}
        title="Historial de Actividades Completo"
        size="large"
      >
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {loadingActivities ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p>Cargando actividades...</p>
            </div>
          ) : actividades.length === 0 ? (
            <div
              style={{ padding: "20px", textAlign: "center", color: "#999" }}
            >
              <p>No hay actividades registradas</p>
            </div>
          ) : (
            <div style={{ paddingBottom: "16px" }}>
              {actividades.map((activity, idx) => (
                <div
                  key={activity.id || idx}
                  style={{
                    padding: "16px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    >
                      {getReferenciaLabel(activity.referenciaTipo)}
                    </p>
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "14px",
                        color: "#6b7280",
                      }}
                    >
                      {activity.descripcion}
                    </p>
                    <p
                      style={{
                        margin: "0",
                        fontSize: "12px",
                        color: "#9ca3af",
                      }}
                    >
                      <strong>{activity.usuario}</strong> •{" "}
                      {formatFecha(activity.fecha)}
                    </p>
                  </div>
                  {(activity.referenciaTipo === 'ALTA_EMPLEADO' || 
                    activity.referenciaTipo === 'BAJA_EMPLEADO' || 
                    activity.referenciaTipo === 'EDIT_EMPLEADO' ||
                    activity.referenciaTipo === 'PAGO' ||
                    activity.referenciaTipo === 'EDIT_CONVENIO') && (
                    <button
                      onClick={() => handleViewActivityDetails(activity)}
                      title="Ver detalles"
                      style={{
                        padding: "0.5rem",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#22c55e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: "1rem"
                      }}
                    >
                      <Eye size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            <div className="pagination-info">
              <span className="pagination-text">
                Mostrando {actividadesPaginadas.length > 0 ? page * size + 1 : 0} - {Math.min((page + 1) * size, totalElements)} de {totalElements}
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
                <ChevronLeft size={16} />
                <ChevronLeft size={16} />
              </button>
              <button
                className="pagination-btn"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                title="Página anterior"
              >
                <ChevronLeft size={16} />
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
                <ChevronRight size={16} />
              </button>
              <button
                className="pagination-btn"
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                title="Última página"
              >
                <ChevronRight size={16} />
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        <ModalFooter>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowActivitiesModal(false);
              setPage(0);
              setFilterUsuario('');
              setFilterFechaDesde('');
              setFilterFechaHasta('');
              setFilterTipo('');
            }}
          >
            Cerrar
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
