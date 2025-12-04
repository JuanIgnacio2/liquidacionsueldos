import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import * as api from '../services/empleadosAPI';
import '../styles/components/_reportes.scss';

export default function Reportes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resumenConceptos, setResumenConceptos] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return String(now.getFullYear());
  });
  const [selectedMonthNum, setSelectedMonthNum] = useState(() => {
    const now = new Date();
    return String(now.getMonth() + 1).padStart(2, '0');
  });

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
      setResumenConceptos(data || []);
    } catch (error) {
      console.error('Error al cargar resumen del mes seleccionado:', error);
      setResumenConceptos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Por defecto cargar resumen del mes actual
    loadResumenMesActual();
  }, [loadResumenMesActual]);

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
    return (resumenConceptos || []).map((c) => ({
      nombre: c.nombre,
      tipo: c.tipoConcepto || c.tipo || 'OTRO',
      cantidad: c.cantidad || 0,
      total: Number(c.totalPagado || 0)
    })).sort((a, b) => {
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
        <h1 className="page-title">Reportes Mensuales</h1>
        <button 
          className="back-button-icon"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="icon" />
        </button>
      </div>

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
                        ${concepto.total.toLocaleString('es-AR', { 
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
    </div>
  );
}