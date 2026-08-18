import { createNotificationKey, shouldDisplayNotification } from './NotificationSystem';

describe('NotificationSystem deduplication', () => {
  it('genera la misma clave para el mismo mensaje y tipo', () => {
    expect(createNotificationKey('Error de prueba', 'error')).toBe('error:error de prueba');
  });

  it('no muestra la misma notificación duplicada dentro del mismo rango', () => {
    const existing = [{ message: 'Error de prueba', type: 'error' }];

    expect(shouldDisplayNotification('Error de prueba', 'error', existing)).toBe(false);
    expect(shouldDisplayNotification('Otro error', 'error', existing)).toBe(true);
  });
});
