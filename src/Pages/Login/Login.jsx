import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.scss';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      navigate('/inicio');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h1 className={styles.mainTitle}>Cooperativa 25 de Mayo Ltda</h1>
      <div className={styles.loginCard}>
        <div className={styles.imageSection}>
          <div className={styles.characterImage}></div>
        </div>
        <div className={styles.formSection}>
          <h2>Ingresa a tu cuenta</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label>Email</label>
              <input
                type="email"
                placeholder="ejemplo@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Contraseña</label>
              <div className={styles.passwordInput}>
                <input
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className={styles.eyeIcon}>
                  👁️
                </button>
              </div>
            </div>
            <div className={styles.rememberMe}>
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Permanecer conectado</label>
            </div>
            <button type="submit" className={styles.loginButton}>
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;