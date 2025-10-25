import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { User, Building, X, UserPlus, ListChecks } from 'lucide-react';
import * as api from "../../services/empleadosAPI";
import { form } from 'framer-motion/client';

export function NewEmployeeModal({ isOpen, onClose, onSave }) {
  const removeArea = (id) => {
    const numId = Number(id);
    setFormData(prev => ({
      ...prev,
      areas: (prev.areas || []).filter(aid => aid !== numId)
    }));
  }
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    domicilio: '',
    idZona: null,
    areas: [],
    inicioActividad: new Date().toISOString().split('T')[0], // Fecha actual
    estado: 'ACTIVO',
    idGremio: null,
    idCategoria: null,
    idCategoria: null,
    banco: '',
    cuil: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [areas, setAreas] = useState([]);
  const [selectedAreaToAdd, setSelectedAreaToAdd] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoriaNoEncontrada, setCategoriaNoEncontrada] = useState(false);
  const selectedSet = new Set((formData.areas || []).map(Number));
  const availableAreas = areas.filter(a => !selectedSet.has(a.id));
  const [conceptos, setConceptos] = useState([]);
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState({});
  const [filteredCategorias, setFilteredCategorias] = useState([]);
  const [areasHabilitadas, setAreasHabilitadas] = useState(false);
  const [areasSeleccionadas, setAreasSeleccionadas] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Rango de categorías por gremio
  const LUZ_Y_FUERZA_IDS = Array.from({ length: 18 }, (_, i) => i + 1); // Luz y Fuerza usa los id de categoria 1-18

  // Load employees al montar
  useEffect(() => {
    const loadEmployees = async () => {
      const data = await api.getEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  // Auto-calcular legajo
  useEffect(() => {
    if (!employees || employees.length === 0) {
      setFormData(prev => ({ ...prev, legajo: 1 }));
      return;
    }
    const lastLegajo = Math.max(...employees.map(e => Number(e.legajo) || 0));
    setFormData(prev => ({ ...prev, legajo: lastLegajo + 1 }));
  }, [employees]);
    
  useEffect(() => {
    setAreasHabilitadas(
      !!formData.gremio && formData.gremio !== "Convenio General"
    );
  }, [formData.gremio]);

  // Carga las áreas/zonas según el gremio seleccionado
  useEffect(() => {
    const loadAreasOrZonas = async () => {
      setAreas([]);
      setSelectedAreaToAdd('');
      if (!formData.gremio || formData.gremio === "Convenio General") return;

      try {
        let data = [];
        if (formData.gremio === "LUZ_Y_FUERZA") data = await api.getAreas();
        if (formData.gremio === "UOCRA") data = await api.getZonas();
        setAreas(data);
      } catch (err) {
        console.error("Error al cargar áreas o zonas:", err);
      }
    };
    loadAreasOrZonas();
  }, [formData.gremio]);

  // Carga las categorías al montar el componente
  useEffect(() => {
      const loadCategorias = async () => {
        try {
          const data = await api.getCategorias(); // hace el fetch con axios
          const ordenadas = data.sort((a, b) => a.idCategoria - b.idCategoria);
          setCategorias(ordenadas); // guarda las categorías ordenadas en el estado
        } catch (err) {
          console.error("Error loading categories:", err);
        }
      };
      loadCategorias();
    }, []);

  // Maneja el toggle de selección de conceptos
  useEffect(() => {
  setConceptos([
    { id: 1, nombre: 'Horas Extras', unidad: 'horas' },
    { id: 2, nombre: 'Comisión', unidad: '%' },
    { id: 3, nombre: 'Bono Producción', unidad: 'unidades' }
  ]);
  }, []);

  // Actualiza el salario base cuando cambia la categoría seleccionada
  useEffect(() => {
    if (!categorias.length) return;
    // preferimos el id si ya está (por ej. usuario seleccionó algo)
    if (formData.idCategoria) {
      const cat = findCategoriaById(formData.idCategoria);
      if (cat) {
        const basico = getCatBasico(cat);
        setFormData(prev => 
          prev.salary === basico && prev.categoria === getCatNombre(cat)
          ? prev
          : { ...prev, salary: basico, categoria: getCatNombre(cat) }
        );
        setCategoriaNoEncontrada(false);
      }
      return;
    }
  });

  useEffect(() => {
    if (!formData.gremio) {
      setFilteredCategorias([]);
      return;
    }

    if (formData.gremio === "LUZ_Y_FUERZA") {
      setFilteredCategorias(
        categorias.filter((c) => LUZ_Y_FUERZA_IDS.includes(c.idCategoria))
      );
    } else if (formData.gremio === "UOCRA") {
      setFilteredCategorias(
        categorias.filter((c) => !LUZ_Y_FUERZA_IDS.includes(c.idCategoria))
      );
    } else {
      setFilteredCategorias(categorias);
    }
  }, [formData.gremio, categorias]);

  // Normaliza strings para comparar sin importar mayúsculas, tildes, espacios, etc.
  const normalize = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  
  // Compara dos strings normalizados
  const sameName = (a, b) => normalize(a) === normalize(b);

  const findCategoriaByName = (name) => 
    categorias.find(c => sameName(getCatNombre(c), name));

  // Verifica si la categoría actual no está en el catálogo
  const getCatId = (c) => c?.id ?? c?.idCategoria ?? c?.categoriaId;
  const getCatNombre = (c) => c?.nombreCategoria ?? c?.descripcion ?? c?.categoria ?? `Categoría ${getCatId(c)}`;
  const getCatBasico = (c) => c?.salarioBasico ?? c?.basico ?? c?.sueldoBasico ?? c?.monto ?? c?.salario ?? 0;

  const findCategoriaById = (id) => categorias.find(c => String(getCatId(c)) === String(id));
  
  // Agregar área seleccionada desde el select
  const addSelectedArea = () => {
    const id = Number(selectedAreaToAdd);
    if (!Number.isFinite(id)) return;
    setFormData(prev => {
      const curr = Array.isArray(prev.areas) ? prev.areas : [];

      if(formData.gremio === "UOCRA") {
        // En UOCRA, solo una zona permitida
        return { ...prev, zonaId: id };
      }

      if (curr.includes(id)) return prev;
      return { ...prev, areas: [...curr, id] };
    });
    setSelectedAreaToAdd('');
    if (errors?.areas) setErrors(prev => ({ ...prev, areas: '' }));
  };

  const handleAreaOrZonaSelect = (idSeleccionado) => {
    setSelectedAreaToAdd(idSeleccionado);

    if (formData.gremio === "UOCRA") {
      // Busca la zona seleccionada
      const zonaSeleccionada = areas.find((z) => z.idZona === parseInt(idSeleccionado));
      if (zonaSeleccionada) {
        // Actualiza las categorías según la zona
        setCategorias(zonaSeleccionada.categorias || []);
      } else {
        setCategorias([]);
      }
    }

    if (formData.gremio === "Luz y Fuerza") {
      // Solo limpia categorías si se cambia de área
      setCategorias([]);
    }
  };

  // Maneja el cambio de categoría y actualiza el salario base
  const handleCategoriaChange = (id) => {
    const cat = findCategoriaById(Number(id)); // <-- convertir aquí
    setFormData(prev => ({
      ...prev,
      idCategoria: Number(id),                 // <-- guardar número en el state
      categoria: cat ? getCatNombre(cat) : prev.categoria,
      salary: cat ? getCatBasico(cat) : ''
    }));
    if (errors?.categoria) setErrors(prev => ({ ...prev, categoria: '' }));
  };

  // Maneja el cambio en los campos del formulario
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpia el error del campo si existe
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Valida el formulario antes de enviarlo
  const validateForm = () => {
    const newErrors = {};

    if (!(formData.nombre?.trim())) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!(formData.apellido?.trim())) {
      newErrors.apellido = 'El apellido es requerido';
    }

    if (!(formData.cuil?.trim())) {
      newErrors.cuil = 'El CUIL es requerido';
    }

    if (!(formData.categoria?.trim()) && !formData.idCategoria) {
      newErrors.categoria = 'Debe asignar una categoría al empleado';
    }

    if (!(formData.gremioId)) {
      newErrors.gremio = 'Debe asignar un gremio al empleado';
    }

    if (formData.gremio === "UOCRA") {
      if (!formData.zonaId) {
        newErrors.areas = 'Debe asignar por lo menos una zona al empleado';
      }
    } else {
      if (!Array.isArray(formData.areas) || formData.areas.length === 0) {
        newErrors.areas = 'Debe asignar por lo menos un área al empleado';
      }
    }

    if (!(formData.inicioActividad?.trim())) {
      newErrors.inicioActividad = 'La fecha de ingreso de actividad es requerida';
    }

    if(formData.sexo && !['M', 'F'].includes(formData.sexo)) {
      newErrors.sexo = 'El sexo debe ser "M" o "F"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Maneja el envío del formulario para crear un nuevo empleado
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return; // valida antes de enviar

    setIsLoading(true);

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        domicilio: formData.domicilio || "",
        cuil: formData.cuil || "",
        estado: "ACTIVO",
        idGremio: Number(formData.gremioId), // Objeto gremio con ID
        idCategoria: Number(formData.idCategoria),
        banco: formData.banco || "",
        sexo: formData.sexo || "",
        inicioActividad: new Date(formData.inicioActividad).toISOString().split("T")[0], // "YYYY-MM-DD"
        idAreas: formData.areas.map((a) => Number(a)), // Array de IDs numéricos
      };

      // Si gremio es UOCRA y tiene zona, agregar idZona
      if (formData.gremio === "UOCRA" && formData.zonaId) {
        payload.idZona = Number(formData.zonaId);
      }
      // Llama al callback onSave si está definido
      if (onSave) await onSave(payload, false);
      handleClose();

    } catch (err) {
      console.error("Error al crear empleado:", err);
      alert("No se pudo crear el empleado. Revisá los datos e intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const GREMIOS = {
    'LUZ_Y_FUERZA': 1,
    'UOCRA': 2,
    'Convenio General': 0
  };

  const handleGremioChange = (value) => {
    setFormData(prev => ({
      ...prev,
      gremio: value,
      gremioId: GREMIOS[value] || null, // <-- asigna el id correcto
      areas: [], // limpia áreas al cambiar gremio
      zonaId: null, // limpia zona al cambiar gremio
    }));
  };

  // Maneja el cierre del modal y resetea el formulario
  const handleClose = () => {
    setFormData({
      nombre: '',
      apellido: '',
      domicilio: '',
      idAreas: [],
      inicioActividad: new Date().toISOString().split('T')[0],
      estado: 'ACTIVO',
      idGremio: null,
      idCategoria: null,
      idZona: null,
      banco: '',
      cuil: '',
      sexo: 'M',
    });
    setErrors({});
    onClose();
  };

  // Maneja el toggle de selección de conceptos adicionales
  const handleConceptToggle = (conceptId) => {
    setConceptosSeleccionados((prev) => {
      const next = { ...prev };
      if (next[conceptId]) {
        delete next[conceptId];
      } else {
        next[conceptId] = { units: '' };
      }
      return next;
    });
  };
  
  // Maneja el cambio en las unidades de un concepto seleccionado
  const handleUnitsChange = (conceptId, units) => {
    setConceptosSeleccionados((prev) => ({
      ...prev,
      [conceptId]: { ...prev[conceptId], units }
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Agregar Nuevo Empleado"
      size="large"
      className="new-employee-modal"
    >
      <form onSubmit={handleSubmit} className="employee-form">
        {/* Información Personal */}
        <div className="form-section">
          <h3 className="section-title">
            <User className="title-icon" />
            Información Personal
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Legajo *</label>
              <input
                type="text"
                className="form-input"
                value={formData.legajo}
                readOnly
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label">CUIL *</label>
              <input
                type="text"
                className="form-input"
                value={formData.cuil}
                onChange={(e) => handleInputChange('cuil', e.target.value)}
                placeholder="20-12345678-9"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input
                type="text"
                className={`form-input ${errors.nombre ? 'error' : ''}`}
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                placeholder="Ingrese el nombre"
              />
              {errors.nombre && <span className="error-message">{errors.nombre}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Apellido *</label>
              <input
                type="text"
                className={`form-input ${errors.apellido ? 'error' : ''}`}
                value={formData.apellido}
                onChange={(e) => handleInputChange('apellido', e.target.value)}
                placeholder="Ingrese el apellido"
              />
              {errors.apellido && <span className="error-message">{errors.apellido}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Domicilio</label>
              <input
                type="text"
                className="form-input"
                value={formData.domicilio}
                onChange={(e) => handleInputChange('domicilio', e.target.value)}
                placeholder="Ingrese domicilio"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sexo</label>
              <select
                className="form-select"
                value={formData.sexo}
                onChange={(e) => handleInputChange('sexo', e.target.value)}
              >
                <option value="">Seleccione...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </div>
        </div>

        {/* Información Laboral */}
        <div className={'form-section'}>
          <h3 className={'section-title'}>
            <Building className={'title-icon'} />
            Información Laboral
          </h3>
          <div className={'form-grid'}>
            <div className="form-group">
              <label className="form-label">Gremio *</label>
              <select
                className={`form-select ${errors.gremio ? 'error' : ''}`}
                value={formData.gremio || ''}
                onChange={(e) => handleGremioChange(e.target.value)}
              >
                <option value="Convenio General">Convenio General</option>
                <option value="LUZ_Y_FUERZA">LUZ Y FUERZA</option>
                <option value="UOCRA">UOCRA</option>
              </select>
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>Categoría *</label>
              <select
                className={`form-select ${errors.categoria ? 'error' : ''}`}
                value={formData.idCategoria || ''}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                disabled={!formData.gremio}
              >
                <option value="">Seleccionar categoría</option>
                {filteredCategorias.map((cat) => (
                  <option key={cat.idCategoria} value={cat.idCategoria}>
                    {getCatNombre(cat)}
                  </option>
                ))}
              </select>
              {errors.categoria && <span className="error-message">{errors.categoria}</span>}
            </div>

            <div className={'form-group'}>
              <label className={'form-label'}>Salario Básico *</label>
              <input
                type="number"
                className={`${'form-input'} ${errors.salary ? 'error' : ''}`}
                value={formData.salary ?? ''} 
                placeholder="—"
                min="0"
                step="1"
                disabled
                readOnly
                title="Este valor se establece por la categoría seleccionada"
              />
              {errors.salary && <span className="error-message">{errors.salary}</span>}
            </div>

            {/* Áreas o Zonas */}
            <div className="form-group">
              <label className="form-label">
                {formData.gremio === "UOCRA" ? "Zona" : "Área"}
              </label>

              {formData.gremio === "UOCRA" ? (
                // 🔹 Caso UOCRA: solo un select simple de zona (sin chips ni botones)
                <select
                  className="form-select"
                  value={formData.zonaId || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      zonaId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  disabled={!areasHabilitadas}
                >
                  <option value="">Seleccionar zona</option>
                  {areas.map((zona) => (
                    <option key={zona.idZona} value={zona.idZona}>
                      {zona.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                // 🔹 Caso general: múltiples áreas con chips y botón "+"
                <>
                  <div className="area-chips">
                    {(formData.areas || []).map((id, idx) => {
                      const ref = areas.find((a) => a.idArea === Number(id));
                      return (
                        <span key={idx} className="area-chip">
                          {ref ? ref.nombre : `Área #${id}`}
                          <button
                            type="button"
                            className="chip-remove"
                            onClick={() => removeArea(id)}
                            disabled={!areasHabilitadas}
                          >
                            –
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  <div className="area-actions" style={{ display: "flex", gap: 8 }}>
                    <select
                      className="form-select"
                      value={selectedAreaToAdd}
                      onChange={(e) => handleAreaOrZonaSelect(e.target.value)}
                      disabled={!areasHabilitadas}
                    >
                      <option value="">Seleccionar área</option>
                      {areas
                        .filter((item) => !((formData.areas || []).includes(item.idArea)))
                        .map((item) => (
                          <option key={item.idArea} value={item.idArea}>
                            {item.nombre}
                          </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addSelectedArea}
                      disabled={
                        !selectedAreaToAdd ||
                        !areasHabilitadas ||
                        !formData.gremio ||
                        formData.gremio === "Convenio General"
                      }
                    >
                      +
                    </button>
                  </div>
                </>
              )}

              {errors?.areas && <span className="error-message">{errors.areas}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Banco</label>
              <select
                className="form-select"
                value={formData.banco}
                onChange={(e) => handleInputChange('banco', e.target.value)}
              >
                <option value="Banco Nación">Banco Nación</option>
                <option value="Banco Provincia">Banco Provincia</option>
                <option value="Banco Santander">Banco Santander</option>
                <option value="Banco Galicia">Banco Galicia</option>
                <option value="BBVA">BBVA</option>
                <option value="Banco Macro">Banco Macro</option>
              </select>
            </div>
          </div>
        </div>
        {/* Conceptos Adicionales */}
        <div className="form-section conceptos-section">
          <h3 className="section-title">
            <ListChecks className="title-icon" />
            Conceptos Adicionales
          </h3>
          <div className="conceptos-list">
            {conceptos.map((concepto) => (
              <div key={concepto.id} className="concepto-item">
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id={`concepto-${concepto.id}`}
                    checked={!!conceptosSeleccionados[concepto.id]}
                    onChange={() => handleConceptToggle(concepto.id)}
                  />
                  <label htmlFor={`concepto-${concepto.id}`}>{concepto.nombre}</label>
                </div>
                <div className="units-input">
                  <label htmlFor={`units-${concepto.id}`}>Unidades:</label>
                  <input
                    type="number"
                    id={`units-${concepto.id}`}
                    value={(conceptosSeleccionados[concepto.id]?.units ?? '')}
                    onChange={(e) => handleUnitsChange(concepto.id, e.target.value)}
                    min="0"
                    disabled={!conceptosSeleccionados[concepto.id]}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <ModalFooter>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleClose}
            disabled={isLoading}
            >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
            >
            <UserPlus className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Crear Empleado'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}