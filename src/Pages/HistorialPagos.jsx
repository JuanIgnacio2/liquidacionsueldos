import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, DollarSign, Search, Users, ArrowLeft, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/empleadosAPI';
import '../styles/components/_PlaceHolder.scss';
import '../styles/components/_liquidacion.scss';
import '../styles/components/_historialPagos.scss';

export default function HistorialPagos() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPagos();
  }, []);

  const loadPagos = async () => {
    try {
      setLoading(true);
      const data = await api.getPagos();
      setPagos(data || []);
    } catch (error) {
      console.error('Error al cargar los pagos:', error);
      setPagos([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPagos = useMemo(() => {
    if (!normalizedQuery) {
      return pagos;
    }

    return pagos.filter((pago) => {
      return [
        pago.nombreEmpleado,
        pago.apellidoEmpleado,
        pago.legajoEmpleado,
        pago.cuil,
        pago.periodoPago
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(normalizedQuery));
    });
  }, [pagos, normalizedQuery]);

  const totals = useMemo(() => {
    const totalPagos = pagos.length;
    const totalNeto = pagos.reduce((accumulator, pago) => accumulator + (Number(pago.total_neto) || 0), 0);
    return { totalPagos, totalNeto };
  }, [pagos]);

  const filteredTotals = useMemo(() => {
    const totalPagos = filteredPagos.length;
    const totalNeto = filteredPagos.reduce((accumulator, pago) => accumulator + (Number(pago.total_neto) || 0), 0);
    return { totalPagos, totalNeto };
  }, [filteredPagos]);

  const formatCurrency = (value) =>
    typeof value === 'number'
      ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : value;

  return (
    <div className="placeholder-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <button 
            className="back-button" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
            Volver
          </button>
          <h1 className="title title-gradient animated-title">
            Historial de Pagos
          </h1>
          <p className="subtitle">
            Consulta el registro completo de liquidaciones realizadas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value primary">{totals.totalPagos}</div>
              <p className="stat-label">Liquidaciones</p>
            </div>
            <Calendar className="stat-icon primary" />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-content">
            <div className="stat-info">
              <div className="stat-value success">{formatCurrency(totals.totalNeto)}</div>
              <p className="stat-label">Total Neto</p>
            </div>
            <DollarSign className="stat-icon success" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content-history">
        <div className="card employees-list">
          <div className="card-header list-header">
            <h2 className="list-title section-title-effect">Listado de Pagos</h2>
            <p className="list-description">
              {totals.totalPagos} liquidación{totals.totalPagos !== 1 ? 'es' : ''} registrada{totals.totalPagos !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="card-content list-content">
            {/* Search Section */}
            <div className="search-section" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="pago-search">Buscar pago</label>
              <div className="search-field">
                <Search className="search-icon" />
                <input
                  id="pago-search"
                  type="search"
                  placeholder="Ingresá nombre, legajo o período"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <span className="results-count">
                Mostrando {filteredTotals.totalPagos} de {totals.totalPagos} liquidaciones — Neto{' '}
                {formatCurrency(filteredTotals.totalNeto)}
              </span>
            </div>

            {/* Content */}
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Cargando pagos...</p>
              </div>
            ) : filteredPagos.length > 0 ? (
              <div className="employee-list">
                {filteredPagos.map((pago) => (
                  <div
                    key={pago.id}
                    className="employee-item"
                  >
                    <div className="employee-grid">
                      <div className="employee-info">
                        <h3 className="employee-name">{`${pago.apellidoEmpleado || ''} ${pago.nombreEmpleado || ''}`}</h3>
                        <p className="employee-email">Legajo: {pago.legajoEmpleado || '-'}</p>
                      </div>
                      <div className="employee-position">
                        <p className="position-title">Período: {pago.periodoPago || '-'}</p>
                        <p className="department">
                          Fecha: {pago.fechaPago ? new Date(pago.fechaPago).toLocaleDateString('es-AR') : '-'}
                        </p>
                      </div>
                      <div className="employee-salary">
                        <p className="salary-amount">
                          {formatCurrency(pago.total_neto || 0)}
                        </p>
                        <p className="hire-date">Total Neto</p>
                      </div>
                      <div className="employee-status">
                        <span className={`status-badge ${pago.estado?.toLowerCase() || 'completada'}`}>
                          {pago.estado ? pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1) : 'Completada'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Search className="empty-icon" />
                <h3>Sin resultados</h3>
                <p>No se encontraron pagos que coincidan con tu búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}