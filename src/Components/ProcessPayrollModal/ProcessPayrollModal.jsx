import React, { useEffect, useState } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { Search, Users, Download, Printer, Plus, X, CheckCircle, User, Calendar, Badge, Clock, Star } from 'lucide-react';
import './ProcessPayrollModal.scss';
import * as api from '../../services/empleadosAPI'

export function ProcessPayrollModal({ isOpen, onClose, onProcess, employees }) {
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

  const calcTotal = (lista) =>
    lista.reduce(
    (s, c) => s + (c.tipo === 'DESCUENTO' ? -c.total : c.total),
    0
  );

  // Seleccionar empleado
  const handleSelectEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setConceptos([]); // limpiamos la tabla anterior

    try {
      const categoria = await api.getCategoriaById(employee.idCategoria);
      const basico = {
        id: employee.idCategoria,
        tipo: 'CATEGORIA', 
        nombre: 'Básico',
        montoUnitario: categoria.basico,
        cantidad: 1,
        total: categoria.basico ?? 0,
      };
      /*Boinificación área*/
      const areas = (employee.idAreas || []).map((id, index) => ({
        idArea: id,
        nombre: employee.nombreAreas?.[index] ?? 'Área'
      }));
      const categoria_11 = await api.getCategoriaById(11);
      const bonosDeAreas = await Promise.all(
        areas.map(async (area)=>{
          const porcentaje = await api.getPorcentajeArea(area.idArea, employee.idCategoria);
          const bonoImporte = (categoria_11.basico * Number(porcentaje))/100;
          return {
            id: area.idArea,
            tipo: 'BONIFICACION_VARIABLE',
            nombre: `${area.nombre}`,
            montoUnitario: bonoImporte,
            cantidad: 1,
            total: bonoImporte ?? 0,
          };
        })
      );

      /*Conceptos precargados en base de datos*/
      const conceptosAsignados = await api.getConceptosAsignados(employee.legajo);
      const bonificacionesFijas = await api.getConceptos();
      const descuentos = await api.getDescuentos();

      const mappedAsignados = conceptosAsignados.map((asignado)=>{
        let concepto = null;

        if(asignado.tipoConcepto === 'BONIFICACION_FIJA'){
          concepto = bonificacionesFijas.find(b=>b.id === asignado.idReferencia);
        } else if(asignado.tipoConcepto === 'DESCUENTO'){
          concepto = descuentos.find(d=>d.idDescuento === asignado.idReferencia);
        }
          
        if(!concepto) return null;

        const tipo = asignado.tipoConcepto === 'DESCUENTO'
          ? 'DESCUENTO'
          : 'BONIFICACION_FIJA';
        const signo = asignado.tipoConcepto === 'DESCUENTO' ? -1 : 1;
        const montoUnitario = (categoria_11.basico * concepto.porcentaje) / 100 * signo;
        
        return{
          id: asignado.idReferencia,
          tipo,
          nombre: concepto.nombre,
          montoUnitario,
          cantidad: asignado.unidades,
          total: montoUnitario * asignado.unidades,
        };
      }).filter(Boolean);
      /*Agregar conceptos y total*/
      const lista = [basico, ...bonosDeAreas, ...mappedAsignados];

      setTotal(calcTotal(lista));
      setConceptos(lista);
      setCurrentStep('payroll');
    } catch (error) {
      console.error('Error al obtener básico:', error);
      alert('No se pudo obtener el sueldo básico del empleado.');
    }
  };

  // Actualizar cantidad de un concepto
  const handleQtyChange = (index, nuevaCantidad) => {
    const nuevos = [...conceptos];
    nuevos[index].cantidad = nuevaCantidad;
    nuevos[index].total = nuevos[index].montoUnitario * nuevaCantidad;
    setConceptos(nuevos);
    setTotal(calcTotal(nuevos));
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
    const remunerations = conceptos
      .filter(c => c.tipo === 'CATEGORIA' || c.tipo === 'BONIFICACION_VARIABLE' || c.tipo === 'BONIFICACION_FIJA')
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
                            <span className="badge convenio-badge">{employee.gremio.nombre}</span>
                          </div>
                          <p className="employee-meta">
                            <Clock className="meta-icon" />
                            Ingreso: {employee.inicioActividad}
                          </p>
                        </div>
                      </div>
                      <div className="employee-salary">
                        <span className="salary-label">Sueldo Básico:</span>
                        <div className="salary-indicator"></div>
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
                  <span className="badge">{selectedEmployee.gremio.nombre}</span>
                </div>
              </div>
            </div>
            <div className="period-info">
              <Calendar className="period-icon" />
              <div className="period-details">
                <span className="period-text">{payrollData.periodDisplay}</span>
                <span className="period-status">En proceso</span>
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
                      onChange={(e) => updateConcept(concept.id, 'units', parseFloat(e.target.value) || 0)}
                      className="concept-input small"
                      step="0.1"
                    />
                  </div>

                  <div className="concept-cell">
                    {(concept.tipo === 'CATEGORIA' ||
                      concept.tipo === 'BONIFICACION_VARIABLE' ||
                      concept.tipo === 'BONIFICACION_FIJA') && (
                      <span className="amount positive">
                        ${Math.abs(concept.montoUnitario || 0).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="concept-cell">
                    {concept.tipo === 'DESCUENTO' && (
                      <span className="amount negative">
                        ${Math.abs(concept.total || 0).toLocaleString()}
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
                <span className="amount positive">${remunerations.toLocaleString()}</span>
              </div>
              <div className="total-item">
                <span>Total Descuentos:</span>
                <span className="amount negative">${deductions.toLocaleString()}</span>
              </div>
              <div className="total-item final">
                <span>NETO A COBRAR:</span>
                <span className="amount final">${netAmount.toLocaleString()}</span>
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
                  <span className="value">{payrollData.periodDisplay}</span>
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
                    {(concept.type === 'CATEGORIA' ||
                      concept.type === 'BONIFICACION_VARIABLE' ||
                      concept.type === 'BONIFICACION_FIJA') && concept.total > 0 ? concept.total.toLocaleString() : ''}
                  </span>
                  <span className="concept-deduction">
                    {concept.type === 'DESCUENTO' && concept.total < 0 ? Math.abs(concept.total).toLocaleString() : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="receipt-totals">
              <div className="total-breakdown">
                <div className="breakdown-line">
                  <span>Total Remuneraciones:</span>
                  <span className="amount-positive">+${remunerations.toLocaleString()}</span>
                </div>
                <div className="breakdown-line">
                  <span>Total Descuentos:</span>
                  <span className="amount-negative">-${deductions.toLocaleString()}</span>
                </div>
              </div>
              <div className="total-line">
                <span>TOTAL NETO:</span>
                <span className="final-amount">${netAmount.toLocaleString()}</span>
                <div className="amount-indicator"></div>
              </div>
            </div>

            <div className="receipt-footer">
              <div className="payment-info">
                <span>LUGAR Y FECHA DE PAGO: HASENKAMP - {new Date().toLocaleDateString('es-ES')}</span>
              </div>
              <div className="amount-words">
                <span>SON PESOS: {netAmount.toLocaleString()} * * * *</span>
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