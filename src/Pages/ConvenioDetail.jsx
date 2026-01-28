import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Save, X, Printer, Calendar, Users, Percent, List, Plus } from 'lucide-react';
import { Modal, ModalFooter } from '../Components/Modal/Modal';
import {LoadingSpinner} from '../Components/ui/LoadingSpinner';
import { useNotification } from '../Hooks/useNotification';
import { ConfirmDialog } from '../Components/ConfirmDialog/ConfirmDialog';
import '../styles/components/_convenioDetail.scss';
import * as api from '../services/empleadosAPI'

export default function ConvenioDetail() {
  const notify = useNotification();
  const { controller } = useParams();
  const navigate = useNavigate();
  const [convenio, setConvenio] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [descuentos, setDescuentos] = useState([]);
  const [conceptosGenerales, setConceptosGenerales] = useState([]);
  const [conceptosUocra, setConceptosUocra] = useState([]);
  const [showConceptoModal, setShowConceptoModal] = useState(false);
  const [selectedConcepto, setSelectedConcepto] = useState(null);
  const [conceptoNombre, setConceptoNombre] = useState('');
  const [showConceptoManualModal, setShowConceptoManualModal] = useState(false);
  const [selectedConceptoManual, setSelectedConceptoManual] = useState(null);
  const [conceptoManualNombre, setConceptoManualNombre] = useState('');
  const [conceptoManualMonto, setConceptoManualMonto] = useState('');

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
        conceptosLyF: [],
        conceptosManualesLyF: [],
        titulosLyF: [],
        horasExtrasLyF: [],
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
      conceptosLyF: Array.isArray(raw.conceptosLyF) ? raw.conceptosLyF : [],
      conceptosManualesLyF: Array.isArray(raw.conceptosManualesLyF) ? raw.conceptosManualesLyF : [],
      titulosLyF: Array.isArray(raw.titulosLyF) ? raw.titulosLyF : [],
      horasExtrasLyF: Array.isArray(raw.horasExtrasLyF) ? raw.horasExtrasLyF : [],
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
      basico: parseNumberFromDisplay(r.basicSalary),
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
      rows[rowIdx] = { ...rows[rowIdx], [key]: String(value) };

      next.salaryTable = { ...next.salaryTable, uocra: { ...next.salaryTable.uocra, rows } };
      return next;
    });
  };

  // Convierte formato moneda (100.000,00) a número (100000.00) para backend
  const parseNumberFromDisplay = (value) => {
    const str = String(value ?? "").trim();
    if (!str) return 0;
    // Remueve puntos de miles y reemplaza coma decimal con punto
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? 0 : num;
  };

  // Formatea número a moneda argentina para display (100000.00 => 100.000,00)
  const formatNumberToDisplay = (value) => {
    const num = Number(value) || 0;
    return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Formatea número para edición sin puntos (100000.00 => 100000,00)
  const formatNumberForEdit = (value) => {
    const num = Number(value) || 0;
    // Formatear sin separadores de miles, solo con coma decimal
    return num.toFixed(2).replace('.', ',');
  };

  const buildUocraPayload = (editableData, convenio) => {
    const rows = editableData?.salaryTable?.uocra?.rows ?? [];
    const zonas = convenio?.zonas ?? [];
    const payload = [];

    zonas.forEach((z, rowIdx) => {
    const rowEdited = rows[rowIdx] || {};
    (z.categorias || []).forEach(cat => {
      const key = toUocraKey(cat.nombreCategoria);
      const basico = parseNumberFromDisplay(rowEdited[key]);
      if (!Number.isNaN(basico) && basico > 0) {
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
        // Usar una copia profunda para que `editableData` no comparta referencias con `convenio`
        // Convertir a formato sin puntos para edición (000000,00)
        const cloned = JSON.parse(JSON.stringify(norm));
        if (Array.isArray(cloned.salaryTable?.categories)) {
          cloned.salaryTable.categories = cloned.salaryTable.categories.map(c => ({
            ...c,
            basicSalary: formatNumberForEdit(c.basicSalary)
          }));
        }
        if (cloned.salaryTable?.uocra?.rows) {
          cloned.salaryTable.uocra.rows = cloned.salaryTable.uocra.rows.map(r => {
            const formatted = { ...r };
            cloned.salaryTable.uocra.headers?.forEach(h => {
              if (r[h.key] != null) {
                formatted[h.key] = formatNumberForEdit(r[h.key]);
              }
            });
            return formatted;
          });
        }
        setEditableData(cloned);
    } catch (error) {
        notify.error(error);
  }
    };

    const loadEmployees = async () => {
      try {
        const data = await api.getEmployees();
        setEmployees(data || []);
      } catch (error) {
        notify.error(error);
      }
    };

    const loadDescuentos = async () => {
      try {
        const data = await api.getDescuentos();
        setDescuentos(data || []);
      } catch (error) {
        notify.error(error);
      }
    };

    const loadConceptosGenerales = async () => {
      try {
        const data = await api.getConceptosGenerales();
        setConceptosGenerales(data || []);
      } catch (error) {
        notify.error(error);
      }
    };

    const loadConceptosUocra = async () => {
      try {
        const data = await api.getConceptosUocra();
        setConceptosUocra(data || []);
      } catch (error) {
        notify.error(error);
      }
    };

    // Solo cargar convenio si no es descuentos o conceptos-generales
    if (controller !== 'descuentos' && controller !== 'conceptos-generales') {
      loadConvenio();
      loadEmployees();
      // Cargar conceptos UOCRA si es el convenio UOCRA
      if (controller === 'uocra') {
        loadConceptosUocra();
      }
    } else {
      // Cargar datos según el tipo
      if (controller === 'descuentos') {
        loadDescuentos();
      } else if (controller === 'conceptos-generales') {
        loadConceptosGenerales();
      }
    }
  }, [controller]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  // Función para guardar el convenio (lógica separada para poder llamarla después de la confirmación)
  const saveConvenio = async () => {
    try {
      const usuario = localStorage.getItem('usuario') || 'Sistema';
      
      if (controller === 'lyf') {
        const payload = buildLyfPayload(editableData);
        await api.updateBasicoLyF(payload);
      } else if (controller === 'uocra') {
        const payload = buildUocraPayload(editableData, convenio);
        await api.updateBasicoUocra(payload);
      }
      
      // Registrar actividad de modificación de convenio (opcional, no debe afectar el guardado)
      try {
        await api.registrarActividad({
          usuario,
          accion: 'ACTUALIZAR',
          descripcion: `Se actualizó el convenio ${convenio?.name || controller?.toUpperCase()}`,
          referenciaTipo: 'EDIT_CONVENIO',
          referenciaId: controller === 'lyf' ? 1 : (controller === 'uocra' ? 2 : 0)
        });
      } catch (actividadError) {
        // Si falla el registro de actividad, solo lo registramos pero no afecta el guardado
        console.warn('Error al registrar actividad:', actividadError);
      }
      
      // Convertir los básicos a número antes de actualizar el estado `convenio`
      const saved = JSON.parse(JSON.stringify(editableData || {}));
      if (Array.isArray(saved.salaryTable?.categories)) {
        saved.salaryTable.categories = saved.salaryTable.categories.map(c => ({
          ...c,
          basicSalary: parseNumberFromDisplay(c.basicSalary)
        }));
      }
      if (saved.salaryTable?.uocra?.rows) {
        saved.salaryTable.uocra.rows = saved.salaryTable.uocra.rows.map(r => {
          const parsed = { ...r };
          saved.salaryTable.uocra.headers?.forEach(h => {
            if (r[h.key] != null) {
              parsed[h.key] = parseNumberFromDisplay(r[h.key]);
            }
          });
          return parsed;
        });
      }

      setConvenio(saved);
      setIsEditing(false);

      // Mantener editableData con formato sin puntos para seguir editando
      const editClone = JSON.parse(JSON.stringify(saved));
      if (Array.isArray(editClone.salaryTable?.categories)) {
        editClone.salaryTable.categories = editClone.salaryTable.categories.map(c => ({
          ...c,
          basicSalary: formatNumberForEdit(c.basicSalary)
        }));
      }
      if (editClone.salaryTable?.uocra?.rows) {
        editClone.salaryTable.uocra.rows = editClone.salaryTable.uocra.rows.map(r => {
          const formatted = { ...r };
          editClone.salaryTable.uocra.headers?.forEach(h => {
            if (r[h.key] != null) {
              formatted[h.key] = formatNumberForEdit(r[h.key]);
            }
          });
          return formatted;
        });
      }
      setEditableData(editClone);
      notify.success('Convenio actualizado exitosamente');
    } catch (error) {
      console.error('Error guardando convenio:', error);
      notify.error(error);
    }
  };

  const handleSave = async () => {
    // Mostrar diálogo de confirmación
    if (window.showConfirm) {
      const confirmed = await window.showConfirm({
        title: 'Guardar cambios',
        message: '¿Guardar cambios en el convenio?',
        confirmText: 'Sí, guardar',
        cancelText: 'Cancelar',
        type: 'info',
        confirmButtonVariant: 'primary',
        cancelButtonVariant: 'secondary'
      });

      if (!confirmed) {
        return; // Si el usuario cancela, no hacer nada
      }
    }

    // Si confirma, proceder con el guardado
    await saveConvenio();
  };

  const handleCancel = () => {
    // Restaurar desde `convenio` y convertir a formato sin puntos para edición
    const clone = JSON.parse(JSON.stringify(convenio));
    if (Array.isArray(clone.salaryTable?.categories)) {
      clone.salaryTable.categories = clone.salaryTable.categories.map(c => ({
        ...c,
        basicSalary: formatNumberForEdit(c.basicSalary)
      }));
    }
    if (clone.salaryTable?.uocra?.rows) {
      clone.salaryTable.uocra.rows = clone.salaryTable.uocra.rows.map(r => {
        const formatted = { ...r };
        clone.salaryTable.uocra.headers?.forEach(h => {
          if (r[h.key] != null) {
            formatted[h.key] = formatNumberForEdit(r[h.key]);
          }
        });
        return formatted;
      });
    }
    setEditableData(clone);
    setIsEditing(false);
  };

  const handleDownload = () => {
    window.print();
  };

  const handleGoBack = () => {
    navigate('/convenios');
  };

  const handleCreateConcepto = () => {
    setSelectedConcepto(null);
    setConceptoNombre('');
    setShowConceptoModal(true);
  };

  const handleEditConcepto = (concepto) => {
    setSelectedConcepto(concepto);
    setConceptoNombre(concepto.nombre || concepto.descripcion || '');
    setShowConceptoModal(true);
  };

  const handleSaveConcepto = async () => {
    if (!conceptoNombre.trim()) {
      notify.error('El nombre del concepto es requerido');
      return;
    }

    try {
      if (selectedConcepto) {
        // Actualizar concepto existente
        await api.updateConceptoGeneral(selectedConcepto.idConceptoGeneral || selectedConcepto.id, {
          nombre: conceptoNombre.trim()
        });
        notify.success('Concepto actualizado exitosamente');
      } else {
        // Crear nuevo concepto
        await api.createConceptoGeneral({
          nombre: conceptoNombre.trim()
        });
        notify.success('Concepto creado exitosamente');
      }

      // Recargar conceptos generales
      const conceptosResponse = await api.getConceptosGenerales();
      setConceptosGenerales(conceptosResponse || []);
      setShowConceptoModal(false);
      setSelectedConcepto(null);
      setConceptoNombre('');
    } catch (error) {
      notify.error(error);
    }
  };

  const closeConceptoModal = () => {
    setShowConceptoModal(false);
    setSelectedConcepto(null);
    setConceptoNombre('');
  };

  const handleCreateConceptoManual = () => {
    setSelectedConceptoManual(null);
    setConceptoManualNombre('');
    setConceptoManualMonto('');
    setShowConceptoManualModal(true);
  };

  const handleEditConceptoManual = (concepto) => {
    setSelectedConceptoManual(concepto);
    setConceptoManualNombre(concepto.nombre || concepto.descripcion || '');
    const monto = concepto.monto || concepto.valor || 0;
    setConceptoManualMonto(formatNumberForEdit(monto));
    setShowConceptoManualModal(true);
  };

  const handleSaveConceptoManual = async () => {
    if (!conceptoManualNombre.trim()) {
      notify.error('El nombre del concepto es requerido');
      return;
    }

    const monto = parseNumberFromDisplay(conceptoManualMonto);
    if (isNaN(monto) || monto < 0) {
      notify.error('El monto debe ser un número válido mayor o igual a 0');
      return;
    }

    try {
      if (selectedConceptoManual) {
        // Obtener el ID del concepto manual (probar diferentes campos posibles)
        const conceptoId = selectedConceptoManual.idConceptosManualesLyF || 
                          selectedConceptoManual.idConceptoManualLyF || 
                          selectedConceptoManual.id;
        
        if (!conceptoId || conceptoId === 'undefined' || conceptoId === undefined) {
          notify.error('No se pudo identificar el ID del concepto a actualizar');
          return;
        }
        
        // Asegurar que el ID sea un número
        const idNumero = Number(conceptoId);
        if (isNaN(idNumero) || idNumero <= 0) {
          notify.error('ID del concepto inválido');
          return;
        }
        
        // Actualizar concepto existente
        await api.updateConceptoManualLyF(idNumero, {
          nombre: conceptoManualNombre.trim(),
          monto: monto
        });
        notify.success('Concepto manual actualizado exitosamente');
      } else {
        // Crear nuevo concepto
        await api.createConceptoManualLyF({
          nombre: conceptoManualNombre.trim(),
          monto: monto
        });
        notify.success('Concepto manual creado exitosamente');
      }

      // Recargar convenio para actualizar conceptos manuales
      const raw = await api.getConveniosNombre(controller);
      const norm = normalizeConvenioDetail(raw, controller);
      setConvenio(norm);
      setEditableData(norm);
      setShowConceptoManualModal(false);
      setSelectedConceptoManual(null);
      setConceptoManualNombre('');
      setConceptoManualMonto('');
    } catch (error) {
      notify.error(error);
    }
  };

  const closeConceptoManualModal = () => {
    setShowConceptoManualModal(false);
    setSelectedConceptoManual(null);
    setConceptoManualNombre('');
    setConceptoManualMonto('');
  };

  // Contar empleados del gremio seleccionado
  const getEmployeeCountByController = () => {
    if (!Array.isArray(employees)) return 0;
    const controllerUpper = controller?.toUpperCase() ?? '';
    return employees.filter(emp => {
      const gremioUpper = emp.gremio?.nombre?.toUpperCase() ?? '';
      if (controllerUpper === 'LYF') {
        return gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA');
      } else if (controllerUpper === 'UOCRA') {
        return gremioUpper === 'UOCRA';
      }
      return false;
    }).length;
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
    const extract = (val) => {
      if (val == null) return 0;
      if (typeof val === 'number') return val;
      // intentar parsear formato de display (ej. "100.000,00") o cadena simple
      return parseNumberFromDisplay(String(val));
    };

    const byId = categories.find(c => c.idCategoria === 11);
    if (byId) return extract(byId.basicSalary) || 0;
    const byName = categories.find(c => String(c.cat).includes('11'));
    return byName ? (extract(byName.basicSalary) || 0) : 0;
  };

  // Si es descuentos o conceptos-generales, mostrar vista especial
  if (controller === 'descuentos') {
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
              <h1 className="detail-title">Descuentos</h1>
              <div className="header-meta">
                <div className="meta-item">
                  <Percent className="meta-icon" />
                  <span>{descuentos.length} descuentos registrados</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descuentos List */}
        <div className="salary-table-container">
          <div className="descuentos-list">
            {descuentos.length > 0 ? (
              <table className="descuentos-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {descuentos.map((descuento) => (
                    <tr key={descuento.idDescuento || descuento.id}>
                      <td>{descuento.nombre || descuento.descripcion || 'Sin nombre'}</td>
                      <td className="porcentaje-cell">{descuento.porcentaje || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No hay descuentos registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (controller === 'conceptos-generales') {
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
              <h1 className="detail-title">Conceptos Generales</h1>
              <div className="header-meta">
                <div className="meta-item">
                  <List className="meta-icon" />
                  <span>{conceptosGenerales.length} conceptos registrados</span>
                </div>
              </div>
            </div>

            <div className="header-actions">
              <button className="action-btn edit" onClick={handleCreateConcepto}>
                <Plus className="action-icon" />
                Crear Concepto
              </button>
            </div>
          </div>
        </div>

        {/* Conceptos Generales List */}
        <div className="salary-table-container">
          <div className="conceptos-list">
            {conceptosGenerales.length > 0 ? (
              <table className="conceptos-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {conceptosGenerales.map((concepto) => (
                    <tr key={concepto.idConceptoGeneral || concepto.id}>
                      <td>{concepto.nombre || concepto.descripcion || 'Sin nombre'}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon-edit"
                          onClick={() => handleEditConcepto(concepto)}
                          title="Editar concepto"
                        >
                          <Edit className="icon" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No hay conceptos generales registrados</p>
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Concepto General Modal */}
        <Modal
          isOpen={showConceptoModal}
          onClose={closeConceptoModal}
          title={selectedConcepto ? 'Editar Concepto General' : 'Crear Concepto General'}
          size="medium"
        >
          <div className="concepto-form">
            <div className="form-group">
              <label htmlFor="concepto-nombre">Nombre del Concepto</label>
              <input
                id="concepto-nombre"
                type="text"
                className="form-input"
                value={conceptoNombre}
                onChange={(e) => setConceptoNombre(e.target.value)}
                placeholder="Ingrese el nombre del concepto"
                autoFocus
              />
            </div>
          </div>
          
          <ModalFooter>
            <button className="btn btn-secondary" onClick={closeConceptoModal}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSaveConcepto}>
              {selectedConcepto ? 'Actualizar' : 'Crear'}
            </button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }

  if (!convenio) {
    return (
      <div className="convenio-detail">
        <LoadingSpinner message="Cargando convenio..." size="lg" className="list-loading"/>
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
                <span>{getEmployeeCountByController()} empleados</span>
              </div>
              {currentData.validTo && (
                <div className="meta-item">
                  <Calendar className="meta-icon" />
                  <span>Vigente hasta</span>
                </div>
              )}
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
            // Mantener el formato de entrada flexible durante edición
            // Se convierte al guardar
            const raw = String(value ?? "");

            // Actualizar estado: buscar por idCategoria si es posible, sino usar índice
            setEditableData(prev => {
              if (!prev || !prev.salaryTable || !Array.isArray(prev.salaryTable.categories)) return prev;

              const newData = JSON.parse(JSON.stringify(prev));

              // Si el catIndex corresponde a un idCategoria (número), buscar por id
              const byIdIndex = newData.salaryTable.categories.findIndex(c => c.idCategoria === catIndex);
              if (byIdIndex !== -1) {
                newData.salaryTable.categories[byIdIndex].basicSalary = raw;
                return newData;
              }

              // Si no encontramos por id, intentar usarlo como índice (caída)
              const idx = Number(catIndex);
              if (!Number.isNaN(idx) && newData.salaryTable.categories[idx]) {
                newData.salaryTable.categories[idx].basicSalary = raw;
              }

              return newData;
            });
          };

          const bonusAmount = (idCat, area) => {
            const pct = bonifMap[`${idCat}|${area}`];
            if (!pct) return ''; // celda vacía si no aplica
            const monto = base11 * (pct / 100);
            return formatNumberToDisplay(monto);
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
                          value={row.basicSalary ?? ''}
                          onChange={(e) => onEditBasic(row.idCategoria ?? idx, e.target.value)}
                          placeholder="0,00"
                        />
                      ) : (
                        formatCurrencyAR(Number(row.basicSalary) || 0)
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
          {/* Variables locales para las tablas adicionales */}
          {(() => {
            const data = currentData;
            const cats = [...(data.salaryTable?.categories || [])];
            const base11 = getBase11(cats);

            return (
              <>
                {/* Tabla Conceptos LYF */}
                <div className="bonif-section">
                  <table className="bonif-table">
                    <thead>
                      <tr>
                        <th>CONCEPTOS</th>
                        <th>VALOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(data.conceptosLyF) ? data.conceptosLyF : [])
                        .map((b, i) => {
                          const nombre = b?.nombre || b?.descripcion || `Concepto ${i+1}`;
                          const porcentaje = Number(b?.porcentaje) || 0;
                          let valor = 0;
                          if(b.nombre.includes("Bonif Antig")) {
                            valor = base11 * 1.4 * (porcentaje / 100);}
                          else{valor = base11 * (porcentaje / 100);}
                          return (
                            <tr key={b?.idConceptoLyF || b?.id || i}>
                              <td>{nombre}</td>
                              <td>{formatCurrencyAR(valor)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Tabla Títulos LYF */}
                <div className="titles-section">
                  <table className="titles-table">
                    <thead>
                      <tr>
                        <th>TÍTULOS</th>
                        <th>VALOR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(data.titulosLyF) ? data.titulosLyF : [])
                        .map((b, i) => {
                          const nombre = b?.nombre || b?.descripcion || `Título ${i+1}`;
                          const porcentaje = Number(b?.porcentaje) || 0;
                          const valor = base11 * (porcentaje / 100);
                          return (
                            <tr key={b?.idTituloLyF || b?.id || i}>
                              <td>{nombre}</td>
                              <td>{formatCurrencyAR(valor)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Tabla Horas Extras LYF */}
                <div className="horas-extras-section">
                  <table className="horas-extras-table">
                    <thead>
                      <tr>
                        <th>HORAS EXTRAS</th>
                        <th>PORCENTAJE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(data.horasExtrasLyF) ? data.horasExtrasLyF : [])
                        .map((he, i) => {
                          const nombre = he?.nombre || he?.descripcion || `Hora Extra ${i+1}`;
                          const factor = Number(he?.factor) || 0;
                          return (
                            <tr key={he?.idHoraExtra || he?.id || i}>
                              <td>{nombre}</td>
                              <td>{factor}x</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Tabla Conceptos Manuales LYF */}
                <div className="conceptos-manuales-section">
                  <div className="section-header">
                    <h3>Conceptos Manuales LYF</h3>
                    <button className="action-btn edit" onClick={handleCreateConceptoManual}>
                      <Plus className="action-icon" />
                      Agregar Concepto
                    </button>
                  </div>
                  <table className="conceptos-manuales-table">
                    <thead>
                      <tr>
                        <th>NOMBRE</th>
                        <th>MONTO</th>
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(data.conceptosManualesLyF) ? data.conceptosManualesLyF : [])
                        .sort((a, b) => {
                          const idA = a?.idConceptosManualesLyF || a?.idConceptoManualLyF || a?.id || 0;
                          const idB = b?.idConceptosManualesLyF || b?.idConceptoManualLyF || b?.id || 0;
                          return Number(idA) - Number(idB);
                        })
                        .map((cm, i) => {
                          const nombre = cm?.nombre || cm?.descripcion || `Concepto Manual ${i+1}`;
                          const monto = Number(cm?.monto || cm?.valor || 0);
                          return (
                            <tr key={cm?.idConceptosManualesLyF || cm?.idConceptoManualLyF || cm?.id || i}>
                              <td>{nombre}</td>
                              <td className="monto-cell">{formatCurrencyAR(monto)}</td>
                              <td className="actions-cell">
                                <button
                                  className="btn-icon-edit"
                                  onClick={() => handleEditConceptoManual(cm)}
                                  title="Editar concepto"
                                >
                                  <Edit className="icon" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
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
                            placeholder="0,00"
                          />
                        ) : (
                          formatCurrencyAR(Number(r[h.key]) || 0)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        })()}

        {/* Conceptos UOCRA */}
        <div className="uocra-conceptos-section">
          <div className="table-header">
            <h2>Conceptos UOCRA</h2>
          </div>
          {conceptosUocra.length > 0 ? (
            <table className="uocra-conceptos-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {conceptosUocra.map((concepto) => (
                  <tr key={concepto.idBonificacion || concepto.id}>
                    <td>{concepto.nombre || concepto.descripcion || 'Sin nombre'}</td>
                    <td className="porcentaje-cell">{concepto.porcentaje || 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No hay conceptos UOCRA registrados</p>
            </div>
          )}
        </div>
      </div>
    )}
      </div>

      {/* Create/Edit Concepto Manual LYF Modal */}
      <Modal
        isOpen={showConceptoManualModal}
        onClose={closeConceptoManualModal}
        title={selectedConceptoManual ? 'Editar Concepto Manual LYF' : 'Crear Concepto Manual LYF'}
        size="medium"
      >
        <div className="concepto-form">
          <div className="form-group">
            <label htmlFor="concepto-manual-nombre">Nombre del Concepto</label>
            <input
              id="concepto-manual-nombre"
              type="text"
              className="form-input"
              value={conceptoManualNombre}
              onChange={(e) => setConceptoManualNombre(e.target.value)}
              placeholder="Ingrese el nombre del concepto"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="concepto-manual-monto">Monto</label>
            <input
              id="concepto-manual-monto"
              type="text"
              className="form-input"
              value={conceptoManualMonto}
              onChange={(e) => {
                // Permitir solo números, punto y coma
                const value = e.target.value.replace(/[^\d,.-]/g, '');
                setConceptoManualMonto(value);
              }}
              placeholder="0,00"
            />
          </div>
        </div>
        
        <ModalFooter>
          <button className="btn btn-secondary" onClick={closeConceptoManualModal}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSaveConceptoManual}>
            {selectedConceptoManual ? 'Actualizar' : 'Crear'}
          </button>
        </ModalFooter>
      </Modal>

      <ConfirmDialog />
    </div>
  );
}