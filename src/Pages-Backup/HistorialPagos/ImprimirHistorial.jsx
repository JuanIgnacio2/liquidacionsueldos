import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Layers, Printer } from 'lucide-react';
import { Modal, ModalFooter } from '../../Components/Modal/Modal';

export function PrintReportDialog({ isOpen, onClose, onConfirm, months = [], years = [] }) {
  const [mode, setMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const hasMonths = months.length > 0;
  const hasYears = years.length > 0;

  useEffect(() => {
    if (isOpen) {
      setMode('month');
      setSelectedMonth(months[0]?.value ?? '');
      setSelectedYear(years[0]?.value ?? '');
    }
  }, [isOpen, months, years]);

  const description = useMemo(() => {
    if (mode === 'month') {
      return 'Genera un reporte con todos los empleados y totales del mes seleccionado.';
    }
    return 'Genera un reporte consolidado con la información de todo el año elegido.';
  }, [mode]);

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode === 'month' && !selectedMonth && hasMonths) {
      setSelectedMonth(months[0].value);
    }
    if (nextMode === 'year' && !selectedYear && hasYears) {
      setSelectedYear(years[0].value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (mode === 'month') {
      if (!selectedMonth) {
        return;
      }
      onConfirm({ type: 'month', month: selectedMonth });
      return;
    }

    if (!selectedYear) {
      return;
    }

    onConfirm({ type: 'year', year: selectedYear });
  };

  const confirmDisabled = mode === 'month' ? !selectedMonth : !selectedYear;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar reporte"
      size="medium"
    >
      <form className="print-report-modal" onSubmit={handleSubmit}>
        <div className="print-mode-toggle">
          <button
            type="button"
            className={`toggle-btn ${mode === 'month' ? 'active' : ''}`}
            onClick={() => handleModeChange('month')}
            disabled={!hasMonths}
          >
            <Calendar size={16} />
            <span>Por mes</span>
          </button>
          <button
            type="button"
            className={`toggle-btn ${mode === 'year' ? 'active' : ''}`}
            onClick={() => handleModeChange('year')}
            disabled={!hasYears}
          >
            <Layers size={16} />
            <span>Por año</span>
          </button>
        </div>

        <p className="field-hint">{description}</p>

        {mode === 'month' ? (
          <div className="field-group">
            <label htmlFor="print-month">Seleccioná el mes</label>
            <select
              id="print-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              disabled={!hasMonths}
            >
              {months.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="field-hint">Se imprimirá el resumen completo del mes elegido.</p>
          </div>
        ) : (
          <div className="field-group">
            <label htmlFor="print-year">Seleccioná el año</label>
            <select
              id="print-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              disabled={!hasYears}
            >
              {years.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="field-hint">Incluye todos los meses disponibles del año seleccionado.</p>
          </div>
        )}

        <ModalFooter>
          <button type="button" className="cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="confirm-btn" disabled={confirmDisabled}>
            <Printer size={16} />
            <span>Imprimir</span>
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
