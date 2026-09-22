import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import {
  apiService,
  type Evaluacion,
  type Tecnologia,
} from '../../services/api';
import FormularioTecnologias from './Fase2FormularioTecnologias';
import { idsDeOp, nivelDeOp, resumenEtiquetasOp } from './fase2MultihabilidadUtils';
import './Fase2MultihabilidadEmbed.css';

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
    void cargarArea(areaId);
  }, [areaId, cargarArea]);

  const techsActivas = useMemo(
    () => tecnologias.filter((t) => t.is_active),
    [tecnologias],
  );

  const opsFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ops.filter((op) => {
      const nivelOp = nivelDeOp(op);
      if (filtroNivel !== 'todos' && nivelOp !== filtroNivel) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (op.nombre || '').toLowerCase().includes(q);
    });
  }, [ops, busqueda, filtroNivel]);

  const opSeleccionada = useMemo(
    () => ops.find((o) => o.id === opSeleccionadaId) ?? null,
    [ops, opSeleccionadaId],
  );

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

  const renderDetalleOp = (op: Evaluacion) => {
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
            <h4 className="f2-embed-detail__title">{op.nombre}</h4>
            <span className="f2-embed-detail__nivel">
              Nivel {nivelDeOp(op) ?? '?'}
            </span>
          </div>
          <button
            type="button"
            className="f2-embed-detail__close"
            onClick={() => setOpSeleccionadaId(null)}
            aria-label="Cerrar detalle"
          >
            <FaTimes />
          </button>
        </div>
        {guardando && (
          <p className="f2-embed-detail__saving" aria-live="polite">
            Guardando...
          </p>
        )}
        <div className="f2-embed-detail__toggles">
          <label className="f2-embed-toggle">
            <input
              type="checkbox"
              disabled={guardando}
              checked={Boolean(op.es_tronco_comun)}
              onChange={(e) => marcarTronco(op, e.target.checked)}
            />
            <span>Tronco común</span>
          </label>
          {techsActivas.map((t) => (
            <label key={t.id} className="f2-embed-toggle">
              <input
                type="checkbox"
                disabled={guardando || Boolean(op.es_tronco_comun)}
                checked={!op.es_tronco_comun && ids.includes(t.id)}
                onChange={(e) => toggleTech(op, t.id, e.target.checked)}
              />
              <span>{t.name}</span>
            </label>
          ))}
        </div>
        <div className="f2-embed-detail__candados">
          <span className="f2-embed-detail__candados-label">Candados seguridad</span>
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
          Los cambios se guardan al instante. Tronco común quita las tecnologías
          de la operación.
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

      <p className="f2-embed-count">
        {opsFiltradas.length} operación{opsFiltradas.length === 1 ? '' : 'es'} ·
        guardado automático
      </p>

      <ul className="f2-embed-op-list">
        {opsFiltradas.map((op) => {
          const chips = resumenEtiquetasOp(op, techsActivas);
          const activa = opSeleccionadaId === op.id;
          const nivelOp = nivelDeOp(op);
          return (
            <li key={op.id}>
              <button
                type="button"
                className={`f2-embed-op-row${activa ? ' is-active' : ''}`}
                onClick={() =>
                  setOpSeleccionadaId(activa ? null : op.id)
                }
                aria-expanded={activa}
              >
                <span className="f2-embed-op-row__nivel">
                  {nivelOp != null ? `N${nivelOp}` : 'N?'}
                </span>
                <span className="f2-embed-op-row__nombre">{op.nombre}</span>
                <span className="f2-embed-op-row__chips">
                  {chips.length === 0 ? (
                    <span className="f2-embed-chip f2-embed-chip--muted">Sin etiqueta</span>
                  ) : (
                    chips.map((c) => (
                      <span key={c} className="f2-embed-chip">
                        {c}
                      </span>
                    ))
                  )}
                </span>
              </button>
              {activa && renderDetalleOp(op)}
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
