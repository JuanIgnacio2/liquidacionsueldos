import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './ConceptModal.module.scss';
import {getConceptos, getCategoriaById} from '../../services/empleadosAPI'

function ConceptModal({ onClose, onConfirm }) {
  /*STATE*/
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [items, setItems] = useState([]);

  /*Cargar catálogo*/
  useEffect(() => {
    (async () =>{
      try{
        //Básico de categoría 11
        const cat11 = await getCategoriaById(11);
        const basicoCat11 = Number(cat11.basico);

        //Bonificiaciones fijas
        const data = await getConceptos();

        //Calculo del monto
        const mapped = data.map((d) => {
          const tipo = d.tipoConcepto ?? 'BONIFICACION_FIJA';
          const porcentaje = Number(d.porcentaje ?? 0);
          const unit = 
            tipo === 'DESCUENTO' || porcentaje === 0
              ? Number(d.montoUnitario ?? d.monto ?? 0)
              : (basicoCat11 * porcentaje) / 100;
          return{
            id: d.idBonificacion ?? d.id,
            nombre: d.descripcion ?? d.nombre,
            porcentaje,
            tipo,
            montoUnitario: unit,
            cantidad: 1,
            total: unit,
          }
        });
        setCatalogo(mapped);
        setLoading(false);
      }catch (err){
        setError('Error al cargar bonificaciones');
        setLoading(false);
      }
    })();
  }, []);

  /*HANDLERS*/
  const addItem = () => {
    if (!selectedId) return;
    const concepto = catalogo.find((c) => c.id === Number(selectedId));

    if (!concepto) return;

    if (items.some((i) => i.id === concepto.id)) return; // Evitar duplicado
    setItems([...items, concepto]);
    setSelectedId('');
  };

  const updateCantidad = (idx, qty) => {
    const nuevos = [...items];
    nuevos[idx].cantidad = qty;
    nuevos[idx].total    = nuevos[idx].montoUnitario * qty;
    setItems(nuevos);
  };

  const handleAceptar = () => {
    onConfirm(items);
    onClose();
  };

  return (
    <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className={styles.modal} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}>
        <h3>Agregar conceptos</h3>

        {loading && <p>Cargando bonificaciones...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {!loading && !error && (
          <>
            {/* Selector + botón */}
            <div className={styles.selectorRow}>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">-- Seleccionar concepto --</option>
                {catalogo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.tipo === 'DESCUENTO' ? '-' : '+'}${c.montoUnitario.toFixed(2)}
                  </option>
                ))}
              </select>
              <button onClick={addItem}>Añadir</button>
            </div>

            {/* Lista editable */}
            {items.length > 0 && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Monto Unit.</th>
                    <th>Cant.</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id}>
                      <td>{it.nombre}</td>
                      <td>
                        {it.tipo === 'DESCUENTO' && '-'}$
                        {it.montoUnitario.toFixed(2)}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={it.cantidad}
                          onChange={(e) => updateCantidad(idx, Number(e.target.value))}
                        />
                      </td>
                      <td>
                        {it.tipo === 'DESCUENTO' && '-'}$
                        {it.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Acciones */}
            <div className={styles.actions}>
              <button onClick={onClose}>Cancelar</button>
              <button className={styles.accept} onClick={handleAceptar} disabled={items.length === 0}>
                Aceptar
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default ConceptModal;