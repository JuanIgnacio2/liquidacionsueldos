# Sistema de Notificaciones y Confirmaciones

Sistema completo de notificaciones y confirmaciones personalizable que sigue el estilo del proyecto.

## Características

- ✅ Notificaciones con 4 tipos: success, error, warning, info
- ✅ Confirmaciones personalizables con diferentes tipos
- ✅ Animaciones suaves con Framer Motion
- ✅ Diseño responsive
- ✅ Estilos personalizables que siguen el tema del proyecto
- ✅ Fácil de usar con hooks o funciones helper

## Uso de Notificaciones

### Opción 1: Usando el hook `useNotification`

```jsx
import { useNotification } from '../../hooks/useNotification';

function MiComponente() {
  const notify = useNotification();

  const handleSuccess = () => {
    notify.success('Liquidación realizada exitosamente');
  };

  const handleError = () => {
    notify.error('Error al procesar la liquidación');
  };

  const handleInfo = () => {
    notify.info('Información importante');
  };

  const handleWarning = () => {
    notify.warning('Advertencia: verifique los datos');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Éxito</button>
      <button onClick={handleError}>Error</button>
      <button onClick={handleInfo}>Info</button>
      <button onClick={handleWarning}>Advertencia</button>
    </div>
  );
}
```

### Opción 2: Usando funciones helper

```jsx
import { notifySuccess, notifyError, notifyInfo, notifyWarning } from '../../utils/notifications';

function MiComponente() {
  const handleAction = () => {
    notifySuccess('Liquidación realizada');
    // o
    notifyError('Error al procesar');
    // o
    notifyInfo('Información');
    // o
    notifyWarning('Advertencia');
  };
}
```

### Opción 3: Usando la función global (compatible con código existente)

```jsx
// Compatible con el código existente
window.showNotification('Liquidación realizada', 'success');
window.showNotification('Error al procesar', 'error');
window.showNotification('Información', 'info');
window.showNotification('Advertencia', 'warning');
```

### Personalizar duración

```jsx
const notify = useNotification();

// Notificación que dura 10 segundos
notify.success('Mensaje importante', 10000);

// Notificación permanente (hasta que el usuario la cierre)
notify.error('Error crítico', 0);
```

## Uso de Confirmaciones

### Opción 1: Usando el hook `useConfirm`

```jsx
import { useConfirm } from '../../hooks/useConfirm';

function MiComponente() {
  const confirm = useConfirm();

  const handleDelete = async () => {
    const result = await confirm({
      title: 'Eliminar empleado',
      message: '¿Está seguro de eliminar este empleado? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      confirmButtonVariant: 'cancel'
    });

    if (result) {
      // Usuario confirmó
      console.log('Eliminando empleado...');
    } else {
      // Usuario canceló
      console.log('Operación cancelada');
    }
  };

  return <button onClick={handleDelete}>Eliminar</button>;
}
```

### Opción 2: Usando función helper

```jsx
import { confirmAction } from '../../utils/notifications';

async function handleAction() {
  const confirmed = await confirmAction({
    title: 'Confirmar liquidación',
    message: '¿Está seguro de procesar la liquidación?',
    confirmText: 'Procesar',
    cancelText: 'Cancelar',
    type: 'warning'
  });

  if (confirmed) {
    // Procesar liquidación
  }
}
```

### Opción 3: Usando la función global

```jsx
const result = await window.showConfirm({
  title: 'Confirmar acción',
  message: '¿Está seguro?',
  confirmText: 'Sí',
  cancelText: 'No',
  type: 'warning'
});
```

## Opciones de Confirmación

```typescript
{
  title?: string;              // Título del diálogo (default: 'Confirmar acción')
  message?: string;              // Mensaje del diálogo (default: '¿Está seguro de realizar esta acción?')
  confirmText?: string;          // Texto del botón confirmar (default: 'Confirmar')
  cancelText?: string;          // Texto del botón cancelar (default: 'Cancelar')
  type?: 'warning' | 'danger' | 'info' | 'success';  // Tipo de ícono (default: 'warning')
  confirmButtonVariant?: 'primary' | 'success' | 'cancel';  // Variante del botón confirmar (default: 'primary')
  cancelButtonVariant?: 'secondary' | 'outline';    // Variante del botón cancelar (default: 'secondary')
}
```

## Ejemplos Completos

### Ejemplo 1: Notificación después de una acción exitosa

```jsx
import { useNotification } from '../../hooks/useNotification';

function ProcesarLiquidacion() {
  const notify = useNotification();

  const procesar = async () => {
    try {
      await procesarLiquidacion();
      notify.success('Liquidación realizada exitosamente');
    } catch (error) {
      notify.error('Error al procesar la liquidación');
    }
  };

  return <button onClick={procesar}>Procesar</button>;
}
```

### Ejemplo 2: Confirmación antes de eliminar

```jsx
import { useConfirm } from '../../hooks/useConfirm';
import { useNotification } from '../../hooks/useNotification';

function EliminarEmpleado({ empleadoId }) {
  const confirm = useConfirm();
  const notify = useNotification();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Eliminar empleado',
      message: `¿Está seguro de eliminar al empleado? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      confirmButtonVariant: 'cancel'
    });

    if (confirmed) {
      try {
        await eliminarEmpleado(empleadoId);
        notify.success('Empleado eliminado exitosamente');
      } catch (error) {
        notify.error('Error al eliminar el empleado');
      }
    }
  };

  return <button onClick={handleDelete}>Eliminar</button>;
}
```

### Ejemplo 3: Confirmación con diferentes tipos

```jsx
const confirm = useConfirm();

// Confirmación de advertencia (default)
await confirm({
  title: 'Confirmar acción',
  message: '¿Está seguro?',
  type: 'warning'
});

// Confirmación de peligro
await confirm({
  title: 'Eliminar permanentemente',
  message: 'Esta acción no se puede deshacer',
  type: 'danger',
  confirmButtonVariant: 'cancel'
});

// Confirmación informativa
await confirm({
  title: 'Información',
  message: '¿Desea continuar?',
  type: 'info'
});

// Confirmación de éxito
await confirm({
  title: 'Confirmar operación',
  message: '¿Proceder con la operación?',
  type: 'success'
});
```

## Personalización de Estilos

Los estilos están en:
- `NotificationSystem.scss` - Estilos de notificaciones
- `ConfirmDialog.scss` - Estilos de confirmaciones

Ambos archivos importan las variables de `main.scss`, por lo que seguirán automáticamente el tema del proyecto.

## Notas

- Las notificaciones se muestran en la esquina superior derecha
- Las confirmaciones se muestran como un modal centrado
- Las notificaciones se cierran automáticamente después de la duración especificada (default: 5 segundos)
- Las confirmaciones requieren acción del usuario (no se cierran automáticamente)
- Se puede cerrar una confirmación presionando Escape o haciendo clic fuera del diálogo

