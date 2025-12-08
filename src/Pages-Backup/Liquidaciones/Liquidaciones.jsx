import { useState } from 'react';
import styles from './Liquidaciones.module.scss';
import Header from '../../Components/Header/Header';
import { 
  getEmpleadoByLegajo, 
  getCategoriaById, 
  getPorcentajeArea,
  guardarLiquidacion,
  getConceptosAsignados,
  getConceptos
} from '../../services/empleadosAPI';
import { AnimatePresence } from 'framer-motion';
import ConceptModal from '../../Components/ConceptModal/ConceptModal'

function Liquidaciones() {
  /*STATE*/
  const [legajoInput, setLegajoInput] = useState('');
  const [empleado, setEmpleado] = useState(null);
  const [conceptos, setConceptos] = useState([]);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [periodo, setPeriodo] = useState(
    new Date().toISOString().slice(0,7)
  );

  const calcTotal = (lista) =>
    lista.reduce(
    (s, c) => s + (c.tipo === 'DESCUENTO' ? -c.total : c.total),
    0
  );

  /*HANDLERS*/
  const handleBuscar = async () => {
    if(!legajoInput) return;
    try{
      /*Buscar empleado*/
      const emp = await getEmpleadoByLegajo(legajoInput);
      setEmpleado(emp);
      /*Cargar básico de la categoría como primer concepto*/
      const categoria = await getCategoriaById(emp.idCategoria);
      const basico = {
        id: emp.idCategoria,
        tipo: 'CATEGORIA', 
        nombre: `Básico ${categoria.nombreCategoria}`,
        montoUnitario: categoria.basico,
        cantidad: 1,
        total: categoria.basico ?? 0,
      };

      /*Boinificación área*/
      const areas = (emp.idAreas || []).map((id, index) => ({
        idArea: id,
        nombre: emp.nombreAreas?.[index] ?? 'Área'
      }));
      const categoria_11 = await getCategoriaById(11);
      const bonosDeAreas = await Promise.all(
        areas.map(async (area)=>{
          const porcentaje = await getPorcentajeArea(area.idArea, emp.idCategoria);
          const bonoImporte = (categoria_11.basico * Number(porcentaje))/100;
          return {
            id: area.idArea,
            tipo: 'BONIFICACION_VARIABLE',
            nombre: `Bono de área ${area.nombre}`,
            montoUnitario: bonoImporte,
            cantidad: 1,
            total: bonoImporte ?? 0,
          };
        })
      );
      
      /*Conceptos precargados en base de datos*/
      const conceptosAsignados = await getConceptosAsignados(emp.legajo);
      const bonificacionesFijas = await getConceptos();

      const mappedAsignados = conceptosAsignados.map((asignado)=>{
        const bonificacion = bonificacionesFijas.find(b=>b.id === asignado.idReferencia);
        
        if(!bonificacion) return null;

        const montoUnitario = (categoria_11.basico * bonificacion.porcentaje)/100;
        
        return{
          id: asignado.idReferencia,
          tipo: asignado.tipoConcepto,
          nombre: bonificacion.nombre,
          montoUnitario,
          cantidad: asignado.unidades,
          total: montoUnitario * asignado.unidades,
        };
      }).filter(Boolean);

      /*Agregar conceptos y total*/
      const lista = [basico, ...bonosDeAreas, ...mappedAsignados];

      setConceptos(lista);
      setTotal(calcTotal(lista));

    }catch(err){
      alert('Empleado no encontrado');
      setEmpleado(null);
      setConceptos([]);
      setTotal(0);
    }
  };

  const handleQtyChange = (index, nuevaCantidad) => {
    const nuevos = [...conceptos];
    nuevos[index].cantidad = nuevaCantidad;
    nuevos[index].total = nuevos[index].montoUnitario * nuevaCantidad;
    setConceptos(nuevos);
    setTotal(calcTotal(nuevos));
  };

  const handleAddConcepto = () => {
    setModalOpen(true);
  };

  const handleConfirmConeptos = (nuevos) => {
    const lista = [...conceptos, ...nuevos];
    setConceptos(lista);
    setTotal(calcTotal(lista));
  };

  const handleGuardar = async () => {
    if (!empleado) return;

    const payload = {
      legajo: empleado.legajo,
      periodoPago: periodo,
      conceptos: conceptos.map((c) => ({
        tipoConcepto: c.tipo,
        idReferencia: 1,
        unidades: c.cantidad,
      })),
    };

    try {
      const pago = await guardarLiquidacion(payload);
      alert(`Liquidación guardada (ID pago: ${pago.idPago})`);
    } catch (err) {
      alert('Error al guardar liquidación: ' + err.message);
    }
  };

  return (
    <div className={styles.liquidacionesContainer}>
      <Header />
      
      {/*BUSCADOR Y PERIODO*/}
      <section className={styles.sectionContainer}>
        <h2>Liquidacion Luz y Fuerza</h2>

        <div className={styles.searchRow}>
            <input 
              type="input"
              placeholder='Buscar'
              value={legajoInput}
              onChange={(e) => setLegajoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
            <button onClick={handleBuscar}>Buscar</button>
        </div>

        {/*DATOS DEL EMPLEADO*/}
        {empleado && (
          <div className={styles.empleadBox}>
            <p><strong>Legajo:</strong> {empleado.legajo}</p>
            <p><strong>Nombre:</strong> {empleado.nombre} {empleado.apellido}</p>
            <p><strong>CUIL:</strong> {empleado.cuil}</p>
            <p><strong>Inicio actividad:</strong> {empleado.inicioActividad}</p>
            <p><strong>Categoria:</strong> {empleado.categoria}</p>
            <p><strong>Banco:</strong> {empleado.banco}</p>
            <p><strong>Gremio:</strong> {empleado.gremio}</p>
            <p><strong>Sexo:</strong> {empleado.sexo}</p>
          </div>
        )}

        {/*TABLA DE CONCEPTOS*/}
        {conceptos.length > 0 && (
          <>
            <table className={styles.conceptosTable}>
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Monto Unitario</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {conceptos.map((c,idx)=>(
                  <tr key={idx}>
                    <td>{c.nombre}</td>
                    <td>${c.montoUnitario.toFixed(2)}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        values={c.cantidad}
                        onChange={(e)=>
                          handleQtyChange(idx, Number(e.target.value))
                        }
                        className={styles.qtyInput}
                      />
                    </td>
                    <td>
                      {c.tipo === 'DESCUENTO' && '-'}$
                      {Number(c.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/*TOTAL SUELDO*/}
            <div className={styles.totalRow}>
                <span>Total: </span>
                <span>${total.toFixed(2)}</span>
            </div>

            {/*BOTONES*/}
            <div className={styles.actionRow}>
              <button className={styles.addConceptoBtn} onClick={handleAddConcepto}>
                + Añadir concepto
              </button>
              <button className={styles.saveBtn} onClick={handleGuardar}>
                Guardar liquidación
              </button>
            </div>

            {/*MODAL*/}
            <AnimatePresence>
              {modalOpen && (
                <ConceptModal
                  onClose={()=>setModalOpen(false)}
                  onConfirm={handleConfirmConeptos}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </section>
    </div>
  );
}

export default Liquidaciones;
