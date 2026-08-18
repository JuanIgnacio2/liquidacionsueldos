import { canEditConceptQuantity, buildAguinaldoConcepts } from './salaryCalculations';

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
    expect(resultado[0].tipo).toBe('AGUINALDO');
    expect(resultado[1].tipo).toBe('DESCUENTO');
    expect(resultado.reduce((sum, item) => sum + (item.total || 0), 0)).toBe(46000);
  });
});
