import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, DollarSign, User } from 'lucide-react';
import * as api from '../services/empleadosAPI';
import '../styles/components/_reportes.scss';

export default function Reportes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general'); // 'general' o 'empleados'
  const [loading, setLoading] = useState(true);
  const [resumenConceptos, setResumenConceptos] = useState([]);
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return String(now.getFullYear());
  });
  const [selectedMonthNum, setSelectedMonthNum] = useState(() => {
    const now = new Date();
    return String(now.getMonth() + 1).padStart(2, '0');
  });
  
  // Estados para la pestaña de empleados
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeLegajo, setSelectedEmployeeLegajo] = useState('');
  const [selectedEmployeeYear, setSelectedEmployeeYear] = useState('');
  const [resumenEmpleado, setResumenEmpleado] = useState(null);
  const [loadingEmpleado, setLoadingEmpleado] = useState(false);

  // Carga del resumen de conceptos. Por defecto usamos el endpoint del mes actual.
  const loadResumenMesActual = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getResumeMonth();
      setResumenConceptos(data || []);
    } catch (error) {
      console.error('Error al cargar resumen del mes actual:', error);
      setResumenConceptos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResumenPorMes = useCallback(async (periodo) => {
    try {
      setLoading(true);
      const data = await api.getResumeCustomMonth(periodo);
      console.log('data', data);
      setResumenConceptos(data || []);
    } catch (error) {
      console.error('Error al cargar resumen del mes seleccionado:', error);
      setResumenConceptos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar empleados para el selector
  const loadEmployees = useCallback(async () => {
    try {
      const data = await api.getEmployees();
      // Filtrar solo empleados activos y ordenar por legajo
      const activos = (data || [])
        .filter(emp => (emp.estado || '').toString().toUpperCase() === 'ACTIVO')
        .sort((a, b) => a.legajo - b.legajo);
      setEmployees(activos);
    } catch (error) {
      console.error('Error al cargar empleados:', error);
      setEmployees([]);
    }
  }, []);

  // Cargar resumen de empleado
  const loadResumenEmpleado = useCallback(async () => {
    if (!selectedEmployeeLegajo) {
      setResumenEmpleado(null);
      return;
    }

    try {
      setLoadingEmpleado(true);
      const anio = selectedEmployeeYear && selectedEmployeeYear !== '' 
        ? parseInt(selectedEmployeeYear, 10) 
        : null;
      console.log('loadResumenEmpleado - selectedEmployeeYear:', selectedEmployeeYear, 'anio parsed:', anio);
      const data = await api.getResumenEmpleado(selectedEmployeeLegajo, anio);

      console.log('data recibida:', data);

      setResumenEmpleado(data);
    } catch (error) {
      console.error('Error al cargar resumen del empleado:', error);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);
      setResumenEmpleado(null);
    } finally {
      setLoadingEmpleado(false);
    }
  }, [selectedEmployeeLegajo, selectedEmployeeYear]);

  useEffect(() => {
    // Por defecto cargar resumen del mes actual
    loadResumenMesActual();
    // Cargar empleados
    loadEmployees();
  }, [loadResumenMesActual, loadEmployees]);

  useEffect(() => {
    // Cargar resumen cuando cambia el empleado o año seleccionado
    if (activeTab === 'empleados') {
      loadResumenEmpleado();
    }
  }, [activeTab, loadResumenEmpleado]);

  // Mapeo de tipos de concepto para ordenamiento
  const tipoConceptoOrder = {
    'CATEGORIA': 1,
    'CONCEPTO_LYF': 2,
    'CONCEPTO_UOCRA': 3,
    'BONIFICACION_AREA': 4,
    'CATEGORIA_ZONA': 5,
    'DESCUENTO': 6,
    'OTRO': 7
  };

  // En este modo usamos el resumen que devuelve el backend: 'resumenConceptos'
  const conceptosAgrupados = useMemo(() => {
    // El backend ya devuelve objetos con { nombre, tipoConcepto, cantidad, totalPagado }
    const conceptosRaw = (resumenConceptos || []).map((c) => ({
      nombre: c.nombre,
      tipo: c.tipoConcepto || c.tipo || 'OTRO',
      cantidad: c.cantidad || 0,
      total: Number(c.totalPagado || 0)
    }));

    // Agrupar conceptos según el tipo
    const agrupados = {};
    
    conceptosRaw.forEach((concepto) => {
      if (concepto.tipo === 'CATEGORIA') {
        // Agrupar todos los sueldos básicos en uno solo
        const key = 'CATEGORIA_TOTAL';
        if (!agrupados[key]) {
          agrupados[key] = {
            nombre: 'Sueldo Básico',
            tipo: 'CATEGORIA',
            cantidad: 0,
            total: 0
          };
        }
        agrupados[key].cantidad += concepto.cantidad;
        agrupados[key].total += concepto.total;
      } else if (concepto.tipo === 'BONIFICACION_AREA') {
        // Agrupar bonificaciones de área por nombre de área
        const key = `BONIFICACION_AREA_${concepto.nombre}`;
        if (!agrupados[key]) {
          agrupados[key] = {
            nombre: concepto.nombre,
            tipo: 'BONIFICACION_AREA',
            cantidad: 0,
            total: 0
          };
        }
        agrupados[key].cantidad += concepto.cantidad;
        agrupados[key].total += concepto.total;
      } else {
        // Para otros tipos, mantener como están (o agrupar por nombre si hay duplicados)
        const key = `${concepto.tipo}_${concepto.nombre}`;
        if (!agrupados[key]) {
          agrupados[key] = {
            nombre: concepto.nombre,
            tipo: concepto.tipo,
            cantidad: 0,
            total: 0
          };
        }
        agrupados[key].cantidad += concepto.cantidad;
        agrupados[key].total += concepto.total;
      }
    });

    // Convertir objeto a array y ordenar
    return Object.values(agrupados).sort((a, b) => {
      // Ordenar por tipo de concepto primero, luego por total descendente
      const aOrder = tipoConceptoOrder[a.tipo] || 99;
      const bOrder = tipoConceptoOrder[b.tipo] || 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.total - a.total;
    });
  }, [resumenConceptos, tipoConceptoOrder]);

  const totalBonificaciones = conceptosAgrupados
    .filter(c => c.tipo !== 'DESCUENTO')
    .reduce((sum, c) => sum + c.total, 0);

  const totalDescuentos = conceptosAgrupados
    .filter(c => c.tipo === 'DESCUENTO')
    .reduce((sum, c) => sum + c.total, 0);

  const handleSearch = async () => {
    // Construir periodo en formato YYYYMM
    const periodo = `${selectedYear}-${selectedMonthNum}`;
    await loadResumenPorMes(periodo);
  };

  return (
    <div className="reportes-page">
      <div className="reportes-header">
        <h1 className="page-title">Reportes</h1>
        <button 
          className="back-button-icon"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="icon" />
        </button>
      </div>

      {/* Pestañas */}
      <div className="reportes-tabs">
        <button
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <TrendingUp className="tab-icon" />
          Resumen General
        </button>
        <button
          className={`tab-button ${activeTab === 'empleados' ? 'active' : ''}`}
          onClick={() => setActiveTab('empleados')}
        >
          <User className="tab-icon" />
          Resumen por Empleado
        </button>
      </div>

      {/* Contenido de pestaña: Resumen General */}
      {activeTab === 'general' && (
        <>
          <div className="reportes-filters">
        <div className="filter-group">
          <label htmlFor="year-filter">
            <Calendar className="icon" />
            Año:
          </label>
          <select
            id="year-filter"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="year-select"
          >
            {[2023, 2024, 2025, 2026].map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="month-filter">
            <Calendar className="icon" />
            Mes:
          </label>
          <select
            id="month-filter"
            value={selectedMonthNum}
            onChange={(e) => setSelectedMonthNum(e.target.value)}
            className="month-select"
          >
            {[
              { num: '01', name: 'Enero' },
              { num: '02', name: 'Febrero' },
              { num: '03', name: 'Marzo' },
              { num: '04', name: 'Abril' },
              { num: '05', name: 'Mayo' },
              { num: '06', name: 'Junio' },
              { num: '07', name: 'Julio' },
              { num: '08', name: 'Agosto' },
              { num: '09', name: 'Septiembre' },
              { num: '10', name: 'Octubre' },
              { num: '11', name: 'Noviembre' },
              { num: '12', name: 'Diciembre' }
            ].map((month) => (
              <option key={month.num} value={month.num}>
                {month.name}
              </option>
            ))}
          </select>
        </div>

        <button 
          className="search-button"
          onClick={handleSearch}
        >
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Cargando reportes...</p>
        </div>
      ) : (
        <>
          <div className="reportes-summary">
            <div className="summary-card bonificaciones">
              <div className="summary-icon">
                <TrendingUp />
              </div>
              <div className="summary-content">
                <p className="summary-label">Total Bonificaciones</p>
                <p className="summary-value">
                  ${totalBonificaciones.toLocaleString('es-AR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
              </div>
            </div>
            <div className="summary-card descuentos">
              <div className="summary-icon">
                <TrendingDown />
              </div>
              <div className="summary-content">
                <p className="summary-label">Total Descuentos</p>
                <p className="summary-value">
                  ${totalDescuentos.toLocaleString('es-AR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
              </div>
            </div>
            <div className="summary-card neto">
              <div className="summary-icon">
                <DollarSign />
              </div>
              <div className="summary-content">
                <p className="summary-label">Diferencia Neto</p>
                <p className="summary-value">
                  ${(totalBonificaciones - totalDescuentos).toLocaleString('es-AR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="reportes-table-container">
            <table className="reportes-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Total Mensual</th>
                </tr>
              </thead>
              <tbody>
                {conceptosAgrupados.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data">
                      No hay datos disponibles para el mes seleccionado
                    </td>
                  </tr>
                ) : (
                  conceptosAgrupados.map((concepto, index) => (
                    <tr key={index} className={concepto.tipo.toLowerCase()}>
                      <td className="concepto-nombre">{concepto.nombre}</td>
                      <td>
                        <span className={`tipo-badge ${concepto.tipo.toLowerCase()}`}>
                          {concepto.tipo}
                        </span>
                      </td>
                      <td>{concepto.cantidad}</td>
                      <td className="concepto-total">
                        ${(concepto.total || 0).toLocaleString('es-AR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
        </>
      )}

      {/* Contenido de pestaña: Resumen por Empleado */}
      {activeTab === 'empleados' && (
        <>
          <div className="reportes-filters-empleado">
            <div className="filter-group">
              <label htmlFor="employee-filter">
                <User className="icon" />
                Empleado:
              </label>
              <select
                id="employee-filter"
                value={selectedEmployeeLegajo}
                onChange={(e) => setSelectedEmployeeLegajo(e.target.value)}
                className="employee-select"
              >
                <option value="">Seleccione un empleado</option>
                {employees.map((emp) => (
                  <option key={emp.legajo} value={emp.legajo}>
                    {emp.legajo} - {emp.apellido}, {emp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="year-filter-empleado">
                <Calendar className="icon" />
                Año (opcional):
              </label>
              <select
                id="year-filter-empleado"
                value={selectedEmployeeYear}
                onChange={(e) => setSelectedEmployeeYear(e.target.value)}
                className="year-select"
              >
                <option value="">Todos los años</option>
                {[2023, 2024, 2025, 2026, 2027].map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingEmpleado ? (
            <div className="loading-state">
              <p>Cargando resumen del empleado...</p>
            </div>
          ) : resumenEmpleado ? (
            <>
              <div className="empleado-resumen-header">
                <div className="empleado-info">
                  <h2>{resumenEmpleado.empleado}</h2>
                  <p className="empleado-legajo">Legajo: {resumenEmpleado.legajo}</p>
                  {resumenEmpleado.anio && (
                    <p className="empleado-anio">Año: {resumenEmpleado.anio}</p>
                  )}
                </div>
                <div className="empleado-total">
                  <p className="total-label">Total General</p>
                  <p className="total-value">
                    ${resumenEmpleado.totalGeneral.toLocaleString('es-AR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
              </div>

              <div className="reportes-table-container">
                <table className="reportes-table">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Tipo</th>
                      <th>Unidades</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenEmpleado.conceptos && resumenEmpleado.conceptos.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="no-data">
                          No hay conceptos registrados para este empleado
                        </td>
                      </tr>
                    ) : (
                      resumenEmpleado.conceptos?.map((concepto, index) => {
                        const nombreConcepto = concepto.concepto || concepto.nombre || concepto.descripcion || '—';
                        const unidades = concepto.unidades || concepto.cantidad || 0;
                        const total = concepto.total || concepto.totalPagado || concepto.monto || 0;
                        const tipoConcepto = concepto.tipoConcepto || concepto.tipo || '—';
                        
                        return (
                          <tr key={index} className={tipoConcepto?.toLowerCase().includes('descuento') ? 'descuento' : 'bonificacion'}>
                            <td className="concepto-nombre">{nombreConcepto}</td>
                            <td>
                              <span className={`tipo-badge ${tipoConcepto?.toLowerCase() || ''}`}>
                                {tipoConcepto}
                              </span>
                            </td>
                            <td>{unidades}</td>
                            <td className="concepto-total">
                              ${total.toLocaleString('es-AR', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : selectedEmployeeLegajo ? (
            <div className="loading-state">
              <p>No hay datos disponibles para el empleado seleccionado</p>
            </div>
          ) : (
            <div className="loading-state">
              <p>Seleccione un empleado para ver su resumen</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}