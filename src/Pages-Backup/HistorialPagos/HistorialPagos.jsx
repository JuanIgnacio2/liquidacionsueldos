import { useEffect, useState } from "react";
import styles from './HistorialPagos.module.scss';
import Header from '../../Components/Header/Header';
import {getPagos, getDetallePago} from '../../services/empleadosAPI';
import DetallePagoModal from '../../Components/DetallePagoModal/DetallePagoModal';
import { AnimatePresence } from "framer-motion";

function HistorialPagos(){
    const [pagos, setPagos] = useState([]);
    const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);

    useEffect(() =>{
        (async () => {
            const data = await getPagos();
            setPagos(data);
        })();
    },[]);

    const verDetalle = async (idPago) => {
        const detalle = await getDetallePago(idPago);
        setDetalleSeleccionado(detalle);
    };

    return (
        <div className={styles.container}>
            <Header/>
            <h2>Historial de liquidaciones</h2>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Legajo</th>
                        <th>Nombre</th>
                        <th>Periodo</th>
                        <th>Fecha de Pago</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {pagos.map((pago) =>(
                        <tr key={pago.idPago} onClick={()=>verDetalle(pago.idPago)}>
                            <td>{pago.legajoEmpleado}</td>
                            <td>{pago.nombreEmpleado} {pago.apellidoEmpleado}</td>
                            <td>{pago.periodoPago}</td>
                            <td>{pago.fechaPago}</td>
                            <td>${Number(pago.total).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <AnimatePresence>
                {detalleSeleccionado && (
                    <DetallePagoModal
                    detalle={detalleSeleccionado}
                    onClose={()=>setDetalleSeleccionado(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default HistorialPagos;