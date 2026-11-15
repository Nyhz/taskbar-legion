import type { chests as en } from '../en/chests';

export const chests: Record<keyof typeof en, string> = {
  normal: 'Cofre común',
  stageBoss: 'Cofre de jefe de etapa',
  zoneBoss: 'Cofre de jefe de mundo',
};
