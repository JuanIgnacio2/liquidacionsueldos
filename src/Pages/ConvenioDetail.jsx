import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Save, X, Printer, Calendar, Users, FileText, Plus, Trash2 } from 'lucide-react';
import '../styles/components/_convenioDetail.css';
import * as api from '../services/empleadosAPI'

export default function ConvenioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [convenio, setConvenio] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState(null);
  const [isEditingBonifications, setIsEditingBonifications] = useState(false);
  const [isEditingTitles, setIsEditingTitles] = useState(false);

  useEffect(() => {
    const fetchConvenio = async () => {
      try {
        const response = await api.getConvenios();
        const convenioData = response.data;
        setConvenio(convenioData);
        setEditableData(JSON.parse(JSON.stringify(convenioData)));
    } catch (error) {
        console.error('Error fetching convenio:', error);
        if (window.showNotification) {
          window.showNotification('Error al cargar el convenio', 'error');
        }
  }
    };

    fetchConvenio();
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setConvenio(editableData);
    setIsEditing(false);
    if (window.showNotification) {
      window.showNotification('Convenio actualizado exitosamente', 'success');
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

  const updateSalaryValue = (catIndex, field, value) => {
    const newData = { ...editableData };
    // Usar parseFloat solo para valores numéricos, mantener strings para texto
    const numericValue = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', ''));
    newData.salaryTable.categories[catIndex][field] = isNaN(numericValue) ? 0 : numericValue;
    setEditableData(newData);
  };

  const addBonification = () => {
    const newKey = `nuevaBonificacion${Date.now()}`;
    const newData = { ...editableData };
    newData.salaryTable.bonifications[newKey] = 0;
    setEditableData(newData);
  };

  const removeBonification = (key) => {
    const newData = { ...editableData };
    delete newData.salaryTable.bonifications[key];
    setEditableData(newData);
  };

  const updateBonificationValue = (key, value) => {
    const newData = { ...editableData };
    const numericValue = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', ''));
    newData.salaryTable.bonifications[key] = isNaN(numericValue) ? 0 : numericValue;
    setEditableData(newData);
  };

  const addTitle = () => {
    const newKey = `nuevoTitulo${Date.now()}`;
    const newData = { ...editableData };
    newData.salaryTable.titles[newKey] = { A: 0 };
    setEditableData(newData);
  };

  const removeTitle = (key) => {
    const newData = { ...editableData };
    delete newData.salaryTable.titles[key];
    setEditableData(newData);
  };

  const addTitleLevel = (titleKey) => {
    const newData = { ...editableData };
    const existingLevels = Object.keys(newData.salaryTable.titles[titleKey]);
    const nextLevel = String.fromCharCode(65 + existingLevels.length); // A, B, C, D...
    if (nextLevel <= 'Z') {
      newData.salaryTable.titles[titleKey][nextLevel] = 0;
      setEditableData(newData);
    }
  };

  const removeTitleLevel = (titleKey, level) => {
    const newData = { ...editableData };
    delete newData.salaryTable.titles[titleKey][level];
    setEditableData(newData);
  };

  const updateTitleValue = (titleKey, level, value) => {
    const newData = { ...editableData };
    const numericValue = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', ''));
    newData.salaryTable.titles[titleKey][level] = isNaN(numericValue) ? 0 : numericValue;
    setEditableData(newData);
  };

  const updateUOCRAValue = (catIndex, field, value) => {
    const newData = { ...editableData };
    const numericValue = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', ''));

    if (field.startsWith('junio2025.')) {
      // Handle Junio 2025 fields
      const junioField = field.replace('junio2025.', '');
      if (!newData.salaryTable.junio2025) {
        newData.salaryTable.junio2025 = { categories: [...newData.salaryTable.categories] };
      }
      if (!newData.salaryTable.junio2025.categories[catIndex]) {
        newData.salaryTable.junio2025.categories[catIndex] = { ...newData.salaryTable.categories[catIndex] };
      }
      newData.salaryTable.junio2025.categories[catIndex][junioField] = isNaN(numericValue) ? 0 : numericValue;
    } else if (field.includes('.')) {
      // Handle nested fields like may25.basicSalary, zonaC.additional
      const [parentField, childField] = field.split('.');
      if (!newData.salaryTable.categories[catIndex][parentField]) {
        newData.salaryTable.categories[catIndex][parentField] = {};
      }
      newData.salaryTable.categories[catIndex][parentField][childField] = isNaN(numericValue) ? 0 : numericValue;
    } else {
      // Handle direct fields
      newData.salaryTable.categories[catIndex][field] = isNaN(numericValue) ? 0 : numericValue;
    }

    setEditableData(newData);
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
              <div className="meta-item">
                <Calendar className="meta-icon" />
                <span>Vigente hasta {new Date(currentData.validTo).toLocaleDateString('es-ES')}</span>
              </div>
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

      {/* Salary Table */}
      <div className="salary-table-container">
        {currentData.name === 'Luz y Fuerza' ? (
          // Tabla formato Luz y Fuerza
          <div className="salary-table luz-y-fuerza">
            <div className="table-header">
              <h2>ESCALAS SALARIALES - LUZ Y FUERZA</h2>
              <p>Vigencia: {new Date(currentData.validFrom).toLocaleDateString('es-ES')} - {new Date(currentData.validTo).toLocaleDateString('es-ES')}</p>
            </div>
            
            <table className="salary-grid">
              <thead>
                <tr>
                  <th rowSpan="2">CAT</th>
                  <th rowSpan="2">SUELDO BÁSICO</th>
                  <th colSpan="5">BONIFICACIONES</th>
                </tr>
                <tr>
                  <th>OFICIO</th>
                  <th>TÉCNICA</th>
                  <th>ADMINISTRATIVA</th>
                  <th>OPERACIONES</th>
                  <th>JERÁRQUICA</th>
                  <th>FUNCIONAL</th>
                </tr>
              </thead>
              <tbody>
                {currentData.salaryTable.categories.map((category, index) => (
                  <tr key={index}>
                    <td className="category-cell">{category.cat}</td>
                    <td className="salary-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${category.basicSalary.toLocaleString()}`}
                          onChange={(e) => updateSalaryValue(index, 'basicSalary', e.target.value)}
                          className="salary-input"
                        />
                      ) : (
                        `$${category.basicSalary.toLocaleString()}`
                      )}
                    </td>
                    <td className="bonus-cell">
                      {category.office ? (
                        isEditing ? (
                          <input
                            type="text"
                            value={`$${category.office.toLocaleString()}`}
                            onChange={(e) => updateSalaryValue(index, 'office', e.target.value)}
                            className="bonus-input"
                          />
                        ) : (
                          `$${category.office.toLocaleString()}`
                        )
                      ) : ''}
                    </td>
                    <td className="bonus-cell">
                      {category.technical ? (
                        isEditing ? (
                          <input
                            type="number"
                            value={category.technical}
                            onChange={(e) => updateSalaryValue(index, 'technical', e.target.value)}
                            className="bonus-input"
                          />
                        ) : (
                          `$${category.technical.toLocaleString()}`
                        )
                      ) : ''}
                    </td>
                    <td className="bonus-cell">
                      {category.administrative ? (
                        isEditing ? (
                          <input
                            type="number"
                            value={category.administrative}
                            onChange={(e) => updateSalaryValue(index, 'administrative', e.target.value)}
                            className="bonus-input"
                          />
                        ) : (
                          `$${category.administrative.toLocaleString()}`
                        )
                      ) : ''}
                    </td>
                    <td className="bonus-cell">
                      {category.operations ? (
                        isEditing ? (
                          <input
                            type="number"
                            value={category.operations}
                            onChange={(e) => updateSalaryValue(index, 'operations', e.target.value)}
                            className="bonus-input"
                          />
                        ) : (
                          `$${category.operations.toLocaleString()}`
                        )
                      ) : ''}
                    </td>
                    <td className="bonus-cell">
                      {category.hierarchical ? (
                        isEditing ? (
                          <input
                            type="number"
                            value={category.hierarchical}
                            onChange={(e) => updateSalaryValue(index, 'hierarchical', e.target.value)}
                            className="bonus-input"
                          />
                        ) : (
                          `$${category.hierarchical.toLocaleString()}`
                        )
                      ) : ''}
                    </td>
                    <td className="bonus-cell">
                      {category.functional ? (
                        isEditing ? (
                          <input
                            type="text"
                            value={`$${category.functional.toLocaleString()}`}
                            onChange={(e) => updateSalaryValue(index, 'functional', e.target.value)}
                            className="bonus-input"
                          />
                        ) : (
                          `$${category.functional.toLocaleString()}`
                        )
                      ) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Additional bonifications section */}
            <div className="additional-bonifications">
              <div className="bonif-section">
                <div className="section-header">
                  <h3>BONIFICACIONES ADICIONALES</h3>
                  {currentData.name === 'Luz y Fuerza' && (
                    <div className="section-actions">
                      <button
                        className="action-btn edit-small"
                        onClick={() => setIsEditingBonifications(!isEditingBonifications)}
                      >
                        <Edit className="action-icon-small" />
                        {isEditingBonifications ? 'Listo' : 'Editar'}
                      </button>
                      {isEditingBonifications && (
                        <button className="action-btn add-small" onClick={addBonification}>
                          <Plus className="action-icon-small" />
                          Agregar
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="bonif-grid">
                  {Object.entries(currentData.salaryTable.bonifications).map(([key, value]) => (
                    <div key={key} className="bonif-item">
                      <span className="bonif-label">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                      {isEditingBonifications ? (
                        <div className="bonif-edit-group">
                          <input
                            type="text"
                            value={`$${value.toLocaleString()}`}
                            onChange={(e) => updateBonificationValue(key, e.target.value)}
                            className="bonif-input"
                          />
                          <button
                            className="remove-btn"
                            onClick={() => removeBonification(key)}
                            title="Eliminar bonificación"
                          >
                            <Trash2 className="remove-icon" />
                          </button>
                        </div>
                      ) : (
                        <span className="bonif-value">${value.toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="titles-section">
                <div className="section-header">
                  <h3>TÍTULOS</h3>
                  {currentData.name === 'Luz y Fuerza' && (
                    <div className="section-actions">
                      <button
                        className="action-btn edit-small"
                        onClick={() => setIsEditingTitles(!isEditingTitles)}
                      >
                        <Edit className="action-icon-small" />
                        {isEditingTitles ? 'Listo' : 'Editar'}
                      </button>
                      {isEditingTitles && (
                        <button className="action-btn add-small" onClick={addTitle}>
                          <Plus className="action-icon-small" />
                          Agregar Título
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="titles-grid">
                  {Object.entries(currentData.salaryTable.titles).map(([key, values]) => (
                    <div key={key} className="title-group">
                      <div className="title-header">
                        <span className="title-name">{key.toUpperCase()}</span>
                        {isEditingTitles && (
                          <div className="title-actions">
                            <button
                              className="add-level-btn"
                              onClick={() => addTitleLevel(key)}
                              title="Agregar nivel"
                            >
                              <Plus className="add-icon" />
                            </button>
                            <button
                              className="remove-btn"
                              onClick={() => removeTitle(key)}
                              title="Eliminar título"
                            >
                              <Trash2 className="remove-icon" />
                            </button>
                          </div>
                        )}
                      </div>
                      {Object.entries(values).map(([letter, amount]) => (
                        <div key={letter} className="title-item">
                          <span className="title-letter">{letter}</span>
                          {isEditingTitles ? (
                            <div className="title-edit-group">
                              <input
                                type="text"
                                value={`$${amount.toLocaleString()}`}
                                onChange={(e) => updateTitleValue(key, letter, e.target.value)}
                                className="title-input"
                              />
                              <button
                                className="remove-level-btn"
                                onClick={() => removeTitleLevel(key, letter)}
                                title="Eliminar nivel"
                              >
                                <X className="remove-icon-small" />
                              </button>
                            </div>
                          ) : (
                            <span className="title-amount">${amount.toLocaleString()}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Tabla formato UOCRA con estilo Luz y Fuerza
          <div className="salary-table luz-y-fuerza">
            <div className="table-header">
              <h2>UOCRA - JORNALES DE SALARIOS BÁSICOS CON VIGENCIA A PARTIR DEL 01 DE MAYO 2025</h2>
            </div>

            <table className="salary-grid">
              <thead>
                <tr>
                  <th rowSpan="2">Mes</th>
                  <th rowSpan="2">Categoria</th>
                  <th colSpan="3">ZONA "A"</th>
                  <th colSpan="3">ZONA "B"</th>
                  <th colSpan="3">ZONA "C"</th>
                  <th colSpan="3">ZONA "C-Austral"</th>
                </tr>
                <tr>
                  <th>Salario Básico</th>
                  <th>Adicional Zona</th>
                  <th>Total</th>
                  <th>Salario Básico</th>
                  <th>Adicional Zona</th>
                  <th>Total</th>
                  <th>Salario Básico</th>
                  <th>Adicional Zona</th>
                  <th>Total</th>
                  <th>Salario Básico</th>
                  <th>Adicional Zona</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {currentData.salaryTable.categories.map((category, index) => (
                  <tr key={index}>
                    <td className="month-cell">{index === 0 ? 'may-25' : ''}</td>
                    <td className="category-cell">{category.cat}</td>
                    <td className="salary-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof category.basicSalary === 'number' ? category.basicSalary.toLocaleString() : category.basicSalary}`}
                          onChange={(e) => updateUOCRAValue(index, 'basicSalary', e.target.value)}
                          className="salary-input"
                        />
                      ) : (
                        `$${typeof category.basicSalary === 'number' ? category.basicSalary.toLocaleString() : category.basicSalary}`
                      )}
                    </td>
                    <td className="zone-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof category.zone === 'number' ? category.zone.toLocaleString() : category.zone}`}
                          onChange={(e) => updateUOCRAValue(index, 'zone', e.target.value)}
                          className="bonus-input"
                        />
                      ) : (
                        `$${typeof category.zone === 'number' ? category.zone.toLocaleString() : category.zone}`
                      )}
                    </td>
                    <td className="total-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof category.total === 'number' ? category.total.toLocaleString() : category.total}`}
                          onChange={(e) => updateUOCRAValue(index, 'total', e.target.value)}
                          className="bonus-input"
                        />
                      ) : (
                        `$${typeof category.total === 'number' ? category.total.toLocaleString() : category.total}`
                      )}
                    </td>
                    <td className="salary-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof (category.may25?.basicSalary || category.basicSalary) === 'number' ? (category.may25?.basicSalary || category.basicSalary).toLocaleString() : (category.may25?.basicSalary || category.basicSalary)}`}
                          onChange={(e) => updateUOCRAValue(index, 'may25.basicSalary', e.target.value)}
                          className="salary-input"
                        />
                      ) : (
                        `$${typeof (category.may25?.basicSalary || category.basicSalary) === 'number' ? (category.may25?.basicSalary || category.basicSalary).toLocaleString() : (category.may25?.basicSalary || category.basicSalary)}`
                      )}
                    </td>
                    <td className="zone-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof (category.may25?.additional || category.zone) === 'number' ? (category.may25?.additional || category.zone).toLocaleString() : (category.may25?.additional || category.zone)}`}
                          onChange={(e) => updateUOCRAValue(index, 'may25.additional', e.target.value)}
                          className="bonus-input"
                        />
                      ) : (
                        `$${typeof (category.may25?.additional || category.zone) === 'number' ? (category.may25?.additional || category.zone).toLocaleString() : (category.may25?.additional || category.zone)}`
                      )}
                    </td>
                    <td className="total-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof (category.may25?.total || category.total) === 'number' ? (category.may25?.total || category.total).toLocaleString() : (category.may25?.total || category.total)}`}
                          onChange={(e) => updateUOCRAValue(index, 'may25.total', e.target.value)}
                          className="bonus-input"
                        />
                      ) : (
                        `$${typeof (category.may25?.total || category.total) === 'number' ? (category.may25?.total || category.total).toLocaleString() : (category.may25?.total || category.total)}`
                      )}
                    </td>
                    <td className="salary-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof (category.zonaC?.basicSalary || category.basicSalary) === 'number' ? (category.zonaC?.basicSalary || category.basicSalary).toLocaleString() : (category.zonaC?.basicSalary || category.basicSalary)}`}
                          onChange={(e) => updateUOCRAValue(index, 'zonaC.basicSalary', e.target.value)}
                          className="salary-input"
                        />
                      ) : (
                        `$${typeof (category.zonaC?.basicSalary || category.basicSalary) === 'number' ? (category.zonaC?.basicSalary || category.basicSalary).toLocaleString() : (category.zonaC?.basicSalary || category.basicSalary)}`
                      )}
                    </td>
                    <td className="zone-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof (category.zonaC?.additional || category.zone) === 'number' ? (category.zonaC?.additional || category.zone).toLocaleString() : (category.zonaC?.additional || category.zone)}`}
                          onChange={(e) => updateUOCRAValue(index, 'zonaC.additional', e.target.value)}
                          className="bonus-input"
                        />
                      ) : (
                        `$${typeof (category.zonaC?.additional || category.zone) === 'number' ? (category.zonaC?.additional || category.zone).toLocaleString() : (category.zonaC?.additional || category.zone)}`
                      )}
                    </td>
                    <td className="total-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof (category.zonaC?.total || category.total) === 'number' ? (category.zonaC?.total || category.total).toLocaleString() : (category.zonaC?.total || category.total)}`}
                          onChange={(e) => updateUOCRAValue(index, 'zonaC.total', e.target.value)}
                          className="bonus-input"
                        />
                      ) : (
                        `$${typeof (category.zonaC?.total || category.total) === 'number' ? (category.zonaC?.total || category.total).toLocaleString() : (category.zonaC?.total || category.total)}`
                      )}
                    </td>
                    <td className="salary-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof category.basicSalary === 'number' ? category.basicSalary.toLocaleString() : category.basicSalary}`}
                          onChange={(e) => updateUOCRAValue(index, 'basicSalary', e.target.value)}
                          className="salary-input"
                        />
                      ) : (
                        `$${typeof category.basicSalary === 'number' ? category.basicSalary.toLocaleString() : category.basicSalary}`
                      )}
                    </td>
                    <td className="zone-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof category.zone === 'number' ? category.zone.toLocaleString() : category.zone}`}
                          onChange={(e) => updateUOCRAValue(index, 'zone', e.target.value)}
                          className="bonus-input"
                        />
                      ) : (
                        `$${typeof category.zone === 'number' ? category.zone.toLocaleString() : category.zone}`
                      )}
                    </td>
                    <td className="total-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={`$${typeof category.total === 'number' ? category.total.toLocaleString() : category.total}`}
                          onChange={(e) => updateUOCRAValue(index, 'total', e.target.value)}
                          className="bonus-input"
                        />
                      ) : (
                        `$${typeof category.total === 'number' ? category.total.toLocaleString() : category.total}`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="uocra-notes">
              <div className="notes-header">
                <FileText className="notes-icon" />
                <h4>Información Adicional</h4>
              </div>

              <div className="highlight-note">
                <div className="highlight-icon">💰</div>
                <p><strong>Suma no remunerativa mensual liquidada quincenalmente</strong></p>
              </div>

              <div className="notes-content">
                <h5>Escalas por Zona:</h5>
                <div className="notes-grid">
                  {currentData.salaryTable.notes.map((note, index) => (
                    <div key={index} className="note-item">
                      <div className="note-bullet">•</div>
                      <p>{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Junio 2025 table */}
            {currentData.salaryTable.junio2025 && (
              <div className="junio-2025-section">
                <h3>JORNALES DE SALARIOS BÁSICOS CON VIGENCIA A PARTIR DEL 1 DE JUNIO 2025</h3>
                <table className="salary-grid">
                  <thead>
                    <tr>
                      <th rowSpan="2">Mes</th>
                      <th rowSpan="2">Categoria</th>
                      <th colSpan="3">ZONA "A"</th>
                      <th colSpan="3">ZONA "B"</th>
                      <th colSpan="3">ZONA "C"</th>
                      <th colSpan="3">ZONA "C-Austral"</th>
                    </tr>
                    <tr>
                      <th>Salario Básico</th>
                      <th>Adicional Zona</th>
                      <th>Total</th>
                      <th>Salario Básico</th>
                      <th>Adicional Zona</th>
                      <th>Total</th>
                      <th>Salario Básico</th>
                      <th>Adicional Zona</th>
                      <th>Total</th>
                      <th>Salario Básico</th>
                      <th>Adicional Zona</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.salaryTable.junio2025.categories.map((category, index) => (
                      <tr key={index}>
                        <td className="month-cell">{index === 0 ? 'jun-25' : ''}</td>
                        <td className="category-cell">{category.cat}</td>
                        <td className="salary-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.basicSalary}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.basicSalary', e.target.value)}
                              className="salary-input"
                            />
                          ) : (
                            `$${category.basicSalary}`
                          )}
                        </td>
                        <td className="zone-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.zone}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.zone', e.target.value)}
                              className="bonus-input"
                            />
                          ) : (
                            `$${category.zone}`
                          )}
                        </td>
                        <td className="total-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.total}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.total', e.target.value)}
                              className="bonus-input"
                            />
                          ) : (
                            `$${category.total}`
                          )}
                        </td>
                        <td className="salary-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.basicSalary2}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.basicSalary2', e.target.value)}
                              className="salary-input"
                            />
                          ) : (
                            `$${category.basicSalary2}`
                          )}
                        </td>
                        <td className="zone-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.additional}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.additional', e.target.value)}
                              className="bonus-input"
                            />
                          ) : (
                            `$${category.additional}`
                          )}
                        </td>
                        <td className="total-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.total2}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.total2', e.target.value)}
                              className="bonus-input"
                            />
                          ) : (
                            `$${category.total2}`
                          )}
                        </td>
                        <td className="salary-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.basicSalary}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.basicSalaryC', e.target.value)}
                              className="salary-input"
                            />
                          ) : (
                            `$${category.basicSalary}`
                          )}
                        </td>
                        <td className="zone-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.zonaCAdditional}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.zonaCAdditional', e.target.value)}
                              className="bonus-input"
                            />
                          ) : (
                            `$${category.zonaCAdditional}`
                          )}
                        </td>
                        <td className="total-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.totalZonaC}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.totalZonaC', e.target.value)}
                              className="bonus-input"
                            />
                          ) : (
                            `$${category.totalZonaC}`
                          )}
                        </td>
                        <td className="salary-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.basicSalary}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.basicSalaryCaustral', e.target.value)}
                              className="salary-input"
                            />
                          ) : (
                            `$${category.basicSalary}`
                          )}
                        </td>
                        <td className="zone-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.zone}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.zoneCaustral', e.target.value)}
                              className="bonus-input"
                            />
                          ) : (
                            `$${category.zone}`
                          )}
                        </td>
                        <td className="total-cell">
                          {isEditing ? (
                            <input
                              type="text"
                              value={`$${category.total}`}
                              onChange={(e) => updateUOCRAValue(index, 'junio2025.totalCaustral', e.target.value)}
                              className="bonus-input"
                            />
                          ) : (
                            `$${category.total}`
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="detail-footer">
        <div className="footer-info">
          <div className="info-item">
            <FileText className="info-icon" />
            <span>Última actualización: {new Date(currentData.lastUpdate).toLocaleDateString('es-ES')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}