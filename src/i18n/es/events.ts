import type { events as en } from '../en/events';

// Los eventos de la tira: el cofre fugitivo y la ventana del mercader errante.
export const events: Record<keyof typeof en, string> = {
  merchantTitle: 'Mercader',
  merchantName: 'Mercader errante',
  merchantHelp: 'Se para un rato detrás del grupo y vende unas pocas cosas, cada una una sola vez. Luego sigue su camino.',
  merchantClose: 'Cerrar',
  merchantLeaves: 'Se va en {s} s',
  buy: 'Comprar',
  buyHelp: 'Cómpralo por {price} de oro. Va a la bolsa (o al alijo si la bolsa está llena).',
  sold: 'Vendido',
  soldHelp: 'Ya lo has comprado.',
  tooPoor: 'No tienes oro suficiente.',
  noRoom: 'No queda sitio en la bolsa ni en el alijo.',
};
