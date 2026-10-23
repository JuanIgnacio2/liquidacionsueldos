import React, { useState, useEffect, useMemo } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { CheckCircle } from 'lucide-react';
import * as api from '../../services/empleadosAPI';
import { useNotification } from '../../Hooks/useNotification';
import { useConfirm } from '../../Hooks/useConfirm';
import './CompletarPagosMasivoModal.scss';

export function CompletarPagosMasivoModal({ isOpen, onClose, employees, onSuccess }) {
  const notify = useNotification();
  const confirmAction = useConfirm();
  const [selectedGremio, setSelectedGremio] = useState('');
  const [tipoPago, setTipoPago] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [aguinaldoNumero, setAguinaldoNumero] = useState(1);
  const getCurrentDate = () => new Date().toISOString().slice(0, 10);
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
        }
      }
    });
    return Array.from(gremiosSet).sort();
  }, [employees]);

  // Resetear cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedGremio('');
      setTipoPago('');
      setAnio(new Date().getFullYear());
      setAguinaldoNumero(1);
      setFechaPago(getCurrentDate());
    }
  }, [isOpen]);

  const tipoPagoLabel = {
    VACACIONES: 'Vacaciones',
    AGUINALDO: 'Aguinaldo',
    TURISMO_SOCIAL: 'Turismo social',
  };

  const handleCompletarPagos = async () => {
    if (!selectedGremio) {
      notify.error('Debe seleccionar un gremio');
      return;
    }
    if (!tipoPago) {
      notify.error('Debe seleccionar un tipo de pago');
      return;
    }
    if (!Number.isInteger(anio) || anio < 1900 || anio > 9999) {
      notify.error('Ingrese un año válido');
      return;
    }

    const result = await confirmAction({
      title: 'Liquidar pagos masivos',
      message: `¿Confirma liquidar ${tipoPagoLabel[tipoPago]} para ${selectedGremio === 'LYF' ? 'Luz y Fuerza' : 'UOCRA'} durante ${anio}?${tipoPago === 'AGUINALDO' ? ` Aguinaldo ${aguinaldoNumero}.` : ''}${fechaPago ? `\n\nFecha de pago: ${new Date(`${fechaPago}T00:00:00`).toLocaleDateString('es-AR')}` : ''}`,
      confirmText: 'Liquidar pagos',
      cancelText: 'Cancelar',
      type: 'warning',
      confirmButtonVariant: 'primary',
      cancelButtonVariant: 'secondary'
    });

    if (!result) return;

    setIsProcessing(true);

    try {
      const payload = {
        gremio: selectedGremio,
        tipoPago,
        anio,
        ...(tipoPago === 'AGUINALDO' ? { aguinaldoNumero } : {}),
        fechaPago: fechaPago || null,
      };
      const response = await api.liquidarPagosMasivos(payload);
      notify.success(response?.message || `${tipoPagoLabel[tipoPago]} liquidado para ${selectedGremio === 'LYF' ? 'Luz y Fuerza' : 'UOCRA'} (${anio})`);
      
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Liquidar Pagos Masivo"
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
            onChange={(e) => {
              setSelectedGremio(e.target.value);
              setTipoPago('');
            }}
          >
            <option value="">Seleccione un gremio</option>
            {gremiosDisponibles.map((gremio) => (
              <option key={gremio} value={gremio === 'LUZ_Y_FUERZA' ? 'LYF' : gremio}>
                {gremio === 'LUZ_Y_FUERZA' ? 'Luz y Fuerza' : gremio}
              </option>
            ))}
          </select>
        </div>

        {selectedGremio && (
          <>
            <div className="form-section">
              <label htmlFor="tipo-pago-select" className="form-label">
                Tipo de pago <span className="required">*</span>
              </label>
              <select
                id="tipo-pago-select"
                className="form-select"
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value)}
              >
                <option value="">Seleccione un tipo de pago</option>
                <option value="VACACIONES">Vacaciones</option>
                <option value="AGUINALDO">Aguinaldo</option>
                {!isUocra && <option value="TURISMO_SOCIAL">Turismo social</option>}
              </select>
            </div>

            {tipoPago && (
              <>
                <div className="form-section">
                  <label htmlFor="pago-anio" className="form-label">
                    Año <span className="required">*</span>
                  </label>
                  <select
                    id="pago-anio"
                    className="form-select"
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>

                {tipoPago === 'AGUINALDO' && (
                  <div className="form-section">
                    <label htmlFor="aguinaldo-numero" className="form-label">
                      Número de aguinaldo <span className="required">*</span>
                    </label>
                    <select
                      id="aguinaldo-numero"
                      className="form-select"
                      value={aguinaldoNumero}
                      onChange={(e) => setAguinaldoNumero(Number(e.target.value))}
                    >
                      <option value={1}>Primer aguinaldo</option>
                      <option value={2}>Segundo aguinaldo</option>
                    </select>
                  </div>
                )}

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
                </div>
              </>
            )}
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
          disabled={isProcessing || !selectedGremio || !tipoPago}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isProcessing ? 'Liquidando...' : 'Liquidar pagos'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

