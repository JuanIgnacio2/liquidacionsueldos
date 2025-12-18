import axiosClient from './axiosClient';

/**
 * Servicio de autenticación
 * Maneja login, logout y verificación de token
 */
export const authAPI = {
  /**
   * Inicia sesión con username y contraseña
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   * @returns {Promise} Respuesta con token y datos del usuario
   */
  login: async (username, password) => {
    try {
      const response = await axiosClient.post('/auth/login', {
        username,
        password,
      });
      
      // Guardar token en localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        // Guardar datos del usuario si vienen en la respuesta
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Verifica si el token actual es válido
   * @returns {Promise} Respuesta con estado de validez del token
   */
  verifyToken: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return { valid: false };
      }

      const response = await axiosClient.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return { valid: true, user: response.data.user || null };
    } catch (error) {
      // Si el token no es válido, limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { valid: false };
    }
  },

  /**
   * Cierra sesión
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Obtiene el token almacenado
   * @returns {string|null} Token o null si no existe
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Obtiene los datos del usuario almacenados
   * @returns {object|null} Datos del usuario o null si no existe
   */
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};
