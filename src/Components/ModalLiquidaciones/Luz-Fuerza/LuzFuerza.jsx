import { useState } from 'react';
import styles from '../Modal.module.scss';

function LuzFuerza({ onSubmit }) {
  const [formData, setFormData] = useState({
    nroObra: '',
    empleado: '',
    dni: '',
    categoria: '',
    fechaIngreso: '',
    detalle: '' // Agregado el campo detalle
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <div className={styles.modalContainer}>
      <h2 className={styles.modalTitle}>Liquidación Luz y Fuerza</h2>
      <form onSubmit={handleSubmit} className={styles.modalForm}>
        <div className={styles.formGroup}>
          <label>Nombre del empleado</label>
          <input
            type="text"
            name="empleado"
            value={formData.empleado}
            onChange={handleChange}
            placeholder="Ingrese nombre completo"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Nombre del empleado</label>
          <input
            type="text"
            name="empleado"
            value={formData.empleado}
            onChange={handleChange}
            placeholder="Ingrese nombre completo"
          />
        </div>
        <div className={styles.formGroup}>
          <label>DNI</label>
          <input
            type="text"
            name="dni"
            value={formData.dni}
            onChange={handleChange}
            placeholder="Ingrese DNI"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Categoría</label>
          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
          >
            <option value="">Seleccione una categoría</option>
            <option value="cat1">Categoría 1</option>
            <option value="cat2">Categoría 2</option>
            <option value="cat3">Categoría 3</option>
          </select>
        </div>
        
        
        <button type="submit" className={styles.submitButton}>
          Generar Liquidación
        </button>
      </form>
    </div>
  );
}

export default LuzFuerza;
