import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../Modal/Modal';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import * as api from '../../services/empleadosAPI';
import './ConceptModal.scss';

function ConceptModal({ isOpen, onClose, onConfirm, employee = null, basicSalary = 0 }) {
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [items, setItems] = useState([]);

  /*Cargar catálogo basado en el gremio del empleado*/
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setSelectedId('');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError('');

        // Determinar gremio del empleado
        const gremioNombre = employee?.gremio?.nombre?.toUpperCase() || '';
        const isLuzYFuerza = gremioNombre.includes('LUZ') && gremioNombre.includes('FUERZA');
        const isUocra = gremioNombre === 'UOCRA';

        // Obtener básico de categoría 11 para Luz y Fuerza
        let basicoCat11 = 0;
        if (isLuzYFuerza) {
          try {
            const cat11 = await api.getCategoriaById(11);
            basicoCat11 = Number(cat11.basico || cat11.salarioBasico || cat11.sueldoBasico || 0);
          } catch (err) {
            console.error('Error al obtener categoría 11:', err);
          }
        }

        // Cargar bonificaciones según el gremio
        let bonificaciones = [];
        if (isLuzYFuerza) {
          bonificaciones = await api.getConceptosLyF();
        } else if (isUocra) {
          bonificaciones = await api.getConceptosUocra();
        }

        // Cargar descuentos (generales para todos)
        const descuentos = await api.getDescuentos();

        // Mapear bonificaciones
        const bonificacionesMapped = bonificaciones.map((b) => {
          const porcentaje = Number(b.porcentaje ?? 0);
          let montoUnitario = 0;
          
          if (porcentaje > 0) {
            // Calcular sobre básico de categoría 11 para Luz y Fuerza
            if (isLuzYFuerza) {
              montoUnitario = (basicoCat11 * porcentaje) / 100;
            } else if (isUocra && basicSalary > 0) {
              // Para UOCRA, calcular sobre el básico del empleado
              montoUnitario = (basicSalary * porcentaje) / 100;
            } else if (isUocra) {
              // Si no tenemos el básico, guardar el porcentaje para calcular después
              montoUnitario = porcentaje; // Se calculará cuando se agregue el concepto
            }
          } else {
            montoUnitario = Number(b.montoUnitario ?? b.monto ?? 0);
          }

          return {
            id: b.idBonificacion ?? b.id,
            nombre: b.descripcion ?? b.nombre ?? 'Concepto',
            porcentaje,
            tipo: isLuzYFuerza ? 'CONCEPTO_LYF' : 'CONCEPTO_UOCRA',
            montoUnitario,
            cantidad: 1,
            total: montoUnitario,
          };
        });

        // Mapear descuentos
        const descuentosMapped = descuentos.map((d) => {
          const porcentaje = Number(d.porcentaje ?? 0);
          const montoUnitario = porcentaje > 0 
            ? porcentaje // Se calculará después basado en el total de remuneraciones
            : Number(d.montoUnitario ?? d.monto ?? 0);

          return {
            id: d.idDescuento ?? d.id,
            nombre: d.descripcion ?? d.nombre ?? 'Descuento',
            porcentaje,
            tipo: 'DESCUENTO',
            montoUnitario,
            cantidad: 1,
            total: -montoUnitario, // Negativo porque es descuento
          };
        });

        // Combinar todos los conceptos
        const todosLosConceptos = [...bonificacionesMapped, ...descuentosMapped];
        setCatalogo(todosLosConceptos);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar conceptos:', err);
        setError('Error al cargar conceptos disponibles');
        setLoading(false);
      }
    })();
  }, [isOpen, employee]);

  /*HANDLERS*/
  const addItem = () => {
    if (!selectedId) return;
    const concepto = catalogo.find((c) => c.id === Number(selectedId));

    if (!concepto) return;

    // Evitar duplicados
    if (items.some((i) => i.id === concepto.id && i.tipo === concepto.tipo)) {
      return;
    }

    // Crear una copia del concepto para agregar
    const nuevoConcepto = {
      ...concepto,
      cantidad: 1,
      total: concepto.tipo === 'DESCUENTO' 
        ? -Math.abs(concepto.montoUnitario) 
        : concepto.montoUnitario,
    };

    setItems([...items, nuevoConcepto]);
    setSelectedId('');
  };

  const updateCantidad = (idx, qty) => {
    const nuevos = [...items];
    nuevos[idx].cantidad = qty > 0 ? qty : 1;
    const montoUnitario = nuevos[idx].montoUnitario || 0;
    nuevos[idx].total = nuevos[idx].tipo === 'DESCUENTO'
      ? -(Math.abs(montoUnitario) * nuevos[idx].cantidad)
      : montoUnitario * nuevos[idx].cantidad;
    setItems(nuevos);
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleAceptar = () => {
    if (items.length === 0) return;
    
    // Formatear los conceptos para que coincidan con el formato esperado
    const conceptosFormateados = items.map(item => ({
      id: item.id,
      nombre: item.nombre,
      tipo: item.tipo,
      montoUnitario: item.montoUnitario,
      porcentaje: item.porcentaje,
      cantidad: item.cantidad,
      total: item.total,
      isManual: true, // Marcar como manual para permitir edición
    }));

    onConfirm(conceptosFormateados);
    setItems([]);
    setSelectedId('');
    onClose();
  };

  const handleCancelar = () => {
    setItems([]);
    setSelectedId('');
    onClose();
  };

  // Función para formatear moneda
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0,00';
    const numValue = Number(value);
    const absValue = Math.abs(numValue);
    const parts = absValue.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${integerPart},${parts[1]}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancelar}
      title="Agregar Conceptos"
      size="medium"
      className="concept-modal"
    >
      <div className="concept-modal-content">
        {loading && (
          <div className="concept-modal-loading">
            <LoadingSpinner message="Cargando conceptos disponibles..." size="md" />
          </div>
        )}

        {error && (
          <div className="concept-modal-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Selector + botón */}
            <div className="concept-selector-row">
              <select 
                value={selectedId} 
                onChange={(e) => setSelectedId(e.target.value)}
                className="concept-select"
              >
                <option value="">-- Seleccionar concepto --</option>
                {catalogo.map((c) => (
                  <option key={`${c.id}-${c.tipo}`} value={c.id}>
                    {c.nombre} {c.tipo === 'DESCUENTO' ? '-' : '+'}
                    {c.porcentaje > 0 ? `${c.porcentaje}%` : formatCurrency(c.montoUnitario)}
                  </option>
                ))}
              </select>
              <Button 
                variant="primary" 
                onClick={addItem}
                disabled={!selectedId}
              >
                Añadir
              </Button>
            </div>

            {/* Lista editable */}
            {items.length > 0 && (
              <div className="concept-items-table">
                <table>
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Monto Unit.</th>
                      <th>Cant.</th>
                      <th>Total</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={`${it.id}-${idx}`}>
                        <td>{it.nombre}</td>
                        <td className={it.tipo === 'DESCUENTO' ? 'amount-negative' : 'amount-positive'}>
                          {it.tipo === 'DESCUENTO' && '-'}
                          {it.porcentaje > 0 ? `${it.porcentaje}%` : formatCurrency(it.montoUnitario)}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            step="0.1"
                            value={it.cantidad}
                            onChange={(e) => updateCantidad(idx, Number(e.target.value))}
                            className="concept-qty-input"
                          />
                        </td>
                        <td className={it.tipo === 'DESCUENTO' ? 'amount-negative' : 'amount-positive'}>
                          {formatCurrency(Math.abs(it.total))}
                        </td>
                        <td>
                          <Button
                            variant="remove"
                            icon={X}
                            onClick={() => removeItem(idx)}
                            title="Eliminar"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {items.length === 0 && !loading && (
              <div className="concept-modal-empty">
                <p>No hay conceptos seleccionados. Selecciona uno del menú desplegable para agregarlo.</p>
              </div>
            )}

            {/* Acciones */}
            <div className="concept-modal-actions">
              <Button variant="secondary" onClick={handleCancelar}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleAceptar} 
                disabled={items.length === 0}
              >
                Aceptar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default ConceptModal;