import type { tech as en } from '../en/tech';

export const tech: Record<keyof typeof en, string> = {
  title: 'Mejoras',
  close: 'Cerrar',
  gold: 'Oro',
  groupDrops: 'Cofres · botín',
  groupStorage: 'Cofres · almacén',
  rank: 'Rango',
  now: 'Ahora',
  next: 'Siguiente rango',
  cost: 'Coste',
  short: 'Te faltan {amount} de oro.',
  growth: 'Cada rango cuesta ×{factor} el anterior.',
  buyHint: 'Clic en el precio para comprar un rango.',
  complete: 'Completa',
  locked: 'Bloqueada',
  buy: 'Comprar un rango de {name} por {amount} de oro',
  unitSlots: '{n} huecos',
  unitHeroes: '{n} héroes',
  unitEvery: 'cada {time}',
};
