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
  const [listaAbierta, setListaAbierta] = useState(tecnologias.length === 0);

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
      setListaAbierta(true);
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
      onError(
        'No se pudieron generar candados. Hace falta el candado de tronco N1 del área.',
      );
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="f2-embed-tech-block">
      <div className="f2-embed-tech-block__head">
        <h3 className="f2-embed-tech-block__title">
          Tecnologías del área ({tecnologias.length})
        </h3>
        <div className="f2-embed-tech-form">
          <input
            type="text"
            placeholder="Nombre nueva tecnología"
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
            className="f2-embed-tech-form__crear"
            disabled={guardando || !nombre.trim()}
            onClick={() => void crear()}
          >
            {guardando ? 'Creando…' : 'Crear tecnología'}
          </button>
        </div>
      </div>

      <button
        type="button"
        className="f2-embed-tech-block__toggle"
        aria-expanded={listaAbierta}
        onClick={() => setListaAbierta((v) => !v)}
      >
        {listaAbierta ? 'Ocultar listado' : 'Gestionar existentes'}
        {tecnologias.length > 0 ? ` (${tecnologias.length})` : ''}
      </button>

      {listaAbierta && (
        <div className="f2-embed-tech-block__body">
          {tecnologias.length === 0 ? (
            <p className="f2-embed-tech-empty">
              Crea la primera tecnología arriba para etiquetar operaciones.
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
          <button
            type="button"
            className="f2-embed-tech-item__btn"
            disabled={generando || tecnologias.length === 0}
            onClick={() => void generarCandados()}
          >
            {generando ? 'Generando…' : 'Generar candados N1/N2'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FormularioTecnologias;
