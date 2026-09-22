import type {
  Fase2Area,
  Fase2Grupo,
  Fase2Operacion,
  Fase2PreguntaExamen,
  Fase2Tecnologia,
  Fase2Usuario,
  NivelEvaluacion,
  PosicionJerarquicaSlug,
} from './types';
import { NIVELES_EXAMEN_AUTO, POSICIONES_JERARQUICAS } from './types';

export const FASE2_AREAS: Fase2Area[] = [
  { id: 2, nombre: 'Strap Attach', tipo: 'produccion', esPiloto: true },
  { id: 1, nombre: 'Edición', tipo: 'produccion' },
  { id: 3, nombre: 'Antena', tipo: 'produccion' },
];

export const FASE2_TECNOLOGIAS: Fase2Tecnologia[] = [
  { id: 1, nombre: 'Edición manual', areaId: 1, orden: 1, complejidad: 'basica' },
  { id: 2, nombre: 'Empaque', areaId: 1, orden: 2, complejidad: 'basica' },
  { id: 3, nombre: 'Etiquetado', areaId: 1, orden: 3, complejidad: 'basica' },
  { id: 4, nombre: 'Control visual', areaId: 1, orden: 4, complejidad: 'basica' },
  { id: 5, nombre: 'Digital print', areaId: 1, orden: 5, complejidad: 'basica' },
  { id: 6, nombre: 'Setup formatos', areaId: 1, orden: 6, complejidad: 'compleja' },
  { id: 7, nombre: 'Línea automática', areaId: 1, orden: 7, complejidad: 'compleja' },
  { id: 8, nombre: 'Mantenimiento básico', areaId: 1, orden: 8, complejidad: 'compleja' },
  { id: 9, nombre: 'Crusader', areaId: 2, orden: 1, complejidad: 'basica' },
  { id: 10, nombre: 'Delta', areaId: 2, orden: 2, complejidad: 'compleja' },
];

export const FASE2_GRUPOS: Fase2Grupo[] = [
  { id: 1, nombre: 'Grupo A', areaId: 1, supervisorNombre: 'Ana Supervisor' },
  { id: 2, nombre: 'Grupo B', areaId: 1, supervisorNombre: 'Luis Supervisor' },
  { id: 3, nombre: 'Grupo Mañana', areaId: 2, supervisorNombre: 'Claudia Mendoza' },
];

const troncoEdicion: Omit<Fase2Operacion, 'id'>[] = [
  {
    nombre: 'Seguridad en operación de maquinaria N1',
    nivel: 1,
    tecnologiaId: null,
    esTroncoComun: true,
    troncoPrioritario: true,
    esPrerrequisitoSeguridad: true,
    nivelSeguridad: 1,
  },
  { nombre: '5S en estación', nivel: 1, tecnologiaId: null, esTroncoComun: true, troncoPrioritario: false },
  {
    nombre: 'Pruebas de calidad / mantenimientos',
    nivel: 2,
    tecnologiaId: null,
    esTroncoComun: true,
    troncoPrioritario: false,
  },
];

const troncoStrap: Omit<Fase2Operacion, 'id'>[] = [
  {
    nombre: 'Seguridad en operación de maquinaria N1',
    nivel: 1,
    tecnologiaId: null,
    esTroncoComun: true,
    troncoPrioritario: true,
    esPrerrequisitoSeguridad: true,
    nivelSeguridad: 1,
  },
  { nombre: 'EPP zona Strap Attach', nivel: 1, tecnologiaId: null, esTroncoComun: true, troncoPrioritario: false },
  {
    nombre: '5S y calidad en estación Strap',
    nivel: 2,
    tecnologiaId: null,
    esTroncoComun: true,
    troncoPrioritario: false,
  },
];

const OPS_EDICION: Record<number, string[]> = {
  1: ['Edición manual – Setup estación', 'Edición manual – Control de registro', 'Edición manual – Cierre lote'],
  2: ['Empaque – Línea principal', 'Empaque – Inspección final', 'Empaque – Etiquetado caja'],
  3: ['Etiquetado – Verificación código', 'Etiquetado – Cambio rollo', 'Etiquetado – Auditoría muestra'],
  4: ['Control visual – Defectos críticos', 'Control visual – Muestreo N2', 'Control visual – Liberación lote'],
  5: ['Digital print – Calibración color', 'Digital print – Cambio formato', 'Digital print – Validación cliente'],
  6: ['Setup formatos – Cambio herramental', 'Setup formatos – Prueba arranque', 'Setup formatos – Handover N3'],
  7: ['Línea automática – Arranque', 'Línea automática – Ajuste sensores', 'Línea automática – Paro seguro'],
  8: ['Mantenimiento básico – Lubricación', 'Mantenimiento básico – Limpieza profunda', 'Mantenimiento básico – Reporte falla'],
};

const OPS_STRAP: Record<number, string[]> = {
  9: ['Crusader – Arranque', 'Crusader – Control de strap', 'Crusader – Liberación lote'],
  10: ['Delta – Arranque alta velocidad', 'Delta – Ajuste sensores', 'Delta – Paro seguro'],
};

function opsConSeguridadPorTech(
  tecnologiaId: number,
  nombres: string[],
  startId: number
): Fase2Operacion[] {
  const tech = FASE2_TECNOLOGIAS.find((t) => t.id === tecnologiaId);
  const nombreTech = tech?.nombre ?? `Tech ${tecnologiaId}`;
  const ops: Fase2Operacion[] = [
    {
      id: startId,
      nombre: `Seguridad ${nombreTech} N1`,
      nivel: 1,
      tecnologiaId,
      esTroncoComun: false,
      troncoPrioritario: false,
      esPrerrequisitoSeguridad: true,
      nivelSeguridad: 1,
    },
    {
      id: startId + 1,
      nombre: `Seguridad ${nombreTech} N2`,
      nivel: 2,
      tecnologiaId,
      esTroncoComun: false,
      troncoPrioritario: false,
      esPrerrequisitoSeguridad: true,
      nivelSeguridad: 2,
    },
  ];
  nombres.forEach((nombre, i) => {
    ops.push({
      id: startId + 2 + i,
      nombre,
      nivel: Math.min(4, (i + 1) as NivelEvaluacion) as NivelEvaluacion,
      tecnologiaId,
      esTroncoComun: false,
      troncoPrioritario: false,
    });
  });
  return ops;
}

export const FASE2_OPERACIONES: Fase2Operacion[] = [
  ...troncoEdicion.map((o, i) => ({ ...o, id: i + 1 })),
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((id) => opsConSeguridadPorTech(id, OPS_EDICION[id] ?? [], 100 + id * 10)),
  ...troncoStrap.map((o, i) => ({ ...o, id: 50 + i })),
  ...opsConSeguridadPorTech(9, OPS_STRAP[9] ?? [], 290),
  ...opsConSeguridadPorTech(10, OPS_STRAP[10] ?? [], 310),
];

export function esPosicionEvaluadora(posicion: PosicionJerarquicaSlug): boolean {
  return POSICIONES_JERARQUICAS.find((p) => p.slug === posicion)?.puedeEvaluarArea === true;
}

export function idTroncoSeguridadN1(areaId: number): number {
  return areaId === 2 ? 50 : 1;
}

export function getSeguridadOp(tecnologiaId: number, nivelSeguridad: 1 | 2): Fase2Operacion | undefined {
  return FASE2_OPERACIONES.find(
    (o) => o.tecnologiaId === tecnologiaId && o.nivelSeguridad === nivelSeguridad
  );
}

export const FASE2_USUARIOS: Fase2Usuario[] = [
  {
    id: 10,
    nombre: 'Elena Líder',
    numeroEmpleado: 'E-3001',
    areaId: 2,
    grupoId: 3,
    posicion: 'lider',
    tecnologiaIds: [9, 10],
    seguridadMaquinariaN1: true,
    seguridadPorTecnologia: {
      9: { n1: true, n2: true },
      10: { n1: true, n2: true },
    },
  },
  {
    id: 11,
    nombre: 'Marcos Entrenador',
    numeroEmpleado: 'E-3002',
    areaId: 2,
    grupoId: 3,
    posicion: 'entrenador',
    tecnologiaIds: [9, 10],
    seguridadMaquinariaN1: true,
    seguridadPorTecnologia: {
      9: { n1: true, n2: true },
      10: { n1: true, n2: true },
    },
  },
  {
    id: 3,
    nombre: 'Pedro Titular',
    numeroEmpleado: 'E-2001',
    areaId: 2,
    grupoId: 3,
    posicion: 'titular',
    tecnologiaIds: [9],
    seguridadMaquinariaN1: true,
    seguridadPorTecnologia: {
      9: { n1: true, n2: true },
    },
    historialAreas: [
      {
        areaNombre: 'Edición',
        periodo: '2021 – jun 2025',
        archivado: true,
        nota: 'Ops acreditadas se conservan y siguen disponibles en reportes; no inflan el % de Strap Attach',
      },
    ],
  },
  {
    id: 12,
    nombre: 'Diego Vectrista',
    numeroEmpleado: 'E-3003',
    areaId: 2,
    grupoId: 3,
    posicion: 'vectrista',
    tecnologiaIds: [9],
    seguridadMaquinariaN1: true,
    seguridadPorTecnologia: {
      9: { n1: true, n2: false },
    },
  },
  {
    id: 13,
    nombre: 'Rosa Auxiliar',
    numeroEmpleado: 'E-3004',
    areaId: 2,
    grupoId: 3,
    posicion: 'auxiliar',
    tecnologiaIds: [9],
    seguridadMaquinariaN1: true,
    seguridadPorTecnologia: {
      9: { n1: false, n2: false },
    },
  },
  {
    id: 7,
    nombre: 'Roberto Líder',
    numeroEmpleado: 'E-1000',
    areaId: 1,
    grupoId: 1,
    posicion: 'lider',
    tecnologiaIds: [1, 2, 3, 4, 5, 6, 7, 8],
    seguridadMaquinariaN1: true,
  },
  {
    id: 1,
    nombre: 'María Entrenador',
    numeroEmpleado: 'E-1001',
    areaId: 1,
    grupoId: 1,
    posicion: 'entrenador',
    tecnologiaIds: [1, 2, 3, 4, 5, 6, 7, 8],
    seguridadMaquinariaN1: true,
  },
  {
    id: 6,
    nombre: 'Sofía Titular',
    numeroEmpleado: 'E-2004',
    areaId: 1,
    grupoId: 1,
    posicion: 'titular',
    tecnologiaIds: [1, 2, 3, 4, 5],
    seguridadMaquinariaN1: true,
    seguridadPorTecnologia: {
      1: { n1: true, n2: true },
      2: { n1: true, n2: true },
      3: { n1: true, n2: false },
      4: { n1: true, n2: false },
      5: { n1: true, n2: false },
    },
  },
  {
    id: 14,
    nombre: 'Luis Vectrista',
    numeroEmpleado: 'E-2005',
    areaId: 1,
    grupoId: 1,
    posicion: 'vectrista',
    tecnologiaIds: [1, 2],
    seguridadMaquinariaN1: true,
    seguridadPorTecnologia: {
      1: { n1: true, n2: false },
      2: { n1: true, n2: false },
    },
  },
  {
    id: 4,
    nombre: 'Laura Auxiliar',
    numeroEmpleado: 'E-2002',
    areaId: 1,
    grupoId: 2,
    posicion: 'auxiliar',
    tecnologiaIds: [2],
    seguridadMaquinariaN1: true,
    seguridadPorTecnologia: {
      2: { n1: true, n2: false },
    },
  },
  {
    id: 5,
    nombre: 'Jorge Auxiliar',
    numeroEmpleado: 'E-2003',
    areaId: 1,
    grupoId: 2,
    posicion: 'auxiliar',
    tecnologiaIds: [],
    seguridadMaquinariaN1: false,
  },
];

function bancoPreguntas(): Fase2PreguntaExamen[] {
  const out: Fase2PreguntaExamen[] = [];
  let id = 1;
  const areaNombre: Record<number, string> = { 1: 'Edición', 2: 'Strap Attach' };
  ([1, 2] as const).forEach((areaId) => {
    NIVELES_EXAMEN_AUTO.forEach((nivel) => {
      for (let i = 0; i < 15; i += 1) {
        out.push({
          id: id++,
          areaId,
          nivel,
          texto: `N${nivel} · Pregunta ${i + 1}: ¿Cuál es la acción correcta de seguridad y calidad en ${areaNombre[areaId]}?`,
          opciones: [
            'Continuar si la máquina arranca',
            'Detener, bloquear y reportar al supervisor',
            'Ajustar con herramienta personal',
            'Ignorar si es turno corto',
          ],
          correcta: 1,
        });
      }
    });
  });
  return out;
}

export const FASE2_PREGUNTAS_EXAMEN: Fase2PreguntaExamen[] = bancoPreguntas();

export function getTecnologiasByArea(areaId: number): Fase2Tecnologia[] {
  return FASE2_TECNOLOGIAS.filter((t) => t.areaId === areaId).sort((a, b) => a.orden - b.orden);
}

export function getGruposByArea(areaId: number): Fase2Grupo[] {
  return FASE2_GRUPOS.filter((g) => g.areaId === areaId);
}

export function getOperacionesTronco(areaId = 1): Fase2Operacion[] {
  const troncoIds = areaId === 2 ? new Set([50, 51, 52]) : new Set([1, 2, 3]);
  return FASE2_OPERACIONES.filter((o) => o.esTroncoComun && troncoIds.has(o.id));
}

export function getOperacionesByTecnologia(tecnologiaId: number): Fase2Operacion[] {
  return FASE2_OPERACIONES.filter((o) => o.tecnologiaId === tecnologiaId);
}

export function usuarioPuedeAsignarTecnologias(usuario: Fase2Usuario): boolean {
  if (esPosicionEvaluadora(usuario.posicion)) return true;
  return usuario.seguridadMaquinariaN1;
}

export function getOperacionesVisiblesParaUsuario(
  usuario: Fase2Usuario,
  tecnologiaIdsOverride?: number[]
): { tronco: Fase2Operacion[]; porTecnologia: { tecnologia: Fase2Tecnologia; operaciones: Fase2Operacion[] }[] } {
  const areaTechs = FASE2_TECNOLOGIAS.filter((t) => t.areaId === usuario.areaId);
  const ids = esPosicionEvaluadora(usuario.posicion)
    ? areaTechs.map((t) => t.id)
    : tecnologiaIdsOverride ?? usuario.tecnologiaIds;

  const tecnologias = areaTechs.filter((t) => ids.includes(t.id)).sort((a, b) => a.orden - b.orden);

  return {
    tronco: getOperacionesTronco(usuario.areaId),
    porTecnologia: tecnologias.map((tecnologia) => ({
      tecnologia,
      operaciones: getOperacionesByTecnologia(tecnologia.id),
    })),
  };
}

export function opsCompletadasIniciales(usuario: Fase2Usuario): Set<number> {
  const ids = new Set<number>();
  if (usuario.seguridadMaquinariaN1) {
    ids.add(idTroncoSeguridadN1(usuario.areaId));
  }
  Object.entries(usuario.seguridadPorTecnologia ?? {}).forEach(([tid, seg]) => {
    const n1 = getSeguridadOp(Number(tid), 1);
    const n2 = getSeguridadOp(Number(tid), 2);
    if (seg.n1 && n1) ids.add(n1.id);
    if (seg.n2 && n2) ids.add(n2.id);
  });
  return ids;
}

export function usuarioTieneSeguridadGlobalN1(usuario: Fase2Usuario, completadas: Set<number>): boolean {
  return usuario.seguridadMaquinariaN1 || completadas.has(idTroncoSeguridadN1(usuario.areaId));
}

/** null = habilitada; string = motivo de bloqueo */
export function razonBloqueoOperacion(
  usuario: Fase2Usuario,
  op: Fase2Operacion,
  completadas: Set<number>
): string | null {
  const tieneGlobalN1 = usuarioTieneSeguridadGlobalN1(usuario, completadas);
  const esSeguridadGlobalN1 = op.esTroncoComun && op.nivelSeguridad === 1;

  if (esSeguridadGlobalN1) return null;

  if (!tieneGlobalN1) {
    return 'Bloqueada: falta Seguridad en operación de maquinaria N1 (tronco)';
  }

  if (op.esTroncoComun) return null;

  if (op.tecnologiaId == null) return null;

  const segN1 = getSeguridadOp(op.tecnologiaId, 1);
  const segN2 = getSeguridadOp(op.tecnologiaId, 2);
  const tieneN1Tech = Boolean(segN1 && completadas.has(segN1.id));
  const tieneN2Tech = Boolean(segN2 && completadas.has(segN2.id));

  if (op.nivelSeguridad === 1) return null;

  if (!tieneN1Tech) {
    return `Bloqueada: falta Seguridad ${FASE2_TECNOLOGIAS.find((t) => t.id === op.tecnologiaId)?.nombre ?? ''} N1`;
  }

  if (op.nivelSeguridad === 2) return null;

  if (op.nivel >= 2 && !tieneN2Tech) {
    return `Bloqueada: falta Seguridad N2 de esta tecnología`;
  }

  return null;
}

export function calcularAvanceDemo(
  usuario: Fase2Usuario,
  tecnologiaIds: number[],
  completadasPorOpId: Record<number, boolean> | Set<number> = {}
): { pct: number; completadas: number; total: number } {
  const vista = getOperacionesVisiblesParaUsuario(usuario, tecnologiaIds);
  const ops = [...vista.tronco, ...vista.porTecnologia.flatMap((p) => p.operaciones)];
  const total = ops.length;
  if (total === 0) return { pct: 0, completadas: 0, total: 0 };

  const done = (id: number, idx: number): boolean => {
    if (completadasPorOpId instanceof Set) return completadasPorOpId.has(id);
    if (completadasPorOpId[id] != null) return completadasPorOpId[id];
    return idx % 3 !== 0;
  };

  const completadas = ops.filter((o, idx) => done(o.id, idx)).length;
  return { pct: Math.round((completadas / total) * 100), completadas, total };
}

export function calcularMultihabilidadDemo(
  usuario: Fase2Usuario,
  nivelesPorTech: Record<number, number> = {}
): { basicasN4: number; complejasN4: number; techsActivas: number } {
  const techs = FASE2_TECNOLOGIAS.filter(
    (t) => t.areaId === usuario.areaId && usuario.tecnologiaIds.includes(t.id)
  );
  let basicasN4 = 0;
  let complejasN4 = 0;
  techs.forEach((t) => {
    const nivel = nivelesPorTech[t.id] ?? (t.id <= 4 ? 4 : t.id === 5 ? 3 : 2);
    if (nivel >= 4) {
      if (t.complejidad === 'basica') basicasN4 += 1;
      else complejasN4 += 1;
    }
  });
  return { basicasN4, complejasN4, techsActivas: techs.length };
}

export function pickPreguntasExamenAleatorias(
  areaId: number,
  nivel: NivelEvaluacion,
  cantidad = 10
): Fase2PreguntaExamen[] {
  const pool = FASE2_PREGUNTAS_EXAMEN.filter((p) => p.areaId === areaId && p.nivel === nivel);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(cantidad, shuffled.length));
}

export function nivelExamenAlCompletarOp(
  op: Fase2Operacion,
  completadasAntes: Set<number>,
  completadasDespues: Set<number>
): NivelEvaluacion | null {
  if (!NIVELES_EXAMEN_AUTO.includes(op.nivel)) return null;
  if (completadasAntes.has(op.id)) return null;
  if (!completadasDespues.has(op.id)) return null;
  if (op.esPrerrequisitoSeguridad && op.nivelSeguridad === 2) return 2;
  if (!op.esPrerrequisitoSeguridad && (op.nivel === 3 || op.nivel === 4)) return op.nivel;
  return null;
}
