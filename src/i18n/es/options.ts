import type { options as en } from '../en/options';

export const options: Record<keyof typeof en, string> = {
  title: 'Ajustes',
  settings: 'Ajustes',
  language: 'Idioma',
  backup: 'Copia de seguridad',
  exportSave: 'Exportar',
  importSave: 'Importar',
  save: 'Partida',
  newGame: 'Partida nueva',
  newGameConfirm: '¿Empezar una PARTIDA NUEVA? Se borra todo el progreso (etapa, equipo, oro y mejoras) y no se puede deshacer.',
  importConfirm: '¿Importar esta partida? SUSTITUYE tu progreso actual y recarga el juego.',
  exportFailed: 'No se ha podido exportar: {message}',
  importFailed: 'No se ha podido importar: {message}',
};
