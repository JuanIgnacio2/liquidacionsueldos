import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, DollarSign, Search, Users } from 'lucide-react';
import { Modal } from '../../Components/Modal/Modal';

export function MonthDetailModal({ isOpen, record, employees = [], onClose, formatCurrency }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen, record]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEmployees = useMemo(() => {
    if (!normalizedQuery) {
      return employees;
    }

    return employees.filter((employee) => {
      return [employee.employeeName, employee.document, employee.department, employee.position]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(normalizedQuery));
    });
  }, [employees, normalizedQuery]);

  const totals = useMemo(() => {
    const totalEmployees = employees.length;
    const totalNet = employees.reduce((accumulator, employee) => accumulator + employee.netSalary, 0);
    return { totalEmployees, totalNet };
  }, [employees]);

  const filteredTotals = useMemo(() => {
    const totalEmployees = filteredEmployees.length;
    const totalNet = filteredEmployees.reduce((accumulator, employee) => accumulator + employee.netSalary, 0);
    return { totalEmployees, totalNet };
  }, [filteredEmployees]);

  if (!record) {
    return null;
  }

  const formatValue =
    formatCurrency ||
    ((value) =>
      typeof value === 'number'
        ? value.toLocaleString('es-AR', { maximumFractionDigits: 0 })
        : value);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Liquidaciones de ${record.union} • ${record.monthName}`}
      size="large"
    >
      <div className="month-detail-modal">
        <div className="modal-summary">
          <div className="summary-pill">
            <Calendar className="summary-icon" />
            <div className="summary-data">
              <span className="label">Mes</span>
              <span className="value">{record.monthName}</span>
            </div>
          </div>
          <div className="summary-pill">
            <Users className="summary-icon" />
            <div className="summary-data">
              <span className="label">Empleados</span>
              <span className="value">{totals.totalEmployees}</span>
            </div>
          </div>
          <div className="summary-pill net">
            <DollarSign className="summary-icon" />
            <div className="summary-data">
              <span className="label">Neto acumulado</span>
              <span className="value">{formatValue(totals.totalNet)}</span>
            </div>
          </div>
        </div>

        <div className="search-section">
          <label htmlFor="employee-search">Buscar empleado</label>
          <div className="search-field">
            <Search className="search-icon" />
            <input
              id="employee-search"
              type="search"
              placeholder="Ingresá nombre, CUIL o sector"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <span className="results-count">
            Mostrando {filteredTotals.totalEmployees} de {totals.totalEmployees} empleados — Neto{' '}
            {formatValue(filteredTotals.totalNet)}
          </span>
        </div>

        {filteredEmployees.length > 0 ? (
          <div className="employee-list">
            {filteredEmployees.map((employee) => {
              const paymentDate = employee.paymentDate
                ? new Date(employee.paymentDate).toLocaleDateString('es-ES')
                : 'Pendiente';

              return (
                <div key={employee.id} className="employee-card">
                  <div className="employee-header">
                    <div className="info">
                      <Users className="employee-icon" />
                      <div className="employee-meta">
                        <span className="employee-name">{employee.employeeName}</span>
                        <span className="employee-role">
                          {employee.position} • {employee.department}
                        </span>
                      </div>
                    </div>
                    <span className="employee-status">{employee.status}</span>
                  </div>

                  <div className="employee-body">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">CUIL</span>
                        <span className="value">{employee.document}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Pago</span>
                        <span className="value">{paymentDate}</span>
                      </div>
                    </div>

                    <div className="amounts-grid">
                      <div className="amount-item">
                        <span className="label">Básico</span>
                        <span className="value">{formatValue(employee.basicSalary)}</span>
                      </div>
                      <div className="amount-item">
                        <span className="label">Bonificaciones</span>
                        <span className="value positive">{formatValue(employee.bonuses)}</span>
                      </div>
                      <div className="amount-item">
                        <span className="label">Descuentos</span>
                        <span className="value negative">{formatValue(-employee.deductions)}</span>
                      </div>
                      <div className="amount-item">
                        <span className="label">Neto</span>
                        <span className="value">{formatValue(employee.netSalary)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state compact">
            <Search className="empty-icon" />
            <h3>Sin coincidencias</h3>
            <p>Revisa la búsqueda o prueba con otro criterio.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
