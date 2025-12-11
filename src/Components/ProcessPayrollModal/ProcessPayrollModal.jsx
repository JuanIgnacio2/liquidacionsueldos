import React, { useEffect, useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Search, Users, Download, Printer, Plus, X, CheckCircle, User, Calendar, Badge, Clock, Star, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import './ProcessPayrollModal.scss';
import * as api from '../../services/empleadosAPI';
import { useNotification } from '../../Hooks/useNotification';
import { Button } from '../ui/button';
import { PayrollSummaryCards } from './PayrollSummaryCards';

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
  const notify = useNotification();
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
    new Date().toISOString().slice(0, 7)
  );
  const [basicSalary, setBasicSalary] = useState(0);
  const [descuentosData, setDescuentosData] = useState([]);
  const [remunerationAssigned, setRemunerationAssigned] = useState(0);
  const [amountInWords, setAmountInWords] = useState('');

  // Función para formatear el nombre del gremio
  const formatGremioNombre = (gremioNombre) => {
    if (!gremioNombre) return '';
    const upper = gremioNombre.toUpperCase();
    if (upper === 'LUZ_Y_FUERZA' || upper.includes('LUZ') && upper.includes('FUERZA')) {
      return 'Luz y Fuerza';
    }
    return gremioNombre;
  };

  // Formatea fecha ISO a dd/mm/yyyy
  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Convierte periodo 'YYYY-MM' o 'YYYY-MM-DD' a 'Mes de AAAA' en español
  const formatPeriodToMonthYear = (period) => {
    if (!period) return '—';
    // Si ya contiene letras, devolver tal cual
    if (/[A-Za-zÀ-ÿ]/.test(period)) return period;
    // Aceptar formatos: 'YYYY-MM' o 'YYYY-MM-DD'
    const parts = String(period).split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const month = Number(parts[1]);
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const mName = months[Math.max(0, Math.min(11, month - 1))] || parts[1];
      return `${mName.charAt(0).toUpperCase() + mName.slice(1)} de ${year}`;
    }
    return period;
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

      // Remuneración asignada = básico de la categoría + suma de bonos de área
      const sumBonosAreas = bonosDeAreas.reduce((s, b) => s + (b.total || 0), 0);
      const assignedRemuneration = (basicoValue || 0) + sumBonosAreas;
      setRemunerationAssigned(assignedRemuneration);

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
          notify.error('Error al obtener categoría 11:', error);
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
      notify.error('No se pudo obtener el sueldo básico del empleado. Por favor, intente nuevamente.');
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

      // Notificación de éxito
      notify.success(`Liquidación realizada exitosamente para el período ${periodo}`);

      setCurrentStep('preview');
    } catch (error) {
      notify.error('Error al liquidar sueldo:', error);

      // Manejar error 409 (período ya liquidado)
      if (error.response?.status === 409) {
        notify.error(
          `El período ${periodo} ya está liquidado para este empleado. Por favor, seleccione otro período.`,
          8000 // Duración más larga para mensajes importantes
        );
      } else if (error.response?.status === 400) {
        // Error de validación
        const errorMessage = error.response?.data?.message || 'Error de validación en los datos enviados.';
        notify.error(errorMessage, 7000);
      } else if (error.response?.status >= 500) {
        // Error del servidor
        notify.error('Error del servidor al procesar la liquidación. Por favor, intente nuevamente más tarde.', 7000);
      } else {
        // Otros errores
        const errorMessage = error.response?.data?.message || 'Hubo un error al procesar la liquidación.';
        notify.error(errorMessage, 6000);
      }
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
        currentStep === 'search' ? 'Seleccionar Empleado' :
          currentStep === 'payroll' ? 'Configurar Liquidación' :
            'Vista Previa del Recibo'
      }
      size={currentStep === 'search' ? 'xlarge' : 'large'}
      className={`process-payroll-modal ${currentStep === 'search' ? 'search-step' : ''} ${currentStep === 'payroll' ? 'payroll-step' : ''}`}
    >
      {/* STEP 1: EMPLOYEE SEARCH */}
      {currentStep === 'search' && (
        <div className="employee-search">
          <div className="search-section">
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
              </div>
            </div>

            <div className="employees-list">
              {filteredEmployees.length > 0 ? (
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>EMPLEADO</th>
                      <th>ACCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(employee => (
                      <tr
                        key={employee.legajo}
                        className="employee-row"
                      >
                        <td className="employee-cell">
                          <div className="employee-info">
                            <Users className="employee-icon" />
                            <div className="employee-details">
                              <div className="employee-name">{`${employee.apellido?.toUpperCase() || ''} ${employee.nombre?.toUpperCase() || ''}`}</div>
                              <div className="employee-legajo">
                                Legajo: #{employee.legajo} <span className="convenio-name">{formatGremioNombre(employee.gremio.nombre)}</span>
                              </div>
                            </div>
                            <div className="employee-status-icon"></div>
                          </div>
                        </td>
                        <td className="action-cell">
                          <Button
                            variant="liquidar"
                            onClick={() => handleSelectEmployee(employee)}
                          >
                            Liquidar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-results">
                  <Users className="no-results-icon" />
                  <p>No se encontraron empleados</p>
                  <span className="no-results-hint">Intenta con otro término de búsqueda</span>
                </div>
              )}
            </div>
          </div>
          <div className="step-actions">
            <Button variant="secondary" onClick={resetModal}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: PAYROLL FORM */}
      {currentStep === 'payroll' && selectedEmployee && (
        <div className="payroll-form">
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
            </div>

            <div className="concepts-table">
              <div className="table-header">
                <span>Código</span>
                <span>Concepto</span>
                <span>Unidades</span>
                <span>Remuneraciones Sujetas a retenciones</span>
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
                          <Button
                            variant="remove"
                            icon={X}
                            onClick={() => removeConcept(concept.id)}
                            title="Eliminar concepto"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="concepts-table-footer">
                <Button variant="secondary" icon={Plus} iconPosition="left" onClick={handleAddConcepto}>
                  Agregar Concepto
                </Button>
              </div>
            </div>
          </div>

          <div className="totals-summary">
            <PayrollSummaryCards
              remunerations={remunerations}
              deductions={deductions}
              netAmount={netAmount}
            />
          </div>
          <div className="step-actions">
            <Button variant="secondary" onClick={() => setCurrentStep('search')}>
              Volver
            </Button>
            <Button variant="primary" icon={CheckCircle} iconPosition="left" onClick={generatePayroll} disabled={isProcessing}>
              Generar Recibo
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: RECEIPT PREVIEW */}
      {currentStep === 'preview' && selectedEmployee && (
        <div className="receipt-preview">
          <div className="receipt-container">
            {/* ENCABEZADO DEL RECIBO */}
            <div className="receipt-header-wrapper">
              <div className="company-logo">
                <div className="logo-box">
                  <img src="/logo192.png" alt="Logo Empresa" className="logo-image" />
                </div>
              </div>

              <div className="company-info">
                <div className="company-name">COOP. DE SERV. PUB. 25 DE MAYO LTDA</div>
                <div className="company-detail">Domicilio: Ramirez 367</div>
                <div className="company-detail highlight">C.U.I.T.: 30-54569238-0</div>
              </div>

              <div className="receipt-title">
                <span className="title-main">RECIBO DE HABERES</span>
                <span className="title-number">Ley nº 20.744</span>
              </div>
            </div>

            {/* INFORMACIÓN DEL EMPLEADO */}
            <div className="employee-info-section">
              <div className="info-row">
                <span className="label">Apellido y Nombre</span>
                <span className="value">{selectedEmployee.apellido}, {selectedEmployee.nombre}</span>
              </div>
              <div className="info-row">
                <span className="label">Legajo</span>
                <span className="value">{selectedEmployee.legajo}</span>
              </div>
              <div className="info-row">
                <span className="label">C.U.I.L.</span>
                <span className="value">{selectedEmployee.cuil || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Fecha Ingreso</span>
                <span className="value">{formatDateDDMMYYYY(selectedEmployee.inicioActividad)}</span>
              </div>
              <div className="info-row">
                <span className="label">Categoría</span>
                <span className="value">{selectedEmployee.categoria || selectedEmployee.category || '—'}</span>
              </div>
              <div className="info-row">
                <span className="label">Período</span>
                <span className="value">{formatPeriodToMonthYear(payrollData.periodDisplay || periodo)}</span>
              </div>
              <div className="info-row">
                <span className="label">Remuneración asignada</span>
                <span className="value">{formatCurrencyAR(remunerationAssigned)}</span>
              </div>
            </div>

            {/* TABLA DE CONCEPTOS */}
            <table className="concepts-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Código</th>
                  <th style={{ width: '40%' }}>Concepto</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Unidades</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Remuneraciones</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Descuentos</th>
                </tr>
              </thead>
              <tbody>
                {conceptos.map(concept => (
                  <tr key={concept.id}>
                    <td className="concept-code">{concept.id}</td>
                    <td className="concept-name">{concept.nombre}</td>
                    <td className="concept-units">{concept.cantidad}</td>
                    <td className="concept-remuneration">
                      {(concept.tipo === 'CATEGORIA' ||
                        concept.tipo === 'BONIFICACION_AREA' ||
                        concept.tipo === 'CONCEPTO_LYF' ||
                        concept.tipo === 'CONCEPTO_UOCRA') && concept.total > 0
                        ? formatCurrencyAR(concept.total)
                        : ''}
                    </td>
                    <td className="concept-deduction">
                      {concept.tipo === 'DESCUENTO' && concept.total < 0
                        ? formatCurrencyAR(Math.abs(concept.total))
                        : ''}
                    </td>
                  </tr>
                ))}
                {/* Mostrar básico para UOCRA en el recibo */}
                {selectedEmployee?.gremio?.nombre?.toUpperCase().includes('UOCRA') && basicSalary > 0 && (
                  <tr>
                    <td className="concept-code">—</td>
                    <td className="concept-name">Básico</td>
                    <td className="concept-units">1</td>
                    <td className="concept-remuneration">{formatCurrencyAR(basicSalary)}</td>
                    <td className="concept-deduction"></td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* DETALLES DE PAGO */}
            <div className="payment-details">
              <div className="detail-item">
                <span className="label">Banco Acreditación</span>
                <span className="value">{selectedEmployee.banco || 'Banco Nación'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Cuenta</span>
                <span className="value">{selectedEmployee.cbu || '—'}</span>
              </div>
            </div>

            {/* SON PESOS */}
            <div className="amount-words-section">
              <label className="amount-words-label">SON PESOS:</label>
              <input
                type="text"
                className="amount-words-input"
                value={amountInWords}
                onChange={(e) => {
                  // Solo permite letras, espacios y caracteres especiales comunes en español
                  const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                  setAmountInWords(value);
                }}
                placeholder="Escriba el monto en palabras..."
              />
            </div>

            {/* PIE DEL RECIBO */}
            <div className="receipt-footer">
              <p className="footer-text">
                El presente es duplicado del recibo original que obra en nuestro poder. Firmado por el empleado.
              </p>
              <div className="signature-section">
                <div className="signature-block">
                  <div className="line"></div>
                  <span className="label">Firma del Empleador</span>
                </div>
                <div className="signature-block">
                  <div className="line"></div>
                  <span className="label">Firma del Empleado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer con párrafo y botones */}
          <div className="receipt-preview-footer">
            <p className="receipt-preview-text">Revisa la liquidación antes de imprimir</p>
            <div className="receipt-preview-actions">
              <Button variant="secondary" onClick={() => setCurrentStep('search')}>
                Volver
              </Button>
              <Button variant="primary" icon={Printer} iconPosition="left" onClick={handlePrint}>
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      )}

    </Modal>
  );
}