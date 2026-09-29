import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiService,
  type Evaluacion,
  type PlantillaAreaCatalogo,
  type PlantillaPosicionCatalogo,
  type PlantillaUso,
  type Tecnologia,
} from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import FormularioTecnologias from '../fase2/Fase2FormularioTecnologias';
import { idsDeOp, resumenEtiquetasOp } from '../../utils/evaluacionEtiquetaUtils';
import '../fase2/Fase2MultihabilidadEmbed.css';
import './PlantillaEtiquetadoPanel.css';

interface PlantillaEtiquetadoPanelProps {
  plantilla: Evaluacion;
  onPlantillaUpdated: (next: Evaluacion) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const PlantillaEtiquetadoPanel: React.FC<PlantillaEtiquetadoPanelProps> = ({
  plantilla,
  onPlantillaUpdated,
  onSuccess,
  onError,
}) => {
  const { confirm, confirmDialog } = useConfirm();
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargandoTechs, setCargandoTechs] = useState(true);
  const [catalogoAreas, setCatalogoAreas] = useState<PlantillaAreaCatalogo[]>([]);
  const [cargandoAreas, setCargandoAreas] = useState(true);
  const [posicionBusyId, setPosicionBusyId] = useState<number | null>(null);
  const [areasExpandidas, setAreasExpandidas] = useState<Set<number>>(new Set());

  const usos = plantilla.plantilla_usos ?? [];

  const areaIds = useMemo(() => {
    const ids = new Set<number>();
    usos.forEach((u) => {
      if (u.area_id != null) {
        ids.add(u.area_id);
      }
    });
    return Array.from(ids);
  }, [usos]);

  const nivelPlantilla = catalogoAreas.find((a) => a.nivel != null)?.nivel ?? null;

  const cargarTecnologias = useCallback(async () => {
    setCargandoTechs(true);
    try {
      if (areaIds.length === 0) {
        setTecnologias([]);
        return;
      }
      const listas = await Promise.all(
        areaIds.map((areaId) => apiService.getTecnologias({ area_id: areaId })),
      );
      const porId = new Map<number, Tecnologia>();
      listas.flat().forEach((t) => porId.set(t.id, t));
      setTecnologias(
        Array.from(porId.values()).sort((a, b) => a.name.localeCompare(b.name)),
      );
    } catch {
      onError('No se pudieron cargar las tecnologías del área.');
    } finally {
      setCargandoTechs(false);
    }
  }, [areaIds, onError]);

  useEffect(() => {
    void cargarTecnologias();
  }, [cargarTecnologias]);

  const cargarCatalogoAreas = useCallback(async () => {
    setCargandoAreas(true);
    try {
      const lista = await apiService.getPlantillaCatalogoAreas(plantilla.id);
      const areas = Array.isArray(lista) ? lista : [];
      setCatalogoAreas(areas);
      setAreasExpandidas((prev) => {
        const next = new Set(prev);
        areas.forEach((a) => {
          if (a.asignada || a.operaciones > 0) {
            next.add(a.area_id);
          }
        });
        return next;
      });
    } catch {
      onError('No se pudo cargar el catálogo de áreas.');
      setCatalogoAreas([]);
    } finally {
      setCargandoAreas(false);
    }
  }, [plantilla.id, onError]);

  useEffect(() => {
    void cargarCatalogoAreas();
  }, [cargarCatalogoAreas]);

  const techsActivas = useMemo(
    () => tecnologias.filter((t) => t.is_active),
    [tecnologias],
  );

  const toggleAreaExpandida = (areaId: number) => {
    setAreasExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  };

  const togglePosicionAsignada = async (
    area: PlantillaAreaCatalogo,
    posicion: PlantillaPosicionCatalogo,
    asignar: boolean,
  ) => {
    setPosicionBusyId(posicion.nivel_posicion_id);
    try {
      if (asignar) {
        const res = await apiService.asignarPlantillaEnPosicion(
          plantilla.id,
          posicion.nivel_posicion_id,
        );
        onPlantillaUpdated(res.plantilla);
        await cargarCatalogoAreas();
        const msg =
          res.creadas > 0
            ? `Asignada a ${area.area_name} · ${posicion.posicion_name} (N${res.nivel}).`
            : `Ya estaba en ${area.area_name} · ${posicion.posicion_name}.`;
        onSuccess(msg);
      } else {
        const ok = await confirm({
          title: 'Quitar de la posición',
          message: `Se eliminará la operación de «${plantilla.nombre}» en ${area.area_name} · ${posicion.posicion_name}. Los intentos ligados también se borrarán. ¿Continuar?`,
          confirmLabel: 'Quitar',
          danger: true,
        });
        if (!ok) {
          return;
        }
        const res = await apiService.desasignarPlantillaEnPosicion(
          plantilla.id,
          posicion.nivel_posicion_id,
        );
        onPlantillaUpdated(res.plantilla);
        await cargarCatalogoAreas();
        onSuccess(`Quitada de ${area.area_name} · ${posicion.posicion_name}.`);
      }
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'No se pudo actualizar la asignación a la posición.';
      onError(detail);
    } finally {
      setPosicionBusyId(null);
    }
  };

  const guardarEtiqueta = async (
    patch: Parameters<typeof apiService.patchEvaluacion>[1],
  ) => {
    setGuardando(true);
    try {
      const updated = await apiService.patchEvaluacion(plantilla.id, patch);
      onPlantillaUpdated(updated);
      const n = updated.instancias_actualizadas;
      if (n != null && n > 0) {
        onSuccess(`Etiqueta guardada y aplicada a ${n} operación(es).`);
      } else if (n === 0) {
        onSuccess('Etiqueta guardada en la plantilla (sin operaciones hijas aún).');
      } else {
        onSuccess('Etiqueta guardada.');
      }
    } catch {
      onError('No se pudo guardar la etiqueta.');
    } finally {
      setGuardando(false);
    }
  };

  const marcarTronco = (on: boolean) => {
    void guardarEtiqueta({
      es_tronco_comun: on,
      tecnologia_ids: [],
      es_prerrequisito_seguridad: on
        ? Boolean(plantilla.es_prerrequisito_seguridad)
        : false,
      tronco_prioritario: on ? Boolean(plantilla.tronco_prioritario) : false,
      nivel_seguridad: on ? plantilla.nivel_seguridad ?? null : null,
    });
  };

  const toggleTech = (techId: number, on: boolean) => {
    const actuales = idsDeOp(plantilla);
    const next = on
      ? Array.from(new Set([...actuales, techId]))
      : actuales.filter((id) => id !== techId);
    const keepCandado =
      next.length > 0 &&
      Boolean(plantilla.es_prerrequisito_seguridad && !plantilla.es_tronco_comun);
    void guardarEtiqueta({
      es_tronco_comun: false,
      tecnologia_ids: next,
      es_prerrequisito_seguridad: keepCandado,
      tronco_prioritario: false,
      nivel_seguridad: keepCandado ? plantilla.nivel_seguridad ?? null : null,
    });
  };

  const marcarCandadoN1Tronco = (on: boolean) => {
    void guardarEtiqueta({
      es_tronco_comun: on || Boolean(plantilla.es_tronco_comun),
      tecnologia_ids: on ? [] : idsDeOp(plantilla),
      es_prerrequisito_seguridad: on,
      tronco_prioritario: on,
      nivel_seguridad: on ? 1 : null,
    });
  };

  const marcarCandadoTech = (nivel: 1 | 2, on: boolean) => {
    void guardarEtiqueta({
      es_tronco_comun: false,
      tecnologia_ids: idsDeOp(plantilla),
      es_prerrequisito_seguridad: on,
      tronco_prioritario: false,
      nivel_seguridad: on ? nivel : null,
    });
  };

  const ids = idsDeOp(plantilla);
  const tieneTechs = !plantilla.es_tronco_comun && ids.length > 0;
  const esCandadoTech = Boolean(
    plantilla.es_prerrequisito_seguridad && !plantilla.es_tronco_comun,
  );
  const chips = resumenEtiquetasOp(plantilla, tecnologias);

  return (
    <div className="plantilla-etiquetado">
      {confirmDialog}
      <h4>Operaciones y etiquetado</h4>
      <div className="plantilla-etiquetado__asignacion-areas">
        <span className="plantilla-etiquetado__areas-label">
          Asignar a posiciones
          {nivelPlantilla != null ? ` (N${nivelPlantilla})` : ''}
        </span>
        <p className="plantilla-etiquetado__hint">
          El nivel sale del campo de la plantilla o del nombre («Nivel N …»). Marca
          solo las posiciones donde quieres la operación.
        </p>
        {cargandoAreas ? (
          <p className="plantilla-etiquetado__hint">Cargando áreas...</p>
        ) : nivelPlantilla == null ? (
          <p className="plantilla-etiquetado__hint plantilla-etiquetado__hint--warn">
            No se pudo determinar el nivel. Pon «Nivel 1–4» al inicio del nombre o
            define el nivel en la plantilla.
          </p>
        ) : (
          <div className="plantilla-etiquetado__areas-lista">
            {catalogoAreas.map((area) => {
              const expandida = areasExpandidas.has(area.area_id);
              return (
                <div key={area.area_id} className="plantilla-etiquetado__area-bloque">
                  <button
                    type="button"
                    className="plantilla-etiquetado__area-toggle"
                    onClick={() => toggleAreaExpandida(area.area_id)}
                    aria-expanded={expandida}
                  >
                    <span aria-hidden>{expandida ? '▾' : '▸'}</span>
                    <strong>{area.area_name}</strong>
                    <span className="plantilla-etiquetado__area-meta">
                      {area.operaciones}/{area.posiciones.length} posiciones
                    </span>
                  </button>
                  {expandida && (
                    <div className="plantilla-etiquetado__posiciones-checks">
                      {area.posiciones.length === 0 ? (
                        <p className="plantilla-etiquetado__hint">
                          No hay posiciones activas con N{nivelPlantilla} en esta área.
                        </p>
                      ) : (
                        area.posiciones.map((pos) => (
                          <label key={pos.nivel_posicion_id} className="f2-embed-toggle">
                            <input
                              type="checkbox"
                              disabled={
                                posicionBusyId === pos.nivel_posicion_id || guardando
                              }
                              checked={pos.asignada}
                              onChange={(e) => {
                                void togglePosicionAsignada(
                                  area,
                                  pos,
                                  e.target.checked,
                                );
                              }}
                            />
                            <span>{pos.posicion_name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {usos.length === 0 ? (
        <p className="plantilla-etiquetado__hint">
          Marca al menos una posición arriba para generar la operación.
        </p>
      ) : (
        <div className="plantilla-etiquetado__usos" role="list">
          {usos.map((uso) => (
            <PlantillaUsoRow key={uso.id} uso={uso} />
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div className="plantilla-etiquetado__chips" aria-label="Etiqueta actual">
          {chips.map((c) => (
            <span key={c} className="plantilla-etiquetado__chip">
              {c}
            </span>
          ))}
        </div>
      )}
      {usos.length > 0 && cargandoTechs ? (
        <p className="plantilla-etiquetado__hint">Cargando tecnologías...</p>
      ) : usos.length > 0 ? (
        <>
          {areaIds.length === 1 && (
            <FormularioTecnologias
              areaId={areaIds[0]}
              tecnologias={tecnologias}
              onRefresh={cargarTecnologias}
              onError={onError}
            />
          )}
          {areaIds.length > 1 && (
            <p className="plantilla-etiquetado__hint">
              Esta plantilla se usa en varias áreas; aquí se listan todas las tecnologías
              activas de esas áreas.
            </p>
          )}
          {techsActivas.length === 0 && (
            <p className="plantilla-etiquetado__hint">
              Aún no hay tecnologías en el área. Puedes crearlas abajo o en Gestión de
              Áreas → Multihabilidad. Mientras tanto, marca tronco o deja sin etiquetar
              (ningún check).
            </p>
          )}
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
                checked={Boolean(plantilla.es_tronco_comun)}
                onChange={(e) => marcarTronco(e.target.checked)}
              />
              <span>Tronco común</span>
            </label>
            {techsActivas.map((t) => (
              <label key={t.id} className="f2-embed-toggle">
                <input
                  type="checkbox"
                  disabled={guardando || Boolean(plantilla.es_tronco_comun)}
                  checked={!plantilla.es_tronco_comun && ids.includes(t.id)}
                  onChange={(e) => toggleTech(t.id, e.target.checked)}
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
                    checked={esCandadoTech && plantilla.nivel_seguridad === 1}
                    onChange={(e) => marcarCandadoTech(1, e.target.checked)}
                  />
                  <span>Seguridad N1 (línea)</span>
                </label>
                <label className="f2-embed-toggle">
                  <input
                    type="checkbox"
                    disabled={guardando}
                    checked={esCandadoTech && plantilla.nivel_seguridad === 2}
                    onChange={(e) => marcarCandadoTech(2, e.target.checked)}
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
                    plantilla.es_prerrequisito_seguridad && plantilla.es_tronco_comun,
                  )}
                  onChange={(e) => marcarCandadoN1Tronco(e.target.checked)}
                />
                <span>Seguridad N1 (tronco)</span>
              </label>
            )}
          </div>
          <p className="plantilla-etiquetado__hint">
            Los cambios se guardan al instante en la plantilla y se propagan a todas las
            operaciones listadas arriba. Tronco común quita las tecnologías de la operación.
          </p>
        </>
      ) : null}
    </div>
  );
};

const PlantillaUsoRow: React.FC<{ uso: PlantillaUso }> = ({ uso }) => {
  const nivelLabel = uso.nivel != null ? `N${uso.nivel}` : '';
  const partes = [uso.area_name, uso.posicion_name, nivelLabel].filter(Boolean);
  return (
    <div className="plantilla-etiquetado__uso" role="listitem">
      <span className="plantilla-etiquetado__uso-nombre">{uso.nombre}</span>
      <span className="plantilla-etiquetado__uso-meta">{partes.join(' · ')}</span>
      {!uso.is_active && (
        <span className="plantilla-etiquetado__uso-inactiva">Inactiva</span>
      )}
    </div>
  );
};

export default PlantillaEtiquetadoPanel;
