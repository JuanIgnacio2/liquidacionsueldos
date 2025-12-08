import React, { useState } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { Plus, Edit, Trash, DollarSign, TrendingUp, TrendingDown, Save } from 'lucide-react';

export function EmployeeConceptsModal({ isOpen, onClose, employee, onSave }) {
  const [concepts, setConcepts] = useState([
    // Bonificaciones
    { id: 1, name: 'Presentismo', type: 'bonification', amount: 5000, percentage: null, isPercentage: false, description: 'Bono por asistencia perfecta' },
    { id: 2, name: 'Producción', type: 'bonification', amount: null, percentage: 10, isPercentage: true, description: 'Bono por cumplimiento de objetivos' },
    { id: 3, name: 'Antigüedad', type: 'bonification', amount: null, percentage: 15, isPercentage: true, description: 'Bono por años de servicio' },
    
    // Descuentos
    { id: 4, name: 'Obra Social', type: 'deduction', amount: null, percentage: 3, isPercentage: true, description: 'Descuento por obra social' },
    { id: 5, name: 'Jubilación', type: 'deduction', amount: null, percentage: 11, isPercentage: true, description: 'Aporte jubilatorio' },
    { id: 6, name: 'Ley 19032', type: 'deduction', amount: null, percentage: 3, isPercentage: true, description: 'Aporte sindical' }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConcept, setEditingConcept] = useState(null);
  const [newConcept, setNewConcept] = useState({
    name: '',
    type: 'bonification',
    amount: '',
    percentage: '',
    isPercentage: false,
    description: ''
  });

  const bonifications = concepts.filter(c => c.type === 'bonification');
  const deductions = concepts.filter(c => c.type === 'deduction');

  const handleAddConcept = () => {
    if (!newConcept.name.trim()) return;

    const concept = {
      id: Date.now(),
      name: newConcept.name,
      type: newConcept.type,
      amount: newConcept.isPercentage ? null : Number(newConcept.amount) || 0,
      percentage: newConcept.isPercentage ? Number(newConcept.percentage) || 0 : null,
      isPercentage: newConcept.isPercentage,
      description: newConcept.description
    };

    setConcepts(prev => [...prev, concept]);
    setNewConcept({
      name: '',
      type: 'bonification',
      amount: '',
      percentage: '',
      isPercentage: false,
      description: ''
    });
    setShowAddForm(false);
  };

  const handleEditConcept = (concept) => {
    setEditingConcept(concept.id);
    setNewConcept({
      name: concept.name,
      type: concept.type,
      amount: concept.amount || '',
      percentage: concept.percentage || '',
      isPercentage: concept.isPercentage,
      description: concept.description || ''
    });
  };

  const handleSaveEdit = () => {
    setConcepts(prev => prev.map(concept => 
      concept.id === editingConcept 
        ? {
            ...concept,
            name: newConcept.name,
            type: newConcept.type,
            amount: newConcept.isPercentage ? null : Number(newConcept.amount) || 0,
            percentage: newConcept.isPercentage ? Number(newConcept.percentage) || 0 : null,
            isPercentage: newConcept.isPercentage,
            description: newConcept.description
          }
        : concept
    ));
    setEditingConcept(null);
    setNewConcept({
      name: '',
      type: 'bonification',
      amount: '',
      percentage: '',
      isPercentage: false,
      description: ''
    });
  };

  const handleDeleteConcept = (id) => {
    setConcepts(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveAll = () => {
    onSave && onSave({ ...employee, concepts });
    onClose();
  };

  const formatValue = (concept) => {
    if (concept.isPercentage) {
      return `${concept.percentage}%`;
    }
    return `$${concept.amount?.toLocaleString() || 0}`;
  };

  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Conceptos Asociados - ${employee.name}`}
      size="large"
      className="employee-concepts-modal"
    >
      <div className="concepts-container">
        {/* Bonificaciones */}
        <div className="concepts-section">
          <div className="section-header">
            <h3 className="section-title section-title-effect">
              <TrendingUp className="title-icon text-success" />
              Bonificaciones
            </h3>
            <button 
              className="btn btn-sm btn-success"
              onClick={() => {
                setNewConcept(prev => ({ ...prev, type: 'bonification' }));
                setShowAddForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </button>
          </div>

          <div className="concepts-list">
            {bonifications.map(concept => (
              <div key={concept.id} className="concept-item bonification">
                {editingConcept === concept.id ? (
                  <div className="concept-edit-form">
                    <div className="form-grid">
                      <input
                        type="text"
                        className="form-input"
                        value={newConcept.name}
                        onChange={(e) => setNewConcept(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nombre del concepto"
                      />
                      <div className="amount-input">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={newConcept.isPercentage}
                            onChange={(e) => setNewConcept(prev => ({ ...prev, isPercentage: e.target.checked }))}
                          />
                          Porcentaje
                        </label>
                        {newConcept.isPercentage ? (
                          <input
                            type="number"
                            className="form-input"
                            value={newConcept.percentage}
                            onChange={(e) => setNewConcept(prev => ({ ...prev, percentage: e.target.value }))}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.5"
                          />
                        ) : (
                          <input
                            type="number"
                            className="form-input"
                            value={newConcept.amount}
                            onChange={(e) => setNewConcept(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0"
                            min="0"
                            step="100"
                          />
                        )}
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        value={newConcept.description}
                        onChange={(e) => setNewConcept(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción (opcional)"
                      />
                      <div className="edit-actions">
                        <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4" />
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => {
                            setEditingConcept(null);
                            setNewConcept({
                              name: '',
                              type: 'bonification',
                              amount: '',
                              percentage: '',
                              isPercentage: false,
                              description: ''
                            });
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="concept-info">
                      <div className="concept-name">{concept.name}</div>
                      <div className="concept-description">{concept.description}</div>
                    </div>
                    <div className="concept-value text-success">
                      {formatValue(concept)}
                    </div>
                    <div className="concept-actions">
                      <button 
                        className="action-btn edit"
                        onClick={() => handleEditConcept(concept)}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDeleteConcept(concept.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Descuentos */}
        <div className="concepts-section">
          <div className="section-header">
            <h3 className="section-title section-title-effect">
              <TrendingDown className="title-icon text-warning" />
              Descuentos
            </h3>
            <button 
              className="btn btn-sm btn-warning"
              onClick={() => {
                setNewConcept(prev => ({ ...prev, type: 'deduction' }));
                setShowAddForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </button>
          </div>

          <div className="concepts-list">
            {deductions.map(concept => (
              <div key={concept.id} className="concept-item deduction">
                {editingConcept === concept.id ? (
                  <div className="concept-edit-form">
                    <div className="form-grid">
                      <input
                        type="text"
                        className="form-input"
                        value={newConcept.name}
                        onChange={(e) => setNewConcept(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nombre del concepto"
                      />
                      <div className="amount-input">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={newConcept.isPercentage}
                            onChange={(e) => setNewConcept(prev => ({ ...prev, isPercentage: e.target.checked }))}
                          />
                          Porcentaje
                        </label>
                        {newConcept.isPercentage ? (
                          <input
                            type="number"
                            className="form-input"
                            value={newConcept.percentage}
                            onChange={(e) => setNewConcept(prev => ({ ...prev, percentage: e.target.value }))}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.5"
                          />
                        ) : (
                          <input
                            type="number"
                            className="form-input"
                            value={newConcept.amount}
                            onChange={(e) => setNewConcept(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0"
                            min="0"
                            step="100"
                          />
                        )}
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        value={newConcept.description}
                        onChange={(e) => setNewConcept(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción (opcional)"
                      />
                      <div className="edit-actions">
                        <button className="btn btn-sm btn-primary" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4" />
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => {
                            setEditingConcept(null);
                            setNewConcept({
                              name: '',
                              type: 'deduction',
                              amount: '',
                              percentage: '',
                              isPercentage: false,
                              description: ''
                            });
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="concept-info">
                      <div className="concept-name">{concept.name}</div>
                      <div className="concept-description">{concept.description}</div>
                    </div>
                    <div className="concept-value text-warning">
                      -{formatValue(concept)}
                    </div>
                    <div className="concept-actions">
                      <button 
                        className="action-btn edit"
                        onClick={() => handleEditConcept(concept)}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDeleteConcept(concept.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Formulario para agregar nuevo concepto */}
        {showAddForm && (
          <div className="add-concept-form">
            <h4 className="form-title">
              Agregar {newConcept.type === 'bonification' ? 'Bonificación' : 'Descuento'}
            </h4>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newConcept.name}
                  onChange={(e) => setNewConcept(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del concepto"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Valor</label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newConcept.isPercentage}
                    onChange={(e) => setNewConcept(prev => ({ ...prev, isPercentage: e.target.checked }))}
                  />
                  Porcentaje del salario
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {newConcept.isPercentage ? 'Porcentaje (%)' : 'Monto ($)'}
                </label>
                {newConcept.isPercentage ? (
                  <input
                    type="number"
                    className="form-input"
                    value={newConcept.percentage}
                    onChange={(e) => setNewConcept(prev => ({ ...prev, percentage: e.target.value }))}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                ) : (
                  <input
                    type="number"
                    className="form-input"
                    value={newConcept.amount}
                    onChange={(e) => setNewConcept(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                    min="0"
                    step="100"
                  />
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  className="form-input"
                  value={newConcept.description}
                  onChange={(e) => setNewConcept(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del concepto (opcional)"
                />
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleAddConcept}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewConcept({
                      name: '',
                      type: 'bonification',
                      amount: '',
                      percentage: '',
                      isPercentage: false,
                      description: ''
                    });
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="concepts-summary">
          <div className="summary-item">
            <span className="summary-label">Total Bonificaciones:</span>
            <span className="summary-value text-success">
              ${bonifications.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}
              {bonifications.filter(c => c.isPercentage).length > 0 && ' + %'}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Descuentos:</span>
            <span className="summary-value text-warning">
              -${deductions.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString()}
              {deductions.filter(c => c.isPercentage).length > 0 && ' + %'}
            </span>
          </div>
        </div>
      </div>

      <ModalFooter>
        <button className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={handleSaveAll}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Conceptos
        </button>
      </ModalFooter>
    </Modal>
  );
}