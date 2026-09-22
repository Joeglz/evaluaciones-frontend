import React, { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  type Area,
  type Tecnologia,
  type User,
} from '../../services/api';
import './Fase2Prototype.css';

interface TecnologiasPorPersonaProps {
  lockedAreaId?: number;
}

const Fase2UserTechnologies: React.FC<TecnologiasPorPersonaProps> = ({ lockedAreaId }) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaFiltro, setAreaFiltro] = useState<number | null>(null);
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [asignadas, setAsignadas] = useState<Record<number, number[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async (areaId: number) => {
    setError(null);
    const [techs, users, links] = await Promise.all([
      apiService.getTecnologias({ area_id: areaId, is_active: true }),
      apiService.getUsersAll({ area_id: areaId, is_active: true, minimal: true }),
      apiService.getUserTecnologias({ area_id: areaId }),
    ]);
    setTecnologias(techs);
    setUsuarios(users);
    const mapa: Record<number, number[]> = {};
    links.forEach((l) => {
      mapa[l.user] = [...(mapa[l.user] ?? []), l.tecnologia];
    });
    setAsignadas(mapa);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const lista = await apiService.getAreas({ is_active: true });
        setAreas(lista);
        const inicial =
          lockedAreaId ??
          lista.find((a) => a.fase2_activa)?.id ??
          lista[0]?.id ??
          null;
        if (inicial) {
          setAreaFiltro(inicial);
          await cargar(inicial);
        }
      } catch {
        setError('No se pudo cargar el catálogo.');
      }
    };
    void init();
  }, [cargar, lockedAreaId]);

  const onChangeArea = async (id: number) => {
    setAreaFiltro(id);
    try {
      await cargar(id);
    } catch {
      setError('No se pudo cargar esa área.');
    }
  };

  const toggle = async (userId: number, tecnologiaId: number, next: boolean) => {
    setSaving(true);
    try {
      await apiService.toggleUserTecnologia(userId, tecnologiaId, next);
      setAsignadas((prev) => {
        const current = prev[userId] ?? [];
        const updated = next
          ? [...current, tecnologiaId]
          : current.filter((id) => id !== tecnologiaId);
        return { ...prev, [userId]: updated };
      });
    } catch {
      setError('No se pudo guardar la asignación (solo ADMIN).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>Tecnologías por persona</h2>
      <p className="fase2-note">
        Palomita = esa persona trabaja esa máquina. Solo administrador guarda.
      </p>
      {error && <p className="fase2-note">{error}</p>}

      {lockedAreaId == null && (
      <label style={{ display: 'block', margin: '1rem 0' }}>
        Área:{' '}
        <select
          value={areaFiltro ?? ''}
          onChange={(e) => void onChangeArea(Number(e.target.value))}
          style={{ minHeight: 44, padding: '0.35rem' }}
        >
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      )}

      {tecnologias.length === 0 ? (
        <p>Esta área no tiene tecnologías.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="fase2-user-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                {tecnologias.map((t) => (
                  <th key={t.id}>
                    {t.name}
                    <br />
                    <small>({t.complejidad === 'basica' ? 'básica' : 'compleja'})</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.full_name || u.username}
                    <br />
                    <small>{u.numero_empleado}</small>
                  </td>
                  <td>{u.role_display || u.role}</td>
                  {tecnologias.map((t) => {
                    const checked = (asignadas[u.id] ?? []).includes(t.id);
                    return (
                      <td key={t.id}>
                        <input
                          type="checkbox"
                          className="fase2-check"
                          checked={checked}
                          disabled={saving}
                          onChange={() => void toggle(u.id, t.id, !checked)}
                          aria-label={`${u.full_name} – ${t.name}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Fase2UserTechnologies;
