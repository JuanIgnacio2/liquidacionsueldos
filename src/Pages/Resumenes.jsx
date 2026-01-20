import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, DollarSign, User, Building2, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as api from '../services/empleadosAPI';
import { useNotification } from '../Hooks/useNotification';
import '../styles/components/_resumenes.scss';

export default function Resumenes() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('general'); // 'general' o 'empleados'
  const [loading, setLoading] = useState(true);
  const [resumenConceptos, setResumenConceptos] = useState([]);
  
  // Estados para filtros del resumen general
  const [selectedGremio, setSelectedGremio] = useState('');
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
  const [selectedEmployeeMonth, setSelectedEmployeeMonth] = useState('');
  const [resumenEmpleado, setResumenEmpleado] = useState(null);
  const [loadingEmpleado, setLoadingEmpleado] = useState(false);

  // Estados para gráficos de línea
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartTiposPago, setChartTiposPago] = useState(['TOTAL_BRUTO']); // Array para múltiples selecciones

  // Cargar resumen con filtros
  const loadResumenFiltrado = useCallback(async () => {
    try {
      setLoading(true);
      const gremio = selectedGremio && selectedGremio !== '' ? selectedGremio : null;
      const anio = selectedYear && selectedYear !== '' ? parseInt(selectedYear, 10) : null;
      const mes = selectedMonthNum && selectedMonthNum !== '' ? parseInt(selectedMonthNum, 10) : null;
      
      const data = await api.getResumenConceptosFiltrado(gremio, anio, mes);
      setResumenConceptos(data || []);
    } catch (error) {
      console.error('Error al cargar resumen filtrado:', error);
      notify.error(error);
      setResumenConceptos([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGremio, selectedYear, selectedMonthNum]);

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
      const mes = selectedEmployeeMonth && selectedEmployeeMonth !== ''
        ? parseInt(selectedEmployeeMonth, 10)
        : null;

      const data = await api.getResumenEmpleado(selectedEmployeeLegajo, anio, mes);

      setResumenEmpleado(data);
    } catch (error) {
      console.error('Error al cargar resumen del empleado:', error);
      notify.error(error);
      setResumenEmpleado(null);
    } finally {
      setLoadingEmpleado(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeLegajo, selectedEmployeeYear, selectedEmployeeMonth]);

  // Cargar datos históricos para el gráfico (Resumen General)
  const loadChartData = useCallback(async () => {
    if (!selectedYear || selectedYear === '') {
      setChartData([]);
      return;
    }

    try {
      setLoadingChart(true);
      const anio = parseInt(selectedYear, 10);
      const gremio = selectedGremio && selectedGremio !== '' ? selectedGremio : null;
      
      // Cargar datos para cada mes del año
      const meses = [
        { num: 1, name: 'Enero' },
        { num: 2, name: 'Febrero' },
        { num: 3, name: 'Marzo' },
        { num: 4, name: 'Abril' },
        { num: 5, name: 'Mayo' },
        { num: 6, name: 'Junio' },
        { num: 7, name: 'Julio' },
        { num: 8, name: 'Agosto' },
        { num: 9, name: 'Septiembre' },
        { num: 10, name: 'Octubre' },
        { num: 11, name: 'Noviembre' },
        { num: 12, name: 'Diciembre' }
      ];

      const datosMeses = await Promise.all(
        meses.map(async (mes) => {
          try {
            const data = await api.getResumenConceptosFiltrado(gremio, anio, mes.num);
            
            // Calcular totales
            const totalBonificaciones = (data || [])
              .filter(c => {
                const tipo = c.tipoConcepto || c.tipo || '';
                return tipo !== 'DESCUENTO' && tipo !== 'DESCUENTO_LYF' && tipo !== 'DESCUENTO_UOCRA';
              })
              .reduce((sum, c) => sum + (Number(c.totalPagado || c.total || 0)), 0);
            
            const totalDescuentos = (data || [])
              .filter(c => {
                const tipo = c.tipoConcepto || c.tipo || '';
                return tipo === 'DESCUENTO' || tipo === 'DESCUENTO_LYF' || tipo === 'DESCUENTO_UOCRA';
              })
              .reduce((sum, c) => sum + (Number(c.totalPagado || c.total || 0)), 0);
            
            const totalBruto = totalBonificaciones;
            const totalNeto = totalBonificaciones - totalDescuentos;
            
            return {
              mes: mes.name,
              mesNum: mes.num,
              totalBruto,
              totalNeto,
              descuentos: totalDescuentos
            };
          } catch (error) {
            console.error(`Error al cargar datos para ${mes.name}:`, error);
            return {
              mes: mes.name,
              mesNum: mes.num,
              totalBruto: 0,
              totalNeto: 0,
              descuentos: 0
            };
          }
        })
      );

      setChartData(datosMeses);
    } catch (error) {
      console.error('Error al cargar datos del gráfico:', error);
      notify.error(error);
      setChartData([]);
    } finally {
      setLoadingChart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedGremio]);

  // Cargar datos históricos para el gráfico (Resumen por Empleado)
  const loadChartDataEmpleado = useCallback(async () => {
    if (!selectedEmployeeLegajo || !selectedEmployeeYear || selectedEmployeeYear === '') {
      setChartData([]);
      return;
    }

    try {
      setLoadingChart(true);
      const anio = parseInt(selectedEmployeeYear, 10);
      
      // Cargar datos para cada mes del año
      const meses = [
        { num: 1, name: 'Enero' },
        { num: 2, name: 'Febrero' },
        { num: 3, name: 'Marzo' },
        { num: 4, name: 'Abril' },
        { num: 5, name: 'Mayo' },
        { num: 6, name: 'Junio' },
        { num: 7, name: 'Julio' },
        { num: 8, name: 'Agosto' },
        { num: 9, name: 'Septiembre' },
        { num: 10, name: 'Octubre' },
        { num: 11, name: 'Noviembre' },
        { num: 12, name: 'Diciembre' }
      ];

      const datosMeses = await Promise.all(
        meses.map(async (mes) => {
          try {
            const data = await api.getResumenEmpleado(selectedEmployeeLegajo, anio, mes.num);
            
            // Calcular totales desde los conceptos del empleado
            const totalBonificaciones = (data?.conceptos || [])
              .filter(c => {
                const tipo = c.tipoConcepto || c.tipo || '';
                return tipo !== 'DESCUENTO' && tipo !== 'DESCUENTO_LYF' && tipo !== 'DESCUENTO_UOCRA';
              })
              .reduce((sum, c) => sum + (Number(c.total || c.totalPagado || c.monto || 0)), 0);
            
            const totalDescuentos = (data?.conceptos || [])
              .filter(c => {
                const tipo = c.tipoConcepto || c.tipo || '';
                return tipo === 'DESCUENTO' || tipo === 'DESCUENTO_LYF' || tipo === 'DESCUENTO_UOCRA';
              })
              .reduce((sum, c) => sum + (Number(c.total || c.totalPagado || c.monto || 0)), 0);
            
            const totalBruto = totalBonificaciones;
            const totalNeto = totalBonificaciones - totalDescuentos;
            
            return {
              mes: mes.name,
              mesNum: mes.num,
              totalBruto,
              totalNeto,
              descuentos: totalDescuentos
            };
          } catch (error) {
            console.error(`Error al cargar datos para ${mes.name}:`, error);
            return {
              mes: mes.name,
              mesNum: mes.num,
              totalBruto: 0,
              totalNeto: 0,
              descuentos: 0
            };
          }
        })
      );

      setChartData(datosMeses);
    } catch (error) {
      console.error('Error al cargar datos del gráfico del empleado:', error);
      notify.error(error);
      setChartData([]);
    } finally {
      setLoadingChart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeLegajo, selectedEmployeeYear]);

  useEffect(() => {
    // Cargar empleados al iniciar
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Cargar resumen general cuando cambian los filtros o la pestaña
    if (activeTab === 'general') {
      loadResumenFiltrado();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedGremio, selectedYear, selectedMonthNum]);

  useEffect(() => {
    // Cargar resumen cuando cambia el empleado, año o mes seleccionado
    if (activeTab === 'empleados') {
      loadResumenEmpleado();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedEmployeeLegajo, selectedEmployeeYear, selectedEmployeeMonth]);

  useEffect(() => {
    // Cargar datos del gráfico cuando cambian los filtros
    if (activeTab === 'general') {
      loadChartData();
    } else if (activeTab === 'empleados') {
      loadChartDataEmpleado();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedYear, selectedGremio, chartTiposPago, selectedEmployeeLegajo, selectedEmployeeYear]);

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
            nombre: 'Básico',
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

  const handleSearch = () => {
    loadResumenFiltrado();
  };


  return (
    <div className="resumenes-page">
      <div className="resumenes-header">
        <button 
            className="back-button" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            Volver
        </button>
        <h1 className="title title-gradient animated-title">Resumenes</h1>
      </div>

      {/* Pestañas */}
      <div className="resumenes-tabs">
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
          <div className="resumenes-filters">
        <div className="filter-group">
          <label htmlFor="gremio-filter">
            <Building2 className="icon" />
            Gremio:
          </label>
          <select
            id="gremio-filter"
            value={selectedGremio}
            onChange={(e) => setSelectedGremio(e.target.value)}
            className="gremio-select"
          >
            <option value="">Todos los gremios</option>
            <option value="LUZ_Y_FUERZA">Luz y Fuerza</option>
            <option value="UOCRA">UOCRA</option>
          </select>
        </div>

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
            <option value="">Todos los años</option>
            {[2023, 2024, 2025, 2026, 2027].map((year) => (
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
            disabled={!selectedYear || selectedYear === ''}
          >
            <option value="">Todos los meses</option>
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

      {/* Gráfico de línea */}
      <div className="chart-section">
        {loadingChart ? (
          <div className="loading-state">
            <p>Cargando datos del gráfico...</p>
          </div>
        ) : chartData.length > 0 && chartTiposPago.length > 0 ? (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">
                <LineChartIcon className="chart-icon" />
                Evolución Mensual
              </h3>
              <div className="chart-controls">
                <label className="chart-controls-label">
                  <DollarSign className="icon" size={16} />
                  Tipo de Pago:
                </label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={chartTiposPago.includes('TOTAL_BRUTO')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setChartTiposPago([...chartTiposPago, 'TOTAL_BRUTO']);
                        } else {
                          setChartTiposPago(chartTiposPago.filter(t => t !== 'TOTAL_BRUTO'));
                        }
                      }}
                    />
                    <span>Total Bruto</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={chartTiposPago.includes('TOTAL_NETO')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setChartTiposPago([...chartTiposPago, 'TOTAL_NETO']);
                        } else {
                          setChartTiposPago(chartTiposPago.filter(t => t !== 'TOTAL_NETO'));
                        }
                      }}
                    />
                    <span>Total Neto</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={chartTiposPago.includes('DESCUENTOS')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setChartTiposPago([...chartTiposPago, 'DESCUENTOS']);
                        } else {
                          setChartTiposPago(chartTiposPago.filter(t => t !== 'DESCUENTOS'));
                        }
                      }}
                    />
                    <span>Descuentos</span>
                  </label>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                />
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  labelStyle={{ color: '#374151', fontWeight: '600' }}
                />
                <Legend />
                {chartTiposPago.includes('TOTAL_BRUTO') && (
                  <Line 
                    type="monotone" 
                    dataKey="totalBruto"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 8 }}
                    name="Total Bruto"
                  />
                )}
                {chartTiposPago.includes('TOTAL_NETO') && (
                  <Line 
                    type="monotone" 
                    dataKey="totalNeto"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 8 }}
                    name="Total Neto"
                  />
                )}
                {chartTiposPago.includes('DESCUENTOS') && (
                  <Line 
                    type="monotone" 
                    dataKey="descuentos"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 8 }}
                    name="Descuentos"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : selectedYear && selectedYear !== '' ? (
          <div className="loading-state">
            <p>No hay datos disponibles para el gráfico</p>
          </div>
        ) : (
          <div className="loading-state">
            <p>Seleccione un año para ver el gráfico</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Cargando reportes...</p>
        </div>
      ) : (
        <>
          <div className="resumenes-summary">
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

          <div className="resumenes-table-container">
            <table className="resumenes-table">
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
          <div className="resumenes-filters-empleado">
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

            <div className="filter-group">
              <label htmlFor="month-filter-empleado">
                <Calendar className="icon" />
                Mes (opcional):
              </label>
              <select
                id="month-filter-empleado"
                value={selectedEmployeeMonth}
                onChange={(e) => setSelectedEmployeeMonth(e.target.value)}
                className="month-select"
                disabled={!selectedEmployeeYear || selectedEmployeeYear === ''}
              >
                <option value="">Todos los meses</option>
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
          </div>

          {/* Gráfico de línea para empleado */}
          {selectedEmployeeLegajo && selectedEmployeeYear && (
            <div className="chart-section">
              {loadingChart ? (
                <div className="loading-state">
                  <p>Cargando datos del gráfico...</p>
                </div>
              ) : chartData.length > 0 && chartTiposPago.length > 0 ? (
                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">
                      <LineChartIcon className="chart-icon" />
                      Evolución Mensual - {selectedEmployeeYear}
                    </h3>
                    <div className="chart-controls">
                      <label className="chart-controls-label">
                        <DollarSign className="icon" size={16} />
                        Tipo de Pago:
                      </label>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={chartTiposPago.includes('TOTAL_BRUTO')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setChartTiposPago([...chartTiposPago, 'TOTAL_BRUTO']);
                              } else {
                                setChartTiposPago(chartTiposPago.filter(t => t !== 'TOTAL_BRUTO'));
                              }
                            }}
                          />
                          <span>Total Bruto</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={chartTiposPago.includes('TOTAL_NETO')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setChartTiposPago([...chartTiposPago, 'TOTAL_NETO']);
                              } else {
                                setChartTiposPago(chartTiposPago.filter(t => t !== 'TOTAL_NETO'));
                              }
                            }}
                          />
                          <span>Total Neto</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={chartTiposPago.includes('DESCUENTOS')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setChartTiposPago([...chartTiposPago, 'DESCUENTOS']);
                              } else {
                                setChartTiposPago(chartTiposPago.filter(t => t !== 'DESCUENTOS'));
                              }
                            }}
                          />
                          <span>Descuentos</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="mes" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
                      />
                      <Tooltip 
                        formatter={(value) => `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        labelStyle={{ color: '#374151', fontWeight: '600' }}
                      />
                      <Legend />
                      {chartTiposPago.includes('TOTAL_BRUTO') && (
                        <Line 
                          type="monotone" 
                          dataKey="totalBruto"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={{ r: 5 }}
                          activeDot={{ r: 8 }}
                          name="Total Bruto"
                        />
                      )}
                      {chartTiposPago.includes('TOTAL_NETO') && (
                        <Line 
                          type="monotone" 
                          dataKey="totalNeto"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 5 }}
                          activeDot={{ r: 8 }}
                          name="Total Neto"
                        />
                      )}
                      {chartTiposPago.includes('DESCUENTOS') && (
                        <Line 
                          type="monotone" 
                          dataKey="descuentos"
                          stroke="#ef4444"
                          strokeWidth={3}
                          dot={{ r: 5 }}
                          activeDot={{ r: 8 }}
                          name="Descuentos"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : selectedEmployeeYear && selectedEmployeeYear !== '' ? (
                <div className="loading-state">
                  <p>No hay datos disponibles para el gráfico</p>
                </div>
              ) : null}
            </div>
          )}

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

              <div className="resumenes-table-container">
                <table className="resumenes-table">
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