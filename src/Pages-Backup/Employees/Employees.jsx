import { useEffect, useState } from "react";
import styles from './Employees.module.scss';
import Header from '../../Components/Header/Header';
import * as api from '../../services/empleadosAPI';
import EmployeeModal from '../../Components/EmployeeModal/EmployeeModal';
import { AnimatePresence } from "framer-motion";

function Employees(){
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [current, setCurrent] = useState(null);
    const [search, setSearch] = useState ('');
    const [filtered, setFiltered] = useState('');

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const data = await api.getEmployees();
            setEmployees(data);
            setError('');
        } catch(err){
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {loadEmployees();}, []);

    useEffect(() =>{
        const lower = search.toLowerCase();
        setFiltered(
            employees.filter(e=>
                e.legajo.toString().includes(search) ||
            `${e.nombre} ${e.apellido}`.toLowerCase().includes(lower)
            )
        );
    },[search, employees]);

    const handleSave = async (dto, isEdit) => {
        try{
            if(isEdit){
                await api.updateEmployee(dto.legajo, dto);
            }
            else{
                await api.createEmployee(dto);
            }
            await api.getEmployees();
            setModalOpen(false);
        }catch(err){
            alert('Error al registrar empleado: ' + err.message);
        }
    };

    return(
        <div className={styles.employeesContainer}>
            <Header/>
            <main className={styles.mainContent}>
                <section className={styles.sectionContainer}>
                    <div className={styles.contentBox}>
                            <h2>Empleados</h2>
                        <div className={styles.headerRow}>
                            <input
                                className={styles.searchInput}
                                type="text" 
                                placeholder="Buscar por legajo o nombre..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <button
                                className={styles.addButton}
                                onClick={() => { setCurrent(null); setModalOpen(true); }}
                            >
                                + Nuevo
                            </button>
                        </div>
                        {!loading && !error && (
                            <table className={styles.employeesTable}>
                                <thead>
                                    <tr>
                                        <th>Legajo</th>
                                        <th>Nombre</th>
                                        <th>CUIL</th>
                                        <th>Inicio actividad</th>
                                        <th>Domicilio</th>
                                        <th>Banco</th>
                                        <th>Categoria</th>
                                        <th>Gremio</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((e) =>(
                                        <tr key={e.legajo}
                                            className={styles.clickTableRow}
                                            onClick={()=>{ setCurrent(e); setModalOpen(true); }}
                                            >
                                            <td>{e.legajo}</td>
                                            <td>{`${e.nombre} ${e.apellido}`}</td>
                                            <td>{e.cuil}</td>
                                            <td>{e.inicioActividad}</td>
                                            <td>{e.domicilio}</td>
                                            <td>{e.banco}</td>
                                            <td>{e.categoria}</td>
                                            <td>{e.gremio === 'LUZ_Y_FUERZA' ? 'Luz y Fuerza' : e.gremio}</td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        className={`${styles.edit}`}
                                                        onClick={() => {setCurrent(e); setModalOpen(true);}}
                                                    >
                                                        ✏️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                <AnimatePresence mode="wait">
                    {modalOpen && (
                        <EmployeeModal
                            initialData = {current}
                            onClose = {() => {setModalOpen(false); setCurrent(null);}}
                            onSubmit={handleSave}
                        />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default Employees;