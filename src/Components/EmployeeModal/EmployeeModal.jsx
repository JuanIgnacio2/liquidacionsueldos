import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './EmployeeModal.module.scss';
import {getCategorias, getAreas} from '../../services/meta';

function EmployeeModal({initialData, onClose, onSubmit}){
    const [categorias, setCategorias] = useState([]);
    const [areas, setAreas] = useState([]);
    const [form, setForm] = useState(
        initialData ?? {
            legajo: '', nombre: '', apellido: '', cuil: '',
            inicioActividad: '', domicilio: '', banco: '',
            categoria: null, sexo: 'M', gremio: 'LUZ_FUERZA', area: null,
        }
    );

    useEffect(() => {
        (async () =>{
            setCategorias(await getCategorias());
            setAreas(await getAreas());
        })();
    }, []);

    const handleChange = (e) =>
        setForm({...form, [e.target.name]: e.target.value});

    const handleSelect = (e) =>
        setForm({...form, [e.target.name]: e.target.value});
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return(
        <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0}}
        >
            <motion.div
                className={styles.modalContainer}
                initial={{scale: 0.8, opacity:0}}
                animate={{scale: 1, opacity: 1, transition: {duration: 0.25}}}
                exit={{scale:0.8, opacity: 0, transition: {duration: 0.20}}}
            >
                <h3 className={styles.modalTitle}>{initialData ? 'Editar empleado' : 'Nuevo empleado'}</h3>
                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.formGroup}>
                    <label>
                        Legajo
                        <input
                            name="legajo"
                            disabled={Boolean(initialData)}
                            value={form.legajo}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    </div>
                    <div className={styles.formGroup}>
                    <label>
                        Nombre
                        <input
                            name="nombre"
                            value={form.nombre}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    </div>
                    <div className={styles.formGroup}>
                    <label>
                        Apellido
                        <input
                            name="apellido"
                            value={form.apellido}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    </div>
                    <div className={styles.formGroup}>
                    <label>
                        CUIL
                        <input
                            name="cuil"
                            value={form.dni}
                            onChange={handleChange}
                            required
                        />
                    </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Inicio de actividad
                        <input type="date" name="inicioActividad"
                                value={form.inicioActividad}
                                onChange={handleChange} required />
                        </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Domicilio
                        <input name="domicilio" value={form.domicilio}
                                onChange={handleChange} />
                        </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Banco
                        <input name="banco" value={form.banco}
                                onChange={handleChange} />
                        </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Categoría
                        <select name="categoria" onChange={handleSelect}
                                value={JSON.stringify(form.categoria)}>
                            <option hidden value="">Seleccionar…</option>
                            {categorias.map(c =>
                            <option key={c.id} value={JSON.stringify(c)}>{c.nombre}</option>
                            )}
                        </select>
                        </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Área
                        <select name="area" onChange={handleSelect}
                                value={JSON.stringify(form.area)}>
                            <option hidden value="">Seleccionar…</option>
                            {areas.map(a =>
                            <option key={a.id} value={JSON.stringify(a)}>{a.nombre}</option>
                            )}
                        </select>
                        </label>
                    </div>
                    <div className={styles.formGroup}>
                        <label>Sexo
                        <select name="sexo" value={form.sexo} onChange={handleChange}>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                        </select>
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Gremio
                        <select name="gremio" value={form.gremio} onChange={handleChange}>
                            <option value="LUZ_FUERZA">Luz y Fuerza</option>
                            <option value="UOCRA">UOCRA</option>
                        </select>
                        </label>
                    </div>
                    <div className={styles.formActions}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.cancelButton}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

export default EmployeeModal;