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

    const handleSave = async (formData) => {
        current
            ? await api.updateEmployee(current.legajo, formData)
            : await api.createEmployee(formData);
        await api.getEmployees();
        setModalOpen(false);
        setCurrent(null);
    };

    const handleDelete = async(legajo) => {
        if(!window.confirm('¿Dar de baja empleado?'))return;
        await api.deleteEmployee(legajo);
        await api.getEmployees();
    };

    return(
        <div className={styles.employeesContainer}>
            <Header/>
            <main className={styles.mainContent}>
                <section className={styles.sectionContainer}>
                    <div className={styles.contentBox}>
                        <div className={styles.headerRow}>
                            <h2>Empleados</h2>

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
                                        <th>Nombre y apellido</th>
                                        <th>CUIL</th>
                                        <th>Inicio de actividad</th>
                                        <th>Área</th>
                                        <th>Categoria</th>
                                        <th>Banco</th>
                                        <th>Domicilio</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((e) =>(
                                        <tr key={e.legajo}>
                                            <td>{e.legajo}</td>
                                            <td>{`${e.nombre} ${e.apellido}`}</td>
                                            <td>{e.cuil}</td>
                                            <td>{e.categoria?.nombre ?? '—'}</td>
                                            <td>{e.area?.nombre ?? '—'}</td>
                                            <td>{e.gremio}</td>
                                            <td>{e.banco}</td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        className={`${styles.edit}`}
                                                        onClick={() => {setCurrent(e); setModalOpen(true);}}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className={`${styles.delete}`}
                                                        onClick={() => handleDelete(e.legajo)}
                                                    >
                                                        🗑️
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