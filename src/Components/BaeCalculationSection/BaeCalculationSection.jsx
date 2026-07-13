import React, { useCallback, useEffect, useState } from 'react';
import { Award, CheckCircle, Eye, Loader2, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import * as api from '../../services/empleadosAPI';
import { useNotification } from '../../Hooks/useNotification';

const formatMoneyAR = (value) => {
  const n = Number(value ?? 0);
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CUMPLIMIENTO_OPCIONES = [
  { value: 0, label: '0% — sin años adicionales de requisitos cumplidos' },
  { value: 20, label: '+20% — 2 años (ej. año actual y anterior)' },
  { value: 40, label: '+40% — 3 años consecutivos' },
  { value: 60, label: '+60% — 4 años consecutivos' },
  { value: 80, label: '+80% — 5 años consecutivos' },
  { value: 100, label: '+100% — 6 años consecutivos' },
];

function formatFecha(fecha) {
  if (!fecha) return '—';
  try {
    return new Date(fecha).toLocaleDateString('es-AR');
  } catch {
    return String(fecha);
  }
}

function estadoEsActivo(estado) {
  const s = String(estado ?? '').toUpperCase();
  return s === 'ACTIVO' || s === 'ACTIVE';
}

/** Año calendario del BAE (en 2026 se calcula el BAE de 2025). */
export const getAnioBaePorDefecto = () => new Date().getFullYear() - 1;

function BaeDetallePanel({ bae, titulo = 'Detalle del BAE' }) {
  if (!bae) return null;
  const activo = estadoEsActivo(bae.estado);

  return (
    <div className={`bae-resultado${activo ? ' bae-resultado--activo' : ''}`}>
      <h3 className="bae-resultado-titulo">
        {titulo}
        {activo && <span className="bae-badge-activo">Activo</span>}
      </h3>
      <dl className="bae-dl">
        <div><dt>Año</dt><dd>{bae.anio ?? '—'}</dd></div>
        <div><dt>Monto base</dt><dd>${formatMoneyAR(bae.montoBase)}</dd></div>
        <div><dt>% antigüedad</dt><dd>{bae.porcentajeAntiguedad ?? '—'}%</dd></div>
        <div><dt>% cumplimiento</dt><dd>{bae.porcentajeCumplimiento ?? '—'}%</dd></div>
        <div><dt>Monto total</dt><dd>${formatMoneyAR(bae.montoTotal)}</dd></div>
        <div><dt>Cuotas totales / restantes</dt><dd>{bae.cuotasTotales ?? '—'} / {bae.cuotasRestantes ?? '—'}</dd></div>
        <div><dt>Monto por cuota</dt><dd>${formatMoneyAR(bae.montoCuota)}</dd></div>
        <div><dt>Estado</dt><dd>{bae.estado ?? '—'}</dd></div>
        <div><dt>Fecha cálculo</dt><dd>{formatFecha(bae.fechaCalculo)}</dd></div>
      </dl>
    </div>
  );
}

export function BaeCalculationSection({ employees, selectedEmployee = null }) {
  const notify = useNotification();
  const legajoEmpleado = selectedEmployee?.legajo != null ? String(selectedEmployee.legajo) : '';
  const [legajoSel, setLegajoSel] = useState(legajoEmpleado);
  const [anio, setAnio] = useState(getAnioBaePorDefecto());
  const [porcentajeCumplimiento, setPorcentajeCumplimiento] = useState(0);
  const [baeDetalle, setBaeDetalle] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [accionId, setAccionId] = useState(null);
  const [editingBaeId, setEditingBaeId] = useState(null);

  const sincronizarDetalle = useCallback((lista) => {
    if (!Array.isArray(lista) || lista.length === 0) {
      setBaeDetalle(null);
      return;
    }
    const activo = lista.find((r) => estadoEsActivo(r.estado));
    if (activo) {
      setBaeDetalle(activo);
      return;
    }
    setBaeDetalle((prev) => {
      if (prev?.idBae != null) {
        const actualizado = lista.find((r) => r.idBae === prev.idBae);
        if (actualizado) return actualizado;
      }
      return lista[0];
    });
  }, []);

  const cargarHistorial = useCallback(async () => {
    if (!legajoSel) {
      setHistorial([]);
      setBaeDetalle(null);
      return;
    }
    setLoadingHist(true);
    try {
      const data = await api.obtenerBaeEmpleado(Number(legajoSel));
      const lista = Array.isArray(data) ? data : [];
      setHistorial(lista);
      sincronizarDetalle(lista);
    } catch {
      setHistorial([]);
      setBaeDetalle(null);
      notify.error('No se pudo cargar el historial de BAE');
    } finally {
      setLoadingHist(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- notify estable
  }, [legajoSel, sincronizarDetalle]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  useEffect(() => {
    if (selectedEmployee?.legajo != null) {
      setLegajoSel(String(selectedEmployee.legajo));
    }
  }, [selectedEmployee?.legajo]);

  const limpiarEdicion = () => {
    setEditingBaeId(null);
    setPorcentajeCumplimiento(0);
    setAnio(getAnioBaePorDefecto());
  };

  const handleCalcular = async () => {
    if (!legajoSel) {
      notify.error('Seleccione un empleado');
      return;
    }
    const anioNum = parseInt(String(anio), 10);
    if (Number.isNaN(anioNum) || anioNum < 2000 || anioNum > 2100) {
      notify.error('Indique un año válido');
      return;
    }
    setLoadingCalc(true);
    try {
      const dto = await api.calcularBae(Number(legajoSel), anioNum, Number(porcentajeCumplimiento));
      setBaeDetalle(dto);
      limpiarEdicion();
      notify.success('BAE calculado correctamente');
      await cargarHistorial();
    } catch {
      notify.error('No se pudo calcular el BAE. Verifique datos y permisos.');
    } finally {
      setLoadingCalc(false);
    }
  };

  const handleActualizar = async () => {
    if (!editingBaeId) return;
    setLoadingCalc(true);
    try {
      const dto = await api.actualizarBae(editingBaeId, Number(porcentajeCumplimiento));
      setBaeDetalle(dto);
      limpiarEdicion();
      notify.success('BAE actualizado correctamente');
      await cargarHistorial();
    } catch {
      notify.error('No se pudo actualizar el BAE');
    } finally {
      setLoadingCalc(false);
    }
  };

  const handleActivar = async (idBae) => {
    if (!idBae) return;
    const ok = window.confirm('¿Activar este BAE? Una vez activo no podrá modificarse.');
    if (!ok) return;
    setAccionId(idBae);
    try {
      const dto = await api.activarBae(idBae);
      setBaeDetalle(dto);
      limpiarEdicion();
      notify.success('BAE activado');
      await cargarHistorial();
    } catch {
      notify.error('No se pudo activar el BAE');
    } finally {
      setAccionId(null);
    }
  };

  const handleEliminar = async (idBae) => {
    if (!idBae) return;
    const ok = window.confirm('¿Eliminar este registro de BAE?');
    if (!ok) return;
    setAccionId(idBae);
    try {
      await api.eliminarBae(idBae);
      if (baeDetalle?.idBae === idBae) {
        setBaeDetalle(null);
      }
      if (editingBaeId === idBae) {
        limpiarEdicion();
      }
      notify.success('BAE eliminado');
      await cargarHistorial();
    } catch {
      notify.error('No se pudo eliminar el BAE');
    } finally {
      setAccionId(null);
    }
  };

  const handleEditar = (row) => {
    if (!row?.idBae || estadoEsActivo(row.estado)) return;
    setEditingBaeId(row.idBae);
    setAnio(row.anio ?? getAnioBaePorDefecto());
    setPorcentajeCumplimiento(Number(row.porcentajeCumplimiento ?? 0));
    setBaeDetalle(row);
  };

  const handleVerDetalle = (row) => {
    setBaeDetalle(row);
    if (!estadoEsActivo(row.estado) && row.idBae) {
      setEditingBaeId(null);
    }
  };

  return (
    <div className="card bae-section-card">
      <div className="card-header list-header">
        <h2 className="list-title section-title-effect">
          <Award className="bae-section-icon" aria-hidden />
          Bono de eficiencia anual (BAE)
        </h2>
        <p className="list-description">
          Cálculo y registro. El pago mensual se liquida con el concepto <strong>Cuota BAE</strong> en la liquidación normal.
        </p>
      </div>
      <div className="card-content">
        <p className="bae-hint">
          El BAE corresponde al <strong>año anterior</strong> (en {new Date().getFullYear()} se calcula el BAE de {getAnioBaePorDefecto()}).
          El backend aplica monto base, % por antigüedad y % adicional por cumplimiento.
        </p>

        <div className="bae-form">
          {!selectedEmployee && (
            <label className="bae-field">
              <span>Empleado</span>
              <select
                className="bae-select"
                value={legajoSel}
                onChange={(e) => setLegajoSel(e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {(employees || []).map((emp) => (
                  <option key={emp.legajo} value={emp.legajo}>
                    {emp.legajo} — {emp.apellido || ''} {emp.nombre || ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="bae-field">
            <span>Año del BAE (período liquidado)</span>
            <input
              type="number"
              className="bae-input"
              min={2000}
              max={2100}
              value={anio}
              disabled={!!editingBaeId}
              onChange={(e) => setAnio(e.target.value)}
            />
          </label>

          <label className="bae-field bae-field-wide">
            <span>% adicional por cumplimiento (años consecutivos)</span>
            <select
              className="bae-select"
              value={porcentajeCumplimiento}
              onChange={(e) => setPorcentajeCumplimiento(Number(e.target.value))}
            >
              {CUMPLIMIENTO_OPCIONES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="bae-actions">
            {editingBaeId ? (
              <>
                <button
                  type="button"
                  className="action-btn primary"
                  onClick={handleActualizar}
                  disabled={loadingCalc}
                >
                  {loadingCalc ? 'Guardando…' : 'Guardar actualización'}
                </button>
                <button type="button" className="action-btn secondary" onClick={limpiarEdicion}>
                  Cancelar edición
                </button>
              </>
            ) : (
              <button type="button" className="action-btn primary" onClick={handleCalcular} disabled={loadingCalc}>
                {loadingCalc ? (
                  <>
                    <Loader2 className="action-icon bae-spin" />
                    Calculando…
                  </>
                ) : (
                  'Calcular BAE'
                )}
              </button>
            )}
            <button
              type="button"
              className="action-btn secondary"
              onClick={cargarHistorial}
              disabled={loadingHist || !legajoSel}
              title="Actualizar historial"
            >
              <RefreshCw className={`action-icon${loadingHist ? ' bae-spin' : ''}`} />
              Historial
            </button>
          </div>
        </div>

        {baeDetalle && (
          <BaeDetallePanel
            bae={baeDetalle}
            titulo={estadoEsActivo(baeDetalle.estado) ? 'BAE activo' : 'Detalle del BAE'}
          />
        )}

        {legajoSel && (
          <div className="bae-historial">
            <h3 className="bae-resultado-titulo">Historial BAE (legajo {legajoSel})</h3>
            {loadingHist && !historial.length ? (
              <p className="bae-muted">Cargando…</p>
            ) : historial.length === 0 ? (
              <p className="bae-muted">No hay registros de BAE para este empleado.</p>
            ) : (
              <div className="bae-table-wrap">
                <table className="bae-table">
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th>Total</th>
                      <th>Cuota</th>
                      <th>Cuotas</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((row) => {
                      const activo = estadoEsActivo(row.estado);
                      const seleccionado = baeDetalle?.idBae === row.idBae;
                      const enEdicion = editingBaeId === row.idBae;
                      return (
                        <tr
                          key={row.idBae ?? `${row.anio}-${row.fechaCalculo}`}
                          className={[
                            activo ? 'bae-row--activo' : '',
                            seleccionado ? 'bae-row--seleccionado' : '',
                            enEdicion ? 'bae-row--editando' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          <td>{row.anio}</td>
                          <td>${formatMoneyAR(row.montoTotal)}</td>
                          <td>${formatMoneyAR(row.montoCuota)}</td>
                          <td>{row.cuotasRestantes ?? '—'} / {row.cuotasTotales ?? '—'}</td>
                          <td>
                            {activo ? <span className="bae-badge-activo">Activo</span> : (row.estado ?? '—')}
                          </td>
                          <td>
                            <div className="bae-row-actions">
                              <button
                                type="button"
                                className="bae-icon-btn"
                                onClick={() => handleVerDetalle(row)}
                                title="Ver detalle"
                                aria-label="Ver detalle"
                              >
                                <Eye className="bae-action-icon" aria-hidden />
                              </button>
                              {!activo && row.idBae != null && (
                                <>
                                  <button
                                    type="button"
                                    className="bae-icon-btn bae-icon-btn--primary"
                                    disabled={accionId === row.idBae}
                                    onClick={() => handleActivar(row.idBae)}
                                    title="Activar BAE"
                                    aria-label="Activar BAE"
                                  >
                                    {accionId === row.idBae ? (
                                      <Loader2 className="bae-action-icon bae-spin" aria-hidden />
                                    ) : (
                                      <CheckCircle className="bae-action-icon" aria-hidden />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className="bae-icon-btn"
                                    disabled={accionId === row.idBae}
                                    onClick={() => handleEditar(row)}
                                    title="Actualizar % cumplimiento"
                                    aria-label="Actualizar % cumplimiento"
                                  >
                                    <Pencil className="bae-action-icon" aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    className="bae-icon-btn bae-icon-btn--danger"
                                    disabled={accionId === row.idBae}
                                    onClick={() => handleEliminar(row.idBae)}
                                    title="Eliminar"
                                    aria-label="Eliminar"
                                  >
                                    <Trash2 className="bae-action-icon" aria-hidden />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
