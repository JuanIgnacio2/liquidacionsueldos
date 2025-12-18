/**
 * Hook para usar confirmaciones de forma fácil
 * 
 * @example
 * const confirm = useConfirm();
 * 
 * // Uso básico
 * const result = await confirm({
 *   title: 'Eliminar empleado',
 *   message: '¿Está seguro de eliminar este empleado?',
 *   confirmText: 'Eliminar',
 *   cancelText: 'Cancelar',
 *   type: 'danger'
 * });
 * if (result) {
 *   // Usuario confirmó
 *   await eliminarEmpleado();
 * }
 * 
 * // Uso con opciones personalizadas
 * const result = await confirm({
 *   title: 'Guardar cambios',
 *   message: '¿Desea guardar los cambios realizados?',
 *   confirmText: 'Guardar',
 *   cancelText: 'Descartar',
 *   type: 'warning',
 *   confirmButtonVariant: 'success',
 *   cancelButtonVariant: 'secondary'
 * });
 * 
 * @returns {Function} Función que muestra el diálogo de confirmación
 */
export const useConfirm = () => {
  /**
   * Muestra un diálogo de confirmación
   * 
   * @param {Object} options - Opciones del diálogo
   * @param {string} options.title - Título del diálogo (default: 'Confirmar acción')
   * @param {string} options.message - Mensaje del diálogo (default: '¿Está seguro de realizar esta acción?')
   * @param {string} options.confirmText - Texto del botón de confirmación (default: 'Confirmar')
   * @param {string} options.cancelText - Texto del botón de cancelación (default: 'Cancelar')
   * @param {string} options.type - Tipo de diálogo: 'warning', 'danger', 'success', 'info' (default: 'warning')
   * @param {string} options.confirmButtonVariant - Variante del botón de confirmación: 'primary', 'success', 'danger', etc. (default: 'primary')
   * @param {string} options.cancelButtonVariant - Variante del botón de cancelación: 'secondary', 'outline', etc. (default: 'secondary')
   * @returns {Promise<boolean>} Promise que se resuelve con true si el usuario confirma, false si cancela
   */
  return async (options = {}) => {
    // Validar que el componente ConfirmDialog esté disponible
    if (!window.showConfirm) {
      console.warn('ConfirmDialog no está disponible. Asegúrate de que el componente ConfirmDialog esté montado en tu aplicación.');
      // Fallback: usar confirm nativo del navegador
      const fallbackMessage = options.message || options.title || '¿Está seguro de realizar esta acción?';
      return window.confirm(fallbackMessage);
    }

    try {
      return await window.showConfirm(options);
    } catch (error) {
      console.error('Error al mostrar diálogo de confirmación:', error);
      return false;
    }
  };
};

