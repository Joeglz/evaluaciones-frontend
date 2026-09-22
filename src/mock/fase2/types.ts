/** Tipos del prototipo Fase 2 (tecnologías). Datos demo; no sustituyen la API actual. */

/** Posiciones jerárquicas (junta 6 ago 2026): se conservan; no se reducen a 3. */
export type PosicionJerarquicaSlug =
  | 'auxiliar'
  | 'titular'
  | 'vectrista'
  | 'entrenador'
  | 'lider';

/** @deprecated Usar PosicionJerarquicaSlug */
export type PosicionCanonicaSlug = PosicionJerarquicaSlug;

export type TecnologiaComplejidad = 'basica' | 'compleja';

export type NivelEvaluacion = 1 | 2 | 3 | 4;

export interface Fase2Area {
  id: number;
  nombre: string;
  tipo: 'produccion' | 'soporte';
  esPiloto?: boolean;
}

export interface Fase2Tecnologia {
  id: number;
  nombre: string;
  areaId: number;
  orden: number;
  complejidad: TecnologiaComplejidad;
}

export interface Fase2Operacion {
  id: number;
  nombre: string;
  nivel: NivelEvaluacion;
  tecnologiaId: number | null;
  esTroncoComun: boolean;
  troncoPrioritario: boolean;
  /** Seguridad N1/N2 que bloquea el resto de ops de esa tech (o del tronco si es global). */
  esPrerrequisitoSeguridad?: boolean;
  nivelSeguridad?: 1 | 2;
}

export interface Fase2Grupo {
  id: number;
  nombre: string;
  areaId: number;
  supervisorNombre: string;
}

export interface Fase2HistorialArea {
  areaNombre: string;
  periodo: string;
  archivado: boolean;
  nota?: string;
}

export interface Fase2SeguridadTech {
  n1: boolean;
  n2: boolean;
}

export interface Fase2Usuario {
  id: number;
  nombre: string;
  numeroEmpleado: string;
  areaId: number;
  grupoId: number;
  posicion: PosicionJerarquicaSlug;
  tecnologiaIds: number[];
  /** Certificación N1 de seguridad maquinaria (tronco): bloquea TODA operación si falta. */
  seguridadMaquinariaN1: boolean;
  /** Seguridad N1/N2 por tecnología asignada. */
  seguridadPorTecnologia?: Record<number, Fase2SeguridadTech>;
  historialAreas?: Fase2HistorialArea[];
}

export interface Fase2PreguntaExamen {
  id: number;
  areaId: number;
  nivel: NivelEvaluacion;
  texto: string;
  opciones: string[];
  correcta: number;
}

export const POSICIONES_JERARQUICAS: {
  slug: PosicionJerarquicaSlug;
  label: string;
  puedeEvaluarArea: boolean;
}[] = [
  { slug: 'auxiliar', label: 'Auxiliar', puedeEvaluarArea: false },
  { slug: 'titular', label: 'Titular', puedeEvaluarArea: false },
  { slug: 'vectrista', label: 'Vectrista', puedeEvaluarArea: false },
  { slug: 'entrenador', label: 'Entrenador', puedeEvaluarArea: true },
  { slug: 'lider', label: 'Líder', puedeEvaluarArea: true },
];

/** Alias de presentación: mismas 5 posiciones de la junta del 6 ago. */
export const POSICIONES_CANONICAS = POSICIONES_JERARQUICAS;

/** Indicador de aprendizaje progresivo (no tope salarial). Junta 6 ago. */
export const REQUISITO_PROGRESO = {
  basicasN4: 5,
  complejasN4: 3,
};

/** @deprecated Usar REQUISITO_PROGRESO */
export const REQUISITO_SALARIO = REQUISITO_PROGRESO;

export const NIVELES_EXAMEN_AUTO: NivelEvaluacion[] = [2, 3, 4];
