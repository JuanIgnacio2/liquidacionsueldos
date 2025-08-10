import { useNavigate } from 'react-router-dom';
import styles from './PanelDeControl.module.scss';
import Header from '../../Components/Header/Header';

function PanelDeControl() {
  const navigate = useNavigate();

  return (
    <div className={styles.panelContainer}>
      <Header />
      <main className={styles.mainContent}>
        <h1 className={styles.title}>Panel de Control</h1>
        <div className={styles.cardsContainer}>
          <div 
            className={styles.card}
            onClick={() => navigate('/empleados')}
          >
            <div className={styles.cardIcon}>
              👥
            </div>
            <h2>Empleados</h2>
            <p>Gestión de empleados y personal</p>
          </div>

          <div 
            className={styles.card}
            onClick={() => navigate('/obras')}
          >
            <div className={styles.cardIcon}>
              🏗️
            </div>
            <h2>Obras</h2>
            <p>Control y seguimiento de obras</p>
          </div>

          <div 
            className={styles.card}
            onClick={() => navigate('/configuracion')}
          >
            <div className={styles.cardIcon}>
              ⚙️
            </div>
            <h2>Configuración</h2>
            <p>Ajustes del sistema</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PanelDeControl;
