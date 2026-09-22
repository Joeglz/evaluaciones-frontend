import {
  Area,
  User,
  FirmaEvaluacionUsuario,
  EvaluacionUsuario,
} from '../../services/api';

/**
 * Formatea una fecha tipo `YYYY-MM-DD` (sin hora) en formato `d/m/yyyy` (es-ES)
 * sin desplazamientos por zona horaria. `new Date('YYYY-MM-DD')` se interpreta
 * como UTC y, en zonas oeste de UTC (p.ej. UTC-6), termina mostrándose el día
 * anterior. Aquí parseamos los componentes y construimos un Date local.
 */
export const formatFechaIngreso = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-ES');
  }
  return new Date(raw).toLocaleDateString('es-ES');
};

/** True si el resultado alcanza el mínimo de la evaluación (cada nivel puede tener distinto mínimo). */
export const evaluacionCumpleMinimo = (
  minimo: number | null | undefined,
  resultado: number | null | undefined
): boolean => {
  if (resultado === null || resultado === undefined) {
    return false;
  }
  const r = Number(resultado);
  if (Number.isNaN(r)) {
    return false;
  }
  const m = Number(minimo ?? 70);
  return r >= m;
};

/** Indica si hay datos de intento o progreso que justifiquen «Borrar avance» (filas no completadas). */
export const evaluacionUsuarioTieneAvanceBorrable = (eu: EvaluacionUsuario): boolean => {
  const estado = (eu.estado || '').toLowerCase();
  if (estado === 'en_progreso') {
    return true;
  }
  if (eu.fecha_inicio) {
    return true;
  }
  if (eu.fecha_completada) {
    return true;
  }
  if (eu.resultado_final != null && eu.resultado_final !== undefined) {
    return true;
  }
  if (Array.isArray(eu.historial_intentos) && eu.historial_intentos.length > 0) {
    return true;
  }
  if (
    Array.isArray(eu.resultados_puntos) &&
    eu.resultados_puntos.some(
      (r) =>
        r.puntuacion != null ||
        (r.observaciones != null && String(r.observaciones).trim() !== '')
    )
  ) {
    return true;
  }
  if (Array.isArray(eu.firmas_usuario) && eu.firmas_usuario.some((f) => f.esta_firmado)) {
    return true;
  }
  if (eu.observaciones != null && String(eu.observaciones).trim() !== '') {
    return true;
  }
  return false;
};

/** Coincide con la fila «No aprobada» en la lista de evaluaciones asignadas (para ordenar). */
export const esEvaluacionNoAprobadaEnLista = (
  evaluacion: { id: number; nombre?: string; minimo_aprobatorio?: number | null },
  guardadasMap: Record<number, EvaluacionUsuario>
): boolean => {
  const evaluacionGuardada = guardadasMap[evaluacion.id];
  if (!evaluacionGuardada) {
    return false;
  }
  const estadoNormalizado = (evaluacionGuardada.estado || '').toLowerCase();
  const completadaPorRegistro =
    estadoNormalizado === 'completada' || evaluacionGuardada.resultado_final != null;
  if (!completadaPorRegistro) {
    return false;
  }
  const minimoEvaluacion = evaluacion.minimo_aprobatorio ?? 70;
  const resultadoEvaluacion = evaluacionGuardada.resultado_final;
  const tieneResultadoGuardado =
    resultadoEvaluacion !== null && resultadoEvaluacion !== undefined;
  const aprobadaSegunMinimo = evaluacionCumpleMinimo(minimoEvaluacion, resultadoEvaluacion);
  return tieneResultadoGuardado && !aprobadaSegunMinimo;
};

export const esCandadoSeguridadN1Tronco = (evaluacion: {
  es_prerrequisito_seguridad?: boolean;
  es_tronco_comun?: boolean;
  nivel_seguridad?: number | null;
}): boolean =>
  Boolean(
    evaluacion.es_prerrequisito_seguridad &&
      evaluacion.es_tronco_comun &&
      (evaluacion.nivel_seguridad === 1 || evaluacion.nivel_seguridad == null)
  );

export const esCandadoSeguridadTech = (
  evaluacion: {
    es_prerrequisito_seguridad?: boolean;
    es_tronco_comun?: boolean;
    nivel_seguridad?: number | null;
  },
  nivel: 1 | 2
): boolean =>
  Boolean(
    evaluacion.es_prerrequisito_seguridad &&
      !evaluacion.es_tronco_comun &&
      evaluacion.nivel_seguridad === nivel
  );

export type EvaluacionCandado = {
  id: number;
  minimo_aprobatorio?: number | null;
  es_prerrequisito_seguridad?: boolean;
  es_tronco_comun?: boolean;
  nivel_seguridad?: number | null;
  tecnologia_ids?: number[];
  tecnologia_nombres?: string[];
  tecnologia_nombre?: string | null;
  nivel?: number | null;
  nivel_posicion_data?: { nivel?: number } | null;
};

export const idsTechDeEvaluacion = (evaluacion: EvaluacionCandado): number[] =>
  (evaluacion.tecnologia_ids ?? []).map((id) => Number(id)).filter((n) => !Number.isNaN(n));

export const techsRelevantes = (asignadas: number[], techIdsOp: number[]): number[] => {
  if (techIdsOp.length === 0) {
    return [];
  }
  if (asignadas.length === 0) {
    return techIdsOp;
  }
  const inter = techIdsOp.filter((id) => asignadas.includes(id));
  return inter.length > 0 ? inter : techIdsOp;
};

export const formatearListaNombres = (nombres: string[]): string => {
  const limpios = nombres.filter(Boolean);
  if (limpios.length === 0) {
    return 'de la tecnología';
  }
  if (limpios.length === 1) {
    return limpios[0];
  }
  if (limpios.length === 2) {
    return `${limpios[0]} y ${limpios[1]}`;
  }
  return `${limpios.slice(0, -1).join(', ')} y ${limpios[limpios.length - 1]}`;
};

export const nombreTechEnLista = (lista: EvaluacionCandado[], techId: number): string => {
  for (const evaluacion of lista) {
    const ids = idsTechDeEvaluacion(evaluacion);
    const indice = ids.indexOf(techId);
    if (indice >= 0 && evaluacion.tecnologia_nombres?.[indice]) {
      return evaluacion.tecnologia_nombres[indice];
    }
    if (ids.length === 1 && ids[0] === techId && evaluacion.tecnologia_nombre) {
      return evaluacion.tecnologia_nombre;
    }
  }
  return `tecnología ${techId}`;
};

export const areaUsaNavegacionPorTecnologia = (area?: Area | null): boolean =>
  Boolean(area?.fase2_activa);

export const fase2SeguridadN1Aprobada = (
  evaluacionesLista: Array<{
    id: number;
    minimo_aprobatorio?: number | null;
    es_prerrequisito_seguridad?: boolean;
    es_tronco_comun?: boolean;
    nivel_seguridad?: number | null;
  }>,
  guardadasMap: Record<number, EvaluacionUsuario>
): boolean => {
  const candados = evaluacionesLista.filter(esCandadoSeguridadN1Tronco);
  if (candados.length === 0) {
    return true;
  }
  return candados.some((evaluacion) => {
    const guardada = guardadasMap[evaluacion.id];
    return evaluacionCumpleMinimo(evaluacion.minimo_aprobatorio, guardada?.resultado_final);
  });
};

export const techSeguridadAprobada = (
  lista: EvaluacionCandado[],
  guardadasMap: Record<number, EvaluacionUsuario>,
  nivel: 1 | 2,
  techId: number
): boolean => {
  const candados = lista.filter(
    (evaluacion) => esCandadoSeguridadTech(evaluacion, nivel) && idsTechDeEvaluacion(evaluacion).includes(techId)
  );
  if (candados.length === 0) {
    return true;
  }
  return candados.some((evaluacion) =>
    evaluacionCumpleMinimo(evaluacion.minimo_aprobatorio, guardadasMap[evaluacion.id]?.resultado_final)
  );
};

export const textoBloqueoCandadoFase2 = (
  evaluacion: EvaluacionCandado,
  lista: EvaluacionCandado[],
  guardadasMap: Record<number, EvaluacionUsuario>,
  fase2Activa: boolean | undefined,
  tecnologiaIdsUsuario: number[] | undefined
): string | null => {
  if (!fase2Activa) {
    return null;
  }
  if (esCandadoSeguridadN1Tronco(evaluacion)) {
    return null;
  }
  if (!fase2SeguridadN1Aprobada(lista, guardadasMap)) {
    return 'Bloqueada: primero hay que aprobar Seguridad en operación de maquinaria N1.';
  }
  if (esCandadoSeguridadTech(evaluacion, 1)) {
    return null;
  }
  const idsOp = idsTechDeEvaluacion(evaluacion);
  const asignadas = tecnologiaIdsUsuario ?? [];
  const relevantes =
    idsOp.length === 0 ? asignadas : techsRelevantes(asignadas, idsOp);
  const faltanN1 = relevantes.filter((id) => !techSeguridadAprobada(lista, guardadasMap, 1, id));
  const mensajeN1 = (ids: number[]) =>
    `Bloqueada: primero hay que aprobar Nivel 1 Seguridad ${formatearListaNombres(
      ids.map((id) => nombreTechEnLista(lista, id))
    )}.`;
  if (esCandadoSeguridadTech(evaluacion, 2)) {
    return faltanN1.length > 0 ? mensajeN1(faltanN1) : null;
  }
  if (faltanN1.length > 0) {
    return mensajeN1(faltanN1);
  }
  const nivelOp = evaluacion.nivel_posicion_data?.nivel ?? evaluacion.nivel ?? null;
  if (nivelOp != null && nivelOp >= 2) {
    const faltanN2 = relevantes.filter((id) => !techSeguridadAprobada(lista, guardadasMap, 2, id));
    if (faltanN2.length > 0) {
      return `Bloqueada: primero hay que aprobar Nivel 2 Seguridad ${formatearListaNombres(
        faltanN2.map((id) => nombreTechEnLista(lista, id))
      )}.`;
    }
  }
  return null;
};

export const etiquetaCortaBloqueoFase2 = (mensaje: string | null): string | null => {
  if (!mensaje) {
    return null;
  }
  const porTech = /Nivel ([12]) Seguridad (.+)\.$/.exec(mensaje);
  if (porTech) {
    return `Bloqueada (seguridad N${porTech[1]} ${porTech[2]})`;
  }
  if (mensaje.includes('maquinaria N1')) {
    return 'Bloqueada (seguridad N1)';
  }
  return 'Bloqueada';
};

export const nombresTecnologiaEvaluacion = (evaluacion: {
  tecnologia_nombres?: string[];
  tecnologia_nombre?: string | null;
}): string[] => {
  if (evaluacion.tecnologia_nombres && evaluacion.tecnologia_nombres.length > 0) {
    return [...evaluacion.tecnologia_nombres].sort((a, b) => a.localeCompare(b, 'es'));
  }
  if (evaluacion.tecnologia_nombre) {
    return evaluacion.tecnologia_nombre
      .split(/[,·]/)
      .map((parte) => parte.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es'));
  }
  return [];
};

export type ContextoListaEvaluaciones = {
  area?: Area | null;
  posicionId?: number | null;
};

export const idsAreasDeUsuario = (user: User): number[] =>
  (user.areas || []).map((id) => Number(id)).filter((n) => !Number.isNaN(n));

export const posicionPrincipalId = (user: User): number | undefined => {
  if (typeof user.posicion === 'number') {
    return user.posicion;
  }
  const principal = user.posiciones?.find((item) => item.es_principal);
  if (principal) {
    return principal.posicion_id;
  }
  return user.posiciones?.[0]?.posicion_id;
};

/** Área del catálogo que corresponde al operador (posición principal, si existe). */
export const resolverAreaDeUsuario = (user: User, areasCatalogo: Area[]): Area | undefined => {
  const asignadas = idsAreasDeUsuario(user);
  if (areasCatalogo.length === 0 || asignadas.length === 0) {
    return undefined;
  }
  const posId = posicionPrincipalId(user);
  if (posId != null) {
    const porPosicion = areasCatalogo.find(
      (area) => asignadas.includes(area.id) && area.posiciones?.some((p) => p.id === posId)
    );
    if (porPosicion) {
      return porPosicion;
    }
  }
  return areasCatalogo.find((area) => asignadas.includes(area.id));
};

export const claveGrupoTecnologia = (evaluacion: {
  es_tronco_comun?: boolean;
  tecnologia_nombres?: string[];
  tecnologia_nombre?: string | null;
}): string => {
  if (evaluacion.es_tronco_comun) {
    return 'tronco';
  }
  const nombres = nombresTecnologiaEvaluacion(evaluacion);
  if (nombres.length === 0) {
    return 'otras';
  }
  return `tech:${nombres.join(', ')}`;
};

export const tituloGrupoTecnologia = (clave: string): string => {
  if (clave === 'tronco') {
    return 'Tronco común';
  }
  if (clave === 'otras') {
    return 'Otras';
  }
  if (clave.startsWith('tech:')) {
    return clave.slice('tech:'.length);
  }
  return clave;
};

/** Etiqueta corta para chips de filtro en ficha persona. */
export const etiquetaChipGrupo = (clave: string): string => {
  if (clave === 'tronco') {
    return 'Tronco';
  }
  if (clave === 'otras') {
    return 'Otras';
  }
  if (clave.startsWith('tech:')) {
    return clave.slice('tech:'.length);
  }
  return clave;
};

export const ordenGrupoTecnologia = (clave: string): number => {
  if (clave === 'tronco') {
    return 0;
  }
  if (clave === 'otras') {
    return 2;
  }
  return 1;
};

export function agruparEvaluacionesPorTecnologia<T extends {
  es_tronco_comun?: boolean;
  tecnologia_nombres?: string[];
  tecnologia_nombre?: string | null;
}>(evaluaciones: T[], agrupar: boolean): Array<{ clave: string; titulo: string | null; items: T[] }> {
  if (!agrupar) {
    return [{ clave: 'todas', titulo: null, items: evaluaciones }];
  }
  const mapa = new Map<string, T[]>();
  evaluaciones.forEach((evaluacion) => {
    const clave = claveGrupoTecnologia(evaluacion);
    const grupo = mapa.get(clave);
    if (grupo) {
      grupo.push(evaluacion);
    } else {
      mapa.set(clave, [evaluacion]);
    }
  });
  return Array.from(mapa.entries())
    .sort(([claveA], [claveB]) => {
      const ordenA = ordenGrupoTecnologia(claveA);
      const ordenB = ordenGrupoTecnologia(claveB);
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      return claveA.localeCompare(claveB, 'es');
    })
    .map(([clave, items]) => ({
      clave,
      titulo: tituloGrupoTecnologia(clave),
      items,
    }));
}

/** Alineado con `users/nivel_completitud.py` (porcentaje mínimo para marcar nivel completo). */
export const PORCENTAJE_MINIMO_NIVEL_COMPLETO = 90;

export const calcularResumenNiveles = (
  evaluacionesLista: any[],
  guardadasMap: Record<number, EvaluacionUsuario>
) => {
  const stats: Record<number, { total: number; completadas: number }> = {};

  evaluacionesLista.forEach((evaluacion) => {
    const nivel =
      evaluacion.nivel_posicion_data?.nivel ??
      evaluacion.nivel ??
      null;

    if (typeof nivel !== 'number') {
      return;
    }

    if (!stats[nivel]) {
      stats[nivel] = { total: 0, completadas: 0 };
    }

    stats[nivel].total += 1;

    const evaluacionGuardada = guardadasMap[evaluacion.id];
    const estado = (evaluacionGuardada?.estado || '').toLowerCase();
    const estadoFirmasUsuario = (evaluacionGuardada?.estado_firmas_usuario || '').toLowerCase();
    const firmasCompletas = estadoFirmasUsuario === 'firmas_completas';
    const minimo = evaluacion.minimo_aprobatorio ?? 70;
    const aprobada = evaluacionCumpleMinimo(minimo, evaluacionGuardada?.resultado_final);

    if (firmasCompletas && aprobada) {
      stats[nivel].completadas += 1;
    }
  });

  const completados: Record<number, boolean> = {};
  Object.entries(stats).forEach(([nivel, valores]) => {
    const nivelNumero = Number(nivel);
    const { total, completadas } = valores;
    completados[nivelNumero] =
      total > 0 &&
      completadas * 100 >= total * PORCENTAJE_MINIMO_NIVEL_COMPLETO;
  });

  return { stats, completados };
};

export const calcularEstadoFirmasUsuario = (firmas: FirmaEvaluacionUsuario[] | undefined) => {
  if (!firmas || firmas.length === 0) {
    return {
      estado: 'pendiente_firmas',
      display: 'Pendiente de firmas',
    };
  }

  const total = firmas.length;
  const firmadas = firmas.filter((firma) => firma.esta_firmado).length;

  if (firmadas === total) {
    return {
      estado: 'firmas_completas',
      display: 'Firmas completas',
    };
  }

  if (firmadas > 0) {
    return {
      estado: 'en_proceso',
      display: 'En proceso de firmas',
    };
  }

  return {
    estado: 'pendiente_firmas',
    display: 'Pendiente de firmas',
  };
};

export const ROL_SUPERVISOR = 'SUPERVISOR';
export const ROL_ENTRENADOR = 'ENTRENADOR';

/** Slug canónico y variantes slugificadas desde plantilla (p. ej. `firma-del-evaluador`). */
export const TIPO_FIRMA_EMPLEADO = 'empleado';
export const TIPO_FIRMA_PRODUCCION = 'produccion';
export const TIPO_FIRMA_EVALUADOR = 'evaluador';

/**
 * Firma "del evaluador" (solo ENTRENADOR/SUPERVISOR por área), no confundir con tipos genéricos
 * que caen en lista mixta con ADMIN.
 * Usa `tipo_firma` (slug) y, si hace falta, el nombre visible de la plantilla (p. ej. "Firma del Evaluador").
 */
export function esFirmaModalEvaluador(
  tipoFirma: string | undefined | null,
  nombreDisplay?: string | null
): boolean {
  if (tipoFirma) {
    const t = tipoFirma.toLowerCase();
    if (t === TIPO_FIRMA_EVALUADOR) {
      return true;
    }
    if (t.includes('evaluador') || t.includes('evaluator')) {
      return true;
    }
    if (
      t === 'firma-del-evaluador' ||
      t === 'firma_del_evaluador' ||
      t === 'firma-evaluador' ||
      (t.includes('evaluador') && t.includes('firma'))
    ) {
      return true;
    }
  }
  const n = (nombreDisplay || '').toLowerCase();
  if (n.includes('evaluador') || n.includes('evaluator')) {
    if (n.includes('empleado')) {
      return false;
    }
    return true;
  }
  return false;
}

export function filtrarUsuariosPorArea(users: User[], areaId: number | null): User[] {
  if (areaId == null) {
    return users;
  }
  const aid = Number(areaId);
  return users.filter(
    (u) =>
      Array.isArray(u.areas) && u.areas.map(Number).some((x) => x === aid)
  );
}

export function buscarUsuarioEnRolesSupervision(
  id: number,
  mixtos: User[],
  supervisoresLista: User[],
  instructoresLista: User[]
): User | undefined {
  return (
    mixtos.find((u) => u.id === id) ??
    supervisoresLista.find((u) => u.id === id) ??
    instructoresLista.find((u) => u.id === id)
  );
}

export const esUsuarioSupervisor = (u: Pick<User, 'role'> | undefined | null) =>
  u?.role === ROL_SUPERVISOR;

export const esUsuarioEntrenador = (u: Pick<User, 'role'> | undefined | null) =>
  u?.role === ROL_ENTRENADOR;

export const esRolSupervisionAmplia = (role?: string | null) =>
  role === 'ADMIN' || role === ROL_ENTRENADOR || role === ROL_SUPERVISOR;

export function ordenarUsuariosPorNombre(list: User[]): User[] {
  return [...list].sort((a, b) =>
    (a.full_name || a.username || '').localeCompare(
      b.full_name || b.username || '',
      'es',
      { sensitivity: 'base' }
    )
  );
}

/** Partición de la respuesta de getUsers(ADMIN,ENTRENADOR,SUPERVISOR) para combos y firmas. */
export function particionarUsuariosSupervision(results: User[]): {
  supervisores: User[];
  instructores: User[];
  rolesMixtosFirmas: User[];
} {
  const mixtos = results.filter((u) => esRolSupervisionAmplia(u.role));
  return {
    supervisores: ordenarUsuariosPorNombre(results.filter(esUsuarioSupervisor)),
    instructores: ordenarUsuariosPorNombre(results.filter(esUsuarioEntrenador)),
    rolesMixtosFirmas: ordenarUsuariosPorNombre(mixtos),
  };
}

export function opcionesFirmantePorTipoFirma(
  tipoFirma: string,
  listaSupervisores: User[],
  listaEntrenadores: User[],
  listaMixta: User[],
  nombreFirma?: string | null
): User[] {
  if (tipoFirma === TIPO_FIRMA_PRODUCCION) {
    return listaSupervisores;
  }
  if (esFirmaModalEvaluador(tipoFirma, nombreFirma)) {
    const map = new Map<number, User>();
    for (const u of listaSupervisores) {
      if (u.role === ROL_SUPERVISOR || u.role === ROL_ENTRENADOR) {
        map.set(u.id, u);
      }
    }
    for (const u of listaEntrenadores) {
      if (u.role === ROL_SUPERVISOR || u.role === ROL_ENTRENADOR) {
        map.set(u.id, u);
      }
    }
    return ordenarUsuariosPorNombre(Array.from(map.values()));
  }
  return listaMixta;
}

export function firmantePermitidoParaTipoFirma(
  tipoFirma: string,
  user: User | undefined,
  nombreFirma?: string | null
): boolean {
  if (!user) {
    return false;
  }
  if (tipoFirma === TIPO_FIRMA_PRODUCCION) {
    return esUsuarioSupervisor(user);
  }
  if (esFirmaModalEvaluador(tipoFirma, nombreFirma)) {
    return esUsuarioEntrenador(user) || esUsuarioSupervisor(user);
  }
  return esRolSupervisionAmplia(user.role);
}

/** Misma lógica que el API (`order_by('created_at')`): más antiguas primero. */
export function ordenEvaluacionesPorCreacionEnSistema(
  a: { id?: number; created_at?: string | null },
  b: { id?: number; created_at?: string | null }
): number {
  const ta =
    a.created_at != null && String(a.created_at).trim() !== ''
      ? new Date(a.created_at as string).getTime()
      : NaN;
  const tb =
    b.created_at != null && String(b.created_at).trim() !== ''
      ? new Date(b.created_at as string).getTime()
      : NaN;
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) {
    return ta - tb;
  }
  return (Number(a.id) || 0) - (Number(b.id) || 0);
}

/**
 * Orden en lista de perfil: no aprobadas primero; luego pendientes/en curso;
 * al final las ya evaluadas (registro completado o con resultado, y no no aprobada).
 * Dentro de cada bloque se mantiene el orden de carga en el sistema.
 */
export function compararEvaluacionesOrdenListaAsignadas(
  a: { id: number; nombre?: string; minimo_aprobatorio?: number | null; created_at?: string | null },
  b: { id: number; nombre?: string; minimo_aprobatorio?: number | null; created_at?: string | null },
  guardadasMap: Record<number, EvaluacionUsuario>
): number {
  const tier = (e: typeof a): number => {
    if (esEvaluacionNoAprobadaEnLista(e, guardadasMap)) {
      return 0;
    }
    const eu = guardadasMap[e.id];
    if (!eu) {
      return 1;
    }
    const estadoNormalizado = (eu.estado || '').toLowerCase();
    const completadaPorRegistro =
      estadoNormalizado === 'completada' || eu.resultado_final != null;
    if (completadaPorRegistro) {
      return 2;
    }
    return 1;
  };
  const ta = tier(a);
  const tb = tier(b);
  if (ta !== tb) {
    return ta - tb;
  }
  return ordenEvaluacionesPorCreacionEnSistema(a, b);
}
