import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.scss';

function Header() {
  const navigate = useNavigate();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = () => {
    // Aquí puedes agregar la lógica de cierre de sesión
    navigate('/login');
  };

  // Cambiamos para que el menú se mantenga visible al hacer click
  const handleMenuClick = () => {
    setMenuVisible(!menuVisible);
  };

  // Manejador para las opciones del menú
  const handleOptionClick = (route) => {
    navigate(route);
    setMenuVisible(false); // Cerramos el menú después de seleccionar una opción
  };

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <div className={styles.buttonGroup}>
          <div className={styles.dropdown}>
            <button 
              className={`${styles.navButton} ${menuVisible ? styles.active : ''}`}
              onClick={handleMenuClick}
            >
              Liquidaciónes ▼
            </button>
            {menuVisible && (
              <div className={styles.dropdownMenu}>
                <button 
                  onClick={() => handleOptionClick('/Luz y fuerza')} 
                  className={styles.dropdownItem}
                >
                  Luz y fuerza
                </button>
                <button 
                  onClick={() => handleOptionClick('/Uocra')} 
                  className={styles.dropdownItem}
                >
                  Uocra
                </button>
                <button 
                  onClick={() => handleOptionClick('/historial')} 
                  className={styles.dropdownItem}
                >
                  Historial
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/convenios')}
            className={styles.navButton}
          >
            Convenios
          </button>
          <button
            onClick={() => navigate('/empleados')}
            className={styles.navButton}
          >
            Empleados
          </button>
          <button 
            onClick={() => navigate('/panel-control')}
            className={styles.navButton}
          >
            Panel de Control
          </button>
          <button 
            onClick={handleLogout}
            className={`${styles.navButton} ${styles.logoutButton}`}
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Header;
