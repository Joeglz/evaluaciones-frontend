import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCogs, FaPlus, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import { apiService, type Area, type Tecnologia } from '../../services/api';
import './TecnologiasManagement.css';

const TecnologiasManagement: React.FC = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<number | ''>('');
  const [tecnologias, setTecnologias] = useState<Tecnologia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [complejidad, setComplejidad] = useState<'basica' | 'compleja'>('basica');
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editComplejidad, setEditComplejidad] = useState<'basica' | 'compleja'>('basica');
  const [busyId, setBusyId] = useState<number | null>(null);

  const cargarTechs = useCallback(async (id: number) => {
    setCargando(true);
    setError(null);
    try {
      const lista = await apiService.getTecnologias({ area_id: id });
      setTecnologias(
        [...lista].sort((a, b) => a.orden - b.orden || a.name.localeCompare(b.name, 'es')),
      );
    } catch {
      setError('No se pudieron cargar las tecnologías.');
      setTecnologias([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const lista = await apiService.getAreas({ is_active: true });
        const activas = [...lista].sort((a, b) => a.name.localeCompare(b.name, 'es'));
        setAreas(activas);
        setAreaId((prev) => (prev === '' && activas[0] ? activas[0].id : prev));
      } catch {
        setError('No se pudieron cargar las áreas.');
      }
    };
    void init();
  }, []);

  useEffect(() => {
    if (typeof areaId === 'number') {
      void cargarTechs(areaId);
    }
  }, [areaId, cargarTechs]);

  const areaNombre = useMemo(
    () => areas.find((a) => a.id === areaId)?.name ?? '',
    [areas, areaId],
  );

  const crear = async () => {
    if (typeof areaId !== 'number') {
      return;
    }
    const name = nombre.trim();
    if (!name) {
      return;
    }
    setGuardando(true);
    setError(null);
    setOkMsg(null);
    try {
      await apiService.createTecnologia({
        name,
        area: areaId,
        orden: tecnologias.length + 1,
        complejidad,
        is_active: true,
      });
      setNombre('');
      setOkMsg(`Tecnología «${name}» creada.`);
      await cargarTechs(areaId);
    } catch {
      setError('No se pudo crear (solo ADMIN).');
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (t: Tecnologia) => {
    setEditId(t.id);
    setEditNombre(t.name);
    setEditComplejidad(t.complejidad);
  };

  const cancelarEdicion = () => {
    setEditId(null);
    setEditNombre('');
  };

  const guardarEdicion = async () => {
    if (editId == null || typeof areaId !== 'number') {
      return;
    }
    const name = editNombre.trim();
    if (!name) {
      return;
    }
    setBusyId(editId);
    setError(null);
    try {
      await apiService.patchTecnologia(editId, {
        name,
        complejidad: editComplejidad,
      });
      setOkMsg('Tecnología actualizada.');
      cancelarEdicion();
      await cargarTechs(areaId);
    } catch {
      setError('No se pudo guardar el cambio.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleActiva = async (t: Tecnologia) => {
    if (typeof areaId !== 'number') {
      return;
    }
    setBusyId(t.id);
    setError(null);
    try {
      await apiService.patchTecnologia(t.id, { is_active: !t.is_active });
      await cargarTechs(areaId);
    } catch {
      setError('No se pudo cambiar el estado.');
    } finally {
      setBusyId(null);
    }
  };

  const eliminar = async (t: Tecnologia) => {
    if (typeof areaId !== 'number') {
      return;
    }
    const ok = window.confirm(
      `¿Eliminar definitivamente «${t.name}»? Si tiene asignaciones u operaciones etiquetadas puede fallar; en ese caso desactívala.`,
    );
    if (!ok) {
      return;
    }
    setBusyId(t.id);
    setError(null);
    try {
      await apiService.deleteTecnologia(t.id);
      setOkMsg(`«${t.name}» eliminada.`);
      if (editId === t.id) {
        cancelarEdicion();
      }
      await cargarTechs(areaId);
    } catch {
      setError(
        'No se pudo eliminar (puede estar en uso). Desactívala o quita etiquetas/asignaciones primero.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const generarCandados = async () => {
    if (typeof areaId !== 'number') {
      return;
    }
    setGenerando(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await apiService.generarCandadosTech(areaId);
      setOkMsg(
        `Candados N1/N2: creadas ${res.creadas}, actualizadas ${res.actualizadas}.`,
      );
      await cargarTechs(areaId);
    } catch {
      setError(
        'No se pudieron generar candados. Hace falta el candado de tronco N1 del área.',
      );
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="tech-mgmt">
      <header className="tech-mgmt__header">
        <div className="tech-mgmt__title-row">
          <FaCogs aria-hidden />
          <div>
            <h2>Gestión de Tecnologías</h2>
            <p>
              Alta, edición y baja de máquinas/procesos por área. Luego asígnalas a
              operaciones en Plantillas y a personas en Usuarios.
            </p>
          </div>
        </div>
        <label className="tech-mgmt__area">
          Área
          <select
            value={areaId === '' ? '' : String(areaId)}
            onChange={(e) => {
              const v = e.target.value;
              setAreaId(v ? Number(v) : '');
              cancelarEdicion();
              setOkMsg(null);
            }}
            aria-label="Área"
          >
            {areas.length === 0 && <option value="">Sin áreas</option>}
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <p className="tech-mgmt__msg tech-mgmt__msg--error">{error}</p>}
      {okMsg && <p className="tech-mgmt__msg tech-mgmt__msg--ok">{okMsg}</p>}

      {typeof areaId === 'number' && (
        <>
          <section className="tech-mgmt__create" aria-label="Nueva tecnología">
            <h3>Nueva tecnología{areaNombre ? ` · ${areaNombre}` : ''}</h3>
            <div className="tech-mgmt__form">
              <input
                type="text"
                placeholder="Nombre (ej. 1MSA, Delta, Crusader)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void crear();
                  }
                }}
                aria-label="Nombre de la tecnología"
              />
              <select
                value={complejidad}
                onChange={(e) =>
                  setComplejidad(e.target.value as 'basica' | 'compleja')
                }
                aria-label="Complejidad"
              >
                <option value="basica">Básica</option>
                <option value="compleja">Compleja</option>
              </select>
              <button
                type="button"
                className="tech-mgmt__btn tech-mgmt__btn--primary"
                disabled={guardando || !nombre.trim()}
                onClick={() => void crear()}
              >
                <FaPlus aria-hidden /> Crear
              </button>
              <button
                type="button"
                className="tech-mgmt__btn"
                disabled={generando || tecnologias.length === 0}
                onClick={() => void generarCandados()}
                title="Crea seguridad N1/N2 por tecnología si faltan"
              >
                {generando ? 'Generando…' : 'Generar candados N1/N2'}
              </button>
            </div>
            <p className="tech-mgmt__hint">
              Los candados son las evaluaciones de seguridad por línea: sin N1/N2 de la
              tech no se avanza en operaciones de esa máquina.
            </p>
          </section>

          <section className="tech-mgmt__list" aria-label="Listado">
            <h3>
              Tecnologías ({tecnologias.length})
              {cargando ? ' · cargando…' : ''}
            </h3>
            {tecnologias.length === 0 && !cargando ? (
              <p className="tech-mgmt__hint">Aún no hay tecnologías en esta área.</p>
            ) : (
              <ul className="tech-mgmt__items">
                {tecnologias.map((t) => {
                  const editando = editId === t.id;
                  const busy = busyId === t.id;
                  return (
                    <li
                      key={t.id}
                      className={`tech-mgmt__item${!t.is_active ? ' is-inactive' : ''}`}
                    >
                      {editando ? (
                        <div className="tech-mgmt__edit-row">
                          <input
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            aria-label="Nuevo nombre"
                          />
                          <select
                            value={editComplejidad}
                            onChange={(e) =>
                              setEditComplejidad(
                                e.target.value as 'basica' | 'compleja',
                              )
                            }
                            aria-label="Complejidad"
                          >
                            <option value="basica">Básica</option>
                            <option value="compleja">Compleja</option>
                          </select>
                          <button
                            type="button"
                            className="tech-mgmt__btn tech-mgmt__btn--primary"
                            disabled={busy || !editNombre.trim()}
                            onClick={() => void guardarEdicion()}
                          >
                            <FaSave aria-hidden /> Guardar
                          </button>
                          <button
                            type="button"
                            className="tech-mgmt__btn"
                            disabled={busy}
                            onClick={cancelarEdicion}
                          >
                            <FaTimes aria-hidden /> Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="tech-mgmt__item-main">
                            <strong>{t.name}</strong>
                            <span>
                              {t.complejidad === 'basica' ? 'básica' : 'compleja'}
                              {!t.is_active ? ' · inactiva' : ''}
                            </span>
                          </div>
                          <div className="tech-mgmt__item-actions">
                            <button
                              type="button"
                              className="tech-mgmt__btn"
                              disabled={busy}
                              onClick={() => iniciarEdicion(t)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="tech-mgmt__btn"
                              disabled={busy}
                              onClick={() => void toggleActiva(t)}
                            >
                              {t.is_active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button
                              type="button"
                              className="tech-mgmt__btn tech-mgmt__btn--danger"
                              disabled={busy}
                              onClick={() => void eliminar(t)}
                              title="Eliminar definitivamente"
                            >
                              <FaTrash aria-hidden /> Borrar
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default TecnologiasManagement;
