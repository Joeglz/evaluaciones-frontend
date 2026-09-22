import type { Evaluacion, Tecnologia } from '../../services/api';

/** Nivel operativo N1–N4 (prioriza nivel_posicion sobre campo legacy `nivel`). */
export function nivelDeOp(op: Evaluacion): number | null {
  return op.nivel_posicion_data?.nivel ?? op.nivel ?? null;
}

export function idsDeOp(op: Evaluacion): number[] {
  if (op.tecnologia_ids && op.tecnologia_ids.length > 0) {
    return op.tecnologia_ids;
  }
  if (op.tecnologia != null) {
    return [op.tecnologia];
  }
  return [];
}

export function resumenEtiquetasOp(
  op: Evaluacion,
  tecnologias: Tecnologia[],
): string[] {
  const chips: string[] = [];
  if (op.es_tronco_comun) {
    chips.push('Tronco');
  }
  const ids = idsDeOp(op);
  tecnologias.forEach((t) => {
    if (!op.es_tronco_comun && ids.includes(t.id)) {
      chips.push(t.name);
    }
  });
  if (op.es_prerrequisito_seguridad) {
    if (op.es_tronco_comun) {
      chips.push('Seg. N1');
    } else if (op.nivel_seguridad === 2) {
      chips.push('Seg. N2');
    } else {
      chips.push('Seg. N1');
    }
  }
  return chips;
}
