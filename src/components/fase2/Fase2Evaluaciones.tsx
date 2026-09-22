import React, { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import {
  FASE2_AREAS,
  FASE2_USUARIOS,
  calcularAvanceDemo,
  esPosicionEvaluadora,
  getGruposByArea,
  getOperacionesVisiblesParaUsuario,
  nivelExamenAlCompletarOp,
  opsCompletadasIniciales,
  razonBloqueoOperacion,
  usuarioPuedeAsignarTecnologias,
  usuarioTieneSeguridadGlobalN1,
} from '../../mock/fase2/data';
import {
  POSICIONES_JERARQUICAS,
  type Fase2Operacion,
  type Fase2Usuario,
  type NivelEvaluacion,
  type PosicionJerarquicaSlug,
} from '../../mock/fase2/types';

type View = 'areas' | 'grupos' | 'posiciones' | 'usuarios' | 'operaciones';

const Fase2Evaluaciones: React.FC = () => {
  const [view, setView] = useState<View>('areas');
  const [areaId, setAreaId] = useState<number | null>(null);
  const [grupoId, setGrupoId] = useState<number | null>(null);
  const [posicion, setPosicion] = useState<PosicionJerarquicaSlug | null>(null);
  const [usuario, setUsuario] = useState<Fase2Usuario | null>(null);
  const [completadas, setCompletadas] = useState<Set<number>>(new Set());
  const [examenAuto, setExamenAuto] = useState<NivelEvaluacion | null>(null);

  const grupos = areaId != null ? getGruposByArea(areaId) : [];
  const usuariosFiltrados = useMemo(() => {
    if (areaId == null || grupoId == null || !posicion) return [];
    return FASE2_USUARIOS.filter(
      (u) => u.areaId === areaId && u.grupoId === grupoId && u.posicion === posicion
    );
  }, [areaId, grupoId, posicion]);

  const vistaOperaciones = usuario ? getOperacionesVisiblesParaUsuario(usuario) : null;
  const posicionMeta = POSICIONES_JERARQUICAS.find((p) => p.slug === posicion);

  useEffect(() => {
    if (usuario) {
      setCompletadas(opsCompletadasIniciales(usuario));
      setExamenAuto(null);
    }
  }, [usuario]);

  const goBack = () => {
    if (view === 'operaciones') {
      setView('usuarios');
      setUsuario(null);
      setExamenAuto(null);
    } else if (view === 'usuarios') {
      setView('posiciones');
      setPosicion(null);
    } else if (view === 'posiciones') {
      setView('grupos');
      setGrupoId(null);
    } else if (view === 'grupos') {
      setView('areas');
      setAreaId(null);
    }
  };

  const toggleOp = (op: Fase2Operacion) => {
    if (!usuario) return;
    const razon = razonBloqueoOperacion(usuario, op, completadas);
    if (razon && !completadas.has(op.id)) return;

    setCompletadas((prev) => {
      const next = new Set(prev);
      if (next.has(op.id)) {
        next.delete(op.id);
        setExamenAuto(null);
      } else {
        next.add(op.id);
        const nivel = nivelExamenAlCompletarOp(op, prev, next);
        if (nivel) setExamenAuto(nivel);
      }
      return next;
    });
  };

  const renderOpItem = (op: Fase2Operacion) => {
    if (!usuario) return null;
    const razon = razonBloqueoOperacion(usuario, op, completadas);
    const done = completadas.has(op.id);
    const bloqueada = Boolean(razon) && !done;
    return (
      <li key={op.id} className={bloqueada ? 'fase2-op-bloqueada' : undefined}>
        <button
          type="button"
          className="fase2-op-toggle"
          disabled={bloqueada}
          onClick={() => toggleOp(op)}
          title={razon ?? 'Marcar / desmarcar (demo)'}
        >
          <span>
            {op.nombre}
            {op.esPrerrequisitoSeguridad && (
              <span className="fase2-badge-seguridad" style={{ marginLeft: '0.5rem' }}>
                Seguridad N{op.nivelSeguridad ?? op.nivel}
              </span>
            )}
            {bloqueada && (
              <span className="fase2-badge-lock" style={{ marginLeft: '0.5rem' }}>
                Bloqueada
              </span>
            )}
            {done && !bloqueada && (
              <span className="fase2-badge-ok" style={{ marginLeft: '0.5rem' }}>
                Hecha
              </span>
            )}
          </span>
          <span className="fase2-badge-nivel">Nivel {op.nivel}</span>
        </button>
        {bloqueada && razon && <small className="fase2-op-razon">{razon}</small>}
      </li>
    );
  };

  if (view === 'areas') {
    return (
      <div>
        <h2>Evaluaciones (Fase 2)</h2>
        <p className="fase2-note" style={{ marginTop: '0.75rem' }}>
          Empieza por <strong>Strap Attach</strong> (piloto). Toca una operación habilitada para simular
          certificación y ver el candado N1/N2.
        </p>
        <div className="fase2-grid-cards" style={{ marginTop: '1rem' }}>
          {FASE2_AREAS.map((a) => (
            <button
              key={a.id}
              type="button"
              className="fase2-card"
              onClick={() => {
                setAreaId(a.id);
                setView('grupos');
              }}
              style={{ textAlign: 'left', width: '100%' }}
            >
              <h3>
                {a.nombre}
                {a.esPiloto && <span className="fase2-badge-piloto">Piloto</span>}
              </h3>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'grupos') {
    return (
      <div>
        <div className="fase2-header">
          <button type="button" className="fase2-btn-back" onClick={goBack}>
            <FaArrowLeft /> Volver
          </button>
          <h2>Grupos</h2>
        </div>
        <div className="fase2-grid-cards">
          {grupos.map((g) => (
            <button
              key={g.id}
              type="button"
              className="fase2-card"
              onClick={() => {
                setGrupoId(g.id);
                setView('posiciones');
              }}
              style={{ textAlign: 'left', width: '100%' }}
            >
              <h3>{g.nombre}</h3>
              <p>{g.supervisorNombre}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'posiciones') {
    return (
      <div>
        <div className="fase2-header">
          <button type="button" className="fase2-btn-back" onClick={goBack}>
            <FaArrowLeft /> Volver
          </button>
          <h2>Posición</h2>
        </div>
        <div className="fase2-grid-cards">
          {POSICIONES_JERARQUICAS.map((p) => (
            <button
              key={p.slug}
              type="button"
              className="fase2-card"
              onClick={() => {
                setPosicion(p.slug);
                setView('usuarios');
              }}
              style={{ textAlign: 'left', width: '100%' }}
            >
              <h3>{p.label}</h3>
              <p>
                {p.puedeEvaluarArea
                  ? 'Evalúa y autoriza todo el área (tronco + todas las techs)'
                  : 'Solo tecnologías asignadas al usuario'}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'usuarios') {
    return (
      <div>
        <div className="fase2-header">
          <button type="button" className="fase2-btn-back" onClick={goBack}>
            <FaArrowLeft /> Volver
          </button>
          <h2>{posicionMeta?.label ?? ''} – Usuarios</h2>
        </div>
        <div className="fase2-grid-cards">
          {usuariosFiltrados.map((u) => (
            <button
              key={u.id}
              type="button"
              className="fase2-card"
              onClick={() => {
                setUsuario(u);
                setView('operaciones');
              }}
              style={{ textAlign: 'left', width: '100%' }}
            >
              <h3>{u.nombre}</h3>
              <p>
                {u.numeroEmpleado}
                {!esPosicionEvaluadora(u.posicion) && ` · Tecnologías: ${u.tecnologiaIds.length}`}
                {!u.seguridadMaquinariaN1 ? ' · Sin Seg. N1' : ''}
              </p>
            </button>
          ))}
          {usuariosFiltrados.length === 0 && <p>No hay usuarios demo para esta combinación.</p>}
        </div>
      </div>
    );
  }

  if (!usuario || !vistaOperaciones) return null;

  const avance = calcularAvanceDemo(usuario, usuario.tecnologiaIds, completadas);
  const tieneN1 = usuarioTieneSeguridadGlobalN1(usuario, completadas);

  return (
    <div>
      <div className="fase2-header">
        <button type="button" className="fase2-btn-back" onClick={goBack}>
          <FaArrowLeft /> Volver
        </button>
        <h2>{usuario.nombre}</h2>
      </div>
      <div className="fase2-avance-bar">
        Avance (solo ops asignadas): <strong>{avance.pct}%</strong> — {avance.completadas}/{avance.total}{' '}
        operaciones
      </div>
      {!usuarioPuedeAsignarTecnologias(usuario) && !tieneN1 && (
        <p className="fase2-note">
          Tecnologías bloqueadas hasta certificar <strong>Seguridad en operación de maquinaria N1</strong>.
          Toca esa operación del tronco para simularlo.
        </p>
      )}
      {examenAuto && (
        <div className="fase2-exam-prompt">
          Al completar el nivel {examenAuto} el sistema <strong>abre el examen automáticamente</strong> (10
          preguntas del banco; con 15+ sortea 10). Ve a la pestaña Exámenes y elige N{examenAuto}.
        </div>
      )}
      <h3 className="fase2-section-title">Tronco común</h3>
      <ul className="fase2-operacion-list">{vistaOperaciones.tronco.map(renderOpItem)}</ul>

      {vistaOperaciones.porTecnologia.map(({ tecnologia, operaciones }) => (
        <div key={tecnologia.id}>
          <h3 className="fase2-section-title">
            Tecnología: {tecnologia.nombre}{' '}
            <small style={{ fontWeight: 400, color: '#64748b' }}>({tecnologia.complejidad})</small>
          </h3>
          <ul className="fase2-operacion-list">{operaciones.map(renderOpItem)}</ul>
        </div>
      ))}
    </div>
  );
};

export default Fase2Evaluaciones;
