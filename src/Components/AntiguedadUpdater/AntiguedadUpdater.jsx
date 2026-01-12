import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { actualizarAntiguedadAutomatica } from '../../services/antiguedadService';

/**
 * Componente que actualiza automáticamente las unidades del concepto "Bonif Antigüedad"
 * para empleados de LUZ_Y_FUERZA cuando cumplen un año más en la empresa.
 * 
 * La antigüedad se calcula dinámicamente (no se guarda), solo se actualiza
 * la cantidad del concepto cuando los años completos cambian.
 * 
 * Se ejecuta:
 * - Al iniciar la aplicación (si el usuario está autenticado)
 * - Cada hora para verificar si algún empleado cumplió un año más
 */
export function AntiguedadUpdater() {
  const { isAuthenticated } = useAuth();
  const lastUpdateMonthRef = useRef(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Función para verificar y actualizar si es necesario
    const checkAndUpdate = async () => {
      // Evitar múltiples ejecuciones simultáneas
      if (isUpdatingRef.current) {
        return;
      }

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthKey = `${currentYear}-${currentMonth}`;

      // Si ya se actualizó este mes, no hacer nada
      if (lastUpdateMonthRef.current === monthKey) {
        return;
      }

      // Verificar si cambió el mes desde la última actualización
      if (lastUpdateMonthRef.current !== null) {
        // Ya se ejecutó antes, verificar si cambió el mes
        const lastUpdate = lastUpdateMonthRef.current.split('-');
        const lastYear = parseInt(lastUpdate[0], 10);
        const lastMonth = parseInt(lastUpdate[1], 10);
        
        // Si es el mismo mes, no actualizar
        if (lastYear === currentYear && lastMonth === currentMonth) {
          return;
        }
      }

      // Marcar como actualizando
      isUpdatingRef.current = true;

      try {
        console.log('Verificando actualización de unidades de "Bonif Antigüedad"...');
        const result = await actualizarAntiguedadAutomatica();
        if (result.updated > 0) {
          console.log(`Actualización completada: ${result.updated} empleado(s) con unidades actualizadas, ${result.errors} error(es)`);
        }
        
        // Guardar el mes de la última actualización
        lastUpdateMonthRef.current = monthKey;
        
        // Guardar en localStorage para persistir entre sesiones
        localStorage.setItem('antiguedadLastUpdate', monthKey);
      } catch (error) {
        console.error('Error en actualización automática de antigüedad:', error);
      } finally {
        isUpdatingRef.current = false;
      }
    };

    // Cargar la última actualización desde localStorage
    const savedUpdate = localStorage.getItem('antiguedadLastUpdate');
    if (savedUpdate) {
      lastUpdateMonthRef.current = savedUpdate;
    }

    // Ejecutar inmediatamente al montar (si el usuario está autenticado)
    checkAndUpdate();

    // Verificar cada hora si cambió el mes
    const intervalId = setInterval(() => {
      checkAndUpdate();
    }, 60 * 60 * 1000); // Cada hora

    // Limpiar el intervalo al desmontar
    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  // Este componente no renderiza nada
  return null;
}

