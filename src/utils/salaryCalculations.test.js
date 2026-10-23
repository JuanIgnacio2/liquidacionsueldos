import { canEditConceptQuantity, buildAguinaldoConcepts, buildVacacionesConcepts } from './salaryCalculations';
import { buildConceptPayload } from './conceptosUtils';

describe('canEditConceptQuantity', () => {
  it('permite editar cantidad de Personal de Turno en Luz y Fuerza', () => {
    const concept = {
      tipo: 'HORA_EXTRA_LYF',
      nombre: 'Personal de Turno',
      id: 99,
    };

    expect(canEditConceptQuantity(concept, 'LUZ_Y_FUERZA')).toBe(true);
  });

  it('mantiene cantidad fija para conceptos manuales', () => {
    const concept = {
      tipo: 'CONCEPTO_MANUAL_LYF',
      nombre: 'Concepto manual',
    };

    expect(canEditConceptQuantity(concept, 'LUZ_Y_FUERZA')).toBe(false);
  });
});

describe('buildAguinaldoConcepts', () => {
  it('incluye descuentos asignados y resta su monto al aguinaldo', () => {
    const resultado = buildAguinaldoConcepts(50000, [
      { uid: 11, tipo: 'DESCUENTO', nombre: 'Ley 19032', total: -2500 },
      { uid: 12, tipo: 'DESCUENTO', nombre: 'Otro descuento', total: -1500 },
    ]);

    expect(resultado.length).toBe(3);
    expect(resultado[0].tipo).toBe('CONCEPTO_GENERAL');
    expect(buildConceptPayload(resultado[0])).toMatchObject({
      tipoConcepto: 'CONCEPTO_GENERAL',
      idReferencia: 1,
    });
    expect(resultado[1].tipo).toBe('DESCUENTO');
    expect(resultado.reduce((sum, item) => sum + (item.total || 0), 0)).toBe(46000);
  });
});

describe('buildVacacionesConcepts', () => {
  it('calcula descuentos sobre el monto de vacaciones y resta su total', () => {
    const resultado = buildVacacionesConcepts(50000, [
      { uid: 21, tipo: 'DESCUENTO', nombre: 'Aporte', porcentaje: 3 },
      { uid: 22, tipo: 'DESCUENTO_LYF', nombre: 'Cuota fija', montoUnitario: 1200 },
    ]);

    expect(resultado[0]).toMatchObject({ tipo: 'CONCEPTO_GENERAL', id: 2, total: 50000 });
    expect(resultado[1].total).toBe(-1500);
    expect(resultado[2].total).toBe(-1200);
    expect(resultado.reduce((sum, concepto) => sum + concepto.total, 0)).toBe(47300);
    expect(resultado.map(buildConceptPayload)).toMatchObject([
      { tipoConcepto: 'CONCEPTO_GENERAL', idReferencia: 2, total: 50000 },
      { tipoConcepto: 'DESCUENTO', total: -1500 },
      { tipoConcepto: 'DESCUENTO_LYF', total: -1200 },
    ]);
  });
});
