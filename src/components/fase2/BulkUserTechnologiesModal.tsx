import React, { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  type Tecnologia,
  type User,
} from '../../services/api';
import { FaTimes } from 'react-icons/fa';
import './UserTechnologiesEditor.css';

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'badge-admin';
    case 'ENTRENADOR':
      return 'badge-entrenador';
    case 'SUPERVISOR':
      return 'badge-supervisor';
    default:
      return 'badge-usuario';
  }
}

interface BulkUserTechnologiesModalProps {
  areaId: number;
  areaName: string;
  users: User[];
  onClose: () => void;
}

const BulkUserTechnologiesModal: React.FC<BulkUserTechnologiesModalProps> = ({
  areaId,
  areaName,
  users,
  onClose,
}) => {
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);
  const [asignadas, setAsignadas] = useState<Record<number, number[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [techs, links] = await Promise.all([
        apiService.getTecnologias({ area_id: areaId, is_active: true }),
        apiService.getUserTecnologias({ area_id: areaId }),
      ]);
      setTecnologias(techs);
      const mapa: Record<number, number[]> = {};
      links.forEach((l) => {
        mapa[l.user] = [...(mapa[l.user] ?? []), l.tecnologia];
      });
      setAsignadas(mapa);
    } catch {
      setError('No se pudo cargar la matriz de asignación.');
    } finally {
      setCargando(false);
    }
  }, [areaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const toggle = async (userId: number, tecnologiaId: number, next: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await apiService.toggleUserTecnologia(userId, tecnologiaId, next);
      setAsignadas((prev) => {
        const current = prev[userId] ?? [];
        const updated = next
          ? Array.from(new Set([...current, tecnologiaId]))
          : current.filter((id) => id !== tecnologiaId);
        return { ...prev, [userId]: updated };
      });
    } catch {
      setError('No se pudo guardar (solo administrador).');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-large bulk-tech-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Asignación masiva — {areaName}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          <p className="bulk-tech-modal__note">
            Palomita = esa persona trabaja esa máquina. Los cambios se guardan al instante.
          </p>
          {error && <div className="error-message">{error}</div>}
          {cargando ? (
            <p className="bulk-tech-modal__note">Cargando...</p>
          ) : tecnologias.length === 0 ? (
            <p className="bulk-tech-modal__note">Esta área no tiene tecnologías activas.</p>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
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
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="user-name-cell">
                        <span className="user-full-name">{u.full_name || u.username}</span>
                        {u.numero_empleado && (
                          <span className="user-username">#{u.numero_empleado}</span>
                        )}
                      </td>
                      <td>
                        <span className={`role-badge ${roleBadgeClass(u.role)}`}>
                          {u.role_display || u.role}
                        </span>
                      </td>
                      {tecnologias.map((t) => {
                        const checked = (asignadas[u.id] ?? []).includes(t.id);
                        return (
                          <td key={t.id} className="tech-matrix-cell">
                            <input
                              type="checkbox"
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
        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUserTechnologiesModal;
