const ROLES_STAFF = new Set(['ADMIN', 'ENTRENADOR', 'SUPERVISOR']);

/** Catálogo completo solo por rol staff (no por nombre de posición). */
export function usuarioVeTodasLasTechs(role: string): boolean {
  return ROLES_STAFF.has(role);
}
