import { describe, it, expect } from 'vitest';

// ─── Lógica de validación de teléfono ───────────────────────────────────────

function isValidVenezuelanPhone(phone: string): boolean {
  return /^\+58\d{10}$/.test(phone);
}

describe('Validación de teléfono venezolano (Bug 7)', () => {
  it('acepta +58 seguido de 10 dígitos', () => {
    expect(isValidVenezuelanPhone('+584121234567')).toBe(true);
    expect(isValidVenezuelanPhone('+582121234567')).toBe(true);
  });

  it('rechaza sin prefijo +58', () => {
    expect(isValidVenezuelanPhone('04121234567')).toBe(false);
    expect(isValidVenezuelanPhone('4121234567')).toBe(false);
  });

  it('rechaza con menos de 10 dígitos tras +58', () => {
    expect(isValidVenezuelanPhone('+5841212345')).toBe(false);
  });

  it('rechaza con más de 10 dígitos tras +58', () => {
    expect(isValidVenezuelanPhone('+584121234567890')).toBe(false);
  });

  it('rechaza letras o caracteres especiales', () => {
    expect(isValidVenezuelanPhone('+58abc1234567')).toBe(false);
    expect(isValidVenezuelanPhone('+58-412-123-4567')).toBe(false);
  });

  it('campo vacío no es válido', () => {
    expect(isValidVenezuelanPhone('')).toBe(false);
  });
});

// ─── Lógica de clamping de peso ──────────────────────────────────────────────

const WEIGHT_LIMITS: Record<string, { min: number; max: number }> = {
  perro:  { min: 0.5,  max: 120 },
  gato:   { min: 0.5,  max: 12  },
  conejo: { min: 0.3,  max: 8   },
  ave:    { min: 0.01, max: 2   },
  reptil: { min: 0.05, max: 150 },
};

function clampWeight(value: string, species: string): string {
  const limits = WEIGHT_LIMITS[species];
  if (!limits || value === '') return value;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num > limits.max) return String(limits.max);
  if (num < limits.min) return String(limits.min);
  return value;
}

describe('Clamping de peso (Bug 9)', () => {
  it('clampea al máximo si se supera', () => {
    expect(clampWeight('999', 'gato')).toBe('12');
    expect(clampWeight('200', 'perro')).toBe('120');
  });

  it('clampea al mínimo si se está por debajo', () => {
    expect(clampWeight('0.1', 'gato')).toBe('0.5');
  });

  it('no modifica valores dentro del rango', () => {
    expect(clampWeight('5', 'gato')).toBe('5');
    expect(clampWeight('50', 'perro')).toBe('50');
  });

  it('no modifica campo vacío', () => {
    expect(clampWeight('', 'perro')).toBe('');
  });
});
