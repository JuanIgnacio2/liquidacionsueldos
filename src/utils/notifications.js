/**
 * Utilidades para notificaciones y confirmaciones
 * 
 * Este archivo exporta funciones helper para usar el sistema de notificaciones
 * y confirmaciones de forma fácil en cualquier parte de la aplicación.
 */

/**
 * Muestra una notificación de éxito
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en milisegundos (default: 5000)
 */
export const notifySuccess = (message, duration = 5000) => {
  if (window.showNotification) {
    window.showNotification(message, 'success', duration);
  }
};

/**
 * Muestra una notificación de error
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en milisegundos (default: 5000)
 */
export const notifyError = (message, duration = 5000) => {
  if (window.showNotification) {
    window.showNotification(message, 'error', duration);
  }
};

/**
 * Muestra una notificación de información
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en milisegundos (default: 5000)
 */
export const notifyInfo = (message, duration = 5000) => {
  if (window.showNotification) {
    window.showNotification(message, 'info', duration);
  }
};

/**
 * Muestra una notificación de advertencia
 * @param {string} message - Mensaje a mostrar
 * @param {number} duration - Duración en milisegundos (default: 5000)
 */
export const notifyWarning = (message, duration = 5000) => {
  if (window.showNotification) {
    window.showNotification(message, 'warning', duration);
  }
};

/**
 * Muestra un diálogo de confirmación
 * @param {Object} options - Opciones del diálogo
 * @param {string} options.title - Título del diálogo (default: 'Confirmar acción')
 * @param {string} options.message - Mensaje del diálogo (default: '¿Está seguro de realizar esta acción?')
 * @param {string} options.confirmText - Texto del botón de confirmar (default: 'Confirmar')
 * @param {string} options.cancelText - Texto del botón de cancelar (default: 'Cancelar')
 * @param {string} options.type - Tipo: 'warning', 'danger', 'info', 'success' (default: 'warning')
 * @param {string} options.confirmButtonVariant - Variante del botón confirmar: 'primary', 'success', 'cancel' (default: 'primary')
 * @param {string} options.cancelButtonVariant - Variante del botón cancelar: 'secondary', 'outline' (default: 'secondary')
 * @returns {Promise<boolean>} - true si el usuario confirmó, false si canceló
 * 
 * @example
 * const confirmed = await confirmAction({
 *   title: 'Eliminar empleado',
 *   message: '¿Está seguro de eliminar este empleado? Esta acción no se puede deshacer.',
 *   confirmText: 'Eliminar',
 *   cancelText: 'Cancelar',
 *   type: 'danger',
 *   confirmButtonVariant: 'cancel'
 * });
 * 
 * if (confirmed) {
 *   // Eliminar empleado
 * }
 */
export const confirmAction = async (options = {}) => {
  if (window.showConfirm) {
    return await window.showConfirm(options);
  }
  return false;
};

