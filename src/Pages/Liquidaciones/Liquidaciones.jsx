import { useLocation } from 'react-router-dom';
import styles from './Liquidaciones.module.scss';
import Header from '../../Components/Header/Header';
import LuzFuerza from '../../Components/ModalLiquidaciones/Luz-Fuerza/LuzFuerza';
import Uocra from '../../Components/ModalLiquidaciones/Uocra/Uocra';

function Liquidaciones() {
  const location = useLocation();
  const currentPath = location.pathname.slice(1);

  const handleSubmitLuzFuerza = (data) => {
    console.log('Datos de Luz y Fuerza:', data);
    // Aquí puedes manejar el envío de datos de Luz y Fuerza
  };

  const handleSubmitUocra = (data) => {
    console.log('Datos de UOCRA:', data);
    // Aquí puedes manejar el envío de datos de UOCRA
  };

  const renderContent = () => {
    switch(currentPath) {
      case 'Luz y fuerza':
        return (
          <div className={styles.sectionContainer}>
            <div className={styles.contentBox}>
              <LuzFuerza onSubmit={handleSubmitLuzFuerza} />
            </div>
          </div>
        );
      
      case 'Uocra':
        return (
          <div className={styles.sectionContainer}>
            <div className={styles.contentBox}>
              <Uocra onSubmit={handleSubmitUocra} />
            </div>
          </div>
        );

      case 'Historial':
        return (
          <div className={styles.sectionContainer}>
            <h2>Historial de Liquidaciones</h2>
            <div className={styles.contentBox}>
              <div className={styles.historialList}>
                <p>Historial de liquidaciones realizadas</p>
              </div>
            </div>
          </div>
        );  

      default:
        return (
          <div className={styles.sectionContainer}>
            <div className={styles.contentBox}>
              <LuzFuerza onSubmit={handleSubmitLuzFuerza} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.liquidacionesContainer}>
      <Header />
      <main className={styles.mainContent}>
        {renderContent()}
      </main>
    </div>
  );
}

export default Liquidaciones;
