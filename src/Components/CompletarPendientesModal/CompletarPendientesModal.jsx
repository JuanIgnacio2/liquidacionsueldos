import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../Modal/Modal';
import { CheckCircle } from 'lucide-react';
import * as api from '../../services/empleadosAPI';
import { useNotification } from '../../Hooks/useNotification';
import { useConfirm } from '../../Hooks/useConfirm';
import '../CompletarPagosMasivoModal/CompletarPagosMasivoModal.scss';

const getCurrentDate = () => new Date().toISOString().slice(0, 10);
const getCurrentPeriod = () => new Date().toISOString().slice(0, 7);

export function CompletarPendientesModal({ isOpen, onClose, onSuccess }) {
  const notify = useNotification();
  const confirmAction = useConfirm();
  const [periodo, setPeriodo] = useState(getCurrentPeriod());
  const [fechaPago, setFechaPago] = useState(getCurrentDate());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPeriodo(getCurrentPeriod());
      setFechaPago(getCurrentDate());
    }
  }, [isOpen]);

  const handleCompletar = async () => {
    if (!periodo) {
      notify.error('Debe seleccionar un período');
      return;
    }
    if (!fechaPago) {
      notify.error('Debe seleccionar una fecha de pago');
      return;
    }

    const confirmado = await confirmAction({
      title: 'Completar pagos pendientes',
      message: `¿Confirma completar todos los pagos pendientes del período ${periodo}?\n\nFecha de pago: ${new Date(`${fechaPago}T00:00:00`).toLocaleDateString('es-AR')}`,
      confirmText: 'Completar pagos',
      cancelText: 'Cancelar',
      type: 'warning',
      confirmButtonVariant: 'primary',
      cancelButtonVariant: 'secondary'
    });

    if (!confirmado) return;

    setIsProcessing(true);
    try {
      const response = await api.completarPagoMasivo(periodo, fechaPago);
      notify.success(response?.message || `Pagos pendientes del período ${periodo} completados`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      notify.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Completar Pagos Pendientes"
      size="small"
      className="completar-pagos-masivo-modal"
    >
      <div className="completar-pagos-form">
        <div className="form-section">
          <label htmlFor="pendientes-periodo" className="form-label">
            Período <span className="required">*</span>
          </label>
          <input
            id="pendientes-periodo"
            type="month"
            className="form-input"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </div>

        <div className="form-section">
          <label htmlFor="pendientes-fecha-pago" className="form-label">
            Fecha de pago <span className="required">*</span>
          </label>
          <input
            id="pendientes-fecha-pago"
            type="date"
            className="form-input"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
          />
        </div>
      </div>

      <ModalFooter>
        <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={handleCompletar}
          disabled={isProcessing || !periodo || !fechaPago}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isProcessing ? 'Completando...' : 'Completar pagos'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
