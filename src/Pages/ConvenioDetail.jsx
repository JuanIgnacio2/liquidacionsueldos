import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Save, X, Printer, Calendar, Users, FileText } from 'lucide-react';
import '../styles/components/_convenioDetail.scss';
import * as api from '../services/empleadosAPI'

export default function ConvenioDetail() {
  const { controller } = useParams();
  const navigate = useNavigate();
  const [convenio, setConvenio] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState(null);

  // Normaliza respuesta del detalle a la forma que usa la UI
  const normalizeConvenioDetail = (raw, controller) => {
    if (!raw || typeof raw !== 'object') {
      return {
        name: controller?.toUpperCase() ?? 'CONVENIO',
        description: '',
        employeeCount: 0,
        categoriesCount: 0,
        status: 'Activo',
        validFrom: null,
        validTo: null,
        lastUpdate: new Date().toISOString(),
        salaryTable: { categories: [], bonifications: {}, titles: {}, notes: [] },
        bonificacionesAreas: [],
        bonificacionesFijas: [],
        zonas: null,
      };
    }

    const categories = Array.isArray(raw.categorias)
      ? raw.categorias.map(c => ({
          idCategoria: c.idCategoria,
          cat: c.nombreCategoria,
          basicSalary: c.basico,
        }))
      : [];

    const bonifFijasDict = {};
    if (Array.isArray(raw.bonificacionesFijas)) {
      raw.bonificacionesFijas.forEach(b => {
        bonifFijasDict[b.nombre] = Number(b.porcentaje) || 0;
      });
    }

    const normalized = {
      name: raw.nombreConvenio ?? controller?.toUpperCase() ?? 'CONVENIO',
      description: '',
      employeeCount: 0,
      categoriesCount: categories.length,
      status: 'Activo',
      validFrom: null,
      validTo: null,
      lastUpdate: new Date().toISOString(),
      salaryTable: {
        categories,
        bonifications: bonifFijasDict,
        titles: {},
        notes: [],
      },
      bonificacionesAreas: Array.isArray(raw.bonificacionesAreas) ? raw.bonificacionesAreas : [],
      bonificacionesFijas: Array.isArray(raw.bonificacionesFijas) ? raw.bonificacionesFijas : [],
      zonas: raw.zonas ?? null,
    };

    if (controller === 'uocra') {
      const u = buildUocraFromZonas(raw);
      normalized.salaryTable.uocra = u; 
    }

    return normalized;
  };

  // Normaliza nombres de categoría UOCRA a claves canónicas
  const toUocraKey = (name = '') => {
    const n = name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (n.includes('ayudante')) return 'ayudante';
    if (n.includes('1/2') || n.includes('medio')) return 'medioOficial';
    if (n.includes('oficial especializado')) return 'oficialEsp';
    if (n === 'oficial' || n.includes('oficial ')) return 'oficial';
    if (n.includes('sereno')) return 'sereno';
    return name.replace(/\s+/g, '_');
  };

  // Armar el payload para LUZ Y FUERZA
  const buildLyfPayload = (editableData) => {
    const rows = editableData.salaryTable?.categories || [];
    return rows.map(r => ({
      idCategoria: r.idCategoria,
      basico: Number(r.basicSalary) || 0,
    }));
  };

  // AREA UOCRA
  // rowIdx: índice de fila (zona)
  // key: 'ayudante' | 'medioOficial' | 'oficial' | 'oficialEsp' | 'sereno' (según headers)
  const updateUOCRAValue = (rowIdx, key, value) => {
    setEditableData(prev => {
      if (!prev?.salaryTable?.uocra?.rows?.[rowIdx]) return prev;

      const next = { ...prev };
      const rows = [...next.salaryTable.uocra.rows];
      rows[rowIdx] = { ...rows[rowIdx], [key]: parseNumber(value) };

      next.salaryTable = { ...next.salaryTable, uocra: { ...next.salaryTable.uocra, rows } };
      return next;
    });
  };

  const parseNumber = (value) => {
    const str = String(value ?? "");
    const clean = str.replace(/[^0-9.,-]/g, "").replace(",", ".");
    const num = parseFloat(clean);
    return Number.isNaN(num) ? 0 : num;
  };

  const buildUocraPayload = (editableData, convenio) => {
    const rows = editableData?.salaryTable?.uocra?.rows ?? [];
    const zonas = convenio?.zonas ?? [];
    const payload = [];

    zonas.forEach((z, rowIdx) => {
    const rowEdited = rows[rowIdx] || {};
    (z.categorias || []).forEach(cat => {
      const key = toUocraKey(cat.nombreCategoria);
      const basico = Number(rowEdited[key]);
      if (!Number.isNaN(basico)) {
        payload.push({
          idCategoria: cat.idCategoria,
          idZona: z.idZona,
          basico
        });
      }
    });
  });

    return payload;
  };

  // A partir de raw.zonas arma headers y filas [{zona, ayudante, medioOficial, ...}]
  const buildUocraFromZonas = (raw) => {
    const zonas = Array.isArray(raw?.zonas) ? raw.zonas : [];

    // Colectar categorías presentes y ordenarlas con prioridad conocida
    const order = ['ayudante','medioOficial','oficial','oficialEsp','sereno'];
    const labelFor = {
      ayudante: 'Ayudante',
      medioOficial: '1/2 Oficial',
      oficial: 'Oficial',
      oficialEsp: 'Oficial Especializado',
      sereno: 'Sereno',
    };

    const present = new Set();
    zonas.forEach(z => (z.categorias || []).forEach(c => present.add(toUocraKey(c.nombreCategoria))));

    const headers = order.filter(k => present.has(k)).map(key => ({
      key,
      label: labelFor[key] || key,
      sub: key === 'sereno' ? 'por mes' : '$ x hora',
    }));

    const rows = zonas.map(z => {
      const r = { zona: z.nombre };
      (z.categorias || []).forEach(c => {
        const k = toUocraKey(c.nombreCategoria);
        r[k] = Number(c.basico);
      });
      return r;
    });

    return { headers, rows };
  };

  useEffect(() => {
    const loadConvenio = async () => {
      try {
        const raw = await api.getConveniosNombre(controller);
        const norm = normalizeConvenioDetail(raw, controller);
        setConvenio(norm);
        setEditableData(norm);
    } catch (error) {
        console.error('Error cargando convenio:', error);
  }
    };

    loadConvenio();
  }, [controller]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (controller === 'lyf') {
        const payload = buildLyfPayload(editableData);
        await api.updateBasicoLyF(payload);
      } else if (controller === 'uocra') {
        const payload = buildUocraPayload(editableData, convenio);
        await api.updateBasicoUocra(payload);
      }

    setConvenio(editableData);
    setIsEditing(false);
    window.showNotification('Convenio actualizado exitosamente', 'success');
    } catch (error) {
      console.error('Error guardando convenio:', error);
      window.showNotification('Error al guardar el convenio', 'error');
    }
  };

  const handleCancel = () => {
    setEditableData(JSON.parse(JSON.stringify(convenio)));
    setIsEditing(false);
  };

  const handleDownload = () => {
    window.print();
  };

  const handleGoBack = () => {
    navigate('/convenios');
  };

  // columnas en el mismo orden del diseño
  const AREA_COLUMNS = ['Oficio', 'Técnica', 'Administrativa', 'Operaciones', 'Jerarquica', 'Funcional'];

  const formatCurrencyAR = (n) =>
    typeof n === 'number'
      ? n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
      : '';

  // bonifMap: clave `${idCategoria}|${Area}` => porcentaje (number)
  const buildBonifMap = (list) => {
    const map = {};
    (list || []).forEach(b => {
      // Aseguramos nombres iguales a columnas
      let area = b.nombreArea;
      // Corrige el acento en "Técnica"
      if (area === 'Tecnica') area = 'Técnica';
      map[`${b.idCategoria}|${area}`] = Number(b.porcentaje) || 0;
    });
    return map;
  };

  // buscar básico cat 11 (por id o por nombre)
  const getBase11 = (categories) => {
    if (!Array.isArray(categories)) return 0;
    const byId = categories.find(c => c.idCategoria === 11);
    if (byId) return Number(byId.basicSalary) || 0;
    const byName = categories.find(c => String(c.cat).includes('11'));
    return byName ? (Number(byName.basicSalary) || 0) : 0;
  };

  if (!convenio) {
    return (
      <div className="convenio-detail">
        <div className="loading">Cargando convenio...</div>
      </div>
    );
  }

  const currentData = isEditing ? editableData : convenio;
  
  return (
    <div className="convenio-detail">
      {/* Header */}
      <div className="detail-header">
        <div className="header-navigation">
          <button className="back-btn" onClick={handleGoBack}>
            <ArrowLeft className="back-icon" />
            Volver a Convenios
          </button>
        </div>

        <div className="header-content">
          <div className="header-info">
            <h1 className="detail-title">{currentData.name}</h1>
            <div className="header-meta">
              <div className="meta-item">
                <Users className="meta-icon" />
                <span>{currentData.employeeCount} empleados</span>
              </div>
              {currentData.validTo && (
                <div className="meta-item">
                  <Calendar className="meta-icon" />
                  <span>Vigente hasta</span>
                </div>
              )}
              <div className={`status-badge ${currentData.status.toLowerCase()}`}>
                {currentData.status}
              </div>
            </div>
          </div>

          <div className="header-actions">
            {isEditing ? (
              <>
                <button className="action-btn save" onClick={handleSave}>
                  <Save className="action-icon" />
                  Guardar
                </button>
                <button className="action-btn cancel" onClick={handleCancel}>
                  <X className="action-icon" />
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button className="action-btn edit" onClick={handleEdit}>
                  <Edit className="action-icon" />
                  Editar
                </button>
                <button className="action-btn download" onClick={handleDownload}>
                  <Download className="action-icon" />
                  Descargar
                </button>
                <button className="action-btn print" onClick={handleDownload}>
                  <Printer className="action-icon" />
                  Imprimir
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabla salarial (solo si existe) */}
      <div className="salary-table-container">
      {controller === 'lyf' && (
      <div className="salary-table luz-y-fuerza">
        <div className="table-header">
          <h2>ESCALAS SALARIALES - LUZ Y FUERZA</h2>
        </div>

        {(() => {
          const data = currentData; // isEditing ? editableData : convenio, ya lo tenés arriba
          const cats = [...(data.salaryTable?.categories || [])]
            .sort((a, b) => (a.idCategoria ?? 0) - (b.idCategoria ?? 0));
          const bonifMap = buildBonifMap(data.bonificacionesAreas);
          const base11 = getBase11(cats);

          const onEditBasic = (catIndex, value) => {
            // Siempre convertir a string por seguridad
            const strValue = String(value ?? "");

            // Limpiar cualquier carácter que no sea número, punto o coma
            const cleanValue = strValue.replace(/[^0-9.,]/g, "").replace(",", ".");

            // Convertir a número
            const numericValue = parseFloat(cleanValue);
            const finalValue = isNaN(numericValue) ? 0 : numericValue;

            // Actualizar estado
            setEditableData(prev => {
              const newData = { ...prev };
              if (!newData.salaryTable?.categories?.[catIndex]) return newData;

              newData.salaryTable.categories[catIndex] = {
                ...newData.salaryTable.categories[catIndex],
                basicSalary: finalValue
              };

              return newData;
            });
          };

          const bonusAmount = (idCat, area) => {
            const pct = bonifMap[`${idCat}|${area}`];
            if (!pct) return ''; // celda vacía si no aplica
            const monto = base11 * (pct / 100);
            return formatCurrencyAR(monto);
          };

          return (
            <table className="salary-grid">
              <thead>
                <tr>
                  <th>CAT</th>
                  <th>SUELDO BÁSICO</th>
                  <th colSpan={AREA_COLUMNS.length}>BONIFICACIONES</th>
                </tr>
                <tr>
                  {['', ''].concat(AREA_COLUMNS).map((hdr, i) => (
                    <th key={i}>{hdr}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map((row, idx) => (
                  <tr key={row.idCategoria ?? idx}>
                    <td className="category-cell">
                      {row.idCategoria ?? (row.cat ?? idx + 1)}
                    </td>

                    <td className="salary-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          className="salary-input"
                          value={row.basicSalary ?? 0}
                          onChange={(e) => onEditBasic(idx, e.target.value)}
                        />
                      ) : (
                        formatCurrencyAR(row.basicSalary ?? 0)
                      )}
                    </td>

                    {AREA_COLUMNS.map((area) => (
                      <td key={area} className="bonus-cell">
                        {bonusAmount(row.idCategoria, area)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
        <div className="additional-bonifications">
            <div className="bonif-section">{/* … */}</div>
            <div className="titles-section">{/* … */}</div>
        </div>
      </div>
    )}
    {controller === 'uocra' && (
      <div className="salary-table uocra">
        <div className="table-header">
          <h2>UOCRA - Escalas por Zona</h2>
        </div>

        {(() => {
          const u = currentData?.salaryTable?.uocra;
          if (!u || !u.headers?.length) {
            return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No hay datos de zonas para mostrar.</div>;
          }

          const fmt = (n) => typeof n === 'number'
            ? n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '';

          return (
            <table className="uocra-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ minWidth: 90 }}>Zona</th>
                  {u.headers.map(h => (
                    <th key={h.key} colSpan={1}>{h.label}</th>
                  ))}
                </tr>
                <tr>
                  {u.headers.map(h => (
                    <th key={`${h.key}-sub`}>{h.sub}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {(isEditing ? editableData.salaryTable.uocra.rows : u.rows).map((r, rowIdx) => (
                  <tr key={r.zona ?? rowIdx}>
                    <td className="month-cell" style={{ writingMode: 'horizontal-tb' }}>{r.zona}</td>

                    {u.headers.map(h => (
                      <td key={h.key} className="salary-cell">
                        {isEditing ? (
                          <input
                            type="text"
                            className="salary-input"
                            value={r[h.key] ?? ''}
                            onChange={(e) => updateUOCRAValue(rowIdx, h.key, e.target.value)}
                          />
                        ) : (
                          fmt(r[h.key])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>
    )}
      </div>
      {/* Footer info */}
      <div className="detail-footer">
        <div className="footer-info">
          <div className="info-item">
            <FileText className="info-icon" />
            <span>Última actualización:</span>
          </div>
        </div>
      </div>
    </div>
  );
}