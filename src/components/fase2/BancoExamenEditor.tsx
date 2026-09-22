import React, { useCallback, useEffect, useState } from 'react';
import { apiService, BancoPreguntaExamen } from '../../services/api';
import './BancoExamenEditor.css';

const META = 15;
const NIVELES = [2, 3, 4] as const;

type BancoExamenEditorProps = {
  areaId: number;
};

const emptyOpciones = () => ['', '', '', ''];

const BancoExamenEditor: React.FC<BancoExamenEditorProps> = ({ areaId }) => {
  const [nivel, setNivel] = useState<2 | 3 | 4>(2);
  const [items, setItems] = useState<BancoPreguntaExamen[]>([]);
  const [resumen, setResumen] = useState<
    Array<{ nivel: number; activas: number; meta: number; listo_aleatorio: boolean }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [opciones, setOpciones] = useState<string[]>(emptyOpciones());
  const [indiceCorrecta, setIndiceCorrecta] = useState(0);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, res] = await Promise.all([
        apiService.getBancoExamen({ area_id: areaId, nivel }),
        apiService.getBancoExamenResumen(areaId),
      ]);
      setItems(list);
      setResumen(res.niveles);
    } catch {
      setError('No se pudo cargar el banco de preguntas.');
    } finally {
      setLoading(false);
    }
  }, [areaId, nivel]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setTexto('');
    setOpciones(emptyOpciones());
    setIndiceCorrecta(0);
    setEditId(null);
  };

  const startEdit = (p: BancoPreguntaExamen) => {
    setEditId(p.id);
    setTexto(p.texto);
    const ops = [...p.opciones];
    while (ops.length < 4) ops.push('');
    setOpciones(ops.slice(0, 4));
    setIndiceCorrecta(p.indice_correcta);
  };

  const guardar = async () => {
    const ops = opciones.map((o) => o.trim()).filter(Boolean);
    if (!texto.trim() || ops.length < 2) {
      setError('Escribe la pregunta y al menos 2 opciones.');
      return;
    }
    if (indiceCorrecta < 0 || indiceCorrecta >= ops.length) {
      setError('Marca cuál opción es la correcta.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editId != null) {
        await apiService.patchBancoPregunta(editId, {
          texto: texto.trim(),
          opciones: ops,
          indice_correcta: indiceCorrecta,
        });
      } else {
        await apiService.createBancoPregunta({
          area: areaId,
          nivel,
          texto: texto.trim(),
          opciones: ops,
          indice_correcta: indiceCorrecta,
          orden: items.length,
        });
      }
      resetForm();
      await load();
    } catch {
      setError('No se pudo guardar la pregunta.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActiva = async (p: BancoPreguntaExamen) => {
    try {
      await apiService.patchBancoPregunta(p.id, { is_active: !p.is_active });
      await load();
    } catch {
      setError('No se pudo actualizar el estado.');
    }
  };

  const resumenNivel = resumen.find((r) => r.nivel === nivel);
  const activas = resumenNivel?.activas ?? items.filter((i) => i.is_active).length;

  let estadoLabel = 'Sin examen (0 preguntas)';
  let estadoClass = 'banco-examen__badge banco-examen__badge--empty';
  if (activas >= META) {
    estadoLabel = `Aleatorio 10/${META} listo`;
    estadoClass = 'banco-examen__badge banco-examen__badge--ok';
  } else if (activas >= 1) {
    estadoLabel = `Examen activo con ${activas} pregunta${activas === 1 ? '' : 's'}`;
    estadoClass = 'banco-examen__badge banco-examen__badge--partial';
  }

  return (
    <div className="banco-examen">
      <header className="banco-examen__header">
        <div>
          <h3 className="banco-examen__title">Banco de exámenes (N2–N4)</h3>
          <p className="banco-examen__hint">
            Meta: {META} preguntas por nivel para sortear 10. Si hay menos, el operador ve todas las
            activas (barajadas) hasta que completes el banco.
          </p>
        </div>
        <div className="banco-examen__niveles" role="tablist" aria-label="Nivel del examen">
          {NIVELES.map((n) => {
            const r = resumen.find((x) => x.nivel === n);
            return (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={nivel === n}
                className={`banco-examen__nivel${nivel === n ? ' is-active' : ''}`}
                onClick={() => {
                  setNivel(n);
                  resetForm();
                }}
              >
                N{n}
                <span className="banco-examen__nivel-count">
                  {r?.activas ?? '·'}/{META}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className={estadoClass} role="status">
        {activas}/{META} activas — {estadoLabel}
      </div>

      {error && <p className="banco-examen__error">{error}</p>}
      {loading && <p className="banco-examen__muted">Cargando…</p>}

      <ul className="banco-examen__list">
        {items.map((p) => (
          <li key={p.id} className={`banco-examen__item${!p.is_active ? ' is-inactive' : ''}`}>
            <div className="banco-examen__item-body">
              <p className="banco-examen__pregunta">{p.texto}</p>
              <ol className="banco-examen__ops">
                {p.opciones.map((o, i) => (
                  <li key={i} className={i === p.indice_correcta ? 'is-correct' : undefined}>
                    {o}
                  </li>
                ))}
              </ol>
            </div>
            <div className="banco-examen__item-actions">
              <button type="button" className="btn-secondary" onClick={() => startEdit(p)}>
                Editar
              </button>
              <button type="button" className="btn-secondary" onClick={() => void toggleActiva(p)}>
                {p.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </li>
        ))}
        {!loading && items.length === 0 && (
          <li className="banco-examen__empty">Aún no hay preguntas en N{nivel}.</li>
        )}
      </ul>

      <section className="banco-examen__form" aria-label={editId ? 'Editar pregunta' : 'Nueva pregunta'}>
        <h4>{editId ? 'Editar pregunta' : `Agregar pregunta (N${nivel})`}</h4>
        <label className="banco-examen__field">
          <span>Pregunta</span>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder="Texto de la pregunta"
          />
        </label>
        {opciones.map((op, i) => (
          <label key={i} className="banco-examen__field banco-examen__field--row">
            <input
              type="radio"
              name="correcta"
              checked={indiceCorrecta === i}
              onChange={() => setIndiceCorrecta(i)}
              title="Marcar como correcta"
            />
            <input
              type="text"
              value={op}
              onChange={(e) => {
                const next = [...opciones];
                next[i] = e.target.value;
                setOpciones(next);
              }}
              placeholder={`Opción ${i + 1}`}
            />
          </label>
        ))}
        <p className="banco-examen__muted">Elige el círculo de la opción correcta.</p>
        <div className="banco-examen__form-actions">
          {editId != null && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancelar edición
            </button>
          )}
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void guardar()}>
            {saving ? 'Guardando…' : editId != null ? 'Guardar cambios' : 'Agregar pregunta'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default BancoExamenEditor;
