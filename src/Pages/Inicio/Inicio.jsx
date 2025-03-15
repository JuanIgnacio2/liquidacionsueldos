import Header from '../../Components/Header/Header';
import styles from './Inicio.module.scss';

function Inicio() {
  return (
    <div className={styles.inicioContainer}>
      <Header />
      <main className={styles.mainContent}>
        <h1>Bienvenidos a la Cooperativa 25 de Mayo</h1>
        <div className={styles.contentSection}>
          {/* Aquí puedes agregar el contenido principal */}
        </div>
      </main>
    </div>
  );
}

export default Inicio;