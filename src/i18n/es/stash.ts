import type { stash as en } from '../en/stash';

export const stash: Record<keyof typeof en, string> = {
  title: 'Alijo',
  close: 'Cerrar',
  howTo: 'Haz clic en una pieza, o arrástrala, para llevarla a la bolsa.',
  full: 'El alijo está lleno.',
  page: 'Página {n}',
  pageBuy: 'Clic para comprarla.',
  price: 'Precio',
  goldAmount: '{amount} de oro',
  short: 'Te faltan {amount} de oro.',
  filterAll: 'Todo',
  filterArmor: 'Armadura',
  filterWeapon: 'Armas',
  filterJewelry: 'Joyas',
  filterGems: 'Gemas',
  sort: 'Ordenar por rareza',
  slotMax: 'Máx.',
  slotTitle: 'Un hueco más en cada página',
  slotsPerPage: 'Huecos por página',
  toBag: 'Enviar a la bolsa',
  bagFull: 'Bolsa llena',
};
