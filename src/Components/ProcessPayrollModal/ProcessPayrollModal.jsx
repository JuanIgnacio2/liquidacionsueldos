import React, { useEffect, useState } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { Search, Users, Download, Printer, Plus, X, CheckCircle, User, Calendar, Badge, Clock, Star } from 'lucide-react';
import './ProcessPayrollModal.scss';
import * as api from '../../services/empleadosAPI'

// Función helper para formatear moneda en formato argentino ($100.000,00)
const formatCurrencyAR = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0,00';
  const numValue = Number(value);
  const absValue = Math.abs(numValue);
  const parts = absValue.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${integerPart},${parts[1]}`;
};

export function ProcessPayrollModal({ isOpen, onClose, onProcess, employees, initialEmployee = null }) {
  const [currentStep, setCurrentStep] = useState('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollData, setPayrollData] = useState({});
  const [concepts, setConcepts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conceptos, setConceptos] = useState([]);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [periodo, setPeriodo] = useState(
    new Date().toISOString().slice(0,7)
  );
  const [basicSalary, setBasicSalary] = useState(0);
  const [descuentosData, setDescuentosData] = useState([]);

  // Función para formatear el nombre del gremio
  const formatGremioNombre = (gremioNombre) => {
    if (!gremioNombre) return '';
    const upper = gremioNombre.toUpperCase();
    if (upper === 'LUZ_Y_FUERZA' || upper.includes('LUZ') && upper.includes('FUERZA')) {
      return 'Luz y Fuerza';
    }
    return gremioNombre;
  };

  const calcTotal = (lista) =>
    lista.reduce(
    (s, c) => s + (c.tipo === 'DESCUENTO' ? -c.total : c.total),
    0
  );

  // Seleccionar empleado
  const handleSelectEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setConceptos([]); // Limpiamos la tabla anterior

    try {
      const gremio = employee.gremio?.nombre?.toUpperCase() ?? '';
      let basicoValue = 0;
      let basico = null;

      if (gremio.includes('UOCRA')) {
        // 🔸 Obtener básico por categoría y zona
        const categoriaZona = await api.getBasicoByCatAndZona(employee.idCategoria, employee.idZonaUocra);
        basicoValue = categoriaZona.basico;
        setBasicSalary(basicoValue);
        basico = {
          id: categoriaZona.id,
          tipo: 'CATEGORIA_ZONA',
          nombre: `Básico - ${categoriaZona.zona}`,
          montoUnitario: basicoValue,
          cantidad: 1,
          total: basicoValue ?? 0,
        };
      } else {
        // 🔸 Luz y Fuerza (básico por categoría)
        const categoria = await api.getCategoriaById(employee.idCategoria);
        basicoValue = categoria.basico;
        setBasicSalary(basicoValue);
        basico = {
          id: employee.idCategoria,
          tipo: 'CATEGORIA',
          nombre: `Básico`,
          montoUnitario: basicoValue,
          cantidad: 1,
          total: basicoValue ?? 0,
        };
      }

      /* Bonificaciones de área (solo para Luz y Fuerza) */
      let bonosDeAreas = [];
      if (gremio.includes('LUZ')) {
        const areas = (employee.idAreas || []).map((id, index) => ({
          idArea: id,
          nombre: employee.nombreAreas?.[index] ?? 'Área',
        }));

        const categoria_11 = await api.getCategoriaById(11);
        bonosDeAreas = await Promise.all(
          areas.map(async (area) => {
            // El porcentaje se obtiene usando categoría 11 (no la categoría del empleado)
            const porcentaje = await api.getPorcentajeArea(area.idArea, employee.idCategoria);
            const bonoImporte = (categoria_11.basico * Number(porcentaje)) / 100;
            return {
              id: area.idArea,
              tipo: 'BONIFICACION_AREA',
              nombre: `${area.nombre}`,
              montoUnitario: bonoImporte,
              cantidad: 1,
              total: bonoImporte ?? 0,
            };
          })
        );
      }

      /* Conceptos precargados en base de datos */
      const conceptosAsignados = await api.getConceptosAsignados(employee.legajo);
      
      // Cargar bonificaciones fijas según el gremio del empleado
      let bonificacionesFijas = [];
      const gremioUpper = gremio;
      const isLuzYFuerza = gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA');
      const isUocra = gremioUpper === 'UOCRA';
      
      if (isLuzYFuerza) {
        bonificacionesFijas = await api.getConceptosLyF();
      } else if (isUocra) {
        bonificacionesFijas = await api.getConceptosUocra();
      }
      
      const descuentos = await api.getDescuentos();
      setDescuentosData(descuentos); // Guardar descuentos para uso posterior

      // Obtener básico de categoría 11 para Luz y Fuerza
      let basicoCat11 = 0;
      if (isLuzYFuerza) {
        try {
          const cat11 = await api.getCategoriaById(11);
          basicoCat11 = cat11?.basico ?? cat11?.salarioBasico ?? cat11?.sueldoBasico ?? cat11?.monto ?? cat11?.salario ?? 0;
        } catch (error) {
          console.error('Error al obtener categoría 11:', error);
        }
      }

      // Separar bonificaciones y descuentos
      const bonificacionesMapped = conceptosAsignados
        .filter(asignado => asignado.tipoConcepto === 'CONCEPTO_LYF' || asignado.tipoConcepto === 'CONCEPTO_UOCRA')
        .map((asignado) => {
          const concepto = bonificacionesFijas.find(b => 
            (b.idBonificacion ?? b.id) === asignado.idReferencia
          );

          if (!concepto) return null;

          // Para Luz y Fuerza (CONCEPTO_LYF): calcular sobre categoría 11
          // Para UOCRA (CONCEPTO_UOCRA): calcular sobre el básico del empleado
          let baseCalculo = basicoValue;
          if (asignado.tipoConcepto === 'CONCEPTO_LYF' && isLuzYFuerza) {
            baseCalculo = basicoCat11;
          }

          const montoUnitario = (baseCalculo * concepto.porcentaje / 100);

          return {
            id: asignado.idReferencia,
            tipo: asignado.tipoConcepto,
            nombre: concepto.nombre ?? concepto.descripcion ?? 'Concepto',
            montoUnitario,
            cantidad: asignado.unidades,
            total: montoUnitario * asignado.unidades,
          };
        })
        .filter(Boolean);

      // Calcular total de remuneraciones (básico + bonos de área + bonificaciones)
      const totalRemuneraciones = basicoValue + 
        bonosDeAreas.reduce((sum, b) => sum + (b.total || 0), 0) +
        bonificacionesMapped.reduce((sum, b) => sum + (b.total || 0), 0);

      // Descuentos se calculan sobre el total de remuneraciones
      const descuentosMapped = conceptosAsignados
        .filter(asignado => asignado.tipoConcepto === 'DESCUENTO')
        .map((asignado) => {
          const concepto = descuentos.find(d => 
            (d.idDescuento ?? d.id) === asignado.idReferencia
          );

          if (!concepto) return null;

          // Descuentos se calculan sobre el total de remuneraciones
          const montoUnitario = (totalRemuneraciones * concepto.porcentaje / 100);

          return {
            id: asignado.idReferencia,
            tipo: 'DESCUENTO',
            nombre: concepto.nombre ?? concepto.descripcion ?? 'Concepto',
            montoUnitario,
            porcentaje: concepto.porcentaje, // Guardar porcentaje para recalcular
            cantidad: asignado.unidades,
            total: -(montoUnitario * asignado.unidades), // Negativo porque es descuento
          };
        })
        .filter(Boolean);

      /* Lista final de conceptos */
      // Para UOCRA, no incluir el concepto básico en la lista
      const lista = isUocra 
        ? [...bonificacionesMapped, ...descuentosMapped]
        : [basico, ...bonosDeAreas, ...bonificacionesMapped, ...descuentosMapped];

      setTotal(calcTotal(lista));
      setConceptos(lista);
      setCurrentStep('payroll');
    } catch (error) {
      console.error('Error al obtener básico:', error);
      alert('No se pudo obtener el sueldo básico del empleado.');
    }
  };

  // Seleccionar empleado inicial cuando el modal se abre con un empleado preseleccionado
  useEffect(() => {
    if (isOpen && initialEmployee) {
      // Solo seleccionar si el empleado inicial es diferente al seleccionado actualmente
      if (!selectedEmployee || selectedEmployee.legajo !== initialEmployee.legajo) {
        handleSelectEmployee(initialEmployee);
      }
    } else if (!isOpen) {
      // Reset cuando el modal se cierra
      setCurrentStep('search');
      setSearchTerm('');
      setSelectedEmployee(null);
      setConceptos([]);
      setTotal(0);
      setBasicSalary(0);
      setDescuentosData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialEmployee]);

  // Actualizar cantidad de un concepto
  const handleQtyChange = (conceptId, nuevaCantidad) => {
    const cantidad = Number(nuevaCantidad) || 0;
    
    // Primero actualizar el concepto modificado
    const nuevos = conceptos.map(concept => {
      if (concept.id === conceptId) {
        if (concept.tipo === 'DESCUENTO') {
          // Para descuentos, mantener el montoUnitario y recalcular después
          return { ...concept, cantidad };
        }
        return { ...concept, cantidad, total: (concept.montoUnitario || 0) * cantidad };
      }
      return concept;
    });
    
    // Calcular total de remuneraciones (básico + bonos de área + bonificaciones)
    const basicoEmpleado = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') ? basicSalary : 0;
    const totalRemuneraciones = basicoEmpleado + nuevos
      .filter(c => c.tipo !== 'DESCUENTO' && c.tipo !== 'CATEGORIA_ZONA')
      .reduce((sum, c) => {
        if (c.id === conceptId && c.tipo !== 'DESCUENTO') {
          return sum + ((c.montoUnitario || 0) * cantidad);
        }
        return sum + (c.total || 0);
      }, 0);
    
    // Recalcular descuentos basados en el nuevo total de remuneraciones
    const nuevosConDescuentos = nuevos.map(concept => {
      if (concept.tipo === 'DESCUENTO') {
        // Usar el porcentaje guardado en el concepto para recalcular
        if (concept.porcentaje && totalRemuneraciones > 0) {
          const montoUnitario = (totalRemuneraciones * concept.porcentaje / 100);
          const cantidadActual = concept.id === conceptId ? cantidad : concept.cantidad;
          return { ...concept, montoUnitario, total: -(montoUnitario * cantidadActual) };
        }
        return concept;
      }
      return concept;
    });
    
    setConceptos(nuevosConDescuentos);
    setTotal(calcTotal(nuevosConDescuentos));
  };

  const handleAddConcepto = () => {
    setModalOpen(true);
  };

  const handleConfirmConeptos = (nuevos) => {
    const lista = [...conceptos, ...nuevos];
    setConceptos(lista);
    setTotal(calcTotal(lista));
  };

  // Filtrar empleados por búsqueda
  const filteredEmployees = employees.filter(employees =>
    employees.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employees.legajo.toString().includes(searchTerm) ||
    employees.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Actualizar concepto
  const updateConcept = (id, field, value) => {
    setConcepts(prev => prev.map(concept => {
      if (concept.id === id) {
        const updated = { ...concept, [field]: value };
        // Auto-calculate amount if units or unitValue change
        if (field === 'units' || field === 'unitValue') {
          updated.amount = (updated.units || 0) * (updated.unitValue || 0);
        }
        return updated;
      }
      return concept;
    }));
  };

  // Eliminar concepto
  const removeConcept = (id) => {
    setConcepts(prev => prev.filter(concept => concept.id !== id));
  };

  // Calcular totales
  const calculateTotals = () => {
    // Incluir el básico del empleado si es UOCRA (no está en conceptos)
    const basicoEmpleado = selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') ? basicSalary : 0;
    
    const remunerations = basicoEmpleado + conceptos
      .filter(c => c.tipo === 'CATEGORIA' || c.tipo === 'BONIFICACION_AREA' || c.tipo === 'CONCEPTO_LYF' || c.tipo === 'CONCEPTO_UOCRA')
      .reduce((sum, c) => sum + (c.total || 0), 0);

    const deductions = conceptos.filter(c => c.tipo === 'DESCUENTO')
      .reduce((sum, c) => sum + Math.abs(c.total || 0), 0);

    const netAmount = remunerations - deductions;

    return { remunerations, deductions, netAmount };
  };

  // LIQUIDAR SUELDO Y GENERAR RECIBO
  const generatePayroll = async () => {
  if (!selectedEmployee) return;
  setIsProcessing(true);

  const payload = {
      legajo: selectedEmployee.legajo,
      periodoPago: periodo,
      conceptos: conceptos.map((c) => ({
        tipoConcepto: c.tipo,
        idReferencia: c.id,
        unidades: c.cantidad,
      })),
    };

  try {
    const result = await api.guardarLiquidacion(payload);
    setPayrollData({
      ...payrollData,
      periodDisplay: result.periodoPago,
      totalNeto: result.total_neto
    });

    setCurrentStep('preview');
  } catch (error) {
    console.error('Error al liquidar sueldo:', error);
    alert('Hubo un error al procesar la liquidación.');
  } finally {
    setIsProcessing(false);
  }
};


  // Imprimir recibo
  const handlePrint = () => {
    window.print();
  };

  // Descargar recibo
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = 'data:text/plain;charset=utf-8,Recibo de Sueldo - ' + selectedEmployee?.nombre;
    link.download = `recibo_${selectedEmployee?.legajo}_${payrollData.period}.txt`;
    link.click();
  };

  // Resetear modal
  const resetModal = () => {
    setCurrentStep('search');
    setSearchTerm('');
    setSelectedEmployee(null);
    setPayrollData({});
    setConcepts([]);
    setIsProcessing(false);
    onClose();
  };

  const { remunerations, deductions, netAmount } = calculateTotals();

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetModal}
      title={
        currentStep === 'search' ? 'Buscar Empleado' :
        currentStep === 'payroll' ? `Liquidación - ${selectedEmployee?.nombre}` :
        'Vista Previa del Recibo'
      }
      size={currentStep === 'preview' ? 'large' : 'medium'}
      className="process-payroll-modal"
    >
      {/* STEP 1: EMPLOYEE SEARCH */}
      {currentStep === 'search' && (
        <div className="employee-search">
          <div className="search-section">
            <div className="section-header-enhanced">
              <div className="step-indicator">
                <span className="step-number">1</span>
                <Star className="step-star" />
              </div>
              <div className="header-content">
                <h3 className="section-title section-title-effect">
                  <Users className="title-icon" />
                  Seleccionar Empleado
                </h3>
                <p className="section-subtitle">Busca y selecciona el empleado para generar su liquidación</p>
              </div>
            </div>

            <div className="search-container">
              <div className="search-input-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o legajo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <div className="search-badge">
                    <Badge className="badge-icon" />
                    <span>{filteredEmployees.length} resultado(s)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="employees-list">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map(employee => (
                  <div key={employee.legajo} className="employee-card" onClick={() => handleSelectEmployee(employee)}>
                    <div className="employee-card-accent"></div>
                    <div className="employee-info">
                      <div className="employee-main">
                        <div className="employee-avatar">
                          <User className="employee-icon" />
                          <div className="status-dot"></div>
                        </div>
                        <div className="employee-details">
                          <h4 className="employee-name">{`${employee.nombre} ${employee.apellido}`}</h4>
                          <div className="employee-badges">
                            <span className="badge legajo-badge">#{employee.legajo}</span>
                            <span className="badge category-badge">{employee.categoria}</span>
                            <span className="badge convenio-badge">{formatGremioNombre(employee.gremio.nombre)}</span>
                          </div>
                          <p className="employee-meta">
                            <Clock className="meta-icon" />
                            Ingreso: {employee.inicioActividad}
                          </p>
                        </div>
                      </div>
                      <div className="employee-salary">
                        <span className="salary-label">Sueldo Básico:</span>
                        <span className="salary-value">
                          {formatCurrencyAR(employee.salary || employee.sueldoBasico || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-results">
                  <Users className="no-results-icon" />
                  <p>No se encontraron empleados</p>
                  <span className="no-results-hint">Intenta con otro término de búsqueda</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PAYROLL FORM */}
      {currentStep === 'payroll' && selectedEmployee && (
        <div className="payroll-form">
          <div className="section-header-enhanced">
            <div className="step-indicator">
              <span className="step-number">2</span>
              <Star className="step-star" />
            </div>
            <div className="header-content">
              <h3 className="section-title">Configurar Liquidación</h3>
              <p className="section-subtitle">Ajusta los conceptos y genera el recibo de sueldo</p>
            </div>
          </div>

          <div className="employee-header">
            <div className="employee-summary">
              <div className="employee-avatar-small">
                <User className="avatar-icon" />
                <div className="status-dot-small"></div>
              </div>
              <div className="summary-details">
                <h4>{selectedEmployee.nombre}</h4>
                <div className="summary-badges">
                  <span className="badge">#{selectedEmployee.legajo}</span>
                  <span className="badge">{selectedEmployee.categoria}</span>
                  <span className="badge">{formatGremioNombre(selectedEmployee.gremio.nombre)}</span>
                </div>
                {basicSalary > 0 && (
                  <div className="salary-info" style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
                    <span>Sueldo Básico: </span>
                    <strong>{formatCurrencyAR(basicSalary)}</strong>
                  </div>
                )}
              </div>
            </div>
            <div className="period-info">
              <Calendar className="period-icon" />
              <div className="period-details">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="month"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                  <span className="period-status">En proceso</span>
                </div>
              </div>
            </div>
          </div>

          <div className="concepts-section">
            <div className="section-header">
              <div className="header-left">
                <h3>Conceptos de Liquidación</h3>
                <div className="concepts-counter">
                  <Badge className="counter-icon" />
                  <span>{concepts.length} conceptos</span>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm enhanced-btn">
                <Plus className="h-4 w-4 mr-1" />
                Agregar Concepto
                <div className="btn-accent"></div>
              </button>
            </div>

            <div className="concepts-table">
              <div className="table-header">
                <span>Código</span>
                <span>Concepto</span>
                <span>Unidades</span>
                <span>Remuneraciones</span>
                <span>Descuentos</span>
                <span>Acciones</span>
              </div>

              {conceptos.map(concept => (
                <div key={concept.id} className="concept-row">
                  <div className="concept-cell">
                    {concept.isManual ? (
                      <input
                        type="text"
                        value={concept.id}
                        onChange={(e) => updateConcept(concept.id, 'code', e.target.value)}
                        className="concept-input small"
                        placeholder="Cód"
                      />
                    ) : (
                      <span>{concept.id}</span>
                    )}
                  </div>

                  <div className="concept-cell">
                    {concept.isManual ? (
                      <input
                        type="text"
                        value={concept.nombre}
                        onChange={(e) => updateConcept(concept.id, 'name', e.target.value)}
                        className="concept-input"
                        placeholder="Nombre del concepto"
                      />
                    ) : (
                      <span>{concept.nombre}</span>
                    )}
                  </div>

                  <div className="concept-cell">
                    <input
                      type="number"
                      value={concept.cantidad}
                      onChange={(e) => handleQtyChange(concept.id, parseFloat(e.target.value) || 0)}
                      className="concept-input small"
                      step="0.1"
                      min="0"
                    />
                  </div>

                  <div className="concept-cell">
                    {(concept.tipo === 'CATEGORIA' ||
                      concept.tipo === 'BONIFICACION_AREA' ||
                      concept.tipo === 'CONCEPTO_LYF' ||
                      concept.tipo === 'CONCEPTO_UOCRA') && (
                      <span className="amount positive">
                        {formatCurrencyAR(concept.montoUnitario || 0)}
                      </span>
                    )}
                  </div>

                  <div className="concept-cell">
                    {concept.tipo === 'DESCUENTO' && (
                      <span className="amount negative">
                        {formatCurrencyAR(Math.abs(concept.total || 0))}
                      </span>
                    )}
                  </div>

                  <div className="concept-cell">
                    <div className="concept-actions">
                      {concept.isManual && (
                        <>
                          <select
                            value={concept.tipo}
                            onChange={(e) => updateConcept(concept.id, 'type', e.target.value)}
                            className="type-select"
                          >
                            <option value="remuneration">Remuneración</option>
                            <option value="deduction">Descuento</option>
                          </select>
                          <button
                            className="remove-btn"
                            onClick={() => removeConcept(concept.id)}
                            title="Eliminar concepto"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="totals-summary">
              <div className="total-item">
                <span>Total Remuneraciones:</span>
                <span className="amount positive">{formatCurrencyAR(remunerations)}</span>
              </div>
              <div className="total-item">
                <span>Total Descuentos:</span>
                <span className="amount negative">{formatCurrencyAR(deductions)}</span>
              </div>
              <div className="total-item final">
                <span>NETO A COBRAR:</span>
                <span className="amount final">{formatCurrencyAR(netAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: RECEIPT PREVIEW */}
      {currentStep === 'preview' && selectedEmployee && (
        <div className="receipt-preview">
          <div className="section-header-enhanced">
            <div className="step-indicator">
              <span className="step-number">3</span>
              <Star className="step-star" />
            </div>
            <div className="header-content">
              <h3 className="section-title">Vista Previa del Recibo</h3>
              <p className="section-subtitle">Revisa y confirma la liquidación antes de imprimir</p>
            </div>
          </div>

          <div className="receipt-container">
            <div className="receipt-stamp">
              <CheckCircle className="stamp-icon" />
              <span>RECIBO GENERADO</span>
            </div>

            <div className="receipt-header">
              <div className="company-info">
                <div className="company-logo">
                  <div className="logo-circle">
                    <span>C</span>
                  </div>
                </div>
                <div className="company-details">
                  <h3>COOP.SERV.PUB.25 DE MAYO LTDA.</h3>
                  <p>Domicilio: RAMIREZ 367 - CUIT: 30-54569238-0</p>
                  <div className="company-accent"></div>
                </div>
              </div>
            </div>

            <div className="receipt-employee-info">
              <div className="employee-data">
                <div className="data-row">
                  <span className="label">APELLIDO Y NOMBRE:</span>
                  <span className="value">{selectedEmployee.nombre} {selectedEmployee.apellido}</span>
                </div>
                <div className="data-row">
                  <span className="label">PERÍODO DE PAGO:</span>
                  <span className="value">{payrollData.periodDisplay || periodo}</span>
                </div>
              </div>
              <div className="employee-meta">
                <div className="meta-item">
                  <span className="label">SECCIÓN:</span>
                  <span className="value">{selectedEmployee.section}</span>
                </div>
                <div className="meta-item">
                  <span className="label">LEGAJO:</span>
                  <span className="value">{selectedEmployee.legajo}</span>
                </div>
                <div className="meta-item">
                  <span className="label">CATEGORÍA:</span>
                  <span className="value">{selectedEmployee.category}</span>
                </div>
              </div>
            </div>

            <div className="receipt-concepts">
              <div className="concepts-header">
                <span>CONCEPTO</span>
                <span>UNIDADES</span>
                <span>REMUNERACIONES</span>
                <span>DESCUENTOS</span>
              </div>

              {conceptos.map(concept => (
                <div key={concept.id} className="concept-line">
                  <span className="concept-code">{concept.id}</span>
                  <span className="concept-name">{concept.nombre}</span>
                  <span className="concept-units">{concept.cantidad}</span>
                  <span className="concept-remuneration">
                    {(concept.tipo === 'CATEGORIA' ||
                      concept.tipo === 'BONIFICACION_AREA' ||
                      concept.tipo === 'CONCEPTO_LYF' ||
                      concept.tipo === 'CONCEPTO_UOCRA') && concept.total > 0 ? formatCurrencyAR(concept.total) : ''}
                  </span>
                  <span className="concept-deduction">
                    {concept.tipo === 'DESCUENTO' && concept.total < 0 ? formatCurrencyAR(Math.abs(concept.total)) : ''}
                  </span>
                </div>
              ))}
              {/* Mostrar básico para UOCRA en el recibo */}
              {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') && basicSalary > 0 && (
                <div className="concept-line">
                  <span className="concept-code">-</span>
                  <span className="concept-name">Básico</span>
                  <span className="concept-units">1</span>
                  <span className="concept-remuneration">{formatCurrencyAR(basicSalary)}</span>
                  <span className="concept-deduction"></span>
                </div>
              )}
            </div>

            <div className="receipt-totals">
              <div className="total-breakdown">
                <div className="breakdown-line">
                  <span>Total Remuneraciones:</span>
                  <span className="amount-positive">+{formatCurrencyAR(remunerations)}</span>
                </div>
                <div className="breakdown-line">
                  <span>Total Descuentos:</span>
                  <span className="amount-negative">-{formatCurrencyAR(deductions)}</span>
                </div>
              </div>
              <div className="total-line">
                <span>TOTAL NETO:</span>
                <span className="final-amount">{formatCurrencyAR(netAmount)}</span>
                <div className="amount-indicator"></div>
              </div>
            </div>

            <div className="receipt-footer">
              <div className="payment-info">
                <span>LUGAR Y FECHA DE PAGO: HASENKAMP - {new Date().toLocaleDateString('es-ES')}</span>
              </div>
              <div className="amount-words">
                <span>SON PESOS: {formatCurrencyAR(netAmount)} * * * *</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalFooter>
        {currentStep === 'search' && (
          <button className="btn btn-secondary" onClick={resetModal}>
            Cancelar
          </button>
        )}

        {currentStep === 'payroll' && (
          <>
            <button className="btn btn-secondary" onClick={() => setCurrentStep('search')}>
              Volver
            </button>
            <button className="btn btn-primary" onClick={generatePayroll} disabled={isProcessing}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Generar Recibo
            </button>
          </>
        )}

        {currentStep === 'preview' && (
          <>
            <button className="btn btn-secondary" onClick={() => setCurrentStep('payroll')}>
              Editar
            </button>
            <button className="btn btn-success" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </button>
            <button className="btn btn-primary" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}