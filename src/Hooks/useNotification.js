/**
 * Hook para usar notificaciones de forma fácil
 * 
 * @example
 * const notify = useNotification();
 * notify.success('Liquidación realizada');
 * notify.error('Error al procesar');
 * notify.info('Información importante');
 * notify.warning('Advertencia');
 */

export const useNotification = () => {
  return {
    success: (message, duration = 4000) => {
      if (window.showNotification) {
        window.showNotification(message, 'success', duration);
      }
    },
    error: (message, duration = 4000) => {
      if (window.showNotification) {
        window.showNotification(message, 'error', duration);
      }
    },
    info: (message, duration = 4000) => {
      if (window.showNotification) {
        window.showNotification(message, 'info', duration);
      }
    },
    warning: (message, duration = 4000) => {
      if (window.showNotification) {
        window.showNotification(message, 'warning', duration);
      }
    }
  };
};

