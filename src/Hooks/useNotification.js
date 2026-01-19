/**
 * Función helper para extraer mensajes de error del backend
 * @param {Error|string|object} error - Error de axios, string o objeto
 * @returns {string} - Mensaje de error extraído
 */
const extractErrorMessage = (error) => {
  // Si es un string, devolverlo directamente
  if (typeof error === 'string') {
    return error;
  }

  // Si es un objeto de error de axios
  if (error?.response) {
    const data = error.response.data;
    
    // Intentar extraer el mensaje del backend
    if (data) {
      // Si data es un string, usarlo directamente
      if (typeof data === 'string') {
        return data;
      }
      
      // Si data tiene un campo 'message', usarlo
      if (data.message) {
        return data.message;
      }
      
      // Si data tiene un campo 'error', usarlo
      if (data.error) {
        return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }
      
      // Si data tiene un campo 'exception', usarlo
      if (data.exception) {
        return data.exception;
      }
      
      // Si data tiene un campo 'detail', usarlo
      if (data.detail) {
        return data.detail;
      }
      
      // Si data es un array de errores, unirlos
      if (Array.isArray(data.errors)) {
        return data.errors.join(', ');
      }
      
      // Si data es un array de objetos con mensajes
      if (Array.isArray(data) && data.length > 0) {
        const messages = data
          .map(item => item.message || item.error || item)
          .filter(Boolean)
          .join(', ');
        if (messages) return messages;
      }
    }
    
    // Si hay un mensaje en el error, usarlo
    if (error.message) {
      return error.message;
    }
    
    // Fallback: mensaje genérico con código de estado
    return `Error del servidor (${error.response.status})`;
  }
  
  // Si es un objeto Error estándar
  if (error instanceof Error) {
    return error.message;
  }
  
  // Si es un objeto con mensaje
  if (error?.message) {
    return error.message;
  }
  
  // Fallback genérico
  return 'Ha ocurrido un error inesperado';
};

/**
 * Hook para usar notificaciones de forma fácil
 * 
 * @example
 * const notify = useNotification();
 * notify.success('Liquidación realizada');
 * notify.error('Error al procesar');
 * notify.error(error); // También acepta objetos de error de axios
 * notify.info('Información importante');
 * notify.warning('Advertencia');
 */

export const useNotification = () => {
  return {
    success: (message, duration = 4000) => {
      if (window.showNotification) {
        const msg = typeof message === 'string' ? message : extractErrorMessage(message);
        window.showNotification(msg, 'success', duration);
      }
    },
    error: (message, duration = 4000) => {
      if (window.showNotification) {
        const msg = typeof message === 'string' ? message : extractErrorMessage(message);
        window.showNotification(msg, 'error', duration);
      }
    },
    info: (message, duration = 4000) => {
      if (window.showNotification) {
        const msg = typeof message === 'string' ? message : extractErrorMessage(message);
        window.showNotification(msg, 'info', duration);
      }
    },
    warning: (message, duration = 4000) => {
      if (window.showNotification) {
        const msg = typeof message === 'string' ? message : extractErrorMessage(message);
        window.showNotification(msg, 'warning', duration);
      }
    }
  };
};

