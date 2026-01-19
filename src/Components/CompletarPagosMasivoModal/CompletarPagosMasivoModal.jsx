import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { CheckCircle, Calendar } from 'lucide-react';
import * as api from '../../services/empleadosAPI';
import { useNotification } from '../../Hooks/useNotification';
import { useConfirm } from '../../Hooks/useConfirm';
import './CompletarPagosMasivoModal.scss';

export function CompletarPagosMasivoModal({ isOpen, onClose, employees, onSuccess }) {
  const notify = useNotification();
  const confirmAction = useConfirm();
  const [selectedGremio, setSelectedGremio] = useState('');
  const [periodoAnio, setPeriodoAnio] = useState(new Date().getFullYear());
  const [periodoMes, setPeriodoMes] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [quincena, setQuincena] = useState(1);
  // Fecha de pago por defecto: fecha actual
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [fechaPago, setFechaPago] = useState(getCurrentDate());
  const [isProcessing, setIsProcessing] = useState(false);

  // Obtener gremios únicos de los empleados
  const gremiosDisponibles = useMemo(() => {
    const gremiosSet = new Set();
    employees.forEach(emp => {
      const gremio = emp.gremioNombre || emp.gremio?.nombre || (typeof emp.gremio === 'string' ? emp.gremio : '');
      if (gremio) {
        const gremioUpper = gremio.toUpperCase();
        if (gremioUpper.includes('LUZ') && gremioUpper.includes('FUERZA')) {
          gremiosSet.add('LUZ_Y_FUERZA');
        } else if (gremioUpper === 'UOCRA') {
          gremiosSet.add('UOCRA');
        } else {
          gremiosSet.add('Convenio General');
        }
      }
    });
    return Array.from(gremiosSet).sort();
  }, [employees]);

  // Resetear cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedGremio('');
      const currentDate = new Date();
      setPeriodoAnio(currentDate.getFullYear());
      setPeriodoMes(String(currentDate.getMonth() + 1).padStart(2, '0'));
      setQuincena(1);
      setFechaPago(getCurrentDate());
    }
  }, [isOpen]);

  // Construir el período según el gremio
  const construirPeriodo = () => {
    const periodoBase = `${periodoAnio}-${periodoMes}`;
    if (selectedGremio === 'UOCRA') {
      const day = quincena === 1 ? '01' : '16';
      return `${periodoBase}-${day}`;
    }
    return periodoBase;
  };

  // Formatear período para mostrar
  const formatPeriodToMonthYear = (period) => {
    if (!period) return '—';
    if (/[A-Za-zÀ-ÿ]/.test(period)) return period;
    const parts = String(period).split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const month = Number(parts[1]);
      const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const mName = months[Math.max(0, Math.min(11, month - 1))] || parts[1];
      
      if (parts.length >= 3) {
        const day = Number(parts[2]);
        if (day === 1 || day === 16) {
          const quincenaText = day === 1 ? 'Primera quincena' : 'Segunda quincena';
          return `${quincenaText} de ${mName.charAt(0).toUpperCase() + mName.slice(1)} de ${year}`;
        }
      }
      
      return `${mName.charAt(0).toUpperCase() + mName.slice(1)} de ${year}`;
    }
    return period;
  };

  const handleCompletarPagos = async () => {
    if (!selectedGremio) {
      notify.error('Debe seleccionar un gremio');
      return;
    }

    const periodo = construirPeriodo();
    const periodoDisplay = formatPeriodToMonthYear(periodo);

    const result = await confirmAction({
      title: 'Completar Pagos Masivo',
      message: `¿Está seguro de completar todos los pagos pendientes para el período ${periodoDisplay}?${fechaPago ? `\n\nFecha de pago: ${new Date(fechaPago).toLocaleDateString('es-AR')}` : ''}`,
      confirmText: 'Completar Pagos',
      cancelText: 'Cancelar',
      type: 'warning',
      confirmButtonVariant: 'primary',
      cancelButtonVariant: 'secondary'
    });

    if (!result) return;

    setIsProcessing(true);

    try {
      // El gremio solo se usa para determinar el formato del período, no se envía al backend
      await api.completarPagoMasivo(periodo, fechaPago || getCurrentDate());
      notify.success(`Pagos completados exitosamente para el período ${periodoDisplay}`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      notify.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isUocra = selectedGremio === 'UOCRA';
  const periodo = construirPeriodo();
  const periodoDisplay = formatPeriodToMonthYear(periodo);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Completar Pagos Masivo"
      size="small"
      className="completar-pagos-masivo-modal"
    >
      <div className="completar-pagos-form">
        <div className="form-section">
          <label htmlFor="gremio-select" className="form-label">
            Gremio <span className="required">*</span>
          </label>
          <select
            id="gremio-select"
            className="form-select"
            value={selectedGremio}
            onChange={(e) => setSelectedGremio(e.target.value)}
          >
            <option value="">Seleccione un gremio</option>
            {gremiosDisponibles.map((gremio) => (
              <option key={gremio} value={gremio}>
                {gremio === 'LUZ_Y_FUERZA' ? 'Luz y Fuerza' : gremio}
              </option>
            ))}
          </select>
        </div>

        {selectedGremio && (
          <>
            <div className="form-section">
              <label htmlFor="periodo-anio" className="form-label">
                Período de liquidación <span className="required">*</span>
              </label>
              <div className="period-selectors">
                <select
                  id="periodo-anio"
                  className="form-select period-select"
                  value={periodoAnio}
                  onChange={(e) => setPeriodoAnio(Number(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
                <select
                  id="periodo-mes"
                  className="form-select period-select"
                  value={periodoMes}
                  onChange={(e) => setPeriodoMes(e.target.value)}
                >
                  <option value="01">Enero</option>
                  <option value="02">Febrero</option>
                  <option value="03">Marzo</option>
                  <option value="04">Abril</option>
                  <option value="05">Mayo</option>
                  <option value="06">Junio</option>
                  <option value="07">Julio</option>
                  <option value="08">Agosto</option>
                  <option value="09">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
                {isUocra && (
                  <select
                    className="form-select period-select"
                    value={quincena}
                    onChange={(e) => setQuincena(Number(e.target.value))}
                  >
                    <option value={1}>Primera quincena</option>
                    <option value={2}>Segunda quincena</option>
                  </select>
                )}
              </div>
              {periodoDisplay && (
                <p className="period-preview">
                  <Calendar className="preview-icon" />
                  Período seleccionado: <strong>{periodoDisplay}</strong>
                </p>
              )}
            </div>

            <div className="form-section">
              <label htmlFor="fecha-pago" className="form-label">
                Fecha de pago
              </label>
              <input
                id="fecha-pago"
                type="date"
                className="form-input"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
              <p className="form-hint">
                Por defecto se usa la fecha actual. Puede modificarla si lo desea.
              </p>
            </div>
          </>
        )}
      </div>

      <ModalFooter>
        <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={handleCompletarPagos}
          disabled={isProcessing || !selectedGremio}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isProcessing ? 'Completando...' : 'Completar Pagos'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

