import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import {
  apiService,
  type Evaluacion,
  type Tecnologia,
} from '../../services/api';
import FormularioTecnologias from './Fase2FormularioTecnologias';
import {
  idsDeOp,
  nivelDeOp,
  posicionDeOp,
} from '../../utils/evaluacionEtiquetaUtils';
import './Fase2MultihabilidadEmbed.css';

type FiltroTech = 'todos' | 'sin' | 'tronco' | number;

interface Fase2MultihabilidadEmbedProps {
  areaId: number;
}

const Fase2MultihabilidadEmbed: React.FC<Fase2MultihabilidadEmbedProps> = ({
  areaId,
}) => {
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);
  const [ops, setOps] = useState<Evaluacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [cargado, setCargado] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState<number | 'todos'>('todos');
  const [filtroTech, setFiltroTech] = useState<FiltroTech>('todos');
  const [filtroPosicion, setFiltroPosicion] = useState<number | 'todos'>('todos');
  const [opSeleccionadaId, setOpSeleccionadaId] = useState<number | null>(null);

  const cargarArea = useCallback(async (id: number) => {
    setError(null);
    const [techs, evaluaciones] = await Promise.all([
      apiService.getTecnologias({ area_id: id }),
      apiService.getEvaluaciones({ area_id: id, es_plantilla: false }),
    ]);
    setTecnologias(techs);
    setOps(evaluaciones);
    setCargado(true);
  }, []);

  useEffect(() => {
    setCargado(false);
    setOpSeleccionadaId(null);
    setFiltroTech('todos');
    setFiltroPosicion('todos');
    void cargarArea(areaId);
  }, [areaId, cargarArea]);

  const techsActivas = useMemo(
    () => tecnologias.filter((t) => t.is_active),
    [tecnologias],
  );

  const posicionesFiltro = useMemo(() => {
    const map = new Map<number, string>();
    ops.forEach((op) => {
      const { id, nombre } = posicionDeOp(op);
      if (id != null) {
        map.set(id, nombre);
      }
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [ops]);

  const opsFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = ops.filter((op) => {
      const nivelOp = nivelDeOp(op);
      if (filtroNivel !== 'todos' && nivelOp !== filtroNivel) {
        return false;
      }
      const pos = posicionDeOp(op);
      if (filtroPosicion !== 'todos' && pos.id !== filtroPosicion) {
        return false;
      }
      const ids = idsDeOp(op);
      if (filtroTech === 'sin') {
        if (op.es_tronco_comun || ids.length > 0) {
          return false;
        }
      } else if (filtroTech === 'tronco') {
        if (!op.es_tronco_comun) {
          return false;
        }
      } else if (typeof filtroTech === 'number') {
        if (op.es_tronco_comun || !ids.includes(filtroTech)) {
          return false;
        }
      }
      if (!q) {
        return true;
      }
      const hayNombre = (op.nombre || '').toLowerCase().includes(q);
      const hayPos = pos.nombre.toLowerCase().includes(q);
      return hayNombre || hayPos;
    });
    return filtradas.sort((a, b) => {
      const pa = posicionDeOp(a).nombre;
      const pb = posicionDeOp(b).nombre;
      const byPos = pa.localeCompare(pb, 'es');
      if (byPos !== 0) {
        return byPos;
      }
      return (a.nombre || '').localeCompare(b.nombre || '', 'es');
    });
  }, [ops, busqueda, filtroNivel, filtroTech, filtroPosicion]);

  const guardarEtiqueta = async (
    op: Evaluacion,
    patch: Parameters<typeof apiService.patchEvaluacion>[1],
  ) => {
    setSavingId(op.id);
    try {
      const updated = await apiService.patchEvaluacion(op.id, patch);
      setOps((prev) =>
        prev.map((e) => (e.id === op.id ? { ...e, ...updated } : e)),
      );
    } catch {
      setError('No se pudo guardar la etiqueta.');
    } finally {
      setSavingId(null);
    }
  };

  const marcarTronco = (op: Evaluacion, on: boolean) => {
    void guardarEtiqueta(op, {
      es_tronco_comun: on,
      tecnologia_ids: [],
      es_prerrequisito_seguridad: on
        ? Boolean(op.es_prerrequisito_seguridad)
        : false,
      tronco_prioritario: on ? Boolean(op.tronco_prioritario) : false,
      nivel_seguridad: on ? op.nivel_seguridad ?? null : null,
    });
  };

  const toggleTech = (op: Evaluacion, techId: number, on: boolean) => {
    const actuales = idsDeOp(op);
    const next = on
      ? Array.from(new Set([...actuales, techId]))
      : actuales.filter((id) => id !== techId);
    const keepCandado =
      next.length > 0 &&
      Boolean(op.es_prerrequisito_seguridad && !op.es_tronco_comun);
    void guardarEtiqueta(op, {
      es_tronco_comun: false,
      tecnologia_ids: next,
      es_prerrequisito_seguridad: keepCandado,
      tronco_prioritario: false,
      nivel_seguridad: keepCandado ? op.nivel_seguridad ?? null : null,
    });
  };

  const marcarCandadoN1 = (op: Evaluacion, on: boolean) => {
    void guardarEtiqueta(op, {
      es_tronco_comun: on || Boolean(op.es_tronco_comun),
      tecnologia_ids: on ? [] : idsDeOp(op),
      es_prerrequisito_seguridad: on,
      tronco_prioritario: on,
      nivel_seguridad: on ? 1 : null,
    });
  };

  const marcarCandadoTech = (op: Evaluacion, nivel: 1 | 2, on: boolean) => {
    void guardarEtiqueta(op, {
      es_tronco_comun: false,
      tecnologia_ids: idsDeOp(op),
      es_prerrequisito_seguridad: on,
      tronco_prioritario: false,
      nivel_seguridad: on ? nivel : null,
    });
  };

  const renderCandados = (op: Evaluacion) => {
    const ids = idsDeOp(op);
    const tieneTechs = !op.es_tronco_comun && ids.length > 0;
    const esCandadoTech = Boolean(
      op.es_prerrequisito_seguridad && !op.es_tronco_comun,
    );
    const guardando = savingId === op.id;

    return (
      <div className="f2-embed-detail">
        <div className="f2-embed-detail__head">
          <div>
            <h4 className="f2-embed-detail__title">Candados seguridad</h4>
            <span className="f2-embed-detail__nivel">{op.nombre}</span>
          </div>
          <button
            type="button"
            className="f2-embed-detail__close"
            onClick={() => setOpSeleccionadaId(null)}
            aria-label="Cerrar candados"
          >
            <FaTimes />
          </button>
        </div>
        {guardando && (
          <p className="f2-embed-detail__saving" aria-live="polite">
            Guardando...
          </p>
        )}
        <div className="f2-embed-detail__candados">
          {tieneTechs ? (
            <>
              <label className="f2-embed-toggle">
                <input
                  type="checkbox"
                  disabled={guardando}
                  checked={esCandadoTech && op.nivel_seguridad === 1}
                  onChange={(e) => marcarCandadoTech(op, 1, e.target.checked)}
                />
                <span>Seguridad N1 (línea)</span>
              </label>
              <label className="f2-embed-toggle">
                <input
                  type="checkbox"
                  disabled={guardando}
                  checked={esCandadoTech && op.nivel_seguridad === 2}
                  onChange={(e) => marcarCandadoTech(op, 2, e.target.checked)}
                />
                <span>Seguridad N2 (línea)</span>
              </label>
            </>
          ) : (
            <label className="f2-embed-toggle">
              <input
                type="checkbox"
                disabled={guardando}
                checked={Boolean(
                  op.es_prerrequisito_seguridad && op.es_tronco_comun,
                )}
                onChange={(e) => marcarCandadoN1(op, e.target.checked)}
              />
              <span>Seguridad N1 (tronco)</span>
            </label>
          )}
        </div>
        <p className="f2-embed-detail__hint">
          Tronco y tecnologías se marcan en la fila sin abrir. Aquí solo los
          candados de seguridad.
        </p>
      </div>
    );
  };

  if (!cargado) {
    return (
      <div className="f2-embed">
        <p className="f2-embed-loading">Cargando catálogo multihabilidad...</p>
      </div>
    );
  }

  return (
    <div className="f2-embed">
      {error && <p className="f2-embed-error">{error}</p>}

      <FormularioTecnologias
        areaId={areaId}
        tecnologias={tecnologias}
        onRefresh={() => cargarArea(areaId)}
        onError={setError}
      />

      <div className="f2-embed-toolbar">
        <div className="f2-embed-search">
          <FaSearch aria-hidden />
          <input
            type="search"
            placeholder="Buscar operación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar operación"
          />
        </div>
        <div className="f2-embed-nivel-filters" role="tablist" aria-label="Filtrar por nivel">
          {(['todos', 1, 2, 3, 4] as const).map((n) => (
            <button
              key={String(n)}
              type="button"
              role="tab"
              aria-selected={filtroNivel === n}
              className={`f2-embed-nivel-chip${filtroNivel === n ? ' is-active' : ''}`}
              onClick={() => setFiltroNivel(n)}
            >
              {n === 'todos' ? 'Todos' : `N${n}`}
            </button>
          ))}
        </div>
      </div>

      <div
        className="f2-embed-nivel-filters f2-embed-tech-filters"
        role="tablist"
        aria-label="Filtrar por posición"
      >
        <button
          type="button"
          role="tab"
          aria-selected={filtroPosicion === 'todos'}
          className={`f2-embed-nivel-chip${filtroPosicion === 'todos' ? ' is-active' : ''}`}
          onClick={() => setFiltroPosicion('todos')}
        >
          Todas posiciones
        </button>
        {posicionesFiltro.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={filtroPosicion === p.id}
            className={`f2-embed-nivel-chip${filtroPosicion === p.id ? ' is-active' : ''}`}
            onClick={() => setFiltroPosicion(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      <div
        className="f2-embed-nivel-filters f2-embed-tech-filters"
        role="tablist"
        aria-label="Filtrar por tecnología"
      >
        {(
          [
            { key: 'todos' as const, label: 'Todas' },
            { key: 'sin' as const, label: 'Sin etiqueta' },
            { key: 'tronco' as const, label: 'Tronco' },
            ...techsActivas.map((t) => ({
              key: t.id as FiltroTech,
              label: t.name,
            })),
          ] as { key: FiltroTech; label: string }[]
        ).map((item) => (
          <button
            key={String(item.key)}
            type="button"
            role="tab"
            aria-selected={filtroTech === item.key}
            className={`f2-embed-nivel-chip${filtroTech === item.key ? ' is-active' : ''}`}
            onClick={() => setFiltroTech(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="f2-embed-count">
        {opsFiltradas.length} operación{opsFiltradas.length === 1 ? '' : 'es'} ·
        posición en cada fila · candados al abrir
      </p>

      <ul className="f2-embed-op-list">
        {opsFiltradas.map((op) => {
          const ids = idsDeOp(op);
          const activa = opSeleccionadaId === op.id;
          const nivelOp = nivelDeOp(op);
          const pos = posicionDeOp(op);
          const guardando = savingId === op.id;
          const tieneCandado = Boolean(op.es_prerrequisito_seguridad);

          return (
            <li key={op.id} className="f2-embed-op-item">
              <div className={`f2-embed-op-card${activa ? ' is-active' : ''}`}>
                <div className="f2-embed-op-card__main">
                  <span className="f2-embed-op-row__nivel">
                    {nivelOp != null ? `N${nivelOp}` : 'N?'}
                  </span>
                  <div className="f2-embed-op-card__body">
                    <span className="f2-embed-op-row__nombre">{op.nombre}</span>
                    <span className="f2-embed-op-row__posicion">{pos.nombre}</span>
                    <div
                      className="f2-embed-op-inline-techs"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <label className="f2-embed-inline-check">
                        <input
                          type="checkbox"
                          disabled={guardando}
                          checked={Boolean(op.es_tronco_comun)}
                          onChange={(e) => marcarTronco(op, e.target.checked)}
                        />
                        <span>Tronco</span>
                      </label>
                      {techsActivas.map((t) => (
                        <label key={t.id} className="f2-embed-inline-check">
                          <input
                            type="checkbox"
                            disabled={guardando || Boolean(op.es_tronco_comun)}
                            checked={!op.es_tronco_comun && ids.includes(t.id)}
                            onChange={(e) =>
                              toggleTech(op, t.id, e.target.checked)
                            }
                          />
                          <span>{t.name}</span>
                        </label>
                      ))}
                      {guardando && (
                        <span className="f2-embed-inline-saving">Guardando…</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`f2-embed-op-candado-btn${tieneCandado ? ' has-candado' : ''}${activa ? ' is-open' : ''}`}
                    onClick={() =>
                      setOpSeleccionadaId(activa ? null : op.id)
                    }
                    aria-expanded={activa}
                    aria-label={
                      activa
                        ? 'Cerrar candados de seguridad'
                        : 'Abrir candados de seguridad'
                    }
                  >
                    Candados
                  </button>
                </div>
                {activa && renderCandados(op)}
              </div>
            </li>
          );
        })}
      </ul>

      {opsFiltradas.length === 0 && (
        <p className="f2-embed-empty">No hay operaciones con ese filtro.</p>
      )}
    </div>
  );
};

export default Fase2MultihabilidadEmbed;
