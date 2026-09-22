import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiService,
  type Area,
  type Posicion,
  type Tecnologia,
} from '../../services/api';
import { usuarioVeTodasLasTechs } from './userTechUtils';
import './UserTechnologiesEditor.css';

interface UserTechnologiesEditorProps {
  userId: number;
  role: string;
  posicionIds: number[];
  areas: Area[];
  areaIds: number[];
  posicionesCatalog: Posicion[];
  onError?: (message: string | null) => void;
}

const UserTechnologiesEditor: React.FC<UserTechnologiesEditorProps> = ({
  userId,
  role,
  posicionIds,
  areas,
  areaIds,
  posicionesCatalog,
  onError,
}) => {
  const [asignadas, setAsignadas] = useState<Record<number, number[]>>({});
  const [techsPorArea, setTechsPorArea] = useState<Record<number, Tecnologia[]>>({});
  const [cargando, setCargando] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const areasF2 = useMemo(
    () =>
      areaIds
        .map((id) => areas.find((a) => a.id === id))
        .filter((a): a is Area => Boolean(a?.fase2_activa)),
    [areaIds, areas],
  );

  const veTodas = usuarioVeTodasLasTechs(role, posicionIds, posicionesCatalog);

  const cargar = useCallback(async () => {
    if (areasF2.length === 0) {
      setCargando(false);
      return;
    }
    setCargando(true);
    onError?.(null);
    try {
      const [links, ...techLists] = await Promise.all([
        apiService.getUserTecnologias({ user: userId }),
        ...areasF2.map((a) => apiService.getTecnologias({ area_id: a.id, is_active: true })),
      ]);
      const asignadasPorArea: Record<number, number[]> = {};
      areasF2.forEach((area, idx) => {
        const techs = techLists[idx] ?? [];
        const techIds = new Set(techs.map((t) => t.id));
        asignadasPorArea[area.id] = links
          .filter((l) => techIds.has(l.tecnologia))
          .map((l) => l.tecnologia);
      });
      setAsignadas(asignadasPorArea);
      const catalog: Record<number, Tecnologia[]> = {};
      areasF2.forEach((area, idx) => {
        catalog[area.id] = techLists[idx] ?? [];
      });
      setTechsPorArea(catalog);
    } catch {
      onError?.('No se pudieron cargar las tecnologías del usuario.');
    } finally {
      setCargando(false);
    }
  }, [areasF2, onError, userId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const toggle = async (areaId: number, tecnologiaId: number, next: boolean) => {
    if (veTodas) {
      return;
    }
    const key = `${areaId}-${tecnologiaId}`;
    setSavingKey(key);
    onError?.(null);
    try {
      await apiService.toggleUserTecnologia(userId, tecnologiaId, next);
      setAsignadas((prev) => {
        const current = prev[areaId] ?? [];
        const updated = next
          ? Array.from(new Set([...current, tecnologiaId]))
          : current.filter((id) => id !== tecnologiaId);
        return { ...prev, [areaId]: updated };
      });
    } catch {
      onError?.('No se pudo guardar (solo administrador).');
    } finally {
      setSavingKey(null);
    }
  };

  if (areasF2.length === 0) {
    return (
      <p className="user-tech-editor__empty">
        Este usuario no tiene áreas con tecnologías configuradas.
      </p>
    );
  }

  if (cargando) {
    return <p className="user-tech-editor__loading">Cargando tecnologías...</p>;
  }

  return (
    <div className="user-tech-editor">
      <p className="user-tech-editor__hint">
        Marca en qué máquinas trabaja esta persona. Los cambios se guardan al instante.
      </p>
      {veTodas && (
        <p className="user-tech-editor__note">
          Este perfil (staff o Líder/Entrenador) ve todas las tecnologías del área en Evaluaciones.
        </p>
      )}
      {areasF2.map((area) => {
        const techs = techsPorArea[area.id] ?? [];
        const ids = asignadas[area.id] ?? [];
        return (
          <section key={area.id} className="user-tech-editor__area">
            <h4 className="user-tech-editor__area-title">{area.name}</h4>
            {techs.length === 0 ? (
              <p className="user-tech-editor__empty">Sin tecnologías activas en esta área.</p>
            ) : (
              <div className="user-tech-editor__chips" role="group" aria-label={`Tecnologías ${area.name}`}>
                {techs.map((t) => {
                  const checked = veTodas || ids.includes(t.id);
                  const saving = savingKey === `${area.id}-${t.id}`;
                  return (
                    <label
                      key={t.id}
                      className={`user-tech-chip${checked ? ' is-active' : ''}${veTodas ? ' is-locked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={veTodas || saving}
                        onChange={(e) => void toggle(area.id, t.id, e.target.checked)}
                      />
                      <span className="user-tech-chip__name">{t.name}</span>
                      <span className="user-tech-chip__meta">
                        {t.complejidad === 'basica' ? 'básica' : 'compleja'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default UserTechnologiesEditor;
