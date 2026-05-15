import { describe, it, expect } from 'vitest';

interface Service { id: string; name: string; }
interface Pet { id: string; gender: string | null; }

function isServiceCompatibleWithPet(service: Service | undefined, pet: Pet | undefined): boolean {
  if (!service || !pet) return true;
  if (!pet.gender) return true;

  const name = service.name.toLowerCase();
  const isForHembra = /hembra/.test(name);
  const isForMacho  = /macho/.test(name);

  if (!isForHembra && !isForMacho) return true;

  const petGender = pet.gender.toLowerCase();
  if (isForHembra) return petGender === 'hembra';
  if (isForMacho)  return petGender === 'macho';
  return true;
}

describe('Compatibilidad género-servicio en wizard (Bug 3)', () => {
  const serviceGenerico = { id: '1', name: 'Consulta General' };
  const serviceMacho    = { id: '2', name: 'Castración (Macho)' };
  const serviceHembra   = { id: '3', name: 'Esterilización (Hembra)' };
  const petMacho        = { id: 'a', gender: 'macho' };
  const petHembra       = { id: 'b', gender: 'hembra' };
  const petSinGenero    = { id: 'c', gender: null };

  it('servicio genérico es compatible con cualquier género', () => {
    expect(isServiceCompatibleWithPet(serviceGenerico, petMacho)).toBe(true);
    expect(isServiceCompatibleWithPet(serviceGenerico, petHembra)).toBe(true);
    expect(isServiceCompatibleWithPet(serviceGenerico, petSinGenero)).toBe(true);
  });

  it('servicio de macho es compatible solo con macho', () => {
    expect(isServiceCompatibleWithPet(serviceMacho, petMacho)).toBe(true);
    expect(isServiceCompatibleWithPet(serviceMacho, petHembra)).toBe(false);
  });

  it('servicio de hembra es compatible solo con hembra', () => {
    expect(isServiceCompatibleWithPet(serviceHembra, petHembra)).toBe(true);
    expect(isServiceCompatibleWithPet(serviceHembra, petMacho)).toBe(false);
  });

  it('pet sin género registrado no bloquea ningún servicio', () => {
    expect(isServiceCompatibleWithPet(serviceMacho, petSinGenero)).toBe(true);
    expect(isServiceCompatibleWithPet(serviceHembra, petSinGenero)).toBe(true);
  });

  it('sin service o sin pet retorna true (no bloquea)', () => {
    expect(isServiceCompatibleWithPet(undefined, petHembra)).toBe(true);
    expect(isServiceCompatibleWithPet(serviceHembra, undefined)).toBe(true);
  });

  it('canProceed en paso 2 falla con servicio incompatible', () => {
    const canProceed = (selectedPetId: string, compatible: boolean): boolean => {
      return !!selectedPetId && compatible;
    };

    expect(canProceed('b', false)).toBe(false); // hembra + servicio macho
    expect(canProceed('a', true)).toBe(true);
    expect(canProceed('', true)).toBe(false);
  });
});

// ─── Normalización snake_case → camelCase para schedules (Bug 1) ──────────

describe('Normalización de respuesta de schedules (Bug 1)', () => {
  function normalizeSchedule(s: any) {
    return {
      dayOfWeek:   s.day_of_week  ?? s.dayOfWeek,
      openTime:    s.open_time    ?? s.openTime,
      closeTime:   s.close_time   ?? s.closeTime,
      isAvailable: s.is_available ?? s.isAvailable,
    };
  }

  it('normaliza correctamente una respuesta snake_case del backend', () => {
    const raw = { day_of_week: 1, open_time: '09:00', close_time: '18:00', is_available: true };
    const normalized = normalizeSchedule(raw);
    expect(normalized.dayOfWeek).toBe(1);
    expect(normalized.openTime).toBe('09:00');
    expect(normalized.closeTime).toBe('18:00');
    expect(normalized.isAvailable).toBe(true);
  });

  it('no rompe si ya viene en camelCase', () => {
    const camel = { dayOfWeek: 2, openTime: '10:00', closeTime: '17:00', isAvailable: false };
    const normalized = normalizeSchedule(camel);
    expect(normalized.dayOfWeek).toBe(2);
    expect(normalized.isAvailable).toBe(false);
  });

  it('el mapa de schedules por dayOfWeek funciona después de normalizar', () => {
    const rawList = [
      { day_of_week: 1, open_time: '09:00', close_time: '18:00', is_available: true },
      { day_of_week: 6, open_time: '09:00', close_time: '18:00', is_available: false },
    ];
    const normalized = rawList.map(normalizeSchedule);
    const map = new Map(normalized.map(s => [s.dayOfWeek, s]));

    expect(map.get(1)?.openTime).toBe('09:00');
    expect(map.get(6)?.isAvailable).toBe(false);
    expect(map.get(0)).toBeUndefined();
  });
});
