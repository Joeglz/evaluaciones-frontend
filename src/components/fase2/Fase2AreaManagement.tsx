import React, { useCallback, useEffect, useState } from 'react';
import { apiService, type Area, type Evaluacion, type Tecnologia } from '../../services/api';
import Fase2MultihabilidadEmbed from './Fase2MultihabilidadEmbed';
import { idsDeOp, nivelDeOp } from './fase2MultihabilidadUtils';
import './Fase2Prototype.css';

type FilaOperacionEtiquetaProps = {
  op: Evaluacion;
  tecnologias: Tecnologia[];
  savingId: number | null;
  onMarcarTronco: (op: Evaluacion, on: boolean) => void;
  onToggleTech: (op: Evaluacion, techId: number, on: boolean) => void;
  onMarcarCandadoN1Tronco: (op: Evaluacion, on: boolean) => void;
  onMarcarCandadoTech: (op: Evaluacion, nivel: 1 | 2, on: boolean) => void;
};

const FilaOperacionEtiqueta: React.FC<FilaOperacionEtiquetaProps> = ({
  op,
  tecnologias,
  savingId,
  onMarcarTronco,
  onToggleTech,
  onMarcarCandadoN1Tronco,
  onMarcarCandadoTech,
}) => {
  const ids = idsDeOp(op);
  const tieneTechs = !op.es_tronco_comun && ids.length > 0;
  const esCandadoTech = Boolean(op.es_prerrequisito_seguridad && !op.es_tronco_comun);
  return (
    <li style={{ flexWrap: 'wrap' }}>
      <span>
        {op.nombre}
        <small style={{ marginLeft: '0.5rem', color: '#64748b' }}>
          N{nivelDeOp(op) ?? '?'}
        </small>
      </span>
      <span className="fase2-tech-checks">
        <label>
          <input
            type="checkbox"
            className="fase2-check"
            disabled={savingId === op.id}
            checked={Boolean(op.es_tronco_comun)}
            onChange={(e) => onMarcarTronco(op, e.target.checked)}
          />
          Tronco
        </label>
        {tecnologias.map((t) => (
          <label key={t.id}>
            <input
              type="checkbox"
              className="fase2-check"
              disabled={savingId === op.id || Boolean(op.es_tronco_comun)}
              checked={!op.es_tronco_comun && ids.includes(t.id)}
              onChange={(e) => onToggleTech(op, t.id, e.target.checked)}
            />
            {t.name}
          </label>
        ))}
        {tieneTechs ? (
          <>
            <label>
              <input
                type="checkbox"
                className="fase2-check"
                disabled={savingId === op.id}
                checked={esCandadoTech && op.nivel_seguridad === 1}
                onChange={(e) => onMarcarCandadoTech(op, 1, e.target.checked)}
              />
              Seguridad N1
            </label>
            <label>
              <input
                type="checkbox"
                className="fase2-check"
                disabled={savingId === op.id}
                checked={esCandadoTech && op.nivel_seguridad === 2}
                onChange={(e) => onMarcarCandadoTech(op, 2, e.target.checked)}
              />
              Seguridad N2
            </label>
          </>
        ) : (
          <label>
            <input
              type="checkbox"
              className="fase2-check"
              disabled={savingId === op.id}
              checked={Boolean(op.es_prerrequisito_seguridad && op.es_tronco_comun)}
              onChange={(e) => onMarcarCandadoN1Tronco(op, e.target.checked)}
            />
            Seguridad N1
          </label>
        )}
      </span>
    </li>
  );
};

interface AreaTecnologiasPanelProps {
  embeddedAreaId?: number;
}

const FormularioTecnologias: React.FC<{
  areaId: number;
  tecnologias: Tecnologia[];
  onRefresh: () => Promise<void>;
  onError: (msg: string) => void;
}> = ({ areaId, tecnologias, onRefresh, onError }) => {
  const [nombre, setNombre] = useState('');
  const [complejidad, setComplejidad] = useState<'basica' | 'compleja'>('basica');
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);

  const crear = async () => {
    const name = nombre.trim();
    if (!name) {
      return;
    }
    setGuardando(true);
    try {
      await apiService.createTecnologia({
        name,
        area: areaId,
        orden: tecnologias.length + 1,
        complejidad,
        is_active: true,
      });
      setNombre('');
      await onRefresh();
    } catch {
      onError('No se pudo crear la tecnología (solo ADMIN).');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActiva = async (tech: Tecnologia) => {
    try {
      await apiService.patchTecnologia(tech.id, { is_active: !tech.is_active });
      await onRefresh();
    } catch {
      onError('No se pudo actualizar la tecnología.');
    }
  };

  const generarCandados = async () => {
    setGenerando(true);
    try {
      const res = await apiService.generarCandadosTech(areaId);
      await onRefresh();
      onError(
        `Candados N1/N2: creadas ${res.creadas}, actualizadas ${res.actualizadas}.`
      );
    } catch {
      onError('No se pudieron generar candados. Hace falta el candado de tronco N1 del área.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="fase2-bloque-gris">
      <h4>Tecnologías del área</h4>
      {tecnologias.length === 0 ? (
        <p>Esta área aún no tiene tecnologías. Crea la primera para etiquetar operaciones.</p>
      ) : (
        <div className="fase2-tecnologia-chips">
          {tecnologias.map((t) => (
            <span key={t.id} className="fase2-chip">
              {t.name} ({t.complejidad === 'basica' ? 'básica' : 'compleja'})
              {!t.is_active ? ' inactiva' : ''}
              <button
                type="button"
                className="fase2-btn-back"
                style={{ marginLeft: '0.5rem', minHeight: 44 }}
                onClick={() => void toggleActiva(t)}
              >
                {t.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'flex-end' }}>
        <label>
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ minHeight: 44, display: 'block' }}
            aria-label="Nombre de la tecnología"
          />
        </label>
        <label>
          Complejidad
          <select
            value={complejidad}
            onChange={(e) => setComplejidad(e.target.value as 'basica' | 'compleja')}
            style={{ minHeight: 44, display: 'block' }}
          >
            <option value="basica">Básica</option>
            <option value="compleja">Compleja</option>
          </select>
        </label>
        <button type="button" className="fase2-tab" disabled={guardando} onClick={() => void crear()}>
          Crear tecnología
        </button>
        <button type="button" className="fase2-tab" disabled={generando || tecnologias.length === 0} onClick={() => void generarCandados()}>
          Generar candados N1/N2 faltantes
        </button>
      </div>
    </div>
  );
};

const Fase2AreaManagement: React.FC<AreaTecnologiasPanelProps> = ({ embeddedAreaId }) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);
  const [ops, setOps] = useState<Evaluacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [cargado, setCargado] = useState(false);

  const area = areaId != null ? areas.find((a) => a.id === areaId) : null;

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
    if (embeddedAreaId != null) {
      setAreaId(embeddedAreaId);
      void cargarArea(embeddedAreaId);
      return;
    }
    const init = async () => {
      try {
        const lista = await apiService.getAreas({ is_active: true });
        setAreas(lista);
      } catch {
        setError('No se pudieron cargar las áreas.');
      }
    };
    void init();
  }, [cargarArea, embeddedAreaId]);

  const abrirArea = async (id: number) => {
    setAreaId(id);
    try {
      await cargarArea(id);
    } catch {
      setError('No se pudo cargar el catálogo de esa área.');
    }
  };

  const guardarEtiqueta = async (
    op: Evaluacion,
    patch: Parameters<typeof apiService.patchEvaluacion>[1]
  ) => {
    setSavingId(op.id);
    try {
      const updated = await apiService.patchEvaluacion(op.id, patch);
      setOps((prev) => prev.map((e) => (e.id === op.id ? { ...e, ...updated } : e)));
    } catch {
      setError('No se pudo guardar (solo ADMIN).');
    } finally {
      setSavingId(null);
    }
  };

  const marcarTronco = (op: Evaluacion, on: boolean) => {
    void guardarEtiqueta(op, {
      es_tronco_comun: on,
      tecnologia_ids: [],
      es_prerrequisito_seguridad: on ? Boolean(op.es_prerrequisito_seguridad) : false,
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
      next.length > 0 && Boolean(op.es_prerrequisito_seguridad && !op.es_tronco_comun);
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

  if (embeddedAreaId != null) {
    return <Fase2MultihabilidadEmbed areaId={embeddedAreaId} />;
  }

  if (!area) {
    return (
      <div>
        <h2>Tecnologías</h2>
        <p className="fase2-note" style={{ marginTop: '0.75rem' }}>
          Elige el área. Aquí etiquetas cada operación como tronco, una o más tecnologías o
          seguridad N1.
        </p>
        {error && <p className="fase2-note">{error}</p>}
        <div className="fase2-grid-cards" style={{ marginTop: '1rem' }}>
          {areas.map((a) => (
            <button
              key={a.id}
              type="button"
              className="fase2-card"
              onClick={() => void abrirArea(a.id)}
              style={{ textAlign: 'left', width: '100%' }}
            >
              <h3>{a.name}</h3>
              <p>{a.tipo_area === 'soporte' ? 'Soporte' : 'Producción'}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="fase2-header">
        <button type="button" className="fase2-btn-back" onClick={() => setAreaId(null)}>
          Volver
        </button>
        <h2>{area.name}</h2>
      </div>
      {error && <p className="fase2-note">{error}</p>}
      {areaId != null && (
        <FormularioTecnologias
          areaId={areaId}
          tecnologias={tecnologias}
          onRefresh={() => cargarArea(areaId)}
          onError={setError}
        />
      )}

      <h3 className="fase2-section-title">Operaciones</h3>
      <p className="fase2-note">
        Puedes marcar varias tecnologías a la vez. Tronco común es exclusivo: al marcarlo se quitan
        las tecnologías. En ops con tecnología, Seguridad N1/N2 es de esa línea (no fuerza tronco).
        Sin marcar nada, la operación sigue visible para todos.
      </p>
      <ul className="fase2-operacion-list">
        {ops.map((op) => (
          <FilaOperacionEtiqueta
            key={op.id}
            op={op}
            tecnologias={tecnologias.filter((t) => t.is_active)}
            savingId={savingId}
            onMarcarTronco={marcarTronco}
            onToggleTech={toggleTech}
            onMarcarCandadoN1Tronco={marcarCandadoN1}
            onMarcarCandadoTech={marcarCandadoTech}
          />
        ))}
      </ul>
    </div>
  );
};

export default Fase2AreaManagement;
