import React, { useState } from 'react';
import { apiService, type Tecnologia } from '../../services/api';

interface FormularioTecnologiasProps {
  areaId: number;
  tecnologias: Tecnologia[];
  onRefresh: () => Promise<void>;
  onError: (msg: string) => void;
}

const FormularioTecnologias: React.FC<FormularioTecnologiasProps> = ({
  areaId,
  tecnologias,
  onRefresh,
  onError,
}) => {
  const [nombre, setNombre] = useState('');
  const [complejidad, setComplejidad] = useState<'basica' | 'compleja'>('basica');
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [expandido, setExpandido] = useState(false);

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
        `Candados N1/N2: creadas ${res.creadas}, actualizadas ${res.actualizadas}.`,
      );
    } catch {
      onError('No se pudieron generar candados. Hace falta el candado de tronco N1 del área.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="f2-embed-tech-block">
      <button
        type="button"
        className="f2-embed-tech-block__toggle"
        aria-expanded={expandido}
        onClick={() => setExpandido((v) => !v)}
      >
        Tecnologías del área ({tecnologias.length})
      </button>
      {expandido && (
        <div className="f2-embed-tech-block__body">
          {tecnologias.length === 0 ? (
            <p className="f2-embed-tech-empty">
              Crea la primera tecnología para etiquetar operaciones.
            </p>
          ) : (
            <ul className="f2-embed-tech-list">
              {tecnologias.map((t) => (
                <li key={t.id} className="f2-embed-tech-item">
                  <span>
                    {t.name}
                    <small>
                      {' '}
                      ({t.complejidad === 'basica' ? 'básica' : 'compleja'})
                      {!t.is_active ? ' · inactiva' : ''}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="f2-embed-tech-item__btn"
                    onClick={() => void toggleActiva(t)}
                  >
                    {t.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="f2-embed-tech-form">
            <input
              type="text"
              placeholder="Nombre nueva tecnología"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
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
              className="btn-secondary btn-sm"
              disabled={guardando}
              onClick={() => void crear()}
            >
              Crear
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={generando || tecnologias.length === 0}
              onClick={() => void generarCandados()}
            >
              Generar candados
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioTecnologias;
