import { useEffect, useState } from 'react';
import { motion} from 'framer-motion';
import styles from './EmployeeModal.module.scss';
import {getCategorias, getAreas} from '../../services/meta';
import { getConceptos, getConceptosAsignados } from '../../services/empleadosAPI';

function EmployeeModal({initialData, onClose, onSubmit}){
    const [categorias, setCategorias] = useState([]);
    const [areas, setAreas] = useState([]);
    const [conceptos, setConceptos] = useState([]);
    const [selectedConceptoId, setSelectedConceptoId] = useState('');
    const [conceptosAsignados, setConceptosAsignados] = useState([]);
    
    const [form, setForm] = useState(
        initialData ?? {
            legajo: '', nombre: '', apellido: '', cuil: '',
            inicioActividad: '', domicilio: '', banco: '',
            categoriaId: '', areaIds: [], sexo: 'M', gremio: 'LUZ_Y_FUERZA',
        }
    );

    useEffect(() => {
        (async () =>{
            const categorias = await getCategorias();
            const areas = await getAreas();
            const conceptos = await getConceptos();
            setCategorias(categorias);
            setAreas(areas);
            setConceptos(conceptos);
        
            if (initialData) {
                setForm({
                legajo: initialData.legajo,
                nombre: initialData.nombre,
                apellido: initialData.apellido,
                cuil: initialData.cuil,
                inicioActividad: initialData.inicioActividad,
                domicilio: initialData.domicilio || '',
                banco: initialData.banco || '',
                categoriaId: String(initialData.idCategoria ?? ''),
                areaIds: initialData.idAreas ?? [],
                sexo: initialData.sexo || 'M',
                gremio: initialData.gremio || 'LUZ_Y_FUERZA',
                });

                const asignados = await getConceptosAsignados(initialData.legajo);

                const formateados = asignados.map(c => ({
                    id: c.idReferencia,
                    nombre: c.nombre || '',
                    tipo: c.tipoConcepto,
                    unidades: c.unidades,
                }));
                setConceptosAsignados(formateados);
            }
        })();
    }, [initialData]);

    const handleChange = (e) =>
        setForm({...form, [e.target.name]: e.target.value});

    const handleAreaToggle = (areaId) => {
        setForm ((prevForm) =>{
            const current = prevForm.areaIds || [];
            const exists = current.includes(areaId);
            const updated = exists
                ? current.filter((id) => id !== areaId)
                : [...current, areaId];
            return { ...prevForm, areaIds: updated};
        });
    };

    const handleAddConcepto = () => {
        if(!selectedConceptoId) return;
        const concepto = conceptos.find(c => c.id === Number(selectedConceptoId));
        console.log(concepto);
        if(!concepto) return;
        if(conceptosAsignados.some(c => c.id === concepto.id)) return;

        setConceptosAsignados([...conceptosAsignados,{
            id: concepto.id,
            descripcion: concepto.nombre,
            tipo: concepto.tipoConcepto,
            unidades: 1,
        }]);

        setSelectedConceptoId('');
    };
    
    const handleUnidadChange = (idx, val) => {
        const nuevos = [...conceptosAsignados];
        nuevos[idx].unidades = Number(val);
        setConceptosAsignados(nuevos);
    };

    const handleRemoveConcepto = (idx) => {
        const nuevos = [...conceptosAsignados];
        nuevos.splice(idx, 1);
        setConceptosAsignados(nuevos);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            legajo: parseInt(form.legajo, 10),
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            cuil: form.cuil.trim(),
            inicioActividad: form.inicioActividad,
            domicilio: form.domicilio.trim() || null,
            banco: form.banco.trim() || null,
            idCategoria: parseInt(form.categoriaId, 10),
            idAreas: form.areasIds,
            sexo: form.sexo,
            gremio: form.gremio,
            conceptosAsignados: conceptosAsignados.map(c => ({
                tipoConcepto: 'BONIFICACION_FIJA',
                idReferencia: c.id,
                unidades: c.unidades,
            })),
        };
        console.log(payload);
        onSubmit(payload, !!initialData);
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
                            value={form.cuil}
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
                        <select name="categoriaId" onChange={handleChange}
                                value={form.categoriaId} required>
                            <option hidden value="">Seleccionar…</option>
                            {categorias.map(c =>
                            <option key={c.idCategoria} value={c.idCategoria}>{c.nombreCategoria}</option>
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
                            <option value="LUZ_Y_FUERZA">Luz y Fuerza</option>
                            <option value="UOCRA">UOCRA</option>
                        </select>
                        </label>
                    </div>
                    {/*Áreas*/}
                    <div className={styles.formGroup}>
                        <label>Áreas</label>
                        <div className={styles.checkboxGroup}>
                        {areas.map((area) =>(
                            <label key={area.idArea} className={styles.checkboxItem}>
                                <input
                                    type="checkbox"
                                    checked={form.areaIds?.includes(area.idArea)}
                                    onChange={() => handleAreaToggle(area.idArea)}
                                />
                                {area.nombre}
                            </label>
                        ))}
                        </div>
                    </div>
                    {/*Conceptos asignados*/}
                    <div className={styles.formGroup}>
                        <label>Agregar concepto predefinido</label>
                        <div style={{display: 'flex', gap: '1rem'}}>
                            <select value={selectedConceptoId} onChange={(e) => setSelectedConceptoId(e.target.value)}>
                                <option value="">Seleccionar concepto</option>
                                {conceptos.map(c=>(
                                    <option key={c.id} value={c.id}>{c.nombre} ({c.tipoConcepto})</option>
                                ))}
                            </select>
                            <button type="button" onClick={handleAddConcepto}>Añadir</button>
                        </div>
                        {conceptosAsignados.length > 0 && (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Concepto</th>
                                        <th>Tipo</th>
                                        <th>Unidades</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conceptosAsignados.map((c, idx) =>(
                                        <tr key={idx}>
                                            <td>{c.nombre}</td>
                                            <td>{c.tipo}</td>
                                            <td>
                                                <input type="number" min="1" value={c.unidades} onChange={(e) => handleUnidadChange(idx, e.target.value)}/>
                                            </td>
                                            <td>
                                                <button type="button" onClick={() => handleRemoveConcepto(idx)}>❌</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {/*Botones*/}
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