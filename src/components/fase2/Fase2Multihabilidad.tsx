import React, { useMemo } from 'react';
import {
  FASE2_AREAS,
  FASE2_USUARIOS,
  calcularAvanceDemo,
  calcularMultihabilidadDemo,
  esPosicionEvaluadora,
} from '../../mock/fase2/data';
import { REQUISITO_PROGRESO } from '../../mock/fase2/types';

const Fase2Multihabilidad: React.FC = () => {
  const operadores = useMemo(
    () => FASE2_USUARIOS.filter((u) => !esPosicionEvaluadora(u.posicion)),
    []
  );

  return (
    <div>
      <h2>Multihabilidad y avance</h2>
      <p className="fase2-note" style={{ marginTop: '0.5rem' }}>
        Básicas (p. ej. Crusader) y complejas (p. ej. Delta) sirven para{' '}
        <strong>aprendizaje progresivo</strong>, no como categoría salarial. El % de avance solo cuenta
        operaciones <strong>asignadas</strong>. Indicador de progreso: {REQUISITO_PROGRESO.basicasN4} básicas +{' '}
        {REQUISITO_PROGRESO.complejasN4} complejas en N4.
      </p>

      {FASE2_AREAS.filter((a) => a.id !== 3).map((area) => {
        const lista = operadores.filter((u) => u.areaId === area.id);
        return (
          <div key={area.id}>
            <h3 className="fase2-section-title">
              {area.nombre}
              {area.esPiloto && <span className="fase2-badge-piloto">Piloto</span>}
            </h3>
            <div className="fase2-grid-cards">
              {lista.map((u) => {
                const mult = calcularMultihabilidadDemo(u);
                const avance = calcularAvanceDemo(u, u.tecnologiaIds, {});
                return (
                  <div key={u.id} className="fase2-card" style={{ cursor: 'default' }}>
                    <h3>{u.nombre}</h3>
                    <p>
                      {u.numeroEmpleado} · {u.posicion}
                    </p>
                    {!u.seguridadMaquinariaN1 && (
                      <span className="fase2-badge-lock">Seguridad N1 pendiente — techs bloqueadas</span>
                    )}
                    <p style={{ marginTop: '0.5rem' }}>
                      Avance activo: <strong>{avance.pct}%</strong> ({avance.completadas}/{avance.total} ops
                      asignadas)
                    </p>
                    <p>
                      Progreso: {mult.basicasN4}/{REQUISITO_PROGRESO.basicasN4} básicas N4 · {mult.complejasN4}/
                      {REQUISITO_PROGRESO.complejasN4} complejas N4
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <h3 className="fase2-section-title">Trazabilidad – cambio de área</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
        El historial (ops acreditadas) permanece y se usa en reportes. No se borra al transferir.
      </p>
      {FASE2_USUARIOS.filter((u) => u.historialAreas?.length).map((u) => (
        <div key={u.id} className="fase2-bloque-gris">
          <h4>{u.nombre}</h4>
          <p>
            Área activa: <strong>{FASE2_AREAS.find((a) => a.id === u.areaId)?.nombre}</strong>
          </p>
          {u.historialAreas?.map((h, i) => (
            <div key={i} className="fase2-historial-row">
              <span className="fase2-badge-archivado">Histórico</span>
              <span>
                {h.areaNombre} ({h.periodo}) — {h.nota}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Fase2Multihabilidad;
