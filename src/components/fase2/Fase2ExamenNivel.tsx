import React, { useState } from 'react';
import { apiService } from '../../services/api';
import './Fase2Prototype.css';

type Pregunta = { id: number; texto: string; opciones: string[]; orden: number };

type Fase2ExamenNivelProps = {
  intentoId: number;
  nivel: number;
  onCerrar: () => void;
  onCompletado: () => void;
};

const Fase2ExamenNivel: React.FC<Fase2ExamenNivelProps> = ({
  intentoId,
  nivel,
  onCerrar,
  onCompletado,
}) => {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ aciertos: number; aprobado: boolean } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [requeridos, setRequeridos] = useState<number | null>(null);

  const iniciar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await apiService.iniciarExamenNivel(intentoId);
      setPreguntas(data.preguntas);
      setRequeridos(data.aciertos_requeridos ?? null);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : null;
      setError(
        detail ||
          'No hay preguntas activas en el banco de este nivel. Pide a un admin que las agregue en Gestión de Áreas → Exámenes.'
      );
    } finally {
      setCargando(false);
    }
  };

  const enviar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await apiService.enviarExamenNivel(intentoId, respuestas);
      setResultado({
        aciertos: data.aciertos ?? 0,
        aprobado: data.aprobado,
      });
      onCompletado();
    } catch {
      setError('No se pudo guardar el examen.');
    } finally {
      setCargando(false);
    }
  };

  const total = preguntas.length;
  const subtitulo =
    total > 0 && total < 10
      ? `Este intento incluye las ${total} preguntas disponibles del banco.`
      : 'Hasta 10 preguntas al azar del banco del nivel. N1 no usa este examen.';

  return (
    <div className="fase2-examen-nivel" role="dialog" aria-labelledby="examen-nivel-title">
      <h3 id="examen-nivel-title">Examen Nivel {nivel}</h3>
      <p className="fase2-examen-nivel__hint">{subtitulo}</p>
      {requeridos != null && total > 0 && (
        <p className="fase2-examen-nivel__hint">
          Para aprobar: {requeridos} de {total} aciertos.
        </p>
      )}
      {error && <p className="fase2-examen-nivel__error">{error}</p>}
      {resultado && (
        <p>
          Resultado: {resultado.aciertos}
          {total > 0 ? ` / ${total}` : ''} — {resultado.aprobado ? 'Aprobado' : 'No aprobado'}
        </p>
      )}
      {preguntas.length === 0 && !resultado && (
        <button type="button" className="btn-primary" disabled={cargando} onClick={() => void iniciar()}>
          {cargando ? 'Cargando…' : 'Iniciar examen'}
        </button>
      )}
      {preguntas.map((p, idx) => (
        <fieldset key={p.id} className="fase2-examen-nivel__q">
          <legend>
            {idx + 1}. {p.texto}
          </legend>
          {p.opciones.map((op, i) => (
            <label key={i}>
              <input
                type="radio"
                name={`q-${p.id}`}
                checked={respuestas[String(p.id)] === i}
                onChange={() => setRespuestas((prev) => ({ ...prev, [String(p.id)]: i }))}
              />
              {op}
            </label>
          ))}
        </fieldset>
      ))}
      {preguntas.length > 0 && !resultado && (
        <button type="button" className="btn-primary" disabled={cargando} onClick={() => void enviar()}>
          Enviar respuestas
        </button>
      )}
      <button type="button" className="btn-secondary" onClick={onCerrar}>
        Cerrar
      </button>
    </div>
  );
};

export default Fase2ExamenNivel;
