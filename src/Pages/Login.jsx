import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';
import { registerUser } from '../services/empleadosAPI';
import { useNotification } from '../Hooks/useNotification';
import { DollarSign, User, Lock, Mail, UserCircle } from 'lucide-react';
import '../styles/components/_login.scss';

const Login = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Formulario de login
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  // Formulario de registro
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    nombre: '',
    apellido: '',
    email: ''
  });

  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const notify = useNotification();

  const validateLogin = () => {
    const newErrors = {};
    if (!loginData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    }
    if (!loginData.password) {
      newErrors.password = 'La contraseña es requerida';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = () => {
    const newErrors = {};
    if (!registerData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    }
    if (!registerData.password || registerData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!registerData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    if (!registerData.apellido.trim()) {
      newErrors.apellido = 'El apellido es requerido';
    }
    if (!registerData.email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
      newErrors.email = 'El correo no es válido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setLoading(true);
    try {
      const response = await login(loginData.username, loginData.password);
      if (response.token) {
        const usuario = response.usuario || { username: loginData.username };
        authLogin(response.token, usuario);
        
        // Verificar el rol del usuario
        const userRole = usuario.userRol || usuario.rol || usuario.role || usuario.rolUsuario;
        
        if (userRole === 'NEW_USER') {
          // Redirigir a página de espera de autorización
          navigate('/espera-autorizacion');
        } else {
          // Usuario autorizado, redirigir al dashboard
          if (window?.showNotification) {
            window.showNotification('¡Bienvenido!', 'success', 3000);
          }
          navigate('/');
        }
      }
    } catch (error) {
      notify.error(error);
      const errorMessage = error.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;

    setLoading(true);
    try {
      const dto = {
        username: registerData.username,
        password: registerData.password,
        nombre: registerData.nombre,
        apellido: registerData.apellido,
        email: registerData.email
      };
      
      const response = await registerUser(dto);
      if (response.token) {
        const usuario = response.usuario || { 
          username: registerData.username,
          nombre: registerData.nombre,
          apellido: registerData.apellido
        };
        authLogin(response.token, usuario);
        
        // Limpiar campos del formulario después de registro exitoso
        setRegisterData({
          username: '',
          password: '',
          nombre: '',
          apellido: '',
          email: ''
        });
        setErrors({});
        
        // Verificar el rol del usuario
        const userRole = usuario.userRol || usuario.rol || usuario.role || usuario.rolUsuario;
        
        if (userRole === 'NEW_USER') {
          // Redirigir a página de espera de autorización
          if (window?.showNotification) {
            window.showNotification('¡Registro exitoso! Esperando autorización del Administrador.', 'info', 5000);
          }
          navigate('/espera-autorizacion');
        } else {
          // Usuario autorizado (no debería pasar en registro, pero por si acaso)
          if (window?.showNotification) {
            window.showNotification('¡Registro exitoso! Bienvenido.', 'success', 3000);
          }
          navigate('/');
        }
      }
    } catch (error) {
      notify.error(error);
      const errorMessage = error.response?.data?.message || 'Error al registrar usuario. Intenta nuevamente.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value, isRegister = false) => {
    if (isRegister) {
      setRegisterData(prev => ({ ...prev, [field]: value }));
      // Limpiar error del campo cuando el usuario empiece a escribir
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } else {
      setLoginData(prev => ({ ...prev, [field]: value }));
      // Limpiar error del campo cuando el usuario empiece a escribir
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setErrors({});
    setLoginData({ username: '', password: '' });
    setRegisterData({ username: '', password: '', nombre: '', apellido: '', email: '' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <DollarSign className="logo-icon" />
            <h1 className="login-title">Liquidación de Sueldos</h1>
          </div>
          <p className="login-subtitle">
            {isRegisterMode ? 'Crea tu cuenta' : 'Inicia sesión en tu cuenta'}
          </p>
        </div>

        {errors.general && (
          <div className="error-alert">
            {errors.general}
          </div>
        )}

        {!isRegisterMode ? (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label">
                <User className="label-icon" />
                Nombre de Usuario
              </label>
              <input
                type="text"
                className={`form-input ${errors.username ? 'error' : ''}`}
                value={loginData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Ingresa tu nombre de usuario"
                disabled={loading}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock className="label-icon" />
                Contraseña
              </label>
              <input
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                value={loginData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Ingresa tu contraseña"
                disabled={loading}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-login"
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="login-form">
            <div className="form-group">
              <label className="form-label">
                <User className="label-icon" />
                Nombre de Usuario *
              </label>
              <input
                type="text"
                className={`form-input ${errors.username ? 'error' : ''}`}
                value={registerData.username}
                onChange={(e) => handleInputChange('username', e.target.value, true)}
                placeholder="Ingresa un nombre de usuario"
                disabled={loading}
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <UserCircle className="label-icon" />
                Nombre *
              </label>
              <input
                type="text"
                className={`form-input ${errors.nombre ? 'error' : ''}`}
                value={registerData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value, true)}
                placeholder="Ingresa tu nombre"
                disabled={loading}
              />
              {errors.nombre && <span className="error-message">{errors.nombre}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <UserCircle className="label-icon" />
                Apellido *
              </label>
              <input
                type="text"
                className={`form-input ${errors.apellido ? 'error' : ''}`}
                value={registerData.apellido}
                onChange={(e) => handleInputChange('apellido', e.target.value, true)}
                placeholder="Ingresa tu apellido"
                disabled={loading}
              />
              {errors.apellido && <span className="error-message">{errors.apellido}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <Mail className="label-icon" />
                Correo Electrónico *
              </label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                  value={registerData.email}
                onChange={(e) => handleInputChange('email', e.target.value, true)}
                placeholder="correo@ejemplo.com"
                disabled={loading}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <Lock className="label-icon" />
                Contraseña *
              </label>
              <input
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                value={registerData.password}
                onChange={(e) => handleInputChange('password', e.target.value, true)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-login"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>
        )}

        <div className="login-footer">
          <button
            type="button"
            onClick={toggleMode}
            className="btn-link"
            disabled={loading}
          >
            {isRegisterMode
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;