import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../Hooks/useNotification';
import styles from './Login.module.scss';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const notify = useNotification();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      notify.error('Por favor, completa todos los campos');
      return;
    }

    setLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        notify.success('Inicio de sesión exitoso');
        navigate('/');
      } else {
        notify.error(result.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      notify.error('Error inesperado al iniciar sesión');
      console.error('Error en login:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className={styles.loginContainer}>
        <div style={{ textAlign: 'center', color: '#333' }}>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // No mostrar el formulario si ya está autenticado (mientras redirige)
  if (isAuthenticated) {
    return null;
  }

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
              <label>Usuario</label>
              <input
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Contraseña</label>
              <div className={styles.passwordInput}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className={styles.eyeIcon}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className={styles.rememberMe}>
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Permanecer conectado</label>
            </div>
            <button 
              type="submit" 
              className={styles.loginButton}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
