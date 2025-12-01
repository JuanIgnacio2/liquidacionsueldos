/**
 * Hook para usar confirmaciones de forma fácil
 * 
 * @example
 * const confirm = useConfirm();
 * const result = await confirm({
 *   title: 'Eliminar empleado',
 *   message: '¿Está seguro de eliminar este empleado?',
 *   confirmText: 'Eliminar',
 *   cancelText: 'Cancelar',
 *   type: 'danger'
 * });
 * if (result) {
 *   // Usuario confirmó
 * }
 */
export const useConfirm = () => {
  return async (options) => {
    if (window.showConfirm) {
      return await window.showConfirm(options);
    }
    return false;
  };
};

