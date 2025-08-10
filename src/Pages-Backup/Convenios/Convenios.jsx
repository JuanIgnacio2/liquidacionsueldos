import { useEffect, useState } from "react";
import styles from './Convenios.module.scss';
import {getConvenios} from '../../services/empleadosAPI';
import Header from "../../Components/Header/Header";

function Convenios(){
    const[convenios,setConvenios]=useState([]);
    const[areas,setAreas]=useState([]);

    useEffect(() =>{
        (async () => {
            const data = await getConvenios();
            setConvenios(data);

            //Extraer los nombres de las areas
            const nombresAreas = new Set();
            data.forEach((fila) =>{
                Object.keys(fila.montosPorArea || {}).forEach(area => nombresAreas.add(area));
            });
            setAreas([...nombresAreas]);
        })();
    }, []);

    return(
        <div className={styles.conveniosContainer}>
            <Header/>
            <main className={styles.mainContent}>
                <div className={styles.headerRow}>
                    <h2>Convenios Luz y fuerza</h2>
                </div>
                <table className={styles.conveniosTable}>
                    <thead>
                        <tr>
                            <th rowSpan="2">Categoría</th>
                            <th rowSpan="2">Básico</th>
                            <th colSpan={areas.length}>Bonificacion áreas</th>
                        </tr>
                        <tr>
                            {areas.map(area =>(
                                <th key={area}>{area}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {convenios.map((fila, idx) =>(
                            <tr key={idx}>
                                <td>{fila.nombreCategoria}</td>
                                <td>${Number(fila.basico)}</td>
                                {areas.map(area =>(
                                    <td key={area}>
                                        {fila.montosPorArea[area] 
                                        ? `$${Number(fila.montosPorArea[area]).toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                                        : ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    );
}

export default Convenios;