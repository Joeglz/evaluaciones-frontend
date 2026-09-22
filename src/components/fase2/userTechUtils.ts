import type { Posicion } from '../../services/api';

const TOKENS_LIDER_ENTRENADOR = ['lider', 'líder', 'entrenador'];
const ROLES_STAFF = new Set(['ADMIN', 'ENTRENADOR', 'SUPERVISOR']);

export function usuarioVeTodasLasTechs(
  role: string,
  posicionIds: number[],
  posiciones: Posicion[],
): boolean {
  if (ROLES_STAFF.has(role)) {
    return true;
  }
  return posicionIds.some((pid) => {
    const nombre = (posiciones.find((p) => p.id === pid)?.name ?? '').toLowerCase();
    return TOKENS_LIDER_ENTRENADOR.some((token) => nombre.includes(token));
  });
}
